// Walk content B6: the creatures of one cell share the template's spawn areas round robin by id (never all in the first), and every one stands inside an area.
//   node --test prototypes/exploration/tests/herds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));

test("a cell with three creatures and three spawn areas: they land in three different areas, one each by id", () => {
  const seen = new Set();
  for (const seed of [7, 13, 42]) {
    const p = makePage({ gen: 6, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const cells = plain(p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && layout(String(c)).spawns && layout(String(c)).spawns.length === 3) out.push(c); return out; })()"));
    assert.ok(cells.length, "cells with three spawn areas, seed " + seed);
    for (const c of cells.slice(0, 12)) {
      const r = plain(p.run(`(() => { const key = '${c}', lay = layout(key); S.cr = S.cr.filter(w => w.c !== ${c}); const named = lay.spawns.find(q => q.species.length), sp0 = named ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].find(i => spOf(i).name.toLowerCase() === named.species[0]) : 0; S.cr.push(...[91001, 91002, 91003].map(id => ({ id, sp: sp0, c: ${c}, cv: 0, b: .5, s: 0 })));
        delete S.exp.live[key]; const live = ensureLive(key), areas = lay.spawns.map((q, i) => ({ i, q })); const at = id => { const w = live.cr.find(q => q.id === id); return w ? areas.filter(a => w.x >= a.q.x && w.y >= a.q.y && w.x < a.q.x + a.q.w && w.y < a.q.y + a.q.h).map(a => a.i) : null; };
        return { id: lay.baked.id, at: [91001, 91002, 91003].map(at) }; })()`));
      seen.add(r.id.replace("~x", ""));
      for (const a of r.at) assert.ok(a && a.length >= 1, `cell ${c} ${r.id}: a creature outside every spawn area ${JSON.stringify(r.at)}`);
      const first = r.at.map((a) => a[0]);   // the areas can touch; the one each creature was dealt shows as its first match when they do not overlap
      assert.equal(new Set(first).size, 3, `cell ${c} ${r.id}: the herd is not spread over its three areas ${JSON.stringify(r.at)}`);
    }
  }
  assert.ok(seen.has("Windstep"), [...seen].join());
});
