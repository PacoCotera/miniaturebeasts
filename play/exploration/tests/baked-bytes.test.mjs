// baked-package-8: a baked cell is .mbplace bytes (format 2); write -> read -> adaptCell gives an equal cell to the one the generator made
//   node --test prototypes/exploration/tests/baked-bytes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PLACES, makePage } from "./page-harness.mjs";
import { bakedCell, layout7, genWorld7 } from "../src/gen7/world7.mjs";
import { writeBaked, readBaked } from "../../places/src/format/baked.mjs";
import { writePlace } from "../../places/src/format/write.mjs";
import { readPlace } from "../../places/src/format/read.mjs";
import { MW, MH } from "../src/logic/world.mjs";

const ctx = PLACES.ctx, v = 3;
const slots = {};   // the region a new world of the seed starts in, as the page makes it
const slotOf = (seed) => slots[seed] || (slots[seed] = (() => { const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed});`); return JSON.parse(p.run("JSON.stringify(G.slot)")); })());
const plain = (o) => JSON.parse(JSON.stringify(o, (k, x) => (typeof x === "function" ? undefined : ArrayBuffer.isView(x) ? { t: x.constructor.name, a: Array.from(x) } : x)));   // functions go; typed arrays are compared by contents

function same(seed, cell, at) {
  const slot = at || slotOf(seed), G = genWorld7(seed, slot), b =bakedCell(ctx, seed, slot, cell, v), bytes = writeBaked(b.ir, b.place, { seed, cell }), r = readBaked(bytes);
  assert.equal(r.seed, seed); assert.equal(r.cell, cell);
  const a = layout7(ctx, G, seed, slot, String(cell), () => false, v, b), c = layout7(ctx, G, seed, slot, String(cell), () => false, v, { ir: r.ir, place: r.place });
  assert.deepEqual(plain(c), plain(a), `seed ${seed} cell ${cell}: the cell read from the bytes lays what the generator's does`);
  return { bytes: bytes.length, lay: c };
}

test("seeds 7, 36, 42: write -> read -> adaptCell gives an equal cell to the generator's (sample of cells each)", () => {
  for (const seed of [7, 36, 42]) {
    const G = genWorld7(seed, slotOf(seed)); let n = 0;
    for (let c = 0; c < MW * MH && n < 14; c += 7) { if (!G.land || G.land[c] == null) continue; same(seed, c); n++; }
    assert.ok(n >= 8, "cells were compared");
  }
});

test("seed 36 cell 89 has rimSteps and they come back from the bytes", () => {
  const slot = [2, 2], { lay } = same(36, 89, slot), b = bakedCell(ctx, 36, slot, 89, v), r = readBaked(writeBaked(b.ir, b.place, { seed: 36, cell: 89 }));
  assert.equal(b.place.rimSteps.length, b.place.w * b.place.h, "the bake made rim steps, a byte a tile");
  assert.deepEqual(Array.from(r.place.rimSteps), Array.from(b.place.rimSteps));
  assert.equal(lay.rimSteps.length, 24 * 28);
});

test("seed 1 cells 211 / 200 / 163: the slabs, and what is under each, come out of the bytes the same as the generator's", () => {
  const want = { 211: "pod", 200: "mat", 163: "find" };
  for (const [cell, under] of Object.entries(want)) {
    const { lay } = same(1, +cell), s = lay.feats.filter(q => q.kind === "s");
    assert.equal(s.length, 1, `cell ${cell} lays one slab`); assert.equal(s[0].under, under);
  }
});

test("the seed and the cell are in the bytes (adaptCell's hashes read them, never generator state)", () => {
  const b = bakedCell(ctx, 1, slotOf(1), 211, v), p = readPlace(writeBaked(b.ir, b.place, { seed: 1, cell: 211 }));
  assert.equal(p.formatVersion, 2); assert.equal(p.seed, 1); assert.equal(p.cell, 211);
});

test("a place of format 1 is not read as a baked cell; a format 1 place still reads", () => {
  const b = bakedCell(ctx, 7, slotOf(7), 100, v), one = writePlace({ ...b.place, formatVersion: 1 });
  assert.throws(() => readBaked(one), /format 1/);
  assert.equal(readPlace(one).formatVersion, 1);
  assert.throws(() => readPlace(writePlace({ ...b.place, formatVersion: 3 })), /format version 3/);
});
