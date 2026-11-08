// The indexed blitter (place design A4.2): tiles and RLE sprites into a Uint8Array of palette indices, clipped to the buffer.
// Index 0 is transparent: it leaves the destination pixel alone. An optional remap (256 entries) is applied to every pixel written
// (the light tables). The same logic runs in the node tests, the sandbox and, in C, on the device.

// Tile atlas: tiles stacked vertically, `size` pixels wide, tile `slot` starts at slot * size * size.
export function blitTile(dst, dstW, dstH, x, y, atlas, slot, size, remap) {
  const x0 = Math.max(0, -x), x1 = Math.min(size, dstW - x);
  const y0 = Math.max(0, -y), y1 = Math.min(size, dstH - y);
  if (x0 >= x1 || y0 >= y1) return;
  const base = slot * size * size;
  for (let ty = y0; ty < y1; ty++) {
    let s = base + ty * size + x0, d = (y + ty) * dstW + x + x0;
    for (let tx = x0; tx < x1; tx++, s++, d++) {
      const v = atlas[s];
      if (v !== 0) dst[d] = remap ? remap[v] : v;
    }
  }
}

// RLE sprites. A row is a list of records [skip, n, n pixel bytes], ended by [0, 0]. skip and n are 0..255; longer runs split.
export function encodeRle(pixels, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      let skip = 0;
      while (x < w && pixels[y * w + x] === 0 && skip < 255) { x++; skip++; }
      if (x >= w) break;                         // trailing transparency is not stored
      if (pixels[y * w + x] === 0) { out.push(skip, 0); continue; } // skip hit 255 on a long gap: a record with no pixels
      let n = 0;
      while (x + n < w && pixels[y * w + x + n] !== 0 && n < 255) n++;
      out.push(skip, n);
      for (let k = 0; k < n; k++) out.push(pixels[y * w + x + k]);
      x += n;
    }
    out.push(0, 0);
  }
  return Uint8Array.from(out);
}

export function decodeRle(rle, w, h) {
  const pixels = new Uint8Array(w * h);
  blitRle(pixels, w, h, 0, 0, rle, 0, w, h);
  return pixels;
}

// Blit the sprite whose RLE data starts at `offset` in `rle` (w x h) with its top-left at (x, y).
export function blitRle(dst, dstW, dstH, x, y, rle, offset, w, h, remap) {
  let p = offset;
  for (let row = 0; row < h; row++) {
    const dy = y + row;
    const live = dy >= 0 && dy < dstH;
    let cx = 0;
    for (;;) {
      const skip = rle[p++], n = rle[p++];
      if (skip === 0 && n === 0) break;
      cx += skip;
      if (live) {
        const from = Math.max(0, -(x + cx)), to = Math.min(n, dstW - (x + cx));
        for (let k = from; k < to; k++) {
          const v = rle[p + k];
          dst[dy * dstW + x + cx + k] = remap ? remap[v] : v;
        }
      }
      p += n; cx += n;
    }
  }
  return p; // the offset just after this sprite
}
