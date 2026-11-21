// Owner bug 82 (internal issue): "pawn frozen" at laptop size, one main-thread task of 4 to 6 s about 5 s into a walk. The call path (CDP profile of the bundled page):
// press > advance > patchStep > crossEdge > revealCell > recordSigns > cellSigns > layout(key) > bakedCell7, a place the worker had not made (past the reach) baked on the page, in one turn.
// With the worker running, reading a cell's sign must never bake that cell here: it asks the worker, leaves the stone sign for when the place arrives, and reads it then.
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("a cell the worker owes is not baked on the page by its sign; its sign is read when the place comes", () => {
  const sent = [];
  globalThis.Worker = class { constructor() { this.onmessage = null; } postMessage(m) { sent.push(m); } terminate() {} };
  try {
    const p = makePage({ gen: 7, console: "silent", els: true, raf: 1 }), r = p.run;
    r("newWorld(3);");
    assert.equal(r("G.gen"), 7);
    assert.equal(r("placesOn(true)"), true, "the worker is on (a stand-in that makes nothing)");
    const c = r("(() => { for (let c = 0; c < MW * MH; c++) if (passable(c) && !bakedGet(S.regions[0].seed, hereRegion().slot, biomeVersion(S), c)) return c; return -1; })()");
    assert.ok(c >= 0, "a passable cell with no place made");
    const inline0 = r("PLACES.inline");
    r(`recordSigns(${c})`);
    assert.equal(r("PLACES.inline"), inline0, "no place was baked on the page for the sign");
    assert.equal(r(`layoutCache.has('${c}')`), false, "no layout was made for it");
    assert.equal(r(`SIGNS_OWED.has(${c})`), true, "its sign is owed");
    assert.ok(sent.some(m => m.op === "bake" && m.cells.includes(c)), "the worker was asked for it");
    // the place arrives (made here by the same function the worker runs): the sign is read, once
    r(`bakedPut(S.regions[0].seed, hereRegion().slot, biomeVersion(S), ${c}, bakedCell7(PL.ctx, S.regions[0].seed, hereRegion().slot, ${c}, biomeVersion(S)))`);
    r("signsPay()");
    assert.equal(r(`SIGNS_OWED.has(${c})`), false, "paid");
    assert.equal(r(`layoutCache.has('${c}')`), true, "read from the made place");
  } finally { delete globalThis.Worker; }
});
