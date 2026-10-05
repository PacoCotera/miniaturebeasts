#include "ui_theme.h"
#include "core_art.h"
#include <string.h>

void native_ui_frame_size(NativeUiFrame *frame, int width, int height) {
  /* Three orthogonal 2 px steps form each compact 6 px corner. All coordinates
   * are integer pixels; line caps remain square rather than rounded UI cards. */
  const lv_point_precise_t points[21] = {
    {6,2},{width-7,2},{width-7,4},{width-5,4},{width-5,6},
    {width-3,6},{width-3,height-7},{width-5,height-7},
    {width-5,height-5},{width-7,height-5},{width-7,height-3},
    {6,height-3},{6,height-5},{4,height-5},{4,height-7},
    {2,height-7},{2,6},{4,6},{4,4},{6,4},{6,2}
  };
  memcpy(frame->contour, points, sizeof(points));
  const lv_point_precise_t highlight[7] = {
    {width-7,2},{6,2},{6,4},{4,4},{4,6},{2,6},{2,height-7}
  };
  memcpy(frame->highlight, highlight, sizeof(highlight));
  lv_obj_set_size(frame->object, width, height);
  lv_line_set_points(frame->depth, frame->contour, 21);
  lv_line_set_points(frame->edge, frame->contour, 21);
  lv_line_set_points(frame->leading, frame->highlight, 7);
}
int native_ui_frame_init(NativeUiFrame *frame, lv_obj_t *parent,
                          int width, int height, uint32_t color) {
  memset(frame, 0, sizeof(*frame));
  frame->object = lv_obj_create(parent);
  if (!frame->object) return 0;
  native_ui_surface(frame->object, CORE_ART_FIELD_RGB, color, 0);
  lv_obj_set_style_bg_opa(frame->object, LV_OPA_TRANSP, 0);
  frame->depth = lv_line_create(frame->object);
  frame->edge = lv_line_create(frame->object);
  frame->leading = lv_line_create(frame->object);
  if (!frame->depth || !frame->edge || !frame->leading) return 0;
  lv_obj_t *lines[] = {frame->depth, frame->edge, frame->leading};
  const uint32_t colors[] = {CORE_ART_SHADOW_RGB, color,
                             color == CORE_ART_BLUE_RGB ? CORE_ART_BLUE_HIGHLIGHT_RGB : color};
  const int widths[] = {4, 2, 1};
  for (unsigned index = 0; index < 3; ++index) {
    lv_obj_remove_style_all(lines[index]);
    lv_obj_set_clickable(lines[index], false);
    lv_obj_set_style_line_color(lines[index], lv_color_hex(colors[index]), 0);
    lv_obj_set_style_line_width(lines[index], widths[index], 0);
    lv_obj_set_style_line_rounded(lines[index], false, 0);
    lv_obj_set_pos(lines[index], 0, 0);
  }
  native_ui_frame_size(frame, width, height);
  return 1;
}
void native_ui_frame_opacity(NativeUiFrame *frame, lv_opa_t opacity) {
  lv_obj_set_style_line_opa(frame->depth, opacity, 0);
  lv_obj_set_style_line_opa(frame->edge, opacity, 0);
  lv_obj_set_style_line_opa(frame->leading, opacity, 0);
}
void native_ui_surface(lv_obj_t *object, uint32_t fill, uint32_t border, unsigned border_width) {
  lv_obj_remove_style_all(object);
  lv_obj_set_scrollable(object, false);
  lv_obj_set_clickable(object, false);
  lv_obj_set_style_bg_color(object, lv_color_hex(fill), 0);
  lv_obj_set_style_bg_opa(object, LV_OPA_COVER, 0);
  lv_obj_set_style_border_color(object, lv_color_hex(border), 0);
  lv_obj_set_style_border_width(object, border_width, 0);
  lv_obj_set_style_radius(object, 0, 0);
  lv_obj_set_style_pad_all(object, 0, 0);
}
void native_ui_text(lv_obj_t *object, const lv_font_t *font, uint32_t color) {
  lv_obj_remove_style_all(object);
  lv_obj_set_scrollable(object, false);
  lv_obj_set_clickable(object, false);
  lv_obj_set_style_text_font(object, font, 0);
  lv_obj_set_style_text_color(object, lv_color_hex(color), 0);
  lv_obj_set_style_text_line_space(object, 0, 0);
}
void native_ui_action(lv_obj_t *object) {
  native_ui_surface(object, CORE_ART_SHADOW_RGB, CORE_ART_FIELD_RGB, 0);
  lv_obj_set_style_bg_color(object, lv_color_hex(CORE_ART_FIELD_RGB), LV_STATE_PRESSED);
}
