// Bugs #45 ("what stone?") and #67 ("there's no cliff down"), the family of #14 #35 #40 #78: no blocker the player cannot see, and no word that names something that is not there.
// The tool sweeps every land cell of a world (tools/invisible-blocks.mjs; all playtest seeds are run by hand, several at once); here the owner's world and one playtest world.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { sweepSeed } from "../tools/invisible-blocks.mjs";

for (const seed of [2668471853, 7]) {
  test(`seed ${seed}: every blocking tile has a picture, and every refused border step has its cause drawn`, () => {
    const r = sweepSeed(seed);
    assert.deepEqual(r.bad, []);
    assert.ok(r.cells > 50 && r.total.water > 0, "the world was walked");
    console.log(`seed ${seed}: cells ${r.cells} ${JSON.stringify(r.total)}`);
  });
}

test("a cliff tile is worded as steep rock, never as a stone (bug #45)", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(2668471853); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);");
  const r = p.run(`(() => { const out = { cliff: 0, stone: 0, wrong: 0 };
    for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const lay = layout(String(c));
      for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) { const i = y * lay.w + x; if (lay.tiles[i] !== T.ROCK || lay.press[i] !== 1) continue;
        const w = blockWords(lay, x, y, { type: 'tile', t: T.ROCK }); if (lay.steep[i]) { out.cliff++; if (w !== WORDS.block.rock) out.wrong++; } else { out.stone++; if (w !== WORDS.block.stone) out.wrong++; } } }
    return out; })()`);
  assert.ok(r.cliff > 0, JSON.stringify(r));
  assert.equal(r.wrong, 0);
});

test("a step refused because a tree or stone stands on the neighbour's first row says so, not 'Cliff · too steep' (bug #67)", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(2668471853); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);");
  // cell 3,1 east edge tile 23,8: the next cell's first column holds a blocking prop at row 8
  p.run("S.exp.pos = 1 * 16 + 3; enterPatch(); if (RT.view) endView(); S.exp.patch.x = 23; S.exp.patch.y = 8;");
  assert.equal(p.run("crossLanding('right')"), null, "the step across is refused");
  const said = String(p.run("crossBlockWords('right')"));
  assert.ok(!/Cliff/.test(said) && /in the way|Steep rock|Water/.test(said), said);
});
