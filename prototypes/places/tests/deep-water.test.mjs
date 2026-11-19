// Inland water 2+ tiles from shore is drawn as deep (owner bug #48); drawing only, so play (terrain, block mask) is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawnTerrain } from '../src/bake/build.mjs';

const TERRAINS = [{ id: 'deep', value: 1 }, { id: 'water', value: 2 }, { id: 'grass', value: 6 }];
const LAYERS = new Map([[1, {}], [2, {}], [6, {}]]);
// rows of '.' grass and 'w' water
const grid = (rows) => ({ w: rows[0].length, h: rows.length, t: Uint8Array.from(rows.join('').split('').map((c) => (c === 'w' ? 2 : c === 'D' ? 1 : 6))) });
const show = (t, w) => { const r = []; for (let i = 0; i < t.length; i += w) r.push([...t.slice(i, i + w)].map((v) => (v === 1 ? 'D' : v === 2 ? 'w' : '.')).join('')); return r; };

test('a 5-wide lake has a 3-wide deep middle and a 1-tile shallow shelf', () => {
  const { w, h, t } = grid(['.......', '.wwwww.', '.wwwww.', '.wwwww.', '.wwwww.', '.wwwww.', '.......']);
  assert.deepEqual(show(drawnTerrain(t, w, h, TERRAINS, LAYERS), w), ['.......', '.wwwww.', '.wDDDw.', '.wDDDw.', '.wDDDw.', '.wwwww.', '.......']);
});

test('a 3-wide channel has one deep line; a 2-wide channel stays shallow', () => {
  const three = grid(['.....', '.www.', '.www.', '.www.', '.www.', '.....']);
  assert.deepEqual(show(drawnTerrain(three.t, three.w, three.h, TERRAINS, LAYERS), three.w), ['.....', '.www.', '.wDw.', '.wDw.', '.www.', '.....']);
  const two = grid(['....', '.ww.', '.ww.', '.ww.', '....']);
  assert.deepEqual(show(drawnTerrain(two.t, two.w, two.h, TERRAINS, LAYERS), two.w), show(two.t, two.w));
});

test('water running off the place edge reads as water past it (the dual grid clamp); coast deep stays deep and counts as water', () => {
  const g = grid(['wwwww', 'wwwww', 'wwwww', 'wwwww', 'wwwww']);
  assert.ok(drawnTerrain(g.t, g.w, g.h, TERRAINS, LAYERS).every((v) => v === 1));
  const c = grid(['DDwww', 'DDwww', 'DDwww', '.....']);
  assert.deepEqual(show(drawnTerrain(c.t, c.w, c.h, TERRAINS, LAYERS), c.w), ['DDDDD', 'DDDDD', 'DDwww', '.....']);
});

test('the input terrain is not changed, and a set without a deep layer draws it as it is', () => {
  const { w, h, t } = grid(['.....', '.www.', '.www.', '.www.', '.....']);
  const before = t.slice();
  drawnTerrain(t, w, h, TERRAINS, LAYERS);
  assert.deepEqual(t, before);
  assert.equal(drawnTerrain(t, w, h, TERRAINS, new Map([[2, {}], [6, {}]])), t);
});
