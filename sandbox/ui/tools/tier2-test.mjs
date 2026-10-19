#!/usr/bin/env node
// Tier 2 test harness (the tier 2 method, Q-A3, the architect's harness answers): renders the matrix {painted down, warped down, stand, warped up, painted up}
// per size from masters and the landmarks JSON given by path, measures M1–M8, and writes 1× PNGs, a contact sheet, a CSV of every measure and the Vivarium pair as APNGs.
// The warp moves existing pixels only (backward mapping, nearest sample, no blending); the head is a separate layer drawn unwarped over the warped body. Nothing is placed in the
// Station and nothing is drawn: it reads files and writes to --out. Every per-picture fact is in the landmarks JSON; a flag only OVERRIDES one for a trial, and then the run is
// marked `override` and gives no verdict.
//
//   node prototypes/ui/tools/tier2-test.mjs --out dir
//     --set s04-304 --stand <path|ref@sha:path> --landmarks lm.json [--picture name] [--painted-down p] [--painted-up p] [--field-down f.png --field-up g.png] [--pair-ids a,b]
//     --set s04-104 ...                                    (one --set per size; the options after a --set belong to it)
//     overrides: --head-mask png  --shadow-rows y0-y1  --belly-y N  --amplitude k  --no-check  --band y0-y1  --holds b0,b1,b2,b1back  --phase-ms N  --seconds N
//   A source is a file path, or `<ref>@<sha>:<path>` read read-only with `git show` (masters-pods is a branch of this repository: `git fetch origin masters-pods` first). Each source's SHA-256 goes in the CSV and must match the JSON's.
// Measures (the definitions are in prototypes/ui/README.md): M1 determinism, M2 palette, M3 silhouette (relative, two thresholds), M4 outline, M5 fit to the painted end and M5a to the measured profile,
// M6 readable at walker size, M7 warp time, M8 motion (changed pixels outside the moving band, with and without the warp).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePNG, decodePNG } from "../png.mjs";
import { buildField, decodeField, encodeField, encodeMask, headMaskFrom, checkField, legStrain, bellyColumns, rha, quantT, sha256, chunk, pickPicture, figureBbox, bboxMapping } from "./warp-field.mjs";

export const OPAQUE = 110;                                 // alpha > 110 is opaque (the animator's measure for the topline)
export const M5_LIMITS = { "304x312": { iou: 0.95, profile: 2 }, "104x112": { iou: 0.93, profile: 1 } };
export const M6_MIN = 2, M7_MAX_MS = 5, M4_SLACK = 0.05, SECONDS = 10;

// The breathing cycle b0 → b1 → b2 → b1 (the animator's `breathPair`: holds b0, b1, b2, b1back in ms), shifted by phaseMs; [{ t0, t1, frame }] over 0..totalMs.
export function breathSegments(holds, phaseMs, totalMs) {
  const seq = [[0, holds[0]], [1, holds[1]], [2, holds[2]], [1, holds[3]]], cycle = seq.reduce((a, s) => a + s[1], 0), out = [];
  let t = 0;
  while (t < totalMs) {
    let pos = (t + phaseMs) % cycle, acc = 0;
    for (const [frame, d] of seq) { if (pos < acc + d) { const t1 = Math.min(totalMs, t + (acc + d - pos)); out.push({ t0: t, t1, frame }); t = t1; break; } acc += d; }
  }
  return out;
}

// ---- sources: a path, or <ref>@<sha>:<path> read with `git show` (masters-pods is a branch of this repository); never written, never copied.
export function readSource(spec) {
  const m = /^([\w.-]+)@([0-9a-f]{6,40}):(.+)$/.exec(spec);
  if (!m) return readFileSync(spec);
  const [, ref, sha, p] = m;
  try { return execFileSync("git", ["show", `${sha}:${p}`], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { throw Object.assign(new Error(`${ref}@${sha.slice(0, 8)}:${p} is not readable in this checkout (for masters-pods: git fetch origin masters-pods)`), { unreadable: true }); }
}
const expectSha = (buf, want, what) => { if (want && sha256(buf) !== want) throw new Error(`${what}: sha256 ${sha256(buf)} is not the JSON's ${want}; the run stops (a verdict names the exact pixels it judged)`); };

// ---- pictures: { w, h, data: Uint8ClampedArray RGBA }
export const decodeImage = (buf) => { const p = decodePNG(buf); return { w: p.width, h: p.height, data: new Uint8ClampedArray(p.data) }; };
export const blank = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
const inkMask = (img) => { const m = new Uint8Array(img.w * img.h); for (let i = 0; i < m.length; i++) m[i] = img.data[i * 4 + 3] > 0 ? 1 : 0; return m; };
const opaqueMask = (img, thr = OPAQUE) => { const m = new Uint8Array(img.w * img.h); for (let i = 0; i < m.length; i++) m[i] = img.data[i * 4 + 3] > thr ? 1 : 0; return m; };

// The warp with the head layer. layers [{ field, t }] add their r(t·d) before the one sample (never a warp of a warp), t in 1/16 steps; out(x, y) = img(x − Σ r(t·dx), y − Σ r(t·dy)).
// A source outside the picture is transparent; a destination above the head's top in the sampled column that samples into the head is transparent; any other source inside the head mask takes the first non-head pixel below it in that column, else the nearest above, else transparent
// (a clamp miss, counted in stats.clampMisses). With drawHead the head is then drawn unwarped: out = img wherever the mask is set. drawHead false gives the body layer alone.
export function warp(img, layers, { headMask = null, drawHead = true, stats = null } = {}) {
  const { w, h } = img, out = blank(w, h), src = img.data, dst = out.data;
  for (const l of layers) if (l.field.w !== w || l.field.h !== h) throw new Error(`field ${l.field.w}x${l.field.h} does not fit the picture ${w}x${h}`);
  let headTop = null; if (headMask) { headTop = new Int32Array(w).fill(h); for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (headMask[y * w + x]) { headTop[x] = y; break; } }
  const ts = layers.map((l) => quantT(l.t)), copy = (i, j) => { dst[i] = src[j]; dst[i + 1] = src[j + 1]; dst[i + 2] = src[j + 2]; dst[i + 3] = src[j + 3]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (drawHead && headMask && headMask[i]) { copy(i * 4, i * 4); continue; }
    let ox = 0, oy = 0; layers.forEach((l, k) => { ox += rha(ts[k] * l.field.dx[i]); oy += rha(ts[k] * l.field.dy[i]); });
    const sx = x - ox; let sy = y - oy;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    if (headMask && headMask[sy * w + sx]) {
      if (y < headTop[sx]) continue;                           // above the head's top in this column: sky the unwarped head would have covered, transparent
      let yy = sy; while (yy < h && headMask[yy * w + sx]) yy++;
      if (yy >= h) { yy = sy; while (yy >= 0 && headMask[yy * w + sx]) yy--; }
      if (yy < 0) { if (stats) stats.clampMisses++; continue; }
      sy = yy;
    }
    copy(i * 4, (sy * w + sx) * 4);
  }
  out.shadow = img.shadow ?? null; return out;
}

// The b-step bake (the animator's `breathBake`): row copies per column, no resampling, no new pixels. yb(x) is the belly line at x (Int32Array), rows y >= yb unchanged.
// b1: out(x, y) = in(x, y + 1) for y < yb - 1, row yb - 1 keeps itself (one row doubled at the belly line). b2: a second 1 px lift for the rows above ym = round((ytop + yb) / 2),
// ytop = the column's first ink row (alpha > 0) of the picture being baked (the warped stand for a warped step); ym is never within 8 px of yb (ym = min(ym, yb - 8)). Rows shifted in
// from above the figure are transparent. A column with no ink is unchanged.
export function bakeStep(img, n, yb) {
  const { w, h } = img, out = { w, h, data: new Uint8ClampedArray(img.data), shadow: img.shadow ?? null };
  for (let x = 0; x < w; x++) {
    let ytop = -1; for (let y = 0; y < h; y++) if (img.data[(y * w + x) * 4 + 3] > 0) { ytop = y; break; }
    if (ytop < 0) continue;
    const b = Math.min(h, yb[x]), ym = Math.min(Math.floor((ytop + b) / 2 + 0.5), b - 8);
    for (let y = 0; y < b; y++) {
      let sy;
      if (y === b - 1) sy = b - 1; else if (n >= 2 && y <= ym - 2) sy = y + 2; else if (n >= 2 && y === ym - 1) sy = ym; else sy = y + 1;
      if (sy >= h) continue;
      for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = img.data[(sy * w + x) * 4 + c];
    }
  }
  return out;
}
// The breath pair's band is derived, never given: in each column the rows above the belly line.
// The warped belly line for a breath bake on a belly-moving warp: yb'(x) = yb(x) + r(t * db(x)) at t = 1 (the same line for a bellyFixed blend).
export const warpedBelly = (yb, f) => yb.map((v, x) => v + rha(f.legDb?.[x] ?? 0));
export const aboveBellyBand = (w, h, yb) => { const m = new Uint8Array(w * h); for (let x = 0; x < w; x++) for (let y = 0; y < Math.min(h, yb[x]); y++) m[y * w + x] = 1; return m; };

// The warp's input is the cut key: the body alpha binarised (255 or 0), the painted shadow split off into its own layer, which is not warped and stays on the ground under the warped feet.
// The rule is cut-motion.py's final remap in masters-pods (alpha >= 200 is body, 255; 60..199 is shadow, kept at min(alpha, 110); the rest is 0), applied to a finished master: the shadow is
// taken from the rows at and below the first zero row only (above them the field moves the body, and a partial alpha there is the body's own fringe, dropped). PROVISIONAL until the art director confirms
// it for a master that is not a raw cut. Returns the body picture, carrying `.shadow`; `flat` composes both.
export const BODY_ALPHA = 200, SHADOW_ALPHA = 60, SHADOW_MAX = 110;
export function prepareKey(img, zeroY = img.h) {
  const { w, h } = img, body = blank(w, h), shadow = blank(w, h), n = { body: 0, shadow: 0, dropped: 0 };
  for (let i = 0; i < w * h; i++) {
    const a = img.data[i * 4 + 3], y = (i / w) | 0; if (!a) continue;
    if (a >= BODY_ALPHA) { body.data.set([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2], 255], i * 4); n.body++; }
    else if (y >= zeroY && a >= SHADOW_ALPHA) { shadow.data.set([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2], Math.min(a, SHADOW_MAX)], i * 4); n.shadow++; }
    else n.dropped++;
  }
  body.shadow = shadow; body.prep = n; return body;
}
export function flat(img) {
  if (!img.shadow) return img; const out = { w: img.w, h: img.h, data: new Uint8ClampedArray(img.shadow.data) };
  for (let i = 0; i < img.w * img.h; i++) if (img.data[i * 4 + 3]) out.data.set(img.data.subarray(i * 4, i * 4 + 4), i * 4);
  return out;
}

// ---- measures
// M2: the number of colours (alpha > 0) of the output that are not colours of the input.
export function newColours(input, output) {
  const key = (d, i) => (d[i] << 24 | d[i + 1] << 16 | d[i + 2] << 8 | d[i + 3]) >>> 0, have = new Set(); let n = 0;
  for (let i = 0; i < input.data.length; i += 4) if (input.data[i + 3]) have.add(key(input.data, i));
  const seen = new Set(); for (let i = 0; i < output.data.length; i += 4) if (output.data[i + 3]) { const k = key(output.data, i); if (!have.has(k) && !seen.has(k)) { seen.add(k); n++; } }
  return n;
}
// M3: opaque 8-connected components, enclosed transparent holes (4-connected transparent regions that never reach the border), orphan pixels (opaque, no opaque 8-neighbour).
export function silhouette(img, thr = OPAQUE) {
  const { w, h } = img, m = opaqueMask(img, thr), label = new Int32Array(w * h);
  const flood = (start, want, nb) => { const stack = [start]; label[start] = 1; let touches = false; while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true; for (const [dx, dy] of nb) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (m[j] === want && !label[j]) { label[j] = 1; stack.push(j); } } } return touches; };
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  let components = 0, holes = 0, orphans = 0;
  for (let i = 0; i < w * h; i++) if (m[i] && !label[i]) { components++; flood(i, 1, N8); }
  label.fill(0);
  for (let i = 0; i < w * h; i++) if (!m[i] && !label[i] && !flood(i, 0, N4)) holes++;
  for (let i = 0; i < w * h; i++) if (m[i]) { const x = i % w, y = (i / w) | 0; let any = false; for (const [dx, dy] of N8) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && m[ny * w + nx]) { any = true; break; } } if (!any) orphans++; }
  return { components, holes, orphans };
}
// The same three measures with the bounding box of every region (component, hole, orphan), as [x0, y0, x1, y1].
export function silhouetteRegions(img, thr = OPAQUE) {
  const { w, h } = img, m = opaqueMask(img, thr), label = new Uint8Array(w * h), out = { components: [], holes: [], orphans: [] };
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  const flood = (start, want, nb) => { const stack = [start], box = [w, h, 0, 0]; let touches = false; label[start] = 1; while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true; for (const [dx, dy] of nb) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (m[j] === want && !label[j]) { label[j] = 1; stack.push(j); } } } return { box, touches }; };
  for (let i = 0; i < w * h; i++) if (m[i] && !label[i]) out.components.push(flood(i, 1, N8).box);
  label.fill(0);
  for (let i = 0; i < w * h; i++) if (!m[i] && !label[i]) { const r = flood(i, 0, N4); if (!r.touches) out.holes.push(r.box); }
  for (let i = 0; i < w * h; i++) if (m[i]) { const x = i % w, y = (i / w) | 0; if (!N8.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && m[ny * w + nx]; })) out.orphans.push([x, y, x, y]); }
  return out;
}
// The regions of `after` that are new against `before`: each region of `before` is matched once (largest box first) to the nearest unmatched region of the same kind in `after` within `tol` px
// (Chebyshev gap between boxes); the regions left over are new (a piece split off a region is new, a region shifted by the field is not).
export function newRegions(before, after, tol) {
  const near = (a, b) => a[0] - tol <= b[2] && b[0] - tol <= a[2] && a[1] - tol <= b[3] && b[1] - tol <= a[3], area = (b) => (b[2] - b[0] + 1) * (b[3] - b[1] + 1), cen = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], out = [];
  for (const kind of ["components", "holes", "orphans"]) {
    const free = after[kind].map((box, i) => ({ box, i })), used = new Set();
    for (const b of [...before[kind]].sort((x, y) => area(y) - area(x) || x[0] - y[0] || x[1] - y[1])) {
      let best = null, bd = Infinity; for (const c of free) if (!used.has(c.i) && near(b, c.box)) { const d = Math.hypot(cen(b)[0] - cen(c.box)[0], cen(b)[1] - cen(c.box)[1]); if (d < bd) { bd = d; best = c; } }
      if (best) used.add(best.i);
    }
    for (const c of free) if (!used.has(c.i)) out.push({ kind: kind.slice(0, -1), box: c.box });
  }
  return out;
}
// A copy of a 1x picture with 1 px outlines (a review mark, on the copy only) around the boxes.
export function outlineBoxes(img, boxes, rgb = [255, 0, 0]) {
  const out = { w: img.w, h: img.h, data: new Uint8ClampedArray(img.data) }, put = (x, y) => { if (x >= 0 && y >= 0 && x < img.w && y < img.h) out.data.set([...rgb, 255], (y * img.w + x) * 4); };
  for (const [x0, y0, x1, y1] of boxes) { for (let x = x0 - 1; x <= x1 + 1; x++) { put(x, y0 - 1); put(x, y1 + 1); } for (let y = y0 - 1; y <= y1 + 1; y++) { put(x0 - 1, y); put(x1 + 1, y); } }
  return out;
}
// M4: outline pixels = opaque with a 4-neighbour that is transparent or outside; irregular = outline pixels whose count of outline 4-neighbours is not 2 (8 would flag a clean square's edge pixels beside its corners).
export function outlineIrregular(img) {
  const { w, h } = img, m = opaqueMask(img), edge = new Uint8Array(w * h), at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? m[y * w + x] : 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x] && !(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1))) edge[y * w + x] = 1;
  let outline = 0, irregular = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (edge[y * w + x]) {
    outline++; let n = 0; for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h) n += edge[(y + dy) * w + x + dx];
    if (n !== 2) irregular++;
  }
  return { outline, irregular };
}
// M5: silhouette IoU of the opaque masks, and the topline profile (highest opaque row per column) mean |Δ| over the columns where both have one.
export function iou(a, b) { const ma = opaqueMask(a), mb = opaqueMask(b); let i = 0, u = 0; for (let k = 0; k < ma.length; k++) { i += ma[k] & mb[k]; u += ma[k] | mb[k]; } return u ? i / u : 1; }
export function profile(img) { const m = opaqueMask(img), p = new Int32Array(img.w).fill(-1); for (let x = 0; x < img.w; x++) for (let y = 0; y < img.h; y++) if (m[y * img.w + x]) { p[x] = y; break; } return p; }
export function profileDelta(a, b) { const pa = profile(a), pb = profile(b); let s = 0, n = 0, only = 0; for (let x = 0; x < pa.length; x++) { if (pa[x] >= 0 && pb[x] >= 0) { s += Math.abs(pa[x] - pb[x]); n++; } else if (pa[x] !== pb[x]) only++; } return { mean: n ? s / n : 0, columns: n, unmatched: only }; }
// M6's columns: where the blend's field moves the topline, i.e. any column where either end's profile differs from the stand's (and all three have ink). The mean is taken over these only.
export function movedColumns(down, stand, up) { const pd = profile(down), ps = profile(stand), pu = profile(up), cols = []; for (let x = 0; x < ps.length; x++) if (pd[x] >= 0 && ps[x] >= 0 && pu[x] >= 0 && (pd[x] !== ps[x] || pu[x] !== ps[x])) cols.push(x); return cols; }
export function profileDeltaOver(a, b, cols) { const pa = profile(a), pb = profile(b); let s = 0, n = 0; for (const x of cols) if (pa[x] >= 0 && pb[x] >= 0) { s += Math.abs(pa[x] - pb[x]); n++; } return { mean: n ? s / n : 0, columns: n }; }
// M5a: the warped stand's top edge at the animator's measured columns against stand top + the measured end displacement; columns at x ≤ headEdge − 6 only.
export function profileFit(stand, warped, prof, end, headEdgeX) {
  const ps = profile(stand), pw = profile(warped), d = [];
  prof.x.forEach((x, i) => { if (x > headEdgeX - 6 || ps[x] < 0 || pw[x] < 0) return; d.push({ x, delta: Math.abs(pw[x] - (ps[x] + prof[end][i])) }); });
  return { columns: d.length, max: Math.max(0, ...d.map((c) => c.delta)), mean: d.length ? d.reduce((a, c) => a + c.delta, 0) / d.length : 0, worst: d.sort((a, b) => b.delta - a.delta)[0]?.x };
}
// M8: pixels that differ between two frames outside the band (a Uint8Array w*h, 1 = in the moving band).
export function changedOutside(a, b, band) { let n = 0; for (let i = 0; i < a.w * a.h; i++) { if (band[i]) continue; const k = i * 4; if (a.data[k] !== b.data[k] || a.data[k + 1] !== b.data[k + 1] || a.data[k + 2] !== b.data[k + 2] || a.data[k + 3] !== b.data[k + 3]) n++; } return n; }
export const rowsBand = (w, h, [y0, y1]) => { const m = new Uint8Array(w * h); for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) m.fill(1, y * w, (y + 1) * w); return m; };
// "belly-down": the rows below the belly line yb(x), plus the tail box [x, y, w, h].
export function bellyDownBand(w, h, bellyLine, tail) {
  const m = new Uint8Array(w * h), yb = bellyColumns(bellyLine, w);
  for (let x = 0; x < w; x++) for (let y = yb[x] + 1; y < h; y++) m[y * w + x] = 1;
  if (tail) for (let y = tail[1]; y < Math.min(h, tail[1] + tail[3]); y++) for (let x = tail[0]; x < Math.min(w, tail[0] + tail[2]); x++) m[y * w + x] = 1;
  return m;
}
// The agreed counting rule for §0 and M8 on cycled pairs (landmarks `countingRule`): exact RGBA (every channel, every alpha level, no resize, no premultiply); a pixel is in the moving band if
// y >= bellyLine(x) - 12 (the block's belly line, linear between points, flat beyond the ends) or it is in the block's tail box [x, y, w, h].
export function movingBandFromBlock(w, h, block) {
  const m = new Uint8Array(w * h), yb = bellyColumns(block.bellyLine, w);
  for (let x = 0; x < w; x++) for (let y = Math.max(0, yb[x] - 12); y < h; y++) m[y * w + x] = 1;
  if (block.tail) { const [tx, ty, tw, th] = block.tail; for (let y = ty; y < Math.min(h, ty + th); y++) for (let x = tx; x < Math.min(w, tx + tw); x++) m[y * w + x] = 1; }
  return m;
}
export function warpMs(img, field, headMask, runs = 15) { const t = [], L = [{ field, t: 1 }]; warp(img, L, { headMask }); for (let r = 0; r < runs; r++) { const t0 = process.hrtime.bigint(); warp(img, L, { headMask }); t.push(Number(process.hrtime.bigint() - t0) / 1e6); } t.sort((x, y) => x - y); return t[t.length >> 1]; }

// ---- output
const hex = (s) => [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
export const png = (img) => { const f = flat(img); return encodePNG(f.w, f.h, f.data); };
function over(surface, img0, ox, oy) {                     // alpha-composite img onto an opaque surface (presentation only: the contact sheet and the APNG)
  const img = flat(img0);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4, a = img.data[i + 3] / 255, j = ((oy + y) * surface.w + ox + x) * 4; if (!a) continue;
    for (let c = 0; c < 3; c++) surface.data[j + c] = Math.round(surface.data[j + c] * (1 - a) + img.data[i + c] * a);
  }
}
const filled = (w, h, bg) => { const c = blank(w, h); for (let i = 0; i < w * h; i++) c.data.set([...bg, 255], i * 4); return c; };
export function contactSheet(rows, bg, gap = 8) {          // rows: arrays of pictures-or-null, left to right; each row's cells are as high as its tallest
  const cellW = Math.max(...rows.flat().filter(Boolean).map((i) => i.w)), rowH = rows.map((r) => Math.max(...r.filter(Boolean).map((i) => i.h), 0));
  const cols = Math.max(...rows.map((r) => r.length)), W = gap + cols * (cellW + gap), H = gap + rowH.reduce((a, h) => a + h + gap, 0), sheet = filled(W, H, bg);
  let y = gap; rows.forEach((r, ri) => { r.forEach((img, ci) => { if (img) over(sheet, img, gap + ci * (cellW + gap) + ((cellW - img.w) >> 1), y + rowH[ri] - img.h); }); y += rowH[ri] + gap; });
  return sheet;
}
// APNG from full-canvas frames [{ img, ms }]: the first frame is the default image, the rest are fdAT; loops forever.
const idatOf = (img) => { const raw = Buffer.alloc((img.w * 4 + 1) * img.h); for (let y = 0; y < img.h; y++) Buffer.from(img.data.buffer, img.data.byteOffset + y * img.w * 4, img.w * 4).copy(raw, y * (img.w * 4 + 1) + 1); return deflateSync(raw, { level: 9 }); };
export function encodeAPNG(frames) {
  const { w, h } = frames[0].img, u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeUInt32BE(x >>> 0, i * 4)); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("acTL", u32(frames.length, 0))]; let seq = 0;
  frames.forEach((f, k) => {
    const fc = Buffer.alloc(26); fc.writeUInt32BE(seq++, 0); fc.writeUInt32BE(w, 4); fc.writeUInt32BE(h, 8); fc.writeUInt16BE(f.ms, 20); fc.writeUInt16BE(1000, 22); fc[24] = 0; fc[25] = 0;   // x, y = 0; delay = ms/1000 s; dispose none; blend source
    parts.push(chunk("fcTL", fc));
    const z = idatOf(f.img); parts.push(k === 0 ? chunk("IDAT", z) : chunk("fdAT", Buffer.concat([u32(seq++), z])));
  });
  parts.push(chunk("IEND", Buffer.alloc(0))); return Buffer.concat(parts);
}
// Two copies (each a [b0, b1, b2] picture set), side by side on the background, copy B offsetMs into its cycle, at 1×. Each frame lasts until the next change of either copy.
export function vivariumPair(copyA, copyB, { holds, offsetMs, totalMs, bg }) {
  const w = copyA[0].w, h = copyA[0].h, gap = 16, W = 2 * w + 3 * gap, H = h + 2 * gap;
  const sa = breathSegments(holds, 0, totalMs), sb = breathSegments(holds, offsetMs, totalMs);
  const cuts = [...new Set([...sa, ...sb].flatMap((s) => [s.t0, s.t1]))].sort((a, b) => a - b), frames = [], at = (segs, t) => segs.find((s) => t >= s.t0 && t < s.t1).frame;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const t = cuts[k], fa = at(sa, t), fb = at(sb, t), prev = frames.at(-1);
    if (prev && prev.fa === fa && prev.fb === fb) { prev.ms += cuts[k + 1] - t; continue; }
    const c = filled(W, H, bg); over(c, copyA[fa], gap, gap); over(c, copyB[fb], 2 * gap + w, gap); frames.push({ img: c, ms: cuts[k + 1] - t, fa, fb });
  }
  return { bytes: encodeAPNG(frames), delays: frames.map((f) => f.ms) };
}

// ---- one set (one size)
const ENDS = ["down", "up"], SIDE = { down: "min", up: "max" }, fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : String(v));
const isRef = (spec) => /^([\w.-]+)@([0-9a-f]{6,40}):(.+)$/.test(spec);
export const safeName = (n) => String(n).replace(/[^\w.-]/g, "_").replace(/^\.+/, "_") || "set";
export function runSet(set0, opts = {}) {
  const set = { ...set0, name: safeName(set0.name) };
  const rows = [], row = (size, measure, item, value, limit = "", result = "") => rows.push({ set: set.name, size, measure, item, value: fmt(value), limit: fmt(limit), result });
  const ov = opts.overrides ?? {}, overrideNames = Object.keys(ov).filter((k) => ov[k] != null), files = new Map(), bg = opts.bg ?? hex("D6CEBE"), src = null;
  // an input given as a plain path is not pinned to anything: it is hashed but never checked, so a verdict needs an expected sha256 (--<option>-sha256); ref@sha:path sources are pinned by the sha
  const unpinned = [], load = (opt) => { const spec = set[opt], buf = readSource(spec); if (set[`${opt}-sha256`]) expectSha(buf, set[`${opt}-sha256`], opt); else if (!isRef(spec)) unpinned.push(opt); return buf; };
  const standBuf = load("stand"), standRaw = decodeImage(standBuf), size = `${standRaw.w}x${standRaw.h}`;
  const lm = set.landmarks ? JSON.parse(readFileSync(set.landmarks, "utf8")) : null;
  row(size, "input", "stand sha256", sha256(standBuf), "", "info");
  const idBase = lm ? `mibi-${lm.stage}-${lm.species}-stand` : "stand", blendId = lm?.blend ?? "blend";
  const status = [], fields = {}, refused = {};
  // the figure-bbox mapping from the 304 set to this picture (a derived size, and M5a's profile at a placed size): the full ink bbox (alpha > 110, feet included), a picture block's figureBox wins; needs --base-stand
  let mapping = null, info = null;
  if (lm) info = pickPicture(lm, standRaw.w, standRaw.h, set.picture ?? null);
  if (lm && set["base-stand"]) {
    const baseKey = Object.keys(lm.pictures).find((k) => k.endsWith("-304x312")), bImg = decodeImage(load("base-stand"));
    mapping = bboxMapping(lm.pictures[baseKey].figureBox ?? figureBbox(bImg), (info.derived ? null : info.pic.figureBox) ?? figureBbox(standRaw));
  }
  // the first zero row of this picture: where the shadow layer starts
  let zeroY = standRaw.h;
  if (ov.shadowRows) zeroY = ov.shadowRows[0][0];
  else if (info?.pic.fieldZeroRows) zeroY = info.derived && mapping ? mapping.ty0 + rha((info.pic.fieldZeroRows[0] - mapping.by0) * mapping.sy) : info.pic.fieldZeroRows[0];
  let stand;
  if (set["stand-shadow"]) {                                      // a signed cut key: body (alpha 0 or 255) and its painted shadow, each its own file; nothing to prepare
    const sb = load("stand-shadow"); stand = standRaw; stand.shadow = decodeImage(sb);
    let nb = 0, ns = 0, odd = 0; for (let i = 0; i < stand.w * stand.h; i++) { const a = stand.data[i * 4 + 3]; if (a === 255) nb++; else if (a) odd++; if (stand.shadow.data[i * 4 + 3]) ns++; }
    stand.prep = { body: nb, shadow: ns, dropped: 0 }; row(size, "input", "stand shadow sha256", sha256(sb), "", "info");
    row(size, "prep", "signed cut key: body alpha 0/255, shadow its own layer, never warped", `${nb} body, ${ns} shadow px${odd ? `, ${odd} PARTIAL-ALPHA body px` : ""}`, "", odd ? "FAIL" : "info");
  } else stand = prepareKey(standRaw, zeroY);
  const ink = inkMask(stand);
  if (!set["stand-shadow"]) row(size, "prep", `cut key: body alpha>=${BODY_ALPHA} -> 255, shadow alpha ${SHADOW_ALPHA}..${BODY_ALPHA - 1} from row ${zeroY} down kept at <=${SHADOW_MAX} and not warped, rest 0`, `${stand.prep.body} body, ${stand.prep.shadow} shadow, ${stand.prep.dropped} dropped px`, "", "provisional");
  if (!set["stand-shadow"]) status.push("provisional input prep");
  for (const e of ENDS) {
    try {
      if (set[`field-${e}`]) {                                      // a map given by path; the head and rows still come from the landmarks when there are some
        const f = decodeField(readFileSync(set[`field-${e}`]), e);
        if (lm) { const facts = buildField(lm, e, stand.w, stand.h, { picture: set.picture ?? null, overrides: { ...ov, noCheck: true }, mapping }); Object.assign(f, { ink, headMask: facts.headMask, headSource: facts.headSource, zeroRows: facts.zeroRows, bellyY: facts.bellyY, overrides: ["field-map"] }); }
        else Object.assign(f, { ink, headMask: null, headSource: "none", zeroRows: [], bellyY: null, overrides: ["field-map"] });
        if (!ov.noCheck) checkField(f); fields[e] = f;
      } else if (lm) fields[e] = buildField(lm, e, stand.w, stand.h, { picture: set.picture ?? null, overrides: ov, ink, mapping });
      else throw new Error(`set ${set.name}: give --landmarks or --field-${e}`);
    } catch (err) { refused[e] = err.message; row(size, "field", e, err.message, "", "FAIL (refused)"); }
  }
  const live = ENDS.filter((e) => fields[e]), headMask = live.length ? fields[live[0]].headMask : null, headSource = live.length ? fields[live[0]].headSource : "none";
  if (Object.keys(refused).length) status.push("field refused: " + Object.keys(refused).join(", "));
  if (!headMask) status.push("head unmasked");
  if (overrideNames.length || live.some((e) => fields[e].overrides.length)) status.push("override: " + [...new Set([...overrideNames, ...live.flatMap((e) => fields[e].overrides)])].join(", "));
  row(size, "head", "mask source", headSource, "", "info");
  if (live.length) { const f0 = fields[live[0]]; row(size, "points", `picture block ${f0.picture}`, f0.pointsFrom ?? "from the field map", "", "info"); }
  if (mapping) row(size, "points", "figure-bbox mapping from the 304 set", `sx ${mapping.sx.toFixed(4)}, sy ${mapping.sy.toFixed(4)}, base ${mapping.base.join(",")}, target ${mapping.target.join(",")}`, "", "info");
  if (headMask) { const hb = encodeMask(headMask, stand.w, stand.h); files.set(`${set.name}/${idBase}-map-head-${size}.png`, hb); row(size, "head", "mask png sha256", sha256(hb), "", "info"); }
  const painted = {}, warped = {}, wbody = {}, stats = { clampMisses: 0 };
  for (const e of ENDS) {
    if (set[`painted-${e}`]) { const b = load(`painted-${e}`); painted[e] = decodeImage(b); row(size, "input", `painted-${e} sha256`, sha256(b), "", "info"); if (set[`painted-${e}-shadow`]) { const sb = load(`painted-${e}-shadow`); painted[e].shadow = decodeImage(sb); row(size, "input", `painted-${e} shadow sha256`, sha256(sb), "", "info"); } }
    if (!fields[e]) continue;
    warped[e] = warp(stand, [{ field: fields[e], t: 1 }], { headMask, stats });
    wbody[e] = warp(stand, [{ field: fields[e], t: 1 }], { headMask, drawHead: false });
    const fb = encodeField(fields[e]); files.set(`${set.name}/${idBase}-map-warp-${blendId}-${SIDE[e]}-${size}.png`, fb); row(size, "field", `${e} map sha256`, sha256(fb), "", "info");
  }
  const matrix = [painted.down ?? null, warped.down ?? null, stand, warped.up ?? null, painted.up ?? null], names = ["painted-down", "warped-down", "stand", "warped-up", "painted-up"];
  matrix.forEach((img, i) => { if (img) files.set(`${set.name}/${size}-${names[i]}.png`, png(img)); });

  const standS0 = silhouette(flat(stand), 0), standS1 = silhouette(stand, OPAQUE), sil0 = standS1, out0 = outlineIrregular(stand), headEdge = headMask ? (() => { for (let x = 0; x < stand.w; x++) for (let y = 0; y < stand.h; y++) if (headMask[y * stand.w + x]) return x; return stand.w; })() : stand.w;
  row(size, "M3", "stand strict counts", `${sil0.components} comp, ${sil0.holes} holes, ${sil0.orphans} orphans`, "info");
  row(size, "M4", "stand irregular", out0.irregular, "", "info");
  const L5 = M5_LIMITS[size], sil = (s) => `${s.components} comp, ${s.holes} holes, ${s.orphans} orphans`;
  for (const e of live) {
    const nc = newColours(flat(stand), flat(warped[e])); row(size, "M2", `warped-${e}`, nc, 0, nc === 0 ? "pass" : "FAIL");
    const s = silhouette(warped[e]), sb = silhouette(wbody[e]);
    row(size, "M3", `warped-${e} strict counts (head drawn)`, sil(s), "1 comp, 0 holes, 0 orphans: information only", "info");
    // M3: alpha > 110 gates (components, holes, orphans each <= the unwarped picture's); alpha > 0 informs, with the box of every region new against the unwarped picture
    const gate = (img, base, what) => { const c = silhouette(img, OPAQUE), ok = c.components <= base.components && c.holes <= base.holes && c.orphans <= base.orphans; row(size, "M3", what, `alpha>110 ${c.components}/${c.holes}/${c.orphans} (components/holes/orphans)`, `<= the unwarped ${base.components}/${base.holes}/${base.orphans}`, ok ? "pass" : "FAIL"); };
    gate(warped[e], standS1, `warped-${e} not worse than its own unwarped picture (alpha>110 gates)`);
    gate(wbody[e], standS1, `warped-${e} body layer alone, not worse than the unwarped body layer (alpha>110 gates)`);
    const report = (img, what) => { const c = silhouette(flat(img), 0); row(size, "M3", what, `alpha>0 ${c.components}/${c.holes}/${c.orphans} (components/holes/orphans)`, `the unwarped ${standS0.components}/${standS0.holes}/${standS0.orphans}`, "report"); };
    report(warped[e], `warped-${e} alpha>0 counts`); report(wbody[e], `warped-${e} body layer alpha>0 counts`);
    const fresh = [["alpha>0", 0], ["alpha>110", OPAQUE]].flatMap(([lab, thr]) => newRegions(silhouetteRegions(flat(stand), thr), silhouetteRegions(flat(warped[e]), thr), Math.ceil(fields[e].maxD) + 1).map((r) => ({ ...r, lab })));
    fresh.forEach((r) => row(size, "M3", `warped-${e} new ${r.kind} at ${r.lab}`, r.box.join(","), "x0,y0,x1,y1", "report"));
    if (fresh.length) files.set(`${set.name}/${size}-warped-${e}-new-regions.png`, png(outlineBoxes(flat(warped[e]), fresh.map((r) => r.box))));
    const o = outlineIrregular(warped[e]), lim = Math.floor(out0.irregular * (1 + M4_SLACK)); row(size, "M4", `warped-${e} irregular`, o.irregular, lim, o.irregular <= lim ? "pass" : "FAIL");
    row(size, "clamp", `misses (${e}, final)`, stats.clampMisses, 0, stats.clampMisses === 0 ? "pass" : "FAIL"); stats.clampMisses = 0;
    if (fields[e].zeroRows?.length) { const z = fields[e].zeroRows[0][0], a = flat(stand), b = flat(warped[e]); let n = 0; for (let i = z * stand.w * 4; i < stand.w * stand.h * 4; i++) if (a.data[i] !== b.data[i]) n++; row(size, "feet", `changed pixel values in the feet and shadow rows (row ${z} down), warped vs stand (${e})`, n, 0, n === 0 ? "pass" : "FAIL"); }
    const ls = legStrain(fields[e]), lsFixed = fields[e].bellyFixed; row(size, "legs", `leg strain (max |db| / (z0 - yb)) (${e})`, ls, lsFixed ? 0 : 0.25, lsFixed ? (ls === 0 ? "pass" : "FAIL") : (ls <= 0.25 + 1e-9 ? "pass" : "FAIL"));
    row(size, "field", `${e} max |d| px / stretch / shear`, `${fields[e].maxD.toFixed(2)} / ${fields[e].maxStretch.toFixed(3)} / ${fields[e].maxShear.toFixed(3)}`, `${fmt(({ "304x312": 12, "144x152": 6, "104x112": 4, "96x88": 3 })[size] ?? "")} / 0.25 / 0.5`, "pass");
    const notApplied = typeof info?.pic.M5a === "string" && info.pic.M5a.startsWith("not applied"), prof304 = size === "304x312", scaled = !prof304 && mapping && lm?.toplineProfile;
    if (notApplied) row(size, "M5a", e, info.pic.M5a, "", "n/a");
    else if (lm?.toplineProfile && headMask && (prof304 || scaled)) {
      const P = lm.toplineProfile, prof = prof304 ? P : { x: P.x.map((x) => mapping.tx0 + rha((x - mapping.bx0) * mapping.sx)), down: P.down.map((d) => d * mapping.sy), up: P.up.map((d) => d * mapping.sy) };
      // the one M5a tolerance is the animator's rules.M5aTolerance: 304 at its own, 104 and 144, and a figure scale below 0.30 (the nap); there is no fallback
      const T = lm.rules?.M5aTolerance, small = !prof304 && Math.max(mapping.sx, mapping.sy) < 0.30, tol = !T ? null : prof304 ? T["304x312"] : small ? T["figure scale < 0.30 (the 96x88 nap)"] : T["104x112 and 144x152"];
      const p = profileFit(stand, warped[e], prof, e, headEdge), what = `${e} top edge vs the ${prof304 ? "measured" : "mapped"} profile, ${p.columns} columns x <= ${headEdge - 6}`, val = `max ${p.max.toFixed(2)} (x ${p.worst}), mean ${p.mean.toFixed(2)}`;
      if (!tol) row(size, "M5a", what, val, "no rules.M5aTolerance for this size in the landmarks", "n/a");
      else row(size, "M5a", what, val, `${tol.max} / ${tol.mean}`, p.max <= tol.max + 1e-9 && p.mean <= tol.mean + 1e-9 ? "pass" : "FAIL");
    } else row(size, "M5a", e, "no toplineProfile, head mask or --base-stand mapping", "", "n/a");
    if (painted[e]) {
      const j = iou(warped[e], painted[e]), pd = profileDelta(warped[e], painted[e]);
      row(size, "M5", `iou warped-${e} vs painted`, j, L5 ? L5.iou : "", L5 ? (j >= L5.iou ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile mean abs d warped-${e} vs painted`, pd.mean, L5 ? L5.profile : "", L5 ? (pd.mean <= L5.profile ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile columns warped-${e} vs painted`, `${pd.columns} matched, ${pd.unmatched} unmatched`, "", "info");
      const q = silhouette(painted[e]), po = outlineIrregular(painted[e]); row(size, "M3", `painted-${e}`, sil(q), "info", "info"); row(size, "M4", `painted-${e} irregular`, po.irregular, "", "info");
    } else row(size, "M5", `warped-${e} vs painted`, "no painted end given", "", "n/a");
  }
  // M6 at walker size: pairwise mean profile difference of the three bins
  if (size === "104x112" || size === "144x152") for (const [kind, ends] of [["warped", [warped.down, stand, warped.up]], ["painted", [painted.down, stand, painted.up]]]) {
    if (ends.some((x) => !x)) { row(size, "M6", kind, "ends not available", "", "n/a"); continue; }
    const cols = movedColumns(ends[0], ends[1], ends[2]); row(size, "M6", `${kind} columns the field moves`, cols.length, "", "info");
    for (const [a, b, label] of [[0, 1, "down-stand"], [1, 2, "stand-up"], [0, 2, "down-up"]]) { const d = profileDeltaOver(ends[a], ends[b], cols).mean; row(size, "M6", `${kind} ${label} (mean over the moved columns)`, d, M6_MIN, label === "down-up" ? (d >= M6_MIN ? "pass" : "FAIL") : `info (${d >= M6_MIN ? "above" : "below"} the bar; only down-up gates)`); }
  } else row(size, "M6", "only at 104x112 and 144x152", "", "", "n/a");
  // M7
  for (const e of live) { const ms = warpMs(stand, fields[e], headMask); row(size, "M7", `warp ms per picture (${e}; a clock reading)`, ms, size === "104x112" ? M7_MAX_MS : "", size === "104x112" ? (ms <= M7_MAX_MS ? "pass (this machine; confirm on the CI runner)" : "FAIL (this machine; confirm on the CI runner)") : "info"); }
  // M8. A breath pair (stand and its baked b1 / b2) needs no band in the JSON: the band is derived, the rows above the belly line in each column. The baked step is baked from the warped
  // stand (the field reused by id, never warped on its own). A cycle pair (paths, or a `belly-down` or mask band) comes from the JSON.
  const yb = live.length ? fields[live[0]].bellyY : null;
  if (yb) {
    const band = aboveBellyBand(stand.w, stand.h, yb);
    for (const n of [1, 2]) {
      const plain = changedOutside(stand, bakeStep(stand, n, yb), band);
      for (const e of live) { const wa = warp(stand, [{ field: fields[e], t: 1 }], { headMask }), ybw = warpedBelly(yb, fields[e]), w2 = changedOutside(wa, bakeStep(wa, n, ybw), aboveBellyBand(stand.w, stand.h, ybw)); row(size, "M8", `stand-b${n} ${e}: changed outside the rows above the belly line, no warp / warp`, `${plain} / ${w2}`, plain, w2 <= plain ? "pass" : "FAIL"); }
    }
  } else row(size, "M8", "stand-b1, stand-b2", "no belly line in the landmarks", "", "n/a");
  const pairs = lm ? (lm.pairs ?? []).filter((p) => (set["pair-ids"] ? set["pair-ids"].split(",").includes(p.id) : p.id.startsWith(lm.species + "-"))) : [];
  for (const p of pairs) {
    try {
      const aBuf = readSource(p.a); expectSha(aBuf, p.sha256?.[0], `${p.id} a`); if (!p.sha256?.[0] && !isRef(p.a)) unpinned.push(`${p.id} a`);
      if (p.b?.bake) {
        if (decodeImage(aBuf).w !== stand.w) { row(size, "M8", p.id, `a is not ${size}`, "", "n/a"); continue; }
        if (sha256(aBuf) !== sha256(standBuf)) { if (!set["stand-shadow"]) throw new Error(`${p.id}: a is not this set's stand; the run stops`); row(size, "M8", `${p.id} a is the signed stand (sha256 ${sha256(aBuf).slice(0, 12)}), not this set's level key; the stand-b rows above run on the level key`, "", "", "info"); continue; }
        row(size, "M8", `${p.id} a is this stand (sha256 ${sha256(aBuf).slice(0, 12)}); the stand-b rows above run on it`, "", "", "info"); continue;
      }
      const a = decodeImage(aBuf);
      if (a.w !== stand.w || a.h !== stand.h) { row(size, "M8", p.id, `a is ${a.w}x${a.h}, not this set's ${size}`, "", "n/a"); continue; }
      let bandMask; const spec = ov.band ? ov.band.split("-").map(Number) : p.band;
      if (Array.isArray(spec)) bandMask = rowsBand(a.w, a.h, spec);
      else if (spec === "belly-down") { const from = p.bellyFrom ? p.bellyFrom.split(".").reduce((o, k) => o?.[k], lm) : null; bandMask = bellyDownBand(a.w, a.h, from?.bellyLine ?? Object.values(lm.pictures).find((q) => q.bellyLine)?.bellyLine, p.tail ?? from?.tail); }
      else if (typeof spec === "string" && spec.endsWith(".countingRule.movingBand")) { const block = spec.split(".").slice(0, -2).reduce((o, k) => o?.[k], lm); if (!block?.bellyLine) throw new Error(`${p.id}: band ${spec} has no block with a bellyLine`); bandMask = movingBandFromBlock(a.w, a.h, block); }
      else if (spec?.mask) bandMask = headMaskFrom(readFileSync(spec.mask)).mask;
      else throw new Error(`${p.id}: no band`);
      const bBuf = readSource(p.b); expectSha(bBuf, p.sha256?.[1], `${p.id} b`); if (!p.sha256?.[1] && !isRef(p.b)) unpinned.push(`${p.id} b`); const b = decodeImage(bBuf); row(size, "M8", `${p.id} a / b sha256`, `${sha256(aBuf).slice(0, 12)} / ${sha256(bBuf).slice(0, 12)}`, "", "info");
      const plain = changedOutside(a, b, bandMask);
      // a cycled pair is signed only on the locked cut (motion-spec §0 points 5-6): `locked: true` on the pair (or on its bellyFrom block) in the landmarks; otherwise the counts are kept and there is no verdict
      const from = p.bellyFrom ? p.bellyFrom.split(".").reduce((o, k) => o?.[k], lm) : null, locked = (p.locked ?? from?.locked) === true, cycled = p.band === "belly-down" || (typeof p.band === "string" && p.band.endsWith(".countingRule.movingBand")) || p.cycle === true, verdict = (ok) => (!cycled || locked ? (ok ? "pass" : "FAIL") : "unlocked: no verdict");   // the lock gate is for cycled pairs only; a held-key pair needs none
      if (cycled && !locked) status.push("unlocked pair: no verdict");
      row(size, "M8", `${p.id} absolute §0 test (unwarped): changed outside the band (only legs and tail change)`, plain, 0, verdict(plain === 0));
      for (const e of live) { const L = [{ field: fields[e], t: 1 }], w2 = changedOutside(warp(a, L, { headMask }), warp(b, L, { headMask }), bandMask); row(size, "M8", `${p.id} ${e}: changed outside the band, no warp / warp`, `${plain} / ${w2}`, plain, verdict(w2 <= plain)); }
    } catch (err) { if (err.unreadable) row(size, "M8", p.id, err.message, "", "n/a"); else throw err; }
  }
  // the Vivarium pair: the animator's holds and offset from the landmarks (overrides only by flag); b1 and b2 baked from each warped stand
  const bp = lm?.breathPair, holds = ov.holds ? ov.holds.split(",").map(Number) : bp ? [bp.holdsMs.b0, bp.holdsMs.b1, bp.holdsMs.b2, bp.holdsMs.b1back] : null, offsetMs = ov.phaseMs ?? bp?.offsetMs, totalMs = (ov.seconds ?? SECONDS) * 1000;
  if (!holds || offsetMs == null) row(size, "pair", "breathPair", "not in the landmarks: no APNG", "", "n/a");
  else if (!yb) row(size, "pair", "b-steps", "no belly line: no APNG", "", "n/a");
  else {
    row(size, "pair", "holds b0/b1/b2/b1back ms, offset ms, seconds", `${holds.join("/")}, ${offsetMs}, ${totalMs / 1000}`, "", "info");
    const set3 = (img, line) => [img, bakeStep(img, 1, line), bakeStep(img, 2, line)], copy = { down: warped.down && set3(warped.down, warpedBelly(yb, fields.down)), middle: set3(stand, yb), up: warped.up && set3(warped.up, warpedBelly(yb, fields.up)) };
    const exag = /exaggerated/.test(info?.name ?? "");                                  // a variant block: one extra pair, down against up
    for (const [l, r] of exag ? [["down", "up"]] : [["down", "middle"], ["middle", "up"], ["down", "up"]]) if (copy[l] && copy[r]) {
      const v = vivariumPair(copy[l], copy[r], { holds, offsetMs, totalMs, bg }); files.set(`${set.name}/vivarium-pair-${size}-${exag ? "exaggerated-" : ""}${l}-${r}.apng`, v.bytes);
      if (v.delays.some((d) => d % 80)) row(size, "pair", `${l}|${r} frame delays`, "not all multiples of 80 ms", "", "note");
    }
  }
  if (lm?.species === "S01") row(size, "hop", "the hop's lift table unchanged", "the face applies the lift at draw time as a whole-pixel cell offset and the warp never reads it", "", "satisfied by construction");
  files.set(`${set.name}/contact-${size}.png`, png(contactSheet([matrix], bg)));
  if (unpinned.length) status.push(`unpinned input (plain path, no expected sha256): ${unpinned.join(", ")}`);
  const uniq = [...new Set(status)];
  row(size, "run", "status", uniq.length ? uniq.join("; ") + " (no verdict)" : "verdict-shaped (a verdict also needs the animator's re-signed landmarks and the painted ends)", "", uniq.length ? "no verdict" : "ok");
  return { rows, files, sheetRow: matrix, size };
}

export const csv = (rows) => ["set,size,measure,item,value,limit,result", ...rows.map((r) => [r.set, r.size, r.measure, r.item, r.value, r.limit, r.result].map((v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))].join("\n") + "\n";

// Runs every set twice (M1: the same inputs give the same bytes), returns { rows, files }. Clock readings (M7) are in the CSV, not in the bytes compared.
export function runAll(sets, opts = {}) {
  const a = sets.map((s) => runSet(s, opts)), b = sets.map((s) => runSet(s, opts)), rows = [], files = new Map();
  const digest = (r) => createHash("sha256").update([...r.files].sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => k + createHash("sha256").update(v).digest("hex")).join("\n")).digest("hex");
  const sheet = contactSheet(a.map((r) => r.sheetRow), opts.bg ?? hex("D6CEBE"));
  sets.forEach((s, i) => { const same = digest(a[i]) === digest(b[i]); rows.push(...a[i].rows, { set: s.name, size: a[i].size, measure: "M1", item: "two runs, same bytes (PNGs, maps, APNGs)", value: digest(a[i]).slice(0, 12), limit: "equal", result: same ? "pass" : "FAIL" }); for (const [k, v] of a[i].files) files.set(k, v); });
  files.set("contact-sheet.png", png(sheet)); files.set("measures.csv", Buffer.from(csv(rows)));
  return { rows, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), g = {}, ov = {}, sets = []; let cur = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; if (!a.startsWith("--")) { console.error(`unexpected "${a}"`); process.exit(2); }
    const k = a.slice(2);
    if (k === "no-check") { ov.noCheck = true; continue; }
    const v = argv[++i];
    if (k === "set") { cur = { name: v }; sets.push(cur); }
    else if (["out", "bg"].includes(k)) g[k] = v;
    else if (k === "head-mask") ov.headMask = headMaskFrom(readFileSync(v));
    else if (k === "shadow-rows") ov.shadowRows = [v.split("-").map(Number)];
    else if (k === "belly-y") ov.bellyY = +v; else if (k === "amplitude") ov.amplitude = +v;
    else if (k === "band") ov.band = v; else if (k === "holds") ov.holds = v; else if (k === "phase-ms") ov.phaseMs = +v; else if (k === "seconds") ov.seconds = +v;
    else if (!cur) { console.error(`--${k} comes after a --set`); process.exit(2); } else cur[k] = v;
  }
  if (!g.out || !sets.length || sets.some((s) => !s.stand)) { console.error("usage: tier2-test.mjs --out dir --set name --stand src --landmarks lm.json [options]; see the header of this file"); process.exit(2); }
  try {
    const { rows, files } = runAll(sets, { overrides: ov, bg: g.bg ? hex(g.bg) : undefined });
    for (const [k, v] of files) { const f = path.join(g.out, k); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, v); }
    for (const r of rows) console.log(`${r.set} ${r.size} ${r.measure} ${r.item}: ${r.value}${r.limit !== "" ? ` (limit ${r.limit})` : ""} ${r.result}`);
    console.log(`wrote ${files.size} files to ${g.out}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
