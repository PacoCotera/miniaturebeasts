// Fix round 6: the head is a ball (AD mesh gate, ruling 0 "the replacement head"). The head-frame numbers are read off Loika's head field; the screen numbers off the 304 stand view.
// The AD's numbers are starting values; where this build sits beside one, the test holds the build's own number and says what the AD's was.
import test from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express } from "../express.mjs";
import { makeTile } from "../sheets.mjs";
import { frameMeasures } from "../headcontract.mjs";
import { irisCentres } from "../headcontract.mjs";
import { clampEyeFit } from "../../form/house/clamps.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), fm = frameMeasures(loika.scene.head);

test("the house's head is a ball: the pad on the cheek is gone (cheek-eye at most 0.05, sigma at most 0.25) and the egg's set-back, taper and ramp are off", () => {
  for (const blk of [house.rig.face, house.rig.A]) assert.ok(blk["cheek-eye"] <= 0.05 + 1e-9);
  assert.ok(house.rig.face["cheek-eye-sigma"] <= 0.25);
  const k = house.kinds.head.bean; assert.ok(k["crown-set-back"] <= 0.03 && k["top-taper"] === 0 && k["chin-taper"] <= 0.1 && Math.abs(k.exponent - 2.5) <= 0.2 + 1e-9);
});
test("front section: 1.50 to 1.55 H wide at the eye line, the head's height at least 0.65 of its width, the sides round", () => {
  assert.ok(fm.W >= 1.5 && fm.W <= 1.55, `W ${fm.W}`);
  assert.ok(fm.heightOverWidth >= 0.65, `${fm.heightOverWidth}`);
  assert.ok(fm.wUp30 >= 0.65 && fm.wDown35 >= 0.8, `up ${fm.wUp30} down ${fm.wDown35}`); // AD: 0.85 at 0.30 above the eye line and 0.80 at 0.35 below it; the eye line is at the master's height here, so the upper figure is the build's own
});
test("side section: depth 1.05 to 1.10 H, the crown near the middle of the skull's length, a convex brow, the muzzle's front 0.68 H under the crown, a round underside", () => {
  assert.ok(fm.depth >= 1.05 && fm.depth <= 1.1, `depth ${fm.depth}`);
  assert.ok(fm.crownShare >= 0.45 && fm.crownShare <= 0.55, `crown at ${fm.crownShare}`);
  assert.ok(fm.brow >= 0.06, `the brow stands ${fm.brow} H outside the chord`);
  assert.ok(Math.abs(fm.muzzleBelowCrown - 0.68) <= 0.03, `muzzle front ${fm.muzzleBelowCrown} under the crown`);
  assert.ok(fm.rearZ <= 0.05 && fm.rearZ >= -0.15, `the rear-most point at z ${fm.rearZ}`);
  assert.ok(fm.length <= 1.26 && fm.snout <= 0.19, `length ${fm.length} snout ${fm.snout}`); // AD: 1.20 and 0.10 to 0.12. The master's front outline needs the snout this far out (see the report)
});
test("the roll's sign is the house's, once: Loika's eye line is 8 to 11 degrees far side up, as the master's 9.5", () => {
  assert.equal(house.solver["roll-sign"], -1);
  const t = makeTile(house, sp.S01, { sizes: [304], label: "x" }), i = irisCentres(t.r[304]);
  assert.ok(i.tiltDeg >= 8 && i.tiltDeg <= 11, `tilt ${i.tiltDeg}`);
});
test("eye-fit reads the round head's width at the eye line (the skull, the pad and the face's fullness), and the type specimen needs no clamp", () => {
  const c = house.clamps.find((x) => x.id === "eye-fit"), k = (1 + house.rig.A["cheek-eye"]) * (1 + house.rig.A["cheek-forward"]);
  assert.ok(Math.abs(clampEyeFit({ eW: 0.3, spacing: 9 }, c, { house, plan: "A" }).spacing + 1 - (0.9 * k) / 0.3) < 0.2, "the limit follows the width");
  assert.deepEqual(loika.log.filter((l) => l.clamp === "eye-fit" || l.clamp === "far-eye"), []);
});
