// A new realm's regions open as their kind: a version 2 realm opens each region with generator 4 and the slot's kind; region 1 stays generator 3's
// Meadows; a version 1 realm opens as it did; a region keeps what it was opened with, through a save and a load. The page's own code, in the sandbox.
//   node --test prototypes/exploration/tests/region-kind.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import * as R from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const plain = x => JSON.parse(JSON.stringify(x));
const digest = G => JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] });

const digestOf = p => p.run("JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] })");

test("openGen: version 2 realms open with generator 4, version 1 with generator 3", () => {
  assert.equal(R.openGen({ biomeV: 2 }), 4); assert.equal(R.openGen({}), 3); assert.equal(R.openGen({ biomeV: 1 }), 3);
});

test("a version 2 realm: region 1 is generator 3's world; every region opened is generator 4 in its slot's kind", () => {
  const p = makePage({ console: "silent" });
  p.run("newWorld(11)");
  assert.equal(p.run("S.biomeV"), 2);
  assert.equal(p.run("S.regions[0].gen"), 3); assert.equal(p.run("S.regions[0].biome"), "mixed");
  assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(11, 3)), "region 1 is as it was");
  const seen = new Set();
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 3], [1, 2], [2, 0], [4, 2]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), want = R.slotBiome(11, ax, ay, 2);
    const rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 4); assert.equal(rec.biome, want);
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 4); assert.equal(p.run("G.biome"), want);
    assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(rec.seed, 4, want)));
    assert.ok(p.run("S.cr.length") > 0 && p.run("S.pods.length") > 0, "it has its own life");
    p.run("mountRegion('g1')"); seen.add(want);
  }
  assert.equal(p.run("S.here"), "g1"); assert.equal(p.run("G.gen"), 3);
  assert.ok(seen.size >= 3, [...seen].join());
});

test("a region keeps its generator and kind through a save and a load, mounted or not", () => {
  const store = {}, p = makePage({ console: "silent", store });
  p.run("newWorld(11)");
  const id = p.run("openRegion([2, 1])"); p.run(`mountRegion(${JSON.stringify(id)})`); p.run("save()");
  const want = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
  const q = makePage({ console: "silent", store });   // boots from the save: the region is mounted
  assert.equal(q.run("S.here"), id); assert.equal(q.run("G.gen"), 4); assert.equal(q.run("G.biome"), want.biome);
  assert.equal(digestOf(q, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(want.seed, 4, want.biome)));
  assert.deepEqual(plain(q.run(`({ gen: regionById(S, ${JSON.stringify(id)}).gen, biome: regionById(S, ${JSON.stringify(id)}).biome })`)), { gen: 4, biome: want.biome });
});

test("a version 1 realm opens as it did: generator 3, the older kinds, no new ground", () => {
  const p = makePage({ console: "silent" });
  p.run("newWorld(11); delete S.biomeV");
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 0]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 3); assert.equal(rec.biome, R.slotBiome(11, ax, ay, 1)); assert.ok(R.BIOMES_V1.includes(rec.biome));
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 3); assert.equal(p.run("G.biome"), undefined);
    assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(rec.seed, 3)));
    p.run("mountRegion('g1')");
  }
});
