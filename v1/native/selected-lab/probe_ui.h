#ifndef CRITTER_PROBE_UI_H
#define CRITTER_PROBE_UI_H
#include "../ui/companion_probe_view.h"
#include "ui_assets.h"
typedef struct NativeProbeUi NativeProbeUi;
NativeProbeUi *native_probe_ui_create(lv_obj_t *parent, lv_group_t *group,
                                      const lv_font_t *body, const lv_font_t *place, const lv_font_t *small,
                                      const lv_font_t *action, const NativeUiImage *sample);
void native_probe_ui_destroy(NativeProbeUi *ui);
void native_probe_ui_hide(NativeProbeUi *ui);
int native_probe_ui_update(NativeProbeUi *ui, const CompanionProbeView *view);
#endif
