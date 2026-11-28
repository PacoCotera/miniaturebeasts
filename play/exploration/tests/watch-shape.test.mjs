// W6b round 2 (design 2026-11-24 12:03): far, and any air that is not clear, draws her shape; mid and near in clear air draw the signed cut.
//   node --test prototypes/exploration/tests/watch-shape.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawsCut } from "../src/logic/watch.mjs";

test("the cut is drawn only at mid and near in clear air", () => {
  assert.equal(drawsCut("far", true), false, "far in clear air: shape");
  assert.equal(drawsCut("far", false), false, "far in rain: shape");
  assert.equal(drawsCut("mid", false), false, "mid in rain or fog: shape");
  assert.equal(drawsCut("near", false), false, "near in rain or fog: shape");
  assert.equal(drawsCut("mid", true), true);
  assert.equal(drawsCut("near", true), true);
});

test("the view and the card draw the pose through drawsCut, and the shape is the cut's own mask at 1x in one colour", () => {
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(src, /drawPoseAt\(coat, pose, \(SCR_W - 228\) >> 1, 140, drawsCut\(range, airClear\(\)\)\)/, "the view");
  assert.match(src, /drawPoseAt\(coat, cd\.pose, \(SCR_W - 228\) >> 1, 114, drawsCut\(cd\.range, cd\.clear\)\)/, "the card");
  assert.match(src, /cut \? poseCut\(coat, pose\) : poseMask\(coat, pose, C\.stone, 0\)/, "the shape is the mask at the cut's own size, one colour, no cut pixels");
});
