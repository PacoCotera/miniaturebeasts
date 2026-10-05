#ifndef CRITTER_UI_EXPEDITION_VIEW_H
#define CRITTER_UI_EXPEDITION_VIEW_H
#include <stdint.h>

/* Copied presentation data only. These structures are never persisted. */
enum {
  EXPEDITION_MAP_COLUMNS = 20,
  EXPEDITION_MAP_ROWS = 11,
  EXPEDITION_MAP_CELLS = 220,
  EXPEDITION_SITE_COUNT = 5,
  EXPEDITION_VIEW_ACTIONS = 5,
  EXPEDITION_VIEW_RECORDS = 16
};
enum {
  EXPEDITION_TERRAIN_EMPTY,
  EXPEDITION_TERRAIN_GRASS,
  EXPEDITION_TERRAIN_TREE,
  EXPEDITION_TERRAIN_STONE,
  EXPEDITION_TERRAIN_WATER
};
enum { EXPEDITION_PAGE_MAP, EXPEDITION_PAGE_SITE };
enum {
  EXPEDITION_PREP_NOT_STARTED,
  EXPEDITION_PREP_ACTIVE,
  EXPEDITION_PREP_PAUSED,
  EXPEDITION_PREP_FINISHED,
  EXPEDITION_PREP_CAPACITY_FULL
};

typedef struct {
  uint8_t terrain[EXPEDITION_MAP_CELLS];
  uint8_t paths[EXPEDITION_MAP_CELLS], walked[EXPEDITION_MAP_CELLS];
  uint8_t site_x[EXPEDITION_SITE_COUNT], site_y[EXPEDITION_SITE_COUNT];
  uint8_t site_visible[EXPEDITION_SITE_COUNT], site_visited[EXPEDITION_SITE_COUNT];
  uint8_t site_inspected[EXPEDITION_SITE_COUNT], site_active[EXPEDITION_SITE_COUNT];
  uint8_t site_collected[EXPEDITION_SITE_COUNT];
  uint8_t avatar_visible, avatar_x, avatar_y;
} ExpeditionMapView;

typedef struct {
  ExpeditionMapView map;
  unsigned page, current_site;
  char location[64], outing_id[64], route[40];
  uint32_t earned[3], preparation_ms[3], preparation_status[3];
  uint32_t remaining_chances[3], capsule_count, capsule_capacity;
  /* Delivery evidence is immutable history, never current hold usage. */
  uint32_t sent[3], sent_capsule_count;
  unsigned delivery_accepted;
  char source_name[3][32];
  unsigned action_count, focus;
  char actions[EXPEDITION_VIEW_ACTIONS][64], message[96];
} ExpeditionFieldView;

typedef struct {
  ExpeditionMapView map;
  unsigned detail, selected, record_count;
  char record_labels[EXPEDITION_VIEW_RECORDS][64];
  char outing_id[64], received_label[64], sample_id[40];
  uint64_t accepted_at;
  uint32_t accepted[3];
  uint8_t trace_inspected, sample_collected;
  char message[96];
} ExpeditionReceivedView;

#endif
