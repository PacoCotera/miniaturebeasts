#ifndef CRITTER_LAB_RECEPTION_VIEW_H
#define CRITTER_LAB_RECEPTION_VIEW_H
#include "expedition_view.h"
#include <stdint.h>

typedef enum {
  LAB_RECEPTION_ARRIVAL,
  LAB_RECEPTION_LOG_LIST,
  LAB_RECEPTION_LOG_DETAIL,
  LAB_RECEPTION_LOG_EMPTY
} LabReceptionMode;

/* Copied presentation facts only. Stock and incoming are whole display units;
 * incoming is current source cargo and becomes zero on world acceptance.
 * Historical delivered amounts belong only to received records/journal.
 * Received map data contains only the existing sanitized history projection. */
typedef struct {
  LabReceptionMode mode;
  uint32_t stock[3], incoming[3];
  char incoming_title[48], status[128], hint[128], sample[128];
  char footer[192], warning[160];
  int can_accept, pressed, suspended;
  ExpeditionReceivedView received;
} LabReceptionView;

#endif
