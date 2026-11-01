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
import { MASTER } from "./paths.mjs";

const alphaHeight = (img) => { let t = Infinity, b = -Infinity; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { t = Math.min(t, y); b = Math.max(b, y); } return b - t; };
export const masterOf = (id) => ({ 304: loadImage(MASTER(id, 304)), 96: loadImage(MASTER(id, 96)), 48: loadImage(MASTER(id, 48)) });

// one individual: express, render at the three sizes from one framing, measure the render, read the rules
export function makeTile(house, specimen, { t = {}, label = "", seed = undefined, sizes = [304, 96, 48], shareClamp = true } = {}) {
  const ref = { height: alphaHeight(loadImage(MASTER(specimen.id, 304))) };
  const ex = express(house, { ...specimen, seed: seed ?? specimen.seed }, { t, side: specimen.side, shareClamp });
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
export function tileLines(t) {
  const m = t.measured, l1 = `${t.label}`, l2 = `H/S ${f2(m["H/S"] ?? 0)}  E/W ${f2(m["E/Wf"] ?? 0)}  EYE SHARE ${f2(m["eye-share"] ?? 0, 3)}`;
  const bad = t.fails.map((x) => x.id.replace(/^R/, "")).join(" "), outside = t.fails.some((x) => x.id === "R1-face" && x.value > x.range[1]), l3 = bad ? `FAIL ${t.fails.length}: ${bad.length > 40 ? bad.slice(0, 38) + ".." : bad}` : "RULES: ALL PASS";
  return [[outside ? l1 + "  OUTSIDE THE HOUSE" : l1, outside ? BAD : INK_TXT], [l2, DIM], [l3, bad ? BAD : DIM]];
}
export function sheet(title, cells, cols, { cellW = null, gap = 10, note = "" } = {}) {
  const imgs = cells.map((c) => c.img), cw = cellW ?? Math.max(...imgs.map((i) => i.width)), ch = Math.max(...imgs.map((i) => i.height)), lh = 14, labelH = lh * 3 + 6, rows = Math.ceil(cells.length / cols), head = 36;
  const out = blank(cols * (cw + gap) + gap, head + rows * (ch + labelH + gap) + gap + (note ? 18 : 0));
  drawText(out, gap, 8, title, INK_TXT, 3);
  if (note) drawText(out, gap, head + rows * (ch + labelH + gap) + 2, note, DIM, 2);
  cells.forEach((c, i) => {
    const x = gap + (i % cols) * (cw + gap), y = head + Math.floor(i / cols) * (ch + labelH + gap);
    c.lines.forEach(([txt, col], k) => drawText(out, x, y + k * lh, txt, col, 2));
    paste(out, c.img, x, y + labelH);
  });
  return out;
}
export const saveTile = (dir, name, t) => { mkdirSync(dir, { recursive: true }); for (const s of Object.keys(t.r)) saveImage(path.join(dir, `${name}-${SIZES[s].join("x")}.png`), t.r[s]); };

// ---- the three pictures ---------------------------------------------------------------------------------------------------------------------
export const HEAD_SIZES = [0.45, 0.52, 0.60], EYE_T = [0.3, 0.9];
export function headSizeSheet(house, spec, outDir) {
  const cells = [], tiles = [], hb = bandOf(house, "A", "form.head");
  for (const et of EYE_T) {
    cells.push({ img: masterImage("S01"), lines: [["MASTER S01 LOIKA", INK_TXT], [`ROW: EYE SIZE T ${et}`, DIM], ["SIGNED ART", DIM]] });
    for (const hs of HEAD_SIZES) {
      const t = makeTile(house, spec, { t: { "form.head": tAt(hb, hs), "form.eye-size": et }, label: `H/S ${hs.toFixed(2)}  EYE T ${et}` });
      tiles.push({ hs, et, tile: t }); cells.push({ img: tileImage(t.r), lines: tileLines(t) });
      saveTile(path.join(outDir, "tiles"), `loika-hs${Math.round(hs * 100)}-eye${Math.round(et * 10)}`, t);
    }
  }
  return { img: sheet("HEAD SIZE CHOICE: LOIKA WHOLE, H/S BY EYE SIZE, BESIDE THE MASTER AT 304 / 96 (2X) / 48 (2X)", cells, 4), tiles };
}
export function snailSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "USVEL THE SNAIL, HOUSE BUILD" });
  saveTile(path.join(outDir, "tiles"), "snail", t);
  return { img: sheet("THE SNAIL WHOLE BESIDE ITS MASTER AT 304 / 96 (2X) / 48 (2X)", [{ img: masterImage("S14"), lines: [["MASTER S14 USVEL", INK_TXT], ["SIGNED ART", DIM], ["", DIM]] }, { img: tileImage(t.r), lines: tileLines(t) }], 2), tile: t };
}
const TS = [0, 0.5, 1];
export function gridSheet(house, spec, outDir, kind) {
  const [gx, gy, nx, ny] = kind === "eye-spacing" ? ["form.eye-size", "form.eye-spacing", "EYE SIZE T", "SPACING T"] : ["form.muzzle", "form.lid", "MUZZLE T", "LID T"];
  const cells = [], tiles = [];
  for (const ty of TS) for (const tx of TS) {
    const t = makeTile(house, spec, { t: { [gx]: tx, [gy]: ty }, label: `${nx} ${tx}  ${ny} ${ty}`, sizes: [304, 96] });
    tiles.push({ tx, ty, tile: t });
    const a = onBg(t.r[304]), b = zoom(onBg(t.r[96]), 2), img = blank(a.width, a.height + b.height + 6); paste(img, a, 0, 0); paste(img, b, 0, a.height + 6);
    cells.push({ img, lines: tileLines(t) });
    saveTile(path.join(outDir, "tiles"), `grid-${kind}-${tx}-${ty}`.replace(/\./g, "p"), t);
  }
  return { img: sheet(`GRID OF FACE GENE EXTREMES: ${nx} (ACROSS) BY ${ny} (DOWN), FROM T ALONE`, cells, 3), tiles };
}

// the AD's nose rule (R4: nose width at most 0.6 E) against the signed master: the same Loika with the nose-fit clamp on (the house as written) and off
export function noseSheet(house, spec, outDir) {
  const raw = JSON.parse(JSON.stringify({ ...house, resolved: undefined })); raw.clamps.find((c) => c.id === "nose-fit").on = false;
  const open = loadHouse(raw), a = makeTile(house, spec, { label: "R4 NOSE RULE ON (HOUSE AS WRITTEN)" }), b = makeTile(open, spec, { label: "NOSE RULE OFF (CLAMP OFF)", t: { "form.nose": 1.0 } });
  saveTile(path.join(outDir, "tiles"), "nose-rule-on", a); saveTile(path.join(outDir, "tiles"), "nose-rule-off", b);
  const lines = (t, extra) => [[t.label, INK_TXT], [`NOSE W/E ${f2(t.measured["nose-w/E"])}  ${extra}`, DIM], [t.fails.length ? `FAIL ${t.fails.length}: ${t.fails.map((x) => x.id.replace(/^R/, "")).join(" ").slice(0, 38)}` : "RULES: ALL PASS", t.fails.length ? BAD : DIM]];
  return { img: sheet("THE NOSE: MASTER, THE HOUSE'S R4 RULE (0.6 E), AND THE RULE OFF", [{ img: masterImage("S01"), lines: [["MASTER S01 LOIKA", INK_TXT], ["NOSE W/E 0.97 (READ BY EYE)", DIM], ["", DIM]] }, { img: tileImage(a.r), lines: lines(a, "") }, { img: tileImage(b.r), lines: lines(b, "") }], 3), tiles: [a, b] };
}

// the feet, master beside ours, at 304 (4x) and 96 (6x)
export function feetSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "LOIKA FEET", sizes: [304, 96] }), m = masterOf(spec.id), cells = [];
  const cr = (img, x, y, w, h, k) => zoom(onBg(crop(img, x, y, w, h)), k);
  cells.push({ img: cr(m[304], 40, 238, 250, 66, 3), lines: [["MASTER FEET AT 304 (3X)", INK_TXT], ["", DIM], ["", DIM]] }, { img: cr(t.r[304], 40, 238, 250, 66, 3), lines: [["HOUSE BUILD FEET AT 304 (3X)", INK_TXT], ["", DIM], ["", DIM]] });
  cells.push({ img: cr(m[96], 12, 66, 80, 20, 5), lines: [["MASTER FEET AT 96 (5X)", INK_TXT], ["", DIM], ["", DIM]] }, { img: cr(t.r[96], 12, 66, 80, 20, 5), lines: [["HOUSE BUILD FEET AT 96 (5X)", INK_TXT], ["", DIM], ["", DIM]] });
  return { img: sheet("THE FEET: THE MASTER BESIDE THE BUILD", cells, 2) };
}
// twelve snails from random t over the open genes (the plan D litter check): the rule failures counted
export function snailLitter(house, spec, outDir, n = 12) {
  const genes = ["form.head-width", "form.head-depth", "form.eye-size", "form.eye-height", "form.eye-spacing", "form.pupil", "form.lid", "form.eye-ring", "form.mouth-width", "form.mouth-upturn", "form.carriage", "form.body-length", "form.rise", "form.skirt", "form.antenna", "form.head"];
  const tiles = [], cells = [];
  for (let i = 0; i < n; i++) { const t = {}; for (const g of genes) t[g] = seedUnit(`litter${i}`, g); const tile = makeTile(house, spec, { t, label: `LITTER ${i + 1}`, sizes: [96], seed: `S14-litter${i}` }); tiles.push(tile); cells.push({ img: zoom(onBg(tile.r[96]), 2), lines: tileLines(tile) }); }
  return { img: sheet("SNAIL LITTER OF 12 RANDOM T, AT 96 (2X)", cells, 4), tiles };
}
