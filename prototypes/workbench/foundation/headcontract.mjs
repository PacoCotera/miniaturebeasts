// The round head's contract (AD mesh gate, ruling 0, "the replacement head"): the head-frame numbers read off the head field, and the screen numbers read off a 304 picture,
// on the master and on a build the same way, so the head sheet can print both. Plain JavaScript, no node: imports. The numbers it is judged against are the AD's
// (the sheet prints them as targets); none is a rule of the house file.

// ---- the head frame: front and side sections of the field (H = 1, x forward, y left, z up, the origin at the skull's centre) ----------------------------------------------
export function frameMeasures(head, { step = 0.02 } = {}) {
  const f = head.d0, K = head.dK, zs = [], rowOf = (field, z) => {
    let xr = null, xf = null, yw = 0;
    for (let x = -1.1; x <= 1.3; x += step) { let inside = false; for (let y = 0; y <= 1.2; y += step) if (field(x, y, z) < 0) { inside = true; if (y > yw) yw = y; } if (inside) { if (xr === null) xr = x; xf = x; } }
    return { z, xr, xf, w: 2 * yw };
  };
  for (let z = 0.5; z >= -0.55; z -= step) zs.push(rowOf(f, z));
  const sk = []; for (let z = 0.5; z >= -0.5; z -= step) sk.push(rowOf(K, z));
  const zEye = head.geometry.zEye, at = (rows, z) => rows.reduce((b, r) => (Math.abs(r.z - z) < Math.abs(b.z - z) ? r : b)), eyeRow = at(zs, zEye);
  const W = Math.max(...zs.filter((r) => Math.abs(r.z - zEye) < 0.1).map((r) => r.w)), wAt = (dz) => at(zs, zEye + dz).w;
  // the skull's own depth (widest over z), the length with the muzzle (rear-most to front-most over every z)
  const depth = Math.max(...sk.filter((r) => r.xr !== null).map((r) => r.xf - r.xr)), rear = Math.min(...zs.filter((r) => r.xr !== null).map((r) => r.xr)), front = Math.max(...zs.filter((r) => r.xf !== null).map((r) => r.xf));
  // the crown's place: the middle of the top rows (z 0.05 under the crown), as a share of the length from the back
  const skRear = Math.min(...sk.filter((r) => r.xr !== null).map((r) => r.xr)), skFront = Math.max(...sk.filter((r) => r.xf !== null).map((r) => r.xf)), topRow = at(sk, 0.5 - 0.06), crownShare = (((topRow.xr + topRow.xf) / 2) - skRear) / (skFront - skRear);
  // the snout: how far the muzzle's front stands proud of the skull's front at its height, and its height below the crown
  const muzzleFront = Math.max(...zs.map((r) => r.xf ?? -9)), zMuzzle = zs.find((r) => r.xf === muzzleFront).z, skullFrontThere = at(sk, zMuzzle).xf;
  // the brow: the top outline from the crown to the top of the eye's ring, in the body-plane section (y = 0): how far it stands outside the straight chord
  const topOf = (x) => { for (let z = 0.6; z > -0.6; z -= 0.005) if (f(x, 0, z) < 0) return z; return null; };
  const ex = head.eyes[0].c[0] + head.eyes[0].Reye * 0.0, zTopEye = zEye + head.geometry.Reye;
  let xCrown = 0, zCrown = -9; for (let x = -0.5; x <= 0.5; x += 0.01) { const z = topOf(x); if (z !== null && z > zCrown) { zCrown = z; xCrown = x; } }
  const frontAtZ = (z) => { let xf = null; for (let x = -1; x <= 1.3; x += 0.01) if (f(x, 0, z) < 0) xf = x; return xf; };
  const xBrow = frontAtZ(zTopEye), bx = [], bz = [];
  for (let x = xCrown; x <= xBrow; x += 0.01) { const z = topOf(x); if (z !== null) { bx.push(x); bz.push(z); } }
  let brow = 0; if (bx.length > 2) { const x0 = bx[0], z0 = bz[0], x1 = bx[bx.length - 1], z1 = bz[bz.length - 1], len = Math.hypot(x1 - x0, z1 - z0); for (let i = 0; i < bx.length; i++) brow = Math.max(brow, ((bx[i] - x0) * (z1 - z0) - (bz[i] - z0) * (x1 - x0)) / -len); }
  // the rear-most point's height, and the back of the skull's roundness (the rear at z 0.25 under the crown against the rear-most)
  const plateau = zs.filter((r) => r.xr !== null && r.xr <= rear + 0.011), rearRow = { z: plateau.reduce((p, r) => p + r.z, 0) / plateau.length };
  return { W, depth, length: front - rear, crownShare, wUp30: wAt(0.30) / W, wDown35: wAt(-0.35) / W, snout: muzzleFront - skullFrontThere, zMuzzleFront: zMuzzle, muzzleBelowCrown: 0.5 - zMuzzle, rearZ: rearRow.z, brow, heightOverWidth: 1 / W, zEye };
}

// ---- the screen: a 304 picture (RGBA, alpha > 128 opaque; leaves masked by hue) -------------------------------------------------------------------------------
const px = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
export function masks(img) {
  const { width: w, height: h } = img, opq = new Uint8Array(w * h), body = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = px(img, x, y); if (a > 128) { opq[y * w + x] = 1; if (!(g - b > 30 && g >= r * 0.88)) body[y * w + x] = 1; } }
  return { opq, body, w, h };
}
// the iris centres (the two largest orange blobs above row 200), far then near, and the line's tilt, far side up positive
export function irisCentres(img) {
  const { width: w, height: h } = img, m = new Uint8Array(w * h);
  for (let y = 0; y < Math.min(h, 200); y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = px(img, x, y); if (a > 128 && r - b > 70 && r > g + 35 && g < 150) m[y * w + x] = 1; }
  const lab = new Int32Array(w * h), blobs = []; let n = 0;
  for (let s = 0; s < w * h; s++) if (m[s] && !lab[s]) { n++; const st = [s]; lab[s] = n; let sx = 0, sy = 0, c = 0; while (st.length) { const p = st.pop(), x = p % w, y = (p / w) | 0; sx += x; sy += y; c++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && m[Y * w + X] && !lab[Y * w + X]) { lab[Y * w + X] = n; st.push(Y * w + X); } } } blobs.push({ x: sx / c, y: sy / c, n: c }); }
  const two = blobs.sort((a, b) => b.n - a.n).slice(0, 2).sort((a, b) => a.x - b.x);
  if (two.length < 2) return { far: null, near: null, tiltDeg: null };
  const [far, near] = two; return { far, near, tiltDeg: (Math.atan2(near.y - far.y, near.x - far.x) * 180) / Math.PI };
}
// the head's screen numbers from the picture alone: crown, the top outline's dome, the nape notch, the rear, the left edge per row
export function screenMeasures(img) {
  const { opq, body, w, h } = masks(img);
  const top = []; for (let x = 0; x < w; x++) { let t = null; for (let y = 0; y < h; y++) if (body[y * w + x]) { t = y; break; } top.push(t); }
  const left = (y) => { for (let x = 0; x < w; x++) if (opq[y * w + x]) return x; return null; };
  const cols = top.map((t, x) => (t === null ? null : x)).filter((x) => x !== null);
  // the crown: the highest body pixel over the head (the first 230 columns, left of the back's own rise)
  let cx = cols[0]; for (const x of cols) if (x < 190 && top[x] < top[cx]) cx = x;
  const crown = top[cx];
  // the dome: the run of columns around the crown whose top is within 8 px of it
  let d0 = cx, d1 = cx; while (d0 > 0 && top[d0 - 1] !== null && top[d0 - 1] <= crown + 8) d0--; while (top[d1 + 1] !== null && top[d1 + 1] <= crown + 8) d1++;
  // the nape notch: the lowest top-outline point between the crown's rear end and the back's next peak (a rise of 3 px or more after it, else the lowest within 60 px)
  let ni = d1; for (let x = d1; x < Math.min(w, d1 + 100); x++) { if (top[x] === null) break; if (top[x] > top[ni]) ni = x; else if (top[x] < top[ni] - 3) break; }
  const leftMost = Math.min(...Array.from({ length: 140 }, (_, i) => left(60 + i)).filter((v) => v !== null));
  const rows = {}; for (let y = 90; y <= 200; y += 10) rows[y] = left(y);
  // forward-most point: the left-most opaque pixel over the head's rows (60 to 200), its row
  let fx = Infinity; for (let y = 60; y < 200; y++) { const l = left(y); if (l !== null && l < fx) fx = l; }
  const fr = []; for (let y = 60; y < 200; y++) { const l = left(y); if (l !== null && l <= fx + 1) fr.push(y); } const fy = fr.reduce((p, q) => p + q, 0) / fr.length;
  const rearAt = (x) => top[x];
  return { crown, crownX: cx, domeX0: d0, domeX1: d1, domeSpan: d1 - d0 + 1, notch: { x: ni, y: top[ni] }, forward: { x: fx, y: fy }, leftEdge: rows, rearAt180: rearAt(180), top, leftMost: fx,
    // the rear's fall: from the dome's rear end to the notch, in degrees from the horizontal
    rearFallDeg: (Math.atan2(top[ni] - top[d1], Math.max(1, ni - d1)) * 180) / Math.PI };
}
// the head alone, from its field: the head's interior points (a grid in its frame, no leaves, no body) through `proj` give the head's outline in the picture. Per pixel column the
// top and bottom, per pixel row the left-most and right-most, the way the picture's own outline is read (a grid of `step` H, about 2 px)
export function headSilhouette(scene, proj, { step = 0.025, W = 304, H = 312 } = {}) {
  const f = scene.head.d0, top = new Array(W).fill(null), bot = new Array(W).fill(null), left = new Array(H).fill(null), right = new Array(H).fill(null);
  const mark = (a, b) => { const x = Math.round(a), y = Math.round(b); if (x < 0 || y < 0 || x >= W || y >= H) return; if (top[x] === null || y < top[x]) top[x] = y; if (bot[x] === null || y > bot[x]) bot[x] = y; if (left[y] === null || x < left[y]) left[y] = x; if (right[y] === null || x > right[y]) right[y] = x; };
  for (let x = -0.8; x <= 1.0; x += step) for (let y = -0.9; y <= 0.9; y += step) for (let z = -0.62; z <= 0.56; z += step) if (f(x, y, z) < 0) { const [a, b] = proj([x, y, z]); mark(a, b); mark(a + 0.5, b); mark(a, b + 0.5); mark(a - 0.5, b); mark(a, b - 0.5); }
  return { top, bottom: bot, left, right };
}
// the AD's screen contract read off an outline: `top` per column, `left` per row. The dome is the run of columns within 8 px of the crown; the rear falls from the dome's rear end to
// the notch (the first low point after it that the outline rises from)
export function contractFromOutline({ top, left }) {
  const cols = top.map((t, x) => (t === null ? null : x)).filter((x) => x !== null), c0 = cols[0];
  let cx = c0; for (const x of cols) if (top[x] < top[cx]) cx = x;
  const crown = top[cx]; let d0 = cx, d1 = cx; while (d0 > 0 && top[d0 - 1] !== null && top[d0 - 1] <= crown + 8) d0--; while (top[d1 + 1] !== null && top[d1 + 1] <= crown + 8) d1++;
  let fx = Infinity; for (let y = 0; y < left.length; y++) if (left[y] !== null && left[y] < fx) fx = left[y];
  const rowsAt = []; for (let y = 0; y < left.length; y++) if (left[y] !== null && left[y] <= fx + 1) rowsAt.push(y);
  const fy = rowsAt.reduce((a, b) => a + b, 0) / rowsAt.length;
  return { crown, crownX: cx, domeX0: d0, domeX1: d1, domeSpan: d1 - d0 + 1, left0: c0, forward: { x: fx, y: fy }, rearAt: (x) => top[x] };
}

// the picture's pixel of a head-local point, for a scene seen in a camera and framed as renderCreature frames it (the same extents, reference and size)
import { fromLocal } from "./sdf.mjs";
import { cameraBasis, framing } from "./render.mjs";
export function projector(scene, camera, sizeKey, ref, extents) {
  const B = cameraBasis(camera), fr = framing(scene, camera, sizeKey, ref, extents), bb = scene.bounds, cb = [0, 1, 2].map((i) => (bb.lo[i] + bb.hi[i]) / 2), dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  return (v) => { const p = fromLocal(scene.hf, v), q = [p[0] - cb[0], p[1] - cb[1], p[2] - cb[2]], a = dot(q, B.right), b = dot(q, B.up); return [fr.W / 2 + (a - fr.cx) * fr.scale, fr.feet + 1 - (b - fr.bottom) * fr.scale]; };
}
