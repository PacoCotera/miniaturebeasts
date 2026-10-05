#include "display.h"
#include <stdlib.h>

struct UiDisplay {
  UiDisplayProfile profile;
  lv_display_t *lvgl;
  UiFlushSink sink;
  void *user;
  size_t buffer_size;
  int failed, pending, visible;
  unsigned revision, epoch;
};
static unsigned display_count;

size_t ui_display_buffer_size(const UiDisplayProfile *profile) {
  if (!profile || !profile->width || !profile->height || !profile->draw_rows ||
      profile->draw_rows > profile->height || profile->width > 32767 ||
      profile->height > 32767 || profile->format != UI_COLOR_RGB888) return 0;
  /* Buffer planning must work before the first lv_init(). Use the configured
   * LVGL alignment rather than its not-yet-initialized draw handlers. */
  size_t alignment = LV_DRAW_BUF_STRIDE_ALIGN;
  size_t stride = ((size_t)profile->width * 3 + alignment - 1) / alignment * alignment;
  return stride * profile->draw_rows;
}
int ui_display_validate(const UiDisplayProfile *profile, const UiArea *area,
    size_t stride, size_t bytes, UiColorFormat format) {
  if (!ui_display_buffer_size(profile) || !area || format != profile->format ||
      area->x1 < 0 || area->y1 < 0 || area->x2 < area->x1 || area->y2 < area->y1 ||
      (unsigned)area->x2 >= profile->width || (unsigned)area->y2 >= profile->height)
    return 0;
  size_t width = (size_t)(area->x2 - area->x1 + 1);
  size_t height = (size_t)(area->y2 - area->y1 + 1);
  return stride >= width * 3 && stride % LV_DRAW_BUF_STRIDE_ALIGN == 0 &&
      stride <= bytes / height;
}
static void flush(lv_display_t *lvgl, const lv_area_t *area, uint8_t *pixels) {
  UiDisplay *display = lv_display_get_user_data(lvgl);
  UiArea copied = {area->x1, area->y1, area->x2, area->y2};
  size_t stride = lv_draw_buf_width_to_stride((unsigned)(area->x2 - area->x1 + 1),
                                             LV_COLOR_FORMAT_RGB888);
  if (display->pending) {
    display->failed = 1;
    return; /* An earlier asynchronous sink still owns the buffer. */
  }
  if (!ui_display_validate(&display->profile, &copied,
      stride, display->buffer_size, display->profile.format)) {
    display->failed = 1;
    lv_display_flush_ready(lvgl);
    return;
  }
  /* Set pending first so a sink may complete synchronously through the API. */
  display->pending = 1;
  UiFlushResult result = display->sink(display->user, display, &copied, pixels,
                                       stride, display->profile.format);
  if (result != UI_FLUSH_PENDING && display->pending)
    ui_display_flush_complete(display, result == UI_FLUSH_COMPLETE);
}
UiDisplay *ui_display_create(const UiDisplayProfile *profile, void *buffer,
    size_t buffer_size, UiFlushSink sink, void *user) {
  size_t required = ui_display_buffer_size(profile);
  if (!required || !buffer || buffer_size < required || buffer_size > UINT32_MAX || !sink)
    return NULL;
  UiDisplay *display = calloc(1, sizeof(*display));
  if (!display) return NULL;
  if (!display_count) lv_init();
  ++display_count;
  display->profile = *profile;
  display->sink = sink;
  display->user = user;
  display->buffer_size = buffer_size;
  display->lvgl = lv_display_create((int)profile->width, (int)profile->height);
  if (!display->lvgl) {
    ui_display_destroy(display);
    return NULL;
  }
  lv_display_set_color_format(display->lvgl, LV_COLOR_FORMAT_RGB888);
  lv_display_set_user_data(display->lvgl, display);
  lv_display_set_buffers(display->lvgl, buffer, NULL, (uint32_t)buffer_size,
                         LV_DISPLAY_RENDER_MODE_PARTIAL);
  lv_display_set_flush_cb(display->lvgl, flush);
  return display;
}
int ui_display_destroy(UiDisplay *display) {
  if (!display) return 1;
  if (display->pending) return 0;
  if (display->lvgl) lv_display_delete(display->lvgl);
  free(display);
  if (--display_count == 0) lv_deinit();
  return 1;
}
lv_display_t *ui_display_lvgl(UiDisplay *display) { return display ? display->lvgl : NULL; }
int ui_display_failed(const UiDisplay *display) { return !display || display->failed; }
int ui_display_pending(const UiDisplay *display) { return display && display->pending; }
void ui_display_flush_complete(UiDisplay *display, int success) {
  if (!display || !display->pending) return;
  display->failed |= !success;
  display->pending = 0;
  lv_display_flush_ready(display->lvgl);
}
void ui_display_mark_visible(UiDisplay *display, unsigned revision, unsigned epoch) {
  if (!display || display->failed || display->pending) return;
  display->revision = revision;
  display->epoch = epoch;
  display->visible = 1;
}
int ui_display_visible(const UiDisplay *display, unsigned *revision, unsigned *epoch) {
  if (!display || !display->visible) return 0;
  if (revision) *revision = display->revision;
  if (epoch) *epoch = display->epoch;
  return 1;
}
unsigned ui_display_count(void) { return display_count; }
