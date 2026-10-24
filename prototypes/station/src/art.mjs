// The placeholder register and every drawn stand-in. Engineers do not do art (decided): everything here
// stands in for a master the art director has not made yet, stays plainly a placeholder, and is listed
// in PLACEHOLDERS so masters replace them one by one. The mibi itself is the placeholder of the
// placeholder brief (plain.mjs, the stylised rig pass), rendered from the genome through the workbench.
import { PB, C, RGB, art, fromRGBA, cropPB, scalePB, flipPB, upPB, bay, lite, shade, clock, motion } from "./pixels.mjs";
import { buildIndividual, shapeTrait, genomeDigest, stampGenome, stampFrameOf } from "./genome.mjs";
import { fitCamera, resolveCamera, VIEWS } from "../../workbench/framework/raster.mjs";
import { plainRender, BG } from "../../workbench/framework/plain.mjs";
import { resolveIndividual } from "../../workbench/framework/resolve.mjs";
import { buildBody } from "../../workbench/framework/rig.mjs";
import { validateBody } from "../../workbench/framework/validate.mjs";
import { LOCI } from "../../workbench/framework/catalogue.mjs";
import { treat } from "./unknown.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";

export const PLACEHOLDERS = [
  { id: "mibi", what: "every mibi and founder: the placeholder of the plain renderer (flat slots, outline, no face, no material), quantised to the palette; on Home a resident (144×152 or 104×112) and a sleeper (fitted in 96×88) are the same stand-in, standing and never mirrored, with no nap pose; a juvenile shows the art director's signed juvenile stand-in at its size (mibi-juvenile-<species>-<w>x<h>, masters-pods be36e701) and an adult or elder its species' signed adult stand when placed (mibi-adult-<species>-<w>x<h>, the adult plan), so this placeholder is Create's founder, and any mibi whose stand-in is not placed", until: "the Grow painting lands (M3), and the rig's own placeholder brief is finished" },
  { id: "stand-layers", what: "the layered Loika stands (S01 adult at 304×312, 144×152, 96×96 and 48×48; juvenile at 304×312, 104×112, 96×96 and 48×48; in the poses anchor and curl), composed per mibi from its drawn looks (looks.mjs, layered-stand.mjs): the signed version 4 bare base key of each pose (anchor, curl), the crest overlay, the patches and the stripes layers (ui/assets/stands, cut by tools/make-stand-layers.py). Stand-ins: the 16 eye-ring overlays (thin, wide; ui/assets/stands/index.json standIns, from layers/register.json) draw as the base's \"between\" rings; colour is the charcoal base until the ramps", until: "the eye-ring overlays (hand cut) and the colour ramps (T-20261016-203)" },
  { id: "habit-key-owed", what: "a pose card, thumb or window whose habit has no signed held key: the derived stand (S01 shake-dry and calm; every S02 and S03 habit)", until: "the habit's signed key, cut by make-stand-layers.py" },
  { id: "pod", what: "the pod placeholder sprites: hand-drawn, per size class and state, coloured per species by remap (prototypes/ui/assets/placeholders/pod)", until: "the pod renderer's masters (research-loop.md §6)" },
  { id: "trait-picture", what: "a trait's picture: a close-up of this pod's mibi in the placeholder, cropped around the part the trait names", until: "the Grow painting's close-ups" },
  { id: "seed", what: "the misty seed: the hidden look as a frosted close-up in a pearl", until: "the seed master" },
  { id: "stamp", what: "the genome stamp rastered by genome-stamp/src/stamp.mjs and quantised to the palette", until: "the stamp's label art (PV-D-r3-a4)" },
  { id: "ring", what: "the progress ring: a centre dot, one arc per chapter sized by its traits, a star for a glint, a notch for a sealed chapter", until: "the pod list master" },
  { id: "chapter-emblem", what: "one 16 px emblem per chapter", until: "the chapter rail master" },
  { id: "page", what: "the chapter page: a deep pane with frost where nothing is known", until: "the research bench master" },
  { id: "home-glass-by-light", what: "Home's glass (640×488, home-glass-<light>) and Idle's Vivarium (1024×568, idle-vivarium-<light>) and the with-you bed (192×56, home-bed-<light>): one slot a light (dawn, day, dusk, night) from frame.json light and the picture maps; the flat plates of the colours show only while a light's slot is empty (all four lights have their masters today)", until: "the masters of a light, if one is not placed" },
  { id: "library-stage-spread-1024x522", what: "the Library spread's stage, 1024×522 at (0, 40): flat: the ground, the boards in bark, two pages in paper edged in clay, sixteen frames each a bark outline round an 8 px sand mat, the caption rules in clay; the marker and the margin bands are not drawn (fix 6)", until: "the spread stage master" },
  { id: "spread-plate-S01..S16-80x96", what: "a found species' plate, 80×96: the code rig's type specimen (speciesArt), for all sixteen", until: "the sixteen spread plate masters" },
  { id: "spread-study-S01..S16-80x96", what: "a met species' study, 80×96: the same specimen reduced to its 1 px outline in stone, transparent inside", until: "the sixteen spread study masters" },
  { id: "spread-gilt-corner-16x16", what: "the gilt corner of a portrayed species: a 16×16 clay L, 4 px thick, along the top and right edges", until: "the gilt corner master" },
  { id: "spread-seal-16x16", what: "the seal of a complete guide: a 16×16 sand disc with a 1 px bark edge", until: "the seal master" },
  { id: "cargo-bay-992x320", what: "Cargo's painted bay 992×320 (open) and its door cargo-bay-shut-976x304: placed 1:1; drawn in every state, the door by what the bay holds. A master missing draws nothing (never code-drawn)", until: "the art director's 1× sign in Cargo's whole-screen captures (placed, status new)" },
  { id: "cargo-rack-992x168", what: "Cargo's rack insert 992×168 at (16, 384): the sage strip with six fitted wells, placed 1:1; a master missing draws nothing", until: "the art director's 1× sign (placed, status new)" },
  { id: "cargo-report-plate-560x{128..288}", what: "the report plate set into the bay's door, 21 exact heights (128 to 288 by 8), placed 1:1; a height missing draws nothing", until: "the art director's 1× sign (placed, status new)" },
  { id: "crate-shadow-256x24, crate-shadow-432x24, cargo-store-shadow-72x21", what: "the contact shadows under the bay's crates, the opening's closer and the haul's containers, placed 1:1; a master missing draws nothing", until: "the art director's 1× sign (placed, status new)" },
  { id: "founder-304x312", what: "Create's founder, 304×312: the plain renderer's placeholder (the stylised rig pass), frosted where a chapter is unread; with nothing read the whole of it on its own outline; the roll's dither is composed from two of them", until: "the Grow painting and the rig's own placeholder brief" },
  { id: "roll-128x72", what: "the roll's pictures, roll-{species}-{trait}-{look}-128x72: one PH plate for each look; the ring, the notches and the order are the real ones", until: "the roll close-ups cut from the paintings" },
  { id: "icons", what: "the material icons and the Companion mark", until: "the icon set" },
];

// ---------- The material icons ----------
// The material icons at any pixel size (Energy a bolt, Data a diamond, Essence a drop), the Companion mark.
export const ICON = {
  energy: (n = 14) => art("i-energy" + n, () => { const pb = new PB(n, n), k = n / 14; pb.poly([[8, 0], [3, 8], [6.5, 8], [5, 14], [11, 5.5], [7.5, 5.5]].map(([x, y]) => [x * k, y * k]), C.amber); pb.poly([[8, 0], [3, 8], [6.5, 8], [6.5, 5.5], [7.5, 5.5]].map(([x, y]) => [x * k, y * k]), C.yellow); pb.outline(() => C.rust); return pb; }),
  data: (n = 14) => art("i-data" + n, () => { const pb = new PB(n, n), c = n / 2; pb.poly([[c, 0.5], [n - 0.5, c], [c, n - 0.5], [0.5, c]], C.sky); pb.poly([[c, 0.5], [n - 0.5, c], [c, c]], C.ice); pb.poly([[0.5, c], [c, n - 0.5], [c, c]], C.river); pb.outline(() => C.sea); return pb; }),
  essence: (n = 14) => art("i-ess" + n, () => { const pb = new PB(n, n), c = n / 2; pb.poly([[c, 0.5], [n * 0.85, c * 1.15], [c, n - 0.5], [n * 0.15, c * 1.15]], C.grass); pb.ell(c, c * 1.2, n * 0.3, n * 0.3, C.grass, { sh: [C.lime, C.leaf] }); pb.set(Math.round(c - n * 0.18), Math.round(c * 0.7), C.white); pb.outline(() => C.forest); return pb; }),
  // ✕ is a decided string and Inter has no glyph for it: it is set as this sprite, at the size of the text it sits in
  cross: (n = 14) => art("i-cross" + n, () => { const pb = new PB(n, n), t = Math.max(2, Math.round(n / 6)), m = Math.round(n * 0.15); for (let i = 0; i < n - 2 * m; i++) { pb.rect(m + i, m + i - (t >> 1), t, t, C.red); pb.rect(n - 1 - m - i - t + 1, m + i - (t >> 1), t, t, C.red); } return pb; }),
  star: (n = 14) => (n >= 18 ? starArt(true) : starArt(false)),
  comp: () => art("i-comp", () => { const pb = new PB(14, 20); pb.rect(1, 0, 12, 20, C.sand); pb.rect(3, 2, 8, 9, C.ink); pb.ell(9.5, 15, 2, 2, C.orange); pb.ell(4.5, 15, 1.6, 1.6, C.teal); pb.outline(() => C.bar); return pb; }),
};
export const starArt = (big) => art("star" + big, () => { const r = big ? 9 : 5, pb = new PB(r * 2 + 1, r * 2 + 1);
  pb.poly([[r, 0], [r + r * 0.28, r - r * 0.28], [r * 2, r], [r + r * 0.28, r + r * 0.28], [r, r * 2], [r - r * 0.28, r + r * 0.28], [0, r], [r - r * 0.28, r - r * 0.28]], C.cream); pb.ell(r + 0.5, r + 0.5, r * 0.3, r * 0.3, C.white); pb.outline(() => C.gold); return pb; });
export const famArt = () => art("fam", () => { const pb = new PB(26, 16); pb.ring(8, 8, 7, 7, C.focus, 2); pb.ring(17, 8, 7, 7, C.focus, 2); pb.outline(() => C.panel); return pb; });
export const baseArt = () => art("base", () => { const pb = new PB(70, 10); pb.rect(2, 0, 66, 7, C.bevel); pb.rect(2, 0, 66, 2, C.metal); pb.rect(0, 7, 70, 3, C.bar); return pb; });

// ---------- The mibi placeholder: the plain renderer on the genome, quantised ----------
const BUILT = new Map();
// `read`: the chapter ids read so far (a Set or an array), or undefined for every chapter read, the mibi's own values. While Glow is unread its emission is drawn at none, and while Charge is unread its phase at
// the look "solid"; once read, the mibi's own value. The genome is never changed: the override is on the resolved values the rig draws from.
export function builtOf(frame, genome, read) {
  const hide = hiddenOf(frame, read), k = genomeDigest(genome) + (hide.length ? "~" + hide.join("+") : ""); let b = BUILT.get(k);
  if (!b) {
    try {
      if (!hide.length) b = buildIndividual(frame, genome);
      else {
        const resolved = resolveIndividual(frame, genome), v = resolved.values; resolved.species = frame.species.id;
        if (hide.includes("glow") && "appearance.emission-brightness" in v) v["appearance.emission-brightness"] = 0;
        if (hide.includes("charge") && "physiology.phase" in v) v["physiology.phase"] = LOCI.get("physiology.phase").alleles.find((a) => a.id === "solid").value;
        const scene = buildBody(resolved); b = { resolved, scene, validation: validateBody(scene) };
      }
    } catch (e) { b = { error: e.message }; }
    BUILT.set(k, b);
  }
  return b;
}
const has = (read, id) => (read instanceof Set ? read.has(id) : read.includes(id));
// the chapters whose effect is not drawn yet: Glow and Charge, while the frame has them and they are unread
const hiddenOf = (frame, read) => (read === undefined ? [] : ["glow", "charge"].filter((id) => frame.chapters.some((c) => c.id === id) && !has(read, id)));
// the genome as drawn: its digest, with the unread Glow and Charge marked (their emission and phase are not the mibi's own while unread)
export const drawnDigest = (frame, genome, read) => { const hide = hiddenOf(frame, read); return genomeDigest(genome) + (hide.length ? "~" + hide.map((c) => c[0]).join("") : ""); };
// The cast shadow of the plain pass lies on the segment from the ground to its shade; those pixels are cleared.
const isShadow = (r, g, b) => { const t = (BG[0] - r) / 50; return t > 0.02 && t < 1 && Math.abs(g - (BG[1] - 55 * t)) <= 3 && Math.abs(b - (BG[2] - 60 * t)) <= 3; };
function renderPB(scene, camera, device) {
  const img = plainRender(scene, camera, { device, palette: RGB }), pb = fromRGBA(img, { transparent: BG, tol: 1 });
  for (let i = 0; i < pb.p.length; i++) if (pb.p[i] >= 0 && isShadow(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2])) pb.p[i] = -1;
  return pb;
}
// Fix 6 N4: the founder carries no ink outside its body's own connected silhouette. The plain pass's cast shadow is cleared by colour tolerance, and the pixels that miss it are left as isolated dots on the shadow's ellipse; a component of fewer than
// `min` opaque pixels (8-connected) is residue and goes. Applied to the founder's picture only (founderArt), so no other picture of the rig moves.
export function dropSpecks(pb, min = 8) {
  const { w, h, p } = pb, seen = new Uint8Array(w * h), stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (seen[s0] || p[s0] < 0) continue;
    const comp = []; seen[s0] = 1; stack.push(s0);
    while (stack.length) { const q = stack.pop(); comp.push(q); const x = q % w, y = (q - x) / w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const n = ny * w + nx; if (!seen[n] && p[n] >= 0) { seen[n] = 1; stack.push(n); } } }
    if (comp.length < min) for (const q of comp) p[q] = -1;
  }
  return pb;
}
const blobArt = (w, h) => { const pb = new PB(w, h); pb.ell(w / 2, h / 2, w * 0.4, h * 0.4, C.frostD, { sh: [C.frost, C.frostS] }); pb.outline(() => C.stone); return pb; };
// A mibi at w×h in a view ("portrait" faces viewer-left; "three-quarter" the flank), transparent around it.
export function mibiArt(frame, genome, w, h, view = "portrait", flip = false) {
  const key = "mb" + genomeDigest(genome) + ":" + w + "x" + h + ":" + view;
  const pb = art(key, () => { const b = builtOf(frame, genome); if (b.error || b.validation.status !== "valid") return blobArt(w, h);
    return renderPB(b.scene, fitCamera(b.scene, view, [w, h], 0.06), "station"); });   // the Station's pass at every size: its ground stays the plain ground, so it clears to a sprite
  return flip ? art(key + "f", () => flipPB(pb)) : pb;
}
// The species' face: its type specimen (the frame's typical body) in the placeholder.
export function speciesArt(frame, w, h, view = "portrait") { return frame.typeSpecimen?.genome ? mibiArt(frame, frame.typeSpecimen.genome, w, h, view) : blobArt(w, h); }

// ---------- The Library spread's placeholders (library.json spread.placeholders): the stage, the gilt corner, the seal and a species' study ----------
// The stage, flat: the ground, the boards in bark, two pages in paper edged in clay, sixteen frames each a bark outline round an 8 px sand mat and a paper inside, the caption rules in clay; the cloth marker and the margin bands are not drawn: the painted stage carries them (fix 6).
// Coordinates are the spec's (library.json spread.regions.stage.parts, leftPage and rightPage places), taken off the stage's origin (0, 40).
export function spreadStageArt(spec) {
  const R = spec.spread.regions, oy = R.stage.rect[1], cl = spec.spread.colours, pb = new PB(R.stage.rect[2], R.stage.rect[3]), at = (r) => [r[0], r[1] - oy, r[2], r[3]], col = (n) => C[n];
  const box = (x, y, w, h, c) => { pb.rect(x, y, w, 1, c); pb.rect(x, y + h - 1, w, 1, c); pb.rect(x, y, 1, h, c); pb.rect(x + w - 1, y, 1, h, c); };   // a solid 1 px edge
  pb.rect(0, 0, pb.w, pb.h, col("ground")); { const [x, y, w, h] = at(R.stage.parts.boards); pb.rect(x, y, w, h, col(cl.placeholderBoards)); }
  for (const pg of R.stage.parts.pages) { const [x, y, w, h] = at(pg); pb.rect(x, y, w, h, col(cl.placeholderPaper)); box(x, y, w, h, col(cl.placeholderEdge)); }
  for (const key of ["leftPage", "rightPage"]) for (const r of R[key].rects) {
    const [x, y, w, h] = at(r);
    pb.rect(x, y, w, h, col(cl.placeholderMat)); pb.rect(x + 8, y + 8, 80, 96, col(cl.placeholderPaper)); box(x, y, w, h, col(cl.placeholderFrame));
    pb.rect(x, y + 144, 96, 1, col(cl.placeholderEdge));   // the caption rule, 144 px under the frame's top (y 256 and 440 on the screen)
  }
  return pb;
}
// The gilt corner: a 16 × 16 clay L, 4 px thick, along the top and right edges. The seal: a 16 × 16 sand disc with a 1 px bark edge.
export function spreadGiltArt(spec) { const pb = new PB(16, 16), c = C[spec.spread.colours.placeholderGilt]; pb.rect(0, 0, 16, 4, c); pb.rect(12, 0, 4, 16, c); return pb; }
export function spreadSealArt(spec) { const pb = new PB(16, 16), cl = spec.spread.colours; pb.ell(8, 8, 8, 8, C[cl.placeholderFrame]); pb.ell(8, 8, 7, 7, C[cl.placeholderSeal]); return pb; }
// A met species' study: the type specimen at 80 × 96 reduced to its 1 px outline in stone, transparent inside (a stray opaque pixel with no opaque neighbour is no outline and is left out).
export function speciesStudyArt(frame, spec) {
  return art("study" + frame.species.id + ":80x96", () => { const base = speciesArt(frame, 80, 96), pb = new PB(80, 96), stone = C[spec.spread.colours.placeholderStudy];
    for (let y = 0; y < 96; y++) for (let x = 0; x < 80; x++) if (base.get(x, y) >= 0 && (base.get(x - 1, y) >= 0 || base.get(x + 1, y) >= 0 || base.get(x, y - 1) >= 0 || base.get(x, y + 1) >= 0) && (base.get(x - 1, y) < 0 || base.get(x + 1, y) < 0 || base.get(x, y - 1) < 0 || base.get(x, y + 1) < 0)) pb.set(x, y, stone);
    return pb; });
}

// ---------- Trait pictures: a close-up of this pod's mibi around the part the trait names ----------
const PART_OF = [
  [/crown|crest|horn|antenna/, ["crown", "horn", "antenna", "head"]], [/eye/, ["eye", "head"]], [/snout|muzzle|beak|jaw/, ["muzzle", "beak", "jaw", "head"]], [/ear/, ["ear", "head"]], [/head|face/, ["head"]],
  [/leg|feet|foot|stride|pace|gait|waddle|turning|weave/, ["leg", "ray", "foot-skirt"]], [/tail/, ["tail", "tail-bulb"]], [/wing|fin|flap/, ["flap", "fin"]], [/cap/, ["cap"]], [/shell/, ["shell", "wing-case"]],
];
const partsFor = (traitId) => (PART_OF.find(([re]) => re.test(traitId)) || [null, null])[1];
// Where an unread chapter shows on the founder (technical, Fix 1b part 2): "body" the whole body; a list of groups, each a list of part names (a part matches itself and its "-" children: "tail" covers tail-bulb; S14's
// foot-skirt is Shape, not the leg group); null a chapter that draws nothing (the doings, and Glow and Charge, which change the emission and the phase instead). An unknown chapter id throws, as policyOf does.
export const UNREAD_REGION = { coat: "body", shape: "body", face: [["head", "muzzle", "beak", "eye", "ear", "crown", "horn", "antenna"]], "legs-tail": [["leg", "ray"], ["tail"]], movement: null, stamina: null, character: null, glow: null, charge: null };
const regionOf = (id) => { if (!Object.hasOwn(UNREAD_REGION, id)) throw new Error(`chapter ${id} is in no unread-region row (station/src/art.mjs UNREAD_REGION): the programme lead places a new chapter`); return UNREAD_REGION[id]; };
// How a founder is drawn for the chapters read so far: "ghost" when nothing is read; "veil" over the unread looks: Coat unread the whole body in its luma (id group coat, which wins a tie with Shape), Shape unread the whole body (body); the whole body
// absorbs the part groups, so a group is never named beside it; otherwise the part groups of the unread looks (face, leg, tail) in their declared order, not the frame's chapter order. Otherwise "clear" (only doings, Glow or Charge unread). `boxes` are what
// to veil: [{ whole: true }] for the body, else [{ parts }] per group. With the drawn body's `scene` a group with no part on it leaves the id (S07 and S15 have no tail, S01 no tail part), and with no group left the treatment is clear. It draws nothing.
const PART_GROUPS = [["face", UNREAD_REGION.face[0]], ["leg", UNREAD_REGION["legs-tail"][0]], ["tail", UNREAD_REGION["legs-tail"][1]]];   // the part groups' tokens and parts, in the order the id names them
const hasPart = (scene, parts) => scene.nodes.some((n) => { const q = n.part ?? n.id; return parts.some((p) => q === p || q.startsWith(p + "-")); });
export function treatmentOf(frame, read, scene = null) {
  const ids = frame.chapters.map((c) => c.id), readIds = [...read];
  for (const id of [...ids, ...readIds]) regionOf(id);
  if (!readIds.length) return { mode: "ghost", boxes: [], groups: [], luma: false };
  const unreadIds = ids.filter((id) => !readIds.includes(id)), unread = unreadIds.map(regionOf).filter(Boolean);
  if (!unread.length) return { mode: "clear", boxes: [], groups: [], luma: false };
  if (unread.includes("body")) { const luma = unreadIds.includes("coat"); return { mode: "veil", boxes: [{ whole: true }], groups: [luma ? "coat" : "body"], luma }; }   // Coat wins a tie with Shape: its colour is never drawn
  const wanted = new Set(unread.flat().map((g) => PART_GROUPS.find(([, parts]) => parts.join() === g.join())[0])), groups = PART_GROUPS.filter(([tok, parts]) => wanted.has(tok) && (!scene || hasPart(scene, parts)));
  if (!groups.length) return { mode: "clear", boxes: [], groups: [], luma: false };
  return { mode: "veil", boxes: groups.map(([, parts]) => ({ parts })), groups: groups.map(([tok]) => tok), luma: false };
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// The box (in image pixels) the named parts occupy under a camera; the whole body when none match.
function partBox(scene, camera, parts) {
  const cam = resolveCamera(scene, camera), view = VIEWS[cam.view], [W, H] = cam.size;
  const pick = (node) => { const p = node.part ?? node.id; return !parts || parts.some((q) => p === q || p.startsWith(q + "-")); };
  let nodes = scene.nodes.filter(pick); if (!nodes.length) nodes = scene.nodes;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) for (const v of n.mesh.vertices) { const x = W / 2 + (dot(v, view.right) - cam.center[0]) * cam.scale, y = H / 2 - (dot(v, view.up) - cam.center[1]) * cam.scale; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, whole: !parts || nodes.length === scene.nodes.length };
}
const PIC_BG = C.bone;
// The Pods pictures sit on the page's own pane (`deep`, as the spec names it): a plain flat ground, nothing of a card (PH §0).
// Deliberately not the migration table's creamT to bone: the seed pictures key out this ground, and a bone ground is the cream card the art director struck.
export const PIC_GROUND = C.deep;
const pictureGround = (w, h) => { const pb = new PB(w, h); pb.rect(0, 0, w, h, PIC_GROUND); return pb; };
// The rig's scene without its eye parts: a stand-in close-up draws no face (PH §0).
const faceless = (scene) => ({ ...scene, nodes: scene.nodes.filter((n) => (n.part ?? n.id) !== "eye") });
// A trait's close-up rendered by the rig's camera at the picture's own size (the layout spec's rule: never a crop of a
// larger render enlarged). The camera is set on the part the trait names (the whole body when no part matches), its scale
// chosen so the part fills w×h with the old crop's margins; the placeholder renderer draws it once, at that size.
export function closeUpPB(frame, genome, traitId, w, h) {
  const pb = pictureGround(w, h), b = builtOf(frame, genome);
  if (b.error || b.validation.status !== "valid") { pb.blit(blobArt(w, h), 0, 0); return pb; }
  const scene = faceless(b.scene), base = fitCamera(scene, "portrait", [300, 310], 0.06), box = partBox(scene, base, partsFor(traitId)), pad = box.whole ? 0.04 : 0.3;
  const bw = Math.max(box.x1 - box.x0, 40) * (1 + pad), bh = Math.max(box.y1 - box.y0, 40) * (1 + pad), s0 = base.scale;
  const center = [base.center[0] + ((box.x0 + box.x1) / 2 - 150) / s0, base.center[1] - ((box.y0 + box.y1) / 2 - 155) / s0];
  pb.blit(renderPB(scene, { view: "portrait", scale: s0 * Math.min(w / bw, h / bh), center, size: [w, h] }, "station"), 0, 0);
  return pb;
}
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
export const stampSize = (frame, genome = null) => stampFrameOf(frame, genome) ? stampFrameOf(frame, genome).payloadBits : 0;

// ---------- Pods from one renderer: the frame's four parameters and the glyph ----------
// The progress ring around a pod in the list: the centre at Identify; an arc per chapter sized by its traits;
// filled when read, a hairline when not; a star for a glint; a notch for a sealed chapter. No digits.
export function ringArt(frame, pod, chapterFlags, r = 30) {
  const key = "ring" + (frame ? frame.species.id : "-") + ":" + r + ":" + (pod.idd ? 1 : 0) + ":" + chapterFlags.map((f) => f.read + (f.glint ? "g" : "") + (f.sealed ? "s" : "")).join(",");
  return art(key, () => {
    const pb = new PB(r * 2 + 2, r * 2 + 2), c = r + 1;
    pb.ring(c, c, r, r, C.hairline, 1);
    if (!frame || !pod.idd) return pb;
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
// Chapter emblems: coat (swirl), face (an eye), shape (a bean), legs & tail (a paw), movement (a trail), stamina (a leaf),
// character (a spark), glow (a star), charge (a bolt). Drawn at the size asked (16 for the screens not yet moved, 24 on
// the rail and pages): the shapes are redrawn from their parameters at that size, never a 16 px picture enlarged.
export function emblemArt(chapterId, n = 16) { return art("emb" + chapterId + (n === 16 ? "" : ":" + n), () => { const pb = new PB(n, n), c = C.focus, k = n / 16, K = (v) => v * k, th = Math.max(1, Math.round(k));
  const E = (x, y, rx, ry, col, o) => pb.ell(K(x), K(y), K(rx), K(ry), col, o), P = (pts, col) => pb.poly(pts.map(([x, y]) => [K(x), K(y)]), col);
  if (chapterId === "coat") { for (let a = 0; a < 12; a += 0.15 / k) { const r = 1 + a * 0.55; pb.rect(Math.floor(K(8) + Math.cos(a) * K(r) - (th - 1) / 2), Math.floor(K(8) + Math.sin(a) * K(r) - (th - 1) / 2), th, th, c); } }
  else if (chapterId === "face") { E(8, 8, 7, 4.2, c); E(8, 8, 2.6, 2.6, C.panel); pb.rect(K(7), K(7), th, th, c); }
  else if (chapterId === "shape") { E(8, 9, 6.5, 4.5, c); E(11, 6, 3.2, 3, c); }
  else if (chapterId === "legs-tail") { E(8, 11, 4.4, 3.4, c); E(2.5, 5.5, 1.6, 1.8, c); E(6, 2.5, 1.6, 1.8, c); E(10, 2.5, 1.6, 1.8, c); E(13.5, 5.5, 1.6, 1.8, c); }
  else if (chapterId === "movement") { for (let i = 0; i < 4; i++) pb.rect(K(1 + i * 4), K(10 - (i % 2) * 5), K(3), K(3), c); P([[12, 3], [15, 6], [12, 9]], c); }
  else if (chapterId === "stamina") { E(8, 8, 3.5, 7, c, { rot: 0.6 }); pb.line(K(5), K(13), K(11), K(3), C.panel, th); }
  else if (chapterId === "character") { P([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], c); }
  else if (chapterId === "glow") { E(8, 8, 5, 5, c); E(8, 8, 2.5, 2.5, C.white); }
  else if (chapterId === "charge") { P([[9, 0], [3, 9], [8, 9], [6, 16], [13, 6], [8, 6]], c); }
  else { E(8, 8, 6, 6, c); }
  pb.outline(() => C.panel); return pb; }); }

// ---------- The room and the bench, as the stand-in v2 drew them (until the masters) ----------
export function cupArt(sel) { return art("cup" + sel, () => { const pb = new PB(52, 24); pb.ell(26, 14, 25, 9.5, C.ground); pb.ell(26, 12, 23, 7.5, sel ? C.panel : C.ground, { sh: [C.panel, C.panel] }); pb.ell(26, 11, 17, 4.5, C.panel); return pb; }); }
// A well in the rack (the instrument's list): a cool machined ring.
export function wellArt(sel, r = 34) { return art("well" + sel + r, () => { const pb = new PB(r * 2 + 4, r * 2 + 4), c = r + 2; pb.ell(c, c, r + 1, r + 1, sel ? C.stone : C.slate); pb.ell(c, c, r - 2, r - 2, C.night); pb.ell(c, c + 2, r - 6, r - 6, C.ink); return pb; }); }
export function crateArt(shell, n) { return art("crate" + shell + n, () => { const pb = new PB(96, 70);
  pb.rect(2, 6, 92, 62, C.bevel); for (let y = 6; y < 68; y += 12) pb.rect(2, y, 92, 1, C.hairline); pb.rect(2, 6, 92, 3, C.metal); pb.rect(2, 64, 92, 4, C.bar);
  pb.rect(8, 6, 6, 62, C.hairline); pb.rect(82, 6, 6, 62, C.hairline);
  pb.ell(48, 30, 15, 15, C[shell], { sh: [lite(C[shell]), shade(C[shell])] }); pb.ring(48, 30, 15, 15, C.bar, 2);
  for (let i = 0; i < n; i++) pb.ell(30 + i * 18 + (3 - n) * 9, 54, 4.5, 5.5, C.paper);
  pb.ell(80, 14, 6, 6, C.red, { sh: [C.coral, C.wine] }); pb.outline(() => C.panel); return pb; }); }
export function probeArt(s) { return art("probe" + s, () => { const pb = new PB(28 * s, 28 * s), E = (x, y, r, c) => pb.ell(x * s, y * s, r * s, r * s, C[c]);
  E(14, 14, 13, "sky"); E(14, 14, 11, "paper"); E(14, 14, 7, "sky"); E(14, 14, 5, "paper"); pb.line(14 * s, 14 * s, 23 * s, 6 * s, C.sea, Math.max(1, s * 2)); pb.rect(18 * s, 17 * s, 3 * s, 3 * s, C.orange);
  pb.rich(s); pb.outline(() => C.ink); return pb; }); }
export function leafArt(f, big) { const n = Math.round(f * 8); return art("leaf" + n + big, () => { const L = big ? 36 : 14, W = big ? 16 : 6, pb = new PB(W + 2, L + 2), cx = (W + 2) / 2, cy = (L + 2) / 2;
  pb.ell(cx, cy, W / 2, L / 2, C.bar); pb.ell(cx, cy, W / 2, L / 2, C.leaf, { clip: (x, y) => y >= (L + 2) * (1 - n / 8), sh: [C.sprout, C.forest] });
  pb.line(cx, 2, cx, L, n >= 8 ? C.forest : C.ground); pb.outline(() => C.void); return pb; }); }
export function domeArt(w, h, glow, part) { return art("dome" + w + "x" + h + glow + (part || ""), () => { const pb = new PB(w, h), cx = w / 2;
  if (part !== "base") { pb.ell(cx, h * 0.58, w * 0.46, h * 0.56, glow ? C.focus : C.panel, { clip: (x, y) => y < h * 0.82, dith: [glow ? C.cream : C.bar, 5] });
    pb.ring(cx, h * 0.58, w * 0.46, h * 0.56, C.enamel, 2, 0, (x, y) => y < h * 0.82); pb.ring(cx, h * 0.58, w * 0.4, h * 0.5, C.frostD, 1, 0, (x, y) => y < h * 0.4 && x < cx); }
  if (part !== "frostD") { pb.rect(w * 0.04, h * 0.8, w * 0.92, h * 0.12, C.bevel); pb.rect(w * 0.04, h * 0.8, w * 0.92, 3, C.metal); pb.rect(w * 0.08, h * 0.92, w * 0.84, h * 0.07, C.bar); }
  return pb; }); }
// The bud: a glowing bean, never an embryo (decided).
export function budArt(stage) { return art("bud" + stage, () => { const pb = new PB(70, 70); pb.ell(35, 40, stage ? 22 : 13, stage ? 24 : 15, C.cream, { dith: [C.focus, 6] }); pb.ell(35, 40, stage ? 15 : 8, stage ? 17 : 10, C.amber, { sh: [C.yellow, C.orange] });
  if (stage) { pb.ell(41, 22, 4, 9, C.sprout, { rot: 0.5 }); pb.ell(29, 24, 3, 7, C.sprout, { rot: -0.6 }); } pb.outline(() => C.gold); return pb; }); }
export const lampArt = () => art("focus", () => { const pb = new PB(40, 72); pb.poly([[6, 30], [34, 30], [28, 10], [12, 10]], C.amber); pb.poly([[12, 10], [28, 10], [26, 4], [14, 4]], C.gold);
  pb.rect(18, 30, 4, 32, C.hairline); pb.ell(20, 66, 14, 5, C.bevel); pb.ell(20, 33, 9, 3, C.cream); pb.rich(1); pb.outline(() => C.panel); return pb; });
export const bedArt = () => art("bed", () => { const pb = new PB(150, 44); pb.ell(75, 26, 74, 17, C.ground); pb.ell(75, 22, 70, 14, C.panel, { sh: [C.coral, C.ground] }); pb.ell(75, 22, 52, 8, C.ground); pb.outline(() => C.panel); return pb; });
export const gateArt = () => art("gate", () => { const pb = new PB(76, 70); pb.rect(4, 8, 68, 58, C.bar); for (let i = 0; i < 6; i++) pb.rect(10 + i * 11, 8, 4, 58, C.bevel); pb.rect(4, 18, 68, 4, C.hairline); pb.rect(4, 50, 68, 4, C.hairline);
  pb.ell(38, 8, 34, 8, C.bevel, { clip: (x, y) => y < 9 }); for (let i = 0; i < 9; i++) pb.ell(6 + i * 8, 64, 4, 5, C.leaf, { sh: [C.sprout, C.forest] }); pb.outline(() => C.panel); return pb; });
// The return hatch of the rack: a slot with a leaf mark.
export const hatchArt = () => art("hatch", () => { const pb = new PB(120, 56); pb.rect(2, 4, 116, 48, C.slate); pb.rect(6, 8, 108, 40, C.night); pb.rect(10, 24, 100, 8, C.void);
  pb.ell(60, 20, 5, 10, C.leaf, { rot: 0.6, sh: [C.sprout, C.forest] }); pb.outline(() => C.ink); return pb; });
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ramp = (cols, t, x, y) => { const f = Math.max(0, Math.min(0.999, t)) * (cols.length - 1), i = Math.floor(f); return C[cols[bay(x, y) < (f - i) * 16 ? i + 1 : i]]; };
export function vivArt(w, h) { return art("viv" + w + "x" + h, () => {
  const pb = new PB(w, h), gy = Math.round(h * 0.62);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const lamp = Math.hypot((x - w * 0.45) / (w * 0.55), (y - h * 0.05) / (h * 0.7)), wave = gy + Math.round(Math.sin(x / 47) * 6 + Math.sin(x / 13) * 2);
    let c; if (y < wave) c = ramp(["panel", "bar", "hairline"], 1.2 - lamp, x, y);
    else { const d = y - wave; c = d < 3 ? C.grass : d < 7 ? (bay(x, y) < 8 ? C.grass : C.leaf) : d < 30 ? (bay(x, y) < 5 ? C.leaf : C.forest) : bay(x, y) < 7 ? C.soil : C.bark; }
    pb.p[y * w + x] = c;
  }
  const R2 = mulberry32(w * 31 + h);
  for (let i = 0; i < Math.round(w / 40); i++) { const x = R2() * w, ht = 40 + R2() * 90; for (let j = 0; j < 5; j++) pb.ell(x + (R2() - 0.5) * 18, gy - ht * (j / 5) - 6, 5 + R2() * 4, 12 + R2() * 6, j % 2 ? C.sageD : C.hairline, { rot: (R2() - 0.5) * 0.8 }); }
  for (let i = 0; i < Math.round(w / 90); i++) { const x = 40 + R2() * (w - 80), y = gy + 18 + R2() * (h - gy - 50); pb.ell(x, y, 18 + R2() * 14, 9 + R2() * 6, C.rock, { sh: [C.rockL, C.stone] }); }
  pb.ell(w * 0.78, gy + 40, 46, 13, C.stone); pb.ell(w * 0.78, gy + 38, 40, 9, C.sky, { sh: [C.ice, C.river] });
  pb.ell(w * 0.14, gy + 6, 34, 18, C.soil, { clip: (x, y) => y < gy + 10 }); pb.ell(w * 0.14, gy + 8, 22, 12, C.void, { clip: (x, y) => y < gy + 10 });
  for (let i = 0; i < Math.round(w / 22); i++) { const x = R2() * w, y = gy + 4 + R2() * (h - gy - 10); for (let j = 0; j < 3; j++) pb.line(x, y, x + (j - 1) * 3, y - 6 - R2() * 6, C.sprout); }
  for (let x = 0; x < w; x++) { pb.set(x, 0, C.enamel); pb.set(x, 1, C.frostD); pb.set(x, h - 1, C.bar); pb.set(x, h - 2, C.hairline); }
  for (let y = 0; y < h; y++) { pb.set(0, y, C.enamel); pb.set(w - 1, y, C.enamel); pb.set(1, y, C.frostD); }
  for (let y = 12; y < h * 0.5; y++) { pb.set(18 + y * 0.15, y, C.frostD); if (y % 3) pb.set(24 + y * 0.15, y, C.frostD); }
  return pb; }); }
export const twinkle = () => (motion() ? Math.floor(clock.now / 300) % 3 : 0);
export { upPB };

// ---------- The founder on Create: its own colours, calm where a chapter is unread (Fix 1b part 1, unknown.mjs) ----------
// The rig at the picture's size with Glow's emission and Charge's phase as the unread chapters leave them, then the treatment treatmentOf names: clear (the picture, palette art), a veil over the unread looks' parts or the whole body, or the
// ghost of nothing read. A part group with no part on this body veils nothing.
export function founderArt(frame, genome, read, w, h, painted = null) {   // painted: the species' placed adult master at this size (Create founder A, interim): the one flat picture in place of the rig render, under the same treatment
  const b = builtOf(frame, genome, read), ok = !b.error && b.validation.status === "valid", t = treatmentOf(frame, read, ok ? b.scene : null), key = "fd" + drawnDigest(frame, genome, read) + ":" + t.mode + ":" + t.groups.join("+") + ":" + w + "x" + h + (painted ? ":painted" : "");
  return art(key, () => {
    const camera = ok ? fitCamera(b.scene, "portrait", [w, h], 0.06) : null, base = painted ?? (ok ? dropSpecks(renderPB(b.scene, camera, "station")) : blobArt(w, h));
    if (t.mode === "clear") return base;
    const boxes = t.boxes[0]?.whole ? "body" : !ok ? [] : t.boxes.map(({ parts }) => { const bx = partBox(b.scene, camera, parts); return [Math.max(0, Math.floor(bx.x0)), Math.max(0, Math.floor(bx.y0)), Math.min(w - 1, Math.ceil(bx.x1) - 1), Math.min(h - 1, Math.ceil(bx.y1) - 1)]; });
    return treat({ w, h, rgba: () => base.rgba() }, { mode: t.mode, boxes, luma: t.luma });
  });
}
// The hatch: the dome's glass lifting, the bud cracking (drawn in the incubator screen with these pieces).
export const crackArt = () => art("crack", () => { const pb = new PB(70, 70); pb.ell(35, 40, 22, 24, C.cream, { dith: [C.focus, 6] }); pb.line(20, 30, 35, 44, C.gold, 2); pb.line(35, 44, 50, 28, C.gold, 2); pb.line(35, 44, 38, 62, C.gold, 2); pb.outline(() => C.gold); return pb; });

export const waitLamp = () => art("waitlamp", () => { const pb = new PB(10, 10); pb.ell(5, 5, 4, 4, C.sky); pb.ell(3.5, 3.5, 1.3, 1.3, C.ice); pb.outline(() => C.deep); return pb; });


// A cool beam from above on the specimen stage: a flat cone of one colour, no grain (chrome is crisp). 
export function beamArt(w, h) { return art("beam" + w + "x" + h, () => { const pb = new PB(w, h);
  for (let y = 0; y < h; y++) { const hw = w * 0.12 + (w * 0.38 * y) / h, x0 = Math.ceil(w / 2 - hw), x1 = Math.floor(w / 2 + hw); pb.rect(x0, y, x1 - x0, 1, C.tealD); }
  return pb; }); }
