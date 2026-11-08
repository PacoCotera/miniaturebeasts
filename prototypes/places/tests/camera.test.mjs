// C6: the place camera (place design A4.2): clamp, look-ahead easing, pull to the tell, integer outputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFor, newLook, lookOffset, lookTo, tellPull, LOOK_PX, PULL_MAX, TILE } from '../src/camera.mjs';

const view = { w: 450, h: 532 }, place = { pw: 18 * TILE, ph: 22 * TILE };
const ints = (...vs) => vs.every((v) => Number.isInteger(v));

test('the camera is centred on the pawn and clamped at all four edges of the place', () => {
  const mid = cameraFor(view, place, { x: 432, y: 528 });
  assert.deepEqual(mid, { x: 432 - 225, y: 528 - 266 });
  assert.deepEqual(cameraFor(view, place, { x: 10, y: 528 }), { x: 0, y: 528 - 266 }, 'west');
  assert.deepEqual(cameraFor(view, place, { x: 860, y: 528 }), { x: 864 - 450, y: 528 - 266 }, 'east');
  assert.deepEqual(cameraFor(view, place, { x: 432, y: 5 }), { x: 432 - 225, y: 0 }, 'north');
  assert.deepEqual(cameraFor(view, place, { x: 432, y: 1050 }), { x: 432 - 225, y: 1056 - 532 }, 'south');
  assert.deepEqual(cameraFor(view, place, { x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(cameraFor(view, place, { x: 864, y: 1056 }), { x: 414, y: 524 });
  // the clamp keeps the whole view inside the place for any pawn, look and pull
  for (const px of [0, 100, 432, 800, 864]) for (const py of [0, 300, 528, 1000, 1056]) {
    const c = cameraFor(view, place, { x: px, y: py }, { x: 72, y: -72 }, { x: -96, y: 96 });
    assert.ok(c.x >= 0 && c.y >= 0 && c.x + view.w <= place.pw && c.y + view.h <= place.ph, JSON.stringify(c));
  }
});

test('the look-ahead eases to 72 px over 200 ms: 0 at 0 ms, 54 at 100 ms, 72 at 200 ms and after', () => {
  const l = newLook();
  assert.deepEqual(lookTo(l, 1, 0, 1000), { x: 0, y: 0 });
  assert.deepEqual(lookOffset(l, 1100), { x: 54, y: 0 });
  assert.deepEqual(lookOffset(l, 1200), { x: LOOK_PX, y: 0 });
  assert.deepEqual(lookOffset(l, 5000), { x: LOOK_PX, y: 0 });
  assert.deepEqual(lookOffset(l, 900), { x: 0, y: 0 }, 'before the start');
  // monotone and integer all the way
  let prev = -1;
  for (let t = 1000; t <= 1200; t += 7) { const o = lookOffset(l, t); assert.ok(ints(o.x, o.y) && o.x >= prev); prev = o.x; }
});

test('a turn restarts the easing from where the offset is now, and facing the other way passes through zero', () => {
  const l = newLook();
  lookTo(l, 1, 0, 0);
  const mid = lookTo(l, 1, 0, 100);
  assert.equal(mid.x, 54);
  assert.deepEqual(lookTo(l, -1, 0, 100), { x: 54, y: 0 }, 'a turn at 100 ms starts at 54');
  assert.deepEqual(lookOffset(l, 200), { x: -40, y: 0 }, '100 ms into the turn: 54 + trunc(-126 * 0.75)');
  assert.deepEqual(lookOffset(l, 300), { x: -LOOK_PX, y: 0 });
  assert.deepEqual(lookTo(l, 0, 0, 300), { x: -LOOK_PX, y: 0 }, 'standing still eases back from where it is');
  assert.deepEqual(lookOffset(l, 500), { x: 0, y: 0 });
  assert.deepEqual(lookTo(l, 0, 1, 500), { x: 0, y: 0 });
  assert.deepEqual(lookOffset(l, 700), { x: 0, y: LOOK_PX });
});

test('the pull to the tell: toward the nearest tell within 6 tiles, scaled by closeness, never past it, zero beyond 6 tiles or once found', () => {
  const pawn = { x: 400, y: 400 };
  const heart = { x: 400 + 4 * TILE, y: 400 };            // 4 tiles east
  const p = tellPull(pawn, [heart], false);
  assert.ok(p.x > 0 && p.y === 0 && p.x <= PULL_MAX, JSON.stringify(p));
  assert.equal(p.x, Math.trunc(PULL_MAX * (6 * TILE - 4 * TILE) / (6 * TILE)));   // 64
  const nearer = tellPull(pawn, [{ x: 400 + 2 * TILE, y: 400 }], false);
  assert.ok(nearer.x > p.x, 'closer pulls harder');
  const adjacent = tellPull(pawn, [{ x: 410, y: 400 }], false);
  assert.equal(adjacent.x, 10, 'never past the target');
  assert.deepEqual(tellPull(pawn, [{ x: 400 + 6 * TILE, y: 400 }], false), { x: 0, y: 0 }, 'at 6 tiles the pull is zero');
  assert.deepEqual(tellPull(pawn, [{ x: 400 + 9 * TILE, y: 400 }], false), { x: 0, y: 0 });
  assert.deepEqual(tellPull(pawn, [heart], true), { x: 0, y: 0 }, 'not once the heart is found');
  assert.deepEqual(tellPull(pawn, [], false), { x: 0, y: 0 });
  assert.deepEqual(tellPull(pawn, [{ x: 400, y: 400 }], false), { x: 0, y: 0 }, 'standing on it');
  // the nearest of several
  const two = tellPull(pawn, [{ x: 400, y: 400 - 3 * TILE }, { x: 400 + 5 * TILE, y: 400 }], false);
  assert.ok(two.y < 0 && two.x === 0, JSON.stringify(two));
  // a diagonal pull is toward the target and integer
  const d = tellPull(pawn, [{ x: 400 + 2 * TILE, y: 400 + 2 * TILE }], false);
  assert.ok(d.x > 0 && d.y > 0 && ints(d.x, d.y));
  assert.ok(Math.abs(d.x - d.y) <= 1);
});

test('every camera output is an integer for integer inputs', () => {
  const l = newLook();
  for (let t = 0; t < 600; t += 13) {
    const o = lookTo(l, t % 3 - 1, (t >> 2) % 3 - 1, t);
    const pull = tellPull({ x: t, y: 2 * t }, [{ x: 300, y: 300 }], false);
    const c = cameraFor(view, place, { x: t + 3, y: t * 2 + 1 }, o, pull);
    assert.ok(ints(o.x, o.y, pull.x, pull.y, c.x, c.y), JSON.stringify({ o, pull, c }));
  }
});
