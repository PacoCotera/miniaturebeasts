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

test('no pawn on a steep tile and nothing without a raised land', () => {
  assert.deepEqual(standNudge(lay, 0, 2), [0, 0]);
  assert.deepEqual(standNudge({ w, h, steep }, 1, 1), [0, 0]);
});
