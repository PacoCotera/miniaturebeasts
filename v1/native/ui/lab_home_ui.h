#ifndef CRITTER_LAB_HOME_UI_H
#define CRITTER_LAB_HOME_UI_H
#include "lab_home_view.h"
#include "lvgl.h"
typedef struct LabHomeUi LabHomeUi;
typedef struct {
  const lv_font_t *title, *heading, *status, *body, *small;
} LabHomeFonts;
/* Native-size assets: four destinations, three compact resources, three
 * primary resources, neutral sample, plain resident and marked resident. */
LabHomeUi *lab_home_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[13]);
int lab_home_ui_update(LabHomeUi *ui, const LabHomeView *view);
void lab_home_ui_destroy(LabHomeUi *ui);
void lab_home_ui_hide(LabHomeUi *ui);
#endif
