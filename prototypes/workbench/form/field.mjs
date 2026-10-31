// The implicit field (shape-model.md 1.4, 1.7, 1.8). F(p) > 0 inside, F = 0 on the surface, F < 0 outside.
// Internally every distance is "outside positive" (d = -F). Plain JavaScript, no node: imports.
import { V, interpChain, sectionPoint, lowestZ } from "./spine.mjs";

const RAD = Math.PI / 180;
const { dot, crs, nrm, sc, add, sub } = V;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const smin = (a, b, k) => { if (k <= 0) return a < b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return (a < b ? a : b) - h * h * k * 0.25; };
export const smax = (a, b, k) => { if (k <= 0) return a > b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return (a > b ? a : b) + h * h * k * 0.25; };

// a deterministic hash in [0, 1) and a smooth value noise from it
function hash3(i, j, k, salt = 0) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647) + Math.imul(salt, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
export const hash1 = (i, salt = 0) => hash3(i, 7, 13, salt);
export function noise3(x, y, z, salt) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const c = (a, b, d) => hash3(i + a, j + b, k + d, salt) * 2 - 1;
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u, x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u, x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

// ---- packing -------------------------------------------------------------------------------------------------
const STRIDE = 16, RUN = 16, SUB = 4;
// per sample: p (3), T (3), N (3), B (3), then the inverse radii of the egg-ellipsoid: 1/w, 1/u, 1/d, 1/rT
function pack(chain, shift, id, blend0 = 0) {
  const S = chain.samples, n = S.length;
  const data = new Float64Array(n * STRIDE), kk = new Float64Array(n), half = new Float64Array(n), rTs = new Float64Array(n);
  const part = new Uint8Array(n), sigma = new Float64Array(n), s = new Float64Array(n), emission = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const m = S[i], o = i * STRIDE;
    data[o] = m.p[0]; data[o + 1] = m.p[1]; data[o + 2] = m.p[2] + shift;
    data[o + 3] = m.T[0]; data[o + 4] = m.T[1]; data[o + 5] = m.T[2];
    data[o + 6] = m.N[0]; data[o + 7] = m.N[1]; data[o + 8] = m.N[2];
    data[o + 9] = m.B[0]; data[o + 10] = m.B[1]; data[o + 11] = m.B[2];
    // the fur is each sample's own inflation (design 5.4), added to its radii before the union: no offset, no seams at the joins
    const fr = m.fur ?? 0, rT = Math.min(m.w, m.u, m.d) + fr;
    data[o + 12] = 1 / (m.w + fr); data[o + 13] = 1 / (m.u + fr); data[o + 14] = 1 / (m.d + fr); data[o + 15] = 1 / rT;
    half[i] = Math.max(m.w, m.u, m.d) + fr; rTs[i] = rT;
    const hstep = i > 0 ? S[i].s - S[i - 1].s : n > 1 ? S[1].s - S[0].s : 0.05;
    kk[i] = 0.5 * Math.max(hstep, 1e-4);
    sigma[i] = m.sigma; s[i] = m.s; emission[i] = m.emission; part[i] = 0;
  }
  const sphere = (a, b) => { // bounding sphere of samples a..b-1
    let cx = 0, cy = 0, cz = 0;
    for (let i = a; i < b; i++) { cx += data[i * STRIDE]; cy += data[i * STRIDE + 1]; cz += data[i * STRIDE + 2]; }
    cx /= b - a; cy /= b - a; cz /= b - a;
    let R = 0, k = 0;
    for (let i = a; i < b; i++) { R = Math.max(R, Math.hypot(data[i * STRIDE] - cx, data[i * STRIDE + 1] - cy, data[i * STRIDE + 2] - cz) + half[i]); k = Math.max(k, kk[i]); }
    return [cx, cy, cz, R, k];
  };
  const mk = (size) => { const nr = Math.ceil(n / size), arr = { n: nr, cx: new Float64Array(nr), cy: new Float64Array(nr), cz: new Float64Array(nr), R: new Float64Array(nr), k: new Float64Array(nr) }; for (let r = 0; r < nr; r++) { const q = sphere(r * size, Math.min(n, (r + 1) * size)); arr.cx[r] = q[0]; arr.cy[r] = q[1]; arr.cz[r] = q[2]; arr.R[r] = q[3]; arr.k[r] = q[4]; } return arr; };
  const runs = mk(RUN), subs = mk(SUB);
  const all = sphere(0, n);
  return { id, n, data, kk, half, rTs, last: -1, part, sigma, s, emission, runs, subs, nr: runs.n, gc: [all[0], all[1], all[2]], gR: all[3], kmax: all[4], length: chain.length, blend0, chain };
}

// distance of the egg-ellipsoid sample at offset o: the bound k0 (k0 - 1) / k1 of 1.7
function eggD(D, o, x, y, z) {
  const qx = x - D[o], qy = y - D[o + 1], qz = z - D[o + 2];
  const b = qx * D[o + 6] + qy * D[o + 7] + qz * D[o + 8];
  const iN = b >= 0 ? D[o + 13] : D[o + 14], iT = D[o + 15], iW = D[o + 12];
  const ra = (qx * D[o + 3] + qy * D[o + 4] + qz * D[o + 5]) * iT, rb = b * iN, rc = (qx * D[o + 9] + qy * D[o + 10] + qz * D[o + 11]) * iW;
  const k0s = ra * ra + rb * rb + rc * rc, k0 = Math.sqrt(k0s);
  const k1s = ra * ra * iT * iT + rb * rb * iN * iN + rc * rc * iW * iW;
  if (k1s < 1e-24) return -1 / Math.max(iW, iN, iT);
  return (k0 * (k0 - 1)) / Math.sqrt(k1s);
}
export const ellipsoidD = (qx, qy, qz, rx, ry, rz) => {
  const ax = qx / rx, ay = qy / ry, az = qz / rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const k1 = Math.sqrt((ax / rx) ** 2 + (ay / ry) ** 2 + (az / rz) ** 2);
  return k1 < 1e-12 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
};

// the smooth union over a group's samples in order, skipping runs (16) and sub-runs (4) whose bounding sphere is far.
// With `list` (sorted sample indices), only those samples are visited: the local evaluator of a vertex.
function groupD(g, x, y, z, hit, list) {
  const D = g.data, kk = g.kk, rTs = g.rTs;
  let acc = Infinity, best = Infinity, bi = -1;
  if (list) {
    for (let q = 0; q < list.length; q++) {
      const i = list[q], d = eggD(D, i * STRIDE, x, y, z);
      if (d < best) { best = d; bi = i; }
      if (acc === Infinity) acc = d; else { const k = kk[i], h = k - Math.abs(acc - d); acc = (acc < d ? acc : d) - (h > 0 ? (h * h) / (4 * k) : 0); }
    }
  } else {
    const R = g.runs, S = g.subs, n = g.n;
    // an upper bound of the union's minimum from the sample that was nearest last time (the evaluations are coherent)
    let u = Infinity;
    if (g.last >= 0) u = eggD(D, g.last * STRIDE, x, y, z);
    for (let r = 0; r < R.n; r++) {
      const thr0 = acc < u ? acc : u;
      if (thr0 !== Infinity) {
        const lb = Math.sqrt((x - R.cx[r]) ** 2 + (y - R.cy[r]) ** 2 + (z - R.cz[r]) ** 2) - R.R[r];
        if (lb > 0 && lb * 0.7 > thr0 + 2.2 * R.k[r]) continue;
      }
      const s1 = Math.min(S.n, (r + 1) * (RUN / SUB));
      for (let sr = r * (RUN / SUB); sr < s1; sr++) {
        const thr1 = acc < u ? acc : u;
        if (thr1 !== Infinity) {
          const lb = Math.sqrt((x - S.cx[sr]) ** 2 + (y - S.cy[sr]) ** 2 + (z - S.cz[sr]) ** 2) - S.R[sr];
          if (lb > 0 && lb * 0.7 > thr1 + 2.2 * S.k[sr]) continue;
        }
        const i1 = Math.min(n, (sr + 1) * SUB);
        for (let i = sr * SUB; i < i1; i++) {
          const o = i * STRIDE, thr = acc < u ? acc : u;
          // exact: the estimate is at least |a| - rT (rT is the smallest radius), so a sample far along its axis cannot matter
          if (thr !== Infinity) { const a = (x - D[o]) * D[o + 3] + (y - D[o + 1]) * D[o + 4] + (z - D[o + 2]) * D[o + 5], e = (a < 0 ? -a : a) - rTs[i]; if (e > 0 && e > thr + 2.2 * kk[i]) continue; }
          const d = eggD(D, o, x, y, z);
          if (d < best) { best = d; bi = i; }
          if (acc === Infinity) acc = d; else { const k = kk[i], h = k - Math.abs(acc - d); acc = (acc < d ? acc : d) - (h > 0 ? (h * h) / (4 * k) : 0); }
        }
      }
    }
    if (bi >= 0) g.last = bi;
  }
  if (hit) { hit.i = bi; hit.d = best; }
  return acc;
}
// the samples of a group that can matter within `rad` of (x, y, z): one pass collects the estimates, then the near ones are kept
const SCR_I = new Int32Array(4096), SCR_D = new Float64Array(4096);
function groupList(g, x, y, z, rad) {
  const D = g.data, kk = g.kk, R = g.runs, S = g.subs, n = g.n;
  let acc = Infinity, best = Infinity, cnt = 0, bi = -1;
  for (let r = 0; r < R.n; r++) {
    if (acc !== Infinity) { const lb = Math.sqrt((x - R.cx[r]) ** 2 + (y - R.cy[r]) ** 2 + (z - R.cz[r]) ** 2) - R.R[r]; if (lb > 0 && lb * 0.7 > best + R.k[r] + 3.2 * rad + 0.05) continue; }
    const s1 = Math.min(S.n, (r + 1) * (RUN / SUB));
    for (let sr = r * (RUN / SUB); sr < s1; sr++) {
      if (acc !== Infinity) { const lb = Math.sqrt((x - S.cx[sr]) ** 2 + (y - S.cy[sr]) ** 2 + (z - S.cz[sr]) ** 2) - S.R[sr]; if (lb > 0 && lb * 0.7 > best + S.k[sr] + 3.2 * rad + 0.05) continue; }
      const i1 = Math.min(n, (sr + 1) * SUB);
      for (let i = sr * SUB; i < i1; i++) {
        const d = eggD(D, i * STRIDE, x, y, z);
        SCR_I[cnt] = i; SCR_D[cnt++] = d;
        if (d < best) { best = d; bi = i; }
        acc = acc === Infinity ? d : 0;
      }
    }
  }
  const lim = best + 1.1 * g.kmax + 3.2 * rad + 0.004, out = [];
  for (let q = 0; q < cnt; q++) if (SCR_D[q] < lim || SCR_I[q] === bi) out.push(SCR_I[q]);
  return Int32Array.from(out);
}

// ---- the field ------------------------------------------------------------------------------------------------
// chains: { front, tail, floor }, branches: [chain ...] from buildChains, form: the species form.
export function makeField(chains, branches, form, opts = {}) {
  const floor = opts.floor ?? chains.floor ?? 0, S = -floor;
  const groups = { front: pack(chains.front, S, "front"), tail: chains.tail ? pack(chains.tail, S, "tail") : null };
  const bgroups = branches.map((b) => pack(b, S, b.id, b.branch.blend ?? 0.1));
  const all = [groups.front, groups.tail, ...bgroups].filter(Boolean);
  const partNames = []; const partIndex = new Map();
  const idOf = (name) => { if (!partIndex.has(name)) { partIndex.set(name, partNames.length); partNames.push(name); } return partIndex.get(name); };
  for (const g of all) for (let i = 0; i < g.n; i++) g.part[i] = idOf(g.chain.samples[i].part);
  idOf("eye");
  const base = form.base === undefined || form.base === null ? null : form.base + S;
  const tailK = 0.05;
  const listOf = (loc, g) => (loc ? (g === groups.front ? loc.front : g === groups.tail ? loc.tail : null) : null);

  // --- trunk and branches ---
  const hitF = { i: -1, d: 0 }, hitT = { i: -1, d: 0 }, hitB = { i: -1, d: 0 };
  function dTrunkOnly(x, y, z, loc) { // the front chain and the tail: the dome for the hair's shell
    let d = groupD(groups.front, x, y, z, null, listOf(loc, groups.front));
    if (groups.tail) d = smin(d, groupD(groups.tail, x, y, z, null, listOf(loc, groups.tail)), tailK);
    return d;
  }
  let nearHalf = 1;
  function dBodyOnly(x, y, z, loc) {
    let d = groupD(groups.front, x, y, z, hitF, listOf(loc, groups.front));
    nearHalf = hitF.i >= 0 ? groups.front.half[hitF.i] : 1; let nearD = hitF.d;
    if (groups.tail) { const dt = groupD(groups.tail, x, y, z, hitT, listOf(loc, groups.tail)); d = smin(d, dt, tailK); if (hitT.d < nearD) { nearD = hitT.d; nearHalf = groups.tail.half[hitT.i]; } }
    const dTrunk = d;
    for (let bj = 0; bj < bgroups.length; bj++) {
      const g = bgroups[bj];
      let list = null;
      if (loc) { list = loc.br[bj]; if (!list) continue; }
      else { const lb = Math.sqrt((x - g.gc[0]) ** 2 + (y - g.gc[1]) ** 2 + (z - g.gc[2]) ** 2) - g.gR; if (lb > 0 && lb * 0.7 > d + g.blend0) continue; }
      const dj = groupD(g, x, y, z, hitB, list);
      // the arc length of the nearest point, continuous across the switch from one sample to the next (a parabola through three estimates)
      let sNear = g.s[hitB.i];
      if (sNear < 0.4 * g.length && hitB.i > 0 && hitB.i < g.n - 1) {
        const i = hitB.i, dm = eggD(g.data, (i - 1) * STRIDE, x, y, z), dp = eggD(g.data, (i + 1) * STRIDE, x, y, z), den = dm - 2 * hitB.d + dp;
        if (den > 1e-12) { const t = Math.max(-1, Math.min(1, (dm - dp) / (2 * den))); sNear += t * (t < 0 ? g.s[i] - g.s[i - 1] : g.s[i + 1] - g.s[i]); }
      }
      const k = g.blend0 * (1 - smooth(sNear / (0.35 * g.length)));
      const v = smin(dTrunk, dj, k);
      if (hitB.d < nearD) { nearD = hitB.d; nearHalf = g.half[hitB.i]; }
      if (v < d) d = v;
    }
    return d;
  }

  // --- hair (Drapet): the shell above the part line, the fall below it, a window and a hem of locks ---
  const hair = form.hair ? makeHair(form.hair, S, base, dTrunkOnly) : null;

  // --- coat: the fur is per-sample inflation of the radii (pack); the field carries shape only, no noise term (design 1.1) ---
  const coat = form.coat && form.coat.depth > 0 ? form.coat : null;
  const face = form.face ?? null;
  const frontAt = (sg) => { const s = interpChain(chains.front, sg); return { ...s, p: [s.p[0], s.p[1], s.p[2] + S] }; };
  const anchor = face ? frontAt(face.sigma) : null;
  const faceDir = anchor ? nrm(add(sc(anchor.T, face.t ?? 0), sc(anchor.N, -(face.v ?? 0)))) : null;
  const dCoated = (x, y, z, loc) => dBodyOnly(x, y, z, loc);

  // --- the surface without eyes ---
  const cutBase = (d, z) => (base === null ? d : Math.max(d, base - z));
  function dSurface(x, y, z, loc) {
    if (hair) return cutBase(Math.min(hair.d(x, y, z, loc), dBodyOnly(x, y, z, loc)), z);
    return cutBase(dCoated(x, y, z, loc), z);
  }
  // the casting surface of the eyes and marks: the body face (behind the window) for hair, the coated body otherwise
  const dCast = (x, y, z) => cutBase(hair ? dBodyOnly(x, y, z) : dCoated(x, y, z), z);
  const gradOf = (fn, p, h = 1e-3) => nrm([fn(p[0] + h, p[1], p[2]) - fn(p[0] - h, p[1], p[2]), fn(p[0], p[1] + h, p[2]) - fn(p[0], p[1] - h, p[2]), fn(p[0], p[1], p[2] + h) - fn(p[0], p[1], p[2] - h)]);
  const rotAbout = (v, axis, a) => { const c = Math.cos(a), s = Math.sin(a), k = dot(axis, v) * (1 - c), x = crs(axis, v); return [v[0] * c + x[0] * s + axis[0] * k, v[1] * c + x[1] * s + axis[1] * k, v[2] * c + x[2] * s + axis[2] * k]; };
  // a direction from the anchor: (t along T, v toward the belly), turned about N by spread, raised toward N by elev
  const faceRay = (t, v, spread, elev) => {
    let dir = nrm(add(sc(anchor.T, t), sc(anchor.N, -v)));
    dir = rotAbout(dir, anchor.N, spread * RAD);
    const up = nrm(sub(anchor.N, sc(dir, dot(anchor.N, dir))));
    return nrm(add(sc(dir, Math.cos(elev * RAD)), sc(up, Math.sin(elev * RAD))));
  };
  const castTo = (dir) => {
    let t0 = 0, t1 = 0.02;
    const f = (t) => dCast(anchor.p[0] + dir[0] * t, anchor.p[1] + dir[1] * t, anchor.p[2] + dir[2] * t);
    while (f(t1) < 0 && t1 < 8) { t0 = t1; t1 += 0.02; }
    for (let i = 0; i < 40; i++) { const m = (t0 + t1) / 2; if (f(m) < 0) t0 = m; else t1 = m; }
    const t = (t0 + t1) / 2; return [anchor.p[0] + dir[0] * t, anchor.p[1] + dir[1] * t, anchor.p[2] + dir[2] * t];
  };

  // --- eyes (1.4): cast from the spine point to the surface at +-spread and +elevation ---
  const eyes = [];
  if (face?.eyes) {
    const e = face.eyes;
    for (const side of [1, -1]) {
      const dir = faceRay(face.t ?? 0, face.v ?? 0, side * e.spread, e.elev);
      const hit = castTo(dir), n = gradOf(dCast, hit), r = e.r * (e.size ?? 1);
      eyes.push({ side, r, dir, hit, n, c: sub(hit, sc(n, 0.55 * r)) });
    }
  }
  const eyeD = (x, y, z) => { let d = Infinity; for (const e of eyes) { const v = Math.hypot(x - e.c[0], y - e.c[1], z - e.c[2]) - e.r; if (v < d) d = v; } return d; };
  // marks anchored on the surface: a nose, cast like the eyes
  const marksList = [];
  if (face?.marks) for (const m of face.marks) {
    const hit = castTo(faceRay(m.t ?? face.t ?? 0, m.v ?? face.v ?? 0, m.spread ?? 0, m.elev ?? 0));
    marksList.push({ kind: m.kind, c: hit, sx: m.size, id: m.id ?? m.kind });
  }

  // --- the final distance ---
  function dAll(x, y, z, loc) {
    let d = dSurface(x, y, z, loc);
    if (eyes.length) { const de = eyeD(x, y, z); if (de < d) d = de; }
    return d;
  }
  const F3 = (x, y, z) => -dAll(x, y, z, null);
  const F = (p) => -dAll(p[0], p[1], p[2], null);

  // the local evaluator of a point: the samples that can matter within rad of it
  function makeLoc(x, y, z, rad) {
    let dT = groupD(groups.front, x, y, z, null, null);
    const loc = { front: groupList(groups.front, x, y, z, rad), tail: null, br: new Array(bgroups.length).fill(null) };
    if (groups.tail) { dT = smin(dT, groupD(groups.tail, x, y, z, null, null), tailK); loc.tail = groupList(groups.tail, x, y, z, rad); }
    for (let bj = 0; bj < bgroups.length; bj++) {
      const g = bgroups[bj], lb = Math.sqrt((x - g.gc[0]) ** 2 + (y - g.gc[1]) ** 2 + (z - g.gc[2]) ** 2) - g.gR;
      if (lb > 0 && lb * 0.7 > dT + g.blend0 + 3.2 * rad + 0.05) continue;
      loc.br[bj] = groupList(g, x, y, z, rad);
    }
    return loc;
  }

  // --- attributes at a point: the nearest sample's part, sigma, angle, emission, and the fields ---
  const bellyF = form.face?.belly ?? null;
  const nearest = (x, y, z, loc) => {
    let best = Infinity, bg = null, bi = -1; const h = { i: -1, d: 0 };
    for (let gi = 0; gi < all.length; gi++) {
      const g = all[gi]; let list = null;
      if (loc) { list = g === groups.front ? loc.front : g === groups.tail ? loc.tail : loc.br[bgroups.indexOf(g)]; if (!list) continue; }
      else if (bg && (Math.sqrt((x - g.gc[0]) ** 2 + (y - g.gc[1]) ** 2 + (z - g.gc[2]) ** 2) - g.gR) > best + 0.5) continue;
      groupD(g, x, y, z, h, list);
      if (h.d < best) { best = h.d; bg = g; bi = h.i; }
    }
    return { g: bg, i: bi, d: best };
  };
  function at(p, loc = null, noEye = false) {
    const [x, y, z] = p;
    const nn = nearest(x, y, z, loc), bg = nn.g, bi = nn.i;
    const o = bi * STRIDE, D = bg.data;
    const qx = x - D[o], qy = y - D[o + 1], qz = z - D[o + 2];
    const b = qx * D[o + 6] + qy * D[o + 7] + qz * D[o + 8], c = qx * D[o + 9] + qy * D[o + 10] + qz * D[o + 11];
    const angle = Math.atan2(c, b) / RAD;
    let part = partNames[bg.part[bi]], eye = -1;
    if (eyes.length && !noEye) {
      const de = eyeD(x, y, z);
      if (de < 0.05 && de < dSurface(x, y, z, loc) + 1e-4) { part = "eye"; let bm = 0, bd = Infinity; eyes.forEach((e, i) => { const d = Math.hypot(x - e.c[0], y - e.c[1], z - e.c[2]); if (d < bd) { bd = d; bm = i; } }); eye = bm; }
    }
    let hairHere = false;
    if (hair && part !== "eye") { const dh = hair.d(x, y, z, loc), db = dBodyOnly(x, y, z, loc); if (dh <= db + 1e-3) { hairHere = true; part = "hair"; } else part = "face"; }
    let patch = 0, belly = 0;
    if (anchor && form.face.patch) {
      const P = form.face.patch, v = nrm([x - anchor.p[0], y - anchor.p[1], z - anchor.p[2]]);
      const ang = Math.acos(Math.max(-1, Math.min(1, dot(v, faceDir)))) / RAD;
      patch = smooth((P.angle - ang) / 6 + 0.5);
      if (P.top !== undefined && P.top !== null) patch *= smooth((P.top - dot(v, anchor.N)) / 0.06 + 0.5);
      if (hairHere) patch = 0;
    }
    if (bellyF && bg === groups.front) {
      const sg = bg.sigma[bi], ang = 180 - Math.abs(angle);
      belly = smooth((bellyF.beta - ang) / 6 + 0.5) * smooth((sg - bellyF.s0) / 0.12 + 0.5) * smooth((bellyF.s1 - sg) / 0.12 + 0.5);
    }
    const marks = marksList.map((m) => Math.hypot(x - m.c[0], y - m.c[1], z - m.c[2]) / m.sx);
    return { part, sigma: bg.sigma[bi], s: bg.s[bi], angle, emission: bg.emission[bi], patch, belly, eye, group: bg.id, gi: all.indexOf(bg), marks };
  }
  // a vertex: two Newton steps onto F = 0, the normal by central differences (h = 0.5 voxel), its attributes; all local
  function project(x, y, z, voxel) {
    const loc = null, h = 0.5 * voxel;
    const Fl = (a, b, c) => -dAll(a, b, c, null);
    let g = null;
    for (let it = 0; it < 2; it++) {
      const f = Fl(x, y, z);
      if (it === 0) g = [(Fl(x + h, y, z) - Fl(x - h, y, z)) / (2 * h), (Fl(x, y + h, z) - Fl(x, y - h, z)) / (2 * h), (Fl(x, y, z + h) - Fl(x, y, z - h)) / (2 * h)];
      const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
      if (gg < 1e-12) break;
      const s = f / gg; x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    // a crease (a hard union, the cut plane, the blend's end) can leave a vertex off the surface after two steps: a few more steps for those
    let f = Fl(x, y, z);
    for (let it = 0; it < 6 && Math.abs(f) > 0.04 * voxel; it++) {
      const gg = [(Fl(x + h, y, z) - Fl(x - h, y, z)) / (2 * h), (Fl(x, y + h, z) - Fl(x, y - h, z)) / (2 * h), (Fl(x, y, z + h) - Fl(x, y, z - h)) / (2 * h)], q = gg[0] * gg[0] + gg[1] * gg[1] + gg[2] * gg[2];
      if (q < 1e-12) break; const s = f / q; x -= gg[0] * s; y -= gg[1] * s; z -= gg[2] * s; f = Fl(x, y, z);
    }
    return { p: [x, y, z], n: [-g[0] / l, -g[1] / l, -g[2] / l], a: at([x, y, z], loc) };
  }

  // --- the bounds, generous: the samples with their half-sizes, the coat and the hair ---
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const g of all) for (let i = 0; i < g.n; i++) {
    const o = i * STRIDE, e = g.half[i];
    for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], g.data[o + a] - e); hi[a] = Math.max(hi[a], g.data[o + a] + e); }
  }
  const pad = (coat?.depth ?? 0) + 0.05 + (hair ? hair.depth + 0.1 : 0);
  for (let a = 0; a < 3; a++) { lo[a] -= pad; hi[a] += pad; }
  if (hair) { const R = hair.Rmax + 0.1; lo[0] = Math.min(lo[0], -R); hi[0] = Math.max(hi[0], R); lo[1] = Math.min(lo[1], -R); hi[1] = Math.max(hi[1], R); hi[2] = Math.max(hi[2], hair.zp + 1.5 * hair.Rp); }
  if (base !== null) lo[2] = Math.max(lo[2], base - 0.01);
  for (const e of eyes) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], e.c[a] - e.r); hi[a] = Math.max(hi[a], e.c[a] + e.r); }

  const seeds = [];
  for (const g of all) { const stepI = Math.max(1, Math.round(0.1 / Math.max(0.005, g.n > 1 ? g.length / (g.n - 1) : 0.05))); for (let i = 0; i < g.n; i += stepI) { const o = i * STRIDE; seeds.push({ p: [g.data[o], g.data[o + 1], g.data[o + 2]], r: g.half[i] }); } }

  // the pieces separately, for tests: trunk, each branch, the union
  const parts = (p) => {
    const [x, y, z] = p;
    const trunk = dTrunkOnly(x, y, z, null);
    return { trunk, branches: bgroups.map((g) => { const dj = groupD(g, x, y, z, hitB, null); return { id: g.id, d: dj, s: g.s[hitB.i], length: g.length, k: g.blend0 * (1 - smooth(g.s[hitB.i] / (0.35 * g.length))) }; }), union: dBodyOnly(x, y, z, null) };
  };
  return { seeds, F, F3, d: (x, y, z) => dAll(x, y, z, null), at: (p, noEye = false) => at(p, null, noEye), project, eyes, marks: marksList, bounds: { lo, hi }, shift: S, floor, base, parts, groups: { all, partNames, front: groups.front, tail: groups.tail, branches: bgroups }, hair, partNames, anchor, faceDir, coat, dCast, dBodyOnly, noise3, noiseTerms: 0, makeLoc, dAllLoc: dAll, S };
}

// ---- the hair: shell above the part line, a curtain that hangs (design 5.5), and a hem of locks (5.6) --------------------------------
// Below the part line the radius scale is s(z) = 1 + m L_d (1 - e^(-dz/L_d)) + flare smoothstep(.75, 1, g): the curtain leaves the shell
// on its tangent (m the shell's own relative slope), is vertical within about 2 L_d, and splays only in the hem zone (g >= .75).
// The hem is `locks` locks (17): a flat tip lifted by at most `lift`, a V notch `notch` deep between neighbours, tips splayed out by at most `splay`.
export const HEM_TIP_SHARE = 0.65;
function makeHair(h, S, base, dTrunk0) {
  const dTrunk = (x, y, z, loc) => dTrunk0(x, y, z, loc);
  const zp = h.partLine + S, floorZ = base ?? 0, depth = h.depth;
  const dShell = (x, y, z, loc) => dTrunk(x, y, z, loc) - depth;
  // the radius of the shell at a height, per angle, by bisection on the horizontal ray
  const radius = (th, z) => { let a = 0.02, b = 6; const c = Math.cos(th), s = Math.sin(th); for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (dShell(m * c, m * s, z) < 0) a = m; else b = m; } return (a + b) / 2; };
  let Rp = 0, m = 0; const NA = 24;
  for (let i = 0; i < NA; i++) {
    const th = (i / NA) * 2 * Math.PI, R0 = radius(th, zp), e = 0.01, Rm = radius(th, zp + e), Rn = radius(th, zp - e);
    Rp += R0 / NA;
    m += ((Rn - Rm) / (2 * e) / R0) / NA; // the radius grows downward: the shell's own slope at the part line (the tangent rule)
  }
  m = Math.max(0, m);
  const Ld = h.Ld ?? 0.3, flare = h.flare ?? 0.06, strands = h.strands ?? 46, gA = h.groove ?? 0.01;
  // the hem: n locks of uneven width, a hashed phase; per lock a tip lift, a notch depth and a splay
  const nl = h.locks ?? 17, notch = h.notch ?? 0.1, liftMax = h.lift ?? 0.015, splayMax = h.splay ?? 0.04, jag = [], lift = [], nt = [], spl = [];
  for (let i = 0; i < nl; i++) { jag.push((hash1(i, 11) - 0.5) * 0.5); lift.push(liftMax * hash1(i, 29)); nt.push(notch * (0.85 + 0.15 * hash1(i, 41))); spl.push(splayMax * (0.4 + 0.6 * hash1(i, 53))); }
  const phase = hash1(3, 77) * 2 * Math.PI / nl;
  const B = (i) => ((i + jag[((i % nl) + nl) % nl]) / nl) * 2 * Math.PI;
  const lockAt = (th) => { // [height of the hem above the floor, splay] at the angle th
    let t = th - phase; t = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let i = Math.floor((t / (2 * Math.PI)) * nl);
    for (let guard = 0; guard < 3; guard++) { if (t < B(i)) i--; else if (t >= B(i + 1)) i++; else break; }
    const f = (t - B(i)) / (B(i + 1) - B(i)), tri = Math.abs(2 * f - 1), k = ((i % nl) + nl) % nl;
    const v = smooth((tri - HEM_TIP_SHARE) / (1 - HEM_TIP_SHARE)); // 0 on the tip, 1 in the notch (eased at both ends: no crease for the projection)
    const kb = ((i + (f < 0.5 ? 0 : 1)) % nl + nl) % nl; // the notch depth belongs to the boundary, so two neighbours agree (no step in the hem)
    return [lift[k] + (nt[kb] - lift[k]) * v, spl[k] * (1 - tri) * (1 - tri)];
  };
  const hemH = (th) => lockAt(th)[0];
  const NLUT = 4096, hemLut = new Float64Array(NLUT + 2), splLut = new Float64Array(NLUT + 2);
  for (let i = 0; i <= NLUT + 1; i++) { const q = lockAt((i / NLUT) * 2 * Math.PI); hemLut[i] = q[0]; splLut[i] = q[1]; }
  const lut = (L, th) => { let t = th / (2 * Math.PI); t -= Math.floor(t); const q = t * NLUT, i = Math.min(NLUT, Math.floor(q)), f = q - i; return L[i] + (L[i + 1] - L[i]) * f; };
  const hemFast = (th) => lut(hemLut, th), splayFast = (th) => lut(splLut, th);
  const smoothG = (g) => smooth((g - 0.75) / 0.25);
  const scaleAt = (th, z) => { // the radius scale of the curtain at height z and angle th
    const zh = floorZ + hemFast(th), Dz = Math.max(0, zp - z), g = Dz / Math.max(1e-6, zp - zh), sg = smoothG(g);
    return 1 + m * Ld * (1 - Math.exp(-Dz / Ld)) + (flare + splayFast(th) / Rp) * sg;
  };
  const groove = (x, y, th) => { const r = Math.hypot(x, y); return gA * smooth(r / 0.8) * 0.5 * (1 + Math.cos(strands * th + 1.3)); };
  function dHairOnly(x, y, z, loc) {
    const th = Math.atan2(y, x);
    let d;
    if (z >= zp) d = dShell(x, y, z, loc);
    else {
      const zh = floorZ + hemFast(th), s = scaleAt(th, z);
      d = s * dShell(x / s, y / s, zp, null); // the section at the part line: not near this point, so the full evaluator
      // the hem cut, divided by the gradient of its own height (a V notch of slope ~1 would make the field 1.4-Lipschitz)
      const e = 0.01, dz = (hemFast(th + e) - hemFast(th - e)) / (2 * e) / Math.max(0.2, Math.hypot(x, y));
      d = smax(d, (zh - z) / Math.sqrt(1 + dz * dz), 0.04); // a rounded crease (a corner sharper than the voxel defeats the projection)
    }
    return d + groove(x, y, th);
  }
  const wc = h.window ? [h.window.c[0], h.window.c[1], h.window.c[2] + S] : null, wr = h.window?.r, kw = h.window?.k ?? 0.05;
  function dWin(x, y, z) { return ellipsoidD(x - wc[0], y - wc[1], z - wc[2], wr[0], wr[1], wr[2]); }
  const dFn = (x, y, z, loc) => (wc ? smax(dHairOnly(x, y, z, loc), -dWin(x, y, z), kw) : dHairOnly(x, y, z, loc));
  // the largest radius, for the bounds
  let Rmax = 0; for (let i = 0; i < 64; i++) { const th = (i / 64) * 2 * Math.PI; Rmax = Math.max(Rmax, Rp * scaleAt(th, floorZ + 0.001)); }
  return { d: dFn, dHairOnly, dWin, dShell, zp, m, Rp, hemH, hemFast, scaleAt, lockCount: nl, depth, flare, Ld, Rmax, window: wc ? { c: wc, r: wr } : null, radius, floorZ, tau: m * Rp };
}
