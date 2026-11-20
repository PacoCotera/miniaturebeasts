import test from 'node:test';
import assert from 'node:assert/strict';
import { easeNudge, STAND_NUDGE } from '../src/standnudge.mjs';

// owner bug #88: holding down at a lip step must never move the drawn pawn sideways.
test('while he steps the nudge is held, whatever the next tile asks for', () => {
  const nd = { x: STAND_NUDGE, y: 0 };
  for (let i = 0; i < 20; i++) easeNudge(nd, 0, 0, true, true, 15);   // a held down key: stepping every frame, target 0 at the lower tile
  assert.deepEqual(nd, { x: STAND_NUDGE, y: 0 });
});

test('standing still it eases toward the target, and snaps when the page is not in motion', () => {
  const nd = { x: 0, y: 0 };
  easeNudge(nd, STAND_NUDGE, 0, false, true, 5);
  assert.deepEqual(nd, { x: 5, y: 0 });
  easeNudge(nd, -STAND_NUDGE, 0, false, false, 5);
  assert.deepEqual(nd, { x: -STAND_NUDGE, y: 0 });
});
