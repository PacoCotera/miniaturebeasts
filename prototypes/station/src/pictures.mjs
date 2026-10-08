// The Pods pictures, registered in the asset manifest at the size the layout spec lists, and built through the asset
// cache by id (technical-architecture.md §5.5). A view asks for a picture with a plain-JSON request; this module turns
// the request into a registered entry (a placeholder, flagged, with what it waits for) whose builder draws it once at
// its size: the pod from the frame's parameters, the close-ups through the rig's camera at the picture's own size, the
// stamp on whole-pixel cells. Nothing is ever cropped and enlarged.
import { registerAsset, hasAsset } from "../../ui/assets.mjs";
import { PB, C, art, fromRGBA, bay, nearestHex } from "./gfx.mjs";
import { podArt, ringArt, wellArt, emblemArt, closeUpPB, ICON, PIC_GROUND } from "./art.mjs";
import { beamArt } from "./screens/frame.mjs";
import { shapeTrait, stampGenome, stampSizing } from "./genome.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";

const PLACE_COL = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
const put = (id, w, h, until, build, extra = {}) => { if (!hasAsset(id)) registerAsset({ id, w, h, status: "placeholder", until, build: () => build(), ...extra }); return id; };

// The pod at the exact size of its box: the shell is drawn to fill it (the pod renderer's own parameters at the scale
// that fits the box), never an image enlarged.
function podPicture(frame, place, state, [bw, bh]) { return podArt(frame, place, 1, state, [bw, bh]); }
const cradlePB = () => { const pb = new PB(224, 40); pb.ell(112, 24, 110, 15, C.slate); pb.ell(112, 20, 100, 12, C.stone, { sh: [C.mist, C.night] }); pb.outline(() => C.ink); return pb; };
const hatchPB = () => { const pb = new PB(112, 56); pb.rect(0, 2, 112, 52, C.slate); pb.rect(4, 6, 104, 44, C.night); pb.rect(8, 24, 96, 8, C.void); pb.ell(56, 28, 5.5, 11.5, C.leaf, { rot: 0.6, sh: [C.sprout, C.forest] }); pb.outline(() => C.ink); return pb; };
const placePB = (place) => { const pb = new PB(16, 16), c = C[PLACE_COL[place] || "mist"]; pb.rect(1, 1, 14, 14, c); pb.rect(3, 3, 10, 10, C.ink); pb.rect(5, 5, 6, 6, c); return pb; };
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
  const { N, cell, size } = stampSizing(frame);
  return { N, cell, size, build: () => fromRGBA(rasterize(stampGeometry(sg), N * cell, { ss: 3, size })) };
}

// Register what a view asked for. `env`: { podById, frameOf }. Returns nothing; the ids are in the requests.
export function registerPictures(reqs, env) {
  for (const r of reqs) {
    const until = r.until || "the Pods masters (station-layouts.md, Placeholders on Pods)";
    switch (r.kind) {
      case "pod": put(r.id, r.size[0], r.size[1], "the pod renderer's masters", () => podPicture(r.species ? env.frameOf(r.species) : null, r.place, r.state, r.size)); break;
      case "well": put(r.id, 64, 64, "the pod list master", () => wellArt(r.current, 30)); break;
      case "ring": put(r.id, 64, 64, "the pod list master", () => ringArt(r.species ? env.frameOf(r.species) : null, { idd: r.idd }, r.flags, 31)); break;
      case "place": put(r.id, 16, 16, "the place stamp set", () => placePB(r.place)); break;
      case "hatch": put(r.id, 112, 56, "the pod list master", hatchPB); break;
      case "cradle": put(r.id, 224, 40, "the pod renderer's masters", cradlePB); break;
      case "beam": put(r.id, 240, 232, until, () => beamArt(240, 232)); break;
      case "emblem": put(r.id, 24, 24, "the chapter rail master", () => emblemArt(r.chapter, 24)); break;
      case "star": put(r.id, 12, 12, "the glint master", starPB); break;
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
