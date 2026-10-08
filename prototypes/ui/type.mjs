// The Station's type: glyph runs from the baked atlases (tools/bake-type.mjs), measured from the atlas metrics.
// No text API is used anywhere: a string becomes a list of glyph placements (integer pixels) that the renderer
// blits from the atlas; the same layout runs in Node, so a view's strings can be measured without a browser.
// A face is one weight at one size: Inter Regular 16, Medium 20, SemiBold 28 (the three sizes the style guide allows).
export const SIZES = { 16: 400, 20: 500, 28: 600 };

export class TypeSet {
  // metrics: { <face id>: parsed JSON }, images: { <face id>: { width, height, data: RGBA coverage } } (images may be set later)
  constructor(index, metrics, images = {}) {
    this.index = index; this.faces = new Map(); this.images = images; this.missing = new Set();
    for (const f of index.faces) { const m = metrics[f.id]; this.faces.set(f.id, { ...m, glyphs: new Map(Object.entries(m.glyphs).map(([c, g]) => [+c, g])), kern: new Map(Object.entries(m.kern).map(([k, v]) => [k, v])) }); }
  }
  // The face of a size (16, 20, 28); any other size is refused: the Station has three.
  face(px) {
    const weight = SIZES[px], f = this.faces.get(`inter-${weight}-${px}`);
    if (!f) throw new Error(`no face for Inter ${weight} at ${px} px (the Station has 400/16, 500/20, 600/28)`);
    return f;
  }
  glyph(f, code) { let g = f.glyphs.get(code); if (!g) { this.missing.add(String.fromCodePoint(code)); g = f.glyphs.get(0x3f); } return g; }
  // The run as placements relative to its origin: the pen at x 0 and the cap top at y 0.
  layout(str, px) {
    const f = this.face(px), out = []; let pen = 0, prev = null;
    for (const ch of String(str)) {
      const code = ch.codePointAt(0), g = this.glyph(f, code), c = f.glyphs.has(code) ? code : 0x3f;
      if (prev != null) pen += f.kern.get(prev + "," + c) ?? 0;
      if (g.w) out.push({ code: c, sx: g.x, sy: g.y, w: g.w, h: g.h, dx: Math.round(pen) + g.ox, dy: f.cap + g.oy });
      pen += g.adv; prev = c;
    }
    return { glyphs: out, width: Math.round(pen), face: f };
  }
  measure(str, px) { return this.layout(str, px).width; }
}
