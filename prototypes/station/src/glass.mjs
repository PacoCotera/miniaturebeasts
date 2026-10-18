// The capsule's glass, drawn in code (build-spec section 1: "two soft highlights along the window mask, alpha over the interior and the pod"; capsule-masters.md: "a painting's glass can't be separated from what's behind it").
// The window is the interior master's own alpha (the arch-topped window). Each band of incubator.json `glass.bands` is a cosine profile across and along, in the glass colour, its peak alpha the band's; x, y, w, h are fractions of the
// window's box. PROVISIONAL numbers (the art director owes the geometry). Pure on RGBA (straight alpha); one picture of the layer's size per view, drawn once in the logic process.
import { bboxOf } from "./relight.mjs";
export const GLASS_RECIPE = 1;
export function glassPicture(interior, w, h, glass) {
  const out = new Uint8ClampedArray(w * h * 4), box = bboxOf(interior, w, h, 128); if (!box) return out;
  const [bx, by, bw, bh] = box, [r, g, b] = glass.colour;
  for (const band of glass.bands) {
    const x0 = bx + band.x * bw, y0 = by + band.y * bh, bwid = Math.max(1, band.w * bw), bhei = Math.max(1, band.h * bh);
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y0 + bhei)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x0 + bwid)); x++) {
      const u = (x + 0.5 - x0) / bwid, v = (y + 0.5 - y0) / bhei, a = (0.5 - 0.5 * Math.cos(2 * Math.PI * u)) * Math.sin(Math.PI * v) ** 0.5 * band.peak * (interior[(y * w + x) * 4 + 3] / 255);
      if (a <= 0) continue; const o = (y * w + x) * 4, da = out[o + 3] / 255, oa = a + da * (1 - a);
      out[o] = (r * a + out[o] * da * (1 - a)) / oa; out[o + 1] = (g * a + out[o + 1] * da * (1 - a)) / oa; out[o + 2] = (b * a + out[o + 2] * da * (1 - a)) / oa; out[o + 3] = Math.round(oa * 255);
    }
  }
  return out;
}
