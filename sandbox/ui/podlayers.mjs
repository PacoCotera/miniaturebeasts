// One painted pod is every species: the signed layers of a size class (shade, mask-body, mask-accent, pattern-*, band) recoloured by the species' colour pair
// (masters README, tools/recolour.py): colour = (A · body · (1 − pattern) + B · min(1, accent + pattern)) × 2 · shade × 2 · relief (a missing relief is 0.5), alpha the shade's alpha.
// Pure on RGBA arrays (Uint8ClampedArray, w × h × 4, all layers the same size), so it runs in Node for the tests and in the page for the picture.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// layers: { shade, body, accent, pattern?, band? } as RGBA arrays; A, B: "#rrggbb"; returns RGBA (straight alpha)
export function composePod(layers, A, B, w, h, { sealed = false } = {}) {
  const a = rgb(A), b = rgb(B), out = new Uint8ClampedArray(w * h * 4), { shade, body, accent, pattern, relief, band } = layers;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, sh = shade[o] / 255, bd = body[o + 3] / 255, ac = accent[o + 3] / 255, pt = pattern ? pattern[o + 3] / 255 : 0, al = shade[o + 3] / 255;
    const mix = Math.min(1, ac + pt), rl = relief ? (relief[o] / 255) * 2 : 1;   // a missing relief is the neutral 0.5, which times two is 1
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(Math.min(1, (a[c] * bd * (1 - pt) + b[c] * mix) * sh * 2 * rl) * 255);
    out[o + 3] = Math.round(al * 255);
    if (sealed && band) {   // the sealing band over the pod, straight alpha "over"
      const ba = band[o + 3] / 255; if (ba > 0) { const oa = out[o + 3] / 255, ra = ba + oa * (1 - ba); for (let c = 0; c < 3; c++) out[o + c] = Math.round((band[o + c] * ba + out[o + c] * oa * (1 - ba)) / (ra || 1)); out[o + 3] = Math.round(ra * 255); }
    }
  }
  return out;
}
// Straight-alpha "over": src laid on dst (both RGBA, same size), returns dst.
export function overRGBA(dst, src) {
  for (let o = 0; o < dst.length; o += 4) {
    const sa = src[o + 3] / 255; if (!sa) continue;
    const da = dst[o + 3] / 255, ra = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) dst[o + c] = Math.round((src[o + c] * sa + dst[o + c] * da * (1 - sa)) / (ra || 1));
    dst[o + 3] = Math.round(ra * 255);
  }
  return dst;
}
// A clan's crown over a composed pod (the crown layers are the pod class's size): the crown is composePod's shade x mask in the second colour B (where the mask is clear it is the contact shadow, black at the shade's alpha), the glow (C03, C20) laid over it, the whole laid over the pod.
export function composeCrown(pod, { shade, mask, glow }, B, w, h) {
  const clear = new Uint8ClampedArray(w * h * 4), crown = composePod({ shade, body: clear, accent: mask }, B, B, w, h);
  if (glow) overRGBA(crown, glow);
  return overRGBA(pod, crown);
}
// The rack pod from its 1-bit layer masks (24×32, a layer's `on` pixels are the ones with alpha): each layer's on pixels take its fill ([r, g, b]) in `order`, later over earlier; alpha 255 where `body`
// is on, 0 elsewhere. Pure on RGBA arrays of one size; a layer with no mask draws nothing.
export function composeRackPod(masks, order, fills, w, h, unclipped = []) {
  const out = new Uint8ClampedArray(w * h * 4), body = masks.body, free = order.filter((l) => unclipped.includes(l));   // a layer in `unclipped` (the clan's crown) is drawn wherever it is on, the body or not
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, onBody = !!(body && body[o + 3]);
    for (const l of order) { const m = masks[l], f = fills[l]; if (m && f && m[o + 3] && (onBody || free.includes(l))) { out[o] = f[0]; out[o + 1] = f[1]; out[o + 2] = f[2]; out[o + 3] = 255; } }
  }
  return out;
}
// The layer a species' shell pattern words name, by the spec's map; a word with no layer draws none (never forced onto the nearest).
export const patternLayer = (words, map) => { for (const [k, v] of Object.entries(map)) if (words.includes(k)) return v; return null; };

// The figure beside the pod: the species' clear slice laid over its mist slice with the clear layer's alpha scaled by t (chapters read ÷ chapters), no blur.
// Pure on RGBA arrays of one size (straight alpha): the standard "over" with the clear layer's alpha times t; a transparent pixel adds no colour; t is clamped to 0..1.
export function figureComposite(mist, clear, t) {
  const out = new Uint8ClampedArray(mist.length), k = Math.max(0, Math.min(1, t));
  for (let i = 0; i < mist.length; i += 4) {
    const am = mist[i + 3] / 255, ac = (clear[i + 3] / 255) * k, a = ac + am * (1 - ac);
    for (let c = 0; c < 3; c++) out[i + c] = a ? Math.round((clear[i + c] * ac + mist[i + c] * am * (1 - ac)) / a) : 0;
    out[i + 3] = Math.round(a * 255);
  }
  return out;
}
// The clear layer's alpha for the figure: chapters read ÷ chapters; none for a held figure (its mist shows in both states, with no fade).
export const figureAlpha = (statuses, share) => (statuses.includes("held") ? 0 : share);
