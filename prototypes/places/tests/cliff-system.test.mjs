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
  for (const k of [2, 3]) {
    const rows = ['1'.repeat(10), '1'.repeat(10), '1'.repeat(10), ...Array(k).fill('...1111...'), ...Array(6).fill('..........')], L = 2 + k;
    const { items, missing } = run(rows);
    assert.deepEqual(missing, [], `k${k}`);
    assert.ok(at(items, 2, L).includes(`end-w-${k}`), `k${k}`);
    assert.ok(at(items, 7, L).includes(`end-e-${k}`), `k${k}`);
  }
  // cliff-contour-1: a one-row step is a 2:1 slope (the two halves either side of it), never a k1 end cap
  { const k1 = run(['1'.repeat(10), '1'.repeat(10), '1'.repeat(10), '...1111...', ...Array(6).fill('..........')]);
    assert.deepEqual(k1.missing, []);
    assert.deepEqual([2, 3, 6, 7].map((x) => at(k1.items, x, x === 2 || x === 7 ? 2 : 3).filter((id) => /^d[rl]-/.test(id))[0]), ['dr-start', 'dr-end', 'dl-end', 'dl-start']);
    assert.ok(!k1.items.some((it) => /^end-[ew]-1$/.test(it.id)), 'no k1 cap'); }
  const notch = [...Array(3).fill('11111111'), ...Array(8).fill('11....11')];
  const n = run(notch, { h: 8 });
  assert.deepEqual(at(n.items, 2, 2), ['concave-w']); assert.deepEqual(at(n.items, 5, 2), ['concave-e']); assert.deepEqual(n.missing, []);
  const lips = [2, 2, 2, 2, 3, 4, 5, 6, 6, 6, 6], diag = Array.from({ length: 12 }, (_, y) => lips.map((l) => (y <= l ? '1' : '.')).join(''));
  const d = run(diag);
  assert.deepEqual([3, 4, 5, 6, 7].map((x) => at(d.items, x, lips[x])[0]), ['dr-start', 'dr-mid', 'dr-mid', 'dr-mid', 'dr-end']);
  assert.ok(!d.items.some((it) => /^end-/.test(it.id)), 'a diagonal draws no step caps');
  assert.deepEqual(d.missing, []);
});

test('steep runs (rule 6): 3+ steps of 1 column over that average more than 1.25 rows draw one wall, no slab or cap to a step; a gentle mix keeps the diagonal and the faces', () => {
  const draw = (lips, h = 16, wall = 3) => Array.from({ length: h }, (_, y) => [...'.' + lips.map((l) => (y <= l ? '1' : '.')).join('') + '1'.repeat(wall)].join(''));
  // the seed 7 k2 site: drops 1 1 2 1 (4 steps, 5 rows), going down to the east, the wall running on south
  const s = run(draw([2, 3, 4, 6, 7]));
  assert.deepEqual(s.missing, []);
  assert.deepEqual([1, 2, 3, 4].map((x) => at(s.items, x, [2, 3, 4, 6][x - 1]).filter((id) => /^steep-/.test(id))[0]), ['steep-r-1', 'steep-r-1', 'steep-r-2', 'steep-r-1']);
  // the run's last column meets the wall of the land running on south: it ends as a concave corner (GD fix-2 (3)), and the wall below it goes on as a band, never a new head (no lone end piece)
  assert.deepEqual(at(s.items, 5, 7).filter((id) => /^(steep|concave)-/.test(id)), ['concave-e']);
  assert.ok(!s.items.some((it) => it.id === 'steep-r-end'));
  assert.ok(!s.items.some((it) => it.id === 'wall-w-head' && it.x === 5 && it.y > 7), 'the wall under the corner is a band');
  // the last column meets the next face (a front run on its lip row, the land not running on): the steep wall's own end piece
  const f = run(Array.from({ length: 16 }, (_, y) => '.' + [2, 3, 4, 6, 7].map((l) => (y <= l ? '1' : '.')).join('') + (y <= 7 ? '1111' : '....')));
  assert.deepEqual(f.missing, []);
  assert.deepEqual(at(f.items, 5, 7).filter((id) => /^steep-/.test(id)), ['steep-r-end']);
  assert.ok(!s.items.some((it) => /^(end|convex|concave|dr|dl)-/.test(it.id) && it.x > 0 && it.x < 5 && it.y < 14), 'no cap, concave or diagonal piece inside the run');
  // down to the west, drops 2 3 1 2
  const w = run(draw([1, 3, 6, 7, 9], 15).map((r) => [...r].reverse().join('')));
  assert.deepEqual(w.missing, []);
  assert.ok(w.items.some((it) => /^steep-l-/.test(it.id)));
  // a long run of 45 degree steps with one 2-row step in it averages under 1.25: not steep (the diagonal and a front face)
  const gentle = run(draw([2, 3, 4, 5, 6, 7, 8, 10, 11], 20));
  assert.ok(!gentle.items.some((it) => /^steep-/.test(it.id)));
  assert.ok(gentle.items.some((it) => /^dr-/.test(it.id)));
});

test('cliff-contour-1: side walls moving one column draw leans; the back rim steps one row as slopes', () => {
  // the template's T9b: the west wall moves in at row 3 and out at row 7, the east wall out at row 3 and in at row 7
  const rows = [...Array(3).fill('...11111111...'), ...Array(4).fill('....11111111..'), ...Array(6).fill('...11111111...'), ...Array(4).fill('..............')];
  const b = run(rows);
  assert.deepEqual(b.missing, []);
  assert.deepEqual(at(b.items, 3, 2), ['lean-w']); assert.deepEqual(at(b.items, 3, 7), ['lean-out-w']);
  assert.deepEqual(at(b.items, 11, 3), ['lean-out-e']); assert.deepEqual(at(b.items, 11, 6), ['lean-e']);
  assert.ok(!b.items.some((it) => /^(concave|convex|end)-/.test(it.id) && it.y < 10), 'no face, cap or corner at a lean');
  // a hill: the back rim climbs and falls in one-row steps over a flat rim
  const hill = run(['................', '.......11.......', '......1111......', '.....111111.....', '....11111111....', ...Array(4).fill('1'.repeat(16)), ...Array(4).fill('.'.repeat(16))]);
  assert.deepEqual(hill.missing, []);
  assert.deepEqual([3, 4, 5, 7, 8, 10, 11, 12].map((x) => at(hill.items, x, [5, 4, 3, 1, 1, 3, 4, 5][[3, 4, 5, 7, 8, 10, 11, 12].indexOf(x)])[0]), ['rim-dl-end', 'rim-dl-mid', 'rim-dl-mid', 'rim-dl-start', 'rim-dr-start', 'rim-dr-mid', 'rim-dr-mid', 'rim-dr-end']);
});
