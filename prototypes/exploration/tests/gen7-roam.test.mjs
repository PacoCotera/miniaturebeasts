// Something beside the trail (R1) and water at the cliff foot (W4), map-making-research-1 scheme item 1 (realm-roam-r1w4-1). The numbers are the realm sheet's (tools/realm-sheet), on seeds 1, 7 and 13.
import test from 'node:test';
import assert from 'node:assert/strict';
import { realm7 } from '../src/gen7/region.mjs';
import { RW, RH } from '../src/gen7/world.mjs';

const SEEDS = [1, 7, 13], NR = RW * RH, X = c => c % RW, Y = c => (c / RW) | 0;
const cheb = (a, b) => Math.max(Math.abs(X(a) - X(b)), Math.abs(Y(a) - Y(b)));
// Chebyshev rings (places) from a set of cells
function rings(cells) { const d = new Int16Array(NR).fill(999), q = [];
  for (const c of cells) { d[c] = 0; q.push(c); }
  for (let h = 0; h < q.length; h++) { const c = q[h]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = X(c) + dx, y = Y(c) + dy; if (x < 0 || y < 0 || x >= RW || y >= RH) continue; const n = y * RW + x; if (d[n] > d[c] + 1) { d[n] = d[c] + 1; q.push(n); } } }
  return d; }
const seedRng = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };

test('R1: on 9 trips in 10 no stretch of 8 places goes by with no destination within one place of the trail', () => {
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, dd = rings(re.destinations.map(d => d.c)), adj = new Map();
    for (const l of re.roads.lists) for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i]; if (a === b) continue; for (const [u, v] of [[a, b], [b, a]]) { if (!adj.has(u)) adj.set(u, new Set()); adj.get(u).add(v); } }
    const nodes = [...adj.keys()].sort((a, b) => a - b), rnd = seedRng(seed * 7919 + 1);
    let trips = 0, under = 0, guard = 0;
    while (trips < 150 && guard++ < 20000) {
      const a = nodes[(rnd() * nodes.length) | 0], b = nodes[(rnd() * nodes.length) | 0]; if (cheb(a, b) < 15) continue;
      const prev = new Map([[a, -1]]), q = [a]; for (let h = 0; h < q.length && !prev.has(b); h++) for (const n of adj.get(q[h])) if (!prev.has(n)) { prev.set(n, q[h]); q.push(n); }
      if (!prev.has(b)) continue;
      trips++; let run = 0, best = 0; for (let c = b; c !== -1; c = prev.get(c)) { run = dd[c] <= 1 ? 0 : run + 1; if (run > best) best = run; }
      if (best < 8) under++;
    }
    assert.ok(trips >= 100, 'seed ' + seed + ' trips ' + trips);
    assert.ok(under / trips >= 0.9, 'seed ' + seed + ': ' + under + ' of ' + trips + ' trips have no 8-place stretch with nothing beside it');
  }
});

test('R1: a spot the trail gets is on or one cell off the trail, and one the land ties to a feature names it', () => {
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, on = re.roads.on, spots = re.destinations.filter(d => d.along);
    assert.ok(spots.length >= 50, 'seed ' + seed + ' spots ' + spots.length);
    for (const d of spots) {
      let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = X(d.c) + dx, y = Y(d.c) + dy; if (x >= 0 && y >= 0 && x < RW && y < RH && on[y * RW + x]) near = true; }
      assert.ok(near, 'seed ' + seed + ' spot at ' + d.c + ' beside the trail');
      if (d.kind !== 'reach') assert.ok(['shore', 'stream bend', 'cliff foot'].includes(d.kind) && d.feature !== 'land', d.kind);
    }
    assert.ok(spots.filter(d => d.kind !== 'reach').length >= 10, 'seed ' + seed + ' some spots are tied to a feature');
  }
});

test('W4: an escarpment of 8+ faces has water coming out within 2 of its foot (a spring where it had none), and 40% of faces have', () => {
  let faces = 0, wet = 0;
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, byKind = k => re.features.filter(f => f.kind === k), em = [];
    for (const f of byKind('falls')) em.push(f.links.foot);
    for (const f of byKind('stream')) { const s = f.links.seen; if (s > 0 && s < f.cells.length) em.push(f.cells[s]); }
    for (const d of re.destinations) if (d.kind === 'spring' || d.kind === 'ravine head') em.push(d.c);
    const dw = rings(em);
    assert.ok(re.destinations.filter(d => d.foot).length >= 8, 'seed ' + seed + ' springs at a foot');
    let dry = 0; for (const e of byKind('escarpment')) { const f = e.cells; faces += f.length; wet += f.filter(c => dw[c + RW] <= 2).length; if (f.length >= 8 && !f.some(c => dw[c + RW] <= 2)) dry++; }
    assert.ok(dry <= 1, 'seed ' + seed + ' long escarpments with no water at the foot: ' + dry);
  }
  assert.ok(wet / faces >= 0.4, 'faces with water within 2: ' + Math.round(1000 * wet / faces) / 10 + '%');
});
