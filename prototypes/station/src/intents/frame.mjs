// The frame's intents: the room keys (Home, Research, Library, Habitat open the top of their room from anywhere), the Companion's Dock key, and the wake from Idle. The tops of the rooms are the screens' own openTop,
// as their state in `h.ui`: nothing here draws.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { roomTop, ROOM_KEYS } from "../nav.mjs";

const SCREEN_OF = { home: "home", research: "pods", library: "library", habitat: "habitat" };
// A room key: the unpaid choices of Create and Cross are dropped, and the room's own top opens (Pods: the collection with the ring on the pod that most needs the player; Library: the spread; Habitat: the stage).
export function roomKey(h, key) {
  if (!roomTop(key)) return false;
  const ui = h.ui; ui.create = null; ui.cross = null;
  if (key === "home") ui.home.f = "room";
  else if (key === "research") { const p = ui.pods; p.cmp = null; p.wildArm = 0; const q = S.neediestPod(h.st); if (q) p.cur = q.id; p.view = "collection"; p.focusView = "collection"; p.focus.set(q ? "place." + Math.max(0, h.st.tray.findIndex((x) => x.id === q.id)) : null); }
  else if (key === "library") { const l = ui.lib; if (l.page == null) { l.page = 0; l.i = 0; } l.f = "spread"; }
  else if (key === "habitat") { const a = ui.hab; a.f = "stage"; a.bondArm = 0; a.wildArm = 0; }
  h.goto(SCREEN_OF[key]);
  return true;
}
// The Companion's Dock key: it docks or lifts; docked while the screen slept, the arrival plays on Home where it is seen.
export function dock(h, fromIdle = false) {
  const r = T.dock(h.st, h.sv, h.settings, h.now());
  if (!r.ok) { h.say(r.msg); return r; }
  if (r.docked && fromIdle && h.ui.screen !== "home") h.goto("home");
  if (r.docked) h.play({ kind: "tick", target: "dock", ms: 0 });
  h.say(r.msg); h.save(); return r;
}
// The first press on Idle only wakes the screen (a landed painting shows from here); the Dock key is a world event: it wakes and docks.
export function wake(h, verb) { h.ui.idle = false; return verb === "dock" ? dock(h, true) : { ok: true, woke: true }; }
// The verb a face intent carries to the frame's functions: "room:<key>" | "dock" | "wake".
export function intent(h, target, verb) {
  if (verb && verb.startsWith("room:")) return roomKey(h, verb.slice(5));
  if (verb === "dock") return dock(h, false);
  if (verb === "wake") return wake(h);
  return false;
}
export { ROOM_KEYS };
