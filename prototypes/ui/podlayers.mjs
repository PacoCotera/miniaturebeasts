// One painted pod is every species: the signed layers of a size class (shade, mask-body, mask-accent, pattern-*, band) recoloured by the species' colour pair
// (masters README, tools/recolour.py): colour = A · body · (1 − pattern) + B · clamp(accent + pattern), times twice the shade's value, alpha the shade's alpha.
// Pure on RGBA arrays (Uint8ClampedArray, w × h × 4, all layers the same size), so it runs in Node for the tests and in the page for the picture.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// layers: { shade, body, accent, pattern?, band? } as RGBA arrays; A, B: "#rrggbb"; returns RGBA (straight alpha)
export function composePod(layers, A, B, w, h, { sealed = false } = {}) {
  const a = rgb(A), b = rgb(B), out = new Uint8ClampedArray(w * h * 4), { shade, body, accent, pattern, band } = layers;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, sh = shade[o] / 255, bd = body[o + 3] / 255, ac = accent[o + 3] / 255, pt = pattern ? pattern[o + 3] / 255 : 0, al = shade[o + 3] / 255;
    const mix = Math.min(1, ac + pt);
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(Math.min(1, (a[c] * bd * (1 - pt) + b[c] * mix) * sh * 2) * 255);
    out[o + 3] = Math.round(al * 255);
    if (sealed && band) {   // the sealing band over the pod, straight alpha "over"
      const ba = band[o + 3] / 255; if (ba > 0) { const oa = out[o + 3] / 255, ra = ba + oa * (1 - ba); for (let c = 0; c < 3; c++) out[o + c] = Math.round((band[o + c] * ba + out[o + c] * oa * (1 - ba)) / (ra || 1)); out[o + 3] = Math.round(ra * 255); }
    }
  }
  return out;
}
// The layer a species' shell pattern words name: the masters have dots, stripes and bands. Derived (UI designer and art director to confirm): plates take bands.
export const patternLayer = (words, map) => { for (const [k, v] of Object.entries(map)) if (words.includes(k)) return v; return null; };
