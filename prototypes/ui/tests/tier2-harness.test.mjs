import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { decodePNG } from "../png.mjs";
import { legCompression, buildField, checkField, encodeField, decodeField, encodeMask, headMaskFrom, rha, rasterPolygon, bellyColumns, sha256, chunk, fieldDomain, figureBbox, bboxMapping } from "../tools/warp-field.mjs";
import { warp, blank, png, runAll, newColours, silhouette, outlineIrregular, changedOutside, rowsBand, breathSegments, bakeStep, aboveBellyBand, silhouetteRegions, newRegions, outlineBoxes, prepareKey, flat } from "../tools/tier2-test.mjs";

// A synthetic 104x112 body of flat colours (never an asset): a body, a back on top of it, a head on its right, two legs ending on the feet row 99; the shadow rows are 96..111.
const A = [200, 120, 60, 255], B = [150, 90, 40, 255], C = [240, 220, 160, 255], D = [90, 60, 30, 255];
function fixture() {
  const img = blank(104, 112), rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) img.data.set(c, (y * 104 + x) * 4); };
  rect(24, 44, 79, 75, A); rect(34, 38, 69, 43, B); rect(28, 76, 33, 99, C); rect(70, 76, 75, 99, C); rect(80, 38, 99, 61, D);
  return img;
}
const tmp = mkdtempSync(path.join(tmpdir(), "tier2-"));
const standFile = path.join(tmp, "stand.png"), lmFile = path.join(tmp, "lm.json"), standBytes = png(fixture());
writeFileSync(standFile, standBytes);
// the shape of the animator's landmarks file, with synthetic values
const landmarks = {
  species: "FX", stage: "juvenile", blend: "topline", rules: { bellyFixed: { value: true } }, ends: { down: { value: -0.55 }, up: { value: 0.55 } },
  pictures: { "stand-104x112": {
    fieldZeroRows: [96, 111], fixed: { "foot-a": [30, 99], "foot-b": [72, 99], "tail-root": [24, 46] },
    moving: { withers: { pos: [42, 38], down: [0, 1], up: [0, -1] }, "mid-back": { pos: [52, 38], down: [0, 2], up: [0, -2] }, croup: { pos: [62, 38], down: [0, 1], up: [0, -1] } },
    headMaskPolygon: [[80, 38], [100, 38], [100, 62], [80, 62]], bellyLine: [[20, 76], [100, 76]] } },
  breathPair: { holdsMs: { b0: 880, b1: 240, b2: 800, b1back: 480 }, offsetMs: 1040 },
  pairs: [{ id: "FX-stand-b1", a: standFile, b: { bake: "b1" }, sha256: [sha256(standBytes), null] }],
};
writeFileSync(lmFile, JSON.stringify(landmarks));
const set = { name: "fixture", stand: standFile, landmarks: lmFile };

test("the same inputs give the same bytes twice, and the harness's own two runs agree (M1)", () => {
  const a = buildField(landmarks, "down", 104, 112), b = buildField(landmarks, "down", 104, 112);
  assert.deepEqual(encodeField(a), encodeField(b));
  const r = runAll([set]), r2 = runAll([set]);
  for (const [k, v] of r.files) if (k !== "measures.csv") assert.ok(v.equals(r2.files.get(k)), k);   // the CSV carries a clock reading (M7)
  assert.equal(r.rows.find((x) => x.measure === "M1").result, "pass");
  assert.ok(r.files.has("contact-sheet.png") && r.files.has("measures.csv"));
  for (const pair of ["down-middle", "middle-up", "down-up"]) {
    const apng = r.files.get(`fixture/vivarium-pair-104x112-${pair}.apng`); assert.ok(apng.includes(Buffer.from("acTL")), pair);
    assert.equal(decodePNG(apng).width, 2 * 104 + 3 * 16);
  }
  assert.ok(r.files.get("fixture/mibi-juvenile-FX-stand-map-head-104x112.png"), "the head mask is written as a picture");
  assert.match(r.rows.find((x) => x.measure === "run").item, /status/); assert.equal(r.rows.find((x) => x.measure === "run").result, "no verdict", "the input prep is provisional until the art director confirms it");
});
test("the warp moves existing pixels only (M2) and draws the head unwarped over the body", () => {
  const img = fixture(), f = buildField(landmarks, "up", 104, 112), stats = { clampMisses: 0 }, out = warp(img, [{ field: f, t: 1 }], { headMask: f.headMask, stats });
  assert.equal(newColours(img, out), 0); assert.equal(stats.clampMisses, 0);
  assert.notDeepEqual([...out.data], [...img.data], "the field moved something");
  for (let i = 0; i < 104 * 112; i++) if (f.headMask[i]) assert.deepEqual([...out.data.slice(i * 4, i * 4 + 4)], [...img.data.slice(i * 4, i * 4 + 4)], "the head is untouched");
  assert.equal(newColours(img, warp(img, [{ field: f, t: 0.5 }], { headMask: f.headMask })), 0);
  assert.deepEqual([...warp(img, [{ field: f, t: 0 }], { headMask: f.headMask }).data], [...img.data], "t = 0 is the identity");
  const topline = (im) => { for (let y = 0; y < 112; y++) if (im.data[(y * 104 + 52) * 4 + 3]) return y; };
  assert.ok(topline(out) < topline(img), "up lifts the back");
  assert.ok(topline(warp(img, [{ field: buildField(landmarks, "down", 104, 112), t: 1 }], { headMask: f.headMask })) > topline(img), "down drops it");
  // a sample that lands inside the head takes the column's first body pixel below it, never a head pixel
  const body = warp(img, [{ field: { w: 104, h: 112, dx: new Int8Array(104 * 112).fill(-3), dy: new Int8Array(104 * 112) }, t: 1 }], { headMask: f.headMask, drawHead: false });
  assert.deepEqual([...body.data.slice((50 * 104 + 79) * 4, (50 * 104 + 79) * 4 + 4)], [0, 0, 0, 0], "x 79 samples x 82 (head): the column's first non-head pixel below is transparent, never a head pixel");
});
test("the field is 0 on the feet and shadow rows, whole px, fitted at the destination, legs follow their root", () => {
  for (const end of ["down", "up"]) {
    const f = buildField(landmarks, end, 104, 112);
    for (let y = 96; y < 112; y++) for (let x = 0; x < 104; x++) assert.equal(f.dx[y * 104 + x] | f.dy[y * 104 + x], 0, `(${x}, ${y})`);
    assert.ok(f.maxD <= 4 && f.maxD > 0 && f.maxStretch <= 0.25 && f.maxShear <= 0.5);
    assert.ok(f.dx instanceof Int8Array);
    assert.deepEqual([...decodeField(encodeField(f)).dy], [...f.dy]);
    for (let y = 77; y < 96; y++) assert.equal(f.dy[y * 104 + 30], f.dy[76 * 104 + 30], "below the belly line a column takes the line's displacement");
  }
  const f = buildField(landmarks, "down", 104, 112);
  assert.equal(f.dy[(38 + 2) * 104 + 52], 2, "the mid-back landmark lands on p + d with value d");
  const map = encodeField(f); assert.equal(map[25], 2, "colour type 2, RGB without alpha"); assert.ok(!map.includes("gAMA") && !map.includes("sRGB"));
});
test("a field outside the bounds is refused, with a message; so are colour chunks and a wrong hash", () => {
  const empty = () => ({ w: 104, h: 112, size: "104x112", dx: new Int8Array(104 * 112), dy: new Int8Array(104 * 112), zeroRows: [[96, 111]] });
  const big = empty(); big.dy[50 * 104 + 50] = 5;
  assert.throws(() => checkField(big), /over the 4 px bound at 104x112/);
  const stretch = empty(); for (let y = 20; y < 40; y++) for (let x = 0; x < 104; x++) stretch.dy[y * 104 + x] = y > 29 ? 2 : 0;
  assert.throws(() => checkField(stretch), /stretch 0\.500 px\/px is over 0\.25 at 104x112, window \(\d+, \d+\)-\(\d+, \d+\)/);
  const shear = empty(); for (let y = 20; y < 40; y++) for (let x = 0; x < 104; x++) shear.dx[y * 104 + x] = y > 29 ? 3 : 0;
  assert.throws(() => checkField(shear), /shear 0\.750 px\/px is over 0\.5/);
  const shearOk = empty(); for (let y = 20; y < 40; y++) for (let x = 0; x < 104; x++) shearOk.dx[y * 104 + x] = y > 29 ? 2 : 0; assert.ok(checkField(shearOk), "a shear of 0.5 is allowed");
  const onFeet = empty(); onFeet.dy[100 * 104 + 3] = 1; assert.throws(() => checkField(onFeet), /not 0 on the feet\/shadow row 100/);
  assert.throws(() => buildField(landmarks, "down", 104, 112, { overrides: { amplitude: 10 } }), /field refused/);
  assert.throws(() => buildField({ pictures: {} }, "down", 100, 100), /no displacement bound/);
  const map = encodeField(empty()), withGamma = Buffer.concat([map.subarray(0, 33), chunk("gAMA", Buffer.alloc(4)), map.subarray(33)]);
  assert.throws(() => decodeField(withGamma), /colour chunk\(s\) gAMA/);
  assert.throws(() => runAll([{ ...set, landmarks: (() => { const o = path.join(tmp, "bad.json"), j = structuredClone(landmarks); j.pairs[0].sha256[0] = "00"; writeFileSync(o, JSON.stringify(j)); return o; })() }]), /the run stops/);
});
test("the head is a mask picture rasterised by the even-odd rule at pixel centres; the belly line rounds half away from zero", () => {
  const m = rasterPolygon([[1, 1], [4, 1], [4, 4], [1, 4]], 6, 6); assert.equal(m.reduce((a, v) => a + v, 0), 9); assert.equal(m[1 * 6 + 1], 1); assert.equal(m[4 * 6 + 4], 0);
  const back = headMaskFrom(encodeMask(m, 6, 6)); assert.deepEqual([...back.mask], [...m]);
  assert.equal(rha(2.5), 3); assert.equal(rha(-2.5), -3); assert.equal(rha(0.4), 0);
  assert.deepEqual([...bellyColumns([[2, 10], [6, 12]], 9)], [10, 10, 10, 11, 11, 12, 12, 12, 12]);   // x 3 -> 10.5 -> 11, x 5 -> 11.5 -> 12, flat beyond the ends
});
test("M3 and M4 compute on a known shape", () => {
  const sq = blank(12, 12), put = (im, x, y) => im.data.set([9, 9, 9, 255], (y * im.w + x) * 4);
  for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) put(sq, x, y);
  assert.deepEqual(silhouette(sq), { components: 1, holes: 0, orphans: 0 });
  assert.deepEqual(outlineIrregular(sq), { outline: 16, irregular: 0 }, "a clean square has no stair or spur");
  put(sq, 8, 2);                                                  // an orphan, a second component
  assert.deepEqual(silhouette(sq), { components: 2, holes: 0, orphans: 1 });
  const ring = blank(12, 12); for (let y = 2; y < 9; y++) for (let x = 2; x < 9; x++) if (x === 2 || y === 2 || x === 8 || y === 8) put(ring, x, y);
  assert.deepEqual(silhouette(ring), { components: 1, holes: 1, orphans: 0 });
  const spur = blank(12, 12); for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) put(spur, x, y); put(spur, 4, 1);
  assert.ok(outlineIrregular(spur).irregular > 0, "a one-pixel spur is irregular");
});
test("M8: the changed pixels outside the moving band do not grow under a torso-locked field", () => {
  const a = fixture(), b = fixture(); for (let y = 58; y <= 62; y++) for (let x = 40; x < 60; x++) b.data.set(C, (y * 104 + x) * 4);
  const band = rowsBand(104, 112, [54, 66]), plain = changedOutside(a, b, band); assert.equal(plain, 0);
  for (const end of ["down", "up"]) {
    const f = buildField(landmarks, end, 104, 112), L = [{ field: f, t: 1 }], w = changedOutside(warp(a, L, { headMask: f.headMask }), warp(b, L, { headMask: f.headMask }), band);
    assert.ok(w <= plain, `${end}: ${w} > ${plain}`);
  }
  const r = runAll([set]), m8 = r.rows.filter((x) => x.measure === "M8" && /changed outside/.test(x.item));
  assert.equal(m8.length, 4, "stand-b1 and stand-b2, down and up"); assert.ok(m8.every((x) => x.result === "pass"));
  const yb = new Int32Array(104).fill(76);
  assert.equal(newColours(fixture(), bakeStep(fixture(), 2, yb)), 0, "a baked step moves existing pixels only");
  assert.equal(changedOutside(fixture(), bakeStep(fixture(), 2, yb), aboveBellyBand(104, 112, yb)), 0, "legs and feet are fixed");
});
test("the breathing pair: out-of-phase segments tile the 10 s", () => {
  const s = breathSegments([880, 240, 800, 480], 1040, 10000); assert.equal(s[0].t0, 0); assert.equal(s.at(-1).t1, 10000);
  for (let i = 1; i < s.length; i++) assert.equal(s[i].t0, s[i - 1].t1);
  assert.notEqual(s[0].frame, breathSegments([880, 240, 800, 480], 0, 10000)[0].frame);
  assert.ok(s.slice(0, -1).every((x) => (x.t1 - x.t0) % 80 === 0), "every delay is a multiple of 80 ms");
});
test("the breath bake is the animator's row-copy rule, per column, integers only", () => {
  const col = blank(3, 30); for (let y = 0; y < 30; y++) for (let x = 0; x < 3; x++) if (y >= 2) col.data.set([y, x, 7, 255], (y * 3 + x) * 4);   // row y has colour y; ink from row 2
  const yb = new Int32Array(3).fill(20), rowsOf = (im) => Array.from({ length: 30 }, (_, y) => (im.data[(y * 3 + 1) * 4 + 3] ? im.data[(y * 3 + 1) * 4] : null));
  const b1 = rowsOf(bakeStep(col, 1, yb)), b2 = rowsOf(bakeStep(col, 2, yb));
  for (let y = 0; y < 19; y++) assert.equal(b1[y], y + 1 >= 2 ? y + 1 : null, `b1 row ${y}`);
  assert.equal(b1[19], 19, "row yb - 1 keeps itself: the doubled row at the belly line");
  for (let y = 20; y < 30; y++) assert.equal(b1[y], y, "rows at and below the belly line are fixed");
  // ytop 2, yb 20: ym = round(11) = 11, 9 px above yb: rows above ym lift 2, row 11 is doubled
  for (let y = 0; y <= 9; y++) assert.equal(b2[y], y + 2, `b2 row ${y}`);
  assert.equal(b2[10], 11); assert.equal(b2[11], 12); assert.equal(b2[18], 19); assert.equal(b2[19], 19);
  const noInk = blank(3, 30), same = bakeStep(noInk, 2, yb); assert.deepEqual([...same.data], [...noInk.data], "a column with no ink is unchanged");
});
test("the field is written 0 outside the ink dilated by the bound, and the gradient is checked over ink in the source or the output", () => {
  const img = fixture(), ink = new Uint8Array(104 * 112); for (let i = 0; i < ink.length; i++) ink[i] = img.data[i * 4 + 3] > 0 ? 1 : 0;
  const f = buildField(landmarks, "up", 104, 112, { ink }), D = fieldDomain(ink, 104, 112, 4), free = buildField(landmarks, "up", 104, 112);
  let inside = 0; for (let i = 0; i < ink.length; i++) { if (!D[i]) assert.equal(f.dx[i] | f.dy[i], 0, `outside D at ${i}`); else if (f.dy[i]) inside++; }
  assert.ok(inside > 0, "inside D the field is the spline's");
  assert.deepEqual([...f.dy.slice(52 * 104, 53 * 104)].some(Boolean), [...free.dy.slice(52 * 104, 53 * 104)].some(Boolean));
  assert.ok(f.maxStretch <= 0.25 && f.maxShear <= 0.5);
});
test("a destination above the head's top that samples into the head is transparent; below it the clamp takes the first body pixel below", () => {
  const img = fixture(); for (let y = 62; y <= 70; y++) for (let x = 80; x < 100; x++) img.data.set(A, (y * 104 + x) * 4);   // a body under the chin
  const f = buildField(landmarks, "up", 104, 112), up = { w: 104, h: 112, dx: new Int8Array(104 * 112), dy: new Int8Array(104 * 112).fill(-6) };
  const body = warp(img, [{ field: up, t: 1 }], { headMask: f.headMask, drawHead: false }), at = (x, y) => [...body.data.slice((y * 104 + x) * 4, (y * 104 + x) * 4 + 4)];
  assert.deepEqual(at(85, 34), [0, 0, 0, 0], "sky above the head is not painted from the chest");
  assert.deepEqual(at(85, 45), A, "under the head's top the column clamp takes the body pixel below the head");
});
test("bellyFixed: d = 0 points along the belly line, so the legs do not stretch (leg compression 0)", () => {
  const img = fixture(), free = JSON.parse(JSON.stringify(landmarks)); free.rules.bellyFixed.value = false;
  for (const end of ["down", "up"]) {
    const f = buildField(landmarks, end, 104, 112, { ink: new Uint8Array(img.data.filter((_, i) => i % 4 === 3).map((a) => (a > 0 ? 1 : 0))) });
    assert.equal(f.bellyFixed, true); assert.equal(legCompression(f, img), 0);
    for (let x = 20; x <= 100; x += 8) assert.equal(f.dy[76 * 104 + x], 0, `belly line pin at x ${x}`);
  }
  assert.equal(buildField(free, "down", 104, 112).bellyFixed, false);
});
test("M3 gates at alpha > 110 and reports alpha > 0 with the boxes of new regions, outlined on a copy", () => {
  const a = blank(20, 20), put = (im, x, y, al) => im.data.set([9, 9, 9, al], (y * im.w + x) * 4);
  for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) put(a, x, y, 255);
  const b = { w: 20, h: 20, data: new Uint8ClampedArray(a.data) }; put(b, 16, 16, 255); put(b, 8, 8, 0);          // a new orphan component, a new hole
  const fresh = newRegions(silhouetteRegions(a), silhouetteRegions(b), 2);
  assert.deepEqual(fresh.map((r) => [r.kind, ...r.box]), [["component", 16, 16, 16, 16], ["hole", 8, 8, 8, 8], ["orphan", 16, 16, 16, 16]]);
  const shifted = { w: 20, h: 20, data: new Uint8ClampedArray(20 * 20 * 4) }; for (let y = 5; y < 15; y++) for (let x = 4; x < 14; x++) put(shifted, x, y, 255);
  assert.deepEqual(newRegions(silhouetteRegions(a), silhouetteRegions(shifted), 2), [], "a region the field only shifted is not new");
  const soft = blank(20, 20); for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) put(soft, x, y, 255); put(soft, 9, 9, 60);
  assert.equal(silhouette(soft, 110).holes, 1); assert.equal(silhouette(soft, 0).holes, 0, "a faint pixel is a hole at alpha > 110 and none at alpha > 0");
  const marked = outlineBoxes(b, [[16, 16, 16, 16]]); assert.deepEqual([...marked.data.slice((15 * 20 + 15) * 4, (15 * 20 + 15) * 4 + 4)], [255, 0, 0, 255]);
  assert.deepEqual([...b.data.slice((15 * 20 + 15) * 4, (15 * 20 + 15) * 4 + 4)], [0, 0, 0, 0], "the original is untouched");
});
test("a derived size is mapped by the full ink bbox, each axis on its own, zero rows included; a figureBox is the caller's to override", () => {
  const img = fixture(), base = figureBbox(img), m = bboxMapping(base, [10, 20, 10 + (base[2] - base[0]) * 2, 20 + (base[3] - base[1]) * 3]);
  assert.deepEqual(base, [24, 38, 100, 100], "alpha > 110, every row, x1 and y1 exclusive"); assert.equal(m.sx, 2); assert.equal(m.sy, 3);
  const only304 = { rules: landmarks.rules, pictures: { "stand-304x312": structuredClone(landmarks.pictures["stand-104x112"]) } };
  assert.throws(() => buildField(only304, "down", 144, 152), /no picture block of its own/);
  const f = buildField(only304, "down", 144, 152, { mapping: bboxMapping(base, [34, 53, 34 + 76 * 1.4, 53 + 62 * 1.4]) });
  assert.equal(f.pointsFrom, "mapped"); assert.equal(f.size, "144x152"); assert.deepEqual(f.zeroRows[0], [134, 151], "the zero rows map with the same transform");
});
test("the warp's input is the cut key: body binarised, the shadow split off, not warped, and left under the warped feet", () => {
  const img = blank(10, 12), put = (x, y, a, c = [90, 60, 30]) => img.data.set([...c, a], (y * 10 + x) * 4);
  for (let x = 2; x < 8; x++) for (let y = 2; y < 6; y++) put(x, y, 255); put(1, 3, 150); put(8, 3, 70);               // a body with a soft fringe
  for (let x = 2; x < 8; x++) put(x, 9, 130, [30, 26, 34]); put(5, 10, 40, [30, 26, 34]);                            // a painted shadow on the zero rows 9 and below
  const k = prepareKey(img, 9);
  assert.deepEqual(k.prep, { body: 24, shadow: 6, dropped: 3 }, "alpha >= 200 is body; 60..199 from the zero row down is shadow; the rest is dropped");
  assert.ok([...k.data].every((v, i) => i % 4 !== 3 || v === 0 || v === 255), "the body alpha is 255 or 0");
  const f = { w: 10, h: 12, dx: new Int8Array(120), dy: new Int8Array(120).fill(2) }, out = warp(k, [{ field: f, t: 1 }]);
  assert.deepEqual([...flat(out).data.slice((9 * 10 + 4) * 4, (9 * 10 + 4) * 4 + 4)], [30, 26, 34, 110], "the shadow stays where it was, flat at <= 110");
  assert.equal(flat(out).data[(4 * 10 + 4) * 4 + 3], 255, "the body moved down 2 px"); assert.equal(flat(out).data[(2 * 10 + 4) * 4 + 3], 0);
  assert.equal(newColours(flat(k), flat(out)), 0);
});
