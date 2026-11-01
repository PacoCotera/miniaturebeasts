import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouse, bandOf, valueAt, tAt, softClamp, checkFrame, checkRules, failures, validateHouse, resolveBands } from "../../form/house/house.mjs";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { MEASURES, measureAll } from "../../form/house/measures.mjs";
import { applyClamps, clampEyeFit, clampFaceStack, clampCarriageLid, clampEyeShare, clampNoseFit, faceParams, tOfFace, faceStack } from "../../form/house/clamps.mjs";
import { readFileSync } from "node:fs";

const house = loadHouseFile();
const raw = () => JSON.parse(readFileSync(new URL("../../form/house/house-1.json", import.meta.url), "utf8"));

test("the house file loads, every rule names a measure of the registry", () => {
  assert.deepEqual(validateHouse(house, { measures: MEASURES }), []);
  assert.equal(house.id, "house-1");
});
test("a plan that extends another takes its bands, an override replaces one, null removes the gene", () => {
  assert.equal(bandOf(house, "A", "form.head").hi, 0.6);
  assert.equal(bandOf(house, "B", "form.head").hi, 0.5);
  assert.equal(bandOf(house, "B", "form.eye-size").lo, 0.22);
  assert.equal(bandOf(house, "C", "form.head"), null);
  assert.equal(bandOf(house, "D", "form.leg-length"), null);
  assert.ok(bandOf(house, "D", "form.antenna"));
  assert.throws(() => bandOf(house, "A", "form.antenna"), /unknown gene/);
  assert.throws(() => bandOf(house, "Z", "form.head"), /unknown plan/);
});
test("a band that extends in a loop is refused", () => {
  assert.throws(() => resolveBands({ bands: { A: { extends: "B" }, B: { extends: "A" } } }), /loop/);
});
test("t maps onto a band: the ends are the band's ends, geometric bands go by ratio, linear by difference", () => {
  const geo = bandOf(house, "A", "form.head"), lin = bandOf(house, "A", "form.head-width");
  assert.equal(valueAt(geo, 0), 0.45); assert.ok(Math.abs(valueAt(geo, 1) - 0.6) < 1e-12);
  assert.ok(Math.abs(valueAt(geo, 0.5) - Math.sqrt(0.45 * 0.6)) < 1e-12);
  assert.ok(Math.abs(valueAt(lin, 0.5) - 1.2) < 1e-12);
  for (const t of [0, 0.1, 0.37, 0.5, 0.9, 1]) { assert.ok(Math.abs(tAt(geo, valueAt(geo, t)) - t) < 1e-12); assert.ok(Math.abs(tAt(lin, valueAt(lin, t)) - t) < 1e-12); }
  assert.ok(tAt(lin, 1.5) > 1, "a value outside the band is a t outside [0, 1]");
});
test("equal steps of t are equal steps of size on a geometric band", () => {
  const b = bandOf(house, "A", "form.eye-size"), v = [0, 0.25, 0.5, 0.75, 1].map((t) => valueAt(b, t));
  for (let i = 2; i < v.length; i++) assert.ok(Math.abs(v[i] / v[i - 1] - v[i - 1] / v[i - 2]) < 1e-9);
});

test("the soft clamp is the identity inside, strictly monotone, continuous in value and slope, and stays under the limit", () => {
  const lo = 1, hi = 2, w = 0.3;
  assert.equal(softClamp(1.5, lo, hi, w), 1.5);
  let prev = -Infinity;
  for (let x = 0; x <= 4; x += 0.01) { const y = softClamp(x, lo, hi, w); assert.ok(y > prev, `monotone at ${x}`); prev = y; assert.ok(y < hi + 1e-12 || x <= hi, "never above hi once past it"); assert.ok(x > hi - w || x < lo + w || y === x); }
  assert.ok(softClamp(5, lo, hi, w) < hi && softClamp(5, lo, hi, w) > hi - 1e-3);
  assert.ok(softClamp(-0.5, lo, hi, w) > lo && softClamp(-0.5, lo, hi, w) < lo + 1e-3);
  const j = hi - w, e = 1e-7;
  assert.ok(Math.abs(softClamp(j + e, lo, hi, w) - softClamp(j - e, lo, hi, w) - 2 * e) < 1e-9, "slope 1 at the joint");
  assert.equal(softClamp(5, null, null, w), 5);
});

test("a frame holds kinds and sub-bands of t, and nothing else", () => {
  const ok = { id: "x", species: "S01", plan: "A", kinds: { head: "soft-block", eye: "round" }, t: { "form.eye-size": 0.8, "form.head": 0.5 }, pool: { "form.eye-size": [0.55, 1] } };
  assert.deepEqual(checkFrame(ok, house), []);
  assert.match(checkFrame({ ...ok, knots: [[0, 1, 2]] }, house).join(), /knots/, "geometry is refused by the schema");
  assert.match(checkFrame({ ...ok, t: { "form.eye-size": 1.2 } }, house).join(), /not a t/);
  assert.match(checkFrame({ ...ok, t: { "form.eye-size": 0.4 }, pool: { "form.eye-size": [0.55, 1] } }, house).join(), /outside its pool/);
  assert.match(checkFrame({ ...ok, pool: { "form.eye-size": [0.9, 0.2] } }, house).join(), /sub-band/);
  assert.match(checkFrame({ ...ok, plan: "D", t: { "form.leg-length": 0.5 } }, house).join(), /does not exist in plan D/);
  assert.match(checkFrame({ ...ok, t: { "form.nonsense": 0.5 } }, house).join(), /unknown/);
  assert.match(checkFrame({ ...ok, kinds: { head: "cube" } }, house).join(), /not in the house/);
});
test("a band edit that strands a frame is reported, never silently repaired", () => {
  const h = raw(); h.bands.A["form.head"].hi = 0.52;
  const h2 = loadHouse(h);
  assert.equal(bandOf(h2, "A", "form.head").hi, 0.52, "the band moved with data only");
  // a pool is a t sub-band so it stays inside [0, 1]: what moves is the value it means. Narrowing a band to nothing is refused.
  h.bands.A["form.head"].hi = 0.4; assert.throws(() => loadHouse(h), /not under hi/);
});

test("the rule checks read the band of the plan, report the margin, and never pass a quantity that was not measured", () => {
  const m = { "eye-share": 0.19, "H/S": 0.52, "spacing/E": 2.3, "yaw-body": 58 };
  const rows = checkRules(house, "A", m), by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by["R1-face"].status, "pass"); assert.equal(by["R1-head"].status, "pass");
  assert.equal(by["R3-spacing"].status, "FAIL"); assert.ok(by["R3-spacing"].margin < 0);
  assert.equal(by["R6-body-yaw"].status, "pass");
  assert.equal(by["R6-face-yaw"].status, "not measured");
  assert.ok(!rows.some((r) => r.id === "R1-head-D"), "a rule of another plan is not read");
  assert.deepEqual(failures(rows).map((r) => r.id), ["R3-spacing"]);
  const d = Object.fromEntries(checkRules(house, "D", { "H/T": 1.35, "yaw-body": 80, "eye-share": 0.17 }).map((r) => [r.id, r]));
  assert.equal(d["R1-head-D"].status, "pass"); assert.equal(d["R6-body-yaw"].status, "pass"); assert.equal(d["R1-face"].status, "FAIL", "the snail's measured eye share is over the plan's first band");
});
test("a rule switched off in the data is reported and does not fail", () => {
  const h = raw(); h.rules.find((r) => r.id === "R3-spacing").on = false;
  const rows = checkRules(loadHouse(h), "A", { "spacing/E": 2.3 }), r = rows.find((x) => x.id === "R3-spacing");
  assert.equal(r.status, "off (would fail)"); assert.deepEqual(failures(rows), []);
});
test("a plan gets its own band for a rule by data only", () => {
  const h = raw(); h.rules.find((r) => r.id === "R1-face").plans.A = [0.12, 0.3];
  assert.equal(checkRules(loadHouse(h), "A", { "eye-share": 0.13 }).find((x) => x.id === "R1-face").status, "pass");
  assert.equal(checkRules(house, "A", { "eye-share": 0.13 }).find((x) => x.id === "R1-face").status, "FAIL");
});

// ---- the clamps -----------------------------------------------------------------------------------------------------
const fpOf = (t = 0.5, over = {}) => faceParams(house, "A", (g) => over[g] ?? t);
test("the face parameters of a plan come from t through the bands", () => {
  const fp = fpOf(0.5);
  assert.ok(Math.abs(fp.WoverH - 1.2) < 1e-12); assert.ok(Math.abs(fp.hs - Math.sqrt(0.45 * 0.6)) < 1e-12);
  assert.equal(faceParams(house, "D", () => 0.5).ht > 1.1, true); assert.equal("hs" in faceParams(house, "D", () => 0.5), false);
  assert.equal("projection" in faceParams(house, "C", () => 0.5), false, "a mochi has no muzzle");
  const t = tOfFace(house, "A", fp); assert.ok(Math.abs(t["form.eye-size"] - 0.5) < 1e-9);
});
test("eye-fit: spacing x E stays within 0.9 W, monotone in spacing", () => {
  const c = house.clamps.find((x) => x.id === "eye-fit"); let prev = -1;
  for (let s = 1.5; s <= 2.2; s += 0.02) { const o = clampEyeFit({ eW: 0.5, spacing: s }, c); assert.ok(o.spacing > prev); prev = o.spacing; assert.ok(o.spacing * 0.5 <= 0.9 + 1e-9); }
  assert.equal(clampEyeFit({ eW: 0.3, spacing: 2 }, c).spacing, 2, "inside the band nothing moves");
});
test("nose-fit: the nose is at most 0.6 E wide, monotone, and inside nothing moves", () => {
  const c = house.clamps.find((x) => x.id === "nose-fit"); let prev = -1;
  for (let n = 0.05; n <= 0.5; n += 0.01) { const o = clampNoseFit({ eW: 0.3, noseW: n }, c); assert.ok(o.noseW > prev); prev = o.noseW; assert.ok(o.noseW <= 0.18 + 1e-9); }
  assert.equal(clampNoseFit({ eW: 0.3, noseW: 0.1 }, c).noseW, 0.1);
});
test("face-stack: the eye line to mouth stays within 0.35 H and compresses the gap first", () => {
  const c = house.clamps.find((x) => x.id === "face-stack");
  const base = { eW: 0.3, WoverH: 1.3, noseW: 0.25, noseDrop: 0.5, gap: 0.08 };
  const out = clampFaceStack({ ...base, gap: 0.2 }, c);
  assert.ok(faceStack(out) <= 0.35 + 1e-9); assert.ok(out.gap < 0.2); assert.equal(out.noseDrop, 0.5, "the gap gives way first");
  let prev = -1; for (let g = 0; g <= 0.4; g += 0.01) { const o = clampFaceStack({ ...base, gap: g }, c); assert.ok(o.gap >= prev - 1e-12); prev = o.gap; assert.ok(faceStack(o) <= 0.35 + 1e-9); }
  assert.deepEqual(clampFaceStack({ ...base, gap: 0.01 }, c), { ...base, gap: 0.01 });
});
test("carriage-lid: a heavy lid raises the floor of carriage, continuously, never a hard stop", () => {
  const c = house.clamps.find((x) => x.id === "carriage-lid");
  assert.equal(clampCarriageLid({ lid: 0.2, carriage: 0 }, c).carriage, 0, "at the band's top nothing moves");
  const heavy = clampCarriageLid({ lid: 0.35, carriage: 0 }, c).carriage; assert.ok(heavy >= 5 && heavy < 5.2);
  let prev = -1, prevMid = -1;
  for (let x = 0; x <= 15; x += 0.25) { const o = clampCarriageLid({ lid: 0.3, carriage: x }, c).carriage; assert.ok(o > prev); prev = o; assert.ok(o >= 5); }
  for (let l = 0.2; l <= 0.4; l += 0.01) { const o = clampCarriageLid({ lid: l, carriage: 1 }, c).carriage; assert.ok(o >= prevMid - 1e-9); prevMid = o; }
});
test("eye-share: E grows first, then the head, partially so two genomes never collapse", () => {
  const c = house.clamps.find((x) => x.id === "eye-share");
  const shareOf = (fp) => 0.55 * fp.eW * (0.6 + 0.4 * (fp.hs / 0.5)); // a synthetic share, rising in both
  const ctx = { house, plan: "A", shareOf, range: [0.16, 0.24] };
  const big = { eW: 0.30, hs: 0.5 }; assert.equal(clampEyeShare(big, c, ctx), big, "a face over its floor is not touched");
  const small = clampEyeShare({ eW: 0.27, hs: 0.5 }, c, ctx); assert.ok(small.eW > 0.27 && small.hs === 0.5, "E first, the head untouched while E has room");
  const tiny = clampEyeShare({ eW: 0.22, hs: 0.45 }, c, { ...ctx, range: [0.2, 0.24] }); assert.ok(tiny.eW > 0.22 && tiny.eW <= 0.36 && tiny.hs > 0.45, "E to its band's top, then the head");
  let prev = -1; for (let e = 0.22; e <= 0.36; e += 0.002) { const o = clampEyeShare({ eW: e, hs: 0.45 }, c, ctx).eW; assert.ok(o > prev, `E stays ordered at ${e}`); prev = o; }
  let prevH = -1; for (let e = 0.22; e <= 0.3; e += 0.002) { const o = clampEyeShare({ eW: e, hs: 0.45 }, c, ctx); assert.ok(o.hs >= prevH - 1e-12 || e > 0.22, "the head's growth falls as E rises"); }
});
test("applyClamps runs in the house's order, skips a clamp switched off, and logs what moved", () => {
  const fp = { ...fpOf(0.5), noseW: 0.3, gap: 0.08, lid: 0.3, carriage: 0 };
  const a = applyClamps(house, "A", fp);
  assert.ok(a.log.some((l) => l.clamp === "nose-fit")); assert.ok(a.log.some((l) => l.clamp === "carriage-lid"));
  assert.ok(a.log.map((l) => l.clamp).indexOf("nose-fit") < a.log.map((l) => l.clamp).indexOf("carriage-lid"));
  const h = raw(); h.clamps.find((x) => x.id === "nose-fit").on = false; const b = applyClamps(loadHouse(h), "A", fp);
  assert.ok(!b.log.some((l) => l.clamp === "nose-fit")); assert.equal(b.fp.noseW, 0.3, "off in the data: not applied");
});

test("the measure registry gives undefined for what the rig lacks", () => {
  assert.equal(MEASURES["H/S"]({ H: 1 }), undefined);
  const m = measureAll({ S: 2, H: 1, W: 1.3, E: 0.4, eyeDrop: 0.5, spacing: 2, noseW: 0.2, noseDrop: 0.1 });
  assert.equal(m["H/S"], 0.5); assert.ok(Math.abs(m["E/Wf"] - 0.4 / 1.3) < 1e-12); assert.ok(Math.abs(m["forehead/H"] - 0.3) < 1e-12); assert.equal(m["nose-w/E"], 0.5);
  assert.ok(!("eye-share" in m));
});
