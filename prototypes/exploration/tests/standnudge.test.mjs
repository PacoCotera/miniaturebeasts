import test from 'node:test';
import assert from 'node:assert/strict';
import { standNudge, STAND_NUDGE } from '../src/standnudge.mjs';

// a 6x5 land: raised everywhere but the south-west corner (low); steep = the ring (raised, a low cell beside) and the face/flank (low)
const w = 6, h = 5, raised = (x, y) => !(x < 3 && y >= 3);
const steep = new Uint8Array(w * h);
for (const [x, y] of [[0, 2], [1, 2], [2, 2], [3, 3], [3, 4]]) steep[y * w + x] = 1;   // ring on the north lip (row 2) and the east lip (column 3)
const lay = { w, h, steep, raisedFn: raised };

test('a pawn beside the lip ring is drawn nearer it, toward the ring only', () => {
  assert.deepEqual(standNudge(lay, 1, 1), [0, 0]);   // drop to the SOUTH: the lip is the ring below (a mound drawn over the ring's top): no nudge
  assert.deepEqual(standNudge(lay, 4, 3), [-STAND_NUDGE, 0]);   // the ring is to the west
  assert.deepEqual(standNudge(lay, 4, 4), [-STAND_NUDGE, 0]);
  assert.deepEqual(standNudge(lay, 5, 3), [0, 0]);   // two tiles from the ring: none
});

test('north drop: the ring is above the pawn', () => {
  const l = { w: 3, h: 4, steep: Uint8Array.from([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]), raisedFn: (x, y) => y >= 1 };
  assert.deepEqual(standNudge(l, 1, 2), [0, -STAND_NUDGE]);
});

test('the nudge is small: it never reaches the ring tile (stop gap stays under the 48 px tile)', () => {
  assert.ok(STAND_NUDGE > 0 && STAND_NUDGE < 24);
});

// a drawn crown as a pixel probe: grass left of the edge column ex(dy) (a diagonal edge when ex changes with dy), face right of it
const edge = (ex) => (dx, dy) => dx < ex(dy);

test('diagonal east edge: the nudged foot row stays on crown grass, the row under it too', () => {
  const grass = edge(dy => 9 - dy);   // the edge runs back a pixel a row: the foot row's grass ends at x 8, the row under it at x 7
  const [nx, ny] = standNudge(lay, 4, 3, edge(() => 100));   // plenty of grass: the full nudge (west ring here)
  assert.deepEqual([nx, ny], [-STAND_NUDGE, 0]);
  const l = { w: 6, h: 3, steep: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]), raisedFn: () => true };   // the ring on the east, column 4
  const [ex] = standNudge(l, 3, 1, grass);
  assert.ok(ex > 0 && ex < STAND_NUDGE, `clamped to ${ex}`);
  assert.ok(grass(ex, 0) && grass(ex, 1));   // the foot pixel and the one under it on grass
  assert.ok(!(grass(ex + 1, 0) && grass(ex + 1, 1)), 'one more px would leave the grass');
  assert.deepEqual(standNudge(l, 3, 1, edge(dy => 2 - dy)), [0, 0]);   // the edge already at his feet (grass under the foot, face one pixel on): no nudge at all
  assert.deepEqual(standNudge(l, 3, 1, edge(() => 100)), [STAND_NUDGE, 0]);   // with grass all the way: unchanged
  assert.deepEqual(standNudge(l, 3, 1, edge(() => -50)), [STAND_NUDGE, 0]);   // a probe that sees no grass at all cannot tell: the cliff-stand-1 nudge
});

test('west, north and south nudges are those of cliff-stand-1 when the ground under his feet is grass', () => {
  const all = () => true;
  assert.deepEqual(standNudge(lay, 1, 1, all), [0, 0]);
  assert.deepEqual(standNudge(lay, 4, 3, all), [-STAND_NUDGE, 0]);
  const n = { w: 3, h: 4, steep: Uint8Array.from([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0]), raisedFn: (x, y) => y >= 1 };
  assert.deepEqual(standNudge(n, 1, 2, all), [0, -STAND_NUDGE]);
});

test('no pawn on a steep tile and nothing without a raised land', () => {
  assert.deepEqual(standNudge(lay, 0, 2), [0, 0]);
  assert.deepEqual(standNudge({ w, h, steep }, 1, 1), [0, 0]);
});
