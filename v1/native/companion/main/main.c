#include "display.h"
#include "companion_cargo_ui.h"
#include "companion_resident_ui.h"
#include "probe_ui.h"
#include "companion_assets.h"
#include "ui_assets.h"
#include "sdkconfig.h"
#include "esp_log.h"
#include <stdlib.h>
#include <string.h>

#if !CONFIG_IDF_TARGET_ESP32S3
#error "This compile proof uses the established ESP32-S3 toolchain."
#endif

static const char *tag = "companion_ui_headless";
typedef struct {
  UiDisplayProfile profile;
  size_t buffer_size, flushes, maximum_flush_bytes;
  uint32_t checksum;
} FlushCounters;

/* Transport consumes partial pixels; it never composes UI or retains a frame. */
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
  if (bytes > counters->maximum_flush_bytes) counters->maximum_flush_bytes = bytes;
  for (unsigned row = 0; row < height; ++row)
    for (unsigned column = 0; column < width * 3; ++column)
      counters->checksum = (counters->checksum ^ pixels[row * stride + column]) * 16777619u;
  return UI_FLUSH_COMPLETE;
}

static int refresh(UiDisplay *display, const FlushCounters *counters, const char *name) {
  lv_refr_now(ui_display_lvgl(display));
  if (ui_display_failed(display) || ui_display_pending(display) ||
      ui_display_visible(display, NULL, NULL)) return 0;
  ESP_LOGI(tag, "fixture=%s flushes=%zu checksum=%08lx visible=0", name,
      counters->flushes, (unsigned long)counters->checksum);
  return 1;
}

void app_main(void) {
  ESP_LOGI(tag, "Current shared Companion UI / ESP32-S3 / synthetic headless fixtures");
  FlushCounters counters = {.profile = {450, 600, 8, UI_COLOR_RGB888},
                             .checksum = 2166136261u};
  counters.buffer_size = ui_display_buffer_size(&counters.profile);
  void *draw_buffer = malloc(counters.buffer_size);
  UiDisplay *display = NULL;
  lv_group_t *actions = NULL;
  CompanionCargoUi *cargo = NULL;
  NativeProbeUi *probe = NULL;
  CompanionResidentUi *residents = NULL;
  NativeUiImage images[4] = {0}, portraits[3] = {0};
  lv_font_t fonts[COMPANION_FONT_COUNT];
  int success = 0;
  if (!draw_buffer) goto cleanup;
  display = ui_display_create(&counters.profile, draw_buffer, counters.buffer_size,
                               headless_flush, &counters);
  if (!display) goto cleanup;
  for (unsigned font = 0; font < COMPANION_FONT_COUNT; ++font)
    native_ui_font_init(&fonts[font], &companion_fonts[font]);
  for (unsigned image = 0; image < 4; ++image) {
    CoreArtId id = image == 3 ? CORE_ART_SAMPLE_NEUTRAL : (CoreArtId)(CORE_ART_DATA_PRIMARY + image);
    if (!native_ui_image_init(&images[image], id)) goto cleanup;
  }
  actions = lv_group_create();
  if (!actions) goto cleanup;
  lv_obj_t *screen = lv_display_get_screen_active(ui_display_lvgl(display));
  const lv_image_dsc_t *materials[] = {&images[0].image, &images[1].image, &images[2].image, &images[3].image};
  CompanionCargoFonts cargo_fonts = {&fonts[0], &fonts[1], &fonts[2], &fonts[3], &fonts[4]};
  cargo = companion_cargo_ui_create(screen, actions, &cargo_fonts, materials);
  probe = native_probe_ui_create(screen, actions, &fonts[1], &fonts[0], &fonts[2], &fonts[4], &images[3]);
  if (!cargo || !probe) goto cleanup;
  native_probe_ui_hide(probe);
  CompanionCargoView cargo_view = {.supplies = {3, 2, 1}, .capsule_capacity = 1,
      .action_count = 2, .option_count = 2, .active_mode = 1, .revision = 1, .epoch = 1};
  strcpy(cargo_view.title, "Cargo");
  strcpy(cargo_view.identity, "Headless presentation fixture");
  strcpy(cargo_view.actions[0], "Keep");
  strcpy(cargo_view.actions[1], "Confirm");
  for (unsigned page = COMPANION_CARGO_SCREEN; page <= COMPANION_FINISH_SCREEN; ++page) {
    cargo_view.screen = (CompanionCargoScreen)page;
    if (page == COMPANION_FINISH_SCREEN) memset(cargo_view.supplies, 0, sizeof(cargo_view.supplies));
    if (!companion_cargo_ui_update(cargo, &cargo_view, 1) || !refresh(display, &counters, "cargo-decision")) goto cleanup;
  }
  cargo_view.screen = COMPANION_CARGO_SCREEN;
  cargo_view.selector = 1;
  cargo_view.action_count = 0;
  if (!companion_cargo_ui_update(cargo, &cargo_view, 1) || !refresh(display, &counters, "cargo-preview")) goto cleanup;
  companion_cargo_ui_hide(cargo);
  CompanionProbeView probe_view = {.phase = PROBE_ENTRY, .action_count = 1};
  strcpy(probe_view.title, "Choose an expedition");
  strcpy(probe_view.actions[0], "Field survey");
  if (!native_probe_ui_update(probe, &probe_view) || !refresh(display, &counters, "probe-entry")) goto cleanup;
  probe_view.phase = PROBE_MAP;
  probe_view.field.map.avatar_visible = 1;
  probe_view.field.map.avatar_x = probe_view.field.map.avatar_y = 1;
  memset(probe_view.field.map.terrain, EXPEDITION_TERRAIN_GRASS, sizeof(probe_view.field.map.terrain));
  memset(probe_view.field.map.paths, 1, sizeof(probe_view.field.map.paths));
  probe_view.action_count = 0;
  if (!native_probe_ui_update(probe, &probe_view) || !refresh(display, &counters, "probe-map")) goto cleanup;
  probe_view.phase = PROBE_SITE;
  probe_view.action_count = 3;
  for (unsigned choice = 0; choice < 3; ++choice) {
    probe_view.choice_material[choice] = choice + 1;
    strcpy(probe_view.actions[choice], choice == 0 ? "Take Data" : choice == 1 ? "Take Energy" : "Take Essence");
  }
  if (!native_probe_ui_update(probe, &probe_view) || !refresh(display, &counters, "probe-source-choices")) goto cleanup;
  probe_view.selector = 1;
  probe_view.action_count = 3;
  probe_view.cargo.capsule_capacity = 1;
  strcpy(probe_view.title, "Companion");
  strcpy(probe_view.actions[0], "Probe");
  strcpy(probe_view.actions[1], "Cargo");
  strcpy(probe_view.actions[2], "Companions");
  strcpy(probe_view.mode_detail[0], "Explore / 3 expeditions");
  strcpy(probe_view.mode_detail[1], "Supplies 0 / 40 / Samples 0 / 1");
  strcpy(probe_view.mode_detail[2], "No mibis yet");
  if (!native_probe_ui_update(probe, &probe_view) || !refresh(display, &counters, "probe-preview")) goto cleanup;
  probe_view.phase = PROBE_UNAVAILABLE;
  probe_view.failed = 1;
  if (!native_probe_ui_update(probe, &probe_view) || !refresh(display, &counters, "probe-unavailable")) goto cleanup;
  native_probe_ui_hide(probe);
  /* Resident composition remains lazy; these are borrowed native images. */
  if (!native_ui_image_init(&portraits[0], CORE_ART_PIP_PLAIN) ||
      !native_ui_image_init(&portraits[1], CORE_ART_PIP_MARKED) ||
      !native_ui_image_from_sprite(&portraits[2], &companion_empty_habitat)) goto cleanup;
  CompanionResidentFonts resident_fonts = {&fonts[0], &fonts[1], &fonts[2], &fonts[3], &fonts[4]};
  residents = companion_resident_ui_create(screen, &resident_fonts);
  if (!residents) goto cleanup;
  CompanionResidentView resident = {.portrait = RESIDENT_EMPTY_HABITAT, .current = 1, .online = 1};
  strcpy(resident.status, "Headless fixture / no Station authority");
  if (!companion_resident_ui_update(residents, &resident, &portraits[2].image) || !refresh(display, &counters, "resident-empty")) goto cleanup;
  resident.count = 1;
  resident.portrait = RESIDENT_PORTRAIT_PLAIN;
  strcpy(resident.identity, "fixture-resident");
  strcpy(resident.coat, "Plain coat");
  strcpy(resident.property, "Saved presentation property");
  for (unsigned page = RESIDENT_PREVIEW; page <= RESIDENT_VISIT; ++page) {
    resident.screen = page;
    resident.action_count = page == RESIDENT_VISIT ? 2 : 0;
    resident.available[0] = resident.available[1] = 1;
    strcpy(resident.actions[0], "Spend time together");
    strcpy(resident.actions[1], "Choose resident");
    if (!companion_resident_ui_update(residents, &resident, &portraits[0].image) || !refresh(display, &counters, "resident-family")) goto cleanup;
  }
  resident.portrait = RESIDENT_PORTRAIT_MARKED;
  resident.current = resident.online = resident.available[0] = 0;
  strcpy(resident.feedback, "Offline / cached / visit unavailable");
  if (!companion_resident_ui_update(residents, &resident, &portraits[1].image) || !refresh(display, &counters, "resident-marked-offline")) goto cleanup;
  lv_mem_monitor_t warm, final;
  lv_mem_monitor(&warm);
  for (unsigned update = 0; update < 20; ++update)
    if (!companion_resident_ui_update(residents, &resident, &portraits[1].image) || !refresh(display, &counters, "retained-update")) goto cleanup;
  lv_mem_monitor(&final);
  if (warm.free_size != final.free_size || !counters.flushes ||
      counters.maximum_flush_bytes > counters.buffer_size) goto cleanup;
  ESP_LOGI(tag, "poolused=%zu peak=%zu total=%zu partial=%zu maxflush=%zu hostframe=0",
      final.total_size - final.free_size, final.max_used, final.total_size,
      counters.buffer_size, counters.maximum_flush_bytes);
  ESP_LOGI(tag, "sourceRGBA=%u convertedRGBA=%u glyphcoverage=%u; runtime fit unproven",
      companion_source_rgba_bytes, companion_source_rgba_bytes, companion_font_coverage_bytes);
  success = 1;
cleanup:
  companion_resident_ui_destroy(residents);
  native_probe_ui_destroy(probe);
  companion_cargo_ui_destroy(cargo);
  if (actions) lv_group_delete(actions);
  ui_display_destroy(display);
  for (unsigned image = 0; image < 4; ++image) native_ui_image_destroy(&images[image]);
  for (unsigned image = 0; image < 3; ++image) native_ui_image_destroy(&portraits[image]);
  free(draw_buffer);
  if (!success) ESP_LOGE(tag, "Headless fixture unavailable; internal image RAM budget unresolved");
  else ESP_LOGI(tag, "Headless fixtures complete; panel/input/save/radio remain absent");
}
