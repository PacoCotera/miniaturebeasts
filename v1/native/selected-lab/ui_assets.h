#ifndef CRITTER_UI_ASSETS_H
#define CRITTER_UI_ASSETS_H
#include "lvgl.h"
#include "core_art.h"
#include "native_font.h"
typedef struct {
  lv_image_dsc_t image;
  uint8_t *pixels;
} NativeUiImage;
int native_ui_image_init(NativeUiImage *image, CoreArtId id);
int native_ui_image_from_sprite(NativeUiImage *image, const CoreArtSprite *sprite);
void native_ui_image_destroy(NativeUiImage *image);
void native_ui_font_init(lv_font_t *font, const NativeFont *source);
#endif
