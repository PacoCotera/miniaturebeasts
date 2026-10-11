#!/usr/bin/env node
// Tier 2 test harness (boards/mibi-motion/tier2-method.md §3, §4, Q-A3): renders the matrix {painted down, warped down, stand, warped up, painted up} per size from
// masters and field maps given as paths, measures M1–M8, and writes 1× PNGs, a contact sheet, a CSV of every measure and the Vivarium pair as an APNG.
// The warp only moves existing pixels (backward mapping, nearest sample, no blending); a pixel the field points outside the picture becomes transparent.
// Nothing is placed in the Station and nothing is drawn: it reads files and writes to --out.
//
//   node prototypes/ui/tools/tier2-test.mjs --out dir
//     --set s04-304 --stand stand.png [--painted-down d.png] [--painted-up u.png] (--field-down f.png --field-up g.png | --landmarks lm.json [--picture name] [--amplitude k])
//           [--head-mask m.png] [--shadow-rows y0-y1] [--belly-y N] [--b1 b1.png] [--b2 b2.png] [--band y0-y1] [--pair label=a.png,b.png ...]
//     --set s04-104 ...                       (one --set per size; the options after a --set belong to it)
//     [--holds 700,350,700] [--phase-ms 1050] [--seconds 10] [--bg D6CEBE]
// Measures (the definitions are in prototypes/ui/README.md): M1 determinism, M2 palette, M3 silhouette, M4 outline, M5 fit to the painted end, M6 readable at walker size,
// M7 warp time, M8 motion (changed pixels outside the moving band, with and without the warp).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePNG, decodePNG } from "../png.mjs";
import { buildField, decodeField, headMaskFrom, checkField } from "./warp-field.mjs";

export const OPAQUE = 110;                                 // alpha > 110 is opaque (the animator's measure for the topline)
export const M5_LIMITS = { "304x312": { iou: 0.95, profile: 2 }, "104x112": { iou: 0.93, profile: 1 } };
export const M6_MIN = 2, M7_MAX_MS = 5, M4_SLACK = 0.05;
// Open rulings (the programme lead's placeholders), each behind one name so a ruling changes one place.
export const DEFAULT_HOLDS_MS = [700, 350, 700];           // b0, b1, b2 holds: PLACEHOLDER until the animator gives the set's holds
export function breathSegments(holds, phaseMs, totalMs) {  // the breathing cycle b0 → b1 → b2 → b1 (PLACEHOLDER order), shifted by phaseMs; [{ t0, t1, frame }] over 0..totalMs
  const seq = [[0, holds[0]], [1, holds[1]], [2, holds[2]], [1, holds[1]]], cycle = seq.reduce((a, s) => a + s[1], 0), out = [];
  let t = 0;
  while (t < totalMs) {
    let pos = (t + phaseMs) % cycle, acc = 0;
    for (const [frame, d] of seq) { if (pos < acc + d) { const t1 = Math.min(totalMs, t + (acc + d - pos)); out.push({ t0: t, t1, frame }); t = t1; break; } acc += d; }
  }
  return out;
}

// ---- pictures: { w, h, data: Uint8ClampedArray RGBA }
export const loadImage = (file) => { const p = decodePNG(readFileSync(file)); return { w: p.width, h: p.height, data: new Uint8ClampedArray(p.data) }; };
export const blank = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
const opaqueMask = (img) => { const m = new Uint8Array(img.w * img.h); for (let i = 0; i < m.length; i++) m[i] = img.data[i * 4 + 3] > OPAQUE ? 1 : 0; return m; };

// The warp: layers [{ field, t }] add before the one sample (never a warp of a warp). out(x, y) = img(x − Σ t·dx, y − Σ t·dy), nearest, outside → transparent.
export function warp(img, layers) {
  const { w, h } = img, out = blank(w, h), src = img.data, dst = out.data;
  for (const l of layers) if (l.field.w !== w || l.field.h !== h) throw new Error(`field ${l.field.w}x${l.field.h} does not fit the picture ${w}x${h}`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let ox = 0, oy = 0;
    for (const l of layers) { ox += l.t * l.field.dx[i]; oy += l.t * l.field.dy[i]; }
    const sx = Math.floor(x - ox + 0.5), sy = Math.floor(y - oy + 0.5);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const j = (sy * w + sx) * 4; dst[i * 4] = src[j]; dst[i * 4 + 1] = src[j + 1]; dst[i * 4 + 2] = src[j + 2]; dst[i * 4 + 3] = src[j + 3];
  }
  return out;
}

// ---- measures
// M2: the colours of the output (alpha > 0) that are not colours of the input.
export function newColours(input, output) {
  const key = (d, i) => (d[i] << 24 | d[i + 1] << 16 | d[i + 2] << 8 | d[i + 3]) >>> 0, have = new Set(); let n = 0;
  for (let i = 0; i < input.data.length; i += 4) if (input.data[i + 3]) have.add(key(input.data, i));
  const seen = new Set(); for (let i = 0; i < output.data.length; i += 4) if (output.data[i + 3]) { const k = key(output.data, i); if (!have.has(k) && !seen.has(k)) { seen.add(k); n++; } }
  return n;
}
// M3: opaque 8-connected components, enclosed transparent holes (4-connected transparent regions that never reach the border), orphan pixels (opaque, no opaque 8-neighbour).
export function silhouette(img) {
  const { w, h } = img, m = opaqueMask(img), label = new Int32Array(w * h);
  const flood = (start, want, nb) => { const stack = [start]; label[start] = 1; let touches = false; while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true; for (const [dx, dy] of nb) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (m[j] === want && !label[j]) { label[j] = 1; stack.push(j); } } } return touches; };
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  let components = 0, holes = 0, orphans = 0;
  for (let i = 0; i < w * h; i++) if (m[i] && !label[i]) { components++; flood(i, 1, N8); }
  label.fill(0);
  for (let i = 0; i < w * h; i++) if (!m[i] && !label[i] && !flood(i, 0, N4)) holes++;
  for (let i = 0; i < w * h; i++) if (m[i]) { const x = i % w, y = (i / w) | 0; let any = false; for (const [dx, dy] of N8) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && m[ny * w + nx]) { any = true; break; } } if (!any) orphans++; }
  return { components, holes, orphans };
}
// M4: outline pixels = opaque with a 4-neighbour that is transparent or outside; irregular = outline pixels whose count of outline 4-neighbours is not 2 (8 would flag a clean square's edge pixels beside its corners) (stairs, spurs).
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
// M8: pixels that differ between two frames outside the rows of the moving band [y0, y1].
export function changedOutside(a, b, band) { let n = 0; for (let y = 0; y < a.h; y++) { if (y >= band[0] && y <= band[1]) continue; for (let x = 0; x < a.w; x++) { const i = (y * a.w + x) * 4; if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) n++; } } return n; }
export function warpMs(img, field, runs = 15) { const t = []; warp(img, [{ field, t: 1 }]); for (let r = 0; r < runs; r++) { const t0 = process.hrtime.bigint(); warp(img, [{ field, t: 1 }]); t.push(Number(process.hrtime.bigint() - t0) / 1e6); } t.sort((x, y) => x - y); return t[t.length >> 1]; }

// ---- output
const hex = (s) => [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
export const png = (img) => encodePNG(img.w, img.h, img.data);
function over(surface, img, ox, oy, bg) {                   // alpha-composite img onto an opaque surface (presentation only: the contact sheet and the APNG)
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4, a = img.data[i + 3] / 255, j = ((oy + y) * surface.w + ox + x) * 4; if (!a) continue;
    for (let c = 0; c < 3; c++) surface.data[j + c] = Math.round(surface.data[j + c] * (1 - a) + img.data[i + c] * a);
  }
}
const filled = (w, h, bg) => { const c = blank(w, h); for (let i = 0; i < w * h; i++) c.data.set([...bg, 255], i * 4); return c; };
export function contactSheet(rows, bg, gap = 8) {          // rows: arrays of pictures-or-null, left to right; each row's cells are as high as its tallest
  const cellW = Math.max(...rows.flat().filter(Boolean).map((i) => i.w)), rowH = rows.map((r) => Math.max(...r.filter(Boolean).map((i) => i.h), 0));
  const cols = Math.max(...rows.map((r) => r.length)), W = gap + cols * (cellW + gap), H = gap + rowH.reduce((a, h) => a + h + gap, 0), sheet = filled(W, H, bg);
  let y = gap; rows.forEach((r, ri) => { r.forEach((img, ci) => { if (img) over(sheet, img, gap + ci * (cellW + gap) + ((cellW - img.w) >> 1), y + rowH[ri] - img.h, bg); }); y += rowH[ri] + gap; });
  return sheet;
}
// APNG from full-surface frames [{ img, ms }]: the first frame is the default image, the rest are fdAT; loops forever.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, "ascii"), data]); let c = 0xffffffff; for (const b of body) c = CRC[(c ^ b) & 255] ^ (c >>> 8); const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0); return Buffer.concat([len, body, crc]); };
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
// The pair: two copies of the picture sets (the down and the up end), breathing out of phase, on the background, at 1×. Returns APNG bytes.
export function vivariumPair(copyA, copyB, { holds, phaseMs, totalMs, bg }) {
  const w = copyA[0].w, h = copyA[0].h, gap = 16, W = 2 * w + 3 * gap, H = h + 2 * gap;
  const sa = breathSegments(holds, 0, totalMs), sb = breathSegments(holds, phaseMs, totalMs);
  const cuts = [...new Set([...sa, ...sb].flatMap((s) => [s.t0, s.t1]))].sort((a, b) => a - b), frames = [];
  const at = (segs, t) => segs.find((s) => t >= s.t0 && t < s.t1).frame;
  for (let k = 0; k + 1 < cuts.length; k++) {
    const t = cuts[k], fa = at(sa, t), fb = at(sb, t), prev = frames[frames.length - 1];
    if (prev && prev.fa === fa && prev.fb === fb) { prev.ms += cuts[k + 1] - t; continue; }
    const c = filled(W, H, bg); over(c, copyA[fa], gap, gap, bg); over(c, copyB[fb], 2 * gap + w, gap, bg); frames.push({ img: c, ms: cuts[k + 1] - t, fa, fb });
  }
  return encodeAPNG(frames);
}

// ---- one set (one size)
const ENDS = ["down", "up"], fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : String(v));
export function runSet(set, opts = {}) {
  const rows = [], row = (size, measure, item, value, limit = "", result = "") => rows.push({ set: set.name, size, measure, item, value: fmt(value), limit: fmt(limit), result });
  const stand = loadImage(set.stand), size = `${stand.w}x${stand.h}`, files = new Map(), bg = opts.bg ?? hex("D6CEBE");
  const mask = set["head-mask"] ? headMaskFrom(readFileSync(set["head-mask"])) : null, zeroRows = set["shadow-rows"] ? [set["shadow-rows"].split("-").map(Number)] : [];
  const fields = {};
  for (const e of ENDS) {
    if (set[`field-${e}`]) fields[e] = decodeField(readFileSync(set[`field-${e}`]), e);
    else if (set.landmarks) fields[e] = buildField(JSON.parse(readFileSync(set.landmarks, "utf8")), e, stand.w, stand.h, { picture: set.picture ?? null, headMask: mask, shadowRows: zeroRows, bellyY: set["belly-y"] != null ? +set["belly-y"] : null, amplitude: set.amplitude != null ? +set.amplitude : 1 });
    else throw new Error(`set ${set.name}: give --field-${e} or --landmarks`);
    checkField(fields[e], { headMask: mask });             // the loader's refusals, for maps read from files too
  }
  const painted = Object.fromEntries(ENDS.map((e) => [e, set[`painted-${e}`] ? loadImage(set[`painted-${e}`]) : null]));
  const warped = Object.fromEntries(ENDS.map((e) => [e, warp(stand, [{ field: fields[e], t: 1 }])]));
  const matrix = [painted.down, warped.down, stand, warped.up, painted.up], names = ["painted-down", "warped-down", "stand", "warped-up", "painted-up"];
  matrix.forEach((img, i) => { if (img) files.set(`${set.name}/${size}-${names[i]}.png`, png(img)); });
  for (const e of ENDS) files.set(`${set.name}/${size}-field-${e}.png`, encodeFieldBytes(fields[e]));

  // M2, M3, M4 on the warped ends against the stand
  const sil0 = silhouette(stand), out0 = outlineIrregular(stand);
  row(size, "M3", "stand", `${sil0.components} comp, ${sil0.holes} holes, ${sil0.orphans} orphans`, "info");
  row(size, "M4", "stand irregular", out0.irregular, "", "info");
  for (const e of ENDS) {
    const nc = newColours(stand, warped[e]); row(size, "M2", `warped-${e}`, nc, 0, nc === 0 ? "pass" : "FAIL");
    const s = silhouette(warped[e]); row(size, "M3", `warped-${e}`, `${s.components} comp, ${s.holes} holes, ${s.orphans} orphans`, "1 comp, 0 holes, 0 orphans", s.components === 1 && s.holes === 0 && s.orphans === 0 ? "pass" : "FAIL");
    row(size, "M3", `warped-${e} not worse than the stand`, `${s.components - sil0.components} comp, ${s.holes - sil0.holes} holes, ${s.orphans - sil0.orphans} orphans`, "<= 0 each", s.components <= sil0.components && s.holes <= sil0.holes && s.orphans <= sil0.orphans ? "pass" : "FAIL");
    const o = outlineIrregular(warped[e]), lim = Math.floor(out0.irregular * (1 + M4_SLACK)); row(size, "M4", `warped-${e} irregular`, o.irregular, lim, o.irregular <= lim ? "pass" : "FAIL");
    if (painted[e]) { const q = silhouette(painted[e]), po = outlineIrregular(painted[e]); row(size, "M3", `painted-${e}`, `${q.components} comp, ${q.holes} holes, ${q.orphans} orphans`, "info"); row(size, "M4", `painted-${e} irregular`, po.irregular, "", "info"); }
    // M5
    const L = M5_LIMITS[size];
    if (painted[e]) {
      const j = iou(warped[e], painted[e]), pd = profileDelta(warped[e], painted[e]);
      row(size, "M5", `iou warped-${e} vs painted`, j, L ? L.iou : "", L ? (j >= L.iou ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile mean abs d warped-${e} vs painted`, pd.mean, L ? L.profile : "", L ? (pd.mean <= L.profile ? "pass" : "FAIL") : "n/a at this size");
      row(size, "M5", `profile columns warped-${e} vs painted`, `${pd.columns} matched, ${pd.unmatched} unmatched`, "", "info");
    } else row(size, "M5", `warped-${e} vs painted`, "no painted end given", "", "n/a");
  }
  // M6 at walker size: pairwise mean profile difference of the three bins
  if (size === "104x112") for (const [kind, ends] of [["warped", [warped.down, stand, warped.up]], ["painted", [painted.down, stand, painted.up]]]) {
    if (ends.some((x) => !x)) { row(size, "M6", kind, "no painted ends given", "", "n/a"); continue; }
    for (const [a, b, label] of [[0, 1, "down-stand"], [1, 2, "stand-up"], [0, 2, "down-up"]]) { const d = profileDelta(ends[a], ends[b]).mean; row(size, "M6", `${kind} ${label}`, d, M6_MIN, d >= M6_MIN ? "pass" : "FAIL"); }
  } else row(size, "M6", "only at 104x112", "", "", "n/a");
  // M7
  for (const e of ENDS) { const ms = warpMs(stand, fields[e]); row(size, "M7", `warp ms per picture (${e})`, ms, size === "104x112" ? M7_MAX_MS : "", size === "104x112" ? (ms <= M7_MAX_MS ? "pass (this machine; confirm on the CI runner)" : "FAIL (this machine; confirm on the CI runner)") : "info"); }
  // M8
  const band = set.band ? set.band.split("-").map(Number) : null, pairs = [].concat(set.pair ?? []);
  if (set.b1) pairs.unshift(`stand-b1=${set.stand},${set.b1}`);
  for (const spec of pairs) {
    const [label, files2] = [spec.slice(0, spec.indexOf("=")), spec.slice(spec.indexOf("=") + 1).split(",")];
    if (!band) { row(size, "M8", label, "no --band given", "", "n/a"); continue; }
    const a = loadImage(files2[0]), b = loadImage(files2[1]), plain = changedOutside(a, b, band);
    for (const e of ENDS) { const w2 = changedOutside(warp(a, [{ field: fields[e], t: 1 }]), warp(b, [{ field: fields[e], t: 1 }]), band); row(size, "M8", `${label} ${e}: outside rows ${band.join("-")}, no warp / warp`, `${plain} / ${w2}`, plain, w2 <= plain ? "pass" : "FAIL"); }
  }
  // the Vivarium pair: down and up copies, b0/b1/b2 warped by the same field (reused by id), out of phase
  const frames = (e) => [stand, set.b1 ? loadImage(set.b1) : stand, set.b2 ? loadImage(set.b2) : stand].map((img) => warp(img, [{ field: fields[e], t: 1 }]));
  const holds = opts.holds ?? DEFAULT_HOLDS_MS, cycle = holds[0] + 2 * holds[1] + holds[2], phase = opts.phaseMs ?? cycle / 2, totalMs = (opts.seconds ?? 10) * 1000;
  files.set(`${set.name}/vivarium-pair-${size}.apng`, vivariumPair(frames("down"), frames("up"), { holds, phaseMs: phase, totalMs, bg }));
  row(size, "pair", "holds b0/b1/b2 ms (PLACEHOLDER until ruled)", holds.join("/"), "", "info"); row(size, "pair", "phase offset ms (PLACEHOLDER until ruled)", phase, "", "info");
  if (!set.b1 || !set.b2) row(size, "pair", "b1/b2", "not given: the pair holds the stand", "", "note");
  files.set(`${set.name}/contact-${size}.png`, png(contactSheet([matrix], bg)));
  return { rows, files, sheetRow: matrix, size };
}
const encodeFieldBytes = (f) => { const rgba = new Uint8Array(f.w * f.h * 4); for (let i = 0; i < f.w * f.h; i++) rgba.set([f.dx[i] + 128, f.dy[i] + 128, 0, 255], i * 4); return encodePNG(f.w, f.h, rgba); };

export const csv = (rows) => ["set,size,measure,item,value,limit,result", ...rows.map((r) => [r.set, r.size, r.measure, r.item, r.value, r.limit, r.result].map((v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))].join("\n") + "\n";

// Runs every set twice (M1: the same inputs give the same bytes), returns { rows, files }. Timing rows (M7) are values of the clock and are not part of the bytes compared.
export function runAll(sets, opts = {}) {
  const a = sets.map((s) => runSet(s, opts)), b = sets.map((s) => runSet(s, opts)), rows = [], files = new Map();
  const digest = (r) => createHash("sha256").update([...r.files].sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => k + createHash("sha256").update(v).digest("hex")).join("\n")).digest("hex");
  const sheet = contactSheet(a.map((r) => r.sheetRow), opts.bg ?? hex("D6CEBE"));
  sets.forEach((s, i) => { const same = digest(a[i]) === digest(b[i]); rows.push(...a[i].rows, { set: s.name, size: a[i].size, measure: "M1", item: "two runs, same bytes (PNGs, maps, APNG)", value: digest(a[i]).slice(0, 12), limit: "equal", result: same ? "pass" : "FAIL" }); for (const [k, v] of a[i].files) files.set(k, v); });
  files.set("contact-sheet.png", png(sheet)); files.set("measures.csv", Buffer.from(csv(rows)));
  return { rows, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), g = {}, sets = []; let cur = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; if (!a.startsWith("--")) { console.error(`unexpected "${a}"`); process.exit(2); }
    const k = a.slice(2), v = argv[++i];
    if (k === "set") { cur = { name: v }; sets.push(cur); }
    else if (["out", "holds", "phase-ms", "seconds", "bg"].includes(k)) g[k] = v;
    else if (!cur) { console.error(`--${k} comes after a --set`); process.exit(2); }
    else if (k === "pair") (cur.pair ??= []).push(v); else cur[k] = v;
  }
  if (!g.out || !sets.length || sets.some((s) => !s.stand)) { console.error("usage: tier2-test.mjs --out dir --set name --stand stand.png (--field-down f --field-up g | --landmarks lm.json) [options]; see the header of this file"); process.exit(2); }
  try {
    const { rows, files } = runAll(sets, { holds: g.holds ? g.holds.split(",").map(Number) : undefined, phaseMs: g["phase-ms"] ? +g["phase-ms"] : undefined, seconds: g.seconds ? +g.seconds : undefined, bg: g.bg ? hex(g.bg) : undefined });
    for (const [k, v] of files) { const f = path.join(g.out, k); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, v); }
    for (const r of rows) console.log(`${r.set} ${r.size} ${r.measure} ${r.item}: ${r.value}${r.limit !== "" ? ` (limit ${r.limit})` : ""} ${r.result}`);
    console.log(`wrote ${files.size} files to ${g.out}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
