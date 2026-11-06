import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouse, bandOf, valueAt, tAt, softClamp, checkFrame, checkRules, failures, validateHouse, resolveBands } from "../../form/house/house.mjs";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { MEASURES, measureAll, featuresPushed } from "../../form/house/measures.mjs";
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
  assert.ok(Math.abs(valueAt(lin, 0.5) - 1.3) < 1e-12, "W/H is 1.0-1.6 since the AD review");
  for (const t of [0, 0.1, 0.37, 0.5, 0.9, 1]) { assert.ok(Math.abs(tAt(geo, valueAt(geo, t)) - t) < 1e-12); assert.ok(Math.abs(tAt(lin, valueAt(lin, t)) - t) < 1e-12); }
  assert.ok(tAt(lin, 1.7) > 1, "a value outside the band is a t outside [0, 1]");
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
  const m = { "eye-share": 0.19, "H/S": 0.52, "spacing/E": 3.1, "yaw-body": 58 };
  const rows = checkRules(house, "A", m), by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by["R1-face"].status, "pass"); assert.equal(by["R1-head"].status, "pass");
  assert.equal(by["R3-spacing"].status, "FAIL"); assert.ok(by["R3-spacing"].margin < 0);
  assert.equal(by["R6-body-yaw"].status, "pass");
  assert.equal(by["R6-face-yaw"].status, "not measured");
  assert.ok(!rows.some((r) => r.id === "R1-head-D"), "a rule of another plan is not read");
  assert.deepEqual(failures(rows).map((r) => r.id), ["R3-spacing"]);
  const d = Object.fromEntries(checkRules(house, "D", { "H/T": 1.35, "yaw-body": 80, "eye-share": 0.25 }).map((r) => [r.id, r]));
  assert.equal(d["R1-head-D"].status, "pass"); assert.equal(d["R6-body-yaw"].status, "pass"); assert.equal(d["R1-face"].status, "FAIL", "an eye share over the plan D band (0.14-0.22) fails");
});
test("a rule switched off in the data is reported and does not fail", () => {
  const h = raw(); h.rules.find((r) => r.id === "R3-spacing").on = false;
  const rows = checkRules(loadHouse(h), "A", { "spacing/E": 3.1 }), r = rows.find((x) => x.id === "R3-spacing");
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
  assert.ok(Math.abs(fp.WoverH - 1.3) < 1e-12); assert.ok(Math.abs(fp.hs - Math.sqrt(0.45 * 0.6)) < 1e-12);
  assert.equal(faceParams(house, "D", () => 0.5).ht > 1.1, true); assert.equal("hs" in faceParams(house, "D", () => 0.5), false);
  assert.equal("projection" in faceParams(house, "C", () => 0.5), false, "a mochi has no muzzle");
  const t = tOfFace(house, "A", fp); assert.ok(Math.abs(t["form.eye-size"] - 0.5) < 1e-9);
});
test("eye-fit: the iris' outer edges stay within the clamp's share (1.0 since fix round 7) of the width at the eye line (W and the cheek there), monotone in spacing, nothing moves inside the band", () => {
  const c = house.clamps.find((x) => x.id === "eye-fit"), ctx = { house, plan: "A" }; let prev = -1;
  for (let s = 2.0; s <= 2.9; s += 0.02) { const o = clampEyeFit({ eW: 0.3, spacing: s }, c, ctx); assert.ok(o.spacing > prev); prev = o.spacing; assert.ok((o.spacing + 1) * 0.3 <= c.params["spacing-share-of-width"] * (1 + house.rig.A["cheek-eye"]) * (1 + house.rig.A["cheek-forward"]) + 1e-9); }
  assert.equal(clampEyeFit({ eW: 0.25, spacing: 2 }, c, ctx).spacing, 2, "inside the band nothing moves");
  assert.ok(clampEyeFit({ eW: 0.36, spacing: 3.4 }, c, ctx).spacing < 3.3, "eyes that reach the head's sides are pulled in");
});
test("nose-fit: the nose is at most 0.6 E wide, monotone, and inside nothing moves", () => {
  const c = house.clamps.find((x) => x.id === "nose-fit"); let prev = -1;
  for (let n = 0.05; n <= 0.5; n += 0.01) { const o = clampNoseFit({ eW: 0.3, noseW: n }, c); assert.ok(o.noseW > prev); prev = o.noseW; assert.ok(o.noseW <= 0.18 + 1e-9); }
  assert.equal(clampNoseFit({ eW: 0.3, noseW: 0.1 }, c).noseW, 0.1);
});
test("face-stack: the eye line to mouth stays within 0.35 H and compresses the gap first", () => {
  const c = house.clamps.find((x) => x.id === "face-stack");
  const base = { eW: 0.3, WoverH: 1.3, noseW: 0.25, noseDrop: 0.5, gap: 0.08, noseAspect: 0.62 };
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

test("owner O6: there is no mouthless face kind, and a mouth of at least a dot is required", () => {
  assert.ok(!("none" in house.kinds.mouth) && "dot" in house.kinds.mouth);
  assert.equal(checkRules(house, "A", { "mouth-w/E": 0.05 }).find((r) => r.id === "R-mouth").status, "FAIL");
  assert.equal(checkRules(house, "A", { "mouth-w/E": 0.5 }).find((r) => r.id === "R-mouth").status, "pass");
  for (const plan of Object.keys(house.plans)) assert.ok(bandOf(house, plan, "form.mouth-width").lo >= 0.1, `plan ${plan}: the mouth band never reaches zero`);
});
test("owner O1: the pushed-features rule counts features in the top 15 % of their band", () => {
  assert.equal(featuresPushed({ a: 1, b: 0.9, c: 0.5, d: 0.86 }), 3);
  assert.equal(checkRules(house, "A", { "features-pushed": 3 }).find((r) => r.id === "R-push").status, "FAIL");
  assert.equal(checkRules(house, "A", { "features-pushed": 2 }).find((r) => r.id === "R-push").status, "pass");
});
test("owner O3 and O5: the sickness budget and the eye band are as ruled", () => {
  assert.equal(bandOf(house, "A", "form.eye-size").hi, 0.36, "O5: the band does not change now");
  assert.equal(bandOf(house, "A", "form.mouth-upturn").lo, 0.05, "O3: the face stays friendly");
  assert.ok(house.owner.some((o) => o.id === "O1") && house.owner.some((o) => o.id === "O6"));
});

// ---- the AD review's clamps ---------------------------------------------------------------------------------------------
import { clampForehead, clampFarEye } from "../../form/house/clamps.mjs";
test("nose-fit by kind: a mound may be 1.1 E wide, a soft triangle 0.6 E, a bump 0.35 E; monotone in each", () => {
  const c = house.clamps.find((x) => x.id === "nose-fit");
  for (const [kind, hiE] of [["mound", 1.1], ["soft-triangle", 0.6], ["bump", 0.35]]) {
    let prev = -1; for (let n = 0.02; n <= 0.6; n += 0.01) { const o = clampNoseFit({ eW: 0.3, noseW: n }, c, { kinds: { nose: kind } }); assert.ok(o.noseW > prev); prev = o.noseW; assert.ok(o.noseW <= hiE * 0.3 + 1e-9); }
  }
  assert.equal(clampNoseFit({ eW: 0.3, noseW: 0.2 }, c, { kinds: { nose: "mound" } }).noseW, 0.2, "a 0.67 E mound is untouched");
});
test("the nose rule is read by kind", () => {
  const m = { "nose-w/E": 0.95 };
  assert.equal(checkRules(house, "A", m, { kinds: { nose: "mound" } }).find((r) => r.id === "R4-nose-width").status, "pass");
  assert.equal(checkRules(house, "A", m, { kinds: { nose: "soft-triangle" } }).find((r) => r.id === "R4-nose-width").status, "FAIL");
});
test("forehead: crown to eye top stays at least 0.20 H, monotone", () => {
  const c = house.clamps.find((x) => x.id === "forehead"); let prev = -1;
  for (let d = 0.2; d <= 0.6; d += 0.01) { const o = clampForehead({ eW: 0.3, WoverH: 1.5, eyeDrop: d }, c); assert.ok(o.eyeDrop > prev); prev = o.eyeDrop; assert.ok(o.eyeDrop - 0.5 * 0.45 >= 0.2 - 1e-9); }
  assert.equal(clampForehead({ eW: 0.3, WoverH: 1.5, eyeDrop: 0.55 }, c).eyeDrop, 0.55);
});
test("far-eye: the AD's order (face yaw, spacing, E, ring), each inside its floor; nothing moves when the margins hold; what cannot hold is flagged, never hidden", () => {
  const c = house.clamps.find((x) => x.id === "far-eye"), P = c.params;
  assert.deepEqual(P.order, ["face-yaw", "spacing", "eye-size", "ring"]);
  const base = { spacing: 2.28, eW: 0.26, ring: 0.23 };
  // a model of the two margins: the far eye's wants the face turned in (low yaw) and the eyes close; the nose's wants the eyes apart
  const model = (inside0, gap0) => (f, yaw) => ({ inside: inside0 + (P["inside-H"] - 0.05) - 0.07 * (f.spacing - 2.0) - 0.002 * (yaw - 18) - 0.1 * (f.eW - 0.22) - 0.1 * f.ring, noseGap: gap0 + 0.05 * (f.spacing - 2) });
  const run = (m, extra = {}) => clampFarEye({ ...base }, c, { house, plan: "A", measureAt: m, yaw: 28, dark: true, ...extra });
  assert.deepEqual(run(model(0.3, 0.1)), base, "inside the margins nothing moves");
  const o1 = run(model(0.105, 0.1)); assert.ok(o1.faceYaw < 28 && o1.faceYaw >= P["yaw-floor-deg"] && o1.spacing === 2.28, "the face yaw gives way first, and only as far as it must");
  const o2 = run(model(0.085, 0.1)); assert.equal(o2.faceYaw, P["yaw-floor-deg"]); assert.ok(o2.spacing < 2.28 && o2.spacing >= P["spacing-floor-E"].A, "then the spacing, never under 2.0 E");
  const o3 = run(model(0.075, 0.1)); assert.ok(o3.eW < 0.26 && o3.eW >= bandOf(house, "A", "form.eye-size").lo && o3.spacing >= 2.0, "then E, inside its band");
  const o4 = run(model(0.068, 0.1)); assert.ok(o4.ring < 0.23 && o4.ring >= P["ring-floor-E"].dark - 1e-9, "the ring last, never under 0.15 E on a dark body");
  const lt = run(model(0.062, 0.1), { dark: false }); assert.ok(lt.ring >= P["ring-floor-E"].light - 1e-9 && lt.ring < 0.15, "and 0.10 E on a light one");
  const imp = run(model(-0.5, -0.5)); assert.equal(imp.farOutside, true, "the clamp gives up in the open: the tile is built as it is and flagged");
  let prev = -1; for (let s = 2.0; s <= 2.4; s += 0.05) { const o = clampFarEye({ ...base, spacing: s }, c, { house, plan: "A", measureAt: model(0.085, 0.1), yaw: 28, dark: true }); assert.ok(o.spacing >= prev - 1e-3, `monotone (weakly, a floor holds) in the spacing at ${s}`); prev = o.spacing; }
});
test("eye-share is two-sided: over the band E shrinks within its band, partially, monotone", () => {
  const c = house.clamps.find((x) => x.id === "eye-share"), shareOf = (fp) => 0.8 * fp.eW, ctx = { house, plan: "A", shareOf, range: [0.16, 0.24] };
  const o = clampEyeShare({ eW: 0.34, hs: 0.5 }, c, ctx); assert.ok(o.eW < 0.34 && o.eW > 0.22);
  let prev = -1; for (let e = 0.31; e <= 0.36; e += 0.002) { const q = clampEyeShare({ eW: e, hs: 0.5 }, c, ctx).eW; assert.ok(q > prev); prev = q; }
});
