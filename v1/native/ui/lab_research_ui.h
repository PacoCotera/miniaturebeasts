#ifndef CRITTER_LAB_RESEARCH_UI_H
#define CRITTER_LAB_RESEARCH_UI_H
#include "lab_research_view.h"
#include "lab_home_ui.h"
typedef struct LabResearchUi LabResearchUi;
/* Borrowed immutable art: Home's thirteen images plus inheritance, movement,
 * effort, crown and eye ring. They outlive this tree. */
LabResearchUi *lab_research_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[18]);
int lab_research_ui_update(LabResearchUi *ui, const LabResearchView *view);
/* Presentation calibration only; no device action or domain state. */
int lab_research_ui_reference_scale(LabResearchUi *ui, unsigned scale);
void lab_research_ui_hide(LabResearchUi *ui);
void lab_research_ui_destroy(LabResearchUi *ui);
#endif
