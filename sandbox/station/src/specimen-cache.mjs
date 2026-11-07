// The specimen's cache (build spec 4.2): the picture of a species at its found looks is rendered once and kept by its id, specimen:{species}:{digest of the found looks}:v{recipe}; a new look is a new id and a new render, and nothing else
// re-renders it. The render takes under a second in the logic process, off the face's frame (the discovery's own reveal covers it); its time is printed.
import { renderSpecimen, RECIPE } from "./specimen.mjs";

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };
// The digest of a species' found looks: its traits sorted, each trait's looks in the order they were found (a look found earlier grows longer, so the order is in the picture).
export const foundDigest = (found) => hash(Object.keys(found).sort().map((t) => `${t}=${found[t].join("|")}`).join(";"));
export const specimenId = (species, found) => `specimen:${species}:${foundDigest(found)}:v${RECIPE}`;
const CACHE = new Map();
let renders = 0;
export const renderCount = () => renders;   // the renders made so far (a test reads it)
// The picture if it is made, else null; never renders.
export const peekSpecimen = (species, found) => CACHE.get(specimenId(species, found)) ?? null;
export const clearSpecimens = () => CACHE.clear();
// { id, w, h, rgba, beads, levels, ms } for a frame and the species' found looks ({ <trait>: [looks] }); `print` receives the one line each fresh render prints (console.log by default).
// shut: the sealed chapters that are still shut (a list of chapter ids); with it the frame's own seal flags give way to it, so a sealed chapter the player has opened draws its looks. The found looks never hold a shut chapter's, so it is not in the id.
export function specimenFor(frame, found, species = frame.species.id, shut = null, print = (s) => console.log(s)) {
  const id = specimenId(species, found), have = CACHE.get(id); if (have) return have;
  if (shut) frame = { ...frame, chapters: frame.chapters.map((ch) => ({ ...ch, sealed: shut.includes(ch.id) })) };
  const r = renderSpecimen(frame, { [species]: found }); renders++; const out = { id, ...r };
  print(`# specimen ${id}: ${Object.values(found).reduce((n, a) => n + a.length, 0)} looks, rendered in ${r.ms.toFixed(0)} ms (${r.w} x ${r.h}, ${r.beads.length} beads)`);
  CACHE.set(id, out); return out;
}
