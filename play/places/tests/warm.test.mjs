// Warming ahead (the Companion walk's cell boundary): what the page builds early must be exactly what it would build on the spot, and what it keeps must stay bounded.
//   the whole-place picture in steps equals the picture in one go; the ground ring serves a repeated animation frame without a render, within its bound;
//   a view keeps a light state per cell, and its grids can be opened ahead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHalfView, renderGround, PlaceGroundCache, FrameRing, lightState, GroundCache, wholeScale } from '../src/ground.mjs';
import { BakedView } from '../src/page.mjs';
import { ts, place } from './render-helpers.mjs';

const core = Array.from({ length: 48 }, (_, i) => [i, i, i]);
const mk = (w, h) => ({ width: w, height: h, getContext: () => ({ createImageData: (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }), putImageData() {} }) });
const view = (ring = null) => new BakedView(ts, place, { core, night: 2, ox: 0, oy: 0, mkCanvas: mk, ring });
const veilOf = (...cells) => { const v = new Uint8Array(place.w * place.h); for (const i of cells) v[i] = 1; return v; };

test('the whole-place picture built in steps is the picture built at once (the cached half ground changes nothing)', () => {
  const v = view();
  for (const veil of [null, veilOf(0, 1, 2, place.w + 1, place.w * 5 + 3)]) {
    const it = v.overviewSteps(veil, 0); let n = 0, r;
    do { r = it.next(); n++; } while (!r.done);
    assert.ok(n >= 3, 'ground, light, sprites and canopy are separate steps');
    const light = veil ? lightState(place, { veil }) : null;
    assert.deepEqual(Buffer.from(r.value), Buffer.from(renderHalfView(ts, place, { clockMs: 0, light, nightIndex: 2 })), 'same pixels');
    assert.deepEqual(Buffer.from(v.overviewBuf(veil, 0)), Buffer.from(r.value), 'overviewBuf is the same picture');
  }
  assert.equal(v.half.redone, 1, 'the half-scale ground was rendered once for the place, whatever the veil');
});

test('the ground ring keeps each animation frame once, serves a repeat without a render, and holds to its bound', () => {
  const ring = new FrameRing(5);
  const a = new PlaceGroundCache(ts, place, 48, ring), plain = new PlaceGroundCache(ts, place, 48);
  const win = { x: 0, y: 0, w: 40, h: 40 }, clocks = a.frameClocks();
  assert.ok(clocks.length >= 2, 'the water has more than one frame: ' + clocks.length);
  assert.equal(new Set(clocks.map((c) => a.frameKey(c))).size, clocks.length, 'one clock for each frame');
  for (const c of clocks) a.get(win, c);
  assert.equal(a.redone, clocks.length, 'each frame rendered once');
  for (let round = 0; round < 3; round++) for (const c of clocks) {
    assert.deepEqual(Buffer.from(a.get(win, c)), Buffer.from(plain.get(win, c)), 'the kept frame is the frame a render gives');
  }
  assert.equal(a.redone, clocks.length, 'flipping back through the cycle costs no render');
  assert.ok(plain.redone > clocks.length, 'without a ring each flip is a render');
  // a second cache on the same ring: the ring never holds more than its bound across both
  const b = new PlaceGroundCache(ts, place, 48, ring);
  for (const c of clocks) { b.get(win, c); a.get(win, c); assert.ok(ring.list.length <= 5, 'bounded: ' + ring.list.length); }
  assert.ok(a.frames.size + b.frames.size <= 5);
});

test('a view keeps a light state per cell, rebuilt only when that cell\'s bits change, with at most eight kept', () => {
  const v = view();
  const fns = (veiled) => ({ veiled: (x, y) => veiled.has(y * place.w + x), foggedFar: () => false, level: () => 0 });
  const a = v.lightFor(fns(new Set([0, 1])), 'a'), b = v.lightFor(fns(new Set([0, 1, 2])), 'b');
  assert.notEqual(a, b);
  assert.equal(v.lightFor(fns(new Set([0, 1])), 'a'), a, 'cell a asked again with its own bits: the same state, though b was asked between');
  assert.notEqual(v.lightFor(fns(new Set([0])), 'a'), a, 'its bits changed: a new state');
  for (let i = 0; i < 12; i++) v.lightFor(fns(new Set([i])), 'k' + i);
  assert.ok(v.states.size <= 8, 'bounded: ' + v.states.size);
  const st = v.lightFor(fns(new Set([3, 4])), 'x'); assert.ok(!st.eg.veil, 'the grids are not made until used');
  v.prepareLight(st); assert.ok(st.eg.veil, 'prepareLight opens them ahead');
});

test('the half-scale ground cache is the ground at its scale', () => {
  const s = wholeScale(place), w = place.w * s, h = place.h * s;
  assert.deepEqual(Buffer.from(new GroundCache(ts, place, s).get({ x: 0, y: 0, w, h }, 0)), Buffer.from(renderGround(ts, place, s, { x: 0, y: 0, w, h }, 0)));
});
