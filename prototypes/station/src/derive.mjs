// The portrait's picture (Habitat's Portrait module): derived on the Station from the sitting's 528×392 opening, cropped at (4, 1, 520, 390) and reduced 13:1 to exactly 40×30 by plain area averaging (the architect's ruling; the art
// director confirmed the reducer, and signs the rule once, on a proof sheet of each species' worst cases, when the first real portraits exist: the vectors are PROVISIONAL until then). The reducer lives behind this one function.
// Integers only, rounding half up: each channel is (sum of 13 × 13 = 169 samples + 84) / 169, floored. A wrong size or any alpha below 255 is refused: an { error }, never a picture. Only the 4.8 KB result is kept, never the source.
export const OPENING = [528, 392], CROP = [4, 1, 520, 390], REDUCE = 13, OUT = [40, 30];
export function derivePortrait(rgba, w = OPENING[0], h = OPENING[1]) {
  if (w !== OPENING[0] || h !== OPENING[1]) return { error: `the portrait's opening is ${OPENING[0]}×${OPENING[1]}, not ${w}×${h}` };
  if (!rgba || rgba.length !== w * h * 4) return { error: `the portrait's opening is ${w * h * 4} bytes of RGBA, not ${rgba ? rgba.length : 0}` };
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) return { error: "the portrait's opening is not opaque (alpha below 255)" };
  const out = new Uint8ClampedArray(OUT[0] * OUT[1] * 4), n = REDUCE * REDUCE, half = (n - 1) / 2;   // 84: rounds half up
  for (let y = 0; y < OUT[1]; y++) for (let x = 0; x < OUT[0]; x++) {
    const sums = [0, 0, 0];
    for (let dy = 0; dy < REDUCE; dy++) for (let dx = 0; dx < REDUCE; dx++) { const i = ((CROP[1] + y * REDUCE + dy) * w + CROP[0] + x * REDUCE + dx) * 4; sums[0] += rgba[i]; sums[1] += rgba[i + 1]; sums[2] += rgba[i + 2]; }
    const o = (y * OUT[0] + x) * 4; for (let c = 0; c < 3; c++) out[o + c] = Math.floor((sums[c] + half) / n); out[o + 3] = 255;
  }
  return { w: OUT[0], h: OUT[1], rgba: () => out };
}
