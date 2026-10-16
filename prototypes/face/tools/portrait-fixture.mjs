// The Portrait picture's test card (ruling (c), 2026-10-15 05:02): a 528×392 source built in code, deterministic, not art and not a portrait, reachable only through the ?test harness (habitat-pictured). Flat 13×13 blocks, so the 40×30
// output is exact under the provisional reducer and any averaging one; a 1 px dark rim proves the 1:1 placement in the window; the red outside the crop (x 4..524, y 1..391) must never show; four quadrants prove the orientation.
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
