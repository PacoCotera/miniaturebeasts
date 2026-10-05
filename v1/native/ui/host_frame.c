#include "host_frame.h"
#include <stdlib.h>
#include <string.h>
int ui_host_frame_init(UiHostFrame *frame, const UiDisplayProfile *profile) {
  if (!frame || !ui_display_buffer_size(profile)) return 0;
  memset(frame, 0, sizeof(*frame));
  frame->profile = *profile;
  frame->rgb = calloc((size_t)profile->width * profile->height, 3);
  return frame->rgb != NULL;
}
void ui_host_frame_destroy(UiHostFrame *frame) {
  if (!frame) return;
  free(frame->rgb);
  memset(frame, 0, sizeof(*frame));
}
UiFlushResult ui_host_frame_flush(void *user, UiDisplay *display,
    const UiArea *area, const uint8_t *pixels, size_t stride, UiColorFormat format) {
  (void)display;
  UiHostFrame *frame = user;
  if (!frame || !frame->rgb || !pixels || !area) return UI_FLUSH_FAILED;
  size_t height = area->y2 >= area->y1 ? (size_t)(area->y2 - area->y1 + 1) : 0;
  if (!height || stride > SIZE_MAX / height || !ui_display_validate(&frame->profile,
      area, stride, stride * height, format)) return UI_FLUSH_FAILED;
  int width = area->x2 - area->x1 + 1;
  for (int row = area->y1; row <= area->y2; ++row) {
    uint8_t *target = frame->rgb + ((size_t)row * frame->profile.width + area->x1) * 3;
    const uint8_t *source = pixels + (size_t)(row - area->y1) * stride;
    for (int column = 0; column < width; ++column) {
      target[column * 3] = source[column * 3 + 2];
      target[column * 3 + 1] = source[column * 3 + 1];
      target[column * 3 + 2] = source[column * 3];
    }
  }
  return UI_FLUSH_COMPLETE;
}
const uint8_t *ui_host_frame_rgb(UiHostFrame *frame, int four_gray) {
  if (!frame || !frame->rgb) return NULL;
  if (four_gray)
    for (size_t index = 0; index < (size_t)frame->profile.width * frame->profile.height; ++index) {
      uint8_t *pixel = frame->rgb + index * 3;
      unsigned luminance = (54u * pixel[0] + 183u * pixel[1] + 19u * pixel[2] + 128u) / 256u;
      memset(pixel, (int)(((luminance + 42u) / 85u) * 85u), 3);
    }
  return frame->rgb;
}
