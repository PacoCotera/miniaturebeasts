// owner #141: a place beside wide water meets it with a shore (sand on the place's own edge band), laid in the place's layout so every view draws the same land;
// a place with no wide-water cell near it is laid as before (the baseline hashes were taken on main, tools/wide-shore-baseline.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cellTerrain, TV } from '../src/gen7/place.mjs';

const BASE = JSON.parse(readFileSync(new URL('./fixtures/wide-shore-baseline.json', import.meta.url), 'utf8'));

test('his place (seed 64, region 2,2, cell 12,10): the edge facing the wide water on the west is shore, not grass cut straight', () => {
  const X = 2 * 16 + 12, Y = 2 * 20 + 10, c = cellTerrain(64, X, Y);   // the apron is one tile: column 1 is the place's first column
  let sand = 0, rows = 0, grass = 0;
  for (let y = 1; y < c.h - 1; y++) {
    const v = c.terrain[y * c.w + 1], w2 = c.terrain[y * c.w + 2];
    if (v === TV.WATER || v === TV.DEEP || v === TV.CLIFF || v === TV.THICKET || v === TV.PATH) continue;   // the place's own water, raised land, thicket and trail keep their say
    rows++; if (v === TV.SAND && w2 === TV.SAND) sand++; else if (v === TV.GRASS) grass++;
  }
  assert.ok(rows > 10, 'rows read ' + rows);
  assert.ok(sand >= rows * 0.8, `${sand} of ${rows} edge rows are shore, ${grass} still grass`);
});

test('places with no wide water near them are unchanged on 20 seeds', () => {
  let n = 0;
  for (const [seed, list] of Object.entries(BASE)) for (const [X, Y, h] of list) {
    assert.equal(createHash('sha1').update(cellTerrain(+seed, X, Y).terrain).digest('hex'), h, `seed ${seed} cell ${X},${Y} changed`); n++;
  }
  assert.ok(n >= 20, 'cells checked ' + n);
});
