// slabs-gen7-build-1: Generator 7 lays pushable slabs again, about one place in five, each hiding something (a pod about one in three, else a material or a find).
//   node --test prototypes/exploration/tests/slabs-gen7.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

// seed 1: the cells that lay a slab of each kind (found by the scan of 200 seeds, runs/slabs-gen7-build-1)
const CELLS = { 211: "pod", 200: "mat", 163: "find" };

test("seed 1: slabs stand pushable with something under, and a push takes what lies under", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(1);");
  for (const [cell, under] of Object.entries(CELLS)) {
    const r = JSON.parse(p.run(`(() => { const lay = layout('${cell}'), s = lay.feats.filter(q => q.kind === 's');
      return JSON.stringify({ n: s.length, under: s[0] && s[0].under, ok: !!s[0] && Object.values(DIRS).some(([dx, dy]) => { const tx = s[0].x + dx, ty = s[0].y + dy, sx = s[0].x - dx, sy = s[0].y - dy;
        return tx >= 1 && ty >= 1 && tx < lay.w - 1 && ty < lay.h - 1 && !T_BLOCK[lay.tiles[ty * lay.w + tx]] && !!lay.reach[sy * lay.w + sx] && !T_BLOCK[lay.tiles[sy * lay.w + sx]]; }) }); })()`));
    assert.equal(r.n, 1, `cell ${cell} lays one slab`);
    assert.equal(r.under, under, `cell ${cell} hides a ${under}`);
    assert.ok(r.ok, `cell ${cell}: the slab can be pushed some way`);
  }
});

// the Companion's path: a cell { ir, place } as the package holds it lays the same slab as the generator, and no strike tile is a slab's
test("seed 1: the baked cell the Companion reads gives the same slab as the generator, and a slab never takes a strike's tile", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(1);");
  for (const [cell, under] of Object.entries(CELLS)) {
    const r = JSON.parse(p.run(`(() => { const v = biomeVersion(S), slab = l => (l.feats || []).filter(q => q.kind === 's').map(q => [q.x, q.y, q.under]);
      const fresh = layout7In(PL.ctx, G, 1, G.slot, '${cell}', () => false, v), b = bakedCell7(PL.ctx, 1, G.slot, ${cell}, v),
        held = layout7In(PL.ctx, G, 1, G.slot, '${cell}', () => false, v, b);
      const onStrike = slab(held).some(([x, y]) => b.ir.strikes.some(m => m.x - 1 === x && m.y - 1 === y));
      return JSON.stringify({ a: slab(fresh), b: slab(held), onStrike }); })()`));
    assert.equal(r.a.length, 1);
    assert.deepEqual(r.b, r.a, `cell ${cell}: the held cell lays the same slab`);
    assert.equal(r.b[0][2], under);
    assert.equal(r.onStrike, false);
  }
});
