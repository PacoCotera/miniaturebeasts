#ifndef CRITTER_UI_DISPLAY_H
#define CRITTER_UI_DISPLAY_H
#include "lvgl.h"
#include <stddef.h>
#include <stdint.h>

/* RGB888 names the LVGL format; its little-endian memory order is B,G,R. */
typedef enum { UI_COLOR_RGB888 } UiColorFormat;
typedef struct {
  unsigned width, height, draw_rows;
  UiColorFormat format;
} UiDisplayProfile;
typedef struct { int x1, y1, x2, y2; } UiArea;
typedef struct UiDisplay UiDisplay;
typedef enum { UI_FLUSH_FAILED, UI_FLUSH_COMPLETE, UI_FLUSH_PENDING } UiFlushResult;
typedef UiFlushResult (*UiFlushSink)(void *user, UiDisplay *display,
    const UiArea *area, const uint8_t *pixels, size_t stride, UiColorFormat format);

size_t ui_display_buffer_size(const UiDisplayProfile *profile);
UiDisplay *ui_display_create(const UiDisplayProfile *profile, void *buffer,
    size_t buffer_size, UiFlushSink sink, void *user);
/* A pending asynchronous sink must complete before destruction. */
int ui_display_destroy(UiDisplay *display);
lv_display_t *ui_display_lvgl(UiDisplay *display);
int ui_display_failed(const UiDisplay *display);
int ui_display_pending(const UiDisplay *display);
void ui_display_flush_complete(UiDisplay *display, int success);
/* Validates the same boundary as LVGL's callback; useful to transport adapters. */
int ui_display_validate(const UiDisplayProfile *profile, const UiArea *area,
    size_t stride, size_t bytes, UiColorFormat format);
/* Visibility is a target/presenter acknowledgement, never flush completion. */
void ui_display_mark_visible(UiDisplay *display, unsigned revision, unsigned epoch);
int ui_display_visible(const UiDisplay *display, unsigned *revision, unsigned *epoch);
unsigned ui_display_count(void);
#endif
