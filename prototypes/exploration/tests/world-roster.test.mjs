// TK-8, the herd floor: every species holds at least two herds of three or more in its habitat, in every world of the generators that carry
// the floor, placed by construction from the species' own seed stream; so adding a species never moves another's herds, ids or pods.
// Generators 1 and 2 keep their life exactly as it was (their saves hold it, and a save never changes generator).
//   node --test prototypes/exploration/tests/world-roster.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import * as W from "../src/world.mjs";
import { regionKinds } from "../src/regions.mjs";

const SEEDS = Array.from({ length: 1000 }, (_, i) => i);
const worldOf = {};   // gen -> seed -> G, built once
const G_ = (gen, seed) => ((worldOf[gen] ||= {})[seed] ||= W.genWorld(seed, gen));
const life = (gen, seed, roster = W.ROSTER) => W.genLife(G_(gen, seed), seed, roster);

// Where a species stands in a world: its herds are the cells of the reachable component holding 3 or more of it (outside the nest).
function herds(G, cr, sp) {
  const at = new Map(); for (const w of cr) if (w.sp === sp && !w.cv) at.set(w.c, (at.get(w.c) || 0) + 1);
  return [...at].filter(([c, n]) => G.comp[c] === 1 && n >= W.HERD.SIZE).map(([c]) => c);
}
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };

test("1. the floor: 1,000 seeds × each generator, every species has at least 2 herds of 3, in its habitat, on the reachable component", () => {
  // Generators 1 and 2 meet it by luck of the draw with today's three species (measured: 0 misses in 1,000 seeds each); generator 3 by construction.
  assert.deepEqual(W.GENS, [6]);   // the page plays generator 6 only; generators 1 to 4 stay in the module, frozen, and keep their floor (the pure checks below)
  for (const gen of [1, 2, 3, 4]) for (const seed of SEEDS) {
    const G = G_(gen, seed), { cr } = life(gen, seed);
    W.ROSTER.forEach((r, sp) => {
      const own = herds(G, cr, sp);
      assert.ok(own.length >= W.HERD.FLOOR, `gen ${gen} seed ${seed}: ${r.name} has ${own.length} herds`);
      for (const c of own) assert.ok(r.hab.includes(G.land[c]) && G.comp[c] === 1, `gen ${gen} seed ${seed}: ${r.name} herd outside its habitat at ${c}`);
      assert.ok(cr.some(w => w.sp === sp), `gen ${gen} seed ${seed}: ${r.name} present`);
    });
  }
});

test("2. generators 1 and 2 keep their life exactly; only generator 3 holds when the roster grows", () => {
  // Pinned from the page's own genLife on origin/station-gate, seeds 0 to 999 (2,000 worlds compared field by field before the move into src/world.mjs).
  const PIN = { 1: "fab8ffbe", 2: "81740752" };
  for (const gen of [1, 2]) {
    let h = ""; for (const seed of SEEDS) h += fnv(JSON.stringify(life(gen, seed)));
    assert.equal(fnv(h), PIN[gen], `generator ${gen}'s life`);
  }
  // Why generator 3 exists: in 1 and 2 a cell draws from the pool of its habitat, so a new species moves the others; in 3 it cannot (test 3).
  const more = [...W.ROSTER, { name: "Extra", hab: [W.L.MEADOW, W.L.POND, W.L.ROCK, W.L.WOOD] }];
  for (const gen of [1, 2]) {
    let moved = 0; for (const seed of SEEDS.slice(0, 50)) { const a = life(gen, seed), b = life(gen, seed, more); if (JSON.stringify(a.cr.filter(w => w.sp < 3)) !== JSON.stringify(b.cr.filter(w => w.sp < 3))) moved++; }
    assert.ok(moved > 25, `generator ${gen}: a species added moves the others in ${moved} of 50 seeds`);
  }
});

test("3. a species added to the roster never moves another's herds, ids, pods or boldness", () => {
  const more = [...W.ROSTER, { name: "Extra", hab: [W.L.MEADOW, W.L.POND, W.L.ROCK, W.L.WOOD] }, { name: "Narrow", hab: [W.L.POND] }];
  for (const seed of SEEDS) {
    const a = life(3, seed), b = life(3, seed, more), G = G_(3, seed);
    for (let sp = 0; sp < W.ROSTER.length; sp++) {
      assert.deepEqual(b.cr.filter(w => w.sp === sp), a.cr.filter(w => w.sp === sp), `seed ${seed}: species ${sp} creatures (ids included)`);
      assert.deepEqual(b.pods.filter(p => p.sp === sp && p.id !== "cv"), a.pods.filter(p => p.sp === sp && p.id !== "cv"), `seed ${seed}: species ${sp} pods`);
    }
    for (const sp of [3, 4]) assert.ok(herds(G, b.cr, sp).length >= 2, `seed ${seed}: the new species ${sp} holds the floor too`);
    assert.deepEqual(b.pods.find(p => p.id === "cv"), a.pods.find(p => p.id === "cv"));
  }
});

test("4. the nest and the glow cells are the Tuikis's, whatever the roster; the floor places herds only where creatures can be reached", () => {
  for (const seed of SEEDS.slice(0, 200)) {
    const G = G_(3, seed), { cr } = life(3, seed);
    for (const c of G.glow) assert.ok(cr.filter(w => w.sp === 1 && w.c === c && !w.cv).length >= 3, `seed ${seed}: glow ${c}`);
    assert.equal(cr.filter(w => w.sp === 1 && w.c === G.gate && w.cv === 1).length, 4);
    assert.deepEqual(cr.map(w => w.id), cr.map((_, i) => i + 1), "ids run 1.. in order");
    for (const w of cr) assert.ok(w.b >= 0 && w.b < 1 && w.s === 0);
  }
});

// The page is the player's: its first three SPECIES rows take their habitat from the roster (the other seventeen from their families' grounds), new worlds are generator 5, and its genLife is the module's.
const page = (store = {}) => makePage({ store }).run;
test("5. the page: the three starters' SPECIES rows match the roster slot for slot, and a new world holds the floor for them at home", () => {
  const p = page();
  assert.deepEqual(JSON.parse(JSON.stringify(p("SPECIES.slice(0, 3).map(s => [s.name, s.hab])"))), W.ROSTER.map(r => [r.name, r.hab]));
  assert.equal(p("SPECIES.length"), 20, "a row for each of the twenty kinds");
  for (const seed of [3, 11, 42]) {
    p(`newWorld(${seed})`);
    assert.equal(p("S.gen"), 5);
    const cr = JSON.parse(JSON.stringify(p("S.cr"))), G = G_(5, seed);
    W.ROSTER.forEach((r, sp) => assert.ok(herds(G, cr, sp).length >= 2, `${r.name} in the page's world ${seed}`));
  }
});

test("6. a save keeps its generator and its life through a load, and a region of an earlier generator (1 to 4) is read-only, never played or changed", () => {
  const plain = x => JSON.parse(JSON.stringify(x));
  const store = {}, a = page(store);
  a("newWorld(7); save()");
  const key = Object.keys(store).find(k => store[k].includes('"seed":7')), saved = JSON.parse(store[key]), g1 = saved.regions[0];
  assert.equal(g1.gen, 5, "v10 names the generator in the region"); assert.equal("gen" in saved, false);
  const b = page(store);   // a new page boots by loading the save
  assert.equal(b("S.gen"), 5); assert.deepEqual(plain(b("S.cr")), g1.map.cr); assert.deepEqual(plain(b("S.pods")), g1.map.pods); assert.equal(b("G.gen"), 5);
  // a save whose pods are missing is refilled from its own generator's life (the home region's three starters)
  const lost = JSON.parse(store[key]); delete lost.regions[0].map.pods; store[key] = JSON.stringify(lost);
  const c = page(store), mine = W.genLife(W.genWorld(7, 5), 7, regionKinds({ n: 1, biome: "mixed" })).pods;
  assert.deepEqual(plain(c("S.pods")), mine.map(p => ({ ...p })), "refilled pods");
  for (const gen of [1, 2, 3, 4]) {
    const old = JSON.parse(store[key]); old.regions[0].gen = gen; const raw = JSON.stringify(old), s2 = { "mb-companion-A": store["mb-companion-A"], [key]: raw }, d = page(s2);
    assert.equal(d("RT.readOnly"), true, "generator " + gen + ": read-only"); assert.equal(s2[key], raw, "kept as stored");
  }
});
