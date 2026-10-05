#ifndef CRITTER_LAB_FIELD_ART_H
#define CRITTER_LAB_FIELD_ART_H
#include "core_art.h"
#define FIELD_ART_HAS_BRIDGE 0

/* Immutable 32px presentation assets; N=1, E=2, S=4, W=8 path bits come only from permitted paths. */
typedef enum {
  FIELD_ART_GRASS_A,
  FIELD_ART_GRASS_B,
  FIELD_ART_MOSS,
  FIELD_ART_WATER,
  FIELD_ART_STONE,
  FIELD_ART_SHRUB,
  FIELD_ART_TREE,
  FIELD_ART_BOULDER,
  FIELD_ART_PATH_0,
  FIELD_ART_PATH_1,
  FIELD_ART_PATH_2,
  FIELD_ART_PATH_3,
  FIELD_ART_PATH_4,
  FIELD_ART_PATH_5,
  FIELD_ART_PATH_6,
  FIELD_ART_PATH_7,
  FIELD_ART_PATH_8,
  FIELD_ART_PATH_9,
  FIELD_ART_PATH_10,
  FIELD_ART_PATH_11,
  FIELD_ART_PATH_12,
  FIELD_ART_PATH_13,
  FIELD_ART_PATH_14,
  FIELD_ART_PATH_15,
  FIELD_ART_CAMP,
  FIELD_ART_RELAY,
  FIELD_ART_STONE_SHELF,
  FIELD_ART_MOSS_BEND,
  FIELD_ART_CACHE,
  FIELD_ART_COUNT
} FieldArtId;

/* PATH_0 is ordinary ground fallback, not invented isolated walkability. */
extern const CoreArtSprite field_art_sprites[FIELD_ART_COUNT];
const CoreArtSprite *field_art_sprite(FieldArtId id);

#endif
