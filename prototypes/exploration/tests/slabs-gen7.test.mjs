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

// slabs-gen7-build-5: seed 16 cell 167 once laid its slab on a tile that cut 1 walked tile off from the ways in; the slab tile shut, every walked tile is still reached
test("seed 16 cell 167: the slab tile solid leaves the walk whole from the ways in", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(16);");
  const r = JSON.parse(p.run(`(() => { const lay = layout7In(PL.ctx, G, 16, G.slot, '167', () => false, biomeVersion(S)), f = lay.feats.find(q => q.kind === 's'), w = lay.w, h = lay.h, slabI = f.y * w + f.x, RB = { '0,-1': 1, '0,1': 2, '-1,0': 4, '1,0': 8 };
    const seen = new Uint8Array(w * h), st = [], walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !T_BLOCK[lay.tiles[y * w + x]] && y * w + x !== slabI;
    const starts = [lay.spawnPt]; for (const op of lay.openings) for (let k = op.from - 1; k <= op.to - 1; k++) starts.push(op.side === 'N' ? { x: k, y: 0 } : op.side === 'S' ? { x: k, y: h - 1 } : op.side === 'W' ? { x: 0, y: k } : { x: w - 1, y: k });
    for (const s of starts) if (walk(s.x, s.y) && !seen[s.y * w + s.x]) { seen[s.y * w + s.x] = 1; st.push(s.y * w + s.x); }
    while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (!walk(X, Y)) continue; const j = Y * w + X; if (!seen[j] && !(lay.rimSteps[i] & RB[dx + ',' + dy])) { seen[j] = 1; st.push(j); } } }
    let lost = 0; for (let i = 0; i < w * h; i++) if (lay.compId[i] && i !== slabI && !seen[i]) lost++;
    return JSON.stringify({ x: f.x, y: f.y, lost }); })()`));
  assert.equal(r.lost, 0, "no walked tile is cut off by the slab");
  assert.ok(!(r.x === 12 && r.y === 18), "the slab is not on the tile that split the walk");
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
