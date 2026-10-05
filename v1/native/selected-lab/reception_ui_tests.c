#define _POSIX_C_SOURCE 200809L
#include "reception_view.h"
#include "home_view.h"
#include "native_ui.h"
#include "expedition.h"
#include "../ui/display.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* Synthetic retained records use the existing field record builder. They do
 * not claim played acquisition, acceptance, sample contents or births. */
static void fixture(SelectedLab *lab, DeviceKit *kit) {
  selected_lab_init(lab);
  memset(kit, 0, sizeof(*kit));
  kit->lab = lab;
  lab->kit_mode = 1;
  lab->page = V1_EXPEDITION;
  lab->game.data = 100;
  lab->game.energy = 200;
  lab->game.essence = 300;
  GameState field;
  game_state_init(&field);
  game_rules_resume_runtime(&field, 100);
  GameCommand start = {0};
  start.type = GAME_COMMAND_FIELD_START;
  start.data.field.seed = 17;
  start.data.field.sample_budget = 1;
  start.data.field.monotonic_seconds = 100;
  assert(game_field_start(&field, &start) == GAME_OK);
  field.field.visited |= 1u << 4;
  field.field.inspected |= 1u << 4;
  game_field_record(&field, &kit->sealed_field);
  kit->sealed_field.cargo[0] = 300;
  kit->sealed_field.cargo[1] = 200;
  kit->sealed_field.cargo[2] = 100;
  kit->sealed_field.accepted_at = 1790850600;
  kit->sealed_field.trace = kit->sealed_field.collected = 1;
  strcpy(kit->sealed_field.sample_id, "fixture-sealed-sample");
  assert(game_received_valid(&kit->sealed_field));
  lab->game.received_count = lab->game.received_cursor = 1;
  lab->game.received[0] = kit->sealed_field;
  kit->journal.version = 5;
  kit->journal.companion_online = kit->journal.dock_online = 1;
  kit->journal.cargo[0] = 300;
  kit->journal.cargo[1] = 200;
  kit->journal.cargo[2] = 100;
  kit->journal.accept_sequence = 7;
  snprintf(kit->journal.haul_id, sizeof(kit->journal.haul_id), "haul-7/%.56s", kit->sealed_field.expedition_id);
  kit->journal.phase = KIT_IDLE;
}

static void accepted_sample(SelectedLab *lab, DeviceKit *kit) {
  lab->game.sample_count = 1;
  strcpy(lab->game.samples[0].id, "fixture-saved-sample");
  strcpy(lab->game.samples[0].origin_expedition_id, kit->sealed_field.expedition_id);
  lab->game.operations[0].sequence = kit->journal.accept_sequence;
  strcpy(lab->game.operations[0].id, kit->journal.haul_id);
  lab->game.last_operation_sequence = kit->journal.accept_sequence;
  lab->game.data += kit->journal.cargo[0];
  lab->game.energy += kit->journal.cargo[1];
  lab->game.essence += kit->journal.cargo[2];
}

static void projection_and_permissions(void) {
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  LabReceptionView view;
  SelectedLab original_lab = lab;
  DeviceKit original_kit = kit;
  assert(kit_reception_projection(&kit, &view));
  assert(view.mode == LAB_RECEPTION_LOG_LIST && view.received.record_count == 1);
  assert(!view.received.map.avatar_visible);
  assert(!memcmp(view.received.map.paths, kit.sealed_field.walked, GAME_FIELD_CELLS));
  for (unsigned site = 0; site < GAME_FIELD_SITES; ++site) {
    assert(view.received.map.site_visible[site] == !!(kit.sealed_field.visited & (1u << site)));
    if (!view.received.map.site_visible[site])
      assert(!view.received.map.site_x[site] && !view.received.map.site_y[site]);
    assert(!view.received.map.site_active[site]);
  }
  assert(!memcmp(&original_lab, &lab, sizeof(lab)) && !memcmp(&original_kit, &kit, sizeof(kit)));
  kit.received_selected = UINT32_MAX;
  assert(kit_reception_projection(&kit, &view) && view.received.selected == 0);
  kit.received_detail = 1;
  assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_LOG_DETAIL);
  kit.journal.phase = KIT_WAITING;
  assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_LOG_DETAIL);
  kit.journal.phase = KIT_ARRIVED;
  assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_ARRIVAL);
  assert(view.can_accept && view.stock[0] == 1 && view.incoming[0] == 3);
  assert(strstr(view.sample, "contents unknown"));
  lab.suspended = 1;
  assert(kit_reception_projection(&kit, &view) && !view.can_accept);
  lab.suspended = 0;
  kit.failed = 1;
  assert(kit_reception_projection(&kit, &view) && !view.can_accept && strstr(view.warning, "Cargo preserved"));
  kit.failed = 0;
  kit.journal.phase = KIT_COMMITTING;
  assert(kit_reception_projection(&kit, &view) && !view.can_accept && strstr(view.status, "waiting"));
  accepted_sample(&lab, &kit);
  kit.failed = 1;
  assert(kit_reception_projection(&kit, &view));
  assert(strstr(view.status, "source empty") && strstr(view.sample, "fixture-saved-sample"));
  assert(strstr(view.warning, "Receipt recovery") && !view.can_accept);
  assert(view.stock[0] == 4 && !view.incoming[0] && !view.incoming[1] && !view.incoming[2]);
  kit.failed = 0;
  for (unsigned phase = KIT_ACK_PENDING; phase <= KIT_COMPLETE; ++phase) {
    kit.journal.phase = phase;
    kit.caller_valid = 1;
    assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_ARRIVAL && !view.can_accept);
    assert(!view.incoming[0] && !view.incoming[1] && !view.incoming[2]);
    assert(strstr(view.sample, "fixture-saved-sample"));
    kit.caller_valid = 0;
    assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_LOG_DETAIL);
  }
  lab.storage_error = 1;
  assert(kit_reception_projection(&kit, &view) && strstr(view.warning, "Received records preserved"));
  lab.storage_error = 0;
  lab.game.received_count = lab.game.received_cursor = 0;
  assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_LOG_EMPTY);
  lab.page = V1_HOME;
  assert(!kit_reception_projection(&kit, &view));
}

static void source_guards(void) {
  SelectedLab lab;
  DeviceKit kit;
  LabReceptionView view;
  fixture(&lab, &kit);
  lab.game.received_count = GAME_FIELD_HISTORY + 1;
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  lab.game.received_cursor = GAME_FIELD_HISTORY;
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  kit.received_detail = 2;
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  memset(lab.game.received[0].expedition_id, 'X', sizeof(lab.game.received[0].expedition_id));
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  lab.game.received[0].site_x[3] = 1; /* Unvisited coordinates cannot leak. */
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  kit.journal.phase = KIT_ARRIVED;
  lab.game.sample_count = GAME_MAX_SAMPLES + 1;
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  kit.journal.phase = KIT_ARRIVED;
  memset(kit.sealed_field.expedition_id, 'X', sizeof(kit.sealed_field.expedition_id));
  assert(!kit_reception_projection(&kit, &view));
  fixture(&lab, &kit);
  kit.journal.phase = KIT_COMMITTING;
  memset(lab.game.operations[0].id, 'X', sizeof(lab.game.operations[0].id));
  assert(!kit_reception_projection(&kit, &view));
}

static void press(DeviceKit *kit, unsigned device, SelectedInput down) {
  unsigned revision = kit_revision(kit, device);
  kit_input(kit, device, SELECTED_READY, revision);
  kit_input(kit, device, down, revision);
  kit_input(kit, device, (SelectedInput)(down + 1), revision);
}

/* Exercise the existing transport/input authority, rather than granting an
 * acceptance action to the presentation fixture. */
static void arrival_once_and_acceptance(void) {
  char directory[] = "/tmp/bee-reception-XXXXXX";
  assert(mkdtemp(directory));
  char path[512];
  snprintf(path, sizeof(path), "%s/state", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  GameCommand start = {0};
  start.type = GAME_COMMAND_EXPEDITION_START;
  start.operation_id = "reception-legacy-transport";
  start.sequence = lab.game.last_operation_sequence + 1;
  start.data.expedition.kind = GAME_EXPEDITION_SURVEY;
  start.data.expedition.monotonic_seconds = 100;
  assert(game_apply(lab.save_path, &lab.game, &start) == GAME_OK);
  kit_tick(&kit, 105);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_WAITING);
  kit_tick(&kit, 107);
  assert(kit.journal.phase == KIT_ARRIVED && kit.caller_valid);
  LabReceptionView view;
  assert(kit_reception_projection(&kit, &view) && view.can_accept);
  GameState waiting = lab.game;
  press(&kit, KIT_LAB, SELECTED_BACK_DOWN);
  assert(!kit.caller_valid && !memcmp(&waiting, &lab.game, sizeof(waiting)));
  SelectedPage restored = lab.page;
  kit_tick(&kit, 108);
  assert(!kit.caller_valid && lab.page == restored); /* Same haul opens once. */
  lab.page = V1_CARGO;
  uint32_t before[3] = {lab.game.data, lab.game.energy, lab.game.essence};
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_ACK_PENDING);
  assert(lab.game.data == before[0] + kit.journal.cargo[0]);
  assert(lab.game.energy == before[1] + kit.journal.cargo[1]);
  assert(lab.game.essence == before[2] + kit.journal.cargo[2]);
  GameState accepted = lab.game;
  assert(kit_reception_projection(&kit, &view) && view.mode == LAB_RECEPTION_LOG_EMPTY);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(!memcmp(&accepted, &lab.game, sizeof(accepted)));
  kit_tick(&kit, 110);
  assert(kit.journal.phase == KIT_COMPLETE);
  assert(lab.game.data == accepted.data && lab.game.energy == accepted.energy &&
         lab.game.essence == accepted.essence &&
         lab.game.last_operation_sequence == accepted.last_operation_sequence);
  unlink(kit.journal_path);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(path);
  rmdir(directory);
}

static void equal_bmps(FILE *first, FILE *second) {
  assert(ftell(first) == 1843254 && ftell(second) == 1843254);
  rewind(first); rewind(second);
  uint8_t left[4096], right[4096];
  size_t count;
  while ((count = fread(left, 1, sizeof(left), first)) != 0)
    assert(fread(right, 1, count, second) == count && !memcmp(left, right, count));
  assert(!ferror(first) && !ferror(second) && fgetc(second) == EOF);
}

static void export_fixture(DeviceKit *kit, NativeUiContext *context, const char *name) {
  const char *directory = getenv("BEECHO_RECEPTION_PROOF");
  if (!directory) return;
  char path[768];
  assert(snprintf(path, sizeof(path), "%s/fixture-reception-%s.bmp", directory, name) < (int)sizeof(path));
  FILE *output = fopen(path, "wb");
  assert(output && kit_bmp_ui(kit, KIT_LAB, output, context, 1) && !fclose(output));
}

static void rendering_and_lifetime(void) {
  SelectedLab lab;
  DeviceKit kit;
  fixture(&lab, &kit);
  NativeUiContext *context = native_ui_create_device(KIT_LAB);
  assert(context);
  const char *names[] = {"list", "detail", "empty", "arrival", "arrival-error", "receipt-recovery", "receipt", "complete"};
  for (unsigned i = 0; i < sizeof(names) / sizeof(names[0]); ++i) {
    fixture(&lab, &kit);
    kit.received_detail = i == 1 || i == 2;
    if (i == 2) lab.game.received_count = lab.game.received_cursor = 0;
    if (i >= 3) kit.journal.phase = i < 5 ? KIT_ARRIVED : i == 5 ? KIT_COMMITTING : i == 6 ? KIT_ACK_PENDING : KIT_COMPLETE;
    kit.failed = i == 4 || i == 5;
    if (i >= 5) { accepted_sample(&lab, &kit); kit.caller_valid = 1; }
    LabReceptionView view;
    assert(kit_reception_projection(&kit, &view) && native_ui_reception(context, &view));
    if (i >= 5) assert(!view.incoming[0] && !view.incoming[1] && !view.incoming[2]);
    if (i == 3 || i == 4) assert(view.incoming[0] == 3 && view.incoming[1] == 2 && view.incoming[2] == 1);
    if (i == 2) assert(view.mode == LAB_RECEPTION_LOG_EMPTY && !view.received.detail);
    FILE *generic = tmpfile(), *persistent = tmpfile();
    assert(generic && persistent && kit_bmp(&kit, KIT_LAB, generic) && kit_bmp_ui(&kit, KIT_LAB, persistent, context, 1));
    equal_bmps(generic, persistent);
    assert(!fclose(generic) && !fclose(persistent));
    export_fixture(&kit, context, names[i]);
  }
  fixture(&lab, &kit);
  memset(lab.game.received[0].expedition_id, 'R', sizeof(lab.game.received[0].expedition_id) - 1);
  lab.game.received[0].expedition_id[63] = 0;
  memset(lab.game.received[0].sample_id, 'S', sizeof(lab.game.received[0].sample_id) - 1);
  lab.game.received[0].sample_id[39] = 0;
  kit.received_detail = 1;
  export_fixture(&kit, context, "maximum-ids");
  LabReceptionView view;
  assert(kit_reception_projection(&kit, &view) && native_ui_reception(context, &view));
  LabReceptionView invalid = view;
  invalid.mode = (LabReceptionMode)-1;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  memset(invalid.status, 'X', sizeof(invalid.status));
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.record_count = EXPEDITION_VIEW_RECORDS + 1;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.selected = invalid.received.record_count;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  memset(invalid.received.record_labels[0], 'X', sizeof(invalid.received.record_labels[0]));
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.map.avatar_visible = 1;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.mode = LAB_RECEPTION_LOG_EMPTY;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.detail = 0;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.map.paths[0] = !invalid.received.map.walked[0];
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.map.site_visible[3] = 2;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.map.site_inspected[3] = 1;
  assert(!native_ui_reception(context, &invalid));
  invalid = view;
  invalid.received.map.site_x[3] = 1;
  assert(!native_ui_reception(context, &invalid));
  lab.game.received_count = GAME_FIELD_HISTORY + 1;
  FILE *output = tmpfile();
  assert(output && !kit_bmp(&kit, KIT_LAB, output) && !ftell(output));
  assert(!kit_bmp_ui(&kit, KIT_LAB, output, context, 1) && !ftell(output) && !fclose(output));
  fixture(&lab, &kit);
  /* A synthetic retained-history craft fixture exposes the generated route
   * geometry and all five places. These copied visits are not a played trip. */
  GameState mapped;
  game_state_init(&mapped);
  game_rules_resume_runtime(&mapped, 100);
  GameCommand start = {0};
  start.type = GAME_COMMAND_FIELD_START;
  start.data.field.seed = 17;
  start.data.field.sample_budget = 1;
  start.data.field.monotonic_seconds = 100;
  assert(game_field_start(&mapped, &start) == GAME_OK);
  GameReceivedExpedition *record = &lab.game.received[0];
  record->visited = record->inspected = 31;
  memcpy(record->site_x, mapped.field.site_x, sizeof(record->site_x));
  memcpy(record->site_y, mapped.field.site_y, sizeof(record->site_y));
  for (unsigned cell = 0; cell < GAME_FIELD_CELLS; ++cell)
    record->walked[cell] = !!(mapped.field.paths[cell] || mapped.field.hidden_paths[cell]);
  assert(game_received_valid(record));
  kit.received_detail = 1;
  assert(kit_reception_projection(&kit, &view) && native_ui_reception(context, &view));
  for (unsigned site = 0; site < GAME_FIELD_SITES; ++site)
    assert(view.received.map.site_visible[site] && view.received.map.site_inspected[site]);
  export_fixture(&kit, context, "all-visited-paths");
  native_ui_destroy(context);

  fixture(&lab, &kit);
  NativeUiContext *companion = native_ui_create(), *dock = native_ui_create_device(KIT_DOCK);
  assert(companion && dock);
  CompanionResidentView resident = {0};
  resident.portrait = RESIDENT_PORTRAIT_PLAIN;
  resident.count = resident.current = resident.online = 1;
  strcpy(resident.identity, "fixture-warm-resident");
  assert(native_ui_resident(companion, &resident));
  DockView dock_view;
  assert(kit_dock_projection(&kit, &dock_view) && native_ui_dock(dock, &dock_view));
  context = native_ui_create_device(KIT_LAB);
  assert(context && ui_display_count() == 3);
  LabHomeView home;
  lab.page = V1_HOME;
  assert(selected_lab_home_view(&lab, NULL, 0, &home) && native_ui_home(context, &home));
  lab.page = V1_EXPEDITION;
  lv_mem_monitor_t first, final;
  for (unsigned cycle = 0; cycle < 200; ++cycle) {
    kit.received_detail = cycle % 2;
    assert(kit_reception_projection(&kit, &view) && native_ui_reception(context, &view));
    assert(native_ui_home(context, &home));
    assert(native_ui_resident(companion, &resident) && native_ui_dock(dock, &dock_view));
    if (cycle == 99) lv_mem_monitor(&first);
  }
  lv_mem_monitor(&final);
  printf("Reception/Home plus Companion resident/Dock: used=%zu peak=%zu total=%zu first_free=%zu final_free=%zu\n", final.total_size - final.free_size, final.max_used, final.total_size, first.free_size, final.free_size);
  fflush(stdout);
  assert(first.free_size == final.free_size);
  native_ui_destroy(context);
  assert(ui_display_count() == 2 && native_ui_resident(companion, &resident) && native_ui_dock(dock, &dock_view));
  context = native_ui_create_device(KIT_LAB);
  assert(context && kit_reception_projection(&kit, &view) && native_ui_reception(context, &view));
  assert(ui_display_count() == 3 && native_ui_resident(companion, &resident) && native_ui_dock(dock, &dock_view));
  native_ui_destroy(context);
  native_ui_destroy(dock);
  native_ui_destroy(companion);
  assert(ui_display_count() == 0);
}

int main(void) {
  projection_and_permissions();
  source_guards();
  arrival_once_and_acceptance();
  rendering_and_lifetime();
  puts("Lab reception copied facts, safe history and retained route checks passed");
  return 0;
}
