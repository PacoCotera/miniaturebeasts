#include "native_ui.h"
#include "ui_assets.h"
#include "../ui/companion_resident_ui.h"
#include "../ui/display.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

static void fixture(SelectedLab *lab, DeviceKit *kit) {
  selected_lab_init(lab);
  memset(kit, 0, sizeof(*kit));
  kit->lab = lab;
  kit->companion.page = COMP_MODES;
  kit->companion.mode = kit->companion.focus = COMP_FRIENDS;
  kit->journal.companion_online = 1;
  lab->game.individual_count = lab->game.sample_count = 2;
  for (unsigned index = 0; index < 2; ++index) {
    GameIndividual *resident = &lab->game.individuals[index];
    snprintf(resident->id, sizeof(resident->id), "resident-%u", index);
    strcpy(resident->source_sample_id, "fixture-source");
    resident->revealed = 1;
    resident->care_visits = index ? 7 : 3;
    assert(!pip_genome_for_sample(index, &resident->genome));
    pip_express(&resident->genome, &resident->expression);
    pip_pin_individual_art(&lab->game, index, index ? "legacy-marked" : "legacy-carried");
    strcpy(resident->art_id, pip_content_art_id(&resident->genome));
    strcpy(resident->art_version, PIP_ART_VERSION);
    kit->residents.residents[index].individual = *resident;
    kit->residents.residents[index].metadata = lab->game.individual_metadata[index];
  }
  kit->residents.count = 2;
  kit->residents.version = 1; /* Existing retained-cache schema, not GameState version. */
  kit->residents.updated_at = 1790850600;
  strcpy(kit->selected_resident_id, "resident-1");
}
static void projection_truth(void) {
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  DeviceKit before = kit;
  GameState world = lab.game;
  CompanionResidentView view;
  assert(kit_resident_projection(&kit, &view));
  assert(view.count == 2 && view.selected_index == 1 && view.visits == 7);
  assert(!strcmp(view.identity, "resident-1") && !strcmp(view.coat, "Pale markings"));
  assert(view.portrait == RESIDENT_PORTRAIT_MARKED);
  assert(!memcmp(&kit, &before, sizeof(kit)) && !memcmp(&world, &lab.game, sizeof(world)));
  KitResidentProjection *record = &kit.residents.residents[1];
  strcpy(record->metadata.mapping_version, "pip-discovery-map-v1");
  strcpy(record->metadata.reference_context, "pip:adult-rested-firm-ground-mild-v1");
  strcpy(record->metadata.candidate_id, "B1");
  assert(kit_resident_projection(&kit, &view) && strstr(view.property, "Burst capable"));
  strcpy(record->metadata.candidate_id, "B0");
  assert(kit_resident_projection(&kit, &view) && strstr(view.property, "Lower walking energy"));
  strcpy(record->metadata.candidate_id, "B1");
  lab.game.sample_count = 0;
  assert(kit_resident_projection(&kit, &view) && strstr(view.property, "Burst capable"));
  strcpy(record->metadata.reference_context, "unsupported-context");
  assert(kit_resident_projection(&kit, &view) && !view.property[0]);
  record->metadata.original_art_sha256[0] ^= 1;
  assert(kit_resident_projection(&kit, &view) && view.portrait == RESIDENT_PORTRAIT_PENDING);
  kit.journal.companion_online = 0;
  assert(kit_resident_projection(&kit, &view) && !view.online && !view.current && !view.failed);
  kit.resident_cache_failed = 1;
  assert(kit_resident_projection(&kit, &view) && !view.failed && strstr(view.status, "Cache unavailable"));
  for (unsigned error = 0; error < 2; ++error) {
    kit.failed = error == 0;
    lab.storage_error = error == 1;
    assert(kit_resident_projection(&kit, &view) && view.failed && view.visits == 7);
  }
  kit.failed = lab.storage_error = 0;
  strcpy(kit.selected_resident_id, "missing");
  assert(!kit_resident_projection(&kit, &view));
  FILE *output = tmpfile();
  assert(output && !kit_bmp(&kit, KIT_COMPANION, output) && !ftell(output));
  fclose(output);
  strcpy(kit.selected_resident_id, "resident-1");
  record->individual.revealed = 0;
  assert(!kit_resident_projection(&kit, &view));
  record->individual.revealed = 1;
  memset(record->individual.id, 'x', sizeof(record->individual.id));
  assert(!kit_resident_projection(&kit, &view));
  kit.residents.count = GAME_MAX_INDIVIDUALS + 1;
  assert(!kit_resident_projection(&kit, &view));
  kit.residents.count = 0;
  kit.selected_resident_id[0] = 0;
  assert(kit_resident_projection(&kit, &view) && !view.count && view.portrait == RESIDENT_EMPTY_HABITAT);
  kit.companion.focus = COMP_CARGO;
  assert(!kit_resident_projection(&kit, &view));
  kit.companion.page = COMP_FRIENDS;
  assert(!kit_resident_projection(&kit, &view));
}
static void action_projection(void) {
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  kit.companion.page = COMP_FRIENDS;
  kit.companion.focus = 1;
  CompanionResidentView view;
  DeviceKit before = kit;
  assert(kit_resident_projection(&kit, &view));
  assert(view.screen == RESIDENT_LIST && view.focus == 1 && !view.action_count);
  assert(!memcmp(&before, &kit, sizeof(kit)));
  kit.companion.focus = 0;
  assert(!kit_resident_projection(&kit, &view)); /* Wrong stable selection, no substitution. */
  kit.companion.page = COMP_FRIEND_VISIT;
  assert(kit_resident_projection(&kit, &view));
  assert(view.screen == RESIDENT_VISIT && view.selected_index == 1 && view.focus == 0);
  assert(view.action_count == 2 && view.available[0] && view.available[1]);
  assert(!strcmp(view.actions[0], "Spend time together") && !strcmp(view.actions[1], "Choose resident"));
  kit.companion.focus = 1;
  assert(kit_resident_projection(&kit, &view) && view.focus == 1);
  kit.companion.focus = 2;
  assert(!kit_resident_projection(&kit, &view));
  kit.companion.focus = 0;
  kit.journal.companion_online = 0;
  assert(kit_resident_projection(&kit, &view) && !view.available[0] && view.available[1]);
  kit.journal.companion_online = 1;
  kit.journal.phase = KIT_WAITING;
  assert(kit_resident_projection(&kit, &view) && !view.available[0] && strstr(view.feedback, "Finish transfer"));
  kit.journal.phase = KIT_IDLE;
  kit.residents.residents[1].individual.care_visits = GAME_MAX_CARE_VISITS;
  lab.game.individuals[1].care_visits = GAME_MAX_CARE_VISITS;
  assert(kit_resident_projection(&kit, &view) && !view.available[0] && view.visits == GAME_MAX_CARE_VISITS);
  kit.resident_cache_failed = 1;
  strcpy(kit.companion.message, "Visit saved in Station (8). Snapshot stale; reconnect to refresh.");
  assert(kit_resident_projection(&kit, &view) && strstr(view.feedback, "Visit saved in Station") && !view.available[0]);
  strcpy(kit.companion.message, "Cached record is stale. Reconnect before visiting.");
  assert(kit_resident_projection(&kit, &view) && !strstr(view.feedback, "Visit saved"));
  for (unsigned error = 0; error < 2; ++error) {
    kit.failed = error == 0;
    lab.storage_error = error == 1;
    assert(kit_resident_projection(&kit, &view) && view.failed && !view.action_count);
  }
  kit.failed = lab.storage_error = kit.resident_cache_failed = 0;
  kit.residents.count = 0;
  kit.selected_resident_id[0] = 0;
  assert(!kit_resident_projection(&kit, &view)); /* Empty visit cannot invent a resident. */
  FILE *output = tmpfile();
  assert(output && !kit_bmp(&kit, KIT_COMPANION, output) && !ftell(output));
  fclose(output);
  kit.companion.page = COMP_FRIENDS;
  assert(kit_resident_projection(&kit, &view) && view.action_count == 1 && view.available[0]);
  assert(!strcmp(view.actions[0], "Return to Probe"));
  fixture(&lab, &kit);
  for (unsigned index = 2; index < GAME_MAX_INDIVIDUALS; ++index) {
    kit.residents.residents[index] = kit.residents.residents[1];
    snprintf(kit.residents.residents[index].individual.id, sizeof(kit.residents.residents[index].individual.id), "resident-%u", index);
    lab.game.individuals[index] = kit.residents.residents[index].individual;
    lab.game.individual_metadata[index] = kit.residents.residents[index].metadata;
  }
  kit.residents.count = lab.game.individual_count = GAME_MAX_INDIVIDUALS;
  snprintf(kit.selected_resident_id, sizeof(kit.selected_resident_id), "resident-%u", GAME_MAX_INDIVIDUALS - 1);
  kit.companion.page = COMP_FRIENDS;
  kit.companion.focus = GAME_MAX_INDIVIDUALS - 1;
  assert(kit_resident_projection(&kit, &view) && view.selected_index == GAME_MAX_INDIVIDUALS - 1);
  kit.companion.page = COMP_FRIEND_VISIT;
  kit.companion.focus = 0;
  assert(kit_resident_projection(&kit, &view) && view.selected_index == GAME_MAX_INDIVIDUALS - 1 && view.focus == 0);
}
typedef struct { size_t buffer_size; unsigned calls; } PartialSink;
static UiFlushResult consume_partial(void *user, UiDisplay *display,
    const UiArea *area, const uint8_t *pixels, size_t stride, UiColorFormat format) {
  (void)display;
  PartialSink *sink = user;
  /* Narrow dirty rectangles can use more than eight rows while still fitting
   * the same bounded eight-full-row buffer. */
  assert(pixels && stride && format == UI_COLOR_RGB888);
  assert(stride * (size_t)(area->y2 - area->y1 + 1) <= sink->buffer_size);
  assert(area->y2 - area->y1 + 1 < 600);
  ++sink->calls;
  return UI_FLUSH_COMPLETE;
}
static void portable_partial(void) {
  UiDisplayProfile profile = {450, 600, 8, UI_COLOR_RGB888};
  size_t draw_size = ui_display_buffer_size(&profile);
  void *draw = malloc(draw_size);
  PartialSink sink = {draw_size, 0};
  UiDisplay *display = ui_display_create(&profile, draw, draw_size, consume_partial, &sink);
  assert(draw && display);
  lv_font_t fonts[5];
  native_ui_font_init(&fonts[0], &lab_heading_fonts[0]);
  native_ui_font_init(&fonts[1], &lab_fonts[0]);
  native_ui_font_init(&fonts[2], &lab_fonts[15]);
  native_ui_font_init(&fonts[3], &lab_fonts[7]);
  native_ui_font_init(&fonts[4], &lab_heading_fonts[4]);
  CompanionResidentFonts supplied = {&fonts[0], &fonts[1], &fonts[2], &fonts[3], &fonts[4]};
  CompanionResidentUi *ui = companion_resident_ui_create(lv_display_get_screen_active(ui_display_lvgl(display)), &supplied);
  assert(ui);
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  CompanionResidentView view;
  assert(kit_resident_projection(&kit, &view));
  NativeUiImage image;
  assert(native_ui_image_init(&image, CORE_ART_PIP_MARKED));
  assert(companion_resident_ui_update(ui, &view, &image.image));
  memset(&view, 0, sizeof(view));
  lv_refr_now(ui_display_lvgl(display));
  assert(sink.calls);
  lv_mem_monitor_t warm, final;
  lv_mem_monitor(&warm);
  for (unsigned index = 0; index < 100; ++index) {
    kit.companion.page = index % 3 == 0 ? COMP_MODES : index % 3 == 1 ? COMP_FRIENDS : COMP_FRIEND_VISIT;
    kit.companion.focus = kit.companion.page == COMP_MODES ? COMP_FRIENDS : kit.companion.page == COMP_FRIENDS ? 1 : index & 1;
    kit.failed = index & 1;
    assert(kit_resident_projection(&kit, &view));
    assert(companion_resident_ui_update(ui, &view, &image.image));
    lv_refr_now(ui_display_lvgl(display));
  }
  lv_mem_monitor(&final);
  assert(warm.free_size == final.free_size);
  kit.failed = 0;
  kit.companion.page = COMP_FRIEND_VISIT;
  kit.companion.focus = 0;
  assert(kit_resident_projection(&kit, &view));
  assert(companion_resident_ui_update(ui, &view, &image.image));
  memset(&view, 0, sizeof(view));
  lv_refr_now(ui_display_lvgl(display)); /* Action labels/footer are copied too. */
  assert(kit_resident_projection(&kit, &view));
  view.action_count = 1;
  assert(!companion_resident_ui_update(ui, &view, &image.image));
  assert(kit_resident_projection(&kit, &view));
  view.screen = 99;
  assert(!companion_resident_ui_update(ui, &view, &image.image));
  view.portrait = RESIDENT_EMPTY_HABITAT;
  assert(!companion_resident_ui_update(ui, &view, &image.image));
  assert(kit_resident_projection(&kit, &view));
  assert(!companion_resident_ui_update(ui, &view, NULL));
  memset(view.identity, 'x', sizeof(view.identity));
  assert(!companion_resident_ui_update(ui, &view, &image.image));
  kit.residents.count = 0;
  kit.selected_resident_id[0] = 0;
  kit.companion.page = COMP_FRIENDS;
  kit.companion.focus = 0;
  assert(kit_resident_projection(&kit, &view));
  view.focus = view.selected_index = 1;
  /* The shape is valid for an empty view, so failure must precede layout. */
  lv_image_dsc_t empty_shape = image.image;
  empty_shape.header.w = 136;
  empty_shape.header.h = 144;
  assert(!companion_resident_ui_update(ui, &view, &empty_shape));
  companion_resident_ui_destroy(ui);
  native_ui_image_destroy(&image);
  assert(ui_display_destroy(display));
  free(draw);
}
static void exports_and_roots(const char *directory) {
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  NativeUiContext *context = native_ui_create();
  NativeUiContext *second = native_ui_create();
  assert(context && second);
  const char *names[] = {"marked", "plain", "saved-b1", "pending-portrait", "offline",
                         "cache-error", "kit-error", "lab-error", "pending-transfer", "empty"};
  uint8_t *baseline = malloc(450 * 600 * 3);
  assert(baseline);
  for (unsigned index = 0; index < 10; ++index) {
    fixture(&lab, &kit);
    if (index == 1) strcpy(kit.selected_resident_id, "resident-0");
    if (index == 2) {
      strcpy(kit.residents.residents[1].metadata.mapping_version, "pip-discovery-map-v1");
      strcpy(kit.residents.residents[1].metadata.reference_context, "pip:adult-rested-firm-ground-mild-v1");
      strcpy(kit.residents.residents[1].metadata.candidate_id, "B1");
    }
    if (index == 3) kit.residents.residents[1].individual.art_pending = 1;
    kit.journal.companion_online = index != 4;
    kit.resident_cache_failed = index == 5;
    kit.failed = index == 6;
    lab.storage_error = index == 7;
    if (index == 8) kit.journal.phase = KIT_WAITING;
    if (index == 9) { kit.residents.count = lab.game.individual_count = 0; kit.selected_resident_id[0] = 0; }
    CompanionResidentView view;
    assert(kit_resident_projection(&kit, &view));
    const uint8_t *rgb = native_ui_resident(context, &view);
    assert(rgb);
    if (!index) memcpy(baseline, rgb, 450 * 600 * 3);
    if (directory) {
      char path[512];
      snprintf(path, sizeof(path), "%s/fixture-resident-%s.bmp", directory, names[index]);
      FILE *output = fopen(path, "wb");
      assert(output && kit_bmp_ui(&kit, KIT_COMPANION, output, context, 1) && !fclose(output));
    }
  }
  const char *action_names[] = {"list-last", "list-empty", "visit-ready", "visit-choose",
      "visit-offline", "visit-pending", "visit-limit", "visit-saved", "visit-cache-saved",
      "visit-kit-error", "visit-lab-error", "visit-pressed", "list-one", "list-maximum"};
  for (unsigned index = 0; index < sizeof(action_names) / sizeof(action_names[0]); ++index) {
    fixture(&lab, &kit);
    kit.companion.page = index < 2 || index >= 12 ? COMP_FRIENDS : COMP_FRIEND_VISIT;
    kit.companion.focus = kit.companion.page == COMP_FRIENDS ? 1 : 0;
    if (index == 1) { kit.residents.count = lab.game.individual_count = 0; kit.selected_resident_id[0] = 0; kit.companion.focus = 0; }
    if (index == 3) kit.companion.focus = 1;
    if (index == 4) kit.journal.companion_online = 0;
    if (index == 5) kit.journal.phase = KIT_WAITING;
    if (index == 6) kit.residents.residents[1].individual.care_visits = lab.game.individuals[1].care_visits = GAME_MAX_CARE_VISITS;
    if (index == 7 || index == 8) {
      strcpy(kit.companion.message, index == 7 ? "Visit saved (8). Pip settles beside you." :
                                             "Visit saved in Station (8). Snapshot stale; reconnect to refresh.");
      lab.game.individuals[1].care_visits = 8;
      if (index == 7) kit.residents.residents[1].individual.care_visits = 8;
    }
    if (index == 8) kit.resident_cache_failed = 1;
    if (index == 9) kit.failed = 1;
    if (index == 10) lab.storage_error = 1;
    if (index == 11) kit.companion.gestures[8].held = kit.companion.gestures[8].allowed = 1;
    if (index == 12) { kit.residents.count = lab.game.individual_count = 1; strcpy(kit.selected_resident_id, "resident-0"); kit.companion.focus = 0; }
    if (index == 13) {
      for (unsigned resident = 2; resident < GAME_MAX_INDIVIDUALS; ++resident) {
        kit.residents.residents[resident] = kit.residents.residents[1];
        snprintf(kit.residents.residents[resident].individual.id, sizeof(kit.residents.residents[resident].individual.id), "resident-%u", resident);
        lab.game.individuals[resident] = kit.residents.residents[resident].individual;
        lab.game.individual_metadata[resident] = kit.residents.residents[resident].metadata;
      }
      kit.residents.count = lab.game.individual_count = GAME_MAX_INDIVIDUALS;
      kit.companion.focus = GAME_MAX_INDIVIDUALS - 1;
      snprintf(kit.selected_resident_id, sizeof(kit.selected_resident_id), "resident-%u", GAME_MAX_INDIVIDUALS - 1);
    }
    CompanionResidentView view;
    assert(kit_resident_projection(&kit, &view) && native_ui_resident(context, &view));
    if (directory) {
      char path[512];
      snprintf(path, sizeof(path), "%s/fixture-resident-%s.bmp", directory, action_names[index]);
      FILE *output = fopen(path, "wb");
      assert(output && kit_bmp_ui(&kit, KIT_COMPANION, output, context, 1) && !fclose(output));
    }
  }
  fixture(&lab, &kit);
  for (unsigned index = 0; index < 3; ++index) {
    kit.companion.mode = kit.companion.focus = COMP_CARGO;
    CompanionCargoView cargo;
    assert(kit_cargo_projection(&kit, &cargo) && native_ui_cargo(context, &cargo, 1));
    kit.companion.mode = kit.companion.focus = COMP_PROBE;
    CompanionProbeView probe;
    assert(kit_probe_projection(&kit, &probe) && native_ui_probe(context, &probe));
    kit.companion.mode = kit.companion.focus = COMP_FRIENDS;
    CompanionResidentView resident;
    assert(kit_resident_projection(&kit, &resident));
    const uint8_t *rgb = native_ui_resident(context, &resident);
    assert(rgb && !memcmp(baseline, rgb, 450 * 600 * 3));
  }
  lv_mem_monitor_t memory;
  lv_mem_monitor(&memory);
  printf("Two host contexts with one resident preview: %zu / %zu LVGL pool bytes\n",
         memory.total_size - memory.free_size, memory.total_size);
  native_ui_destroy(second);
  native_ui_destroy(context);
  free(baseline);
}
int main(int argc, char **argv) {
  projection_truth();
  action_projection();
  portable_partial();
  exports_and_roots(argc == 2 ? argv[1] : NULL);
  puts("Companions resident family checks passed");
  return 0;
}
