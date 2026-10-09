// The width of a string in the face's Inter (lvgl-switch.md §2.5), summed from the metrics table of the compiled fonts (face/dist/metrics.json, made by face_metrics): the same integers
// lv_text_get_width sums, so a view that chooses its words by width (the ← word that fits, a number in words against figures) agrees with the face without a call across the bridge.
// A letter's width is its advance plus the kerning with the next letter; a codepoint the font lacks is 0, as in LVGL; the width of a text is the sum.
export function createMeasure(metrics) {
  const fonts = metrics.fonts;
  return function measure(text, px) {
    const F = fonts[String(px)]; if (!F) throw new Error(`no metrics for Inter at ${px} px (the table holds ${Object.keys(fonts).join(", ")})`);
    const cps = Array.from(String(text), (ch) => ch.codePointAt(0)); let w = 0;
    for (let i = 0; i < cps.length; i++) {
      const a = F.advance[cps[i]]; if (a === undefined) continue;   // a missing glyph has no width
      w += a + (i + 1 < cps.length ? (F.kern[cps[i] + "," + cps[i + 1]] ?? 0) : 0);
    }
    return w;
  };
}
