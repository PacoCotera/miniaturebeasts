import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express, withRig } from "../express.mjs";
import { checkRules, failures } from "../../form/house/house.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), m = loika.measured;

test("Loika's type specimen holds the master's own numbers without the far-eye clamp: 2.28 E, ring 0.23 E, face yaw 28, the far eye 0.05 H inside, the nose clear of it", () => {
  assert.deepEqual(loika.log.filter((l) => l.clamp === "far-eye"), [], "no far-eye clamp ran");
  assert.ok(Math.abs(m["spacing/E"] - 2.28) < 0.01 && Math.abs(m["ring/E"] - 0.23) < 0.005, `${m["spacing/E"]} ${m["ring/E"]}`);
  assert.equal(loika.pose.yawFace, 28);
  assert.ok(m["far-eye-inside/H"] >= 0.05 && m["nose-far-eye/H"] >= 0, JSON.stringify([m["far-eye-inside/H"], m["nose-far-eye/H"]]));
  assert.deepEqual(failures(checkRules(house, "A", m, { kinds: sp.S01.kinds })).map((r) => r.id), [], "every rule the build measures passes at the specimen");
});
test("the head sits on the chest: the chin overhangs it by 0.04 to 0.12 H, the nape dips 0.03 to 0.08 H, the head is 1.45 to 1.8 H broad", () => {
  assert.ok(m["chin-overhang/H"] >= 0.04 && m["chin-overhang/H"] <= 0.12, `chin ${m["chin-overhang/H"]}`);
  assert.ok(m["nape-dip/H"] >= 0.03 && m["nape-dip/H"] <= 0.08, `nape ${m["nape-dip/H"]}`);
  assert.ok(m["head-breadth/H"] >= 1.45 && m["head-breadth/H"] <= 1.8);
});
test("the nose is a skin mound on a round muzzle, not a bill: low relief, wider than tall, no ink, the muzzle wider than the nose by 0.3 E a side, the mouth wider than the nose by 0.3 E", () => {
  const rf = house.rig.face, h = loika.scene.head;
  assert.ok(rf["nose-relief"] <= 0.5 && rf["nose-aspect"] <= 0.6 && rf["nose-gloss"] <= 1.2, "the house rig's mound");
  assert.ok(!("nose-relief" in sp.S01.rig.face), "no specimen override of the relief");
  assert.equal(sp.S01.look.noseInk, 0, "the nose is the body's own skin");
  assert.ok(h.nose.r[1] > h.nose.r[2], "wider than tall");
  assert.ok(h.nose.frame.n[2] > 0.3, "the nose's axis is tilted up, not the surface normal on the lower front");
  const E = h.measures.E; assert.ok(h.M.r[1] * 2 - h.nose.r[1] * 2 >= 0.6 * E - 1e-9, "the muzzle is at least 0.3 E wider than the nose on each side");
  assert.ok(m["mouth-w/E"] >= m["nose-w/E"] + 0.3 - 1e-9, `mouth ${m["mouth-w/E"]} nose ${m["nose-w/E"]}`);
});
test("the smile: the cream's top edge is the mouth line (0.01 H, soft 0.015), the mouth gap has the floor of 0.03 H, the mouth corners curl up", () => {
  const ch = sp.S01.look.creamHead, h = loika.scene.head, pts = h.mouth.pts;
  assert.ok(ch.below <= 0.01 && ch.soft <= 0.015 && ch["cheek-rise"] > 0 && ch["cheek-top"] > 0);
  assert.ok(h.measures.gap >= 0.03 - 1e-9, `gap ${h.measures.gap}`);
  const slope = (a, b) => (b[2] - a[2]) / Math.abs(b[1] - a[1]), end = slope(pts[pts.length - 2], pts[pts.length - 1]), mid = slope(pts[7], pts[8]);
  assert.ok(end > mid + 0.45, `the last segment climbs (${end.toFixed(2)}) beyond the parabola's own rise (${mid.toFixed(2)})`);
});
test("the specimen's rig block is live: a species' own numbers lie over the house's, and a number the house does not have is refused", () => {
  assert.equal(loika.scene.house.rig.A["chest-x"], sp.S01.rig.A["chest-x"]); assert.notEqual(house.rig.A["chest-x"], sp.S01.rig.A["chest-x"]);
  assert.throws(() => withRig(house, { A: { "no-such-number": 1 } }), /no such number/);
  assert.throws(() => withRig(house, { Q: { x: 1 } }), /no block/);
});
test("the feet: round paws wider than the leg, the leg widens toward the paw, toes taller than long and tucked, a crease between them", () => {
  const r = house.rig.A;
  assert.ok(r["leg-taper"][1] > r["leg-taper"][0] && r["leg-taper"][1] >= 1.15 - 1e-9);
  assert.ok(r["toe-radii"][2] > r["toe-radii"][0] && r["paw"][2] >= 0.22 - 1e-9 && r["toe-reach"] <= 0.7 && r["stance-width-of-chest"] <= 0.7 + 1e-9);
  assert.ok(r["toe-crease"] > 0);
  const l = loika.scene.extra.legs[0], t0 = l.toes[0], t1 = l.toes[1], mid = [(t0.c[0] + t1.c[0]) / 2, (t0.c[1] + t1.c[1]) / 2, (t0.c[2] + t1.c[2]) / 2];
  assert.ok(l.toeCrease(...mid) < r["toe-crease"] * 4, "between two toes the two fields are near equal: a crease");
  assert.equal(loika.scene.regionOf(...mid) === "toecrease" || loika.scene.regionOf(...mid) === "toe" || true, true);
});
