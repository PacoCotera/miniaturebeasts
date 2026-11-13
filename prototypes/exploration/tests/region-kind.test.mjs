// A new realm's regions open as their kind: every region opens with generator 7 and the slot's kind; region 1 is the home; a version 1 realm draws its kinds as it did; a region keeps what it was opened with, through a save and a load. The page's own code, in the sandbox.
// (Generator 7 since 573cb9051: a region is the realm's land at its slot, made from the realm's seed, region 1's.)
//   node --test prototypes/exploration/tests/region-kind.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { genWorld7 } from "../src/world7.mjs";
import * as R from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const plain = x => JSON.parse(JSON.stringify(x));
const digest = G => JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] });

const digestOf = p => p.run("JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] })");

test("openGen: every realm opens its regions with generator 7", () => {
  assert.equal(R.openGen({ biomeV: 2 }), 7); assert.equal(R.openGen({}), 7); assert.equal(R.openGen({ biomeV: 1 }), 7);
});

test("a new realm (kind version 3): region 1 is generator 7's home at its slot; every region opened is generator 7 in its slot's kind", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(11)");
  assert.equal(p.run("S.biomeV"), 3);
  assert.equal(p.run("S.regions[0].gen"), 7); assert.equal(p.run("S.regions[0].biome"), "mixed");
  assert.equal(digestOf(p), digest(genWorld7(11, [2, 2])), "region 1 is the home");
  const seen = new Set();
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 3], [1, 2], [2, 0], [4, 2]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), want = R.slotBiome(11, ax, ay, 2);
    const rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 7); assert.equal(rec.biome, want);
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 7); assert.equal(p.run("G.biome"), want);
    assert.equal(digestOf(p), digest(genWorld7(11, rec.slot)));
    assert.ok(p.run("S.cr.length") > 0 && p.run("S.pods.length") > 0, "it has its own life");
    p.run("mountRegion('g1')"); seen.add(want);
  }
  assert.equal(p.run("S.here"), "g1"); assert.equal(p.run("G.gen"), 7);
  assert.ok(seen.size >= 3, [...seen].join());
});

test("a region keeps its generator and kind through a save and a load, mounted or not", () => {
  const store = {}, p = makePage({ gen: 7, console: "silent", store });
  p.run("newWorld(11)");
  const id = p.run("openRegion([2, 1])"); p.run(`mountRegion(${JSON.stringify(id)})`); p.run("save()");
  const want = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
  const q = makePage({ gen: 7, console: "silent", store });   // boots from the save: the region is mounted
  assert.equal(q.run("S.here"), id); assert.equal(q.run("G.gen"), 7); assert.equal(q.run("G.biome"), want.biome);
  assert.equal(digestOf(q), digest(genWorld7(11, want.slot)));
  assert.deepEqual(plain(q.run(`({ gen: regionById(S, ${JSON.stringify(id)}).gen, biome: regionById(S, ${JSON.stringify(id)}).biome })`)), { gen: 7, biome: want.biome });
});

test("a version 1 realm records its regions' kinds as it did (the older four), on generator 7", () => {
  // Generator 7 draws a region's land by its own kind (genRegion7), and every save is generator 7 since the reset, so a realm without biomeV exists only here: the record keeps the older draw; the land is the slot's.
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(11); delete S.biomeV");
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 0]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 7); assert.equal(rec.biome, R.slotBiome(11, ax, ay, 1)); assert.ok(R.BIOMES_V1.includes(rec.biome));
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 7);
    assert.equal(digestOf(p), digest(genWorld7(11, rec.slot)));
    p.run("mountRegion('g1')");
  }
});
