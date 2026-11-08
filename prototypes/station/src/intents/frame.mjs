// The frame's intents: the room keys (Home, Research, Library, Habitat open the top of their room from anywhere), the Companion's Dock key, and the wake from Idle. The tops of the rooms are the screens' own openTop,
// as their state in `h.ui`: nothing here draws.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { roomTop, ROOM_KEYS } from "../nav.mjs";
import { leaveCargo } from "./cargo.mjs";
import { arrive, later, endArrival } from "./arrival.mjs";
import * as home from "./home.mjs";
import { researchKey, openInventory, openRoom, growFrom, toRoom } from "./pods.mjs";
import { openSpecies, openFamily } from "./library.mjs";
import { frameOf } from "../genome.mjs";
import { carryPlan, snapshot, restore, subjectOf, cuesOf, ROOM_MARK } from "../carry.mjs";

// What the controls have taught (saved: st.taught.carry.{research,habitat,library}, st.taught.call, st.taught.carries, the carries made so far); additive, never a schema bump.
export const taughtOf = (st) => { const t = st.taught ?? (st.taught = {}); if (!t.carry) t.carry = {}; if (!Number.isInteger(t.carries)) t.carries = 0; return t; };
const CUES = (h) => h.specs?.frame?.regions?.cues ?? {};

const SCREEN_OF = { home: "home", research: "pods", library: "library", habitat: "vivarium" };
// A room key: the unpaid choices of Create, Cross and the sitting are dropped, and the room's own top opens (Pods: the collection with the ring on the pod that most needs the player; Library: Level 1 with the ring on the species it was last on (ui.lib.l1); Vivarium: the whole, the ring per vivarium.json focus.entry.vivariumKey).
export function roomKey(h, key) {
  if (!roomTop(key)) return false;
  const ui = h.ui, was = ui.carry; ui.carry = null; ui.teach = null;
  const plan = key === "home" || was?.key === key ? null : carryPlan(h, key);   // Home never carries; a second tap of the key just carried is the room's top, as today
  if (plan) { const f = startFlight(h, key, plan); return f ? true : carry(h, key, plan); }
  ui.create = null; ui.cross = null; ui.sit = null; ui.hab.namer = null; ui.panel = null;   // a room key closes the namer and a panel, writing nothing
  leaveCargo(h);    // a room key on Cargo finishes an opening as a cut, or closes the end, and opens its section
  endArrival(h);    // a room key on the arrival is Later, and then it acts
  if (key === "home") { if (ui.screen === "home" && !ui.idle) { if (ui.home.f !== "room") ui.home.f = "room"; else { home.rest(h); return true; } return true; } ui.home.f = "room"; }   // Home with the ring on Home: the ring back to rest; at rest, the Station rests; from any other screen Home opens at rest, so a second press rests
  else if (key === "research") { researchKey(h); return true; }   // two faces (the pods design): the reading room on its pod, a second press the inventory
  else if (key === "habitat") { ui.viv.f = null; ui.viv.view = "wall"; ui.viv.page = 0; ui.viv.pick = null; }   // the Vivarium key: the ring on the mibi last seen up close, its resident else its tile (vivarium.json focus.entry.vivariumKey)
  h.goto(SCREEN_OF[key]);
  return true;
}
// A colour key that carries (carry.mjs; keymap option 1): the key's room, opened on what the ring was on. A carry is a peek: Create's unpaid choices stay and the screen it started on is kept for ← (uncarry); nothing is spent.
// The room's other drops stay as a room key's (Cross, the sitting, the namer, a panel, Cargo's opening, the arrival).
function carry(h, key, plan) {
  const ui = h.ui, from = snapshot(h);
  ui.cross = null; ui.sit = null; ui.hab.namer = null; ui.panel = null; leaveCargo(h); endArrival(h);
  const q = plan.pod != null ? S.podById(h.st, plan.pod) : null, sid = plan.species;
  if (plan.act === "grow") { ui.createFrom = from.pods.view === "room" ? "room" : "inventory"; growFrom(h, q, ui.createFrom); }
  else if (plan.act === "read") toRoom(h, q);
  else if (plan.act === "page") openSpecies(h, sid);
  else if (plan.act === "close") { ui.hab.id = plan.mibi; ui.hab.f = "resident"; h.goto("habitat"); }
  else if (plan.act === "pods") { openInventory(h, { from: "home", chips: [sid], first: true }); ui.pods.carryFilter = true; }
  else if (plan.act === "family") openFamily(h, plan.mibi);
  else if (plan.act === "readChapter") { S.putOnBench(h.st, q); q.seen = 1; openRoom(h, "home"); const i = frameOf(S.speciesOf(q)).chapters.findIndex((c) => c.id === plan.chapter); if (i >= 0) ui.pods.lane = i; }
  else if (plan.act === "pageChapter") { if (openSpecies(h, sid)) { const L = ui.lib; L.state = "lit"; L.lit = plan.chapter; L.cur = "chapter." + plan.chapter; L.l2[sid] = L.cur; } }
  ui.carry = { key, to: ui.screen, from };
  return true;
}
// The carry's flight (frame.json cues.flight): the ringed thing's picture goes from the ring to the key's cue (200 ms; 400 ms for the first three carries of a save), then the room cuts in (landFlight). The carry's state change waits
// for it; a press during it lands the carry at once (host.mjs onFaceMessage). A host with no `flightPic` (the Node tests), a subject with no picture, or reduced motion carries at once.
function startFlight(h, key, plan) {
  if (typeof h.flightPic !== "function" || !(h.motion ? h.motion() : false)) return false;
  const sub = subjectOf(h), pic = sub && h.flightPic(sub); if (!pic) return false;
  const T = taughtOf(h.st), C = CUES(h).flight ?? {}, ms = T.carries < (C.firstCarries ?? 3) ? (C.firstMs ?? 400) : (C.ms ?? 200), room = ROOM_MARK[key];
  h.ui.flight = { key, plan, sub, room, ms, screen: h.ui.screen };
  h.play({ kind: "flight", target: room, ms }); h.at(ms, () => landFlight(h));
  return true;
}
export function landFlight(h) {
  const f = h.ui.flight; if (!f) return false;
  h.ui.flight = null; if (f.screen !== h.ui.screen) return false;   // the screen changed under it (an arrival): nothing to carry
  const T = taughtOf(h.st), C = CUES(h).flight ?? {}; T.carries++; if (T.carries <= (C.firstCarries ?? 3)) h.save();
  return carry(h, f.key, f.plan);
}
// The first time a colour key has a live cue (once a frame, host.frame): its cue hops and the middle slot says its line (ui.teach, for frame.json cues.teachMs); saved, so never again.
export function teachTick(h) {
  const ui = h.ui, st = h.st; if (!st || ui.idle || ui.flight || ui.noTeach) return;
  const C = CUES(h); if (ui.teach && h.now() - ui.teach.at > (C.teachMs ?? 5000)) ui.teach = null;
  const T = taughtOf(st), c = cuesOf(h).find((q) => !T.carry[q.key]); if (!c) return;
  T.carry[c.key] = true; ui.teach = { key: c.key, at: h.now() }; h.play({ kind: "hop", target: c.room, ms: C.hop?.ms ?? 300 }); h.save();
}
// ← after a carry: back where it started, the ring and the screen's choices as they were; then ← is what it is today (frame.json navigation: a colour key's carry is a peek).
export function uncarry(h) { const c = h.ui.carry; h.ui.carry = null; if (c) restore(h, c.from); return true; }
// The Call key (the controls scheme): things answer. A view state only (ui.answer): never saved, nothing spent, no screen change. The pad still moves the ring and the answer follows it; ← or Call puts it away and does nothing
// else; ✓ or a colour key puts it away and then acts as usual (answerOff, from dispatch); it fades ANSWER_MS after the last press (idleTick) and with any screen change. `t` is the clock the press came on.
export const ANSWER_MS = 8000;
export function call(h, t = h.now()) { const ui = h.ui; if (ui.idle) return false; ui.answer = !ui.answer; ui.answerAt = t; if (h.st) taughtOf(h.st).call = true; return true; }   // the first press ends Home's first-day line (taught.call: kept in memory and written with the next save, Call itself writes nothing)
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
  if (ui.answer && (h.arriving() || t - ui.answerAt > ANSWER_MS)) ui.answer = false;   // Call's answer fades 8 s after the last press, and an arrival ends it
  if (ui.resting || ui.entering || h.arriving() || h.holding() || ui.cargo?.state === "end") ui.lastInput = Math.max(ui.lastInput, t);
  else if (t - ui.lastInput > idleMs) enterIdle(h);
}
// The idle timer's enter (frame.json idle.enter): the dither closes over the stage for 180 ms with input held, and Idle shows at its end; with reduced motion it is a cut, Idle on this frame, hold 0.
export function enterIdle(h) {
  h.ui.hab.namer = null; h.ui.panel = null; h.ui.answer = false;   // the namer and a panel close, writing nothing, before Idle starts
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
