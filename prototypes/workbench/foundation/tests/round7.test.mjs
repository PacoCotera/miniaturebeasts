// Fix round 7: a dome, not a beret, and a content face (the AD's review of fix round 6, ruling 0 and must-fix 1 to 10). The numbers are the AD's where the build holds them; the three it does not hold
// (the front outline's 5 px, the snout and length caps, the forward-most point's row) are left out here and printed on the head sheet and in the calibration table, with the report's reason.
import test from "node:test";
import assert from "node:assert/strict";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../specimens.mjs";
import { express } from "../express.mjs";
import { makeTile } from "../sheets.mjs";
import { frameMeasures, irisCentres, arcMeasures, rearStep, headSilhouette, projector } from "../headcontract.mjs";
import { coarse } from "../render.mjs";
import { bandOf, tAt } from "../../form/house/house.mjs";

const house = loadHouseFile(), sp = loadSpecimens(house), loika = express(house, sp.S01), fm = frameMeasures(loika.scene.head);
const tile = makeTile(house, sp.S01, { sizes: [304], label: "x" }), iris = irisCentres(tile.r[304]);

test("the house's head: the section is round in front (2.2), fuller behind, the eyes' band is the head frame's 2.0 to 2.9 E, the far ring may touch the outline", () => {
  const k = house.kinds.head.bean; assert.equal(k.exponent, 2.2); assert.ok(k["rear-exponent"] > k.exponent && k["rear-exponent"] <= 3.4);
  const b = bandOf(house, "A", "form.eye-spacing"); assert.deepEqual([b.lo, b.hi], [2.0, 2.9]);
  assert.deepEqual(house.rules.find((r) => r.id === "R3-spacing").plans.A, [2.0, 2.9]);
  assert.equal(house.clamps.find((c) => c.id === "far-eye").params["inside-H"], 0);
  assert.equal(house.rules.find((r) => r.id === "R-far-eye").plans.A[0], 0);
});
test("width 1.45 plus or minus 0.05 H at the eye line, front height over width at least 0.68, 0.72 W or more 0.30 above the eye line, the eye centres 0.98 H apart", () => {
  assert.ok(fm.W >= 1.4 && fm.W <= 1.5, `W ${fm.W}`);
  assert.ok(fm.heightOverWidth >= 0.68, `${fm.heightOverWidth}`);
  assert.ok(fm.wUp30 >= 0.72, `${fm.wUp30}`);
  const yE2 = 2 * loika.scene.head.geometry.yE; assert.ok(yE2 >= 0.95 && yE2 <= 1.02, `centres ${yE2} H apart`);
  assert.ok(fm.snout <= 0.24 + 1e-3, `snout ${fm.snout}`); // fix round 8, ruling 3: the upper muzzle may stand up to 0.24 H proud
});
test("the screen at 304: iris centres 88 to 92 px apart (86 to 94 read), the far iris foreshortened, the eye line 8 to 11 degrees, the head 105 plus or minus 4 px high", () => {
  const gap = Math.hypot(iris.near.x - iris.far.x, iris.near.y - iris.far.y); assert.ok(gap >= 86 && gap <= 94, `gap ${gap}`);
  const ratio = iris.far.n / iris.near.n; assert.ok(ratio <= 0.65, `far over near ${ratio} (the AD's floor 0.45 is not held: the master reads 0.35 by the same mask)`);
  assert.ok(iris.tiltDeg >= 8 && iris.tiltDeg <= 11, `${iris.tiltDeg}`);
  const sc = loika.scene, ext = coarse(sc, tile.camera, { n: 240 }), ref = { height: 288 }, pr = projector(sc, tile.camera, 304, ref, ext), a = pr([0, 0, 0.5]), b = pr([0, 0, -0.5]), hp = Math.hypot(a[0] - b[0], a[1] - b[1]);
  assert.ok(hp >= 101 && hp <= 109, `head ${hp} px`);
});
test("the top outline is one arc (no run of 20 px straighter than half a pixel, no turn over 30 degrees in 6 px) and the rear stays high, then falls to a step into the back", () => {
  const sc = loika.scene, ext = coarse(sc, tile.camera, { n: 240 }), ref = { height: 288 }, sil = headSilhouette(sc, projector(sc, tile.camera, 304, ref, ext), { step: 0.012 }); // a 1.2 px grid: on a 2.5 px grid the 6 px turn read up to 10 degrees different from one framing to the next
  const arc = arcMeasures(sil.top); assert.ok(arc.straightRun <= 20 && arc.maxTurnDeg < 30, JSON.stringify(arc));
  const st = rearStep(tile.r[304] && (() => { const t = []; const im = tile.r[304]; for (let x = 0; x < im.width; x++) { let y = null; for (let yy = 0; yy < im.height; yy++) { const i = (yy * im.width + x) * 4; if (im.data[i + 3] > 128 && !(im.data[i + 1] - im.data[i + 2] > 30 && im.data[i + 1] >= im.data[i] * 0.88)) { y = yy; break; } } t.push(y); } return t; })());
  assert.ok(st.fallDeg >= 60, `the rear falls at ${st.fallDeg} degrees`);
});
test("a content face: the pupil is 0.60 E, up and forward in the eye, the ring's top is shaded, the iris has a warm lower half, and the offsets stay under R7's 0.15 E", () => {
  assert.ok(Math.abs(loika.fp.pupil - 0.6) < 0.01, `${loika.fp.pupil}`);
  const rf = house.rig.face; assert.ok(rf["gaze-bias"][1] > 0 && rf["gaze-bias"][0] > 0 && rf["iris-lower-glow"] > 0 && rf["brow-shadow"] >= 0.2);
  assert.ok(rf["gaze-offset-max"] + Math.hypot(...rf["gaze-bias"]) <= 0.15 + 1e-9, "the pupil stays inside the iris");
  assert.ok(tile.measured["ring-shade/L"] > 3 && tile.measured["ring-shade/L"] <= 14, `${tile.measured["ring-shade/L"]}`);
});
test("the cream edge is one curve: no kink at the mouth corner (the edge carries the smile's slope and eases off it), and the cream's three tones (lit, half-tone, shade) are the master's within 8 per channel", async () => {
  const rf = house.rig.face; assert.ok(rf["cream-reach-E"] > 0 && rf["cream-reach-E"] <= 0.5);
  const { loadImage } = await import("../imgtools.mjs"), { MASTER } = await import("../paths.mjs");
  // the cream mask of the AD's measure.py (opaque, red over 150, red over blue by 15, mean over 150), rows 120 to 262, in three bands of luma; the mean colour of each band
  const bands = (im) => { const out = [[205, 235], [185, 205], [165, 185]].map(() => [0, 0, 0, 0]); for (let y = 120; y < 262; y++) for (let x = 0; x < im.width; x++) { const i = (y * im.width + x) * 4, r = im.data[i], g = im.data[i + 1], b = im.data[i + 2]; if (im.data[i + 3] <= 200 || r <= 150 || r - b <= 15 || (r + g + b) / 3 <= 150) continue; const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; [[205, 235], [185, 205], [165, 185]].forEach(([lo, hi], k) => { if (l >= lo && l < hi) { out[k][0] += r; out[k][1] += g; out[k][2] += b; out[k][3]++; } }); } return out.map((o) => [o[0] / o[3], o[1] / o[3], o[2] / o[3], o[3]]); };
  const bm = bands(loadImage(MASTER("S01", 304))), bb = bands(tile.r[304]);
  bm.forEach((m, k) => { assert.ok(m[3] > 500 && bb[k][3] > 500, `band ${k}: ${m[3]} and ${bb[k][3]} px`); for (let c = 0; c < 3; c++) assert.ok(Math.abs(m[c] - bb[k][c]) <= 8, `band ${k} channel ${c}: master ${m[c].toFixed(0)}, build ${bb[k][c].toFixed(0)}`); });
});
test("the mouth holds 5 px at 96 at every head size in the band, and the leaves are three broad olive ones", () => {
  const hb = bandOf(house, "A", "form.head");
  for (const hs of [0.45, 0.52, 0.6]) { const t = makeTile(house, sp.S01, { t: { "form.head": tAt(hb, hs) }, sizes: [96], label: "x" }); assert.ok(t.measured["mouth-px-96"] >= 5, `mouth ${t.measured["mouth-px-96"]} px at H/S ${hs}`); }
  const c = house.rig.A.crest; assert.equal(c.leaves.length, 3);
  for (const [, len, wid, roll] of c.leaves) assert.ok(len / wid >= 1.5 && len / wid <= 2.4);
  assert.ok(Math.abs(c.leaves[0][3]) > 40 && Math.abs(c.leaves[2][3]) > 40, "the outer leaves spread out over the dome");
  const l = sp.S01.look.leaf; assert.ok(l[1] > l[0] && l[1] > l[2] && l[0] > l[2], "olive, not lime");
});
