#ifndef CRITTER_SELECTED_LAB_RESEARCH_VIEW_H
#define CRITTER_SELECTED_LAB_RESEARCH_VIEW_H
#include "selected_lab.h"
#include "../ui/lab_research_view.h"
int selected_lab_is_research_page(SelectedPage page);
int selected_lab_research_projection(const SelectedLab *lab,
    int normalization_pending, LabResearchView *out);
#endif
