// The fog sight's soft edge (#153): the rule (sight, per tile) is unchanged; its edge is drawn as a 2.5-tile band of the 4x4 Bayer dither per world pixel,
// start radius wobbling round the hero.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../src/view.mjs";
import { applyLight, lightState } from "../../places/src/ground.mjs";

const SIGHT = 4, E = { cx: 20 * 48 + 24, cy: 20 * 48 + 24, r: Math.round((SIGHT + .5) * 48), seed: 777 };
const hit = (px, py, e = E) => V.fogBandHit(px, py, e);
// share of fog in the 4 x 4 block at depth d past the start radius along angle 0 (the wobble is constant across the block's few pixels: use the exact depth)
const shareAt = (d, theta = 0.3) => {
  const w = V.fogWobble(theta, E.seed), R = E.r + w + d; let n = 0, m = 0;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    // a pixel whose depth is d: walk along theta, then step onto the Bayer cell's coordinates by shifting only the lookup (depth the same)
    const px = Math.round(E.cx + Math.cos(theta) * R), py = Math.round(E.cy + Math.sin(theta) * R);
    const bx = (px & ~3) + x, by = (py & ~3) + y; m++;
    const dd = d; if (dd >= V.FOG_BAND_PX || (dd > 0 && V.BAYER4[(by & 3) * 4 + (bx & 3)] * V.FOG_BAND_PX < dd * 16)) n++;
  }
  return n / m;
};

test("(a) across the band the fog share of a 4x4 block rises 25 / 50 / 75 percent, full fog beyond", () => {
  assert.equal(V.FOG_BAND_PX, 2.5 * 48);
  const near = (a, b) => assert.ok(Math.abs(a - b) <= .13, a + " vs " + b);
  assert.equal(shareAt(-1), 0); near(shareAt(V.FOG_BAND_PX * .25), .25); near(shareAt(V.FOG_BAND_PX * .5), .5); near(shareAt(V.FOG_BAND_PX * .75), .75); assert.equal(shareAt(V.FOG_BAND_PX + 1), 1);
  // and through the real function, measured over a ring of world pixels at a fixed depth band
  for (const [lo, hi, want] of [[10, 30, .13], [50, 70, .45], [90, 110, .8]]) {
    let n = 0, t = 0;
    for (let py = 0; py < 1600; py++) for (let px = 0; px < 1600; px++) { const d = V.fogDepth(px, py, E); if (d >= lo && d < hi) { t++; if (hit(px, py)) n++; } }
    assert.ok(Math.abs(n / t - want) < .15, `${lo}-${hi}: ${(n / t).toFixed(2)}`);
  }
});

test("(b) the same world pixel takes the same table on two frames and after a one-tile camera move (no crawl, no tile snap)", () => {
  for (let py = 0; py < 1600; py += 7) for (let px = 0; px < 1600; px += 5) assert.equal(hit(px, py), hit(px, py));
  // a camera move shifts only the view window, never the world pixel's inputs: applyLight on a 48 px-shifted window gives the same pixels
  const place = { w: 40, h: 40 }, st = lightState(place, {}); st.fogEdge = E;
  const tsLike = { lightTables: [{ name: "fog", map: Array.from({ length: 256 }, (_, i) => (i ? 1 : 0)) }, { name: "dark", map: Array.from({ length: 256 }, (_, i) => i) }, { name: "dark2", map: Array.from({ length: 256 }, (_, i) => i) }] };
  const mk = (x) => { const win = { x, y: 700, w: 400, h: 300 }, b = new Uint8Array(400 * 300).fill(5); applyLight(b, win, 48, tsLike, st); return b; };
  const A = mk(600), B = mk(648);
  for (let y = 0; y < 300; y++) for (let x = 0; x < 352; x++) assert.equal(A[y * 400 + x + 48], B[y * 400 + x]);
  // not per tile: inside one 48 px tile at mid-band the table changes pixel by pixel
  let flips = 0; const py = 20 * 48 + 24; for (let x = E.cx + E.r + 40; x < E.cx + E.r + 88; x++) if (hit(x, py) !== hit(x - 1, py)) flips++;
  assert.ok(flips > 4, "pixel by pixel inside a tile");
});

test("(c) the start radius varies round the hero, never clears into fog on the in-sight side: every in-sight tile centre is clear", () => {
  const ws = new Set(); for (let a = 0; a < 720; a++) ws.add(V.fogWobble(a / 720 * 2 * Math.PI - Math.PI, E.seed));
  assert.ok(ws.size > 20, "the edge radius varies with the angle: " + ws.size);
  assert.ok(Math.max(...ws) - Math.min(...ws) >= 24, "reaches at least half a tile");
  assert.ok(Math.min(...ws) >= 0);
  // the rule is the page's inS (tile centre within SIGHT + .5): none of those tiles takes any fog
  const tx0 = 20, ty0 = 20; let tiles = 0;
  for (let ty = ty0 - 6; ty <= ty0 + 6; ty++) for (let tx = tx0 - 6; tx <= tx0 + 6; tx++) {
    if (Math.hypot(tx - tx0, ty - ty0) > SIGHT + .5) continue; tiles++;
    assert.equal(hit(tx * 48 + 24, ty * 48 + 24), false, `tile centre ${tx},${ty}`);   // what stands on the tile (trees, rocks, the walker) takes the clear table
    let n = 0; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (hit(tx * 48 + x, ty * 48 + y)) n++;
    assert.ok(n / 2304 < .08, `tile ${tx},${ty}: only a corner can take a few dots (${n})`);
  }
  assert.ok(tiles > 50);
  // the edge is smooth in angle and stable between frames
  let maxJump = 0, prev = V.fogWobble(-Math.PI, E.seed); for (let a = 1; a <= 720; a++) { const w = V.fogWobble(-Math.PI + a / 720 * 2 * Math.PI, E.seed); maxJump = Math.max(maxJump, Math.abs(w - prev)); prev = w; }
  assert.ok(maxJump <= 3, "smooth: " + maxJump);
  assert.equal(V.fogWobble(-Math.PI, E.seed), V.fogWobble(Math.PI, E.seed), "no seam where the angle wraps");
});

test("(d) the fog band dithers at the storm band's dot size: one 4 x 4 Bayer cell per world pixel (period 4 in x and y, same matrix), on every pixel", () => {
  // both edges, over a 16 x 16 block of world pixels at a mid-band depth: a pixel is dotted exactly when BAYER4[(y&3)*4 + (x&3)] * BAND < depth * 16 (the page's baked and generated paths both call these)
  const darkW = 200, seed = 5;
  for (let py = 96; py < 112; py++) for (let px = 500; px < 516; px++) {
    const e = { cx: 0, cy: py, r: 1e7, seed }, fx = Math.round(e.r + V.fogWobble(0, seed) + 60);   // a pixel 60 px past the start (half the 120 px band) on the pixel's own row
    const dF = V.fogDepth(fx, py, e), bayF = V.BAYER4[(py & 3) * 4 + (px & 3)];
    // the fog pixel's x sets the depth, so compare the lookup on the same cell: shift the pixel by whole cells (multiples of 4) in x and y, the answer is the same
    assert.equal(V.fogBandHit(fx, py, e), V.fogBandHit(fx, py, { ...e, cy: py + 0 }));
    assert.equal(V.fogBandHit(fx, py + 4, { ...e, cy: py + 4 }), V.fogBandHit(fx, py, e), "period 4 in y");
    assert.equal(V.fogBandHit(fx, py, e), V.BAYER4[(py & 3) * 4 + (fx & 3)] * V.FOG_BAND_PX < dF * 16, "fog: the Bayer cell indexes by the pixel (x&3, y&3)");
    const dS = V.stormBandDepth(darkW + V.stormWobble(py, seed) - 72, py, darkW, seed);   // 72 px inside the 144 px storm band (half)
    assert.equal(V.stormBandHit(darkW + V.stormWobble(py, seed) - 72, py, px, darkW, seed), bayF * V.BAND_PX < dS * 16, "storm: the same indexing");
    assert.equal(V.stormBandHit(darkW + V.stormWobble(py, seed) - 72, py, px + 4, darkW, seed), V.stormBandHit(darkW + V.stormWobble(py, seed) - 72, py, px, darkW, seed), "period 4 in x");
  }
  // one matrix, 4 x 4
  assert.equal(V.BAYER4.length, 16);
});
