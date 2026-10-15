// The calm "unknown" (Fix 1b part 1): the founder's picture where a chapter is unread, in place of the frost checkerboard. The art director's rules A, B and C, signed in masters-pods 71968ccc
// (art/station-masters/pods/concepts/unknown/, unknown-proof.py is the oracle); the architect's ruling lets a code-made transform ship on the painted layer only for the ids the signed treatment names, pass 3 only.
//   clear   an unread doing: no veil at all, the picture as it is (rule A)
//   veil    an unread look (rule B): VEIL at 60 % blended into the picture's own colour, on that look's region only
//   ghost   nothing read (rule C): the body in GHOST alone, no hue, plus 0.22 of its own light contrast, a 2 px rim top left
// A picture here is { w, h, rgba() } with straight alpha (ui/assets.mjs). Integer or IEEE + - * / and sqrt only (no pow, exp or trig), so the result is the same bytes everywhere.
export const UNKNOWN = {   // the AD's constants (71968ccc)
  VEIL: [107, 116, 132], VEIL_WEIGHT: 0.6,   // #6b7484 at 60 %
  GHOST: [95, 104, 120], CONTRAST: 0.22,     // #5f6878; 22 % of the body's luma contrast about its mean
  RIM: [143, 153, 168], RIM_WEIGHT: 0.5, RIM_PX: 2,   // #8f99a8 at 50 %, 2 px on the top left
  GROW: 4, FEATHER: 6,   // the part's box grown 4 px, drawn as an ellipse, feathered 6 px outward along the larger radius
  LUMA: [0.2126, 0.7152, 0.0722],   // Rec. 709 on the sRGB 0-255 values, not linearised
};
const K = UNKNOWN, IN = 128;   // the output is truncated to a byte as the oracle's astype(uint8) does; a pixel is in the body at alpha 128 or more (the palette's pictures are 0 or 255)
const clip = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// boxes: "body" (the whole body alpha: Shape, or with `luma` Coat) or [[x0, y0, x1, y1], ...] pixel boxes, first and last pixel inclusive, one ellipse each, the largest weight where they overlap.
// luma: Coat unread: under the veil the picture is replaced by its own luma (grey, no hue); Shape unread keeps the picture's colour.
export function treat(pic, { mode, boxes = [], luma = false }) {
  const { w, h } = pic, src = pic.rgba(), out = new Uint8ClampedArray(src);
  const lum = (i) => K.LUMA[0] * src[i] + K.LUMA[1] * src[i + 1] + K.LUMA[2] * src[i + 2], inBody = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= IN;
  if (mode === "ghost") {
    let sum = 0, n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inBody(x, y)) { sum += lum((y * w + x) * 4); n++; }
    const mean = n ? sum / n : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inBody(x, y)) continue; const i = (y * w + x) * 4, d = K.CONTRAST * (lum(i) - mean), rim = !inBody(x - K.RIM_PX, y - K.RIM_PX);
      for (let c = 0; c < 3; c++) { let v = clip(K.GHOST[c] + d); if (rim) v = v * (1 - K.RIM_WEIGHT) + K.RIM[c] * K.RIM_WEIGHT; out[i + c] = Math.floor(clip(v)); }
    }
  } else if (mode === "veil") {
    const wt = new Float64Array(w * h);   // the veil's weight at each pixel, the largest of the veils
    if (boxes === "body") { for (let p = 0; p < w * h; p++) wt[p] = K.VEIL_WEIGHT * (src[p * 4 + 3] / 255); }
    else for (const [x0, y0, x1, y1] of boxes) {
      const cy = (y0 + y1) / 2, cx = (x0 + x1) / 2, ry = (y1 - y0) / 2 + K.GROW, rx = (x1 - x0) / 2 + K.GROW, fe = K.FEATHER / (ry > rx ? ry : rx);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ey = (y - cy) / ry, ex = (x - cx) / rx, d = Math.sqrt(ey * ey + ex * ex), f = (1 + fe - d) / fe, e = f < 0 ? 0 : f > 1 ? 1 : f, v = K.VEIL_WEIGHT * e * (src[(y * w + x) * 4 + 3] / 255), p = y * w + x;
        if (v > wt[p]) wt[p] = v;
      }
    }
    for (let p = 0; p < w * h; p++) {
      const W = wt[p]; if (!W) continue; const i = p * 4, base = luma ? lum(i) : 0;
      for (let c = 0; c < 3; c++) out[i + c] = Math.floor(clip((luma ? base : src[i + c]) * (1 - W) + K.VEIL[c] * W));
    }
  }
  else if (mode !== "clear") throw new Error(`the treatment ${mode} is not clear, veil or ghost`);
  return { w, h, rgba: () => out };
}
