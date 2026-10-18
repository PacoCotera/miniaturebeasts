// Which picture an owned mibi takes (Fix 1b part 3; station-layouts.md, Composed states, rule 5): a mibi the player owns is never absent. An adult or elder takes, in order, (1) its species' signed adult stand mibi-adult-SNN-WxH,
// (2) its species' signed juvenile stand mibi-juvenile-SNN at the size below, drawn 1:1, never scaled, (3) the host's stand-in from its own genome at the adult's own size (the rig, shown as a stand-in).
// A view asks `standLook` and names the picture by what it returns; the hook (pictures.mjs, kind mibi) asks the same, so both agree. A juvenile has only its own stand (step 3 when none).
import { assetEntry } from "../../ui/assets.mjs";

// the adult places whose juvenile master is smaller: the living windows' 144×152 resident holds the 104×112 juvenile; every other size has a juvenile master of its own size
const JUVENILE_OF = { "144x152": [104, 112] };
export const juvenileSize = ([w, h]) => JUVENILE_OF[`${w}x${h}`] ?? [w, h];
// a placed master of any record status at exactly this size, not a built stand-in (the hook's own test)
export const placedAt = (id, w, h) => { const m = assetEntry(id); return !!m && m.status !== "empty" && !!m.file && m.w === w && m.h === h; };
// { stage, size, step }: stage "juvenile" with the juvenile's size when step 2 applies, else the asked stage and size (step 1: the adult stand is placed; step 3: the genome stand-in)
export function standLook(species, stage, size) {
  const [w, h] = size;
  if (stage === "juvenile") return { stage, size: [w, h], step: placedAt(`mibi-juvenile-${species}-${w}x${h}`, w, h) ? 1 : 3 };
  if (placedAt(`mibi-adult-${species}-${w}x${h}`, w, h)) return { stage, size: [w, h], step: 1 };
  const [jw, jh] = juvenileSize(size);
  if (placedAt(`mibi-juvenile-${species}-${jw}x${jh}`, jw, jh)) return { stage: "juvenile", size: [jw, jh], step: 2 };
  return { stage, size: [w, h], step: 3 };
}
