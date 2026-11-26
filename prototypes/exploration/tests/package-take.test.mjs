// baked-package-3/4: the offer is the seating Companion's region only; the Companion plays the package it holds only when its revs and tag are the page's; a generator change is rebaked at the Station, never on the Companion.
//   node --test prototypes/exploration/tests/package-take.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { memKv, openPackage, putCell, finishPackage, bytesOfCell, cellOfBytes } from "../src/package-store.mjs";
import { PLACES } from "./page-harness.mjs";
import { bakedCell } from "../src/world7.mjs";
import { offerOf, takePackage, heldOf } from "../src/package-dock.mjs";

const asked = [];
globalThis.Worker = class { constructor() { asked.push("worker made"); } postMessage(m) { asked.push(m.op); } terminate() {} };
const store = await import("../src/place-store.mjs");
const seed = 36, slot = [2, 2], v = 3, region = { seed, slot, v }, REAL = new Map(), real = (c) => REAL.get(c) || (REAL.set(c, bakedCell(PLACES.ctx, seed, slot, c, v)), REAL.get(c));
// a package cell is .mbplace bytes (baked-package-8): a real cell's, its name made k so the packages of one test tell apart
const cellOf = (c, k) => bytesOfCell(seed, c, real(c).ir, { ...real(c).place, names: [k] }), expectOf = (c, k) => cellOfBytes(cellOf(c, k)), order = { cells: [89, 90], floor: 1 };
const sameMeta = { seed, slot, v, tag: "" }, otherTag = { seed, slot, v, tag: "old" };   // another tile-set tag stands for a rev bump: another id

async function bake(kv, meta, k) { const h = await openPackage(kv, meta, order); for (const c of order.cells) await putCell(h, c, cellOf(c, k), "sha" + k + c); await finishPackage(h); return h; }

test("the offer is the newest package of the Companion's region only", async () => {
  const kv = memKv(); await bake(kv, { seed: 99, slot, v, tag: "" }, "x"); await new Promise((r) => setTimeout(r, 5));
  await bake(kv, { seed, slot: [1, 2], v, tag: "" }, "y");
  assert.equal(await offerOf(kv, region), null, "another world's or region's package is not offered");
  assert.equal(await offerOf(kv), null, "no region, no offer");
  await new Promise((r) => setTimeout(r, 5)); await bake(kv, sameMeta, "mine");
  const o = await offerOf(kv, region); assert.equal(o.seed, seed); assert.deepEqual(o.slot, slot); assert.equal(o.done, 2); assert.match(o.sha, /^[0-9a-f]{64}$/);
  assert.deepEqual(await offerOf(kv, region), o, "the same package offers the same summary (same sha)");
  assert.equal(await heldOf(kv, o), null); await takePackage(kv, o); assert.deepEqual(await heldOf(kv, o), o);
});

test("a held package of another rev or tag is not played; the page's own package is", async (t) => {
  t.after(() => store.placesReset());
  const kv = memKv(); await bake(kv, otherTag, "old"); const old = await offerOf(kv, region);
  await takePackage(kv, old);   // held, but baked at another tag than this page's
  await new Promise((r) => setTimeout(r, 5)); await bake(kv, sameMeta, "new");   // the Station's package of this page's revs
  assert.ok((await kv.keys()).some((k) => k.startsWith(old.id + "#c")), "the held package is kept in the store");
  store.placesOn(true);
  assert.equal(await store.packageUse(seed, slot, v, kv, 0), "whole");
  assert.deepEqual(store.bakedGet(seed, slot, v, 89), expectOf(89, "new"), "a held package of another tag is not played");
  assert.deepEqual(asked, [], "it baked nothing itself");
  store.placesReset(); const o2 = await offerOf(kv, region); await takePackage(kv, o2);
  assert.equal(await store.packageUse(seed, slot, v, kv, 0), "whole");
  assert.deepEqual(store.bakedGet(seed, slot, v, 89), expectOf(89, "new"), "a held package of the page's revs is played");
  assert.deepEqual(asked, [], "still nothing baked on the Companion");
});
