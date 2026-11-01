// The pictures of chunk 1: a tile is one individual at 304, 96 and 48 with its rule table; the sheets lay tiles beside the masters.
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { express } from "./express.mjs";
import { renderCreature, coarse, SIZES } from "./render.mjs";
import { faceInk, gazeOf, faceContrast } from "./checks.mjs";
import { checkRules, failures, tAt, bandOf } from "../form/house/house.mjs";
import { measureAll } from "../form/house/measures.mjs";
import { loadImage, saveImage, onBg, zoom, blank, paste, drawText, textWidth } from "./imgtools.mjs";
import { MASTER } from "./paths.mjs";

const alphaHeight = (img) => { let t = Infinity, b = -Infinity; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { t = Math.min(t, y); b = Math.max(b, y); } return b - t; };
export const masterOf = (id) => ({ 304: loadImage(MASTER(id, 304)), 96: loadImage(MASTER(id, 96)), 48: loadImage(MASTER(id, 48)) });

// one individual: express, render at the three sizes from one framing, measure the render, read the rules
export function makeTile(house, specimen, { t = {}, label = "", seed = undefined, sizes = [304, 96, 48], shareClamp = false } = {}) {
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
  const measured = measureAll(rig), rules = checkRules(house, specimen.plan, measured);
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
  const bad = t.fails.map((x) => x.id.replace(/^R/, "")).join(" "), l3 = bad ? `FAIL ${t.fails.length}: ${bad.length > 40 ? bad.slice(0, 38) + ".." : bad}` : "RULES: ALL PASS";
  return [[l1, INK_TXT], [l2, DIM], [l3, bad ? BAD : DIM]];
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
