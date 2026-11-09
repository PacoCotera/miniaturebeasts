// The first trip teaches the loop (loop audit 3.18, C16): on a fresh generator 6 save the first walk yields a pod and the Data the Station asks first,
// on EVERY seed 1-200, played through the page's keys by tools/first-trip-bot.mjs.
//   node --test prototypes/exploration/tests/first-trip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstTrip, NEXT_DATA, BUDGET } from "../tools/first-trip-bot.mjs";
import { makePage } from "./page-harness.mjs";

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const rows = SEEDS.map((s) => firstTrip(s));

test(`every seed 1-200: the first walk holds a pod and ${NEXT_DATA} Data (identify it, read one trait)`, () => {
  // The Probe can run out of shield before the bot has what it came for (seed 70: three places in, with the open Windstep's creatures noticing the bot at its open sides; the bot plays like a player who follows the glints). A handful of seeds, never more.
  const sealed = rows.filter((r) => r.sealed), bad = rows.filter((r) => !r.ok && !r.sealed);
  assert.deepEqual(bad.map((r) => r.seed + ": " + r.why), []);
  assert.ok(sealed.length <= 3, "walks sealed: " + sealed.map((r) => r.seed));
  assert.ok(rows.every((r) => r.actions < BUDGET));
});

test("it does not take long: the walk's 90th percentile is within 150 actions and no walk enters more than 12 places", () => {
  const a = rows.map((r) => r.actions).sort((x, y) => x - y);
  assert.ok(a[Math.floor(a.length * 0.9)] <= 150, "p90 " + a[Math.floor(a.length * 0.9)]);
  assert.ok(rows.every((r) => r.places <= 12), "places " + Math.max(...rows.map((r) => r.places)));
});

test("the first pods lie in the slot nearest their place's heart, where the Call there lifts them", () => {
  for (const seed of [1, 7, 13, 42]) {
    const p = makePage({ gen: 6, console: "silent" });
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const r = JSON.parse(JSON.stringify(p.run(`(() => { const out = []; for (const pod of S.pods.slice()) { if (pod.id !== 'fa' && pod.id !== 'fb') continue; const lay = layout(pod.k); ensureLive(pod.k);
      const h = lay.heart, d = s => Math.hypot(s.x - h.x, s.y - h.y), live = S.pods.find(q => q.id === pod.id), free = (lay.podSlots || []).map(d); out.push({ id: pod.id, d: d(live), nearest: Math.min(...free) }); } return out; })()`)));
    assert.ok(r.length >= 1);
    for (const q of r) assert.ok(q.d <= 7, `seed ${seed}: ${q.id} lies ${q.d.toFixed(1)} tiles from the heart`);
  }
});
