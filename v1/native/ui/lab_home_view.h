#ifndef CRITTER_LAB_HOME_VIEW_H
#define CRITTER_LAB_HOME_VIEW_H
#include <stdint.h>
#include "lab_resident_gallery_view.h"

typedef enum {
  LAB_HOME_ART_NONE, LAB_HOME_ART_EXPLORE, LAB_HOME_ART_RESEARCH,
  LAB_HOME_ART_INCUBATOR, LAB_HOME_ART_HABITAT, LAB_HOME_ART_SAMPLE,
  LAB_HOME_ART_PIP_PLAIN, LAB_HOME_ART_PIP_MARKED, LAB_HOME_ART_PENDING
} LabHomeArt;

/* Copied presentation only. Stock and amounts are displayed whole units;
 * projection retains the existing singular/plural wording separately. */
typedef struct {
  unsigned focus;
  uint32_t stock[3];
  char stock_units[3][8];
  char title[48];
  struct {
    char name[24], status[64], detail[2][96];
  } overview[4];
  struct {
    char heading[128], body[128], details[2][128], strip[160];
    LabHomeArt art;
    unsigned show_resources, primary_resources;
    uint32_t amounts[3];
    unsigned show_progress;
    uint32_t progress, total;
  } landing;
  char footer[192], warning[160];
  int pressed, suspended;
  LabResidentGalleryView gallery;
} LabHomeView;
#endif
