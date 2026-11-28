// Bug #98 (owner 2026-11-20: "the signs you have met lost the ability to select a sign and read its explanation"):
// the Tuft sign's picture threw, which stopped the Probe's grid before the focus frame was drawn. Every sign must draw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("every sign in the Probe's grid draws its picture, and the Probe draws with all of them met", () => {
  const p = makePage({ store: {}, gen: 6 });
  const bad = p.run(`(() => { const out = [];
    for (const t of TILES) { try { drawTile(t, 0, 0); } catch (e) { out.push(t.id + ': ' + e.message); } }
    return out; })()`);
  assert.deepEqual([...bad], []);
  const err = p.run(`(() => { S.found = TILES.map(t => t.keys[0]); try { drawProbe(0); return ''; } catch (e) { return e.message; } })()`);
  assert.equal(err, "");
});
