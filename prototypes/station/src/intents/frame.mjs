// The frame's intents: the room keys (Home, Research, Library, Habitat open the top of their room from anywhere), the Companion's Dock key, and the wake from Idle. The tops of the rooms are the screens' own openTop,
// as their state in `h.ui`: nothing here draws.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { roomTop, ROOM_KEYS } from "../nav.mjs";
import { closeReport, cratesIn } from "./cargo.mjs";
import { arrive, later, endArrival } from "./arrival.mjs";

const SCREEN_OF = { home: "home", research: "pods", library: "library", habitat: "vivarium" };
// A room key: the unpaid choices of Create and Cross are dropped, and the room's own top opens (Pods: the collection with the ring on the pod that most needs the player; Library: the spread; Vivarium: the whole, the ring per vivarium.json focus.entry.vivariumKey).
export function roomKey(h, key) {
  if (!roomTop(key)) return false;
  const ui = h.ui; ui.create = null; ui.cross = null; ui.hab.namer = null; ui.panel = null;   // a room key closes the namer and a panel, writing nothing
  closeReport(h);   // a room key on Cargo's report closes the card and opens its section
  endArrival(h);    // a room key on the arrival is Later, and then it acts
  if (key === "home") ui.home.f = "room";
  else if (key === "research") { const p = ui.pods; p.cmp = null; const q = S.neediestPod(h.st); if (q) p.cur = q.id; p.view = "collection"; p.focusView = "collection"; p.focus.set(q ? "place." + Math.max(0, h.st.tray.findIndex((x) => x.id === q.id)) : null); }
  else if (key === "library") ui.lib.f = "spread";
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
  if (r.docked) {
    h.ui.cargo.mend = r.mend;   // Cargo keeps the dock's mend until the report names it (cargo.json regions.report.probe)
    h.play({ kind: "tick", target: "dock", ms: 0 });
    arrive(h, r, fromIdle);
  }
  else { h.ui.pendingArrival = null; if (h.ui.cargo.state === "arrival") later(h); cratesIn(h, 0); sendOff(h); }   // a Lift voids a slide still staging its count: its steps write nothing after it
  if (h.ui.screen !== "home" && h.ui.screen !== "cargo" && !r.docked) h.say(r.msg);   // on Home and Cargo the Dock key leaves no plate (home.json keys.dock, cargo.json keys.dock): the top bar, the bed, the bay and the line say it; a refusal (above) shows its plate
  if (h.ui.screen === "bench") { const b = h.ui.bench; if (!r.docked && b.f === "plates") b.f = "switch"; }   // a cut to the new state: lifted, the plates are gone from the bench and the ring moves to the switch; docked, the ring stays
  h.save(); return r;
}
// The lift's send-off (home.json events.sendoff; frame.json navigation.dock.plates; specs/station-dock-arrival-spec.md §4): the frame and the living window only, the screen never changes. On Home and Idle the sleepers on the bed wake, hop and dither out;
// the plate says what went unfinished: the crates that went out unopened, a Take or Bring asked and not yet done.
export function sendOff(h) {
  const ev = h.specs.home.events.sendoff, P = h.specs.frame.navigation.dock.plates, motion = h.motion ? h.motion() : true;
  if (motion && (h.ui.screen === "home" || h.ui.idle) && S.carriedIds(h.st, h.sv).length) {
    h.ui.sendoff = true; h.play({ kind: ev.kind, target: ev.target, ms: ev.ms, hold: ev.hold }); h.at(ev.ms, () => { h.ui.sendoff = false; });
  }
  const lines = [];
  if (S.bayCrates(h.st, h.sv).length) lines.push(P.crates);
  for (const q of S.pendingCarry(h.st, h.sv)) { const m = S.mibiById(h.st, q.id); if (m && !m.released) lines.push(P.goes.replace("{Name}", m.name)); }
  if (lines.length) { h.say(lines[0], P.ms); lines.slice(1, 2).forEach((t) => h.at(P.ms, () => h.say(t, P.ms))); }
}
// The idle timer, once a frame: the 60 s count from the later of the last press and the end of a hold, an arrival or Cargo's report card; the screen goes idle after a minute without a press, never in a hold, Cargo's opening or its report card.
export function idleTick(h, t, idleMs) {
  const ui = h.ui; if (ui.idle) return;
  if (ui.resting || ui.entering || h.arriving() || h.holding() || ui.cargo?.state === "report") ui.lastInput = Math.max(ui.lastInput, t);
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
