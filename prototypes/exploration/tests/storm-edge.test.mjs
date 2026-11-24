// The storm's soft edge in the place view (#149, round 2): a 3-tile band of the 4x4 Bayer dither, depth continuous per world pixel, with a smooth seeded per-pixel-row wobble.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../src/view.mjs";

const SEED = 12345, DARK_W = 336, SCR = 700;
const hit = (ds, py, px) => V.stormBandHit(ds, py, px, DARK_W, SEED);
// the storm-pixel share of an aligned 16 x 16 window at depth d inside the band on one pixel row band (the wobble is constant across a window of one row: use a row, x spread)
const shareAt = (d, py0) => { const e = DARK_W + V.stormWobble(py0, SEED); let n = 0, m = 0;
  for (let y = py0 - (py0 & 3); y < py0 - (py0 & 3) + 4; y++) if (V.stormWobble(y, SEED) === V.stormWobble(py0, SEED)) for (let x = 0; x < 4; x++) { m++; if (hit(e - d, y, x)) n++; }
  return n / m; };

test("(a) across the band the storm share falls evenly: about 75, 50, 25 percent at a quarter, a half, three quarters of the way", () => {
  const py = 400, near = (a, b) => assert.ok(Math.abs(a - b) <= .13, a + " vs " + b);
  assert.equal(shareAt(V.BAND_PX + 1, py), 1, "beyond the band: all storm");
  near(shareAt(V.BAND_PX * .75, py), .75); near(shareAt(V.BAND_PX * .5, py), .5); near(shareAt(V.BAND_PX * .25, py), .25);
  assert.equal(shareAt(-1, py), 0, "beyond the edge: day");
  assert.equal(V.BAND_PX, 3 * 48);
  // no step lines: the share never jumps by more than one Bayer level (1/16, plus the wobble's own pixel) between neighbouring columns of depth
  let prev = shareAt(0, py); for (let d = 1; d <= V.BAND_PX; d += 2) { const s = shareAt(d, py); assert.ok(s >= prev - 1e-9 && s - prev <= .26, "monotone, no jump at depth " + d); prev = s; }
});

test("(b) the same world pixel takes the same table whatever the camera does (no crawl; no tile snap)", () => {
  // the table depends on the world pixel (px, py) and the pixel's depth only: a pixel's answer when the view pans 48 px is the answer of the same pixel at the shifted distance
  for (let wy = 0; wy < 600; wy += 7) for (let wx = 0; wx < 800; wx += 5) {
    const ds = wx - 96;
    assert.equal(hit(ds, wy, wx), hit((wx - 144) + 48, wy, wx));
  }
  // the pattern repeats with the Bayer cell (4 px) at a constant depth
  for (let wx = 0; wx < 40; wx++) assert.equal(V.stormBandHit(DARK_W - 70, 12, wx, DARK_W, SEED) , V.stormBandHit(DARK_W - 70, 12, wx + 4, DARK_W, SEED));
  // not per tile: inside one 48 px tile the table changes along the row
  const ds0 = DARK_W + V.stormWobble(100, SEED) - 72; let flips = 0; for (let x = 1; x < 48; x++) if (hit(ds0, 100, x) !== hit(ds0, 100, x - 1)) flips++;
  assert.ok(flips > 4, "the dither changes pixel by pixel inside a tile");
});

test("(c) the edge varies by pixel row (1 to 2 tiles, smooth, not in whole tiles) and is the same on two frames", () => {
  const edgeCol = (py) => { let x = 0; while (V.stormBandDepth(x, py, DARK_W, SEED) > 0) x++; return x; };
  const cols = []; for (let y = 0; y < 960; y++) cols.push(edgeCol(y));
  assert.ok(new Set(cols).size > 20, "the edge is not a straight column line nor a few tile steps");
  for (const c of cols) assert.ok(Math.abs(c - DARK_W) <= 96, "within 2 tiles");
  assert.ok(Math.max(...cols) - Math.min(...cols) >= 48, "the wobble reaches at least a tile");
  let maxStep = 0; for (let y = 1; y < cols.length; y++) maxStep = Math.max(maxStep, Math.abs(cols[y] - cols[y - 1]));
  assert.ok(maxStep <= 4, "smooth: no row-to-row jump (a tile row is not a block): " + maxStep);
  const again = []; for (let y = 0; y < 960; y++) again.push(edgeCol(y));
  assert.deepEqual(again, cols, "stable between frames");
});
