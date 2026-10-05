#include "display.h"
#include "dock_ui.h"
#include "dock_assets.h"
#include "ui_assets.h"
#include "sdkconfig.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include <stdlib.h>
#include <string.h>

#if !CONFIG_IDF_TARGET_ESP32S3
#error "This bounded compile proof targets the established ESP32-S3 toolchain."
#endif

static const char *tag = "caddy_ui_headless";
typedef struct {
  UiDisplayProfile profile;
  size_t buffer_size, flushes, pixels, bytes, maximum_flush_bytes;
  unsigned gray_levels[4];
  uint32_t checksum;
} FlushCounters;

/* Consume a validated partial area without retaining a full-screen image.
 * Gray counting is transport-side evidence, never a manual UI composition. */
static UiFlushResult headless_flush(void *user, UiDisplay *display,
    const UiArea *area, const uint8_t *pixels, size_t stride, UiColorFormat format) {
  (void)display;
  FlushCounters *counters = user;
  if (!pixels || !ui_display_validate(&counters->profile, area, stride,
      counters->buffer_size, format)) return UI_FLUSH_FAILED;
  unsigned width = (unsigned)(area->x2 - area->x1 + 1);
  unsigned height = (unsigned)(area->y2 - area->y1 + 1);
  size_t bytes = stride * height;
  ++counters->flushes;
  counters->pixels += (size_t)width * height;
  counters->bytes += bytes;
  if (bytes > counters->maximum_flush_bytes) counters->maximum_flush_bytes = bytes;
  for (unsigned row = 0; row < height; ++row) {
    const uint8_t *source = pixels + row * stride;
    for (unsigned column = 0; column < width; ++column) {
      const uint8_t *pixel = source + column * 3;
      unsigned luminance = (54u * pixel[2] + 183u * pixel[1] + 19u * pixel[0] + 128u) / 256u;
      ++counters->gray_levels[(luminance + 42u) / 85u];
      for (unsigned channel = 0; channel < 3; ++channel)
        counters->checksum = (counters->checksum ^ pixel[channel]) * 16777619u;
    }
  }
  /* Discarding these bytes is complete. No panel exists or becomes visible. */
  return UI_FLUSH_COMPLETE;
}
static int render_fixture(DockUi *ui, UiDisplay *display, FlushCounters *counters,
                           const DockView *view, const char *name) {
  size_t previous_flushes = counters->flushes;
  if (!dock_ui_update(ui, view)) return 0;
  lv_refr_now(ui_display_lvgl(display));
  if (ui_display_failed(display) || ui_display_pending(display) ||
      ui_display_visible(display, NULL, NULL)) return 0;
  ESP_LOGI(tag, "fixture=%s page=%u focus=%u flushes=%zu checksum=%08lx visible=0",
      name, view->page, view->focus, counters->flushes - previous_flushes,
      (unsigned long)counters->checksum);
  return 1;
}
void app_main(void) {
  ESP_LOGI(tag, "Current shared Dock LVGL9.6.0 / ESP32-S3 / headless fixtures only");
  FlushCounters counters = {.profile = {792, 272, 8, UI_COLOR_RGB888},
                             .checksum = 2166136261u};
  counters.buffer_size = ui_display_buffer_size(&counters.profile);
  void *draw_buffer = malloc(counters.buffer_size);
  UiDisplay *display = NULL;
  DockUi *ui = NULL;
  NativeUiImage images[6] = {0};
  lv_font_t fonts[CADDY_FONT_COUNT];
  int success = 0;
  if (!draw_buffer) goto cleanup;
  display = ui_display_create(&counters.profile, draw_buffer, counters.buffer_size,
                               headless_flush, &counters);
  if (!display) goto cleanup;
  for (unsigned font = 0; font < CADDY_FONT_COUNT; ++font)
    native_ui_font_init(&fonts[font], &caddy_fonts[font]);
  const CoreArtId icon_ids[] = {CORE_ART_RESIDENTS_MONO, CORE_ART_SAMPLES_MONO,
      CORE_ART_INCUBATING_MONO, CORE_ART_DATA_MONO, CORE_ART_ENERGY_MONO, CORE_ART_ESSENCE_MONO};
  const lv_image_dsc_t *icons[6];
  for (unsigned icon = 0; icon < 6; ++icon) {
    if (!native_ui_image_init(&images[icon], icon_ids[icon])) goto cleanup;
    icons[icon] = &images[icon].image;
  }
  ui = dock_ui_create(lv_display_get_screen_active(ui_display_lvgl(display)),
      &fonts[CADDY_FONT_TITLE], &fonts[CADDY_FONT_BODY], &fonts[CADDY_FONT_SMALL],
      &fonts[CADDY_FONT_QUANTITY], icons);
  if (!ui) goto cleanup;
  DockView view = {.page = 0, .focus = 0, .action_count = 3,
      .revision = 1, .epoch = 1, .online = 1, .current = 1,
      .stock = {38, 12, 14}, .residents = 2, .samples = 3, .incubations = 1, .visits = 7,
      .world_revision = 1, .updated_at = 1};
  strcpy(view.freshness, "Synced (simulation)");
  strcpy(view.timestamp, "Snapshot 12:00:00 Mexico City");
  strcpy(view.actions[0], "World");
  strcpy(view.actions[1], "Supplies");
  strcpy(view.actions[2], "Connections");
  const char *names[] = {"world", "supplies", "connections"};
  for (unsigned focus = 0; focus < 3; ++focus) {
    view.focus = focus;
    if (!render_fixture(ui, display, &counters, &view, names[focus])) goto cleanup;
  }
  view.page = 1;
  view.focus = 0;
  strcpy(view.timestamp, "OK: Back / Snapshot 12:00:00 Mexico City");
  if (!render_fixture(ui, display, &counters, &view, "world-open")) goto cleanup;
  view.page = 2;
  view.action_count = 2;
  strcpy(view.actions[0], "Print preview (simulation)");
  strcpy(view.actions[1], "Cancel");
  for (unsigned focus = 0; focus < 2; ++focus) {
    view.focus = focus;
    if (!render_fixture(ui, display, &counters, &view, focus ? "print-cancel" : "print-review")) goto cleanup;
  }
  view.page = 0;
  view.focus = 2;
  view.action_count = 3;
  strcpy(view.actions[0], "World");
  strcpy(view.actions[1], "Supplies");
  view.online = view.current = 0;
  strcpy(view.freshness, "Offline / cached");
  strcpy(view.timestamp, "Snapshot 12:00:00 Mexico City / stale");
  if (!render_fixture(ui, display, &counters, &view, "offline-connections")) goto cleanup;
  view.unavailable = 1;
  view.focus = 0;
  strcpy(view.freshness, "Unavailable / cached");
  strcpy(view.message, "Storage unavailable; last snapshot retained.");
  if (!render_fixture(ui, display, &counters, &view, "storage-error")) goto cleanup;
  lv_mem_monitor_t warm, final;
  lv_mem_monitor(&warm);
  for (unsigned update = 0; update < 20; ++update)
    if (!render_fixture(ui, display, &counters, &view, "retained-update")) goto cleanup;
  lv_mem_monitor(&final);
  if (warm.free_size != final.free_size || !counters.flushes ||
      counters.maximum_flush_bytes > counters.buffer_size) goto cleanup;
  ESP_LOGI(tag, "LVGL pool used=%zu peak=%zu free=%zu total=%zu",
      final.total_size - final.free_size, final.max_used, final.free_size, final.total_size);
  ESP_LOGI(tag, "partial buffer=%zu maxflush=%zu calls=%zu pixels=%zu consumedbytes=%zu",
      counters.buffer_size, counters.maximum_flush_bytes, counters.flushes, counters.pixels, counters.bytes);
  ESP_LOGI(tag, "sourceRGBA=%u convertedARGB=%u glyphcoverage=%u hostframe=0 bytes",
      caddy_source_rgba_bytes, caddy_source_rgba_bytes, caddy_font_coverage_bytes);
  ESP_LOGI(tag, "internal8bit free=%zu largest=%zu minfree=%zu",
      heap_caps_get_free_size(MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT),
      heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT),
      heap_caps_get_minimum_free_size(MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT));
  ESP_LOGI(tag, "transport gray counters=%u/%u/%u/%u; no visible-frame acknowledgement",
      counters.gray_levels[0], counters.gray_levels[1], counters.gray_levels[2], counters.gray_levels[3]);
  success = 1;
cleanup:
  dock_ui_destroy(ui);
  ui_display_destroy(display);
  for (unsigned icon = 0; icon < 6; ++icon) native_ui_image_destroy(&images[icon]);
  free(draw_buffer);
  if (!success) ESP_LOGE(tag, "Headless fixture unavailable; no device/game state exists");
  else ESP_LOGI(tag, "Headless fixture complete; panel/input/save/radio/print remain absent");
}
