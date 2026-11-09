// The decision panel's intents (panel.json; specs/station-decision-panel-spec.md Part 1): `h.ui.panel = { screen, id, focus }` while it is open, null otherwise. ✓ does the focused card (a dimmed card: the warn words on the message plate, nothing
// spent), ← closes with nothing spent, a room key closes with nothing spent and then acts as everywhere (intents/frame.mjs); the pad's moves are the face's and arrive as `focus`. The way out of a panel is its last card.
// The panel is one component for every commitment: a screen opens it with `openPanel(h, screen, id)` and `doCard` below answers the card pressed; Grow this founder? is Create's (intents/create.mjs growFounder).
import * as S from "../state.mjs";
import { panelBuild, cardsOf, initialFocus, settleWords } from "../views/panel-props.mjs";
import { incubateNow, keepShaping } from "./create.mjs";
import { returnNow } from "./habitat.mjs";
import { fitNow } from "./bench.mjs";
import { addRoomNow, returnFromCard } from "./vivarium.mjs";
import { growNow } from "./incubator.mjs";
import { later, openFromArrival } from "./arrival.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const model = (h) => ({ st: h.st, sv: h.sv, settings: h.settings, ui: h.ui, jump: h.settings.jump, now: h.now() });
// Opens the panel on the screen: nothing is spent; the ring on the first card that is neither dimmed nor a loss (else the way out).
export function openPanel(h, screen, id) {
  h.ui.panel = { screen, id, focus: "" };
  h.ui.panel.focus = initialFocus(cardsOf(model(h), h.specs.panel, h.specs.frame, []));
}
export function closePanel(h) { h.ui.panel = null; }
// The full panel (panel.json full; dead ends B2): the one way out of every full-Vivarium refusal, opened on the screen the player is on (Incubator, Create, Cross) by the 180 ms stage dither (a cut with reduced motion).
export function openFullPanel(h) {
  openPanel(h, h.ui.screen, "full");
  if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 });
}
// Add the room, from the full panel: the rule spends ⚡ and builds the room; the player stays where they are (the room settles, the plate says when it is ready).
function addRoomHere(h) {
  const r = S.addRoom(h.st, h.settings); if (!r.ok) return r;
  h.say(settleWords(h.specs.panel.strings.full.cards.add, S.roomName(h.st, r.room), r.turns));
  h.save(); return r;
}
// Make room: the Vivarium's whole with the ring on the first resident that can be returned (else the first), as Home's full need puts it.
function makeRoom(h) {
  const st = h.st, rooms = [st.face?.room ?? 0, ...Array.from({ length: S.roomCount(st, h.settings) }, (_, i) => i)], homed = rooms.flatMap((i) => S.inRoom(st, i));
  const m = homed.find((q) => !S.returnMibiBlock(st, h.sv, q)) ?? homed[0];
  h.goto("vivarium"); h.ui.viv.f = m ? "resident." + m.id : null;
}
// `target`: card.<id>; `verb`: confirm | back (the room keys go to the frame's intent).
export function intent(h, target, verb) {
  const ui = h.ui.panel; if (!ui) return;
  if (ui.id === "incubate") {   // the Incubate | Keep shaping panel (build spec 6a.4): ✓ Incubate runs Create's grow; Keep shaping and ← dither back to Create as it was; a room key is the frame's (a cut, nothing spent)
    if (verb === "back" || (verb === "confirm" && target === "card.keep")) { S.logEv(h.st, "Decision panel · Incubate | Keep shaping · Keep shaping"); keepShaping(h); return; }
    if (verb === "confirm" && target === "card.incubate") { S.logEv(h.st, "Decision panel · Incubate | Keep shaping · Incubate"); incubateNow(h); }
    return;
  }
  if (ui.id === "growNow") {   // the Hatch now | Wait panel (the Incubator's confirm state): ✓ Hatch now goes as a cut and the bar fills; Wait and ← dither back to the Incubator, nothing spent; a room key is the frame's (a cut)
    if (verb === "back" || (verb === "confirm" && target === "card.wait")) { S.logEv(h.st, "Decision panel · Open now | Wait · Wait"); closePanel(h); if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 }); return; }
    if (verb === "confirm" && target === "card.grow") { S.logEv(h.st, "Decision panel · Open now | Wait · Open now"); closePanel(h); growNow(h); }
    return;
  }
  if (verb === "back") { closePanel(h); if (ui.id === "dock") later(h); return; }   // ← on the dock arrival's strip is Later
  if (verb !== "confirm") return;
  const cards = cardsOf(model(h), h.specs.panel, h.specs.frame, []), card = cards.find((c) => "card." + c.id === target); if (!card) return;
  if (card.dim) { h.say(fill(h.specs.pods.strings.needMore, { icons: card.short })); return; }   // short of materials: the warn words, nothing spent
  if (card.act === "return") { h.say(h.specs.panel.strings.holdReturn); return; }   // a release is a held ✓ (the face's hold ring, `held` below): a short or a double ✓ never lets the mibi go
  S.logEv(h.st, "Decision panel · " + h.specs.panel.strings[ui.id].title + " · " + card.name);   // the card pressed, for the owner's own play to be read back
  closePanel(h);
  if (card.act === "fit") fitNow(h);
  else if (card.act === "addRoom") addRoomNow(h);
  else if (card.act === "addRoomHere") addRoomHere(h);
  else if (card.act === "make") makeRoom(h);
  else if (card.act === "growNow") growNow(h);
  else if (card.act === "open") openFromArrival(h);
  else if (card.act === "later") later(h);
  else if (card.act === "return") (ui.screen === "vivarium" ? returnFromCard : returnNow)(h);   // only a mibi's release opens a panel: letting a pod go asks on the button's own face   // Keep is the way out: the panel closes, the screen is as before
}
// The hold ring is full on the Return card (frame.json hold; host: confirm:held): the mibi goes back to the wild, as the old second ✓ did. Any other card does nothing here.
export function held(h) {
  const ui = h.ui.panel; if (!ui || ui.id === "incubate" || ui.id === "growNow") return false;
  const card = cardsOf(model(h), h.specs.panel, h.specs.frame, []).find((c) => "card." + c.id === ui.focus); if (!card || card.act !== "return" || card.dim) return false;
  S.logEv(h.st, "Decision panel · " + h.specs.panel.strings[ui.id].title + " · " + card.name); closePanel(h);
  (ui.screen === "vivarium" ? returnFromCard : returnNow)(h); return true;
}
export { panelBuild };
