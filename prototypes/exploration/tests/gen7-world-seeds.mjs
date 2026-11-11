// Generator 7, chunk G1: the region checks over a range of seeds (gen7-world.test.mjs has the golden vectors and the fields). Every region of the seeds (all 25 slots, so every biome) is generated
// once and checked. Seeds 1-200 took about 18 minutes in one file, all of it generating the realms before the first test; they are now four files of 50 seeds (gen7-world-s1-50 to -s151-200.test.mjs),
// so the CI shards can share the time. The checks are those of the one file; the two that average over the seeds (every biome present, the land shares) average over the 50 seeds of the file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { realm7, NC } from '../src/gen7/region.mjs';
import { biomeTargets } from '../src/gen7/world.mjs';
import { MW, L, EDGE, canStepIn } from '../src/world.mjs';
import { ATLAS, BIOMES } from '../src/regions.mjs';

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
      assert.ok(main * 100 >= 70 * dry && walk >= 260 && lv.every(n => n * 100 >= 10 * dry) && G.cross.length >= 1);
    }
  });

  test('each biome\'s land shares are within 5 points of its targets', () => {
    const sum = {};
    for (const { G } of all) { const s = sum[G.biome] ??= { n: 0, wood: 0, rock: 0 }; s.n++; for (let c = 0; c < NC; c++) { if (G.land[c] === L.WOOD) s.wood++; if (G.land[c] === L.ROCK) s.rock++; } }
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

  test('trails run over walkable cells, cross levels only at stairs, and every crossing has a port', () => {
    let trails = 0, ports = 0;
    for (const { seed, G } of all.filter(x => x.seed <= 60)) {
      for (const t of G.trails) {
        trails++;
        for (let i = 1; i < t.cells.length; i++) {
          const a = t.cells[i - 1], b = t.cells[i], d = b - a, dir = d === 1 ? 'right' : d === -1 ? 'left' : d === MW ? 'down' : 'up';
          assert.ok(canStepIn(G, a, dir), seed + ' trail step ' + a + '>' + b);
          if (G.level[a] !== G.level[b]) assert.equal(G.edge[(d === 1 ? 2 * a : d === -1 ? 2 * b : d === MW ? 2 * a + 1 : 2 * b + 1)], EDGE.RAMP);
        }
      }
      const byE = new Map(G.ports.map(p => [p.e, p]));
      for (let i = 0; i < 2 * NC; i++) if (G.edge[i] === EDGE.RAMP) assert.equal(byE.get(i)?.kind, 'stair', 'a stair has its port');
      for (const p of G.ports) { ports++; const len = p.e & 1 ? 24 : 28; assert.ok(p.off >= 6 && p.off <= len - 7, 'a port is 6 or more tiles from either end'); }
    }
    console.log('# trails checked: ' + trails + ' trails, ' + ports + ' ports (seeds 1-60 of ' + range + ')');
    if (lo <= 60) assert.ok(trails > 0 && ports > 0);   // the trail check covers seeds 1-60 only
  });
}
