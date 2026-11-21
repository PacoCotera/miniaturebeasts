// light-grade.mjs mixGrade and the step grade: the JS bytes against the oracle (tools/light-mix-oracle.py), and the named lights unchanged.
//   node --test prototypes/station/tests/light-mix.test.mjs
// The fixture (fixtures/light-mix.json) is the oracle's output: python3 tools/light-mix-oracle.py steps.json, steps.json being the "args" list (step, w, gain).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mixGrade, grade, useCurve, gainOfKey, GAIN, LUT } from "../src/light-grade.mjs";
import { lightOf } from "../src/light-curve.mjs";

const C = JSON.parse(readFileSync(new URL("../../ui/specs/station/frame.json", import.meta.url), "utf8")).light.curve;
const FIX = JSON.parse(readFileSync(new URL("./fixtures/light-mix.json", import.meta.url), "utf8"));
const N = 64 * 16;
const pic = (f) => ({ w: 64, h: 16, rgba: () => { const d = new Uint8ClampedArray(N * 4); for (let i = 0; i < N; i++) { for (let c = 0; c < 3; c++) d[i * 4 + c] = f(i, c); d[i * 4 + 3] = 255; } return d; } });
const A = pic((i, c) => (i * 37 + c * 91) % 256), B = pic((i, c) => (i * 53 + c * 17 + 100) % 256);
const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return lightOf((h * 60 + m) * 60, C); };
// each step: its time, and the painting that is the second of the pair (its share is w)
const STEPS = { "05:45": { t: "05:45", second: "dawn" }, "@L50": { t: "09:50", second: "dusk" }, "@L65": { t: "10:05", second: null }, "19:30": { t: "19:30", second: "night" } };

test("mixGrade bytes match the oracle at 05:45, @L50, @L65 and 19:30", () => {
  for (const [name, { t, second }] of Object.entries(STEPS)) {
    const L = at(t), w = second ? L.mix[second] : 0, { args, hash } = { args: FIX.args.find((a) => a.step === name), hash: FIX.hash[name] };
    assert.ok(Math.abs(args.w - w) < 1e-9 && args.gain.every((g, c) => Math.abs(g - L.gain[c]) < 1e-9), `${name}: the curve gives the fixture's share and gain`);
    assert.equal(createHash("sha256").update(Buffer.from(mixGrade(A, B, args.w, args.gain).rgba())).digest("hex"), hash, name);
  }
});
test("a mix with w 0 and gain 1 is the first picture; a gain never brightens", () => {
  assert.deepEqual(Array.from(mixGrade(A, B, 0, [1, 1, 1]).rgba()), Array.from(A.rgba()));
  const d = mixGrade(A, B, 0.5, [0.8, 0.8, 0.8]).rgba(), m = mixGrade(A, B, 0.5, [1, 1, 1]).rgba(); for (let i = 0; i < m.length; i++) assert.ok(d[i] <= m[i]);
});
test("a step key grades residents by the mix of the lights' gains times the step's; named lights keep their tables", () => {
  useCurve(C);
  assert.deepEqual(gainOfKey("night"), GAIN.night); assert.ok(LUT.dusk);
  const g = gainOfKey("@L50"); assert.ok(g && g.every((x) => x <= 1 + 1e-9) && g[1] < 1);
  assert.equal(gainOfKey("@9999"), null);
  const p = pic(() => 200); assert.ok(grade(p, "@L50").rgba()[1] < 200); assert.equal(grade(p, "day"), p);
});
