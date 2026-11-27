// reach-build-1 (owner 2026-11-26 "too complicated, it's a cozy game"): no line inside a place of the Probe's square; the refusal is only the step across the edge.
//   node --test prototypes/exploration/tests/reach-no-line.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("a place with a side the range square shuts blocks no tile and draws no reach line or veil band", () => {
  const p = makePage({ gen: 7, console: "collect" });
  p.run("newWorld(13); TEST.calm = true; S.tier = 1; startExpedition('weather', G.spawns[0]);");
  const c = p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER || G.island[c]) continue; S.exp.pos = c; enterPatch(); if (RT.view) endView(); const lay = layout(String(c)); if (lay.baked && !lay.cave && ['N', 'E', 'S', 'W'].some(s => openingKind(lay, { side: s }).kind === 'range')) return c; leavePatch(); } return -1; })()`);
  assert.ok(c >= 0, "a place with a shut side exists in seed 13");
  p.run("hazeSync(layout(S.exp.patch.key))");
  assert.equal(p.run("(() => { const lay = layout(S.exp.patch.key); return lay.lines.ops.filter(o => o.kind === 'range').length + [...lay.lines.cells.values()].filter(v => v.kind === 'range').length; })()"), 0, "no range block or op");
});
