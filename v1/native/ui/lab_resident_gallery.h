#ifndef CRITTER_LAB_RESIDENT_GALLERY_H
#define CRITTER_LAB_RESIDENT_GALLERY_H
#include "lab_resident_gallery_view.h"
#include "ui_theme.h"

/* One lightweight object per existing parent; descriptors outlive the parent. */
typedef struct {
  lv_obj_t *object;
  const lv_image_dsc_t *plain, *marked;
  const lv_font_t *font;
  LabResidentGalleryView view;
  int active;
} LabResidentGallery;

int lab_resident_gallery_init(LabResidentGallery *gallery, lv_obj_t *parent,
    const lv_font_t *font, const lv_image_dsc_t *plain,
    const lv_image_dsc_t *marked);
int lab_resident_gallery_update(LabResidentGallery *gallery,
    const LabResidentGalleryView *view, int active);
void lab_resident_gallery_hide(LabResidentGallery *gallery);
#endif
