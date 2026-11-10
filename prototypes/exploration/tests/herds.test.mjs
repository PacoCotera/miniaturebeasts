// Walk content B6: the creatures of one cell stand inside a spawn area, and in one that is theirs. Generator 7 (573cb9051) names one species for each of a cell's spawn areas (a cell has one or two;
// never three, never two for one species), so the round robin over a template's several areas has nothing to deal: the herd of a species fills its own area, whatever the other area holds.
//   node --test prototypes/exploration/tests/herds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));

test("a cell with two spawn areas of two species: each creature lands inside the area of its own species, three of them by id", () => {
  for (const seed of [7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const cells = plain(p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && layout(String(c)).spawns && layout(String(c)).spawns.length === 2) out.push(c); return out; })()"));
    assert.ok(cells.length, "cells with two spawn areas, seed " + seed);
    for (const c of cells.slice(0, 12)) {
      const r = plain(p.run(`(() => { const key = '${c}', lay = layout(key); S.cr = S.cr.filter(w => w.c !== ${c}); const idx = i => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].find(k => spOf(k).name.toLowerCase() === lay.spawns[i].species[0]);
        const plan = [[91001, idx(0), 0], [91002, idx(1), 1], [91003, idx(0), 0]]; S.cr.push(...plan.map(([id, sp]) => ({ id, sp, c: ${c}, cv: 0, b: .5, s: 0 })));
        delete S.exp.live[key]; const live = ensureLive(key); const inside = (w, q) => w.x >= q.x && w.y >= q.y && w.x < q.x + q.w && w.y < q.y + q.h;
        return { id: lay.baked.id, mine: plan.map(([id, sp, a]) => { const w = live.cr.find(q => q.id === id); return !!w && inside(w, lay.spawns[a]); }) }; })()`));
      assert.deepEqual(r.mine, [true, true, true], `seed ${seed} cell ${c} ${r.id}: a creature outside the area of its species`);
    }
  }
});
