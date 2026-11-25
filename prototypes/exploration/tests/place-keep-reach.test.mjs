// owner-notes-fix-136-4 (OWNER #136, #142): the cells asked `first` (the reach) are never the ones evicted from the kept index; the PLACE_KEEP cap applies to the background list.
//   node --test prototypes/exploration/tests/place-keep-reach.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { keptIndex } from "../src/place-store.mjs";

test("with more cells than the cap, the reach stays in the index after the background list is kept", () => {
  const cap = 240, reach = new Set(["r1", "r2", "r3"]);
  let idx = [];
  for (const k of ["r1", "r2", "r3"]) idx = keptIndex(idx, k, reach, cap);   // the reach bakes first, so it is the oldest
  for (let i = 0; i < 340; i++) idx = keptIndex(idx, "b" + i, reach, cap);
  for (const k of reach) assert.ok(idx.includes(k), k + " kept");
  assert.equal(idx.filter(k => !reach.has(k)).length, cap, "the cap holds the background list");
  assert.ok(idx.includes("b339") && !idx.includes("b0"), "the oldest background cells go");
});
