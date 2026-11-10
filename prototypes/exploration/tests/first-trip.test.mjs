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

test("it does not take long: the walk's 90th percentile is within 150 actions and no walk enters more than 12 places", () => {
  const a = rows.map((r) => r.actions).sort((x, y) => x - y);
  assert.ok(a[Math.floor(a.length * 0.9)] <= 150, "p90 " + a[Math.floor(a.length * 0.9)]);
  assert.ok(rows.every((r) => r.places <= 12), "places " + Math.max(...rows.map((r) => r.places)));
});

test("the first pods lie in the find slot nearest the way in, where the Call there lifts them", () => {
  for (const seed of [1, 7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" });
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const r = JSON.parse(JSON.stringify(p.run(`(() => { const out = []; for (const pod of S.pods.slice()) { if (pod.id !== 'fa' && pod.id !== 'fb') continue; const lay = layout(pod.k); ensureLive(pod.k);
      const h = lay.spawnPt, d = s => Math.hypot(s.x - h.x, s.y - h.y), live = S.pods.find(q => q.id === pod.id), free = (lay.podSlots || []).map(d); out.push({ id: pod.id, d: d(live), nearest: Math.min(...free) }); } return out; })()`)));
    assert.ok(r.length >= 1);
    for (const q of r) assert.ok(q.d <= q.nearest + 12 || q.d <= 12, `seed ${seed}: ${q.id} lies ${q.d.toFixed(1)} tiles from the way in (nearest slot ${q.nearest.toFixed(1)})`);
  }
});
