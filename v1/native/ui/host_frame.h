#ifndef CRITTER_UI_HOST_FRAME_H
#define CRITTER_UI_HOST_FRAME_H
#include "display.h"
typedef struct {
  UiDisplayProfile profile;
  uint8_t *rgb;
} UiHostFrame;
int ui_host_frame_init(UiHostFrame *frame, const UiDisplayProfile *profile);
void ui_host_frame_destroy(UiHostFrame *frame);
UiFlushResult ui_host_frame_flush(void *user, UiDisplay *display,
    const UiArea *area, const uint8_t *pixels, size_t stride, UiColorFormat format);
/* Four-gray quantization is an export transport operation, after LVGL draws. */
const uint8_t *ui_host_frame_rgb(UiHostFrame *frame, int four_gray);
#endif
