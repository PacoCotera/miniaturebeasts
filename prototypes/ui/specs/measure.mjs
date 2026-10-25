// The width of a string in the face's Inter (lvgl-switch.md §2.5), summed from the metrics table of the compiled fonts (face/dist/metrics.json, made by face_metrics): the same integers
// lv_text_get_width sums, so a view that chooses its words by width (the ← word that fits, a number in words against figures) agrees with the face without a call across the bridge.
// A letter's width is its advance plus the kerning with the next letter; a codepoint the font lacks is 0, as in LVGL; the width of a text is the sum.
// The font is named by its key in the table: "16", "16m", "20" or "28" (a px alone is that px's own weight: 16 Regular, 20 Medium, 28 SemiBold; "16m" is Medium 16). A bare number is its px's key.
export function createMeasure(metrics) {
  const fonts = metrics.fonts;
  return function measure(text, font) {
    const F = fonts[String(font)]; if (!F) throw new Error(`no metrics for Inter at ${font} (the table holds ${Object.keys(fonts).join(", ")})`);
    const cps = Array.from(String(text), (ch) => ch.codePointAt(0)); let w = 0;
    for (let i = 0; i < cps.length; i++) {
      const a = F.advance[cps[i]]; if (a === undefined) continue;   // a missing glyph has no width
      w += a + (i + 1 < cps.length ? (F.kern[cps[i] + "," + cps[i + 1]] ?? 0) : 0);
    }
    return w;
  };
}
// The table's key for each font name of frame.json type.fonts (the face's codes, prim.h PRIM_FONT_*: R16 16, M16 1016, M20 20, SB28 28).
export const FONT_KEYS = { R16: "16", M16: "16m", M20: "20", SB28: "28" };
// measureRole(metrics, frame, role): the measure of a text role (frame.json type.roles.<role>, or "<role>.<variant>", which measures in the variant's font when it names one, else its role's): its font's key, then (text) => width.
// A role the frame does not hold, or a font the face does not, throws. A props builder that measures text measures it by role, never by px.
const measures = new WeakMap();
export function measureRole(metrics, frame, role) {
  const [base, variant] = String(role).split("."), R = frame?.type?.roles?.[base];
  if (!R) throw new Error(`no text role ${role} in frame.json type.roles`);
  const V = variant === undefined ? undefined : R.variants?.[variant];
  if (variant !== undefined && (V === null || (typeof V !== "string" && (typeof V !== "object" || Array.isArray(V))))) throw new Error(`the role ${base} has no variant ${variant}`);
  const font = typeof V === "object" && V.font !== undefined ? V.font : R.font;   // a variant's font comes before the role's
  const key = FONT_KEYS[font]; if (!key || !frame.type.fonts?.[font]) throw new Error(`the role ${role} names the font ${font}, which the face does not hold`);
  let m = measures.get(metrics); if (!m) { m = createMeasure(metrics); measures.set(metrics, m); }
  return (text) => m(text, key);
}
