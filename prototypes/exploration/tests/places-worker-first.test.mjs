// set-out-first-1 (live, 2026-11-21, owner: "reading the land takes a long time"; verify-live-22): the set-out's 51 cells waited behind the 297-cell background list in the one places worker, ~57 s on seed 44.
// A bake asked with first: true goes ahead of everything queued in the worker, and the same cell asked earlier in the list is not made twice. Real worker module, in a node worker thread (places-worker-shim.mjs).
//   node --test prototypes/exploration/tests/places-worker-first.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { Worker as NodeWorker } from "node:worker_threads";
import { PLACES } from "./page-harness.mjs";
import { MW, MH } from "../src/world.mjs";
import { realm7 } from "../src/world7.mjs";

const SHIM = new URL("./places-worker-shim.mjs", import.meta.url), threads = [], bakedMsgs = [];
class FakeWorker {
  constructor() {
    this.w = new NodeWorker(SHIM); threads.push(this.w);
    this.w.on("message", (data) => { if (data && data.op === "baked") bakedMsgs.push(data.cell); if (this.onmessage) this.onmessage({ data }); });
    this.w.on("error", (e) => { if (this.onerror) this.onerror({ message: e.message }); });
  }
  postMessage(m, transfer) { this.w.postMessage(m, transfer); }
  terminate() { return this.w.terminate(); }
}
globalThis.Worker = FakeWorker;
const store = await import("../src/place-store.mjs");

test("a first: true bake (the set-out's reach) is made ahead of a long background list, and no cell is made twice", async (t) => {
  t.after(() => { for (const w of threads) w.terminate(); });
  assert.equal(store.placesOn(true), true);
  const seed = 44, slot = [2, 2], v = 1, mid = (MW * MH) >> 1, list = Array.from({ length: 30 }, (_, i) => mid + i), reach = list.slice(-3);
  realm7(seed);
  const kit = { ctx: PLACES.ctx };
  await store.readyPlaces(seed, slot, v, list, kit);   // the background list: 30 cells in the worker, the reach's cells last
  await store.readyPlaces(seed, slot, v, reach, { ...kit, first: true });   // the set-out asks for the last three
  for (const c of reach) await store.bakedWhen(seed, slot, v, c);
  const madeBefore = list.slice(0, -3).filter((c) => store.bakedGet(seed, slot, v, c)).length;
  assert.ok(reach.every((c) => store.bakedGet(seed, slot, v, c)), "the reach's cells are here");
  assert.ok(madeBefore <= 3, `the reach's cells came before the list (only ${madeBefore} of the other 27 were made first)`);
  for (const c of list) await store.bakedWhen(seed, slot, v, c);
  for (const c of list) assert.equal(bakedMsgs.filter((x) => x === c).length, 1, `cell ${c} was made once`);
});
