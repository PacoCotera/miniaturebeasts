// Walk content B8 + B9: the closed looks of the openings (the adapter reads one for every opening, draws it and blocks its tiles when the land refuses the side, and never arrives there), and
// the groves rule (the standing things of a place stand in clumps with glades between, never an even lattice). Both are held on the four committed places and their mirrors, and each rule is
// shown to fire on an edit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, loadSets } from '../src/bake/bake.mjs';
import { loadProject, levelToIR } from '../src/bake/ldtk.mjs';
import { checkRules, groveStats, GROVE } from '../src/bake/rules.mjs';
import { readPlace, readTileSet } from '../src/format/read.mjs';
import { adaptPlace, closedLooks, CLOSED_DEPTH } from '../src/adapter.mjs';
import { T_BLOCK } from '../../exploration/src/world.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), placesDir = path.join(here, '..'), P = paths(placesDir);
const terrains = JSON.parse(readFileSync(P.terrain, 'utf8')).terrains, V = Object.fromEntries(terrains.map((t) => [t.id, t.value]));
const { sets, pairsOf } = loadSets(P, terrains), ctx = { terrains, sets, pairsOf };
const { levels } = loadProject(P.project, P.schema);
const ts = readTileSet(new Uint8Array(readFileSync(path.join(placesDir, 'baked', 'ninja-test.mbtiles'))));
const IDS = ['Windstep', 'HollowTree', 'SplitStone', 'Reedpool'];
const irOf = (id) => levelToIR(levels.find((l) => l.identifier === id), terrains).ir;
const bakedOf = (id) => readPlace(new Uint8Array(readFileSync(path.join(placesDir, 'baked', id + '.mbplace'))));

test('every opening of every place carries a closed look: the set\'s thicket over its span, two rows deep, with a donor cell of thicket all round it', () => {
  for (const id of [...IDS, ...IDS.map((i) => i + '~x')]) {
    const place = bakedOf(id), looks = closedLooks(place, terrains);
    assert.equal(looks.length, place.openings.length, id);
    for (const lk of looks) {
      assert.equal(lk.look, 'thicket', `${id} ${lk.side}`); assert.ok(lk.donor, `${id}: a thicket donor`);
      const len = lk.side === 'N' || lk.side === 'S' ? place.w : place.h;
      assert.equal(lk.cells.length, CLOSED_DEPTH * (Math.min(len - 1, lk.to + 1) - Math.max(0, lk.from - 1) + 1), `${id} ${lk.side} covers its span and one cell either side`);
      for (const c of lk.cells) assert.equal(place.terrain[c.y * place.w + c.x], V.grass, `${id}: the closed look stands on the seam's grass at (${c.x}, ${c.y})`);
    }
    const lay = adaptPlace(place, ts, terrains, { key: 'k', cell: 0, pw: place.w, ph: place.h });
    assert.equal(lay.closedLooks.length, place.openings.length);
  }
});

test('a refused side shows its closed look: the thicket stamped and blocked over the opening, no opening to arrive at, the other sides as they were', () => {
  const place = bakedOf('Windstep'), o = { key: 'k', cell: 0, pw: place.w, ph: place.h };
  const open = adaptPlace(place, ts, terrains, o), shut = adaptPlace(place, ts, terrains, { ...o, closed: new Set(['S']) });
  assert.ok(open.openings.some((x) => x.side === 'S') && !shut.openings.some((x) => x.side === 'S'), 'no opening on the closed side');
  assert.equal(shut.closure.patches.length, closedLooks(place, terrains).find((l) => l.side === 'S').cells.length);
  const lk = closedLooks(place, terrains).find((l) => l.side === 'S');
  for (const c of lk.cells) {
    assert.ok(T_BLOCK[shut.tiles[c.y * shut.w + c.x]], `(${c.x}, ${c.y}) blocks`);
    assert.ok(shut.closure.patches.some((p) => p.x === c.x && p.y === c.y && p.from.x === lk.donor.x && p.from.y === lk.donor.y), `(${c.x}, ${c.y}) shows the thicket`);
  }
  for (const c of lk.cells) assert.ok(!T_BLOCK[open.tiles[c.y * open.w + c.x]], `(${c.x}, ${c.y}) walks when the side is open`);
  // never an arrival at a closed opening: the first opening the page uses is not the closed one, and with every side closed the explorer is put in the middle
  const first = shut.openings[0], arrival = (l) => `${l.spawnPt.x},${l.spawnPt.y}`;
  assert.notEqual(first.side, 'S');
  const north = adaptPlace(place, ts, terrains, { ...o, closed: new Set(['N']) });
  assert.notEqual(arrival(north), arrival(open), 'a closed first opening is not the arrival');
  assert.ok(!T_BLOCK[north.tiles[north.spawnPt.y * north.w + north.spawnPt.x]], 'the arrival walks');
  const all = adaptPlace(place, ts, terrains, { ...o, closed: new Set(['N', 'S', 'W', 'E']) });
  assert.equal(all.openings.length, 0);
});

test('groves, not an orchard: every place that stands trees and stones in numbers keeps them in touching clumps with lone ones between, and the rule fires on a lattice', () => {
  for (const id of IDS) {
    const ir = irOf(id), g = groveStats(ir);
    assert.deepEqual(checkRules(ir, ctx).map((e) => e.message), [], id);
    if (g.trees >= GROVE.minTrees) { assert.ok(g.touching >= g.trees * GROVE.minTouching, `${id} touching ${g.touching}/${g.trees}`); assert.ok(g.cv >= GROVE.minCv, `${id} cv ${g.cv}`); assert.ok(g.lone >= GROVE.minLone, `${id} lone ${g.lone}`); }
  }
  assert.ok(groveStats(irOf('HollowTree')).trees >= GROVE.minTrees && groveStats(irOf('SplitStone')).trees >= GROVE.minTrees && groveStats(irOf('Reedpool')).trees >= GROVE.minTrees, 'the three woody and stony places are held to the rule');
  // the Hollow Tree's old layout, the lead's "orchard": trees on an even lattice 3 and 4 cells apart
  const ir = irOf('HollowTree'); ir.props = ir.props.filter((p) => !/^(tree|boulder)-/.test(p.kind));
  for (let y = 4; y <= 24; y += 4) for (let x = 3; x <= 19; x += 4) ir.props.push({ kind: 'tree-broad', x: x * 48 + 24, y: y * 48 + 47, sortY: y * 48 + 47, cx: x, cy: y });
  const lattice = checkRules(ir, ctx).filter((e) => e.rule === 'grove-lattice');
  assert.ok(lattice.length >= 2, 'a lattice fails the rule: ' + lattice.map((e) => e.message).join(' | '));
  // rows and rings fail too
  const ring = irOf('SplitStone'); ring.props = ring.props.filter((p) => !/^(tree|boulder)-/.test(p.kind));
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, x = Math.round(11 + 8 * Math.cos(a)), y = Math.round(13 + 8 * Math.sin(a)); ring.props.push({ kind: 'boulder-grey', x: x * 48 + 24, y: y * 48 + 47, sortY: y * 48 + 47, cx: x, cy: y }); }
  assert.ok(checkRules(ring, ctx).some((e) => e.rule === 'grove-lattice'), 'a ring of stones fails the rule');
});

test('closed-look: a level with no 3 x 3 block of thicket to stamp from is refused', () => {
  const ir = irOf('SplitStone'); for (let i = 0; i < ir.terrain.length; i++) if (ir.terrain[i] === V.thicket) ir.terrain[i] = V.grass;
  assert.ok(checkRules(ir, ctx).some((e) => e.rule === 'closed-look'));
});
