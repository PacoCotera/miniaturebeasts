// The Library's intents (library.json l1.keys): on Level 1, ✓ on a met or found cell opens that species (library.species, which the frame draws as not built yet) and ← goes Home with the ring on the Library bezel.
// The pad is the face's (l1.focus.graph): the host keeps the species of the ring in ui.lib.l1 (`focus`), so the Library key, ← from a level below and the jumps land on it. An unmet cell is not a target.
import * as Lib from "../library.mjs";
import { frameIds } from "../genome.mjs";

const cellSpecies = (target) => (typeof target === "string" && target.startsWith("cell.") && frameIds().includes(target.slice(5)) ? target.slice(5) : null);
// The ring moved to a cell (the face says `cell.<SNN>`): the Library keeps its species.
export function focus(h, target) { const id = cellSpecies(target); if (id) h.ui.lib.l1 = id; }
// A way in that names a species ("Open the guide" on Pods' figure and on the card's species word; Home's Library bezel): Level 1 with the ring on it.
export function openAt(h, id) { if (id && frameIds().includes(id)) h.ui.lib.l1 = id; h.goto("library"); }
// `target`: `cell.<SNN>` on Level 1. Level 2 is not built: the frame's notBuilt composition takes its ← (the host goes to the parent, Level 1, where ui.lib.l1 still names the species).
export function intent(h, target, verb) {
  if (verb === "back") { h.ui.home.f = "library"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  const id = cellSpecies(target); if (!id || Lib.speciesStatus(h.st, id) === "unmet") return;
  h.ui.lib.l1 = id; h.goto("library.species");
}
