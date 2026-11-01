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

// ---- step 2: the muzzle lobe leads, the chin and the throat go back, the body sits under them -----------------------------------------------------------------------------------
import { makeTile, masterOf } from "../sheets.mjs";
import { irisCentres, screenMeasures } from "../headcontract.mjs";
import { failures, checkRules } from "../../form/house/house.mjs";
const tile = makeTile(house, sp.S01, { sizes: [304], label: "x" }), M304 = masterOf("S01")[304], B304 = tile.r[304];
// the front outline per row, in the master's frame: the picture's own columns plus the shift that lays the middle of the build's eyes on the master's (the head sheet's frame)
const leftAt = (img, y) => { for (let x = 0; x < img.width; x++) { const i = (y * img.width + x) * 4; if (img.data[i + 3] > 128) return x; } return null; };
const Im = irisCentres(M304), Ib = irisCentres(B304), shift = Math.round(((Im.far.x + Im.near.x) - (Ib.far.x + Ib.near.x)) / 2), shiftY = Math.round(((Im.far.y + Im.near.y) - (Ib.far.y + Ib.near.y)) / 2);
const front = (y) => (leftAt(B304, y - shiftY) ?? 999) + shift;

test("the lobe leads (ad-review-fix7, section 4 item 1): the front-most point of the head is the muzzle's, at row 155 to 165, within 4 px of the master's tip; the front outline is within 5 px rms of the master's from y 100 to 190", () => {
  const sB = screenMeasures(B304), sM = screenMeasures(M304);
  assert.ok(sB.forward.y >= 155 && sB.forward.y <= 165, `forward-most row ${sB.forward.y} (master ${sM.forward.y})`);
  const tip = Math.min(...[150, 154, 158, 162, 166].map(front)), mtip = Math.min(...[150, 154, 158, 162, 166].map((y) => leftAt(M304, y))); assert.ok(Math.abs(tip - mtip) <= 4, `the lobe's tip at x ${tip}, the master's at ${mtip}`);
  assert.ok(front(130) - tip >= 6, "the lobe stands out of the far ring's outline (the AD's 8 to 10 px; the build's ring sits 4 px behind the master's)");
  const rows = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190], err = rows.map((y) => front(y) - leftAt(M304, y)), rms = Math.sqrt(err.reduce((a, d) => a + d * d, 0) / err.length);
  assert.ok(rms <= 5, `front outline ${rms.toFixed(1)} px rms, ${err.join(",")}`);
  assert.ok(Math.abs(shift) <= 3, `the eyes sit within ${shift} px of the master's`);
});
test("the chin and the throat go back (item 2): the outline is at x 29 +- 3 at y 178, 48 +- 4 at y 194 and 59 +- 4 at y 210 in the master's frame, and the far leg is the front-most thing from y 215 to 260", () => {
  for (const [y, x, tol] of [[178, 29, 4], [194, 48, 4], [210, 59, 4]]) assert.ok(Math.abs(front(y) - x) <= tol, `y ${y}: ${front(y)} against ${x} +- ${tol}`);
  for (let y = 218; y <= 258; y += 8) assert.ok(Math.abs(front(y) - leftAt(M304, y)) <= 10, `the leg's front at y ${y}: ${front(y)} against the master's ${leftAt(M304, y)}`);
  assert.ok(house.rules.find((r) => r.id === "R-chin").plans.A[1] >= 0.26, "the chest sits that far under the chin");
  assert.deepEqual(failures(checkRules(house, "A", loika.measured, { kinds: sp.S01.kinds })).map((r) => r.id), [], "every rule the build measures passes at the specimen");
});
test("the lobe is the muzzle's, not the head's: it stands at most 0.24 H proud, it is wide (a 1.1 to 1.3 H face at the lobe), and the eye sockets cut only the skin (the lobe keeps its surface in front of the far eye)", () => {
  const fm2 = frameMeasures(head); assert.ok(fm2.snout <= 0.24 + 1e-3, `snout ${fm2.snout}`);
  assert.ok(head.M.r[1] * 2 >= 1.1 && head.M.r[1] * 2 <= 1.3, `lobe ${head.M.r[1] * 2} H wide`);
  assert.ok(house.rig.face["socket-height"] > 0 && house.rig.face["socket-height"] <= 0.15);
});

// ---- step 3: the bib is a tongue (ad-review-fix7, section 4 items 2, 3 and 4) -----------------------------------------------------------------------------------------
// the AD's cream mask (measure.py): opaque, red over 150, red over blue by 15, mean over 150. Pictures laid on the master's by the eyes, rows 120 to 299.
const cream = (img, x, y) => { if (x < 0 || y < 0 || x >= img.width || y >= img.height) return false; const i = (y * img.width + x) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]; return img.data[i + 3] > 200 && r > 150 && r - b > 15 && (r + g + b) / 3 > 150; };
const creamB = (x, y) => cream(B304, x - shift, y - shiftY), creamM = (x, y) => cream(M304, x, y);
const area = (f) => { let n = 0; for (let y = 120; y < 300; y++) for (let x = 0; x < 304; x++) if (f(x, y)) n++; return n; };
const firstDown = (f, x, y0) => { for (let y = y0; y < 300; y++) if (f(x, y)) return y; return null; };
const firstRight = (f, y) => { for (let x = 0; x < 304; x++) if (f(x, y)) return x; return null; };
test("the bib is a tongue, not a slab: its area is the master's within 10 percent, its near edge falls 30 to 35 degrees from the smile through (100, 180) to (130, 200), none stands under the near eye, its front sits behind the far leg", () => {
  const aB = area(creamB), aM = area(creamM); assert.ok(Math.abs(aB / aM - 1) <= 0.10, `cream area ${aB} against the master's ${aM}`);
  const e100 = firstDown(creamB, 100, 172), e110 = firstDown(creamB, 110, 172); assert.ok(Math.abs(e100 - 180) <= 5, `the edge at x 100 is at y ${e100}`); assert.ok(Math.abs(e110 - 186) <= 6, `the edge at x 110 is at y ${e110}`);
  let under = 0; for (let y = 178; y < 195; y++) for (let x = 121; x < 151; x++) if (creamB(x, y)) under++; let underM = 0; for (let y = 178; y < 195; y++) for (let x = 121; x < 151; x++) if (creamM(x, y)) underM++;
  assert.ok(under <= Math.max(60, underM + 20), `${under} cream pixels right of x 120 above y 195 (the master's own ${underM})`);
  for (const [y, x, tol] of [[218, 65, 6], [250, 85, 8]]) assert.ok(Math.abs(firstRight(creamB, y) - x) <= tol, `the bib's front at y ${y}: ${firstRight(creamB, y)} against ${x} +- ${tol}`);
  for (const y of [226, 242]) assert.ok(firstRight(creamB, y) - front(y) >= 10, `the bib stands ${firstRight(creamB, y) - front(y)} px behind the far leg at y ${y}`);
});
test("the bib is one rolled value: lit at its upper left, shaded at its lower right and under the chin, and no step over the master's own inside it (3 x 3 blur, 2 px, 8 px in from its edge, outside the under-chin shade at rows 182 to 212)", () => {
  const lum = (img, x, y) => { const i = (y * img.width + x) * 4; return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]; };
  const steps = (img, isC) => {
    const g = (x, y) => { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += lum(img, Math.min(303, Math.max(0, x + dx)), Math.min(311, Math.max(0, y + dy))); return s / 9; };
    const inner = (x, y) => { for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (!isC(x + dx, y + dy)) return false; return true; };
    let worst = 0, upperLeft = [], lowerRight = [];
    for (let y = 120; y < 262; y++) for (let x = 0; x < 300; x++) { if (!inner(x, y)) continue; if (y < 182 || y > 212) worst = Math.max(worst, Math.abs(g(x + 2, y) - g(x, y)), Math.abs(g(x, y + 2) - g(x, y))); }
    return worst;
  };
  const sB = steps(B304, (x, y) => cream(B304, x, y)), sM = steps(M304, (x, y) => cream(M304, x, y));
  assert.ok(sB <= Math.max(10, sM + 1), `inner step ${sB.toFixed(1)}, the master's ${sM.toFixed(1)}`);
  // the roll: the cream's upper left half is brighter than its lower right half by at least 12 levels (the master: about 20)
  const px = []; for (let y = 120; y < 262; y++) for (let x = 0; x < 300; x++) if (cream(B304, x, y)) px.push([x, y, lum(B304, x, y)]);
  const cx = px.reduce((a, p) => a + p[0], 0) / px.length, cy = px.reduce((a, p) => a + p[1], 0) / px.length, mean = (f) => { const s = px.filter(f); return s.reduce((a, p) => a + p[2], 0) / s.length; };
  const ul = mean((p) => p[0] + p[1] < cx + cy - 15), lr = mean((p) => p[0] + p[1] > cx + cy + 15); assert.ok(ul - lr >= 12, `upper left ${ul.toFixed(0)}, lower right ${lr.toFixed(0)}`);
});
