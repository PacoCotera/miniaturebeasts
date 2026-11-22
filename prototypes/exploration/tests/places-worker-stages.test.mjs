// #104 part 2: the places worker tells each real stage of a place as it finishes (op 'stage', 1 and 2 of BAKE_STAGES), before the baked reply, so the wait's pips move while the first place is made.
//   node --test prototypes/exploration/tests/places-worker-stages.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { Worker as NodeWorker } from "node:worker_threads";
import { PLACES } from "./page-harness.mjs";
import { MW, MH } from "../src/world.mjs";
import { realm7 } from "../src/world7.mjs";
import { BAKE_STAGES } from "../src/waitpips.mjs";

const SHIM = new URL("./places-worker-shim.mjs", import.meta.url), threads = [], seen = [];
class FakeWorker {
  constructor() {
    this.w = new NodeWorker(SHIM); threads.push(this.w);
    this.w.on("message", (data) => { if (data && (data.op === "stage" || data.op === "baked")) seen.push([data.op, data.cell, data.n]); if (this.onmessage) this.onmessage({ data }); });
    this.w.on("error", (e) => { if (this.onerror) this.onerror({ message: e.message }); });
  }
  postMessage(m, transfer) { this.w.postMessage(m, transfer); }
  terminate() { return this.w.terminate(); }
}
globalThis.Worker = FakeWorker;
const store = await import("../src/place-store.mjs");

test("a place made in the worker reports its stages, in order, before it is made", async (t) => {
  t.after(() => { for (const w of threads) w.terminate(); });
  assert.equal(store.placesOn(true), true);
  const seed = 44, slot = [2, 2], v = 1, cell = (MW * MH >> 1) + 3;
  realm7(seed);
  assert.equal(store.stageOf(seed, slot, v, cell), 0);
  await store.readyPlaces(seed, slot, v, [cell], { ctx: PLACES.ctx, first: true });
  await store.bakedWhen(seed, slot, v, cell);
  const mine = seen.filter((x) => x[1] === cell), ns = mine.filter((x) => x[0] === "stage").map((x) => x[2]);
  assert.equal(mine[mine.length - 1][0], "baked", "the baked reply is last");
  assert.deepEqual(ns, Array.from({ length: BAKE_STAGES - 1 }, (_, i) => i + 1), "every stage but the last told once, in order, before the place is made");
  assert.equal(store.stageOf(seed, slot, v, cell), BAKE_STAGES, "made counts as every stage");
});
