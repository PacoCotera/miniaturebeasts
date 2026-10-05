#ifndef CRITTER_LAB_ACTION_VIEW_H
#define CRITTER_LAB_ACTION_VIEW_H
#include <stdint.h>
#include "lab_resident_gallery_view.h"

enum { LAB_ACTION_OPTIONS = 8 };
typedef enum {
  LAB_ACTION_CREATE, LAB_ACTION_REVIEW, LAB_ACTION_INCUBATION,
  LAB_ACTION_REVEAL, LAB_ACTION_HABITAT, LAB_ACTION_RESIDENTS
} LabActionPage;
typedef enum {
  LAB_ACTION_CREATE_LOCKED, LAB_ACTION_CREATE_AVAILABLE,
  LAB_ACTION_REVIEW_STALE, LAB_ACTION_REVIEW_VALID,
  LAB_ACTION_INCUBATION_EMPTY, LAB_ACTION_INCUBATION_ACTIVE,
  LAB_ACTION_INCUBATION_READY, LAB_ACTION_RESIDENT_EMPTY,
  LAB_ACTION_RESIDENT_SHOWN
} LabActionDetail;
typedef enum {
  LAB_ACTION_ART_NONE, LAB_ACTION_ART_TOOLS,
  LAB_ACTION_ART_INCUBATOR_EMPTY, LAB_ACTION_ART_INCUBATOR_ACTIVE,
  LAB_ACTION_ART_INCUBATOR_READY, LAB_ACTION_ART_PLAIN,
  LAB_ACTION_ART_MARKED, LAB_ACTION_ART_PENDING
} LabActionArt;
/* Copied presentation facts only; no game, input or ownership authority. */
typedef struct {
  LabActionPage page;
  LabActionDetail detail;
  LabActionArt art;
  unsigned focus, option_count;
  char options[LAB_ACTION_OPTIONS][128];
  char title[64], sample_id[40], resident_id[40], source_sample_id[40];
  char form_title[96], reference_id[48], heading[96], body[128];
  char known[160], missing[160], next[112], message[96];
  char coat[64], features[96];
  unsigned stock[3], costs[3], elapsed_ms, duration_ms, visits;
  uint8_t candidate_authorized, draft_valid, resident_visible;
  uint8_t storage_error, suspended;
  LabResidentGalleryView gallery;
} LabActionView;
#endif
