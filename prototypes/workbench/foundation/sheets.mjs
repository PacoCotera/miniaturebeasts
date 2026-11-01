// The pictures of chunk 1: a tile is one individual at 304, 96 and 48 with its rule table; the sheets lay tiles beside the masters.
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { express } from "./express.mjs";
import { renderCreature, coarse, SIZES } from "./render.mjs";
import { faceInk, gazeOf, faceContrast } from "./checks.mjs";
import { checkRules, failures, tAt, bandOf, loadHouse } from "../form/house/house.mjs";
import { measureAll } from "../form/house/measures.mjs";
import { loadImage, saveImage, onBg, zoom, blank, paste, drawText, textWidth, crop } from "./imgtools.mjs";
import { seedUnit } from "./pose.mjs";
import { wrapLine, wrapLines, checkLabels, GLYPH_H } from "./labels.mjs";
import { MASTER } from "./paths.mjs";

const alphaHeight = (img) => { let t = Infinity, b = -Infinity; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { t = Math.min(t, y); b = Math.max(b, y); } return b - t; };
export const masterOf = (id) => ({ 304: loadImage(MASTER(id, 304)), 96: loadImage(MASTER(id, 96)), 48: loadImage(MASTER(id, 48)) });

// one individual: express, render at the three sizes from one framing, measure the render, read the rules
export function makeTile(house, specimen, { t = {}, label = "", seed = undefined, sizes = [304, 96, 48], shareClamp = true, clamps = true } = {}) {
  const ref = { height: alphaHeight(loadImage(MASTER(specimen.id, 304))) };
  const ex = express(house, { ...specimen, seed: seed ?? specimen.seed }, { t, side: specimen.side, shareClamp, clamps });
  const camera = { yaw: ex.pose.cameraYaw, pitch: house.solver.camera["pitch-deg"] }, extents = coarse(ex.scene, camera, { n: 240 });
  const r = {}; for (const s of sizes) r[s] = renderCreature(ex.scene, camera, s, { ref, look: specimen.look, extents });
  const rig = { ...ex.rig, px: {} };
  for (const s of [96, 48]) if (r[s]) { const f = faceInk(r[s]); rig.px[s] = f; }
  if (r[304]) { const g = gazeOf(r[304], ex.scene); rig.gazeOffset = g.offsetE; rig.catchDisagreePx = g.catchDisagreePx; rig.gazeAngle = g.screenAngleBetween; rig.faceContrast = faceContrast(r[304], ex.scene); }
  rig.eyeSizeDiff = 0; // the eyes are mirrored in the face frame: one E for both (plan 2.5, never 9)
  rig.shadeRatio = house.light.shade.ratio; // the shade-to-lit ratio of the reference sphere, by construction (the renderer interpolates albedo x ratio to albedo)
  rig.sickCues = (rig.lid > 0.2 ? 1 : 0) + (rig.upturn < 0.05 ? 1 : 0);
  const measured = measureAll(rig), rules = checkRules(house, specimen.plan, measured, { kinds: specimen.kinds });
  return { specimen, ex, camera, r, rig, measured, rules, fails: failures(rules), label, ms: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v.meta.ms)])) };
}

const INK_TXT = [20, 18, 24], DIM = [96, 90, 104], BAD = [170, 40, 40];
// the three sizes of a tile, stacked: 304 at 1x, 96 at 2x and 48 at 2x side by side
export function tileImage(r) {
  const a = onBg(r[304]), b = zoom(onBg(r[96]), 2), c = zoom(onBg(r[48]), 2), W = Math.max(a.width, b.width + c.width + 8), out = blank(W, a.height + 8 + Math.max(b.height, c.height));
  paste(out, a, 0, 0); paste(out, b, 0, a.height + 8); paste(out, c, b.width + 8, a.height + 8);
  return out;
}
export function masterImage(id) {
  const m = masterOf(id), a = onBg(m[304]), b = zoom(onBg(m[96]), 2), c = zoom(onBg(m[48]), 2), W = Math.max(a.width, b.width + c.width + 8), out = blank(W, a.height + 8 + Math.max(b.height, c.height));
  paste(out, a, 0, 0); paste(out, b, 0, a.height + 8); paste(out, c, b.width + 8, a.height + 8);
  return out;
}
const f2 = (v, d = 2) => Number(v).toFixed(d);
// the rules in plain words, for a label
const WORDS = { "R1-face": "EYE SHARE", "R1-head": "HEAD SIZE", "R1-head-breadth": "HEAD BREADTH", "R3-size": "EYE SIZE", "R3-height": "EYE HEIGHT", "R3-spacing": "EYE SPACING", "R4-stack": "FACE STACK", "R4-nose-drop": "NOSE DROP", "R4-nose-width": "NOSE WIDTH", "R4-mouth-gap": "MOUTH GAP", "R4-forehead": "FOREHEAD", "R-far-eye": "FAR EYE", "R-nose-far-eye": "NOSE AT EYE", "R-chin": "CHIN", "R-nape": "NAPE", "R-push": "PUSH", "R-mouth": "MOUTH", "R15-iris-48": "IRIS AT 48", "R15-iris-96": "IRIS AT 96", "R15-pupil-48": "PUPIL AT 48", "R15-nose-96": "NOSE AT 96", "R15-mouth-96": "MOUTH AT 96", "R13-face-contrast": "FACE VALUE", "R18-cues": "SICK CUES", "R6-face-yaw": "FACE YAW", "R6-body-yaw": "BODY YAW", "R6-head-yaw": "HEAD YAW", "R6-roll": "ROLL" };
const wordOf = (id) => WORDS[id] ?? id.replace(/^R/, "");
// a tile's label: the name, the verdict in plain words, and the numbers only if they fit the column (px wide)
export function tileLines(t, colW = 304, k = 2) {
  const m = t.measured, outside = t.fails.some((x) => x.id === "R1-face" && x.value > x.range[1]), others = t.fails.filter((x) => !(outside && x.id === "R1-face"));
  const lines = [[t.label, INK_TXT]];
  if (outside) lines.push(["OUTSIDE THE HOUSE", BAD]);
  if (others.length) { let v = `BREAKS ${others.map((x) => wordOf(x.id)).join(", ")}`; if (wrapLine(v, colW, k).length > 2) v = `BREAKS ${others.length} RULES`; lines.push([v, BAD]); }
  if (!t.fails.length) lines.push(["PASSES THE HOUSE", DIM]);
  const nums = `H/S ${f2(m["H/S"] ?? 0)} E/W ${f2(m["E/Wf"] ?? 0)} SHARE ${f2(m["eye-share"] ?? 0, 3)}`;
  if (textWidth(nums, k) <= colW && m["H/S"] !== undefined) lines.push([nums, DIM]);
  return lines;
}
// the sheet: a title, then cells of a picture under its label. Every label is wrapped to the column, drawn at scale 2 (the title at 3) on whole pixels after
// the pictures are zoomed, and read back by checkLabels (a label that crosses its column, overlaps another or leaves the sheet is an error).
export function sheet(title, cells, cols, { cellW = null, gap = 10, note = "", k = 2, maxLines = 4 } = {}) {
  const imgs = cells.map((c) => c.img), cw = cellW ?? Math.max(...imgs.map((i) => i.width)), ch = Math.max(...imgs.map((i) => i.height)), lh = GLYPH_H * k + 4, rows = Math.ceil(cells.length / cols), W = cols * (cw + gap) + gap;
  for (const i of imgs) if (i.width > cw) throw new Error(`a picture ${i.width} px wide does not fit its column ${cw}`);
  const wrapped = cells.map((c) => wrapLines(c.lines, cw, k, maxLines)), nl = Math.max(1, ...wrapped.map((w) => w.length)), labelH = nl * lh + 6;
  const tl = wrapLine(title, W - 2 * gap, 3), tH = tl.length * 20, noteL = note ? wrapLine(note, W - 2 * gap, k) : [], head = 8 + tH + 8, nH = noteL.length ? noteL.length * lh + 4 : 0;
  const vg = gap + 10, H = head + rows * (ch + labelH + vg) + gap + nH, out = blank(W, H), boxes = [];
  const text = (x, y, txt, col, kk, x0, x1) => { const w = textWidth(txt, kk) - kk; drawText(out, x, y, txt, col, kk); boxes.push({ x, y, w, h: GLYPH_H * kk, x0, x1, what: txt }); };
  tl.forEach((l, i) => text(gap, 8 + i * 20, l, INK_TXT, 3, 0, W));
  noteL.forEach((l, i) => text(gap, head + rows * (ch + labelH + vg) + 2 + i * lh, l, DIM, k, 0, W));
  cells.forEach((c, i) => {
    const x = gap + (i % cols) * (cw + gap), y = head + Math.floor(i / cols) * (ch + labelH + vg);
    for (let q = 0; q < cw; q++) { const o = ((y - 6) * W + x + q) * 4; for (let c = 0; c < 3; c++) out.data[o + c] = 206; } // a rule over each label: the label belongs to the picture under it
    wrapped[i].forEach(([txt, col], j) => text(x, y + j * lh, txt, col, k, x, x + cw));
    paste(out, c.img, x, y + labelH);
  });
  checkLabels(boxes, W, H); out.labels = boxes; out.layout = { cols, cw, gap, labelH, head, ch, rows, vg };
  return out;
}
export const saveTile = (dir, name, t) => { mkdirSync(dir, { recursive: true }); for (const s of Object.keys(t.r)) saveImage(path.join(dir, `${name}-${SIZES[s].join("x")}.png`), t.r[s]); };

// ---- the pictures -----------------------------------------------------------------------------------------------------------------------
export const HEAD_SIZES = [0.45, 0.52, 0.60], EYE_T = [0.3, 0.9];
const masterCell = (id, name, l2 = "SIGNED ART") => ({ img: masterImage(id), lines: [[`MASTER ${name}`, INK_TXT], [l2, DIM]] });
export function headSizeSheet(house, spec, outDir) {
  const cells = [], tiles = [], hb = bandOf(house, "A", "form.head");
  for (const et of EYE_T) {
    cells.push(masterCell("S01", "LOIKA", `ROW: EYE SIZE T ${et}`));
    for (const hs of HEAD_SIZES) {
      const t = makeTile(house, spec, { t: { "form.head": tAt(hb, hs), "form.eye-size": et }, label: `H/S ${hs.toFixed(2)}, EYE T ${et}` });
      tiles.push({ hs, et, tile: t }); cells.push({ img: tileImage(t.r), lines: tileLines(t) });
      saveTile(path.join(outDir, "tiles"), `loika-hs${Math.round(hs * 100)}-eye${Math.round(et * 10)}`, t);
    }
  }
  return { img: sheet("HEAD SIZE CHOICE: LOIKA BESIDE THE MASTER AT 304, 96 AND 48", cells, 4), tiles };
}
export function snailSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "USVEL THE SNAIL, HOUSE BUILD" });
  saveTile(path.join(outDir, "tiles"), "snail", t);
  return { img: sheet("THE SNAIL BESIDE ITS MASTER AT 304, 96 AND 48", [masterCell("S14", "USVEL"), { img: tileImage(t.r), lines: tileLines(t) }], 2), tile: t };
}
const TS = [0, 0.5, 1];
export function gridSheet(house, spec, outDir, kind) {
  const [gx, gy, nx, ny] = kind === "eye-spacing" ? ["form.eye-size", "form.eye-spacing", "EYE", "SPACING"] : ["form.muzzle", "form.lid", "MUZZLE", "LID"];
  const cells = [], tiles = [];
  for (const ty of TS) for (const tx of TS) {
    const t = makeTile(house, spec, { t: { [gx]: tx, [gy]: ty }, label: `${nx} T ${tx}, ${ny} T ${ty}`, sizes: [304, 96] });
    tiles.push({ tx, ty, tile: t });
    const a = onBg(t.r[304]), b = zoom(onBg(t.r[96]), 2), img = blank(a.width, a.height + b.height + 6); paste(img, a, 0, 0); paste(img, b, 0, a.height + 6);
    cells.push({ img, lines: tileLines(t) });
    saveTile(path.join(outDir, "tiles"), `grid-${kind}-${tx}-${ty}`.replace(/\./g, "p"), t);
  }
  return { img: sheet(`FACE GENE EXTREMES: ${nx} ACROSS, ${ny} DOWN`, cells, 3), tiles };
}

// the nose against the signed master: the house build (the nose-fit clamp by kind: a skin mound is 0.7 to 1.1 E) and the same Loika with the clamp off
export function noseSheet(house, spec, outDir) {
  const raw = JSON.parse(JSON.stringify({ ...house, resolved: undefined })); raw.clamps.find((c) => c.id === "nose-fit").on = false;
  const open = loadHouse(raw), a = makeTile(house, spec, { label: "HOUSE BUILD, NOSE CLAMPED BY KIND" }), b = makeTile(open, spec, { label: "CLAMP OFF, NOSE T 1", t: { "form.nose": 1.0 } });
  saveTile(path.join(outDir, "tiles"), "nose-rule-on", a); saveTile(path.join(outDir, "tiles"), "nose-rule-off", b);
  const lines = (t) => [[t.label, INK_TXT], [`NOSE ${f2(t.measured["nose-w/E"])} E WIDE`, DIM], ...tileLines({ ...t, label: "" }).slice(1, 2)];
  return { img: sheet("THE NOSE: THE MASTER, THE HOUSE BUILD AND THE CLAMP OFF", [masterCell("S01", "LOIKA", "NOSE 0.97 E, READ BY EYE"), { img: tileImage(a.r), lines: lines(a) }, { img: tileImage(b.r), lines: lines(b) }], 3), tiles: [a, b] };
}

// the feet, master beside ours, at 304 (3x) and 96 (5x)
export function feetSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "LOIKA FEET", sizes: [304, 96] }), m = masterOf(spec.id), cells = [];
  const cr = (img, x, y, w, h, k) => zoom(onBg(crop(img, x, y, w, h)), k);
  cells.push({ img: cr(m[304], 40, 238, 250, 66, 3), lines: [["MASTER FEET AT 304, 3X", INK_TXT]] }, { img: cr(t.r[304], 40, 238, 250, 66, 3), lines: [["BUILD FEET AT 304, 3X", INK_TXT]] });
  cells.push({ img: cr(m[96], 12, 66, 80, 20, 5), lines: [["MASTER FEET AT 96, 5X", INK_TXT]] }, { img: cr(t.r[96], 12, 66, 80, 20, 5), lines: [["BUILD FEET AT 96, 5X", INK_TXT]] });
  return { img: sheet("THE FEET: THE MASTER BESIDE THE BUILD", cells, 2) };
}
// twelve snails from random t over the open genes (the plan D litter check): three columns, each label wrapped to its column
export function snailLitter(house, spec, outDir, n = 12) {
  const genes = ["form.head-width", "form.head-depth", "form.eye-size", "form.eye-height", "form.eye-spacing", "form.pupil", "form.lid", "form.eye-ring", "form.mouth-width", "form.mouth-upturn", "form.carriage", "form.body-length", "form.rise", "form.skirt", "form.antenna", "form.head"];
  const tiles = [], cells = [], cw = 260;
  for (let i = 0; i < n; i++) { const t = {}; for (const g of genes) t[g] = seedUnit(`litter${i}`, g); const tile = makeTile(house, spec, { t, label: `SNAIL ${i + 1}`, sizes: [96], seed: `S14-litter${i}` }); tiles.push(tile); cells.push({ img: zoom(onBg(tile.r[96]), 2), lines: tileLines(tile, cw) }); }
  return { img: sheet("SNAIL LITTER OF 12 AT 96", cells, 3, { cellW: cw }), tiles };
}
