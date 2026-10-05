#ifndef NATIVE_FONT_H
#define NATIVE_FONT_H
#include <stdint.h>
typedef struct {
  uint32_t offset;
  int width, height, left, top, advance;
} NativeGlyph;
typedef struct {
  int size, baseline;
  const uint8_t *coverage;
  const NativeGlyph *glyphs;
} NativeFont;
extern const NativeFont portable_fonts[4];
#define LAB_FONT_COUNT 21
extern const NativeFont lab_fonts[LAB_FONT_COUNT];
#define LAB_HEADING_FONT_COUNT 13
extern const NativeFont lab_heading_fonts[LAB_HEADING_FONT_COUNT];
extern const NativeFont lab_heading_narrow_fonts[LAB_HEADING_FONT_COUNT];
int native_text_width(const NativeFont *font, const char *text);
void native_text_row(const NativeFont *font, const char *text, int x, int y,
                     unsigned row_y, unsigned width, uint8_t *pixels, int mono,
                     const uint8_t color[3]);
#endif
