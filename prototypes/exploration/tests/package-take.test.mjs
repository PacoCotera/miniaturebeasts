// baked-package-3: the Companion plays the package it holds until the next seat; a generator change is rebaked at the Station, never on the Companion.
//   node --test prototypes/exploration/tests/package-take.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { memKv, openPackage, putCell, finishPackage } from "../src/package-store.mjs";
import { offerOf, takePackage, heldOf, packageSummary } from "../src/package-dock.mjs";

const asked = [];
globalThis.Worker = class { constructor() { asked.push("worker made"); } postMessage(m) { asked.push(m.op); } terminate() {} };
const store = await import("../src/place-store.mjs");
const seed = 36, slot = [2, 2], v = 3, cellOf = (c, k) => ({ ir: { c, k }, place: { c, k } }), order = { cells: [89, 90], floor: 1 };
const oldMeta = { seed, slot, v, tag: "old" }, newMeta = { seed, slot, v, tag: "new" };   // another tile-set tag stands for a PLACE_REV bump: another id

async function bake(kv, meta, k) { const h = await openPackage(kv, meta, order); for (const c of order.cells) await putCell(h, c, cellOf(c, k), "sha" + k + c); await finishPackage(h); return h; }

test("the offer is the Station's newest package; taking it writes what the Companion holds; the old package stays until then", async (t) => {
  t.after(() => store.placesReset());
  const kv = memKv(); await bake(kv, oldMeta, "old");
  const o1 = await offerOf(kv); assert.equal(o1.done, 2); assert.equal(o1.whole, true); assert.match(o1.sha, /^[0-9a-f]{64}$/);
  assert.equal(await heldOf(kv, o1), null); await takePackage(kv, o1); assert.deepEqual(await heldOf(kv, o1), o1);
  assert.deepEqual(await offerOf(kv), o1, "the same package offers the same summary (same sha)");
  await new Promise((r) => setTimeout(r, 5)); await bake(kv, newMeta, "new");   // the Station rebakes after a generator change
  const o2 = await offerOf(kv); assert.notEqual(o2.id, o1.id); assert.notEqual(o2.sha, o1.sha);
  assert.ok((await kv.keys()).some((k) => k.startsWith(o1.id + "#c")), "the held package was not dropped when the new one finished");
  store.placesOn(true);
  assert.equal(await store.packageUse(seed, slot, v, kv, 0), "whole");
  assert.deepEqual(store.bakedGet(seed, slot, v, 89), cellOf(89, "old"), "the Companion keeps playing the package it holds");
  assert.deepEqual(asked, [], "it baked nothing itself");
  store.placesReset(); await takePackage(kv, o2);   // the next seat
  assert.equal(await store.packageUse(seed, slot, v, kv, 0), "whole");
  assert.deepEqual(store.bakedGet(seed, slot, v, 89), cellOf(89, "new"), "after the seat it plays the new one");
  assert.deepEqual(asked, [], "still nothing baked on the Companion");
});
