#ifndef SELECTED_LAB_ACTION_VIEW_H
#define SELECTED_LAB_ACTION_VIEW_H
#include "selected_lab.h"
#include "../ui/lab_action_view.h"
int selected_lab_is_action_page(SelectedPage page);
int selected_lab_action_projection(const SelectedLab *lab,
    int normalization_pending, LabActionView *out);
#endif
