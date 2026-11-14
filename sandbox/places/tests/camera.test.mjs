// The place camera (companion camera scheme): half-screen steps on fixed rests, a margin before each edge, a 280 ms slide, integers only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { camAnchors, camAxis, stepCamera, newCam, cameraFor, SLIDE_MS, MARGIN, TILE } from '../src/camera.mjs';

const view = { w: 450, h: 532 }, place = { pw: 18 * TILE, ph: 22 * TILE };
const ints = (...vs) => vs.every((v) => Number.isInteger(v));
const stepTo = (s, tile, now, motion = true, extra = null) => stepCamera(s, view, place, tile, now, motion, extra);

test('the rests of an 18 x 22 place at 450 x 532 are 3 across and 3 down, ends on the clamp', () => {
  assert.deepEqual(camAnchors(place.pw - view.w, view.w), [0, 207, 414]);
  assert.deepEqual(camAnchors(place.ph - view.h, view.h), [0, 262, 524]);
  for (const [T, V] of [[414, 450], [524, 532], [100, 450], [1000, 300]]) {
    const a = camAnchors(T, V);
    assert.equal(a[0], 0); assert.equal(a[a.length - 1], T);
    for (let i = 1; i < a.length; i++) assert.ok(a[i] - a[i - 1] <= V / 2 + 1, 'no more than half a view apart');
  }
  assert.deepEqual(camAnchors(-100, 450), [-50], 'a place smaller than the view has one centred rest');
});

test('the stable columns and rows per rest: c <= 6 | 6-11 | >= 11 and r <= 8 | 7-14 | >= 13', () => {
  const ax = camAnchors(414, 450), ay = camAnchors(524, 532);
  const cols = (i) => { const r = []; for (let c = 0; c < 18; c++) if (camAxis(ax, i, c * TILE, (c + 1) * TILE, 450) === i) r.push(c); return [r[0], r[r.length - 1]]; };
  assert.deepEqual(cols(0), [0, 6]); assert.deepEqual(cols(1), [6, 11]); assert.deepEqual(cols(2), [11, 17]);
  const rows = (i) => { const r = []; for (let y = 0; y < 22; y++) if (camAxis(ay, i, y * TILE, (y + 1) * TILE, 532) === i) r.push(y); return [r[0], r[r.length - 1]]; };
  assert.equal(rows(0)[0], 0); assert.equal(rows(0)[1], 8); assert.deepEqual(rows(1), [7, 14]); assert.deepEqual(rows(2), [13, 21]);
});

test('one tile of grace: column 7 slides to the middle rest, back to 6 stays, 5 goes to the first', () => {
  const ax = camAnchors(414, 450);
  assert.equal(camAxis(ax, 0, 7 * TILE, 8 * TILE, 450), 1);
  assert.equal(camAxis(ax, 1, 6 * TILE, 7 * TILE, 450), 1, 'back to 6 stays');
  assert.equal(camAxis(ax, 1, 5 * TILE, 6 * TILE, 450), 0, '5 goes back');
});

test('the slide ends exactly on the rest at 280 ms, eases out, is integer, and a step during it aims again from where the view is', () => {
  const s = newCam();
  assert.deepEqual(stepTo(s, { x: 9, y: 11 }, 0), { x: 207, y: 262 }, 'the first look: the rest nearest the explorer');
  const a = stepTo(s, { x: 9, y: 15 }, 1000);   // row 15 slides down to rest 2
  assert.deepEqual(a, { x: 207, y: 262 }, 'at 0 ms it starts where it was');
  const mid = stepTo(s, { x: 9, y: 15 }, 1000 + 140);
  assert.ok(mid.y > 262 && mid.y < 524 && ints(mid.x, mid.y));
  assert.ok(mid.y - 262 > (524 - 262) / 2, 'ease-out: more than half done at half the time');
  assert.deepEqual(stepTo(s, { x: 9, y: 15 }, 1000 + SLIDE_MS), { x: 207, y: 524 });
  assert.deepEqual(stepTo(s, { x: 9, y: 15 }, 9999), { x: 207, y: 524 });
  // a step during a slide (at 140 ms the view is at mid.y): the next move would start from there, nothing queues
  const s2 = newCam(); stepTo(s2, { x: 9, y: 11 }, 0); stepTo(s2, { x: 9, y: 15 }, 1000);
  const m2 = stepTo(s2, { x: 9, y: 15 }, 1100);
  const back = stepTo(s2, { x: 9, y: 5 }, 1100);   // back up to rest 0 mid-slide: starts from where the view is
  assert.equal(back.y, m2.y, 'aims again from where it is');
  assert.equal(stepTo(s2, { x: 9, y: 5 }, 1100 + SLIDE_MS).y, 0);
});

test('reduced motion cuts to the rest with no slide', () => {
  const s = newCam();
  stepTo(s, { x: 9, y: 11 }, 0, false);
  assert.deepEqual(stepTo(s, { x: 9, y: 15 }, 500, false), { x: 207, y: 524 });
});

test('walking straight across a place makes 2 slides; a place smaller than the view stays put', () => {
  const s = newCam(); let moves = 0, last = stepTo(s, { x: 0, y: 11 }, 0).x;
  for (let c = 1; c < 18; c++) { const x = stepTo(s, { x: c, y: 11 }, c * 1000, false).x; if (x !== last) moves++; last = x; }
  assert.equal(moves, 2);
  const small = newCam(), sp = { pw: 300, ph: 300 };
  const a = stepCamera(small, view, sp, { x: 1, y: 1 }, 0, true), b = stepCamera(small, view, sp, { x: 5, y: 5 }, 900, true);
  assert.deepEqual(a, b); assert.deepEqual(a, { x: -75, y: -116 });
});

test('the explorer is never closer than the margin to the view edge once the camera rests (inside the place)', () => {
  const s = newCam();
  for (let r = 0; r < 22; r++) for (const c of [0, 6, 7, 11, 12, 17]) {
    const v = stepTo(s, { x: c, y: r }, 100000 + r * 1000 + c, false);
    assert.ok(c * TILE - v.x >= Math.min(MARGIN, c * TILE) - 0 && v.x + view.w - (c + 1) * TILE >= Math.min(MARGIN, place.pw - (c + 1) * TILE), `x at ${c},${r}`);
    assert.ok(v.x >= 0 && v.y >= 0 && v.x + view.w <= place.pw && v.y + view.h <= place.ph, 'inside the place');
  }
});

test('a held span (the heart at the reveal spot) moves the rest that holds both', () => {
  const s = newCam(); stepTo(s, { x: 6, y: 2 }, 0, false);
  assert.equal(stepTo(s, { x: 6, y: 2 }, 5, false).x, 0, 'the explorer alone rests at the first');
  const v = stepTo(s, { x: 6, y: 2 }, 10, false, { x0: 9 * TILE, y0: 2 * TILE, x1: 10 * TILE, y1: 3 * TILE });
  assert.equal(v.x, 207, 'the heart three tiles east moves it to the rest holding both');
});

test('a held span the fixed rests cannot frame with the margin still rests: no rest flips frame after frame', () => {
  const s = newCam(), span = { x0: 5 * TILE, y0: 2 * TILE, x1: 6 * TILE, y1: 3 * TILE };   // explorer at column 8, heart at column 5: 4 tiles of span, no rest holds it with 72 px each side
  const seen = new Set();
  for (let t = 0; t < 20; t++) { stepTo(s, { x: 8, y: 3 }, t * 16, true, span); seen.add(s.ix + ',' + s.iy); }
  assert.equal(seen.size, 1, 'one rest all along: ' + [...seen]);
  const v = stepTo(s, { x: 8, y: 3 }, 5000, true, span);
  assert.ok(v.x <= 5 * TILE && v.x + view.w >= 9 * TILE, 'both the heart and the explorer are inside the view: ' + v.x);
});

test('every camera output is an integer for integer inputs', () => {
  const s = newCam();
  for (let t = 0; t < 4000; t += 13) {
    const c = stepTo(s, { x: (t >> 3) % 18, y: (t >> 2) % 22 }, t);
    assert.ok(ints(c.x, c.y), JSON.stringify(c));
  }
});

test('the plain clamp: centred on the pawn and held inside the place', () => {
  assert.deepEqual(cameraFor(view, place, { x: 432, y: 528 }), { x: 432 - 225, y: 528 - 266 });
  assert.deepEqual(cameraFor(view, place, { x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(cameraFor(view, place, { x: 864, y: 1056 }), { x: 414, y: 524 });
});
