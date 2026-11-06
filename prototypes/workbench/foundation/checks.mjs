// What the picture says about itself (plan 4.1, the render level): the eye components, the nose and mouth ink, the gaze, at 96 and 48. These are the
// numbers the house's R7, R15 and R33 name. They check; they never sign.
import { INK } from "./paint.mjs";

// the connected components of the pixels whose ink code is in `codes`; each { n, x0, y0, x1, y1, w, h }
export function components(r, codes) {
  const { width: W, height: H, ink } = r, seen = new Uint8Array(W * H), out = [];
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || !codes.includes(ink[s])) continue;
    const st = [s]; seen[s] = 1; let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    while (st.length) { const o = st.pop(), x = o % W, y = (o - x) / W; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (!seen[q] && codes.includes(ink[q])) { seen[q] = 1; st.push(q); } } }
    out.push({ n, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out;
}
export function faceInk(r) {
  const eyeCodes = [INK.iris, INK.pupil, INK.catch, INK.lid], eyes = components(r, eyeCodes).filter((c) => c.n >= 3).sort((a, b) => b.n - a.n).slice(0, 2);
  const pupils = components(r, [INK.pupil]).sort((a, b) => b.n - a.n), nose = components(r, [INK.nose]).sort((a, b) => b.n - a.n)[0], mouth = components(r, [INK.mouth]).sort((a, b) => b.n - a.n)[0];
  const catches = components(r, [INK.catch]);
  return { eyeComponents: eyes.length, iris: eyes.length ? Math.max(...eyes.map((e) => Math.max(e.w, e.h))) : 0, pupil: pupils.length ? Math.max(pupils[0].w, pupils[0].h) : 0, catchLights: catches.length, nose: nose ? Math.max(nose.w, nose.h) : 0, mouth: mouth ? Math.max(mouth.w, mouth.h) : 0, eyeBoxes: eyes };
}
// the gaze (R7): the pupil's offset in its iris, in E, and the angle between the two screen vectors; the catch lights' offset difference in px
export function gazeOf(r, scene) {
  const g = r.paint.gaze, E = scene.head.measures.E, off = g.map((v) => Math.hypot(v[0], v[1]) / E);
  const rr = r.meta.basis.right, uu = r.meta.basis.up, hf = scene.hf;
  const toScreen = (i) => { const e = scene.head.eyes[i], v = g[i], w = [e.lat[0] * v[0] + e.up[0] * v[1], e.lat[1] * v[0] + e.up[1] * v[1], e.lat[2] * v[0] + e.up[2] * v[1]], R = hf.R, ww = [R[0] * w[0] + R[1] * w[1] + R[2] * w[2], R[3] * w[0] + R[4] * w[1] + R[5] * w[2], R[6] * w[0] + R[7] * w[1] + R[8] * w[2]]; return [ww[0] * rr[0] + ww[1] * rr[1] + ww[2] * rr[2], ww[0] * uu[0] + ww[1] * uu[1] + ww[2] * uu[2]]; };
  const a = toScreen(0), b = toScreen(1), la = Math.hypot(...a), lb = Math.hypot(...b);
  const angle = la > 1e-9 && lb > 1e-9 ? (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))) * 180) / Math.PI : 0;
  return { offsetE: Math.max(...off), screenAngleBetween: angle, catchDisagreePx: 0 /* one screen offset, built in: paint.mjs places both catch lights from the same constant */ };
}
// the value range of the face region against the body's (R13), by luminance of the opaque pixels; the face region is a disc round the eyes' midpoint
export function faceContrast(r, scene) {
  // the local value range (mean over 8 x 8 windows of max - min luminance, windows wholly on the creature): the face's windows against the body's
  const lum = (i) => 0.2126 * r.data[i * 4] + 0.7152 * r.data[i * 4 + 1] + 0.0722 * r.data[i * 4 + 2], [a, b] = r.meta.eyes, cx = (a.at[0] + b.at[0]) / 2, cy = (a.at[1] + b.at[1]) / 2 + a.r * 0.8, rad = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) / 2 + a.r * 2.2;
  const K = r.size === 304 ? 8 : 4, face = [], body = [];
  for (let y0 = 0; y0 + K <= r.height; y0 += K) for (let x0 = 0; x0 + K <= r.width; x0 += K) {
    let mn = 255, mx = 0, ok = true;
    for (let y = y0; y < y0 + K && ok; y++) for (let x = x0; x < x0 + K; x++) { const i = y * r.width + x; if (r.coverage[i] < 0.95 || r.data[i * 4 + 3] < 250) { ok = false; break; } const l = lum(i); mn = Math.min(mn, l); mx = Math.max(mx, l); }
    if (ok) (Math.hypot(x0 + K / 2 - cx, y0 + K / 2 - cy) < rad ? face : body).push(mx - mn);
  }
  const mean = (v) => (v.length ? v.reduce((p, q) => p + q, 0) / v.length : 0);
  return mean(face) / Math.max(1e-6, mean(body));
}

// ---- value checks on the render (AD fix round 2) -------------------------------------------------------------------------------------
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lstar = (r, g, b) => { const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
const pixL = (r, i) => lstar(r.data[i * 4], r.data[i * 4 + 1], r.data[i * 4 + 2]);
// the nose against the dark muzzle round it: the mean L* of the nose's pixels minus the mean L* of the dark skin pixels in a box round the nose. A mound is skin: never darker
// than the muzzle's lit side by more than about L* 5 (the beak read: a near-black mound darker than the muzzle). null when the nose is not in the picture
export function noseValue(r, darkBelow = 45) {
  const nose = components(r, [INK.nose]).sort((a, b) => b.n - a.n)[0]; if (!nose || nose.n < 12) return null;
  let ns = 0, nn = 0, ms = 0, mn = 0;
  for (let y = Math.max(0, nose.y0 - 5); y <= Math.min(r.height - 1, nose.y1 + 10); y++) for (let x = Math.max(0, nose.x0 - 15); x <= Math.min(r.width - 1, nose.x1 + 15); x++) {
    const i = y * r.width + x; if (r.data[i * 4 + 3] < 250) continue; const L = pixL(r, i);
    if (r.ink[i] === INK.nose) { ns += L; nn++; } else if (L < darkBelow && r.ink[i] === INK.body) { ms += L; mn++; }
  }
  return nn && mn ? ns / nn - ms / mn : null;
}
// the ring of the nearer eye: its lower third's mean L* minus its upper third's (how much darker the top is). Bright all the way round at lid t 0: no more than about 8
export function ringShade(r) {
  const best = r.meta.eyes.map((e) => { const px = []; for (let y = Math.floor(e.at[1] - e.r * 2.2); y <= Math.ceil(e.at[1] + e.r * 2.2); y++) for (let x = Math.floor(e.at[0] - e.r * 2.2); x <= Math.ceil(e.at[0] + e.r * 2.2); x++) { if (x < 0 || y < 0 || x >= r.width || y >= r.height) continue; const i = y * r.width + x; if (r.ink[i] === INK.ring && r.data[i * 4 + 3] > 250) px.push([y, pixL(r, i)]); } return px; }).sort((a, b) => b.length - a.length)[0];
  if (!best || best.length < 12) return null;
  best.sort((a, b) => a[0] - b[0]); const k = Math.floor(best.length / 3), mean = (v) => v.reduce((s, q) => s + q[1], 0) / v.length;
  return mean(best.slice(-k)) - mean(best.slice(0, k));
}
