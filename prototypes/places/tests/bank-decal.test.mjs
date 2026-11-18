// The earth bank's art (wayup-paint-5, wayup-undug-2): the bake draws an ir.banks site as the wayup-undug decal, the page swaps in wayup-dug once Rupar has dug it.
//   node --test prototypes/places/tests/bank-decal.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { decodePng } from '../src/png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '../../..'), setDir = path.join(root, 'art/places/sets/ninja-test');
const terrains = JSON.parse(readFileSync(path.join(root, 'art/places/terrain.json'), 'utf8')).terrains;

test('an ir.banks site is one wayup-undug decal at its top-left cell, drawn after the face columns; no banks, no decal', async () => {
  const { provingIR } = await import('../src/bake/proving.mjs'), { cliffInfo } = await import('../src/bake/openedges.mjs'), { cliffDecals } = await import('../src/bake/southruns.mjs');
  const ir = provingIR(terrains), plain = cliffDecals(ir, cliffInfo(ir, terrains));
  assert.ok(!plain.some((d) => /^wayup-/.test(d.kind)), 'no banks: no bank decal');
  const bank = { x: 4, y: 3, w: 2, h: 1 }, withBank = { ...ir, banks: [bank] }, got = cliffDecals(withBank, cliffInfo(withBank, terrains));
  const mine = got.filter((d) => /^wayup-/.test(d.kind));
  assert.deepEqual(mine, [{ kind: 'wayup-undug', x: 4 * 48, y: 3 * 48 }]);
  assert.equal(got.length, plain.length + 1, 'the bank adds exactly one decal');
  assert.deepEqual(got.filter((d) => !/^wayup-/.test(d.kind)), plain, 'the other pieces keep their order');
  const at = got.findIndex((d) => d.kind === 'wayup-undug');
  assert.ok(got.slice(at + 1).every((d) => !/^cliff-south-/.test(d.kind) || d.y > 3 * 48), 'no face column of its line is drawn after it');
});

test('the two bank pieces are 32 x 64 art px, in the set palette, and the set lists them as 96 x 192 decals', () => {
  const pal = new Set(JSON.parse(readFileSync(path.join(setDir, 'palette.json'), 'utf8')).colours.map((c) => c.toLowerCase()));
  const set = JSON.parse(readFileSync(path.join(setDir, 'set.json'), 'utf8'));
  const hex = (d, i) => '#' + [0, 1, 2].map((k) => d[i + k].toString(16).padStart(2, '0')).join('');
  for (const k of ['wayup-undug', 'wayup-dug']) {
    const im = decodePng(readFileSync(path.join(setDir, `${k}.png`)));
    assert.deepEqual([im.w, im.h], [32, 64], k);
    for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) assert.ok(pal.has(hex(im.data, i)), `${k}: ${hex(im.data, i)} is a set colour`);
    assert.deepEqual(set.decals[k].rect.slice(2), [96, 192], k);
    assert.deepEqual(set.decals[k].anchor, [0, 0], k);
  }
  const a = readFileSync(path.join(setDir, 'wayup-undug.png')), b = readFileSync(path.join(setDir, 'wayup-dug.png'));
  assert.ok(!a.equals(b), 'undug and dug differ');
});

test('the page swaps a dug bank to wayup-dug and back to nothing else: bankDecalsOn on a view with two banks', () => {
  const html = readFileSync(path.join(root, 'prototypes/exploration/index.html'), 'utf8');
  const m = html.match(/function bankDecalsOn\(v, lay\) \{[\s\S]*?\n\}\n/); assert.ok(m, 'bankDecalsOn is in the page');
  const S = { exp: { dug: [] } };
  const run = vm.runInNewContext(`${m[0]}; bankDecalsOn`, { S });
  const un = 7, dug = 8, other = 3;
  const mk = () => ({ ts: { sprites: Array.from({ length: 10 }, (_, i) => ({ group: 'decal', kind: i === un ? 'wayup-undug' : i === dug ? 'wayup-dug' : 'x' + i })) },
    place: { decals: [{ kind: un, x: 13 * 48, y: 2 * 48 }, { kind: un, x: 30 * 48, y: 9 * 48 }, { kind: other, x: 13 * 48, y: 2 * 48 }] },
    cache: { key: 'k', full: {}, frames: new Map([[1, 1]]) }, half: { key: 'h', buf: {} }, last: {} });
  const lay = { banks: [{ x: 12, y: 1, w: 2, h: 4, ei: 900001 }, { x: 29, y: 8, w: 2, h: 4, ei: 900002 }] };
  const v = mk();
  run(v, lay);   // first sight: nothing dug, nothing dropped
  assert.deepEqual(v.place.decals.map((d) => d.kind), [un, un, other]); assert.equal(v.cache.key, 'k');
  S.exp.dug.push(900002); run(v, lay);
  assert.deepEqual(v.place.decals.map((d) => d.kind), [un, dug, other], 'only the dug bank changes');
  assert.equal(v.cache.key, null); assert.equal(v.cache.frames.size, 0); assert.equal(v.half.key, null); assert.equal(v.last, null);
  v.cache.key = 'again'; run(v, lay); assert.equal(v.cache.key, 'again', 'unchanged flags: no new reset');
  const w = mk(); S.exp.dug.push(900001); run(w, lay);   // a view made after the dig (a return to the place)
  assert.deepEqual(w.place.decals.map((d) => d.kind), [dug, dug, other]); assert.equal(w.cache.key, 'k', 'made fresh: nothing to drop');
});
