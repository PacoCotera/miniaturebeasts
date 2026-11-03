// The full map of every generation cuts every outward water corner (both side neighbours land) as a 7 px quarter disc of the ground
// across it, with the 2 px foam along the arc. Drawing only: the pixels differ from the uncut bake inside those corners and nowhere else.
import test from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import { makePage, PAGE } from "./page-harness.mjs";

const { MW, MH, L } = W, CELL = 26;
const p = makePage({ console: "silent", canvas: true });
// the page's own bake, and the same function with the cut switched off: the pixels differ inside the corners and nowhere else
const fnSrc = name => { const i = PAGE.indexOf("\nfunction " + name + "("); assert.ok(i >= 0, name); return PAGE.slice(i, PAGE.indexOf("\nfunction ", i + 1)); };
const UNCUT = fnSrc("buildMapPB").replace("for (const sy of [1, -1]) for (const sx of [1, -1]) {", "for (const sy of []) for (const sx of [1, -1]) {");
assert.notEqual(UNCUT, fnSrc("buildMapPB"), "the cut loop is found");
const bake = () => Int16Array.from(p.run("buildMapPB()").p), plainBake = () => Int16Array.from(p.run("(" + UNCUT.trim() + "\n)()").p);
function check(G, label) {
  const cut = bake(), plain = plainBake(), w = MW * CELL, ice = p.run("C.ice"); let corners = 0, cutN = 0;
  const land = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && G.land[y * MW + x] !== L.WATER;
  const near = new Uint8Array(w * MH * CELL);
  for (let c = 0; c < MW * MH; c++) { if (G.land[c] !== L.WATER) continue; const x = c % MW, y = (c / MW) | 0;
    for (const sy of [1, -1]) for (const sx of [1, -1]) {
      if (!land(x, y - sy) || !land(x - sx, y)) continue;
      corners++; const cx = sx > 0 ? x * CELL : (x + 1) * CELL, cy = sy > 0 ? y * CELL : (y + 1) * CELL, diag = land(x - sx, y - sy);
      for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const d = Math.hypot(i + .5, j + .5), X = sx > 0 ? cx + i : cx - 1 - i, Y = sy > 0 ? cy + j : cy - 1 - j;
        near[Y * w + X] = 1;
        if (d >= 9) continue;
        if (d >= 7) { assert.equal(cut[Y * w + X], ice, `${label} cell ${c}: foam on the arc at ${X},${Y}`); continue; }
        const mx = sx > 0 ? cx - 1 - i : cx + i, my = sy > 0 ? cy - 1 - j : cy + j, want = diag ? plain[my * w + mx] : i < j ? plain[Y * w + mx] : plain[my * w + X];
        assert.equal(cut[Y * w + X], want, `${label} cell ${c}: the ground across the corner at ${X},${Y}`); cutN++; } } }
  for (let k = 0; k < cut.length; k++) if (cut[k] !== plain[k]) assert.ok(near[k], `${label}: pixel ${k % w},${(k / w) | 0} changed away from a corner`);
  return { corners, cutN };
}

for (const biome of W.BIOMES) test(`${biome}: the full map cuts a 7 px quarter disc with 2 px foam on every outward water corner, and changes nothing else`, () => {
  let corners = 0, cutN = 0;
  for (const seed of [7, 42, 1000]) { p.run(`newWorld(${seed}, 4); G = genWorld(${seed}, 4, '${biome}');`); const r = check(W.genWorld(seed, 4, biome), `seed ${seed}`); corners += r.corners; cutN += r.cutN; }
  assert.ok(corners > 20 && cutN > 0, `${biome}: ${corners} corners`);
});

test("generations 1 to 3 draw the full map with the same cut: a round corner where the foam had a square one, and nothing else changed", () => {
  for (const gen of [1, 2, 3]) { p.run(`newWorld(7, ${gen})`); const r = check(W.genWorld(7, gen), `gen ${gen}`); assert.ok(r.corners > 5 && r.cutN > 0, `gen ${gen}: ${r.corners} corners`); }
});

test("the edge-mark cache key carries the Fells flag in the one expression (a stray semicolon once cut it off)", () => {
  const line = PAGE.split("\n").find(l => l.includes("const key = 'em' + cs"));
  assert.ok(line, "the key line"); assert.ok(/const key = [^;]*\(heavy \? ':F' : ''\);/.test(line), line);
});
