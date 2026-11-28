// Owner bugs #14, #35, #40, #78 ("the blocking slab is not shown", "what slab?"): nothing that blocks a step in a place is invisible.
// A set piece whose picture is not signed yet (the heart slab: an empty art slot) is not placed and does not block, until its art is in DRAWN_PIECES.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("the owner's place (seed 2668471853, cell 195, the slab was at 10,13): the pawn walks down through the tile", () => {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(2668471853); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.pos = 195; enterPatch(); if (RT.view) endView();`);
  p.run(`S.exp.patch.x = 10; S.exp.patch.y = 12; FX.notes = []; patchStep('down', 'creep');`);
  assert.equal(p.run("S.exp.patch.x + ',' + S.exp.patch.y"), "10,13","the pawn steps onto the tile the invisible slab held");
});
