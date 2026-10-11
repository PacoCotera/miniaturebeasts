// The Vivarium's whole intents (vivarium.json keys): ✓ on a resident or a bay tile looks at that mibi, one mibi up close (the screen transition, held; until slot V's second PR the up close draws "not built yet"); ← goes Home with the ring on the
// Vivarium's panel; on the room (an empty Vivarium) ✓ does nothing. The pad is the face's (focus.graph) and the host keeps the ring in `h.ui.viv.f`.
import * as S from "../state.mjs";

export function intent(h, target, verb) {
  const ui = h.ui;
  if (verb === "back") { ui.home.f = "vivarium"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  const id = typeof target === "string" ? +target.slice(target.indexOf(".") + 1) : NaN;
  if (!/^(resident|tile)\./.test(target ?? "") || !S.mibiById(h.st, id)) return;
  ui.hab.id = id; ui.hab.f = "stage"; if (ui.meet === id) ui.meet = null;
  const ev = h.specs.vivarium.events.look, motion = h.motion ? h.motion() : true;
  h.goto("habitat", motion ? ev.hold : 0);   // the frame's screen transition to one mibi up close, input held for the event's hold; a cut with reduced motion
}
