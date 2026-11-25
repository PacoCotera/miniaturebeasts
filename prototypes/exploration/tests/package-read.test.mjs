// baked-package-2: the Companion plays from the Station's package. A cell in the package is here at once (bakedGet, so placeHave) with no worker, no warm and no `first` ask; a cell of the region not yet in it
// is owed (packageOwes) and never asked of a worker; it comes when the Station writes it (the poll reads it); a region with no package keeps today's path.
//   node --test prototypes/exploration/tests/package-read.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { memKv, openPackage, putCell, putRegion, finishPackage } from "../src/package-store.mjs";

const asked = [];
globalThis.Worker = class { constructor() { asked.push("worker made"); } postMessage(m) { asked.push(m.op); } terminate() {} };
const store = await import("../src/place-store.mjs");
const seed = 36, slot = [2, 2], v = 3, meta = { seed, slot, v, tag: "" }, cellOf = (c) => ({ ir: { c }, place: { c } });
const order = { cells: [89, 90, 73, 74, 75], floor: 3 };

test("a cell in the package is here on the first read; one not in it yet is owed, never asked of a worker, and arrives when the Station writes it", async (t) => {
  t.after(() => store.placesReset());
  store.placesOn(true);
  const kv = memKv(), h = await openPackage(kv, meta, order);
  for (const c of [89, 90, 73]) await putCell(h, c, cellOf(c), "sha" + c);
  await putRegion(h, [], []);
  assert.equal(store.packageState(seed, slot, v), "none", "before the page opens it");
  assert.equal(await store.packageUse(seed, slot, v, kv, 20), "part");
  assert.equal(store.packageState(seed, slot, v), "part");
  for (const c of [89, 90, 73]) assert.deepEqual(store.bakedGet(seed, slot, v, c), cellOf(c), `${c} is here on the first frame`);
  assert.equal(store.bakedGet(seed, slot, v, 74), null);
  assert.equal(store.packageOwes(seed, slot, v, 74), true, "74 is owed by the Station");
  assert.equal(store.packageOwes(seed, slot, v, 73), false);
  await store.readyPlaces(seed, slot, v, [73, 74, 75], { ctx: {}, first: true });
  assert.deepEqual(asked, [], "nothing is asked of a worker for a region with a package");
  let came = false; const w = store.bakedWhen(seed, slot, v, 74).then(() => { came = true; });
  await new Promise((r) => setTimeout(r, 60)); assert.equal(came, false, "a wait for an owed cell does not end on its own");
  await putCell(h, 74, cellOf(74), "sha74"); await putCell(h, 75, cellOf(75), "sha75");
  await w; assert.deepEqual(store.bakedGet(seed, slot, v, 74), cellOf(74), "74 came in from the package");
  await finishPackage(h);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(store.packageState(seed, slot, v), "whole");
  assert.equal(store.packageOwes(seed, slot, v, 75), false);
});

test("no package for the region: today's path (nothing owed, the worker is asked)", async (t) => {
  t.after(() => store.placesReset());
  store.placesOn(true); asked.length = 0;
  assert.equal(await store.packageUse(seed, slot, v, memKv(), 20), "none");
  assert.equal(store.packageState(seed, slot, v), "none");
  assert.equal(store.packageOwes(seed, slot, v, 73), false);
  await store.readyPlaces(seed, slot, v, [73], { ctx: {}, first: true });
  assert.ok(asked.includes("bake"), "the worker is asked as it is today: " + asked.join());
});

test("a package of another region or version is not this one's", async (t) => {
  t.after(() => store.placesReset());
  const kv = memKv(), h = await openPackage(kv, { ...meta, v: 9 }, order); await putCell(h, 73, cellOf(73), "s");
  assert.equal(await store.packageUse(seed, slot, v, kv, 0), "none");
  assert.equal(store.bakedGet(seed, slot, v, 73), null);
});
