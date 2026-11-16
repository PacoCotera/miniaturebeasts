// a made-up staircase raster, both ways: node land-diagonals-selftest.mjs
import { diagonalRuns } from '../src/gen7/levels.mjs';
const W = 16, H = 16;
for (const flip of [false, true]) {
  const R = new Uint8Array(W * H);
  // raised above a line that falls one row per column (down-right when flip is false)
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { const edge = flip ? 12 - x : 2 + x; if (y <= edge) R[y * W + x] = 1; }
  console.log(flip ? 'down-left' : 'down-right', JSON.stringify(diagonalRuns(R, W, H)));
}
