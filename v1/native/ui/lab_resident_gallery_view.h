#ifndef CRITTER_LAB_RESIDENT_GALLERY_VIEW_H
#define CRITTER_LAB_RESIDENT_GALLERY_VIEW_H
#include <stdint.h>

enum { LAB_RESIDENT_GALLERY_CAPACITY = 8 };
typedef enum {
  LAB_RESIDENT_PORTRAIT_NONE, LAB_RESIDENT_PORTRAIT_PLAIN,
  LAB_RESIDENT_PORTRAIT_MARKED, LAB_RESIDENT_PORTRAIT_PENDING
} LabResidentPortrait;

/* Revealed saved identities and permitted original artwork, never a genome. */
typedef struct {
  unsigned count, selected;
  struct {
    char id[40];
    LabResidentPortrait portrait;
  } entries[LAB_RESIDENT_GALLERY_CAPACITY];
  char form_title[96], source_sample_id[40];
  uint32_t visits;
} LabResidentGalleryView;

int lab_resident_gallery_view_valid(const LabResidentGalleryView *view);
#endif
