#ifndef CRITTER_UI_THEME_H
#define CRITTER_UI_THEME_H
#include "lvgl.h"
/* LVGL retains these arrays; the owning UI context outlives every line. */
typedef struct {
  lv_obj_t *object, *depth, *edge, *leading;
  lv_point_precise_t contour[21], highlight[7];
} NativeUiFrame;
int native_ui_frame_init(NativeUiFrame *frame, lv_obj_t *parent,
                          int width, int height, uint32_t color);
void native_ui_frame_size(NativeUiFrame *frame, int width, int height);
void native_ui_frame_opacity(NativeUiFrame *frame, lv_opa_t opacity);
void native_ui_surface(lv_obj_t *object, uint32_t fill, uint32_t border, unsigned border_width);
void native_ui_text(lv_obj_t *object, const lv_font_t *font, uint32_t color);
void native_ui_action(lv_obj_t *object);
#endif
