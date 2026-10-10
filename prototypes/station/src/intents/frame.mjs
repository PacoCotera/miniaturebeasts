// The frame's intents: the room keys (Home, Research, Library, Habitat open the top of their room from anywhere), the Companion's Dock key, and the wake from Idle. The tops of the rooms are the screens' own openTop,
// as their state in `h.ui`: nothing here draws.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { roomTop, ROOM_KEYS } from "../nav.mjs";
import { closeReport } from "./cargo.mjs";

const SCREEN_OF = { home: "home", research: "pods", library: "library", habitat: "habitat" };
// A room key: the unpaid choices of Create and Cross are dropped, and the room's own top opens (Pods: the collection with the ring on the pod that most needs the player; Library: the spread; Habitat: the stage).
export function roomKey(h, key) {
  if (!roomTop(key)) return false;
  const ui = h.ui; ui.create = null; ui.cross = null;
  closeReport(h);   // a room key on Cargo's report closes the card and opens its section
  if (key === "home") ui.home.f = "room";
  else if (key === "research") { const p = ui.pods; p.cmp = null; p.wildArm = 0; const q = S.neediestPod(h.st); if (q) p.cur = q.id; p.view = "collection"; p.focusView = "collection"; p.focus.set(q ? "place." + Math.max(0, h.st.tray.findIndex((x) => x.id === q.id)) : null); }
  else if (key === "library") { const l = ui.lib; if (l.page == null) { l.page = 0; l.i = 0; } l.f = "spread"; }
  else if (key === "habitat") { const a = ui.hab; a.f = "stage"; a.wildArm = 0; }
  h.goto(SCREEN_OF[key]);
  return true;
}
// The Companion's Dock key: it docks or lifts; docked while the screen slept, the arrival plays on Home where it is seen.
export function dock(h, fromIdle = false) {
  const r = T.dock(h.st, h.sv, h.settings, h.now());
  if (!r.ok) { h.say(r.msg); return r; }
  if (r.docked && fromIdle && h.ui.screen !== "home") h.goto("home");
  if (r.docked) {
    h.ui.cargo.mend = r.mend;   // Cargo keeps the dock's mend until the report names it (cargo.json regions.report.probe)
    h.play({ kind: "tick", target: "dock", ms: 0 });
    // the crates slide into the Cargo module (home.json events.crateIn), one after another, while Home shows; docked on another screen they are in the bay when Home next shows
    const n = Math.min(S.bayCrates(h.st, h.sv).length, h.specs.home.regions.cargo.max), each = h.specs.home.events.crateIn.each;
    if (n && h.ui.screen === "home") h.play({ kind: "arrival", target: "cargo", ms: each.ms + each.stagger * (n - 1) });
    // docked while Cargo's bay shows: the lid opens (a cut, the props) and the crates slide in from 64 px above (cargo.json events.crateIn), hold 0
    const bay = Math.min(S.bayCrates(h.st, h.sv).length, h.specs.cargo.regions.crates.max), ci = h.specs.cargo.events.crateIn.each;
    if (bay && h.ui.screen === "cargo" && h.ui.cargo.state === "bay") h.play({ kind: "arrival", target: "crates", ms: ci.ms + ci.stagger * (bay - 1), hold: 0 });
  }
  if (h.ui.screen !== "home" && h.ui.screen !== "cargo") h.say(r.msg);   // on Home and Cargo the Dock key leaves no plate (home.json keys.dock, cargo.json keys.dock): the top bar, the bed, the bay and the line say it; a refusal (above) shows its plate
  h.save(); return r;
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
