// The frame's intents: the room keys (Home, Research, Library, Habitat open the top of their room from anywhere), the Companion's Dock key, and the wake from Idle. The tops of the rooms are the screens' own openTop,
// as their state in `h.ui`: nothing here draws.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { roomTop, ROOM_KEYS } from "../nav.mjs";
import { leaveCargo } from "./cargo.mjs";
import { arrive, later, endArrival } from "./arrival.mjs";
import * as home from "./home.mjs";
import { researchKey } from "./pods.mjs";

const SCREEN_OF = { home: "home", research: "pods", library: "library", habitat: "vivarium" };
// A room key: the unpaid choices of Create, Cross and the sitting are dropped, and the room's own top opens (Pods: the collection with the ring on the pod that most needs the player; Library: Level 1 with the ring on the species it was last on (ui.lib.l1); Vivarium: the whole, the ring per vivarium.json focus.entry.vivariumKey).
export function roomKey(h, key) {
  if (!roomTop(key)) return false;
  const ui = h.ui; ui.create = null; ui.cross = null; ui.sit = null; ui.hab.namer = null; ui.panel = null;   // a room key closes the namer and a panel, writing nothing
  leaveCargo(h);    // a room key on Cargo finishes an opening as a cut, or closes the end, and opens its section
  endArrival(h);    // a room key on the arrival is Later, and then it acts
  if (key === "home") { if (ui.screen === "home" && !ui.idle) { if (ui.home.f !== "room") ui.home.f = "room"; else { home.rest(h); return true; } return true; } ui.home.f = "room"; }   // Home with the ring on Home: the ring back to rest; at rest, the Station rests; from any other screen Home opens at rest, so a second press rests
  else if (key === "research") { researchKey(h); return true; }   // two faces (the pods design): the reading room on its pod, a second press the inventory
  else if (key === "habitat") { ui.viv.f = null; }   // the Vivarium key: the ring on the mibi last seen up close, its resident else its tile (vivarium.json focus.entry.vivariumKey)
  h.goto(SCREEN_OF[key]);
  return true;
}
// The Companion's Dock key: it docks or lifts. Docked, the arrival plays (intents/arrival.mjs; specs/station-dock-arrival-spec.md): over the screen the player is on, over Home when the screen slept, or after their next screen change when they are
// mid-decision (frame.json navigation.dock). A lift never moves the Station's screen; a lift during the arrival ends it, back to the screen it came over.
export function dock(h, fromIdle = false, keysElsewhere = false) {
  const r = T.dock(h.st, h.sv, h.settings, h.now());
  if (!r.ok) { h.say(r.msg); return r; }
  h.ui.caddyOpened = null;   // a dock or a lift: the Caddy's "after the opening" lines are over
  if (r.back && r.back.length) h.ui.arrived = [...new Set([...(h.ui.arrived ?? []), ...r.back.map(String)])];   // R4b: the travellers home walk in from their room's rest edge
  if (r.docked) {
    h.play({ kind: "tick", target: "dock", ms: 0 });
    arrive(h, r, fromIdle);
  }
  else { h.ui.pendingArrival = null; if (h.ui.cargo.state === "arrival") later(h); sendOff(h); }
  if (h.ui.screen !== "home" && h.ui.screen !== "cargo" && !r.docked) h.say(r.msg);   // on Home and Cargo the Dock key leaves no plate (home.json keys.dock, cargo.json keys.dock): the top bar, the bed, the bay and the line say it; a refusal (above) shows its plate
  if (h.ui.screen === "bench") { const b = h.ui.bench; if (!r.docked && b.f === "plates") b.f = "switch"; }   // a cut to the new state: lifted, the plates are gone from the bench and the ring moves to the switch; docked, the ring stays
  h.save(); return r;
}
// The lift's send-off (frame.json navigation.dock.plates; specs/station-dock-arrival-spec.md §4, amended by R4b): the frame only, the screen never changes and nothing in the living window moves (the carried set is never drawn in a room: its tiles' glyph
// cuts from solid to outline). The plate says what went unfinished: the crates that went out unopened, a Take or Bring asked and not yet done.
export function sendOff(h) {
  const P = h.specs.frame.navigation.dock.plates;
  const lines = [];
  if (S.bayCrates(h.st, h.sv).length) lines.push(P.crates);
  for (const q of S.pendingCarry(h.st, h.sv)) { const m = S.mibiById(h.st, q.id); if (m && !m.released) lines.push(P.goes.replace("{Name}", m.name)); }
  if (lines.length) { h.say(lines[0], P.ms); lines.slice(1, 2).forEach((t) => h.at(P.ms, () => h.say(t, P.ms))); }
}
// The idle timer, once a frame: the 60 s count from the later of the last press and the end of a hold, an arrival or Cargo's end; the screen goes idle after a minute without a press, never in a hold, Cargo's opening or its end.
export function idleTick(h, t, idleMs) {
  const ui = h.ui; if (ui.idle) return;
  if (ui.resting || ui.entering || h.arriving() || h.holding() || ui.cargo?.state === "end") ui.lastInput = Math.max(ui.lastInput, t);
  else if (t - ui.lastInput > idleMs) enterIdle(h);
}
// The idle timer's enter (frame.json idle.enter): the dither closes over the stage for 180 ms with input held, and Idle shows at its end; with reduced motion it is a cut, Idle on this frame, hold 0.
export function enterIdle(h) {
  h.ui.hab.namer = null; h.ui.panel = null;   // the namer and a panel close, writing nothing, before Idle starts
  const ev = h.specs.frame.idle.enter.transition;
  const motion = h.motion ? h.motion() : true, hold = motion ? h.specs.frame.idle.enter.hold : 0;
  h.play({ kind: "dither", target: "stage", ms: ev.ms, from: 0, to: ev.levels, hold });
  if (!motion) { h.ui.idle = true; return; }   // a cut: Idle on the frame the timer fires, nothing held
  h.pendingRoom = null; h.ui.entering = true; h.ui.resting = true;   // a room key in the hold is dropped, as in the rest: the next press wakes
  h.at(ev.ms, () => { h.ui.entering = false; h.ui.resting = false; h.pendingRoom = null; h.ui.idle = true; });
}
// The first press on Idle only wakes the screen (a landed painting shows from here); the Dock key is a world event: it wakes and docks.
export function wake(h, verb) { h.ui.idle = false; return verb === "dock" ? dock(h, true) : { ok: true, woke: true }; }
// The verbs a face intent carries to the frame's functions: "room:<key>" | "wake". The Dock key is not a face verb: the host calls dock(h) itself.
export function intent(h, target, verb) {
  if (verb && verb.startsWith("room:")) return roomKey(h, verb.slice(5));
  if (verb === "wake") return wake(h);
  return false;
}
export { ROOM_KEYS };
