#ifndef CRITTER_CADDY_DOCK_ASSETS_H
#define CRITTER_CADDY_DOCK_ASSETS_H
#include "native_font.h"
enum { CADDY_FONT_TITLE, CADDY_FONT_BODY, CADDY_FONT_SMALL, CADDY_FONT_QUANTITY, CADDY_FONT_COUNT };
extern const NativeFont caddy_fonts[CADDY_FONT_COUNT];
extern const unsigned caddy_source_rgba_bytes, caddy_font_coverage_bytes;
#endif
