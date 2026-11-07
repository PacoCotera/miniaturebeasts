// Realm version 2's five land kinds (Downs, Thickets, Tallwood, Tarns, Meres): their shares over 200 seeds against the design table, the walkable
// floor and g2Check on every seed, and the four older kinds' worlds byte for byte (a golden digest of every field of 200 worlds each).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as W from "../src/world.mjs";

const { L, MW, MH } = W, N = MW * MH;
const seeds = Array.from({ length: 200 }, (_, i) => i);
const worlds = {}, worldsOf = b => worlds[b] || (worlds[b] = seeds.map(s => W.genWorld(s, 4, b)));
const plain = (_, x) => x instanceof Set || x instanceof Map ? [...x] : ArrayBuffer.isView(x) ? Array.from(x) : x;
const digest = b => { const h = createHash("sha256");
  for (const s of seeds) { const G = W.genWorld(s, 4, b); h.update(Object.keys(G).sort().map(k => k + ":" + JSON.stringify(G[k], plain)).join("|")); }
  return h.digest("hex"); };

test("the four older kinds' worlds are unchanged byte for byte over 200 seeds (region 1 is generator 3 to the bit)", () => {
  const want = JSON.parse(readFileSync(new URL("./world-r1-old-kinds.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(want), W.BIOMES);
  for (const b of W.BIOMES) assert.equal(digest(b), want[b], b);
  assert.equal(W.BIOME_GROUND.mixed, null);
});

test("the new kinds are known to generator 4 and not to the old list", () => {
  assert.deepEqual(W.BIOMES_R1, ["downs", "thickets", "tallwood", "tarns", "meres"]);
  assert.deepEqual(W.ALL_BIOMES, [...W.BIOMES, ...W.BIOMES_R1]);
  for (const b of W.BIOMES_R1) assert.ok(W.BIOME_GROUND[b], b);
});

// 8-connected pieces of the cells a predicate picks; each piece is its size
const pieces = (G, pred) => { const seen = new Uint8Array(N), out = [];
  for (let c = 0; c < N; c++) { if (seen[c] || !pred(c)) continue; let n = 0; const st = [c]; seen[c] = 1;
    while (st.length) { const q = st.pop(); n++; const x = q % MW, y = (q / MW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const d = Y * MW + X; if (!seen[d] && pred(d)) { seen[d] = 1; st.push(d); } } }
    out.push(n); }
  return out; };
// the share of the reachable cells (the walkable component) that stand on each land
const share = (b, lands) => { const G = worldsOf(b); let reach = 0, on = 0;
  for (const g of G) for (let c = 0; c < N; c++) if (g.comp[c]) { reach++; if (lands.includes(g.land[c])) on++; }
  return on / reach * 100; };
const RULES = {   // [lands, lowest, highest] of the reachable cells, over 200 seeds
  downs: { meadow: [[L.MEADOW], 65, 100], wood: [[L.WOOD], 8, 15] },
  thickets: { wood: [[L.WOOD], 40, 50] },
  tallwood: { wood: [[L.WOOD], 50, 60] },
  tarns: { rock: [[L.ROCK], 35, 100] },
  meres: { "water and pond edge": [[L.WATER, L.POND], 30, 40] },
};
for (const b of W.BIOMES_R1) test(`${b}: shares over 200 seeds, 260 walkable cells, g2Check, no fallback ground`, () => {
  const G = worldsOf(b);
  for (const [name, [lands, lo, hi]] of Object.entries(RULES[b])) { const v = share(b, lands); console.log(`# ${b} ${name}: ${v.toFixed(1)} % of the reachable cells`); assert.ok(v >= lo && v <= hi, `${b} ${name}: ${v.toFixed(1)} against ${lo} to ${hi}`); }
  assert.ok(G.every(g => g.gen === 4 && g.biome === b && g.attempt < 8 && !g.land.includes(L.CLIFF)), `${b}: a fallback or a cliff cell`);
  const walk = G.map(g => g.comp.reduce((n, x) => n + x, 0));
  assert.ok(Math.min(...walk) >= W.WALK_MIN, `${b}: fewest walkable ${Math.min(...walk)}`);
  console.log(`# ${b}: walkable ${Math.min(...walk)} to ${Math.max(...walk)}`);
});

test("Thickets: at least 8 separate wood clumps in every world", () => {
  const n = worldsOf("thickets").map(g => pieces(g, c => g.land[c] === L.WOOD).length);
  assert.ok(Math.min(...n) >= 8, `fewest clumps ${Math.min(...n)}`);
});
test("Tallwood: one body of wood (its largest piece holds two thirds of the wood on average), and no Shade", () => {
  const G = worldsOf("tallwood"), f = G.map(g => { const p = pieces(g, c => g.land[c] === L.WOOD); return Math.max(...p) / p.reduce((a, b) => a + b, 0); });
  const avg = f.reduce((a, b) => a + b, 0) / f.length; console.log(`# tallwood largest wood body: ${(avg * 100).toFixed(0)} % on average, ${(Math.min(...f) * 100).toFixed(0)} % least`);
  assert.ok(avg >= 2 / 3, `average ${avg.toFixed(2)}`);
  assert.ok(G.every(g => !g.shade.some(x => x)), "a Tallwood world has no Shade");
});
test("Tarns: at least 6 tarns (small waters apart from the river) in every world", () => {
  const n = worldsOf("tarns").map(g => { const p = pieces(g, c => g.land[c] === L.WATER).sort((a, b) => b - a); return p.slice(1).filter(s => s <= 2).length; });
  assert.ok(Math.min(...n) >= 6, `fewest tarns ${Math.min(...n)}`);
});
