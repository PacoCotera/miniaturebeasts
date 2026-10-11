// The Library's intents: ✓ on a found frame of the spread opens its Book, ✓ on a met or an unmet frame shows a plate and opens nothing, ← goes up (the Book to the spread, the spread Home). The spread's pad moves are the face's:
// the host passes the ring's frame in through `focus`. The Book is a state of the library screen (`ui.lib.f`: "book", later "guide"), not a screen of its own; until slot 8 it draws "not built yet".
import * as Lib from "../library.mjs";
import { frameIds } from "../genome.mjs";

// The book of a species (a new species at Identify opens its page); the ring's frame follows it, so ← from the Book lands on that species.
export function openBook(h, id) { const l = h.ui.lib, i = frameIds().indexOf(id); if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; } l.sp = id; l.f = "book"; }
// The ring moved to a frame of the spread (the face says `frame.<SNN>`): the Library keeps it, so the Library key and Home's Library module land where the player left it.
export function focus(h, target) {
  const l = h.ui.lib, id = typeof target === "string" && target.startsWith("frame.") ? target.slice(6) : null, i = id ? frameIds().indexOf(id) : -1;
  if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; }
}
// `target`: `frame.<SNN>` on the spread; in a Book (or its guide) the face draws "not built yet" and says only ← and the room keys.
export function intent(h, target, verb) {
  const l = h.ui.lib;
  if (l.f !== "spread") {
    if (verb === "back") l.f = "spread";   // a cut, the same screen, the ring on that species (openBook set it)
    else if (verb === "confirm" && l.f === "book") { /* slot 8: the Book's Visit; unreachable until the Book is built (the face says no ✓ in "not built yet") */ const m = Lib.visitTarget(h.st, l.sp); if (m) { h.ui.hab.id = m.id; h.ui.hab.f = "resident"; h.goto("habitat"); } }
    return;
  }
  if (verb === "back") { h.ui.home.f = "library"; h.goto("home"); return; }
  if (verb !== "confirm" || typeof target !== "string" || !target.startsWith("frame.")) return;
  const id = target.slice(6), Sg = h.specs.library.spread.strings, status = Lib.speciesStatus(h.st, id);
  focus(h, target);
  if (status === "found") openBook(h, id);
  else h.say(status === "met" ? Sg.met : Sg.unmet);
}
