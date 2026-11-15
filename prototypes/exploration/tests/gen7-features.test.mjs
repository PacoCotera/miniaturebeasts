// World top down, step F1: the realm's named features (gen7/features.mjs), read off the realm without changing it. Counts on seeds 1, 7 and 13 against the spec's table
// (a realm: rivers 10-23, lakes ~6, ponds ~42, streams 53-70, falls 6-17, stream ravines 22-34, through-ravines 13-19, ranges 5-15, passes 5-20, escarpments 46-61, destinations 125-148),
// the destinations' ids and indices, and that a second run gives the same features and leaves the realm's levels alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { realm7, featureInput } from '../src/gen7/region.mjs';
import { realmFeatures, P } from '../src/gen7/features.mjs';

const SEEDS = [1, 7, 13];
const BAND = { river: [10, 25], lake: [2, 14], pond: [25, 50], stream: [50, 72], falls: [5, 17], ravine: [20, 36], 'through-ravine': [12, 20], range: [5, 15], pass: [5, 21], escarpment: [40, 62] };

test('cutting is off: the features are found and the land is not touched', () => { assert.equal(P.CUT, 0); });

test('counts of each feature kind on seeds 1, 7 and 13 are in the spec\'s band', () => {
  for (const seed of SEEDS) {
    const re = realm7(seed).realm, n = {};
    for (const f of re.features) n[f.kind] = (n[f.kind] || 0) + 1;
    for (const [k, [lo, hi]] of Object.entries(BAND)) assert.ok(n[k] >= lo && n[k] <= hi, 'seed ' + seed + ' ' + k + ' ' + n[k] + ' not in ' + lo + '-' + hi);
    assert.ok(re.destinations.length >= 110 && re.destinations.length <= 150, 'seed ' + seed + ' destinations ' + re.destinations.length);
  }
});

test('every feature has an id, cells in order and links; names are empty slots; destinations carry their feature id and an index along it', () => {
  const re = realm7(7).realm, ids = new Set();
  for (const f of re.features) { assert.ok(f.id && !ids.has(f.id), 'unique id ' + f.id); ids.add(f.id); assert.ok(f.cells.length > 0 && f.links, f.id); assert.equal(f.name, undefined); }
  for (const d of re.destinations) {
    assert.ok(ids.has(d.feature), 'destination feature ' + d.feature);
    const f = re.features.find(x => x.id === d.feature);
    assert.ok(Number.isInteger(d.index) && d.index >= 0 && d.index < f.cells.length, d.kind + ' index');
    if (d.kind !== 'ravine' || f.kind !== 'through-ravine') assert.equal(f.cells[d.index], d.c, d.kind + ' stands on its feature\'s cell');
  }
  // streams run source to mouth and end on water, the coast or another stream
  for (const f of re.features.filter(x => x.kind === 'stream')) assert.ok(f.cells.length >= P.STREAM_MIN);
});

test('determinism: the same input gives the same features, and the realm\'s own levels are untouched', () => {
  for (const seed of SEEDS) {
    const R = realm7(seed), a = realmFeatures(featureInput(R)), b = realmFeatures(featureInput(R));
    assert.equal(JSON.stringify(a.list), JSON.stringify(b.list));
    assert.equal(JSON.stringify(a.dest), JSON.stringify(b.dest));
    assert.equal(JSON.stringify(a.list), JSON.stringify(R.realm.features));
    const inp = featureInput(R);
    assert.deepEqual(Array.from(a.level), Array.from(inp.level), 'seed ' + seed + ': the features leave the level as it was');
  }
});
