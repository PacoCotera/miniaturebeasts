// The metrics report on made-up game records: the milestones, the held-over-time curves, the pods, the dead ends, the screens never reached, the "not measurable yet" list and the markdown.
//   node --test prototypes/playtest/tests/metrics.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { report, summarise, markdown, median, NOT_MEASURABLE } from "../metrics.mjs";
import { BUILT } from "../../station/src/nav.mjs";

const series = (n, f) => Array.from({ length: n }, (_, i) => ({ turn: i + 1, e: f.e(i), d: f.d(i), s: f.s(i), pods: i + 1, podsUnread: i + 1, mibis: 0, elders: 0, bay: 0, rooms: 1 }));
const game = (policy, seed, o = {}) => ({ policy, seed, turns: 4, economy: "strict", presses: 100, minutes: 80, firstHatch: null, firstElder: null, series: series(4, { e: (i) => 3 * (i + 1), d: (i) => 10 * (i + 1), s: (i) => 2 * (i + 1) }), screens: { home: 4, pods: 3, cargo: 2 },
  stuck: [], softLock: null, pods: { received: 10, neverRead: 6, heldEnd: 4, grown: 1, letGo: 2 }, hatched: 0, end: "done", ...o });

test("median, and the milestones count the games that reached them", () => {
  assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5); assert.equal(median([]), null);
  const s = summarise("greedy", [game("greedy", 1, { firstHatch: { turn: 2, press: 40, minutes: 25 } }), game("greedy", 2, { firstHatch: { turn: 4, press: 90, minutes: 45 } }), game("greedy", 3)]);
  assert.deepEqual(s.firstHatch.turn, { min: 2, median: 3, max: 4 }); assert.equal(s.firstHatch.reached, 2); assert.equal(s.firstHatch.of, 3);
  assert.equal(s.firstElder.reached, 0); assert.equal(s.firstElder.turn, null);
});

test("held over time: the mean at each turn, the peak, and the share of game-turns over the old ceiling of 20", () => {
  const s = summarise("hoarder", [game("hoarder", 1), game("hoarder", 2, { series: series(4, { e: () => 1, d: (i) => 30 + i, s: () => 0 }) })]);
  assert.deepEqual(s.energy.byTurn[0], { turn: 1, mean: 2, min: 1, max: 3 });
  assert.equal(s.data.peak, 40); assert.equal(s.energy.peak, 12);
  assert.equal(s.data.shareOver20, 0.75);   // 8 game-turns: the first game has 30 and 40 over 20 (2), the second 30 to 33 (4): 6 of 8
});

test("pods: held at the end, never read as a share of the pods received, grown and let go", () => {
  const s = summarise("x", [game("x", 1), game("x", 2, { pods: { received: 30, neverRead: 24, heldEnd: 9, grown: 3, letGo: 0 } })]);
  assert.equal(s.pods.received, 40); assert.equal(s.pods.neverRead, 30); assert.equal(s.pods.neverReadShare, 0.75); assert.equal(s.pods.grown, 4); assert.equal(s.pods.letGo, 2);
  assert.deepEqual(s.pods.heldAtEnd, { min: 4, median: 6.5, max: 9 });
});

test("dead ends are counted by kind and by place, soft locks are listed, and screens never reached are the built screens no game reached", () => {
  const s = summarise("random", [game("random", 1, { stuck: [{ turn: 1, kind: "same-hash", screen: "vivarium", state: "empty", presses: 10 }, { turn: 2, kind: "no-new", screen: "home", state: "home", presses: 50 }], softLock: { turn: 2, screen: "home", kind: "no-new" }, end: "softlock" }), game("random", 2, { screens: { home: 1, "library.species": 1 } })]);
  assert.equal(s.stuck.games, 1); assert.equal(s.stuck.total, 2); assert.deepEqual(s.stuck.byKind, { "same-hash": 1, "no-new": 1 }); assert.equal(s.stuck.byPlace["vivarium.empty"], 1);
  assert.equal(s.stuck.softLocks.length, 1); assert.equal(s.finished, 1);
  assert.ok(s.screens.neverReached.includes("incubator") && s.screens.neverReached.includes("sitting"));
  assert.ok(!s.screens.neverReached.includes("home") && !s.screens.neverReached.includes("pods") && !s.screens.neverReached.includes("library.species"));
  assert.ok(s.screens.neverReached.every((p) => BUILT.includes(p)));
});

test("the report keeps one row a game, lists what is not measurable yet, and says the trips are a stub; the markdown has a row a policy", () => {
  const r = report([game("greedy", 1), game("greedy", 2), game("hoarder", 1)], { games: 2, turns: 4, presses: 60, economy: "strict", face: "native" });
  assert.deepEqual(Object.keys(r.policies), ["greedy", "hoarder"]); assert.equal(r.games.length, 3);
  assert.match(r.meta.stub, /assumed, not measured/);
  assert.equal(r.notMeasurable, NOT_MEASURABLE);
  for (const w of ["Crosses", "manager", "Pods in by source", "Data per trip"]) assert.ok(r.notMeasurable.some((m) => m.what.includes(w)), w);
  const md = markdown(r);
  assert.match(md, /^\| greedy \|/m); assert.match(md, /^\| hoarder \|/m); assert.match(md, /Not measurable yet:/); assert.match(md, /STUB/);
  JSON.parse(JSON.stringify(r));
});
