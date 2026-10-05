#ifndef CRITTER_COMPANION_CARGO_UI_H
#define CRITTER_COMPANION_CARGO_UI_H
#include "companion_cargo_view.h"
#include "lvgl.h"

typedef struct CompanionCargoUi CompanionCargoUi;
typedef struct {
  const lv_font_t *title, *body, *small, *quantity, *action;
} CompanionCargoFonts;

/* Fonts/images and the parent/group remain owned by the caller. */
CompanionCargoUi *companion_cargo_ui_create(lv_obj_t *parent, lv_group_t *actions,
    const CompanionCargoFonts *fonts, const lv_image_dsc_t *const images[4]);
int companion_cargo_ui_update(CompanionCargoUi *ui, const CompanionCargoView *view, int still);
void companion_cargo_ui_hide(CompanionCargoUi *ui);
void companion_cargo_ui_cancel(CompanionCargoUi *ui);
void companion_cargo_ui_advance(CompanionCargoUi *ui, unsigned milliseconds);
int companion_cargo_ui_animation_pending(const CompanionCargoUi *ui);
void companion_cargo_ui_destroy(CompanionCargoUi *ui);
#endif
