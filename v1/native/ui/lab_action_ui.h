#ifndef CRITTER_LAB_ACTION_UI_H
#define CRITTER_LAB_ACTION_UI_H
#include "lab_action_view.h"
#include "lab_home_ui.h"
typedef struct LabActionUi LabActionUi;
/* Images share Home's13 assets. Chamber states may use the current provisional
 * vessel until a separately reviewed three-state source is integrated. */
LabActionUi *lab_action_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[13]);
int lab_action_ui_update(LabActionUi *ui, const LabActionView *view);
void lab_action_ui_hide(LabActionUi *ui);
void lab_action_ui_destroy(LabActionUi *ui);
#endif
