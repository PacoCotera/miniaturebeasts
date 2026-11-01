// Fix round 8 (the lower face: the muzzle forward, the chin back, the bib a tongue). The art director froze the skull and the eyes at fc80e5312 (ad-review-fix7, ruling 1):
// section, width 1.44 H, depth 1.24 H, crown, rear, nape, eye spacing, pupil, lid shade. The first block pins them, to the digit, so no lower-face change can move them.
import test from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express } from "../express.mjs";
import { frameMeasures } from "../headcontract.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), head = loika.scene.head, near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not ${b}`);

test("frozen skull (fc80e5312): the bean's section numbers, the skull's width, depth and its field", () => {
  const k = house.kinds.head.bean; assert.equal(k.exponent, 2.2); assert.equal(k["rear-exponent"], 3.2); assert.equal(k["crown-set-back"], -0.05); assert.equal(k["top-taper"], 0); assert.equal(k["chin-taper"], 0.05);
  const fm = frameMeasures(head); near(fm.W, 1.44, 0.005); near(fm.depth, 1.24, 0.005); near(fm.crownShare, 0.4677, 0.001); near(fm.rearZ, -0.07, 0.005);
  assert.deepEqual(head.K, { a: 0.625, b: 0.6899000000000001, c: 0.5, n: 2.2 });
  const pins = [[[-0.6, -0.7, -0.45], 0.248261542], [[-0.6, -0.35, 0.48], 0.144362256], [[-0.6, 0.35, 0.2], 0.016119545], [[-0.3, -0.7, -0.1], 0.001195363], [[-0.3, 0, -0.45], -0.034474569], [[-0.3, 0.35, 0.48], 0.018129873], [[0, -0.7, 0.2], 0.029264614], [[0, 0, -0.1], -0.368078325], [[0, 0.7, -0.45], 0.192181348], [[0.3, -0.7, 0.48], 0.22725281], [[0.3, 0, 0.2], -0.216976569], [[0.3, 0.7, -0.1], 0.047399144], [[0.6, -0.35, -0.45], 0.208307358], [[0.6, 0, 0.48], 0.150977686], [[0.6, 0.7, 0.2], 0.229110018]];
  for (const [p, v] of pins) near(head.dK(...p), v, 2e-9);
});
test("frozen eyes (fc80e5312): size, spacing, height, pupil, ring, lid shade, the gaze and the eyes' frames on the skull", () => {
  const fp = loika.fp; near(fp.WoverH, 1.3798); near(fp.DoverH, 1.25); near(fp.eW, 0.25653887426163796, 1e-9); near(fp.spacing, 2.783); near(fp.eyeDrop, 0.5298); near(fp.pupil, 0.6); near(fp.ring, 0.23); near(fp.lid, 0);
  const want = [{ c: [0.48267937, 0.492552509, -0.0298], n: [0.802014864, 0.591324126, -0.084308577] }, { c: [0.48267937, -0.492552509, -0.0298], n: [0.802091477, -0.591444978, -0.082716994] }];
  head.eyes.forEach((e, i) => { for (let j = 0; j < 3; j++) { near(e.c[j], want[i].c[j], 2e-9); near(e.n[j], want[i].n[j], 2e-9); } near(e.E, 0.353972339, 2e-9); near(e.Riris, 0.176986169, 2e-9); near(e.Reye, 0.258399807, 2e-9); near(e.pupilR, 0.106191702, 2e-9); });
  const rf = house.rig.face; assert.deepEqual(rf["gaze-bias"], [0.04, 0.08]); near(rf["gaze-offset-max"], 0.06); near(rf["brow-shadow"], 0.24); near(rf["iris-lower-glow"], 0.55);
  assert.equal(house.clamps.find((c) => c.id === "far-eye").params["inside-H"], 0);
});
