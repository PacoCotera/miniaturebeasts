// The cliff system's piece table (src/bake/cliffsystem.mjs): off unless switched on; middles picked in world coordinates only; every relief part of a mock land accounted for; the designer's cases placed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cliffSet, middleOf, placeBoundary, TABLE } from '../src/bake/cliffsystem.mjs';

// a mock land from rows ('1' raised, '.' low), read at world tiles; a window is the same land seen from an offset (the place's own coordinates)
const landOf = (rows, ox = 0, oy = 0) => {
  const H = rows.length, W = rows[0].length, at = (x, y) => { const X = x + ox, Y = y + oy; return X >= 0 && Y >= 0 && X < W && Y < H && rows[Y][X] === '1'; };
  return { raised: at, low: (x, y) => !at(x, y), way: () => false, inside: () => true };
};
const run = (rows, o = {}) => placeBoundary(landOf(rows, o.ox, o.oy), { x0: 0, y0: 0, x1: (o.w || rows[0].length) - 1, y1: (o.h || rows.length) - 1, wx0: o.ox || 0, wy0: o.oy || 0, key: 'test', level: 1 });
const at = (items, x, y) => items.filter((it) => it.x === x && it.y === y && it.id !== 'top').map((it) => it.id);

test('the system is off unless a tool switches it on', () => { assert.equal(cliffSet(), 'live'); });

test('every piece id of the table is unique and has a box, covers and a draw line', () => {
  const ids = TABLE.pieces.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of TABLE.pieces) { assert.equal(p.box.length, 4, p.id); assert.ok(p.covers.length > 0, p.id); assert.equal(typeof p.line, 'number', p.id); }
});

test('middles: A-F in order inside a 6-column block, the set by block, all from world tiles', () => {
  const row = Array.from({ length: 30 }, (_, x) => middleOf('k', 100 + x, 40, 1));
  for (let x = 1; x < row.length; x++) if (row[x].block === row[x - 1].block) assert.equal(row[x].letter, row[x - 1].letter + 1);
  else assert.equal(row[x].letter, 0);
  assert.deepEqual(middleOf('k', 105, 40, 1), middleOf('k', 105, 40, 1));
  assert.notDeepEqual(Array.from({ length: 12 }, (_, x) => middleOf('k', x, 40, 1).id), Array.from({ length: 12 }, (_, x) => middleOf('k', x, 40, 2).id));   // a stacked face does not align its middles
});

test('two windows over one land place the same piece on the same world cell (a seam)', () => {
  const rows = ['1'.repeat(40), '1'.repeat(40), '1'.repeat(40), '.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '.'.repeat(40)];
  const a = run(rows, { ox: 0, w: 20 }), b = run(rows, { ox: 17, w: 20 });
  for (let wx = 17; wx < 20; wx++) assert.deepEqual(at(a.items, wx, 2), at(b.items, wx - 17, 2));
});

test('a raised block: back rim, rounded back corners, side walls, convex corners, a face, and no part left without a piece', () => {
  const rows = ['............', ...Array(6).fill('..11111111..'), ...Array(6).fill('............')];
  const { items, missing } = run(rows);
  assert.deepEqual(missing, []);
  assert.deepEqual(at(items, 2, 1), ['rim-nw']); assert.deepEqual(at(items, 9, 1), ['rim-ne']); assert.deepEqual(at(items, 5, 1), ['rim-n']);
  assert.deepEqual(at(items, 1, 6), ['convex-w']); assert.deepEqual(at(items, 10, 6), ['convex-e']);
  assert.deepEqual(at(items, 1, 1), ['wall-w-head']); assert.deepEqual(at(items, 1, 3), ['wall-w-tail']); assert.deepEqual(at(items, 10, 2), ['wall-e-band']);
  assert.deepEqual(at(items, 2, 3), ['lip-side-w']); assert.deepEqual(at(items, 9, 3), ['lip-side-e']);
  assert.match(at(items, 5, 6)[0], /^mid-[123][A-F]$/);
});

test('step-downs of each k, a concave corner, and a diagonal of 4 steps', () => {
  for (const k of [1, 2, 3]) {
    const rows = ['1'.repeat(10), '1'.repeat(10), '1'.repeat(10), ...Array(k).fill('...1111...'), ...Array(6).fill('..........')], L = 2 + k;
    const { items, missing } = run(rows);
    assert.deepEqual(missing, [], `k${k}`);
    assert.ok(at(items, 2, L).includes(`end-w-${k}`), `k${k}`);
    assert.ok(at(items, 7, L).includes(`end-e-${k}`), `k${k}`);
  }
  const notch = [...Array(3).fill('11111111'), ...Array(8).fill('11....11')];
  const n = run(notch, { h: 8 });
  assert.deepEqual(at(n.items, 2, 2), ['concave-w']); assert.deepEqual(at(n.items, 5, 2), ['concave-e']); assert.deepEqual(n.missing, []);
  const lips = [2, 2, 2, 2, 3, 4, 5, 6, 6, 6, 6], diag = Array.from({ length: 12 }, (_, y) => lips.map((l) => (y <= l ? '1' : '.')).join(''));
  const d = run(diag);
  assert.deepEqual([3, 4, 5, 6, 7].map((x) => at(d.items, x, lips[x])[0]), ['dr-start', 'dr-mid', 'dr-mid', 'dr-mid', 'dr-end']);
  assert.ok(!d.items.some((it) => /^end-/.test(it.id)), 'a diagonal draws no step caps');
  assert.deepEqual(d.missing, []);
});
