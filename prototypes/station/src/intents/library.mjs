// The Library's intents: ✓ on a species of the spread opens its book, ✓ in the book visits (a jump to Habitat), ← goes up (the book to the spread, the spread Home). The spread's pad moves are the face's.
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameIds } from "../genome.mjs";

const pageOf = (l) => frameIds().slice(l.page * 16, l.page * 16 + 16);
// The book of a species (a new species at Identify opens its page).
export function openBook(h, id) { const l = h.ui.lib, i = frameIds().indexOf(id); if (l.page == null) { l.page = 0; l.i = 0; } if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; } l.sp = id; l.f = "book"; }
// `target`: the species id on the spread ("sp:<id>" or the id), or "book" in a book.
export function intent(h, target, verb) {
  const l = h.ui.lib; if (l.page == null) { l.page = 0; l.i = 0; }
  if (l.f === "book") {
    if (verb === "back") l.f = "spread";
    else if (verb === "confirm") { const m = Lib.visitTarget(h.st, l.sp); if (m) { h.ui.hab.id = m.id; h.ui.hab.f = "stage"; h.goto("habitat"); } }
    return;
  }
  if (verb === "back") { h.goto("home"); return; }
  if (verb !== "confirm") return;
  const id = typeof target === "string" && target.startsWith("sp:") ? target.slice(3) : target ?? pageOf(l)[l.i];
  if (id && (h.st.knownIds.includes(id) || h.st.metIds.includes(id))) { l.sp = id; l.f = "book"; } else h.say("Nothing is known of this frame yet");
}
