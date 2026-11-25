// baked-package-1: the Station bakes the Companion's region into one package. For seed 36 (the owner's #136 save: out at cell 89, reach of 18) and a fresh seed (a world at rest: its first spawn), every cell of the floor
// (start, reach, ring) in the package equals the cell the Companion's worker bakes today (the worker's own module, run here as the page runs it), byte for byte; the header names the order start, reach, ring, rest.
// The store: the cells are written as they land, a rev or tile set is another package, the old one goes once the new one is whole.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wantOf, bakePackage } from "../src/package-baker.mjs";
import * as store from "../../exploration/src/package-store.mjs";
import { memKv } from "../../exploration/src/package-store.mjs";
import * as W7 from "../../exploration/src/world7.mjs";
import { biomeVersion } from "../../exploration/src/regions.mjs";
import { realm7 } from "../../exploration/src/gen7/region.mjs";
import { decorSites, madeBanks } from "../../exploration/src/gen7/place.mjs";
import { placesTag } from "../../exploration/src/place-store.mjs";
import { readTileSet } from "../../places/src/format/read.mjs";

const R = new URL("../../", import.meta.url), bytes = (p) => new Uint8Array(readFileSync(new URL(p, R)));
const tsB = bytes("places/baked/ninja-test.mbtiles"), terB = bytes("places/baked/terrain.json"), layB = bytes("exploration/art/gen7/layers.json");
const kit = { ctx: { ts: readTileSet(tsB), terrains: JSON.parse(new TextDecoder().decode(terB)).terrains, desc: W7.reviveLayers(JSON.parse(new TextDecoder().decode(layB))) }, tag: placesTag(tsB, terB, layB) };

// the places worker's own module (exploration/src/realm-worker.mjs) run in this thread behind a Worker's face: the same messages in and out
const SELF = { postMessage: (m) => setImmediate(() => cur && cur.onmessage && cur.onmessage({ data: m })), onmessage: null };
globalThis.self = SELF; await import("../../exploration/src/realm-worker.mjs");
let cur = null;
const makeWorker = () => (cur = { onmessage: null, onerror: null, postMessage: (m) => setImmediate(() => SELF.onmessage({ data: m })), terminate() { cur = null; } });
const deps = (kv, extra = {}) => ({ store, kv, kit, makeWorker, now: () => performance.now(), realm: async (seed) => { realm7(seed); }, world: { genWorld7: W7.genWorld7, realm7, decorSites, madeBanks }, ...extra });

const saves = {
  "seed 36 (his #136 save, out at 89)": JSON.parse(readFileSync(new URL("./fixtures/package-save-136.json", import.meta.url), "utf8")),
  "a fresh world (seed 7, at rest)": { seed: 7, here: "g1", tier: 1, biomeV: 3, regions: [{ id: "g1", seed: 7, gen: 7, slot: [2, 2], biome: "mixed" }] },
};

for (const [name, sv] of Object.entries(saves)) {
  test(`${name}: the floor of the package equals today's worker bake, in the order start, reach, ring, rest`, async () => {
    const want = wantOf(sv, biomeVersion); assert.ok(want);
    realm7(want.seed);
    const G = W7.genWorld7(want.seed, want.slot), order = store.bakeOrder(G, want.exp ? { pos: want.exp.pos, reach: want.exp.reach } : { start: G.spawns[0], tier: want.tier });
    // the order: the start first, then its reach, then the ring next to the reach, then the rest nearest first
    assert.equal(order.cells[0], order.head);
    assert.deepEqual(order.cells.slice(1, 1 + order.reach.length), order.reach);
    assert.deepEqual(order.cells.slice(1 + order.reach.length, order.floor), order.ring);
    assert.deepEqual(order.cells.slice(order.floor), order.rest);
    if (want.exp) assert.deepEqual([...order.reach].sort((a, b) => a - b), want.exp.reach.filter((c) => c !== order.head).sort((a, b) => a - b), "the expedition's own reach");
    assert.ok(order.ring.length > 0 && order.ring.every((c) => !order.reach.includes(c) && c !== order.head));
    const d = (c) => Math.max(Math.abs((c % 16) - (order.head % 16)), Math.abs(((c / 16) | 0) - ((order.head / 16) | 0)));
    assert.ok(order.rest.every((c, i) => i === 0 || d(order.rest[i - 1]) <= d(c)), "the rest nearest first");
    assert.equal(new Set(order.cells).size, order.cells.length, "no cell twice");
    const kv = memKv(), r = await bakePackage(want, deps(kv, { limit: order.floor }));
    assert.equal(r.header.done, order.floor);
    assert.deepEqual(r.header.order, order.cells, "the header's order");
    const meta = { seed: want.seed, slot: want.slot, v: want.v, tag: kit.tag }, id = store.packageId(meta);
    for (const c of order.cells.slice(0, order.floor)) {
      const have = await store.readCell(kv, id, c), today = W7.bakedCell(kit.ctx, want.seed, want.slot, c, want.v);   // what the Companion bakes for itself
      assert.deepStrictEqual(have, { ir: today.ir, place: today.place }, "cell " + c);
      assert.equal(r.header.sha[c], await store.shaOfPlace(today.place), "sha of cell " + c);
    }
  });
}

test("the package is written as the cells land, resumes where it was, and the old revision goes once the new one is whole", async () => {
  const kv = memKv(), sv = saves["a fresh world (seed 7, at rest)"], want = wantOf(sv, biomeVersion);
  const old = { ...want, v: want.v }, oldMeta = { seed: want.seed, slot: want.slot, v: want.v, tag: "oldtag" }, oldId = store.packageId(oldMeta);
  await kv.set(oldId + "#head", { id: oldId, whole: true }); await kv.set(oldId + "#c5", { ir: 1, place: 1 });
  await kv.set("pkg7:1.1:99:2,2:3#head", { id: "pkg7:1.1:99:2,2:3", whole: true });   // another world's package is not this one's to remove
  realm7(want.seed);
  const part = await bakePackage(want, deps(kv, { limit: 2 }));
  assert.equal(part.header.done, 2); assert.equal(part.header.whole, false); assert.ok(await kv.get(oldId + "#head"), "the old one stays while the new one grows");
  const G = W7.genWorld7(want.seed, want.slot), order = store.bakeOrder(G, { start: G.spawns[0], tier: 1 }), h = await store.openPackage(kv, { seed: want.seed, slot: want.slot, v: want.v, tag: kit.tag }, order);
  assert.equal(h.header.done, 2, "a second run keeps the cells in"); assert.equal(h.todo.length, order.cells.length - 2); assert.deepEqual(h.todo, order.cells.slice(2));
  for (const c of h.todo) await store.putCell(h, c, { ir: {}, place: {} }, "x");
  assert.equal(await store.finishPackage(h), true);
  assert.equal(await kv.get(oldId + "#head"), undefined, "the old revision is removed"); assert.equal(await kv.get(oldId + "#c5"), undefined);
  assert.ok(await kv.get("pkg7:1.1:99:2,2:3#head"), "another world's package stays");
  assert.equal((await store.findPackage(kv, { seed: want.seed, slot: want.slot, v: want.v, tag: kit.tag })).whole, true);
  assert.equal(await store.findPackage(kv, { ...oldMeta, tag: "other" }), null, "a changed tile set is a package of its own");
  assert.equal(old.v, want.v);
});

test("wantOf reads the region from the save; no generator 7 world, no package", () => {
  assert.equal(wantOf(null, biomeVersion), null);
  assert.equal(wantOf({ regions: [{ id: "g1", seed: 3, gen: 5, slot: [2, 2] }], here: "g1" }, biomeVersion), null);
  const w = wantOf(saves["seed 36 (his #136 save, out at 89)"], biomeVersion);
  assert.deepEqual([w.seed, w.slot, w.v, w.exp.pos], [36, [2, 2], 3, 89]);
});
