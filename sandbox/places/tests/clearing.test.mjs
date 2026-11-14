// The heart clearings: under each of the four places' hearts a 3 x 3 of earth (radius about 1.5 tiles), the ring of one cell round it wholly grass or wholly sand (earth, sand and grass never
// meet at a corner), no prop (but the landmark) and no decal within 2 of the heart; and the set draws earth as the lowest ground under grass and sand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EARTH = 7, SAND = 3, GRASS = 6;
const level = (n) => {
  const d = JSON.parse(readFileSync(path.join(repo, 'art/places/ldtk/places', n + '.ldtkl'), 'utf8')), lay = Object.fromEntries(d.layerInstances.map((l) => [l.__identifier, l]));
  return { w: lay.Terrain.__cWid, csv: lay.Terrain.intGridCsv, marks: lay.Marks.entityInstances, props: lay.Props.entityInstances, decals: lay.Decals.entityInstances };
};

// Reedpool (walk content B9): the island heart takes its earth clearing too, on the island's sand, with the pond round the island.
test('Reedpool: the island is wide enough for the clearing, and the pond stays round it', () => {
  const L = level('Reedpool'), [hx, hy] = L.marks.find((e) => e.__identifier === 'Heart').__grid;
  let water = 0;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const v = L.csv[(hy + dy) * L.w + hx + dx]; if (v === 1 || v === 2) water++; }
  assert.ok(water >= 12, `water cells within 4 of the heart: ${water}`);
});

for (const [name, ground] of [['Windstep', GRASS], ['HollowTree', GRASS], ['SplitStone', SAND], ['Reedpool', SAND]]) {
  test(`${name}: the heart stands on a 3 x 3 of earth, ringed wholly by ${ground === GRASS ? 'grass' : 'sand'}, with no prop or decal within 2`, () => {
    const L = level(name), heart = L.marks.find((e) => e.__identifier === 'Heart'), lm = L.marks.find((e) => e.__identifier === 'Landmark'), [hx, hy] = heart.__grid;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const v = L.csv[(hy + dy) * L.w + hx + dx], ring = Math.max(Math.abs(dx), Math.abs(dy)) === 2;
      assert.equal(v, ring ? ground : EARTH, `${name} (${hx + dx}, ${hy + dy})`);
    }
    for (const e of [...L.props, ...L.decals]) {
      const [x, y] = e.__grid; if (Math.max(Math.abs(x - hx), Math.abs(y - hy)) > 2) continue;
      assert.ok(e.__identifier === 'Prop' && lm && x === lm.__grid[0] && y === lm.__grid[1], `${name}: a ${e.__identifier} at (${x}, ${y}) stands within 2 of the heart`);
    }
  });
}

test('the set draws earth as the lowest ground under grass and sand: a fill of its own, and grass and sand have an edge over it', () => {
  const dir = path.join(repo, 'art/places/sets/ninja-test');
  const set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8')), terr = JSON.parse(readFileSync(path.join(repo, 'art/places/terrain.json'), 'utf8')).terrains, z = (id) => terr.find((t) => t.id === id).z;
  assert.ok(set.layers.earth.fill, 'earth has its own fill');
  for (const id of ['grass', 'sand']) assert.ok(set.layers[id].over.some((k) => k.lowers.includes('earth')), id + ' has an edge over earth');
  assert.ok(z('earth') < z('sand') && z('earth') < z('grass'));
});
