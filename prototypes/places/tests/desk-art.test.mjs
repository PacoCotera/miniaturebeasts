// The art desk's signed pieces in the test set (the map palette, mibi-art f1a9fe54e, carried by 633e4d641; open edges abb33a65b): every placed file is the file DESK.json records (sha256, signed commit and
// source path), read from the committed copies in this repo only (no test reads the desk's repository); the terrain layers, the map decor and the reeds are in the set, and every map picture is in the new palette.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, crop } from '../src/png.mjs';
import { recolour, NEW_COLOURS } from '../tools/recolour.mjs';
import { keyShade, SCRUB_GROUND } from '../tools/desk-art.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const desk = JSON.parse(readFileSync(path.join(dir, 'DESK.json'), 'utf8')), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
const img = (n) => decodePng(readFileSync(path.join(dir, n)));

test('every placed desk file equals the recorded hash, names its signed commit and its source in the desk', () => {
  const names = Object.keys(desk);
  assert.ok(names.length > 60, 'files recorded: ' + names.length);
  assert.deepEqual([...new Set(Object.values(desk).map((d) => d.commit))].sort(), ['633e4d641', '704373a58', '75f1ff195', '8c0ddc470', '9c902c7ec', 'a6d2e0be4', 'cc712a83e'].sort());
  for (const [n, d] of Object.entries(desk)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(dir, n))).digest('hex'), d.sha256, n);
    assert.ok(d.from.startsWith('art-jobs/'), n + ' names a source in the desk: ' + d.from);
  }
});

test('every map picture is in the new map palette: no pastel colour is left', () => {
  // two files carry one colour the palette table does not list: the scrub ground (SCRUB_GROUND: the grass's value, drier and yellower, made for the map) and the sand way-up's one painted sand tone (signed as is)
  const ALLOWED = (n) => (n.startsWith('over-scrub') ? [SCRUB_GROUND] : n === 'wayup-cliff-sand.png' ? ['#dfd387'] : []);
  for (const n of Object.keys(desk)) {
    if (['75f1ff195', '8c0ddc470', '9c902c7ec', 'a6d2e0be4', 'cc712a83e'].includes(desk[n].commit)) continue;   // the biome grounds (8c0ddc470), the biome decor (a6d2e0be4) and the walk's sprites are the art director's signed bytes in their own colours (mb-74), never recoloured; the set's palette holds them (prepare-set checks the limit)
    const im = img(n), r = recolour(im);
    assert.deepEqual(r.left.filter((c) => !ALLOWED(n).includes(c)), [], n + ' holds colours outside the map palette');
    // the reed sprites are painted in the new reed ramp; their cattail heads are mapped to the applied ramp (#664330, #7c5a3d): the desk's old browns are gone
    if (n.startsWith('reed-')) { for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) assert.ok(![0x6f4a37, 0x8a6444].includes((im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]), n + ' still holds an old cattail brown'); continue; }    assert.deepEqual(Buffer.from(r.data), Buffer.from(im.data), n + ' still holds a colour of the old palette');
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
  assert.deepEqual(Object.keys(set.layers), ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'drygrass', 'turf', 'litter', 'scree', 'scrub', 'thicket', 'cliff']);
  assert.equal(set.layers.scrub.ground, 'grass');
  assert.deepEqual(set.layers.scrub.over[0].variants, ['over-scrub~v1.png', 'over-scrub~v2.png', 'over-scrub~v3.png']);
  assert.match(from('fill-cliff.png'), /over-cliff\.png#15 recut recoloured$/);
  assert.match(from('over-thicket.png'), / keyed$/);
  assert.deepEqual(set.layers.cliff.over[0].tall['3'].length, 3, 'the cliff face at s = 3 has three variants');
  assert.equal(set.layers.sand.over[0].looks, undefined, 'the reed look of the beach is gone: the reeds are sprites (reeds.mjs)');
  assert.equal(set.layers.grass.over[0].looks, undefined);
  assert.ok(!Object.keys(desk).some((n) => n.startsWith('looks-reeds')));
});

test('the biome grounds are the art director\'s signed skins (8c0ddc470): the over sheet and the three fills byte for byte, the rare detail fill one in eight', () => {
  for (const b of ['litter', 'drygrass', 'turf', 'scree']) {
    const l = set.layers[b], over = l.over[0], fill = desk[`fill-${b}.png`], sheet = desk[`over-${b}.png`], strip = img(`fill-${b}.png`);
    assert.equal(over.kind, 'flat');
    assert.equal(sheet.commit, '8c0ddc470'); assert.equal(fill.commit, '8c0ddc470');
    assert.match(sheet.from, /art-biome-[a-z]+\/out\/tiles\/over-[a-z0-9-]+\.png$/);
    assert.deepEqual([strip.w, strip.h], [128, 16], b + ': a strip of eight 16 px fills');
    const tile = (k) => Buffer.from(crop(strip, k * 16, 0, 16, 16).data);
    assert.deepEqual(tile(0), tile(2)); assert.deepEqual(tile(1), tile(3)); assert.notDeepEqual(tile(0), tile(1)); assert.notDeepEqual(tile(7), tile(0));
  }
  assert.deepEqual(set.layers.thicket.over[0].lowers.filter((x) => ['drygrass', 'turf', 'scree'].includes(x)), ['drygrass', 'turf', 'scree'], 'the thicket rim lies over the biome grounds it meets');
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
  // every sprite is drawn at its signed 1x size with the manifest's foot (art director mb-74, mibi-art 75f1ff195, the p2 manifest): the set records each piece's size and foot in DESK.json
  for (const [n, size] of [['tuft-fan', [11, 10]], ['tuft', [11, 10]], ['tuft-lean', [11, 10]], ['tuft-small', [12, 10]]]) assert.deepEqual(set.decals[n].rect.slice(2), size, n + ' draws a signed tufts piece at 1x');
  // the tall clump: four signed pieces (19 and 12 rows tall, each mirrored), anchored at each file's own foot
  for (const [n, size, foot] of [['clump-tall', [15, 19], [7, 18]], ['clump-tall-m', [15, 19], [7, 18]], ['clump-tall-s', [14, 12], [7, 11]], ['clump-tall-sm', [14, 12], [6, 11]]]) { assert.deepEqual(set.decals[n].rect.slice(2), size, n); assert.deepEqual(set.decals[n].anchor, foot, n); }
  assert.deepEqual(set.decals['flower-blue-pair'].rect.slice(2), [16, 14]);
  for (const n of ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three']) {
    const r = set.decals[n].rect, im = decodePng(readFileSync(path.join(dir, 'sprites.png')));
    assert.ok(crop(im, r[0], r[1], r[2], r[3]).data.some((v, i) => i % 4 === 3 && v === 255), n + ' draws a flower');
    assert.equal(set.decals[n].anchor[1], r[3] - 1, n + ' stands on its foot row');
    assert.ok(set.decals[n].anchor[0] >= 0 && set.decals[n].anchor[0] < r[2], n + ' foot is inside the piece');
  }
  for (const [file, d] of Object.entries(desk)) if (d.foot) { const im = img(file); assert.deepEqual([im.w, im.h], d.size, file + ' is the size the manifest names'); }
  assert.deepEqual(Object.keys(set.canopy).sort(), ['tree-autumn-crown', 'tree-broad-crown']);
  assert.equal(set.props['tree-broad'].canopy, 'tree-broad-crown');
  // the tree is cut at the manifest's split row: the crown (107 rows) is the canopy, the trunk with its shadow (25 rows) the prop; both feet are the foot of the whole tree
  assert.equal(set.props['tree-broad'].rect[3], 25, 'the trunk piece: 25 rows under the crown');
  assert.equal(set.canopy['tree-broad-crown'].rect[3], 107);
  assert.deepEqual(set.props['tree-broad'].anchor, [67, 24]);
  assert.deepEqual(set.canopy['tree-broad-crown'].anchor, [67, 131]);
  for (const n of ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'stump']) assert.deepEqual(set.props[n].footprint, [], n + ' is stepped over or pushed through');
  assert.deepEqual(set.props['tree-hollow'].rect.slice(2), [171, 160], 'the signed hollow tree is 171 x 160');
  assert.deepEqual(set.props['split-stone'].rect.slice(2), [60, 46]);
  assert.deepEqual(set.props['tree-hollow'].footprint.length, 8, 'its footprint is as the kit\'s');
  for (const n of ['tall-grass', 'tall-grass-b', 'tall-grass-m', 'tall-grass-bm']) assert.deepEqual(set.props[n].footprint, [], n + ' blocks nothing');
  for (const f of ['tree-trunk.png', 'tree-crown.png', 'bush-round.png', 'rock-a.png', 'rock-b.png', 'boulder-a.png', 'boulder-a-m.png', 'boulder-d.png', 'boulder-e.png', 'tufts-1.png', 'shrub-1.png', 'stump.png', 'flowers-1.png', 'flowers-blue-pair.png', 'hollow-tree.png', 'split-stone.png']) assert.ok(desk[f], f + ' is recorded');
  assert.equal(set.props.reeds, undefined, 'the kit\'s bamboo reeds are gone');
  assert.ok(!set.decals['flower-sun'] && !set.decals['flower-sun-small'], 'the kit\'s sunflowers are retired');
});

test('the signed boulders (three shapes, each mirrored) and the meadow plants in three sizes are in the set, at the manifest\'s sizes and feet', () => {
  // mibi-art 9c902c7ec (art/art-fix-map-pieces, out/a2 and a2b): the two small stones 16 x 16 (foot 8, 15; walk-over), boulder A 23 x 23 (11, 22; blocks), D 24 x 13 and E 24 x 18 (12, 12 and 12, 17; walk-over, under the shoulder); a mirror's foot is across the picture
  for (const [n, size, foot, mfoot, block] of [['rock-a', [16, 16], [8, 15], [7, 15], 0], ['rock-b', [16, 16], [8, 15], [7, 15], 0], ['boulder-a', [23, 23], [11, 22], [11, 22], 1], ['boulder-d', [24, 13], [12, 12], [11, 12], 0], ['boulder-e', [24, 18], [12, 17], [11, 17], 0]]) {
    assert.deepEqual(set.props[n].rect.slice(2), size, n); assert.deepEqual(set.props[n].anchor, foot, n); assert.deepEqual(set.props[n].footprint, block ? [[0, 0]] : [], n);
    assert.deepEqual(set.props[`${n}-m`].rect.slice(2), size, n + '-m'); assert.deepEqual(set.props[`${n}-m`].anchor, mfoot, n + '-m');
    assert.equal(desk[`${n}.png`].commit, '9c902c7ec');
  }
  assert.equal(set.props['rock-big'], undefined, 'the 18 px boulder is retired');
  assert.deepEqual([set.props['boulder-grey'].rect.slice(2), set.props['boulder-brown'].rect.slice(2)], [[16, 16], [16, 16]], 'the hand-set places\' kit names draw the two small stones');
  // every plant in three sizes with a mirror: young and grown from the steps folder, the middle the signed piece; the grown is taller than the middle, the middle than the young
  for (const s of ['flowers-1', 'flowers-2', 'flowers-3', 'flowers-blue-pair', 'tufts-1', 'tufts-2', 'tufts-3', 'clump-tall', 'clump-tall-s', 'shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'bush-round']) {
    const h = (st) => set.decals[`sc-${s}${st}`].rect[3];
    assert.ok(h('-young') < h('') && h('') < h('-grown'), `${s}: young ${h('-young')}, middle ${h('')}, grown ${h('-grown')}`);
    for (const st of ['', '-young', '-grown']) { const a = set.decals[`sc-${s}${st}`], b = set.decals[`sc-${s}${st}-m`]; assert.deepEqual(a.rect.slice(2), b.rect.slice(2), `${s}${st} mirror size`); assert.equal(a.anchor[0] + b.anchor[0] + 1, a.rect[2], `${s}${st} mirror foot (across the picture)`); }
  }
  assert.equal(set.decals['sc-flowers-1'].rect[3], 14, 'the middle flower is 14 tall'); assert.equal(set.decals['sc-tufts-1'].rect[3], 10, 'the middle tuft is 10 tall');
});

test('the reed sprites and the grass flecks are in the set: four shore looks and two water looks (each mirrored) as props that block nothing, six flecks (each mirrored) as decals', () => {
  for (const n of ['shore-1', 'shore-2', 'shore-3', 'shore-4', 'water-1', 'water-2']) for (const m of ['', 'm']) assert.deepEqual(set.props[`reed-${n}${m}`].footprint, [], `reed-${n}${m}`);
  for (let k = 0; k < 6; k++) for (const m of ['', 'm']) assert.ok(set.decals[`fleck-${k}${m}`], `fleck-${k}${m}`);
  assert.ok(!set.decals['fleck-6'], 'only the six flecks the art director keeps');
});
