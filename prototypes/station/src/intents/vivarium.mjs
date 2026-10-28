// The Vivarium's whole intents (vivarium.json keys): ✓ on a resident or a bay tile looks at that mibi, one mibi up close (the screen transition, held; until slot V's second PR the up close draws "not built yet"); ← goes Home with the ring on the
// Vivarium's panel; on the room (an empty Vivarium) ✓ does nothing. ✓ on the new-room chip opens the Add a room? panel (nothing is spent until its card is pressed); on a room's chip ✓ does nothing (no ✓ cap: the ring on the chip already shows that room,
// host.mjs showRoom). The pad is the face's (focus.graph) and the host keeps the ring in `h.ui.viv.f`.
import * as S from "../state.mjs";
import { openPanel } from "./panel.mjs";
import { fill } from "../views/words.mjs";

export function intent(h, target, verb) {
  const ui = h.ui;
  if (verb === "back") { ui.home.f = "vivarium"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  if (target === "room.new") { if (S.roomPrice(h.st, h.settings) !== null) openPanel(h, "vivarium", "addRoom"); return; }   // the panel opens short of Energy too, its Add card dimmed (✓ says what is short); at four rooms there is no chip
  const id = typeof target === "string" ? +target.slice(target.indexOf(".") + 1) : NaN;
  if (!/^(resident|tile)\./.test(target ?? "") || !S.mibiById(h.st, id)) return;
  ui.hab.id = id; ui.hab.f = S.isCarried(h.st, h.sv, S.mibiById(h.st, id)) ? "name" : "resident";   // carried, docked or away: the ring on the name (habitat.json focus.entry.fromWhole)
  const ev = h.specs.vivarium.events.look, motion = h.motion ? h.motion() : true;
  h.goto("habitat", motion ? ev.hold : 0);   // the frame's screen transition to one mibi up close, input held for the event's hold; a cut with reduced motion
}
// The Add the room card's act (panel.json addRoom): the rule spends ⚡ and adds the room (state.addRoom), the whole shows the new room empty with the ring on its chip, and the plate says it is ready.
export function addRoomNow(h) {
  const r = S.addRoom(h.st, h.settings); if (!r.ok) return r;
  if (h.ui.screen === "habitat") h.ui.hab.f = "room." + r.room;   // one mibi up close: the ring stays on the place, now the new room's chip, and ✓ Move {name} here is offered (R6)
  else { h.ui.viv.f = "room." + r.room; h.showRoom(r.room); }
  h.say(fill(h.specs.panel.strings.addRoom.done, { Room: S.ROOM_NAMES[r.room] }));
  h.save(); return r;
}
