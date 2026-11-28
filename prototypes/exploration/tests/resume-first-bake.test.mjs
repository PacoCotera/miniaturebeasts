// owner-notes-fix-136-3 (OWNER #136, #142): a page loaded straight into an expedition asks the worker for ex.pos + the reach with first: true, ahead of op 'warm' and the visited list,
// so the neighbours' places are here for the held view (drawPeekNeighbours has no place to draw until they arrive). Played on the page: its own wantPlaces, a stand-in worker that keeps what it is sent.
//   node --test prototypes/exploration/tests/resume-first-bake.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("a page loaded into an expedition: the worker gets the bake of its place and reach (first: true) before the warm and before the visited list", async () => {
  const sent = [];
  globalThis.Worker = class { postMessage(m) { sent.push(m); } terminate() {} };
  try {
    const p = makePage({ gen: 7, console: "silent", els: true, raf: 1 }), r = p.run;
    r("newWorld(3);");
    assert.equal(r("placesOn(true)"), true, "the worker is on (a stand-in that makes nothing)");
    const cells = r("(() => { const out = []; for (let c = 0; c < MW * MH && out.length < 5; c++) if (passable(c)) out.push(c); return out; })()"), [pos, a, b, been] = cells;
    r(`S.exp = { pos: ${pos}, reach: [${a}, ${b}] }; S.seen.been = { ${been}: 1 }; PLACES.warmSeed = null; PLACES.sig = ''; wantPlaces();`);
    await new Promise((res) => setImmediate(res));   // the warm follows the first bake's post, a turn later
    const ops = sent.map((m) => m.op), first = sent.findIndex((m) => m.op === "bake" && m.first), warm = ops.indexOf("warm"), list = sent.findIndex((m) => m.op === "bake" && !m.first);
    assert.deepEqual([...sent[first].cells], [pos, a, b], "the first bake is the place and its reach");
    assert.ok(warm > first, "the warm is posted after it: " + ops.join());
    assert.ok(list > first && sent[list].cells.includes(been), "the visited list is asked after it: " + ops.join());
  } finally { delete globalThis.Worker; }
});
