// The end tally: the Case at End expedition counts "Brought home" (pods, finds, pages) up from 0; the counts match the hold and the page entries written on this walk.
//   node --test prototypes/exploration/tests/end-tally.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";

function setup() {
  const f = fixture({ partner: 0 });
  f.run("S.pages = { 7: { met: { d: 1 } } }; S.exp.pg0 = pageCount();");   // one page entry from before the walk
  f.run("S.exp.cargo.pods = [{}, {}]; S.exp.cargo.samples = [{ item: 'tuft' }, { item: 'tuft' }, { item: 'tuft' }]");
  f.run("S.pages[7].dawn = { x: 1, y: 1 }; S.pages[8] = { met: { d: 2 }, dusk: { x: 2, y: 2 } }");   // three entries written on this walk
  f.run("openCase(true)");
  return f;
}

test("the totals are the hold's pods and finds and the pages written on this walk", () => {
  const f = setup();
  assert.deepEqual(plain(f.run("tallyTotals()")), [2, 3, 3]);
});

test("the counts rise from 0 to the totals in about 2 s, and ✓ skips to the end first", () => {
  const f = setup();
  assert.equal(f.run("tallyDone()"), true, "reduced motion (the harness): the final counts at once");
  f.run("RM.matches = false; NOW = 5000; S.ui.tally.at = 5000");
  const T = f.run("S.ui.tally.at");
  assert.deepEqual(plain(f.run("tallyShown([2, 3, 3], 0)")), [0, 0, 0]);
  const mid = plain(f.run("tallyShown([2, 3, 3], 900)"));
  assert.ok(mid[0] === 2 && mid[1] > 0 && mid[1] < 3 && mid[2] === 0, JSON.stringify(mid));
  assert.deepEqual(plain(f.run("tallyShown([2, 3, 3], 2000)")), [2, 3, 3]);
  assert.equal(f.run("tallyDone()"), false);
  f.run("S.phase = 'cargo'; caseKey('confirm')");
  assert.equal(f.run("tallyDone()"), true);
  assert.equal(f.run("S.phase"), "cargo", "the first ✓ only skips; the expedition is not ended");
  assert.ok(T != null);
});
