// C2: the tile-set contract and the CC0 test kit (place design A3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, validateSetJson, pairTiles, fullVariants, ALLOWED_SPDX, layerTiles, fillTiles, kindFullTiles, layerRows, layerDescriptors } from '../src/setload.mjs';
import { cornerSheet } from '../src/sheets.mjs';
import { compareGolden } from '../src/golden.mjs';
import { newImage, writePng, fill, decodePng, crop } from '../src/png.mjs';
import { checkSourcePath, prepareSet, PALETTE_MAX, cutBlobToDual16, BLOB_PIECES } from '../tools/prepare-set.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const setDir = path.join(repo, 'art', 'places', 'sets', 'ninja-test');
const goldenDir = path.join(places, 'golden', 'seams');
const loaded = loadSet(setDir);
const { set, palette } = loaded;

test('set.json validates against the contract schema', () => {
  assert.deepEqual(validateSetJson(set), []);
});

test('the contract refuses what it should', () => {
  const bad = (f) => { const s = structuredClone(set); f(s); return validateSetJson(s).length > 0; };
  assert.ok(bad((s) => { s.licence.spdx = 'CC-BY-4.0'; }), 'a licence that is not CC0 or ours');
  assert.ok(bad((s) => { delete s.licence; }), 'no licence record');
  assert.ok(bad((s) => { s.ship = 'never'; }));
  assert.ok(bad((s) => { s.pairs[0].mode = 'blend'; }));
  assert.ok(bad((s) => { delete s.pairs[0].sheets; }));
  assert.ok(bad((s) => { s.extra = 1; }), 'unknown top-level key');
});

test('licence: SPDX is allowed and the licence text, source note and notice line are present', () => {
  assert.ok(ALLOWED_SPDX.includes(set.licence.spdx));
  assert.equal(set.ship, 'test');
  assert.match(readFileSync(path.join(setDir, 'LICENCE.md'), 'utf8'), /CC0 1\.0 Universal/);
  assert.match(readFileSync(path.join(setDir, 'SOURCE.md'), 'utf8'), /Pixel-boy/);
  assert.match(readFileSync(path.join(repo, 'THIRD_PARTY_NOTICES.md'), 'utf8'), /Ninja Adventure/);
});

test('the scale and tile size make the 48 px game tile', () => {
  assert.equal(set.sourceTile * set.scale, 48);
});

test('palette: at most 208 colours, light tables of 256 entries, every drawn colour in it', () => {
  assert.ok(palette.colours.length <= PALETTE_MAX, `${palette.colours.length} colours`);
  assert.equal(palette.count, palette.colours.length);
  assert.equal(palette.firstIndex, 48);
  for (const name of ['dark', 'light', 'dark2', 'fog', 'fade', 'storm', 'veil']) {
    const m = palette.tables[name];
    assert.equal(m.length, 256, name);
    assert.equal(m[0], 0, name + ' keeps transparent');
    assert.ok(m.every((v) => Number.isInteger(v) && v >= 0 && v < 256));
  }
  const have = new Set(palette.colours);
  const layerFiles = Object.values(set.layers).flatMap((l) => [...(l.fill ? l.fill.sheets : []), ...(l.over || []).flatMap((k) => [...k.sheets, ...(k.full ? [k.full] : []), ...Object.values(k.looks || {}).flat(2)])]);
  const names = [...set.pairs.flatMap((p) => [...p.sheets, p.fullSheet]), ...layerFiles, ...set.tone.sheets, set.spriteSheet];
  for (const f of names) {
    const img = loaded.png(f);
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] === 0) continue;
      assert.equal(img.data[i + 3], 255, f + ' has partial alpha');
      const h = '#' + [img.data[i], img.data[i + 1], img.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      assert.ok(have.has(h), `${f}: colour ${h} is not in palette.json`);
    }
  }
});

test('every pair has 16 tiles, in whole sheets, one per frame; opaque tiles are opaque', () => {
  const kit = ['grass-water', 'sand-water', 'grass-sand', 'grass-path', 'mud-water', 'grass-earth', 'sand-earth', 'cliff-grass', 'thicket-grass', 'scrub-grass', 'cliff-sand', 'thicket-sand', 'scrub-sand', 'deep-water'];   // the kit's, the clearing's, then the desk's open edges
  assert.deepEqual(set.pairs.map((p) => p.id), kit);
  const t = set.sourceTile;
  for (const p of set.pairs) {
    for (const f of p.sheets) {
      const img = loaded.png(f);
      assert.equal(img.w, 4 * t, f);
      assert.equal(img.h, 4 * t, f);
    }
    const tiles = pairTiles(loaded, p);
    assert.equal(tiles.length, 16);
    if (p.mode === 'opaque') for (const [i, tile] of tiles.entries()) {
      for (let k = 3; k < tile.data.length; k += 4) assert.equal(tile.data[k], 255, `${p.id} tile ${i} has a transparent pixel`);
    }
    if (p.sheets.length > 1) assert.ok(p.frameMs >= 16, p.id + ' animation has a frame time');
    const variants = fullVariants(loaded, p);
    assert.ok(variants.length >= 1);
    assert.deepEqual(variants[0].data, tiles[15].data, p.id + ': variant 0 is tile 15');
  }
});

// ---- terrain layers: one fill per terrain, one transparent 16-slot sheet per over kind (place design: terrain-layers-design) ----
const terrainIds = JSON.parse(readFileSync(path.join(repo, 'art', 'places', 'terrain.json'), 'utf8')).terrains;
const clearTile = (tile) => { for (let k = 3; k < tile.data.length; k += 4) if (tile.data[k] !== 0) return false; return true; };

test('layers: the contract refuses a layer block that is malformed', () => {
  const bad = (f) => { const s = structuredClone(set); f(s); return validateSetJson(s).length > 0; };
  assert.ok(bad((s) => { delete s.layers.grass.over[0].lowers; }), 'a kind without lowers');
  assert.ok(bad((s) => { s.layers.grass.over[0].sheets = []; }), 'a kind without sheets');
  assert.ok(bad((s) => { s.layers.water.fill = {}; }), 'a fill without sheets');
  assert.ok(bad((s) => { s.layers.deep.extra = 1; }), 'an unknown layer key');
  assert.ok(bad((s) => { delete s.tone.of; }), 'a tone layer without its terrain');
});

test('layers: every kind has 16 slots in whole sheets, slot 0 empty, slot 15 equal to fill variant 0; fills are opaque strips', () => {
  const t = set.sourceTile;
  for (const [id, l] of Object.entries(set.layers)) {
    if (l.drawAs) { assert.ok(!l.fill && !l.over, id + ': drawAs stands alone'); continue; }
    assert.ok(l.fill, id + ' has a fill');
    const fills = l.fill.sheets.map((_, f) => fillTiles(loaded, id, f));
    for (const frame of fills) {
      assert.ok(frame.length >= 1, id + ' fill variants');
      for (const [v, tile] of frame.entries()) for (let k = 3; k < tile.data.length; k += 4) assert.equal(tile.data[k], 255, `${id} fill variant ${v} has a transparent pixel`);
    }
    for (const f of l.fill.sheets) assert.equal(loaded.png(f).h, t, f);
    if (l.fill.sheets.length > 1) assert.ok(l.fill.frameMs >= 16, id + ' fill animation has a frame time');
    for (const [ki, k] of (l.over || []).entries()) {
      for (let f = 0; f < k.sheets.length; f++) {
        assert.deepEqual([loaded.png(k.sheets[f]).w, loaded.png(k.sheets[f]).h], [4 * t, 4 * t], k.sheets[f]);
        const tiles = layerTiles(loaded, id, ki, f);
        assert.equal(tiles.length, 16);
        assert.ok(clearTile(tiles[0]), `${id}/${k.kind}: slot 0 is empty`);
        assert.deepEqual(tiles[15].data, fills[Math.min(f, fills.length - 1)][0].data, `${id}/${k.kind}: slot 15 is fill variant 0`);
        assert.ok(tiles.slice(1, 15).every((x) => !clearTile(x)), `${id}/${k.kind}: slots 1..14 draw something`);
      }
      for (const [n, v] of kindFullTiles(loaded, id, ki).entries()) assert.ok(!clearTile(v), `${id}/${k.kind} full variant ${n}`);
      for (const [name, variants] of Object.entries(k.looks || {})) for (const frames of variants) for (const f of frames) {
        assert.deepEqual([loaded.png(f).w, loaded.png(f).h], [4 * t, 4 * t], f);
        const tiles = layerTiles(loaded, id, ki, 0).map((_, i) => crop(loaded.png(f), (i % 4) * t, (i >> 2) * t, t, t));
        assert.ok(clearTile(tiles[0]) && clearTile(tiles[15]), `${id}/${k.kind} look ${name}: slots 0 and 15 are empty`);
      }
    }
  }
  const tone = layerTiles(loaded, 'tone', 0);
  assert.equal(tone.length, 16);
  assert.ok(clearTile(tone[0]), 'tone slot 0 is empty');
});

test('layers: every lowers, ground, drawAs and tone id is a terrain in terrain.json, and the descriptors resolve', () => {
  const ids = new Set(terrainIds.map((x) => x.id));
  for (const [id, l] of Object.entries(set.layers)) {
    assert.ok(ids.has(id), id);
    for (const x of [l.drawAs, l.ground, ...(l.over || []).flatMap((k) => k.lowers)]) if (x !== undefined) assert.ok(ids.has(x), `${id}: ${x}`);
    for (const k of l.over || []) for (const lo of k.lowers) assert.ok(terrainIds.find((x) => x.id === lo).z < terrainIds.find((x) => x.id === id).z, `${id}/${k.kind} lists a lower ${lo} that is not below it`);
  }
  assert.ok(ids.has(set.tone.of));
  const d = layerDescriptors(loaded, terrainIds);
  const v = (id) => terrainIds.find((x) => x.id === id).value;
  assert.equal(d.layers.get(v('scrub')).drawAs, v('grass'));
  assert.equal(d.layers.get(v('mud')).fillCount, 5);
  assert.deepEqual(d.layers.get(v('grass')).kinds.map((k) => k.kind), ['bank', 'flat'], 'bank is listed first, so it wins over flat');
  assert.deepEqual([...d.layers.get(v('grass')).kinds[1].lowers].sort(), ['earth', 'sand', 'mud', 'path'].map(v).sort());
  assert.deepEqual(d.tone, { of: v('grass'), row: layerRows(set).findIndex((r) => r.type === 'tone') });
  const sandBeach = d.layers.get(v('sand')).kinds[0];
  assert.equal(sandBeach.rows.looks.reeds.length, 3, 'the beach carries the three reed variants');
});

test('layers: the baked rows list fills and kinds first, then the extras, then the tone row', () => {
  const rows = layerRows(set);
  assert.deepEqual(rows.map((r) => r.type).filter((t, i, a) => a.indexOf(t) === i), ['fill', 'over', 'look', 'tall', 'wayup', 'tone']);
  assert.equal(rows.filter((r) => r.type === 'fill').length, Object.values(set.layers).filter((l) => l.fill).length);
  assert.equal(rows.filter((r) => r.type === 'over').length, Object.values(set.layers).flatMap((l) => l.over || []).length);
  assert.equal(rows.at(-1).type, 'tone');
});

test('sprites: every rect lies inside the sprite sheet and every canopy named exists', () => {
  const sheet = loaded.png(set.spriteSheet);
  const groups = ['props', 'decals', 'canopy'];
  for (const g of groups) for (const [name, s] of Object.entries(set[g])) {
    const [x, y, w, h] = s.rect;
    const frames = s.frames || 1;
    assert.ok(x + w * frames <= sheet.w && y + h <= sheet.h, `${g}/${name} outside the sheet`);
    if (s.canopy) assert.ok(set.canopy[s.canopy], `${name} names a missing canopy ${s.canopy}`);
  }
  for (const k of ['tree-broad', 'boulder-brown', 'reeds', 'bush-big', 'stump', 'tall-grass']) assert.ok(set.props[k], k);
  assert.ok(set.props['tall-grass'].frames > 1);
  assert.deepEqual(set.props['tall-grass'].footprint, []);
  assert.ok(Object.keys(set.decals).length >= 4);
});

test('source paths: the allow-list holds, the Zelda-like set is refused', () => {
  assert.equal(checkSourcePath('ninja-adventure/files/x.png'), 'ninja-adventure/files/x.png');
  assert.equal(checkSourcePath('puny-world/a.png'), 'puny-world/a.png');
  assert.throws(() => checkSourcePath('zelda-like-armm1998/files/gfx/Overworld.png'), /Zelda-like/);
  assert.throws(() => checkSourcePath('ninja-adventure/../zelda-like/Overworld.png'), /Zelda-like/);
  assert.throws(() => checkSourcePath('ninja-adventure/../../etc/x.png'), /leaves the kits folder/);
  assert.throws(() => checkSourcePath('overworld-grass-biome/x.png'), /allow-list/);
  assert.throws(() => checkSourcePath('/etc/passwd'), /leaves the kits folder/);
});

test('prepare-set refuses a recipe whose source names the Zelda-like set (fixture)', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mb-prep-'));
  mkdirSync(path.join(root, 'zelda-like-armm1998'), { recursive: true });
  const img = newImage(16, 16); fill(img, 10, 20, 30);
  writePng(path.join(root, 'zelda-like-armm1998', 'Overworld.png'), img);
  const recipe = JSON.parse(readFileSync(path.join(setDir, 'recipe.json'), 'utf8'));
  for (const k of Object.keys(recipe.sources)) recipe.sources[k] = 'zelda-like-armm1998/Overworld.png';
  assert.throws(() => prepareSet(recipe, { tilesetsRoot: root }), /Zelda-like/);
});

test('prepare-set: a source with more than 208 colours stops and says so (fixture)', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mb-prep-'));
  mkdirSync(path.join(root, 'ninja-adventure'), { recursive: true });
  const big = newImage(512, 512);
  for (let i = 0; i < 512 * 512; i++) { big.data[i * 4] = i & 255; big.data[i * 4 + 1] = (i >> 8) & 255; big.data[i * 4 + 2] = 7; big.data[i * 4 + 3] = 255; }
  writePng(path.join(root, 'ninja-adventure', 'a.png'), big);
  writeFileSync(path.join(root, 'ninja-adventure', 'LICENSE.txt'), 'CC0 1.0 Universal\n');
  const recipe = JSON.parse(readFileSync(path.join(setDir, 'recipe.json'), 'utf8'));
  for (const k of Object.keys(recipe.sources)) recipe.sources[k] = 'ninja-adventure/a.png';
  delete recipe.desk;   // the fixture's own source only: the desk's pinned art lives outside this repo (absent in CI)
  assert.throws(() => prepareSet(recipe, { tilesetsRoot: root }), /over the 208/);
});

test('the blob re-cut: 16 tiles, tile 15 is the upper base, the diagonals are pieced from two inner corners (fixture)', () => {
  const t = 16;
  const solid = (r, g, b) => { const i = newImage(t, t); fill(i, r, g, b); return i; };
  const pieces = {};
  BLOB_PIECES.forEach((n, k) => { pieces[n] = solid(10 + k, 0, 0); });
  const base = solid(200, 200, 200);
  const tiles = cutBlobToDual16(pieces, base, t);
  assert.equal(tiles.length, 16);
  assert.deepEqual(tiles[15].data, base.data);
  assert.equal(tiles[0].data[0], 10 + BLOB_PIECES.indexOf('C'));
  assert.equal(tiles[9].data[0], 10 + BLOB_PIECES.indexOf('inNW'));                       // NW+SE: inNW whole ...
  assert.equal(tiles[9].data[((t - 1) * t + (t - 1)) * 4], 10 + BLOB_PIECES.indexOf('inSE')); // ... and inSE's quarter at the SE
  assert.equal(tiles[6].data[0], 10 + BLOB_PIECES.indexOf('inNE'));
  assert.equal(tiles[6].data[((t - 1) * t) * 4], 10 + BLOB_PIECES.indexOf('inSW'));
  assert.equal(tiles[1].data[0], 10 + BLOB_PIECES.indexOf('inSE'));                       // SE only
  assert.equal(tiles[8].data[0], 10 + BLOB_PIECES.indexOf('inNW'));                       // NW only
  assert.equal(tiles[3].data[0], 10 + BLOB_PIECES.indexOf('B'));                          // SW+SE: bottom half
});

test('corner sheets at 48 px match their goldens (A5 test 3)', () => {
  for (const p of set.pairs) {
    const sheet = cornerSheet(pairTiles(loaded, p, 0, true));
    const r = compareGolden(path.join(goldenDir, `${set.id}-${p.id}-sheet-48.png`), sheet);
    assert.ok(r.ok, r.message);
  }
});

test('regenerating the set from the kit gives the committed pixels (skipped when the kit is not on this machine)', (t) => {
  const kits = process.env.MB_TILESETS || path.join(repo, '..', 'research', 'tilesets');
  if (!existsSync(path.join(kits, 'ninja-adventure', 'LICENSE.txt'))) { t.skip('no kit at ' + kits); return; }
  const recipe = JSON.parse(readFileSync(path.join(setDir, 'recipe.json'), 'utf8'));
  const { files } = prepareSet(recipe, { tilesetsRoot: kits });
  for (const [name, buf] of files) {
    const committed = readFileSync(path.join(setDir, name));
    if (name.endsWith('.png')) {
      const a = decodePng(committed), b = decodePng(buf);
      assert.equal(a.w, b.w, name);
      assert.ok(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0, name + ' differs');
    } else assert.equal(Buffer.compare(committed, buf), 0, name + ' differs');
  }
  assert.ok(files.size >= 20);
});
