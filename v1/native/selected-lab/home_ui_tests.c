#include "home_view.h"
#include "native_ui.h"
#include "../ui/display.h"
#include <assert.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* All content fixtures below are synthetic retained facts, not played births. */
static void populated(SelectedLab *lab, DeviceKit *kit) {
  selected_lab_init(lab);
  memset(kit, 0, sizeof(*kit));
  kit->lab = lab;
  lab->game.data = GAME_SUPPLY_UNIT;
  lab->game.energy = 2 * GAME_SUPPLY_UNIT;
  lab->game.essence = 3 * GAME_SUPPLY_UNIT;
  lab->game.sample_count = lab->game.individual_count = 2;
  for (unsigned index = 0; index < 2; ++index) {
    GameSample *sample = &lab->game.samples[index];
    snprintf(sample->id, sizeof(sample->id), "fixture-source-%u", index);
    sample->decoded_facts = PIP_REQUIRED_FACTS_MASK;
    sample->decoded_studies = PIP_REQUIRED_FACTS_MASK;
    GameIndividual *resident = &lab->game.individuals[index];
    snprintf(resident->id, sizeof(resident->id), "fixture-resident-%u", index);
    strcpy(resident->source_sample_id, sample->id);
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
  lab->sample = lab->resident = 1;
  kit->residents.count = 2;
  kit->residents.version = 1;
  kit->journal.companion_online = kit->journal.dock_online = 1;
  kit->companion.page = COMP_MODES;
  kit->companion.focus = kit->companion.mode = COMP_FRIENDS;
  strcpy(kit->selected_resident_id, "fixture-resident-1");
}

static void projection_cases(void) {
  SelectedLab lab;
  DeviceKit kit;
  populated(&lab, &kit);
  LabHomeView view;
  for (unsigned focus = 0; focus < 5; ++focus) {
    lab.focus = focus;
    SelectedLab before = lab;
    assert(selected_lab_home_view(&lab, NULL, 0, &view));
    assert(view.focus == focus && view.stock[0] == 1 && view.stock[2] == 3);
    assert(!strcmp(view.stock_units[0], "unit") && !strcmp(view.stock_units[1], "units"));
    assert(!memcmp(&before, &lab, sizeof(lab)));
  }
  assert(view.gallery.count == 2 && view.gallery.selected == 1);
  assert(view.gallery.entries[1].portrait == LAB_RESIDENT_PORTRAIT_MARKED);
  assert(!strcmp(view.gallery.entries[1].id, "fixture-resident-1") && view.gallery.visits == 7);
  lab.resident = GAME_MAX_INDIVIDUALS;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(view.gallery.selected == 0 && view.gallery.entries[0].portrait == LAB_RESIDENT_PORTRAIT_PLAIN);
  lab.game.individuals[0].revealed = 0;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(view.gallery.count == 1 && view.gallery.entries[0].portrait == LAB_RESIDENT_PORTRAIT_MARKED);
  lab.game.individual_metadata[1].original_art_sha256[0] ^= 1;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(view.gallery.entries[0].portrait == LAB_RESIDENT_PORTRAIT_PENDING);
  lab.game.individuals[1].revealed = 0;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!view.gallery.count && !view.gallery.entries[0].id[0]);

  lab.focus = 0;
  lab.sample = GAME_MAX_SAMPLES;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!strcmp(view.overview[1].detail[1], "Awaiting samples"));
  lab.game.data = lab.game.energy = lab.game.essence = UINT32_MAX;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(view.stock[0] == UINT32_MAX / GAME_SUPPLY_UNIT);
  memset(lab.game.samples[1].id, 'S', sizeof(lab.game.samples[1].id) - 1);
  lab.game.samples[1].id[sizeof(lab.game.samples[1].id) - 1] = 0;
  lab.sample = 1;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!strcmp(view.overview[1].detail[1], lab.game.samples[1].id));

  SelectedLabRenderContext context = {SELECTED_HAUL_WAITING, {100, 200, 300}};
  lab.focus = 1;
  GameState before = lab.game;
  assert(selected_lab_home_view(&lab, &context, 1, &view));
  assert(view.landing.primary_resources && view.landing.amounts[2] == 3);
  assert(strstr(view.landing.strip, "separate") && strstr(view.warning, "Accept the existing haul"));
  assert(!memcmp(&before, &lab.game, sizeof(before)));
  context.haul = SELECTED_HAUL_STORED;
  assert(selected_lab_home_view(&lab, &context, 0, &view));
  assert(strstr(view.landing.strip, "included") && view.stock[0] == UINT32_MAX / GAME_SUPPLY_UNIT);
  assert(!view.landing.show_resources && !view.landing.primary_resources);
  for (unsigned resource = 0; resource < 3; ++resource) assert(!view.landing.amounts[resource]);
  context.haul = SELECTED_HAUL_WAITING;
  for (unsigned i = 0; i < 3; ++i) context.incoming[i] = UINT32_MAX;
  assert(selected_lab_home_view(&lab, &context, 0, &view));
  char expected[96];
  snprintf(expected, sizeof(expected), "%" PRIu64 " incoming units", (UINT64_C(3) * UINT32_MAX) / GAME_SUPPLY_UNIT);
  assert(!strcmp(view.overview[0].detail[1], expected));

  lab.focus = 3;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(strstr(view.landing.body, "ready to prepare"));
  lab.game.samples[0].incubated = lab.game.samples[1].incubated = 1;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(strstr(view.landing.body, "Complete"));
  lab.game.incubation_active = 1;
  lab.game.incubation_sample = 1;
  lab.game.incubation_elapsed = 7;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(view.landing.art == LAB_HOME_ART_SAMPLE && view.landing.progress == 7);
  assert(strstr(view.landing.details[0], lab.game.samples[1].id));
  lab.game.incubation_ready = 1;
  lab.game.incubation_elapsed = GAME_INCUBATION_SECONDS;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!strcmp(view.landing.heading, "READY TO OPEN") && view.landing.art == LAB_HOME_ART_SAMPLE);
  lab.storage_error = 1;
  strcpy(lab.message, "Saved world retained; storage unavailable.");
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!strcmp(view.warning, lab.message));
  lab.focus = 5;
  assert(!selected_lab_home_view(&lab, NULL, 0, &view));
  lab.focus = 0;
  lab.page = V1_SAMPLES;
  assert(!selected_lab_home_view(&lab, NULL, 0, &view));
  lab.page = V1_HOME;
  lab.game.sample_count = GAME_MAX_SAMPLES + 1;
  assert(!selected_lab_home_view(&lab, NULL, 0, &view));
  populated(&lab, &kit);
  lab.focus = 4;
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  LabHomeView untouched = view;
  strcpy(lab.game.individuals[1].id, lab.game.individuals[0].id);
  assert(!selected_lab_home_view(&lab, NULL, 0, &view));
  assert(!memcmp(&untouched, &view, sizeof(view)));
}

static void button(SelectedLab *lab, SelectedInput down) {
  selected_lab_input(lab, SELECTED_READY, 0, lab->revision);
  unsigned revision = lab->revision;
  selected_lab_input(lab, down, 0, revision);
  selected_lab_input(lab, (SelectedInput)(down + 1), 0, revision);
}

static void physical_navigation(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  GameState before = lab.game;
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_HOME && lab.focus == 0);
  for (unsigned focus = 1; focus < 5; ++focus) {
    button(&lab, SELECTED_DOWN_DOWN);
    assert(lab.page == V1_HOME && lab.focus == focus);
    button(&lab, SELECTED_CONFIRM_DOWN);
    assert(lab.page != V1_HOME);
    button(&lab, SELECTED_BACK_DOWN);
    assert(lab.page == V1_HOME && lab.focus == focus);
    assert(!memcmp(&before, &lab.game, sizeof(before)));
  }
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_HOME_DOWN);
  assert(lab.page == V1_HOME && lab.focus == 0);
  assert(!memcmp(&before, &lab.game, sizeof(before)));
}

static void export_fixture(DeviceKit *kit, NativeUiContext *home, const char *name) {
  const char *directory = getenv("BEECHO_HOME_PROOF");
  if (!directory) return;
  char path[768];
  assert(snprintf(path, sizeof(path), "%s/fixture-home-%s.bmp", directory, name) < (int)sizeof(path));
  FILE *output = fopen(path, "wb");
  assert(output && kit_bmp_ui(kit, KIT_LAB, output, home, 1) && !fclose(output));
}

static void assert_bmp_pixels(FILE *output, const uint8_t *rgb) {
  assert(!fseek(output, 54, SEEK_SET));
  uint8_t row[SELECTED_LAB_WIDTH * 3];
  for (unsigned y = SELECTED_LAB_HEIGHT; y-- > 0;) {
    assert(fread(row, sizeof(row), 1, output) == 1);
    for (unsigned x = 0; x < SELECTED_LAB_WIDTH; ++x) {
      const uint8_t *pixel = rgb + (y * SELECTED_LAB_WIDTH + x) * 3;
      assert(row[x * 3] == pixel[2] && row[x * 3 + 1] == pixel[1] && row[x * 3 + 2] == pixel[0]);
    }
  }
}

static void assert_equal_bmps(FILE *first, FILE *second) {
  assert(ftell(first) == ftell(second) && !fseek(first, 0, SEEK_SET) && !fseek(second, 0, SEEK_SET));
  uint8_t left[4096], right[4096];
  size_t count;
  while ((count = fread(left, 1, sizeof(left), first)) != 0) {
    assert(fread(right, 1, count, second) == count && !memcmp(left, right, count));
  }
  assert(!ferror(first) && !ferror(second) && fgetc(second) == EOF);
}

static void frame_route_equivalence(void) {
  SelectedLab lab;
  DeviceKit kit;
  populated(&lab, &kit);
  NativeUiContext *home = native_ui_create_device(KIT_LAB);
  assert(home);
  for (unsigned focus = 0; focus < 5; ++focus) {
    lab.focus = focus;
    FILE *standalone = tmpfile(), *connected = tmpfile();
    assert(standalone && connected);
    assert(selected_lab_bmp(&lab, standalone) && kit_bmp_ui(&kit, KIT_LAB, connected, home, 1));
    assert_equal_bmps(standalone, connected);
    assert(!fclose(standalone) && !fclose(connected));
    lab.kit_mode = 1;
    FILE *generic = tmpfile(), *persistent = tmpfile();
    assert(generic && persistent);
    assert(kit_bmp(&kit, KIT_LAB, generic) && kit_bmp_ui(&kit, KIT_LAB, persistent, home, 1));
    assert_equal_bmps(generic, persistent);
    assert(!fclose(generic) && !fclose(persistent));
    lab.kit_mode = 0;
  }
  lab.focus = 5;
  FILE *invalid_standalone = tmpfile(), *invalid_connected = tmpfile();
  assert(invalid_standalone && invalid_connected);
  assert(!selected_lab_bmp(&lab, invalid_standalone) && !ftell(invalid_standalone));
  assert(!kit_bmp_ui(&kit, KIT_LAB, invalid_connected, home, 1) && !ftell(invalid_connected));
  assert(!fclose(invalid_standalone) && !fclose(invalid_connected));
  native_ui_destroy(home);
  assert(ui_display_count() == 0);
}

static void retained_lifetime_and_exports(void) {
  SelectedLab lab;
  DeviceKit kit;
  populated(&lab, &kit);
  lab.kit_mode = 1;
  NativeUiContext *companion = native_ui_create();
  NativeUiContext *dock = native_ui_create_device(KIT_DOCK);
  assert(companion && dock);
  CompanionResidentView resident;
  DockView dock_view;
  assert(kit_resident_projection(&kit, &resident) && native_ui_resident(companion, &resident));
  assert(kit_dock_projection(&kit, &dock_view) && native_ui_dock(dock, &dock_view));
  lv_mem_monitor_t before_home;
  lv_mem_monitor(&before_home);
  printf("Before lazy Home: used=%zu peak=%zu total=%zu\n", before_home.total_size - before_home.free_size, before_home.max_used, before_home.total_size);
  fflush(stdout);
  NativeUiContext *home = native_ui_create_device(KIT_LAB);
  assert(home && ui_display_count() == 3);
  LabHomeView view;
  for (unsigned focus = 0; focus < 5; ++focus) {
    lab.focus = focus;
    assert(selected_lab_home_view(&lab, NULL, 0, &view) && native_ui_home(home, &view));
    char name[32];
    snprintf(name, sizeof(name), "populated-%u", focus);
    export_fixture(&kit, home, name);
  }
  const uint8_t *rgb = native_ui_home(home, &view);
  uint8_t *baseline = malloc(SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3);
  assert(rgb && baseline);
  memcpy(baseline, rgb, SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3);
  memset(&view, 'X', sizeof(view));
  lv_display_t *display = lv_display_get_default();
  lv_obj_invalidate(lv_display_get_screen_active(display));
  lv_refr_now(display);
  assert(!memcmp(baseline, rgb, SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3));
  assert(selected_lab_home_view(&lab, NULL, 0, &view));
  LabHomeView invalid = view;
  invalid.focus = 5;
  assert(!native_ui_home(home, &invalid));
  invalid = view;
  invalid.landing.art = (LabHomeArt)-1;
  assert(!native_ui_home(home, &invalid));
  invalid = view;
  memset(invalid.title, 'X', sizeof(invalid.title));
  assert(!native_ui_home(home, &invalid));
  invalid = view;
  invalid.landing.show_progress = 1;
  invalid.landing.total = 0;
  assert(!native_ui_home(home, &invalid));
  invalid = view;
  invalid.gallery.selected = invalid.gallery.count;
  assert(!native_ui_home(home, &invalid));
  invalid = view;
  strcpy(invalid.gallery.entries[1].id, invalid.gallery.entries[0].id);
  assert(!native_ui_home(home, &invalid));

  lab.focus = 1;
  kit.journal.cargo[0] = 300;
  kit.journal.cargo[1] = 200;
  kit.journal.cargo[2] = 100;
  /* An uncommitted receipt has a real identity; empty IDs/sequence zero would
   * accidentally match unused synthetic operation slots. */
  strcpy(kit.journal.haul_id, "fixture-home-receipt");
  kit.journal.accept_sequence = 7;
  const unsigned phases[] = {KIT_WAITING, KIT_ARRIVED, KIT_COMMITTING, KIT_ACK_PENDING, KIT_COMPLETE};
  for (unsigned i = 0; i < sizeof(phases) / sizeof(phases[0]); ++i) {
    kit.journal.phase = phases[i];
    DeviceKit original = kit;
    GameState world = lab.game;
    FILE *output = tmpfile();
    assert(output && kit_bmp_ui(&kit, KIT_LAB, output, home, 1));
    assert(ftell(output) == 54 + SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3);
    SelectedLabRenderContext projected = {SELECTED_HAUL_NONE, {300, 200, 100}};
    if (phases[i] == KIT_ARRIVED || phases[i] == KIT_COMMITTING) projected.haul = SELECTED_HAUL_WAITING;
    int accepted = phases[i] == KIT_ACK_PENDING || phases[i] == KIT_COMPLETE;
    assert(!!kit_delivery_accepted(&kit) == accepted);
    if (accepted) {
      projected.haul = SELECTED_HAUL_STORED;
      memset(projected.incoming, 0, sizeof(projected.incoming));
    }
    assert(selected_lab_home_view(&lab, &projected, 0, &view));
    assert(view.stock[0] == 1 && view.stock[1] == 2 && view.stock[2] == 3);
    if (accepted) {
      assert(!strcmp(view.landing.heading, "SOURCE CARGO EMPTY"));
      assert(!view.landing.show_resources && !view.landing.primary_resources);
      for (unsigned resource = 0; resource < 3; ++resource) assert(!view.landing.amounts[resource]);
    } else if (projected.haul == SELECTED_HAUL_WAITING) {
      assert(view.landing.primary_resources && view.landing.amounts[0] == 3 &&
             view.landing.amounts[1] == 2 && view.landing.amounts[2] == 1);
    }
    const uint8_t *expected_frame = native_ui_home(home, &view);
    assert(expected_frame);
    assert_bmp_pixels(output, expected_frame);
    assert(!fclose(output) && !memcmp(&original, &kit, sizeof(kit)) && !memcmp(&world, &lab.game, sizeof(world)));
  }
  kit.journal.phase = KIT_ARRIVED;
  export_fixture(&kit, home, "incoming");
  kit.journal.phase = KIT_COMPLETE;
  export_fixture(&kit, home, "stored");
  kit.journal.phase = KIT_IDLE;
  lab.focus = 3;
  lab.game.incubation_ready = 1;
  lab.game.incubation_sample = 1;
  lab.game.incubation_elapsed = GAME_INCUBATION_SECONDS;
  export_fixture(&kit, home, "ready-unrevealed");
  lab.focus = 4;
  export_fixture(&kit, home, "resident-marked");
  lab.game.individuals[1].art_pending = 1;
  export_fixture(&kit, home, "portrait-pending");
  lab.storage_error = 1;
  strcpy(lab.message, "Saved world retained; storage unavailable.");
  export_fixture(&kit, home, "storage-error");
  lab.storage_error = 0;
  kit.failed = 1;
  export_fixture(&kit, home, "kit-error");
  kit.failed = 0;
  /* The valid stock ceiling is one million internal hundredths. */
  lab.game.data = lab.game.energy = lab.game.essence = 1000000;
  memset(lab.game.samples[1].id, 'S', sizeof(lab.game.samples[1].id) - 1);
  lab.game.samples[1].id[sizeof(lab.game.samples[1].id) - 1] = 0;
  memset(lab.game.individuals[1].id, 'R', sizeof(lab.game.individuals[1].id) - 1);
  lab.game.individuals[1].id[sizeof(lab.game.individuals[1].id) - 1] = 0;
  memset(lab.game.individuals[1].source_sample_id, 'S', sizeof(lab.game.individuals[1].source_sample_id) - 1);
  lab.game.individuals[1].source_sample_id[sizeof(lab.game.individuals[1].source_sample_id) - 1] = 0;
  lab.game.individuals[1].art_pending = 0;
  lab.focus = 0;
  export_fixture(&kit, home, "maximum-overview");
  lab.focus = 4;
  export_fixture(&kit, home, "maximum-resident-id");
  /* Simultaneous maximum population remains a synthetic presentation fixture. */
  for (unsigned index = 2; index < GAME_MAX_INDIVIDUALS; ++index) {
    lab.game.individuals[index] = lab.game.individuals[index % 2];
    lab.game.individual_metadata[index] = lab.game.individual_metadata[index % 2];
    snprintf(lab.game.individuals[index].id, sizeof(lab.game.individuals[index].id),
        "fixture-home-population-%u", index);
  }
  lab.game.individual_count = GAME_MAX_INDIVIDUALS;
  export_fixture(&kit, home, "population-eight");
  lab.game.individual_count = 5;
  lab.resident = 4;
  export_fixture(&kit, home, "population-five");
  lab.game.sample_count = lab.game.individual_count = 0;
  lab.game.incubation_ready = 0;
  lab.game.data = lab.game.energy = lab.game.essence = 0;
  for (unsigned focus = 0; focus < 5; ++focus) {
    lab.focus = focus;
    char name[32];
    snprintf(name, sizeof(name), "empty-%u", focus);
    export_fixture(&kit, home, name);
  }
  lv_mem_monitor_t warm, first_cycle, final;
  for (unsigned focus = 0; focus < 5; ++focus) {
    lab.focus = focus;
    assert(selected_lab_home_view(&lab, NULL, 0, &view) && native_ui_home(home, &view));
  }
  lv_mem_monitor(&warm);
  for (unsigned update = 0; update < 100; ++update) {
    lab.focus = update % 5;
    assert(selected_lab_home_view(&lab, NULL, 0, &view) && native_ui_home(home, &view));
    assert(native_ui_resident(companion, &resident) && native_ui_dock(dock, &dock_view));
  }
  lv_mem_monitor(&first_cycle);
  for (unsigned update = 0; update < 100; ++update) {
    lab.focus = update % 5;
    assert(selected_lab_home_view(&lab, NULL, 0, &view) && native_ui_home(home, &view));
    assert(native_ui_resident(companion, &resident) && native_ui_dock(dock, &dock_view));
  }
  lv_mem_monitor(&final);
  printf("Three-context pool: before=%zu first100=%zu second100=%zu; first_delta=%" PRId64 " second_delta=%" PRId64 " peak=%zu total=%zu\n",
      warm.total_size - warm.free_size, first_cycle.total_size - first_cycle.free_size,
      final.total_size - final.free_size, (int64_t)warm.free_size - (int64_t)first_cycle.free_size,
      (int64_t)first_cycle.free_size - (int64_t)final.free_size, final.max_used, final.total_size);
  fflush(stdout);
  /* Compare identical full-device cycles; the first is recorded initialization,
   * rather than comparing Home-only work with later Companion/Dock updates. */
  assert(first_cycle.free_size == final.free_size);
  const uint8_t *companion_frame = native_ui_resident(companion, &resident);
  const uint8_t *dock_frame = native_ui_dock(dock, &dock_view);
  uint8_t *companion_saved = malloc(450 * 600 * 3), *dock_saved = malloc(792 * 272 * 3);
  assert(companion_saved && dock_saved);
  memcpy(companion_saved, companion_frame, 450 * 600 * 3);
  memcpy(dock_saved, dock_frame, 792 * 272 * 3);
  native_ui_destroy(home);
  assert(ui_display_count() == 2);
  assert(!memcmp(companion_saved, native_ui_resident(companion, &resident), 450 * 600 * 3));
  assert(!memcmp(dock_saved, native_ui_dock(dock, &dock_view), 792 * 272 * 3));
  home = native_ui_create_device(KIT_LAB);
  assert(home && ui_display_count() == 3 && native_ui_home(home, &view));
  assert(!memcmp(companion_saved, native_ui_resident(companion, &resident), 450 * 600 * 3));
  assert(!memcmp(dock_saved, native_ui_dock(dock, &dock_view), 792 * 272 * 3));
  native_ui_destroy(home);
  native_ui_destroy(dock);
  native_ui_destroy(companion);
  assert(ui_display_count() == 0);
  free(companion_saved);
  free(dock_saved);
  free(baseline);
}

int main(void) {
  UiDisplayProfile profile = {1024, 600, 8, UI_COLOR_RGB888};
  UiArea narrow = {0, 0, 15, 99};
  assert(ui_display_buffer_size(&profile) == 24576);
  assert(ui_display_validate(&profile, &narrow, 48, 24576, UI_COLOR_RGB888));
  assert(!ui_display_validate(&profile, &narrow, 48, 4799, UI_COLOR_RGB888));
  projection_cases();
  physical_navigation();
  frame_route_equivalence();
  retained_lifetime_and_exports();
  puts("Lab Home projection, physical navigation and shared lifetime checks passed");
  return 0;
}
