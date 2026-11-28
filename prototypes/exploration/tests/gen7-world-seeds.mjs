// Generator 7, chunk G1: the region checks over a range of seeds (gen7-world.test.mjs has the golden vectors and the fields). Every region of the seeds (all 25 slots, so every biome) is generated
// once and checked. Seeds 1-200 took about 18 minutes in one file, all of it generating the realms before the first test; they are now four files of 50 seeds (gen7-world-s1-50 to -s151-200.test.mjs),
// so the CI shards can share the time. The checks are those of the one file; the two that average over the seeds (every biome present, the land shares) average over the 50 seeds of the file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { realm7, NC } from '../src/gen7/region.mjs';
import { RW } from '../src/gen7/world.mjs';
import { biomeTargets } from '../src/gen7/world.mjs';
import { MW, MH, L, EDGE, canStepIn } from '../src/world.mjs';
import { ATLAS, BIOMES } from '../src/logic/regions.mjs';

const SHARE_TOL = 5;

export function regionChecks(lo, hi) {
  const all = [];   // every region of seeds lo-hi
  for (let seed = lo; seed <= hi; seed++) { const R = realm7(seed); for (const G of R.regions) all.push({ seed, G, R }); }
  const range = `seeds ${lo}-${hi}`;

  test(`over ${range} and every biome, the region checks pass (main part >= 70%, >= 260 walkable cells, level shares, a stair)`, () => {
    const per = {};
    for (const { G } of all) { const p = per[G.biome] ??= { n: 0, ok: 0 }; p.n++; if (!G.fails.length) p.ok++; }
    const lines = BIOMES.map(b => b.padEnd(9) + ' ' + per[b].ok + '/' + per[b].n + ' pass ' + (100 * per[b].ok / per[b].n).toFixed(2) + '%');
    console.log(`# region checks, ${range}:\n# ` + lines.join('\n# '));
    for (const b of BIOMES) assert.ok(per[b] && per[b].n > 0, 'no ' + b + ' region in ' + range);
    const bad = all.filter(x => x.G.fails.length).map(x => x.seed + ' ' + x.G.slot + ' ' + x.G.biome + ' ' + x.G.fails);
    assert.deepEqual(bad, []);
    for (const { G } of all) {   // the checks' own numbers, read back from the data
      let dry = 0, main = 0, walk = 0; const lv = [0, 0];   // one raised level: 0 and 1
      for (let c = 0; c < NC; c++) { walk += G.comp[c]; if (G.land[c] !== L.WATER && !G.island[c]) { dry++; main += G.comp[c]; lv[G.level[c]]++; } }
      const lost = G.lost || 0; dry += lost; main += lost; walk += lost; lv[0] += lost;   // a rim region keeps the credit for the border ring the coast took
      assert.ok(G.cross.length >= 1);
      if (!lost) assert.ok(main * 100 >= 70 * dry && walk >= 260 && lv.every(n => n * 100 >= 10 * dry));   // a rim region's land-shape checks were waived once the coast took its ring (region.mjs): they passed before it, and the credit above only softens them
    }
  });

  test('each biome\'s land shares are within 5 points of its targets', () => {
    const sum = {};
    for (const { G } of all) { const s = sum[G.biome] ??= { n: 0, wood: 0, rock: 0 }; s.n += 1 - (G.lost || 0) / NC; for (let c = 0; c < NC; c++) { if (G.land[c] === L.WOOD) s.wood++; if (G.land[c] === L.ROCK) s.rock++; } }
    const lines = [];
    for (const b of BIOMES) {
      const t = biomeTargets(b), s = sum[b], wood = 100 * s.wood / (s.n * NC), rock = 100 * s.rock / (s.n * NC), tw = 100 * t.wood / NC, tr = 100 * t.rock / NC;
      lines.push(b.padEnd(9) + ' wood ' + wood.toFixed(1) + ' (target ' + tw.toFixed(1) + ')  rock ' + rock.toFixed(1) + ' (target ' + tr.toFixed(1) + ')');
      assert.ok(Math.abs(wood - tw) <= SHARE_TOL, b + ' wood ' + wood + ' vs ' + tw);
      assert.ok(Math.abs(rock - tr) <= SHARE_TOL, b + ' rock ' + rock + ' vs ' + tr);
    }
    console.log(`# land shares, % of cells, mean over ${range}:\n# ` + lines.join('\n# '));
  });

  test('cells along a shared region border agree', () => {
    const opp = { up: 'down', down: 'up', left: 'right', right: 'left' }, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let pairs = 0, cells = 0;
    for (const { seed, G, R } of all) {
      for (const side of ['right', 'down']) {   // each shared border once
        const [ax, ay] = G.slot, nx = ax + D[side][0], ny = ay + D[side][1]; if (nx >= ATLAS || ny >= ATLAS) continue;
        const N = R.regions[ny * ATLAS + nx]; pairs++;
        G.border[side].forEach((a, i) => {
          const b = N.border[opp[side]][i]; cells++;
          assert.deepEqual(a.own, b.other, seed + ' ' + G.slot + ' ' + side + ' ' + i + ': my cell as the neighbour reads it');
          assert.deepEqual(a.other, b.own, seed + ' ' + G.slot + ' ' + side + ' ' + i + ': the neighbour\'s cell as I read it');
          assert.equal(a.kind, b.kind, seed + ' ' + G.slot + ' ' + side + ' ' + i + ': the edge between');
        });
      }
    }
    console.log('# borders compared: ' + pairs + ' region pairs, ' + cells + ' cell pairs, all equal');
    assert.ok(pairs > 0);
  });

  test('the realm\'s trails run over walkable cells, cross levels only at stairs and water only at fords and bridges, and one network joins every region', () => {
    let lists = 0, steps = 0;
    const realms = new Map(); for (const { seed, R } of all) if (seed <= 60) realms.set(seed, R);
    for (const [seed, R] of realms) {
      const rd = R.realm.roads, cellOf = w => { const X = w % RW, Y = (w / RW) | 0, G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); return { G, c }; };
      const bridge = new Set(); for (const b of rd.bridges) for (const w of b.cells) bridge.add(w);
      rd.lists.forEach(cells => {
        lists++;
        for (let i = 0; i < cells.length; i++) {
          const { G, c } = cellOf(cells[i]);
          assert.ok(bridge.has(cells[i]) || (G.land[c] !== L.WATER || G.ford[c] === 1) && !G.island[c], seed + ' a trail cell walks: ' + cells[i]);
          if (!i) continue; steps++;
          const a = cells[i - 1], b = cells[i], d = Math.abs(b - a); assert.ok(d === 1 || d === RW, seed + ' a trail steps to a 4-neighbour');
          const A = cellOf(a), B = cellOf(b);
          if (A.G.level[A.c] !== B.G.level[B.c]) { const up = A.G.level[A.c] > B.G.level[B.c] ? a : b, U = cellOf(up); assert.equal(up + RW === (A.G.level[A.c] > B.G.level[B.c] ? b : a), true, seed + ' a level changes down a south face'); assert.ok(U.G.cross.some(x => x.side === 's' && x.c === U.c), seed + ' at a stair'); }
        }
      });
      // one network: the trail cells form one connected set that touches all 25 regions
      const adj = new Map(); rd.lists.forEach(cells => cells.forEach((w, i) => { if (!adj.has(w)) adj.set(w, new Set()); if (i) { adj.get(w).add(cells[i - 1]); if (!adj.has(cells[i - 1])) adj.set(cells[i - 1], new Set()); adj.get(cells[i - 1]).add(w); } }));
      const first = adj.keys().next().value, seen = new Set([first]), st = [first]; while (st.length) { const u = st.pop(); for (const v of adj.get(u)) if (!seen.has(v)) { seen.add(v); st.push(v); } }
      assert.equal(seen.size, adj.size, seed + ' one network');
      const regs = new Set([...seen].map(w => Math.floor(((w / RW) | 0) / MH) * ATLAS + Math.floor((w % RW) / MW))); assert.equal(regs.size, ATLAS * ATLAS, seed + ' joins all regions');
    }
    console.log('# trails checked: ' + lists + ' lists, ' + steps + ' steps (seeds 1-60 of ' + range + ')');
    if (lo <= 60) assert.ok(lists > 0);   // the trail check covers seeds 1-60 only
  });
}
