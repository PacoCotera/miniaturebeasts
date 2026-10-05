#ifndef CRITTER_COMPANION_ASSETS_H
#define CRITTER_COMPANION_ASSETS_H
#include "native_font.h"
#include "core_art.h"
enum { COMPANION_FONT_TITLE, COMPANION_FONT_BODY, COMPANION_FONT_SMALL,
       COMPANION_FONT_QUANTITY, COMPANION_FONT_ACTION, COMPANION_FONT_COUNT };
extern const NativeFont companion_fonts[COMPANION_FONT_COUNT];
extern const CoreArtSprite companion_empty_habitat;
extern const unsigned companion_source_rgba_bytes, companion_font_coverage_bytes;
#endif
