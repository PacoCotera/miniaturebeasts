// The dual grid by terrain, one layer per terrain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { corners, cell, EMPTY, FULL_BASE, NW, NE, SW, SE, terrainLayers, packDepth, splitCode, FILL_CODE, KIND_STRIDE } from '../src/dualgrid.mjs';

test('corner bits: the diagonal tiles are NE+SW = 6 and NW+SE = 9', () => {
  assert.equal(NW * 1 + NE * 1 + SW * 1 + SE * 1, 15);
  assert.equal(NE | SW, 6);
  assert.equal(NW | SE, 9);
});

test('clamp: cells outside the place read as the nearest edge cell, so the border draws whole', () => {
  const cells = Uint8Array.from([1, 0, 0, 1, 1, 0]); // 2 wide, 3 high
  assert.equal(cell(cells, 2, 3, -5, 0), 1);
  assert.equal(cell(cells, 2, 3, 9, 0), 0);
  assert.equal(cell(cells, 2, 3, 0, 9), 1);
  // the dual tile at the far corner (w, h) sees only the corner cell
  assert.deepEqual(corners(cells, 2, 3, 2, 3), [0, 0, 0, 0].map(() => cells[5]));
  assert.deepEqual(corners(cells, 2, 3, 0, 0), [1, 1, 1, 1]);
});

// ---- terrain layers (one fill per terrain, one transparent 16-slot layer per upper terrain) ----
const T10 = ['deep', 'water', 'earth', 'sand', 'mud', 'path', 'grass', 'scrub', 'thicket', 'cliff'].map((id, z) => ({ id, value: z + 1, z }));
const TV = Object.fromEntries(T10.map((t) => [t.id, t.value]));
const set = (ids) => new Set(ids.map((i) => TV[i]));
// the kinds of the terrain set; scrub is drawn as grass until its layer is signed
const LAYERS = {
  deep: { fillCount: 1, kinds: [] },
  water: { fillCount: 1, kinds: [{ kind: 'step', lowers: set(['deep']), fullCount: 0 }] },
  earth: { fillCount: 5, kinds: [{ kind: 'flat', lowers: set(['deep', 'water']), fullCount: 0 }] },
  sand: { fillCount: 1, kinds: [{ kind: 'beach', lowers: set(['deep', 'water']), fullCount: 0 }, { kind: 'flat', lowers: set(['earth']), fullCount: 0 }] },
  mud: { fillCount: 5, kinds: [{ kind: 'flat', lowers: set(['deep', 'water', 'earth', 'sand']), fullCount: 0 }] },
  path: { fillCount: 1, kinds: [{ kind: 'bank', lowers: set(['deep', 'water']), fullCount: 0 }] },
  grass: { fillCount: 5, kinds: [{ kind: 'bank', lowers: set(['deep', 'water']), fullCount: 0 }, { kind: 'flat', lowers: set(['earth', 'sand', 'mud', 'path']), fullCount: 0 }] },
  scrub: { drawAs: TV.grass },
  thicket: { fillCount: 4, kinds: [{ kind: 'rim', lowers: set(['earth', 'sand', 'mud', 'path', 'grass', 'scrub']), fullCount: 0 }] },
  cliff: { fillCount: 1, kinds: [{ kind: 'bank', lowers: set(['earth', 'sand', 'path', 'grass']), fullCount: 0 }] },
};
const toMap = (o) => new Map(Object.entries(o).map(([id, d]) => [TV[id], d]));
const lv = (id, rows, map) => ({ id, w: rows[0].length, h: rows.length, terrain: Uint8Array.from(rows.join('').split('').map((c) => TV[map[c]])) });
const layerOfT = (r, id) => r.layers.find((l) => l.terrain === TV[id]);
const at = (r, id, i, j) => layerOfT(r, id)?.tiles[j * r.w1 + i];

test('terrain layers corner A: grass / sand / water draws water fill, sand slot 13 (beach), grass slot 8 (bank), depth 3', () => {
  const r = terrainLayers(lv('A', ['gs', 'ws'], { g: 'grass', s: 'sand', w: 'water' }), T10, toMap(LAYERS));
  assert.deepEqual(r.layers.map((l) => l.terrain), [TV.water, TV.sand, TV.grass], 'in z order');
  assert.equal(splitCode(at(r, 'water', 1, 1)).fill, 0);
  assert.deepEqual(splitCode(at(r, 'sand', 1, 1)), { kind: 0, slot: NW | NE | SE }, 'mask 8+4+1 = 13, kind beach');
  assert.deepEqual(splitCode(at(r, 'grass', 1, 1)), { kind: 0, slot: NW }, 'bank is listed first and wins over the flat sand edge');
  assert.equal(packDepth(r.layers, r.w1, r.h1).length, 3);
  assert.equal(packDepth(r.layers, r.w1, r.h1).map((l) => l[1 * r.w1 + 1]).filter((c) => c !== EMPTY).length, 3);
});

test('terrain layers corner B: cliff / grass / path draws path fill, grass 14 (flat), cliff 12 (bank); the tile above is the cliff fill', () => {
  const r = terrainLayers(lv('B', ['cc', 'cc', 'gp'], { c: 'cliff', g: 'grass', p: 'path' }), T10, toMap(LAYERS));
  assert.equal(splitCode(at(r, 'path', 1, 2)).fill, 0);
  assert.deepEqual(splitCode(at(r, 'grass', 1, 2)), { kind: 1, slot: 14 }, 'kind flat (its lower is path)');
  assert.deepEqual(splitCode(at(r, 'cliff', 1, 2)), { kind: 0, slot: 12 });
  const d = packDepth(r.layers, r.w1, r.h1);
  assert.equal(d.filter((l) => l[2 * r.w1 + 1] !== EMPTY).length, 3);
  // above it: four cliff corners, the grass the raised tile stands on (a level with no `top` has grass) under the cliff fill, which the bake blanks (the tall face is openedges' job)
  assert.ok(splitCode(at(r, 'grass', 1, 1)).fill < 5, 'a grass fill variant');
  assert.equal(splitCode(at(r, 'cliff', 1, 1)).fill, 0);
  assert.equal(r.layers.filter((l) => l.tiles[1 * r.w1 + 1] !== EMPTY).length, 2);
});

test('terrain layers: a raised tile stands on its top ground: a litter top is drawn under the cliff, over the grass it meets, and a corner without a top reads as grass', () => {
  const TOPS = { ...LAYERS, litter: { fillCount: 1, kinds: [{ kind: 'flat', lowers: set(['grass']), fullCount: 0 }] } };
  const T11 = [...T10, { id: 'litter', value: 11, z: 9.5 }];
  const lay = new Map([...toMap(TOPS), [11, TOPS.litter]]);
  const rows = ['cccc', 'cccc', 'cccc', 'gggg'], terrain = Uint8Array.from(rows.join('').split('').map((c) => (c === 'c' ? TV.cliff : TV.grass)));
  const top = new Uint8Array(16); for (const k of [5, 6, 9, 10]) top[k] = 11;   // litter on the inner 2 x 2
  const r = terrainLayers({ id: 'T', w: 4, h: 4, terrain, top }, T11, lay), litter = r.layers.find((l) => l.terrain === 11);
  assert.equal(litter.tiles[2 * r.w1 + 2], FILL_CODE, 'the dual tile between the four litter tops is litter fill');
  assert.ok(splitCode(litter.tiles[1 * r.w1 + 1]).slot > 0 && splitCode(litter.tiles[1 * r.w1 + 1]).slot < 15, 'litter edge over the grass top at the 2 x 2 block\'s corner');
  assert.equal(r.layers.find((l) => l.terrain === TV.cliff).tiles[2 * r.w1 + 2], FILL_CODE, 'the cliff layer still has its fill code there: openedges blanks it');
  const plain = terrainLayers({ id: 'T', w: 4, h: 4, terrain }, T11, lay);
  assert.equal(plain.layers.find((l) => l.terrain === 11), undefined, 'no top: no litter');
  assert.equal(packDepth(r.layers, r.w1, r.h1).length <= 4, true);
});

test('terrain layers: bank wins over flat when one tile holds lowers of both kinds', () => {
  const r = terrainLayers(lv('bw', ['gw', 'gp'], { g: 'grass', w: 'water', p: 'path' }), T10, toMap(LAYERS));
  assert.equal(splitCode(at(r, 'grass', 1, 1)).kind, 0, 'bank (water) before flat (path)');
  const flat = terrainLayers(lv('fl', ['gp', 'gp'], { g: 'grass', p: 'path' }), T10, toMap(LAYERS));
  assert.equal(splitCode(at(flat, 'grass', 1, 1)).kind, 1);
});

test('terrain layers: scrub is drawn as grass (drawAs), and with a ground the grass shows beneath it', () => {
  const r = terrainLayers(lv('ds', ['ss', 'ss'], { s: 'scrub' }), T10, toMap(LAYERS));
  assert.deepEqual(r.layers.map((l) => l.terrain), [TV.grass], 'scrub resolves to grass');
  const withGround = { ...LAYERS, scrub: { fillCount: 0, ground: TV.grass, kinds: [{ kind: 'flat', lowers: set(['sand', 'grass']), fullCount: 3 }] } };
  const q = terrainLayers(lv('sg', ['ss', 'sc'], { s: 'sand', c: 'scrub' }), T10, toMap(withGround));
  assert.deepEqual(q.layers.map((l) => l.terrain), [TV.sand, TV.grass, TV.scrub], 'sand fill, grass (scrub\'s ground), scrub');
  assert.deepEqual(splitCode(at(q, 'grass', 1, 1)), { kind: 1, slot: SE });
  assert.deepEqual(splitCode(at(q, 'scrub', 1, 1)), { kind: 0, slot: SE });
  const all = terrainLayers(lv('sa', ['cc', 'cc'], { c: 'scrub' }), T10, toMap(withGround));
  assert.deepEqual(all.layers.map((l) => l.terrain), [TV.grass, TV.scrub], 'a wholly scrub tile: grass fill, scrub full variant');
  const full = splitCode(at(all, 'scrub', 1, 1));
  assert.ok(full.full >= 0 && full.full < 3);
});

test('terrain layers: a lower terrain no kind lists is refused with the dual tile named', () => {
  assert.throws(() => terrainLayers(lv('ne', ['cm', 'cm'], { c: 'cliff', m: 'mud' }), T10, toMap(LAYERS)), (e) => e.rule === 'no-edge' && /dual tile \(1, 0\)/.test(e.message) && /cliff has no edge over mud/.test(e.message));
  assert.throws(() => terrainLayers(lv('nl', ['g'], { g: 'grass' }), T10, toMap({ deep: LAYERS.deep })), (e) => e.rule === 'no-layer');
  assert.throws(() => terrainLayers({ id: 'x', w: 1, h: 1, terrain: Uint8Array.from([99]) }, T10, toMap(LAYERS)), (e) => e.rule === 'terrain-value');
});

test('terrain layers: depth is at most 4 over every 2 x 2 of at most three terrains drawn from the ten', () => {
  const open = {};   // every terrain lists every lower, so only depth is tested here
  for (const t of T10) open[t.id] = LAYERS[t.id].drawAs ? LAYERS[t.id] : { fillCount: 1, kinds: [{ kind: 'k', lowers: new Set(T10.filter((o) => o.z < t.z).map((o) => o.value)), fullCount: 0 }] };
  open.scrub = { fillCount: 0, ground: TV.grass, kinds: [{ kind: 'k', lowers: new Set(T10.filter((o) => o.z < 7).map((o) => o.value)), fullCount: 2 }] };
  const lay = toMap(open);
  let worst = 0, seen = 0;
  for (let n = 0; n < 10000; n++) {
    const c = [n % 10, ((n / 10) | 0) % 10, ((n / 100) | 0) % 10, ((n / 1000) | 0) % 10].map((k) => T10[k].value);
    if (new Set(c).size > 3) continue;
    const r = terrainLayers({ id: 'd', w: 2, h: 2, terrain: Uint8Array.from(c) }, T10, lay);
    const d = packDepth(r.layers, r.w1, r.h1).filter((l) => l[1 * r.w1 + 1] !== EMPTY).length;
    worst = Math.max(worst, d); seen++;
    assert.ok(d <= 4, `corners ${c} draw ${d} layers`);
  }
  assert.equal(seen, 4960);   // 10 + 45 * 14 + 120 * 36 tuples of at most three terrains
  assert.equal(worst, 4);
});

test('terrain layers: tone only on all-grass tiles, drawn last at the tone mask', () => {
  const rows = ['gggg', 'gggg', 'gggg', 'ggss'];
  const level = lv('tn', rows, { g: 'grass', s: 'sand' });
  level.tone = Uint8Array.from({ length: 16 }, (_, k) => (k === 5 ? 1 : 0));   // cell (1, 1)
  const r = terrainLayers(level, T10, toMap(LAYERS), { of: TV.grass });
  assert.equal(r.layers.at(-1).tone, true);
  const t = r.layers.at(-1).tiles;
  assert.equal(t[1 * r.w1 + 1], SE);
  assert.equal(t[2 * r.w1 + 2], NW);
  assert.equal(t.filter((c) => c !== EMPTY).length, 4);
  // a tone bit on cell (2, 3), which is sand
  assert.throws(() => terrainLayers({ ...level, tone: Uint8Array.from({ length: 16 }, (_, k) => (k === 14 ? 1 : 0)) }, T10, toMap(LAYERS), { of: TV.grass }), (e) => e.rule === 'tone-ground');
});

test('terrain layers: fill and full variants are chosen by hash, stable, and all of them get used', () => {
  const rows = Array.from({ length: 12 }, () => 'm'.repeat(12));
  const a = terrainLayers(lv('fv', rows, { m: 'mud' }), T10, toMap(LAYERS)), b = terrainLayers(lv('fv', rows, { m: 'mud' }), T10, toMap(LAYERS));
  assert.deepEqual(a.layers[0].tiles, b.layers[0].tiles);
  assert.deepEqual([...new Set(Array.from(a.layers[0].tiles).map((c) => c - FILL_CODE))].sort(), [0, 1, 2, 3, 4]);
  const o = terrainLayers({ ...lv('fv', rows, { m: 'mud' }), origin: { x: 40, y: 7 } }, T10, toMap(LAYERS));
  assert.notDeepEqual(o.layers[0].tiles, a.layers[0].tiles, 'a level with a world origin picks by world position');
  assert.equal(KIND_STRIDE > FULL_BASE + 8, true);
});

test('packDepth: the k-th drawn entry of each tile goes to layer k', () => {
  const l = (a) => ({ tiles: Uint16Array.from(a) });
  const p = packDepth([l([1, EMPTY, 3]), l([EMPTY, EMPTY, 4]), l([5, 6, 7])], 3, 1);
  assert.deepEqual(p.map((x) => [...x]), [[1, 6, 3], [5, EMPTY, 4], [EMPTY, EMPTY, 7]]);
});
