// Packs a plain studio GLB (written by studio_glb.py) with meshopt, and reads a packed one back for the tests.
//   node pack.mjs pack IN.glb OUT.glb     triangles reordered for the vertex cache and fetch, vertex streams re-ordered to match,
//                                         NORMAL octahedral 8 bit (KHR_mesh_quantization), POSITION and morph deltas exponent filter,
//                                         every vertex buffer EXT_meshopt_compression ATTRIBUTES, the indices TRIANGLES.
//   node pack.mjs check FILE.glb          decodes a packed GLB and prints what it holds as one JSON line (no file is written).
// The input holds, per primitive: POSITION float VEC3, NORMAL float VEC3, TEXCOORD_0 ushort-normalised VEC2, JOINTS_0 ubyte VEC4, WEIGHTS_0 ubyte-normalised VEC4,
// targets[].POSITION float VEC3, indices ushort or uint. Anything else (matrices, the zone map image) is copied as it is.
import { readFileSync, writeFileSync } from "node:fs";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import { MeshoptDecoder } from "meshoptimizer/decoder";

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const BITS_POS = 12, BITS_DELTA = 10;    // mantissa bits kept: a position to about 2^-12 of its largest coordinate (0.0005 in the sculpt's units, where H is 2.2), a morph delta to about 2^-10 of its largest
const align4 =(n) => (n + 3) & ~3;

function readGlb(path) {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 4) !== "glTF") throw new Error(`${path}: not a glb`);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.toString("utf8", 20, 20 + jl));
  const bl = b.readUInt32LE(20 + jl);
  const bin = new Uint8Array(b.buffer, b.byteOffset + 28 + jl, bl);
  return { json, bin };
}

function writeGlb(path, json, bin) {
  let j = Buffer.from(JSON.stringify(json), "utf8");
  j = Buffer.concat([j, Buffer.alloc(align4(j.length) - j.length, 0x20)]);
  const bpad = Buffer.concat([Buffer.from(bin), Buffer.alloc(align4(bin.length) - bin.length)]);
  const head = Buffer.alloc(12);
  head.write("glTF", 0, "latin1");
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + j.length + 8 + bpad.length, 8);
  const ch = (len, tag) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.write(tag, 4, "latin1"); return h; };
  writeFileSync(path, Buffer.concat([head, ch(j.length, "JSON"), j, ch(bpad.length, "BIN\0"), bpad]));
}

function accessorArray(json, bin, i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const T = CT[a.componentType], n = NC[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const bytes = new Uint8Array(a.count * n * T.BYTES_PER_ELEMENT);
  bytes.set(bin.subarray(off, off + bytes.length));
  return new T(bytes.buffer);
}

async function pack(inp, out) {
  await MeshoptEncoder.ready;
  const { json, bin } = readGlb(inp);
  const prim = json.meshes[0].primitives[0];
  const used = new Map();                      // bufferView -> {kind, accessor}
  const names = Object.keys(prim.attributes);
  const streams = [];                          // {key, acc, kind}
  for (const k of names) streams.push({ key: k, acc: prim.attributes[k], kind: k });
  (prim.targets || []).forEach((t, ti) => { for (const k of Object.keys(t)) streams.push({ key: `t${ti}.${k}`, acc: t[k], kind: `target.${k}` }); });
  // 1. the triangles: cache order, then every vertex stream follows the new vertex order
  const idxAcc = json.accessors[prim.indices];
  const idx = Uint32Array.from(accessorArray(json, bin, prim.indices));
  const nv = json.accessors[prim.attributes.POSITION].count;
  const [remap, unique] = MeshoptEncoder.reorderMesh(idx, true, true);
  if (unique !== nv) throw new Error(`${inp}: ${nv - unique} vertices no triangle uses`);
  const data = {};
  for (const s of streams) {
    const a = json.accessors[s.acc];
    const src = accessorArray(json, bin, s.acc), n = NC[a.type];
    const dst = new src.constructor(src.length);
    for (let v = 0; v < nv; v++) for (let c = 0; c < n; c++) dst[remap[v] * n + c] = src[v * n + c];
    data[s.key] = dst;
  }
  // 2. the new buffer: compressed views first, the plain ones after
  const chunks = [];
  let pos = 0;
  const add = (u8) => { const o = pos; chunks.push(u8); pos += align4(u8.length); if (u8.length % 4) chunks.push(new Uint8Array(align4(u8.length) - u8.length)); return o; };
  const fallbackViews = [];                    // [bufferView json] in the fallback buffer
  const newViews = [], newAcc = [];
  let fbPos = 0;
  const view = (comp, uncompressedLen, byteStride, mode, filter, count, target) => {
    const o = add(comp);
    const bv = { buffer: 1, byteOffset: fbPos, byteLength: uncompressedLen, target, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: o, byteLength: comp.length, byteStride, mode, count, ...(filter ? { filter } : {}) } } };
    if (mode === "ATTRIBUTES") bv.byteStride = byteStride;
    fbPos += align4(uncompressedLen);
    newViews.push(bv);
    return newViews.length - 1;
  };
  const accOut = {};
  const f32 = (arr, per) => { const o = new Float32Array(arr.length / per * 4); for (let v = 0; v < arr.length / per; v++) for (let c = 0; c < per; c++) o[v * 4 + c] = arr[v * per + c]; return o; };
  for (const s of streams) {
    const a = json.accessors[s.acc], d = data[s.key];
    let comp, bvi, na;
    if (s.kind === "NORMAL") {
      comp = MeshoptEncoder.encodeVertexBufferLevel(MeshoptEncoder.encodeFilterOct(f32(d, 3), nv, 4, 8), nv, 4, 2, 0);
      bvi = view(comp, nv * 4, 4, "ATTRIBUTES", "OCTAHEDRAL", nv, 34962);
      na = { bufferView: bvi, componentType: 5120, normalized: true, count: nv, type: "VEC3" };
    } else if (s.kind === "POSITION" || s.kind.startsWith("target.")) {
      comp = MeshoptEncoder.encodeVertexBufferLevel(MeshoptEncoder.encodeFilterExp(d, nv, 12, s.kind === "POSITION" ? BITS_POS : BITS_DELTA, "SharedVector"), nv, 12, 2, 0);
      bvi = view(comp, nv * 12, 12, "ATTRIBUTES", "EXPONENTIAL", nv, 34962);
      na = { bufferView: bvi, componentType: 5126, count: nv, type: "VEC3" };
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], d[v * 3 + c]); mx[c] = Math.max(mx[c], d[v * 3 + c]); }
      na.min = mn; na.max = mx;
    } else {
      const n = NC[a.type], size = n * d.BYTES_PER_ELEMENT;
      if (size % 4) throw new Error(`${s.kind}: element of ${size} bytes`);
      const raw = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
      comp = MeshoptEncoder.encodeVertexBufferLevel(raw, nv, size, 2, 0);
      bvi = view(comp, nv * size, size, "ATTRIBUTES", null, nv, 34962);
      na = { bufferView: bvi, componentType: a.componentType, count: nv, type: a.type, ...(a.normalized ? { normalized: true } : {}) };
    }
    newAcc.push(na);
    accOut[s.key] = newAcc.length - 1;
  }
  const idxArr = idxAcc.componentType === 5123 && nv < 65536 ? Uint16Array.from(idx) : idx;
  const ib = new Uint8Array(idxArr.buffer, idxArr.byteOffset, idxArr.byteLength);
  const icomp = MeshoptEncoder.encodeIndexBuffer(ib, idxArr.length, idxArr.BYTES_PER_ELEMENT);
  const ibv = view(icomp, ib.length, idxArr.BYTES_PER_ELEMENT, "TRIANGLES", null, idxArr.length, 34963);
  newAcc.push({ bufferView: ibv, componentType: idxArr instanceof Uint16Array ? 5123 : 5125, count: idxArr.length, type: "SCALAR" });
  const iacc = newAcc.length - 1;
  // 3. the plain accessors the primitive does not own (inverse bind matrices): copied into the packed buffer
  const owned = new Set([...streams.map((s) => s.acc), prim.indices]);
  const remapAcc = {};
  json.accessors.forEach((a, i) => {
    if (owned.has(i)) return;
    const bv = json.bufferViews[a.bufferView];
    const n = NC[a.type] * CT[a.componentType].BYTES_PER_ELEMENT * a.count;
    const o = add(bin.slice((bv.byteOffset || 0) + (a.byteOffset || 0), (bv.byteOffset || 0) + (a.byteOffset || 0) + n));
    newViews.push({ buffer: 0, byteOffset: o, byteLength: n });
    newAcc.push({ ...a, bufferView: newViews.length - 1, byteOffset: undefined });
    delete newAcc[newAcc.length - 1].byteOffset;
    remapAcc[i] = newAcc.length - 1;
  });
  const images = (json.images || []).map((im) => {
    const bv = json.bufferViews[im.bufferView];
    const o = add(bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
    newViews.push({ buffer: 0, byteOffset: o, byteLength: bv.byteLength });
    return { ...im, bufferView: newViews.length - 1 };
  });
  // 4. the document
  const attrs = {};
  for (const k of names) attrs[k] = accOut[k];
  const np = { ...prim, attributes: attrs, indices: iacc };
  if (prim.targets) np.targets = prim.targets.map((t, ti) => Object.fromEntries(Object.keys(t).map((k) => [k, accOut[`t${ti}.${k}`]])));
  const meshes = json.meshes.map((m, i) => (i === 0 ? { ...m, primitives: [np, ...m.primitives.slice(1)] } : m));
  const skins = (json.skins || []).map((s) => ({ ...s, inverseBindMatrices: remapAcc[s.inverseBindMatrices] }));
  const body = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) { body.set(c, o); o += c.length; }
  const nj = { ...json, meshes, accessors: newAcc, bufferViews: newViews, buffers: [{ byteLength: body.length }, { byteLength: fbPos, extensions: { EXT_meshopt_compression: { fallback: true } } }] };
  if (skins.length) nj.skins = skins; else delete nj.skins;
  if (images.length) nj.images = images; else delete nj.images;
  const need = ["EXT_meshopt_compression", "KHR_mesh_quantization"];
  nj.extensionsUsed = need;
  nj.extensionsRequired = need;
  writeGlb(out, nj, body);
}

async function check(path) {
  await MeshoptDecoder.ready;
  const { json, bin } = readGlb(path);
  const dec = (bvi) => {
    const bv = json.bufferViews[bvi];
    const e = bv.extensions && bv.extensions.EXT_meshopt_compression;
    if (!e) return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const out = new Uint8Array(e.count * e.byteStride);
    MeshoptDecoder.decodeGltfBuffer(out, e.count, e.byteStride, bin.subarray(e.byteOffset, e.byteOffset + e.byteLength), e.mode, e.filter);
    return out;
  };
  const arr = (ai) => {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView];
    const raw = dec(a.bufferView);
    const T = CT[a.componentType], n = NC[a.type], stride = bv.byteStride || n * T.BYTES_PER_ELEMENT;
    const o = new Float64Array(a.count * n);
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const get = { 5120: (p) => dv.getInt8(p), 5121: (p) => dv.getUint8(p), 5122: (p) => dv.getInt16(p, true), 5123: (p) => dv.getUint16(p, true), 5125: (p) => dv.getUint32(p, true), 5126: (p) => dv.getFloat32(p, true) }[a.componentType];
    const norm = a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType] : 1;
    for (let v = 0; v < a.count; v++) for (let c = 0; c < n; c++) o[v * n + c] = Math.max(get(v * stride + c * T.BYTES_PER_ELEMENT) / norm, a.normalized && a.componentType % 2 === 0 ? -1 : -Infinity);
    return o;
  };
  const prim = json.meshes[0].primitives[0];
  const nv = json.accessors[prim.attributes.POSITION].count;
  const P = arr(prim.attributes.POSITION), N = arr(prim.attributes.NORMAL);
  const idx = arr(prim.indices);
  const r = { vertices: nv, triangles: idx.length / 3, extensions: json.extensionsRequired, bytes: bin.length };
  let nmin = 9, nmax = 0;
  for (let v = 0; v < nv; v++) { const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); nmin = Math.min(nmin, l); nmax = Math.max(nmax, l); }
  r.normal_len = [nmin, nmax];
  r.index_max = idx.reduce((m, x) => Math.max(m, x), 0);
  r.bounds = [0, 1, 2].map((c) => [Math.min(...Array.from({ length: nv }, (_, v) => P[v * 3 + c])), Math.max(...Array.from({ length: nv }, (_, v) => P[v * 3 + c]))]);
  let area = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const u = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]), w = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
    area += 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
  }
  r.area = area;
  if (prim.attributes.WEIGHTS_0 !== undefined) {
    const W = arr(prim.attributes.WEIGHTS_0), J = arr(prim.attributes.JOINTS_0);
    let wmin = 9, wmax = 0, bad = 0, jmax = 0;
    for (let v = 0; v < nv; v++) { const s = W[v * 4] + W[v * 4 + 1] + W[v * 4 + 2] + W[v * 4 + 3]; wmin = Math.min(wmin, s); wmax = Math.max(wmax, s); if (s < 0.5) bad++; for (let c = 0; c < 4; c++) jmax = Math.max(jmax, J[v * 4 + c]); }
    r.weight_sum = [wmin, wmax];
    r.unweighted = bad;
    r.joint_max = jmax;
  }
  if (prim.targets) {
    r.targets = prim.targets.map((t) => { const d = arr(t.POSITION); let m = 0, nz = 0; for (let v = 0; v < nv; v++) { const l = Math.hypot(d[v * 3], d[v * 3 + 1], d[v * 3 + 2]); m = Math.max(m, l); if (l > 1e-6) nz++; } return { max: m, moved: nz }; });
  }
  r.target_names = (json.meshes[0].extras || {}).targetNames || [];
  r.joints = json.skins ? json.skins[0].joints.map((j) => json.nodes[j].name) : [];
  console.log(JSON.stringify(r));
}

const [mode, a, b] = process.argv.slice(2);
if (mode === "pack") await pack(a, b);
else if (mode === "check") await check(a);
else { console.error("usage: node pack.mjs pack IN OUT | check FILE"); process.exit(2); }
