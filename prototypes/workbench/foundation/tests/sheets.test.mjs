import { test } from "node:test";
import assert from "node:assert/strict";
import { sheet, tileLines } from "../sheets.mjs";
import { wrapLine, wrapLines, checkLabels } from "../labels.mjs";
import { blank, textWidth } from "../imgtools.mjs";

const BG = [246, 243, 236], pic = (w, h) => blank(w, h, [90, 90, 90]);
const lines = (...t) => t.map((x) => [x, [20, 18, 24]]);

test("a label is wrapped to its column, word by word, and never wider than it", () => {
  for (const w of [120, 192, 260, 304]) for (const l of wrapLine("BREAKS EYE SHARE, FACE STACK, FAR EYE, HEAD BREADTH, NOSE AT EYE", w, 2)) assert.ok(textWidth(l, 2) <= w, `${l} at ${w}`);
  assert.deepEqual(wrapLine("A B", 200, 2), ["A B"]);
});
test("a word that cannot fit its column, or a label of too many lines, fails loudly", () => {
  assert.throws(() => wrapLine("SUPERCALIFRAGILISTIC", 100, 2), /column is 100/);
  assert.throws(() => wrapLines(lines("ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE"), 60, 2, 3), /max 3/);
});
test("checkLabels refuses overlapping boxes, a label across its column and one off the sheet", () => {
  const ok = { x: 10, y: 10, w: 50, h: 10, x0: 0, x1: 100, what: "A" };
  assert.ok(checkLabels([ok, { ...ok, y: 30, what: "B" }], 200, 100));
  assert.throws(() => checkLabels([ok, { ...ok, x: 40, what: "B" }], 200, 100), /overlaps/);
  assert.throws(() => checkLabels([{ ...ok, x: 70 }], 200, 100), /crosses its column/);
  assert.throws(() => checkLabels([{ ...ok, x: 190, x0: 0, x1: 300 }], 200, 100), /leaves the sheet/);
});
test("a sheet's labels never overlap and never cross their column: boxes by construction, pixels by reading the gutters", () => {
  const long = lines("H/S 0.52, EYE T 0.9", "OUTSIDE THE HOUSE", "BREAKS EYE SHARE, FACE STACK, FAR EYE", "H/S 0.52 E/W 0.32 SHARE 0.245");
  for (const [cols, cw] of [[4, 304], [3, 260], [3, 192], [2, 304]]) {
    const cells = Array.from({ length: 2 * cols }, () => ({ img: pic(cw, 100), lines: long })), img = sheet("A LONG TITLE FOR THE SHEET THAT HAS TO WRAP ONTO A SECOND LINE WHEN THE SHEET IS NARROW", cells, cols, { cellW: cw, maxLines: 7 });
    assert.ok(img.labels.length > 0 && checkLabels(img.labels, img.width, img.height));
    const { gap, labelH, head, ch, rows, vg } = img.layout;
    for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) { // the gutter left of column c, over the label rows: bare background
      const x0 = c === 0 ? 0 : gap + c * (cw + gap) - gap, x1 = c === 0 ? gap : gap + c * (cw + gap), y0 = head + r * (ch + labelH + vg);
      for (let y = y0; y < y0 + labelH; y++) for (let x = x0; x < x1; x++) { const i = (y * img.width + x) * 4; assert.deepEqual([img.data[i], img.data[i + 1], img.data[i + 2]], BG, `ink in the gutter at ${x},${y}`); }
    }
    for (let y = 0; y < img.height; y++) for (const x of [img.width - 1]) assert.deepEqual([img.data[(y * img.width + x) * 4]], [246], "the right edge is bare");
  }
});
test("a tile's label: the name and the verdict, the numbers only if they fit", () => {
  const t = { label: "H/S 0.52, EYE T 0.9", measured: { "H/S": 0.52, "E/Wf": 0.3, "eye-share": 0.245 }, fails: [{ id: "R1-face", value: 0.245, range: [0.16, 0.24] }, { id: "R4-stack" }, { id: "R-far-eye" }] };
  const l = tileLines(t, 304); assert.equal(l[0][0], "H/S 0.52, EYE T 0.9"); assert.equal(l[1][0], "OUTSIDE THE HOUSE"); assert.match(l[2][0], /^BREAKS FACE STACK, FAR EYE/);
  const narrow = tileLines({ ...t, fails: [] }, 150); assert.ok(!narrow.some((x) => x[0].startsWith("H/S 0.52 E/W")), "numbers are dropped when they do not fit");
  assert.equal(tileLines({ ...t, fails: [] }, 304).at(-1)[0].startsWith("H/S"), true);
});
