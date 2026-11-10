// The art desk's signed pieces in the test set (open edges, mibi-art abb33a65b; meadow decor, mibi-art 5734abc5): every placed file is the desk's file byte for byte at its signed commit
// (never the desk's live folder), as DESK.json records; the cliff, thicket, scrub and deep-water pairs, the reed look and the small decals are in the set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../src/png.mjs';
import { slot15, reedPixels, keyShade } from '../tools/desk-art.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const desk = JSON.parse(readFileSync(path.join(dir, 'DESK.json'), 'utf8')), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
const REPO = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
const haveDesk = existsSync(REPO + '/.git') && (() => { try { execFileSync('git', ['-C', REPO, 'cat-file', '-t', 'abb33a65b']); return true; } catch { return false; } })();

test('every placed desk file equals the recorded hash, and the desk\'s file at its signed commit', () => {
  const names = Object.keys(desk);
  assert.ok(names.length > 60, 'files recorded: ' + names.length);
  assert.deepEqual([...new Set(Object.values(desk).map((d) => d.commit))].sort(), ['386ed11fa', '4315b9d25', '4e21bd68f', '5734abc5', 'abb33a65b', 'b60587b26', 'c335654cc', 'e43e480ac']);
  const show = (c, p) => execFileSync('git', ['-C', REPO, 'show', `${c}:${p}`], { maxBuffer: 1 << 26 });
  for (const [n, d] of Object.entries(desk)) {
    const have = readFileSync(path.join(dir, n));
    assert.equal(createHash('sha256').update(have).digest('hex'), d.sha256, n);
    if (!haveDesk) continue;
    if (d.from.includes('#15')) {   // a fill: slot 15 of a signed sheet, cropped, no pixel changed
      const sheet = decodePng(show(d.commit, d.from.replace('#15', '')));
      assert.deepEqual(decodePng(have).data, slot15(sheet).data, n + ' is not slot 15 of ' + d.from);
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
  const files = [...Object.values(set.layers).flatMap((l) => [...(l.fill ? l.fill.sheets : []), ...(l.over || []).flatMap((k) => [...k.sheets, ...Object.values(k.looks || {}).flat(2)])]), ...set.tone.sheets];
  assert.equal(new Set(files).size, files.length);
  for (const f of files) assert.ok(desk[f], f + ' is not recorded in DESK.json');
  const from = (f) => desk[f].from;
  assert.match(from('fill-grass.png'), /grass-over\.png#15$/);
  assert.match(from('fill-path.png'), /path-over\.png#15$/);
  assert.match(from('fill-sand.png'), /sand_beach-over\.png#15$/);
  assert.match(from('fill-water.png'), /water-over\.png#15$/);
  assert.match(from('fill-deep.png'), /sets\/pair-deep-water\.png#15$/);
  assert.equal(desk['fill-earth.png'].from.includes('#'), false, 'the earth fill is the desk\'s own strip');
  assert.equal(desk['fill-mud.png'].from.includes('#'), false);
  assert.deepEqual(Object.keys(set.layers), ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'scrub', 'thicket', 'cliff']);
  assert.deepEqual(set.layers.scrub, { drawAs: 'grass' });
  assert.match(from('fill-cliff.png'), /over-cliff\.png#15$/);
  assert.match(from('over-thicket.png'), / keyed$/);
  assert.deepEqual(set.layers.cliff.over[0].tall['3'].length, 3, 'the cliff face at s = 3 has three variants');
  assert.deepEqual(set.layers.sand.over[0].looks.reeds.map((v) => v.length), [1, 1, 1]);
  assert.deepEqual(set.layers.grass.over[0].looks.reeds, [], 'the grass bank reeds are an empty slot');
});

test('the set holds the open edges and the decor', () => {
  const ids = set.pairs.map((p) => p.id);
  for (const id of ['cliff-grass', 'cliff-sand', 'thicket-grass', 'thicket-sand', 'scrub-grass', 'scrub-sand', 'deep-water']) assert.ok(ids.includes(id), id);
  for (const g of ['cliff-grass', 'cliff-sand']) { const p = set.pairs.find((q) => q.id === g); assert.deepEqual(Object.keys(p.tall), ['1', '2', '3']); assert.ok(p.wayup); }
  assert.equal(set.pairs.find((p) => p.id === 'scrub-grass').variants.length, 3);
  assert.deepEqual(set.looks[0].of['grass-water'].map((v) => v.length), [4, 4, 4]);
  for (const n of ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'tuft-fan', 'tuft-lean', 'tuft-small', 'clump-tall']) assert.deepEqual(set.decals[n].anchor, [8, 15], n);
  assert.ok(!set.decals['flower-sun'] && !set.decals['flower-sun-small'], 'the kit\'s sunflowers are retired');
});
