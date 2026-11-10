// C7: the adapter (baked place -> the exploration page's layout), on the committed fixture place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adaptPlace, HEART_KINDS } from '../src/adapter.mjs';
import { T, T_BLOCK, PW, PH } from '../../exploration/src/world.mjs';
import { ts, place, placeX, places } from './render-helpers.mjs';

const terrains = JSON.parse(readFileSync(path.join(places, 'baked', 'terrain.json'), 'utf8')).terrains;
const lay = adaptPlace(place, ts, terrains, { key: '100', cell: 100 });
const at = (l, x, y) => l.tiles[(y + l.baked.oy) * PW + x + l.baked.ox];

test('the place sits centred in the page grid, with rock all round it', () => {
  assert.equal(lay.tiles.length, PW * PH);
  assert.deepEqual(lay.baked, { id: 'Test_AllCases', ox: 5, oy: 5, w: 18, h: 22 });
  assert.equal(lay.w, PW); assert.equal(lay.h, PH);   // the layout's size is the padded grid its tiles are indexed by; the place's own size is in lay.baked
  for (let x = 0; x < PW; x++) { assert.equal(lay.tiles[x], T.ROCK); assert.equal(lay.tiles[(PH - 1) * PW + x], T.ROCK); }
  assert.equal(lay.cave, false);
  assert.equal(lay.key, '100');
});

test('terrain becomes the page tile of terrain.json, prop footprints become trunks and rocks, tall grass becomes T.TALL', () => {
  const v = Object.fromEntries(terrains.map((t) => [t.id, t.value]));
  const want = Object.fromEntries(terrains.map((t) => [t.value, T[t.T]]));
  let water = 0, path_ = 0;
  for (let y = 0; y < place.h; y++) for (let x = 0; x < place.w; x++) {
    const t = at(lay, x, y), terr = place.terrain[y * place.w + x];
    if (terr === v.water) { water++; assert.equal(t, T.WATER); }
    if (terr === v.path) path_++;
    if (![T.TRUNK, T.ROCK, T.TALL].includes(t)) assert.equal(t, want[terr], `cell ${x},${y}`);
  }
  assert.ok(water > 20 && path_ > 20);
  const tree = place.props.find((p) => ts.sprites[p.kind].kind === 'tree-broad');
  assert.equal(at(lay, Math.floor(tree.x / 48), Math.floor(tree.y / 48)), T.TRUNK);
  const rock = place.props.find((p) => ts.sprites[p.kind].kind === 'boulder-brown');
  assert.equal(at(lay, Math.floor(rock.x / 48), Math.floor(rock.y / 48)), T.ROCK);
  const tall = place.props.find((p) => ts.sprites[p.kind].kind === 'tall-grass');
  assert.equal(at(lay, Math.floor(tall.x / 48), Math.floor(tall.y / 48)), T.TALL);
  assert.equal(T_BLOCK[T.TALL], 0);
});

test('the heart, its clue marks, the openings and the find slots come from the place, shifted into the page grid', () => {
  assert.ok(HEART_KINDS.includes(lay.heart.kind));
  assert.equal(lay.heart.kind, place.heart.kinds[0]);   // with no seeded fill, the place's first kind the page plays (a moment is played now)
  assert.deepEqual([lay.heart.x, lay.heart.y], [place.heart.x + 5, place.heart.y + 5]);
  assert.equal(lay.heart.reachBy, null);
  assert.deepEqual(lay.heart.clues.at(-1), { x: place.clues[0].points.at(-1).x + 5, y: place.clues[0].points.at(-1).y + 5 });
  assert.ok(lay.heart.path.length > 5, 'a walkable path leads to the heart');
  assert.equal(lay.openings.length, 3);
  assert.equal(lay.findSlots.length, place.finds.length);
  assert.deepEqual(lay.findSlots[0], { x: place.finds[0].x + 5, y: place.finds[0].y + 5, kinds: place.finds[0].kinds, chance: place.finds[0].chance });
});

test('the press mask (lay.press) marks a boulder and a tree trunk, never a bush', () => {
  const tileOf = (p) => (Math.floor(p.y / 48) + lay.baked.oy) * PW + Math.floor(p.x / 48) + lay.baked.ox;
  const rock = place.props.find((p) => ts.sprites[p.kind].kind === 'boulder-brown'), tree = place.props.find((p) => ts.sprites[p.kind].kind === 'tree-broad');
  const bush = place.props.find((p) => String(ts.sprites[p.kind].kind).startsWith('bush'));
  assert.equal(lay.press[tileOf(rock)], 1); assert.equal(lay.press[tileOf(tree)], 1);
  if (bush) { assert.equal(T_BLOCK[lay.tiles[tileOf(bush)]], 1); assert.equal(lay.press[tileOf(bush)], 0, 'a bush blocks, but is not pressed on'); }
  assert.equal(lay.press[0], 0, 'the padding rock all round is not stone either');
});

test('the explorer starts on walkable ground and the reachable set holds the heart, and nothing outside the place', () => {
  const s = lay.spawnPt;
  assert.equal(T_BLOCK[lay.tiles[s.y * PW + s.x]], 0);
  assert.equal(lay.reach[s.y * PW + s.x], 1);
  assert.equal(lay.reach[lay.heart.y * PW + lay.heart.x], 1);
  for (let i = 0; i < PW * PH; i++) if (lay.reach[i]) { const x = (i % PW) - 5, y = ((i / PW) | 0) - 5; assert.ok(x >= 0 && y >= 0 && x < 18 && y < 22); }
});

test('the mirrored place adapts too, with its heart mirrored', () => {
  const m = adaptPlace(placeX, ts, terrains, { key: '101', cell: 101 });
  assert.equal(m.baked.id, 'Test_AllCases~x');
  assert.equal(m.heart.x - 5, 17 - (lay.heart.x - 5));
  assert.equal(m.reach[m.heart.y * PW + m.heart.x], 1);
});
