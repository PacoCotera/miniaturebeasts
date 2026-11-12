// C2: the tile-set contract and the CC0 test kit (place design A3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSet, validateSetJson, ALLOWED_SPDX, layerTiles, fillTiles, kindFullTiles, layerRows, layerDescriptors } from '../src/setload.mjs';
import { newImage, writePng, fill, decodePng, crop } from '../src/png.mjs';
import { checkSourcePath, prepareSet, PALETTE_MAX } from '../tools/prepare-set.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const places = path.join(here, '..');
const repo = path.join(places, '..', '..');
const setDir = path.join(repo, 'art', 'places', 'sets', 'ninja-test');
const loaded = loadSet(setDir);
const { set, palette } = loaded;

test('set.json validates against the contract schema', () => {
  assert.deepEqual(validateSetJson(set), []);
});

test('the night table keeps the rock ramp in order: a darker day grey never maps lighter at night, four or more separate values; the olive meadow ramp is on the set', () => {
  const cols = palette.colours, lum = (h) => { const c = [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
  const at = (h) => 48 + cols.indexOf(h), night = palette.tables.dark2;
  const ramp = ['#242626', '#2a3834', '#343840', '#3e444e', '#474d55', '#555c64', '#5a6470', '#6c7682', '#807c74', '#8a937e', '#a5ac9c', '#adb5a6', '#b6beb0'];
  const to = ramp.map((h) => cols[night[at(h)] - 48]);
  for (let i = 1; i < ramp.length; i++) assert.ok(lum(to[i]) >= lum(to[i - 1]), ramp[i - 1] + ' to ' + to[i - 1] + ' is lighter than ' + ramp[i] + ' to ' + to[i]);
  assert.ok(new Set(to.slice(0, 8)).size >= 4, 'the rock keeps four distinct night values');
  for (const h of ['#79875b', '#8b9561', '#667b59']) assert.ok(cols.includes(h), h + ' is on the set');
});

test('the contract refuses what it should', () => {
  const bad = (f) => { const s = structuredClone(set); f(s); return validateSetJson(s).length > 0; };
  assert.ok(bad((s) => { s.licence.spdx = 'CC-BY-4.0'; }), 'a licence that is not CC0 or ours');
  assert.ok(bad((s) => { delete s.licence; }), 'no licence record');
  assert.ok(bad((s) => { s.ship = 'never'; }));
  assert.ok(bad((s) => { delete s.layers; }), 'no layers');
  assert.ok(bad((s) => { s.pairs = []; }), 'the pair table is gone from the contract');
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
  const names = [...layerFiles, ...Object.values(set.layers).flatMap((l) => (l.over || []).flatMap((k) => [...Object.values(k.tall || {}).flat(), ...Object.values(k.wayup || {})])), ...set.tone.sheets, set.spriteSheet];
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
    assert.ok(l.fill || l.ground, id + ' has a fill or a ground');
    // a terrain with a ground and no fill (scrub) keeps its all-upper variants in the kind's `full` strip, which stands in for the fill
    const fills = l.fill ? l.fill.sheets.map((_, f) => fillTiles(loaded, id, f)) : [kindFullTiles(loaded, id, 0)];
    for (const frame of fills) {
      assert.ok(frame.length >= 1, id + ' fill variants');
      for (const [v, tile] of frame.entries()) for (let k = 3; k < tile.data.length; k += 4) assert.equal(tile.data[k], 255, `${id} fill variant ${v} has a transparent pixel`);
    }
    for (const f of l.fill ? l.fill.sheets : []) assert.equal(loaded.png(f).h, t, f);
    if (l.fill && l.fill.sheets.length > 1) assert.ok(l.fill.frameMs >= 16, id + ' fill animation has a frame time');
    for (const [ki, k] of (l.over || []).entries()) {
      for (let f = 0; f < k.sheets.length; f++) {
        assert.deepEqual([loaded.png(k.sheets[f]).w, loaded.png(k.sheets[f]).h], [4 * t, 4 * t], k.sheets[f]);
        const tiles = layerTiles(loaded, id, ki, f);
        assert.equal(tiles.length, 16);
        assert.ok(clearTile(tiles[0]), `${id}/${k.kind}: slot 0 is empty`);
        // the cliff's sheets are cut with an open top (the ground under the raised tile shows through): its all-cliff tile has no top of its own, and the bake draws the top ground there
        if (id === 'cliff') assert.ok(clearTile(tiles[15]), `${id}/${k.kind}: slot 15 is open`);
        else assert.deepEqual(tiles[15].data, fills[Math.min(f, fills.length - 1)][0].data, `${id}/${k.kind}: slot 15 is fill variant 0`);
        assert.ok(tiles.slice(1, 15).every((x) => !clearTile(x)), `${id}/${k.kind}: slots 1..14 draw something`);
      }
      for (const [n, v] of kindFullTiles(loaded, id, ki).entries()) assert.ok(!clearTile(v), `${id}/${k.kind} full variant ${n}`);
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
  assert.equal(d.layers.get(v('scrub')).drawAs, undefined, 'scrub has its own layer');
  assert.equal(d.layers.get(v('scrub')).ground, v('grass'), 'the grass fill shows through the scrub paint');
  assert.equal(d.layers.get(v('scrub')).kinds[0].rows.variants.length, 3);
  assert.equal(d.layers.get(v('scrub')).kinds[0].fullCount, 4);
  assert.equal(d.layers.get(v('mud')).fillCount, 5);
  assert.deepEqual(d.layers.get(v('grass')).kinds.map((k) => k.kind), ['bank', 'flat'], 'bank is listed first, so it wins over flat');
  assert.deepEqual([...d.layers.get(v('grass')).kinds[1].lowers].sort(), ['earth', 'sand', 'mud', 'path'].map(v).sort());
  assert.deepEqual(d.tone, { of: v('grass'), also: [v('cliff')], row: layerRows(set).findIndex((r) => r.type === 'tone') });
  assert.equal(d.layers.get(v('sand')).kinds[0].rows.looks, undefined, 'the beach has no reed look: the reeds are sprites');
});

test('layers: the baked rows list fills and kinds first, then the extras, then the tone row', () => {
  const rows = layerRows(set);
  assert.deepEqual(rows.map((r) => r.type).filter((t, i, a) => a.indexOf(t) === i), ['fill', 'over', 'variant', 'tall', 'wayup', 'tone']);
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
  for (const k of ['tree-broad', 'boulder-brown', 'reed-shore-1', 'bush-big', 'stump', 'tall-grass']) assert.ok(set.props[k], k);
  assert.deepEqual(set.props['tall-grass'].footprint, []);
  assert.deepEqual(set.props['reed-water-1'].footprint, []);
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
  recipe.decals = { probe: { sheet: 'nature', rect: [0, 0, 16, 16], anchor: [8, 8] } };   // the set draws no kit picture now: the fixture brings one to read the source
  delete recipe.desk;   // the fixture's own source only: the desk's pinned art lives outside this repo (absent in CI)
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
  recipe.decals = { probe: { sheet: 'nature', rect: [0, 0, 256, 256], anchor: [8, 8] } };   // the set draws no kit picture now: the fixture brings one to read the source
  delete recipe.desk;   // the fixture's own source only: the desk's pinned art lives outside this repo (absent in CI)
  assert.throws(() => prepareSet(recipe, { tilesetsRoot: root }), /over the 208/);
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
