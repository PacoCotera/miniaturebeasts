#ifndef CRITTER_SELECTED_LAB_HOME_VIEW_H
#define CRITTER_SELECTED_LAB_HOME_VIEW_H
#include "selected_lab.h"
#include "../ui/lab_home_view.h"

int selected_lab_home_view(const SelectedLab *lab,
                           const SelectedLabRenderContext *context,
                           int normalization_pending, LabHomeView *out);
#endif
