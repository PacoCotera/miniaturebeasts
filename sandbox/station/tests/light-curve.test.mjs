// The Vivarium's light curve (frame.json light.curve, home-props.mjs lightOf): the real clock and the 75-minute day loop.
//   node --test prototypes/station/tests/light-curve.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lightOf, restOf } from "../src/views/home-props.mjs";

const C = JSON.parse(readFileSync(new URL("../../ui/specs/station/frame.json", import.meta.url), "utf8")).light.curve;
const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return lightOf((h * 60 + m) * 60, C); };
const steps = Array.from({ length: 288 }, (_, i) => ({ min: i * 5, L: lightOf(i * 300, C) }));
const inLoop = (min) => min >= 540 && min <= 990;
const warmth = (L) => L.gain[0] - L.gain[2] + (L.mix.dusk ?? 0) * 0.2;

test("mixes sum to 1 and gains never pass 1 at all 288 steps", () => {
  for (const { min, L } of steps) {
    assert.ok(Math.abs(Object.values(L.mix).reduce((a, b) => a + b, 0) - 1) < 1e-9, `mix at ${min}`);
    for (const g of L.gain) assert.ok(g <= 1 + 1e-9 && g > 0, `gain at ${min}`);
  }
});
test("inside the loop night is 0 and dusk is at most 0.4", () => {
  for (const { min, L } of steps.filter((s) => inLoop(s.min))) { assert.equal(L.mix.night ?? 0, 0, `night at ${min}`); assert.ok((L.mix.dusk ?? 0) <= 0.4 + 1e-9, `dusk at ${min}`); }
});
test("09:00 and 16:30 are the loop's +0", () => {
  for (const t of ["09:00", "16:30"]) { const L = at(t); assert.equal(L.key, "@L00"); assert.equal(L.mood, "fresh"); assert.deepEqual(L.gain, C.gains.cool); }
});
test("10:30 and 15:30 are full sun, the day painting itself", () => { assert.equal(at("10:30").key, "day"); assert.equal(at("15:30").key, "day"); });
test("10:20 and 11:35 give the same key; every loop shares its keys", () => {
  assert.equal(at("10:20").key, at("11:35").key);
  const keys = (a, b) => steps.filter((s) => s.min >= a && s.min < b).map((s) => s.L.key);
  assert.deepEqual(keys(540, 615), keys(615, 690));
});
test("10:05 is the cloud, 10:35 full sun, 13:35 warm sun", () => {
  assert.equal(at("10:05").mood, "cloud"); assert.equal(at("10:35").mood, "full sun"); assert.equal(at("13:35").mood, "warm sun");
  at("10:05").gain.forEach((x, c) => assert.ok(Math.abs(x - C.gains.cloud[c]) < 0.02, "the cloud's gain, a step past its anchor"));
});
test("17:15 is warmer than every loop step", () => {
  const golden = warmth(at("17:15")); for (const { min, L } of steps.filter((s) => inLoop(s.min))) assert.ok(warmth(L) < golden, `loop ${min}`);
});
test("real clock keys: pure lights keep their names, the rest are @HHMM", () => {
  assert.equal(at("21:00").key, "night"); assert.equal(at("06:30").key, "dawn"); assert.equal(at("18:15").key, "dusk");
  assert.equal(at("05:45").key, "@0545"); assert.equal(at("19:30").key, "@1930"); assert.equal(at("03:00").key, "@0300");
  assert.deepEqual(at("03:00").gain, C.gains.deep); assert.equal(at("03:00").base, "night");
});
test("the Time of day options: 03:00 is deep night with everyone asleep, 10:00 is already the cloud", () => {
  const VIV = JSON.parse(readFileSync(new URL("../../ui/specs/station/vivarium.json", import.meta.url), "utf8"));
  assert.equal(at("03:00").base, "night"); assert.deepEqual(at("03:00").gain, C.gains.deep); assert.equal(at("10:00").mood, "cloud");
  const here = [{ id: "a", seed: 1, species: "S01", stage: "adult" }, { id: "b", seed: 2, species: "S02", stage: "juvenile" }, { id: "c", seed: 3, species: "S03", stage: "elder" }];
  const rest = restOf(here, 3 * 3600, VIV.rules.rest); assert.ok(Object.values(rest).every((v) => v === "asleep"), JSON.stringify(rest));
});
test("20:30-22:30 stays night, 24:00 wraps to deep", () => {
  for (const { min, L } of steps.filter((s) => s.min >= 1230 && s.min <= 1350)) assert.equal(L.key, "night", `at ${min}`);
  assert.ok(at("23:55").gain[0] < 0.8);
});
