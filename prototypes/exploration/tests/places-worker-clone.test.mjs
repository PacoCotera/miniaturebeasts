// places-worker-clone-1 (live, 2026-11-16: "the places worker did not run DataCloneError ... i=>t[i]<o?2:t[i]<s?3:4 could not be cloned"): everything the page posts to the places worker
// (src/store/place-store.mjs) is plain data, so it crosses by structured clone, and a place made in the worker is the place the page would make, tile for tile.
// The real worker module runs in a node worker thread (tests/places-worker-shim.mjs); the page thread makes places of the seed first, which is what leaves caches on the realm.
//   node --test prototypes/exploration/tests/places-worker-clone.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { Worker as NodeWorker } from "node:worker_threads";
import { PLACES } from "./page-harness.mjs";
import { MW, MH } from "../src/world.mjs";
import { bakedCell, realm7 } from "../src/world7.mjs";

const SHIM = new URL("./places-worker-shim.mjs", import.meta.url), threads = [], posted = [];
class FakeWorker {
  constructor() {
    this.w = new NodeWorker(SHIM); threads.push(this.w);
    this.w.on("message", (data) => { if (this.onmessage) this.onmessage({ data }); });
    this.w.on("error", (e) => { if (this.onerror) this.onerror({ message: e.message }); });
  }
  postMessage(m, transfer) { posted.push(m && m.op); structuredClone(m); this.w.postMessage(m, transfer); }   // the explicit clone names the message that cannot cross
  terminate() { return this.w.terminate(); }
}
globalThis.Worker = FakeWorker;
const store = await import("../src/store/place-store.mjs");

// a canonical digest (FNV-1a 32 bits): keys sorted, typed arrays by their bytes, Maps and Sets by their entries; a function anywhere is refused
function digest(v) {
  let h = 2166136261; const text = (s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } };
  const walk = (x) => {
    if (x === undefined) return text("u;"); if (x === null) return text("n;");
    const t = typeof x;
    if (t === "number" || t === "boolean" || t === "string") return text(t[0] + String(x) + ";");
    if (t === "function" || t === "bigint" || t === "symbol") throw new Error("a place holds no " + t);
    if (ArrayBuffer.isView(x)) { text("a" + x.constructor.name + x.length + ":"); const b = new Uint8Array(x.buffer, x.byteOffset, x.byteLength); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 16777619); } return; }
    if (Array.isArray(x)) { text("[" + x.length + ":"); x.forEach(walk); return text("]"); }
    if (x instanceof Set) { text("S" + x.size + ":"); for (const e of x) walk(e); return text(";"); }
    if (x instanceof Map) { text("M" + x.size + ":"); for (const [k, e] of x) { walk(k); walk(e); } return text(";"); }
    const ks = Object.keys(x).sort(); text("{" + ks.length + ":"); for (const k of ks) { text(k + "="); walk(x[k]); } text("}");
  };
  walk(v); return h >>> 0;
}
const within = (p, ms, what) => { let id; return Promise.race([p, new Promise((_, rej) => { id = setTimeout(() => rej(new Error("timed out: " + what)), ms); })]).finally(() => clearTimeout(id)); };
const until = async (ok, what, ms = 90000) => { const t0 = Date.now(); while (!ok()) { if (Date.now() - t0 > ms) throw new Error("timed out: " + what); await new Promise((r) => setTimeout(r, 20)); } };

test("what the page posts to the places worker crosses by structured clone, and the worker's places equal the page's, tile for tile, on three seeds", async (t) => {
  t.after(() => { for (const w of threads) w.terminate(); });
  assert.equal(store.placesOn(true), true, "the places worker is on");
  const kit = { ctx: PLACES.ctx }, slot = [2, 2], v = 1, mid = (MW * MH) >> 1, cells = [0, 1, 2, 3, 4, 5].map((i) => mid + i);
  let withCache = 0;
  for (const seed of [7, 13, 42]) {
    const here = cells.map((c) => bakedCell(PLACES.ctx, seed, slot, c, v));   // made on the page thread first: this is what leaves caches on the realm
    if ("flowClasses" in realm7(seed).realm) withCache++;
    assert.doesNotThrow(() => structuredClone(realm7(seed)), `seed ${seed}: the realm, as the page holds it after making places, crosses to a worker`);
    await store.readyPlaces(seed, slot, v, cells, kit);
    for (const c of cells) await within(store.bakedWhen(seed, slot, v, c), 90000, "cell " + c + " of seed " + seed);   // resolves when it arrives, or when no worker is left to owe it
    cells.forEach((c, i) => {
      const w = store.bakedGet(seed, slot, v, c);
      assert.ok(w, `seed ${seed} cell ${c}: the worker made it (a worker that did not run leaves it to the page)`);
      assert.equal(digest(w.ir), digest(here[i].ir), `seed ${seed} cell ${c}: the IR is the page's, tile for tile`);
      assert.equal(digest(w.place), digest(here[i].place), `seed ${seed} cell ${c}: the baked place is the page's, tile for tile`);
    });
    assert.equal(store.readySites(seed, [slot], kit), true, `seed ${seed}: a background slice of Hollow Tree sites is accepted`);
    const id = store.bakedGet(seed, slot, v, cells[0]).place.id;
    assert.equal(store.groundAsk(id, store.bakedGet(seed, slot, v, cells[0]).place, kit), true, `seed ${seed}: a ground is accepted`);
    await until(() => !store.groundPending(id), "the ground of seed " + seed);
    const g = store.groundTake(id); assert.ok(g && g.frames.length > 0, `seed ${seed}: the ground came back`);
  }
  assert.ok(withCache >= 1, "the test reaches the realm's caches (at least one seed had made its width classes before the realm was posted)");
  for (const op of ["init", "seed", "bake", "sites", "ground"]) assert.ok(posted.includes(op), `a '${op}' message was posted and cloned`);
});

// play-freeze-1 (live, 2026-11-17: Firefox "slowing down" on a played save): telling the worker which sites the page has made never makes the page's decor (its land is seconds of work on the page thread).
test("the sites sent to the worker come from the decor the page already has, and asking makes none", async () => {
  const { decorSites } = await import("../src/gen7/place.mjs");
  const t0 = performance.now();
  assert.deepEqual(decorSites(9999), [], "a seed the page never made decor for has no sites to send");
  assert.ok(performance.now() - t0 < 200, "and the ask is instant (it made no decor)");
});
