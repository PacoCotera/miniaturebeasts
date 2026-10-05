#ifndef CRITTER_LAB_CORE_ART_H
#define CRITTER_LAB_CORE_ART_H
#include <stdint.h>

/* Straight RGBA, exact native footprint; no view/domain computation. */
typedef struct {
  const char *name;
  unsigned width;
  unsigned height;
  const uint8_t *rgba;
  const char *source_id;
  const char *source_sha256;
  unsigned center_x;
  unsigned center_y;
} CoreArtSprite;

typedef enum {
  CORE_ART_DATA_COMPACT,
  CORE_ART_ENERGY_COMPACT,
  CORE_ART_ESSENCE_COMPACT,
  CORE_ART_DATA_PRIMARY,
  CORE_ART_ENERGY_PRIMARY,
  CORE_ART_ESSENCE_PRIMARY,
  CORE_ART_CROWN_REFERENCE,
  CORE_ART_EYE_RING_REFERENCE,
  CORE_ART_SAMPLE_NEUTRAL,
  CORE_ART_PIP_PLAIN,
  CORE_ART_PIP_MARKED,
  CORE_ART_DATA_MONO,
  CORE_ART_ENERGY_MONO,
  CORE_ART_ESSENCE_MONO,
  CORE_ART_RESIDENTS_MONO,
  CORE_ART_SAMPLES_MONO,
  CORE_ART_INCUBATING_MONO,
  CORE_ART_LINK_MONO,
  CORE_ART_PROBE_PLACE,
  CORE_ART_RESEARCH_INHERITANCE,
  CORE_ART_RESEARCH_MOVEMENT,
  CORE_ART_RESEARCH_EFFORT,
  CORE_ART_COUNT
} CoreArtId;

/* Composition candidates; actual frame/focus fidelity still needs review. */
#define CORE_ART_GRAPHITE_RGB 0x1e282fu
#define CORE_ART_FIELD_RGB 0x202b32u
#define CORE_ART_SHADOW_RGB 0x0b1821u
#define CORE_ART_BLUE_RGB 0x2389c6u
#define CORE_ART_BLUE_HIGHLIGHT_RGB 0x67cef5u
#define CORE_ART_INK_RGB 0xd5e0e3u
#define CORE_ART_SECONDARY_RGB 0xa5b6bdu
#define CORE_ART_FOCUS_RGB 0xf1cd79u
#define CORE_ART_SAVED_RGB 0xa3cda8u

extern const CoreArtSprite core_art_sprites[CORE_ART_COUNT];
const CoreArtSprite *core_art_sprite(CoreArtId id);

#endif
