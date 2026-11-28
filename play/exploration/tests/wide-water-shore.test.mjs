// owner #141: a place with no wide-water cell near it is laid as before; the shore of the wide water itself is pinned in wide-water-shape.test.mjs.
// the baseline hashes were taken on main (tools/wide-shore-baseline.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cellTerrain } from '../src/gen7/place.mjs';

const BASE = JSON.parse(readFileSync(new URL('./fixtures/wide-shore-baseline.json', import.meta.url), 'utf8'));

test('places with no wide water near them are unchanged on 20 seeds', () => {
  let n = 0;
  for (const [seed, list] of Object.entries(BASE)) for (const [X, Y, h] of list) {
    assert.equal(createHash('sha1').update(cellTerrain(+seed, X, Y).terrain).digest('hex'), h, `seed ${seed} cell ${X},${Y} changed`); n++;
  }
  assert.ok(n >= 20, 'cells checked ' + n);
});
