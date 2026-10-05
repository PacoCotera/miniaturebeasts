#ifndef SELECTED_LAB_OVERVIEW_ASSETS_H
#define SELECTED_LAB_OVERVIEW_ASSETS_H
#include <stdint.h>

enum {
  OVERVIEW_EXPLORE,
  OVERVIEW_RESEARCH,
  OVERVIEW_INCUBATOR,
  OVERVIEW_HABITAT,
  OVERVIEW_SPRITE_COUNT
};
enum { OVERVIEW_SPRITE_WIDTH = 136, OVERVIEW_SPRITE_HEIGHT = 144 };

/* Prepared RGBA pixels at their exact display size, including the opaque
 * backing. Kept separate from legacy RGB reference crops and their inferred
 * matte. */
extern const uint8_t
    overview_pixels[OVERVIEW_SPRITE_COUNT]
                   [OVERVIEW_SPRITE_WIDTH * OVERVIEW_SPRITE_HEIGHT * 4];
#endif
