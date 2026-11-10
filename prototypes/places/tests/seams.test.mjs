// C3: the seam proofs (place design A5 tests 1 and 2), for every pair of the test kit at 48 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, pairTiles, fullVariants, pairAtlas, dualPairs, sheetTiles, extraEntries, layerTiles, fillTiles } from '../src/setload.mjs';
import { paste } from '../src/png.mjs';
import { cornerSheet } from '../src/sheets.mjs';
import { applyOpenEdges, ALT_CODE } from '../src/bake/openedges.mjs';
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
      if (p.tall) continue;   // a tall face cannot hold the one-line-per-edge-state proof (the N edge of a face tile is rock where tile 15's is grass): the block proof below
      const frames = p.sheets.map((_, f) => pairTiles(loaded, p, f, sc.scaled));
      const failures = edgeSignatureFailures(frames, fullVariants(loaded, p, sc.scaled));
      assert.deepEqual(failures, [], `${p.id}:\n${failures.join('\n')}`);
    }
  });
}

// Terrain layers: a kind of terrain T over a lower L draws the kind's sheet on L's fill, so the 16 tiles the player sees are (tile 0 = L's fill, tiles 1..14 = the sheet over L's fill, tile 15 = T's fill).
// The proof is the same one-line-per-edge-state rule, per (terrain, kind, lower), at 48 px; the composites are the goldens ninja-test-<t>-<kind>-over-<lower>-48.png.
// Fill variants are interior variants: every variant of T's fill is held to tile 15's edge lines.
function layerComposites(terrainId, ki, lowerId, scaled) {
  const over = layerTiles(loaded, terrainId, ki, 0, scaled), lowerFill = fillTiles(loaded, lowerId, 0, scaled)[0], own = fillTiles(loaded, terrainId, 0, scaled);
  const tiles = over.map((o, k) => {
    if (k === 0) return lowerFill;
    if (k === 15) return own[0];
    const t = { w: lowerFill.w, h: lowerFill.h, data: new Uint8Array(lowerFill.data) };
    paste(t, o, 0, 0);
    return t;
  });
  return { tiles, own };
}
const layerCases = () => Object.entries(loaded.set.layers).flatMap(([id, l]) => (l.over || []).flatMap((k, ki) => k.lowers.filter((lower) => loaded.set.layers[lower].fill).map((lower) => ({ id, kind: k.kind, ki, lower }))));   // scrub is drawn as grass: no fill, no case
for (const sc of SCALES) {
  test(`terrain layers at ${sc.name} px: the composite of every (terrain, kind, lower) equals its golden`, () => {
    const cases = layerCases();
    assert.equal(cases.length, 27);
    for (const c of cases) {
      const { tiles } = layerComposites(c.id, c.ki, c.lower, sc.scaled);
      const r = compareGolden(path.join(places, 'golden', 'seams', `ninja-test-${c.id}-${c.kind}-over-${c.lower}-${sc.name}.png`), cornerSheet(tiles));
      assert.ok(r.ok, r.message);
    }
  });
  // OPEN: this does not hold for the signed layers (all 18 composites fail). The desk's shores are organic: where a shore crosses a tile edge differs from tile to tile with the same edge state
  // (by up to a few pixels), and a layer's border band differs from the fill's own border. Closing it needs a ruling (stitch the layers, accept a tolerance, or repaint); see the terrain-layers-a report.
  test(`terrain layers at ${sc.name} px: every (terrain, kind, lower) has one boundary line per edge state`, { todo: 'the signed layers carry organic edges (terrain-layers-a report)' }, () => {
    const bad = [];
    for (const c of layerCases()) {
      const { tiles, own } = layerComposites(c.id, c.ki, c.lower, sc.scaled);
      const failures = edgeSignatureFailures([tiles], own);
      if (failures.length) bad.push(`${c.id}/${c.kind} over ${c.lower}: ${failures.length} edge lines differ, first: ${failures[0]}`);
    }
    assert.deepEqual(bad, []);
  });
}

// The cliff (the desk's source/seam.py is the reference proof that its tiles, picked by corners plus the two cells below, equal one painting of any block of cells; it needs the desk's painter and
// is run at the desk, signed in mibi-art e1ae23543). Here the bake's choice is held to the desk's rule in every 2 x 5 and 3 x 4 block of cells without a 1-row gully: the tile at each dual position is
// the corner tile k = NW*8 + NE*4 + SW*2 + SE of the sheet s = (SW is cliff and the cell below it is not) * 2 + (SE is cliff and the cell below it is not), and nothing else.
test("the cliff pairs: the bake picks each tile by its corners and the cells below, as the desk's rule says, in every block without a 1-row gully", () => {
  const dp = dualPairs(loaded), extras = extraEntries(loaded.set), n0 = loaded.set.pairs.length;
  let blocks = 0;
  for (const ground of ['grass', 'sand']) {
    const k = loaded.set.pairs.findIndex((p) => p.id === 'cliff-' + ground), p = loaded.set.pairs[k];
    for (const [bw, bh] of [[2, 5], [3, 4]]) for (let m = 0; m < 1 << (bw * bh); m++) {
      const cell = (x, y) => (m >> (y * bw + x)) & 1;
      let gully = false; for (let y = 0; y + 2 < bh; y++) for (let x = 0; x < bw; x++) if (cell(x, y) && !cell(x, y + 1) && cell(x, y + 2)) gully = true;
      if (gully) continue;
      blocks++;
      const PAD = 1, W = bw + 2 * PAD, H = bh + 2 * PAD, g = (x, y) => (x >= 0 && y >= 0 && x < bw && y < bh ? cell(x, y) : 0);
      const level = { id: 'block', w: W, h: H, terrain: Uint8Array.from({ length: W * H }, (_, i) => (g((i % W) - PAD, ((i / W) | 0) - PAD) ? valueOf.cliff : valueOf[ground])) };
      const dg = dualGrid(level, TERRAINS, [dp[k]]);
      applyOpenEdges(dg, { ...level, wayups: [], reedbanks: [] }, TERRAINS, [dp[k]]);
      const L = dg.layers[0];
      for (let j = 1; j <= bh - 2; j++) for (let i = 1; i < bw; i++) {   // the tiles the desk proves: i from 1, j from 1 to the height - 2 (block coordinates)
        const nw = g(i - 1, j - 1), ne = g(i, j - 1), sw = g(i - 1, j), se = g(i, j), want = nw * 8 + ne * 4 + sw * 2 + se;
        const s = (sw && !g(i - 1, j + 1) ? 2 : 0) | (se && !g(i, j + 1) ? 1 : 0), c = L.tiles[(j + PAD) * dg.w1 + i + PAD];
        if (s === 0) { assert.ok(c < ALT_CODE, `block ${m} ${bw}x${bh} ${ground} tile (${i},${j}): the plain sheet`); if (c < FULL_BASE) assert.equal(c, want); continue; }
        assert.ok(c >= ALT_CODE, `block ${m} ${bw}x${bh} ${ground} tile (${i},${j}): a tall sheet`);
        const e = extras[((c - ALT_CODE) >> 4) - n0];
        assert.deepEqual([e.kind, e.pair, e.s, (c - ALT_CODE) & 15], ['tall', 'cliff-' + ground, s, want], `block ${m} ${bw}x${bh} ${ground} tile (${i},${j})`);
      }
    }
  }
  assert.ok(blocks > 2000, 'blocks checked: ' + blocks);
});

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
