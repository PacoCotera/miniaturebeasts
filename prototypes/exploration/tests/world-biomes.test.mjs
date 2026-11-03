// Generator 4, biomes (src/world.mjs genWorld4): its golden vectors by biome, generators 1 to 3 untouched, the land shares over 200 seeds
// against the design table, the walkable floor, the Fells' stairs and height changes against generator 2, the Shade, the doubled habitat
// herds, and every species in every biome.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as W from "../src/world.mjs";
import { seedDigest, SEEDS, placeKeys2, placeDigest } from "../tools/world-vectors.mjs";

const { L, EDGE, MW, MH } = W, N = MW * MH;
const VECTORS = JSON.parse(readFileSync(new URL("./world-vectors.json", import.meta.url), "utf8"));
const api = (gen, biome) => ({ gen, hash: W.hash, L, EDGE, genWorld: s => W.genWorld(s, gen, biome), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells,
  roster: W.ROSTER, genLife: (G, seed) => W.genLife(G, seed, W.ROSTER) });
const seeds200 = Array.from({ length: 200 }, (_, i) => i);
// the land-share table: meadow, wood, rock, pond edge, water (the table's cliff column is not drawn as cliff cells: generator 4 stands on generator 2's ground)
const TABLE = { mixed: [41, 22, 15, 9, 11], woods: [18, 50, 10, 8, 10], fells: [24, 12, 38, 6, 10], marsh: [26, 14, 8, 30, 20] };
const LANDS = [L.MEADOW, L.WOOD, L.ROCK, L.POND, L.WATER];
const worlds = {};   // seeds 0..199 by biome, made once
const worldsOf = b => worlds[b] || (worlds[b] = seeds200.map(s => W.genWorld(s, 4, b)));

test("generator 4: the vectors by biome, field by field, roster column included (16 seeds each)", () => {
  assert.deepEqual(Object.keys(VECTORS.gens["4"].biomes), W.BIOMES);
  for (const b of W.BIOMES) {
    const seeds = VECTORS.gens["4"].biomes[b].seeds;
    assert.deepEqual(seeds.map(s => s.seed), SEEDS);
    for (const want of seeds) assert.deepEqual(seedDigest(api(4, b), want.seed), want, `${b} seed ${want.seed}`);
  }
});

test("generator 4: mixed is generator 3's ground to the bit; the other biomes are not", () => {
  for (const want of VECTORS.gens["3"].seeds) {
    const m = VECTORS.gens["4"].biomes.mixed.seeds.find(s => s.seed === want.seed);
    for (const k of ["land", "ford", "island", "comp", "gate", "mouth", "deep", "swim", "spawns", "glow", "level", "edge", "cross"]) assert.deepEqual(m.world[k], want.world[k], `${want.seed} ${k}`);
    assert.deepEqual(m.places, want.places, `${want.seed} places`);
    assert.equal(m.world.biome, "mixed");
  }
  assert.notEqual(VECTORS.gens["4"].biomes.woods.seeds[0].world.land, VECTORS.gens["3"].seeds[0].world.land);
});

test("generators 1 to 3 are bit-identical to their vectors, and NEW_GEN stays 3", () => {
  const a1 = { gen: 1, hash: W.hash, L, genWorld: s => W.genWorld(s, 1), genPlace: W.genPlace, beaconCells: W.beaconCells, depotCells: W.depotCells, roster: W.ROSTER, genLife: (G, s) => W.genLife(G, s, W.ROSTER) };
  for (const [gen, a] of [[1, a1], [2, api(2)], [3, api(3)]]) for (const want of VECTORS.gens[String(gen)].seeds.slice(0, 6)) assert.deepEqual(seedDigest(a, want.seed), want, `gen ${gen} seed ${want.seed}`);
  assert.equal(W.NEW_GEN, 3); assert.deepEqual(W.GENS, [1, 2, 3, 4]);
});

test("an unknown biome is refused, gen 4 has no cliff cells, and the world is deterministic", () => {
  assert.throws(() => W.genWorld(1, 4, "desert"), RangeError);
  assert.deepEqual(W.genWorld(5, 4, "woods").land, W.genWorld(5, 4, "woods").land);
  for (const b of W.BIOMES) assert.ok(worldsOf(b).every(G => !G.land.includes(L.CLIFF) && G.gen === 4 && G.biome === b));
});

for (const b of W.BIOMES) test(`${b}: land shares over 200 seeds within 3 points of the table, 260 walkable cells or more, no fallback ground`, () => {
  const G = worldsOf(b), got = LANDS.map(l => G.reduce((n, g) => n + g.land.reduce((m, x) => m + (x === l ? 1 : 0), 0), 0) / seeds200.length / N * 100);
  got.forEach((v, i) => assert.ok(Math.abs(v - TABLE[b][i]) <= 3, `${b} ${["meadow", "wood", "rock", "pond", "water"][i]}: ${v.toFixed(1)} against ${TABLE[b][i]}`));
  const walk = G.map(g => g.comp.reduce((n, x) => n + x, 0));
  assert.ok(Math.min(...walk) >= W.WALK_MIN, `${b}: fewest walkable ${Math.min(...walk)}`);
  assert.ok(G.every(g => g.attempt < 8), `${b}: no seed fell back to the flat attempt`);
  console.log(`# ${b}: ` + got.map(v => v.toFixed(1)).join(" / ") + ` (meadow wood rock pond water), walkable ${Math.min(...walk)} to ${Math.max(...walk)}`);
});

test("every biome keeps generator 2's invariants: levels, a start near the gate, places and stairs come out", () => {
  for (const b of W.BIOMES) for (const s of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const G = W.genWorld(s, 4, b), lv = G.level;
    for (let c = 0; c < N; c++) { const x = c % MW, y = (c / MW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; assert.ok(Math.abs(lv[c] - lv[Y * MW + X]) <= 1, `${b} ${s} step`); } }
    assert.equal(G.spawns.length, 5); assert.ok(G.comp[G.gate] && G.comp[G.deep] && G.spawns.every(c => G.comp[c]));
    for (const key of placeKeys2(G, L, [...G.beacons.set], [...G.depots.set], EDGE)) { const lay = W.genPlace(G, s, key); assert.ok(lay.reach[lay.spawnPt.y * W.PW + lay.spawnPt.x], `${b} ${s} ${key} spawn reachable`); }
  }
});

// the share of the cliff edges that lie in a straight wall of 4 or more edges (a wall is the run of cliff and stair edges along one line)
const wallShare = gs => { let cliffs = 0, inWall = 0;
  for (const g of gs) { const e = g.edge, wall = k => k !== EDGE.OPEN;
    for (let c = 0; c < N; c++) for (const o of [0, 1]) if (e[2 * c + o] === EDGE.CLIFF) cliffs++;
    for (const [idx, step] of [[c => 2 * c, MW], [c => 2 * c + 1, 1]]) { const seen = new Uint8Array(N);
      for (let c = 0; c < N; c++) { if (seen[c] || !wall(e[idx(c)])) continue; let n = 0, k = c, cl = 0;
        while (k < N && wall(e[idx(k)])) { seen[k] = 1; n++; if (e[idx(k)] === EDGE.CLIFF) cl++; if (step === 1 && (k + 1) % MW === 0) break; k += step; }
        if (n >= 4) inWall += cl; } } }
  return 100 * inWall / cliffs; };

test("Fells: a valley river with long walls and at least twice the stairs of Meadows; Marsh: twice the fords; Woods and Meadows keep generator 2's", () => {
  const count = (gs, kind) => gs.reduce((n, g) => n + g.edge.reduce((m, e) => m + (e === kind ? 1 : 0), 0), 0) / gs.length;
  const g2 = seeds200.map(s => W.genWorld(s, 2)), fells = worldsOf("fells");
  const r = count(fells, EDGE.RAMP) / count(g2, EDGE.RAMP), runs = wallShare(fells), meadows = wallShare(worldsOf("mixed"));
  console.log(`# fells against generator 2: stairs x${r.toFixed(2)}, cliff edges x${(count(fells, EDGE.CLIFF) / count(g2, EDGE.CLIFF)).toFixed(2)}; cliff edge in walls of 4+: fells ${runs.toFixed(1)}%, meadows ${meadows.toFixed(1)}%`);
  assert.ok(r >= 2, `stairs x${r}`); assert.ok(runs >= 43, `walls of 4+: ${runs}%`);
  // the valley: the river's two banks rise, so the high ground is on both sides of it and the low ground along it
  for (const g of fells.slice(0, 40)) { const wx = [...Array(MH).keys()].map(y => [...Array(MW).keys()].filter(x => g.land[y * MW + x] === L.WATER));
    const lvAt = (y, x) => (x >= 0 && x < MW ? g.level[y * MW + x] : 0), lo = y => wx[y].length ? wx[y][0] : -1, hi = y => wx[y].length ? wx[y][wx[y].length - 1] : -1;
    let both = 0, rows = 0; for (let y = 0; y < MH; y++) { if (lo(y) < 0) continue; rows++; if (lvAt(y, Math.max(0, lo(y) - 6)) > lvAt(y, lo(y) - 1) && lvAt(y, Math.min(MW - 1, hi(y) + 6)) > lvAt(y, hi(y) + 1)) both++; }
    assert.ok(both >= rows / 3, `seed ${g.seed}: the ground rises on both banks in ${both} of ${rows} rows`); }
  // rock stands on the high ground: its mean level is above the wood's and the meadow's
  let rk = 0, ot = 0, nr = 0, no = 0; for (const g of fells) for (let c = 0; c < N; c++) { if (g.land[c] === L.ROCK) { rk += g.level[c]; nr++; } else if (g.land[c] === L.MEADOW || g.land[c] === L.WOOD) { ot += g.level[c]; no++; } }
  assert.ok(rk / nr > ot / no + .3, `rock level ${(rk / nr).toFixed(2)} against ${(ot / no).toFixed(2)}`);
  const fords = gs => gs.reduce((n, g) => n + g.ford.reduce((m, x) => m + x, 0), 0) / gs.length;
  const f = fords(worldsOf("marsh")) / fords(g2); console.log(`# marsh fords x${f.toFixed(2)}`);
  assert.ok(f >= 1.8, `fords x${f}`);
  assert.ok(Math.abs(count(worldsOf("woods"), EDGE.RAMP) / count(g2, EDGE.RAMP) - 1) < .25);
});

// the 4-connected bodies of the cells whose land is in `set`, largest first
const bodies = (G, set) => { const seen = new Uint8Array(N), out = [];
  for (let s = 0; s < N; s++) { if (seen[s] || !set.includes(G.land[s])) continue; const q = [s]; seen[s] = 1; let n = 0;
    while (q.length) { const c = q.pop(); n++; const x = c % MW, y = (c / MW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const d = Y * MW + X; if (!seen[d] && set.includes(G.land[d])) { seen[d] = 1; q.push(d); } } }
    out.push(n); }
  return out.sort((a, b) => b - a); };

test("Woods: a brook from the north or the west with one ford line; one forest body with 2 to 4 glades", () => {
  let north = 0, west = 0, big = 0, glades = 0;
  for (const g of worldsOf("woods")) {
    const top = [...Array(MW).keys()].filter(x => g.land[x] === L.WATER && x >= 2 && x <= 13).length, left = [...Array(MH).keys()].filter(y => g.land[y * MW] === L.WATER && y >= 2 && y <= 13).length;
    assert.ok(top || left, "the brook enters on the north or the west edge, in columns or rows 2 to 13");
    north += top ? 1 : 0; west += left ? 1 : 0;
    const fc = [...Array(N).keys()].filter(c => g.ford[c]);
    assert.ok(fc.length >= 1 && (new Set(fc.map(c => c % MW)).size === 1 || new Set(fc.map(c => (c / MW) | 0)).size === 1), "one ford line");
    const wood = bodies(g, [L.WOOD]), open = bodies(g, [L.MEADOW, L.ROCK, L.POND]);
    big += wood[0] / wood.reduce((a, v) => a + v, 0);
    const k = open.filter(n => n >= 6).length; if (k >= 2 && k <= 4) glades++;
  }
  console.log(`# woods: brook north ${north}, west ${west}; biggest wood body ${(100 * big / 200).toFixed(0)}% of the wood; 2 to 4 glades in ${glades} of 200`);
  assert.ok(north >= 40 && west >= 40, "both entries occur");
  assert.ok(big / 200 >= .6, "one forest body");
  assert.ok(glades >= 150, "2 to 4 glades in three of four seeds");
});

test("Marsh: braided channels from edge to edge, six grown pools of 3 to 6 cells, no straight one-wide run of 3 or more", () => {
  let braids = 0;
  for (const g of worldsOf("marsh")) {
    const seen = new Uint8Array(N), comps = [];
    for (let s = 0; s < N; s++) { if (seen[s] || g.land[s] !== L.WATER) continue; const q = [s], cells = new Set([s]); seen[s] = 1;
      while (q.length) { const c = q.pop(), x = c % MW, y = (c / MW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const d = Y * MW + X; if (!seen[d] && g.land[d] === L.WATER) { seen[d] = 1; cells.add(d); q.push(d); } } }
      comps.push(cells); }
    const pools = comps.filter(c => c.size <= 6), chans = comps.filter(c => c.size > 6);
    assert.equal(pools.length, 6, `seed ${g.seed}: ${pools.length} pools`);
    for (const P of pools) { assert.ok(P.size >= 3, `seed ${g.seed}: a pool of ${P.size}`);
      const has = (x, y) => P.has(y * MW + x);
      for (const c of P) { const x = c % MW, y = (c / MW) | 0;
        assert.ok(!(has(x + 1, y) && has(x + 2, y) && [0, 1, 2].every(i => !has(x + i, y - 1) && !has(x + i, y + 1))), `seed ${g.seed}: a straight run along row ${y}`);
        assert.ok(!(has(x, y + 1) && has(x, y + 2) && [0, 1, 2].every(i => !has(x - 1, y + i) && !has(x + 1, y + i))), `seed ${g.seed}: a straight run down column ${x}`); } }
    const top = [...chans].some(c => [...c].some(w => w < MW)), bottom = chans.some(c => [...c].some(w => w >= N - MW));
    assert.ok(top && bottom, `seed ${g.seed}: water reaches both ends`);
    const rows = []; for (let y = 0; y < MH; y++) { let n = 0, prev = false; for (let x = 0; x < MW; x++) { const w = g.land[y * MW + x] === L.WATER && !pools.some(P => P.has(y * MW + x)); if (w && !prev) n++; prev = w; } rows.push(n); }
    if (rows.some(n => n >= 2)) braids++;
  }
  console.log(`# marsh: ${braids} of 200 worlds have a row crossed by two channels`);
  assert.ok(braids >= 150, "the channels braid");
});

test("Woods: one in three reachable wood places is the Shade, on the most enclosed wood; the others have none", () => {
  for (const g of worldsOf("woods").slice(0, 50)) {
    const wood = [...Array(N).keys()].filter(c => g.land[c] === L.WOOD && g.comp[c] && !g.island[c]), sh = wood.filter(c => g.shade[c]);
    assert.equal(sh.length, Math.floor(wood.length / 3)); assert.ok(g.shade.every((v, c) => !v || wood.includes(c)));
  }
  for (const b of ["mixed", "fells", "marsh"]) assert.ok(worldsOf(b).slice(0, 20).every(g => g.shade.every(v => v === 0)));
});

test("every species in every biome: a herd floor of 2 or more, creatures and buried pods; the habitat's herds doubled", () => {
  const herds = (G, cr, sp, only) => { const at = new Map(); for (const w of cr) if (w.sp === sp && !w.cv) at.set(w.c, (at.get(w.c) || 0) + 1);
    return [...at].filter(([c, n]) => G.comp[c] === 1 && n >= W.HERD.SIZE && (only == null || G.land[c] === only)).length; };
  for (const b of W.BIOMES) for (let s = 0; s < 60; s++) { const G = worldsOf(b)[s], { cr, pods } = W.genLife(G, s, W.ROSTER);
    W.ROSTER.forEach((r, sp) => { assert.ok(cr.some(w => w.sp === sp && !w.cv), `${b} ${s} species ${sp}`); assert.ok(herds(G, cr, sp) >= W.HERD.FLOOR, `${b} ${s} herds ${sp}`); assert.ok(pods.some(p => p.sp === sp)); }); }
  // a biome's habitat species: at least twice the herds on its land that generator 3's life gives the same ground
  for (const b of ["woods", "fells", "marsh"]) { const hl = W.BIOME_HABITAT[b]; let a = 0, d = 0;
    for (let s = 0; s < 60; s++) { const G = worldsOf(b)[s], G3 = { ...G, gen: 3 }, l4 = W.genLife(G, s, W.ROSTER), l3 = W.genLife(G3, s, W.ROSTER);
      W.ROSTER.forEach((r, sp) => { if (!r.hab.includes(hl)) return; a += herds(G, l3.cr, sp, hl); d += herds(G, l4.cr, sp, hl); }); }
    console.log(`# ${b}: habitat herds ${a} -> ${d}`); assert.ok(d >= 1.9 * a, `${b}: ${a} -> ${d}`); }
  // a species the biome's land does not hold is as generator 3 has it
  const G = worldsOf("fells")[3], l4 = W.genLife(G, 3, W.ROSTER), l3 = W.genLife({ ...G, gen: 3 }, 3, W.ROSTER);
  assert.deepEqual(l4.cr.filter(w => w.sp === 0), l3.cr.filter(w => w.sp === 0), "Loika is not a Fells habitat species");
});
