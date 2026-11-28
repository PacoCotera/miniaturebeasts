// Generator 7, chunk G1: the world and region layers: the golden vectors, the fields and the order a region is opened in. The region checks over seeds 1-200 (every region, all 25 slots, so every biome,
// generated once and checked) are gen7-world-s1-50 to -s151-200.test.mjs (gen7-world-seeds.mjs): the generating took 18 minutes in this one file, and the CI shards share it now.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { genRegion7, realm7, regionAt } from '../src/gen7/region.mjs';
import { buildRealm, fieldsAt } from '../src/gen7/world.mjs';
import { ATLAS } from '../src/logic/regions.mjs';
import { vectorOf, SEEDS, SLOTS } from '../tools/gen7-vectors.mjs';

const VECTORS = JSON.parse(readFileSync(new URL('./gen7-vectors.json', import.meta.url), 'utf8'));

test('golden vectors: land, levels, edges, fords and set pieces of seeds 7, 13 and 42', () => {
  for (const seed of SEEDS) for (const [ax, ay] of SLOTS) {
    const key = seed + ':' + ax + ',' + ay, got = vectorOf(genRegion7(seed, ax, ay));
    for (const f of ['biome', 'attempt', 'land', 'levels', 'edges', 'fords', 'island', 'pieces']) assert.deepEqual(got[f], VECTORS[key][f], key + ' ' + f);
  }
});

test('the fields are functions of the realm seed and a world position', () => {
  const a = fieldsAt(7), b = fieldsAt(7), c = fieldsAt(8);
  assert.deepEqual(a(12.5, 31), b(12.5, 31));
  assert.notDeepEqual(a(12.5, 31), c(12.5, 31));
  for (const k of ['height', 'temperature', 'humidity', 'wildness', 'rockiness']) for (const [x, y] of [[0, 0], [40, 50], [79, 99], [12.25, 3.75]]) { const v = a(x, y)[k]; assert.ok(v >= 0 && v <= 1, k); }
});

test('a region is its place, not its turn: the same whenever and in whatever order it is opened', () => {
  for (const seed of [7, 13, 42]) {
    const R = realm7(seed);
    // rebuilt from the realm's attempt numbers alone, out of order, on a realm with no coast: the nine inner regions are as they were before the coast (the coast is laid after the checks and only
    // remakes the sixteen on the rim), which is the guard that the land, once made, is kept
    for (const [ax, ay] of [[1, 1], [2, 2], [3, 1], [1, 3], [3, 3]]) {
      const G = regionAt(buildRealm(seed, R.realm.tries), ax, ay), F = R.regions[ay * ATLAS + ax];   // the land pass; the final region has drawn its starts, glows, outposts and beacons again by the realm's trails
      const a = vectorOf(G), b = vectorOf(F), pieces = ({ gate, deep, swim }) => ({ gate, deep, swim });
      assert.deepEqual({ ...a, land: 0, pieces: pieces(a.pieces) }, { ...b, land: 0, pieces: pieces(b.pieces) }, seed + ' ' + ax + ',' + ay);
      for (let c = 0; c < a.land.length; c++) if (a.land[c] !== b.land[c]) assert.equal(b.land[c], '2', seed + ' ' + ax + ',' + ay + ': the piece pass only ever makes a glow cell rock');
    }
  }
});
