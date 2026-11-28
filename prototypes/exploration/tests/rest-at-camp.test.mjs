// Rest at camp (rest-at-camp-1): at the flag or a lit outpost, by day, keeping still and the menu's Wait run to the next part of day.
//   node --test prototypes/exploration/tests/rest-at-camp.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, WORDS, restTarget } from "../src/data/words.mjs";
import { holdRun } from "../src/ease.mjs";

const start = () => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };
const rest = p => { p.run("menuWait('map')"); p.pass(5000); };   // a hold at camp runs in slices over timers
const at = (p, spent) => p.run(`S.day.spent = ${spent}`);
const snap = p => p.run("JSON.stringify({ spent: S.day.spent, actions: S.exp.actions, total: S.totalActions, shield: S.exp.shield, pos: S.exp.pos, turn: S.turn, waits: S.exp.stats.waits })");

test("restTarget names the next part and the light to its first light; none from dusk", () => {
  assert.deepEqual(restTarget(0), { name: "morning", left: 50 });
  assert.deepEqual(restTarget(49), { name: "morning", left: 1 });
  assert.deepEqual(restTarget(50), { name: "midday", left: 150 });
  assert.deepEqual(restTarget(60), { name: "midday", left: 140 });
  assert.deepEqual(restTarget(DAY.light - 50 - 50 - 1), { name: "dusk", left: 1 });
  assert.equal(restTarget(DAY.light - 100), null, "dusk");
  assert.equal(restTarget(DAY.light - 50), null, "night");
});

test("holdRun: a warned strike and a lost plate stop it; the cap is the argument", () => {
  assert.deepEqual(holdRun(() => ({ warn: true }), () => 0, 150), { n: 1, why: "warn" });
  assert.deepEqual(holdRun(() => ({ plate: true }), () => 0, 150), { n: 1, why: "plate" });
  assert.deepEqual(holdRun(() => ({}), () => 0, 150), { n: 150, why: "ten" });
});

test("at the flag in the morning one menu Wait ends at midday's first light, equal to single Waits", () => {
  const a = start(), b = start();
  for (const p of [a, b]) { at(p, 60); p.run("S.exp.pos = S.exp.start; S.exp.shield = 3"); }
  assert.equal(a.run("campLabel('Wait', WORDS.ease.waitTo)"), "Wait · until midday");
  rest(a);
  assert.equal(a.run("S.day.spent"), 200, "midday's first light");
  assert.equal(a.run("dayPart()"), "midday");
  let n = 0; while (b.run("dayPart()") !== "midday" && n++ < 400) b.run("waitTick('map')");
  const sa = JSON.parse(snap(a)), sb = JSON.parse(snap(b));
  // a storm may have stopped the hold early: compare only when the hold ran whole
  if (sa.spent === 200) assert.deepEqual(sa, sb, "the same state field for field");
});

test("a hold away from the flag is ten light, at dusk and at night too", () => {
  const p = start();
  at(p, 60); p.run("S.exp.pos = S.exp.start"); assert.ok(p.run("!!campRest()"));
  // one cell away from the flag (not lit)
  const nb = p.run("(() => { const s = S.exp.start, c = [s + 1, s - 1, s + MW, s - MW].find(q => q >= 0 && q < MW * MH && !depotLit(q) && q !== s); return c; })()");
  p.run(`S.exp.pos = ${nb}`); assert.equal(p.run("campRest()"), null, "away from camp");
  assert.equal(p.run("campLabel('Wait', WORDS.ease.waitTo)"), "Wait");
  const s0 = p.run("S.day.spent"); rest(p); assert.equal(p.run("S.day.spent"), s0 + 1, "away: the menu Wait is one light");
  for (const spent of [DAY.light - 100, DAY.light - 50]) { at(p, spent); p.run("S.exp.pos = S.exp.start"); assert.equal(p.run("campRest()"), null); }
});

test("the stops: a tell, a warned strike, a lost plate, the part turning", () => {
  const p = start(); at(p, 60); p.run("S.exp.pos = S.exp.start; S.exp.shield = 3");
  p.run("S.exp.mstrike = { c: S.exp.pos, at: S.exp.actions + 50 }");
  const s0 = p.run("S.day.spent"); rest(p);
  assert.ok(p.run("S.day.spent") - s0 <= 1, "a warned strike stops it at once");
  const q = start(); at(q, 60); q.run("S.exp.pos = S.exp.start; S.exp.shield = 3; S.exp.stray = { at: S.exp.actions + 50, scope: 'map', cell: S.exp.pos, x: 0, y: 0 }; TEST.calm = false");
  const s1 = q.run("S.day.spent"); rest(q);
  assert.ok(q.run("S.day.spent") - s1 <= 1, "a stray stops it");
  const r = start(); at(r, 190); r.run("S.exp.pos = S.exp.start"); rest(r);
  assert.equal(r.run("dayPart()"), "midday"); assert.equal(r.run("S.day.spent"), 200);
  const last = start(); at(last, 490); last.run("S.exp.pos = S.exp.start"); rest(last);
  assert.equal(last.run("dayPart()"), "dusk"); assert.equal(last.run("S.day.spent"), 500, "the afternoon ends as dusk begins");
});

test("a long hold runs in slices with input locked until it ends", () => {
  const p = start(); at(p, 60); p.run("S.exp.pos = S.exp.start");
  p.run("menuWait('map')");
  const mid = p.run("S.day.spent"); assert.ok(mid > 60 && mid < 200, "the first slice ran, the part is not yet over: " + mid);
  assert.ok(p.run("FX.lockUntil > performance.now()"), "input is locked while it runs");
  p.pass(5000);
  assert.equal(p.run("S.day.spent"), 200); assert.equal(p.run("FX.lockUntil"), 0, "unlocked at the end");
  assert.equal(p.run("S.exp.stats.holdLight"), 140);
});
