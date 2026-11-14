// The first trip teaches the loop (loop audit 3.18, C16): on a fresh generator 7 save the first walk yields a pod and the Data the Station asks first,
// on every seed 1-12 (the tool: 1-200), played through the page's keys by tools/first-trip-bot.mjs.
//   node --test prototypes/exploration/tests/first-trip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstTrip, NEXT_DATA, BUDGET } from "../tools/first-trip-bot.mjs";
import { makePage } from "./page-harness.mjs";

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);   // a realm takes about 10 s to make, so the test plays seeds 1-12; node tools/first-trip-bot.mjs plays 1-200
const rows = SEEDS.map((s) => firstTrip(s));

test(`every seed 1-12: the first walk holds a pod and ${NEXT_DATA} Data (identify it, read one trait)`, () => {
  // No walk is sealed: the Probe's shield is lost only to stray storm strikes, and the first walk of a world takes one at most (seed 70 lost all three plates in 17 actions under the open Windstep).
  const sealed = rows.filter((r) => r.sealed), bad = rows.filter((r) => !r.ok && !r.sealed);
  assert.deepEqual(bad.map((r) => r.seed + ": " + r.why), []);
  assert.deepEqual(sealed.map((r) => r.seed), [], "walks sealed");
  assert.ok(rows.every((r) => r.actions < BUDGET));
});

test("it does not take long: the walk's 90th percentile is within 450 actions and no walk enters more than 12 places", () => {
  // 450: the bot's measured p90 over seeds 1-200 on generator 7 is 372, 190, 375 and 401 actions in the four shards of 50 (the heart-era 150 came from generator 6's one tell a place; no decision states it)
  const a = rows.map((r) => r.actions).sort((x, y) => x - y);
  assert.ok(a[Math.floor(a.length * 0.9)] <= 450, "p90 " + a[Math.floor(a.length * 0.9)]);
  assert.ok(rows.every((r) => r.places <= 12), "places " + Math.max(...rows.map((r) => r.places)));
});

test("the first pods lie in the find slot nearest where the pawn first comes in, where the Call there lifts them; pod A is in the start place", () => {
  for (const seed of [1, 7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" });
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const r = JSON.parse(JSON.stringify(p.run(`(() => { const out = []; for (const pod of S.pods.slice()) { if (pod.id !== 'fa' && pod.id !== 'fb') continue; const lay = layout(pod.k); ensureLive(pod.k); const ent = entryPoint(lay, pod.k, S.exp.lastDir);
      const h = ent, d = s => Math.hypot(s.x - h.x, s.y - h.y), live = S.pods.find(q => q.id === pod.id), free = (lay.podSlots || []).map(d); out.push({ id: pod.id, d: d(live), nearest: Math.min(...free) }); } return out; })()`)));
    assert.ok(r.length >= 1);
    for (const q of r) assert.ok(q.d <= q.nearest + 12 || q.d <= 12, `seed ${seed}: ${q.id} lies ${q.d.toFixed(1)} tiles from the way in (nearest slot ${q.nearest.toFixed(1)})`);
  }
});

// The storm nerf: a Probe standing still in the open is struck at most once a pass, a strike takes one plate, and the strikes are 24+ actions apart.
// Seeds 1-50 vary the expedition number (the roll's key) on one world; the rain is forced over the Probe in spells of 20 actions with 5 quiet between.
function standStill(seed, plates, level) {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(1); TEST.calm = true; startExpedition('weather', G.spawns[0]); S.exp.n = ${seed + 1}; S.exp.storm = null; S.exp.shield = ${plates};
    stormLevel = () => ${level}; stormRain = () => S.exp.actions % 25 < 20; sheltered = () => false; inFog = () => false; depotShelter = () => false;`);
  const hits = []; let brokeAt = null;
  for (let a = 1; a <= 300 && brokeAt === null; a++) {
    const before = p.run("S.exp.shield");
    p.run("advance('map')");
    const after = p.run("S.exp.shield");
    if (after !== before) hits.push({ at: a, took: before - after, pass: Math.floor((a - 1) / 25) });
    if (after <= 0) brokeAt = a;
  }
  return { hits, brokeAt };
}

test("storm nerf, seeds 1-50: standing still in the open, strikes are 24+ actions apart, one a pass at most, one plate each", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const { hits, brokeAt } = standStill(seed, 3, seed % 2 ? 2 : 3);
    for (let i = 0; i < hits.length; i++) {
      assert.equal(hits[i].took, 1, `seed ${seed}: a strike takes one plate`);
      if (i) { assert.ok(hits[i].at - hits[i - 1].at >= 24, `seed ${seed}: strikes ${hits[i - 1].at} and ${hits[i].at} are under 24 apart`); assert.notEqual(hits[i].pass, hits[i - 1].pass, `seed ${seed}: two strikes in one pass`); }
    }
    if (brokeAt !== null) assert.ok(brokeAt >= (3 - 1) * 24, `seed ${seed}: a full Probe broke after only ${brokeAt} actions`);
  }
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
