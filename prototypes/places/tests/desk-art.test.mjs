// The art desk's signed pieces in the test set (open edges, mibi-art abb33a65b; the map decor, mibi-art 662fca36d and 003ee9598): every placed file is the desk's file byte for byte at its signed commit
// (never the desk's live folder), as DESK.json records; the terrain layers (fills, overs, cliff faces, way up, reed look, tone) and the small decals are in the set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, crop } from '../src/png.mjs';
import { slot15, reedPixels, keyShade } from '../tools/desk-art.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const desk = JSON.parse(readFileSync(path.join(dir, 'DESK.json'), 'utf8')), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
const REPO = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
const haveDesk = existsSync(REPO + '/.git') && (() => { try { execFileSync('git', ['-C', REPO, 'cat-file', '-t', 'abb33a65b']); return true; } catch { return false; } })();

test('every placed desk file equals the recorded hash, and the desk\'s file at its signed commit', () => {
  const names = Object.keys(desk);
  assert.ok(names.length > 35, 'files recorded: ' + names.length);
  assert.deepEqual([...new Set(Object.values(desk).map((d) => d.commit))].sort(), ['003ee9598', '34a8dc49c', '386ed11fa', '4e21bd68f', '662fca36d', 'abb33a65b', 'af25a3017', 'b60587b26', 'c335654cc', 'e43e480ac']);
  const show = (c, p) => execFileSync('git', ['-C', REPO, 'show', `${c}:${p}`], { maxBuffer: 1 << 26 });
  for (const [n, d] of Object.entries(desk)) {
    const have = readFileSync(path.join(dir, n));
    assert.equal(createHash('sha256').update(have).digest('hex'), d.sha256, n);
    if (!haveDesk) continue;
    if (d.from.includes(' recut')) continue;   // the cliff sheets re-cut at the desk's windows: the inputs are tools/recut (checked below), not the desk's file
    if (d.from.includes('#15')) {   // a fill: slot 15 of a signed sheet, cropped, no pixel changed
      const sheet = decodePng(show(d.commit, d.from.replace('#15', '')));
      assert.deepEqual(decodePng(have).data, slot15(sheet).data, n + ' is not slot 15 of ' + d.from);
    } else if (d.from.includes(' + ')) {   // the water frames: the signed 16 px variants laid side by side in one strip
      const parts = d.from.split(' + ').map((p) => decodePng(show(d.commit, p))), strip = decodePng(have);
      parts.forEach((p, k) => assert.deepEqual(crop(strip, k * 16, 0, 16, 16).data, p.data, `${n} variant ${k}`));
    } else if (/ rows \d+\.\.\d+ \(/.test(d.from)) {   // the tree's crown and trunk: a crop of the signed picture
      const [, src, y0, y1] = d.from.match(/^(.*) rows (\d+)\.\.(\d+) \(/), sheet = decodePng(show(d.commit, src));
      assert.deepEqual(decodePng(have).data, crop(sheet, 0, +y0, sheet.w, +y1 - +y0 + 1).data, n + ' is not rows of ' + src);
    } else if (d.from.endsWith(' keyed')) {   // thicket and cliff over sheets: the signed sheet with every pixel of alpha under 255 made transparent (art director ruling 2026-11-09), nothing else changed
      const sheet = decodePng(show(d.commit, d.from.replace(/ keyed$/, '')));
      assert.deepEqual(decodePng(have).data, keyShade(sheet).data, n + ' is not the keyed ' + d.from);
    } else if (d.from.includes(' minus ')) {   // a reed look: the pixels of the signed reed composite that differ from the plain one
      const [reeds, plain] = d.from.split(' minus ').map((p) => decodePng(show(d.commit, p)));
      assert.deepEqual(decodePng(have).data, reedPixels(reeds, plain).data, n + ' is not the reed pixels of ' + d.from);
    } else assert.ok(have.equals(show(d.commit, d.from)), n + ' differs from the desk\'s file at ' + d.commit);
  }
});

test('the terrain layers are signed pieces: every layer file is recorded, fills say which sheet they were cut from, thicket and cliff come keyed', () => {
  const files = [...Object.values(set.layers).flatMap((l) => [...(l.fill ? l.fill.sheets : []), ...(l.over || []).flatMap((k) => [...k.sheets, ...(k.variants || []), ...(k.full ? [k.full] : []), ...Object.values(k.looks || {}).flat(2)])]), ...set.tone.sheets];
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
  assert.equal(desk['fill-mud.png'].from.includes('#'), false);
  assert.deepEqual(Object.keys(set.layers), ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'scrub', 'thicket', 'cliff']);
  assert.equal(set.layers.scrub.ground, 'grass');
  assert.equal(set.layers.scrub.drawAs, undefined, 'scrub has its own layer');
  assert.deepEqual(set.layers.scrub.over[0].variants, ['over-scrub~v1.png', 'over-scrub~v2.png', 'over-scrub~v3.png']);
  assert.match(from('fill-cliff.png'), /over-cliff\.png#15 recut$/);
  assert.match(from('over-thicket.png'), / keyed$/);
  assert.deepEqual(set.layers.cliff.over[0].tall['3'].length, 3, 'the cliff face at s = 3 has three variants');
  assert.deepEqual(set.layers.sand.over[0].looks.reeds.map((v) => v.length), [1, 1, 1]);
  assert.deepEqual(set.layers.grass.over[0].looks.reeds, [], 'the grass bank reeds are an empty slot');
});

test('the set holds the terrain layers, the cliff, the way up and the decor; no pair table', () => {
  assert.equal(set.pairs, undefined);
  assert.equal(set.looks, undefined);
  for (const id of ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'thicket', 'cliff']) assert.ok(set.layers[id].fill, id + ' has a fill');
  const cliff = set.layers.cliff.over[0];
  assert.deepEqual(Object.keys(cliff.tall), ['1', '2', '3']);
  assert.deepEqual(Object.keys(cliff.wayup), ['grass', 'sand']);
  assert.deepEqual(set.tone.also, ['cliff'], 'the raised top carries tone');
});

test('the cliff sheets are the re-cut ones (tools/recut): the placed file is the recut sheet with the soft shade keyed, and the recut leaves no loose speck', () => {
  const recutDir = path.join(here, '..', 'tools', 'recut');
  for (const [n, d] of Object.entries(desk)) {
    if (!d.from.includes(' recut (')) continue;
    assert.deepEqual(decodePng(readFileSync(path.join(dir, n))).data, keyShade(decodePng(readFileSync(path.join(recutDir, n)))).data, n);
  }
  assert.ok(Object.values(desk).filter((d) => d.from.includes(' recut (')).length >= 6);
});

test('the map decor: the kit names stay and draw the signed pieces, the tree is cut into crown and trunk, the flowers and the clump are empty slots', () => {
  for (const n of ['tuft-fan', 'tuft-lean', 'tuft-small', 'tuft']) assert.deepEqual(set.decals[n].rect.slice(2), [12, 13], n);
  for (const n of ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'clump-tall']) assert.deepEqual(set.decals[n].anchor, [8, 15], n);
  assert.ok(!set.decals['flower-sun'] && !set.decals['flower-sun-small'], 'the kit\'s sunflowers are retired');
  assert.deepEqual(Object.keys(set.canopy).sort(), ['tree-autumn-crown', 'tree-broad-crown']);
  assert.equal(set.props['tree-broad'].canopy, 'tree-broad-crown');
  assert.equal(set.props['tree-broad'].rect[3], 9, 'the trunk piece: 9 rows under the crown');
  assert.equal(set.canopy['tree-broad-crown'].rect[3], 32);
  for (const n of ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4']) assert.deepEqual(set.props[n].footprint, [[0, 0]], n);
  for (const f of ['tree-trunk.png', 'tree-crown.png', 'bush.png', 'rock-1.png', 'tufts-1.png', 'shrub-1.png']) assert.ok(desk[f], f + ' is recorded');
  const empty = (n) => { const r = set.decals[n].rect, sheet = decodePng(readFileSync(path.join(dir, 'sprites.png'))); return crop(sheet, r[0], r[1], r[2], r[3]).data.every((v, i) => (i % 4 === 3 ? v === 0 : true)); };
  for (const n of ['flower-daisy', 'clump-tall']) assert.ok(empty(n), n + ' draws nothing');
});
