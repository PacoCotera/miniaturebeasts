// B4: the 16 px derivation of the set and the whole view at 16 px for places larger than 18 x 22.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHalfView, renderView, wholeScale, HALF_W, HALF_H } from '../src/ground.mjs';
import { sixteenOf, thirds } from '../src/sixteen.mjs';
import { compareGolden } from '../src/golden.mjs';
import { ts, place, toImage, goldenFile } from './render-helpers.mjs';

// the fixture place grown to 24 x 28: its ground layers repeated, its props and crowns where they were
function grown(w, h) {
  const w0 = place.w + 1, h0 = place.h + 1, w1 = w + 1, h1 = h + 1;
  const ground = place.ground.map((l) => {
    const tiles = new Uint16Array(w1 * h1);
    for (let j = 0; j < h1; j++) for (let i = 0; i < w1; i++) tiles[j * w1 + i] = l.tiles[(j % h0) * w0 + (i % w0)];
    return { ...l, tiles };
  });
  return { ...place, w, h, ground };
}

test('the whole view is 16 px for a place larger than 18 x 22, 24 px for today\'s', () => {
  assert.equal(wholeScale(place), 24);
  assert.equal(wholeScale({ w: 24, h: 28 }), 16);
  assert.equal(wholeScale({ w: 18, h: 23 }), 16);
  assert.equal(renderHalfView(ts, place).length, HALF_W * HALF_H, 'a today place keeps its 432 x 528');
});

test('a 24 x 28 place renders 384 x 448, whole, and a window of it equals the same pixels of the whole', () => {
  const big = grown(24, 28), buf = renderHalfView(ts, big);
  assert.equal(buf.length, 384 * 448);
  assert.equal(buf.indexOf(0), -1, 'a pixel with no ground');
  assert.ok(Buffer.compare(buf, renderView(ts, big, 16, { x: 0, y: 0, w: 384, h: 448 })) === 0);
  const win = { x: 37, y: 61, w: 200, h: 150 }, part = renderView(ts, big, 16, win);
  for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) assert.equal(part[y * win.w + x], buf[(y + win.y) * 384 + x + win.x], `${x},${y}`);
  assert.ok(384 <= 450 && 448 <= 532, 'it fits the walking view, with room to centre');
});

test('a 16 px tile is the kit tile pixel for pixel: the 48 px tile is the kit tile scaled 3x, so thirds give it back', () => {
  const t16 = sixteenOf(ts), n = ts.atlas48.length / 2304;
  assert.equal(t16.atlas16.length, n * 256);
  let exact = 0;
  for (let s = 0; s < n; s++) {
    const t48 = ts.atlas48.subarray(s * 2304, (s + 1) * 2304);
    let uniform = true;
    for (let y = 0; y < 48 && uniform; y++) for (let x = 0; x < 48; x++) if (t48[y * 48 + x] !== t48[(y - (y % 3)) * 48 + x - (x % 3)]) { uniform = false; break; }
    if (!uniform) continue;
    exact++;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(t16.atlas16[s * 256 + y * 16 + x], t48[y * 3 * 48 + x * 3], `tile ${s} at ${x},${y}`);
  }
  assert.ok(exact > 0, 'at least one tile is an exact 3x scale');
});

test('thirds: the most frequent index wins, ties go to the darker, a sprite block under half opaque is clear', () => {
  const lum = new Array(256).fill(0); lum[5] = 200; lum[6] = 50;
  const px = Uint8Array.from([5, 5, 6, 6, 6, 5, 5, 6, 6]);   // 5 x4, 6 x5
  assert.equal(thirds(px, 3, 3, lum).data[0], 6);
  const tie = Uint8Array.from([5, 5, 5, 5, 6, 6, 6, 6, 0]);   // 4 v 4, 8 opaque of 9
  assert.equal(thirds(tie, 3, 3, lum).data[0], 6, 'the darker');
  const sparse = Uint8Array.from([5, 5, 5, 5, 0, 0, 0, 0, 0]);   // 4 of 9 opaque
  assert.equal(thirds(sparse, 3, 3, lum).data[0], 0);
});

test('golden: the 24 x 28 whole view at 16 px', () => {
  const r = compareGolden(goldenFile('whole-16.png'), toImage(renderHalfView(ts, grown(24, 28)), 384, 448));
  assert.ok(r.ok, r.message);
});
