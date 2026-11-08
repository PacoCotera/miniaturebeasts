// C3: the dual grid (place design A2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cornerIndex, corners, cell, dualGrid, hash32, DualGridError, EMPTY, FULL_BASE, EMPTY_BASE, NW, NE, SW, SE } from '../src/dualgrid.mjs';

const TERRAINS = [
  { id: 'deep', value: 1, z: 0 }, { id: 'water', value: 2, z: 1 }, { id: 'sand', value: 3, z: 2 },
  { id: 'mud', value: 4, z: 3 }, { id: 'path', value: 5, z: 4 }, { id: 'grass', value: 6, z: 5 },
];
const V = Object.fromEntries(TERRAINS.map((t) => [t.id, t.value]));
const level = (id, rows, map) => ({ id, w: rows[0].length, h: rows.length, terrain: Uint8Array.from(rows.join('').split('').map((c) => V[map[c]])) });
const pair = (lower, upper, extra = {}) => ({ lower, upper, mode: 'opaque', fullCount: 3, emptyCount: 0, ...extra });

test('corner index: all 16 patterns of a 2x2 map land on the middle dual tile', () => {
  const up = (v) => v === 1;
  for (let n = 0; n < 16; n++) {
    const cells = Uint8Array.from([n & NW ? 1 : 0, n & NE ? 1 : 0, n & SW ? 1 : 0, n & SE ? 1 : 0]);
    assert.equal(cornerIndex(cells, 2, 2, 1, 1, up), n, 'pattern ' + n);
  }
});

test('diagonal tiles: NE+SW is 6 and NW+SE is 9', () => {
  assert.equal(NE | SW, 6);
  assert.equal(NW | SE, 9);
  const up = (v) => v === 1;
  assert.equal(cornerIndex(Uint8Array.from([0, 1, 1, 0]), 2, 2, 1, 1, up), 6);
  assert.equal(cornerIndex(Uint8Array.from([1, 0, 0, 1]), 2, 2, 1, 1, up), 9);
});

test('clamp: cells outside the place read as the nearest edge cell, so the border draws whole', () => {
  const cells = Uint8Array.from([1, 0, 0, 1, 1, 0]); // 2 wide, 3 high
  assert.equal(cell(cells, 2, 3, -5, 0), 1);
  assert.equal(cell(cells, 2, 3, 9, 0), 0);
  assert.equal(cell(cells, 2, 3, 0, 9), 1);
  // the dual tile at the far corner (w, h) sees only the corner cell
  assert.deepEqual(corners(cells, 2, 3, 2, 3), [0, 0, 0, 0].map(() => cells[5]));
  assert.deepEqual(corners(cells, 2, 3, 0, 0), [1, 1, 1, 1]);
  // a map of one terrain gives index 15 (all upper) or 0 everywhere, border included
  const all = Uint8Array.from({ length: 12 }, () => 1);
  for (let j = 0; j <= 3; j++) for (let i = 0; i <= 4; i++) assert.equal(cornerIndex(all, 4, 3, i, j, (v) => v === 1), 15);
});

test('a pair draws only its own tiles: the layer holds the corner index, full variants for uniform upper ground', () => {
  const lv = level('t1', ['....', '.gg.', '.gg.', '....'], { '.': 'sand', g: 'grass' });
  const dg = dualGrid(lv, TERRAINS, [pair('sand', 'grass')]);
  assert.equal(dg.layers.length, 1);
  const t = dg.layers[0].tiles, w1 = dg.w1;
  const at = (i, j) => t[j * w1 + i];
  assert.equal(at(2, 2), FULL_BASE + (hash32('t1', 2, 2) % 3), 'inside the grass: a full variant');
  assert.equal(at(1, 1), SE, 'north-west corner of the block: one grass corner, its SE');
  assert.equal(at(3, 1), SW, 'north-east corner of the block');
  assert.equal(at(1, 3), NE, 'south-west corner of the block');
  assert.equal(at(3, 3), NW, 'south-east corner of the block');
  assert.equal(at(2, 1), SW | SE, 'north shore: the two south corners');
  assert.equal(at(1, 2), NE | SE, 'west shore: the two east corners');
  assert.equal(at(0, 0), 0, 'sand far from grass is the lower tile 0');
});

test('full-tile variants are chosen by hash(place, x, y): stable, and all of them get used', () => {
  assert.equal(hash32('reedpool', 3, 4), hash32('reedpool', 3, 4));
  assert.notEqual(hash32('reedpool', 3, 4), hash32('reedpool', 4, 3));
  assert.notEqual(hash32('reedpool', 3, 4), hash32('hollow', 3, 4));
  const rows = Array.from({ length: 12 }, () => 'g'.repeat(12));
  const lv = level('wide', rows, { g: 'grass' });
  const a = dualGrid(lv, TERRAINS, [pair('path', 'grass', { fullCount: 5 })]);
  const b = dualGrid(lv, TERRAINS, [pair('path', 'grass', { fullCount: 5 })]);
  assert.deepEqual(a.layers[0].tiles, b.layers[0].tiles);
  const seen = new Set(Array.from(a.layers[0].tiles).map((c) => c - FULL_BASE));
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);
});

test('a lower region takes the full variants of the empty strip when the set has one', () => {
  const lv = level('lw', ['....', '....'], { '.': 'path' });
  const dg = dualGrid(lv, TERRAINS, [pair('path', 'grass', { emptyCount: 2 })]);
  for (const c of dg.layers[0].tiles) assert.ok(c === EMPTY_BASE || c === EMPTY_BASE + 1);
});

test('three terrains at one corner are refused for an opaque pair, naming the dual tile and cells', () => {
  // water | sand over grass and water: the dual tile (1, 1) sees water, sand, grass and sand
  const lv = level('three', ['ws', 'gs'], { w: 'water', s: 'sand', g: 'grass' });
  const opaque = [pair('water', 'sand'), pair('sand', 'grass'), pair('water', 'grass')];
  assert.throws(() => dualGrid(lv, TERRAINS, opaque), (e) => {
    assert.ok(e instanceof DualGridError);
    assert.equal(e.rule, 'three-terrain');
    assert.deepEqual(e.cell, { i: 1, j: 1 });
    assert.match(e.message, /three: dual tile \(1, 1\), cells \(0\.\.1, 0\.\.1\): three terrains \(water, sand, grass\)/);
    return true;
  });
  // the same map without the water|grass meeting is fine
  assert.doesNotThrow(() => dualGrid(level('ok', ['ws', 'ss'], { w: 'water', s: 'sand' }), TERRAINS, [pair('water', 'sand')]));
});

test('three terrains are allowed when every pair involved is `over`', () => {
  const lv = level('stack', ['ws', 'gs'], { w: 'water', s: 'sand', g: 'grass' });
  const over = [pair('water', 'sand', { mode: 'over', upperLook: 'sand' }), pair('sand', 'grass', { mode: 'over', lowerLook: 'sand' }), pair('water', 'grass', { mode: 'over' })];
  const dg = dualGrid(lv, TERRAINS, over);
  const grass = dg.layers.find((l) => l.pair === 1).tiles;
  assert.equal(grass[1 * dg.w1 + 1], SW, 'grass on the south-west corner of the middle tile');
  const sand = dg.layers.find((l) => l.pair === 0).tiles;
  assert.equal(sand[1 * dg.w1 + 1], NE | SW | SE, 'sand-or-higher on three corners (z >= sand)');
});

test('a pair the set lacks is refused with the cell named', () => {
  const lv = level('nopair', ['wg'], { w: 'water', g: 'grass' });
  assert.throws(() => dualGrid(lv, TERRAINS, [pair('sand', 'grass')]), (e) => e.rule === 'no-pair' && /dual tile \(1, 0\)/.test(e.message) && /water and grass/.test(e.message));
});

test('a terrain value that terrain.json lacks is refused', () => {
  assert.throws(() => dualGrid({ id: 'x', w: 1, h: 1, terrain: Uint8Array.from([9]) }, TERRAINS, [pair('sand', 'grass')]), (e) => e.rule === 'terrain-value');
});

test('a water region touched by shores whose water differs is refused (two looks)', () => {
  // water in the middle, sand shore on the left and mud shore on the right; the set's two waters differ
  const lv = level('looks', ['sssww' + 'wmmm', 'sssww' + 'wmmm'], { s: 'sand', w: 'water', m: 'mud' });
  const pairs = [pair('water', 'sand', { lowerLook: 'blue' }), pair('water', 'mud', { lowerLook: 'purple' })];
  assert.throws(() => dualGrid(lv, TERRAINS, pairs), (e) => e.rule === 'two-looks' && /water is drawn two ways/.test(e.message));
  pairs[1].lowerLook = 'blue';
  assert.doesNotThrow(() => dualGrid(lv, TERRAINS, pairs));
});

test('a water region takes the pair that touches it: purple next to mud, blue next to sand', () => {
  const rows = ['mmmwwwww', 'mmmwwwww', 'mmmwwwww', 'mmmwwwww'];
  const lv = level('swamp', rows, { m: 'mud', w: 'water' });
  const pairs = [pair('water', 'sand', { lowerLook: 'blue' }), pair('water', 'mud', { lowerLook: 'purple' })];
  const dg = dualGrid(lv, TERRAINS, pairs);
  assert.deepEqual(dg.layers.map((l) => l.pair), [1], 'only the mud pair is drawn');
});
