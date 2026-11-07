// Review pictures for tile sets (arch.md A5 test 3): the 16 tiles in corner order, 4x4, with 1 px magenta gaps.
import { newImage, fill, paste } from './png.mjs';

export function cornerSheet(tiles, gap = 1) {
  const t = tiles[0].w;
  const n = 4 * t + 5 * gap;
  const out = newImage(n, n);
  fill(out, 255, 0, 255);
  tiles.forEach((tile, i) => paste(out, tile, gap + (i % 4) * (t + gap), gap + (i >> 2) * (t + gap)));
  return out;
}
