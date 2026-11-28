// C3: the indexed blitter. Clipping at every edge, transparency, remaps, RLE sprites.
import test from 'node:test';
import assert from 'node:assert/strict';
import { blitTile, blitRle, encodeRle, decodeRle } from '../src/blit.mjs';

const S = 4;
// two tiles, 4x4: tile 0 counts 1..16; tile 1 has holes (zeros)
const atlas = new Uint8Array(2 * S * S);
for (let k = 0; k < 16; k++) atlas[k] = k + 1;
for (let k = 0; k < 16; k++) atlas[16 + k] = k % 2 === 0 ? 0 : 100 + k;

// reference: the plain per-pixel version, no clipping tricks
function ref(dst, W, H, x, y, slot, remap) {
  for (let ty = 0; ty < S; ty++) for (let tx = 0; tx < S; tx++) {
    const px = x + tx, py = y + ty;
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const v = atlas[slot * 16 + ty * S + tx];
    if (v !== 0) dst[py * W + px] = remap ? remap[v] : v;
  }
}

test('a tile blitted anywhere, fully inside, across every edge and corner, or outside, equals the per-pixel reference', () => {
  const W = 9, H = 7;
  for (let y = -6; y <= H + 2; y++) for (let x = -6; x <= W + 2; x++) {
    for (const slot of [0, 1]) {
      const a = new Uint8Array(W * H).fill(77), b = new Uint8Array(W * H).fill(77);
      blitTile(a, W, H, x, y, atlas, slot, S);
      ref(b, W, H, x, y, slot);
      assert.deepEqual(a, b, `tile ${slot} at ${x},${y}`);
    }
  }
});

test('clip at each edge writes nothing outside the buffer and keeps the visible part', () => {
  const W = 6, H = 6;
  const d = new Uint8Array(W * H);
  blitTile(d, W, H, -2, -2, atlas, 0, S);           // top-left: only tile pixels (2,2),(3,2),(2,3),(3,3) show
  assert.deepEqual([d[0], d[1], d[W], d[W + 1]], [11, 12, 15, 16]);
  const e = new Uint8Array(W * H);
  blitTile(e, W, H, 4, 4, atlas, 0, S);              // bottom-right: tile pixels (0,0),(1,0),(0,1),(1,1)
  assert.deepEqual([e[4 * W + 4], e[4 * W + 5], e[5 * W + 4], e[5 * W + 5]], [1, 2, 5, 6]);
  assert.equal(e[3 * W + 3], 0);
  const f = new Uint8Array(W * H);
  blitTile(f, W, H, 100, 100, atlas, 0, S);
  blitTile(f, W, H, -100, 0, atlas, 0, S);
  assert.ok(f.every((v) => v === 0), 'fully outside draws nothing');
});

test('index 0 is transparent: the pixel underneath stays', () => {
  const d = new Uint8Array(S * S).fill(9);
  blitTile(d, S, S, 0, 0, atlas, 1, S);
  for (let k = 0; k < 16; k++) assert.equal(d[k], k % 2 === 0 ? 9 : 100 + k);
});

test('a remap is applied to every pixel written and to none left alone', () => {
  const remap = new Uint8Array(256); for (let i = 0; i < 256; i++) remap[i] = 255 - i; remap[0] = 0;
  const d = new Uint8Array(S * S).fill(9);
  blitTile(d, S, S, 0, 0, atlas, 1, S, remap);
  for (let k = 0; k < 16; k++) assert.equal(d[k], k % 2 === 0 ? 9 : 255 - (100 + k));
});

function sprite(w, h, f) { const p = new Uint8Array(w * h); for (let i = 0; i < p.length; i++) p[i] = f(i % w, (i / w) | 0); return p; }

test('RLE: encode then decode returns the sprite, long gaps and long runs included', () => {
  const cases = [
    sprite(7, 5, (x, y) => ((x + y) % 3 === 0 ? 0 : 1 + x + y)),
    sprite(300, 3, (x, y) => (y === 0 ? 0 : y === 1 ? 5 : (x === 299 ? 8 : 0))),   // empty row, 300-long run, one pixel after a 299 gap
    sprite(3, 3, () => 0),
    sprite(1, 1, () => 4),
  ];
  for (const p of cases) {
    const w = p.length === 900 ? 300 : p.length === 35 ? 7 : p.length === 9 ? 3 : 1, h = p.length / w;
    assert.deepEqual(decodeRle(encodeRle(p, w, h), w, h), p);
  }
});

test('RLE blit equals the plain blit at every position, edges and corners included; remap applies', () => {
  const w = 5, h = 4, p = sprite(w, h, (x, y) => ((x * 3 + y) % 4 === 0 ? 0 : 20 + x + 5 * y));
  const rle = encodeRle(p, w, h);
  const remap = new Uint8Array(256).map((_, i) => (i === 0 ? 0 : (i + 1) & 255));
  const W = 8, H = 6;
  for (let y = -5; y <= H + 1; y++) for (let x = -6; x <= W + 1; x++) {
    const a = new Uint8Array(W * H).fill(3), b = new Uint8Array(W * H).fill(3);
    blitRle(a, W, H, x, y, rle, 0, w, h, remap);
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) {
      const px = x + sx, py = y + sy, v = p[sy * w + sx];
      if (v !== 0 && px >= 0 && py >= 0 && px < W && py < H) b[py * W + px] = remap[v];
    }
    assert.deepEqual(a, b, `rle at ${x},${y}`);
  }
});

test('two sprites in one stream: blitRle returns the offset where the next begins', () => {
  const a = sprite(3, 2, (x, y) => 1 + x + y), b = sprite(2, 2, (x, y) => 30 + x + y);
  const ra = encodeRle(a, 3, 2), rb = encodeRle(b, 2, 2);
  const stream = new Uint8Array(ra.length + rb.length); stream.set(ra); stream.set(rb, ra.length);
  const d = new Uint8Array(16);
  const next = blitRle(d, 4, 4, 0, 0, stream, 0, 3, 2);
  assert.equal(next, ra.length);
  blitRle(d, 4, 4, 0, 2, stream, next, 2, 2);
  assert.deepEqual(Array.from(d.slice(0, 4)), [1, 2, 3, 0]);
  assert.deepEqual(Array.from(d.slice(8, 12)), [30, 31, 0, 0]);
});
