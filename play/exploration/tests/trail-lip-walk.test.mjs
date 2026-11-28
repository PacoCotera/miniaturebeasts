// Owner bug #148 (trail's top runs on into the cliff gap): the lip rule (place.mjs, "the lip between a trail's top and its gap") changes only what is DRAWN (the `top` layer),
// never what walks, and the trail drawn on the lip can be walked into the gap path both ways (else it is the invisible wall of #99/#100 again).
//   node --test prototypes/exploration/tests/trail-lip-walk.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makePage } from "./page-harness.mjs";

const GEN7 = new URL("../src/gen7/", import.meta.url);
const CELLS = [[19, 6], [13, 6], [7, 9], [22, 10], [30, 10], [18, 12], [12, 15], [13, 15], [33, 16], [15, 19], [19, 28], [5, 30]];   // his cell first, then the 11 others

test("the lip rule leaves the walkable terrain of seed 64 unchanged (only `top` moves)", async () => {
  const src = fs.readFileSync(new URL("place.mjs", GEN7), "utf8");
  const a = src.indexOf("{ const lips = [];"), endMark = "for (const k of lips) pathTop[k] = 1; }", b = src.indexOf(endMark, a);
  assert.ok(a > 0 && b > a, "the lip rule block is found in place.mjs");
  const old = new URL("place_nolip_tmp.mjs", GEN7);   // place.mjs with the lip rule cut out, beside it so its imports resolve
  fs.writeFileSync(old, src.slice(0, a) + src.slice(b + endMark.length));
  try {
    const without = await import(old.href), withRule = await import(new URL("place.mjs", GEN7).href);
    let tops = 0;
    for (const [X, Y] of CELLS) {
      const p = without.cellTerrain(64, X, Y), q = withRule.cellTerrain(64, X, Y);
      assert.equal(p.terrain.length, q.terrain.length);
      for (let i = 0; i < p.terrain.length; i++) { assert.equal(q.terrain[i], p.terrain[i], `terrain differs in cell ${X},${Y} at ${i}`); if (p.top[i] !== q.top[i]) tops++; }
    }
    assert.ok(tops > 0, "the rule does draw: some `top` tile changed");
  } finally { fs.rmSync(old, { force: true }); }
});

test("#148 his lip (cell 19,6, lip (8,15) of the apron): the step from the trail drawn on the lip into the gap path is allowed both ways", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(64);");
  // seed 64's realm cell 19,6 is slot [1,0] cell 99 (6 * MW + 3); the walk is the page's own: layout7 > adaptCell (tiles, reach, rimSteps) and rimRefuses
  const r = JSON.parse(p.run(`(() => { const v = biomeVersion(S), b = bakedCell7(PL.ctx, 64, [1, 0], 99, v), lay = layout7In(PL.ctx, G, 64, [1, 0], '99', () => false, v, b), pl = b.place, W = pl.w;
    const at = (x, y) => (y + 1) * W + x + 1;   // the apron's index of an inner tile
    const lip = { x: 7, y: 14 }, up = { x: 7, y: 13 }, down = { x: 7, y: 15 };
    const ok = (a, c) => !!lay.reach[c.y * lay.w + c.x] && !T_BLOCK[lay.tiles[c.y * lay.w + c.x]] && !rimRefuses(lay, a.x, a.y, c.x, c.y);
    return JSON.stringify({ lipTerrain: pl.terrain[at(lip.x, lip.y)], lipTop: pl.top[at(lip.x, lip.y)], gapTop: pl.top[at(up.x, up.y)], lowTerrain: pl.terrain[at(down.x, down.y)],
      CLIFF: PL.ctx.terrains.find(t => t.id === 'cliff').value, PATH: PL.ctx.terrains.find(t => t.id === 'path').value,
      upOk: ok(lip, up), downOk: ok(lip, down), upBack: ok(up, lip), downBack: ok(down, lip), lipReach: !!lay.reach[lip.y * lay.w + lip.x] }); })()`));
  assert.equal(r.lipTerrain, r.CLIFF, "the lip tile stays cliff in the terrain");
  assert.ok(r.lipTop > 0, "the lip is drawn as the trail's top");
  assert.equal(r.lowTerrain, r.PATH, "the low path lies just below the lip");
  assert.ok(r.lipReach, "the lip tile walks");
  assert.equal(r.downOk, true, "lip -> low path (down into the gap) is allowed");
  assert.equal(r.downBack, true, "low path -> lip (up onto the trail) is allowed");
  assert.equal(r.upOk, true, "lip -> the trail's top above is allowed");
  assert.equal(r.upBack, true, "the trail's top -> lip is allowed");
});
