// The full map of a generator 4 world cuts every outward water corner (both side neighbours land) as a 7 px quarter disc of the ground
// across it, with the 2 px foam along the arc. Drawing only: the pixels differ from the uncut bake inside those corners and nowhere else.
import test from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import { makePage, PAGE } from "./page-harness.mjs";

const { MW, MH, L } = W, CELL = 26;
const p = makePage({ console: "silent", canvas: true });
const bake = (seed, biome, gen) => { p.run(`newWorld(${seed}, 4); G = genWorld(${seed}, 4, '${biome}'); G.gen = ${gen};`); return Int16Array.from(p.run("buildMapPB()").p); };

for (const biome of W.BIOMES) test(`${biome}: the full map cuts a 7 px quarter disc with 2 px foam on every outward water corner, and changes nothing else`, () => {
  let corners = 0, cutN = 0;
  for (const seed of [7, 42, 1000]) {
    const G = W.genWorld(seed, 4, biome), cut = bake(seed, biome, 4), plain = bake(seed, biome, 3), w = MW * CELL, ice = p.run("C.ice");
    const land = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && G.land[y * MW + x] !== L.WATER;
    const near = new Uint8Array(w * MH * CELL);
    for (let c = 0; c < MW * MH; c++) { if (G.land[c] !== L.WATER) continue; const x = c % MW, y = (c / MW) | 0;
      for (const sy of [1, -1]) for (const sx of [1, -1]) {
        if (!land(x, y - sy) || !land(x - sx, y)) continue;
        corners++; const cx = sx > 0 ? x * CELL : (x + 1) * CELL, cy = sy > 0 ? y * CELL : (y + 1) * CELL, diag = land(x - sx, y - sy);
        for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const d = Math.hypot(i + .5, j + .5), X = sx > 0 ? cx + i : cx - 1 - i, Y = sy > 0 ? cy + j : cy - 1 - j;
          near[Y * w + X] = 1;
          if (d >= 9) continue;
          if (d >= 7) { assert.equal(cut[Y * w + X], ice, `seed ${seed} cell ${c}: foam on the arc at ${X},${Y}`); continue; }
          const mx = sx > 0 ? cx - 1 - i : cx + i, my = sy > 0 ? cy - 1 - j : cy + j, want = diag ? plain[my * w + mx] : i < j ? plain[Y * w + mx] : plain[my * w + X];
          assert.equal(cut[Y * w + X], want, `seed ${seed} cell ${c}: the ground across the corner at ${X},${Y}`); cutN++; } } }
    for (let k = 0; k < cut.length; k++) if (cut[k] !== plain[k]) assert.ok(near[k], `seed ${seed}: pixel ${k % w},${(k / w) | 0} changed away from a corner`);
  }
  assert.ok(corners > 20 && cutN > 0, `${biome}: ${corners} corners`);
});

test("generations 1 to 3 draw the full map as they always did: the foam keeps its square corner", () => {
  for (const gen of [1, 2, 3]) { p.run(`newWorld(7, ${gen})`); const G = W.genWorld(7, gen), pb = p.run("buildMapPB()").p, ice = p.run("C.ice"); let sharp = 0;
    for (let c = 0; c < MW * MH; c++) { const x = c % MW, y = (c / MW) | 0;
      if (G.land[c] === L.WATER && x > 0 && y > 0 && G.land[c - MW] !== L.WATER && G.land[c - 1] !== L.WATER) { sharp++; assert.equal(pb[(y * CELL) * (MW * CELL) + x * CELL], ice, `gen ${gen} cell ${c}`); } }
    assert.ok(sharp > 0, `gen ${gen}: ${sharp} square corners`); }
});

test("the edge-mark cache key carries the Fells flag in the one expression (a stray semicolon once cut it off)", () => {
  const line = PAGE.split("\n").find(l => l.includes("const key = 'em' + cs"));
  assert.ok(line, "the key line"); assert.ok(/const key = [^;]*\(heavy \? ':F' : ''\);/.test(line), line);
});
