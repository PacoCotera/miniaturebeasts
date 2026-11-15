// World top down, step F1: the realm's named features (gen7/features.mjs), read off the realm without changing it. Counts on seeds 1, 7 and 13 against the spec's table
// (a realm: rivers 10-23, lakes ~6, ponds ~42, streams 53-70, falls 6-17, stream ravines 22-34, through-ravines 13-19, ranges 5-15, passes 5-20, escarpments 46-61, destinations 125-148),
// the destinations' ids and indices, and that a second run gives the same features and leaves the realm's levels alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { realm7, featureInput } from '../src/gen7/region.mjs';
import { realmFeatures, P } from '../src/gen7/features.mjs';

const SEEDS = [1, 7, 13];
const BAND = { river: [10, 25], lake: [2, 14], pond: [25, 50], stream: [50, 80], falls: [5, 17], ravine: [20, 42], 'through-ravine': [12, 24], range: [5, 18], pass: [8, 24], escarpment: [40, 62] };

test('the cuts are made: every ravine and through-ravine cell is low in the realm, its raising height holds it low, and no cell is cut twice', () => {
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, seen = new Set();
    for (const f of re.features.filter(x => x.kind === 'ravine' || x.kind === 'through-ravine')) for (const c of f.cells) {
      assert.equal(re.level[c], 0, 'seed ' + seed + ' ' + f.id + ' cell ' + c + ' is low'); assert.ok(re.E[c] < re.e0[c], 'seed ' + seed + ' ' + f.id + ' held low by e0'); assert.ok(!seen.has(c), 'cut once'); seen.add(c);
    }
  }
});

test('stream ravines come from the water: the longer ones are on the bigger streams (rank correlation of length and flow over 0.3), and no more than RAV_MAX cells', () => {
  const rank = a => { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; i = j + 1; } return r; };
  const L = [], Fl = [];
  for (const seed of SEEDS) { const re = realm7(seed).realm; for (const f of re.features.filter(x => x.kind === 'ravine')) { assert.ok(f.cells.length >= 1 && f.cells.length <= P.RAV_MAX); L.push(f.cells.length); Fl.push(re.acc[f.cells[f.cells.length - 1]]); } }
  const a = rank(L), b = rank(Fl), ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; }
  assert.ok(sab / Math.sqrt(sa * sb) > 0.3, 'rank correlation ' + sab / Math.sqrt(sa * sb));
});

test('a lake lets out one stream', () => {
  for (const seed of SEEDS) {
    const out = realm7(seed), F = realmFeatures(featureInput(out)), owner = new Map();
    F.bodies.forEach((b, i) => { if (b.kind !== 'river') for (const c of b.cells) owner.set(c, i); });
    const leave = new Map();
    for (const s of F.streams) { const x = s.cells[0] % 80, nb = [s.cells[0] - 80, s.cells[0] + 80, x < 79 ? s.cells[0] + 1 : -1, x > 0 ? s.cells[0] - 1 : -1].filter(n => owner.has(n)); for (const i of new Set(nb.map(n => owner.get(n)))) leave.set(i, (leave.get(i) || 0) + 1); }
    for (const [i, v] of leave) assert.equal(v, 1, 'seed ' + seed + ' body ' + i + ' lets out ' + v);
  }
});

test('counts of each feature kind on seeds 1, 7 and 13 are in the spec\'s band', () => {
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, n = {};
    for (const f of re.features) n[f.kind] = (n[f.kind] || 0) + 1;
    for (const [k, [lo, hi]] of Object.entries(BAND)) assert.ok(n[k] >= lo && n[k] <= hi, 'seed ' + seed + ' ' + k + ' ' + n[k] + ' not in ' + lo + '-' + hi);
    const own = realmFeatures(featureInput(realm7(seed))).dest.length;   // the features' own destinations; the trails add far shores, bridges and the land's own spots in holes (R14)
    assert.ok(own >= 95 && own <= 150, 'seed ' + seed + ' destinations ' + own);
    assert.ok(re.destinations.length >= own, 'the trails only add destinations');
    assert.ok(n.bridge >= 5 && n.bridge <= 10, 'seed ' + seed + ' bridges ' + n.bridge);
  }
});

test('every feature has an id, cells in order and links; names are empty slots; destinations carry their feature id and an index along it', () => {
  const re = realm7(7).realm, ids = new Set();
  for (const f of re.features) { assert.ok(f.id && !ids.has(f.id), 'unique id ' + f.id); ids.add(f.id); assert.ok(f.cells.length > 0 && f.links, f.id); assert.equal(f.name, undefined); }
  for (const d of re.destinations) {
    if (d.feature === 'land') { assert.equal(d.kind, 'reach'); continue; }   // a spot the trails added in a hole (R14): the land's own, no feature
    assert.ok(ids.has(d.feature), 'destination feature ' + d.feature);
    const f = re.features.find(x => x.id === d.feature);
    assert.ok(Number.isInteger(d.index) && d.index >= 0 && d.index < f.cells.length, d.kind + ' index');
    if ((d.kind !== 'ravine' || f.kind !== 'through-ravine') && d.kind !== 'far shore') assert.equal(f.cells[d.index], d.c, d.kind + ' stands on its feature\'s cell');
  }
  // streams run source to mouth and end on water, the coast or another stream
  for (const f of re.features.filter(x => x.kind === 'stream')) assert.ok(f.cells.length >= P.STREAM_MIN);
});

test('determinism: the same input gives the same features, and the realm\'s own levels are untouched', () => {
  for (const seed of SEEDS) {
    const R = realm7(seed), a = realmFeatures(featureInput(R)), b = realmFeatures(featureInput(R));
    assert.equal(JSON.stringify(a.list), JSON.stringify(b.list));
    assert.equal(JSON.stringify(a.dest), JSON.stringify(b.dest));
    assert.equal(JSON.stringify(a.list), JSON.stringify(R.realm.features.filter(f => f.kind !== 'bridge')), 'the realm\'s features are these, plus the trails\' bridges');
    const inp = featureInput(R);
    assert.deepEqual(Array.from(a.level), Array.from(inp.level), 'seed ' + seed + ': the features leave the level as it was');
  }
});
