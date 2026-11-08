// PNG in and out for the place tools, on pngjs. An image is { w, h, data: Uint8Array RGBA }.
// Indexed pictures (palette index per pixel) are written as 8-bit palette PNGs with writeIndexedPng.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

export function decodePng(bytes) {
  const p = PNG.sync.read(Buffer.from(bytes));
  return { w: p.width, h: p.height, data: new Uint8Array(p.data.buffer, p.data.byteOffset, p.data.length) };
}
export const readPng = (file) => decodePng(readFileSync(file));

export function encodePng(img) {
  const p = new PNG({ width: img.w, height: img.h });
  p.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length);
  // fixed filter and level: the same pixels always give the same bytes
  return PNG.sync.write(p, { filterType: 4, deflateLevel: 9, colorType: 6 });
}
export const writePng = (file, img) => writeFileSync(file, encodePng(img));

export function newImage(w, h) { return { w, h, data: new Uint8Array(w * h * 4) }; }

export function crop(img, x, y, w, h) {
  const out = newImage(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j;
    if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
    const s = (sy * img.w + sx) * 4, d = (j * w + i) * 4;
    out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = img.data[s + 3];
  }
  return out;
}

// alpha 0 or 255 only (pixel art): a source pixel with alpha > 0 replaces the destination pixel.
export function paste(dst, src, x, y) {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
    const dx = x + i, dy = y + j;
    if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
    const s = (j * src.w + i) * 4;
    if (src.data[s + 3] === 0) continue;
    const d = (dy * dst.w + dx) * 4;
    dst.data[d] = src.data[s]; dst.data[d + 1] = src.data[s + 1]; dst.data[d + 2] = src.data[s + 2]; dst.data[d + 3] = 255;
  }
}

export function scaleNearest(img, k) {
  const out = newImage(img.w * k, img.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const s = ((y / k | 0) * img.w + (x / k | 0)) * 4, d = (y * out.w + x) * 4;
    out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = img.data[s + 3];
  }
  return out;
}

export function fill(img, r, g, b, a = 255) {
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a; }
}

// Indexed pictures: idx is a Uint8Array of palette indices (0 = transparent), pal is an array of [r,g,b] for 0..255.
export function indexedToImage(idx, w, h, pal) {
  const out = newImage(w, h);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (v === 0) continue;
    const c = pal[v] || [255, 0, 255];
    out.data[i * 4] = c[0]; out.data[i * 4 + 1] = c[1]; out.data[i * 4 + 2] = c[2]; out.data[i * 4 + 3] = 255;
  }
  return out;
}
