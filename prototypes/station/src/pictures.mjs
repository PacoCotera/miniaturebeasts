// The Pods pictures, registered in the asset manifest at the size the layout spec lists, and built through the asset
// cache by id (technical-architecture.md §5.5). A view asks for a picture with a plain-JSON request; this module turns
// the request into a registered entry (a placeholder, flagged, with what it waits for) whose builder draws it once at
// its size: the pod from its signed layers, the stamp on whole-pixel cells; the marks, the places, the frames and the figures are the studio's masters,
// taken by id when placed. Nothing is ever cropped and enlarged.
import { assetEntry, placeMaster, registerSlot, asset as assetOf, registerAsset, hasAsset, isFilled } from "../../ui/assets.mjs";
import { PB, C, HEX, art, fromRGBA, bay } from "./pixels.mjs";
import { podFromLayers, layersPlaced, figureFromLayers, podStatus, figureStatus } from "./podmasters.mjs";
import { SPECS } from "./game.mjs";
import { emblemArt, ICON, beamArt } from "./art.mjs";
import { stampGenome, stampSizing } from "./genome.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";

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
// A recessed place of the collection: `panel` with a one-pixel `hairline` edge and 6 px corners.
const placePanelPB = (w, h, r) => {
  const pb = new PB(w, h), inside = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return false; const cx = x < r ? r : x >= w - r ? w - 1 - r : x, cy = y < r ? r : y >= h - r ? h - 1 - r : y; return (x - cx) ** 2 + (y - cy) ** 2 <= (r - 0.5) ** 2 + r * 0.5; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) pb.set(x, y, inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1) ? C.panel : C.hairline);
  return pb;
};
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
const putOrMaster = (id, masterId, w, h, until, build, extra = {}) => { const m = masterId && masterAt(masterId, w, h); if (m) { if (!hasAsset(id)) placeMaster({ id, w, h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile, status: m.status }, assetOf(masterId)); return id; } return put(id, w, h, until, build, extra); };

// Register what a view asked for. `env`: { podById, frameOf }. Returns nothing; the ids are in the requests.
export function registerPictures(reqs, env) {
  for (const r of reqs) {
    const until = r.until || "the Pods masters (station-layouts.md, Placeholders on Pods)";
    switch (r.kind) {
      case "pod": if (!r.species && r.state === "sealed" && podClass(r.size) && masterAt(`pod-${layerClass(podClass(r.size))}-unknown`, r.size[0], r.size[1])) { putOrMaster(r.id, `pod-${layerClass(podClass(r.size))}-unknown`, r.size[0], r.size[1]); break; } { const composed = podComposed(r.size); put(r.id, r.size[0], r.size[1], "the pod renderer's masters", () => podPicture(r.species, r.state, r.size, env), composed ? { status: podStatus(layerClass(podClass(r.size))) } : {}); break; }
      case "place": putOrMaster(r.id, `place-${r.place}-${r.size || 16}x${r.size || 16}`, r.size || 16, r.size || 16, "the place picture set", () => placePB(r.place, r.size || 16)); break;
      case "placepanel": putOrMaster(r.id, `panel-place-${r.size[0]}x${r.size[1]}`, r.size[0], r.size[1], "the collection's place master", () => placePanelPB(r.size[0], r.size[1], r.radius)); break;
      case "kinring": putOrMaster(r.id, `ring-kin-${r.size}x${r.size}`, r.size, r.size, "the pod list master", () => kinRingPB(r.size, r.band)); break;
      case "grow": putOrMaster(r.id, "mark-can-grow-16", 16, 16, "the can-grow mark's master", growPB); break;
      case "waiting": putOrMaster(r.id, "mark-waiting-24", 24, 24, "the waiting mark's master", waitingPB); break;
      case "figure": put(r.id, r.size[0], r.size[1], "the figure masters (mist and clear)", () => figureFromLayers(r.mist, r.clear, r.alpha, r.size), { status: figureStatus(r.mist, r.clear) }); break;
      case "slot": {   // a master at exactly this size takes the id; otherwise the id is an empty slot, waiting
        const m = assetEntry(r.master), e = assetEntry(r.id);
        if (m && m.file && m.status !== "empty" && m.w === r.size[0] && m.h === r.size[1]) { if (!e || e.status === "empty") placeMaster({ id: r.id, w: m.w, h: m.h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile, status: m.status }, assetOf(r.master)); }
        else registerSlot({ id: r.id, w: r.size[0], h: r.size[1], until: r.until });
        break;
      }
      case "hatch": putOrMaster(r.id, `ring-hatch-${r.size[0]}x${r.size[1]}`, r.size[0], r.size[1], "the pod list master", () => hatchPB(r.size[0])); break;
      case "beam": put(r.id, r.size[0], r.size[1], until, () => beamArt(r.size[0], r.size[1])); break;
      case "emblem": putOrMaster(r.id, `rail-emblem-${r.chapter}-${r.state || "unread"}-24x24`, 24, 24, "the chapter rail master", () => emblemArt(r.chapter, 24)); break;
      case "star": putOrMaster(r.id, "glint-star-12x12", 12, 12, "the glint master", starPB); break;
      case "stamp": put(r.id, r.size, r.size, "the stamp's label art", () => { const p = env.podById(r.pod), fr = env.frameOf(r.species), sp = stampPicture(fr, p.genome, r.read); return sp.build(); }); break;
      case "icon": put(r.id, r.px, r.px, "the icon set", () => ICON[r.name](r.px)); break;
      default: throw new Error("unknown picture kind " + r.kind);
    }
  }
}
// The material icons the text runs draw (16 px).
export const iconRequests = () => ["energy", "data", "essence", "cross"].map((name) => ({ kind: "icon", id: `icon:${name}:16`, name, px: 16 }));
