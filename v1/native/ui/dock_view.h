#ifndef CRITTER_UI_DOCK_VIEW_H
#define CRITTER_UI_DOCK_VIEW_H
#include <stdint.h>
typedef struct {
  unsigned page, focus, action_count, revision, epoch;
  int pressed, suspended, online, current, unavailable;
  uint32_t stock[3]; /* Whole accepted supply units, converted by the projection. */
  uint32_t residents, samples, incubations, visits;
  uint64_t world_revision, updated_at;
  char freshness[40], timestamp[80], message[96], actions[3][48];
} DockView;
#endif
