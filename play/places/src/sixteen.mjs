// The 16 px derivation of a tile set (walk scheme B4): each 48 px tile reduced by 3 x 3 blocks, which are exact thirds, so a 16 px pixel is one pixel of
// the kit's own art. Same rule as the 24 px halving in bakeset.mjs: the most frequent palette index in a block, ties to the darker colour (outlines
// survive); a block of sprite pixels is transparent unless at least half of its pixels are opaque.
// Derived from the set's 48 px atlases when first asked for (cached per tile set), so no baked file changes. Pure, so the page and the node tests share it.
import { encodeRle, decodeRle } from './blit.mjs';

export const SIXTEEN = 16;
const FIRST_SET_INDEX = 48;

// pixels: Uint8Array w*h of palette indices (0 transparent). Returns { data, w: ceil(w/3), h: ceil(h/3) }. lum[v]: the luminance of index v.
export function thirds(pixels, w, h, lum) {
  const w2 = Math.ceil(w / 3), h2 = Math.ceil(h / 3), data = new Uint8Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const counts = new Map();
    let n = 0, opaque = 0;
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const sx = x * 3 + dx, sy = y * 3 + dy;
      if (sx >= w || sy >= h) continue;
      n++;
      const v = pixels[sy * w + sx];
      if (v === 0) continue;
      opaque++;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (opaque * 2 < n) continue;
    let best = 0, bc = 0;
    for (const [v, c] of counts) {
      if (c > bc || (c === bc && (lum[v] < lum[best] || (lum[v] === lum[best] && v < best)))) { best = v; bc = c; }
    }
    data[y * w2 + x] = best;
  }
  return { data, w: w2, h: h2 };
}

const cache = new WeakMap();
// { atlas16, spriteAtlas16, sprites: [{ w16, h16, anchor16, frames16 }] } for a tile set read by format/read.mjs.
export function sixteenOf(ts) {
  let r = cache.get(ts);
  if (r) return r;
  const lum = new Array(256).fill(0);
  ts.palette.forEach((c, k) => { lum[FIRST_SET_INDEX + k] = 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255); });
  const n = ts.atlas48.length / (48 * 48), atlas16 = new Uint8Array(n * 16 * 16);
  for (let s = 0; s < n; s++) atlas16.set(thirds(ts.atlas48.subarray(s * 2304, (s + 1) * 2304), 48, 48, lum).data, s * 256);
  const rle = [];
  let off = 0;
  const sprites = ts.sprites.map((s) => {
    const frames16 = [];
    let w16 = 0, h16 = 0;
    for (const f of s.frames48) {
      const px = decodeRle(ts.spriteAtlas48.subarray(f), s.w48, s.h48);
      const small = thirds(px, s.w48, s.h48, lum);
      w16 = small.w; h16 = small.h;
      const e = encodeRle(small.data, w16, h16);
      frames16.push(off); rle.push(e); off += e.length;
    }
    return { w16, h16, anchor16: [Math.round(s.anchor48[0] / 3), Math.round(s.anchor48[1] / 3)], frames16 };
  });
  const spriteAtlas16 = new Uint8Array(off);
  let o = 0;
  for (const e of rle) { spriteAtlas16.set(e, o); o += e.length; }
  r = { atlas16, spriteAtlas16, sprites };
  cache.set(ts, r);
  return r;
}
