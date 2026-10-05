#ifndef CRITTER_LAB_RECEPTION_UI_H
#define CRITTER_LAB_RECEPTION_UI_H
#include "lab_reception_view.h"
#include "lab_home_ui.h"
typedef struct LabReceptionUi LabReceptionUi;
/* Three primary resources, neutral sample, three compact resources;
 * original 32px field descriptors. All descriptors have borrowed lifetimes. */
LabReceptionUi *lab_reception_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const materials[7],
    const lv_image_dsc_t *const field[29]);
int lab_reception_ui_update(LabReceptionUi *ui, const LabReceptionView *view);
void lab_reception_ui_hide(LabReceptionUi *ui);
void lab_reception_ui_destroy(LabReceptionUi *ui);
#endif
