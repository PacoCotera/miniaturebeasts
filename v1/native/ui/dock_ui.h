#ifndef CRITTER_UI_DOCK_UI_H
#define CRITTER_UI_DOCK_UI_H
#include "dock_view.h"
#include "lvgl.h"
typedef struct DockUi DockUi;
/* Fonts and source image descriptors must outlive the retained tree.
 * Icons: residents, samples, incubating, Data, Energy, Essence. */
DockUi *dock_ui_create(lv_obj_t *parent, const lv_font_t *title,
    const lv_font_t *body, const lv_font_t *small, const lv_font_t *quantity,
    const lv_image_dsc_t *const icons[6]);
void dock_ui_destroy(DockUi *ui);
int dock_ui_update(DockUi *ui, const DockView *view);
#endif
