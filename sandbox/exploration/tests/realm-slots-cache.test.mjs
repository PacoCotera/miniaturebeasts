// The slot cache must not hide history: the 25 slots of a seed are the same with an empty cache (a fresh copy of the module each time),
// in any order of seeds, and after many unrelated calls have filled and cleared the cache.
//   node --test prototypes/exploration/tests/realm-slots-cache.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/regions.mjs";

const url = new URL("../src/regions.mjs", import.meta.url).href;
let n = 0;
const fresh = () => import(url + "?cold=" + (n++));   // a new module instance: an empty slotCache
const slots = M => seed => { const o = []; for (let ay = 0; ay < 5; ay++) for (let ax = 0; ax < 5; ax++) o.push(M.slotBiome(seed, ax, ay, 2)); return o.join(); };
const seeds = Array.from({ length: 300 }, (_, i) => (Math.imul(i + 1, 2654435761) ^ (i * 40503)) >>> 0).concat([0, 1, 2, 7, 42, 2 ** 31, 2 ** 32 - 1]);
const shuffle = (a, k) => { const b = a.slice(); let s = k >>> 0 || 1; for (let i = b.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

test("cold (empty cache) slots equal the warm cached slots, for 300+ seeds", async () => {
  const cold = new Map(); for (const s of seeds) cold.set(s, slots(await fresh())(s));   // each seed on its own empty cache
  const warm = slots(R);
  for (const s of seeds) assert.equal(warm(s), cold.get(s), "seed " + s);
  for (const s of seeds) assert.equal(warm(s), cold.get(s), "seed " + s + " again, cached");
});

test("the order seeds are asked in never changes a seed's slots", async () => {
  const ref = new Map(); const base = slots(await fresh()); for (const s of seeds) ref.set(s, base(s));
  for (const k of [3, 11, 99]) {
    const M = await fresh(), f = slots(M);
    for (const s of shuffle(seeds, k)) assert.equal(f(s), ref.get(s), `order ${k} seed ${s}`);
  }
});

test("many unrelated calls (the cache filling past its limit and clearing) change nothing", async () => {
  const ref = new Map(); const base = slots(await fresh()); for (const s of seeds) ref.set(s, base(s));
  const M = await fresh(), f = slots(M);
  for (let r = 0; r < 4; r++) for (const s of shuffle(seeds, r + 5)) {
    for (let j = 0; j < 3; j++) M.slotBiome((s + j * 7919 + r) >>> 0, j + r, (j * 2 + r) % 5, 2);   // unrelated asks, other seeds and cells
    assert.equal(f(s), ref.get(s), `round ${r} seed ${s}`);
  }
});
