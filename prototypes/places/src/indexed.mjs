// Indexed pictures: palette indices 0..255 (0 = transparent, 1..47 core, 48.. the set's colours; arch.md A1.5 / A3.1).
import { newImage } from './png.mjs';

export const FIRST_SET_INDEX = 48;

// palette.json -> { rgb: [[r,g,b] x 256] (core slots magenta: tests never draw core colours), indexOf: Map('#rrggbb' -> index) }
export function paletteOf(palette) {
  const rgb = new Array(256).fill(null).map(() => [255, 0, 255]);
  const indexOf = new Map();
  palette.colours.forEach((hex, k) => {
    const i = FIRST_SET_INDEX + k;
    rgb[i] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    indexOf.set(hex, i);
  });
  return { rgb, indexOf };
}

// RGBA image (alpha 0 or 255) -> Uint8Array of palette indices; a colour not in the palette throws.
export function indexImage(img, pal) {
  const out = new Uint8Array(img.w * img.h);
  for (let p = 0; p < out.length; p++) {
    if (img.data[p * 4 + 3] === 0) continue;
    const hex = '#' + [0, 1, 2].map((c) => img.data[p * 4 + c].toString(16).padStart(2, '0')).join('');
    const i = pal.indexOf.get(hex);
    if (i === undefined) throw new Error(`colour ${hex} is not in the palette`);
    out[p] = i;
  }
  return out;
}

// Square tiles (RGBA images of one size) -> atlas, stacked vertically.
export function buildAtlas(tiles, pal) {
  const size = tiles[0].w;
  const atlas = new Uint8Array(tiles.length * size * size);
  tiles.forEach((tile, s) => atlas.set(indexImage(tile, pal), s * size * size));
  return atlas;
}

export function indexedToRgba(buf, w, h, pal) {
  const out = newImage(w, h);
  for (let p = 0; p < buf.length; p++) {
    if (buf[p] === 0) continue;
    const c = pal.rgb[buf[p]];
    out.data[p * 4] = c[0]; out.data[p * 4 + 1] = c[1]; out.data[p * 4 + 2] = c[2]; out.data[p * 4 + 3] = 255;
  }
  return out;
}
