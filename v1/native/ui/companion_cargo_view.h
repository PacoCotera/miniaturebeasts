#ifndef CRITTER_COMPANION_CARGO_VIEW_H
#define CRITTER_COMPANION_CARGO_VIEW_H
#include <stdint.h>

/* Owned presentation facts, independent of a Kit or its lifetime. */
typedef struct {
  uint32_t supplies[3], delivered[3], capsules, capsule_capacity, delivered_capsules;
  unsigned accepted;
  char identity[64];
} CompanionCargoFacts;

typedef enum {
  COMPANION_CARGO_SCREEN, COMPANION_SEND_SCREEN,
  COMPANION_DISCARD_CLASS_SCREEN, COMPANION_DISCARD_QUANTITY_SCREEN,
  COMPANION_DISCARD_REVIEW_SCREEN, COMPANION_FINISH_SCREEN
} CompanionCargoScreen;

typedef struct {
  CompanionCargoScreen screen;
  uint32_t supplies[3], delivered[3], capsules, capsule_capacity, delivered_capsules;
  unsigned phase, accepted, failed, focus, action_count, revision, epoch;
  /* Two visible rows project a potentially longer logical selector. Focus is
   * local to those rows; navigation remains owned by the interaction layer. */
  unsigned logical_focus, first_visible, option_count, selected_resource;
  unsigned active_mode;
  /* Mode browsing is read-only; focus belongs to the mode rail, not actions. */
  unsigned selector;
  int held, pressed, suspended;
  char identity[64], title[40], context[96], capsule[64], detail[192];
  char capacity[96], feedback[96], footer[64], actions[2][64];
} CompanionCargoView;

#endif
