#define _POSIX_C_SOURCE 200809L
#include "native_ui.h"
#include "ui_assets.h"
#include "expedition.h"
#include "../ui/companion_cargo_ui.h"
#include "../ui/display.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <errno.h>
#include <unistd.h>

static void image_fidelity(void) {
  const CoreArtId ids[] = {CORE_ART_DATA_PRIMARY, CORE_ART_ENERGY_PRIMARY,
                           CORE_ART_ESSENCE_PRIMARY, CORE_ART_SAMPLE_NEUTRAL};
  for (unsigned index = 0; index < 4; ++index) {
    NativeUiImage converted;
    const CoreArtSprite *source = core_art_sprite(ids[index]);
    assert(native_ui_image_init(&converted, ids[index]));
    assert(converted.image.header.w == source->width && converted.image.header.h == source->height);
    for (unsigned pixel = 0; pixel < source->width * source->height; ++pixel) {
      assert(converted.pixels[pixel * 4] == source->rgba[pixel * 4 + 2]);
      assert(converted.pixels[pixel * 4 + 1] == source->rgba[pixel * 4 + 1]);
      assert(converted.pixels[pixel * 4 + 2] == source->rgba[pixel * 4]);
      assert(converted.pixels[pixel * 4 + 3] == source->rgba[pixel * 4 + 3]);
    }
    native_ui_image_destroy(&converted);
  }
}
static void projection_truth(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.page = COMP_CARGO;
  kit.companion.mode = COMP_CARGO;
  kit.journal.phase = KIT_WAITING;
  kit.sealed_field.version = 1;
  strcpy(kit.sealed_field.expedition_id, "cargo-proof");
  kit.sealed_field.cargo[0] = 7 * GAME_SUPPLY_UNIT;
  kit.sealed_field.collected = 1;
  strcpy(kit.journal.haul_id, "cargo-proof");
  CompanionCargoView sent;
  assert(kit_cargo_projection(&kit, &sent));
  assert(sent.supplies[0] == 7 && sent.capsules == 1 && !sent.accepted);
  /* The immutable received record proves acceptance even before ack completion. */
  lab.game.received_count = 1;
  lab.game.received[0] = kit.sealed_field;
  kit.journal.phase = KIT_ACK_PENDING;
  CompanionCargoView accepted;
  assert(kit_cargo_projection(&kit, &accepted));
  assert(accepted.accepted && !accepted.supplies[0] && !accepted.capsules);
  assert(accepted.delivered[0] == 7 && accepted.delivered_capsules == 1);
  assert(!strcmp(accepted.title, "Cargo empty"));
  CompanionCargoView owned = accepted;
  memset(&kit, 0, sizeof(kit));
  assert(!memcmp(&owned, &accepted, sizeof(owned)));
  /* Legacy accepted receipts retain journal evidence and actual sample origin,
   * while the now-empty carried inventory remains zero. */
  kit.lab = &lab;
  kit.companion.page = COMP_CARGO;
  kit.journal.phase = KIT_ACK_PENDING;
  kit.journal.cargo[1] = 9 * GAME_SUPPLY_UNIT;
  strcpy(kit.journal.haul_id, "legacy-proof");
  lab.game.sample_count = 1;
  strcpy(lab.game.samples[0].origin_expedition_id, "legacy-proof");
  assert(kit_cargo_projection(&kit, &accepted));
  assert(accepted.accepted && !accepted.supplies[1] && !accepted.capsules);
  assert(accepted.delivered[1] == 9 && accepted.delivered_capsules == 1);
  strcpy(lab.game.samples[0].origin_expedition_id, "different-outing");
  assert(kit_cargo_projection(&kit, &accepted) && !accepted.delivered_capsules);
}
static CompanionCargoView example(void) {
  CompanionCargoView view = {0};
  view.active_mode = COMP_CARGO;
  strcpy(view.identity, "render-proof");
  strcpy(view.title, "Cargo");
  strcpy(view.context, "Field survey");
  strcpy(view.capsule, "1 sealed sample");
  strcpy(view.detail, "Contents unknown");
  strcpy(view.capacity, "Supplies 40 / 40   Capsules 1 / 1");
  strcpy(view.feedback, "Station link available");
  strcpy(view.actions[0], "Send to Station");
  strcpy(view.actions[1], "Discard items");
  view.action_count = 2;
  view.supplies[0] = 12;
  view.supplies[1] = 15;
  view.supplies[2] = 13;
  view.capsules = view.capsule_capacity = 1;
  return view;
}
static void cargo_preview_projection_truth(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.page = COMP_MODES;
  kit.companion.mode = kit.companion.focus = COMP_CARGO;
  lab.game.expedition_data = 2 * GAME_SUPPLY_UNIT;
  strcpy(lab.game.expedition_id, "preview-proof");
  kit.journal.companion_online = 1;
  GameState saved = lab.game;
  KitJournal journal = kit.journal;
  CompanionCargoView view;
  assert(kit_cargo_projection(&kit, &view));
  assert(view.selector && view.screen == COMPANION_CARGO_SCREEN);
  assert(view.active_mode == COMP_CARGO && !view.focus && !view.action_count);
  assert(view.supplies[0] == 2 && !strcmp(view.footer, "Left/Right: modes"));
  assert(!memcmp(&saved, &lab.game, sizeof(saved)) && !memcmp(&journal, &kit.journal, sizeof(journal)));
  kit.journal.companion_online = 0;
  assert(kit_cargo_projection(&kit, &view) && !strcmp(view.feedback, "Station offline") && !view.action_count);
  for (unsigned error = 0; error < 2; ++error) {
    kit.failed = error == 0;
    lab.storage_error = error == 1;
    assert(kit_cargo_projection(&kit, &view) && view.failed && !view.action_count);
    assert(!strcmp(view.feedback, "Storage unavailable") && !strcmp(view.footer, "Storage recovery required"));
  }
  kit.failed = lab.storage_error = 0;
  kit.journal.phase = KIT_WAITING;
  kit.journal.cargo[0] = 3 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view) && view.supplies[0] == 3 && !view.action_count);
  assert(!strcmp(view.title, "Cargo sealed"));
  lab.game.expedition_id[0] = 0;
  kit.journal.phase = KIT_ACK_PENDING;
  assert(kit_cargo_projection(&kit, &view) && view.accepted && !view.supplies[0] && !view.action_count);
  assert(view.delivered[0] == 3 && !strcmp(view.title, "Cargo empty"));
  kit.journal.phase = KIT_IDLE;
  lab.game.expedition_data = 0;
  assert(kit_cargo_projection(&kit, &view) && !strcmp(view.context, "No active expedition"));
  lab.game.expedition_data = 2 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view) && !strcmp(view.title, "Stored cargo"));
  kit.companion.focus = COMP_PROBE;
  assert(!kit_cargo_projection(&kit, &view));
  kit.companion.focus = kit.companion.mode;
  NativeUiContext *context = native_ui_create();
  FILE *output = tmpfile();
  /* Cargo's old selector is superseded by the common three-mode native hub. */
  assert(context && output && kit_bmp_ui(&kit, KIT_COMPANION, output, context, 1));
  assert(ftell(output) == 54 + ((450 * 3 + 3) & ~3) * 600);
  fclose(output);
  output = tmpfile();
  kit.companion.mode = 3;
  assert(output && !kit_bmp_ui(&kit, KIT_COMPANION, output, context, 1));
  assert(!ftell(output)); /* A malformed common hub still has no fallback. */
  fclose(output);
  native_ui_destroy(context);
  kit.companion.mode = kit.companion.focus = COMP_FRIENDS;
  assert(!kit_cargo_projection(&kit, &view));
}
static void send_projection_truth(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.page = COMP_SEND_REVIEW;
  kit.companion.mode = COMP_CARGO;
  kit.companion.focus = 1;
  kit.journal.companion_online = 1;
  strcpy(lab.game.expedition_id, "review-proof");
  lab.game.expedition_data = 3 * GAME_SUPPLY_UNIT;
  lab.game.expedition_energy = GAME_SUPPLY_UNIT;
  GameState saved = lab.game;
  KitJournal journal = kit.journal;
  CompanionCargoView view;
  assert(kit_cargo_projection(&kit, &view));
  assert(view.screen == COMPANION_SEND_SCREEN && view.focus == 1 && view.action_count == 2);
  assert(view.supplies[0] == 3 && view.supplies[1] == 1 && !view.capsules);
  assert(!strcmp(view.title, "Return to Station") && !strcmp(view.actions[1], "Keep cargo"));
  assert(!strcmp(view.footer, "Back: Keep cargo"));
  assert(strstr(view.detail, "exploration stops") && !strstr(view.detail, "expedition ends"));
  assert(!memcmp(&saved, &lab.game, sizeof(saved)) && !memcmp(&journal, &kit.journal, sizeof(journal)));
  kit.journal.companion_online = 0;
  assert(kit_cargo_projection(&kit, &view) && !strcmp(view.feedback, "Station offline"));
  assert(view.action_count == 2 && view.supplies[0] == 3);
  lab.storage_error = 1;
  assert(kit_cargo_projection(&kit, &view) && view.failed && !view.action_count);
  assert(!strcmp(view.feedback, "Storage unavailable"));
  lab.storage_error = 0;
  lab.game.expedition_elapsed = GAME_EXPEDITION_SECONDS;
  assert(kit_cargo_projection(&kit, &view) && !view.capsules);
  assert(!strcmp(view.capsule, "Sample ready at Station") && strstr(view.detail, "acceptance"));
  lab.game.sample_count = GAME_MAX_SAMPLES;
  assert(kit_cargo_projection(&kit, &view) && !view.capsules);
  assert(strstr(view.capsule, "shelf full") && !strstr(view.detail, "Recorded"));
  lab.game.sample_count = 0;
  lab.game.expedition_elapsed = GAME_EXPEDITION_SECONDS - 1;
  assert(kit_cargo_projection(&kit, &view) && !strstr(view.capsule, "ready"));
  kit.failed = 1;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count);
  assert(strstr(view.detail, "Cargo preserved"));
  kit.failed = 0;
  kit.journal.phase = KIT_WAITING;
  kit.journal.cargo[0] = 7 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count && view.supplies[0] == 7);
  assert(!strcmp(view.title, "Cargo sealed") && !strstr(view.footer, "Keep"));
  lab.game.expedition_id[0] = 0;
  kit.journal.phase = KIT_ACK_PENDING;
  assert(kit_cargo_projection(&kit, &view) && view.accepted && !view.action_count);
  assert(!view.supplies[0] && view.delivered[0] == 7);
  NativeUiContext *wrong_device = native_ui_create_device(KIT_DOCK);
  FILE *output = tmpfile();
  assert(wrong_device && output && !kit_bmp_ui(&kit, KIT_COMPANION, output, wrong_device, 1));
  assert(ftell(output) == 0); /* A known migrated route cannot reach manual fallback. */
  fclose(output);
  native_ui_destroy(wrong_device);
  kit.companion.page = COMP_FRIENDS;
  assert(!kit_cargo_projection(&kit, &view));
}
static void discard_finish_projection_truth(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.mode = COMP_CARGO;
  kit.companion.page = COMP_DISCARD_CLASS;
  strcpy(lab.game.expedition_id, "discard-proof");
  lab.game.expedition_data = 40 * GAME_SUPPLY_UNIT;
  lab.game.field.version = 3;
  lab.game.field.collected = 1;
  GameState saved = lab.game;
  CompanionCargoView view;
  for (unsigned focus = 0; focus < 4; ++focus) {
    kit.companion.focus = focus;
    assert(kit_cargo_projection(&kit, &view));
    assert(view.screen == COMPANION_DISCARD_CLASS_SCREEN && view.option_count == 4);
    assert(view.focus + view.first_visible == focus && view.logical_focus == focus);
    assert(view.selected_resource == focus && view.capsules == 1);
    assert(view.action_count == 2);
    if (focus == 3) assert(!strcmp(view.actions[1], "Keep cargo"));
  }
  kit.companion.page = COMP_DISCARD_QUANTITY;
  kit.companion.discard_resource = 0;
  for (unsigned focus = 0; focus <= 40; ++focus) {
    kit.companion.focus = focus;
    assert(kit_cargo_projection(&kit, &view));
    assert(view.screen == COMPANION_DISCARD_QUANTITY_SCREEN && view.option_count == 41);
    assert(view.logical_focus == focus && view.focus + view.first_visible == focus);
    assert(view.action_count == 2 && view.capsules == 1);
    if (focus == 39) assert(!strcmp(view.actions[1], "40 whole items"));
    if (focus == 40) {
      assert(!strcmp(view.actions[1], "Keep cargo"));
      assert(!strcmp(view.capsule, "Keep cargo") && !strstr(view.detail, "Loss"));
    }
  }
  lab.storage_error = 1;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count);
  assert(!strcmp(view.feedback, "Storage unavailable"));
  lab.storage_error = 0;
  kit.companion.page = COMP_DISCARD_REVIEW;
  kit.companion.focus = 1;
  kit.companion.discard_quantity = 3 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view));
  assert(!strcmp(view.actions[0], "Discard 3 Data") && view.focus == 1);
  assert(!strcmp(view.actions[1], "Keep these items"));
  assert(strstr(view.detail, "Keep 37 Data") && strstr(view.detail, "Loss permanent"));
  assert(view.supplies[0] == 40 && view.capsules == 1);
  kit.journal.companion_online = 0;
  assert(kit_cargo_projection(&kit, &view) && view.action_count == 2);
  kit.failed = 1;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count && view.failed);
  kit.failed = 0;
  lab.storage_error = 1;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count && view.failed);
  lab.storage_error = 0;
  kit.companion.discard_quantity++;
  assert(!kit_cargo_projection(&kit, &view));
  kit.companion.discard_quantity = 41 * GAME_SUPPLY_UNIT;
  assert(!kit_cargo_projection(&kit, &view));
  kit.companion.discard_quantity = 3 * GAME_SUPPLY_UNIT;
  kit.companion.discard_resource = 3;
  assert(!kit_cargo_projection(&kit, &view));
  NativeUiContext *context = native_ui_create();
  FILE *output = tmpfile();
  assert(context && output && !kit_bmp_ui(&kit, KIT_COMPANION, output, context, 1));
  assert(ftell(output) == 0);
  fclose(output);
  native_ui_destroy(context);
  assert(!memcmp(&saved, &lab.game, sizeof(saved)));
  kit.companion.discard_resource = 0;
  kit.journal.phase = KIT_WAITING;
  game_field_record(&lab.game, &kit.sealed_field);
  kit.sealed_field.cargo[0] = 40 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count);
  assert(strstr(view.detail, "already sealed") && !strstr(view.footer, "Keep"));
  kit.journal.phase = KIT_IDLE;
  kit.companion.page = COMP_FINISH_REVIEW;
  assert(kit_cargo_projection(&kit, &view) && !view.action_count);
  assert(strstr(view.detail, "Send or discard"));
  lab.game.expedition_data = 0;
  lab.game.field.collected = 0;
  assert(kit_cargo_projection(&kit, &view) && view.action_count == 2);
  assert(view.screen == COMPANION_FINISH_SCREEN && view.focus == 1);
  assert(!strcmp(view.actions[1], "Keep exploring"));
  assert(strstr(view.capsule, "nothing sent") && !strstr(view.detail, "progress"));
  kit.companion.mode = COMP_PROBE;
  assert(kit_cargo_projection(&kit, &view) && view.active_mode == COMP_PROBE);
  kit.companion.mode = COMP_MODES;
  assert(!kit_cargo_projection(&kit, &view));
  kit.companion.mode = COMP_CARGO;
  kit.companion.page = COMP_CARGO;
  kit.companion.focus = 0;
  lab.game.expedition_id[0] = 0;
  memset(&lab.game.field, 0, sizeof(lab.game.field));
  assert(kit_cargo_projection(&kit, &view));
  assert(!strcmp(view.title, "Cargo empty") && !strcmp(view.context, "No active expedition"));
  assert(!strcmp(view.detail, "No cargo.") && !strstr(view.detail, "progress retained"));
  assert(view.action_count && !strcmp(view.actions[0], "Return to Probe"));
  lab.game.expedition_data = 2 * GAME_SUPPLY_UNIT;
  assert(kit_cargo_projection(&kit, &view) && view.supplies[0] == 2);
  assert(!strcmp(view.title, "Stored cargo") && !strstr(view.detail, "No cargo"));
}
static UiFlushResult consume_partial(void *user, UiDisplay *display, const UiArea *area,
    const uint8_t *pixels, size_t stride, UiColorFormat format) {
  (void)display;
  (void)pixels;
  assert(format == UI_COLOR_RGB888);
  size_t *consumed = user;
  *consumed += stride * (size_t)(area->y2 - area->y1 + 1);
  return UI_FLUSH_COMPLETE;
}
static void portable_cargo_send_module(void) {
  /* The same retained tree runs with only a bounded partial sink, without a
   * host full-frame allocation, Kit pointer or domain callbacks. */
  UiDisplayProfile profile = {450, 600, 8, UI_COLOR_RGB888};
  size_t draw_size = ui_display_buffer_size(&profile), consumed = 0;
  void *draw = malloc(draw_size);
  UiDisplay *display = ui_display_create(&profile, draw, draw_size, consume_partial, &consumed);
  assert(draw && display);
  lv_font_t fonts[5];
  native_ui_font_init(&fonts[0], &lab_heading_fonts[0]);
  native_ui_font_init(&fonts[1], &lab_fonts[0]);
  native_ui_font_init(&fonts[2], &lab_fonts[15]);
  native_ui_font_init(&fonts[3], &lab_fonts[7]);
  native_ui_font_init(&fonts[4], &lab_heading_fonts[4]);
  CompanionCargoFonts font_view = {&fonts[0], &fonts[1], &fonts[2], &fonts[3], &fonts[4]};
  NativeUiImage backing[4];
  const lv_image_dsc_t *images[4];
  for (unsigned index = 0; index < 4; ++index) {
    assert(native_ui_image_init(&backing[index], index == 3 ? CORE_ART_SAMPLE_NEUTRAL :
        (CoreArtId)(CORE_ART_DATA_PRIMARY + index)));
    images[index] = &backing[index].image;
  }
  lv_group_t *group = lv_group_create();
  CompanionCargoUi *ui = companion_cargo_ui_create(
      lv_display_get_screen_active(ui_display_lvgl(display)), group, &font_view, images);
  assert(ui);
  CompanionCargoView view = example();
  view.screen = COMPANION_SEND_SCREEN;
  strcpy(view.title, "Return to Station");
  strcpy(view.footer, "Back: Keep cargo");
  strcpy(view.actions[1], "Keep cargo");
  view.focus = 1;
  assert(companion_cargo_ui_update(ui, &view, 1));
  memset(&view, 0, sizeof(view));
  lv_refr_now(ui_display_lvgl(display)); /* Retained labels own copied strings. */
  assert(consumed > 0);
  view = example();
  assert(companion_cargo_ui_update(ui, &view, 1));
  lv_refr_now(ui_display_lvgl(display));
  lv_mem_monitor_t warm, final;
  lv_mem_monitor(&warm);
  for (unsigned index = 0; index < 200; ++index) {
    view.screen = (CompanionCargoScreen)(index % 6);
    view.focus = index & 1;
    view.logical_focus = view.focus;
    view.option_count = 2;
    CompanionCargoView untouched = view;
    assert(companion_cargo_ui_update(ui, &view, 1));
    assert(!memcmp(&view, &untouched, sizeof(view)));
    lv_refr_now(ui_display_lvgl(display));
  }
  lv_mem_monitor(&final);
  assert(final.free_size == warm.free_size);
  /* Switching preview/action ownership cannot leave stale focus or allocate
   * a second composition tree. The caller may discard its plain view. */
  for (unsigned index = 0; index < 100; ++index) {
    view = example();
    view.selector = index & 1;
    if (view.selector) view.action_count = view.focus = 0;
    assert(companion_cargo_ui_update(ui, &view, 1));
    memset(&view, 0, sizeof(view));
    lv_refr_now(ui_display_lvgl(display));
  }
  lv_mem_monitor(&final);
  assert(final.free_size == warm.free_size);
  view = example();
  view.selector = 1;
  assert(!companion_cargo_ui_update(ui, &view, 1)); /* Preview cannot carry actions. */
  view.action_count = view.focus = 0;
  view.active_mode = COMP_PROBE;
  assert(!companion_cargo_ui_update(ui, &view, 1));
  view.active_mode = COMP_CARGO;
  view.screen = COMPANION_SEND_SCREEN;
  assert(!companion_cargo_ui_update(ui, &view, 1));
  view = example();
  view.action_count = 3;
  assert(!companion_cargo_ui_update(ui, &view, 1));
  view = example();
  view.screen = COMPANION_DISCARD_QUANTITY_SCREEN;
  view.option_count = 41;
  view.logical_focus = 40;
  view.first_visible = 39;
  view.focus = 0; /* A stale local mapping must not focus a different action. */
  assert(!companion_cargo_ui_update(ui, &view, 1));
  view = example();
  memset(view.title, 'x', sizeof(view.title));
  assert(!companion_cargo_ui_update(ui, &view, 1));
  companion_cargo_ui_destroy(ui);
  lv_group_delete(group);
  ui_display_destroy(display);
  for (unsigned index = 0; index < 4; ++index) native_ui_image_destroy(&backing[index]);
  free(draw);
}
static void export_bmp(const char *path, const uint8_t *rgb) {
  FILE *output = fopen(path, "wb");
  assert(output);
  unsigned stride = (450 * 3 + 3) & ~3u;
  unsigned fields[][2] = {{54 + stride * 600,4},{0,4},{54,4},{40,4},{450,4},
                          {600,4},{1,2},{24,2},{0,4},{stride * 600,4},
                          {2835,4},{2835,4},{0,4},{0,4}};
  assert(fwrite("BM", 1, 2, output) == 2);
  for (unsigned field = 0; field < sizeof(fields)/sizeof(fields[0]); ++field)
    for (unsigned byte = 0; byte < fields[field][1]; ++byte)
      assert(fputc((int)((fields[field][0] >> (8 * byte)) & 255), output) != EOF);
  uint8_t row[1352];
  for (unsigned y = 600; y > 0; --y) {
    memset(row, 0, sizeof(row));
    for (unsigned x = 0; x < 450; ++x)
      for (unsigned channel = 0; channel < 3; ++channel)
        row[x * 3 + channel] = rgb[((y - 1) * 450 + x) * 3 + 2 - channel];
    assert(fwrite(row, 1, stride, output) == stride);
  }
  assert(!fclose(output));
}
static void rendering_and_motion(const char *directory, const CompanionCargoView *actual) {
  NativeUiContext *context = native_ui_create();
  NativeUiContext *second = native_ui_create();
  assert(context && second);
  CompanionCargoView view = actual ? *actual : example();
  assert(view.action_count == 2);
  view.focus = 0;
  view.held = view.pressed = view.suspended = 0;
  CompanionCargoView untouched = view;
  const uint8_t *rgb = native_ui_cargo(context, &view, 1);
  assert(rgb && !memcmp(&view, &untouched, sizeof(view)));
  assert(rgb[0] == 0x1e && rgb[1] == 0x28 && rgb[2] == 0x2f);
  uint8_t *still = malloc(450 * 600 * 3);
  assert(still);
  memcpy(still, rgb, 450 * 600 * 3);
  assert(native_ui_cargo(second, &view, 1));
  view.focus = 1;
  assert(native_ui_cargo(context, &view, 0) && native_ui_animation_pending(context));
  native_ui_advance(context, 120); /* A second context forbids global clock advance. */
  assert(native_ui_animation_pending(context));
  lv_mem_monitor_t memory;
  lv_mem_monitor(&memory);
  printf("LVGL pool with two contexts: %zu used / %zu total bytes\n",
         memory.total_size - memory.free_size, memory.total_size);
  native_ui_destroy(second);
  view.focus = 0;
  assert(!memcmp(still, native_ui_cargo(context, &view, 1), 450 * 600 * 3));
  view.focus = 1;
  rgb = native_ui_cargo(context, &view, 0);
  assert(rgb && native_ui_animation_pending(context));
  if (directory) {
    char path[512];
    snprintf(path, sizeof(path), "%s/cargo-still.bmp", directory);
    export_bmp(path, still);
    snprintf(path, sizeof(path), "%s/cargo-focus-0.bmp", directory);
    export_bmp(path, rgb);
  }
  view.held = 1;
  assert(native_ui_cargo(context, &view, 0));
  native_ui_advance(context, 120);
  assert(native_ui_animation_pending(context));
  view.held = 0;
  assert(native_ui_cargo(context, &view, 0));
  native_ui_advance(context, 60);
  rgb = native_ui_cargo(context, &view, 0);
  assert(rgb && native_ui_animation_pending(context));
  if (directory) {
    char path[512];
    snprintf(path, sizeof(path), "%s/cargo-focus-60.bmp", directory);
    export_bmp(path, rgb);
  }
  native_ui_advance(context, 60);
  rgb = native_ui_cargo(context, &view, 0);
  assert(rgb && !native_ui_animation_pending(context));
  if (directory) {
    char path[512];
    snprintf(path, sizeof(path), "%s/cargo-focus-120.bmp", directory);
    export_bmp(path, rgb);
  }
  view.focus = 0;
  assert(native_ui_cargo(context, &view, 0) && native_ui_animation_pending(context));
  view.suspended = 1;
  assert(native_ui_cargo(context, &view, 0) && !native_ui_animation_pending(context));
  native_ui_destroy(context);
  /* A new context must survive full LVGL teardown and have no prior Kit identity. */
  context = native_ui_create();
  assert(context && native_ui_cargo(context, &untouched, 1));
  native_ui_destroy(context);
  free(still);
}
static void discard_finish_fixture_exports(const char *directory) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.mode = COMP_CARGO;
  strcpy(lab.game.expedition_id, "discard-fixture");
  lab.game.expedition_data = 40 * GAME_SUPPLY_UNIT;
  lab.game.field.version = 3;
  lab.game.field.collected = 1;
  NativeUiContext *context = native_ui_create();
  assert(context);
  const unsigned pages[] = {COMP_DISCARD_CLASS, COMP_DISCARD_QUANTITY,
      COMP_DISCARD_QUANTITY, COMP_DISCARD_REVIEW, COMP_DISCARD_REVIEW,
      COMP_DISCARD_REVIEW, COMP_FINISH_REVIEW, COMP_FINISH_REVIEW};
  const unsigned focuses[] = {3, 39, 40, 1, 1, 1, 1, 1};
  const char *names[] = {"class-keep", "quantity-40", "quantity-keep",
      "discard-all-keep", "discard-storage-error", "discard-pending", "finish-keep", "finish-probe-keep"};
  for (unsigned index = 0; index < 8; ++index) {
    kit.companion.page = pages[index];
    kit.companion.focus = focuses[index];
    kit.companion.discard_quantity = 40 * GAME_SUPPLY_UNIT;
    lab.storage_error = index == 4;
    kit.journal.phase = index == 5 ? KIT_WAITING : KIT_IDLE;
    if (index == 5) {
      game_field_record(&lab.game, &kit.sealed_field);
      kit.sealed_field.cargo[0] = 40 * GAME_SUPPLY_UNIT;
    }
    if (index >= 6) {
      lab.game.expedition_data = 0;
      lab.game.field.collected = 0;
    }
    if (index == 7) kit.companion.mode = COMP_PROBE;
    CompanionCargoView view;
    assert(kit_cargo_projection(&kit, &view));
    const uint8_t *rgb = native_ui_cargo(context, &view, 1);
    assert(rgb);
    char path[512];
    snprintf(path, sizeof(path), "%s/fixture-%s.bmp", directory, names[index]);
    export_bmp(path, rgb);
  }
  lab.game.expedition_id[0] = 0;
  lab.game.expedition_data = 2 * GAME_SUPPLY_UNIT;
  memset(&lab.game.field, 0, sizeof(lab.game.field));
  kit.companion.page = kit.companion.mode = COMP_CARGO;
  kit.companion.focus = 0;
  CompanionCargoView stored;
  assert(kit_cargo_projection(&kit, &stored));
  const uint8_t *stored_rgb = native_ui_cargo(context, &stored, 1);
  assert(stored_rgb);
  char stored_path[512];
  snprintf(stored_path, sizeof(stored_path), "%s/fixture-stored-no-outing.bmp", directory);
  export_bmp(stored_path, stored_rgb);
  native_ui_destroy(context);
}
static void cargo_preview_rendering(const char *directory) {
  SelectedLab lab;
  selected_lab_init(&lab);
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.companion.mode = kit.companion.focus = COMP_CARGO;
  kit.companion.page = COMP_MODES;
  kit.journal.companion_online = 1;
  NativeUiContext *context = native_ui_create();
  uint8_t *normal = malloc(450 * 600 * 3);
  assert(context && normal);
  const char *names[] = {"empty", "active", "offline", "sealed", "accepted",
                         "kit-error", "lab-error", "stored"};
  for (unsigned index = 0; index < 8; ++index) {
    memset(&lab.game.field, 0, sizeof(lab.game.field));
    strcpy(lab.game.expedition_id, index ? "preview-fixture" : "");
    lab.game.expedition_data = index ? 2 * GAME_SUPPLY_UNIT : 0;
    kit.journal.phase = index == 3 ? KIT_WAITING : index == 4 ? KIT_ACK_PENDING : KIT_IDLE;
    kit.journal.companion_online = index != 2;
    kit.journal.cargo[0] = 3 * GAME_SUPPLY_UNIT;
    if (index == 4 || index == 7) lab.game.expedition_id[0] = 0;
    kit.failed = index == 5;
    lab.storage_error = index == 6;
    CompanionCargoView view;
    assert(kit_cargo_projection(&kit, &view) && view.selector && !view.action_count);
    const uint8_t *rgb = native_ui_cargo(context, &view, 1);
    assert(rgb);
    if (directory) {
      char path[512];
      snprintf(path, sizeof(path), "%s/fixture-preview-%s.bmp", directory, names[index]);
      export_bmp(path, rgb);
    }
  }
  kit.failed = lab.storage_error = 0;
  strcpy(lab.game.expedition_id, "preview-transition");
  kit.companion.page = COMP_CARGO;
  kit.companion.focus = 1;
  CompanionCargoView view;
  assert(kit_cargo_projection(&kit, &view) && !view.selector && view.action_count == 2);
  const uint8_t *rgb = native_ui_cargo(context, &view, 1);
  assert(rgb);
  memcpy(normal, rgb, 450 * 600 * 3);
  for (unsigned index = 0; index < 4; ++index) {
    kit.companion.page = COMP_MODES;
    kit.companion.focus = COMP_CARGO;
    assert(kit_cargo_projection(&kit, &view) && native_ui_cargo(context, &view, 1));
    kit.companion.page = COMP_CARGO;
    kit.companion.focus = 1;
    assert(kit_cargo_projection(&kit, &view));
    rgb = native_ui_cargo(context, &view, 1);
    assert(rgb && !memcmp(normal, rgb, 450 * 600 * 3));
  }
  free(normal);
  native_ui_destroy(context);
}
static void representative_fixture_exports(const char *directory) {
  NativeUiContext *context = native_ui_create();
  assert(context);
  CompanionCargoView full = example();
  full.supplies[0] = 40;
  full.supplies[1] = full.supplies[2] = 0;
  full.focus = 1;
  const uint8_t *rgb = native_ui_cargo(context, &full, 1);
  assert(rgb);
  char path[512];
  snprintf(path, sizeof(path), "%s/fixture-full40.bmp", directory);
  export_bmp(path, rgb);
  CompanionCargoView error = full;
  error.failed = 1;
  error.action_count = error.capsules = 0;
  strcpy(error.capsule, "No sample in cargo");
  strcpy(error.detail, "Storage unavailable. Cargo preserved.");
  strcpy(error.capacity, "Supplies 40 / 40   Capsules 0 / 1");
  strcpy(error.feedback, "Storage unavailable");
  CompanionCargoView unchanged = error;
  rgb = native_ui_cargo(context, &error, 1);
  assert(rgb && !memcmp(&error, &unchanged, sizeof(error)));
  snprintf(path, sizeof(path), "%s/fixture-storage-error.bmp", directory);
  export_bmp(path, rgb);
  CompanionCargoView review = full;
  review.screen = COMPANION_SEND_SCREEN;
  strcpy(review.title, "Return to Station");
  strcpy(review.detail, "Contents unknown\nSeals cargo; exploration stops.");
  strcpy(review.actions[1], "Keep cargo");
  strcpy(review.footer, "Back: Keep cargo");
  rgb = native_ui_cargo(context, &review, 1);
  assert(rgb);
  snprintf(path, sizeof(path), "%s/fixture-send-sample.bmp", directory);
  export_bmp(path, rgb);
  review.capsules = 0;
  strcpy(review.capsule, "Sample ready at Station");
  strcpy(review.detail, "Recorded on acceptance.\nSeals cargo; exploration stops.");
  strcpy(review.capacity, "Supplies 40 / 40   Capsules 0 / 1");
  rgb = native_ui_cargo(context, &review, 1);
  assert(rgb);
  snprintf(path, sizeof(path), "%s/fixture-send-legacy-expected.bmp", directory);
  export_bmp(path, rgb);
  review.failed = 1;
  review.action_count = 0;
  strcpy(review.detail, "Storage unavailable. Cargo preserved.");
  strcpy(review.feedback, "Storage unavailable");
  strcpy(review.footer, "Storage recovery required");
  rgb = native_ui_cargo(context, &review, 1);
  assert(rgb);
  snprintf(path, sizeof(path), "%s/fixture-send-storage-error.bmp", directory);
  export_bmp(path, rgb);
  native_ui_destroy(context);
  snprintf(path, sizeof(path), "%s/cargo-fixtures.txt", directory);
  FILE *metadata = fopen(path, "w");
  assert(metadata);
  fputs("Representative presentation fixtures, not actual play:\n"
        "fixture-full40: capacity40, Data40, other supplies0, capsule1, Discard focus.\n"
        "fixture-storage-error: current40 supplies, no capsule, storage recovery copy, no actions.\n", metadata);
  fputs("fixture-send-sample: actual owned sample represented synthetically, Keep focus.\n"
        "fixture-send-legacy-expected: no carried capsule; expected sample on acceptance, Keep focus.\n"
        "fixture-send-storage-error: preserved cargo, closed actions and recovery feedback.\n", metadata);
  assert(!fclose(metadata));
}
static void copy_snapshot_file(const char *source, const char *destination, int optional) {
  FILE *input = fopen(source, "rb");
  if (!input && optional && errno == ENOENT) return;
  assert(input);
  FILE *output = fopen(destination, "wb");
  assert(output);
  uint8_t bytes[4096];
  size_t count;
  while ((count = fread(bytes, 1, sizeof(bytes), input)) != 0)
    assert(fwrite(bytes, 1, count, output) == count);
  assert(!ferror(input));
  assert(!fclose(input) && !fclose(output));
}
static void actual_save_motion(const char *directory, const char *source) {
  /* Normal loaders can migrate/journal. Give them a disposable snapshot, never
   * the source world's files. Rendering itself must preserve the loaded game. */
  char temporary[470];
  int length = snprintf(temporary, sizeof(temporary), "%s/cargo-ui-save-XXXXXX", directory);
  assert(length > 0 && (size_t)length < sizeof(temporary) && mkdtemp(temporary));
  char snapshot[512];
  length = snprintf(snapshot, sizeof(snapshot), "%s/world.save", temporary);
  assert(length > 0 && (size_t)length < sizeof(snapshot));
  const char *suffixes[] = {"", ".kit", ".kit.required"};
  for (unsigned index = 0; index < 3; ++index) {
    char input[560], output[560];
    length = snprintf(input, sizeof(input), "%s%s", source, suffixes[index]);
    assert(length > 0 && (size_t)length < sizeof(input));
    length = snprintf(output, sizeof(output), "%s%s", snapshot, suffixes[index]);
    assert(length > 0 && (size_t)length < sizeof(output));
    copy_snapshot_file(input, output, index != 0);
  }
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, snapshot, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  kit.companion.page = kit.companion.mode = COMP_CARGO;
  CompanionCargoView view;
  assert(kit_cargo_projection(&kit, &view));
  GameState before = lab.game;
  rendering_and_motion(directory, &view);
  assert(!memcmp(&before, &lab.game, sizeof(before)));
  char metadata[560];
  length = snprintf(metadata, sizeof(metadata), "%s/cargo-projection.txt", directory);
  assert(length > 0 && (size_t)length < sizeof(metadata));
  FILE *output = fopen(metadata, "w");
  assert(output);
  fprintf(output, "Copied actual Cargo projection: %s\nSupplies: %u/%u/%u\nCapsules: %u\n"
          "Controlled presentation focus0->1, still and0/60/120ms. No live input timing.\n",
          view.identity, view.supplies[0], view.supplies[1], view.supplies[2], view.capsules);
  assert(!fclose(output));
  const char *cleanup[] = {"", ".kit", ".kit.required", ".lock", ".kit.lock", ".kit.required.lock"};
  for (unsigned index = 0; index < sizeof(cleanup)/sizeof(cleanup[0]); ++index) {
    char path[560];
    length = snprintf(path, sizeof(path), "%s%s", snapshot, cleanup[index]);
    assert(length > 0 && (size_t)length < sizeof(path));
    if (unlink(path)) assert(errno == ENOENT);
  }
  assert(!rmdir(temporary));
}
int main(int argc, char **argv) {
  image_fidelity();
  projection_truth();
  cargo_preview_projection_truth();
  send_projection_truth();
  discard_finish_projection_truth();
  portable_cargo_send_module();
  cargo_preview_rendering(argc >= 2 ? argv[1] : NULL);
  if (argc == 3) actual_save_motion(argv[1], argv[2]);
  else rendering_and_motion(argc == 2 ? argv[1] : NULL, NULL);
  if (argc >= 2) {
    representative_fixture_exports(argv[1]);
    discard_finish_fixture_exports(argv[1]);
  }
  puts("Companion Cargo UI checks passed");
  return 0;
}
