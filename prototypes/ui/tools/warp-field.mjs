#!/usr/bin/env node
// Tier 2 warp fields: turns the animator's landmarks JSON (one file per species, stage and blend; every per-picture fact is in it) into a displacement field per blend end
// and size (boards/mibi-motion/tier2-method.md §1 T2, §2, the animator's rulings on Q-A and the architect's harness answers). Deterministic: a thin-plate spline through the
// constraints, rounded to whole px; refuses a field outside the bounds or the gradient with the pixel named. Nothing here touches painted pixels.
//   node prototypes/ui/tools/warp-field.mjs --landmarks file.json --size 104x112 --out dir [--picture name]
//        [overrides, each marks the run `override` and gives no verdict: --head-mask png --shadow-rows y0-y1 --belly-y N --amplitude k]
// Constraints (before the interpolation, never a mask after it): every `fixed` landmark at d = 0; fixed points at d = 0 every 8 px along the top edge of fieldZeroRows; each moving
// landmark fitted at its DESTINATION p + d with value d. The head adds no constraint (the nape is released). After the fit: below the belly line a column takes the displacement
// of the line at that x (legs move only with their root), and the zero rows win.
// Map pictures: PNG 8-bit RGB, no alpha, no colour chunks; R = dx + 128, G = dy + 128, B = 0. dx, dy move the content at t = 1; the bake samples
// out(x, y) = src(x − r(t·dx), y − r(t·dy)), r rounding half away from zero, t in 1/16 steps. The head mask is a 1-bit PNG (1 = head, drawn unwarped over the body).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../png.mjs";

export const BOUNDS = { "304x312": 12, "144x152": 6, "104x112": 4, "96x88": 3 };   // px, |d|
export const GRADIENT_MAX = 0.25, GRADIENT_WINDOW = 4;                           // px per px, measured over a 4 px window: a doubled or dropped pixel at most every 4 px
export const HEAD_ZONE = 6;                                                      // Chebyshev px around the head mask where the gradient limit does not apply
export const BASE_SIZE = [304, 312];
export const rha = (v) => Math.sign(v) * Math.floor(Math.abs(v) + 0.5);          // round half away from zero (Math.round is not symmetric)
export const quantT = (t) => Math.round(t * 16) / 16;                            // the look key's step
export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const parseSize = (s) => { const m = /^(\d+)x(\d+)$/.exec(s); if (!m) throw new Error(`size "${s}" is not WxH`); return [+m[1], +m[2]]; };

// ---- PNG output the shared encoder does not do: RGB without alpha (colour type 2) and 1-bit indexed. No gAMA, sRGB, iCCP or cHRM chunk is ever written.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, "ascii"), data]); let c = 0xffffffff; for (const b of body) c = CRC[(c ^ b) & 255] ^ (c >>> 8); const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0); return Buffer.concat([len, body, crc]); };
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngFile = (w, h, depth, type, rows, extra = []) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = type; return Buffer.concat([SIG, chunk("IHDR", ihdr), ...extra, chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]); };
export function encodeField(f) {
  const stride = f.w * 3 + 1, raw = Buffer.alloc(stride * f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const i = y * f.w + x, o = y * stride + 1 + x * 3; raw[o] = f.dx[i] + 128; raw[o + 1] = f.dy[i] + 128; }
  return pngFile(f.w, f.h, 8, 2, raw);
}
export function encodeMask(mask, w, h) {
  const stride = Math.ceil(w / 8) + 1, raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) raw[y * stride + 1 + (x >> 3)] |= 0x80 >> (x & 7);
  return pngFile(w, h, 1, 3, raw, [chunk("PLTE", Buffer.from([0, 0, 0, 255, 255, 255]))]);
}
const colourChunks = (buf) => { const found = []; for (let pos = 8; pos + 8 <= buf.length;) { const len = buf.readUInt32BE(pos), k = buf.toString("ascii", pos + 4, pos + 8); if (["gAMA", "sRGB", "iCCP", "cHRM"].includes(k)) found.push(k); pos += 12 + len; } return found; };
export function decodeField(buf, end = null) {
  buf = Buffer.from(buf); const bad = colourChunks(buf); if (bad.length) throw new Error(`field map refused: it carries colour chunk(s) ${bad.join(", ")}`);
  if (buf[25] !== 2 || buf[24] !== 8) throw new Error("field map refused: not 8-bit RGB without alpha");
  const p = decodePNG(buf), dx = new Int8Array(p.width * p.height), dy = new Int8Array(p.width * p.height);
  for (let i = 0; i < dx.length; i++) { dx[i] = p.data[i * 4] - 128; dy[i] = p.data[i * 4 + 1] - 128; }
  return { w: p.width, h: p.height, size: `${p.width}x${p.height}`, dx, dy, end };
}
export const headMaskFrom = (buf) => { const p = decodePNG(buf), m = new Uint8Array(p.width * p.height); for (let i = 0; i < m.length; i++) m[i] = p.data[i * 4] > 127 ? 1 : 0; return { w: p.width, h: p.height, mask: m }; };

// ---- landmarks
// The landmarks of one picture at the target size: the animator's own picture if one is named for that size, else the base picture scaled by the size ratio.
export function pickPicture(landmarks, w, h, name = null) {
  const pics = landmarks.pictures ?? {}, own = Object.keys(pics).find((k) => k.endsWith(`-${w}x${h}`));
  if (own && (!name || name === own)) return { pic: pics[own], scaleX: 1, scaleY: 1, name: own };
  const baseName = name ?? Object.keys(pics).find((k) => k.endsWith(`-${BASE_SIZE[0]}x${BASE_SIZE[1]}`));
  if (!baseName || !pics[baseName]) throw new Error(`no landmark picture for ${w}x${h}${name ? ` (asked for "${name}")` : ""}`);
  const [bw, bh] = parseSize(baseName.slice(baseName.lastIndexOf("-") + 1));
  return { pic: pics[baseName], scaleX: w / bw, scaleY: h / bh, name: baseName };
}
// Even-odd polygon fill, a pixel is inside when its centre (x + 0.5, y + 0.5) is.
export function rasterPolygon(poly, w, h) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5, py = y + 0.5; let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; }
    m[y * w + x] = inside ? 1 : 0;
  }
  return m;
}
// The belly line at each column: linear between vertices, flat beyond its ends, rounded half away from zero.
export function bellyColumns(line, w) {
  const v = [...line].sort((a, b) => a[0] - b[0]), out = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    let y; if (x <= v[0][0]) y = v[0][1]; else if (x >= v.at(-1)[0]) y = v.at(-1)[1]; else { let k = 0; while (v[k + 1][0] < x) k++; const [x0, y0] = v[k], [x1, y1] = v[k + 1]; y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
    out[x] = rha(y);
  }
  return out;
}
export const dilate = (mask, w, h, r) => { const rows = new Uint8Array(w * h), out = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) rows[y * w + k] = 1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y * w + x]) for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) out[k * w + x] = 1; return out; };

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

// The field toward `end` at w×h. opts: { picture, overrides: { headMask: {mask}, shadowRows: [[y0,y1]], bellyY: N, amplitude: k, noCheck: true } }. Returns the field, or throws with the reason.
// field: { w, h, size, end, dx, dy: Int8Array, headMask: Uint8Array|null, headSource, zeroRows, bellyY: Int32Array|null, maxD, maxGradient, gradientAt, picture, overrides: [names] }
export function buildField(landmarks, end, w, h, { picture = null, overrides = {} } = {}) {
  if (BOUNDS[`${w}x${h}`] == null) throw new Error(`no displacement bound for ${w}x${h} (bounds: ${Object.keys(BOUNDS).join(", ")})`);
  const { pic, scaleX, scaleY, name } = pickPicture(landmarks, w, h, picture), amp = overrides.amplitude ?? 1, used = [];
  const sx = (x) => rha(x * scaleX), sy = (y) => rha(y * scaleY), polyAt = (p) => p.map(([x, y]) => [x * scaleX, y * scaleY]);
  const pxs = [], pys = [], add = (x, y, vx, vy, nm) => { pxs.push({ x, y, v: vx, nm }); pys.push({ x, y, v: vy, nm }); };
  for (const [nm, [x, y]] of Object.entries(pic.fixed ?? {})) add(sx(x), sy(y), 0, 0, nm);
  for (const [nm, m] of Object.entries(pic.moving ?? {})) {
    const d = m[end]; if (!d) throw new Error(`landmark "${nm}" has no end "${end}"`);
    const dx = rha(d[0] * scaleX * amp), dy = rha(d[1] * scaleY * amp);
    add(sx(m.pos[0]) + dx, sy(m.pos[1]) + dy, dx, dy, nm);       // fitted at the destination p + d, so the landmark lands on p + d
  }
  if (overrides.amplitude != null) used.push("amplitude");
  let rows = pic.fieldZeroRows ? [[sy(pic.fieldZeroRows[0]), Math.min(h - 1, sy(pic.fieldZeroRows[1]))]] : [];
  if (overrides.shadowRows) { rows = overrides.shadowRows; used.push("shadow-rows"); }
  for (const [y0] of rows) { for (let x = 0; x < w; x += 8) add(x, y0, 0, 0, "zero-row"); if ((w - 1) % 8) add(w - 1, y0, 0, 0, "zero-row"); }
  const seen = new Set(); for (const p of pxs) { const k = p.x + "," + p.y; if (seen.has(k)) throw new Error(`landmarks "${p.nm}" collide at ${k} at ${w}x${h}`); seen.add(k); }
  const fx = tps(pxs), fy = tps(pys), dxI = new Int8Array(w * h), dyI = new Int8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { dxI[y * w + x] = rha(fx(x, y)); dyI[y * w + x] = rha(fy(x, y)); }
  // the belly line: below it a column takes the line's displacement; the zero rows win
  let bellyY = null;
  if (overrides.bellyY != null) { bellyY = new Int32Array(w).fill(overrides.bellyY); used.push("belly-y"); }
  else if (pic.bellyLine) bellyY = bellyColumns(pic.bellyLine.map(([x, y]) => [x * scaleX, y * scaleY]), w);
  const inZero = (y) => rows.some(([a, b]) => y >= a && y <= b);
  if (bellyY) for (let x = 0; x < w; x++) for (let y = bellyY[x] + 1; y < h; y++) if (!inZero(y)) { dxI[y * w + x] = dxI[bellyY[x] * w + x]; dyI[y * w + x] = dyI[bellyY[x] * w + x]; }
  for (const [a, b] of rows) for (let y = a; y <= b; y++) for (let x = 0; x < w; x++) { dxI[y * w + x] = 0; dyI[y * w + x] = 0; }
  // the head: an override mask, else the signed mask file, else the polygon rasterised once
  let headMask = null, headSource = "none";
  if (overrides.headMask) { headMask = overrides.headMask.mask; headSource = "override"; used.push("head-mask"); }
  else if (pic.headMask?.path) { const buf = readFileSync(pic.headMask.path); if (sha256(buf) !== pic.headMask.sha256) throw new Error("the signed head mask does not match its sha256"); headMask = headMaskFrom(buf).mask; headSource = "signed mask " + pic.headMask.sha256.slice(0, 12); }
  else if (pic.headMaskPolygon) { headMask = rasterPolygon(polyAt(pic.headMaskPolygon), w, h); headSource = "polygon"; }
  const field = { w, h, size: `${w}x${h}`, end, dx: dxI, dy: dyI, headMask, headSource, zeroRows: rows, bellyY, picture: name, overrides: used };
  if (overrides.noCheck) used.push("no-check"); else checkField(field);
  return field;
}

// The loader's refusals (§2 and the harness answers). Throws an Error naming the rule and the pixel. Bounds: every pixel outside the head mask, the 6 px zone included.
// Gradient: |d(p) − d(p + 4e)| ≤ 1 px on the final field (0.25 px per px over 4 px), skipping pixels within 6 px of the head mask (Chebyshev). Zero rows: 0 on them.
export function checkField(f) {
  const { w, h } = f, size = f.size ?? `${w}x${h}`, bound = BOUNDS[size]; if (bound == null) throw new Error(`field refused: no bound for ${size}`);
  f.maxD = 0; f.maxGradient = 0; f.gradientAt = null;
  for (let i = 0; i < w * h; i++) {
    if (f.headMask?.[i]) continue; const d = Math.hypot(f.dx[i], f.dy[i]); if (d > f.maxD) f.maxD = d;
    if (d > bound) throw new Error(`field refused: |d| ${d.toFixed(2)} px at (${i % w}, ${(i / w) | 0}) is over the ${bound} px bound at ${size}`);
  }
  const skip = f.headMask ? dilate(f.headMask, w, h, HEAD_ZONE) : null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (const [ex, ey] of [[1, 0], [0, 1]]) {
    const x2 = x + ex * GRADIENT_WINDOW, y2 = y + ey * GRADIENT_WINDOW; if (x2 >= w || y2 >= h) continue;
    const i = y * w + x, j = y2 * w + x2; if (skip && (skip[i] || skip[j])) continue;
    const g = Math.max(Math.abs(f.dx[i] - f.dx[j]), Math.abs(f.dy[i] - f.dy[j])) / GRADIENT_WINDOW;
    if (g > f.maxGradient) { f.maxGradient = g; f.gradientAt = [x, y]; }
  }
  if (f.maxGradient > GRADIENT_MAX + 1e-9) throw new Error(`field refused: gradient ${f.maxGradient.toFixed(3)} px/px is over ${GRADIENT_MAX} at ${size}, at pixel (${f.gradientAt.join(", ")})`);
  for (const [y0, y1] of f.zeroRows ?? []) for (let y = y0; y <= Math.min(y1, h - 1); y++) for (let x = 0; x < w; x++) if (f.dx[y * w + x] || f.dy[y * w + x]) throw new Error(`field refused: not 0 on the feet/shadow row ${y} at x ${x}`);
  return true;
}
// The stretch the leg rule and the fixed feet force: the largest |d(x, yb(x))| over the columns that have ink below the belly line (above the zero rows).
export function legCompression(f, img) {
  if (!f.bellyY) return 0; let m = 0; const y1 = f.zeroRows?.[0]?.[0] ?? f.h;
  for (let x = 0; x < f.w; x++) { let leg = false; for (let y = f.bellyY[x] + 1; y < y1 && !leg; y++) if (img.data[(y * f.w + x) * 4 + 3] > 110) leg = true; if (leg) m = Math.max(m, Math.hypot(f.dx[f.bellyY[x] * f.w + x], f.dy[f.bellyY[x] * f.w + x])); }
  return m;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
  const lm = arg("landmarks"), size = arg("size"), out = arg("out");
  if (!lm || !size || !out) { console.error("usage: warp-field.mjs --landmarks file.json --size WxH --out dir [--picture name] [overrides: --head-mask png --shadow-rows y0-y1 --belly-y N --amplitude k --no-check]"); process.exit(2); }
  try {
    const landmarks = JSON.parse(readFileSync(lm, "utf8")), [w, h] = parseSize(size), overrides = {};
    if (arg("head-mask")) overrides.headMask = headMaskFrom(readFileSync(arg("head-mask")));
    if (arg("shadow-rows")) overrides.shadowRows = [arg("shadow-rows").split("-").map(Number)];
    if (arg("belly-y")) overrides.bellyY = +arg("belly-y"); if (arg("amplitude")) overrides.amplitude = +arg("amplitude"); if (process.argv.includes("--no-check")) overrides.noCheck = true;
    mkdirSync(out, { recursive: true });
    for (const end of Object.keys(landmarks.ends ?? { down: 0, up: 0 })) {
      const f = buildField(landmarks, end, w, h, { picture: arg("picture"), overrides }), file = path.join(out, `field-${landmarks.blend ?? "blend"}-${end}-${w}x${h}.png`), bytes = encodeField(f);
      writeFileSync(file, bytes); console.log(`${file}  sha256 ${sha256(bytes).slice(0, 12)}  max |d| ${f.maxD.toFixed(2)} px, gradient ${f.maxGradient.toFixed(3)} (from ${f.picture}; head ${f.headSource})${f.overrides.length ? "  OVERRIDE " + f.overrides.join(",") : ""}`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
