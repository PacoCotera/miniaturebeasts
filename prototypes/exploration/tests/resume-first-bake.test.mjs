// owner-notes-fix-136-3 (OWNER #136, #142): a page loaded straight into an expedition asks the worker for ex.pos + the reach with first: true, ahead of op 'warm' and the visited list,
// so the neighbours' places are here for the held view (drawPeekNeighbours has no place to draw until they arrive).
//   node --test prototypes/exploration/tests/resume-first-bake.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("wantPlaces on a resumed expedition: first bake of pos + reach (first: true) is posted before the warm", () => {
  const fn = html.slice(html.indexOf("function wantPlaces()"), html.indexOf("wantBanks(seed, R.slot, list);"));
  const first = fn.indexOf("readyPlaces(wseed, R.slot, biomeVersion(S), [S.exp.pos, ...S.exp.reach]");
  const warm = fn.indexOf("warmPlaces(wseed");
  const visited = fn.indexOf("readyPlaces(seed, R.slot, v, list");
  assert.ok(first > 0 && warm > 0 && visited > 0, "all three asks are in wantPlaces");
  assert.ok(fn.includes("first: true }).then(warm, warm)"), "the warm follows the first bake's post");
  assert.ok(first < visited, "the first bake is asked before the visited list");
});

test("the worker gets the bake (first: true) before the warm", async () => {
  const msgs = [];
  globalThis.Worker = class { constructor() {} postMessage(m) { msgs.push(m); } terminate() {} };
  const store = await import("../src/store/place-store.mjs");
  const { PLACES } = await import("./page-harness.mjs");
  const { realm7 } = await import("../src/world7.mjs");
  store.placesOn(true);
  const seed = 44; realm7(seed);
  const ex = { pos: 100, reach: [101, 102, 103] }, kit = { ctx: PLACES.ctx };
  const warm = () => store.warmPlaces(seed, kit);
  await store.readyPlaces(seed, [2, 2], 1, [ex.pos, ...ex.reach], { ...kit, first: true }).then(warm, warm);
  const ops = msgs.map(m => m.op).filter(o => o === "bake" || o === "warm");
  assert.deepEqual(ops, ["bake", "warm"]);
  const bake = msgs.find(m => m.op === "bake");
  assert.equal(bake.first, true);
  assert.deepEqual(bake.cells, [100, 101, 102, 103]);
});
