// The earth bank's art (wayup-place-1, after wayup-paint-5): the bake draws an undug ir.banks site with no decal (today's rock face); the page adds the wayup-dug decal once Rupar has dug it.
//   node --test prototypes/places/tests/bank-decal.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../src/png.mjs';
import { bankDecalsOn } from '../../exploration/src/render/bank-decals.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '../../..'), setDir = path.join(root, 'art/places/sets/ninja-test');
const terrains = JSON.parse(readFileSync(path.join(root, 'art/places/terrain.json'), 'utf8')).terrains;

test('an ir.banks site adds no decal to the bake: an undug bank is the rock face as before', async () => {
  const { provingIR } = await import('../src/bake/proving.mjs'), { cliffInfo } = await import('../src/bake/openedges.mjs'), { cliffDecals } = await import('../src/bake/southruns.mjs');
  const ir = provingIR(terrains), plain = cliffDecals(ir, cliffInfo(ir, terrains));
  const withBank = { ...ir, banks: [{ x: 4, y: 3, w: 2, h: 1 }] }, got = cliffDecals(withBank, cliffInfo(withBank, terrains));
  assert.ok(!got.some((d) => /^wayup-/.test(d.kind)), 'no wayup decal before the dig');
  assert.deepEqual(got, plain, 'the bank changes nothing in the bake');
});

test('the dug piece is 32 x 64 art px, in the set palette, listed as a 96 x 192 decal; the undug piece is gone from the set', () => {
  const pal = new Set(JSON.parse(readFileSync(path.join(setDir, 'palette.json'), 'utf8')).colours.map((c) => c.toLowerCase()));
  const set = JSON.parse(readFileSync(path.join(setDir, 'set.json'), 'utf8'));
  const hex = (d, i) => '#' + [0, 1, 2].map((k) => d[i + k].toString(16).padStart(2, '0')).join('');
  const im = decodePng(readFileSync(path.join(setDir, 'wayup-dug.png')));
  assert.deepEqual([im.w, im.h], [32, 64]);
  for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) assert.ok(pal.has(hex(im.data, i)), `wayup-dug: ${hex(im.data, i)} is a set colour`);
  assert.deepEqual(set.decals['wayup-dug'].rect.slice(2), [96, 192]);
  assert.deepEqual(set.decals['wayup-dug'].anchor, [0, 0]);
  assert.ok(!set.decals['wayup-undug'], 'set.json does not name wayup-undug');
  assert.ok(!existsSync(path.join(setDir, 'wayup-undug.png')), 'wayup-undug.png is removed');
  for (const f of ['DESK.json', 'set.json']) assert.ok(!readFileSync(path.join(setDir, f), 'utf8').includes('wayup-undug'), `${f} does not name wayup-undug`);
});

test('the page adds wayup-dug for a dug bank at its draw order, and for a view made after the dig; an undug bank gets nothing', () => {
  const S = { exp: { dug: [] } };
  const run = (v, lay) => bankDecalsOn(v, lay, S.exp.dug);
  const DUG = 7, COL = 1, FACE = 2, FLOWER = 3;   // sprite indices: the dug piece, a south column (6 rows tall), a one-cell cliff piece, a flower
  const sprites = [];
  sprites[DUG] = { group: 'decal', kind: 'wayup-dug', h48: 192 }; sprites[COL] = { group: 'decal', kind: 'cliff-south-1', h48: 288 };
  sprites[FACE] = { group: 'decal', kind: 'cliff-fill', h48: 48 }; sprites[FLOWER] = { group: 'decal', kind: 'flower-1', h48: 48 };
  for (let i = 0; i < 10; i++) sprites[i] = sprites[i] || { group: 'decal', kind: 'x' + i, h48: 48 };
  // a cliff line on lip row 3 (a column at y = 1 * 48 has foot line 1 + 6 - 1 = 6 = the lip row + 3) and one on lip row 4 (foot line 7), then a flower
  const mk = () => ({ ts: { sprites }, place: { decals: [{ kind: COL, x: 14 * 48, y: 1 * 48 }, { kind: COL, x: 40 * 48, y: 2 * 48 }, { kind: COL, x: 41 * 48, y: 3 * 48 }, { kind: FLOWER, x: 5 * 48, y: 2 * 48 }] },
    cache: { key: 'k', full: {}, frames: new Map([[1, 1]]) }, half: { key: 'h', buf: {} }, last: {} });
  const lay = { banks: [{ x: 12, y: 2, w: 2, h: 4, ei: 900001 }, { x: 39, y: 1, w: 2, h: 4, ei: 900002 }] };   // lip rows 3 and 2 in the place's cells: foot lines 6 and 5
  const v = mk();
  run(v, lay);   // first sight: nothing dug, nothing added, nothing dropped
  assert.equal(v.place.decals.length, 4); assert.ok(!v.place.decals.some((d) => d.kind === DUG)); assert.equal(v.cache.key, 'k');
  S.exp.dug.push(900001); run(v, lay);
  const kinds = v.place.decals.map((d) => d.kind), at = kinds.indexOf(DUG);
  assert.equal(kinds.filter((k) => k === DUG).length, 1, 'one dug decal');
  assert.deepEqual({ ...v.place.decals[at] }, { kind: DUG, x: 13 * 48, y: 3 * 48, sortY: 3 * 48 }, 'at the bank: its west column and lip row');
  assert.equal(at, 1, 'after the one column of its line, before the columns of later lines');
  assert.ok(kinds.slice(0, at).every((k, i) => sprites[k].kind.startsWith('cliff-') && v.place.decals[i].y / 48 + sprites[k].h48 / 48 - 1 <= 6), 'before it: cliff pieces of its line or above');
  assert.ok(kinds.slice(at + 1).every((k, i) => !sprites[k].kind.startsWith('cliff-') || v.place.decals[at + 1 + i].y / 48 + sprites[k].h48 / 48 - 1 > 6), 'after it: later lines and the other decals');
  assert.equal(kinds[kinds.length - 1], FLOWER, 'the flower stays last');
  assert.equal(v.cache.key, null); assert.equal(v.cache.frames.size, 0); assert.equal(v.half.key, null); assert.equal(v.last, null);
  v.cache.key = 'again'; run(v, lay); assert.equal(v.cache.key, 'again', 'unchanged flags: no new reset, no second decal');
  assert.equal(v.place.decals.filter((d) => d.kind === DUG).length, 1);
  const w = mk(); run(w, lay);   // a view made after the dig (a return to the place): the dug bank is drawn at once, nothing to drop
  assert.equal(w.place.decals.filter((d) => d.kind === DUG).length, 1); assert.equal(w.cache.key, 'k', 'made fresh: nothing to drop');
  assert.deepEqual(w.place.decals.map((d) => d.kind), kinds, 'the same order as the view that saw the dig');
});
