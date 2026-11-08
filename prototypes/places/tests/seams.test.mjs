// C3: the seam proofs (place design A5 tests 1 and 2), for every pair of the test kit at 48 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, pairTiles, fullVariants, pairAtlas, dualPairs } from '../src/setload.mjs';
import { dualGrid, FULL_BASE, EMPTY_BASE } from '../src/dualgrid.mjs';
import { edgeSignatureFailures, coverage, legalAdjacencies, edgeLine } from '../src/seams.mjs';
import { renderGround } from '../src/groundlite.mjs';
import { paletteOf, indexedToRgba } from '../src/indexed.mjs';
import { compareGolden } from '../src/golden.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const loaded = loadSet(path.join(repo, 'art', 'places', 'sets', 'ninja-test'));
const terrainFile = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8'));
const TERRAINS = terrainFile.terrains;
const valueOf = Object.fromEntries(TERRAINS.map((t) => [t.id, t.value]));
const allCases = JSON.parse(readFileSync(path.join(places, 'src', 'allcases.json'), 'utf8'));
const pal = paletteOf(loaded.palette);
const SCALES = [{ name: '48', scaled: true }];

for (const sc of SCALES) {
  test(`edge signatures at ${sc.name} px: every tile sharing an edge state has the same boundary line, in every frame and variant`, () => {
    for (const p of loaded.set.pairs) {
      const frames = p.sheets.map((_, f) => pairTiles(loaded, p, f, sc.scaled));
      const failures = edgeSignatureFailures(frames, fullVariants(loaded, p, sc.scaled));
      assert.deepEqual(failures, [], `${p.id}:\n${failures.join('\n')}`);
    }
  });
}

test('the signature check does fail on a seam: one changed pixel on an edge is reported with the tiles and the pixel', () => {
  const p = loaded.set.pairs[0];
  const tiles = pairTiles(loaded, p, 0, true).map((t) => ({ ...t, data: new Uint8Array(t.data) }));
  const E = tiles[5];                      // east edge state NE+SE
  const i = ((10 * E.w) + (E.w - 1)) * 4;
  E.data[i] ^= 0xff;
  const failures = edgeSignatureFailures([tiles]);
  assert.ok(failures.some((f) => /E edge, corner state 3: tile \d+ differs from tile \d+ at pixel 10/.test(f)), failures.join('\n'));
  assert.deepEqual(edgeLine(E, 'E')[10] === edgeLine(tiles[7], 'E')[10], false);
});

test('the committed all-cases map has every corner index and every legal horizontal and vertical neighbour pair', () => {
  assert.equal(allCases.rows.length, allCases.h);
  assert.ok(allCases.rows.every((r) => r.length === allCases.w));
  const lg = legalAdjacencies();
  assert.equal(lg.horiz.length, 64);
  assert.equal(lg.vert.length, 64);
});

const classify = (c) => (c < FULL_BASE ? c : c < EMPTY_BASE ? 15 : 0);

for (const sc of SCALES) {
  test(`all-cases maps at ${sc.name} px: coverage by every pair, and the render equals its golden`, () => {
    const dp = dualPairs(loaded);
    loaded.set.pairs.forEach((p, k) => {
      const level = {
        id: 'allcases', w: allCases.w, h: allCases.h,
        terrain: Uint8Array.from(allCases.rows.join('').split('').map((c) => (c === '1' ? valueOf[p.upper] : valueOf[p.lower]))),
      };
      const dg = dualGrid(level, TERRAINS, [dp[k]]);
      assert.equal(dg.layers.length, 1);
      const cov = coverage(dg.layers[0].tiles, dg.w1, dg.h1, classify);
      const lg = legalAdjacencies();
      assert.equal(cov.idx.size, 16, `${p.id}: corner indices`);
      assert.deepEqual(lg.horiz.filter((a) => !cov.horiz.has(a)), [], `${p.id}: horizontal neighbours missing`);
      assert.deepEqual(lg.vert.filter((a) => !cov.vert.has(a)), [], `${p.id}: vertical neighbours missing`);
      const atlas = pairAtlas(loaded, pal, p, 0, sc.scaled);
      const size = atlas.size;
      const buf = renderGround(dg, level.w, level.h, size, [atlas]);
      const img = indexedToRgba(buf, level.w * size, level.h * size, pal);
      const r = compareGolden(path.join(places, 'golden', 'seams', `ninja-test-${p.id}-${sc.name}.png`), img);
      assert.ok(r.ok, r.message);
    });
  });
}
