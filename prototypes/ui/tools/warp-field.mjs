#!/usr/bin/env node
// Tier 2 warp fields: turns the animator's landmarks JSON into a displacement field per key, blend end and size (boards/mibi-motion/tier2-method.md §1 T2, §2,
// "Animator's rulings on Q-A"). Deterministic: a thin-plate spline through every fixed (displacement 0) and moving (end displacement) point, rounded to whole px, 0 on
// the field-zero rows and, when a mask is given, inside the head; it refuses a field over the size's bound or over the gradient limit. Nothing here touches pixels.
//   node prototypes/ui/tools/warp-field.mjs --landmarks s04.json [--picture stand-304x312] --size 104x112 --out dir [--head-mask head.png] [--shadow-rows 278-311] [--belly-y 252]
// --amplitude k scales every end displacement (a synthetic field for a dry run).
// Map pictures: RGB PNG, R = dx + 128, G = dy + 128, B = 0 (3 B/px). dx, dy are the displacement of the CONTENT at the end (t = 1); the bake samples
// out(x, y) = composite(x − t·dx, y − t·dy).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePNG, decodePNG } from "../png.mjs";

export const BOUNDS = { "304x312": 12, "144x152": 6, "104x112": 4, "96x88": 3 };   // px, |d|
export const GRADIENT_MAX = 0.25;                                                // px per px
export const BASE_SIZE = [304, 312];
const OPAQUE = 110;                                                              // alpha > 110 is opaque (the animator's measure)

// Where each of the open rulings lives, so a ruling changes one place.
export const rules = {
  headMask: (mask) => mask,                                  // pixels where the field is forced to 0 (Uint8Array w*h, 1 = head), or null
  legsFollowRoot: (field, w, h, bellyY) => {                 // below the belly line a column moves as its root (the belly row) moves
    if (bellyY == null) return;
    for (const a of [field.dx, field.dy]) for (let y = bellyY + 1; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = a[bellyY * w + x];
  },
  pinZeroRows: (px, py, w, rows) => {                        // spline pins on the first zero row, every ~w/16 px, so the field has settled to 0 by then
    const step = Math.max(4, Math.round(w / 16));
    for (const [y0] of rows) for (let x = 0; x < w + step - 1; x += step) { const p = { x: Math.min(x, w - 1), y: y0, v: 0, nm: "zero-row" }; if (!px.some((q) => q.x === p.x && q.y === p.y)) { px.push(p); py.push({ ...p }); } }
  },
  zeroRows: (field, w, h, rows) => { for (const [y0, y1] of rows) for (let y = y0; y <= Math.min(y1, h - 1); y++) for (let x = 0; x < w; x++) { field.dx[y * w + x] = 0; field.dy[y * w + x] = 0; } },
};

const parseSize = (s) => { const m = /^(\d+)x(\d+)$/.exec(s); if (!m) throw new Error(`size "${s}" is not WxH`); return [+m[1], +m[2]]; };

// The landmarks of one picture at the target size: the animator's own picture if one is named for that size, else the base picture scaled by the size ratio.
export function pickPicture(landmarks, w, h, name = null) {
  const pics = landmarks.pictures ?? {};
  const own = Object.keys(pics).find((k) => k.endsWith(`-${w}x${h}`));
  if (own && (!name || name === own)) return { pic: pics[own], scaleX: 1, scaleY: 1, name: own };
  const baseName = name ?? Object.keys(pics).find((k) => k.endsWith(`-${BASE_SIZE[0]}x${BASE_SIZE[1]}`));
  if (!baseName || !pics[baseName]) throw new Error(`no landmark picture for ${w}x${h}${name ? ` (asked for "${name}")` : ""}`);
  const [bw, bh] = parseSize(baseName.slice(baseName.lastIndexOf("-") + 1));
  return { pic: pics[baseName], scaleX: w / bw, scaleY: h / bh, name: baseName };
}

// Thin-plate spline (kernel r² ln r plus an affine part) through pts [{x, y, v}]; returns f(x, y). Gaussian elimination with partial pivoting: no randomness.
function tps(pts) {
  const n = pts.length, U = (r2) => (r2 === 0 ? 0 : 0.5 * r2 * Math.log(r2)), N = n + 3, A = Array.from({ length: N }, () => new Float64Array(N + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = U((pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2);
    A[i][n] = 1; A[i][n + 1] = pts[i].x; A[i][n + 2] = pts[i].y; A[n][i] = 1; A[n + 1][i] = pts[i].x; A[n + 2][i] = pts[i].y; A[i][N] = pts[i].v;
  }
  for (let c = 0; c < N; c++) {
    let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) throw new Error("the landmarks are degenerate (collinear or repeated points)");
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < N; r++) if (r !== c) { const f = A[r][c] / A[c][c]; if (f) for (let k = c; k <= N; k++) A[r][k] -= f * A[c][k]; }
  }
  const wgt = Array.from({ length: N }, (_, i) => A[i][N] / A[i][i]);
  return (x, y) => { let s = wgt[n] + wgt[n + 1] * x + wgt[n + 2] * y; for (let i = 0; i < n; i++) s += wgt[i] * U((x - pts[i].x) ** 2 + (y - pts[i].y) ** 2); return s; };
}

// The field toward `end` ("down", "up", ...) at w×h. Returns { w, h, dx: Int8Array, dy: Int8Array, end, size, maxD, maxGradient } or throws with the reason.
export function buildField(landmarks, end, w, h, { picture = null, headMask = null, shadowRows = [], bellyY = null, amplitude = 1 } = {}) {
  const bound = BOUNDS[`${w}x${h}`]; if (bound == null) throw new Error(`no displacement bound for ${w}x${h} (bounds: ${Object.keys(BOUNDS).join(", ")})`);
  const { pic, scaleX, scaleY, name } = pickPicture(landmarks, w, h, picture), sx = (x) => Math.round(x * scaleX), sy = (y) => Math.round(y * scaleY);
  const px = [], py = [];
  for (const [nm, [x, y]] of Object.entries(pic.fixed ?? {})) { px.push({ x: sx(x), y: sy(y), v: 0, nm }); py.push({ x: sx(x), y: sy(y), v: 0, nm }); }
  for (const [nm, m] of Object.entries(pic.moving ?? {})) {
    const d = m[end]; if (!d) throw new Error(`landmark "${nm}" has no end "${end}"`);
    px.push({ x: sx(m.pos[0]), y: sy(m.pos[1]), v: d[0] * scaleX * amplitude, nm }); py.push({ x: sx(m.pos[0]), y: sy(m.pos[1]), v: d[1] * scaleY * amplitude, nm });
  }
  // rows are known before the spline: the field must be 0 there, so the first one is pinned (displacement 0) across the picture and the spline settles to 0 before it
  const rows = [...(pic.fieldZeroRows ? [[Math.round(pic.fieldZeroRows[0] * scaleY), Math.min(h - 1, Math.round(pic.fieldZeroRows[1] * scaleY))]] : []), ...shadowRows];
  rules.pinZeroRows(px, py, w, rows);
  const seen = new Set(); for (const p of px) { const k = p.x + "," + p.y; if (seen.has(k)) throw new Error(`landmarks "${p.nm}" collide at ${k} at ${w}x${h}`); seen.add(k); }
  const fx = tps(px), fy = tps(py), rawX = new Float64Array(w * h), rawY = new Float64Array(w * h);
  const head = rules.headMask(headMask);
  const field = { w, h, end, size: `${w}x${h}`, dx: new Int8Array(w * h), dy: new Int8Array(w * h) };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    rawX[i] = head && head[i] ? 0 : fx(x, y); rawY[i] = head && head[i] ? 0 : fy(x, y);
  }
  // the zero rows and the leg rule act on the continuous field too, so the gradient measured is the one that ships
  const raw = { dx: rawX, dy: rawY };
  rules.legsFollowRoot(raw, w, h, bellyY); rules.zeroRows(raw, w, h, rows);
  let maxD = 0, maxG = 0, gAt = [0, 0];
  for (let i = 0; i < w * h; i++) {
    field.dx[i] = Math.round(rawX[i]); field.dy[i] = Math.round(rawY[i]);
    maxD = Math.max(maxD, Math.hypot(field.dx[i], field.dy[i]));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (const a of [rawX, rawY]) {
    for (const g of [x + 1 < w ? Math.abs(a[y * w + x + 1] - a[y * w + x]) : 0, y + 1 < h ? Math.abs(a[(y + 1) * w + x] - a[y * w + x]) : 0]) if (g > maxG) { maxG = g; gAt = [x, y]; }
  }
  Object.assign(field, { maxD, maxGradient: maxG, gradientAt: gAt, picture: name });
  checkField(field);
  return field;
}

// The loader's refusals for a field (§2): the size's bound, the gradient, and (with rows/mask) the zero rules. Throws an Error naming the rule and the worst value.
export function checkField(f, { zeroRows = [], headMask = null } = {}) {
  const bound = BOUNDS[f.size ?? `${f.w}x${f.h}`]; if (bound == null) throw new Error(`field refused: no bound for ${f.w}x${f.h}`);
  let maxD = 0, at = 0; for (let i = 0; i < f.w * f.h; i++) { const d = Math.hypot(f.dx[i], f.dy[i]); if (d > maxD) { maxD = d; at = i; } }
  if (maxD > bound) throw new Error(`field refused: |d| ${maxD.toFixed(2)} px at (${at % f.w}, ${(at / f.w) | 0}) is over the ${bound} px bound at ${f.w}x${f.h}`);
  if (f.maxGradient != null && f.maxGradient > GRADIENT_MAX + 1e-9) throw new Error(`field refused: gradient ${f.maxGradient.toFixed(3)} px/px is over ${GRADIENT_MAX} at ${f.w}x${f.h}, worst at (${f.gradientAt?.join(", ")})`);
  for (const [y0, y1] of zeroRows) for (let y = y0; y <= Math.min(y1, f.h - 1); y++) for (let x = 0; x < f.w; x++) if (f.dx[y * f.w + x] || f.dy[y * f.w + x]) throw new Error(`field refused: not 0 on the feet/shadow row ${y} at x ${x}`);
  if (headMask) for (let i = 0; i < f.w * f.h; i++) if (headMask[i] && (f.dx[i] || f.dy[i])) throw new Error(`field refused: not 0 inside the head mask at (${i % f.w}, ${(i / f.w) | 0})`);
  return true;
}

// Map picture <-> field.
export function encodeField(f) {
  const rgba = new Uint8Array(f.w * f.h * 4);
  for (let i = 0; i < f.w * f.h; i++) { rgba[i * 4] = f.dx[i] + 128; rgba[i * 4 + 1] = f.dy[i] + 128; rgba[i * 4 + 2] = 0; rgba[i * 4 + 3] = 255; }
  return encodePNG(f.w, f.h, rgba);
}
export function decodeField(buf, end = null) {
  const p = decodePNG(buf), dx = new Int8Array(p.width * p.height), dy = new Int8Array(p.width * p.height);
  for (let i = 0; i < dx.length; i++) { dx[i] = p.data[i * 4] - 128; dy[i] = p.data[i * 4 + 1] - 128; }
  return { w: p.width, h: p.height, size: `${p.width}x${p.height}`, dx, dy, end };
}
// A head mask picture: any pixel with alpha > 0 is head.
export const headMaskFrom = (buf) => { const p = decodePNG(buf), m = new Uint8Array(p.width * p.height); for (let i = 0; i < m.length; i++) m[i] = p.data[i * 4 + 3] > 0 ? 1 : 0; return m; };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
  const lm = arg("landmarks"), size = arg("size"), out = arg("out");
  if (!lm || !size || !out) { console.error("usage: warp-field.mjs --landmarks file.json --size WxH --out dir [--picture name] [--head-mask png] [--shadow-rows y0-y1] [--belly-y N] [--amplitude 0.7]"); process.exit(2); }
  try {
    const landmarks = JSON.parse(readFileSync(lm, "utf8")), [w, h] = parseSize(size), mask = arg("head-mask") ? headMaskFrom(readFileSync(arg("head-mask"))) : null;
    const shadowRows = arg("shadow-rows") ? [arg("shadow-rows").split("-").map(Number)] : [], bellyY = arg("belly-y") ? +arg("belly-y") : null;
    const ends = new Set(); for (const p of Object.values(landmarks.pictures ?? {})) for (const m of Object.values(p.moving ?? {})) for (const k of Object.keys(m)) if (k !== "pos") ends.add(k);
    mkdirSync(out, { recursive: true });
    for (const end of [...ends].sort()) {
      const f = buildField(landmarks, end, w, h, { picture: arg("picture"), headMask: mask, shadowRows, bellyY, amplitude: arg("amplitude") ? +arg("amplitude") : 1 }), file = path.join(out, `field-${landmarks.blend ?? "blend"}-${end}-${w}x${h}.png`);
      writeFileSync(file, encodeField(f)); console.log(`${file}  max |d| ${f.maxD.toFixed(2)} px, gradient ${f.maxGradient.toFixed(3)} (from ${f.picture})`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
