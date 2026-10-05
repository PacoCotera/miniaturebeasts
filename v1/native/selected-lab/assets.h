#ifndef SELECTED_LAB_ASSETS_H
#define SELECTED_LAB_ASSETS_H
#include <stdint.h>

typedef struct {
  const char *name;
  unsigned width;
  unsigned height;
  const uint8_t *pixels;
} SelectedSprite;

#define SELECTED_SPRITE_COUNT 7
enum {
  SPRITE_DATA, SPRITE_ENERGY, SPRITE_ESSENCE, SPRITE_SAMPLE,
  SPRITE_CROWN, SPRITE_EYE_RING, SPRITE_UNKNOWN
};
extern const SelectedSprite selected_sprites[SELECTED_SPRITE_COUNT];
#endif
