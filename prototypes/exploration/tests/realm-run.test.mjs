// The realm work's yardstick: a fixed-policy bot plays whole expeditions on the
// page (tools/realm-run.mjs, a new realm: generator 5); its digest after 20 expeditions is recorded in realm-run.golden.json, and the three played v8 saves are what the
// same tool leaves behind (the release resets them: each is kept whole in .pre10 and a new realm starts).
//   node --test prototypes/exploration/tests/realm-run.test.mjs      to rewrite the golden: node prototypes/exploration/tools/realm-run.mjs --record
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runBot, RUN, FIXED_DATE } from "../tools/realm-run.mjs";
import { makePage } from "./page-harness.mjs";
import { MAP_KEYS } from "../src/regions.mjs";

const GOLDEN = JSON.parse(readFileSync(new URL("./realm-run.golden.json", import.meta.url), "utf8"));
const FIX = name => readFileSync(new URL(`../../station/tests/fixtures/save-v8-${name}.json`, import.meta.url), "utf8");
// the three played saves, and the run that leaves each one behind
const SAVES = {
  "played-g1": { seed: 11, gen: 1, expeditions: 12, mibis: 0, dock: 0 },
  "played-g2": { seed: 21, gen: 2, expeditions: 20, mibis: 2, dock: 0 },
  "midexp-g3": { seed: 38, gen: 3, expeditions: 8, mibis: 0, dock: 0, stopMid: true },
};

test("1. the golden run: twice over, the same digest, and the one on file", () => {
  const a = runBot(RUN), b = runBot(RUN);
  assert.equal(a.digest, b.digest, "two runs agree");
  assert.equal(a.save, b.save, "and leave the same bytes");
  assert.equal(a.digest, GOLDEN.digest);
  assert.deepEqual(a.steps, GOLDEN.steps, "expedition by expedition");
  assert.deepEqual(a.summary, GOLDEN.summary);
  assert.equal(GOLDEN.expeditions, 20); assert.equal(GOLDEN.gen, 5); assert.equal(GOLDEN.seed, 7);
  // 20 expeditions; the world turns only after a walk that found a heart, and the random walk often revisits found places (C9), so fewer turns than expeditions
  assert.equal(a.page.S.turn, GOLDEN.summary.turn); assert.ok(GOLDEN.summary.turn >= 8 && GOLDEN.summary.turn <= 20, "turns " + GOLDEN.summary.turn);
});

test("2. a different seed or generator gives a different digest (the digest sees the world)", () => {
  const base = runBot({ ...RUN, expeditions: 2 }).digest;
  assert.notEqual(runBot({ ...RUN, expeditions: 2, seed: 8 }).digest, base);
  assert.notEqual(runBot({ ...RUN, expeditions: 2, gen: 2 }).digest, base);
  assert.notEqual(runBot({ ...RUN, expeditions: 3 }).digest, base);
});

test("3. the played saves: what each one holds", () => {
  const g1 = JSON.parse(FIX("played-g1")), g2 = JSON.parse(FIX("played-g2")), mid = JSON.parse(FIX("midexp-g3"));
  for (const s of [g1, g2, mid]) { assert.equal(s.v, 8); assert.ok(s.st, "the Station's part rides in the save"); assert.ok(s.revealed && s.visited && s.pods && s.cr, "the map state is there"); }
  assert.equal(g1.gen, 1); assert.equal(g1.expN, 13, "12 expeditions");
  assert.equal(g2.gen, 2); assert.equal(g2.expN, 21, "20 expeditions"); assert.equal(g2.bay.length, 2, "2 crates in the bay"); assert.equal(g2.carried.length, 2, "2 mibis carried");
  assert.equal(mid.gen, 3); assert.ok(mid.exp && mid.exp.n === 8, "an expedition under way"); assert.equal(mid.exp.cargo.d, 20, "the hold full (Data at its cap of 20)"); assert.equal(mid.bay.length, 3, "and the bay full");
});


for (const name of Object.keys(SAVES)) {
  test(`4. ${name}: the v10 page keeps the v8 fixture whole in .pre10 and starts a new generator 5 realm`, () => {
    const text = FIX(name), p = makePage({ console: "silent", date: FIXED_DATE });   // a page of its own: the save goes under that page's key
    p.store[p.KEY] = text; assert.equal(p.run("load()"), false, "nothing to play: a new realm starts");
    assert.equal(p.store[p.KEY + ".pre10"], text, "the v8 bytes, untouched, in the copy");
    p.run("newWorld(5)"); const now = JSON.parse(p.store[p.KEY]);
    assert.equal(now.v, 10); assert.equal(now.resetFrom, 8); assert.equal(now.regions.length, 1); assert.equal(now.regions[0].gen, 5); assert.deepEqual(now.mibis, []);
  });
}
