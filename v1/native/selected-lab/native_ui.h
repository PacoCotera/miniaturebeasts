#ifndef CRITTER_NATIVE_UI_H
#define CRITTER_NATIVE_UI_H
#include "cargo_view.h"
#include "../ui/lab_home_view.h"
#include "../ui/lab_reception_view.h"
#include "../ui/lab_research_view.h"
#include "../ui/lab_action_view.h"
#include "probe_view.h"
#include "resident_view.h"
#include "../ui/dock_view.h"

typedef struct NativeUiContext NativeUiContext;
NativeUiContext *native_ui_create(void);
NativeUiContext *native_ui_create_device(unsigned device);
int kit_dock_projection(const DeviceKit *kit, DockView *view);
void native_ui_destroy(NativeUiContext *context);
/* Retained UI exports RGB888 frames; NULL means failure. */
const uint8_t *native_ui_cargo(NativeUiContext *context,
                               const CompanionCargoView *view, int still);
const uint8_t *native_ui_probe(NativeUiContext *context, const CompanionProbeView *view);
const uint8_t *native_ui_resident(NativeUiContext *context, const CompanionResidentView *view);
const uint8_t *native_ui_dock(NativeUiContext *context, const DockView *view);
const uint8_t *native_ui_home(NativeUiContext *context, const LabHomeView *view);
const uint8_t *native_ui_reception(NativeUiContext *context, const LabReceptionView *view);
const uint8_t *native_ui_research(NativeUiContext *context, const LabResearchView *view);
/* Native reference calibration only; requires the retained Research tree. */
int native_ui_research_reference_scale(NativeUiContext *context, unsigned scale);
const uint8_t *native_ui_actions(NativeUiContext *context, const LabActionView *view);
/* Controlled proof clock only: no game tick or input acknowledgement.
 * Advancement is refused while another context exists: LVGL's clock is global. */
void native_ui_advance(NativeUiContext *context, unsigned milliseconds);
void native_ui_cancel(NativeUiContext *context);
int native_ui_animation_pending(const NativeUiContext *context);
int kit_bmp_ui(const DeviceKit *kit, unsigned device, FILE *output,
               NativeUiContext *context, int still);
#endif
