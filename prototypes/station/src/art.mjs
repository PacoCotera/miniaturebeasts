// The placeholder register and every drawn stand-in. Engineers do not do art (decided): everything here
// stands in for a master the art director has not made yet, stays plainly a placeholder, and is listed
// in PLACEHOLDERS so masters replace them one by one. The mibi itself is the placeholder of the
// placeholder brief (plain.mjs, the stylised rig pass), rendered from the genome through the workbench.
import { PB, C, RGB, art, fromRGBA, cropPB, scalePB, flipPB, upPB, bay, lite, shade, nearestHex, clock, motion } from "./gfx.mjs";
import { buildIndividual, shapeTrait, genomeDigest, stampGenome, stampFrameOf } from "./genome.mjs";
import { fitCamera, resolveCamera, VIEWS } from "../../workbench/framework/raster.mjs";
import { plainRender, BG } from "../../workbench/framework/plain.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";

export const PLACEHOLDERS = [
  { id: "mibi", what: "every mibi and founder: the placeholder of the plain renderer (flat slots, outline, no face, no material), quantised to the palette", until: "the Grow painting lands (M3), and the rig's own placeholder brief is finished" },
  { id: "pod", what: "the pod drawn by code from the frame's four parameters (size class, proportion, shell pattern, colour pair) and its glyph on the cap", until: "the pod renderer's masters (research-loop.md §6)" },
  { id: "trait-picture", what: "a trait's picture: a close-up of this pod's mibi in the placeholder, cropped around the part the trait names", until: "the Grow painting's close-ups" },
  { id: "seed", what: "the misty seed: the hidden look as a frosted close-up in a pearl", until: "the seed master" },
  { id: "stamp", what: "the genome stamp rastered by genome-stamp/src/stamp.mjs and quantised to the palette", until: "the stamp's label art (PV-D-r3-a4)" },
  { id: "ring", what: "the progress ring: a centre dot, one arc per chapter sized by its traits, a star for a glint, a notch for a sealed chapter", until: "the pod list master" },
  { id: "chapter-emblem", what: "one 16 px emblem per chapter", until: "the chapter rail master" },
  { id: "page", what: "the chapter page: a deep pane with frost where nothing is known", until: "the research bench master" },
  { id: "room", what: "Home's room, bench modules, vivarium, crates, cups, dome, leaves, Probe and lamp, as the stand-in v2 drew them", until: "the Home and bench masters (station-screens.md: no wood, felt or lamp-lit bench)" },
  { id: "icons", what: "the material icons, the Companion mark and the heart", until: "the icon set" },
];

// ---------- The material icons ----------
export const ICON = {
  energy: () => art("i-energy", () => { const pb = new PB(14, 14); pb.poly([[7, 0], [13.5, 7], [7, 14], [0.5, 7]], C.amber); pb.poly([[7, 0], [13.5, 7], [7, 7]], C.yellow); pb.poly([[0.5, 7], [7, 14], [7, 7]], C.orange); return pb; }),
  data: () => art("i-data", () => { const pb = new PB(14, 14); pb.rect(1, 1, 12, 12, C.sky); pb.rect(0, 2, 14, 10, C.sky); pb.rect(2, 0, 10, 14, C.sky); pb.rect(3, 4, 8, 2, C.white); pb.rect(3, 8, 5, 2, C.white); pb.rect(2, 12, 10, 2, C.river); return pb; }),
  essence: () => art("i-ess", () => { const pb = new PB(14, 14); pb.ell(7, 7, 6.6, 6.6, C.grass, { sh: [C.lime, C.leaf] }); pb.rect(4, 3, 2, 2, C.white); return pb; }),
  star: () => starArt(false),
  comp: () => art("i-comp", () => { const pb = new PB(14, 20); pb.rect(1, 0, 12, 20, C.sand); pb.rect(3, 2, 8, 9, C.ink); pb.ell(9.5, 15, 2, 2, C.orange); pb.ell(4.5, 15, 1.6, 1.6, C.teal); pb.outline(() => C.wood1); return pb; }),
  heart: (full) => art("i-heart" + full, () => { const pb = new PB(30, 28), c = full ? C.coral : C.moss3; pb.ell(9, 9, 7.5, 7.5, c); pb.ell(21, 9, 7.5, 7.5, c); pb.poly([[2, 11], [28, 11], [15, 26]], c); if (full) pb.ell(8, 7, 2.5, 2.5, C.blush); pb.outline(() => (full ? C.wine : C.lampD)); return pb; }),
};
export const starArt = (big) => art("star" + big, () => { const r = big ? 9 : 5, pb = new PB(r * 2 + 1, r * 2 + 1);
  pb.poly([[r, 0], [r + r * 0.28, r - r * 0.28], [r * 2, r], [r + r * 0.28, r + r * 0.28], [r, r * 2], [r - r * 0.28, r + r * 0.28], [0, r], [r - r * 0.28, r - r * 0.28]], C.cream); pb.ell(r + 0.5, r + 0.5, r * 0.3, r * 0.3, C.white); pb.outline(() => C.gold); return pb; });
export const famArt = () => art("fam", () => { const pb = new PB(26, 16); pb.ring(8, 8, 7, 7, C.lamp, 2); pb.ring(17, 8, 7, 7, C.lamp, 2); pb.outline(() => C.wood0); return pb; });
export const baseArt = () => art("base", () => { const pb = new PB(70, 10); pb.rect(2, 0, 66, 7, C.wood3); pb.rect(2, 0, 66, 2, C.wood4); pb.rect(0, 7, 70, 3, C.wood1); return pb; });

// ---------- The mibi placeholder: the plain renderer on the genome, quantised ----------
const BUILT = new Map();
export function builtOf(frame, genome) {
  const k = genomeDigest(genome); let b = BUILT.get(k);
  if (!b) { try { b = buildIndividual(frame, genome); } catch (e) { b = { error: e.message }; } BUILT.set(k, b); }
  return b;
}
// The cast shadow of the plain pass lies on the segment from the ground to its shade; those pixels are cleared.
const isShadow = (r, g, b) => { const t = (BG[0] - r) / 50; return t > 0.02 && t < 1 && Math.abs(g - (BG[1] - 55 * t)) <= 3 && Math.abs(b - (BG[2] - 60 * t)) <= 3; };
function renderPB(scene, camera, device) {
  const img = plainRender(scene, camera, { device, palette: RGB }), pb = fromRGBA(img, { transparent: BG, tol: 1 });
  for (let i = 0; i < pb.p.length; i++) if (pb.p[i] >= 0 && isShadow(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2])) pb.p[i] = -1;
  return pb;
}
const blobArt = (w, h) => { const pb = new PB(w, h); pb.ell(w / 2, h / 2, w * 0.4, h * 0.4, C.frostD, { sh: [C.frost, C.frostS] }); pb.outline(() => C.stone); return pb; };
// A mibi at w×h in a view ("portrait" faces viewer-left; "three-quarter" the flank), transparent around it.
export function mibiArt(frame, genome, w, h, view = "portrait", flip = false) {
  const key = "mb" + genomeDigest(genome) + ":" + w + "x" + h + ":" + view;
  const pb = art(key, () => { const b = builtOf(frame, genome); if (b.error || b.validation.status !== "valid") return blobArt(w, h);
    return renderPB(b.scene, fitCamera(b.scene, view, [w, h], 0.06), w >= 200 ? "station" : "companion"); });
  return flip ? art(key + "f", () => flipPB(pb)) : pb;
}
// The species' face: its type specimen (the frame's typical body) in the placeholder.
export function speciesArt(frame, w, h, view = "portrait") { return frame.typeSpecimen?.genome ? mibiArt(frame, frame.typeSpecimen.genome, w, h, view) : blobArt(w, h); }

// ---------- Trait pictures: a close-up of this pod's mibi around the part the trait names ----------
const PART_OF = [
  [/crown|crest|horn|antenna/, ["crown", "horn", "antenna", "head"]], [/eye/, ["eye", "head"]], [/snout|muzzle|beak|jaw/, ["muzzle", "beak", "jaw", "head"]], [/ear/, ["ear", "head"]], [/head|face/, ["head"]],
  [/leg|feet|foot|stride|pace|gait|waddle|turning|weave/, ["leg", "ray", "foot-skirt"]], [/tail/, ["tail", "tail-bulb"]], [/wing|fin|flap/, ["flap", "fin"]], [/cap/, ["cap"]], [/shell/, ["shell", "wing-case"]],
];
const partsFor = (traitId) => (PART_OF.find(([re]) => re.test(traitId)) || [null, null])[1];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// The box (in image pixels) the named parts occupy under a camera; the whole body when none match.
function partBox(scene, camera, parts) {
  const cam = resolveCamera(scene, camera), view = VIEWS[cam.view], [W, H] = cam.size;
  const pick = (node) => { const p = node.part ?? node.id; return !parts || parts.some((q) => p === q || p.startsWith(q + "-")); };
  let nodes = scene.nodes.filter(pick); if (!nodes.length) nodes = scene.nodes;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) for (const v of n.mesh.vertices) { const x = W / 2 + (dot(v, view.right) - cam.center[0]) * cam.scale, y = H / 2 - (dot(v, view.up) - cam.center[1]) * cam.scale; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, whole: nodes === scene.nodes };
}
const PIC_BG = C.creamT;
export function traitPic(frame, genome, traitId, w = 150, h = 110) {
  const key = "pic" + genomeDigest(genome) + ":" + traitId + ":" + w + "x" + h;
  return art(key, () => {
    const pb = new PB(w, h); pb.rect(0, 0, w, h, PIC_BG); for (let y = h - 24; y < h; y++) for (let x = 0; x < w; x++) if (bay(x, y) < (y - (h - 24)) / 2) pb.set(x, y, C.sand);
    const b = builtOf(frame, genome); if (b.error || b.validation.status !== "valid") { pb.blit(blobArt(w, h), 0, 0); return pb; }
    const camera = fitCamera(b.scene, "portrait", [300, 310], 0.06), full = art("mbfull" + genomeDigest(genome), () => renderPB(b.scene, camera, "station"));
    const box = partBox(b.scene, camera, partsFor(traitId)), pad = box.whole ? 0.04 : 0.3;
    let bw = Math.max(box.x1 - box.x0, 40), bh = Math.max(box.y1 - box.y0, 40), cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    bw *= 1 + pad; bh *= 1 + pad;
    const k = Math.max(bw / w, bh / h), sw = Math.round(k * w), sh = Math.round(k * h);
    const crop = cropPB(full, Math.round(cx - sw / 2), Math.round(cy - sh / 2), sw, sh), scaled = sw === w ? crop : scalePB(crop, w, h);
    pb.blit(scaled, 0, 0); return pb;
  });
}
// The hidden look, inside a misty seed (40×52): the trait made only its hidden copy, frosted.
export function seedPic(frame, genome, traitId, choice) {
  const other = shapeTrait(frame, genome, traitId, choice), key = "seed" + genomeDigest(other) + ":" + traitId;
  return art(key, () => {
    const src = traitPic(frame, other, traitId, 150, 110), pb = new PB(40, 52);
    pb.ell(20, 26, 19.5, 25.5, C.frostS); pb.ell(20, 26, 18, 24, C.frost);
    for (let y = 0; y < 34; y++) for (let x = 0; x < 30; x++) { const c = src.get(Math.floor(x * 150 / 30), Math.floor(y * 110 / 34)), px = x + 5, py = y + 10;
      if (((px - 20) / 18) ** 2 + ((py - 26) / 24) ** 2 <= 0.92 && c >= 0 && c !== PIC_BG && c !== C.sand) pb.set(px, py, bay(px, py) < 5 ? C.frost : c); }
    pb.ring(20, 26, 19.5, 25.5, C.stone, 1); pb.set(14, 10, C.white); pb.set(13, 11, C.white); return pb;
  });
}
export function frostPic(w = 150, h = 110) { return art("frostpic" + w + "x" + h, () => { const pb = new PB(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const streak = (x + y * 2) % 23 < 2 && bay(x, y) < 10, low = y > h * 0.7 && bay(x, y) < (y - h * 0.7) / 3; pb.set(x, y, streak ? C.white : low ? C.frostD : bay(x, y) < 3 ? C.frostD : C.frost); }
  return pb; }); }
// The sealed chapter: closed slats and a picture of what opens it (a crystal).
export function sealedPic(w = 150, h = 110) { return art("sealedpic" + w + "x" + h, () => { const pb = new PB(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = y % 14; pb.set(x, y, r < 2 ? C.slate : r < 4 ? C.stone : C.night); }
  pb.poly([[w / 2, 14], [w / 2 + 22, h / 2], [w / 2, h - 14], [w / 2 - 22, h / 2]], C.lilac); pb.poly([[w / 2, 14], [w / 2 + 22, h / 2], [w / 2, h / 2]], C.lavender); pb.outline(() => C.plumD); return pb; }); }
export const asleepMark = () => art("asleep", () => { const pb = new PB(22, 14); for (const [x, y] of [[2, 2], [12, 6], [18, 10]]) pb.rect(x, y, 4, 4, C.fog); pb.rect(3, 3, 2, 2, C.white); return pb; });

// ---------- The genome stamp on its label ----------
export function stampArt(frame, genome, readIds, side = 200) {
  const sg = stampGenome(frame, genome, readIds); if (!sg) return null;
  const key = "stamp" + genomeDigest(genome) + ":" + readIds.slice().sort().join(",") + ":" + side;
  return art(key, () => fromRGBA(rasterize(stampGeometry(sg), side, { ss: 3 })));
}
export const stampSize = (frame) => stampFrameOf(frame) ? stampFrameOf(frame).payloadBits : 0;

// ---------- Pods from one renderer: the frame's four parameters and the glyph ----------
const SIZE_U = { small: 13, medium: 16, large: 19 };
const PLACE_DUST = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
// state: "sealed" (the shell, the cap sealed), "identified" (the glyph lit on the cap), "hatched"; frame null: a quiet grey pod.
export function podArt(frame, place, s, state = "sealed") {
  const key = "pod" + (frame ? frame.species.id : "none") + ":" + (place || "") + ":" + s + ":" + state;
  return art(key, () => {
    const u = frame ? SIZE_U[frame.pod?.sizeClass] || 16 : 15, prop = frame?.pod?.proportion, rx = u * 0.38 * (prop === "squat" ? 1.2 : prop === "tall" ? 0.86 : 1), ry = u * 0.5 * (prop === "tall" ? 1.15 : prop === "squat" ? 0.9 : 1);
    const W = Math.ceil((rx * 2 + 2) * s), H = Math.ceil((ry * 2 + 8) * s), pb = new PB(W, H), cx = W / 2, cy = ry * s + 5 * s;
    const c0 = frame ? nearestHex(frame.pod.colourPair[0].hex) : C.mist, c1 = frame ? nearestHex(frame.pod.colourPair[1].hex) : C.fog;
    pb.ell(cx, cy, rx * s, ry * s, c0, { sh: [lite(c0), shade(c0)] });
    const inShell = (x, y) => ((x + 0.5 - cx) / (rx * s)) ** 2 + ((y + 0.5 - cy) / (ry * s)) ** 2 <= 0.96;
    const pat = frame?.pod?.shellPattern || "smooth dots";
    if (pat.includes("rib")) { for (let i = -3; i <= 3; i++) pb.ell(cx + i * rx * s * 0.3, cy + ry * s * 0.1, rx * s * 0.12, ry * s * 0.75, c1, { clip: (x, y) => inShell(x, y) && bay(x, y) < 10 }); }
    else if (pat.includes("plate") || pat.includes("scale")) { for (let j = 0; j < 4; j++) for (let i = -2; i <= 2; i++) pb.ring(cx + (i + (j % 2) * 0.5) * rx * s * 0.45, cy - ry * s * 0.5 + j * ry * s * 0.4, rx * s * 0.26, ry * s * 0.2, c1, Math.max(1, s / 2), 0, inShell); }
    else if (pat.includes("segment")) { for (let j = -2; j <= 2; j++) pb.ell(cx, cy + j * ry * s * 0.36, rx * s, ry * s * 0.06, c1, { clip: inShell }); }
    else { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if ((i + j) % 2 === 0) pb.ell(cx + i * rx * s * 0.42, cy + j * ry * s * 0.36, s * 0.9, s * 0.9, c1, { clip: inShell }); }
    pb.ell(cx, cy + ry * s * 0.55, rx * s * 0.7, ry * s * 0.1, shade(c0), { clip: inShell });                // the seam
    pb.ell(cx - rx * s * 0.4, cy - ry * s * 0.45, rx * s * 0.18, ry * s * 0.12, C.white, { chk: 1 });        // a highlight
    // the cap, sealed or lit with the glyph
    const capR = rx * s * 0.6, capY = cy - ry * s - 1;
    pb.ell(cx, capY + 2 * s, capR, 3.2 * s, state === "identified" ? C.bone : C.slate, { sh: state === "identified" ? [C.white, C.fog] : [C.stone, C.night] });
    pb.rect(cx - 1.5 * s, capY - 2 * s, 3 * s, 3 * s, C.forest); pb.rect(cx - 0.8 * s, capY - 3 * s, 1.6 * s, 1.5 * s, C.leaf);  // the short stem
    if (state === "identified" && frame?.glyph && s >= 2) { const gs = Math.max(1, Math.round(s / 2)), gw = 5 * gs;
      frame.glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") pb.rect(cx - gw / 2 + x * gs, capY + 2 * s - 2.5 * gs + y * gs, gs, gs, C.ink); })); }
    else if (state === "sealed") { pb.rect(cx - 2.5 * s, capY + 1.3 * s, 5 * s, 1.4 * s, C.red); pb.rect(cx - 0.7 * s, capY + 0.7 * s, 1.4 * s, 2.6 * s, C.red); }   // the seal
    if (place && PLACE_DUST[place]) for (let i = 0; i < 6 * s; i++) { const a = (i / (6 * s)) * Math.PI, x = cx + Math.cos(a) * rx * s * (0.4 + (i % 3) * 0.2), y = cy + ry * s * 0.95 - (i % 2) * s; if (bay(Math.round(x), Math.round(y)) < 7) pb.rect(x, y, Math.max(1, s / 2), Math.max(1, s / 2), C[PLACE_DUST[place]]); }
    if (s >= 3) pb.rich(Math.round(s / 3));
    pb.outline(() => C.ink); return pb;
  });
}
// The progress ring around a pod in the list: the centre at Identify; an arc per chapter sized by its traits;
// filled when read, a hairline when not; a star for a glint; a notch for a sealed chapter. No digits.
export function ringArt(frame, pod, chapterFlags, r = 30) {
  const key = "ring" + (frame ? frame.species.id : "-") + ":" + r + ":" + (pod.idd ? 1 : 0) + ":" + chapterFlags.map((f) => f.read + (f.glint ? "g" : "") + (f.sealed ? "s" : "")).join(",");
  return art(key, () => {
    const pb = new PB(r * 2 + 2, r * 2 + 2), c = r + 1;
    pb.ring(c, c, r, r, C.moss4, 1);
    if (!frame || !pod.idd) return pb;
    pb.ell(c, c, r * 0.16, r * 0.16, C.fog);
    const total = chapterFlags.reduce((a, f) => a + f.traits, 0) || 1, gap = 0.08; let a = -Math.PI / 2;
    for (const f of chapterFlags) {
      const span = (2 * Math.PI * f.traits) / total, a0 = a + gap / 2, a1 = a + span - gap / 2;
      if (a1 > a0) pb.arc(c, c, r, a0, a1, f.sealed ? C.stone : f.read ? C.aqua : C.mist, f.read ? 4 : f.sealed ? 2 : 1);
      if (f.sealed) { const m = (a0 + a1) / 2; pb.rect(c + Math.cos(m) * (r - 3) - 1, c + Math.sin(m) * (r - 3) - 1, 3, 3, C.night); }
      if (f.glint) { const m = (a0 + a1) / 2, st = starArt(false); pb.blit(st, c + Math.cos(m) * r - st.w / 2, c + Math.sin(m) * r - st.h / 2); }
      a += span;
    }
    return pb;
  });
}
// Chapter emblems, 16 px: coat (swirl), face (an eye), shape (a bean), legs & tail (a paw), movement (a trail),
// stamina (a leaf), character (a spark), glow (a star), charge (a bolt).
export function emblemArt(chapterId) { return art("emb" + chapterId, () => { const pb = new PB(16, 16), c = C.lamp;
  if (chapterId === "coat") { for (let a = 0; a < 12; a += 0.15) { const r = 1 + a * 0.55; pb.set(8 + Math.cos(a) * r, 8 + Math.sin(a) * r, c); } }
  else if (chapterId === "face") { pb.ell(8, 8, 7, 4.2, c); pb.ell(8, 8, 2.6, 2.6, C.wood0); pb.set(7, 7, c); }
  else if (chapterId === "shape") { pb.ell(8, 9, 6.5, 4.5, c); pb.ell(11, 6, 3.2, 3, c); }
  else if (chapterId === "legs-tail") { pb.ell(8, 11, 4.4, 3.4, c); pb.ell(2.5, 5.5, 1.6, 1.8, c); pb.ell(6, 2.5, 1.6, 1.8, c); pb.ell(10, 2.5, 1.6, 1.8, c); pb.ell(13.5, 5.5, 1.6, 1.8, c); }
  else if (chapterId === "movement") { for (let i = 0; i < 4; i++) pb.rect(1 + i * 4, 10 - (i % 2) * 5, 3, 3, c); pb.poly([[12, 3], [15, 6], [12, 9]], c); }
  else if (chapterId === "stamina") { pb.ell(8, 8, 3.5, 7, c, { rot: 0.6 }); pb.line(5, 13, 11, 3, C.wood0); }
  else if (chapterId === "character") { pb.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], c); }
  else if (chapterId === "glow") { pb.ell(8, 8, 5, 5, c); pb.ell(8, 8, 2.5, 2.5, C.white); }
  else if (chapterId === "charge") { pb.poly([[9, 0], [3, 9], [8, 9], [6, 16], [13, 6], [8, 6]], c); }
  else { pb.ell(8, 8, 6, 6, c); }
  pb.outline(() => C.wood0); return pb; }); }

// ---------- The room and the bench, as the stand-in v2 drew them (until the masters) ----------
export function cupArt(sel) { return art("cup" + sel, () => { const pb = new PB(52, 24); pb.ell(26, 14, 25, 9.5, C.feltD); pb.ell(26, 12, 23, 7.5, sel ? C.felt : C.feltD, { sh: [C.felt, C.wood0] }); pb.ell(26, 11, 17, 4.5, C.wood0); return pb; }); }
// A well in the rack (the instrument's list): a cool machined ring.
export function wellArt(sel, r = 34) { return art("well" + sel + r, () => { const pb = new PB(r * 2 + 4, r * 2 + 4), c = r + 2; pb.ell(c, c, r + 1, r + 1, sel ? C.stone : C.slate); pb.ell(c, c, r - 2, r - 2, C.night); pb.ell(c, c + 2, r - 6, r - 6, C.ink); return pb; }); }
export function crateArt(shell, n) { return art("crate" + shell + n, () => { const pb = new PB(96, 70);
  pb.rect(2, 6, 92, 62, C.wood3); for (let y = 6; y < 68; y += 12) pb.rect(2, y, 92, 1, C.wood2); pb.rect(2, 6, 92, 3, C.wood4); pb.rect(2, 64, 92, 4, C.wood1);
  pb.rect(8, 6, 6, 62, C.wood2); pb.rect(82, 6, 6, 62, C.wood2);
  pb.ell(48, 30, 15, 15, C[shell], { sh: [lite(C[shell]), shade(C[shell])] }); pb.ring(48, 30, 15, 15, C.wood1, 2);
  for (let i = 0; i < n; i++) pb.ell(30 + i * 18 + (3 - n) * 9, 54, 4.5, 5.5, C.paper);
  pb.ell(80, 14, 6, 6, C.red, { sh: [C.coral, C.wine] }); pb.outline(() => C.wood0); return pb; }); }
export function probeArt(s) { return art("probe" + s, () => { const pb = new PB(28 * s, 28 * s), E = (x, y, r, c) => pb.ell(x * s, y * s, r * s, r * s, C[c]);
  E(14, 14, 13, "sky"); E(14, 14, 11, "paper"); E(14, 14, 7, "sky"); E(14, 14, 5, "paper"); pb.line(14 * s, 14 * s, 23 * s, 6 * s, C.sea, Math.max(1, s * 2)); pb.rect(18 * s, 17 * s, 3 * s, 3 * s, C.orange);
  pb.rich(s); pb.outline(() => C.ink); return pb; }); }
export function leafArt(f, big) { const n = Math.round(f * 8); return art("leaf" + n + big, () => { const L = big ? 36 : 14, W = big ? 16 : 6, pb = new PB(W + 2, L + 2), cx = (W + 2) / 2, cy = (L + 2) / 2;
  pb.ell(cx, cy, W / 2, L / 2, C.moss3); pb.ell(cx, cy, W / 2, L / 2, C.leaf, { clip: (x, y) => y >= (L + 2) * (1 - n / 8), sh: [C.sprout, C.forest] });
  pb.line(cx, 2, cx, L, n >= 8 ? C.forest : C.moss1); pb.outline(() => C.moss0); return pb; }); }
export function domeArt(w, h, glow, part) { return art("dome" + w + "x" + h + glow + (part || ""), () => { const pb = new PB(w, h), cx = w / 2;
  if (part !== "base") { pb.ell(cx, h * 0.58, w * 0.46, h * 0.56, glow ? C.lamp : C.moss2, { clip: (x, y) => y < h * 0.82, dith: [glow ? C.cream : C.moss3, 5] });
    pb.ring(cx, h * 0.58, w * 0.46, h * 0.56, C.glassD, 2, 0, (x, y) => y < h * 0.82); pb.ring(cx, h * 0.58, w * 0.4, h * 0.5, C.glass, 1, 0, (x, y) => y < h * 0.4 && x < cx); }
  if (part !== "glass") { pb.rect(w * 0.04, h * 0.8, w * 0.92, h * 0.12, C.wood3); pb.rect(w * 0.04, h * 0.8, w * 0.92, 3, C.wood4); pb.rect(w * 0.08, h * 0.92, w * 0.84, h * 0.07, C.wood1); }
  return pb; }); }
// The bud: a glowing bean, never an embryo (decided).
export function budArt(stage) { return art("bud" + stage, () => { const pb = new PB(70, 70); pb.ell(35, 40, stage ? 22 : 13, stage ? 24 : 15, C.cream, { dith: [C.lamp, 6] }); pb.ell(35, 40, stage ? 15 : 8, stage ? 17 : 10, C.amber, { sh: [C.yellow, C.orange] });
  if (stage) { pb.ell(41, 22, 4, 9, C.sprout, { rot: 0.5 }); pb.ell(29, 24, 3, 7, C.sprout, { rot: -0.6 }); } pb.outline(() => C.gold); return pb; }); }
export const lampArt = () => art("lamp", () => { const pb = new PB(40, 72); pb.poly([[6, 30], [34, 30], [28, 10], [12, 10]], C.amber); pb.poly([[12, 10], [28, 10], [26, 4], [14, 4]], C.gold);
  pb.rect(18, 30, 4, 32, C.wood2); pb.ell(20, 66, 14, 5, C.wood3); pb.ell(20, 33, 9, 3, C.cream); pb.rich(1); pb.outline(() => C.wood0); return pb; });
export const bedArt = () => art("bed", () => { const pb = new PB(150, 44); pb.ell(75, 26, 74, 17, C.feltD); pb.ell(75, 22, 70, 14, C.felt, { sh: [C.coral, C.feltD] }); pb.ell(75, 22, 52, 8, C.feltD); pb.outline(() => C.wood0); return pb; });
export const gateArt = () => art("gate", () => { const pb = new PB(76, 70); pb.rect(4, 8, 68, 58, C.moss3); for (let i = 0; i < 6; i++) pb.rect(10 + i * 11, 8, 4, 58, C.wood3); pb.rect(4, 18, 68, 4, C.wood2); pb.rect(4, 50, 68, 4, C.wood2);
  pb.ell(38, 8, 34, 8, C.wood3, { clip: (x, y) => y < 9 }); for (let i = 0; i < 9; i++) pb.ell(6 + i * 8, 64, 4, 5, C.leaf, { sh: [C.sprout, C.forest] }); pb.outline(() => C.wood0); return pb; });
// The return hatch of the rack: a slot with a leaf mark.
export const hatchArt = () => art("hatch", () => { const pb = new PB(120, 56); pb.rect(2, 4, 116, 48, C.slate); pb.rect(6, 8, 108, 40, C.night); pb.rect(10, 24, 100, 8, C.void);
  pb.ell(60, 20, 5, 10, C.leaf, { rot: 0.6, sh: [C.sprout, C.forest] }); pb.outline(() => C.ink); return pb; });
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ramp = (cols, t, x, y) => { const f = Math.max(0, Math.min(0.999, t)) * (cols.length - 1), i = Math.floor(f); return C[cols[bay(x, y) < (f - i) * 16 ? i + 1 : i]]; };
export function vivArt(w, h) { return art("viv" + w + "x" + h, () => {
  const pb = new PB(w, h), gy = Math.round(h * 0.62);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const lamp = Math.hypot((x - w * 0.45) / (w * 0.55), (y - h * 0.05) / (h * 0.7)), wave = gy + Math.round(Math.sin(x / 47) * 6 + Math.sin(x / 13) * 2);
    let c; if (y < wave) c = ramp(["moss2", "moss3", "moss4"], 1.2 - lamp, x, y);
    else { const d = y - wave; c = d < 3 ? C.grass : d < 7 ? (bay(x, y) < 8 ? C.grass : C.leaf) : d < 30 ? (bay(x, y) < 5 ? C.leaf : C.forest) : bay(x, y) < 7 ? C.soil : C.bark; }
    pb.p[y * w + x] = c;
  }
  const R2 = mulberry32(w * 31 + h);
  for (let i = 0; i < Math.round(w / 40); i++) { const x = R2() * w, ht = 40 + R2() * 90; for (let j = 0; j < 5; j++) pb.ell(x + (R2() - 0.5) * 18, gy - ht * (j / 5) - 6, 5 + R2() * 4, 12 + R2() * 6, j % 2 ? C.moss5 : C.moss4, { rot: (R2() - 0.5) * 0.8 }); }
  for (let i = 0; i < Math.round(w / 90); i++) { const x = 40 + R2() * (w - 80), y = gy + 18 + R2() * (h - gy - 50); pb.ell(x, y, 18 + R2() * 14, 9 + R2() * 6, C.rock, { sh: [C.rockL, C.stone] }); }
  pb.ell(w * 0.78, gy + 40, 46, 13, C.stone); pb.ell(w * 0.78, gy + 38, 40, 9, C.sky, { sh: [C.ice, C.river] });
  pb.ell(w * 0.14, gy + 6, 34, 18, C.soil, { clip: (x, y) => y < gy + 10 }); pb.ell(w * 0.14, gy + 8, 22, 12, C.void, { clip: (x, y) => y < gy + 10 });
  for (let i = 0; i < Math.round(w / 22); i++) { const x = R2() * w, y = gy + 4 + R2() * (h - gy - 10); for (let j = 0; j < 3; j++) pb.line(x, y, x + (j - 1) * 3, y - 6 - R2() * 6, C.sprout); }
  for (let x = 0; x < w; x++) { pb.set(x, 0, C.glassD); pb.set(x, 1, C.glass); pb.set(x, h - 1, C.wood1); pb.set(x, h - 2, C.wood2); }
  for (let y = 0; y < h; y++) { pb.set(0, y, C.glassD); pb.set(w - 1, y, C.glassD); pb.set(1, y, C.glass); }
  for (let y = 12; y < h * 0.5; y++) { pb.set(18 + y * 0.15, y, C.glass); if (y % 3) pb.set(24 + y * 0.15, y, C.glass); }
  return pb; }); }
export const twinkle = () => (motion() ? Math.floor(clock.now / 300) % 3 : 0);
export { upPB };
