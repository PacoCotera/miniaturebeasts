// The Pods pictures, registered in the asset manifest at the size the layout spec lists, and built through the asset
// cache by id (technical-architecture.md §5.5). A view asks for a picture with a plain-JSON request; this module turns
// the request into a registered entry (a placeholder, flagged, with what it waits for) whose builder draws it once at
// its size: the pod from the frame's parameters, the close-ups through the rig's camera at the picture's own size, the
// stamp on whole-pixel cells. Nothing is ever cropped and enlarged.
import { registerAsset, hasAsset } from "../../ui/assets.mjs";
import { PB, C, HEX, art, fromRGBA, bay, nearestHex } from "./gfx.mjs";
import { podSprite } from "./podsprites.mjs";
import { podFromLayers, layersPlaced, figureFromLayers } from "./podmasters.mjs";
import { SPECS } from "./game.mjs";
import { assetEntry, placeMaster, registerSlot, asset as assetOf } from "../../ui/assets.mjs";
import { ringArt, wellArt, emblemArt, closeUpPB, ICON, PIC_GROUND } from "./art.mjs";
import { beamArt } from "./screens/frame.mjs";
import { shapeTrait, stampGenome, stampSizing } from "./genome.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";

const PLACE_COL = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
const put = (id, w, h, until, build, extra = {}) => { if (!hasAsset(id)) registerAsset({ id, w, h, status: "placeholder", until, build: () => build(), ...extra }); return id; };

// A picture placed 1:1 in the middle of a larger transparent one (the list's 80×80 ring slice holds the 64×64 stand-in).
const centred = ([w, h], pic) => { const pb = new PB(w, h); pb.blit(pic, Math.round((w - pic.w) / 2), Math.round((h - pic.h) / 2)); return pb; };
// The pod at the exact size of its box, never scaled: the stage's three classes from the signed layers recoloured by the species' pair (podmasters.mjs); the list's 40×48
// box holds the 32×40 placeholder sprite placed 1:1 in its middle until its master is re-cut; a class whose layers are not placed is an empty (transparent) picture.
const UNKNOWN_PAIR = () => [HEX[C.stone], HEX[C.bone]];   // only until the signed pod-<class>-unknown pictures are placed
const podClass = ([bw, bh]) => { const classes = SPECS.pods.classes.pod; return Object.keys(classes).find((k) => classes[k][0] === bw && classes[k][1] === bh); };
const podComposed = (size) => { const cls = podClass(size); return !!cls && cls !== "list" && layersPlaced(cls); };   // a pod from the signed layers is painted art, not the palette's
function podPicture(species, state, [bw, bh], env) {
  const cls = podClass([bw, bh]);
  if (cls === "list") { const pb = new PB(bw, bh), sp = podSprite(species, "well", state); pb.blit(sp, Math.round((bw - sp.w) / 2), Math.round((bh - sp.h) / 2)); return pb; }
  if (cls && layersPlaced(cls)) {
    const frame = species ? env.frameOf(species) : null, pair = frame ? frame.pod.colourPair.map((c) => c.hex) : UNKNOWN_PAIR();
    return podFromLayers(cls, pair, frame?.pod.shellPattern, SPECS.pods.podLayers.patterns, state === "sealed");
  }
  return new PB(bw, bh);
}
const cradlePB = () => { const pb = new PB(224, 40); pb.ell(112, 24, 110, 15, C.slate); pb.ell(112, 20, 100, 12, C.stone, { sh: [C.mist, C.night] }); pb.outline(() => C.ink); return pb; };
const hatchPB = (w = 112) => { const pb = new PB(w, 56); pb.rect(0, 2, w, 52, C.slate); pb.rect(4, 6, w - 8, 44, C.night); pb.rect(8, 24, w - 16, 8, C.void); pb.ell(w / 2, 28, 5.5, 11.5, C.leaf, { rot: 0.6, sh: [C.sprout, C.forest] }); pb.outline(() => C.ink); return pb; };
// The find's place picture at the size it is asked for (drawn at that size, never scaled): a frame, a dark inner square and the place's colour in the middle.
const placePB = (place, size = 16) => { const pb = new PB(size, size), c = C[PLACE_COL[place] || "mist"], k = size / 16; pb.rect(k, k, size - 2 * k, size - 2 * k, c); pb.rect(3 * k, 3 * k, size - 6 * k, size - 6 * k, C.ink); pb.rect(5 * k, 5 * k, size - 10 * k, size - 10 * k, c); return pb; };
// A recessed place of the collection: `panel` with a one-pixel `hairline` edge and 6 px corners.
const placePanelPB = (w, h, r = 6) => {
  const pb = new PB(w, h), inside = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return false; const cx = x < r ? r : x >= w - r ? w - 1 - r : x, cy = y < r ? r : y >= h - r ? h - 1 - r : y; return (x - cx) ** 2 + (y - cy) ** 2 <= (r - 0.5) ** 2 + r * 0.5; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) pb.set(x, y, inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1) ? C.panel : C.hairline);
  return pb;
};
// The collection's progress ring (160 across, an 8 px band): one arc per chapter from the top, clockwise, 2 px apart; `bone` when read, `bevel` when not; the band closes when every chapter is read.
// An unidentified pod, or an empty place, has the base band alone.
const collectionRingPB = (read, size = 160, band = 8) => {
  const pb = new PB(size, size), R = size / 2, n = read ? read.length : 0, closed = n > 0 && read.every(Boolean), step = n ? (2 * Math.PI) / n : 0, mid = R - band / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - R, dy = y + 0.5 - R, d = Math.hypot(dx, dy); if (d > R || d <= R - band) continue;
    if (!n) { pb.set(x, y, C.hairline); continue; }
    if (closed) { pb.set(x, y, C.bone); continue; }
    const a = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI), k = Math.min(n - 1, Math.floor(a / step)), edge = Math.min(a - k * step, (k + 1) * step - a) * mid;
    if (edge >= 1) pb.set(x, y, read[k] ? C.bone : C.bevel);
  }
  return pb;
};
// A kin's ring: the small pod's circle, a 2 px band in `hairline`.
const kinRingPB = (size = 56, band = 2) => { const pb = new PB(size, size), R = size / 2; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x + 0.5 - R, y + 0.5 - R); if (d <= R && d > R - band) pb.set(x, y, C.hairline); } return pb; };
// The picture of the find that opens a shut chapter: a key-shaped crystal at the size it is asked for.
const sealPB = (n) => { const pb = new PB(n, n), c = n / 2; pb.poly([[c, 0.1 * n], [0.9 * n, c], [c, 0.9 * n], [0.1 * n, c]], C.lilac); pb.poly([[c, 0.1 * n], [0.9 * n, c], [c, c]], C.lavender); pb.outline(() => C.plumD); return pb; };
const growPB = () => { const pb = new PB(16, 16); pb.rect(7, 6, 2, 9, C.leaf); pb.poly([[7, 8], [1, 3], [7, 5]], C.sprout); pb.poly([[9, 6], [15, 1], [9, 3]], C.sprout); pb.outline(() => C.ink); return pb; };
const waitingPB = () => { const pb = new PB(24, 24); for (const x of [6, 12, 18]) { pb.ell(x, 12, 3, 4, C.mist); } pb.outline(() => C.slate); return pb; };
const starPB = () => { const pb = new PB(12, 12), r = 6; pb.poly([[r, 0], [r + 1.7, r - 1.7], [12, r], [r + 1.7, r + 1.7], [r, 12], [r - 1.7, r + 1.7], [0, r], [r - 1.7, r - 1.7]], C.cream); pb.rect(5, 5, 2, 2, C.white); pb.outline(() => C.gold); return pb; };
const slatsPB = (w, h) => { const pb = new PB(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = y % 14; pb.set(x, y, r < 2 ? C.slate : r < 4 ? C.stone : C.night); } return pb; };
// The unread picture's frost: frosted glass over the pane, `frostS` with `frostD` at most (never `frost` or white).
const frostPB = (w, h) => { const pb = new PB(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const streak = (x + y * 2) % 23 < 2 && bay(x, y) < 10, low = y > h * 0.7 && bay(x, y) < (y - h * 0.7) / 3; pb.set(x, y, streak || low || bay(x, y) < 3 ? C.frostD : C.frostS); } return pb; };
const keyPB = () => { const pb = new PB(44, 64); pb.poly([[22, 6], [40, 32], [22, 58], [4, 32]], C.lilac); pb.poly([[22, 6], [40, 32], [22, 32]], C.lavender); pb.outline(() => C.plumD); return pb; };
const basePB = () => { const pb = new PB(72, 8); pb.rect(2, 0, 68, 5, C.bevel); pb.rect(2, 0, 68, 2, C.metal); pb.rect(0, 5, 72, 3, C.bar); return pb; };
const asleepPB = () => { const pb = new PB(24, 16); for (const [x, y] of [[3, 3], [13, 7], [19, 11]]) pb.rect(x, y, 4, 4, C.fog); pb.rect(4, 4, 2, 2, C.white); return pb; };
const doingPB = () => { const pb = new PB(28, 16); pb.ring(9, 8, 8, 7, C.focus, 2); pb.ring(19, 8, 8, 7, C.focus, 2); pb.outline(() => C.panel); return pb; };
// The difference mark: an aqua bracket (corner ticks, 4 px arms) on a 1 px ink keyline, 12×12.
const bracketPB = () => {
  const pb = new PB(12, 12), ticks = [];
  for (const [x, y, sx, sy] of [[1, 1, 1, 1], [10, 1, -1, 1], [1, 10, 1, -1], [10, 10, -1, -1]]) for (let i = 0; i < 4; i++) ticks.push([x + sx * i, y], [x, y + sy * i]);
  for (const [x, y] of ticks) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < 12 && y + dy >= 0 && y + dy < 12) pb.set(x + dx, y + dy, C.ink);
  for (const [x, y] of ticks) pb.set(x, y, C.aqua);
  return pb;
};
// The misty seed: the hidden look as a frosted close-up in a pearl, the close-up rendered at the pearl's own inner size.
function seedPB(frame, genome, traitId, w, h) {
  const pb = new PB(w, h), iw = Math.round(w * 0.75), ih = Math.round(h * 0.65), ox = Math.round(w * 0.125), oy = Math.round(h * 0.19), src = closeUpPB(frame, genome, traitId, iw, ih), cx = (w - 1) / 2, cy = (h - 1) / 2 + 0.5;
  pb.ell(cx + 0.5, cy, w / 2 - 0.5, h / 2 - 0.5, C.frostS); pb.ell(cx + 0.5, cy, w / 2 - 2, h / 2 - 2, C.frost);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const c = src.get(x, y), px = x + ox, py = y + oy;
    if (((px - cx) / (w / 2 - 2)) ** 2 + ((py - cy) / (h / 2 - 2)) ** 2 <= 0.92 && c >= 0 && c !== PIC_GROUND) pb.set(px, py, bay(px, py) < 5 ? C.frost : c); }
  pb.ring(cx + 0.5, cy, w / 2 - 0.5, h / 2 - 0.5, C.stone, 1); pb.set(Math.round(w * 0.35), Math.round(h * 0.2), C.white); pb.set(Math.round(w * 0.33), Math.round(h * 0.22), C.white); return pb;
}
// The stamp on its label: cells of whole pixels, cell = floor(104 / (N + 2)) and at least 2, drawn with its quiet margin, centred on the 120 label.
export function stampPicture(frame, genome, readIds) {
  const sg = stampGenome(frame, genome, readIds); if (!sg) return null;
  const { N, cell, size } = stampSizing(frame, genome);
  return { N, cell, size, build: () => fromRGBA(rasterize(stampGeometry(sg), N * cell, { ss: 3, size })) };
}

// A picture that is a placed master of another id at exactly this size takes that master (a mark, a place picture, the unknown pod); otherwise the stand-in builds.
const masterAt = (masterId, w, h) => { const m = assetEntry(masterId); return m && m.status === "master" && m.w === w && m.h === h ? m : null; };
const putOrMaster = (id, masterId, w, h, until, build, extra = {}) => { const m = masterId && masterAt(masterId, w, h); if (m) { if (!hasAsset(id)) placeMaster({ id, w, h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile }, assetOf(masterId)); return id; } return put(id, w, h, until, build, extra); };

// Register what a view asked for. `env`: { podById, frameOf }. Returns nothing; the ids are in the requests.
export function registerPictures(reqs, env) {
  for (const r of reqs) {
    const until = r.until || "the Pods masters (station-layouts.md, Placeholders on Pods)";
    switch (r.kind) {
      case "pod": if (!r.species && r.state === "sealed" && podClass(r.size) && masterAt(`pod-${podClass(r.size)}-unknown`, r.size[0], r.size[1])) { putOrMaster(r.id, `pod-${podClass(r.size)}-unknown`, r.size[0], r.size[1]); break; } { const composed = podComposed(r.size); put(r.id, r.size[0], r.size[1], "the pod renderer's masters", () => podPicture(r.species, r.state, r.size, env), composed ? { policy: "painted", status: "master" } : {}); break; }
      case "well": put(r.id, r.size[0], r.size[1], "the pod list master", () => centred(r.size, wellArt(r.current, 30))); break;
      case "ring": put(r.id, r.size[0], r.size[1], "the pod list master", () => centred(r.size, ringArt(r.species ? env.frameOf(r.species) : null, { idd: r.idd }, r.flags, 31))); break;
      case "place": putOrMaster(r.id, `place-${r.place}-${r.size || 16}x${r.size || 16}`, r.size || 16, r.size || 16, "the place picture set", () => placePB(r.place, r.size || 16)); break;
      case "placepanel": put(r.id, r.size[0], r.size[1], "the collection's place master", () => placePanelPB(r.size[0], r.size[1])); break;
      case "cring": put(r.id, r.size, r.size, "the pod list master", () => collectionRingPB(r.read, r.size)); break;
      case "kinring": put(r.id, r.size, r.size, "the pod list master", () => kinRingPB(r.size)); break;
      case "seal": put(r.id, r.size, r.size, "the chapter seals' master", () => sealPB(r.size)); break;
      case "grow": put(r.id, 16, 16, "the can-grow mark's master", growPB); break;
      case "waiting": put(r.id, 24, 24, "the waiting mark's master", waitingPB); break;
      case "figure": put(r.id, r.size[0], r.size[1], "the figure masters (mist and clear)", () => figureFromLayers(r.mist, r.clear, r.alpha, r.size), { policy: "painted" }); break;
      case "slot": {   // a master at exactly this size takes the id; otherwise the id is an empty slot, waiting
        const m = assetEntry(r.master), e = assetEntry(r.id);
        if (m && m.status === "master" && m.w === r.size[0] && m.h === r.size[1]) { if (!e || e.status === "empty") placeMaster({ id: r.id, w: m.w, h: m.h, file: m.file, hash: m.hash, signed: m.signed, slice: m.slice, tile: m.tile }, assetOf(r.master)); }
        else registerSlot({ id: r.id, w: r.size[0], h: r.size[1], policy: "painted", until: r.until });
        break;
      }
      case "hatch": putOrMaster(r.id, `ring-hatch-${r.size[0]}x${r.size[1]}`, r.size[0], r.size[1], "the pod list master", () => hatchPB(r.size[0])); break;
      case "cradle": put(r.id, 224, 40, "the pod renderer's masters", cradlePB); break;
      case "beam": put(r.id, r.size[0], r.size[1], until, () => beamArt(r.size[0], r.size[1])); break;
      case "emblem": putOrMaster(r.id, `rail-emblem-${r.chapter}-${r.state || "unread"}-24x24`, 24, 24, "the chapter rail master", () => emblemArt(r.chapter, 24)); break;
      case "star": putOrMaster(r.id, "glint-star-12x12", 12, 12, "the glint master", starPB); break;
      case "frost": put(r.id, r.w, r.h, "the research bench master", () => frostPB(r.w, r.h)); break;
      case "slats": put(r.id, r.w, r.h, "the research bench master", () => slatsPB(r.w, r.h)); break;
      case "key": put(r.id, 44, 64, "the chapter seals' master", keyPB); break;
      case "base": put(r.id, 72, 8, "the marks' master", basePB); break;
      case "asleep": put(r.id, 24, 16, "the marks' master", asleepPB); break;
      case "doing": put(r.id, 28, 16, "the marks' master", doingPB); break;
      case "bracket": put(r.id, 12, 12, "the marks' master", bracketPB); break;
      case "trait": put(r.id, r.w, r.h, "the painting's close-ups", () => { const p = env.podById(r.pod), fr = env.frameOf(r.species); return closeUpPB(fr, p.genome, r.trait, r.w, r.h); }); break;
      case "seed": put(r.id, r.w, r.h, "the seed master", () => { const p = env.podById(r.pod), fr = env.frameOf(r.species); return seedPB(fr, shapeTrait(fr, p.genome, r.trait, r.choice), r.trait, r.w, r.h); }); break;
      case "stamp": put(r.id, r.size, r.size, "the stamp's label art", () => { const p = env.podById(r.pod), fr = env.frameOf(r.species), sp = stampPicture(fr, p.genome, r.read); return sp.build(); }); break;
      case "icon": put(r.id, r.px, r.px, "the icon set", () => ICON[r.name](r.px)); break;
      default: throw new Error("unknown picture kind " + r.kind);
    }
  }
}
// The material icons the text runs draw (16 px).
export const iconRequests = () => ["energy", "data", "essence", "cross"].map((name) => ({ kind: "icon", id: `icon:${name}:16`, name, px: 16 }));
