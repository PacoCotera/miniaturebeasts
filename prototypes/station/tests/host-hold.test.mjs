// The host's hold (lvgl-switch.md §2.1, §2.7): `hold` is whole ms from an event's start, independent of its ms; the host holds until the latest start + hold on its own clock; what follows an event is scheduled with at() and
// run by frame(), never waited for on `done`; during a hold every intent is dropped but a room key, of which the last is kept and dispatched when the hold ends, except in Home's rest, which ends on Idle and drops it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, onFaceMessage, screenProps } from "../src/host.mjs";
import { INTENTS } from "../src/intents/index.mjs";
import { enterIdle, idleTick } from "../src/intents/frame.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
for (const k of ["frame", "pods", "home", "cargo", "create", "vivarium", "habitat", "namer", "panel"]) SPECS[k] = JSON.parse(readFileSync(path.join(specs, k + ".json"), "utf8"));
const rig = ({ motion = true, onDock } = {}) => {
  G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; UI.screen = "home"; UI.idle = false; UI.resting = false; UI.home.f = "room";
  const sent = []; let t = 0; const h = createHost({ send: (m) => sent.push(m), nowMs: () => t, light: () => "day", motion: () => motion, ...(onDock ? { onDock } : {}) }); h.save = () => {};
  return { h, sent, at: (ms) => { t = ms; h.frame(); } };
};
const room = (verb) => ({ t: "intent", seq: 1, screen: "home", target: "room", verb });

test("play sends hold as a whole number of ms, default 0, and refuses anything else", () => {
  const { h, sent } = rig();
  h.play({ kind: "plate", target: "msg", ms: 400 }); assert.equal(sent.at(-1).hold, 0); h.play({ kind: "seal", target: "p", ms: 2000, hold: 500 }); assert.equal(sent.at(-1).hold, 500);
  for (const bad of [true, -1, 1.5, "9"]) assert.throws(() => h.play({ kind: "seal", target: "p", ms: 2000, hold: bad }), /whole number of ms/);
});
test("the host holds until the latest start + hold on its own clock, independent of the event's ms", () => {
  const { h, at } = rig(); at(1000); h.play({ kind: "seal", target: "p", ms: 2000, hold: 500 }); assert.equal(h.holding(), true); at(1499); assert.equal(h.holding(), true); at(1500); assert.equal(h.holding(), false, "a hold shorter than ms frees input while the event plays");
  h.play({ kind: "plate", target: "msg", ms: 100, hold: 1000 }); at(1700); assert.equal(h.holding(), true, "a hold longer than ms holds past its end"); h.play({ kind: "seal", target: "p", ms: 50, hold: 100 }); at(1800); assert.equal(h.holding(), true, "the latest end wins"); at(2500); assert.equal(h.holding(), false);
});
test("at() runs what is scheduled from the frame loop, in order, and never on done", () => {
  const { h, at } = rig(), log = []; at(0); h.at(300, () => log.push("b")); h.at(100, () => log.push("a")); at(99); assert.deepEqual(log, []); at(350); assert.deepEqual(log, ["a", "b"]);
  onFaceMessage(h, { t: "done", kind: "hatch", target: "1" }); assert.deepEqual(log, ["a", "b"], "a done says nothing to the host");
});
test("during a hold every intent is dropped but the last room key, which is dispatched at the hold's end", () => {
  const { h, at } = rig(); at(0); h.play({ kind: "seal", target: "p", ms: 2000, hold: 2000 });
  onFaceMessage(h, { t: "intent", seq: 1, screen: "home", target: "cargo", verb: "confirm" }); assert.equal(UI.screen, "home", "a ✓ in the hold is dropped");
  onFaceMessage(h, room("room:library")); onFaceMessage(h, room("room:research")); assert.equal(h.pendingRoom, "research", "the last room key is kept");
  at(1999); assert.equal(UI.screen, "home"); at(2000); assert.equal(UI.screen, "pods", "dispatched once the hold is over"); assert.equal(h.pendingRoom, null);
});
test("Home's rest: the Home key at rest rests; a room key during the hold is dropped, the rest ends on Idle at 380 ms, the next key only wakes", () => {
  const { h, sent, at } = rig(); at(1000); UI.home.f = "room"; onFaceMessage(h, { t: "intent", seq: 1, screen: "home", target: "room", verb: "room:home" });
  assert.deepEqual([sent.at(-1).kind, sent.at(-1).target, sent.at(-1).ms, sent.at(-1).hold], ["rest", "home", 200, 380]); assert.equal(UI.resting, true);
  at(1100); onFaceMessage(h, room("room:research")); assert.equal(h.pendingRoom ?? null, null, "dropped, never kept");
  at(1200); assert.deepEqual([sent.at(-1).kind, sent.at(-1).from, sent.at(-1).to], ["dither", 0, 16], "the transition to Idle begins at 200");
  at(1379); assert.equal(UI.idle, false); at(1380); assert.equal(UI.idle, true); assert.equal(UI.resting, false); assert.equal(UI.screen, "home"); assert.equal(UI.home.f, "room"); assert.equal(h.pendingRoom ?? null, null);
  at(1400); assert.equal(UI.screen, "home", "nothing was dispatched after the hold");
  onFaceMessage(h, { t: "intent", seq: 2, screen: "idle", target: "idle", verb: "wake" }); assert.equal(UI.idle, false, "the next key only wakes"); assert.equal(UI.screen, "home"); assert.deepEqual([sent.at(-1).kind, sent.at(-1).ms, sent.at(-1).hold], ["dither", 180, 180]);
});

test("the idle timer's enter (frame.json idle.enter): the dither closes over the stage for 180 ms with input held and Idle shows at its end; with reduced motion Idle is on this frame and nothing is held", () => {
  const { h, sent, at } = rig(); at(1000); enterIdle(h);
  assert.deepEqual(sent.find((m) => m.kind === "dither"), { t: "event", kind: "dither", target: "stage", ms: 180, from: 0, to: 16, hold: 180 }); assert.equal(UI.idle, false); assert.equal(h.holding(), true); assert.equal(UI.entering, true);
  at(1179); assert.equal(UI.idle, false); at(1180); assert.equal(UI.idle, true); assert.equal(UI.entering, false); assert.equal(h.holding(), false);
  UI.idle = false; const r = rig({ motion: false }); r.at(1000); enterIdle(r.h); assert.equal(UI.idle, true, "a cut"); assert.deepEqual(r.sent.map((m) => [m.kind, m.hold]), [["dither", 0]]); assert.equal(r.h.holding(), false);
  UI.idle = false; const k = rig(); k.at(0); enterIdle(k.h); onFaceMessage(k.h, { t: "intent", seq: 1, screen: "home", target: "room", verb: "room:research" }); assert.equal(k.h.pendingRoom, null, "a room key in the enter's hold is dropped, as in the rest"); k.at(180); assert.equal(UI.idle, true); assert.equal(UI.resting, false); assert.equal(k.h.pendingRoom, null); assert.equal(UI.screen, "home");
});
test("the wake: the first press on Idle sends the dither back with hold 180, and 0 with reduced motion; it does nothing else", () => {
  for (const [motion, hold] of [[true, 180], [false, 0]]) {
    const { h, sent, at } = rig({ motion }); UI.idle = true; at(0); onFaceMessage(h, { t: "intent", seq: 1, screen: "home", target: "idle", verb: "wake" });
    assert.equal(UI.idle, false); assert.equal(UI.screen, "home"); assert.deepEqual(sent.find((m) => m.kind === "dither"), { t: "event", kind: "dither", target: "stage", ms: 180, hold }); assert.equal(h.holding(), motion);
  }
});
test("the Dock key from Idle docks and the arrival plays over Home with the ring on the room; lifted from Idle it lifts and the screen under Idle shows", () => {
  const { h } = rig(); G.sv.mibis = []; UI.screen = "pods"; UI.home.f = "pods"; UI.idle = true; G.st.dock = { docked: false, at: 0 };
  INTENTS.frame.dock(h, true); assert.equal(G.st.dock.docked, true); assert.equal(UI.screen, "cargo", "the arrival rises over Home"); assert.equal(UI.cargo.arrival.from, "home"); assert.equal(UI.home.f, "room");
  UI.cargo.state = "bay"; UI.cargo.arrival = null; UI.panel = null; UI.screen = "pods"; UI.idle = true; INTENTS.frame.dock(h, true); assert.equal(G.st.dock.docked, false); assert.equal(UI.screen, "pods", "lifted: the screen under Idle");
});
test("an arrival is tracked by the host (the idle timer waits for the end of Home's crates sliding in, which hold nothing)", () => {
  const { h, at } = rig(); at(0); assert.equal(h.arriving(), false); h.play({ kind: "arrival", target: "cargo", ms: 750 }); assert.equal(h.holding(), false); assert.equal(h.arriving(), true); at(749); assert.equal(h.arriving(), true); at(750); assert.equal(h.arriving(), false);
});
test("Cargo's opening on the host: a one-crate opening of materials only is 700 + 150 × 2 + 600 + 300 = 1900 ms and holds 20 ms longer; ✓ in it is Skip (the last crate: the end), a room key ends it at once and opens its section, and a Dock key waits for the end", () => {
  const mk = () => { const r = rig(); const crate = { id: "c1", n: 1, turn: 2, at: 0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] };
    G.sv.bay = [crate]; G.st.dock = { docked: true, at: 0 }; UI.screen = "cargo"; UI.cargo.state = "bay"; UI.cargo.run = null; UI.skip = null; r.h.pendingDock = false; r.at(0); return r; };
  { const { h, sent, at } = mk(); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" });
    assert.equal(UI.cargo.state, "opening"); assert.equal(h.holding(), true); assert.deepEqual(sent.find((m) => m.kind === "arrival" && m.target === "crate"), { t: "event", kind: "arrival", target: "crate", ms: 1900, hold: 1920, skip: true });
    h.pendingDock = true;   // main.mjs act: a Dock key in Cargo's opening waits
    at(1900); assert.equal(UI.cargo.state, "opening", "the hold runs 20 ms past the crate's end"); assert.equal(G.st.dock.docked, true); at(1919); assert.equal(UI.cargo.state, "opening");
    at(1920); assert.equal(UI.cargo.state, "end"); assert.equal(h.holding(), false); assert.equal(G.st.dock.docked, false, "the Dock key waited for the end and lifted"); assert.equal(h.pendingDock, false); assert.equal(UI.screen, "cargo"); }
  { const { h, at } = mk(); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); at(500);
    onFaceMessage(h, { t: "intent", seq: 3, screen: "cargo", target: "room", verb: "room:research" }); assert.equal(UI.screen, "pods", "a room key during the hold ends the opening and opens its section at once"); assert.equal(UI.cargo.state, "bay"); assert.equal(h.pendingRoom ?? null, null); assert.equal(h.holding(), false); assert.equal(G.st.accepted.length, 1, "the crate that was open is taken in"); }
  { const { h, at } = mk(); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); at(500); onFaceMessage(h, { t: "intent", seq: 4, screen: "cargo", target: "room", verb: "back" });
    assert.deepEqual([UI.screen, UI.cargo.state, UI.home.f], ["home", "bay", "bay"], "← finishes the crate as a cut and goes Home, the ring on the Bay station"); assert.equal(h.holding(), false); }
});

test("the Dock during a hold: kept and acting when the hold ends, before a kept room key; two presses cancel; during Home's rest it wakes onto Home with the dock applied", () => {
  const mk = () => { const r = rig(); G.sv.mibis = []; G.st.dock = { docked: false, at: 0 }; UI.screen = "pods"; UI.idle = false; return r; };
  { const { h, at } = mk(); at(0); h.play({ kind: "seal", target: "p", ms: 1000, hold: 1000 }); h.pendingDock = !h.pendingDock; assert.equal(G.st.dock.docked, false); at(999); assert.equal(G.st.dock.docked, false); at(1000); assert.equal(G.st.dock.docked, true, "the Dock acts at the hold's end"); }
  { const { h, at } = mk(); at(0); h.play({ kind: "seal", target: "p", ms: 1000, hold: 1000 }); h.pendingDock = !h.pendingDock; h.pendingDock = !h.pendingDock; at(1000); assert.equal(G.st.dock.docked, false, "two presses cancel"); }
  { const { h, at } = mk(); at(0); h.play({ kind: "seal", target: "p", ms: 1000, hold: 1000 }); h.pendingDock = true; onFaceMessage(h, { t: "intent", seq: 1, screen: "pods", target: "room", verb: "room:library" }); at(1000); assert.equal(G.st.dock.docked, true); assert.equal(UI.screen, "cargo", "the arrival plays over Pods and holds"); at(3500); assert.equal(UI.screen, "library", "the kept room key follows the arrival's end (an empty trip closes at 2500, then the key acts)"); }
  { const r = rig({ onDock: (h) => { const was = UI.idle; UI.idle = false; INTENTS.frame.dock(h, was); } }); G.sv.mibis = []; G.st.dock = { docked: false, at: 0 }; const { h, at } = r; UI.screen = "pods"; UI.home.f = "room"; at(0); UI.idle = true; h.play({ kind: "rest", target: "home", ms: 200, hold: 380 }); h.pendingDock = true; at(380); assert.equal(G.st.dock.docked, true, "the Dock kept through Home's rest acts at its end"); assert.equal(UI.screen, "cargo", "the arrival over Home"); assert.equal(UI.cargo.arrival.from, "home"); }
});
test("two Dock presses during Cargo's opening leave the dock unchanged at its end (1920 ms); a Dock on Cargo leaves no plate", () => {
  const { h, at } = rig(); const crate = { id: "c1", n: 1, turn: 2, at: 0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] };
  G.sv.bay = [crate]; G.st.dock = { docked: true, at: 0 }; UI.screen = "cargo"; UI.cargo.state = "bay"; UI.cargo.run = null; h.pendingDock = false; at(0);
  onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); h.pendingDock = !h.pendingDock; h.pendingDock = !h.pendingDock; at(1920); assert.equal(G.st.dock.docked, true);
  const said = []; h.say = (m) => said.push(m); G.st.dock = { docked: false, at: 0 }; UI.cargo.state = "bay"; INTENTS.frame.dock(h); assert.deepEqual(said, [], "no plate on Cargo"); assert.equal(G.st.dock.docked, true);
});

test("the idle timer counts 60 s from the last press, not during a hold, an arrival or Cargo's end, and 60 s from the end of each", () => {
  const { h, at } = rig(); const tick = (ms) => { at(ms); idleTick(h, ms, 60000); };
  UI.lastInput = 0; tick(59000); assert.equal(UI.idle, false); tick(60001); assert.equal(UI.entering || UI.idle, true, "fires 60 s after the last press");
  at(60300); assert.equal(UI.idle, true); UI.idle = false; at(70000); UI.lastInput = 70000;
  UI.cargo.state = "end"; tick(200000); assert.equal(UI.idle, false, "never during the end"); assert.equal(UI.lastInput, 200000);
  UI.cargo.state = "bay"; tick(259000); assert.equal(UI.idle, false, "not yet 60 s after the end closed"); tick(260001); assert.equal(UI.entering || UI.idle, true, "60 s after the end closes"); at(260400); assert.equal(UI.idle, true); UI.idle = false;
  at(300000); UI.lastInput = 300000; h.play({ kind: "arrival", target: "cargo", ms: 750 }); tick(300749); tick(360700); assert.equal(UI.entering || UI.idle, false, "the arrival's end restarts the count: 60 s from 300750"); tick(360751); assert.equal(UI.entering || UI.idle, true);
});

test("the Dock key from Idle with crates in the bay plays the arrival over Home: the show event is held and skippable, and the host tracks it", () => {
  const { h, sent, at } = rig(); at(0); G.sv.mibis = []; UI.screen = "pods"; UI.idle = true; G.st.dock = { docked: false, at: 0 };
  G.sv.bay = [{ id: "c1", n: 1, turn: 2, at: 0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }];
  assert.ok(S.bayCrates(G.st, G.sv).length > 0, "the rig has a crate in the bay");
  INTENTS.frame.dock(h, true); assert.equal(UI.screen, "cargo"); assert.equal(UI.cargo.arrival.from, "home");
  assert.deepEqual(sent.filter((m) => m.kind === "arrival").map((m) => [m.target, m.ms, m.hold, m.skip]), [["show", 3500, 3500, true]]); assert.equal(h.arriving(), true); assert.equal(h.holding(), true);
  at(3499); assert.equal(UI.cargo.arrival.phase, "show"); at(3500); assert.equal(UI.cargo.arrival.phase, "choice"); assert.equal(h.holding(), false, "the show's hold ends with the show");
  onFaceMessage(h, { t: "intent", seq: 1, screen: "panel", target: "card.later", verb: "back" }); assert.deepEqual([UI.screen, UI.cargo.state], ["home", "bay"]);
});

test("Create's Incubate on the host: ✓ opens the Incubate | Keep shaping panel with the 180 ms stage dither held (a cut with reduced motion); ✓ Incubate after it plays the grow event (holds 1080 ms), the jump to the Incubator is the timer's at 900 ms and plays the incubate moment, a room key pressed in the hold is kept and acts at 1080; with reduced motion the jump is on ✓'s frame and nothing is held", () => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, mk = (motion) => {
    const r = rig({ motion }); G.st.e = 99; G.st.d = 99; G.st.s = 99; G.st.firstMibi = false; S.seedPodFromGenome(G.st, podGenome(frameOf("S01"), 3), settings, 1000); const p = G.st.tray[0]; S.skipIdentify(G.st, p);
    UI.screen = "create"; UI.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; return r;
  };
  { const { h, sent, at } = mk(true); at(0); INTENTS.create.intent(h, "roll", "confirm"); assert.deepEqual([UI.panel.screen, UI.panel.id, UI.panel.focus], ["create", "incubate", "card.incubate"], "✓ opens the panel");
    assert.deepEqual(sent.filter((m) => m.t === "event").map((m) => [m.kind, m.target, m.ms, m.hold]), [["dither", "stage", 180, 180]], "the dither in, input held"); assert.equal(h.holding(), true);
    at(100); onFaceMessage(h, { t: "intent", seq: 1, screen: "panel", target: "card.incubate", verb: "confirm" }); assert.equal(G.st.bud, null, "✓ Incubate is not taken until the dither in has ended (a double press never passes through the panel)"); assert.ok(UI.panel);
    at(180); assert.equal(h.holding(), false); onFaceMessage(h, { t: "intent", seq: 2, screen: "panel", target: "card.incubate", verb: "confirm" }); assert.equal(UI.panel, null, "the panel goes as a cut");
    assert.ok(G.st.bud, "the rule paid and the bud started");
    assert.deepEqual(sent.filter((m) => m.t === "event" && m.kind !== "dither").map((m) => [m.kind, m.target, m.ms, m.hold]), [["grow", "pod", 900, 1080]]); assert.equal(h.holding(), true);
    onFaceMessage(h, { t: "intent", seq: 3, screen: "create", target: "roll", verb: "room:research" }); assert.equal(h.pendingRoom, "research", "the room key waits");
    at(180 + 500); assert.deepEqual([UI.screen, h.holding()], ["create", true]); at(180 + 899); assert.equal(UI.screen, "create");
    at(180 + 900); assert.deepEqual([UI.screen, UI.create, h.holding()], ["incubator", null, true], "the jump at 900 ms, input still held"); assert.deepEqual(sent.findLast((m) => m.kind === "incubate").hold, 1380, "the incubate moment is played on arrival");
    at(180 + 1080); assert.deepEqual([UI.screen, h.holding()], ["incubator", true], "the grow event's hold is over but the incubate moment holds on (1380 ms from the arrival)"); at(180 + 900 + 1379); assert.equal(UI.screen, "incubator"); at(180 + 900 + 1380); assert.deepEqual([UI.screen, h.pendingRoom], ["pods", null], "the kept room key acts when the last hold ends"); }
  { const { h, sent, at } = mk(true); at(0); INTENTS.create.intent(h, "roll", "confirm"); at(180); onFaceMessage(h, { t: "intent", seq: 1, screen: "panel", target: "card.keep", verb: "confirm" });
    assert.equal(UI.panel, null); assert.equal(G.st.bud, null, "Keep shaping spends nothing"); assert.deepEqual(sent.findLast((m) => m.t === "event"), { t: "event", kind: "dither", target: "stage", ms: 180, hold: 180, from: 16, to: 0 }.hold ? sent.findLast((m) => m.t === "event") : null, "the dither back"); assert.equal(h.holding(), true);
    at(360); INTENTS.create.intent(h, "roll", "confirm"); assert.ok(UI.panel, "and it opens again"); onFaceMessage(h, { t: "intent", seq: 2, screen: "panel", target: "card.incubate", verb: "back" }); }
  { const { h, sent, at } = mk(false); at(0); INTENTS.create.intent(h, "roll", "confirm"); assert.ok(UI.panel); assert.equal(h.holding(), false, "a cut: nothing is held"); assert.equal(sent.filter((m) => m.t === "event").length, 0);
    onFaceMessage(h, { t: "intent", seq: 1, screen: "panel", target: "card.incubate", verb: "confirm" }); assert.deepEqual([UI.screen, h.holding(), sent.filter((m) => m.kind === "grow").length], ["incubator", false, 0], "a cut: the jump is on the frame of ✓, nothing is sent or held"); }
  { const { h, at } = mk(true); G.st.e = 0; G.st.d = 0; G.st.s = 0; at(0); INTENTS.create.intent(h, "roll", "confirm"); assert.equal(UI.panel, null, "short of a material: refused as before, the panel does not open"); }
});

// ---- the meet and the namer on the host (habitat.json events.meet, namer.json): the meet persists until the first press, the first ✓ in it opens the namer with the ring on Done, the namer is the only graph while it is open,
// Done closes it with the ring on the resident (the name after a rename) and the named flash, ← walks back through the field, and a namer message after it closed is dropped ----
const namerRig = ({ motion = true, light = "day" } = {}) => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8 };
  G.st = S.freshSt("w1", 3, 1000); S.normalize(G.st); G.st.firstMibi = false; G.settings = settings; S.seedAdults(G.st, "S01", 5, 3, settings); for (const m of G.st.mibis) m.paint = { state: "landed" };
  G.sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], st: G.st };
  const m = G.st.mibis[0]; UI.screen = "habitat"; UI.idle = false; UI.resting = false; UI.hab = { id: m.id, f: "resident", wildArm: 0, namer: null, prev: null }; UI.meet = m.id;
  const sent = []; let t = 0; const h = createHost({ send: (x) => sent.push(x), nowMs: () => t, light: () => light, motion: () => motion }); h.save = () => {};
  return { h, sent, m, at: (ms) => { t = ms; h.frame(); } };
};
const on = (h, screen, target, verb) => onFaceMessage(h, { t: "intent", seq: 1, screen, target, verb });
const typeKeys = (h, ...cs) => { for (const c of cs) on(h, "namer", "key." + SPECS.namer.keys.pages.letters.indexOf(c.toLowerCase()), "confirm"); };

test("the meet lasts until the first press; its ✓ opens the namer over it, the ring on Done, the field holding the name selected", () => {
  const { h, m, at } = namerRig(); at(0);
  onFaceMessage(h, { t: "focus", screen: "habitat", target: "resident" }); assert.equal(UI.meet, null, "a focus message is a press");
  UI.meet = m.id; on(h, "habitat", "resident", "confirm");
  assert.equal(UI.meet, null, "✓ ends the meet"); assert.deepEqual([UI.hab.namer.mode, UI.hab.namer.f, UI.hab.namer.fs, UI.hab.namer.text], ["meet", "act.done", "selected", m.name]);
});
test("while the namer is open habitat's intents and focus are dropped and its own focus is kept; a room key closes it and opens that room", () => {
  const { h, m, at } = namerRig(); at(0); on(h, "habitat", "resident", "confirm");
  on(h, "habitat", "name", "confirm"); onFaceMessage(h, { t: "focus", screen: "habitat", target: "door" }); assert.equal(UI.hab.f, "resident", "habitat's focus is dropped"); assert.equal(UI.hab.namer.mode, "meet");
  onFaceMessage(h, { t: "focus", screen: "namer", target: "key.3" }); assert.equal(UI.hab.namer.f, "key.3");
  on(h, "namer", "key.3", "room:home"); assert.deepEqual([UI.screen, UI.hab.namer], ["home", null], "nothing written"); assert.equal(S.mibiById(G.st, m.id).name, m.name);
});
test("Done: the new name is written, the namer closes with the ring on the resident, the named flash is sent for the tag (hold 0 with reduced motion), and a namer message after it closed is dropped", () => {
  for (const motion of [true, false]) {
    const { h, sent, m, at } = namerRig({ motion }); at(0); on(h, "habitat", "resident", "confirm");
    on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer.fs, "empty", "← clears the selection");
    typeKeys(h, "M", "o", "s"); assert.equal(UI.hab.namer.text, "Mos"); typeKeys(h, "k"); const sFlash = sent.filter((x) => x.t === "event" && x.kind === "flash");
    on(h, "namer", "act.done", "confirm");
    const nm = UI.hab.namer; assert.equal(nm, null, "closed"); assert.equal(UI.hab.f, "resident"); assert.equal(S.mibiById(G.st, m.id).name, "Mosk");
    const flash = sent.filter((x) => x.t === "event" && x.kind === "flash"); assert.equal(flash.length - sFlash.length, 1, "the flash event is sent"); assert.deepEqual([flash.at(-1).target, flash.at(-1).ms, flash.at(-1).hold], ["nameTag", SPECS.namer.events.named.ms, motion ? SPECS.namer.events.named.hold : 0], "reduced motion sends hold 0 (the face draws no flash)");
    const before = S.mibiById(G.st, m.id).name; on(h, "namer", "key.0", "confirm"); assert.equal(S.mibiById(G.st, m.id).name, before, "dropped");
  }
});
test("Keep (Done on the name as it stands) writes nothing and plays no flash; Rename from the name tag closes on the name; ← on an empty field closes writing nothing", () => {
  const { h, sent, m, at } = namerRig(); at(0); UI.meet = null; on(h, "habitat", "name", "confirm"); assert.equal(UI.hab.namer.mode, "rename");
  on(h, "namer", "act.done", "confirm"); assert.deepEqual([UI.hab.namer, UI.hab.f], [null, "name"]); assert.equal(sent.some((x) => x.kind === "flash"), false); assert.equal(S.mibiById(G.st, m.id).name, m.name);
  on(h, "habitat", "name", "confirm"); on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer.fs, "empty"); on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer, null, "an empty field closes"); assert.equal(S.mibiById(G.st, m.id).name, m.name);
});
test("the hatch lands in the meet with the moment played once and no hold; a later way in, the meet over, plays none", () => {
  const { h, sent, m, at } = namerRig(); UI.screen = "incubator"; at(0); UI.meet = m.id; h.goto("habitat");
  const mo = sent.filter((x) => x.t === "event" && x.kind === "moment"); assert.deepEqual(mo.map((x) => [x.target, x.ms, x.hold, x.cut]), [["resident", SPECS.habitat.events.moment.ms, 0, true]], "one moment, no hold");
  UI.meet = null; UI.screen = "vivarium"; h.goto("habitat"); assert.equal(sent.filter((x) => x.t === "event" && x.kind === "moment").length, 1, "none when the meet is over");
});

// ---- Station M1 §2.5 (the game designer's R2 and R5, UI/UX "Hatch cutting key"): the hatch with a moving set holds to the stand (to the first hop's stand on a save's first hatch), then the first key only lands the meet ----
import { setMoving } from "../src/moving.mjs";
SPECS.incubator = JSON.parse(readFileSync(path.join(specs, "incubator.json"), "utf8"));
{ const ix = JSON.parse(readFileSync(path.join(specs, "moving/index.json"), "utf8")), sets = {}; for (const id of ix.sets) sets[id] = JSON.parse(readFileSync(path.join(specs, `moving/${id}.json`), "utf8")); setMoving(sets); }
const hatchRig = ({ first = false } = {}) => {
  const k = rig(); G.settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8, motionSets: true }; G.st.firstMibi = first; G.st.e = 99; G.st.d = 99; G.st.s = 99;
  S.seedPodFromGenome(G.st, podGenome(frameOf("S01"), 3), G.settings, Date.now()); const p = G.st.tray[0]; S.skipIdentify(G.st, p); assert.ok(S.grow(G.st, p, {}, G.settings, Date.now()).ok); S.skipBud(G.st, G.settings, "ready");
  UI.screen = "incubator"; UI.inc = {}; UI.hab.namer = null; UI.meet = null; k.at(0); INTENTS.incubator.intent(k.h, "room", "confirm");
  return k;
};
const inc = (verb) => ({ t: "intent", seq: 1, screen: "incubator", target: "room", verb });
// the hatch with a moving set (Station M1 section 2.5, R2, R5) is not built on the capsule (T-20261016-222: its close atlas is 304 x 312, the mibi in the capsule 146 tall); a juvenile with a set hatches by the capsule's steps
test("a hatch with no moving set keeps 2600 / 2780 and no cut", () => {
  const k = rig(); G.settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8, motionSets: false }; G.st.firstMibi = false; G.st.e = 99; G.st.d = 99; G.st.s = 99;
  S.seedPodFromGenome(G.st, podGenome(frameOf("S01"), 3), G.settings, Date.now()); const p = G.st.tray[0]; S.skipIdentify(G.st, p); assert.ok(S.grow(G.st, p, {}, G.settings, Date.now()).ok); S.skipBud(G.st, G.settings, "ready");
  UI.screen = "incubator"; UI.inc = {}; k.at(0); INTENTS.incubator.intent(k.h, "room", "confirm"); const ev = k.sent.find((m) => m.kind === "hatch"); assert.deepEqual([ev.ms, ev.hold, ev.cut], [2600, 2780, undefined]);
});

test("fix 7: the swap's from names the id of the light shown: the resident's grade at night, the master's own id at day", () => {
  for (const [light, suffix] of [["night", ":night"], ["day", ""]]) {
    const { h, m, at } = namerRig({ light }); at(0); UI.meet = null; screenProps(""); const tile = "tile." + G.st.mibis.find((x) => x.id !== m.id).id;
    onFaceMessage(h, { t: "focus", screen: "habitat", target: tile });
    assert.ok(UI.hab.prev && UI.hab.prev.endsWith(`:${SPECS.habitat.regions.resident.rect[2]}x${SPECS.habitat.regions.resident.rect[3]}${suffix}`), `${light}: ${UI.hab.prev}`);
  }
});

// ---- A skippable hold (lvgl-switch.md §2.1; ceremony cut 4): ✓ Skip ends the hatch's hold at its end state; in Cargo the face says ✓, ← and a room key on "room" (build spec 8.4) and the host applies the crate's end state ----
const skipOf = (screen, target) => ({ t: "intent", seq: 9, screen, target, verb: "skip" });
const heldKey = (verb) => ({ t: "intent", seq: 9, screen: "cargo", target: "room", verb });
const cargoRig = () => {
  const r = rig(); const crate = (id, n, turn) => ({ id, n, turn, at: 0, e: 3, d: 2, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
  G.sv.bay = [crate("c1", 1, 2), crate("c2", 2, 3)]; G.st.dock = { docked: true, at: 0 }; UI.screen = "cargo"; UI.cargo.state = "bay"; UI.cargo.run = null; UI.skip = null; r.h.pendingDock = false; r.at(0);
  onFaceMessage(r.h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); return r;
};
const cargoEnd = () => ({ state: UI.cargo.state, shown: UI.cargo.shown, e: G.st.e, d: G.st.d, s: G.st.s, turn: G.st.turn, accepted: [...G.st.accepted], screen: UI.screen });
test("✓ Skip in Cargo's opening, at 1 ms, mid-way and on the hold's last frame, lands where waiting it out lands: the end, every crate taken in once", () => {
  const { at } = cargoRig(); assert.deepEqual(UI.skip, { kind: "arrival", target: "crate" }, "the host marks the skippable hold for the line"); at(3820); const waited = cargoEnd(); assert.equal(waited.state, "end"); assert.equal(UI.skip, null);
  for (const t of [1, 1900, 3819]) {
    const { h, at: go } = cargoRig(); go(t); onFaceMessage(h, heldKey("confirm")); if (UI.cargo.state === "opening") onFaceMessage(h, heldKey("confirm"));   // at 1900 the second crate has already started: one skip ends it
    assert.equal(h.holding(), false, `the hold ends at ${t}`); assert.equal(UI.skip, null); assert.deepEqual(cargoEnd(), waited, `two skips at ${t} land the waited end state`);
    go(t + 16); go(7000); assert.deepEqual(cargoEnd(), waited, "and nothing runs twice afterwards");
  }
});
test("✓ Skip once: the first crate's end state at once and the second crate starts with its times from 0 (a new event, a new hold)", () => {
  const { h, sent, at } = cargoRig(); at(300); onFaceMessage(h, heldKey("confirm")); const ev = sent.filter((m) => m.kind === "arrival" && m.target === "crate");
  assert.deepEqual(ev.map((m) => [m.ms, m.hold]), [[3800, 3820], [1900, 1920]]); assert.equal(UI.cargo.state, "opening"); assert.equal(UI.cargo.crate, 1); assert.equal(G.st.accepted.length, 2); assert.equal(h.holding(), true, "the second crate holds"); assert.deepEqual(UI.skip, { kind: "arrival", target: "crate" });
  at(300 + 1900); assert.equal(UI.cargo.state, "opening"); at(300 + 1920); assert.equal(UI.cargo.state, "end");
});
test("Cargo's line shows ✓ Skip only while the opening's hold runs", () => {
  const { h, at } = cargoRig(); assert.equal(screenProps().msg.frame.line.ok, SPECS.cargo.strings.skip); onFaceMessage(h, heldKey("confirm")); onFaceMessage(h, heldKey("confirm")); assert.equal(UI.cargo.state, "end"); assert.notEqual(screenProps().msg.frame.line.ok, SPECS.cargo.strings.skip);
  const r = cargoRig(); r.at(1900); assert.equal(screenProps().msg.frame.line.ok, SPECS.cargo.strings.skip); r.at(3820); assert.equal(UI.skip, null, "run out: the line drops it");
});
test("a Dock key kept through the opening still acts after a skip; a room key during the hold ends the opening and opens its section at once", () => {
  const { h, at } = cargoRig(); at(500); h.pendingDock = true; onFaceMessage(h, heldKey("confirm")); onFaceMessage(h, heldKey("confirm")); assert.equal(UI.cargo.state, "end"); at(516);
  assert.equal(G.st.dock.docked, false, "the kept Dock key acted at the hold's end");
  const r = cargoRig(); r.at(900); onFaceMessage(r.h, heldKey("room:research")); assert.equal(UI.screen, "pods", "the room key opened its section"); assert.equal(UI.cargo.state, "bay"); assert.equal(r.h.holding(), false);
});
test("no other hold takes ✓ Skip: a seal's hold, growNow's or Create's grow ignores it and keeps holding", () => {
  const { h, at } = rig(); at(0); h.play({ kind: "seal", target: "p", ms: 2000, hold: 2000 }); assert.equal(UI.skip, null);
  onFaceMessage(h, skipOf("pods", "p")); assert.equal(h.holding(), true, "the seal's hold stands"); at(2000); assert.equal(h.holding(), false);
  h.play({ kind: "growNow", target: "room", ms: 400, hold: 400 }); h.play({ kind: "arrival", target: "crate", ms: 300, hold: 320, skip: true }); onFaceMessage(h, skipOf("cargo", "crate"));
  assert.equal(h.holding(), true, "a skip ends its own hold, not growNow's"); at(2400); assert.equal(h.holding(), false);
  assert.throws(() => h.play({ kind: "hatch", target: "room", ms: 100, hold: 100, skip: "yes" }), /skip is true or false/);
  for (const [file, key] of [["cargo", "opening"], ["incubator", "hatch"]]) assert.equal(SPECS[file].events[key].skip, true, `${file}.json events.${key} carries skip`);
  assert.equal(SPECS.incubator.events.hatch.moving, undefined, "no moving hatch on the capsule"); assert.equal(SPECS.incubator.events.growNow.skip, undefined, "growNow is not skippable");
});
const hatchEnd = () => ({ screen: UI.screen, meet: UI.meet, f: UI.hab.f, id: UI.hab.id, namer: UI.hab.namer, hatch: UI.inc.hatch ?? null, mibis: G.st.mibis.length });
for (const moving of [false]) test(`✓ Skip in the hatch (${moving ? "with a moving set: hold 2720 of 6400" : "no moving set: hold 2780, 2600 long"}), at 1 ms, mid-way and on the hold's last frame, lands where waiting it out lands: the meet`, () => {
  const end = moving ? 6400 : 2780, last = moving ? 2719 : 2779;
  const mkH = () => { if (moving) return hatchRig(); const k = rig(); G.settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8, motionSets: false }; G.st.firstMibi = false; G.st.e = 99; G.st.d = 99; G.st.s = 99;
    S.seedPodFromGenome(G.st, podGenome(frameOf("S01"), 3), G.settings, Date.now()); const p = G.st.tray[0]; S.skipIdentify(G.st, p); assert.ok(S.grow(G.st, p, {}, G.settings, Date.now()).ok); S.skipBud(G.st, G.settings, "ready");
    UI.screen = "incubator"; UI.inc = {}; UI.hab.namer = null; UI.meet = null; k.at(0); INTENTS.incubator.intent(k.h, "room", "confirm"); return k; };
  const w = mkH(); assert.deepEqual(UI.skip, { kind: "hatch", target: "room" }); assert.equal(screenProps().msg.frame.line.ok, SPECS.incubator.strings.skip, "the line shows ✓ Skip in the hatch's hold"); assert.equal(w.sent.find((m) => m.kind === "hatch").skip, true); w.at(end); const waited = hatchEnd(); assert.equal(waited.screen, "habitat"); assert.ok(waited.meet != null);
  for (const t of [1, 1300, last]) {
    const { h, at } = mkH(); at(t); onFaceMessage(h, { t: "done", kind: "hatch", target: "room" }); onFaceMessage(h, skipOf("incubator", "room"));
    assert.equal(h.holding(), false, `the hold ends at ${t}`); const got = hatchEnd(); assert.deepEqual({ ...got, id: got.id != null, meet: got.meet != null }, { ...waited, id: waited.id != null, meet: waited.meet != null }, `a skip at ${t} lands the meet as waiting does`);
    at(end + 16); assert.equal(UI.screen, "habitat"); assert.equal(UI.hab.namer, null, "nothing runs twice and no namer opens");
  }
});
