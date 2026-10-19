/* face_metrics: writes the metrics table of the compiled Inter fonts (lvgl-switch.md §2.5): for 16, 20 and 28 px, every codepoint the font holds with its advance, and the kerning of every pair whose advance
   differs from the unkerned one, exactly what lv_text_get_width sums (lv_font_get_glyph_width(font, letter, letter_next)). ui/specs/measure.mjs sums the same table in JavaScript, so the views can choose words
   by width with no call across the bridge; metrics.test.mjs asserts it equals the WebAssembly face on every Station string.   face_metrics [out.json] */
#include "lvgl.h"
#include <stdio.h>
#include <stdlib.h>

extern const lv_font_t face_inter_16, face_inter_20, face_inter_28;
int main(int argc, char **argv) {
  lv_init();
  FILE *out = argc > 1 ? fopen(argv[1], "w") : stdout; if (!out) return 1;
  const struct { int px; const lv_font_t *f; } F[] = { { 16, &face_inter_16 }, { 20, &face_inter_20 }, { 28, &face_inter_28 } };
  fprintf(out, "{\"note\":\"Made by face_metrics from the compiled fonts: per size, the advance of each codepoint the font holds, and the kerning (the advance with a next letter minus the advance alone) of each pair where it is not zero. A text's width is the sum over its letters of advance + kerning with the next letter.\",\"fonts\":{");
  for (int fi = 0; fi < 3; fi++) {
    const lv_font_t *f = F[fi].f; static uint32_t have[70000]; int nh = 0;
    for (uint32_t c = 32; c < 0x10000; c++) { lv_font_glyph_dsc_t g; if (lv_font_get_glyph_dsc(f, &g, c, 0) && g.adv_w > 0) have[nh++] = c; }
    fprintf(out, "%s\"%d\":{\"advance\":{", fi ? "," : "", F[fi].px);
    for (int i = 0; i < nh; i++) fprintf(out, "%s\"%u\":%d", i ? "," : "", have[i], (int)lv_font_get_glyph_width(f, have[i], 0));
    fprintf(out, "},\"kern\":{"); int first = 1;
    for (int i = 0; i < nh; i++) for (int j = 0; j < nh; j++) { int k = (int)lv_font_get_glyph_width(f, have[i], have[j]) - (int)lv_font_get_glyph_width(f, have[i], 0); if (k) { fprintf(out, "%s\"%u,%u\":%d", first ? "" : ",", have[i], have[j], k); first = 0; } }
    fprintf(out, "}}");
  }
  fprintf(out, "}}\n"); if (out != stdout) fclose(out); return 0;
}
