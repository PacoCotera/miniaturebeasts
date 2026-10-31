// Narrow-band surface nets on the field (shape-model.md 4). Plain JavaScript, no node: imports.
// The grid is sparse in effect: a flood fill from seeds on the surface touches only the cells that cross it
// (its corner values are cached in one typed array). Each vertex is the mean of its edge crossings, then two
// Newton steps put it on F = 0; the normal is the normalized gradient by central differences (h = 0.5 voxel).

const opts_debug = typeof process !== "undefined" && process.env?.FORM_DEBUG;
export function meshField(field, { voxel = null, extentDiv = 220, attrs = true, maxCells = 40e6 } = {}) {
  const { lo, hi } = field.bounds;
  const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  const v = voxel ?? ext / extentDiv;
  const n = [0, 1, 2].map((a) => Math.ceil((hi[a] - lo[a]) / v) + 3);
  const N = n[0] * n[1] * n[2];
  if (N > maxCells) throw new Error(`the grid has ${N} cells`);
  const o = [lo[0] - v, lo[1] - v, lo[2] - v], F3 = field.F3;
  // a cut plane (the floor) sits 0.3 voxel from a corner plane, never on one: its corner values are not noise around zero
  if (field.base !== null && field.base !== undefined) { const zc = field.base - 0.3 * v; o[2] = zc - Math.ceil((zc - (lo[2] - v)) / v) * v; }
  const vals = new Float32Array((n[0] + 1) * (n[1] + 1) * (n[2] + 1)).fill(NaN);
  const sx = 1, sy = n[0] + 1, sz = (n[0] + 1) * (n[1] + 1);
  const cidx = (i, j, k) => i + j * (n[0]) + k * n[0] * n[1];
  const cornerIdx = (i, j, k) => i * sx + j * sy + k * sz;
  let evals = 0;
  const val = (i, j, k) => {
    const id = cornerIdx(i, j, k); let f = vals[id];
    if (f !== f) { f = F3(o[0] + i * v, o[1] + j * v, o[2] + k * v); if (f === 0) f = 1e-9; vals[id] = f; evals++; }
    return f;
  };
  const visited = new Uint8Array(N);
  const cellList = [];
  const stack = [];
  const cell = (i, j, k) => { // a cell is a surface cell when its corners differ in sign
    let pos = 0;
    for (let c = 0; c < 8; c++) if (val(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)) > 0) pos++;
    return pos > 0 && pos < 8;
  };
  const toCell = (p) => [Math.floor((p[0] - o[0]) / v), Math.floor((p[1] - o[1]) / v), Math.floor((p[2] - o[2]) / v)];
  const seedPush = (i, j, k) => { if (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) return; const id = cidx(i, j, k); if (visited[id]) return; stack.push(i, j, k); };
  // seeds: rays from the samples along several directions to the first crossing
  const T0 = performance.now();
  const seeds = field.seeds ?? [];
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const sd of seeds) for (const d of dirs) {
    const p0 = sd.p, step = Math.max(v, sd.r * 0.5);
    if (F3(p0[0], p0[1], p0[2]) <= 0) continue;
    let t = 0, prev = F3(p0[0], p0[1], p0[2]);
    for (let it = 0; it < 400; it++) {
      const t2 = t + step, q = [p0[0] + d[0] * t2, p0[1] + d[1] * t2, p0[2] + d[2] * t2], f = F3(q[0], q[1], q[2]);
      if (f <= 0) {
        let a = t, b = t2;
        for (let k = 0; k < 24; k++) { const m = (a + b) / 2; if (F3(p0[0] + d[0] * m, p0[1] + d[1] * m, p0[2] + d[2] * m) > 0) a = m; else b = m; }
        const pt = [p0[0] + d[0] * b, p0[1] + d[1] * b, p0[2] + d[2] * b], [ci, cj, ck] = toCell(pt);
        for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) seedPush(ci + di, cj + dj, ck + dk); break;
      }
      t = t2; prev = f;
      if (q[0] < lo[0] - v || q[0] > hi[0] + v || q[1] < lo[1] - v || q[1] > hi[1] + v || q[2] < lo[2] - v || q[2] > hi[2] + v) break;
    }
  }
  const FACES6 = [{ c: [0, 2, 4, 6], d: [-1, 0, 0] }, { c: [1, 3, 5, 7], d: [1, 0, 0] }, { c: [0, 1, 4, 5], d: [0, -1, 0] }, { c: [2, 3, 6, 7], d: [0, 1, 0] }, { c: [0, 1, 2, 3], d: [0, 0, -1] }, { c: [4, 5, 6, 7], d: [0, 0, 1] }];
  const expand = (i, j, k) => { // the surface continues through every face of a crossing cell whose corners differ in sign
    for (const f of FACES6) {
      let pos = 0;
      for (const q of f.c) if (vals[cornerIdx(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1))] > 0) pos++;
      if (pos > 0 && pos < 4) seedPush(i + f.d[0], j + f.d[1], k + f.d[2]);
    }
  };
  const flood = () => {
    while (stack.length) {
      const k = stack.pop(), j = stack.pop(), i = stack.pop(), id = cidx(i, j, k);
      if (visited[id]) continue;
      visited[id] = 1;
      if (!cell(i, j, k)) continue;
      cellList.push(i, j, k);
      expand(i, j, k);
    }
  };
  const Tf = performance.now();
  flood();
  const Tg = performance.now();
  // Ambiguous faces (a checkerboard of signs) would give an edge four quads: flip the corner with the smallest |F|
  // on such a face, then close the flood again, until none is left. The surface moves by less than that |F|.
  const FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
  let repairs = 0; const flipped = new Set();
  for (let pass = 0; pass < 12; pass++) {
    let flips = 0;
    for (let c = 0; c < cellList.length; c += 3) {
      const i = cellList[c], j = cellList[c + 1], k = cellList[c + 2];
      const ids = []; for (let q = 0; q < 8; q++) ids.push(cornerIdx(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1)));
      for (const f of FACES) {
        const a0 = vals[ids[f[0]]] > 0, a1 = vals[ids[f[1]]] > 0, a2 = vals[ids[f[2]]] > 0, a3 = vals[ids[f[3]]] > 0;
        if (a0 !== a1 && a1 !== a2 && a2 !== a3 && a3 !== a0) {
          let m = -1; for (const q of f) if (!flipped.has(ids[q]) && (m < 0 || Math.abs(vals[ids[q]]) < Math.abs(vals[ids[m]]))) m = q;
          if (m < 0) continue;
          vals[ids[m]] = -vals[ids[m]]; flipped.add(ids[m]); flips++; repairs++;
        }
      }
    }
    if (opts_debug) console.log("pass", pass, "flips", flips);
    if (!flips) break;
    // the flips can move the surface: rebuild the crossing cells from the old ones by the same flood
    const old = cellList.slice(); cellList.length = 0; visited.fill(0);
    for (let c = 0; c < old.length; c += 3) stack.push(old[c], old[c + 1], old[c + 2]);
    flood();
  }
  const T1 = performance.now();
  // vertices: the mean of the edge crossings of each surface cell
  const nc = cellList.length / 3, vid = new Int32Array(N).fill(-1);
  const P = new Float64Array(nc * 3);
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let c = 0; c < nc; c++) {
    const i = cellList[c * 3], j = cellList[c * 3 + 1], k = cellList[c * 3 + 2];
    vid[cidx(i, j, k)] = c;
    const f = []; for (let q = 0; q < 8; q++) f.push(val(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1)));
    let cx = 0, cy = 0, cz = 0, cnt = 0;
    for (const [a, b] of EDGES) {
      const fa = f[a], fb = f[b];
      if ((fa > 0) === (fb > 0)) continue;
      const t = fa / (fa - fb);
      const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1, bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
      cx += ax + (bx - ax) * t; cy += ay + (by - ay) * t; cz += az + (bz - az) * t; cnt++;
    }
    P[c * 3] = o[0] + (i + cx / cnt) * v; P[c * 3 + 1] = o[1] + (j + cy / cnt) * v; P[c * 3 + 2] = o[2] + (k + cz / cnt) * v;
  }
  // faces: a quad around every sign-changing edge from the cell's low corner
  const faces = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) faces.push(a, c, b, a, d, c); else faces.push(a, b, c, a, c, d); };
  for (let c = 0; c < nc; c++) {
    const i = cellList[c * 3], j = cellList[c * 3 + 1], k = cellList[c * 3 + 2];
    const f0 = vals[cornerIdx(i, j, k)] > 0;
    const V = (a, b, d) => (a < 0 || b < 0 || d < 0 ? -1 : vid[cidx(a, b, d)]);
    if (j > 0 && k > 0 && (vals[cornerIdx(i + 1, j, k)] > 0) !== f0) quad(V(i, j, k), V(i, j - 1, k), V(i, j - 1, k - 1), V(i, j, k - 1), !f0);
    if (i > 0 && k > 0 && (vals[cornerIdx(i, j + 1, k)] > 0) !== f0) quad(V(i, j, k), V(i, j, k - 1), V(i - 1, j, k - 1), V(i - 1, j, k), !f0);
    if (i > 0 && j > 0 && (vals[cornerIdx(i, j, k + 1)] > 0) !== f0) quad(V(i, j, k), V(i - 1, j, k), V(i - 1, j - 1, k), V(i, j - 1, k), !f0);
  }
  const T2 = performance.now();
  // each vertex: two Newton steps onto F = 0 (the local evaluator), the normal by central differences (h = 0.5 voxel)
  const verts = new Float32Array(nc * 3), normals = new Float32Array(nc * 3);
  const A = { part: new Uint8Array(nc), sigma: new Float32Array(nc), s: new Float32Array(nc), angle: new Float32Array(nc), emission: new Float32Array(nc), patch: new Float32Array(nc), belly: new Float32Array(nc), eye: new Int8Array(nc), group: new Uint8Array(nc), marks: [] };
  const nm = field.marks?.length ?? 0; for (let k = 0; k < nm; k++) A.marks.push(new Float32Array(nc));
  const pidx = new Map(field.partNames.map((nme, i) => [nme, i]));
  for (let c = 0; c < nc; c++) {
    const r = field.project(P[c * 3], P[c * 3 + 1], P[c * 3 + 2], v);
    verts[c * 3] = r.p[0]; verts[c * 3 + 1] = r.p[1]; verts[c * 3 + 2] = r.p[2];
    normals[c * 3] = r.n[0]; normals[c * 3 + 1] = r.n[1]; normals[c * 3 + 2] = r.n[2];
    const a = r.a;
    if (!pidx.has(a.part)) pidx.set(a.part, pidx.size);
    A.part[c] = pidx.get(a.part); A.sigma[c] = a.sigma; A.s[c] = a.s; A.angle[c] = a.angle; A.emission[c] = a.emission; A.patch[c] = a.patch; A.belly[c] = a.belly; A.eye[c] = a.eye; A.group[c] = a.gi;
    for (let k = 0; k < nm; k++) A.marks[k][c] = a.marks[k];
  }
  A.partNames = [...pidx.keys()];
  const mesh = { vertices: verts, normals, faces: Uint32Array.from(faces), voxel: v, cells: nc, evals, extent: ext, repairs, attrs: A, timing: { seeds: Tf - T0, flood: Tg - Tf, repair: T1 - Tg, nets: T2 - T1, project: performance.now() - T2 } };
  return mesh;
}

// every edge shared by exactly two triangles: the counts of edges by their number of triangles
export function edgeCounts(mesh) {
  const m = new Map(), f = mesh.faces;
  for (let t = 0; t < f.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = f[t + e], b = f[t + (e + 1) % 3], key = a < b ? a * 4294967296 + b : b * 4294967296 + a;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  const hist = {}; for (const c of m.values()) hist[c] = (hist[c] ?? 0) + 1;
  return hist;
}

// ---- the scene: chains, field, mesh and the nodes of the current scene contract -----------------------------
import { buildChains, spineGuards } from "./spine.mjs";
import { makeField } from "./field.mjs";

export function buildScene(form, { voxel = null, extentDiv = 220, mesh = true } = {}) {
  const t0 = performance.now();
  const built = buildChains(form);
  const problems = spineGuards(form, built);
  const field = makeField({ front: built.front, tail: built.tail, floor: built.floor }, built.branches, form);
  const scene = { form, built, field, problems, nodes: [], slots: [], bounds: { min: field.bounds.lo, max: field.bounds.hi }, timings: {} };
  scene.timings.field = performance.now() - t0;
  if (!mesh) return scene;
  const t1 = performance.now();
  const m = meshField(field, { voxel, extentDiv });
  scene.mesh = m; scene.timings.mesh = performance.now() - t1;
  // one node per part (region or branch): faces go to the part of their first vertex, vertices are compacted
  const A = m.attrs, byPart = new Map();
  for (let t = 0; t < m.faces.length; t += 3) {
    const pn = A.partNames[A.part[m.faces[t]]];
    if (!byPart.has(pn)) byPart.set(pn, []);
    byPart.get(pn).push(m.faces[t], m.faces[t + 1], m.faces[t + 2]);
  }
  const look = form.look ?? { slots: {} };
  for (const [part, f] of byPart) {
    const remap = new Map(), vs = [], fs = [];
    for (const vi of f) { if (!remap.has(vi)) { remap.set(vi, vs.length); vs.push([m.vertices[vi * 3], m.vertices[vi * 3 + 1], m.vertices[vi * 3 + 2]]); } }
    for (let i = 0; i < f.length; i += 3) fs.push([remap.get(f[i]), remap.get(f[i + 1]), remap.get(f[i + 2])]);
    scene.nodes.push({ id: part, part, slot: look.slots?.[part] ?? part, mesh: { vertices: vs, faces: fs } });
  }
  scene.slots = [...new Set(scene.nodes.map((n) => n.slot))];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.vertices.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], m.vertices[i + a]); hi[a] = Math.max(hi[a], m.vertices[i + a]); }
  scene.bounds = { min: lo, max: hi };
  return scene;
}
