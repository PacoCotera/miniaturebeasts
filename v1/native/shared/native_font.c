#include "native_font.h"
static unsigned glyph_index(unsigned char character) {
  return character >= 32 && character <= 126 ? character - 32 : '?' - 32;
}
int native_text_width(const NativeFont *font, const char *text) {
  int width = 0;
  for (; *text; ++text)
    width += font->glyphs[glyph_index((unsigned char)*text)].advance;
  return width;
}
void native_text_row(const NativeFont *font, const char *text, int x, int y,
                     unsigned row_y, unsigned width, uint8_t *pixels,
                     int mono, const uint8_t color[3]) {
  for (; *text; ++text) {
    const NativeGlyph *glyph = &font->glyphs[glyph_index((unsigned char)*text)];
    int glyph_y = (int)row_y - y - glyph->top;
    if (glyph_y >= 0 && glyph_y < glyph->height) {
      for (int column = 0; column < glyph->width; ++column) {
        int destination = x + glyph->left + column;
        if (destination < 0 || destination >= (int)width)
          continue;
        unsigned alpha =
            font->coverage[glyph->offset + glyph_y * glyph->width + column];
        if (mono) {
          if (alpha >= 128)
            pixels[(unsigned)destination / 8] |= (uint8_t)(0x80u >> (destination % 8));
        } else {
          uint8_t *pixel = pixels + destination * 3;
          for (unsigned channel = 0; channel < 3; ++channel)
            pixel[channel] = (uint8_t)((color[channel] * alpha +
                pixel[channel] * (255 - alpha) + 127) / 255);
        }
      }
    }
    x += glyph->advance;
  }
}
