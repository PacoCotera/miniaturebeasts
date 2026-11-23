// The first trip teaches the loop (loop audit 3.18, C16): on a fresh generator 7 save the first walk yields a pod and the Data the Station asks first,
// on every seed 1-12 (the tool: 1-200), played through the page's keys by tools/first-trip-bot.mjs.
//   node --test prototypes/exploration/tests/first-trip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstTrip, NEXT_DATA, BUDGET, GROW_E } from "../tools/first-trip-bot.mjs";
import { makePage } from "./page-harness.mjs";

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);   // a realm takes about 10 s to make, so the test plays seeds 1-12; node tools/first-trip-bot.mjs plays 1-200
const rows = SEEDS.map((s) => firstTrip(s));

test(`every seed 1-12: the first walk holds the ${NEXT_DATA} Data the Station asks first (no pod: W5)`, () => {
  // No walk is sealed: the Probe's shield is lost only to stray storm strikes, and the first walk of a world takes one at most (seed 70 lost all three plates in 17 actions under the open Windstep).
  const sealed = rows.filter((r) => r.sealed), bad = rows.filter((r) => !r.ok && !r.sealed);
  assert.deepEqual(bad.map((r) => r.seed + ": " + r.why), []);
  assert.deepEqual(sealed.map((r) => r.seed), [], "walks sealed");
  assert.ok(rows.every((r) => r.actions < BUDGET));
});

// lock-playtest-world: the first trip pays for the first Grow at today's price (no number changed): the Station's growCost for the first mibi with no trait changed, against what the walk holds.
test("the first walk pays for the first Grow: the Energy of its price is held, on every seed 1-12", async () => {
  const { growCost } = await import("../../station/src/state.mjs");
  const price = growCost({ firstMibi: true }, {});
  assert.deepEqual(price, { e: GROW_E, s: 0, d: 0 }, "the first Grow costs the Energy PRICE.growE and nothing else");
  assert.deepEqual(rows.filter((r) => !r.sealed && r.energy < price.e).map((r) => r.seed + ": " + r.energy + " Energy"), []);
});

test("it does not take long: the walk's 90th percentile is within 450 actions and no walk enters more than 12 places", () => {
  // 450: the bot's measured p90 over seeds 1-200 on generator 7 is 372, 190, 375 and 401 actions in the four shards of 50 (the heart-era 150 came from generator 6's one tell a place; no decision states it)
  const a = rows.map((r) => r.actions).sort((x, y) => x - y);
  assert.ok(a[Math.floor(a.length * 0.9)] <= 450, "p90 " + a[Math.floor(a.length * 0.9)]);
  assert.ok(rows.every((r) => r.places <= 12), "places " + Math.max(...rows.map((r) => r.places)));
});

// W5 (walk-design-1): the end of anonymous pods. A new world has no buried pod and a new expedition makes none; a shed moment leaves a tuft; a pod comes from a known wild one's own young.
test("no anonymous pod: a new world's first expedition lies on no buried pod, and the world turn makes none", () => {
  for (const seed of [1, 7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" });
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    assert.equal(p.run(`S.pods.filter(q => q.how === 'ground').length`), 0, `seed ${seed}: a buried pod lies in the world`);
    assert.equal(p.run(`S.pods.length`), 0, `seed ${seed}: a pod lies in the world`);
  }
});

test("a fully known wild one leaves its own pod at its bed, once: how 'own', her name, a genome seed of the realm and her id", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  const pick = JSON.parse(p.run(`(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c); layout(key); const live = ensureLive(key); const l = live.cr.find(q => q.sp === 0 && q.ind && q.ind.hs && q.ind.hs.bed); if (l) { S.exp.pos = key; enterPatch(key); return JSON.stringify({ key, id: l.id }); } } return 'null'; })()`));
  assert.ok(pick, "a named Loika with a bed in reach of seed 7");
  p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); S.habits = {}; habRecord(S.habits, c.id, 'shake').ranges.far = 1; habRecord(S.habits, c.id, 'calm').ranges.mid = 1; })()`);
  p.run(`advance('patch')`);
  assert.equal(p.run(`S.pods.filter(q => q.how === 'own').length`), 0, "two habits known: no pod yet");
  p.run(`habRecord(S.habits, ${pick.id}, 'sleep').ranges.near = 1; advance('patch');`);
  const pods = JSON.parse(p.run(`JSON.stringify(S.pods.filter(q => q.how === 'own'))`));
  assert.equal(pods.length, 1, "all three habits known: one own pod");
  assert.equal(pods[0].own, pick.id); assert.ok(pods[0].of && pods[0].gs > 0 && pods[0].h === 0);
  assert.equal(p.run(`podTagOf(S.pods.find(q => q.how === 'own'))`), pods[0].of + "'s young");
  p.run(`advance('patch'); advance('patch');`);
  assert.equal(p.run(`S.pods.filter(q => q.how === 'own').length`), 1, "once only");
});

// The storm nerf: a Probe standing still in the open is struck at most once a pass, a strike takes one plate, and the strikes are 24+ actions apart.
// Seeds 1-8 vary the expedition number (the roll's key) on one world; the rain is forced over the Probe in spells of 20 actions with 5 quiet between,
// and each spell opens with a warned strike (passWarned set on its first action), as a real pass does.
function standStill(seed, plates, level) {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(1); TEST.calm = true; startExpedition('weather', G.spawns[0]); S.exp.n = ${seed + 1}; S.exp.storm = null; S.exp.shield = ${plates};
    stormLevel = () => ${level}; stormRain = () => S.exp.actions % 25 < 20; sheltered = () => false; inFog = () => false; depotShelter = () => false;`);
  const hits = []; let brokeAt = null;
  for (let a = 1; a <= 300 && brokeAt === null; a++) {
    const before = p.run("S.exp.shield");
    if ((a - 1) % 25 === 0) p.run("S.exp.passWarned = 1");
    p.run("advance('map')");
    const after = p.run("S.exp.shield");
    if (after !== before) hits.push({ at: a, took: before - after, pass: Math.floor((a - 1) / 25) });
    if (after <= 0) brokeAt = a;
  }
  return { hits, brokeAt };
}

test("storm nerf, seeds 1-8: standing still in the open, strikes are 24+ actions apart, one a pass at most, one plate each", () => {
  let total = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const { hits, brokeAt } = standStill(seed, 3, seed % 2 ? 2 : 3);
    total += hits.length;
    for (let i = 0; i < hits.length; i++) {
      assert.equal(hits[i].took, 1, `seed ${seed}: a strike takes one plate`);
      if (i) { assert.ok(hits[i].at - hits[i - 1].at >= 24, `seed ${seed}: strikes ${hits[i - 1].at} and ${hits[i].at} are under 24 apart`); assert.notEqual(hits[i].pass, hits[i - 1].pass, `seed ${seed}: two strikes in one pass`); }
    }
    if (brokeAt !== null) assert.ok(brokeAt >= (3 - 1) * 24, `seed ${seed}: a full Probe broke after only ${brokeAt} actions`);
  }
  assert.ok(total >= 4, `only ${total} strikes over 8 seeds: the test is not exercising the storm`);
});

test("storm nerf: a stray aimed at the Probe's cell misses after one step, and hits if it stays", () => {
  for (const seed of [1, 2, 3]) {
    const p = makePage({ gen: 7, console: "silent" });
    p.run(`newWorld(1); TEST.calm = true; startExpedition('weather', G.spawns[0]); S.exp.n = ${seed + 1}; S.exp.storm = null; S.exp.shield = 3;
      stormLevel = () => 2; stormRain = () => true; sheltered = () => false; inFog = () => false; depotShelter = () => false; rnd = () => 0; S.exp.passWarned = 1; S.exp.hitAt = -99;`);
    p.run("advance('map')");
    assert.ok(p.run("!!S.exp.stray && S.exp.stray.cell === S.exp.pos && S.exp.stray.scope === 'map'"), "the stray is aimed at the Probe's own cell");
    const there = p.run("S.exp.pos"); p.run("rnd = () => 1; S.exp.pos = S.exp.pos + (cxy(S.exp.pos).x < MW - 1 ? 1 : -1);");
    p.run("advance('map')");
    assert.equal(p.run("S.exp.shield"), 3, "the Probe stepped off: the strike missed");
    assert.ok(p.run("!!S.exp.stormCells[" + there + "]"), "it left its mark on the empty cell");
    p.run("rnd = () => 0; S.exp.passWarned = 1; S.exp.hitAt = -99; advance('map'); rnd = () => 1;");
    p.run("advance('map')");
    assert.equal(p.run("S.exp.shield"), 2, "control: standing still, the strike hits for one plate");
  }
});
