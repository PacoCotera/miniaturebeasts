#define _POSIX_C_SOURCE 200809L
#include "kit.h"
#include "native_ui.h"
#include "../ui/display.h"
#include "../ui/host_frame.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void check_frame(const DeviceKit *kit, NativeUiContext *ui,
                        const char *directory, const char *name) {
  FILE *frame = tmpfile();
  assert(frame && kit_bmp_ui(kit, KIT_DOCK, frame, ui, 1));
  assert(ftell(frame) == 54 + 792L * 272L * 3L);
  assert(fseek(frame, 54, SEEK_SET) == 0);
  unsigned levels[4] = {0};
  for (unsigned pixel = 0; pixel < 792u * 272u; ++pixel) {
    int blue = fgetc(frame), green = fgetc(frame), red = fgetc(frame);
    assert(blue >= 0 && blue == green && green == red);
    assert(blue == 0 || blue == 85 || blue == 170 || blue == 255);
    ++levels[(unsigned)blue / 85u];
  }
  assert(levels[0] && levels[1] && levels[2] && levels[3]);
  if (directory) {
    char path[768];
    snprintf(path, sizeof(path), "%s/%s.bmp", directory, name);
    FILE *output = fopen(path, "wb");
    assert(output && fseek(frame, 0, SEEK_SET) == 0);
    int byte;
    while ((byte = fgetc(frame)) != EOF) assert(fputc(byte, output) != EOF);
    assert(fclose(output) == 0);
  }
  assert(fclose(frame) == 0);
}

typedef struct { unsigned calls; UiDisplay *pending; } HeldSink;
static UiFlushResult held_flush(void *user, UiDisplay *display, const UiArea *area,
                               const uint8_t *pixels, size_t stride, UiColorFormat format) {
  HeldSink *sink = user;
  assert(area->x1 == 0 && area->y1 == 0 && area->x2 == 7 && area->y2 == 7);
  assert(pixels && stride >= 24 && format == UI_COLOR_RGB888);
  ++sink->calls;
  sink->pending = display;
  return UI_FLUSH_PENDING;
}
static void check_transport(void) {
  UiDisplayProfile profile = {8, 8, 8, UI_COLOR_RGB888};
  UiArea area = {0, 0, 7, 7};
  size_t size = ui_display_buffer_size(&profile);
  assert(size >= 8 * 8 * 3);
  assert(ui_display_validate(&profile, &area, size / 8, size, UI_COLOR_RGB888));
  assert(!ui_display_validate(&profile, &area, 23, size, UI_COLOR_RGB888));
  assert(!ui_display_validate(&profile, &area, size / 8, size - 1, UI_COLOR_RGB888));
  area.x2 = 8;
  assert(!ui_display_validate(&profile, &area, size / 8, size, UI_COLOR_RGB888));
  area = (UiArea){-1, 0, 6, 7};
  assert(!ui_display_validate(&profile, &area, size / 8, size, UI_COLOR_RGB888));
  area = (UiArea){0, 0, 7, 7};
  assert(!ui_display_validate(&profile, &area, size / 8, size, (UiColorFormat)99));
  UiDisplayProfile narrow = {8, 8, 2, UI_COLOR_RGB888};
  UiArea tall = {0, 0, 1, 7};
  assert(ui_display_validate(&narrow, &tall, 6, ui_display_buffer_size(&narrow), UI_COLOR_RGB888));
  assert(!ui_display_validate(&narrow, &tall, 6, 47, UI_COLOR_RGB888));
  void *buffer = malloc(size);
  assert(buffer);
  HeldSink sink = {0};
  UiDisplay *display = ui_display_create(&profile, buffer, size, held_flush, &sink);
  assert(display && ui_display_count() == 1);
  lv_refr_now(ui_display_lvgl(display));
  assert(sink.calls == 1 && ui_display_pending(display) && sink.pending == display);
  assert(!ui_display_visible(display, NULL, NULL));
  ui_display_mark_visible(display, 42, 7);
  assert(!ui_display_visible(display, NULL, NULL));
  assert(!ui_display_destroy(display));
  ui_display_flush_complete(display, 1);
  assert(!ui_display_pending(display) && !ui_display_failed(display));
  assert(!ui_display_visible(display, NULL, NULL));
  ui_display_mark_visible(display, 42, 7);
  unsigned revision, epoch;
  assert(ui_display_visible(display, &revision, &epoch) && revision == 42 && epoch == 7);
  assert(ui_display_destroy(display) && ui_display_count() == 0);
  free(buffer);
  /* Nonzero origin and padded stride: conversion cannot treat area as full width. */
  UiHostFrame frame;
  profile = (UiDisplayProfile){4, 4, 4, UI_COLOR_RGB888};
  assert(ui_host_frame_init(&frame, &profile));
  const uint8_t pixels[16] = {30,20,10,60,50,40,0,0,90,80,70,120,110,100,0,0};
  area = (UiArea){1,1,2,2};
  assert(ui_host_frame_flush(&frame, NULL, &area, pixels, 8, UI_COLOR_RGB888) == UI_FLUSH_COMPLETE);
  assert(frame.rgb[(1 * 4 + 1) * 3] == 10 && frame.rgb[(2 * 4 + 2) * 3 + 2] == 120);
  assert(frame.rgb[0] == 0 && frame.rgb[(3 * 4 + 3) * 3] == 0);
  area.x2 = 4;
  assert(ui_host_frame_flush(&frame, NULL, &area, pixels, 8, UI_COLOR_RGB888) == UI_FLUSH_FAILED);
  ui_host_frame_destroy(&frame);
}
static void press(DeviceKit *kit, SelectedInput input) {
  unsigned revision = kit_revision(kit, KIT_DOCK);
  kit_input(kit, KIT_DOCK, SELECTED_READY, revision);
  kit_input(kit, KIT_DOCK, input, revision);
  kit_input(kit, KIT_DOCK, (SelectedInput)(input + 1), revision);
}
int main(int argc, char **argv) {
  assert(argc == 1 || argc == 2);
  const char *exports = argc == 2 ? argv[1] : NULL;
  check_transport();
  char directory[] = "/tmp/critter-dock-lvgl-XXXXXX";
  assert(mkdtemp(directory));
  char path[512];
  snprintf(path, sizeof(path), "%s/world", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  GameState original_game = lab.game;
  /* Existing physical actions remain Kit-owned: open, print, cancel and feed. */
  press(&kit, SELECTED_CONFIRM_DOWN);
  assert(kit.dock.page == 1);
  press(&kit, SELECTED_CONFIRM_DOWN);
  assert(kit.dock.page == 0);
  press(&kit, SELECTED_RESEARCH_DOWN);
  assert(kit.dock.page == 2 && kit.dock.focus == 0);
  press(&kit, SELECTED_DOWN_DOWN);
  assert(kit.dock.focus == 1);
  press(&kit, SELECTED_CONFIRM_DOWN);
  assert(kit.dock.page == 0 && !strcmp(kit.dock.message, "Print cancelled"));
  press(&kit, SELECTED_CRITTERS_DOWN);
  assert(strstr(kit.dock.message, "No physical printer"));
  kit.dock.message[0] = 0;
  DockView projected;
  assert(kit_dock_projection(&kit, &projected));
  assert(projected.current && projected.world_revision == kit.journal.dock_world_revision);
  assert(projected.stock[0] == kit.journal.dock_stock[0] / GAME_SUPPLY_UNIT);
  uint32_t stock = projected.stock[0];
  lab.game.data += GAME_SUPPLY_UNIT;
  assert(kit_dock_projection(&kit, &projected));
  assert(!projected.current && projected.stock[0] == stock);
  lab.game = original_game;
  NativeUiContext *companion = native_ui_create();
  NativeUiContext *dock = native_ui_create_device(KIT_DOCK);
  assert(companion && dock && ui_display_count() == 2);
  assert(!native_ui_dock(companion, &projected));
  unsigned companion_page = kit.companion.page;
  kit.companion.page = COMP_CARGO;
  CompanionCargoView cargo;
  assert(kit_cargo_projection(&kit, &cargo));
  assert(!native_ui_cargo(dock, &cargo, 1));
  kit.companion.page = companion_page;
  const char *names[] = {"world", "supplies", "connections"};
  for (unsigned focus = 0; focus < 3; ++focus) {
    kit.dock.focus = focus;
    check_frame(&kit, dock, exports, names[focus]);
  }
  kit.dock.page = 1;
  kit.dock.focus = 0;
  check_frame(&kit, dock, exports, "world-open");
  kit.dock.page = 2;
  check_frame(&kit, dock, exports, "print-review");
  kit.dock.focus = 1;
  check_frame(&kit, dock, exports, "print-cancel");
  kit.dock.page = 0;
  kit.dock.focus = 0;
  kit.journal.dock_online = 0;
  assert(kit_dock_projection(&kit, &projected) && !projected.current && !projected.online);
  check_frame(&kit, dock, exports, "offline-world");
  kit.dock_cache_failed = 1;
  assert(kit_dock_projection(&kit, &projected) && projected.unavailable);
  check_frame(&kit, dock, exports, "cache-error");
  kit.dock_cache_failed = 0;
  kit.failed = 1;
  check_frame(&kit, dock, exports, "storage-error");
  kit.failed = 0;
  kit.dock.suspended = 1;
  check_frame(&kit, dock, exports, "suspended");
  kit.dock.suspended = 0;
  assert(kit_dock_projection(&kit, &projected));
  assert(native_ui_dock(dock, &projected));
  lv_mem_monitor_t warm, final;
  lv_mem_monitor(&warm);
  for (unsigned update = 0; update < 30; ++update) assert(native_ui_dock(dock, &projected));
  lv_mem_monitor(&final);
  assert(final.free_size == warm.free_size && final.free_size >= 16384);
  printf("Companion + Dock pool: %zu used / %zu bytes; draw buffers %zu + %zu bytes\n",
      final.total_size - final.free_size, final.total_size,
      ui_display_buffer_size(&(UiDisplayProfile){450,600,60,UI_COLOR_RGB888}),
      ui_display_buffer_size(&(UiDisplayProfile){792,272,60,UI_COLOR_RGB888}));
  /* Destroying the producing Kit cannot affect the copied retained labels. */
  DeviceKit saved = kit;
  memset(&kit, 0, sizeof(kit));
  lv_obj_invalidate(lv_display_get_screen_active(lv_display_get_default()));
  lv_refr_now(NULL);
  assert(native_ui_dock(dock, &projected));
  kit = saved;
  kit.dock.page = 99;
  FILE *rejected = tmpfile();
  assert(rejected && !kit_bmp_ui(&kit, KIT_DOCK, rejected, dock, 1) && ftell(rejected) == 0);
  fclose(rejected);
  kit.dock.page = 0;
  assert(!memcmp(&lab.game, &original_game, sizeof(original_game)));
  native_ui_destroy(companion);
  assert(ui_display_count() == 1 && native_ui_dock(dock, &projected));
  native_ui_destroy(dock);
  assert(ui_display_count() == 0);
  char sidecar[580];
  snprintf(sidecar, sizeof(sidecar), "%s.kit", path);
  unlink(sidecar);
  snprintf(sidecar, sizeof(sidecar), "%s.kit.required", path);
  unlink(sidecar);
  unlink(path);
  rmdir(directory);
  puts("Dock retained LVGL, copied snapshot, partial transport and four-gray checks passed");
  return 0;
}
