// Owner bugs #95 and #96 (seed 59, generator 7, patch 1,1 north seam): a stair side of the cell map (EDGE.RAMP) used to refuse the whole side, though a generator 7 place lists no stairs
// and draws open grass between its cliff faces. Walking follows what is drawn (cliff method R5): the tiles decide that side like any other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("seed 59 cell 17, north side: the grass gaps cross, the drawn cliff faces still block", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(59); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.start = 17; S.exp.range = 3;`);
  const to = (x) => { p.run(`S.exp.pos = 17; enterPatch(); if (RT.view) endView(); S.exp.patch.x = ${x}; S.exp.patch.y = 0; patchStep('up', 'tap');`); return p.run("S.exp.pos"); };
  assert.equal(p.run("edgeKind(17, 'up')"), 2, "the side is a stair side");
  for (const x of [5, 8, 11, 14, 15]) assert.equal(to(x), 1, `open grass at tile ${x} walks north`);   // #95 tile 15, #96 tile 8
  for (const x of [0, 2, 12, 13, 16, 18, 21]) assert.equal(to(x), 17, `a drawn cliff at tile ${x} still blocks`);
});
