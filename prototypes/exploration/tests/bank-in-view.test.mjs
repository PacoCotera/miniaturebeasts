// L4b2: a bank's face lies inside the place's view, not on the place's border (on seed 7 the dug bank showed only as a strip at the edge).
//   node --test prototypes/exploration/tests/bank-in-view.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";

const { T, PW, PH, BANK_IN } = W;
const SEEDS = [7, 1, 2, 3, 11, 19, 23, 42];
const BIOMES = W.ALL_BIOMES.slice(0, 4);

function banksOf(seed, biome) {
  const G = W.genWorld(seed, 4, biome); G.soft = W.softGround(G, seed); G.banks = W.bankEdges(G, seed); const out = [];
  for (let cell = 0; cell < W.MW * W.MH; cell++) { let lay; try { lay = W.genPatch2(G, seed, cell); } catch { continue; } if (!lay) continue;
    for (const q of lay.cross || []) if (q.kind === "bank") out.push({ cell, q, lay }); }
  return out;
}

test("every bank in a place stands BANK_IN rows or more in from the border, and its whole 2 x 2 face is on tiles of the place", () => {
  let n = 0;
  for (const seed of SEEDS) for (const biome of BIOMES) for (const { cell, q, lay } of banksOf(seed, biome)) {
    n++; assert.equal(q.off, BANK_IN, `seed ${seed} ${biome} cell ${cell}: the bank is ${q.off} rows in`);
    const rows = [];
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (lay.tiles[y * PW + x] === T.BANK) {
      const d = q.dir === "left" ? x : q.dir === "right" ? PW - 1 - x : q.dir === "up" ? y : PH - 1 - y; rows.push(d); }
    assert.equal(rows.length, 4, `seed ${seed} ${biome} cell ${cell}: four bank tiles`);
    assert.ok(Math.min(...rows) >= BANK_IN && Math.max(...rows) <= BANK_IN + 1, `seed ${seed} ${biome} cell ${cell}: bank rows ${rows} are not clear of the border`);
  }
  assert.ok(n >= 8, `banks were found to test (${n})`);
});
