// The Library's intents (library.json l1.keys, l2.keys). Level 1: ✓ on a met or found cell opens that species' Level 2 (library.species) and ← goes Home with the ring on the Library bezel.
// Level 2: ✓ on a plate lights its chapter (lit) or clears it; ✓ on the face jumps to that mibi up close, on a family face to Level 3 (library.family, which the frame draws as not built yet); ← clears a lit chapter, else returns to Level 1
// with the ring on this species. The pads are the face's (l1.focus.graph, l2.focus.<state>): the host keeps the species of Level 1's ring in ui.lib.l1 and Level 2's ring in ui.lib.cur, its memory in ui.lib.l2[species]. An unmet cell is not a target.
import * as Lib from "../library.mjs";
import { frameIds, frameOf } from "../genome.mjs";

const cellSpecies = (target) => (typeof target === "string" && target.startsWith("cell.") && frameIds().includes(target.slice(5)) ? target.slice(5) : null);
// The ring moved to a cell (the face says `cell.<SNN>`): the Library keeps its species.
export function focus(h, target) { const id = cellSpecies(target); if (id) h.ui.lib.l1 = id; }
// A way in that names a species (Home's Library bezel): Level 1 with the ring on it.
export function openAt(h, id) { if (id && frameIds().includes(id)) h.ui.lib.l1 = id; h.goto("library"); }
// Level 2 of a met or found species, in `sheet` (library.json l2.focus.initial: the ring on ui.lib.l2[species], else the first open chapter): Level 1's ✓ and "Open the guide" (Pods' figure, the card's species word).
// Level 1's ring is put on it too, so ← lands there. An unmet species has no Level 2: nothing happens.
export function openSpecies(h, id) {
  if (!id || !frameIds().includes(id) || Lib.speciesStatus(h.st, id) === "unmet") return false;
  const L = h.ui.lib; L.l1 = id; L.species = id; L.state = "sheet"; L.lit = null; L.cur = null; L.l2 ??= {};
  h.goto("library.species"); return true;
}
// `target`: `cell.<SNN>` on Level 1. ✓ opens that species' Level 2.
export function intent(h, target, verb) {
  if (verb === "back") { h.ui.home.f = "library"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  const id = cellSpecies(target); if (!id) return;
  openSpecies(h, id);
}

// ---- Level 2 (library.species) ----
const chapterOf = (target) => (typeof target === "string" && target.startsWith("chapter.") ? target.slice(8) : null);
// The ring moved on Level 2: the host keeps it; in sheet its memory is written on each move, in lit the memory holds the lit chapter's plate whatever the ring is on.
function speciesFocus(h, target) {
  const L = h.ui.lib; if (!L.species) return;
  L.cur = target; L.l2 ??= {}; L.l2[L.species] = L.state === "lit" && L.lit ? "chapter." + L.lit : target;
}
// Clear the lit chapter: back to sheet with the ring on its plate.
function clear(h) { const L = h.ui.lib, ch = L.lit; L.state = "sheet"; L.lit = null; if (ch) { L.cur = "chapter." + ch; L.l2[L.species] = L.cur; } }
function speciesIntent(h, target, verb) {
  const L = h.ui.lib, sid = L.species; if (!sid || !frameOf(sid)) return;
  if (verb === "back") { if (L.state === "lit") { clear(h); return; } L.l1 = sid; h.goto("library"); return; }
  if (verb !== "confirm" || Lib.speciesStatus(h.st, sid) !== "found") return;   // met-only: no ✓
  const ch = chapterOf(target);
  if (ch) {
    if (!frameOf(sid).chapters.some((c) => c.id === ch)) return;
    if (L.state === "lit" && L.lit === ch) { clear(h); return; }   // ✓ Clear {Chapter}
    L.state = "lit"; L.lit = ch; L.cur = target; L.l2 ??= {}; L.l2[sid] = target; return;   // ✓ Show {Chapter}: the ring stays on the plate; the lit variant and the page are asked for (the props)
  }
  if (target === "face") { const m = Lib.visitFace(h.st, sid); if (m) { h.ui.hab.id = m.id; h.ui.hab.f = "resident"; h.goto("habitat"); } return; }   // ✓ Look at {name}: that mibi up close (none when released)
  if (typeof target === "string" && target.startsWith("family.")) { L.family = +target.slice(7); h.goto("library.family"); return; }   // ✓ See the family: Level 3 (not built yet)
  // the wish: "Change the wish" opens pinning, which has no screen yet; a look disc: no ✓
}
export const species = { intent: speciesIntent, focus: speciesFocus };
