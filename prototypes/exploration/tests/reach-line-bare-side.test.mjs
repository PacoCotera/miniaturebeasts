// ui-reach-line-157-1 (owner #157): a side the Probe's range square shuts draws its dashed reach line whether or not the place lists an opening on that side.
//   node --test prototypes/exploration/tests/reach-line-bare-side.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

// a baked place (seed 13, tier 1) with a side the Probe's range shuts, found in the world
const fresh = () => {
  const p = makePage({ gen: 7, console: "collect" });
  p.run("newWorld(13); TEST.calm = true; S.tier = 1; startExpedition('weather', G.spawns[0]);");
  const c = p.run(`(() => { for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER || G.island[c]) continue; S.exp.pos = c; enterPatch(); if (RT.view) endView(); const lay = layout(String(c)); if (lay.baked && !lay.cave && ['N', 'E', 'S', 'W'].some(s => openingKind(lay, { side: s }).kind === 'range')) return c; leavePatch(); } return -1; })()`);
  assert.ok(c >= 0, "a place with a shut side exists in seed 13");
  return p;
};
const SHUT = "(() => { const lay = layout(S.exp.patch.key); return ['N', 'E', 'S', 'W'].filter(s => openingKind(lay, { side: s }).kind === 'range').sort().join(','); })()";
const LINES = "(() => { const lay = layout(S.exp.patch.key); return edgeSides(lay, S.exp.patch).filter(e => e.k.kind === 'range').map(e => e.o.side).sort().join(','); })()";

test("#157 a shut side with no opening listed draws its reach line; a side that is open draws none", () => {
  const p = fresh();
  const shut = p.run(SHUT);
  p.run("{ const lay = layout(S.exp.patch.key); lay.openings = []; }");
  assert.equal(p.run(LINES), shut, "a line on every shut side with no opening listed: " + shut);
  p.run("{ const lay = layout(S.exp.patch.key); globalThis.__ok = ['N', 'E', 'S', 'W'].filter(s => openingKind(lay, { side: s }).kind !== 'range').every(s => !edgeSides(lay, S.exp.patch).some(e => e.o.side === s && e.k.kind === 'range')); }");
  assert.equal(p.run("globalThis.__ok"), true, "no reach line on a side that is not shut");
});

test("#157 a shut side that lists an opening still draws one whole-side line", () => {
  const p = fresh();
  const side = p.run(SHUT).split(",")[0];
  p.run(`{ const lay = layout(S.exp.patch.key); lay.openings = [{ side: '${side}', from: 2, to: 5 }]; }`);
  assert.equal(p.run(`edgeSides(layout(S.exp.patch.key), S.exp.patch).filter(e => e.k.kind === 'range' && e.o.side === '${side}').length`), 1);
});
