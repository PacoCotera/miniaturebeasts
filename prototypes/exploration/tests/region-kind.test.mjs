// A new realm's regions open as their kind: every region opens with generator 5 and the slot's kind; region 1 is the Meadows; a version 1 realm draws its kinds as it did; a region keeps what it was opened with, through a save and a load. The page's own code, in the sandbox.
//   node --test prototypes/exploration/tests/region-kind.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import * as R from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const plain = x => JSON.parse(JSON.stringify(x));
const digest = G => JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] });

const digestOf = p => p.run("JSON.stringify({ land: [...G.land], level: [...G.level], edge: [...G.edge], comp: [...G.comp], gate: G.gate, mouth: G.mouth, spawns: [...G.spawns] })");

test("openGen: every realm opens its regions with generator 5", () => {
  assert.equal(R.openGen({ biomeV: 2 }), 5); assert.equal(R.openGen({}), 5); assert.equal(R.openGen({ biomeV: 1 }), 5);
});

test("a version 2 realm: region 1 is generator 5's Meadows; every region opened is generator 5 in its slot's kind", () => {
  const p = makePage({ console: "silent" });
  p.run("newWorld(11)");
  assert.equal(p.run("S.biomeV"), 2);
  assert.equal(p.run("S.regions[0].gen"), 5); assert.equal(p.run("S.regions[0].biome"), "mixed");
  assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(11, 5)), "region 1 is the Meadows");
  const seen = new Set();
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 3], [1, 2], [2, 0], [4, 2]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), want = R.slotBiome(11, ax, ay, 2);
    const rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 5); assert.equal(rec.biome, want);
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 5); assert.equal(p.run("G.biome"), want);
    assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(rec.seed, 5, want)));
    assert.ok(p.run("S.cr.length") > 0 && p.run("S.pods.length") > 0, "it has its own life");
    p.run("mountRegion('g1')"); seen.add(want);
  }
  assert.equal(p.run("S.here"), "g1"); assert.equal(p.run("G.gen"), 5);
  assert.ok(seen.size >= 3, [...seen].join());
});

test("a region keeps its generator and kind through a save and a load, mounted or not", () => {
  const store = {}, p = makePage({ console: "silent", store });
  p.run("newWorld(11)");
  const id = p.run("openRegion([2, 1])"); p.run(`mountRegion(${JSON.stringify(id)})`); p.run("save()");
  const want = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
  const q = makePage({ console: "silent", store });   // boots from the save: the region is mounted
  assert.equal(q.run("S.here"), id); assert.equal(q.run("G.gen"), 5); assert.equal(q.run("G.biome"), want.biome);
  assert.equal(digestOf(q, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(want.seed, 5, want.biome)));
  assert.deepEqual(plain(q.run(`({ gen: regionById(S, ${JSON.stringify(id)}).gen, biome: regionById(S, ${JSON.stringify(id)}).biome })`)), { gen: 5, biome: want.biome });
});

test("a version 1 realm draws its regions' kinds as it did (the older four), on generator 5", () => {
  const p = makePage({ console: "silent" });
  p.run("newWorld(11); delete S.biomeV");
  for (const [ax, ay] of [[2, 1], [3, 2], [2, 0]]) {
    const id = p.run(`openRegion([${ax}, ${ay}])`), rec = plain(p.run(`regionById(S, ${JSON.stringify(id)})`));
    assert.equal(rec.gen, 5); assert.equal(rec.biome, R.slotBiome(11, ax, ay, 1)); assert.ok(R.BIOMES_V1.includes(rec.biome));
    p.run(`mountRegion(${JSON.stringify(id)})`);
    assert.equal(p.run("G.gen"), 5); assert.equal(p.run("G.biome"), rec.biome);
    assert.equal(digestOf(p, "{ land: G.land, level: G.level, edge: G.edge, comp: G.comp, gate: G.gate, mouth: G.mouth, spawns: G.spawns }"), digest(W.genWorld(rec.seed, 5, rec.biome)));
    p.run("mountRegion('g1')");
  }
});
