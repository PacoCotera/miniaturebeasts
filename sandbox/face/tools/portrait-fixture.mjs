// The Portrait picture's test card (ruling (c), 2026-10-15 05:02): a 528×392 source built in code, deterministic, not art and not a portrait, taken only by the reducer's tests (station/tests/pictures-rgba.test.mjs) and the Station journey; no golden draws it (boneCanvas below). Flat 13×13 blocks, so the 40×30
// output is exact under the provisional reducer and any averaging one; a 1 px dark rim proves the 1:1 placement in the window; the red outside the crop (x 4..524, y 1..391) must never show in the 40×30 picture; the Sitting's 1:1 portrait shows the whole source, its red margin with it; four quadrants prove the orientation.
// No imports: its source runs in the page (toString) and Node tests import it.
export function portraitFixture() {
  const W = 528, H = 392, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, inCrop = x >= 4 && x < 524 && y >= 1 && y < 391; let c;
    if (!inCrop) c = [255, 0, 0]; else { const cx = ((x - 4) / 13) | 0, cy = ((y - 1) / 13) | 0; c = cx === 0 || cx === 39 || cy === 0 || cy === 29 ? [24, 24, 24] : cx < 20 ? (cy < 15 ? [200, 72, 64] : [64, 88, 200]) : (cy < 15 ? [72, 168, 80] : [232, 200, 104]); }
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return d;
}
// The portrait the goldens hold until the fixture portrait is painted: a flat canvas of the palette's bone (#f1ebdf, the paper window's own fill) at 528×392, deterministic, not art and not a portrait.
// The Habitat, Sitting and Cargo states take it, so no golden draws the test card above (which stays for the reducer's tests and the journey). No imports: its source runs in the page.
export function boneCanvas() {
  const W = 528, H = 392, d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < d.length; i += 4) { d[i] = 0xf1; d[i + 1] = 0xeb; d[i + 2] = 0xdf; d[i + 3] = 255; }
  return d;
}
