#ifndef CRITTER_UI_COMPANION_PROBE_VIEW_H
#define CRITTER_UI_COMPANION_PROBE_VIEW_H
#include "companion_cargo_view.h"
#include "expedition_view.h"

enum {
  PROBE_ENTRY, PROBE_MAP, PROBE_SITE, PROBE_SENT, PROBE_ENDED,
  PROBE_RETAINED, PROBE_UNAVAILABLE
};
typedef struct {
  ExpeditionFieldView field;
  CompanionCargoFacts cargo;
  unsigned phase, selector, failed, suspended, held, pressed, revision, epoch;
  unsigned action_count, focus, active_mode, resident_count;
  unsigned finite, result, free_slots, choices[3];
  /* Presentation material:0 none,1 Data,2 Energy,3 Essence. Domain owns mapping. */
  unsigned choice_material[3];
  char title[64], status[96], context[96], source[96], footer[96];
  char actions[3][64], mode_detail[3][96];
} CompanionProbeView;
unsigned probe_path_neighbors(const ExpeditionMapView *map, unsigned cell);
void probe_camera(const ExpeditionMapView *map, int width, int height, int *x, int *y);
#endif
