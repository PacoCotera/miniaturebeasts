// Owner bugs #99 and #100 (seed 20, generator 7, patch 8,5): a plateau's side edge is drawn as a thin dark line; the ring cell beside it is drawn as top grass, so it walks up to the line and the step ACROSS the line is refused
// (cliff method R5: walking follows what is drawn). Before: the ring cell blocked, so he stopped a tile short ("can't move down" at tile 4,0, "can't move left" at 5,1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const CELL = 88;   // patch 8,5
function at(p, x, y, dir) {
  p.run(`S.exp.pos = ${CELL}; enterPatch(); if (RT.view) endView(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; patchStep('${dir}', 'tap');`);
  return p.run("S.exp.patch.x + ',' + S.exp.patch.y");
}
test("seed 20 patch 8,5: he walks up to the drawn rim line and stops at it", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(20); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.start = ${CELL}; S.exp.range = 3;`);
  assert.equal(at(p, 4, 0, "down"), "4,1", "#99: tile 4,0 down walks onto the ring cell");
  assert.equal(at(p, 5, 1, "left"), "4,1", "#100: tile 5,1 left walks onto the ring cell");
  assert.equal(at(p, 4, 1, "left"), "4,1", "a drawn face on the cell beside it (3,1 under the lip) still blocks");
  assert.match(p.run(`FX.notes.map(n => n.text).join("|")`), /Steep rock · no way over/, "with the same banner");
  assert.equal(at(p, 3, 5, "right"), "3,5", "bug #101: a W/E side drawn as the line alone is not crossed; he stops at the line");
  assert.equal(at(p, 4, 5, "left"), "4,5", "bug #101: and not crossed from the other side");
  assert.equal(at(p, 3, 0, "down"), "3,0", "a south rim edge (face below) still blocks");
  assert.equal(at(p, 4, 5, "down"), "4,6", "along the line walks");
  assert.equal(at(p, 2, 0, "down"), "2,0", "a drawn face (tiles 1..3, rows 1..3) still blocks");
});
