#!/usr/bin/env node
// Tier 2 test harness (boards/mibi-motion/tier2-method.md §3, §4, Q-A3, the architect's harness answers): renders the matrix {painted down, warped down, stand, warped up, painted up}
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
import { buildField, decodeField, encodeField, encodeMask, headMaskFrom, checkField, legCompression, bellyColumns, rha, quantT, sha256, chunk } from "./warp-field.mjs";

export const OPAQUE = 110;                                 // alpha > 110 is opaque (the animator's measure for the topline)
export const M5_LIMITS = { "304x312": { iou: 0.95, profile: 2 }, "104x112": { iou: 0.93, profile: 1 } };
export const M5A = { column: 1.5, mean: 1 }, M6_MIN = 2, M7_MAX_MS = 5, M4_SLACK = 0.05, SECONDS = 10;

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
  return out;
}

// The b-step bake (the animator's `breathBake`): row copies per column, no resampling, no new pixels. yb(x) is the belly line at x (Int32Array), rows y >= yb unchanged.
// b1: out(x, y) = in(x, y + 1) for y < yb - 1, row yb - 1 keeps itself (one row doubled at the belly line). b2: a second 1 px lift for the rows above ym = round((ytop + yb) / 2),
// ytop = the column's first ink row (alpha > 0) of the picture being baked (the warped stand for a warped step); ym is never within 8 px of yb (ym = min(ym, yb - 8)). Rows shifted in
// from above the figure are transparent. A column with no ink is unchanged.
export function bakeStep(img, n, yb) {
  const { w, h } = img, out = { w, h, data: new Uint8ClampedArray(img.data) };
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
export const aboveBellyBand = (w, h, yb) => { const m = new Uint8Array(w * h); for (let x = 0; x < w; x++) for (let y = 0; y < Math.min(h, yb[x]); y++) m[y * w + x] = 1; return m; };

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
export function warpMs(img, field, headMask, runs = 15) { const t = [], L = [{ field, t: 1 }]; warp(img, L, { headMask }); for (let r = 0; r < runs; r++) { const t0 = process.hrtime.bigint(); warp(img, L, { headMask }); t.push(Number(process.hrtime.bigint() - t0) / 1e6); } t.sort((x, y) => x - y); return t[t.length >> 1]; }

// ---- output
const hex = (s) => [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
export const png = (img) => encodePNG(img.w, img.h, img.data);
function over(surface, img, ox, oy) {                      // alpha-composite img onto an opaque surface (presentation only: the contact sheet and the APNG)
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
export function runSet(set, opts = {}) {
  const rows = [], row = (size, measure, item, value, limit = "", result = "") => rows.push({ set: set.name, size, measure, item, value: fmt(value), limit: fmt(limit), result });
  const ov = opts.overrides ?? {}, overrideNames = Object.keys(ov).filter((k) => ov[k] != null), files = new Map(), bg = opts.bg ?? hex("D6CEBE"), src = null;
  const standBuf = readSource(set.stand), stand = decodeImage(standBuf), size = `${stand.w}x${stand.h}`;
  const lm = set.landmarks ? JSON.parse(readFileSync(set.landmarks, "utf8")) : null;
  row(size, "input", "stand sha256", sha256(standBuf), "", "info");
  const idBase = lm ? `mibi-${lm.stage}-${lm.species}-stand` : "stand", blendId = lm?.blend ?? "blend";
  const status = [], fields = {}, refused = {}, ink = inkMask(stand);
  for (const e of ENDS) {
    try {
      if (set[`field-${e}`]) {                                      // a map given by path; the head and rows still come from the landmarks when there are some
        const f = decodeField(readFileSync(set[`field-${e}`]), e);
        if (lm) { const facts = buildField(lm, e, stand.w, stand.h, { picture: set.picture ?? null, overrides: { ...ov, noCheck: true } }); Object.assign(f, { ink, headMask: facts.headMask, headSource: facts.headSource, zeroRows: facts.zeroRows, bellyY: facts.bellyY, overrides: ["field-map"] }); }
        else Object.assign(f, { ink, headMask: null, headSource: "none", zeroRows: [], bellyY: null, overrides: ["field-map"] });
        if (!ov.noCheck) checkField(f); fields[e] = f;
      } else if (lm) fields[e] = buildField(lm, e, stand.w, stand.h, { picture: set.picture ?? null, overrides: ov, ink });
      else throw new Error(`set ${set.name}: give --landmarks or --field-${e}`);
    } catch (err) { refused[e] = err.message; row(size, "field", e, err.message, "", "FAIL (refused)"); }
  }
  const live = ENDS.filter((e) => fields[e]), headMask = live.length ? fields[live[0]].headMask : null, headSource = live.length ? fields[live[0]].headSource : "none";
  if (Object.keys(refused).length) status.push("field refused: " + Object.keys(refused).join(", "));
  if (!headMask) status.push("head unmasked");
  if (overrideNames.length || live.some((e) => fields[e].overrides.length)) status.push("override: " + [...new Set([...overrideNames, ...live.flatMap((e) => fields[e].overrides)])].join(", "));
  row(size, "head", "mask source", headSource, "", "info");
  if (headMask) { const hb = encodeMask(headMask, stand.w, stand.h); files.set(`${set.name}/${idBase}-map-head-${size}.png`, hb); row(size, "head", "mask png sha256", sha256(hb), "", "info"); }
  const painted = {}, warped = {}, wbody = {}, stats = { clampMisses: 0 };
  for (const e of ENDS) {
    if (set[`painted-${e}`]) { const b = readSource(set[`painted-${e}`]); painted[e] = decodeImage(b); row(size, "input", `painted-${e} sha256`, sha256(b), "", "info"); }
    if (!fields[e]) continue;
    warped[e] = warp(stand, [{ field: fields[e], t: 1 }], { headMask, stats });
    wbody[e] = warp(stand, [{ field: fields[e], t: 1 }], { headMask, drawHead: false });
    const fb = encodeField(fields[e]); files.set(`${set.name}/${idBase}-map-warp-${blendId}-${SIDE[e]}-${size}.png`, fb); row(size, "field", `${e} map sha256`, sha256(fb), "", "info");
  }
  const matrix = [painted.down ?? null, warped.down ?? null, stand, warped.up ?? null, painted.up ?? null], names = ["painted-down", "warped-down", "stand", "warped-up", "painted-up"];
  matrix.forEach((img, i) => { if (img) files.set(`${set.name}/${size}-${names[i]}.png`, png(img)); });

  const standS0 = silhouette(stand, 0), standS1 = silhouette(stand, OPAQUE), sil0 = standS1, out0 = outlineIrregular(stand), headEdge = headMask ? (() => { for (let x = 0; x < stand.w; x++) for (let y = 0; y < stand.h; y++) if (headMask[y * stand.w + x]) return x; return stand.w; })() : stand.w;
  row(size, "M3", "stand strict counts", `${sil0.components} comp, ${sil0.holes} holes, ${sil0.orphans} orphans`, "info");
  row(size, "M4", "stand irregular", out0.irregular, "", "info");
  const L5 = M5_LIMITS[size], sil = (s) => `${s.components} comp, ${s.holes} holes, ${s.orphans} orphans`;
  for (const e of live) {
    const nc = newColours(stand, warped[e]); row(size, "M2", `warped-${e}`, nc, 0, nc === 0 ? "pass" : "FAIL");
    const s = silhouette(warped[e]), sb = silhouette(wbody[e]);
    row(size, "M3", `warped-${e} strict counts (head drawn)`, sil(s), "1 comp, 0 holes, 0 orphans: information only", "info");
    const rel = (img, base0, base110, what) => { const c0 = silhouette(img, 0), c1 = silhouette(img, OPAQUE), ok = c0.components <= base0.components && c0.holes <= base0.holes && c0.orphans <= base0.orphans && c1.components <= base110.components && c1.holes <= base110.holes && c1.orphans <= base110.orphans; row(size, "M3", what, `alpha>0 ${c0.components}/${c0.holes}/${c0.orphans}, alpha>110 ${c1.components}/${c1.holes}/${c1.orphans} (components/holes/orphans)`, `<= the unwarped: alpha>0 ${base0.components}/${base0.holes}/${base0.orphans}, alpha>110 ${base110.components}/${base110.holes}/${base110.orphans}`, ok ? "pass" : "FAIL"); };
    rel(warped[e], standS0, standS1, `warped-${e} not worse than its own unwarped picture`);
    rel(wbody[e], standS0, standS1, `warped-${e} body layer alone, not worse than the unwarped body layer`);
    const o = outlineIrregular(warped[e]), lim = Math.floor(out0.irregular * (1 + M4_SLACK)); row(size, "M4", `warped-${e} irregular`, o.irregular, lim, o.irregular <= lim ? "pass" : "FAIL");
    row(size, "clamp", `misses (${e}, final)`, stats.clampMisses, 0, stats.clampMisses === 0 ? "pass" : "FAIL"); stats.clampMisses = 0;
    const lc = legCompression(fields[e], stand), lcFixed = fields[e].bellyFixed; row(size, "legs", `leg compression px (${e})`, lc, lcFixed ? 0 : "", lcFixed ? (lc === 0 ? "pass" : "FAIL") : "info");
    row(size, "field", `${e} max |d| px / stretch / shear`, `${fields[e].maxD.toFixed(2)} / ${fields[e].maxStretch.toFixed(3)} / ${fields[e].maxShear.toFixed(3)}`, `${fmt(({ "304x312": 12, "144x152": 6, "104x112": 4, "96x88": 3 })[size] ?? "")} / 0.25 / 0.5`, "pass");
    if (lm?.toplineProfile && size === "304x312" && headMask) { const p = profileFit(stand, warped[e], lm.toplineProfile, e, headEdge); row(size, "M5a", `${e} top edge vs the measured profile, ${p.columns} columns x <= ${headEdge - 6}`, `max ${p.max.toFixed(2)} (x ${p.worst}), mean ${p.mean.toFixed(2)}`, `${M5A.column} / ${M5A.mean}`, p.max <= M5A.column && p.mean <= M5A.mean ? "pass" : "FAIL"); }
    else row(size, "M5a", e, size === "304x312" ? "no toplineProfile or head mask" : "only at 304x312", "", "n/a");
    if (painted[e]) {
      const j = iou(warped[e], painted[e]), pd = profileDelta(warped[e], painted[e]);
      row(size, "M5", `iou warped-${e} vs painted`, j, L5 ? L5.iou : "", L5 ? (j >= L5.iou ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile mean abs d warped-${e} vs painted`, pd.mean, L5 ? L5.profile : "", L5 ? (pd.mean <= L5.profile ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile columns warped-${e} vs painted`, `${pd.columns} matched, ${pd.unmatched} unmatched`, "", "info");
      const q = silhouette(painted[e]), po = outlineIrregular(painted[e]); row(size, "M3", `painted-${e}`, sil(q), "info", "info"); row(size, "M4", `painted-${e} irregular`, po.irregular, "", "info");
    } else row(size, "M5", `warped-${e} vs painted`, "no painted end given", "", "n/a");
  }
  // M6 at walker size: pairwise mean profile difference of the three bins
  if (size === "104x112") for (const [kind, ends] of [["warped", [warped.down, stand, warped.up]], ["painted", [painted.down, stand, painted.up]]]) {
    if (ends.some((x) => !x)) { row(size, "M6", kind, "ends not available", "", "n/a"); continue; }
    for (const [a, b, label] of [[0, 1, "down-stand"], [1, 2, "stand-up"], [0, 2, "down-up"]]) { const d = profileDelta(ends[a], ends[b]).mean; row(size, "M6", `${kind} ${label}`, d, M6_MIN, d >= M6_MIN ? "pass" : "FAIL"); }
  } else row(size, "M6", "only at 104x112", "", "", "n/a");
  // M7
  for (const e of live) { const ms = warpMs(stand, fields[e], headMask); row(size, "M7", `warp ms per picture (${e}; a clock reading)`, ms, size === "104x112" ? M7_MAX_MS : "", size === "104x112" ? (ms <= M7_MAX_MS ? "pass (this machine; confirm on the CI runner)" : "FAIL (this machine; confirm on the CI runner)") : "info"); }
  // M8. A breath pair (stand and its baked b1 / b2) needs no band in the JSON: the band is derived, the rows above the belly line in each column. The baked step is baked from the warped
  // stand (the field reused by id, never warped on its own). A cycle pair (paths, or a `belly-down` or mask band) comes from the JSON.
  const yb = live.length ? fields[live[0]].bellyY : null;
  if (yb) {
    const band = aboveBellyBand(stand.w, stand.h, yb);
    for (const n of [1, 2]) {
      const plain = changedOutside(stand, bakeStep(stand, n, yb), band);
      for (const e of live) { const wa = warp(stand, [{ field: fields[e], t: 1 }], { headMask }), w2 = changedOutside(wa, bakeStep(wa, n, yb), band); row(size, "M8", `stand-b${n} ${e}: changed outside the rows above the belly line, no warp / warp`, `${plain} / ${w2}`, plain, w2 <= plain ? "pass" : "FAIL"); }
    }
  } else row(size, "M8", "stand-b1, stand-b2", "no belly line in the landmarks", "", "n/a");
  const pairs = lm ? (lm.pairs ?? []).filter((p) => (set["pair-ids"] ? set["pair-ids"].split(",").includes(p.id) : p.id.startsWith(lm.species + "-"))) : [];
  for (const p of pairs) {
    try {
      const aBuf = readSource(p.a); expectSha(aBuf, p.sha256?.[0], `${p.id} a`);
      if (p.b?.bake) {
        if (decodeImage(aBuf).w !== stand.w) { row(size, "M8", p.id, `a is not ${size}`, "", "n/a"); continue; }
        if (sha256(aBuf) !== sha256(standBuf)) throw new Error(`${p.id}: a is not this set's stand; the run stops`);
        row(size, "M8", `${p.id} a is this stand (sha256 ${sha256(aBuf).slice(0, 12)}); the stand-b rows above run on it`, "", "", "info"); continue;
      }
      const a = decodeImage(aBuf);
      if (a.w !== stand.w || a.h !== stand.h) { row(size, "M8", p.id, `a is ${a.w}x${a.h}, not this set's ${size}`, "", "n/a"); continue; }
      let bandMask; const spec = ov.band ? ov.band.split("-").map(Number) : p.band;
      if (Array.isArray(spec)) bandMask = rowsBand(a.w, a.h, spec);
      else if (spec === "belly-down") { const from = p.bellyFrom ? p.bellyFrom.split(".").reduce((o, k) => o?.[k], lm) : null; bandMask = bellyDownBand(a.w, a.h, from?.bellyLine ?? Object.values(lm.pictures).find((q) => q.bellyLine)?.bellyLine, p.tail ?? from?.tail); }
      else if (spec?.mask) bandMask = headMaskFrom(readFileSync(spec.mask)).mask;
      else throw new Error(`${p.id}: no band`);
      const bBuf = readSource(p.b); expectSha(bBuf, p.sha256?.[1], `${p.id} b`); const b = decodeImage(bBuf); row(size, "M8", `${p.id} a / b sha256`, `${sha256(aBuf).slice(0, 12)} / ${sha256(bBuf).slice(0, 12)}`, "", "info");
      const plain = changedOutside(a, b, bandMask);
      for (const e of live) { const L = [{ field: fields[e], t: 1 }], w2 = changedOutside(warp(a, L, { headMask }), warp(b, L, { headMask }), bandMask); row(size, "M8", `${p.id} ${e}: changed outside the band, no warp / warp`, `${plain} / ${w2}`, plain, w2 <= plain ? "pass" : "FAIL"); }
    } catch (err) { if (err.unreadable) row(size, "M8", p.id, err.message, "", "n/a"); else throw err; }
  }
  // the Vivarium pair: the animator's holds and offset from the landmarks (overrides only by flag); b1 and b2 baked from each warped stand
  const bp = lm?.breathPair, holds = ov.holds ? ov.holds.split(",").map(Number) : bp ? [bp.holdsMs.b0, bp.holdsMs.b1, bp.holdsMs.b2, bp.holdsMs.b1back] : null, offsetMs = ov.phaseMs ?? bp?.offsetMs, totalMs = (ov.seconds ?? SECONDS) * 1000;
  if (!holds || offsetMs == null) row(size, "pair", "breathPair", "not in the landmarks: no APNG", "", "n/a");
  else if (!yb) row(size, "pair", "b-steps", "no belly line: no APNG", "", "n/a");
  else {
    row(size, "pair", "holds b0/b1/b2/b1back ms, offset ms, seconds", `${holds.join("/")}, ${offsetMs}, ${totalMs / 1000}`, "", "info");
    const set3 = (img) => [img, bakeStep(img, 1, yb), bakeStep(img, 2, yb)], copy = { down: warped.down && set3(warped.down), middle: set3(stand), up: warped.up && set3(warped.up) };
    for (const [l, r] of [["down", "middle"], ["middle", "up"], ["down", "up"]]) if (copy[l] && copy[r]) {
      const v = vivariumPair(copy[l], copy[r], { holds, offsetMs, totalMs, bg }); files.set(`${set.name}/vivarium-pair-${size}-${l}-${r}.apng`, v.bytes);
      if (v.delays.some((d) => d % 80)) row(size, "pair", `${l}|${r} frame delays`, "not all multiples of 80 ms", "", "note");
    }
  }
  files.set(`${set.name}/contact-${size}.png`, png(contactSheet([matrix], bg)));
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
