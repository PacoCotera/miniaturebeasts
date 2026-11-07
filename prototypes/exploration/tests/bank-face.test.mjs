// L4b (E1): an earth bank's face is in view in its place: a side wall (high ground east or west of the place) is a tile and a half deep (it was a 28 px strip at 48), so the bank reads as a wall on the edge of the view.
//   node --test prototypes/exploration/tests/bank-face.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

// the earth's depth from the place's outer edge along the middle row of the block, in px (the block is 2 tiles square, the edge is column 0 for a left crossing and the last column for a right one)
const depth = (f, ts, dir) => f.run(`(() => { const b = L2.bankBlock(${ts}, '${dir}', 'side', 0, 7), S = 2 * ${ts}, y = S >> 1; let n = 0;
  for (let d = 0; d < S; d++) { const x = '${dir}' === 'left' ? d : S - 1 - d; if (b.get(x, y) < 0) break; n++; } return n; })()`);
test("a side bank wall at 48 px is at least a tile and a quarter deep on both sides, and at 32 px at least a tile", () => {
  const f = fixture();
  for (const dir of ["left", "right"]) {
    assert.ok(depth(f, 48, dir) >= 60, `${dir} at 48: ${depth(f, 48, dir)} px of earth (was 28)`);
    assert.ok(depth(f, 32, dir) >= 40, `${dir} at 32: ${depth(f, 32, dir)} px of earth (was 14)`);
  }
});
test("the other bank pieces (the south-facing face, the lip, the foot) still draw", () => {
  const f = fixture();
  for (const [dir, type] of [["up", "face"], ["up", "lip"], ["down", "foot"], ["left", "lip"]]) assert.ok(f.run(`L2.bankBlock(48, '${dir}', '${type}', 0, 7).p.some(c => c >= 0) ? 1 : 0`) === 1, `${dir} ${type} still draws`);
});
