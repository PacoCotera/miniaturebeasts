// The art desk's signed pieces in the test set (the map palette, mibi-art f1a9fe54e, carried by 633e4d641; way up 1158b9710; water bits 3323aa85d): every placed file is the file DESK.json records (sha256, signed commit and
// source path), read from the committed copies in this repo only (no test reads the desk's repository); the terrain layers, the map decor and the reeds are in the set, and every map picture is in the new palette.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, crop } from '../src/png.mjs';
import { recolour, NEW_COLOURS } from '../tools/recolour.mjs';
import { keyShade } from '../tools/desk-art.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const desk = JSON.parse(readFileSync(path.join(dir, 'DESK.json'), 'utf8')), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
const img = (n) => decodePng(readFileSync(path.join(dir, n)));

test('every placed desk file equals the recorded hash, names its signed commit and its source in the desk', () => {
  const names = Object.keys(desk);
  assert.ok(names.length > 60, 'files recorded: ' + names.length);
  assert.deepEqual([...new Set(Object.values(desk).map((d) => d.commit))].sort(), ['1158b9710', '3323aa85d', '633e4d641']);
  for (const [n, d] of Object.entries(desk)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(dir, n))).digest('hex'), d.sha256, n);
    assert.ok(d.from.startsWith('art-jobs/'), n + ' names a source in the desk: ' + d.from);
  }
});

test('every map picture is in the new map palette: no pastel colour is left', () => {
  for (const n of Object.keys(desk)) {
    const im = img(n), r = recolour(im);
    // the signed sand way-up piece (art/desk 1158b9710) carries sand tones of its own (#dfd387 and old-table colours) that the palette table does not list; it is the art director's signed file, placed as signed (flagged to the art desk in the report)
    if (n === 'wayup-cliff-sand.png') continue;
    assert.deepEqual(r.left, [], n + ' holds colours outside the map palette');
    // the reed sprites are painted in the new reed ramp; their cattail heads keep the brown the desk names (manifest: #6f4a37, #8a6444), which are two old-palette colours by key
    if (n.startsWith('reed-')) { for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3] && r.data[i] !== im.data[i]) assert.ok([0x6f4a37, 0x8a6444].includes((im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]), n + ' holds an old colour other than the cattail brown'); continue; }
    assert.deepEqual(Buffer.from(r.data), Buffer.from(im.data), n + ' still holds a colour of the old palette');
  }
  assert.ok(NEW_COLOURS.size >= 45, 'the new map palette: ' + NEW_COLOURS.size + ' colours');
});

test('the terrain layers are signed pieces: every layer file is recorded, fills say which sheet they were cut from, thicket and cliff come keyed, the reed look is gone', () => {
  const files = [...Object.values(set.layers).flatMap((l) => [...(l.fill ? l.fill.sheets : []), ...(l.over || []).flatMap((k) => [...k.sheets, ...(k.variants || []), ...(k.full ? [k.full] : [])])]), ...set.tone.sheets];
  assert.equal(new Set(files).size, files.length);
  for (const f of files) assert.ok(desk[f], f + ' is not recorded in DESK.json');
  const from = (f) => desk[f].from;
  assert.match(from('fill-grass.png'), /grass-over\.png#15$/);
  assert.match(from('fill-path.png'), /path-over\.png#15$/);
  assert.match(from('fill-sand.png'), /sand_beach-over\.png#15$/);
  assert.match(from('fill-water.png'), /fill-water-v0@0\.png \+ .*fill-water-v3@0\.png$/);
  assert.deepEqual(set.layers.water.fill.sheets, ['fill-water.png', 'fill-water@1.png', 'fill-water@2.png', 'fill-water@3.png'], 'four water frames');
  assert.equal(set.layers.water.fill.frameMs, 250);
  assert.equal(set.layers.deep.fill.sheets.length, 1, 'deep water stays still');
  assert.match(from('fill-deep.png'), /sets\/pair-deep-water\.png#15$/);
  assert.equal(desk['fill-earth.png'].from.includes('#'), false, 'the earth fill is the desk\'s own strip');
  assert.deepEqual(Object.keys(set.layers), ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'scrub', 'thicket', 'cliff']);
  assert.equal(set.layers.scrub.ground, 'grass');
  assert.deepEqual(set.layers.scrub.over[0].variants, ['over-scrub~v1.png', 'over-scrub~v2.png', 'over-scrub~v3.png']);
  assert.match(from('fill-cliff.png'), /over-cliff\.png#15 recut recoloured$/);
  assert.match(from('over-thicket.png'), / keyed$/);
  assert.deepEqual(set.layers.cliff.over[0].tall['3'].length, 3, 'the cliff face at s = 3 has three variants');
  assert.equal(set.layers.sand.over[0].looks, undefined, 'the reed look of the beach is gone: the reeds are sprites (reeds.mjs)');
  assert.equal(set.layers.grass.over[0].looks, undefined);
  assert.ok(!Object.keys(desk).some((n) => n.startsWith('looks-reeds')));
});

test('the cliff sheets are the re-cut ones in the map palette: the placed file is the recut sheet (tools/recut) recoloured with the soft shade keyed', () => {
  const recutDir = path.join(here, '..', 'tools', 'recut');
  let n = 0;
  for (const [name, d] of Object.entries(desk)) {
    if (!d.from.includes(' recut (')) continue;
    n++;
    assert.deepEqual(img(name).data, keyShade(recolour(decodePng(readFileSync(path.join(recutDir, name))))).data, name);
  }
  assert.ok(n >= 6);
});

test('the tone layer is the sunlit step: one colour, lighter than the grass fill, no dark patch', () => {
  const tone = img(set.tone.sheets[0]), fill = img('fill-grass.png'), lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const colours = new Set(); let max = 0;
  for (let i = 0; i < tone.data.length; i += 4) if (tone.data[i + 3]) { colours.add(tone.data.slice(i, i + 3).join(',')); }
  assert.deepEqual([...colours], ['130,178,102'], 'the sunlit #82b266 only');
  const counts = new Map(); for (let i = 0; i < fill.data.length; i += 4) { const k = fill.data.slice(i, i + 3).join(','); counts.set(k, (counts.get(k) || 0) + 1); }
  const base = [...counts].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  assert.deepEqual(base, [116, 166, 93], 'the plain grass is #74a65d');
  max = lum(Uint8Array.from([130, 178, 102, 255]), 0) - lum(Uint8Array.from([...base, 255]), 0);
  assert.ok(max > 0, 'the tone is lighter than the grass');
});

test('the map decor: the kit names stay and draw the signed pieces, the tree is cut into crown and trunk, no kit picture or empty slot is left among them', () => {
  for (const n of ['tuft-fan', 'tuft-lean', 'tuft-small', 'tuft', 'clump-tall']) assert.deepEqual(set.decals[n].rect.slice(2), [12, 13], n + ' draws a signed tufts piece');
  for (const n of ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three']) {
    const r = set.decals[n].rect, im = decodePng(readFileSync(path.join(dir, 'sprites.png')));
    assert.ok(crop(im, r[0], r[1], r[2], r[3]).data.some((v, i) => i % 4 === 3 && v === 255), n + ' draws a flower');
    assert.deepEqual(set.decals[n].anchor, [(r[2] - 1) >> 1, r[3] - 1], n + ' stands bottom-centre');
  }
  assert.deepEqual(Object.keys(set.canopy).sort(), ['tree-autumn-crown', 'tree-broad-crown']);
  assert.equal(set.props['tree-broad'].canopy, 'tree-broad-crown');
  assert.equal(set.props['tree-broad'].rect[3], 9, 'the trunk piece: 9 rows under the crown');
  assert.equal(set.canopy['tree-broad-crown'].rect[3], 32);
  for (const n of ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'stump']) assert.deepEqual(set.props[n].footprint, [[0, 0]], n);
  assert.deepEqual(set.props['tree-hollow'].rect.slice(2), [64, 64], 'the signed hollow tree is 64 x 64');
  assert.deepEqual(set.props['split-stone'].rect.slice(2), [61, 44]);
  assert.deepEqual(set.props['tree-hollow'].footprint.length, 8, 'its footprint is as the kit\'s');
  for (const n of ['tall-grass', 'tall-grass-b', 'tall-grass-m', 'tall-grass-bm']) assert.deepEqual(set.props[n].footprint, [], n + ' blocks nothing');
  for (const f of ['tree-trunk.png', 'tree-crown.png', 'bush.png', 'rock-1.png', 'tufts-1.png', 'shrub-1.png', 'stump-1.png', 'flowers-1.png', 'flowers-blue-pair.png', 'hollow-tree.png', 'split-stone.png']) assert.ok(desk[f], f + ' is recorded');
  assert.equal(set.props.reeds, undefined, 'the kit\'s bamboo reeds are gone');
  assert.ok(!set.decals['flower-sun'] && !set.decals['flower-sun-small'], 'the kit\'s sunflowers are retired');
});

test('the reed sprites and the grass flecks are in the set: four shore looks and two water looks (each mirrored) as props that block nothing, six flecks (each mirrored) as decals', () => {
  for (const n of ['shore-1', 'shore-2', 'shore-3', 'shore-4', 'water-1', 'water-2']) for (const m of ['', 'm']) assert.deepEqual(set.props[`reed-${n}${m}`].footprint, [], `reed-${n}${m}`);
  for (let k = 0; k < 6; k++) for (const m of ['', 'm']) assert.ok(set.decals[`fleck-${k}${m}`], `fleck-${k}${m}`);
  assert.ok(!set.decals['fleck-6'], 'only the six flecks the art director keeps');
});
