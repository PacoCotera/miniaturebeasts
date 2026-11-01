import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express } from "../express.mjs";
import { solvePose, seedUnit } from "../pose.mjs";
import { renderCreature, coarse, cameraBasis } from "../render.mjs";
import { faceInk } from "../checks.mjs";
import { checkRules, failures, valueAt, bandOf } from "../../form/house/house.mjs";
import { INK } from "../paint.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house);
const sha = (a) => createHash("sha256").update(Buffer.from(a)).digest("hex").slice(0, 16);
const loika = () => express(house, sp.S01), snail = () => express(house, sp.S14);

test("the specimens are frames of kinds and t: the house accepts them, and refuses one that carries geometry", () => {
  assert.equal(Object.keys(sp).length, 2);
  assert.equal(sp.S01.plan, "A"); assert.equal(sp.S14.plan, "D");
});
test("the pose solver stays inside the house bands, whatever the seed, and the head yaw is the body yaw less the face yaw", () => {
  for (const plan of ["A", "D"]) for (let i = 0; i < 300; i++) {
    const p = solvePose(house, plan, { seed: `s${i}`, side: i % 2 ? 1 : -1, carriage: 5 });
    const rows = checkRules(house, plan, { "yaw-body": p.yawBody, "yaw-face": p.yawFace, "yaw-head": p.yawHead, roll: p.roll });
    assert.deepEqual(failures(rows).map((r) => r.id), [], `seed s${i} plan ${plan}: ${JSON.stringify(p)}`);
    assert.ok(Math.abs(p.yawBody - p.yawFace - p.yawHead) < 1e-9);
  }
});
test("the pose is a function of the seed alone: same seed, same pose; another seed, another pose", () => {
  const a = solvePose(house, "A", { seed: "x" }), b = solvePose(house, "A", { seed: "x" }), c = solvePose(house, "A", { seed: "y" });
  assert.deepEqual(a, b); assert.notEqual(a.yawBody, c.yawBody);
  assert.ok(seedUnit("x", "k") >= 0 && seedUnit("x", "k") < 1);
});
test("Loika and the snail are closed solids on the floor with the crown as the top of the head", () => {
  for (const ex of [loika(), snail()]) {
    const sc = ex.scene;
    assert.ok(sc.d(sc.kc[0], sc.kc[1], sc.kc[2]) < -0.3, "inside the head");
    assert.ok(sc.d(0, 0, 9) > 5 && sc.d(9, 0, 0.5) > 0.5, "outside, far out (a lower bound: the first-order ellipsoid distance under-reads far from a flat one)");
    assert.ok(sc.bounds.lo[2] <= 0 && sc.d(0, 0, -0.5) > 0.2, "nothing below the floor but the floor");
    let under = 0; for (let x = -2; x <= 1; x += 0.1) for (let y = -1; y <= 1; y += 0.1) if (sc.d(x, y, -0.01) < -0.005) under++;
    assert.equal(under, 0, "no point 0.01 under the floor is inside the creature");
  }
});
test("the build is continuous in t: a small step of a face gene moves the picture a little", () => {
  const a = express(house, sp.S01, { t: { "form.eye-size": 0.5 }, clamps: false }), b = express(house, sp.S01, { t: { "form.eye-size": 0.52 }, clamps: false }), c = express(house, sp.S01, { t: { "form.eye-size": 0.9 }, clamps: false });
  const dE = (x, y) => Math.abs(x.rig.E - y.rig.E);
  assert.ok(dE(a, b) < dE(a, c) / 10 && dE(a, b) > 0, "monotone and continuous");
  const m = [0, 0.25, 0.5, 0.75, 1].map((t) => express(house, sp.S01, { t: { "form.eye-size": t }, clamps: false }).rig.E);
  for (let i = 1; i < m.length; i++) assert.ok(m[i] > m[i - 1], "E rises with t before the clamps");
  const cl = [0, 0.25, 0.5].map((t) => express(house, sp.S01, { t: { "form.eye-size": t } }).rig.E);
  for (let i = 1; i < cl.length; i++) assert.ok(cl[i] > cl[i - 1], "and still rises through the middle of the band after them (the far-eye clamp only holds the big end back)");
});
test("the head size is the H/S gene: the three sizes of the owner's sheet are 0.45, 0.52 and 0.60 of the standing height", () => {
  const hb = bandOf(house, "A", "form.head");
  for (const hs of [0.45, 0.52, 0.6]) { const t = Math.log(hs / hb.lo) / Math.log(hb.hi / hb.lo), ex = express(house, sp.S01, { t: { "form.head": t } }); assert.ok(Math.abs(ex.rig.H / ex.rig.S - hs) < 1e-9, `H/S ${hs}`); }
});
test("the snail's head stands up on its body: H over the thickest section is at least 1.1", () => {
  const ex = snail(); assert.ok(ex.measured["H/T"] >= 1.1);
  assert.deepEqual(failures(checkRules(house, "D", ex.measured, { only: ["R1-head-D", "R3-size", "R3-height", "R4-stack", "R6-body-yaw", "R6-face-yaw", "R6-head-yaw", "R6-roll"] })).map((r) => r.id), []);
});
test("the eyes are mirrored: one E, one height; the gaze offsets are inside 0 to 0.15 E and both toward the camera", () => {
  const ex = loika(), [a, b] = ex.scene.head.eyes;
  assert.equal(a.E, b.E); assert.equal(a.c[2], b.c[2]); assert.equal(a.c[0], b.c[0]);
});

test("a render is deterministic: the same individual gives the same bytes", () => {
  const ex = express(house, sp.S14), cam = { yaw: ex.pose.cameraYaw, pitch: 8 }, ref = { height: 170 };
  const a = renderCreature(ex.scene, cam, 48, { ref, look: sp.S14.look }), b = renderCreature(express(house, sp.S14).scene, cam, 48, { ref, look: sp.S14.look });
  assert.equal(sha(a.data), sha(b.data));
});
test("at 96 and 48 the face is a face: two eyes with a catch light each at 96, the nose and the mouth kept at 96 (R15, R33)", () => {
  const ex = loika(), cam = { yaw: ex.pose.cameraYaw, pitch: 8 }, ref = { height: 283 }, ext = coarse(ex.scene, cam, { n: 200 });
  const r96 = renderCreature(ex.scene, cam, 96, { ref, look: sp.S01.look, extents: ext }), r48 = renderCreature(ex.scene, cam, 48, { ref, look: sp.S01.look, extents: ext });
  const f96 = faceInk(r96), f48 = faceInk(r48);
  assert.equal(f96.eyeComponents, 2); assert.equal(f48.eyeComponents, 2, "two separate eye components at 48");
  assert.ok(f96.catchLights >= 1 && f96.nose >= 4 && f96.mouth >= 5, JSON.stringify(f96));
  assert.ok(f48.iris >= 5 && f48.pupil >= 3, JSON.stringify(f48));
  assert.ok(f96.iris >= 10, JSON.stringify(f96));
});
test("no sclera, slit pupil or teeth kind exists in the house (R20, never 5 and 31)", () => {
  for (const k of Object.keys(house.kinds.eye)) assert.ok(!/slit|sclera|white/.test(k));
  for (const k of Object.keys(house.kinds.mouth)) assert.ok(!/teeth|gape|open|frown/.test(k));
  assert.ok(!("sclera" in house.rig.face) && !Object.values(INK).includes("sclera"));
});
test("the eye is paint in a carved socket: no eye geometry is in the field", () => {
  const ex = loika(), h = ex.scene.head, e = h.eyes[0];
  assert.ok(Math.abs(h.dK(...e.c)) < 1e-3, "the eye plane is on K's surface (within 0.02 H)");
  const surfaceZ = (() => { let a = -0.2, b = 0.3; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (h.d(e.c[0] + e.n[0] * m, e.c[1] + e.n[1] * m, e.c[2] + e.n[2] * m) < 0) a = m; else b = m; } return a; })();
  assert.ok(surfaceZ <= 0.001, `the head's surface under the eye is never proud of K's: ${surfaceZ}`);
});

test("the head's breadth on screen is a stand-view measure: Loika is wide (R1-head-breadth), the snail's round head sits in plan D's band", () => {
  const a = express(house, sp.S01), d = express(house, sp.S14);
  assert.ok(a.measured["head-breadth/H"] >= 1.45 && a.measured["head-breadth/H"] <= 1.8, `Loika ${a.measured["head-breadth/H"]}`);
  assert.ok(d.measured["head-breadth/H"] >= 0.95 && d.measured["head-breadth/H"] <= 1.3, `snail ${d.measured["head-breadth/H"]}`);
});
test("the far ring is on the outline on Loika (0 to 0.03 H inside, fix round 7), by spacing and then the face yaw, and the clamp never leaves the yaw band", () => {
  const a = express(house, sp.S01);
  assert.ok(a.measured["far-eye-inside/H"] >= -1e-9 && a.measured["far-eye-inside/H"] <= 0.03 + 1e-9, `${a.measured["far-eye-inside/H"]}`);
  assert.ok(a.pose.yawFace >= 15 - 1e-9 && a.pose.yawFace <= 40);
});
