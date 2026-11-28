// Pictures from decoded files (rendering). Decoded pixels are { width, height, data } with straight alpha, as pngdecode gives them.

// The canvas of a decoded picture, pixel for pixel: made from the file's own bytes, never premultiplied or colour-managed on the way, never read back.
export async function canvasOf(px) {
  const c = document.createElement('canvas'); c.width = px.width; c.height = px.height;
  c.getContext('2d').drawImage(await createImageBitmap(new ImageData(px.data, px.width, px.height), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }), 0, 0);
  return c;
}

// Adds to `list` each colour ([r, g, b]) of the opaque pixels that `seen` does not hold yet, in the order met.
export function addColours(data, seen, list) {
  for (let o = 0; o < data.length; o += 4) {
    if (!data[o + 3]) continue;
    const k = data[o] << 16 | data[o + 1] << 8 | data[o + 2];
    if (!seen.has(k)) { seen.add(k); list.push([data[o], data[o + 1], data[o + 2]]); }
  }
}

// How wide a cut stands: the span of the opaque pixels in its lowest 12 rows (the whole width when they are empty). Kept on the canvas once measured.
export function footSpan(c) {
  if (c.footSpan != null) return c.footSpan;
  const h = c.height, band = Math.min(h, 12), d = c.getContext('2d').getImageData(0, h - band, c.width, band).data; let lo = c.width, hi = -1;
  for (let y = 0; y < band; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return (c.footSpan = hi < lo ? c.width : hi - lo + 1);
}
