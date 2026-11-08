// The ground of a map as one indexed picture, from the dual grid's layers and the tile atlases of the pairs. The bake's goldens and the seam
// proofs use it; the renderer core (ground.mjs, C6) adds the camera, the light pass and the animation clock on top of the same blits.
import { blitTile } from './blit.mjs';
import { EMPTY, FULL_BASE, EMPTY_BASE } from './dualgrid.mjs';

// pairAtlas[k] = { atlas: Uint8Array (tiles stacked), size, nFull, nEmpty } with slots: 0..15 corner tiles, 16.. full variants, then empty variants.
export function slotOfCode(code, nFull) {
  if (code < FULL_BASE) return code;
  if (code < EMPTY_BASE) return 16 + (code - FULL_BASE);
  return 16 + nFull + (code - EMPTY_BASE);
}

// Returns the Uint8Array (w*size by h*size) of the place's w x h cells; dual tile (i, j) sits at (i*size - size/2, j*size - size/2).
export function renderGround(dg, w, h, size, pairAtlas, remap) {
  const W = w * size, H = h * size, buf = new Uint8Array(W * H);
  const half = size >> 1;
  for (const layer of dg.layers) {
    const pa = pairAtlas[layer.pair];
    for (let j = 0; j < dg.h1; j++) for (let i = 0; i < dg.w1; i++) {
      const code = layer.tiles[j * dg.w1 + i];
      if (code === EMPTY) continue;
      blitTile(buf, W, H, i * size - half, j * size - half, pa.atlas, slotOfCode(code, pa.nFull), size, remap);
    }
  }
  return buf;
}
