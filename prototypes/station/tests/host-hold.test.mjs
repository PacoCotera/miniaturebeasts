// The host's hold (lvgl-switch.md §2.1, §2.7): `hold` is whole ms from an event's start, independent of its ms; the host holds until the latest start + hold on its own clock; what follows an event is scheduled with at() and
// run by frame(), never waited for on `done`; during a hold every intent is dropped but a room key, of which the last is kept and dispatched when the hold ends, except in Home's rest, which ends on Idle and drops it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, onFaceMessage } from "../src/host.mjs";
import { INTENTS } from "../src/intents/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
for (const k of ["frame", "pods", "home"]) SPECS[k] = JSON.parse(readFileSync(path.join(specs, k + ".json"), "utf8"));
const rig = () => {
  G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; UI.screen = "home"; UI.idle = false; UI.resting = false; UI.home.f = "room";
  const sent = []; let t = 0; const h = createHost({ send: (m) => sent.push(m), nowMs: () => t, motion: () => true }); h.save = () => {};
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
test("Home's rest: a room key during the hold is dropped, the rest ends on Idle at 380 ms, the next key only wakes", () => {
  const { h, sent, at } = rig(); at(1000); UI.home.f = "knob"; INTENTS.home.intent(h, "knob", "confirm");
  assert.deepEqual([sent.at(-1).kind, sent.at(-1).ms, sent.at(-1).hold], ["rest", 200, 380]); assert.equal(UI.resting, true);
  at(1100); onFaceMessage(h, room("room:research")); assert.equal(h.pendingRoom ?? null, null, "dropped, never kept");
  at(1200); assert.deepEqual([sent.at(-1).kind, sent.at(-1).from, sent.at(-1).to], ["dither", 0, 16], "the transition to Idle begins at 200");
  at(1379); assert.equal(UI.idle, false); at(1380); assert.equal(UI.idle, true); assert.equal(UI.resting, false); assert.equal(UI.screen, "home"); assert.equal(UI.home.f, "knob"); assert.equal(h.pendingRoom ?? null, null);
  at(1400); assert.equal(UI.screen, "home", "nothing was dispatched after the hold");
  onFaceMessage(h, { t: "intent", seq: 2, screen: "idle", target: "idle", verb: "wake" }); assert.equal(UI.idle, false, "the next key only wakes"); assert.equal(UI.screen, "home"); assert.deepEqual([sent.at(-1).kind, sent.at(-1).ms, sent.at(-1).hold], ["dither", 180, 180]);
});
