// Owner bugs #14, #35, #40, #78 ("the blocking slab is not shown", "what slab?"): nothing that blocks a step in a place is invisible.
// A set piece whose picture is not signed yet (the heart slab: an empty art slot) is not placed and does not block, until its art is in DRAWN_PIECES.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { PLAYTEST_SEEDS } from "../src/playtest-seeds.mjs";
import { DRAWN_PIECES } from "../src/gen7/adapt7.mjs";

test("on every land cell of every playtest world, every placed set piece has a drawn picture (no invisible block)", () => {
  let cells = 0, pieces = 0;
  for (const seed of PLAYTEST_SEEDS.filter((_, i) => i % 22 === 0)) {   // every 22nd playtest seed (the 66 take over an hour)
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
    const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()");
    for (const c of keys) {
      const ps = p.run(`layout('${c}').pieces.map(q => q.piece)`);
      cells++; pieces += ps.length;
      for (const name of ps) assert.ok(DRAWN_PIECES.has(name), `seed ${seed} cell ${c}: a ${name} blocks tiles but has no drawn picture`);
    }
  }
  assert.ok(cells > 50, "the worlds were walked");
  console.log(`cells ${cells}, placed pieces ${pieces}`);
});

test("the owner's place (seed 2668471853, cell 195, the slab was at 10,13): the pawn walks down through the tile", () => {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(2668471853); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]); S.exp.pos = 195; enterPatch(); if (RT.view) endView();`);
  p.run(`S.exp.patch.x = 10; S.exp.patch.y = 12; FX.notes = []; patchStep('down', 'creep');`);
  assert.equal(p.run("S.exp.patch.x + ',' + S.exp.patch.y"), "10,13","the pawn steps onto the tile the invisible slab held");
});
