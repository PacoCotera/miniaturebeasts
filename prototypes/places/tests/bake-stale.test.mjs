// Stale-bake guard: baked/<set>.mbtiles must match a fresh bake. A set.json or layers row change that is not rebaked
// (PR 514 -> bug #116) leaves the layer rows pointing at the wrong sheets. Runs `bake.mjs --check --place <P>` per place.
// --check --place also compares that place's .mbplace, the terrain catalogue and its goldens, and always the set's .mbtiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const placesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const bake = path.join(placesDir, 'tools', 'bake.mjs');
const index = JSON.parse(readFileSync(path.join(placesDir, 'baked', 'index.json'), 'utf8'));

// A place whose bake stops on a level rule (not on staleness) cannot be checked here: Windstep's find-footprint problem on main.
const CANNOT_BAKE = new Set(['Windstep']);
const places = index.places.filter((p) => !p.mirrorOf).map((p) => p.id);

for (const id of places) {
  test(`bake --check --place ${id}: the committed .mbtiles and place match a fresh bake`, { skip: CANNOT_BAKE.has(id) && 'its bake stops on a level problem (find-footprint), not checkable' }, () => {
    const r = spawnSync(process.execPath, [bake, '--check', '--place', id], { encoding: 'utf8' });
    assert.equal(r.status, 0, `stale bake for ${id}; run node prototypes/places/tools/bake.mjs --place ${id} and commit:\n${r.stdout}${r.stderr}`);
  });
}

test('at least one place is checked, so the set .mbtiles is covered', () => {
  assert.ok(places.some((id) => !CANNOT_BAKE.has(id)));
});
