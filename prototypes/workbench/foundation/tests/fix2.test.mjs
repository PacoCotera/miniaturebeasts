import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express, withRig } from "../express.mjs";
import { clampFaceStack, faceStack } from "../../form/house/clamps.mjs";
import { checkRules, failures } from "../../form/house/house.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), m = loika.measured;

test("Loika's type specimen holds the master's own numbers without the far-eye clamp: 2.28 E, ring 0.23 E, face yaw 28, the far eye 0.05 H inside, the nose clear of it", () => {
  assert.deepEqual(loika.log.filter((l) => l.clamp === "far-eye"), [], "no far-eye clamp ran");
  assert.ok(Math.abs(m["spacing/E"] - 2.28) < 0.01 && Math.abs(m["ring/E"] - 0.23) < 0.005, `${m["spacing/E"]} ${m["ring/E"]}`);
  assert.equal(loika.pose.yawFace, 28);
  assert.ok(m["far-eye-inside/H"] >= 0.05 && m["nose-far-eye/H"] >= 0, JSON.stringify([m["far-eye-inside/H"], m["nose-far-eye/H"]]));
  assert.deepEqual(failures(checkRules(house, "A", m, { kinds: sp.S01.kinds })).map((r) => r.id), [], "every rule the build measures passes at the specimen");
});
test("the head sits on the chest: the chin overhangs it by 0.04 to 0.12 H whatever the head's size, the outline steps down at the nape, the head is 1.45 to 1.8 H broad", () => {
  assert.ok(m["chin-overhang/H"] >= 0.04 && m["chin-overhang/H"] <= 0.12, `chin ${m["chin-overhang/H"]}`);
  assert.ok(m["nape-step/H"] >= 0.33 && m["nape-step/H"] <= 0.53, `nape ${m["nape-step/H"]}`);
  assert.ok(m["back-rise/H"] <= 0.02, `back rise ${m["back-rise/H"]}`);
  assert.ok(m["head-breadth/H"] >= 1.45 && m["head-breadth/H"] <= 1.8);
});
test("the nose is a skin mound on a round muzzle, not a bill: low relief, wider than tall, no ink, the muzzle wider than the nose by 0.3 E a side, the mouth wider than the nose by 0.3 E", () => {
  const rf = house.rig.face, h = loika.scene.head;
  assert.ok(rf["nose-relief"] <= 0.5 && rf["nose-aspect"] <= 0.6 && rf["nose-gloss"] <= 1.2, "the house rig's mound");
  assert.ok(!("nose-relief" in (sp.S01.rig.face ?? {})), "no specimen override of the relief");
  assert.equal(sp.S01.look.noseInk, 0, "the nose is the body's own skin");
  assert.ok(h.nose.r[1] > h.nose.r[2], "wider than tall");
  assert.ok(h.nose.frame.n[2] > 0.3, "the nose's axis is tilted up, not the surface normal on the lower front");
  const E = h.measures.E; assert.ok(h.M.r[1] * 2 - h.nose.r[1] * 2 >= 0.6 * E - 1e-9, "the muzzle is at least 0.3 E wider than the nose on each side");
  assert.ok(m["mouth-w/E"] >= m["nose-w/E"] + 0.3 - 1e-9, `mouth ${m["mouth-w/E"]} nose ${m["nose-w/E"]}`);
});
test("the smile: the cream's top edge is the mouth line (0.01 H, soft 0.015) and its near edge falls away from the mouth corner, the gap has the floor of 0.25 E, the mouth corners curl up", () => {
  const ch = sp.S01.look.creamHead, h = loika.scene.head, pts = h.mouth.pts;
  assert.ok(ch.below <= 0.01 && ch.soft <= 0.015 && ch.fall > 0 && !("cheek-rise" in ch), "the cheek rise is withdrawn: the edge falls, it does not climb");
  assert.ok(m["nose-mouth/E"] >= 0.25 - 1e-9, `nose to smile ${m["nose-mouth/E"]} E`);
  assert.ok(m["mouth-w/E"] >= m["nose-w/E"] + 0.3 - 1e-9, "the smile is the nose's width plus 0.3 E");
  const slope = (a, b) => (b[2] - a[2]) / Math.abs(b[1] - a[1]), end = slope(pts[pts.length - 2], pts[pts.length - 1]), mid = slope(pts[7], pts[8]);
  assert.ok(end > mid + 0.45, `the last segment climbs (${end.toFixed(2)}) beyond the parabola's own rise (${mid.toFixed(2)})`);
});
test("the specimen's rig block is live: a species' own numbers lie over the house's, and a number the house does not have is refused; Loika overrides none", () => {
  const w = withRig(house, { A: { "chin-overhang": 0.1 } });
  assert.equal(w.rig.A["chin-overhang"], 0.1); assert.notEqual(house.rig.A["chin-overhang"], 0.1);
  assert.deepEqual(sp.S01.rig, {}, "no per-specimen geometry: the body and the face are the house's");
  assert.throws(() => withRig(house, { A: { "no-such-number": 1 } }), /no such number/);
  assert.throws(() => withRig(house, { Q: { x: 1 } }), /no block/);
});
test("the feet: round paws wider than the wrist, the leg tapers toward the paw, toes taller than long and tucked, a crease between them", () => {
  const r = house.rig.A, L = r.fore;
  assert.ok(L.r[1] < L.r[0], "the leg tapers from the shoulder to the paw");
  const ratio = (r.paw[1] * 2) / (L.r[1] * 2); assert.ok(ratio >= 1.25 && ratio <= 1.7, `the paw is 1.25 to 1.7 x the wrist: ${ratio}`);
  const tr = r["toe-radii"]; assert.ok(Math.abs(tr[2] - tr[1]) / tr[1] <= 0.25 && tr[1] <= 0.6 * 0.062 + 0.006 && r["paw"][2] >= 0.08 && r["toe-reach"] <= 0.65, "fix round 4, must-fix 5: toes about as wide as tall and about 0.6 of fix 3's size, tucked under the dome's front curve (about 0.6)");
  assert.ok(r["toe-crease"] > 0);
  const l = loika.scene.extra.legs[0], t0 = l.toes[0], t1 = l.toes[1], mid = [(t0.c[0] + t1.c[0]) / 2, (t0.c[1] + t1.c[1]) / 2, (t0.c[2] + t1.c[2]) / 2];
  assert.ok(l.toeCrease(...mid) < r["toe-crease"] * loika.scene.S * 4, "between two toes the two fields are near equal: a crease");
});
test("the body is the same under every head size (every length is a fraction of the stature), and the back falls from the nape: the stand-view profile is in R-back's bands", () => {
  const a = express(house, sp.S01, { t: { "form.head": 0.0 } }), b = express(house, sp.S01, { t: { "form.head": 1.0 } });
  const ca = a.scene.extra.chest, cb = b.scene.extra.chest;
  for (let i = 1; i < 3; i++) assert.ok(Math.abs(ca.r[i] / a.scene.S - cb.r[i] / b.scene.S) < 1e-9, "the chest is the same fraction of the stature");
  for (const ex of [a, b, loika]) { const rows = checkRules(house, "A", ex.measured, { only: ["R-back-85", "R-back-95", "R-back-70", "R-nape", "R5-back"] }); assert.deepEqual(failures(rows).map((x) => `${x.id} ${x.value}`), []); }
});
test("the nose and the smile: a gap of at least 0.25 E under a mound nose is held by the face-stack clamp, nose drop second", () => {
  const c = house.clamps.find((x) => x.id === "face-stack"), base = { eW: 0.3, WoverH: 1.2, noseW: 0.25, noseDrop: 0.7, gap: 0.2, noseAspect: 0.45 };
  const o = clampFaceStack(base, c, { kinds: { nose: "mound" } }), E = 0.3 * 1.2;
  assert.ok(o.gap >= 0.25 * E - 1e-9, `the gap keeps its floor: ${o.gap / E} E`);
  assert.ok(o.noseDrop < base.noseDrop, "the nose drop gives way next");
  assert.ok(faceStack(o) <= 0.35 + 1e-9 || o.gap <= 0.25 * E + 0.003);
  const free = clampFaceStack(base, c, { kinds: { nose: "bump" } }); assert.ok(free.gap < o.gap, "a kind without a floor gives the gap away first");
});
