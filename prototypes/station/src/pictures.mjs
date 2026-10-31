// The Pods pictures, registered in the asset manifest at the size the layout spec lists, and built through the asset
// cache by id (technical-architecture.md §5.5). A view asks for a picture with a plain-JSON request; this module turns
// the request into a registered entry (a placeholder, flagged, with what it waits for) whose builder draws it once at
// its size: the pod from its signed layers, the stamp on whole-pixel cells; the marks, the places, the frames and the figures are the studio's masters,
// taken by id when placed. Nothing is ever cropped and enlarged.
import { assetEntry, placeMaster, registerSlot, asset as assetOf, registerAsset, hasAsset, isFilled, dropAsset } from "../../ui/assets.mjs";
import { PB, C, HEX, RGB, art, fromRGBA, bay } from "./pixels.mjs";
import { registerMoving } from "./moving.mjs";
import { gradedOf, grade } from "./light-grade.mjs";
import { layeredStand, composeStand, standPictureId, standVariant, fitDown, curlPicture, curlOfStand, traitTile } from "./layered-stand.mjs";
import { drawnLooks } from "./looks.mjs";
import { portraitSource, portraitOpening } from "./portrait-source.mjs";
import { podFromLayers, layersPlaced, figureFromLayers, podStatus, figureStatus, rackPodFromLayers, rackLayersPlaced, rackBase, rackPatternId, leastFinal } from "./podmasters.mjs";
import { SPECS } from "./game.mjs";
import { emblemArt, ICON, beamArt, mibiArt, founderArt, speciesArt } from "./art.mjs";
import { stampGenome, stampSizing } from "./genome.mjs";
import { dimPicture, labelPlate } from "./stamplook.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";
import { relit } from "./relight.mjs";
import { specimenFor } from "./specimen-cache.mjs";
import { renderCell } from "./specimen.mjs";
import { sheetPicture, renderDisc, sheetKept, keptPictures, warmPaper } from "./library-sheet.mjs";
import { facePicture } from "./face-pictures.mjs";
import { farPicture, miniPicture } from "./lineage-pictures.mjs";
import { registerReading } from "./reading-pictures.mjs";

const SHEET_IDS = {};   // the Level 2 sheet's current entry of each kind (library-sheet.mjs keeps its pictures)
const LINEAGE_IDS = {};   // Level 3's current entry of each kind (lineagefar, lineagemini); a newer one supersedes it
const FACE_STAGE = new Map();   // the stage each face entry was drawn at
const DROPPED = [];   // the ids whose entry a newer picture superseded: the host drops them on the face (the Library 3 gate's P4: the face's table recycles only by least recent use)
// The superseded ids since the last call, taken (the host drops each on the face).
export const droppedPictures = () => DROPPED.splice(0);
const PLACE_COL = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
const put = (id, w, h, until, build, extra = {}) => { if (!hasAsset(id)) registerAsset({ id, w, h, status: "placeholder", until, build: () => build(), ...extra }); return id; };

// The pod at the exact size of its box, never scaled: every class (large, medium, small, collection, and the list's "well") from the signed layers recoloured by the species' pair (podmasters.mjs);
// a class whose layers are not placed is an empty (transparent) picture.
const UNKNOWN_PAIR = () => [HEX[C.stone], HEX[C.bone]];   // only until the signed pod-<class>-unknown pictures are placed
const podClass = ([bw, bh]) => { const classes = SPECS.pods.classes.pod; return Object.keys(classes).find((k) => classes[k][0] === bw && classes[k][1] === bh); };
const layerClass = (cls) => (cls === "list" ? "well" : cls);   // the list pod (40×48) is the masters' "well" class
const podComposed = (size) => { const cls = podClass(size); return !!cls && layersPlaced(layerClass(cls)); };   // a pod from the signed layers is painted art, not the palette's
function podPicture(species, state, [bw, bh], env) {
  const cls = podClass([bw, bh]);
  if (cls && layersPlaced(layerClass(cls))) {
    const frame = species ? env.frameOf(species) : null, pair = frame ? frame.pod.colourPair.map((c) => c.hex) : UNKNOWN_PAIR();
    return podFromLayers(layerClass(cls), pair, frame?.pod.shellPattern, SPECS.pods.podLayers.patterns, state === "sealed");
  }
  return new PB(bw, bh);
}
const hatchPB = (w = 112) => { const pb = new PB(w, 56); pb.rect(0, 2, w, 52, C.slate); pb.rect(4, 6, w - 8, 44, C.night); pb.rect(8, 24, w - 16, 8, C.void); pb.ell(w / 2, 28, 5.5, 11.5, C.leaf, { rot: 0.6, sh: [C.sprout, C.forest] }); pb.outline(() => C.ink); return pb; };
// The find's place picture at the size it is asked for (drawn at that size, never scaled): a frame, a dark inner square and the place's colour in the middle.
const placePB = (place, size = 16) => { const pb = new PB(size, size), c = C[PLACE_COL[place] || "mist"], k = size / 16; pb.rect(k, k, size - 2 * k, size - 2 * k, c); pb.rect(3 * k, 3 * k, size - 6 * k, size - 6 * k, C.ink); pb.rect(5 * k, 5 * k, size - 10 * k, size - 10 * k, c); return pb; };
// A kin's ring: the small pod's circle, a 2 px band in `hairline`.
const kinRingPB = (size, band) => { const pb = new PB(size, size), R = size / 2; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x + 0.5 - R, y + 0.5 - R); if (d <= R && d > R - band) pb.set(x, y, C.hairline); } return pb; };
const growPB = () => { const pb = new PB(16, 16); pb.rect(7, 6, 2, 9, C.leaf); pb.poly([[7, 8], [1, 3], [7, 5]], C.sprout); pb.poly([[9, 6], [15, 1], [9, 3]], C.sprout); pb.outline(() => C.ink); return pb; };
const waitingPB = () => { const pb = new PB(24, 24); for (const x of [6, 12, 18]) { pb.ell(x, 12, 3, 4, C.mist); } pb.outline(() => C.slate); return pb; };
const starPB = () => { const pb = new PB(12, 12), r = 6; pb.poly([[r, 0], [r + 1.7, r - 1.7], [12, r], [r + 1.7, r + 1.7], [r, 12], [r - 1.7, r + 1.7], [0, r], [r - 1.7, r - 1.7]], C.cream); pb.rect(5, 5, 2, 2, C.white); pb.outline(() => C.gold); return pb; };
// The stamp on its label: cells of whole pixels, cell = floor(104 / (N + 2)) and at least 2, drawn with its quiet margin, centred on the 120 label.
export function stampPicture(frame, genome, readIds) {
  const sg = stampGenome(frame, genome, readIds); if (!sg) return null;
  const { N, cell, size } = stampSizing(frame, genome);
  return { N, cell, size, build: () => fromRGBA(rasterize(stampGeometry(sg), N * cell, { ss: 3, size })) };
}

// A picture that is a placed master of another id at exactly this size takes that master (a mark, a place picture, the unknown pod); otherwise the stand-in builds.
const masterAt = (masterId, w, h) => { const m = assetEntry(masterId); return m && m.status !== "empty" && m.file && m.w === w && m.h === h ? m : null; };   // a placed master of any record status (signed, new, held, placeholder), not a built stand-in
// A built picture the code draws itself (a creature, an item, a light or an effect) in place of its master is a stand-in, never drawn in a golden (assets.mjs BUILT_NOT_IN_GOLDENS); one it only places,
// recolours, reduces or grades from signed pixels, a plain plate or a type glyph stays a placeholder.
const STAND_IN = { status: "stand-in" };
const putOrMaster = (id, masterId, w, h, until, build, extra = {}, pixelsOf = masterId) => { const m = masterId && masterAt(masterId, w, h); if (m) { if (!hasAsset(id)) placeMaster({ id, w, h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile, status: m.status }, assetOf(pixelsOf)); return id; } return put(id, w, h, until, build, extra); };   // pixelsOf: the picture the id shows (the master itself, or its per-light grade, fix 7)

// The sources of a moving set's stand-in cells (Station M1 §1.5): the placed juvenile stand-in at the size, or for an adult Pip's placed stand (the adult plan), else the rig of the species' type specimen at that size; the 96 × 88 juvenile stand-in for the curl.
const placedPic = (id, w, h, light = "day") => { const m = masterAt(id, w, h); return m ? assetOf(gradedOf(id, light)) : null; };   // a placed master takes the scene's light (fix 7); the rig is never graded
export const movingSource = (env) => ({
  stand: (species, stage, w, h, light) => placedPic(`mibi-${stage === "juvenile" ? "juvenile" : "adult"}-${species}-${w}x${h}`, w, h, light) ?? speciesArt(env.frameOf(species), w, h, "three-quarter"),
  nap: (species, light) => placedPic(`mibi-juvenile-${species}-96x88`, 96, 88, light) ?? speciesArt(env.frameOf(species), 96, 88, "three-quarter"),
});
// A layered stand (layered-stand.mjs): the base with the layers the mibi's drawn looks call for, composed here in the logic process once and kept by id like the stamp; the face is given the pixels 1:1 and never a layer.
// A light grades the composed picture (light-grade.mjs), as it grades a master. The layers are proof cut-outs until the masters land (art.mjs PLACEHOLDERS "stand-layers"), so the picture is a placeholder.
const LAYER_UNTIL = "the eye-ring overlays and the colour ramps (T-20261016-200, T-20261016-203): the stand is the signed version 4 base and layers, with the base's rings and charcoal coat";
function registerLayered(r) {
  const stand = layeredStand(r.species, r.stage, r.size, r.view, r.pose); if (!stand) throw new Error(`mibi ${r.id}: the species has no layered stand at ${(r.size).join("×")}${r.pose ? " in the pose " + r.pose : ""}`);   // a request names its pose only when it is not the anchor (the default)
  const [w, h] = stand.size, day = standPictureId(stand, r.looks);
  if (!hasAsset(day)) registerAsset({ id: day, w, h, status: "placeholder", until: LAYER_UNTIL, build: () => composeStand(stand, r.looks) });
  if (r.id !== day && !hasAsset(r.id)) registerAsset({ id: r.id, w, h, status: "placeholder", until: LAYER_UNTIL, build: () => grade(assetOf(day), r.light ?? "day") });
}
// Register what a view asked for. `env`: { podById, frameOf }. Returns nothing; the ids are in the requests.
export function registerPictures(reqs, env) {
  for (const r of reqs) {
    const until = r.until || "the Pods masters (station-layouts.md, Placeholders on Pods)";
    switch (r.kind) {
      case "pod": if (!r.species && r.state === "sealed" && podClass(r.size) && masterAt(`pod-${layerClass(podClass(r.size))}-unknown`, r.size[0], r.size[1])) { putOrMaster(r.id, `pod-${layerClass(podClass(r.size))}-unknown`, r.size[0], r.size[1]); break; } { const composed = podComposed(r.size); put(r.id, r.size[0], r.size[1], "the pod renderer's masters", () => podPicture(r.species, r.state, r.size, env), composed ? { status: podStatus(layerClass(podClass(r.size))) } : {}); break; }
      case "rackpod": {   // the Home rack pod: the signed 24×32 layers recoloured by the species' pair (home.json regions.rackPod.layers); an empty picture until the base layers are placed
        const P = SPECS.home.regions.rackPod; if (!r.size || r.size[0] !== P.size[0] || r.size[1] !== P.size[1]) throw new Error(`rackpod ${r.id}: size ${r.size} is not the spec's ${P.size}`); const L = P.layers, patterns = SPECS.pods.podLayers.patterns, frame = r.species ? env.frameOf(r.species) : null, placed = rackLayersPlaced(L), pid = rackPatternId(frame, L, patterns);
        put(r.id, P.size[0], P.size[1], "the rack pod's layers (the home hand masters)", () => (placed ? rackPodFromLayers(frame, L, SPECS.cross.colours.pigmentChips, patterns, P.size) : new PB(P.size[0], P.size[1])), placed ? { status: leastFinal([...rackBase(L), ...(pid ? [pid] : [])]) } : {}); break;
      }
      case "podpart": {   // a piece of a pod from its signed layers at their own size (the opened pod's bowl and cap, pod-opened-*), recoloured by the species' pair, never scaled (T-20261016-222)
        const frame = r.species ? env.frameOf(r.species) : null, pair = frame ? frame.pod.colourPair.map((c) => c.hex) : UNKNOWN_PAIR();
        put(r.id, r.size[0], r.size[1], "the opened pod's layers", () => (layersPlaced(r.cls) ? podFromLayers(r.cls, pair, frame?.pod.shellPattern, SPECS.pods.podLayers.patterns, false) : new PB(r.size[0], r.size[1])), layersPlaced(r.cls) ? { status: podStatus(r.cls) } : {}); break;
      }
      case "podicon": {   // the founder's pod in the Incubate panel's price (build spec 6a.2): the renderer's collection pod (88 x 112) reduced once to 16 x 20 in the logic process
        const frame = r.species ? env.frameOf(r.species) : null, pair = frame ? frame.pod.colourPair.map((c) => c.hex) : UNKNOWN_PAIR(), [w, h] = r.size;
        put(r.id, w, h, "the collection pod's layers", () => { if (!layersPlaced("collection")) return new PB(w, h); const big = podFromLayers("collection", pair, frame?.pod.shellPattern, SPECS.pods.podLayers.patterns, false), px = fitDown(big.rgba(), big.w, big.h, w, h); return { w, h, rgba: () => px }; }); break;
      }
      case "relit": {   // a figure lit to the capsule's roof lamp, with its shadow and the moss blades in front of its feet, one picture (relight.mjs), made in the logic process; parts: [{ id, over?: [id] }], bg: { id, at: [x, y] } or null
        const ok = r.parts.every((p) => isFilled(p.id) || hasAsset(p.id));
        registerAsset({ id: r.id, w: r.area[0], h: r.area[1], status: "derived", until: null, build: () => { let data = null; return { w: r.area[0], h: r.area[1], rgba: () => { if (data) return data;
          if (!ok) return (data = new Uint8ClampedArray(r.area[0] * r.area[1] * 4));
          const src = (id) => { const a = assetOf(id); return { rgba: a.rgba(), w: a.w, h: a.h }; };
          data = relit({ parts: r.parts.map((p) => ({ ...src(p.id), over: (p.over ?? []).filter((o) => isFilled(o) || hasAsset(o)).map((o) => src(o).rgba) })), scale: r.scale ?? 1, figH: r.figH ?? 0, sink: r.sink ?? 0, inset: r.inset ?? 12, area: r.area, anchor: r.anchor, bg: r.bg && (isFilled(r.bg.id) || hasAsset(r.bg.id)) ? { ...src(r.bg.id), x: r.bg.at[0], y: r.bg.at[1] } : null }); return data; } }; } });
        break;
      }
      case "place": putOrMaster(r.id, `place-${r.place}-${r.size || 16}x${r.size || 16}`, r.size || 16, r.size || 16, "the place picture set", () => placePB(r.place, r.size || 16), STAND_IN); break;
      case "kinring": putOrMaster(r.id, `ring-kin-${r.size}x${r.size}`, r.size, r.size, "the pod list master", () => kinRingPB(r.size, r.band), STAND_IN); break;
      case "grow": putOrMaster(r.id, "mark-can-grow-16", 16, 16, "the can-grow mark's master", growPB, STAND_IN); break;
      case "waiting": putOrMaster(r.id, "mark-waiting-24", 24, 24, "the waiting mark's master", waitingPB, STAND_IN); break;
      case "figure": put(r.id, r.size[0], r.size[1], "the figure masters (mist and clear)", () => figureFromLayers(r.mist, r.clear, r.alpha, r.size), { status: figureStatus(r.mist, r.clear) }); break;
      case "slot": {   // a master at exactly this size takes the id; otherwise the id is an empty slot, waiting
        const m = assetEntry(r.master), e = assetEntry(r.id);
        if (m && m.file && m.status !== "empty" && m.w === r.size[0] && m.h === r.size[1]) { if (!e || e.status === "empty") placeMaster({ id: r.id, w: m.w, h: m.h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile, status: m.status }, assetOf(r.master)); }
        else registerSlot({ id: r.id, w: r.size[0], h: r.size[1], until: r.until });
        break;
      }
      case "traittile": {   // a Colour or Markings tile on a read chapter page: the layered stand cropped and reduced once here (layered-stand.mjs traitTile); an empty slot where the species has no layered stand
        const [w, h] = r.size; if (hasAsset(r.id)) break;
        if (!layeredStand(r.species, "adult", [304, 312], "default")) { registerSlot({ id: r.id, w, h, until: r.until }); break; }
        registerAsset({ id: r.id, w, h, status: "placeholder", until: LAYER_UNTIL, build: () => traitTile(r.species, "adult", r.trait, r.look, r.size) });
        break;
      }
      case "hatch": putOrMaster(r.id, `ring-hatch-${r.size[0]}x${r.size[1]}`, r.size[0], r.size[1], "the pod list master", () => hatchPB(r.size[0]), STAND_IN); break;
      case "beam": put(r.id, r.size[0], r.size[1], until, () => beamArt(r.size[0], r.size[1]), STAND_IN); break;   // a code-drawn light: never in a golden
      case "emblem": putOrMaster(r.id, `rail-emblem-${r.chapter}-${r.state || "unread"}-24x24`, 24, 24, "the chapter rail master", () => emblemArt(r.chapter, 24), STAND_IN); break;
      case "star": putOrMaster(r.id, "glint-star-12x12", 12, 12, "the glint master", starPB, STAND_IN); break;
      case "stampplate": put(r.id, r.size, r.size, "the stamp label's plate (the stampCase look)", () => labelPlate(r.size, RGB[C.bone], RGB[C.hairline], r.k)); break;   // the plate of the 120 label, dimmed by K × WARM with its hairline edge (stamplook.mjs)
      case "stamp": put(r.id, r.size, r.size, "the stamp's label art", () => { const fr = env.frameOf(r.species), g = r.bud ? env.budGenome() : r.mibi != null ? env.mibiGenome(r.mibi) : (() => { const p = env.podById(r.pod); return r.choices ? env.founderGenome(p, r.choices) : p.genome; })(); const pic = stampPicture(fr, g, r.read).build(); return r.k ? dimPicture(pic, r.k) : pic; }); break;   // with a k the stamp is dimmed in linear light when it is rasterised (stamplook.mjs)
      case "founder": { const painted = placedPic(`mibi-adult-${r.species}-${r.size[0]}x${r.size[1]}`, r.size[0], r.size[1]);   // Create founder A (interim): the species' painted adult, one flat picture, in place of the rig render
        put(r.id, r.size[0], r.size[1], "the founder's painting (the species' painted adult where it is placed, else the stylised rig pass; the calm unknown where a chapter is unread: unknown.mjs)", () => { const p = env.podById(r.pod), fr = env.frameOf(r.species), g = env.founderGenome(p, r.choices || {}); return founderArt(fr, g, r.read, r.size[0], r.size[1], painted, !!r.whole); }, painted ? { status: "master" } : STAND_IN); break; }   // the rig pass (no painted adult) is a stand-in   // the placeholder rig; the signed treatment (ghost, veil) on the painted layer, clear on the art layer
      case "crop": {   // a window of a placed master, 1:1 (never scaled): the master's pixels at `at`, `size` wide and high, transparent where the window passes the master's edge; a master not placed leaves the labelled stand-in
        const m = masterAt(r.master, r.of[0], r.of[1]), [w, h] = r.size, [x0, y0] = r.at; if (hasAsset(r.id)) break;
        if (!m) { put(r.id, w, h, r.until, () => { const pb = new PB(w, h); pb.rect(0, 0, w, h, C.stone); return pb; }); break; }
        registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => { let data = null; return { w, h, rgba: () => { if (data) return data; const s = assetOf(r.master).rgba(), W = r.of[0], H = r.of[1]; data = new Uint8ClampedArray(w * h * 4);
          for (let y = 0; y < h; y++) { const sy = y0 + y; if (sy < 0 || sy >= H) continue; for (let x = 0; x < w; x++) { const sx = x0 + x; if (sx < 0 || sx >= W) continue; data.set(s.subarray((sy * W + sx) * 4, (sy * W + sx) * 4 + 4), (y * w + x) * 4); } } return data; } }; } });
        break;
      }
      case "specimen": {   // the Library module's specimen (build spec 4.2): the generator's painted RGB picture of the species' found looks and its three brighter levels, made in the logic process once (specimen-cache.mjs) and named by their ids; every level is an opaque picture of the window's size, painted art, never snapped to the palette
        const [w, h] = r.size, frame = env.frameOf(r.species);
        r.levels.forEach((id, k) => { if (!hasAsset(id)) registerAsset({ id, w, h, status: "derived", until: null, build: () => { let data = null; return { w, h, rgba: () => data ?? (data = specimenFor(frame, r.found, r.species, r.shut).levels[k]) }; } }); });
        break;
      }
      case "ph": put(r.id, r.size[0], r.size[1], r.until, () => { const pb = new PB(r.size[0], r.size[1]), [w, h] = r.size; const edge = r.hollow ? C.stone : C.mist; if (!r.hollow) pb.rect(0, 0, w, h, C.stone); pb.rect(0, 0, w, 1, edge); pb.rect(0, h - 1, w, 1, edge); pb.rect(0, 0, 1, h, edge); pb.rect(w - 1, 0, 1, h, edge); return pb; }); break;   // the PH look: a stone plate with a 1 px mist edge inside, or a 1 px stone edge with no fill
      case "portrait": {   // the sitting's portrait at 40×30, derived on the Station (derive.mjs): an empty slot until its source arrives, then filled (assets.mjs: a stand-in fills an empty slot); the status is "derived", never in the placeholder register
        if (r.size && r.size[0] === 528 && r.size[1] === 392) {   // the opening itself, 1:1 (the Sitting's portrait state): from the kept source, else an empty slot
          const o = portraitOpening(r.digest);
          if (!o) registerSlot({ id: r.id, w: 528, h: 392, until: "the sitting's portrait (its opening, kept on the Station while it is held)" }); else registerAsset({ id: r.id, w: 528, h: 392, status: "derived", build: () => o });
          break;
        }
        const src = portraitSource(r.digest);
        if (!src) registerSlot({ id: r.id, w: 40, h: 30, until: "the sitting's portrait (derived on the Station from its opening)" }); else registerAsset({ id: r.id, w: 40, h: 30, status: "derived", build: () => src });
        break;
      }
      case "mibi": { if (r.looks) { registerLayered(r); break; } const [w, h] = r.size, young = r.stage === "juvenile"; putOrMaster(r.id, young ? `mibi-juvenile-${r.species}-${w}x${h}` : `mibi-adult-${r.species}-${w}x${h}`, w, h, young ? "the juvenile stand-in at this size (art director), then the painted mibi" : "the adult's signed stand at this size (the adult plan); an adult without one is asked as its species' juvenile stand (stands.mjs, station-layouts.md Composed states rule 5), and only a species with no juvenile stand reaches the rig here, shown as a stand-in", () => mibiArt(env.frameOf(r.species), env.mibiGenome(r.mibi), w, h, "three-quarter"), {}, gradedOf(young ? `mibi-juvenile-${r.species}-${w}x${h}` : `mibi-adult-${r.species}-${w}x${h}`, r.light ?? "day")); break; }   // the adult hook: an adult or elder takes mibi-adult-SXX-WxH when placed; else the view has asked for mibi-juvenile-SXX at the place's size (stands.mjs); else the rig at the adult's own size      case "moving": registerMoving(r.id, movingSource(env)); break;   // a moving set's atlas: composed from its placed masters or §1.5's stand-ins
      case "curl": {   // a sleeper's curl at the stand's scale: a layered species' composed curl pose, else the 304 curl master reduced by the standing figure's factor, with its own shadow (layered-stand.mjs curlPicture), composed once here; a light grades it as it grades a stand
        const lay = r.looks && layeredStand(r.species, r.stage, [304, 312], r.view, "curl"), src = lay ? curlOfStand(lay, r.looks) : assetOf(r.master), pic = curlPicture(src, r.species, r.stage, r.factor, r.view, lay ? `${standVariant(lay, r.looks).key}|${r.stage}` : r.master);
        if (!hasAsset(r.day)) registerAsset({ id: r.day, w: pic.w, h: pic.h, status: "derived", until: null, build: () => pic });
        if (r.id !== r.day && !hasAsset(r.id)) registerAsset({ id: r.id, w: pic.w, h: pic.h, status: "derived", until: null, build: () => grade(assetOf(r.day), r.light ?? "day") });
        break;
      }
      case "moving": registerMoving(r.id, movingSource(env)); break;   // a moving set's atlas (Station M1 §1.2): composed from its placed masters or §1.5's stand-ins
      case "icon": put(r.id, r.px, r.px, "the icon set", () => ICON[r.name](r.px)); break;
      case "librarycell": {   // a Level 1 cell's picture (library.json l1.cell.picture): the specimen generator's cell harness (specimen.mjs renderCell), the found specimen or the met pencil study on its cell's flat ground; made once in the logic process, its time printed
        const [w, h] = r.size; if (hasAsset(r.id)) break;
        registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => ({ w, h, rgba: () => cellPixels(r, env) }) });
        break;
      }
      case "librarysheet": case "librarylit": case "librarypage": case "libraryquiet": {   // the Level 2 sheet, its lit variant, the lit chapter's page and the sheet's quiet stand-in (library-sheet.mjs): made in the logic process, kept as the current one of each kind; a newer request
        // supersedes the older one of its kind, whose entry goes and whose picture the host drops on the face (droppedPictures); on the ground master's pixels where library-ground-1024x522 is placed, else flat libGround; its time printed
        const [w, h] = r.size; if (hasAsset(r.id)) break; const old = SHEET_IDS[r.kind]; if (old && old !== r.id) { dropAsset(old); DROPPED.push(old); } SHEET_IDS[r.kind] = r.id;
        const frame = env.frameOf(r.species);
        registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => ({ w, h, rgba: () => sheetPicture(frame, r, { ground: sheetGround() }).rgba }) });
        break;
      }
      case "lookdisc": {   // a found look's disc at 16 (the page disc at 16), for the Level 2 shelf's wish pieces; transparent outside the disc
        if (hasAsset(r.id)) break; const frame = env.frameOf(r.species);
        registerAsset({ id: r.id, w: 16, h: 16, status: "derived", until: null, build: () => { let data = null; return { w: 16, h: 16, rgba: () => data ?? (data = renderDisc(frame, r.trait, r.look).rgba) }; } });
        break;
      }
      case "face": {   // a mibi's face for the Library (library.json faces, face-pictures.mjs): from its layered stand through the species' face window, at its size, on libGround; a labelled stand-in where the species has none; its time printed
        // the id names the mibi and the size, not the stage (the art director, F4): a face drawn at another stage than its entry's (a mibi with no portrait that grew) is a new picture, and the old one goes from the face
        const [w, h] = r.size; if (hasAsset(r.id) && FACE_STAGE.get(r.id) === r.stage) break; if (hasAsset(r.id)) { dropAsset(r.id); DROPPED.push(r.id); } FACE_STAGE.set(r.id, r.stage); const spec = SPECS.library.faces, rgb = (n) => RGB[C[n]];
        const stand = !!spec.windows?.[r.species]?.[r.stage === "elder" ? "adult" : r.stage] && !!layeredStand(r.species, r.stage, [304, 312], "default");
        registerAsset({ id: r.id, w, h, status: stand ? "derived" : "placeholder", until: stand ? null : "the species' layered stand and the art director's face window", build: () => { let data = null; return { w, h, rgba: () => { if (data) return data;
          const p = facePicture({ species: r.species, stage: r.stage, looks: r.looks, size: w, faded: !!r.faded }, spec, rgb); console.log(`# face ${r.id}: rendered in ${p.ms.toFixed(0)} ms${p.standIn ? " (the stand-in)" : ""}`); return (data = p.rgba); } }; } });
        break;
      }
      case "lineagefar": case "lineagemini": {   // Level 3's pictures (lineage-pictures.mjs: the whole lineage at FAR, and the same drawing reduced for CLOSE's inset): made once by id (the digest of what they draw) when the face first
        // needs their pixels, in the logic process; the FAR picture on the ground master's own pixels for its rect (flat libGround until it is placed); its time printed
        const [w, h] = r.size; if (hasAsset(r.id)) break; const old = LINEAGE_IDS[r.kind]; if (old && old !== r.id) { dropAsset(old); DROPPED.push(old); } LINEAGE_IDS[r.kind] = r.id; const rgb = (n) => RGB[C[n]];
        registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => { let data = null; return { w, h, rgba: () => { if (data) return data;
          const p = r.kind === "lineagefar" ? farPicture(r.input, SPECS.library, { rgb, ground: sheetGround() }) : miniPicture(r.input, SPECS.library, { rgb }); console.log(`# lineage ${r.id}: rendered in ${p.ms.toFixed(1)} ms`); return (data = p.rgba); } }; } });
        break;
      }
      case "readchamber": case "readrail": case "readdisc": case "readgather": case "readstamp": case "readplate": registerReading(r, env); break;   // the reading screen v2's composed pictures (reading-pictures.mjs)
      default: throw new Error("unknown picture kind " + r.kind);
    }
  }
}
// ---- the Library's pictures made off the open path (the Library 2 gate's F5; the Library 3 gate's P1, P2, P4, P5) ----
// A Level 1 cell picture or a Level 2 sheet, lit variant or page takes from 40 ms to over a second here (3 to 4 times that on a Pi 4), and the logic thread answers nothing while one is made. So the props name only
// pictures that are made (libraryMade): a cell not yet made draws its quiet ground, a sheet its species' last sheet or its quiet stand-in, a lit variant the unlit sheet, a page nothing; the builders hand the rest
// to wantLibrary, and the host makes one at a time (warmLibraryNext) after a frame is out and never in a hold; the next props name it, and the face swaps it in. A newer lit variant, page or sheet supersedes a queued one.
const CELLS = new Map();   // a Level 1 cell picture's pixels by id, once made
const WARM = [], ASKED = new Map();   // the requests waiting to be made, in the order asked, and when each was asked
const ORDER = { librarylit: 0, librarypage: 1, librarysheet: 2, librarycell: 3 };   // the player's lit chapter first (its variant, then its page), then the sheet, then the cells
const SUPERSEDES = new Set(["librarylit", "librarypage", "librarysheet"]);
const sheetGround = () => (masterAt("library-ground-1024x522", 1024, 522) ? { w: 1024, h: 522, rgba: assetOf("library-ground-1024x522").rgba() } : null);   // the ground master's pixels, or null while it is not placed (flat libGround)
function cellPixels(r, env, say = (s) => console.log(s)) {
  const have = CELLS.get(r.id); if (have) return have;
  const frame = env.frameOf(r.species), fr = r.shut?.length ? { ...frame, chapters: frame.chapters.map((ch) => ({ ...ch, sealed: r.shut.includes(ch.id) })) } : frame;
  const p = renderCell(fr, { [r.species]: r.found ?? {} }, { pencil: r.status === "met", ground: RGB[C[r.ground]] }); say(`# library cell ${r.id}: ${r.status}, rendered in ${p.ms.toFixed(0)} ms (${r.size[0]} x ${r.size[1]})`);
  CELLS.set(r.id, p.rgba); return p.rgba;
}
// Whether a Library picture is made: a cell's pixels, or a sheet, lit variant, page or quiet stand-in library-sheet.mjs keeps.
export const libraryMade = (id) => CELLS.has(id) || sheetKept(id);
// The species' last made sheet (library-sheet.mjs keeps one): its id, or null.
export const lastSheet = (species) => { const id = keptPictures().sheet; return id && id.startsWith(`library-sheet-${species}-`) ? id : null; };
// Ask for pictures to be made off the open path: each request not made and not waiting joins the queue; a lit variant, a page or a sheet supersedes a waiting one of its kind.
export function wantLibrary(reqs) {
  for (const r of reqs) {
    if (libraryMade(r.id) || WARM.some((q) => q.id === r.id)) continue;
    if (SUPERSEDES.has(r.kind)) for (let i = WARM.length - 1; i >= 0; i--) if (WARM[i].kind === r.kind) WARM.splice(i, 1);
    WARM.push(r); ASKED.set(r.id, performance.now());
  }
}
export const libraryWaiting = () => WARM.map((r) => r.id);
// Make the next waiting picture (the lit chapter's first, then the sheet, then the cells; in the order asked within a kind): { id, kind, ms (to make it), waited (since it was asked) }, or null when none waits.
export function warmLibraryNext(env, say = (s) => console.log(s)) {
  if (!WARM.length) return null;
  let k = 0; for (let i = 1; i < WARM.length; i++) if (ORDER[WARM[i].kind] < ORDER[WARM[k].kind]) k = i;
  const r = WARM.splice(k, 1)[0], t0 = performance.now();
  if (r.kind === "librarycell") cellPixels(r, env, say); else sheetPicture(env.frameOf(r.species), r, { ground: sheetGround(), print: say });
  const at = ASKED.get(r.id) ?? t0; ASKED.delete(r.id);
  return { id: r.id, kind: r.kind, ms: performance.now() - t0, waited: performance.now() - at };
}
// The one-time paper of the sheet's finish (library-sheet.mjs, about 3 s here, ~10 s on a Pi 4, ~11 MB), made off the open path (at the host's boot idle): its time, or 0 when it was made already.
export const warmLibraryPaper = () => warmPaper();
export const clearLibraryCells = () => { CELLS.clear(); WARM.length = 0; ASKED.clear(); };

// The material icons the text runs draw (16 px).
export const iconRequests = () => [...["energy", "data", "essence", "cross"].map((name) => ({ kind: "icon", id: `icon:${name}:16`, name, px: 16 })), { kind: "slot", id: "icon-cross-16", master: "icon-cross-16", size: [16, 16], until: "the cross icon master (the clash line's ✕)" }];   // the clash line's ✕ is the master icon-cross-16 (painted), not the stand-in sprite
