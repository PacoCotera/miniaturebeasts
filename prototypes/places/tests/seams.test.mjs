// C3: the seam proofs (place design A5 tests 1 and 2), per (terrain, kind, lower) of the layered test set at 48 px, and the cliff's block rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, layerTiles, fillTiles, kindFullTiles, layerDescriptors, layerRows } from '../src/setload.mjs';
import { paste } from '../src/png.mjs';
import { cornerSheet } from '../src/sheets.mjs';
import { applyOpenEdges, ALT_CODE } from '../src/bake/openedges.mjs';
import { terrainLayers, FILL_CODE, FULL_BASE, EMPTY } from '../src/dualgrid.mjs';
import { edgeSignatureFailures, coverage, legalAdjacencies, edgeLine } from '../src/seams.mjs';
import { compareGolden } from '../src/golden.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const loaded = loadSet(path.join(repo, 'art', 'places', 'sets', 'ninja-test'));
const terrainFile = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8'));
const TERRAINS = terrainFile.terrains;
const valueOf = Object.fromEntries(TERRAINS.map((t) => [t.id, t.value]));
const allCases = JSON.parse(readFileSync(path.join(places, 'src', 'allcases.json'), 'utf8'));
const SCALES = [{ name: '48', scaled: true }];
const desc = layerDescriptors(loaded, TERRAINS);

// Terrain layers: a kind of terrain T over a lower L draws the kind's sheet on L's fill, so the 16 tiles the player sees are (tile 0 = L's fill, tiles 1..14 = the sheet over L's fill, tile 15 = T's fill).
// The proof is the one-line-per-edge-state rule, per (terrain, kind, lower), at 48 px; the composites are the goldens ninja-test-<t>-<kind>-over-<lower>-48.png.
// Fill variants are interior variants: every variant of T's fill is held to tile 15's edge lines.
function layerComposites(terrainId, ki, lowerId, scaled) {
  // a terrain with a ground and no fill (scrub) has its slot-15 strip in place of one
  const over = layerTiles(loaded, terrainId, ki, 0, scaled), lowerFill = fillTiles(loaded, lowerId, 0, scaled)[0], own = loaded.set.layers[terrainId].fill ? fillTiles(loaded, terrainId, 0, scaled) : kindFullTiles(loaded, terrainId, ki, scaled);
  const tiles = over.map((o, k) => {
    if (k === 0) return lowerFill;
    if (k === 15) return own[0];
    const t = { w: lowerFill.w, h: lowerFill.h, data: new Uint8Array(lowerFill.data) };
    paste(t, o, 0, 0);
    return t;
  });
  return { tiles, own };
}
const layerCases = () => Object.entries(loaded.set.layers).flatMap(([id, l]) => (l.over || []).flatMap((k, ki) => k.lowers.filter((lower) => loaded.set.layers[lower].fill).map((lower) => ({ id, kind: k.kind, ki, lower }))));
for (const sc of SCALES) {
  test(`terrain layers at ${sc.name} px: the composite of every (terrain, kind, lower) equals its golden`, () => {
    const cases = layerCases();
    assert.equal(cases.length, 32);
    for (const c of cases) {
      const { tiles } = layerComposites(c.id, c.ki, c.lower, sc.scaled);
      const r = compareGolden(path.join(places, 'golden', 'seams', `ninja-test-${c.id}-${c.kind}-over-${c.lower}-${sc.name}.png`), cornerSheet(tiles));
      assert.ok(r.ok, r.message);
    }
  });
  // NOT HELD, and accepted (art director ruling 2026-11-09: seams are organic, no stitching or edge forcing at the bake): the desk's shores are organic, so where a shore crosses a tile edge differs
  // from tile to tile with the same edge state (by up to a few pixels), and a layer's border band differs from the fill's own border. The check stays as a `todo`: it reports, and does not fail.
  test(`terrain layers at ${sc.name} px: every (terrain, kind, lower) has one boundary line per edge state`, { todo: 'the signed layers carry organic edges, accepted (art director 2026-11-09)' }, () => {
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
// is run at the desk, signed in mibi-art e1ae23543). Here the bake's choice is held to the desk's rule in every 2 x 5 and 3 x 4 block of cells without a 1-row gully: the cliff layer's tile at each dual
// position is the corner tile k = NW*8 + NE*4 + SW*2 + SE of the sheet s = (SW is cliff and the cell below it is not) * 2 + (SE is cliff and the cell below it is not), and nothing else.
test("the cliff layer: the bake picks each tile by its corners and the cells below, as the desk's rule says, in every block without a 1-row gully", () => {
  const rows = layerRows(loaded.set);
  let blocks = 0;
  for (const ground of ['grass', 'sand']) {
    for (const [bw, bh] of [[2, 5], [3, 4]]) for (let m = 0; m < 1 << (bw * bh); m++) {
      const cell = (x, y) => (m >> (y * bw + x)) & 1;
      let gully = false; for (let y = 0; y + 2 < bh; y++) for (let x = 0; x < bw; x++) if (cell(x, y) && !cell(x, y + 1) && cell(x, y + 2)) gully = true;
      if (gully) continue;
      blocks++;
      const PAD = 1, W = bw + 2 * PAD, H = bh + 2 * PAD, g = (x, y) => (x >= 0 && y >= 0 && x < bw && y < bh ? cell(x, y) : 0);
      const level = { id: 'block', w: W, h: H, terrain: Uint8Array.from({ length: W * H }, (_, i) => (g((i % W) - PAD, ((i / W) | 0) - PAD) ? valueOf.cliff : valueOf[ground])) };
      const dg = terrainLayers(level, TERRAINS, desc.layers, null);
      applyOpenEdges(dg, { ...level, wayups: [], reedbanks: [] }, TERRAINS, desc.layers);
      const L = dg.layers.find((l) => l.terrain === valueOf.cliff);
      if (!L) continue;
      for (let j = 1; j <= bh - 2; j++) for (let i = 1; i < bw; i++) {   // the tiles the desk proves: i from 1, j from 1 to the height - 2 (block coordinates)
        const nw = g(i - 1, j - 1), ne = g(i, j - 1), sw = g(i - 1, j), se = g(i, j), want = nw * 8 + ne * 4 + sw * 2 + se;
        const s = (sw && !g(i - 1, j + 1) ? 2 : 0) | (se && !g(i, j + 1) ? 1 : 0), c = L.tiles[(j + PAD) * dg.w1 + i + PAD], at = `block ${m} ${bw}x${bh} ${ground} tile (${i},${j})`;
        if (want === 0) { assert.equal(c, EMPTY, at + ': no cliff corner, no cliff tile'); continue; }
        if (s === 0) {
          assert.ok(c < ALT_CODE || c >= FILL_CODE, `${at}: the plain sheet`);
          if (c < ALT_CODE) assert.equal(c % 64, want, at);   // a kind code: its slot is the corner index (a fill code is the all-cliff tile)
          else assert.equal(want, 15, at + ': a fill is the all-cliff tile');
          continue;
        }
        assert.ok(c >= ALT_CODE && c < FILL_CODE, `${at}: a tall sheet`);
        const row = rows[(c - ALT_CODE) >> 4];
        assert.deepEqual([row.type, row.terrain, row.s, (c - ALT_CODE) & 15], ['tall', 'cliff', s, want], at);
      }
    }
  }
  assert.ok(blocks > 1000, 'blocks checked: ' + blocks);
});

test('the signature check does fail on a seam: one changed pixel on an edge is reported with the tiles and the pixel', () => {
  const tiles = layerComposites('grass', 1, 'earth', true).tiles.map((t) => ({ ...t, data: new Uint8Array(t.data) }));
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

// the layer's code as a corner index: the fill is the all-upper tile, nothing is the all-lower tile, a kind's code is its slot
const classify = (c) => (c === EMPTY ? 0 : c >= FILL_CODE || c % 64 >= FULL_BASE ? 15 : c % 64);   // a terrain with a ground (scrub) has its all-upper tile as a full variant code

test('all-cases maps: every (terrain, kind, lower) is covered by every corner index and every legal neighbour pair', () => {
  const lg = legalAdjacencies();
  for (const c of layerCases()) {
    const level = { id: 'allcases', w: allCases.w, h: allCases.h, terrain: Uint8Array.from(allCases.rows.join('').split('').map((x) => (x === '1' ? valueOf[c.id] : valueOf[c.lower]))) };
    const dg = terrainLayers(level, TERRAINS, desc.layers, null), L = dg.layers.find((l) => l.terrain === valueOf[c.id]);
    const cov = coverage(L.tiles, dg.w1, dg.h1, classify), name = `${c.id}/${c.kind} over ${c.lower}`;
    assert.equal(cov.idx.size, 16, `${name}: corner indices`);
    assert.deepEqual(lg.horiz.filter((a) => !cov.horiz.has(a)), [], `${name}: horizontal neighbours missing`);
    assert.deepEqual(lg.vert.filter((a) => !cov.vert.has(a)), [], `${name}: vertical neighbours missing`);
  }
});
