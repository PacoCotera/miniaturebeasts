// The storm's soft edge in the place view (#149): a 3-tile band of the 4x4 Bayer dither (25/50/75 percent storm), anchored to world pixels, with a seeded per-row wobble.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../src/view.mjs";

const SEED = 12345, DARK_W = 336, SCR = 600;
const wob = (r) => V.stormWobble(r, SEED);
// the storm-pixel share of one 4 x 4 block (world-anchored) at distance ds from the screen side
const share = (ds, row, bx, by) => { let n = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (V.stormBandHit(ds, row, bx * 4 + x, by * 4 + y, DARK_W, SEED)) n++; return n / 16; };

test("(a) across the band the storm-pixel share steps 75, 50, 25 percent from the storm to the day", () => {
  const row = 5, edge = DARK_W + 48 * wob(row);   // the leading edge of the row
  assert.equal(share(edge - V.BAND_PX - 1, row, 0, 0), 1, "the storm side beyond the band: all storm");
  assert.equal(share(edge - 24, row, 0, 0), .25);
  assert.equal(share(edge - 72, row, 0, 0), .5);
  assert.equal(share(edge - 120, row, 0, 0), .75);
  assert.equal(share(edge + 1, row, 0, 0), 0, "day beyond the edge");
  assert.equal(V.BAND_PX, 3 * 48);
  for (const bx of [0, 3, 7, 11]) for (const by of [0, 2, 9]) assert.equal(share(edge - 72, row, bx, by), .5, "every block of the step has the same share");
});

test("(b) the same world pixel takes the same table when the camera moves by one tile (no crawl)", () => {
  // the dither depends on the world pixel and on the pixel's depth in the band only: a one-tile pan (48 px, a multiple of 4) moves the screen distance and nothing else
  for (let row = 0; row < 12; row++) for (let wx = 0; wx < 800; wx += 7) for (let wy = row * 48; wy < row * 48 + 48; wy += 5) {
    const cam = 96, ds = wx - cam, ds2 = wx - (cam + 48);
    // the pixel one tile along the pan shows the pixel that stood a tile further: its depth shifts by 48, so it is the same pixel of a different step; the pattern is the world's
    assert.equal(V.stormBandHit(ds, row, wx, wy, DARK_W, SEED), V.stormBandHit(ds2 + 48, row, wx, wy, DARK_W, SEED));
  }
  // and a pixel's own step is the Bayer cell of its world pixel: a 4-pixel shift of the world pixel keeps the matrix cell
  for (let wx = 0; wx < 40; wx++) assert.equal(V.stormBandHit(DARK_W - 70, 3, wx, 6, DARK_W, SEED), V.stormBandHit(DARK_W - 70, 3, wx + 4, 6, DARK_W, SEED));
});

test("(c) the edge column varies by row (wobble within 1 to 2 tiles) and is the same on two frames", () => {
  const edgeCol = (row) => { let x = 0; while (x < SCR && V.stormBandStep(x, row, DARK_W, SEED) > 0) x++; return x; };
  const cols = []; for (let r = 0; r < 40; r++) cols.push(edgeCol(r));
  assert.ok(new Set(cols).size >= 3, "the edge is not a straight column line");
  for (const c of cols) assert.ok(Math.abs(c - DARK_W) <= 96 && c % 48 === 0, "each row offsets the edge by whole tiles, at most 2");
  assert.ok(cols.some((c) => Math.abs(c - DARK_W) >= 48), "the wobble reaches a tile or two");
  const again = []; for (let r = 0; r < 40; r++) again.push(edgeCol(r));
  assert.deepEqual(again, cols, "stable between frames");
});
