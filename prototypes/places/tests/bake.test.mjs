// C5: the LDtk project and the bake (place design A1.2, A1.4): every level rule fails on its own fixture level, the mirror, --check, the pins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, bakeAll, loadSets, writeOutputs, checkOutputs } from '../src/bake/bake.mjs';
import { loadProject, checkDefs, levelToIR, listSetIds } from '../src/bake/ldtk.mjs';
import { checkRules } from '../src/bake/rules.mjs';
import { mirrorIR } from '../src/bake/mirror.mjs';
import { buildPlace } from '../src/bake/build.mjs';
import { readPlace } from '../src/format/read.mjs';
import { dualGrid } from '../src/dualgrid.mjs';
import { layersToTileIds } from '../src/bake/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const placesDir = path.join(here, '..');
const P = paths(placesDir);
const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains;
const valueOf = Object.fromEntries(terrains.map((t) => [t.id, t.value]));
const { sets, pairsOf, loadedOf } = loadSets(P, terrains);
const ctx = { terrains, sets, pairsOf };
const { project, levels } = loadProject(P.project, P.schema);
const base = levels.find((l) => l.identifier === 'Test_AllCases');
const W = 18, H = 22;

// ---- helpers to edit a copy of the fixture level ----
const edit = (fn) => { const l = structuredClone(base); fn(l); return l; };
const layer = (l, name) => l.layerInstances.find((x) => x.__identifier === name);
const ents = (l, id) => l.layerInstances.flatMap((x) => x.entityInstances).filter((e) => e.__identifier === id);
const field = (e, name) => e.fieldInstances.find((f) => f.__identifier === name);
const setCell = (l, x, y, id) => { layer(l, 'Terrain').intGridCsv[y * W + x] = valueOf[id]; };
const moveTo = (e, cx, cy) => { e.px = [cx * 16, cy * 16]; e.__grid = [cx, cy]; };
const remove = (l, id, keep = 0) => { for (const x of l.layerInstances) x.entityInstances = x.entityInstances.filter((e) => e.__identifier !== id || (keep-- > 0)); };

// everything the bake would say about one level, in the order it would say it
function problems(level) {
  const { ir, errors } = levelToIR(level, terrains);
  if (errors) return errors;
  const r = checkRules(ir, ctx);
  if (r.length) return r;
  return buildPlace(ir, ctx).errors || [];
}

test('the committed project is valid, in step with terrain.json, the enums and the sets, and the fixture level has no problems', () => {
  assert.equal(project.jsonVersion, '1.5.3');
  assert.equal(project.externalLevels, true);
  assert.deepEqual(checkDefs(project, terrains, [...loadedOf.values()]), []);
  assert.deepEqual(problems(base), []);
  assert.deepEqual(listSetIds(P.sets), ['ninja-test']);
});

test('the IntGrid values of the Terrain layer equal terrain.json, and a changed value, name or colour is reported', () => {
  const bad = structuredClone(project);
  const terr = bad.defs.layers.find((l) => l.identifier === 'Terrain');
  terr.intGridValues[2].value = 9;
  assert.match(checkDefs(bad, terrains, [...loadedOf.values()]).join('\n'), /Terrain IntGrid values .* differ from art\/places\/terrain.json/);
  const bad2 = structuredClone(project);
  bad2.defs.layers.find((l) => l.identifier === 'Terrain').intGridValues[0].color = '#000000';
  assert.match(checkDefs(bad2, terrains, [...loadedOf.values()]).join('\n'), /differ from art\/places\/terrain.json/);
});

test('an enum that drifts from the format or the sets is reported', () => {
  const bad = structuredClone(project);
  bad.defs.enums.find((e) => e.identifier === 'HeartKind').values.pop();
  bad.defs.enums.find((e) => e.identifier === 'PropKind').values.pop();
  const out = checkDefs(bad, terrains, [...loadedOf.values()]).join('\n');
  assert.match(out, /enum HeartKind/);
  assert.match(out, /enum PropKind/);
});

// rule -> [how to break the fixture level, the cell the message must name (or null)]
const RULES = {
  'size': [(l) => { l.pxWid = 17 * 16; }, null],
  'terrain-id': [(l) => { layer(l, 'Terrain').intGridCsv[5] = 0; }, { x: 5, y: 0 }],
  'names': [(l) => { l.fieldInstances.find((f) => f.__identifier === 'names').__value = []; }, null],
  'tileset': [(l) => { l.fieldInstances.find((f) => f.__identifier === 'tileset').__value = 'nope'; }, null],
  'kind-missing': [(l) => { field(ents(l, 'Prop')[0], 'kind').__value = 'no-such-prop'; }, { x: 3, y: 3 }],
  'prop-footprint': [(l) => moveTo(ents(l, 'Prop').find((e) => field(e, 'kind').__value === 'boulder-brown'), 6, 9), { x: 6, y: 9 }],
  'heart-count': [(l) => remove(l, 'Heart'), null],
  'heart-kinds': [(l) => { field(ents(l, 'Heart')[0], 'kinds').__value = []; }, { x: 6, y: 13 }],
  'heart-reach': [(l) => { for (const [x, y] of [[6, 13], [5, 13], [7, 13], [6, 12], [6, 14]]) setCell(l, x, y, 'water'); }, { x: 6, y: 13 }],
  'clue-count': [(l) => remove(l, 'Clue'), null],
  'clue-end': [(l) => { field(ents(l, 'Clue')[0], 'path').__value = [{ cx: 9, cy: 18 }, { cx: 2, cy: 2 }]; }, { x: 2, y: 2 }],
  'clue-point': [(l) => { field(ents(l, 'Clue')[0], 'path').__value = [{ cx: 9, cy: 18 }, { cx: 6, cy: 9 }, { cx: 6, cy: 13 }]; }, { x: 6, y: 9 }],
  'find-count': [(l) => remove(l, 'Find', 1), null],
  'find-footprint': [(l) => moveTo(ents(l, 'Find')[0], 10, 15), { x: 10, y: 15 }],
  'find-reach': [(l) => moveTo(ents(l, 'Find')[0], 6, 9), { x: 6, y: 9 }],
  'landmark-count': [(l) => remove(l, 'Landmark'), null],
  'landmark-sprite': [(l) => { field(ents(l, 'Landmark')[0], 'prop').__value = 'no-such-prop'; }, { x: 2, y: 20 }],
  'opening-count': [(l) => remove(l, 'Opening', 1), null],
  'opening-edge': [(l) => moveTo(ents(l, 'Opening').find((e) => field(e, 'side').__value === 'N'), 13, 1), { x: 13, y: 1 }],
  'opening-arrival': [(l) => setCell(l, 13, 0, 'water'), { x: 13, y: 0 }],
  'spawn-count': [(l) => { for (let k = 0; k < 4; k++) l.layerInstances.find((x) => x.__identifier === 'Marks').entityInstances.push(structuredClone(ents(l, 'CreatureSpawn')[0])); }, null],
  'spawn-zone': [(l) => moveTo(ents(l, 'CreatureSpawn')[0], 5, 8), { x: 5, y: 8 }],
  'three-terrain': [(l) => { setCell(l, 9, 19, 'water'); setCell(l, 10, 19, 'sand'); }, null],
  'no-pair': [(l) => { setCell(l, 1, 19, 'mud'); }, null],
};

for (const [rule, [mutate, cell]] of Object.entries(RULES)) {
  test(`rule ${rule} fails on its own fixture level, naming the level, the rule${cell ? ' and the cell' : ''}`, () => {
    const level = edit(mutate);
    const out = problems(level);
    const hit = out.find((e) => e.rule === rule);
    assert.ok(hit, `expected rule ${rule}, got: ${out.map((e) => e.message).join(' | ') || 'nothing'}`);
    assert.ok(hit.message.startsWith('Test_AllCases: [' + rule + ']'), hit.message);
    if (cell) {
      assert.deepEqual(hit.cell, cell);
      assert.ok(hit.message.includes(`(${cell.x}, ${cell.y})`), hit.message);
    }
  });
}

test('a rule failure on a level is reported with every other failure of that level, together', () => {
  const level = edit((l) => { remove(l, 'Heart'); remove(l, 'Clue'); remove(l, 'Landmark'); });
  const rules = problems(level).map((e) => e.rule);
  assert.ok(['heart-count', 'clue-count', 'landmark-count'].every((r) => rules.includes(r)), rules.join());
});

test('the mirror maps E and W, mirrors terrain and entities on the logic grid, and re-looks-up the dual grid instead of flipping tiles', () => {
  const { ir } = levelToIR(base, terrains);
  const m = mirrorIR(ir);
  assert.equal(m.id, 'Test_AllCases~x');
  assert.equal(m.mirrorOf, 'Test_AllCases');
  // terrain
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) assert.equal(m.terrain[y * W + W - 1 - x], ir.terrain[y * W + x]);
  // openings: W (x 0) becomes E (x 17); N and S keep their side and mirror along x
  const w = ir.openings.find((o) => o.side === 'W'), e = m.openings.find((o) => o.side === 'E');
  assert.ok(w && e);
  assert.equal(e.x, W - 1);
  assert.deepEqual([e.from, e.to], [w.from, w.to]);
  assert.equal(m.openings.filter((o) => o.side === 'W').length, 0);
  const n = ir.openings.find((o) => o.side === 'N'), nm = m.openings.find((o) => o.side === 'N');
  assert.deepEqual([nm.from, nm.to], [W - 1 - n.to, W - 1 - n.from]);
  // heart, clues, finds, props
  assert.equal(m.hearts[0].x, W - 1 - ir.hearts[0].x);
  assert.deepEqual(m.clues[0].points.map((p) => p.x), ir.clues[0].points.map((p) => W - 1 - p.x));
  assert.deepEqual(m.clues[0].points.map((p) => p.y), ir.clues[0].points.map((p) => p.y));
  assert.ok(ir.props.every((p) => m.props.some((q) => q.kind === p.kind && q.x === W * 48 - p.x && q.y === p.y)));
  // mirroring twice is the identity
  const mm = mirrorIR(m);
  assert.deepEqual(Array.from(mm.terrain), Array.from(ir.terrain));
  assert.deepEqual(mm.props.map((p) => [p.kind, p.x, p.y]), ir.props.map((p) => [p.kind, p.x, p.y]));
  assert.deepEqual(mm.openings.map((o) => [o.side, o.from, o.to]).sort(), ir.openings.map((o) => [o.side, o.from, o.to]).sort());
  // the dual grid is looked up again on the mirrored terrain...
  const a = buildPlace(ir, ctx).place, b = buildPlace(m, ctx).place;
  const dg = dualGrid({ id: m.id, w: W, h: H, terrain: m.terrain }, terrains, pairsOf.get('ninja-test'));
  assert.deepEqual(b.ground.map((l) => Array.from(l.tiles)), layersToTileIds(dg, sets.get('ninja-test')).map((l) => Array.from(l.tiles)));
  // ...and is not the original's tile ids flipped: the shore art is lit from the top left, so a mirrored shore is a different tile
  const flipped = a.ground.map((l) => Array.from({ length: l.tiles.length }, (_, k) => l.tiles[((k / (W + 1)) | 0) * (W + 1) + (W - (k % (W + 1)))]));
  assert.notDeepEqual(b.ground.map((l) => Array.from(l.tiles)), flipped);
  // both variants pass every rule
  assert.deepEqual(checkRules(m, ctx), []);
});

test('the bake writes the fixture place, its mirror and the index, in under 5 s, and reading the blobs back gives the place', () => {
  const t0 = Date.now();
  const { files, errors, index } = bakeAll(P);
  assert.deepEqual(errors, []);
  assert.ok(Date.now() - t0 < 5000, `bake took ${Date.now() - t0} ms`);
  // the fixture plus the four authored places (C13), each with its mirror and two goldens apiece
  const ids = ['HollowTree', 'Reedpool', 'SplitStone', 'Test_AllCases', 'Windstep'];
  const want = ['baked/index.json', 'baked/ninja-test.mbtiles', 'baked/terrain.json'];
  for (const id of ids) for (const v of [id, `${id}~x`]) want.push(`baked/${v}.mbplace`, `golden/places/${v}-24.png`, `golden/places/${v}-48.png`);
  assert.deepEqual([...files.keys()].sort(), want.sort());
  const pl = readPlace(files.get('baked/Test_AllCases.mbplace').bytes);
  assert.equal(pl.w, 18); assert.equal(pl.h, 22); assert.equal(pl.set, 'ninja-test');
  assert.equal(pl.heart.kinds.join(), 'moment,nest');
  assert.equal(pl.openings.length, 3);
  assert.equal(readPlace(files.get('baked/Test_AllCases~x.mbplace').bytes).mirrorOf, 'Test_AllCases');
  assert.deepEqual(index.places.map((p) => p.id).sort(), ids.flatMap((id) => [id, `${id}~x`]).sort());
  // deterministic: two bakes, the same bytes
  const again = bakeAll(P).files;
  for (const [k, f] of files) if (f.bytes) assert.deepEqual(again.get(k).bytes, f.bytes, k);
});

test('what is committed under baked/ and golden/places is what the bake produces (--check)', () => {
  const { files, errors } = bakeAll(P);
  assert.deepEqual(errors, []);
  assert.deepEqual(checkOutputs(files, placesDir), []);
});

test('--check fails naming the file when one byte of a committed blob changes, a golden pixel changes, a file is missing or stale', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bake-check-'));
  try {
    const { files } = bakeAll(P);
    writeOutputs(files, dir);
    assert.deepEqual(checkOutputs(files, dir), []);
    const blob = path.join(dir, 'baked', 'Test_AllCases.mbplace');
    const bytes = readFileSync(blob);
    bytes[bytes.length >> 1] ^= 1;
    writeFileSync(blob, bytes);
    const out = checkOutputs(files, dir);
    assert.equal(out.length, 1);
    assert.match(out[0], /^baked\/Test_AllCases\.mbplace: differs from the bake/);
    bytes[bytes.length >> 1] ^= 1;
    writeFileSync(blob, bytes);
    // a changed golden pixel
    const { img } = files.get('golden/places/Test_AllCases-24.png');
    const bumped = { ...files.get('golden/places/Test_AllCases-24.png'), img: { ...img, data: Uint8Array.from(img.data) } };
    bumped.img.data[40 * 4] ^= 0x10;
    const changed = new Map(files); changed.set('golden/places/Test_AllCases-24.png', bumped);
    assert.match(checkOutputs(changed, dir).join('\n'), /golden\/places\/Test_AllCases-24\.png: first pixel difference at x=40, y=0/);
    // stale and missing
    writeFileSync(path.join(dir, 'baked', 'Old_Place.mbplace'), 'x');
    assert.match(checkOutputs(files, dir).join('\n'), /baked\/Old_Place\.mbplace: stale/);
    rmSync(path.join(dir, 'baked', 'Test_AllCases~x.mbplace'));
    assert.match(checkOutputs(files, dir).join('\n'), /baked\/Test_AllCases~x\.mbplace: missing/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a project in another LDtk version, or one that breaks the schema, is refused before anything is read', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bake-ldtk-'));
  try {
    cpSync(path.join(P.repo, 'art', 'places', 'ldtk'), dir, { recursive: true });
    const file = path.join(dir, 'places.ldtk');
    const proj = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...proj, jsonVersion: '1.5.4' }));
    assert.throws(() => loadProject(file, P.schema), /reads 1\.5\.3 only/);
    const broken = { ...proj }; delete broken.defs;
    writeFileSync(file, JSON.stringify(broken));
    assert.throws(() => loadProject(file, P.schema), /not a valid LDtk 1\.5\.3 project/);
    writeFileSync(file, JSON.stringify({ ...proj, externalLevels: false }));
    assert.throws(() => loadProject(file, P.schema), /externalLevels/);
    writeFileSync(file, JSON.stringify(proj));
    const lv = path.join(dir, 'places', 'Test_AllCases.ldtkl');
    const level = JSON.parse(readFileSync(lv, 'utf8'));
    level.pxWid = 'wide';
    writeFileSync(lv, JSON.stringify(level));
    assert.throws(() => loadProject(file, P.schema), /not a valid LDtk level/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a set with a licence the bake does not allow is refused', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bake-set-'));
  try {
    const sets = path.join(dir, 'sets');
    mkdirSync(sets);
    cpSync(path.join(P.sets, 'ninja-test'), path.join(sets, 'ninja-test'), { recursive: true });
    const sj = path.join(sets, 'ninja-test', 'set.json');
    const set = JSON.parse(readFileSync(sj, 'utf8'));
    set.licence.spdx = 'CC-BY-4.0';
    writeFileSync(sj, JSON.stringify(set));
    const { errors } = loadSets({ ...P, sets }, terrains);
    assert.match(errors.join('\n'), /licence\/spdx/);
    assert.ok(readdirSync(sets).length === 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
