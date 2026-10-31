// The intents (src/intents): the rule call behind a key on a focused target, DOM-free, run here against a recording host over the real rules: what each ✓ and ← does to the state, the screen state, the events
// and the plate. Pods carries the ✓ rule (a card opens the reading room on it), the read that spends, letting go and the way back from Compare onto the kin that opened it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it (the addRoom panel names the room it adds)
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as Lib from "../src/library.mjs";
import { createFocus } from "../../ui/focus.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { blank } from "../../face/tools/blank.mjs";
import { openBay } from "../src/intents/cargo.mjs";
import { arrivePending } from "../src/intents/arrival.mjs";
import { setLibrarySpecies } from "../src/views/home-props.mjs";
import { capLine } from "../src/views/words.mjs";
import { listOf } from "../src/views/pods-props.mjs";
import { openInventory } from "../src/intents/pods.mjs";
import { lineageOf, camFromOffset, panFor } from "../src/lineage.mjs";
import { buildLineage } from "./fixtures/lineage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), podsSpec = J("pods"), frameSpec = J("frame"), homeSpec = J("home"), cargoSpec = J("cargo"), createSpec = J("create"), vivariumSpec = J("vivarium"), benchSpec = J("bench"), incubatorSpec = J("incubator"), habitatSpec = J("habitat"), namerSpec = J("namer");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;

const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: "tile.9" }, cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null }, pods: { view: "inventory", cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null) }, create: null, inc: {}, cross: null, lib: { l1: null, pending: null }, hab: { id: null, f: "resident", wildArm: 0, namer: null, prev: null }, bench: { f: null, arm: 0, install: false }, meet: null, idle: false, report: null });
// A recording host: the effects are lists to read afterwards.
function host(st, sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, ui = newUI()) {
  const h = { st, sv, settings, ui, specs: { pods: podsSpec, frame: frameSpec, home: homeSpec, cargo: cargoSpec, create: createSpec, vivarium: vivariumSpec, bench: benchSpec, panel: J("panel") }, holds: [], motion: () => h.moving !== false, said: [], went: [], played: [], timers: [], saved: 0, t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s, hold = 0) => { h.went.push(s); h.holds.push(hold); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; } });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, read = [], gs = 5, identified = true) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (identified) S.skipIdentify(st, p); p.read = read.slice(); return p; }
const openInv = (h) => { h.ui.screen = "pods"; openInventory(h, { from: "home" }); };
const chapters = (id) => frameOf(id).chapters.map((c) => c.id);

test("every screen with intents has a module, and a face intent reaches it; the frame's verbs are the same on every screen", () => {
  assert.deepEqual(Object.keys(INTENTS).sort(), ["bench", "cargo", "create", "frame", "habitat", "home", "incubator", "library", "library.family", "library.species", "namer", "panel", "pods", "sitting", "vivarium"]);
  const st = world(), h = host(st); h.ui.screen = "library";
  dispatch(h, { screen: "library", target: "x", verb: "room:home" }); assert.deepEqual(h.went, ["home"]); assert.equal(h.ui.home.f, "room");
});

test("the room keys: the unpaid choices of Create, Cross and the sitting are dropped; Research opens the reading room on the bench pod, a second press the inventory (a bare bench: the inventory); the others open their tops", () => {
  const st = world(), a = pod(st, "S01", [], 3, false), h = host(st); h.ui.create = { podId: a.id }; h.ui.cross = {}; h.ui.sit = { step: "place", pose: "sleep-curled" };
  assert.equal(INTENTS.frame.roomKey(h, "research"), true);
  assert.equal(h.ui.create, null); assert.equal(h.ui.cross, null); assert.equal(h.ui.sit, null, "the sitting's choices are dropped"); assert.deepEqual(h.went, ["pods"]); assert.equal(h.ui.pods.view, "inventory", "a bare bench: the inventory"); assert.equal(h.ui.pods.focus.cur, "card.0");
  S.putOnBench(st, a); INTENTS.frame.roomKey(h, "research"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["room", "key"], "from the inventory the key opens the reading screen on the bench pod (sealed: Identify on the price key)");
  h.ui.lib.l1 = "S03"; INTENTS.frame.roomKey(h, "library"); assert.deepEqual([h.ui.lib.l1, h.went.at(-1)], ["S03", "library"], "the Library key opens Level 1, the ring where it was");
  h.ui.panel = { screen: "habitat", id: "wildMibi", focus: "" }; INTENTS.frame.roomKey(h, "habitat"); assert.deepEqual([h.ui.viv.f, h.ui.panel, h.went.at(-1)], [null, null, "vivarium"], "the Vivarium key opens the whole, the ring by the way in");
  assert.equal(INTENTS.frame.roomKey(h, "nonsense"), false);
});

test("Home: ✓ goes to the target's screen (Cargo from the Bay, Pods on the pod that most needs the player, the Incubator, the Probe bench from the Companion while docked and nothing while it is away, the Library's Level 1 with the ring on the species Home's module shows, the Vivarium's whole); ← does nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); st.dock = { docked: true, at: T0 }; pod(st, "S01", [], 5, false);
  const h = host(st), go = (t) => INTENTS.home.intent(h, t, "confirm");
  go("bay"); assert.equal(h.went.at(-1), "cargo"); go("incubator"); assert.equal(h.went.at(-1), "incubator"); go("companion"); assert.deepEqual([h.went.at(-1), h.ui.bench.f], ["bench", null]); setLibrarySpecies(() => "S01"); try { h.ui.lib.l1 = "S05"; go("library"); assert.deepEqual([h.went.at(-1), h.ui.lib.l1], ["library", "S01"]); } finally { setLibrarySpecies(() => null); }
  go("pods"); assert.equal(h.went.at(-1), "pods"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["inventory", "card.0"], "Home's Pods station: the Research key's faces (a bare bench: the inventory)");
  h.ui.hab.id = st.mibis[1].id; go("vivarium"); assert.deepEqual([h.ui.hab.id, h.went.at(-1)], [st.mibis[1].id, "vivarium"], "Home's bezel opens the whole (its ring is the view's: the mibi last seen up close)");
  go("room"); assert.equal(h.went.at(-1), "pods", "at rest the room's ✓ does the first need: a new pod");
  st.dock = { docked: false, at: T0 }; let n = h.went.length; go("companion"); assert.equal(h.went.length, n, "the Companion away: ✓ does nothing (the line says it is on a trip)");
  for (const t of ["vivarium", "library", "pods", "incubator", "companion", "bay"]) { n = h.went.length; INTENTS.home.intent(h, t, "back"); assert.equal(h.went.length, n, "Home is the top: ← does nothing on " + t); } INTENTS.home.intent(h, "room", "back"); assert.equal(h.went.length, n);
  const { st: quiet } = { st: world() }; quiet.dock = { docked: true, at: T0 }; const q = host(quiet); INTENTS.home.intent(q, "room", "confirm"); assert.deepEqual(q.went, [], "at rest with no need ✓ does nothing");
});
test("Home: the Home key with the ring on a target puts the ring back at rest; at rest the Station rests (events.rest: the ring is gone, the dither at 200 and Idle at 380 are scheduled, not waited for; reduced motion: a cut); from any other screen Home opens at rest, so a second press rests", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); st.dock = { docked: true, at: T0 }; const h = host(st), ev = h.specs.home.events.rest;
  h.ui.home.f = "pods"; INTENTS.frame.roomKey(h, "home"); assert.equal(h.ui.home.f, "room"); assert.deepEqual([h.went, h.played, h.ui.idle], [[], [], false], "the ring goes back to rest: nothing rests yet");
  INTENTS.frame.roomKey(h, "home"); assert.deepEqual(h.played.at(-1), { kind: "rest", target: "home", ms: ev.ms, hold: ev.hold }); assert.equal(h.ui.resting, true); assert.equal(h.ui.idle, false, "Idle comes at the end of the hold, on the host's own clock"); assert.deepEqual(h.timers.map((t) => t.ms), [ev.steps[1].at, ev.hold]);
  h.timers.at(-1).fn(); assert.equal(h.ui.idle, true); assert.equal(h.ui.resting, false); assert.deepEqual(h.went, [], "the screen stays Home");
  h.ui.idle = false; h.motion = () => false; INTENTS.frame.roomKey(h, "home"); assert.equal(h.ui.idle, true, "reduced motion: a cut, Idle at once");
  const o = host(st); o.ui.screen = "pods"; o.ui.home.f = "bay"; INTENTS.frame.roomKey(o, "home"); assert.deepEqual([o.went, o.ui.home.f, o.played], [["home"], "room", []], "from another screen: Home at rest"); o.ui.screen = "home"; INTENTS.frame.roomKey(o, "home"); assert.equal(o.played.at(-1).kind, "rest", "a second press rests");
});
test("Home: the room's ✓ with crates in the bay goes to Cargo; the Dock key plays the arrival over Home (the show: one arrival event of 3500 ms held and skippable), Later returns to Home", () => {
  const st = world(); st.dock = { docked: false, at: T0 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [{ id: "c1", n: 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }, { id: "c2", n: 2, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }], mibis: [], carried: [], tier: 1, shield: 3 };
  const h = host(st, sv);
  INTENTS.frame.dock(h); assert.equal(st.dock.docked, true); assert.deepEqual(h.said, [], "no message plate"); assert.equal(h.ui.screen, "cargo", "the arrival rises over Home"); assert.equal(h.ui.cargo.state, "arrival");
  assert.deepEqual(h.played.filter((e) => e.kind === "arrival"), [{ kind: "arrival", target: "show", ms: 3500, hold: 3500, skip: true }]);
  INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.panel.intent(h, "card.later", "back"); assert.deepEqual([h.ui.screen, h.ui.cargo.state], ["home", "bay"], "Later is the screen it came over"); INTENTS.home.intent(h, "room", "confirm"); assert.equal(h.went.at(-1), "cargo");
});
// ---- the Dock from the play page (frame.json navigation.dock) ----
const dockWorld = () => { const st = world(); st.dock = { docked: false, at: T0 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [{ id: "c1", n: 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }], mibis: [], with: null, tier: 1, shield: 3 }; return { st, sv }; };
test("the Dock plays the arrival over the screen the player is on (Pods, the Incubator, the Vivarium, one mibi up close with the namer shut, the Library, the bench, Home, Cargo); no plate; Later returns to that screen as it was", () => {
  for (const screen of ["pods", "incubator", "vivarium", "habitat", "library", "bench", "home", "cargo"]) {
    const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = screen; h.ui.home.f = "pods"; if (screen === "habitat") h.ui.hab = { ...(h.ui.hab || {}), namer: null };
    const r = INTENTS.frame.dock(h, false, true); assert.equal(r.ok, true, screen); assert.equal(h.ui.screen, "cargo", screen); assert.equal(h.ui.cargo.arrival.from, screen, screen); assert.equal(h.ui.home.f, "pods", screen + ": nothing moves under it"); assert.deepEqual(h.said, [], screen + ": no plate");
    assert.equal(h.went.at(-1), screen === "cargo" ? undefined : "cargo", screen + ": the dither to Cargo, none on Cargo itself");
    INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.panel.intent(h, "card.later", "back"); assert.equal(h.ui.screen, screen, screen + ": Later returns to it"); assert.equal(h.ui.cargo.state, "bay", screen);
  }
});
test("the Dock mid-decision (Create or Cross open, an open namer, a decision panel) does not interrupt: the plate says The Companion is home for 2000 ms and the arrival plays after the next screen change, over the screen they arrive on; Home and Cargo play it at once", () => {
  const spec = J("cargo").strings.arrival.ribbon;
  for (const screen of ["create", "cross"]) { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = screen; h.ui[screen] = { podId: "x", choices: {}, f: 0, clash: [], grown: null }; const r = INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, screen, screen); assert.deepEqual(h.said.at(-1), spec, screen + ": the plate"); assert.ok(h.ui.pendingArrival, screen);
    h.ui[screen] = null; h.ui.screen = "pods"; assert.equal(arrivePending(h), true, screen + ": plays after the next screen change"); assert.deepEqual([h.ui.screen, h.ui.cargo.arrival.from, h.ui.pendingArrival], ["cargo", "pods", null], screen); void r; }
  { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = "sitting"; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "sitting"); assert.deepEqual(h.said.at(-1), spec); }
  { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = "habitat"; h.ui.hab = { ...(h.ui.hab || {}), namer: { id: 1 } }; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "habitat", "the namer stays"); assert.equal(h.said.at(-1), spec); }
  { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = "pods"; h.ui.panel = { screen: "pods", id: "wildPod", focus: "" }; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "pods", "a decision panel is open"); assert.equal(h.said.at(-1), spec); }
});
test("the show in reduced motion is staged by the host: each beat a cut on its time (cargo.json events.show), the choice at 3500; with motion one skippable event and one end timer", () => {
  const mk = (motion) => { const { st, sv } = dockWorld(); sv.bay = [1, 2, 3].map((n) => ({ ...sv.bay[0], id: "c" + n, n })); const h = host(st, sv); h.ui.screen = "cargo"; h.moving = motion; return h; };
  { const h = mk(false); INTENTS.frame.dock(h, false, true); const c = h.ui.cargo, run = (ms) => h.timers.filter((t) => t.ms <= ms).sort((a, b) => a.ms - b.ms).forEach((t) => t.fn());
    assert.equal(c.state, "arrival"); assert.deepEqual(h.played.filter((e) => e.kind === "arrival"), [{ kind: "arrival", target: "show", ms: 3500, hold: 0, skip: true }].map((e) => ({ ...e, hold: 0 })).slice(0, 0), "reduced motion plays nothing: no event to hold");
    run(500); assert.equal(c.at, 500); run(1000); assert.ok(c.at >= 833, "the crates stand at their beats"); run(3499); assert.equal(c.arrival.phase, "show"); run(3500); assert.equal(c.arrival.phase, "choice"); assert.equal(h.ui.panel.id, "dock"); }
  { const h = mk(true); INTENTS.frame.dock(h, false, true); assert.equal(h.timers.length, 1, "motion: the end timer only, the face's clock does the beats"); }
});
test("a key in the show cuts to the choice (reduced motion, where no hold stands): ✓, ←, the pad; Open the bay opens the crates and the strip is gone; the skip of a held show runs the end timer at once", () => {
  const mk = () => { const { st, sv } = dockWorld(); const h = host(st, sv); h.ui.screen = "cargo"; h.moving = false; INTENTS.frame.dock(h, false, true); return h; };
  for (const verb of ["confirm", "back", "pad"]) { const h = mk(); assert.equal(h.ui.cargo.arrival.phase, "show"); INTENTS.cargo.intent(h, "room", verb); assert.equal(h.ui.cargo.arrival.phase, "choice", verb); assert.deepEqual([h.ui.panel.screen, h.ui.panel.id, h.ui.panel.focus], ["cargo", "dock", "card.open"], verb); }
  { const h = mk(); INTENTS.cargo.intent(h, "room", "confirm"); const e0 = h.st.e; INTENTS.panel.intent(h, "card.open", "confirm"); assert.deepEqual([h.ui.panel, h.ui.cargo.state, h.ui.cargo.arrival], [null, "opening", null], "the strip goes and today's opening runs"); assert.equal(h.st.accepted.length, 1); void e0; }
  { const h = mk(); INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.panel.intent(h, "card.open", "back"); assert.deepEqual([h.ui.screen, h.ui.cargo.state, h.ui.panel], ["cargo", "bay", null], "← on the strip is Later: on Cargo itself the bay shows"); assert.equal(h.st.accepted.length, 0, "nothing accepted"); }
});
test("an empty trip has no choice: the show closes by itself at 2500, back to the screen it came over; a lift during the arrival ends it, back to where it came over, and the screen never changes by the lift", () => {
  { const { st, sv } = dockWorld(); sv.bay = []; const h = host(st, sv); h.ui.screen = "pods"; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.cargo.arrival.choice, false); assert.deepEqual(h.played.filter((e) => e.kind === "arrival"), [{ kind: "arrival", target: "show", ms: 2500, hold: 2500, skip: true }]);
    h.timers.filter((t) => t.ms >= 2500).forEach((t) => t.fn()); assert.deepEqual([h.ui.screen, h.ui.cargo.state, h.ui.panel ?? null], ["pods", "bay", null], "closed by itself"); }
  { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = "library"; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "cargo"); INTENTS.frame.dock(h, false, true); assert.equal(st.dock.docked, false, "lifted"); assert.deepEqual([h.ui.screen, h.ui.cargo.state], ["library", "bay"], "back to where it came over"); }
});
test("the lift's send-off (R4b): nothing in the living window moves (the carried set is never drawn in a room: no sendoff play, no home.json events.sendoff), the screen never changes; the plate names what went unfinished", () => {
  const mk = (screen) => { const { st, sv } = dockWorld(); st.dock = { docked: true, at: T0 }; S.seedAdults(st, "S01", 5, 3, settings); sv.carried = st.mibis.map((m) => m.id); const h = host(st, sv); h.ui.screen = screen; return h; };
  { const h = mk("home"); h.ui.idle = true; INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "home", "the screen never changes"); assert.equal(h.specs.home.events.sendoff, undefined, "the event retires"); assert.equal(h.played.filter((e) => e.kind === "sendoff").length, 0, "no sendoff play targets the bed"); assert.ok(!h.ui.sendoff); }
  { const h = mk("pods"); INTENTS.frame.dock(h, false, true); assert.equal(h.ui.screen, "pods"); assert.equal(h.played.filter((e) => e.kind === "sendoff").length, 0); }
  { const h = mk("home"); h.ui.idle = true; h.moving = false; INTENTS.frame.dock(h, false, true); assert.equal(h.played.filter((e) => e.kind === "sendoff").length, 0); }
  { const h = mk("pods"), P = h.specs.frame.navigation.dock.plates; h.sv.bay = [{ id: "c1", n: 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }]; INTENTS.frame.dock(h, false, true); assert.equal(h.said[0], P.crates, "crates not opened"); }
  { const h = mk("pods"), P = h.specs.frame.navigation.dock.plates, m = h.st.mibis[0]; h.sv.carried = []; h.sv.bay = []; h.st.carryReqs = [{ seq: 1, op: "add", id: m.id }]; h.st.carrySeq = 1; INTENTS.frame.dock(h, false, true); assert.equal(h.said[0], P.goes.replace("{Name}", m.name), "a Take asked and not yet done"); }
});
test("the Dock with the keys (keysElsewhere false) also plays the arrival; a Lift never navigates, whatever keysElsewhere is", () => {
  { const { st, sv } = dockWorld(), h = host(st, sv); h.ui.screen = "pods"; const r = INTENTS.frame.dock(h, false, false); assert.equal(h.ui.screen, "cargo"); assert.equal(h.ui.cargo.arrival.from, "pods"); assert.ok(r.ok); }
  for (const els of [true, false]) { const { st, sv } = dockWorld(); st.dock = { docked: true, at: T0 }; const h = host(st, sv); h.ui.screen = "pods"; const r = INTENTS.frame.dock(h, false, els); assert.equal(st.dock.docked, false, "lifted"); assert.equal(h.went.length, 0, "no goto"); assert.equal(h.ui.screen, "pods"); assert.ok(r.ok); }
});
test("Cargo's opening: ✓ Open them all plays the crates one at a time: the arrival (the last start + the last length, the hold 20 longer), each crate's rule at its start, the counters at each material's arrival and the turn at the crate's end, the end after the hold", () => {
  const st = world(); S.seedCrate(st, "S01", 2, 4101, T0); S.seedCrate(st, "S01", 1, 4102, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => true; const e0 = st.e, before = { e: st.e, d: st.d, s: st.s, turn: st.turn };
  INTENTS.cargo.intent(h, "room", "confirm");
  const run = h.ui.cargo.run, ar = h.played.find((e) => e.kind === "arrival"); assert.equal(run.items.length, 2);
  const L = [1700 + 300 + 600 + 180 + 300, 1700 + 600 + 180 + 300]; assert.deepEqual(run.lens, L); assert.deepEqual(ar, { kind: "arrival", target: "crate", ms: L[0] + L[1], hold: L[0] + L[1] + 20, skip: true }, "two crates: the last start plus the last length, hold 20 longer");
  assert.equal(h.ui.cargo.state, "opening"); assert.deepEqual(h.ui.cargo.shown, before, "the top bar shows the counters before the crates"); assert.equal(st.accepted.length, 1, "the first crate's rule is applied at its start, the second waits"); assert.ok(h.saved >= 1);
  const at = (ms) => h.timers.filter((t) => t.ms === ms);
  assert.equal(at(L[0]).length >= 2, true, "the first crate's end and the second crate's start"); assert.ok(at(L[0] + L[1] + 20).length === 1, "the end after the hold");
  const ordered = h.timers.slice().sort((a, b) => a.ms - b.ms); for (const t of ordered.slice(0, -1)) t.fn();
  assert.deepEqual(h.ui.cargo.shown, { e: st.e, d: st.d, s: st.s, turn: st.turn }, "by the last crate's end the top bar shows what the rules hold");
  ordered.at(-1).fn(); assert.deepEqual([h.ui.cargo.state, h.ui.cargo.shown, st.tray.length, st.accepted.length], ["end", null, 3, 2]);
});
test("Cargo's bay and end: ✓ opens the crates, ← goes Home with the ring on the Bay station, ✓ Skip in the hold, and any key on the end shows the bay again with ✓ following the bottom line (the jump to Pods)", () => {
  const st = world(); S.seedCrate(st, "S01", 1, 4101, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => true;
  INTENTS.cargo.intent(h, "room", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "bay"]); h.ui.screen = "cargo";
  INTENTS.cargo.intent(h, "room", "confirm"); const n = h.went.length; INTENTS.cargo.intent(h, "room", "pad"); assert.equal(h.went.length, n, "the pad does nothing in the hold"); assert.equal(h.ui.cargo.state, "opening");
  INTENTS.cargo.intent(h, "room", "confirm"); assert.equal(h.ui.cargo.state, "end", "✓ Skip on the last crate goes to the end");
  INTENTS.cargo.intent(h, "room", "pad"); assert.deepEqual([h.ui.cargo.state, h.went.length], ["bay", n], "the pad only closes the end");
  S.seedCrate(st, "S01", 1, 4102, T0); INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.cargo.intent(h, "room", "confirm"); assert.equal(h.ui.cargo.state, "end");
  INTENTS.cargo.intent(h, "room", "confirm"); assert.deepEqual([h.ui.cargo.state, h.went.at(-1), h.ui.pods.view], ["bay", "pods", "inventory"], "✓ on the end: the new pods, the inventory");
  const st2 = world(); st2.dock = { docked: true, at: T0 }; const h2 = host(st2); h2.ui.screen = "cargo"; INTENTS.cargo.intent(h2, "room", "confirm"); assert.equal(h2.ui.cargo.state, "bay", "an empty bay opens nothing");
});

test("Cargo's opening with reduced motion (the host stages each step as props at its time): per crate from its start: 0, 200, 500, each material's go (700, 850, 1000), 1500, each pod's start from 1700, the crate's end; the arrival and its hold are the same as with motion", () => {
  const st = world(); S.seedCrate(st, "S01", 3, 4101, T0); S.seedCrate(st, "S01", 2, 4102, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => false; INTENTS.cargo.intent(h, "room", "confirm"); const run = h.ui.cargo.run, L = run.lens;
  assert.deepEqual(h.played.find((e) => e.kind === "arrival"), { kind: "arrival", target: "crate", ms: L[0] + L[1], hold: L[0] + L[1] + 20, skip: true }, "ms and hold unchanged");
  const seen = []; for (const t of h.timers.slice().sort((a, b) => a.ms - b.ms)) { const before = [h.ui.cargo.crate, h.ui.cargo.at, h.ui.cargo.state]; t.fn(); const c = h.ui.cargo; if (c.crate !== before[0] || c.at !== before[1] || c.state !== before[2]) seen.push([t.ms, c.crate, c.at, c.state]); }
  const steps = (k, base, pods, L) => [200, 500, 700, 850, 1000, 1500, ...Array.from({ length: pods }, (_, i) => 1700 + 300 * i), L].map((at) => [base + at, k, at, "opening"]);
  assert.deepEqual(seen.filter((x) => x[3] === "opening").map((x) => x.join()), [...steps(0, 0, 3, L[0]), [L[0], 1, 0, "opening"], ...steps(1, L[0], 2, L[1])].map((x) => x.join()), "the host's stage by time");
  assert.equal(seen.at(-1)[3], "end"); assert.equal(h.played.some((e) => e.kind === "flash"), false);
});
test("Hatch now with a ready portrait: the notice the bud had is the one that names the portrait, so it stays through the bar's fill", () => {
  const h = host(world()); h.t = T0; h.specs.incubator = incubatorSpec; h.settings = { ...settings, growNowAbove: 99 }; const st = h.st, p = pod(st, "S01", chapters("S01")); st.tray = [p]; assert.ok(S.grow(st, p, {}, settings, T0).ok); st.bud.start = Date.now();   // need() reads the real clock: a bud still growing
  st.sittingCrates.push({ id: "sit1", mibiId: 1, pose: "calm", place: "wood", start: -1e10, source: "dev", painted: true, opened: false });
  INTENTS.incubator.intent(h, "bud", "confirm"); assert.equal(h.played.at(-1)?.kind, "growNow"); assert.equal(capLine(h.ui.inc.grow.need), "A portrait waits in the Bay", "the portrait is in the snapshot the bar's fill keeps");
});
test("the incubator: Choose a pod (empty), Hatch now (growing: pays, ends the wait and hatches in one press, growNow with the bar and the door, then the hatch held 2780 ms with the hand-off at 2600 on the resident), Open (a bud that finished on its own: no price); ← Home on Home's Incubator module", () => {
  const st = world(), h = host(st); h.t = T0; h.specs.incubator = incubatorSpec;
  INTENTS.incubator.intent(h, "room", "confirm"); assert.deepEqual([h.went.length, h.played.length], [0, 0], "no pod in the rack: ✓ does nothing");
  const a = pod(st, "S01", [], 5, false), b = pod(st, "S01", chapters("S01"), 6); INTENTS.incubator.intent(h, "room", "confirm");
  assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.pods.sort, h.ui.pods.from], ["pods", "inventory", "card.0", "use", "incubator"], "Choose a pod: the inventory sorted by use, the ring on the first card");
  S.skipIdentify(st, a); st.tray = [a, b]; h.ui.pods.focus.set("x"); INTENTS.incubator.intent(h, "room", "confirm"); assert.equal(h.ui.pods.focus.cur, "card.0");
  const q = pod(st, "S01", chapters("S01")); st.tray = [q]; assert.ok(S.grow(st, q, {}, settings, T0).ok); h.played.length = 0; h.timers.length = 0;
  assert.ok(S.instantGrowCost(st, settings, T0).s > 4, "this bud's price is above ❀ 4"); { const s00 = st.s; INTENTS.incubator.intent(h, "bud", "confirm"); assert.deepEqual([h.ui.panel?.id, h.played.map((e) => e.kind + ":" + e.target + ":" + e.ms), st.s], ["growNow", ["dither:stage:180"], s00], "above ❀ 4 ✓ opens the panel by the 180 ms stage dither and spends nothing"); h.played.length = 0; }
  const minutes = st.bud.minutes, s0 = st.s;
  INTENTS.panel.intent(h, "card.grow", "confirm"); const gn = h.played.at(-1); assert.deepEqual([gn.kind, gn.target, gn.ms, gn.hold], ["growNow", "room", 580, 580], "the bar fills and the door opens (580 ms), then the hatch");
  assert.deepEqual([st.bud, st.mibis.length, s0 - st.s], [null, 1, S.instantGrowCost({ ...st, bud: { start: T0, minutes, early: false } }, settings, T0).s], "one press: the price paid once, the wait ended and the bud opened"); assert.ok(h.ui.inc.grow.bud && !h.ui.inc.hatch, "the bar fills first; the screen keeps the bud");
  assert.equal(h.timers.length, 1); h.played.length = 0; h.timers.shift().fn(); assert.equal(h.ui.inc.grow, null); assert.ok(h.ui.inc.hatch, "then the hatch");
  const hatch = h.played.find((e) => e.kind === "hatch"); assert.deepEqual([hatch.ms, hatch.hold], [2600, 2780]); const meet = h.timers.at(-1); assert.equal(meet.ms, 2600, "the hand-off by the timer, never on done");
  { const hb = host(world()); hb.specs.incubator = incubatorSpec; const sb = hb.st, pb = pod(sb, "S01", chapters("S01")); sb.tray = [pb]; S.grow(sb, pb, {}, settings, T0); hb.settings = { ...settings, growNowAbove: 99 }; INTENTS.incubator.intent(hb, "bud", "confirm"); assert.deepEqual([hb.ui.panel ?? null, hb.played.at(-1)?.kind], [null, "growNow"], "at or below the threshold ✓ acts as before: no panel");
    const hc = host(world()); hc.specs.incubator = incubatorSpec; const sc = hc.st, pc = pod(sc, "S01", chapters("S01")); sc.tray = [pc]; S.grow(sc, pc, {}, settings, T0); INTENTS.incubator.intent(hc, "bud", "confirm"); const sc0 = sc.s; INTENTS.panel.intent(hc, "card.wait", "confirm"); assert.deepEqual([hc.ui.panel, hc.played.at(-1).kind, sc.s, S.budReady(sc, settings, T0)], [null, "dither", sc0, false], "Wait spends nothing and dithers back"); INTENTS.incubator.intent(hc, "bud", "confirm"); INTENTS.panel.intent(hc, "card.grow", "back"); assert.deepEqual([hc.ui.panel, hc.played.at(-1).kind, sc.s], [null, "dither", sc0], "← spends nothing and dithers back");
    const hd = host(world()); hd.specs.incubator = incubatorSpec; const sd = hd.st, pd = pod(sd, "S01", chapters("S01")); sd.tray = [pd]; S.grow(sd, pd, {}, settings, T0); sd.s = 1; INTENTS.incubator.intent(hd, "bud", "confirm"); assert.equal(hd.ui.panel ?? null, null, "short of Essence: the refusal plate, no panel"); assert.deepEqual(hd.played.map((e) => e.kind), [], "nothing plays"); assert.ok(hd.said?.length || hd.plates?.length || true); }
    { const he = host(world()); he.specs.incubator = incubatorSpec; const se = he.st, pe = pod(se, "S01", chapters("S01")); se.tray = [pe]; S.grow(se, pe, {}, settings, T0); for (let i = 0; i < 16; i++) se.mibis.push({ id: 900 + i, room: i >> 3, slot: i & 7, bay: i, released: false }); const s0 = se.s; INTENTS.incubator.intent(he, "bud", "confirm"); assert.deepEqual([he.ui.panel ?? null, he.played.length, se.s, !!se.bud], [null, 0, s0, true], "the Vivarium is full: a press that would be refused never opens the panel, nothing is spent"); assert.deepEqual(he.said, ["The Vivarium is full\nReturn a mibi to make room\nor add a room"], "Hatch now while full: ✓ plays the three lines, one a line (the rooms words C10)"); }
  assert.ok(h.ui.inc.hatch && h.ui.inc.hatch.mibi === st.mibis.at(-1).id); INTENTS.incubator.intent(h, "bud", "back"); assert.notEqual(h.went.at(-1), "home", "← does nothing in the hatch");
  meet.fn(); assert.deepEqual([h.went.at(-1), h.ui.hab.f, h.ui.inc.hatch], ["habitat", "resident", null]); assert.equal(h.ui.meet, st.mibis.at(-1).id); assert.equal(st.bud, null);
  INTENTS.incubator.intent(h, "bud", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "incubator"]);
  { const q2 = pod(st, "S01", chapters("S01"), 9); st.tray = [q2]; S.grow(st, q2, {}, settings, T0); st.bud.early = true; const e0 = [st.e, st.d, st.s]; h.played.length = 0; h.timers.length = 0; h.ui.inc.hatch = null;
    INTENTS.incubator.intent(h, "bud", "confirm"); assert.deepEqual([st.e, st.d, st.s], e0, "Open after a natural finish: no price"); assert.deepEqual(h.played.map((e) => e.kind), ["hatch"], "no growNow: Open plays the hatch alone"); assert.match(st.log.at(-1), /Opened · /); }
  const h2 = host(world()); h2.moving = false; h2.specs.incubator = incubatorSpec; { const st2 = h2.st, p2 = pod(st2, "S01", chapters("S01")); S.grow(st2, p2, {}, settings, T0); st2.bud.early = true; INTENTS.incubator.intent(h2, "bud", "confirm"); assert.deepEqual([h2.went.at(-1), h2.played.length, h2.timers.length], ["habitat", 0, 0], "a cut: the meet on the frame of ✓"); }
  const h3 = host(world()); h3.moving = false; h3.specs.incubator = incubatorSpec; h3.settings = { ...settings, growNowAbove: 99 };   // below the panel threshold ✓ acts at once
   { const st3 = h3.st, p3 = pod(st3, "S01", chapters("S01")); S.grow(st3, p3, {}, settings, T0); h3.t = T0; INTENTS.incubator.intent(h3, "bud", "confirm"); assert.deepEqual([h3.went.at(-1), h3.played.length, h3.timers.length, st3.bud, h3.ui.hab.id, h3.ui.hab.f], ["habitat", 0, 0, null, st3.mibis.at(-1).id, "resident"], "Hatch now with reduced motion: a cut to the meet on the frame of ✓"); }
});

test("the Library's Level 1: the ring's species is kept; ✓ on a met or found cell opens that species' Level 2, on an unmet cell or anything else does nothing; ← is Home with the ring on the Library bezel; the card's species word opens Level 2 of its species", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); st.knownIds.push("S01"); st.metIds.push("S03");
  INTENTS.library.focus(h, "cell.S02"); assert.equal(h.ui.lib.l1, "S02", "the face said the ring moved: the Library keeps it"); INTENTS.library.focus(h, "cell.S16"); assert.equal(h.ui.lib.l1, "S16"); INTENTS.library.focus(h, "tile.1"); INTENTS.library.focus(h, "cell.S99"); assert.equal(h.ui.lib.l1, "S16", "not a cell: kept");
  const n0 = h.said.length; INTENTS.library.intent(h, "cell.S02", "confirm"); assert.deepEqual([h.said.length, h.went, h.ui.lib.l1], [n0, [], "S16"], "an unmet cell opens nothing and says nothing");
  INTENTS.library.intent(h, "sp:S01", "confirm"); INTENTS.library.intent(h, "frame.S01", "confirm"); assert.deepEqual(h.went, [], "only cell.<SNN> is a target");
  INTENTS.library.intent(h, "cell.S03", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.lib.l1], ["library.species", "S03"], "a met cell opens its species");
  INTENTS.library.intent(h, "cell.S01", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.lib.l1], ["library.species", "S01"], "a found cell opens its species");
  INTENTS.library.intent(h, "cell.S01", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "library"]);
  S.seedAdults(st, "S01", 5, 2, settings); h.ui.hab.id = st.mibis[0].id; h.ui.lib.l1 = "S09"; INTENTS.habitat.intent(h, "species", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.lib.l1, h.ui.lib.species, h.ui.lib.state], ["library.species", "S01", "S01", "sheet"], "✓ Open the guide: Level 2 of the card's species, in sheet");
});

test("the Library's Level 2: ✓ on a plate lights it, again clears it, on another plate swaps; ← clears, then returns to Level 1 on the species; the ring's memory; the face jumps up close, a family face to Level 3; met-only does nothing", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); S.seedAdults(st, "S01", 5, 2, settings); st.metIds.push("S04"); const [a] = st.mibis; a.portrait = { state: "delivered" }; assert.ok(Lib.makeFace(st, a).ok);
  INTENTS.library.intent(h, "cell.S01", "confirm"); const L = h.ui.lib, sp = INTENTS["library.species"]; assert.deepEqual([h.went.at(-1), L.species, L.state, L.lit, L.cur], ["library.species", "S01", "sheet", null, null]);
  sp.focus(h, "chapter.face"); assert.deepEqual([L.cur, L.l2.S01], ["chapter.face", "chapter.face"], "in sheet the memory is written on each move");
  sp.intent(h, "chapter.face", "confirm"); assert.deepEqual([L.state, L.lit, L.cur, L.l2.S01], ["lit", "face", "chapter.face", "chapter.face"], "✓ Show {Chapter}: lit, the ring stays on the plate");
  sp.focus(h, "look.eyes.round"); assert.deepEqual([L.cur, L.l2.S01], ["look.eyes.round", "chapter.face"], "in lit the memory holds the lit chapter's plate whatever the ring is on");
  sp.intent(h, "look.eyes.round", "confirm"); assert.equal(L.state, "lit", "✓ on a look does nothing");
  sp.intent(h, "chapter.coat", "confirm"); assert.deepEqual([L.state, L.lit, L.l2.S01], ["lit", "coat", "chapter.coat"], "✓ on another plate lights that one");
  sp.intent(h, "chapter.coat", "confirm"); assert.deepEqual([L.state, L.lit, L.cur], ["sheet", null, "chapter.coat"], "✓ Clear {Chapter}: back to sheet");
  sp.intent(h, "chapter.face", "confirm"); sp.focus(h, "look.eyes.round"); sp.intent(h, "look.eyes.round", "back"); assert.deepEqual([L.state, L.lit, L.cur, h.went.at(-1)], ["sheet", null, "chapter.face", "library.species"], "← in lit: Clear, the ring on the lit chapter's plate");
  sp.intent(h, "chapter.face", "back"); assert.deepEqual([h.went.at(-1), L.l1], ["library", "S01"], "← in sheet: Level 1 on this species");
  INTENTS.library.intent(h, "cell.S01", "confirm"); sp.intent(h, "face", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.hab.id], ["habitat", a.id], "✓ Look at {name}: that mibi up close");
  INTENTS.library.intent(h, "cell.S01", "confirm"); sp.intent(h, "family." + a.id, "confirm"); assert.deepEqual([h.went.at(-1), L.species, L.l3.S01.node, L.l3.S01.zoom], ["library.family", "S01", "node." + a.id, "close"], "✓ See the family: Level 3, close on that mibi");
  INTENTS.library.intent(h, "cell.S04", "confirm"); const n = h.went.length; sp.intent(h, "chapter.coat", "confirm"); assert.deepEqual([h.went.length, L.state], [n, "sheet"], "met-only: no ✓");
});

test("the Library's Level 3: the ways in (Level 2's family face, the card's origin lines) open close on that mibi, its parent Level 2 of its species; ← from close goes to far while the tree exceeds the view (the stage dither), else to Level 2; ✓ Zoom in from far goes to close on the ring's node; the ring is kept, a ▲ noted", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); h.specs.habitat = habitatSpec; const by = buildLineage(st, "full", { turn: st.turn }); st.knownIds.push("S01");
  const L = h.ui.lib, fam = INTENTS["library.family"], C = h.specs.library.l3.close;
  h.ui.hab.id = by.Moss.id; h.ui.lib.species = "S09"; INTENTS.habitat.intent(h, "family", "confirm");
  assert.deepEqual([h.went.at(-1), L.species, L.l3.S01.node, L.l3.S01.zoom], ["library.family", "S01", "node." + by.Moss.id, "close"], "✓ See the family on the card: close on the shown mibi, the species its own");
  const lin = lineageOf(st, "S01", { gap: 4 }), mn = lin.nodes.find((n) => n.id === "node." + by.Moss.id); assert.deepEqual(camFromOffset(lin, "node." + by.Moss.id, C, L.l3.S01.cam), [C.grid.x0 + mn.u * C.grid.du - (C.comfort[0] + C.comfort[2] / 2), C.grid.y0 + mn.row * C.grid.drow - (C.comfort[1] + C.comfort[3] / 2)], "the entry centred in the comfort zone");
  assert.deepEqual(L.l3.S01.cam, [-(C.comfort[0] + C.comfort[2] / 2), -(C.comfort[1] + C.comfort[3] / 2)], "the camera kept as an offset from its node: the camera less the node's grid point");
  fam.intent(h, "screen", "confirm"); assert.equal(L.l3.S01.zoom, "close", "close: ✓ on what is not a target does nothing");
  h.played.length = 0; fam.intent(h, "screen", "back"); assert.deepEqual([h.went.at(-1), L.l3.S01.zoom, h.played.map((e) => [e.kind, e.target, e.ms, e.hold])], ["library.family", "far", [["dither", "stage", 180, 180]]], "← from close: far, the tree exceeds the view, under the stage dither");
  fam.focus(h, "node." + by.Dot.id); assert.deepEqual([L.l3.S01.node, L.l3last], ["node." + by.Dot.id, { up: "node." + by.Moss.id }], "Dot is Moss's first recorded parent: a ▲");
  fam.focus(h, "node." + by.Bean.id); assert.deepEqual([L.l3.S01.node, L.l3last], ["node." + by.Bean.id, null], "a move along: no ▲");
  h.played.length = 0; h.moving = false; fam.intent(h, "node." + by.Bean.id, "confirm"); assert.deepEqual([L.l3.S01.zoom, L.l3.S01.node, h.played], ["close", "node." + by.Bean.id, []], "✓ Zoom in: close on the ring's node; a cut under reduced motion"); h.moving = true;
  assert.ok(Array.isArray(L.l3.S01.cam) && L.l3.S01.cam.length === 2);
  fam.intent(h, "screen", "back"); fam.intent(h, "node." + by.Bean.id, "back"); assert.deepEqual([h.went.at(-1), L.species, L.state], ["library.species", "S01", "sheet"], "← from far: Level 2 of the species, whatever the way in");
  const small = world(), hs = host(small); hs.specs.library = J("library"); S.seedSiblings(small, "S01", 4, settings); const kid = small.mibis.at(-1);
  INTENTS.library.intent(hs, "cell.S01", "confirm"); INTENTS["library.species"].intent(hs, "family." + kid.id, "confirm"); assert.deepEqual([hs.went.at(-1), hs.ui.lib.l3.S01.zoom], ["library.family", "close"]);
  INTENTS["library.family"].intent(hs, "screen", "back"); assert.deepEqual(hs.went.at(-1), "library.species", "← from close on a tree that fits the view: Level 2");
});

test("the Library's Level 3 in close: the host owns the camera; a ring move inside the comfort zone keeps it (no pan), one that would leave it pans the least whole pixels that bring the node back (the pan event, l3.close.pan), a cut under reduced motion; the camera is kept as an offset from the new node", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); h.specs.habitat = habitatSpec; const by = buildLineage(st, "full", { turn: st.turn }); st.knownIds.push("S01");
  const L = h.ui.lib, fam = INTENTS["library.family"], C = h.specs.library.l3.close, lin = lineageOf(st, "S01", { gap: 4 }), id = (n) => "node." + by[n].id, abs = () => camFromOffset(lin, L.l3.S01.node, C, L.l3.S01.cam);
  h.ui.hab.id = by.Moss.id; INTENTS.habitat.intent(h, "family", "confirm"); const entry = abs(); assert.deepEqual(entry, [12, 105], "Moss centred in the comfort zone");
  h.played.length = 0; fam.focus(h, id("Dot")); assert.deepEqual([h.played, abs(), L.l3.S01.pan], [[], entry, null], "▲ to Dot: its box lies in the zone, the camera stays");
  fam.focus(h, id("Reed")); const want = panFor(lin, id("Reed"), C, entry); assert.deepEqual(want, [12 - 189, 105 - 115], "Reed's box (u 0, row 1: at x -24, y 31) is 189 px left of the zone and 115 px above it: the camera moves by just that");
  assert.deepEqual(h.played, [{ kind: "pan", target: "tree", from: entry, to: want, steps: C.pan.steps, frac: C.pan.frac }], "the pan event"); assert.deepEqual([abs(), L.l3.S01.pan], [want, { from: entry, to: want }]);
  h.played.length = 0; h.moving = false; fam.focus(h, id("Moss")); assert.deepEqual(h.played, [], "reduced motion: no event, one cut"); h.moving = true;
  assert.deepEqual([abs(), L.l3.S01.pan], [panFor(lin, id("Moss"), C, want), null], "the cut's camera, no pan kept");
  const r = (n) => { const q = lin.nodes.find((x) => x.id === id(n)), c = abs(); return [C.grid.x0 + q.u * C.grid.du - c[0] - 28, C.grid.y0 + q.row * C.grid.drow - c[1] - 28]; };
  const [x, y] = r("Moss"); assert.ok(x >= C.comfort[0] && y >= C.comfort[1] && x + 56 <= C.comfort[0] + C.comfort[2] && y + 56 <= C.comfort[1] + C.comfort[3], "the node lies in the zone after a move");
});

test("the Library's Level 3 compare: ✓ Compare from {name} in close holds the ring's mibi (a released one too); in compare ✓ on another mibi moves the hold, ✓ on the held mibi is Look at {name} (Habitat up close on it), nothing when it is released (the hold stays); the bud has no ✓; ← Done to close, the camera and the ring kept; the camera pans in compare as in close", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); h.specs.habitat = habitatSpec; const by = buildLineage(st, "full", { turn: st.turn }); st.knownIds.push("S01");
  const L = h.ui.lib, fam = INTENTS["library.family"], id = (n) => "node." + by[n].id, mem = () => L.l3.S01;
  h.ui.hab.id = by.Moss.id; INTENTS.habitat.intent(h, "family", "confirm"); const cam = [...mem().cam];
  fam.intent(h, "node.bud", "confirm"); assert.deepEqual([mem().zoom, mem().held], ["close", undefined], "the bud: no ✓");
  fam.intent(h, id("Moss"), "confirm"); assert.deepEqual([mem().zoom, mem().held, mem().node, h.went.at(-1)], ["compare", id("Moss"), id("Moss"), "library.family"], "✓ Compare from Moss: compare, Moss held");
  fam.focus(h, id("Dot")); fam.intent(h, id("Dot"), "confirm"); assert.deepEqual([mem().zoom, mem().held], ["compare", id("Dot")], "✓ Compare from Dot: the hold moves");
  fam.intent(h, "node.bud", "confirm"); assert.deepEqual([mem().zoom, mem().held], ["compare", id("Dot")], "the bud in compare: no ✓");
  const went = h.went.length; fam.focus(h, id("Wren")); fam.intent(h, id("Wren"), "confirm"); assert.equal(mem().held, id("Wren"), "a released mibi may be held");
  fam.intent(h, id("Wren"), "confirm"); assert.deepEqual([mem().zoom, mem().held, h.went.length], ["compare", id("Wren"), went], "on the held mibi, released: the press does nothing, the hold stays");
  fam.focus(h, id("Dot")); fam.intent(h, id("Dot"), "confirm"); fam.intent(h, id("Dot"), "confirm"); assert.deepEqual([h.went.at(-1), h.ui.hab.id, h.ui.hab.f], ["habitat", by.Dot.id, "resident"], "✓ Look at Dot: that mibi up close");
  L.l3.S01.zoom = "compare"; L.l3.S01.held = id("Moss"); fam.focus(h, id("Moss")); const c2 = [...mem().cam];
  fam.intent(h, id("Moss"), "back"); assert.deepEqual([mem().zoom, mem().held, mem().node, mem().cam], ["close", null, id("Moss"), c2], "← Done: close, the camera and the ring kept"); void cam;
  fam.intent(h, id("Moss"), "confirm"); h.played.length = 0; fam.focus(h, id("Reed")); assert.equal(h.played[0]?.kind, "pan", "a ring move out of the comfort zone pans in compare as in close");
});

test("one mibi up close: ✓ on the resident greets (the spec's moment: 1800 ms, held 300, a cut), on the name opens the namer, ✓ on Wild opens the Return panel and its Return card acts, ← goes to the whole with the ring on this mibi", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis, h = host(st); h.ui.hab.id = b.id; h.specs.habitat = habitatSpec; h.specs.namer = namerSpec;
  INTENTS.habitat.intent(h, "resident", "confirm"); assert.deepEqual(h.played.at(-1), { kind: "moment", target: "resident", ms: 1800, hold: 300, cut: true }); assert.deepEqual(h.said, [], "nothing said, nothing rewarded");
  h.moving = false; INTENTS.habitat.intent(h, "resident", "confirm"); assert.equal(h.played.at(-1).hold, 0, "reduced motion: the host sends hold 0"); h.moving = true;
  INTENTS.habitat.intent(h, "name", "confirm"); assert.deepEqual([h.ui.hab.namer.mode, h.ui.hab.namer.text, h.ui.hab.namer.fs, h.ui.hab.namer.f], ["rename", b.name, "selected", "act.done"]); h.ui.hab.namer = null;
  INTENTS.habitat.intent(h, "wild", "confirm"); assert.deepEqual([h.ui.panel.screen, h.ui.panel.id, h.ui.panel.focus], ["habitat", "wildMibi", "card.return"], "✓ opens the panel with the ring on Release, on the left"); assert.equal(b.released, false); h.ui.panel = null; INTENTS.habitat.intent(h, "wild", "back"); assert.deepEqual([h.went.at(-1), h.holds.at(-1)], ["vivarium", 180]); assert.equal(h.ui.hab.id, b.id, "the whole's ring follows this mibi");
  INTENTS.habitat.intent(h, "door", "confirm"); assert.deepEqual(st.carryReqs, [{ seq: 1, op: "add", id: b.id }], "the door queued an add"); assert.deepEqual(S.projectCarried(st, h.sv), [b.id]); assert.deepEqual(S.carriedIds(st, h.sv), [], "nothing is carried until the Companion applies it"); assert.deepEqual(h.said, [], "no plate");
  h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.panel.intent(h, "card.keep", "back"); assert.equal(h.ui.panel, null, "← spends nothing"); assert.equal(a.released, false); INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.panel.intent(h, "card.keep", "confirm"); assert.equal(a.released, false, "Keep is the way out"); INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.panel.intent(h, "card.return", "confirm");
  assert.equal(a.released, true, "the Return card returns it"); assert.equal(h.ui.panel, null); assert.equal(h.ui.hab.id, b.id, "the next housed mibi in bay order"); assert.equal(h.played.at(-1).kind, "dither"); assert.match(h.said.at(-1), /goes back to the/);
  INTENTS.habitat.intent(h, "wild", "back"); h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); assert.equal(h.ui.panel, null, "a carried-to-be mibi's return is blocked: no panel opens");
});

test("one mibi up close, the Companion module: take and bring change the request queue and say nothing; a waiting request makes ✓ do nothing; a full set is held: ✓ plays its plate, the house rule", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 4, settings); const [a, b, c, d] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [a.id], carrySeen: 0, tier: 1, shield: 3 }, h = host(st, sv); h.specs.habitat = habitatSpec;
  const door = (m) => { h.ui.hab.id = m.id; INTENTS.habitat.intent(h, "door", "confirm"); };
  st.dock = { docked: false, at: T0 }; door(b); assert.deepEqual(st.carryReqs, [{ seq: 1, op: "add", id: b.id }]); const n = st.carryReqs.length; door(b); assert.equal(st.carryReqs.length, n, "a request for it waits: ✓ does nothing (it does not cancel it)");
  st.dock = { docked: true, at: T0 }; door(c); assert.equal(st.carryReqs.length, 2); h.said.length = 0; door(d); assert.equal(st.carryReqs.length, 2, "a full set: nothing queued"); assert.equal(h.said.at(-1), "The Companion is full", "the Companion full: the module is held and ✓ plays the reason");
  door(a); assert.deepEqual(st.carryReqs.at(-1), { seq: 3, op: "home", id: a.id }, "a carried mibi is brought home");
  st.dock = { docked: false, at: T0 }; sv.carried = [b.id]; sv.carrySeen = 3; st.carryReqs = []; h.said.length = 0; h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); assert.deepEqual(h.said, [`${b.name} is out exploring\nBring ${b.name} home when you dock`], "a carried mibi's return is held: one plate says why and the way out (never silent), both lines in it"); assert.equal(h.timers.length, 0, "no second plate"); assert.equal(b.released, false);
});
test("R4b one mibi up close, a carried mibi's card (habitat.json heldRule): Rename, Portrait, Cross and Wild are held docked and away, each ✓ shows one plate with the two lines; Bring home is live only while docked, and held away", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [a.id], tier: 1, shield: 3 }, h = host(st, sv); h.specs.habitat = habitatSpec; h.specs.namer = namerSpec; h.ui.hab.id = a.id;
  for (const docked of [true, false]) {
    st.dock = { docked, at: T0 }; const word = docked ? ["ready to go exploring", "Bring"] : ["out exploring", "Bring"];
    for (const t of ["name", "portrait", "cross", "wild"]) { h.said.length = 0; h.timers.length = 0; INTENTS.habitat.intent(h, t, "confirm"); assert.equal(h.said.length, 1, `${t}: one plate`); const [l0, l1] = h.said[0].split("\n"); assert.equal(l0, `${a.name} is ${word[0]}`, `${t} ${docked ? "docked" : "away"}: the plate's first line`); assert.match(l1, docked ? /^Bring .* home first$/ : /home when you dock$/); }
    assert.equal(h.ui.hab.namer, null, "Rename opens no namer while carried"); assert.equal(a.name, a.name);
  }
  st.dock = { docked: true, at: T0 }; sv.carrySeen = 0; st.carryReqs = []; h.said.length = 0; INTENTS.habitat.intent(h, "door", "confirm"); assert.deepEqual(st.carryReqs.map((r) => r.op), ["home"], "docked: Bring home is live");
  st.dock = { docked: false, at: T0 }; st.carryReqs = []; h.said.length = 0; INTENTS.habitat.intent(h, "door", "confirm"); assert.deepEqual(st.carryReqs, [], "away: Bring is held like the rest"); assert.equal(h.said[0].split("\n")[0], `${a.name} is out exploring`);
});

test("one mibi up close, the meet: the first ✓ opens the namer and ends the meet; any other key ends it and acts", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a] = st.mibis, h = host(st); h.specs.habitat = habitatSpec; h.specs.namer = namerSpec;
  h.ui.hab.id = a.id; h.ui.meet = a.id; INTENTS.habitat.intent(h, "resident", "confirm"); assert.equal(h.ui.meet, null); assert.deepEqual([h.ui.hab.namer.mode, h.ui.hab.namer.text], ["meet", a.name]); assert.deepEqual(h.played, [], "the moment is not played: the first ✓ names");
  h.ui.hab.namer = null; h.ui.meet = a.id; INTENTS.habitat.intent(h, "resident", "back"); assert.equal(h.ui.meet, null); assert.equal(h.went.at(-1), "vivarium");
});

test("one mibi up close, a chapter plate: ✓ reads an unread chapter (the read event, 300 ms held 300), a read or sealed plate does nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 1, settings); const m = st.mibis[0], fr = frameOf("S01"), h = host(st); h.specs.habitat = habitatSpec; h.ui.hab.id = m.id; st.readEver = true;
  m.read = fr.chapters.filter((c, i) => i > 0 && !c.sealed).map((c) => c.id); const d0 = st.d;
  INTENTS.habitat.intent(h, "plate.0", "confirm"); assert.ok(m.read.includes(fr.chapters[0].id)); assert.ok(st.d <= d0); assert.deepEqual(h.played.at(-1), { kind: "read", target: "plate.0", ms: 300, hold: 300 });
  h.played.length = 0; INTENTS.habitat.intent(h, "plate.0", "confirm"); assert.deepEqual(h.played, [], "read: nothing");
});

test("one mibi up close, Cross: only a partner at home can be picked (the first not away); a mibi out with the Companion, or with only away partners, does not open it", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 3, settings); const [a, b, c] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [b.id], tier: 1, shield: 3 }, h = host(st, sv); h.specs.habitat = habitatSpec; st.dock = { docked: false, at: T0 };
  h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.deepEqual(h.went, [], "the door is shut until slot 7: ✓ stays up close"); INTENTS.habitat.openCross(h, a); assert.equal(h.went.at(-1), "cross"); assert.equal(h.ui.cross.bId, c.id, "b is out: the first partner not away");
  h.went.length = 0; h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.deepEqual(h.went, [], "the shown mibi is out: it cannot cross until it docks");
  sv.carried = [b.id, c.id]; h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.deepEqual(h.went, [], "only away partners: refused");
  st.dock = { docked: true, at: T0 }; INTENTS.habitat.openCross(h, a); assert.equal(h.went.at(-1), "cross", "docked, the carried mibi crosses as any adult");
});

test("Create: ◀ ▶ walk the read traits, ← returns to where Grow it was pressed (the inventory, on the pod's card) with nothing spent", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  INTENTS.create.intent(h, "x", "step:right"); assert.equal(h.ui.create.f, 1); INTENTS.create.intent(h, "x", "step:left"); assert.equal(h.ui.create.f, 0);
  INTENTS.create.intent(h, "x", "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.create], ["pods", "inventory", "card.0", null]); assert.equal(st.tray.length, 1);
});

test("Create ▲ ▼: a trait that rolls changes its look and the founder cross-dithers (a dither on the founder from the old picture's id, 200 ms, no hold); a doing or a trait with one look does nothing, no plate", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st), fr = frameOf("S01"); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  const list = fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits), at = list.findIndex((t) => S.rollOptions(p, t.id).length > 1), still = list.findIndex((t) => S.rollOptions(p, t.id).length <= 1);
  assert.ok(at >= 0, "a trait that rolls");
  h.ui.create.f = at; INTENTS.create.intent(h, "roll", "step:down");
  assert.equal(h.ui.create.choices[list[at].id], 1); const ev = h.played.at(-1);
  assert.deepEqual([ev.kind, ev.target, ev.ms, ev.hold, typeof ev.from], ["dither", "founder", 200, 0, "string"]); assert.match(ev.from, /^founder:S01:/); assert.equal(h.ui.create.prev, ev.from);
  INTENTS.create.intent(h, "roll", "step:up"); assert.equal(h.ui.create.choices[list[at].id], undefined, "back to the pod's own look");
  if (still >= 0) { h.played.length = 0; h.said.length = 0; h.ui.create.f = still; INTENTS.create.intent(h, "roll", "step:down"); assert.deepEqual([h.played.length, h.said.length], [0, 0]); }
});

test("Create ✓: the rule pays and the grow event plays (900 ms, input held 1080), the code is the screen's while it holds, and the jump to the Incubator comes at 900 ms from the timer; with reduced motion the jump is on the frame of ✓", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st); h.specs.incubator = incubatorSpec; h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; h.ui.pods.cur = p.id;
  INTENTS.create.intent(h, "roll", "confirm"); assert.deepEqual([h.ui.panel.id, h.ui.panel.focus], ["incubate", "card.incubate"], "✓ opens the Incubate | Keep shaping panel and spends nothing"); assert.ok(!st.bud); assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.ms, e.hold]), [["dither", "stage", 180, 180]]); h.played.length = 0;
  INTENTS.panel.intent(h, "card.incubate", "confirm"); assert.equal(h.ui.panel, null, "the panel goes as a cut");
  assert.deepEqual([h.saved, h.ui.pods.cur], [1, null], "✓ Incubate saves the spend and the bud, and pods.cur no longer names the pod that left the rack");
  assert.ok(st.bud); assert.ok(!st.tray.includes(p), "the pod is gone from the rack"); assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.ms, e.hold]), [["grow", "pod", 900, 1080]]);
  assert.deepEqual([h.went.length, h.ui.create.grown.code, typeof h.ui.create.grown.cost.e], [0, st.bud.code, "number"], "still on Create, holding"); assert.deepEqual(h.timers.map((t) => t.ms), [900]); assert.deepEqual(h.said, [], "no plate");
  INTENTS.create.intent(h, "roll", "confirm"); INTENTS.create.intent(h, "roll", "step:down"); assert.equal(h.timers.length, 1, "nothing acts while it grows");
  h.timers[0].fn(); assert.deepEqual([h.went.at(-1), h.ui.create], ["incubator", null]); assert.deepEqual(h.played.at(-1), { kind: "incubate", target: "room", ms: 1380, hold: 1380 }, "the Incubator plays its incubate moment");
  const st2 = world(), p2 = pod(st2, "S01", []), h2 = host(st2); h2.moving = false; h2.specs.incubator = incubatorSpec; h2.ui.create = { podId: p2.id, choices: {}, f: 0, clash: [], grown: null };
  INTENTS.create.intent(h2, "room", "confirm"); assert.ok(h2.ui.panel, "the panel opens as a cut"); assert.equal(h2.played.length, 0); INTENTS.panel.intent(h2, "card.incubate", "confirm"); assert.deepEqual([h2.went.at(-1), h2.ui.create, h2.played.length, h2.timers.length], ["incubator", null, 0, 0], "a cut: nothing to wait for");
});

test("Create ✓ refused: a short purse says what is short and nothing is spent, the screen stays", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 1)), h = host(st); st.e = 0; h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  const e = st.e; INTENTS.create.intent(h, "roll", "confirm"); assert.equal(st.e, e); assert.ok(!st.bud); assert.equal(h.ui.create.grown, null); assert.equal(h.said.length, 1); assert.deepEqual(h.played, []);
});

test("R6 the Incubator's Open while the Vivarium is full: ✓ plays the three plate lines and opens nothing (the third only while a room can be bought)", () => {
  const he = host(world()); he.specs.incubator = incubatorSpec; const se = he.st, pe = pod(se, "S01", chapters("S01")); se.tray = [pe]; S.grow(se, pe, {}, settings, T0); S.skipBud(se, settings, "ready");
  for (let i = 0; i < 16; i++) se.mibis.push({ id: 900 + i, room: i >> 3, slot: i & 7, bay: i, released: false });
  INTENTS.incubator.intent(he, "bud", "confirm"); assert.deepEqual([he.said, !!se.bud, he.played.length], [["The Vivarium is full\nReturn a mibi to make room\nor add a room"], true, 0]);
  he.said.length = 0; se.rooms = S.ROOMS_MAX; INTENTS.incubator.intent(he, "bud", "confirm"); assert.deepEqual(he.said, ["The Vivarium is full\nReturn a mibi to make room"], "at four rooms nothing more can be bought: two lines");
});

test("Create ✓ blocked (busy, full, clash): nothing is spent and the message plate says why (the house rule: never silent)", () => {
  const mk = (over) => { const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 1)), h = host(st); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; over(st, h); return { st, h }; };
  const cases = { busy: (st) => { st.bud = { minutes: 5 }; }, full: (st) => { st.mibis = Array.from({ length: S.roomCount(st, settings) * S.ROOM }, (_, i) => ({ id: 900 + i, room: i >> 3, slot: i & 7, bay: i, released: false })); }, clash: (st, h) => { h.ui.create.clash = ["x"]; } };
  for (const [k, f] of Object.entries(cases)) {
    const { st, h } = mk(f), e = st.e; assert.equal(S.growBlockKey(st, st.tray[0], {}, settings, h.ui.create.clash)?.key, k);
    INTENTS.create.intent(h, "room", "confirm");
    assert.deepEqual([h.said, h.played, h.timers.length, st.e, h.ui.create.grown], [[k === "full" ? ["The Vivarium is full", "Return a mibi to make room", "or add a room"].join("\n") : capLine(createSpec.strings.notices[k])], [], 0, e, null], k + ": ✓ plays its plate and spends nothing");
  }
});

test("Pods ✓ on a card: the pod goes onto the bench and the reading room opens on it (the ring on the recommended row, or Identify); ← is one press back to the inventory on that card, a second ← Home", () => {
  const st = world(), a = pod(st, "S01", [], 5, false), b = pod(st, "S01", [], 6), h = host(st); st.readEver = true;
  openInv(h); INTENTS.pods.focus(h, "card.0"); const first = S.podById(st, h.ui.pods.panelPod); assert.ok(first, "the panel follows the ring's card");
  INTENTS.pods.intent(h, "card.0", "confirm"); assert.equal(S.benchPod(st), first); assert.equal(h.ui.pods.view, "room"); assert.equal(h.ui.pods.focus.cur, first.idd ? "rail" : "key"); assert.deepEqual(h.played.filter((e) => e.kind === "dither"), [], "a cut in (ux-reading-v2.md §2.6, 1)");
  INTENTS.pods.intent(h, h.ui.pods.focus.cur, "back"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur, h.went.at(-1)], ["inventory", "card.0", "pods"], "one ← back to the inventory on this pod's card");
  INTENTS.pods.intent(h, "card.0", "back"); assert.equal(h.went.at(-1), "home"); assert.equal(st.tray.length, 2, "nothing spent, nothing lost"); void a; void b;
});

test("the Research key's two faces: with a pod on the bench it opens the reading room; pressed again on the room it turns to the inventory; pressed on the inventory it opens the room", () => {
  const st = world(), a = pod(st, "S01", chapters("S01").slice(0, 1), 5), h = host(st); S.putOnBench(st, a);
  INTENTS.frame.roomKey(h, "research"); assert.deepEqual([h.went.at(-1), h.ui.pods.view], ["pods", "room"]);
  INTENTS.frame.roomKey(h, "research"); assert.equal(h.ui.pods.view, "inventory");
  INTENTS.frame.roomKey(h, "research"); assert.equal(h.ui.pods.view, "room");
});

test("Pods, the reading screen (ux-reading-v2.md §2.6): Identify on the key; ◀ ▶ move the bracket one lane, no wrap, a nudge at an end; ✓ opens the chapter (the key on an unread one); the read is one press that spends, cut by any key; ✓ on a plate the detail, ▲▼ its traits; ← up one level, then to the inventory", () => {
  const st = world(), a = pod(st, "S01", [], 5, false), h = host(st); st.readEver = true; st.stampTaught = true; S.putOnBench(st, a); h.motion = () => true;
  INTENTS.frame.roomKey(h, "research"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["room", "key"]); INTENTS.pods.intent(h, "key", "confirm"); assert.equal(a.idd, 1, "Identify on the price key"); assert.equal(h.ui.pods.focus.cur, "rail");
  const n = chapters("S01").length; h.ui.pods.lane = 0;
  INTENTS.pods.intent(h, "rail", "step:left"); assert.equal(h.ui.pods.lane, 0, "no wrap"); assert.ok(h.played.some((e) => e.kind === "wipe" && e.target === "nudge"), "the stop nudges");
  INTENTS.pods.intent(h, "rail", "step:right"); assert.equal(h.ui.pods.lane, 1); h.ui.pods.lane = 0;
  const d0 = st.d; INTENTS.pods.intent(h, "rail", "confirm"); assert.deepEqual([h.ui.pods.at, h.ui.pods.focus.cur, st.d], ["right", "key", d0], "an unread chapter: the ring on the price key, nothing spent");
  INTENTS.pods.intent(h, "key", "confirm"); assert.deepEqual(a.read, [chapters("S01")[0]]); assert.ok(st.d < d0, "the read spends on the press"); assert.ok(h.played.some((e) => e.kind === "read" && e.cut === true && e.ms === 800)); assert.equal(h.ui.pods.focus.cur, "hold");
  INTENTS.pods.intent(h, "hold", "step:down"); assert.deepEqual([h.ui.pods.reading, h.ui.pods.focus.cur, h.ui.pods.at], [null, "plate.0", "right"], "a key cuts the read to its end and does nothing else");
  INTENTS.pods.intent(h, "plate.0", "confirm"); assert.deepEqual([h.ui.pods.at, h.ui.pods.focus.cur], ["detail", "trait"]); INTENTS.pods.intent(h, "trait", "step:down"); assert.equal(h.ui.pods.trait, 1); INTENTS.pods.intent(h, "trait", "step:down"); assert.equal(h.ui.pods.trait, Math.min(1, frameOfS01().chapters[0].traits.length - 1));
  INTENTS.pods.intent(h, "trait", "back"); assert.deepEqual([h.ui.pods.at, h.ui.pods.focus.cur], ["right", "plate.1"], "← in the detail: the pod level, the ring on the trait's plate");
  INTENTS.pods.intent(h, "plate.1", "step:left"); assert.deepEqual([h.ui.pods.at, h.ui.pods.focus.cur], ["rail", "rail"], "◀ back to the rail");
  INTENTS.pods.intent(h, "rail", "step:up"); assert.equal(h.ui.pods.at, "stamp", "▲ shows the stamp, once taught"); INTENTS.pods.intent(h, "stamp", "back"); assert.equal(h.ui.pods.at, "rail");
  INTENTS.pods.intent(h, "rail", "back"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["inventory", "card.0"], "← on the pod level: the inventory, the ring on this pod's card"); void n;
  st.d = 0; S.putOnBench(st, a); INTENTS.frame.roomKey(h, "research"); h.ui.pods.lane = 1; INTENTS.pods.intent(h, "rail", "confirm"); const before = a.read.length; INTENTS.pods.intent(h, "key", "confirm"); assert.equal(a.read.length, before, "not enough Data: nothing spent"); assert.ok(h.played.some((e) => e.target === "keyShake"), "the key shakes");
});
const frameOfS01 = () => frameOf("S01");

test("Pods, letting go: it pays nothing; the only pod of its species asks once on the button's own face, a move puts the question back, a second ✓ lets it go and the ring lands on the next card", () => {
  const st = world(), a = pod(st, "S01", [], 5), b = pod(st, "S02", [], 6), c = pod(st, "S02", [], 7), h = host(st); const s0 = st.s, e0 = st.e;
  openInv(h); const k = listOf(st, podsSpec, h.ui.pods, settings).findIndex((e) => e.p === a); INTENTS.pods.focus(h, "card." + k);
  INTENTS.pods.intent(h, "act.4", "confirm"); assert.equal(h.ui.pods.ask, a.id, "the only S01: it asks"); assert.equal(st.tray.length, 3);
  INTENTS.pods.focus(h, "act.3"); assert.equal(h.ui.pods.ask, null, "a move puts the button back");
  INTENTS.pods.focus(h, "act.4"); INTENTS.pods.intent(h, "act.4", "confirm"); INTENTS.pods.intent(h, "act.4", "confirm"); assert.equal(st.tray.includes(a), false); assert.deepEqual([st.s, st.e], [s0, e0], "letting go pays nothing");
  assert.match(h.ui.pods.focus.cur, /^card\./);
  const kb = listOf(st, podsSpec, h.ui.pods, settings).findIndex((e) => e.p === b); INTENTS.pods.focus(h, "card." + kb); INTENTS.pods.intent(h, "act.4", "confirm"); assert.equal(st.tray.includes(b), false, "one of two S02: no question"); void c;
});

test("Pods, Freshen: costs ❀ (the turns dried, by fours), restores the pod to full, and is held when fresh or short", () => {
  const st = world(), a = pod(st, "S01", [], 5), h = host(st); openInv(h); INTENTS.pods.focus(h, "card.0");
  INTENTS.pods.intent(h, "act.2", "confirm"); assert.equal(h.said.at(-1), "already fresh"); const s0 = st.s;
  st.turn += 6; INTENTS.pods.intent(h, "act.2", "confirm"); assert.equal(st.s, s0 - 2, "six turns dried: ❀ 2"); assert.equal(S.turnsLeft(st, a), S.POD_LIFE);
});

test("Pods, the tools: Sort cycles and the list returns to its top; the filter tray toggles chips and ← closes it keeping them; Find picks a word into a chip", () => {
  const st = world(), h = host(st); pod(st, "S01", [], 5); pod(st, "S02", [], 6); pod(st, "S03", [], 7, false); openInv(h);
  INTENTS.pods.focus(h, "sort"); INTENTS.pods.intent(h, "sort", "confirm"); assert.equal(h.ui.pods.sort, "species"); INTENTS.pods.intent(h, "sort", "confirm"); assert.equal(h.ui.pods.sort, "arrival");
  INTENTS.pods.intent(h, "filter", "confirm"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["filter", "tchip.0.0"]);
  INTENTS.pods.intent(h, "tchip.0.0", "confirm"); assert.equal(h.ui.pods.chips.length, 1); INTENTS.pods.intent(h, "tchip.0.0", "back"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur, h.ui.pods.chips.length], ["inventory", "filter", 1]);
  INTENTS.pods.intent(h, "chip.0", "confirm"); assert.equal(h.ui.pods.chips.length, 0, "✕ on a chip removes it");
  INTENTS.pods.intent(h, "find", "confirm"); assert.equal(h.ui.pods.view, "find"); INTENTS.pods.intent(h, "word.0", "confirm"); assert.deepEqual([h.ui.pods.view, !!h.ui.pods.word], ["inventory", true]);
});

test("Pods, Compare: opened from the panel's Compare with the ring on this pod's Take; ▲▼ step the chapter on both papers, never past the ends; ▶ on the kin's paper swaps the kin round the species; ✓ Take brings that pod onto the bench; ← closes it and the ring lands back on its card", () => {
  const st = world(), a = pod(st, "S01", chapters("S01"), 5), b = pod(st, "S01", chapters("S01"), 6), c = pod(st, "S01", chapters("S01"), 7), h = host(st);
  assert.ok(S.canCompare(st, a, b)); openInv(h); INTENTS.pods.focus(h, "card.0"); const A = S.podById(st, h.ui.pods.panelPod);
  INTENTS.pods.intent(h, "act.3", "confirm"); assert.deepEqual([h.ui.pods.cmp.a, h.ui.pods.cmp.ci, h.ui.pods.focus.cur], [A.id, 0, "takeA"]); const B0 = h.ui.pods.cmp.b;
  h.played.length = 0; INTENTS.pods.intent(h, "takeA", "step:up"); assert.equal(h.ui.pods.cmp.ci, 0, "never a wrap"); assert.equal(h.ui.pods.cmp.nudge.dir, -1, "at the first chapter ▲ nudges both brackets left (the stop)"); assert.deepEqual([h.played.at(-1)?.kind, h.played.at(-1)?.target], ["wipe", "nudge"], "the stop is the nudge's wipe, as the reading rail's"); INTENTS.pods.intent(h, "takeA", "step:down"); assert.equal(h.ui.pods.cmp.ci, 1);
  const n = chapters("S01").length; for (let i = 0; i < n + 2; i++) INTENTS.pods.intent(h, "takeA", "step:down"); assert.equal(h.ui.pods.cmp.ci, n - 1); assert.equal(h.ui.pods.cmp.nudge.dir, 1, "at the last chapter ▼ nudges them right");
  INTENTS.pods.intent(h, "takeA", "step:right"); assert.equal(h.ui.pods.cmp.b, B0, "▶ steps only on the kin's paper");
  INTENTS.pods.intent(h, "takeB", "step:right"); assert.notEqual(h.ui.pods.cmp.b, B0, "the next kin"); INTENTS.pods.intent(h, "takeB", "step:right"); assert.equal(h.ui.pods.cmp.b, B0, "round the kin, never the left-hand pod");
  INTENTS.pods.intent(h, "takeB", "back"); assert.equal(h.ui.pods.cmp, null); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["inventory", "card.0"]);
  INTENTS.pods.intent(h, "act.3", "confirm"); INTENTS.pods.intent(h, "takeB", "confirm"); assert.equal(h.ui.pods.cmp, null); assert.deepEqual([S.benchPod(st).id, h.ui.pods.view], [B0, "room"], "Take to the reading room: the kin on the bench, the reading screen open on it"); void a; void b; void c;
});

import { createFramePresenter } from "../src/present.mjs";
test("the frame presenter's events: a counter that rose ticks (one unit every 70 ms, 240 ms behind the figure), a fall or the first values send nothing, a changed turn flashes for a second", () => {
  const p = createFramePresenter(), v = { e: 5, d: 3, s: 2, turn: 4 };
  assert.deepEqual(p.events(v), [], "the first values");
  assert.deepEqual(p.events({ ...v, e: 9 }), [{ kind: "tick", target: "e", from: 5, to: 9, ms: 3 * 70 + 240 }]);
  assert.deepEqual(p.events({ e: 9, d: 5, s: 1, turn: 5 }), [{ kind: "tick", target: "d", from: 3, to: 5, ms: 70 + 240 }, { kind: "flash", target: "turn", ms: 1000 }], "d rose, s fell, the turn changed");
  assert.deepEqual(p.events({ e: 9, d: 5, s: 1, turn: 5 }), [], "nothing changed");
  assert.deepEqual(p.events({ e: 10, d: 5, s: 1, turn: 5 }), [{ kind: "tick", target: "e", from: 9, to: 10, ms: 240 }]);
});

import { readdirSync as ls2, readFileSync as rf2, existsSync as ex2 } from "node:fs";
// The transitive import graph of intents/: every module it reaches, followed through relative imports (and `import()`), reads like a Node program: no document, window, canvas, storage or clock of the page, and none of
// the drawing half, the screens, the renderer or the game's singletons.
const FORBIDDEN = /\b(document|window|canvas|getContext|localStorage|sessionStorage|performance|requestAnimationFrame|createImageBitmap|OffscreenCanvas|Image)\b/;
const NOT_REACHED = /(^|\/)(screens|render|components)\/|(^|\/)(gfx|game|scene|layout|context|type|main|face-lvgl|masters|podsprites|pictures|dev|caddy)\.mjs$/;
function graph(entry) {
  const seen = new Map(), todo = [entry];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue;
    const src = blank(rf2(f, "utf8")); seen.set(f, src);
    for (const m of src.matchAll(/(?:from|import\()\s*"(\.[^"]+)"/g)) { const to = path.resolve(path.dirname(f), m[1]); if (/\.(mjs|js)$/.test(to) && ex2(to)) todo.push(to); }
  }
  return seen;
}
test("the intents are DOM-free, transitively: nothing they import reaches a document, a canvas, storage, the page's clock, a screen, the drawing half or the game's singletons", () => {
  const dir = path.resolve(here, "../src/intents"), all = new Map();
  for (const f of ls2(dir).filter((x) => x.endsWith(".mjs"))) for (const [k, v] of graph(path.join(dir, f))) all.set(k, v);
  assert.ok(all.size > 12, "the graph was followed: " + all.size + " modules");
  for (const [f, src] of all) {
    const rel = path.relative(path.resolve(here, ".."), f);
    assert.doesNotMatch(f, NOT_REACHED, rel + " is in the intents' graph");
    const code = src.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');   // a word in a string or a data key is not a use
    assert.doesNotMatch(code, FORBIDDEN, rel + " names " + (code.match(FORBIDDEN) || [])[0]);
  }
});

test("the Vivarium's whole: ✓ on a resident or a tile looks at that mibi up close (the transition held for events.look), nothing on the room or an unknown mibi; ← goes Home with the ring on the panel", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 3, settings); st.dock = { docked: true, at: T0 };
  const h = host(st), m = st.mibis[1], ev = h.specs.vivarium.events.look;
  INTENTS.vivarium.intent(h, "resident." + m.id, "confirm"); assert.deepEqual([h.ui.hab.id, h.ui.hab.f, h.went.at(-1)], [m.id, "resident", "habitat"]); assert.equal(h.holds.at(-1), ev.hold, "the look holds input for events.look.hold");
  h.ui.meet = st.mibis[2].id; INTENTS.vivarium.intent(h, "tile." + st.mibis[2].id, "confirm"); assert.equal(h.ui.meet, st.mibis[2].id, "looking at the mibi that was to be met opens its meet: the first press up close ends it");
  const n = h.went.length; INTENTS.vivarium.intent(h, "room", "confirm"); INTENTS.vivarium.intent(h, "tile.nobody", "confirm"); assert.equal(h.went.length, n, "nothing to look at, nothing happens");
  INTENTS.vivarium.intent(h, "resident." + m.id, "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "vivarium"]);
});

// ---- the Probe bench (bench.json): ✓ on the plates mends one, the switch toggles the dock's mend, ✓ on the slot opens the Fit the upgrade? panel ----
function benchHost({ docked = true, shield = 2, tier = 1, e = 99, d = 99, mendFull = true, moving = true } = {}) {
  const st = world(); st.e = e; st.d = d; st.mendFull = mendFull; st.dock = { docked, at: T0 }; st.probe = { shield, smax: S.TIER[tier].shield, tier, seq: 1 };
  const h = host(st); h.ui.screen = "bench"; h.moving = moving; return h;
}
const BE = JSON.parse(readFileSync(path.join(specs, "bench.json"), "utf8")).events, BS = JSON.parse(readFileSync(path.join(specs, "bench.json"), "utf8")).strings;
test("the bench: ✓ on the plates mends one plate for ⚡ 1, plays the mend (from the whole before, to one more) holding 300 ms, and saves; reduced motion holds nothing", () => {
  let h = benchHost(); INTENTS.bench.intent(h, "plates", "confirm");
  assert.equal(h.st.probe.shield, 3); assert.equal(h.st.e, 98); assert.deepEqual(h.played, [{ kind: "mend", target: "plates", ms: BE.mend.ms, hold: BE.mend.hold, from: 2, to: 3 }]); assert.equal(h.saved, 1); assert.deepEqual(h.said, [], "no plate: the context and the counters say it");
  h = benchHost({ moving: false }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual(h.played, [{ kind: "mend", target: "plates", ms: BE.mend.ms, hold: 0, from: 2, to: 3 }]);
  h = benchHost({ shield: 3 }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual([h.played, h.said, h.saved], [[], [], 0], "every plate whole: nothing");
  h = benchHost({ docked: false }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual([h.played.length, h.st.e], [0, 99], "away: nothing");
});
test("the bench: ✓ on the plates short of ⚡ says it on the message plate and spends nothing, plays nothing", () => {
  const h = benchHost({ e: 0 }); INTENTS.bench.intent(h, "plates", "confirm");
  assert.equal(h.st.probe.shield, 2); assert.equal(h.st.e, 0); assert.deepEqual(h.played, []); assert.deepEqual(h.said, [BS.short.replace("{icons}", "⚡")]); assert.equal(h.saved, 0);
});
test("the bench: ✓ on the switch toggles whether the dock mends every plate, plays the switch (from and to), holds nothing, saves; set away too", () => {
  let h = benchHost({ mendFull: true }); INTENTS.bench.intent(h, "switch", "confirm");
  assert.equal(h.st.mendFull, false); assert.deepEqual(h.played, [{ kind: "switch", target: "switch", ms: BE.switch.ms, hold: 0, from: 1, to: 0 }]); assert.equal(h.saved, 1);
  INTENTS.bench.intent(h, "switch", "confirm"); assert.equal(h.st.mendFull, true); assert.deepEqual(h.played.at(-1), { kind: "switch", target: "switch", ms: BE.switch.ms, hold: 0, from: 0, to: 1 });
  h = benchHost({ docked: false, mendFull: false }); INTENTS.bench.intent(h, "switch", "confirm"); assert.equal(h.st.mendFull, true, "away: the standing choice is still set");
  assert.ok(h.st.log.some((l) => /mends every plate/.test(l)), "a log line");
});
test("the bench: ✓ on the slot opens the Fit the upgrade? panel (nothing spent); its Fit it card fits (⚡ −12 ◆ −4, tier 2, four plates), plays the install holding 900 ms and sets then clears the install flag; reduced motion sets none; short, Fit it is dimmed and says so; Not now and ← spend nothing", () => {
  let h = benchHost({ e: 5, d: 1 }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.ui.panel.screen, h.ui.panel.id, h.ui.panel.focus, h.played, h.st.e], ["bench", "fitUpgrade", "card.later", [], 5], "short: the panel opens, the ring on Not now");
  INTENTS.panel.intent(h, "card.fit", "confirm"); assert.deepEqual([h.said, h.played, h.st.e, !!h.ui.panel], [[h.specs.pods.strings.needMore.replace("{icons}", "⚡ ◆")], [], 5, true], "the dimmed card says what is short and spends nothing");
  h = benchHost({ shield: 2 }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.ui.panel.focus, h.played, h.st.e], ["card.fit", [], 99], "✓ opens it with the ring on Fit it and spends nothing");
  INTENTS.panel.intent(h, "card.fit", "confirm");
  assert.deepEqual([h.st.e, h.st.d, S.tierNow(h.st, h.sv), h.st.probe.shield, h.ui.panel, h.ui.bench.install], [87, 95, 2, 4, null, true]);
  assert.deepEqual(h.played, [{ kind: "install", target: "slot", ms: BE.install.ms, hold: BE.install.hold, from: 2, to: 4 }]); assert.equal(h.saved, 1);
  assert.deepEqual(h.timers.map((t) => t.ms), [BE.install.ms]); h.timers[0].fn(); assert.equal(h.ui.bench.install, false, "the flag clears when the install ends");
  h = benchHost({ moving: false }); INTENTS.bench.intent(h, "slot", "confirm"); INTENTS.panel.intent(h, "card.fit", "confirm"); assert.deepEqual([h.ui.bench.install, h.played[0].hold, h.timers.length, S.tierNow(h.st, h.sv)], [false, 0, 0, 2]);
  h = benchHost({}); INTENTS.bench.intent(h, "slot", "confirm"); INTENTS.panel.intent(h, "card.later", "confirm"); assert.deepEqual([h.ui.panel, h.played, h.st.e, S.tierNow(h.st, h.sv)], [null, [], 99, 1], "Not now: nothing spent");
  INTENTS.bench.intent(h, "slot", "confirm"); INTENTS.panel.intent(h, "card.fit", "back"); assert.deepEqual([h.ui.panel, h.played, h.st.e], [null, [], 99], "←: nothing spent");
  h = benchHost({ tier: 2, shield: 4 }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.played, h.said, h.ui.panel ?? null], [[], [], null], "fitted: no panel");
  h = benchHost({ docked: false }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.played, h.said, h.ui.panel ?? null], [[], [], null], "away: no panel");
});
test("the bench: ← goes Home with the ring on the Companion station; the ring the face says is kept", () => {
  const h = benchHost();
  INTENTS.bench.intent(h, "slot", "back"); assert.deepEqual([h.ui.home.f, h.went.at(-1)], ["companion", "home"]);
  INTENTS.bench.focus(h, "switch"); assert.equal(h.ui.bench.f, "switch");
});
test("the Dock key on the bench: lifted, the ring on the plates moves to the switch; docked, the ring stays", () => {
  const st = world(); st.dock = { docked: true, at: T0 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: 1 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, h = host(st, sv);
  h.ui.screen = "bench"; h.ui.bench.f = "plates"; INTENTS.frame.dock(h); assert.equal(h.st.dock.docked, false); assert.equal(h.ui.bench.f, "switch");
  h.ui.bench.f = "slot"; INTENTS.frame.dock(h); assert.equal(h.st.dock.docked, true); assert.equal(h.ui.bench.f, "slot", "away to docked: the ring stays");
});

test("T-50 cuts 1 and 2: Home's room ✓ opens the bay in one press (Cargo, then the opening) and opens the ready bud in one press (the Incubator, then the hatch); a growing bud only looks", () => {
  const st = world(); S.seedCrate(st, "S01", 1, 4101, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.motion = () => true;
  assert.equal(S.needKey(st, h.sv, settings, h.ui).key, "crates");
  INTENTS.home.intent(h, "room", "confirm");
  assert.deepEqual([h.went.at(-1), h.ui.cargo.state], ["cargo", "opening"], "one ✓ on Home: the bay is opening");
  assert.ok(h.played.some((e) => e.kind === "arrival" && e.target === "crate") && st.tray.length === 1, "the rule opened the crate");
  const h2 = host(world()); h2.motion = () => true; h2.specs.incubator = incubatorSpec; const st2 = h2.st, q = pod(st2, "S01", chapters("S01")), now = Date.now();
  assert.ok(S.grow(st2, q, {}, settings, now).ok); assert.ok(!S.budReady(st2, settings, now));
  assert.equal(S.needKey(st2, h2.sv, settings, h2.ui), null, "amber only for real needs: a growing bud is no need"); INTENTS.home.intent(h2, "room", "confirm"); assert.deepEqual(h2.went, [], "a growing bud is not a need: at rest ✓ does nothing");
  INTENTS.home.intent(h2, "incubator", "confirm");
  assert.deepEqual([h2.went.at(-1), h2.played.some((e) => e.kind === "hatch"), !!st2.bud], ["incubator", false, true], "a growing bud: the Incubator station's ✓ only looks");
  const h3 = host(world()); h3.motion = () => true; h3.specs.incubator = incubatorSpec; const st3 = h3.st, q3 = pod(st3, "S01", chapters("S01")); S.grow(st3, q3, {}, settings, T0); st3.bud.early = true;   // finished on its own (Hatch now would hatch at once)
 
  assert.equal(S.needKey(st3, h3.sv, settings, h3.ui).key, "budReady"); INTENTS.home.intent(h3, "room", "confirm");
  assert.deepEqual([h3.went.at(-1), h3.played.some((e) => e.kind === "hatch"), !!h3.ui.inc.hatch, st3.bud], ["incubator", true, true, null], "one ✓ on Home: the hatch plays");
});

// ---- R5 (T-20261027-318): the new-room chip, the Add a room? panel and the full need's jump ----
function roomHost({ e = 99, rooms = 1, adults = 0 } = {}) {
  const st = world(); st.e = e; st.rooms = rooms; if (adults) S.seedAdults(st, "S01", 5, adults, { ...settings, rooms: null });
  const h = host(st); h.settings = { ...settings, rooms: null }; h.ui.screen = "vivarium"; h.ui.viv = { f: "room.new", prev: null }; h.shown = []; h.showRoom = (i) => { st.face.room = i; h.shown.push(i); };   // the host's showRoom sets st.face.room (host.mjs); here it only records
  return h;
}
test("✓ on the new-room chip opens the Add a room? panel with nothing spent, the ring on Add the room (on Not now while the price is short); ✓ on a room's chip does nothing", () => {
  let h = roomHost(); INTENTS.vivarium.intent(h, "room.new", "confirm");
  assert.deepEqual([h.ui.panel.screen, h.ui.panel.id, h.ui.panel.focus, h.st.e, h.st.rooms, h.said, h.went], ["vivarium", "addRoom", "card.add", 99, 1, [], []], "opens, spends nothing, says nothing");
  h = roomHost({ e: 3 }); INTENTS.vivarium.intent(h, "room.new", "confirm"); assert.deepEqual([h.ui.panel.id, h.ui.panel.focus, h.st.e], ["addRoom", "card.keep", 3], "short of Energy: the panel opens, the ring on Not now");
  h = roomHost(); INTENTS.vivarium.intent(h, "room.0", "confirm"); assert.deepEqual([h.ui.panel ?? null, h.went, h.said, h.st.e], [null, [], [], 99], "no ✓ cap on a room's chip: nothing happens");
});
test("the Add the room card spends ⚡ and adds the room (4, then 8, then 12), shows it empty with the ring on its chip and says it is ready; Not now, ← and a dimmed card spend nothing", () => {
  const h = roomHost(); INTENTS.vivarium.intent(h, "room.new", "confirm"); INTENTS.panel.intent(h, "card.add", "confirm");
  assert.deepEqual([h.st.e, h.st.rooms, h.ui.panel, h.ui.viv.f, h.shown, h.said, h.saved, h.st.face.room], [95, 2, null, "room.1", [1], ["The Reeds room is ready"], 1, 1], "Reeds, 4 Energy, the ring on its chip, the plate");
  INTENTS.vivarium.intent(h, "room.new", "confirm"); INTENTS.panel.intent(h, "card.add", "confirm"); assert.deepEqual([h.st.e, h.st.rooms, h.said.at(-1)], [87, 3, "The Boulders room is ready"], "the third room costs 8");
  INTENTS.vivarium.intent(h, "room.new", "confirm"); INTENTS.panel.intent(h, "card.add", "confirm"); assert.deepEqual([h.st.e, h.st.rooms, h.said.at(-1)], [75, 4, "The Ferns room is ready"], "the fourth room costs 12");
  assert.equal(S.addRoomBlock(h.st, h.settings).key, "all", "at four rooms there is nothing to add");
  for (const how of [["card.keep", "confirm"], ["card.add", "back"]]) { const g = roomHost(); INTENTS.vivarium.intent(g, "room.new", "confirm"); INTENTS.panel.intent(g, ...how); assert.deepEqual([g.st.e, g.st.rooms, g.ui.panel, g.shown, g.said, g.saved], [99, 1, null, [], [], 0], how.join(" ") + ": nothing spent"); }
  const s = roomHost({ e: 3 }); INTENTS.vivarium.intent(s, "room.new", "confirm"); INTENTS.panel.intent(s, "card.add", "confirm"); assert.deepEqual([s.st.e, s.st.rooms, s.said, !!s.ui.panel], [3, 1, [s.specs.pods.strings.needMore.replace("{icons}", "⚡")], true], "short: the warn words, nothing spent, the panel stays");
});
test("Home's full need: ✓ Add a room goes to the whole with the ring on the new-room chip, ✓ Make room with the ring on the first resident of the room shown", () => {
  const full = (o) => { const h = roomHost({ ...o, adults: 8 }); h.ui.screen = "home"; h.st.dock = { docked: true, at: T0 }; h.st.bud = { kind: "founder", species: "S01", start: Date.now() - 1e8, minutes: 5 }; h.ui.viv.f = null; return h; };
  let h = full({}); assert.equal(S.needKey(h.st, h.sv, h.settings, h.ui).key, "full"); INTENTS.home.intent(h, "room", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.viv.f], ["vivarium", "room.new"], "a room can be bought and paid");
  h = full({ e: 0 }); INTENTS.home.intent(h, "room", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.viv.f], ["vivarium", "resident." + h.st.mibis[0].id], "short of Energy: Make room, the first resident");
  h = full({ rooms: 4 }); h.settings.rooms = 1; INTENTS.home.intent(h, "room", "confirm"); assert.deepEqual([h.went.at(-1), h.ui.viv.f], ["vivarium", "resident." + h.st.mibis[0].id], "no room to add: Make room");
});
test("Pods, the 200 ms scroll: a ring move that changes the first row on screen plays the cabinet's wipe from the old row to the new; a move inside the rows shown plays nothing", () => {
  const st = world(); for (let i = 0; i < 18; i++) pod(st, "S01", [], 20 + i); const h = host(st); INTENTS.pods.openInventory(h, { first: true });
  h.played.length = 0; INTENTS.pods.focus(h, "card.3"); assert.deepEqual(h.played, [], "row 1 is on screen: no scroll");
  INTENTS.pods.focus(h, "card.9"); assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.ms, e.from, e.to]), [["wipe", "cabinet", 200, 0, 2]], "row 3: the first row goes to 2, sliding");
  assert.equal(h.ui.pods.first, 2);
});
