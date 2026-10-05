#include "ui_assets.h"
#include <stdlib.h>
#include <string.h>

int native_ui_image_init(NativeUiImage *image, CoreArtId id) {
  return native_ui_image_from_sprite(image, core_art_sprite(id));
}
int native_ui_image_from_sprite(NativeUiImage *image, const CoreArtSprite *source) {
  memset(image, 0, sizeof(*image));
  if (!source || source->width > 65535 || source->height > 65535)
    return 0;
  unsigned bytes = source->width * source->height * 4;
  image->pixels = malloc(bytes);
  if (!image->pixels)
    return 0;
  /* LVGL ARGB8888 byte storage is B,G,R,A on our little-endian host.
   * This changes channel order only; straight alpha and every pixel survive. */
  for (unsigned offset = 0; offset < bytes; offset += 4) {
    image->pixels[offset] = source->rgba[offset + 2];
    image->pixels[offset + 1] = source->rgba[offset + 1];
    image->pixels[offset + 2] = source->rgba[offset];
    image->pixels[offset + 3] = source->rgba[offset + 3];
  }
  image->image.header.magic = LV_IMAGE_HEADER_MAGIC;
  image->image.header.cf = LV_COLOR_FORMAT_ARGB8888;
  image->image.header.w = source->width;
  image->image.header.h = source->height;
  image->image.header.stride = source->width * 4;
  image->image.data_size = bytes;
  image->image.data = image->pixels;
  return 1;
}
void native_ui_image_destroy(NativeUiImage *image) {
  free(image->pixels);
  memset(image, 0, sizeof(*image));
}
static bool glyph_descriptor(const lv_font_t *font, lv_font_glyph_dsc_t *out,
                              uint32_t letter, uint32_t next) {
  (void)next;
  if (letter < 32 || letter > 126)
    return false;
  const NativeFont *source = font->dsc;
  const NativeGlyph *glyph = &source->glyphs[letter - 32];
  out->gid.index = letter - 32;
  out->adv_w = glyph->advance;
  out->box_w = glyph->width;
  out->box_h = glyph->height;
  out->ofs_x = glyph->left;
  out->ofs_y = source->baseline - glyph->top - glyph->height;
  out->stride = glyph->width;
  out->format = LV_FONT_GLYPH_FORMAT_A8;
  return true;
}
static const void *glyph_bitmap(lv_font_glyph_dsc_t *glyph, lv_draw_buf_t *buffer) {
  (void)buffer;
  const NativeFont *source = glyph->resolved_font->dsc;
  return source->coverage + source->glyphs[glyph->gid.index].offset;
}
void native_ui_font_init(lv_font_t *font, const NativeFont *source) {
  memset(font, 0, sizeof(*font));
  font->dsc = source;
  font->get_glyph_dsc = glyph_descriptor;
  font->get_glyph_bitmap = glyph_bitmap;
  font->line_height = source->size + 4;
  font->base_line = font->line_height - source->baseline;
  font->static_bitmap = 1;
}
