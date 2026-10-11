import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { decodePNG } from "../png.mjs";
import { buildField, checkField, encodeField, decodeField } from "../tools/warp-field.mjs";
import { warp, blank, png, runAll, newColours, silhouette, outlineIrregular, changedOutside, breathSegments } from "../tools/tier2-test.mjs";

// A synthetic 104x112 body of flat colours (never an asset): a body, a back on top of it, two legs ending on the feet row 99; the shadow rows are 96..111.
const A = [200, 120, 60, 255], B = [150, 90, 40, 255], C = [240, 220, 160, 255];
function fixture() {
  const img = blank(104, 112), rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) img.data.set(c, (y * 104 + x) * 4); };
  rect(24, 44, 79, 75, A); rect(34, 38, 69, 43, B); rect(28, 76, 33, 99, C); rect(70, 76, 75, 99, C);
  return img;
}
const landmarks = {
  blend: "topline",
  pictures: { "stand-104x112": { fieldZeroRows: [96, 111], fixed: { "foot-a": [30, 99], "foot-b": [72, 99], nape: [79, 46], throat: [79, 60], "tail-root": [24, 46] },
    moving: { withers: { pos: [42, 38], down: [0, 1], up: [0, -1] }, "mid-back": { pos: [52, 38], down: [0, 2], up: [0, -2] }, croup: { pos: [62, 38], down: [0, 1], up: [0, -1] } } } },
};
const tmp = mkdtempSync(path.join(tmpdir(), "tier2-"));
const standFile = path.join(tmp, "stand.png"), lmFile = path.join(tmp, "lm.json");
writeFileSync(standFile, png(fixture())); writeFileSync(lmFile, JSON.stringify(landmarks));
const set = { name: "fixture", stand: standFile, landmarks: lmFile };

test("the same inputs give the same bytes twice, and the harness's own two runs agree (M1)", () => {
  const a = buildField(landmarks, "down", 104, 112), b = buildField(landmarks, "down", 104, 112);
  assert.deepEqual(encodeField(a), encodeField(b));
  const r = runAll([set]), r2 = runAll([set]);
  for (const [k, v] of r.files) if (k !== "measures.csv") assert.ok(v.equals(r2.files.get(k)), k);   // the CSV carries a clock reading (M7)
  assert.equal(r.rows.find((x) => x.measure === "M1").result, "pass");
  assert.ok(r.files.has("contact-sheet.png") && r.files.has("measures.csv"));
  const apng = r.files.get("fixture/vivarium-pair-104x112.apng"); assert.equal(apng.subarray(1, 4).toString(), "PNG"); assert.ok(apng.includes(Buffer.from("acTL")));
  assert.equal(decodePNG(apng).width, 2 * 104 + 3 * 16);
});
test("the warp moves existing pixels only: the output colours are a subset of the input's (M2)", () => {
  const img = fixture(), f = buildField(landmarks, "up", 104, 112), out = warp(img, [{ field: f, t: 1 }]);
  assert.equal(newColours(img, out), 0);
  assert.notDeepEqual([...out.data], [...img.data], "the field moved something");
  const half = warp(img, [{ field: f, t: 0.5 }]); assert.equal(newColours(img, half), 0);
  assert.deepEqual([...warp(img, [{ field: f, t: 0 }]).data], [...img.data], "t = 0 is the identity");
  const topline = (im) => { for (let y = 0; y < 112; y++) if (im.data[(y * 104 + 52) * 4 + 3]) return y; };
  assert.ok(topline(out) < topline(img), "up lifts the back");
  assert.ok(topline(warp(img, [{ field: buildField(landmarks, "down", 104, 112), t: 1 }])) > topline(img), "down drops it");
});
test("the field is 0 on the feet and shadow rows, and rounds to whole px within the bound and the gradient", () => {
  for (const end of ["down", "up"]) {
    const f = buildField(landmarks, end, 104, 112);
    for (let y = 96; y < 112; y++) for (let x = 0; x < 104; x++) assert.equal(f.dx[y * 104 + x] | f.dy[y * 104 + x], 0, `(${x}, ${y})`);
    assert.ok(f.maxD <= 4 && f.maxD > 0 && f.maxGradient <= 0.25);
    assert.ok(f.dx instanceof Int8Array);
    const back = decodeField(encodeField(f)); assert.deepEqual([...back.dy], [...f.dy]);
  }
});
test("a field outside the bounds is refused, with a message", () => {
  const big = { w: 104, h: 112, size: "104x112", dx: new Int8Array(104 * 112), dy: new Int8Array(104 * 112) }; big.dy[50 * 104 + 50] = 5;
  assert.throws(() => checkField(big), /over the 4 px bound at 104x112/);
  assert.throws(() => checkField({ ...big, dy: new Int8Array(104 * 112), maxGradient: 0.4 }), /gradient 0\.400 px\/px is over 0\.25/);
  const onFeet = { ...big, dy: new Int8Array(104 * 112) }; onFeet.dy[100 * 104 + 3] = 1;
  assert.throws(() => checkField(onFeet, { zeroRows: [[96, 111]] }), /not 0 on the feet\/shadow row 100/);
  assert.throws(() => buildField(landmarks, "down", 104, 112, { amplitude: 10 }), /field refused/);
  assert.throws(() => buildField({ pictures: {} }, "down", 100, 100), /no displacement bound/);
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
  const band = [54, 66], plain = changedOutside(a, b, band); assert.equal(plain, 0);
  for (const end of ["down", "up"]) {
    const f = buildField(landmarks, end, 104, 112), w = changedOutside(warp(a, [{ field: f, t: 1 }]), warp(b, [{ field: f, t: 1 }]), band);
    assert.ok(w <= plain, `${end}: ${w} > ${plain}`);
  }
  const r = runAll([{ ...set, band: "54-66", pair: [`b1=${standFile},${standFile}`] }]);
  assert.ok(r.rows.filter((x) => x.measure === "M8").every((x) => x.result === "pass"));
});
test("the breathing pair: out-of-phase segments tile the 10 s", () => {
  const s = breathSegments([700, 350, 700], 1050, 10000); assert.equal(s[0].t0, 0); assert.equal(s.at(-1).t1, 10000);
  for (let i = 1; i < s.length; i++) assert.equal(s[i].t0, s[i - 1].t1);
  assert.notEqual(s[0].frame, breathSegments([700, 350, 700], 0, 10000)[0].frame);
});
