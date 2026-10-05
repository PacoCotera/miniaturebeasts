#ifndef CRITTER_COMPANION_RESIDENT_UI_H
#define CRITTER_COMPANION_RESIDENT_UI_H
#include "companion_resident_view.h"
#include "lvgl.h"

typedef struct CompanionResidentUi CompanionResidentUi;
typedef struct {
  const lv_font_t *title, *body, *small, *quantity, *action;
} CompanionResidentFonts;

/* Fonts and current image remain caller-owned until the tree is destroyed or
 * that image is replaced. No input group, callback or game command is attached. */
CompanionResidentUi *companion_resident_ui_create(lv_obj_t *parent,
                                                const CompanionResidentFonts *fonts);
int companion_resident_ui_update(CompanionResidentUi *ui,
    const CompanionResidentView *view, const lv_image_dsc_t *image);
void companion_resident_ui_hide(CompanionResidentUi *ui);
void companion_resident_ui_destroy(CompanionResidentUi *ui);
#endif
