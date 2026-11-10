// A room picture at a step of the day curve (light-curve.mjs): "room-roots-idle-@L50-1024x568" is derived from the room's signed paintings of the two lights the step mixes ("…-day-…", "…-dusk-…"), by
// light-grade.mjs mixGrade, and takes the step's gain (at most 1). Nothing is drawn: the pictures are the signed masters, mixed. Idle, Home's glass, the Vivarium and the close view ask the same id, so they show the same step.
// A room whose rooms.json entry says `dusk: "unregistered"` (Roots, Reeds until their dusk is repainted in register) never mixes dusk: inside the loop its warm sun is the day painting with the warm gain alone, and on the
// real clock a step takes the larger of its two paintings whole (the swap, a dither on the face), with the step's gain.
import { assetEntry, registerSlot, registerAsset, hasAsset, asset as assetOf } from "../../ui/assets.mjs";
import { mixGrade, stepOfLight } from "./light-grade.mjs";

export const STEP_ID = /^(.+)-(@L\d\d|@\d{4})-(\d+x\d+)$/;
const ORDER = ["night", "dawn", "day", "dusk"];   // the first of a pair is the one the share is taken from (1 − w)
export function stepMix(key, room, rooms) {
  const step = stepOfLight(key); if (!step) return null;
  let mix = { ...step.mix };
  if (mix.dusk && rooms?.rooms?.[room]?.dusk === "unregistered") {
    if (key.startsWith("@L")) mix = { day: 1 };   // the loop's warm sun: the day painting, the warm gain alone
    else { const top = Object.keys(mix).sort((p, q) => mix[q] - mix[p] || ORDER.indexOf(p) - ORDER.indexOf(q))[0]; mix = { [top]: 1 }; }
  }
  const names = Object.keys(mix).sort((p, q) => ORDER.indexOf(p) - ORDER.indexOf(q));
  return { a: names[0], b: names[1] ?? names[0], w: names[1] ? mix[names[1]] : 0, gain: step.gain };
}
// Register the picture a request names; an empty slot while the paintings are not placed (the host holds the face until a room's pictures are in), filled on a later call. Returns true when it handled the id.
export function registerStepSlot(r, rooms) {
  const m = STEP_ID.exec(r.id); if (!m) return false;
  const [, prefix, key, size] = m, room = /^room-([a-z0-9]+)-/.exec(prefix)?.[1] ?? null, mx = stepMix(key, room, rooms); if (!mx) return false;
  const ida = `${prefix}-${mx.a}-${size}`, idb = `${prefix}-${mx.b}-${size}`, placed = (id) => { const e = assetEntry(id); return !!(e && e.file && e.status !== "empty" && e.w === r.size[0] && e.h === r.size[1]); };
  const e = assetEntry(r.id);
  if (placed(ida) && placed(idb)) { if (!e || e.status === "empty") registerAsset({ id: r.id, w: r.size[0], h: r.size[1], status: "derived", until: null, build: () => mixGrade(assetOf(ida), assetOf(idb), mx.w, mx.gain) }); }
  else if (!hasAsset(r.id)) registerSlot({ id: r.id, w: r.size[0], h: r.size[1], until: r.until });
  return true;
}
