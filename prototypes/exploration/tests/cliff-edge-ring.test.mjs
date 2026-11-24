// Owner note mwv1eeqye526e2 (issue #146, seed 64, patch 12,6 = cell 108): the hero crossed a cliff wall.
//   A ring cell at a place's edge walks (#438) and its drawn rim line is refused only inside the place; the step off the place's west edge at tile 0,7 and 0,8 went through the line into cell 107.
//   The step off the edge now asks the rim bits too. Rows with no line there (0,3 and 0,10) still cross.
//   node --test prototypes/exploration/tests/cliff-edge-ring.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

function step(p, x, y, dir) {
  p.run(`S.exp.pos = 108; enterPatch(); if (RT.view) endView(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; patchStep('${dir}', 'tap');`);
  return p.run("S.exp.pos + '/' + S.exp.patch.x + ',' + S.exp.patch.y");
}

test("#146 (seed 64, patch 12,6): the hero does not leave through the cliff's side line at the west edge", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(64); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.start = 108; S.exp.range = 4;");
  for (const y of [7, 8]) assert.equal(step(p, 0, y, "left"), "108/0," + y, "tile 0," + y + " west stops at the drawn line");
  assert.equal(step(p, 1, 7, "left"), "108/0,7", "he walks up to the line from the grass beside it");
  for (const y of [3, 10]) assert.equal(step(p, 0, y, "left"), "107/23," + y, "tile 0," + y + " has no line: it crosses");
});
