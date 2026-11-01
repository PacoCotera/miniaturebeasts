// The pictures of chunk 1: a tile is one individual at 304, 96 and 48 with its rule table; the sheets lay tiles beside the masters.
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { express } from "./express.mjs";
import { renderCreature, coarse, SIZES } from "./render.mjs";
import { faceInk, gazeOf, faceContrast, noseValue, ringShade } from "./checks.mjs";
import { checkRules, failures, tAt, bandOf, loadHouse } from "../form/house/house.mjs";
import { measureAll } from "../form/house/measures.mjs";
import { loadImage, saveImage, onBg, zoom, blank, paste, crop, drawLine, fillDisc } from "./imgtools.mjs";
import { imageProfile } from "./silhouette.mjs";
import { seedUnit } from "./pose.mjs";
import { sheet } from "./page.mjs";
import { MASTER } from "./paths.mjs";

const alphaHeight = (img) => { let t = Infinity, b = -Infinity; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { t = Math.min(t, y); b = Math.max(b, y); } return b - t; };
export const masterOf = (id) => ({ 304: loadImage(MASTER(id, 304)), 96: loadImage(MASTER(id, 96)), 48: loadImage(MASTER(id, 48)) });

// one individual: express, render at the three sizes from one framing, measure the render, read the rules
export function makeTile(house, specimen, { t = {}, label = "", seed = undefined, sizes = [304, 96, 48], shareClamp = true, clamps = true, outside = false } = {}) {
  const ref = { height: alphaHeight(loadImage(MASTER(specimen.id, 304))) };
  const ex = express(house, { ...specimen, seed: seed ?? specimen.seed }, { t, side: specimen.side, shareClamp, clamps });
  const camera = { yaw: ex.pose.cameraYaw, pitch: house.solver.camera["pitch-deg"] }, extents = coarse(ex.scene, camera, { n: 240 });
  const r = {}; for (const s of sizes) r[s] = renderCreature(ex.scene, camera, s, { ref, look: specimen.look, extents });
  const rig = { ...ex.rig, px: {} };
  for (const s of [96, 48]) if (r[s]) { const f = faceInk(r[s]); rig.px[s] = f; }
  if (r[304]) { const g = gazeOf(r[304], ex.scene); rig.gazeOffset = g.offsetE; rig.catchDisagreePx = g.catchDisagreePx; rig.gazeAngle = g.screenAngleBetween; rig.faceContrast = faceContrast(r[304], ex.scene); rig.noseValue = noseValue(r[304]) ?? undefined; rig.ringShade = ringShade(r[304]) ?? undefined; }
  rig.eyeSizeDiff = 0; // the eyes are mirrored in the face frame: one E for both (plan 2.5, never 9)
  rig.shadeRatio = house.light.shade.ratio; // the shade-to-lit ratio of the reference sphere, by construction (the renderer interpolates albedo x ratio to albedo)
  rig.sickCues = (rig.lid > 0.2 ? 1 : 0) + (rig.upturn < 0.05 ? 1 : 0);
  const measured = measureAll(rig), rules = checkRules(house, specimen.plan, measured, { kinds: specimen.kinds });
  return { specimen, ex, camera, r, rig, measured, rules, fails: failures(rules), label, forceOutside: outside, ms: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v.meta.ms)])) };
}

const f2 = (v, d = 2) => Number(v).toFixed(d);
// the rules in plain words, for a label
const WORDS = { "R1-face": "eye share", "R1-head": "head size", "R1-head-breadth": "head breadth", "R3-size": "eye size", "R3-height": "eye height", "R3-spacing": "eye spacing", "R4-stack": "face stack", "R4-nose-drop": "nose drop", "R4-nose-width": "nose width", "R4-mouth-gap": "mouth gap", "R4-forehead": "forehead", "R-far-eye": "far eye", "R-nose-far-eye": "nose at eye", "R-nose-mouth": "nose to smile", "R-nose-value": "nose value", "R-ring-shade": "ring shade", "R-back-70": "back line", "R-back-85": "back line", "R-back-95": "back line", "R-chin": "chin", "R-nape": "nape", "R-push": "pushed features", "R-mouth": "mouth", "R15-iris-48": "iris at 48", "R15-iris-96": "iris at 96", "R15-pupil-48": "pupil at 48", "R15-nose-96": "nose at 96", "R15-mouth-96": "mouth at 96", "R13-face-contrast": "face value", "R18-cues": "sick cues", "R6-face-yaw": "face yaw", "R6-body-yaw": "body yaw", "R6-head-yaw": "head yaw", "R6-roll": "roll" };
const wordOf = (id) => WORDS[id] ?? id.replace(/^R/, "");
// a tile's label: the name, the verdict in plain words, and the numbers on a last line (the page wraps whatever is long)
export function tileLines(t) {
  const m = t.measured, over = t.fails.some((x) => x.id === "R1-face" && x.value > x.range[1]), far = !!t.ex?.outside || t.fails.some((x) => x.id === "R-far-eye" || x.id === "R-nose-far-eye"), outside = over || far || !!t.forceOutside;
  const others = t.fails.filter((x) => !(over && x.id === "R1-face") && !(far && (x.id === "R-far-eye" || x.id === "R-nose-far-eye")));
  const lines = [];
  if (t.label) lines.push([t.label, "name"]);
  if (outside) lines.push([t.forceOutside ? "Outside the house: clamps off" : "Outside the house", "bad"]);
  if (others.length) lines.push([others.length > 3 ? `Breaks ${others.length} rules` : `Breaks ${others.map((x) => wordOf(x.id)).join(", ")}`, "bad"]);
  if (!t.fails.length) lines.push(["Passes the house", "dim"]);
  if (m["H/S"] !== undefined) lines.push([`H/S ${f2(m["H/S"])}, E/W ${f2(m["E/Wf"] ?? 0)}, share ${f2(m["eye-share"] ?? 0, 3)}`, "dim"]);
  return lines;
}
// pictures: the three sizes of a tile (304 at 1x; 96 and 48 enlarged 2x with their pixels kept), a master the same
const tilePics = (r, sizes = [304, 96, 48]) => [[{ img: r[304] ?? r[96] }], ...(r[304] && (sizes.includes(96) || sizes.includes(48)) ? [[...(r[96] ? [{ img: r[96], scale: 2 }] : []), ...(r[48] ? [{ img: r[48], scale: 2 }] : [])]] : [])];
const masterPics = (id) => tilePics(masterOf(id));
const masterCell = (id, name, l2 = "Signed art") => ({ pics: masterPics(id), lines: [[`Master ${name}`, "name"], [l2, "dim"]] });
export const saveTile = (dir, name, t) => { mkdirSync(dir, { recursive: true }); for (const s of Object.keys(t.r)) saveImage(path.join(dir, `${name}-${SIZES[s].join("x")}.png`), t.r[s]); };

// ---- the sheets: each returns { spec } (a sheet spec for page.mjs's renderSheet) and its tiles ---------------------------------------------
export const HEAD_SIZES = [0.45, 0.52, 0.60], EYE_OUT = 0.9; // row 1: the type specimen's own eye size (the master's E/Wf 0.30); row 2: eye t 0.9, every clamp off, outside the house
export function headSizeSheet(house, spec, outDir) {
  const cells = [], tiles = [], hb = bandOf(house, "A", "form.head"), et1 = spec.t["form.eye-size"];
  for (const [et, open] of [[et1, false], [EYE_OUT, true]]) {
    cells.push(masterCell("S01", "Loika", open ? `Row 2: eye t ${et}, clamps off, outside the house` : "Row 1: the master's eye (E/Wf 0.30)"));
    for (const hs of HEAD_SIZES) {
      const mk = (e, label, sizes) => makeTile(house, spec, { t: { "form.head": tAt(hb, hs), "form.eye-size": e }, label, clamps: !open, shareClamp: !open, outside: open, sizes });
      let e1 = et, label = open ? `H/S ${hs.toFixed(2)}, eye t ${et}` : `H/S ${hs.toFixed(2)}, the master's eye (E/Wf 0.30)`;
      // AD fix round 5, ruling 2: a tile whose iris is under the house's 96 px floor with the master's eye raises its eye, inside R3's band and no further than it must, and says so
      if (!open) { const floor = house.rules.find((r) => r.id === "R15-iris-96").plans.A[0], iris = (e) => mk(e, "", [96, 48]).rig.px[96]?.iris ?? 0; if (iris(e1) < floor) { while (e1 < 1 && iris(e1) < floor) e1 = Math.min(1, e1 + 0.05); const r = mk(e1, "", [96, 48]); label = `H/S ${hs.toFixed(2)}, eye raised to E/W ${f2(r.measured["E/Wf"])} to hold the iris at 96`; } }
      const t = mk(e1, label);
      tiles.push({ hs, et: e1, tile: t }); cells.push({ pics: tilePics(t.r), lines: tileLines(t) });
      saveTile(path.join(outDir, "tiles"), `loika-hs${Math.round(hs * 100)}-eye${Math.round(et * 100)}`, t);
    }
  }
  const grown = tiles.some((x) => x.et !== et1 && x.et !== EYE_OUT); // the caption drops the 0.45 sentence when that tile holds the master's eye
  return { spec: sheet("Head size choice: Loika beside the master at 304, 96 and 48", cells, 4, { note: `Loika's head at three sizes on the same body, each with her own eye. 0.52 is nearest the master. 0.60 is the top of the band.${grown ? " At 0.45 her eye has to grow a little to stay readable at 96." : ""} Row 2 shows a bigger eye, outside the house.` }), tiles };
}
export function snailSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "Usvel the snail, house build" });
  saveTile(path.join(outDir, "tiles"), "snail", t);
  return { spec: sheet("The snail beside its master at 304, 96 and 48", [masterCell("S14", "Usvel"), { pics: tilePics(t.r), lines: tileLines(t) }], 2), tile: t };
}
const TS = [0, 0.5, 1];
export function gridSheet(house, spec, outDir, kind) {
  const [gx, gy, nx, ny] = kind === "eye-spacing" ? ["form.eye-size", "form.eye-spacing", "Eye", "spacing"] : ["form.muzzle", "form.lid", "Muzzle", "lid"];
  const cells = [], tiles = [];
  for (const ty of TS) for (const tx of TS) {
    const t = makeTile(house, spec, { t: { [gx]: tx, [gy]: ty, "form.mouth-gap": 1 }, label: `${nx} t ${tx}, ${ny} t ${ty}`, sizes: [304, 96] }); // every tile at the top of the mouth-gap band (ruling 1e)
    tiles.push({ tx, ty, tile: t }); cells.push({ pics: tilePics(t.r, [304, 96]), lines: tileLines(t) });
    saveTile(path.join(outDir, "tiles"), `grid-${kind}-${tx}-${ty}`.replace(/\./g, "p"), t);
  }
  return { spec: sheet(`Face gene extremes: ${nx.toLowerCase()} across, ${ny} down, the mouth gap at the top of its band`, cells, 3), tiles };
}

// the nose against the signed master: the house build (the nose-fit clamp by kind: a skin mound is 0.7 to 1.1 E) and the same Loika with the clamp off
export function noseSheet(house, spec, outDir) {
  const raw = JSON.parse(JSON.stringify({ ...house, resolved: undefined })); raw.clamps.find((c) => c.id === "nose-fit").on = false;
  const open = loadHouse(raw), a = makeTile(house, spec, { label: "House build, nose clamped by kind" }), b = makeTile(open, spec, { label: "Clamp off, nose t 1", t: { "form.nose": 1.0 } });
  saveTile(path.join(outDir, "tiles"), "nose-rule-on", a); saveTile(path.join(outDir, "tiles"), "nose-rule-off", b);
  const lines = (t) => [[t.label, "name"], [`Nose ${f2(t.measured["nose-w/E"])} E wide`, "dim"], ...tileLines({ ...t, label: "" }).slice(0, 1)];
  return { spec: sheet("The nose: the master, the house build and the clamp off", [masterCell("S01", "Loika", "Nose 0.97 E, read by eye"), { pics: tilePics(a.r), lines: lines(a) }, { pics: tilePics(b.r), lines: lines(b) }], 3), tiles: [a, b] };
}

// the feet, master beside ours: crops of the native renders, enlarged with their pixels kept (3x at 304, 5x at 96)
export function feetSheet(house, spec, outDir) {
  const t = makeTile(house, spec, { label: "Loika feet", sizes: [304, 96] }), m = masterOf(spec.id);
  // the crop follows each picture's own creature: its leftmost opaque column in the feet rows, then the same width for both
  const left = (img, y0, y1) => { let x0 = img.width; for (let y = y0; y < y1; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > 200) { x0 = Math.min(x0, x); break; } return Math.max(0, x0 - 4); };
  const c = (img, y, w, h, k) => [[{ img: crop(img, left(img, y, y + h), y, w, h), scale: k }]];
  const cells = [
    { pics: c(m[304], 238, 262, 66, 3), lines: [["Master feet at 304, 3x", "name"]] }, { pics: c(t.r[304], 238, 262, 66, 3), lines: [["Build feet at 304, 3x", "name"]] },
    { pics: c(m[96], 66, 84, 20, 5), lines: [["Master feet at 96, 5x", "name"]] }, { pics: c(t.r[96], 66, 84, 20, 5), lines: [["Build feet at 96, 5x", "name"]] }];
  return { spec: sheet("The feet: the master beside the build", cells, 2) };
}
// ---- the back line: Loika's silhouette against the master's, at the three head sizes (AD fix round 2, ruling 1a) -------------------------------------------------------
// The master's top per column, in stature units, as a curve over the fraction of its width; laid over each build's own extents and stature. The AD's marks (the red dots) are the
// master's 0.79, 0.72 and 0.55 S at 0.7, 0.85 and 0.95 of the length. A second picture per cell: the same creature square to the camera (a true side view), as a filled silhouette.
export const BACK_MARKS = { 0.7: 0.8, 0.85: 0.72, 0.95: 0.55 };
const BG = [246, 243, 236], INKC = [36, 32, 40], RED = [205, 40, 40], BLUE = [30, 90, 200];
const silhouetteOf = (img) => { const o = blank(img.width, img.height, BG); for (let i = 0; i < img.width * img.height; i++) if (img.data[i * 4 + 3] >= 128) { const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2]; const leaf = g >= r - 8 && g > b + 25; const c = leaf ? [120, 160, 90] : INKC; o.data[i * 4] = c[0]; o.data[i * 4 + 1] = c[1]; o.data[i * 4 + 2] = c[2]; } return o; };
function masterCurve(crown = 85) {
  const p = imageProfile(loadImage(MASTER("S01", 304)), { crown }), top = p.top;
  return { p, at: (f) => { const x = Math.min(p.x1, Math.max(p.x0, Math.round(p.x0 + f * (p.x1 - p.x0)))); let v = top[x]; for (let d = 1; v === null && d < 6; d++) v = top[x - d] ?? top[x + d]; return v === null ? null : (p.floor - v) / p.stature; } };
}
const overlay = (img, p, curve, k = 1) => { // the master's back line over `img` (an RGBA picture), scaled to the picture's own profile p; returns a new picture
  const o = onBg(img); let prev = null;
  for (let f = 0; f <= 1.0001; f += 0.005) { const v = curve.at(f); if (v === null) { prev = null; continue; } const x = p.x0 + f * (p.x1 - p.x0), y = p.floor - v * p.stature; if (prev) drawLine(o, prev[0], prev[1], x, y, RED, 2); prev = [x, y]; }
  for (const [f, v] of Object.entries(BACK_MARKS)) { const x = p.x0 + Number(f) * (p.x1 - p.x0), y = p.floor - v * p.stature; fillDisc(o, x, y, 3.2, BLUE); }
  return o;
};
export function silhouetteSheet(house, spec, outDir) {
  const hb = bandOf(house, "A", "form.head"), curve = masterCurve(), mp = curve.p, m = masterOf("S01"), cells = [], tiles = [];
  const fm = (v) => (v === null || v === undefined ? "-" : v.toFixed(2));
  const mAt = [0.7, 0.85, 0.95].map((f) => curve.at(f));
  cells.push({ pics: [[{ img: overlay(m[304], mp, curve) }], [{ img: silhouetteOf(m[304]) }]], lines: [["Master Loika, stand view", "name"], [`Top at 0.7, 0.85, 0.95: ${mAt.map(fm).join(", ")} S`, "dim"], ["Red line: the master's back. Blue dots: the AD's 0.8, 0.72, 0.55", "dim"]] });
  for (const hs of HEAD_SIZES) {
    const t = makeTile(house, spec, { t: { "form.head": tAt(hb, hs) }, label: `H/S ${hs.toFixed(2)}`, sizes: [304] }), p = imageProfile(t.r[304]);
    const side = renderCreature(t.ex.scene, { yaw: -90 * spec.side, pitch: 0 }, 304, { ref: { height: 220 }, look: spec.look, extents: coarse(t.ex.scene, { yaw: -90 * spec.side, pitch: 0 }, { n: 240 }), floor: false });
    tiles.push({ hs, tile: t, profile: p });
    saveTile(path.join(outDir, "tiles"), `silhouette-hs${Math.round(hs * 100)}`, t);
    cells.push({ pics: [[{ img: overlay(t.r[304], p, curve) }], [{ img: silhouetteOf(side) }]], lines: [[`Loika at H/S ${hs.toFixed(2)}, stand view`, "name"], [`Top at 0.7, 0.85, 0.95: ${[0.7, 0.85, 0.95].map((f) => fm(p.at[f])).join(", ")} S`, "dim"], [`Side view below, square to the camera`, "dim"]] });
  }
  return { spec: sheet("Loika's back line against the master's, at the three head sizes", cells, 4, { note: "Top row: the stand view with the master's back line (red) laid over each build at its own length and stature; the blue dots are the AD's marks. Bottom row: silhouettes, the master's in the stand view and the builds square to the camera." }), tiles, master: mAt };
}

// twelve snails from t drawn round the specimen's own t over the open genes (the plan D litter check): three columns
const LITTER_SPREAD = 0.6; // the width of each gene's pool in t, centred on the type specimen's t
export function snailLitter(house, spec, outDir, n = 12) {
  const genes = ["form.head-width", "form.head-depth", "form.eye-size", "form.eye-height", "form.eye-spacing", "form.pupil", "form.lid", "form.eye-ring", "form.mouth-width", "form.mouth-upturn", "form.carriage", "form.body-length", "form.rise", "form.skirt", "form.antenna", "form.head"];
  const tiles = [], cells = [];
  for (let i = 0; i < n; i++) { const t = {}; for (const g of genes) t[g] = Math.min(1, Math.max(0, (spec.t[g] ?? 0.5) + (seedUnit(`litter${i}`, g) - 0.5) * LITTER_SPREAD)); const tile = makeTile(house, spec, { t, label: `Snail ${i + 1}`, sizes: [96], seed: `S14-litter${i}` }); tiles.push(tile); cells.push({ pics: [[{ img: tile.r[96], scale: 2 }]], lines: tileLines(tile) }); }
  // the rows above every creature are bare: cut them (the pictures keep their pixels), so each label sits close over its own picture
  const top = Math.min(...cells.map((c) => { const im = c.pics[0][0].img; for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (im.data[(y * im.width + x) * 4 + 3] > 8) return y; return im.height; })), cut = Math.max(0, top - 4);
  for (const c of cells) c.pics[0][0].img = crop(c.pics[0][0].img, 0, cut, c.pics[0][0].img.width, c.pics[0][0].img.height - cut);
  return { spec: sheet("Snail litter of 12 at 96, enlarged 2x", cells, 3, { cellW: 270 }), tiles };
}
