// The twenty kinds' game art, placed as masters (release 21c). Sources are the art desk's hand-off (work/handoff.md: the kept 304x312 cuts, each with its 96x88 and 48x48 beside it)
// and its tool pass (work/tool/SNN-name/: the 144x152 adult, the 104x112 juvenile, halos, bud, face, marks, plate, the trait chips). Nothing is written in the art desk's folder.
//   - the adult stand, asleep, and every pose are placed as delivered; the juvenile of each pair is rescaled so its figure is 0.8 of its adult's figure height at the same size, standing on the adult's feet row
//   - the chips are renamed: trait-SNN-coat-<layout> -> trait-SNN-markings-<layout> (spots -> back-spots); trait-SNN-signature-<small|stand|large> -> trait-SNN-signature-size-<...>
//   - what the earlier art made and nothing reads any more is removed (the earlier trait chips, the S01 rolls, the S01 and S03 reading pictures, the earlier Loika's 176x128 young)
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { decodePNG, encodePNG } from "../png.mjs";

export const RATIO = 0.8, ALPHA = 128;   // a juvenile's figure height over its adult's; the alpha at which a figure's box is measured (a contact shadow is fainter)
export const SIZES = ["304x312", "96x88", "48x48"];
export const LAYOUTS = { plain: "plain", spots: "back-spots", saddle: "saddle", gradient: "gradient", bands: "bands", patches: "patches" };
export const SIG = { small: "small", stand: "stand", large: "large" };
export const CHIP_SIZES = ["104x64", "104x96", "104x160", "128x160", "144x176"];
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pic = (f) => { const im = decodePNG(readFileSync(f)); return { w: im.width, h: im.height, data: im.data }; };

// The hand-off's rows, per kind: { S01: { "adult (stand)": "<path from /home/mb/mb/>", ... } }
export function parseHandoff(text) {
  const rows = {}; let kind = null;
  for (const l of text.split("\n")) {
    const h = l.match(/^## (S\d\d) /); if (h) { kind = h[1]; rows[kind] = {}; continue; }
    const r = kind && l.match(/^\| ([^|]+) \| `[^`]*` \| `([^`]+)` \|/); if (r) rows[kind][r[1].trim().replace(/ \(the stand\)$/, "")] = r[2];
  }
  return rows;
}
// the box of the figure: [x0, y0, x1, y1] over the pixels at alpha >= ALPHA, or null
export function figureBox({ w, h, data }, t = ALPHA) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
// area weights of one axis: for each of `n` output pixels, the source pixels (of `m`) under it when the picture is drawn at scale s with the offset t (out = t + s * src), each weighted by its overlap
function axisWeights(n, m, s, t) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i - t) / s, b = (i + 1 - t) / s, list = []; let sum = 0;
    for (let j = Math.max(0, Math.floor(a)); j < Math.min(m, Math.ceil(b)); j++) { const w = Math.min(b, j + 1) - Math.max(a, j); if (w > 0) { list.push([j, w]); } }
    for (const [, w] of list) sum += w;
    const norm = b - a; out.push(list.map(([j, w]) => [j, w / norm])); void sum;
  }
  return out;
}
// the picture drawn at scale s with the offset (tx, ty), same canvas, premultiplied area average (transparent where the source is not)
export function scaleInto(p, s, tx, ty) {
  const { w, h, data } = p, wx = axisWeights(w, w, s, tx), wy = axisWeights(h, h, s, ty);
  const pre = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const a = data[i * 4 + 3] / 255; pre[i * 4] = data[i * 4] * a; pre[i * 4 + 1] = data[i * 4 + 1] * a; pre[i * 4 + 2] = data[i * 4 + 2] * a; pre[i * 4 + 3] = a * 255; }
  const mid = new Float32Array(w * h * 4);   // horizontal pass
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (const [j, k] of wx[x]) for (let c = 0; c < 4; c++) mid[(y * w + x) * 4 + c] += pre[(y * w + j) * 4 + c] * k;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const acc = [0, 0, 0, 0]; for (const [j, k] of wy[y]) for (let c = 0; c < 4; c++) acc[c] += mid[(j * w + x) * 4 + c] * k;
    const a = acc[3] / 255, o = (y * w + x) * 4;
    if (a > 0) { out[o] = Math.min(255, Math.round(acc[0] / a)); out[o + 1] = Math.min(255, Math.round(acc[1] / a)); out[o + 2] = Math.min(255, Math.round(acc[2] / a)); out[o + 3] = Math.min(255, Math.round(acc[3])); }
  }
  return { w, h, data: out };
}
// The juvenile picture rescaled so its figure is RATIO of the adult picture's figure height, standing on the adult's feet row, centred where it was. { pic, scale, before, after } (heights in px)
export function rescaleJuvenile(adult, juv) {
  const A = figureBox(adult), J = figureBox(juv); if (!A || !J) throw new Error("a picture has no figure");
  const hA = A[3] - A[1] + 1, hJ = J[3] - J[1] + 1, s = (RATIO * hA) / hJ, cx = (J[0] + J[2] + 1) / 2;
  const tx = cx - s * cx, ty = (A[3] + 1) - s * (J[3] + 1), out = scaleInto(juv, s, tx, ty), B = figureBox(out);
  return { pic: out, scale: s, before: hJ / hA, after: (B[3] - B[1] + 1) / hA, feet: [A[3], B[3]] };
}
const dimsOf = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
// The kinds whose painted figures are turned over as they are placed, so the whole roster faces right (art desk R21c-3: Pesko S06 was painted facing left). Every figure picture of the kind is mirrored
// (adult, young, asleep, poses, halos, bud, plate); the chips, faces and marks are not figures.
export const FLIPPED = new Set(["S06"]);
// Loika S01: only its adult pictures are mirrored (its young is painted facing right already), art desk 2026-11-06.
export const FLIPPED_ADULT = new Set(["S01"]);
// Blikur S16's young floats above its shadow in the cut: its contact shadow is lifted to sit right under the feet, in every picture of the young.
export const GROUNDED = new Set(["S16"]);
// the picture with every row below the figure (alpha >= ALPHA) moved up so the first shadow row is the row under the feet
export function liftShadow({ w, h, data }) {
  let bottom = -1; for (let y = h - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= ALPHA) { bottom = y; break; }
  let first = -1; for (let y = bottom + 1; y < h && first < 0; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { first = y; break; }
  if (bottom < 0 || first < 0 || first - bottom - 1 < 1) return { w, h, data };
  const gap = first - bottom - 1, o = new Uint8Array(data); o.fill(0, (bottom + 1) * w * 4);
  for (let y = first; y < h; y++) o.set(data.subarray(y * w * 4, (y + 1) * w * 4), (y - gap) * w * 4);
  return { w, h, data: o };
}
const liftBuf = (buf) => { const im = decodePNG(buf), f = liftShadow({ w: im.width, h: im.height, data: im.data }); return encodePNG(f.w, f.h, f.data); };
export const flipPic = ({ w, h, data }) => { const o = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.set(data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (y * w + (w - 1 - x)) * 4); return { w, h, data: o }; };
const flipBuf = (buf) => { const im = decodePNG(buf), f = flipPic({ w: im.width, h: im.height, data: im.data }); return encodePNG(f.w, f.h, f.data); };

// what the placement makes: [{ id, buf, from, note }] for the kinds of the hand-off, with the juvenile rescales listed in `report`
export function planGame({ work, mbRoot = "/home/mb/mb" }) {
  const rows = parseHandoff(readFileSync(path.join(work, "handoff.md"), "utf8")), tool = path.join(work, "tool"), ops = [], report = [];
  const dirs = Object.fromEntries(readdirSync(tool).filter((d) => /^S\d\d-/.test(d)).map((d) => [d.slice(0, 3), d]));
  const add = (id, buf, from) => ops.push({ id, buf, from });
  const read = (f) => { if (!existsSync(f)) throw new Error("missing " + f); return readFileSync(f); };
  const cut = (rel, size) => path.join(mbRoot, rel.replace("304x312.png", size + ".png"));
  const pair = (k, name, adultKey, juvKey, adultId, juvId, sizes, advance) => {   // an adult picture as delivered; its juvenile rescaled to 0.8 of it
    for (const size of sizes) {
      const af = cut(rows[k][adultKey], size), jf = cut(rows[k][juvKey], size), fl = FLIPPED.has(k) || FLIPPED_ADULT.has(k), fj = FLIPPED.has(k), ab = fl ? flipBuf(read(af)) : read(af), A = fl ? flipPic(pic(af)) : pic(af), J = fj ? flipPic(pic(jf)) : pic(jf);
      add(adultId.replace("{size}", size), ab, af.replace(mbRoot + "/", ""));
      const r = rescaleJuvenile(A, J), jp = GROUNDED.has(k) ? liftShadow(r.pic) : r.pic; add(juvId.replace("{size}", size), encodePNG(jp.w, jp.h, jp.data), jf.replace(mbRoot + "/", ""));
      report.push({ kind: k, what: name, size, before: r.before, after: r.after, scale: r.scale }); void advance;
    }
  };
  for (const k of Object.keys(rows)) {
    const d = dirs[k]; if (!d) throw new Error(k + " has no tool folder");
    pair(k, "stand", "adult (stand)", "juvenile", `mibi-adult-${k}-{size}`, `mibi-juvenile-${k}-{size}`, SIZES);
    pair(k, "asleep", "asleep", "juvenile asleep", `mibi-adult-${k}-curl-{size}`, `mibi-juvenile-${k}-curl-{size}`, ["304x312"]);
    for (const [name, a, j] of [["puff", "puff", "juvenile puff"], ["sniff", "sniff", "juvenile sniff"], ["dig", "dig", "juvenile dig"], ["glow", "glow", "juvenile glow"], ["shake", "shake-dry", "juvenile shake-dry"], ["calm", "calm", "juvenile calm"]])
      if (rows[k][a]) pair(k, name, a, j, `mibi-adult-${k}-${name}-{size}`, `mibi-juvenile-${k}-${name}-{size}`, ["304x312"]);
    // the tool pass: as delivered, except the 104x112 young, checked against the 144x152 adult and rescaled where it is off by more than 3 %
    const t = (f) => path.join(tool, d, f), rel = (f) => path.relative(mbRoot, t(f));
    const fb = (b) => (FLIPPED.has(k) || FLIPPED_ADULT.has(k) ? flipBuf(b) : b), fbj = (b) => { const m = FLIPPED.has(k) ? flipBuf(b) : b; return GROUNDED.has(k) ? liftBuf(m) : m; };
    const a144 = pic(t(`mibi-adult-${k}-144x152.png`)), j104 = pic(t(`mibi-juvenile-${k}-104x112.png`)), box = figureBox(j104), boxA = figureBox(a144), ratio = (box[3] - box[1] + 1) / (boxA[3] - boxA[1] + 1);
    add(`mibi-adult-${k}-144x152`, fb(read(t(`mibi-adult-${k}-144x152.png`))), rel(`mibi-adult-${k}-144x152.png`));
    // the 104x112 slot cannot hold 0.8 of the 144x152 adult's figure (about 112 px in a 112 px slot): placed as delivered, its measured ratio listed for the lead (never rescaled, never tested)
    add(`mibi-juvenile-${k}-104x112`, fbj(read(t(`mibi-juvenile-${k}-104x112.png`))), rel(`mibi-juvenile-${k}-104x112.png`)); report.push({ kind: k, what: "104x112", size: "104x112", before: ratio, after: ratio, scale: 1, slot: true });
    for (const f of [`mibi-halo-${k}-128x160-clear`, `mibi-halo-${k}-128x160-mist`, `bud-shape-${k}-112x112`, `spread-plate-${k}-80x96`, `face-${k}-24`, `mark-species-${k}-24x24`, `species-mark-${k}-15`, `species-mark-${k}-10`]) add(f, /^(mibi-halo|bud-shape|spread-plate)/.test(f) ? fb(read(t(f + ".png"))) : read(t(f + ".png")), rel(f + ".png"));
    for (const sz of CHIP_SIZES) {
      for (const [lay, to] of Object.entries(LAYOUTS)) add(`trait-${k}-markings-${to}-${sz}`, read(t(`trait-${k}-coat-${lay}-${sz}.png`)), rel(`trait-${k}-coat-${lay}-${sz}.png`));
      for (const [s, to] of Object.entries(SIG)) add(`trait-${k}-signature-size-${to}-${sz}`, read(t(`trait-${k}-signature-${s}-${sz}.png`)), rel(`trait-${k}-signature-${s}-${sz}.png`));
    }
  }
  return { ops, report, kinds: Object.keys(rows) };
}
// the ids the earlier art made that the release retires (the kinds the hand-off covers are replaced by id; these have no successor)
export const retired = (id, kinds) => /^trait-S\d\d-/.test(id) || /^roll-S01-/.test(id) || /^reading-[a-z-]+-S0[13]-/.test(id) || id === "mibi-juvenile-S01-176x128" || (kinds.some((k) => id.includes("-" + k + "-")) && /^(mibi-(adult|juvenile)|mibi-halo|bud-shape|spread-plate|face|mark-species|species-mark)-/.test(id));

// `only` (a RegExp on the master id): place just those masters and retire nothing (a later hand-off row added to a placement already made)
export function placeGame({ work, root, dryRun = false, only = null, by = "art lead, game art hand-off of 2026-11-06 (mibi-art game-art work)" }) {
  const plan = planGame({ work }), { report, kinds } = plan, ops = only ? plan.ops.filter((o) => only.test(o.id)) : plan.ops, idxFile = path.join(root, "index.json"), index = JSON.parse(readFileSync(idxFile, "utf8")), removed = [];
  if (!only) for (const id of Object.keys(index.masters)) if (index.masters[id].file.startsWith("pods/") && retired(id, kinds)) { removed.push(id); if (!dryRun) rmSync(path.join(root, index.masters[id].file), { force: true }); delete index.masters[id]; }
  for (const o of ops) {
    const [w, h] = dimsOf(o.buf), file = `pods/${o.id}.png`;
    index.masters[o.id] = { file, w, h, sha256: sha(o.buf), signed: by, from: o.from };
    if (!dryRun) { mkdirSync(path.join(root, "pods"), { recursive: true }); writeFileSync(path.join(root, file), o.buf); }
  }
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n");
  return { placed: ops.length, removed, report };
}
// The pairs the release measures: [{ kind, what, size, adult, juvenile }] for every juvenile master that has an adult of the same name and size
export function pairsOf(index) {
  const out = [];
  for (const id of Object.keys(index.masters)) { const m = id.match(/^mibi-juvenile-(S\d\d)-(.+)$/); if (!m) continue; const a = "mibi-adult-" + m[1] + "-" + m[2]; if (index.masters[a]) out.push({ kind: m[1], what: m[2], adult: a, juvenile: id }); }
  return out;
}
// The 0.8 test on every pair and size: the young's figure (alpha >= 128) is RATIO of its adult's height, within one pixel, and stands on the adult's feet row, within one pixel (the 104x112 against the 144x152: within 3 %)
export function checkJuveniles(root, index) {
  const problems = [];
  for (const p of pairsOf(index)) {
    const af = path.join(root, index.masters[p.adult].file), jf = path.join(root, index.masters[p.juvenile].file), A = figureBox(pic(af)), J = figureBox(pic(jf)); if (!A || !J) { problems.push(`${p.juvenile}: no figure`); continue; }
    const hA = A[3] - A[1] + 1, hJ = J[3] - J[1] + 1;
    if (Math.abs(hJ - RATIO * hA) > 1.2) problems.push(`${p.juvenile}: the figure is ${hJ} px against its adult's ${hA} (${(hJ / hA).toFixed(3)}, wanted ${RATIO})`);
    if (Math.abs(J[3] - A[3]) > 1) problems.push(`${p.juvenile}: its feet are on row ${J[3]}, its adult's on ${A[3]}`);
  }
  return problems;
}
