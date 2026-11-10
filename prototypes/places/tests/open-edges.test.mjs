// B5: Windstep in the open style (24 x 28, no edge ring) and the bake rules of the open edges (the art desk's manifest, mibi-art abb33a65b): cliff-foot, the two-thirds-open rule, seam-ground,
// path-short, heart-far, heart-clear, the way up. Each rule fails on its own edit of the real level; the committed Windstep passes them all; its cliff blocks at the lip and face and walks on top and
// at the way up; its reed bank and low scrub block nothing they should not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, loadSets } from '../src/bake/bake.mjs';
import { loadProject, levelToIR } from '../src/bake/ldtk.mjs';
import { checkRules } from '../src/bake/rules.mjs';
import { buildPlace } from '../src/bake/build.mjs';
import { cliffInfo, gullies, ALT_CODE } from '../src/bake/openedges.mjs';
import { readPlace, readTileSet } from '../src/format/read.mjs';
import { layerRows } from '../src/setload.mjs';
import { adaptPlace } from '../src/adapter.mjs';
import { T_BLOCK, T } from '../../exploration/src/world.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), placesDir = path.join(here, '..'), P = paths(placesDir);
const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains, V = Object.fromEntries(terrains.map((t) => [t.id, t.value]));
const { sets, layersOf, loadedOf } = loadSets(P, terrains), ctx = { terrains, sets, layersOf };
const { levels } = loadProject(P.project, P.schema), base = levels.find((l) => l.identifier === 'Windstep');
const W = 24, H = 28;
const edit = (fn) => { const l = structuredClone(base); fn(l); return l; };
const layer = (l, name) => l.layerInstances.find((x) => x.__identifier === name);
const ents = (l, id) => l.layerInstances.flatMap((x) => x.entityInstances).filter((e) => e.__identifier === id);
const setCell = (l, x, y, id) => { layer(l, 'Terrain').intGridCsv[y * W + x] = V[id]; };
const rules = (l) => { const { ir, errors } = levelToIR(l, terrains); return errors ? errors.map((e) => e.rule) : checkRules(ir, ctx).map((e) => e.rule); };
const irOf = (l = base) => levelToIR(l, terrains).ir;

test('Windstep is 24 x 28 in the open style and passes every rule; its mirror does too', () => {
  const ir = irOf(); assert.deepEqual([ir.w, ir.h], [W, H]);
  assert.deepEqual(checkRules(ir, ctx).map((e) => e.message), []);
  assert.equal(ir.finds.length, 8, 'seven to eight find slots'); assert.equal(ir.spawns.length, 3, 'three spawn areas');
  assert.equal(ir.wayups.length, 1); assert.equal(ir.reedbanks.length, 1);
  assert.ok(ir.finds.filter((f) => f.chance === 1).length >= 3, 'a pod, an Essence source and a stone are certain');
  const place = readPlace(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'Windstep.mbplace'))));
  assert.deepEqual([place.w, place.h], [W, H]);
  const mirror = readPlace(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'Windstep~x.mbplace'))));
  assert.deepEqual([mirror.w, mirror.h], [W, H]);
});

test('no edge ring: no prop, crown, decal or footprint on the last 2 rows and columns, all grass, so any two open sides meet as one meadow', () => {
  const ir = irOf(), near = (x, y) => Math.min(x, y, W - 1 - x, H - 1 - y) < 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (near(x, y)) assert.equal(ir.terrain[y * W + x], V.grass, `(${x}, ${y}) is grass`);
  for (const d of [...ir.props, ...ir.decals]) assert.ok(!near(d.cx, d.cy), `${d.kind} at (${d.cx}, ${d.cy}) stands off the seam`);
  assert.deepEqual(ir.openings.map((o) => o.side).sort(), ['E', 'N', 'S', 'W']);
});

const fails = {
  'cliff-foot': (l) => { setCell(l, 8, 9, 'cliff'); setCell(l, 8, 11, 'cliff'); },   // a column of cliff, one low row, cliff
  'seam-ground': (l) => setCell(l, 10, 1, 'sand'),
  'path-short': (l) => setCell(l, 10, 1, 'path'),
  'two-thirds-open': (l) => { for (let x = 0; x < 17; x++) { setCell(l, x, 0, 'thicket'); setCell(l, x, 1, 'thicket'); } },
  'heart-far': (l) => { const h = ents(l, 'Heart')[0]; h.px = [18 * 16, 6 * 16]; h.__grid = [18, 6]; },
  'wayup': (l) => { const a = ents(l, 'WayUp')[0]; a.px = [9 * 16, 7 * 16]; a.__grid = [9, 7]; a.width = 2 * 16; },
};
for (const [rule, fn] of Object.entries(fails)) test(`the bake refuses a level that breaks ${rule}, and says so`, () => assert.ok(rules(edit(fn)).includes(rule), rule + ' in ' + rules(edit(fn)).join(', ')));

test('heart-clear: a prop within 2 cells of the heart (not its landmark) is refused', () => {
  const l = edit((x) => { const p = ents(x, 'Prop')[0]; p.px = [13 * 16, 13 * 16]; p.__grid = [13, 13]; });
  assert.ok(rules(l).includes('heart-clear'), rules(l).join());
});

test('the cliff: lip and face cells block, the top and the way up walk, found by the bake and by the adapter', () => {
  const ir = irOf(), info = cliffInfo(ir, terrains), at = (x, y) => y * W + x;
  assert.deepEqual(gullies(ir, terrains), []);
  for (const [x, y] of [[3, 3], [10, 5], [4, 7], [9, 7], [5, 7], [8, 7]]) assert.ok(info.lipCells.has(at(x, y)), `(${x}, ${y}) is lip or face`);
  for (const [x, y] of [[5, 5], [7, 4], [6, 7], [7, 7]]) assert.ok(!info.lipCells.has(at(x, y)), `(${x}, ${y}) walks`);
  const place = readPlace(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'Windstep.mbplace')))), ts = readTileSet(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'ninja-test.mbtiles'))));
  const lay = adaptPlace(place, ts, terrains, { key: 'x', cell: 0 }), ox = (28 - W) >> 1, oy = (32 - H) >> 1, tile = (x, y) => lay.tiles[(y + oy) * 28 + x + ox];
  for (const [x, y] of [[3, 3], [10, 5], [4, 7], [5, 7], [8, 7]]) assert.ok(T_BLOCK[tile(x, y)], `the adapter blocks the lip at (${x}, ${y})`);
  for (const [x, y] of [[5, 5], [7, 4], [6, 7], [7, 7], [6, 8]]) assert.ok(!T_BLOCK[tile(x, y)], `the adapter lets (${x}, ${y}) be walked`);
});

test('the reed bank blocks nothing: the shore cells in the ReedBank area are as walkable as the grass beside them; low scrub walks; thicket, water and deep water block', () => {
  const place = readPlace(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'Windstep.mbplace')))), ts = readTileSet(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'ninja-test.mbtiles'))));
  const lay = adaptPlace(place, ts, terrains, { key: 'x', cell: 0 }), ox = 2, oy = 2, tile = (x, y) => lay.tiles[(y + oy) * 28 + x + ox];
  assert.ok(!T_BLOCK[tile(16, 12)], 'the grass cell at the reed bank');
  for (const [x, y] of [[17, 12], [19, 13], [3, 18]]) assert.ok(T_BLOCK[tile(x, y)], `(${x}, ${y}) blocks`);
  for (const [x, y] of [[3, 12], [4, 12], [6, 13]]) assert.ok(!T_BLOCK[tile(x, y)], `(${x}, ${y}) low scrub walks`);
});

test('the bake picks the cliff\'s tall tiles, the way up and the reed look: baked ground tiles come from the extra rows', () => {
  const ir = irOf(), r = buildPlace(ir, ctx); assert.ok(r.place, 'builds');
  const ts = sets.get('ninja-test'), rows = layerRows(loadedOf.get('ninja-test').set);
  const ids = new Set(r.place.ground.flatMap((g) => [...g.tiles]));
  const from = (type) => new Set(ts.pairs.filter((p, k) => rows[k].type === type).flatMap((p) => p.tiles));
  for (const type of ['tall', 'wayup', 'variant']) assert.ok([...ids].some((id) => from(type).has(id)), `some baked tiles are from the ${type} rows (${ts.pairs.length} rows in the set)`);
  assert.ok(ALT_CODE > 255);
});
