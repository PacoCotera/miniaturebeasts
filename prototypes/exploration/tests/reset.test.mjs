// The save reset (release 21b), the parts that are pure: what a page does with what it finds, and the .pre10 copy.
//   node --test prototypes/exploration/tests/reset.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resetPlan, keepPre10, RESET_V } from "../src/regions.mjs";

const store = (init = {}, { failSet = false } = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (failSet) throw new Error("full"); m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

test("what a page finds: nothing, a v10 save, a v8 or v9 save, a newer save, bytes it cannot read", () => {
  assert.equal(RESET_V, 10);
  assert.deepEqual(resetPlan(null), { action: "none" }); assert.deepEqual(resetPlan(""), { action: "none" });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 10, seed: 1 })), { action: "play" });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 9, seed: 1 })), { action: "reset", from: 9 });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 8, seed: 1 })), { action: "reset", from: 8 });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 11 })), { action: "newer" });
  for (const raw of ["{not json", "[]", "7", JSON.stringify({ v: 3 }), JSON.stringify({ seed: 1 })]) assert.deepEqual(resetPlan(raw), { action: "broken" }, raw);
});

test("the copy: <key>.pre10 holds the old bytes exactly, once; an older .pre9 goes; a copy already there is kept", () => {
  const raw = JSON.stringify({ v: 9, seed: 5, mibis: [{ id: 1 }] }), st = store({ k: raw, "k.pre9": "old" });
  assert.equal(keepPre10(st, "k", raw), true); assert.equal(st.getItem("k.pre10"), raw); assert.equal(st.getItem("k.pre9"), null); assert.equal(st.getItem("k"), raw, "the save itself is untouched here");
  assert.equal(keepPre10(st, "k", "other bytes"), true); assert.equal(st.getItem("k.pre10"), raw, "the oldest bytes are kept");
});

test("a copy that cannot be made: false, nothing written (the page opens read-only)", () => {
  const raw = JSON.stringify({ v: 9, seed: 5 }), st = store({ k: raw }, { failSet: true });
  assert.equal(keepPre10(st, "k", raw), false); assert.equal(st.getItem("k.pre10"), null);
});
