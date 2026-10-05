#define _POSIX_C_SOURCE 200809L
#include "kit.h"
#include "expedition.h"
#include "expedition_render.h"
#include "native_ui.h"
#include "reception_view.h"
#include "home_view.h"
#include "save_bytes.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void press(DeviceKit *kit, unsigned device, SelectedInput down) {
  unsigned revision = kit_revision(kit, device);
  kit_input(kit, device, SELECTED_READY, revision);
  kit_input(kit, device, down, revision);
  kit_input(kit, device, (SelectedInput)(down + 1), revision);
}
/* Receipt evidence survives acceptance, but it is never current source cargo.
 * Copy navigation only so each device's projection can be inspected passively. */
static void accepted_source_is_empty(const DeviceKit *kit) {
  assert(kit_delivery_accepted(kit));
  SelectedLab lab = *kit->lab;
  DeviceKit copy = *kit;
  copy.lab = &lab;
  copy.companion.page = COMP_CARGO;
  copy.companion.mode = COMP_CARGO;
  copy.companion.focus = 0;
  CompanionCargoView cargo;
  assert(kit_cargo_projection(&copy, &cargo) && cargo.accepted && !cargo.capsules);
  for (unsigned resource = 0; resource < 3; ++resource) {
    assert(!cargo.supplies[resource]);
    assert(cargo.delivered[resource] == kit->journal.cargo[resource] / GAME_SUPPLY_UNIT);
  }
  copy.companion.page = COMP_PROBE;
  copy.companion.mode = COMP_PROBE;
  CompanionProbeView probe;
  assert(kit_probe_projection(&copy, &probe) && probe.cargo.accepted && !probe.cargo.capsules);
  assert(!probe.cargo.supplies[0] && !probe.cargo.supplies[1] && !probe.cargo.supplies[2]);
  lab.page = V1_CARGO;
  copy.caller_valid = 1;
  LabReceptionView reception;
  assert(kit_reception_projection(&copy, &reception) && reception.mode == LAB_RECEPTION_ARRIVAL);
  assert(!reception.can_accept && !reception.incoming[0] && !reception.incoming[1] && !reception.incoming[2]);
  assert(reception.stock[0] == lab.game.data / GAME_SUPPLY_UNIT &&
         reception.stock[1] == lab.game.energy / GAME_SUPPLY_UNIT &&
         reception.stock[2] == lab.game.essence / GAME_SUPPLY_UNIT);
  for (unsigned device = KIT_LAB; device <= KIT_COMPANION; ++device) {
    FILE *status = tmpfile();
    assert(status);
    kit_status(&copy, device, status);
    long size = ftell(status);
    char text[32768];
    assert(size > 0 && size < (long)sizeof(text));
    rewind(status);
    assert(fread(text, 1, (size_t)size, status) == (size_t)size);
    text[size] = 0;
    assert(strstr(text, "\"cargo\":[0,0,0]") && !fclose(status));
  }
  /* The connected Home preview must use current source facts as well, even
   * when the committed world precedes its receipt-sidecar update. */
  lab.page = V1_HOME;
  lab.focus = 1;
  SelectedLabRenderContext home_facts = {SELECTED_HAUL_STORED, {0, 0, 0}};
  LabHomeView home_view;
  assert(selected_lab_home_view(&lab, &home_facts, copy.normalization_pending, &home_view));
  assert(!home_view.landing.amounts[0] && !home_view.landing.amounts[1] && !home_view.landing.amounts[2]);
  if (copy.failed) snprintf(home_view.warning, sizeof(home_view.warning), "%s", lab.message);
  FILE *home_output = tmpfile();
  assert(home_output && kit_bmp(&copy, KIT_LAB, home_output) && ftell(home_output) == 1843254);
  NativeUiContext *home_context = native_ui_create_device(KIT_LAB);
  assert(home_context);
  const uint8_t *home_pixels = native_ui_home(home_context, &home_view);
  assert(home_pixels && !fseek(home_output, 54, SEEK_SET));
  uint8_t home_row[1024 * 3];
  for (unsigned y = 600; y > 0; --y) {
    assert(fread(home_row, 1, sizeof(home_row), home_output) == sizeof(home_row));
    for (unsigned x = 0; x < 1024; ++x)
      for (unsigned channel = 0; channel < 3; ++channel)
        assert(home_row[x * 3 + channel] == home_pixels[((y - 1) * 1024 + x) * 3 + 2 - channel]);
  }
  native_ui_destroy(home_context);
  assert(!fclose(home_output));
  assert(!memcmp(&lab.game, &kit->lab->game, sizeof(lab.game)));
}
/* Legacy transport regressions deliberately start the frozen timed command.
 * The new map/control journey has its own checks below. */
static void start_legacy_route(DeviceKit *kit) {
  GameCommand start = {0};
  char identity[64];
  start.type = GAME_COMMAND_EXPEDITION_START;
  start.sequence = kit->lab->game.last_operation_sequence + 1;
  snprintf(identity, sizeof(identity), "legacy-test-%llu", (unsigned long long)start.sequence);
  start.operation_id = identity;
  start.data.expedition.kind = GAME_EXPEDITION_SURVEY;
  start.data.expedition.monotonic_seconds = kit->clock;
  assert(game_apply(kit->lab->save_path, &kit->lab->game, &start) == GAME_OK);
}
/* Write a crash-boundary fixture from a real sealed journal. This does not
 * execute a parallel transfer implementation. */
static void persist_fixture(DeviceKit *kit) {
  const unsigned char *bytes = (const unsigned char *)&kit->journal;
  uint32_t hash = 2166136261u;
  for (size_t i = sizeof(kit->journal.checksum); i < sizeof(kit->journal); ++i)
    hash = (hash ^ bytes[i]) * 16777619u;
  kit->journal.checksum = hash;
  assert(save_bytes_write(kit->journal_path, &kit->journal,
                          sizeof(kit->journal)) == 0);
}
static void mode_navigation(DeviceKit *kit) {
  uint64_t sequence = kit->lab->game.last_operation_sequence;
  GameState initial_world = kit->lab->game;
  assert(kit->companion.page == COMP_MODES &&
         kit->companion.mode == COMP_PROBE);
  press(kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  assert(kit->companion.page == COMP_MODES && kit->companion.mode == COMP_CARGO);
  press(kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  assert(kit->companion.page == COMP_MODES && kit->companion.mode == COMP_FRIENDS);
  press(kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(kit, KIT_COMPANION, SELECTED_UP_DOWN);
  assert(kit->companion.page == COMP_MODES && kit->companion.mode == COMP_PROBE);
  assert(!memcmp(&initial_world, &kit->lab->game, sizeof(initial_world)) &&
         kit->journal.phase == KIT_IDLE);
  press(kit, KIT_COMPANION, SELECTED_LEFT_DOWN);
  assert(kit->companion.mode == COMP_PROBE);
  press(kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  assert(kit->companion.page == COMP_MODES &&
         kit->companion.mode == COMP_CARGO);
  press(kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit->companion.page == COMP_CARGO && !kit->companion.task_depth);
  press(kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  assert(kit->companion.page == COMP_CARGO); /* Never an alias for Confirm. */
  press(kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit->companion.page == COMP_MODES &&
         kit->companion.mode == COMP_CARGO);
  press(kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  press(kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  assert(kit->companion.mode == COMP_FRIENDS);
  press(kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit->companion.page == COMP_FRIENDS &&
         kit->companion.mode == COMP_FRIENDS && kit_option_count(kit, KIT_COMPANION) == 1);
  press(kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit->companion.page == COMP_MODES);
  press(kit, KIT_COMPANION, SELECTED_LEFT_DOWN);
  press(kit, KIT_COMPANION, SELECTED_LEFT_DOWN);
  assert(kit->companion.mode == COMP_PROBE);
  unsigned frame = kit_revision(kit, KIT_COMPANION);
  kit_input(kit, KIT_COMPANION, SELECTED_READY, frame);
  kit_input(kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN, frame);
  kit_input(kit, KIT_COMPANION, SELECTED_SUSPEND, frame);
  kit_input(kit, KIT_COMPANION, SELECTED_RESUME, frame);
  kit_input(kit, KIT_COMPANION, SELECTED_CONFIRM_UP, frame);
  assert(kit->companion.page == COMP_MODES);
  assert(kit->lab->game.last_operation_sequence == sequence);
}
static size_t read_saved_bytes(const char *path, unsigned char *bytes, size_t capacity) {
  FILE *file = fopen(path, "rb");
  assert(file);
  size_t length = fread(bytes, 1, capacity, file);
  assert(!ferror(file) && fgetc(file) == EOF && fclose(file) == 0);
  return length;
}
/* Compare the actual property pixels, excluding visits and link feedback. */
static uint32_t companion_property_pixels(const DeviceKit *kit) {
  FILE *frame = tmpfile();
  assert(frame && kit_bmp(kit, KIT_COMPANION, frame));
  unsigned stride = (kit_width(KIT_COMPANION) * 3 + 3) & ~3u;
  uint32_t hash = 2166136261u;
  /* Exact retained property box. The earlier raster coordinates now overlap
   * the lower ink of the separate Visits counter. */
  for (unsigned y = 286; y < 412; ++y) {
    long offset = 54 + (long)(kit_height(KIT_COMPANION) - y - 1) * stride + 303 * 3;
    assert(fseek(frame, offset, SEEK_SET) == 0);
    for (unsigned byte = 0; byte < 115 * 3; ++byte) {
      int value = fgetc(frame);
      assert(value != EOF);
      hash = (hash ^ (unsigned)value) * 16777619u;
    }
  }
  assert(fclose(frame) == 0);
  return hash;
}
static void resident_cache_and_visits(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/resident-cache", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  lab.game.sample_count = lab.game.individual_count = 3;
  for (unsigned i = 0; i < 3; ++i) {
    GameSample *sample = &lab.game.samples[i];
    GameIndividual *resident = &lab.game.individuals[i];
    snprintf(sample->id, sizeof(sample->id), "resident-source-%u", i);
    strcpy(sample->origin_expedition_id, "retained-resident-fixture");
    sample->decoded_studies = sample->decoded_facts = 31;
    sample->supported_candidates = 3;
    snprintf(resident->id, sizeof(resident->id), "resident-%u", i);
    strcpy(resident->source_sample_id, sample->id);
    strcpy(resident->origin_kind, "parentless-founder");
    resident->origin_founder = 1;
    resident->revealed = i < 2;
    resident->care_visits = i ? 7 : 3;
    if (i == 1) {
      /* Research precedes incubation, including in this saved B fixture. */
      sample->decoded_studies = sample->decoded_facts = 0;
      pip_pin_sample_profile(&lab.game, i);
      assert(pip_record_investigation(&lab.game, i, 0));
      assert(pip_record_investigation(&lab.game, i, 2));
      PipSupportedCandidate candidate;
      assert(pip_supported_candidate(&lab.game, i, 1, &candidate));
      resident->genome = candidate.genome;
      resident->expression = candidate.expression;
      pip_pin_individual_art(&lab.game, i, candidate.id);
    } else {
      assert(pip_genome_for_sample(0, &resident->genome) == 0);
      pip_express(&resident->genome, &resident->expression);
      pip_pin_individual_art(&lab.game, i, "legacy-carried");
    }
    strcpy(resident->art_id, pip_content_art_id(&resident->genome));
    strcpy(resident->art_version, PIP_ART_VERSION);
    sample->incubated = 1;
  }
  assert(game_state_valid(&lab.game));
  assert(game_state_save(path, &lab.game) == 0);
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  assert(kit_resident_count(&kit) == 2 && !kit_resident(&kit, 2));
  const KitResidentProjection *first = kit_resident(&kit, 0), *second = kit_resident(&kit, 1);
  assert(strcmp(first->individual.id, second->individual.id) &&
         !strcmp(first->individual.art_id, second->individual.art_id));
  assert(!memcmp(&first->metadata, &lab.game.individual_metadata[0], sizeof(first->metadata)));
  assert(!strcmp(selected_lab_resident_form_title(&first->individual, &first->metadata),
                 "Plain coat / pale variation carried"));
  assert(kit_resident_cache_current(&kit) && kit_dock_cache_current(&kit) &&
         kit_dock_visits(&kit) == 10);
  /* Existing mode controls select a recorded ID, then a separate visit action. */
  press(&kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FRIEND_LIST && kit_option_count(&kit, KIT_COMPANION) == 2);
  press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  assert(!strcmp(kit_selected_resident(&kit)->individual.id, "resident-1"));
  const KitResidentProjection *saved = kit_selected_resident(&kit);
  assert(!strcmp(selected_lab_resident_form_title(&saved->individual, &saved->metadata),
                 "Burst-capable / baseline walking cost"));
  uint32_t property_pixels = companion_property_pixels(&kit);
  /* Missing/incomplete live source research cannot change saved resident facts. */
  GameState live_world = lab.game;
  lab.game.sample_count = 0;
  assert(companion_property_pixels(&kit) == property_pixels);
  lab.game = live_world;
  memset(&lab.game.sample_metadata[1], 0, sizeof(lab.game.sample_metadata[1]));
  assert(companion_property_pixels(&kit) == property_pixels);
  lab.game = live_world;
  GameIndividualMetadata unsupported = saved->metadata;
  strcpy(unsupported.mapping_version, "future-map");
  assert(!selected_lab_resident_form_title(&saved->individual, &unsupported));
  unsupported = saved->metadata;
  strcpy(unsupported.reference_context, "future-context");
  assert(!selected_lab_resident_form_title(&saved->individual, &unsupported));
  unsupported = saved->metadata;
  strcpy(unsupported.candidate_id, "unknown-form");
  assert(!selected_lab_resident_form_title(&saved->individual, &unsupported));
  unsupported = saved->metadata;
  strcpy(unsupported.mapping_version, "pip-proof-map-v1");
  assert(!selected_lab_resident_form_title(&saved->individual, &unsupported));
  unsupported = first->metadata;
  strcpy(unsupported.candidate_id, "unknown-legacy-form");
  assert(!selected_lab_resident_form_title(&first->individual, &unsupported));
  GameIndividual unrevealed = saved->individual;
  unrevealed.revealed = 0;
  assert(!selected_lab_resident_form_title(&unrevealed, &saved->metadata));
  uint64_t sequence = lab.game.last_operation_sequence;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FRIEND_VISIT &&
         lab.game.last_operation_sequence == sequence && kit_resident_visit_available(&kit));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(lab.game.individuals[1].care_visits == 8 && lab.game.individuals[0].care_visits == 3 &&
         kit_selected_resident(&kit)->individual.care_visits == 8 && kit_dock_visits(&kit) == 11);
  assert(companion_property_pixels(&kit) == property_pixels);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_FRIEND_LIST && kit.companion.focus == 1);
  /* A Lab visit updates the same accepted count visible on Companion and Dock. */
  lab.page = V1_HABITAT;
  lab.resident = lab.focus = 0;
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.game.individuals[0].care_visits == 4 &&
         kit_resident(&kit, 0)->individual.care_visits == 4 && kit_dock_visits(&kit) == 12);
  assert(!strcmp(kit_selected_resident(&kit)->individual.id, "resident-1"));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  /* Pending transfers reserve domain authority; no visit can consume a slot. */
  KitJournal previous_journal = kit.journal;
  kit.journal.phase = KIT_WAITING;
  GameState before = lab.game;
  assert(!kit_resident_visit_available(&kit));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(!memcmp(&before, &lab.game, sizeof(before)));
  kit.journal = previous_journal;
  /* Failure of cache persistence cannot repeat a successful world visit. */
  KitResidentCache accepted_cache = kit.residents;
  char actual_journal[560];
  strcpy(actual_journal, kit.journal_path);
  snprintf(kit.journal_path, sizeof(kit.journal_path), "%s/missing/cache", directory);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(lab.game.individuals[1].care_visits == 9 && !kit.failed && !lab.storage_error &&
         kit.resident_cache_failed && kit.dock_cache_failed &&
         !memcmp(&accepted_cache, &kit.residents, sizeof(accepted_cache)));
  assert(strstr(kit.companion.message, "Visit saved in Station (9)") && !kit_resident_visit_available(&kit));
  sequence = lab.game.last_operation_sequence;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(lab.game.last_operation_sequence == sequence && lab.game.individuals[1].care_visits == 9);
  strcpy(kit.journal_path, actual_journal);
  assert(kit_link(&kit, KIT_COMPANION, 0) && kit_link(&kit, KIT_DOCK, 0));
  assert(companion_property_pixels(&kit) == property_pixels);
  /* The current native world envelope is a 24-byte header plus GameState.
   * It also bounds the smaller Kit projection envelope used in this check. */
  unsigned char cache_bytes[sizeof(GameState) + 24];
  unsigned char world_bytes[sizeof(GameState) + 24];
  unsigned char after[sizeof(GameState) + 24];
  size_t cache_length = read_saved_bytes(kit.journal_path, cache_bytes, sizeof(cache_bytes));
  size_t world_length = read_saved_bytes(path, world_bytes, sizeof(world_bytes));
  assert(cache_length > sizeof(KitJournal));
  assert(!kit_resident_cache_current(&kit) && !kit_dock_cache_current(&kit));
  before = lab.game;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(!memcmp(&before, &lab.game, sizeof(before)));
  assert(read_saved_bytes(kit.journal_path, after, sizeof(after)) == cache_length &&
         !memcmp(cache_bytes, after, cache_length));
  assert(read_saved_bytes(path, after, sizeof(after)) == world_length &&
         !memcmp(world_bytes, after, world_length));
  /* Restart offline keeps the older accepted snapshot, including its timestamp. */
  SelectedLab restarted;
  selected_lab_init(&restarted);
  assert(selected_lab_load(&restarted, path, 200));
  DeviceKit recovered;
  assert(kit_init(&recovered, &restarted, 200));
  assert(!memcmp(&recovered.residents, &accepted_cache, sizeof(accepted_cache)) &&
         kit_resident_count(&recovered) == 2 && !kit_resident_cache_current(&recovered));
  const KitResidentProjection *retained = kit_resident(&recovered, 1);
  assert(!strcmp(selected_lab_resident_form_title(&retained->individual, &retained->metadata),
                 "Burst-capable / baseline walking cost"));
  assert(read_saved_bytes(recovered.journal_path, after, sizeof(after)) == cache_length &&
         !memcmp(cache_bytes, after, cache_length));
  sequence = restarted.game.last_operation_sequence;
  assert(kit_link(&recovered, KIT_COMPANION, 1));
  assert(kit_resident(&recovered, 1)->individual.care_visits == 9 &&
         restarted.game.last_operation_sequence == sequence && kit_resident_cache_current(&recovered));
  assert(kit_dock_visits(&recovered) == 12 && !kit_dock_cache_current(&recovered));
  assert(kit_link(&recovered, KIT_DOCK, 1));
  assert(kit_dock_visits(&recovered) == 13 && kit_dock_cache_current(&recovered));
  FILE *status = tmpfile();
  assert(status);
  kit_status(&recovered, KIT_COMPANION, status);
  rewind(status);
  char output[4096];
  size_t status_length = fread(output, 1, sizeof(output) - 1, status);
  output[status_length] = 0;
  assert(fclose(status) == 0);
  assert(strstr(output, "\"resident_snapshot\"") &&
         strstr(output, "\"original_art_sha256\":\"38b0fa7f") &&
         !strstr(output, "resident-2") && !strstr(output, "\"genome\""));
  /* Corruption in the wrapper (including padding) cannot authorize a cache. */
  cache_length = read_saved_bytes(recovered.journal_path, cache_bytes, sizeof(cache_bytes));
  cache_bytes[cache_length - 1] ^= 1;
  assert(save_bytes_write(recovered.journal_path, cache_bytes, cache_length) == 0);
  SelectedLab corrupt_lab;
  selected_lab_init(&corrupt_lab);
  assert(selected_lab_load(&corrupt_lab, path, 300));
  DeviceKit corrupt;
  assert(!kit_init(&corrupt, &corrupt_lab, 300) && corrupt.failed);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", recovered.journal_path);
  unlink(marker);
  unlink(recovered.journal_path);
  unlink(path);
  char lockpath[560];
  snprintf(lockpath, sizeof(lockpath), "%s.lock", path);
  unlink(lockpath);
}
static void legacy_intent_recovery(const char *directory) {
  for (unsigned version = 1; version <= 2; ++version) {
    for (unsigned after_commit = 0; after_commit <= 1; ++after_commit) {
      char path[512];
      snprintf(path, sizeof(path), "%s/legacy-%u-%u", directory, version,
               after_commit);
      SelectedLab lab;
      selected_lab_init(&lab);
      assert(selected_lab_load(&lab, path, 100));
      DeviceKit sealed;
      assert(kit_init(&sealed, &lab, 100));
      lab.game.legacy_supply_encoding = 1;
      lab.game.data = 17;
      lab.game.energy = 18;
      lab.game.essence = 19;
      lab.game.expedition_data = lab.game.expedition_energy =
          lab.game.expedition_essence = 110;
      lab.game.expedition_active = 1;
      lab.game.expedition_elapsed = 5;
      strcpy(lab.game.expedition_id, "legacy-expedition");
      assert(game_state_save(path, &lab.game) == 0);
      sealed.journal.version = version;
      sealed.journal.phase = KIT_COMMITTING;
      sealed.journal.accept_sequence = 1;
      strcpy(sealed.journal.haul_id, lab.game.expedition_id);
      for (unsigned i = 0; i < 3; ++i)
        sealed.journal.cargo[i] = 110;
      sealed.journal.elapsed = 5;
      sealed.journal.kind = GAME_EXPEDITION_SURVEY;
      persist_fixture(&sealed);
      if (after_commit) {
        GameCommand command = {0};
        command.operation_id = sealed.journal.haul_id;
        command.sequence = 1;
        command.type = version == 1 ? GAME_COMMAND_EXPEDITION_OFFLOAD
                                    : GAME_COMMAND_EXPEDITION_TRANSFER;
        assert(game_apply(path, &lab.game, &command) == GAME_OK);
      }
      SelectedLab loaded;
      selected_lab_init(&loaded);
      assert(selected_lab_load(&loaded, path, 200));
      DeviceKit recovered;
      assert(kit_init(&recovered, &loaded, 200));
      assert(recovered.journal.phase == KIT_ACK_PENDING &&
             recovered.journal.version == version);
      assert(loaded.game.data == 100 && loaded.game.energy == 100 &&
             loaded.game.essence == 100);
      assert(loaded.game.expedition_data == 0 &&
             loaded.game.expedition_energy == 0 &&
             loaded.game.expedition_essence == 0);
      assert(!loaded.game.legacy_supply_encoding &&
             loaded.game.last_operation_sequence == 2);
      assert(loaded.game.gather_progress_ms[0] == 27 * 40);
      assert(loaded.game.gather_progress_ms[1] == 28 * 40);
      assert(loaded.game.gather_progress_ms[2] == 29 * 40);
      assert(!loaded.game.expedition_active);
      assert(version == 1
                 ? !loaded.game.expedition_id[0]
                 : !strcmp(loaded.game.expedition_id, "legacy-expedition"));
      SelectedLab twice;
      selected_lab_init(&twice);
      assert(selected_lab_load(&twice, path, 300));
      DeviceKit twice_kit;
      assert(kit_init(&twice_kit, &twice, 300));
      assert(twice.game.last_operation_sequence == 2 &&
             twice.game.gather_progress_ms[0] == 1080);
      char marker[580];
      snprintf(marker, sizeof(marker), "%s.required", recovered.journal_path);
      unlink(marker);
      unlink(recovered.journal_path);
      unlink(path);
    }
  }
}
static void reserved_whole_intent_recovery(const char *directory) {
  /* Version3's reserved command14 has its original early-return result at
   * every crash boundary, including an already persisted ACK_PENDING. */
  for (unsigned boundary = 0; boundary < 3; ++boundary) {
    char path[512];
    snprintf(path, sizeof(path), "%s/reserved-v3-%u", directory, boundary);
    SelectedLab lab;
    selected_lab_init(&lab);
    assert(selected_lab_load(&lab, path, 100));
    DeviceKit kit;
    assert(kit_init(&kit, &lab, 100));
    strcpy(lab.game.expedition_id, "reserved-v3-expedition");
    lab.game.expedition_elapsed = 5;
    lab.game.expedition_data = 100;
    lab.game.gather_progress_ms[0] = 1000;
    assert(game_state_save(path, &lab.game) == 0);
    kit.journal.version = 3;
    kit.journal.phase = boundary == 2 ? KIT_ACK_PENDING : KIT_COMMITTING;
    kit.journal.accept_sequence = 1;
    strcpy(kit.journal.haul_id, lab.game.expedition_id);
    kit.journal.cargo[0] = 100;
    kit.journal.elapsed = 5;
    persist_fixture(&kit);
    GameCommand command = {0};
    command.operation_id = kit.journal.haul_id;
    command.sequence = 1;
    command.type = GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER;
    if (boundary)
      assert(game_apply(path, &lab.game, &command) == GAME_OK);
    selected_lab_init(&lab);
    assert(selected_lab_load(&lab, path, 200));
    assert(kit_init(&kit, &lab, 200));
    assert(kit.journal.version == 3 && kit.journal.phase == KIT_ACK_PENDING);
    assert(lab.game.data == 100 && lab.game.expedition_elapsed == 5 &&
           !strcmp(lab.game.expedition_id, "reserved-v3-expedition"));
    assert(lab.game.operations[0].fingerprint == UINT64_C(6413247596869858167));
    assert(game_apply(path, &lab.game, &command) == GAME_DUPLICATE);
    kit_tick(&kit, 202);
    assert(kit.journal.phase == KIT_COMPLETE);
    /* Only after the reserved receipt is closed may the empty route finish. */
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    assert(!strcmp(kit_option(&kit, KIT_COMPANION, 1), "Finish expedition"));
    press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    assert(kit.companion.page == COMP_FINISH_REVIEW && lab.game.expedition_id[0]);
    assert(kit.companion.focus == 1);
    press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    assert(!lab.game.expedition_id[0] && lab.game.sample_count == 0 &&
           lab.game.gather_progress_ms[0] == 1000);
    char marker[580];
    snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
    unlink(marker);
    unlink(kit.journal_path);
    unlink(path);
  }
}
static void early_unload_journey(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/early-unload", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  start_legacy_route(&kit);
  kit_tick(&kit, 105);
  char source_id[64];
  strcpy(source_id, lab.game.expedition_id);
  uint32_t preparation[3];
  memcpy(preparation, lab.game.gather_progress_ms, sizeof(preparation));
  uint32_t random_state = lab.game.gather_random_state;
  uint64_t attempts = lab.game.gather_attempt_count;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(!strcmp(lab.game.expedition_id, source_id) &&
         lab.game.expedition_active && lab.game.expedition_elapsed == 5);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit_link(&kit, KIT_COMPANION, 0));
  assert(kit.companion.page == COMP_CARGO && kit.journal.phase == KIT_IDLE);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_WAITING && kit.journal.version == 4);
  char sealed_haul_id[64];
  strcpy(sealed_haul_id, kit.journal.haul_id);
  assert(!strcmp(kit_expedition_status(&kit), "Returning"));
  kit_tick(&kit, 200);
  assert(lab.game.expedition_elapsed == 5);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 202);
  assert(kit.journal.phase == KIT_ARRIVED);
  assert(kit_link(&kit, KIT_COMPANION, 0));
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_ACK_PENDING &&
         !lab.game.expedition_id[0] && lab.game.expedition_elapsed == 0 &&
         !lab.game.expedition_active && lab.game.sample_count == 0);
  assert(!strcmp(kit_expedition_status(&kit), "Expedition ended"));
  uint32_t credited[] = {lab.game.data, lab.game.energy, lab.game.essence};
  assert(credited[0] + credited[1] + credited[2] > 0);
  /* Restart at ACK_PENDING verifies ended state before receipt delivery. */
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 300));
  assert(kit_init(&kit, &lab, 300));
  assert(!lab.game.expedition_id[0] && kit.journal.phase == KIT_ACK_PENDING);
  /* Also recover a crash between game commit and receipt-sidecar save. */
  kit.journal.phase = KIT_COMMITTING;
  persist_fixture(&kit);
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 400));
  assert(kit_init(&kit, &lab, 400));
  assert(lab.game.data == credited[0] && lab.game.energy == credited[1] &&
         lab.game.essence == credited[2] && lab.game.sample_count == 0);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 402);
  assert(kit.journal.phase == KIT_COMPLETE);
  assert(memcmp(preparation, lab.game.gather_progress_ms, sizeof(preparation)) == 0);
  assert(lab.game.gather_random_state == random_state &&
         lab.game.gather_attempt_count == attempts);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(!strcmp(kit_option(&kit, KIT_COMPANION, 0), "Field survey"));
  start_legacy_route(&kit);
  assert(strcmp(lab.game.expedition_id, source_id) != 0 &&
         lab.game.expedition_elapsed == 0 && lab.game.expedition_active);
  assert(lab.game.gather_random_state == random_state &&
         memcmp(preparation, lab.game.gather_progress_ms, sizeof(preparation)) == 0);
  /* Early empty return has an explicit Finish path and seals no fake haul. */
  press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  assert(!strcmp(kit_option(&kit, KIT_COMPANION, kit.companion.focus),
                 "Finish expedition"));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FINISH_REVIEW && lab.game.expedition_id[0]);
  assert(kit.companion.focus == 1);
  press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  /* This injected legacy start bypasses Companion FIELD_START, so the prior
   * completed receipt remains intact when its empty route finishes. */
  if (lab.game.expedition_id[0] || kit.journal.phase != KIT_COMPLETE ||
      strcmp(kit.journal.haul_id, sealed_haul_id) || lab.game.sample_count ||
      lab.game.gather_random_state != random_state) {
    fprintf(stderr, "Legacy empty Finish: expedition='%s' phase=%u "
            "haul='%s' expected_haul='%s' samples=%u random=%u expected_random=%u\n",
            lab.game.expedition_id, kit.journal.phase, kit.journal.haul_id,
            sealed_haul_id, lab.game.sample_count, lab.game.gather_random_state,
            random_state);
  }
  assert(!lab.game.expedition_id[0]);
  assert(kit.journal.phase == KIT_COMPLETE);
  assert(!strcmp(kit.journal.haul_id, sealed_haul_id));
  assert(lab.game.sample_count == 0);
  assert(lab.game.gather_random_state == random_state);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(kit.journal_path);
  unlink(path);
}
static void empty_finish_focus_after_award(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/finish-focus", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  start_legacy_route(&kit);
  press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  assert(!strcmp(kit_option(&kit, KIT_COMPANION, kit.companion.focus),
                 "Finish expedition"));
  /* Remember Finish in the selector, then reenter without invoking it. */
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.action_focus[COMP_PROBE] == 1);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.focus == 1 && lab.game.expedition_active);
  lab.game.gather_progress_ms[0] = 3000;
  lab.game.gather_random_state = 1;
  assert(game_state_save(path, &lab.game) == 0);
  unsigned old_frame = kit_revision(&kit, KIT_COMPANION);
  kit_tick(&kit, 101);
  assert(game_transfer_available(&lab.game) &&
         kit_option_count(&kit, KIT_COMPANION) == 1);
  assert(kit.companion.focus == 0 &&
         kit.companion.action_focus[COMP_PROBE] == 0);
  assert(!strcmp(kit_option(&kit, KIT_COMPANION, kit.companion.focus),
                 "View cargo"));
  /* The old Finish frame cannot activate the new action after the award. */
  kit_input(&kit, KIT_COMPANION, SELECTED_READY, old_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN, old_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_UP, old_frame);
  assert(kit.companion.page == COMP_PROBE && lab.game.expedition_active);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO && lab.game.expedition_active);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(kit.journal_path);
  unlink(path);
}
static void cargo_action_threshold(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/threshold", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  start_legacy_route(&kit);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO &&
         !game_transfer_available(&lab.game));
  lab.game.gather_progress_ms[0] = 3000;
  lab.game.gather_random_state = 1;
  assert(game_state_save(path, &lab.game) == 0);
  unsigned old_frame = kit_revision(&kit, KIT_COMPANION);
  kit_tick(&kit, 101);
  assert(game_transfer_available(&lab.game));
  kit_input(&kit, KIT_COMPANION, SELECTED_READY, old_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN, old_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_UP, old_frame);
  assert(kit.companion.page == COMP_CARGO);
  GameState before_send = lab.game;
  KitJournal before_journal = kit.journal;
  unsigned cargo_frame = kit_revision(&kit, KIT_COMPANION);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_WAITING && kit.companion.page != COMP_SEND_REVIEW);
  assert(!memcmp(&before_send, &lab.game, sizeof(before_send)));
  assert(kit.journal.cargo[0] == before_send.expedition_data);
  KitJournal sealed_once = kit.journal;
  /* A stale or repeated Confirm cannot seal the already sealed haul again. */
  kit_input(&kit, KIT_COMPANION, SELECTED_READY, cargo_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN, cargo_frame);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_UP, cargo_frame);
  assert(!memcmp(&sealed_once, &kit.journal, sizeof(sealed_once)));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(!memcmp(&sealed_once, &kit.journal, sizeof(sealed_once)) &&
         !memcmp(&before_send, &lab.game, sizeof(before_send)));
  assert(before_journal.phase == KIT_IDLE);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(kit.journal_path);
  unlink(path);
}
static void discard_and_home_reception(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/discard-and-home", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  start_legacy_route(&kit);
  lab.game.expedition_data = 300;
  lab.game.expedition_energy = lab.game.expedition_essence = 100;
  lab.game.expedition_elapsed = 5;
  assert(game_state_save(path, &lab.game) == 0);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_DISCARD_CLASS);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_DISCARD_QUANTITY);
  press(&kit, KIT_COMPANION, SELECTED_DOWN_DOWN);
  uint64_t before_review = lab.game.last_operation_sequence;
  uint32_t before_random = lab.game.gather_random_state;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_DISCARD_REVIEW &&
         kit.companion.discard_quantity == 200 && kit.companion.focus == 1);
  kit_tick(&kit, 110);
  assert(lab.game.last_operation_sequence == before_review &&
         lab.game.expedition_data == 300 && lab.game.expedition_elapsed == 5);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_DISCARD_QUANTITY && kit.companion.focus == 1);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.focus == 1);
  press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO && lab.game.expedition_data == 100 &&
         lab.game.last_operation_sequence == before_review + 1);
  assert(lab.game.data == 0 && lab.game.gather_random_state == before_random &&
         strstr(kit.companion.message, "Discarded 2"));
  /* Leaving Cargo before Send leaves inventory and outing unchanged. */
  press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO && lab.game.expedition_data == 100 &&
         kit.journal.phase == KIT_IDLE);
  assert(kit_link(&kit, KIT_COMPANION, 0));
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_WAITING && kit_option_count(&kit, KIT_COMPANION) == 1);
  uint32_t sealed_data = kit.journal.cargo[0];
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_MODES && kit.journal.cargo[0] == sealed_data);
  press(&kit, KIT_LAB, SELECTED_LIBRARY_DOWN);
  assert(lab.page == V1_LIBRARY);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 112);
  assert(lab.page == V1_CARGO && kit.caller_valid);
  uint64_t sealed_sequence = lab.game.last_operation_sequence;
  unsigned reception_frame = lab.revision;
  kit_input(&kit, KIT_LAB, SELECTED_READY, reception_frame);
  kit_input(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN, reception_frame);
  kit_input(&kit, KIT_LAB, SELECTED_HOME_DOWN, reception_frame);
  kit_input(&kit, KIT_LAB, SELECTED_HOME_UP, reception_frame);
  kit_input(&kit, KIT_LAB, SELECTED_CONFIRM_UP, reception_frame);
  assert(lab.page == V1_CARGO && kit.journal.phase == KIT_ARRIVED);
  press(&kit, KIT_LAB, SELECTED_HOME_DOWN);
  assert(lab.page == V1_HOME && !kit.caller_valid && kit.journal.phase == KIT_ARRIVED);
  kit_input(&kit, KIT_LAB, SELECTED_CONFIRM_UP, reception_frame);
  assert(lab.game.last_operation_sequence == sealed_sequence && lab.game.data == 0);
  press(&kit, KIT_LAB, SELECTED_BACK_DOWN);
  assert(lab.page == V1_HOME); /* Home does not restore the obsolete Library caller. */
  press(&kit, KIT_LAB, SELECTED_DOWN_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_EXPEDITION); /* Pending reception remains reachable. */
  assert(kit_link(&kit, KIT_COMPANION, 0));
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_ACK_PENDING && lab.game.data == 100 &&
         !lab.game.expedition_id[0]);
  press(&kit, KIT_LAB, SELECTED_HOME_DOWN);
  assert(lab.page == V1_HOME && kit.journal.phase == KIT_ACK_PENDING);
  /* Empty accepted Cargo has a truthful exit through Probe and modes. */
  kit.companion.mode = kit.companion.focus = COMP_CARGO;
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO &&
         strcmp(kit_option(&kit, KIT_COMPANION, 0), "View expedition"));
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_MODES);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 114);
  assert(kit.journal.phase == KIT_COMPLETE && lab.game.data == 100);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(kit.journal_path);
  unlink(path);
}
static void walk_field_site(DeviceKit *kit, unsigned site) {
  ExpeditionFieldView view;
  assert(kit_field_projection(kit, &view));
  unsigned start = view.map.avatar_y * 20u + view.map.avatar_x;
  unsigned target = view.map.site_y[site] * 20u + view.map.site_x[site];
  int previous[GAME_FIELD_CELLS];
  unsigned direction[GAME_FIELD_CELLS], queue[GAME_FIELD_CELLS];
  for (unsigned tile = 0; tile < GAME_FIELD_CELLS; ++tile) previous[tile] = -1;
  unsigned head = 0, tail = 0;
  previous[start] = (int)start;
  queue[tail++] = start;
  while (head < tail && previous[target] < 0) {
    unsigned current = queue[head++];
    for (unsigned move = 0; move < 4; ++move) {
      int x = (int)(current % 20u), y = (int)(current / 20u);
      if (move == 0) --y;
      if (move == 1) ++y;
      if (move == 2) --x;
      if (move == 3) ++x;
      if (x < 0 || x >= 20 || y < 0 || y >= 11) continue;
      unsigned next = (unsigned)y * 20u + (unsigned)x;
      if (view.map.paths[next] && previous[next] < 0) {
        previous[next] = (int)current;
        direction[next] = move;
        queue[tail++] = next;
      }
    }
  }
  assert(previous[target] >= 0);
  unsigned route[GAME_FIELD_CELLS], count = 0;
  for (unsigned tile = target; tile != start; tile = (unsigned)previous[tile])
    route[count++] = direction[tile];
  while (count) press(kit, KIT_COMPANION, (SelectedInput)(route[--count] * 2));
  assert(game_field_site(&kit->lab->game) == site);
}
static void frozen_field_receipt(const char *directory) {
  char path[512], journal[520], fixture_path[1024];
  snprintf(path, sizeof(path), "%s/frozen-field-receipt", directory);
  snprintf(journal, sizeof(journal), "%s.kit", path);
  const char *separator = strrchr(__FILE__, '/');
  assert(separator);
  const char *names[] = {"field-v1-pending.save", "field-v1-pending.save.kit"};
  unsigned char bytes[20000];
  for (unsigned fixture = 0; fixture < 2; ++fixture) {
    snprintf(fixture_path, sizeof(fixture_path), "%.*s/../tests/fixtures/%s",
             (int)(separator - __FILE__), __FILE__, names[fixture]);
    size_t length = read_saved_bytes(fixture_path, bytes, sizeof(bytes));
    assert(save_bytes_write(fixture ? journal : path, bytes, length) == 0);
  }
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 200));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 200));
  assert(lab.game.field.version == GAME_FIELD_LEGACY_CONTENT_VERSION &&
         kit.sealed_field.version == GAME_FIELD_LEGACY_CONTENT_VERSION);
  assert(kit.journal.version == 5 && kit.journal.phase == KIT_WAITING &&
         !kit.journal.companion_online);
  assert(lab.game.data == 0 && lab.game.expedition_data == GAME_SUPPLY_UNIT);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 202);
  assert(kit.journal.phase == KIT_ARRIVED);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.game.data == GAME_SUPPLY_UNIT && !lab.game.expedition_data &&
         lab.game.received_count == 1 &&
         lab.game.received[0].version == GAME_FIELD_LEGACY_CONTENT_VERSION);
  kit_tick(&kit, 203);
  assert(kit.journal.phase == KIT_ACK_PENDING);
  kit_tick(&kit, 204);
  assert(kit.journal.phase == KIT_COMPLETE);
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 300));
  assert(kit_init(&kit, &lab, 300));
  kit_tick(&kit, 301);
  assert(lab.game.data == GAME_SUPPLY_UNIT && lab.game.received_count == 1);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(lab.game.field.version == GAME_FIELD_CONTENT_VERSION);
  assert(lab.game.received[0].version == GAME_FIELD_LEGACY_CONTENT_VERSION);
  char marker[540];
  snprintf(marker, sizeof(marker), "%s.required", journal);
  unlink(marker);
  unlink(journal);
  unlink(path);
}
static void field_control_and_receipt(const char *directory) {
  char path[512];
  snprintf(path, sizeof(path), "%s/field-world", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab,path,100));
  DeviceKit kit;
  assert(kit_init(&kit,&lab,100));
  uint64_t navigation_sequence = lab.game.last_operation_sequence;
  press(&kit, KIT_LAB, SELECTED_LIBRARY_DOWN);
  assert(lab.page == V1_LIBRARY && selected_lab_options(&lab) == 1);
  assert(!strcmp(selected_lab_focus(&lab), "Back to research"));
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_SAMPLES && lab.game.last_operation_sequence == navigation_sequence);
  press(&kit, KIT_LAB, SELECTED_HOME_DOWN);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(lab.game.field.version && lab.game.field.active_source == GAME_FIELD_NONE);
  ExpeditionFieldView map_view;
  assert(kit_field_projection(&kit, &map_view));
  DeviceKit before_frame = kit;
  SelectedLab before_lab = lab;
  FILE *map_output = tmpfile();
  assert(map_output && kit_bmp(&kit, KIT_COMPANION, map_output));
  assert(ftell(map_output) == 811254);
  assert(!memcmp(&before_frame, &kit, sizeof(kit)) &&
         !memcmp(&before_lab, &lab, sizeof(lab)));
  assert(!fseek(map_output, 54, SEEK_SET));
  unsigned nonzero = 0;
  int pixel_byte;
  while ((pixel_byte = fgetc(map_output)) != EOF) nonzero |= (unsigned)pixel_byte;
  assert(nonzero && !fclose(map_output));
  unsigned map_frame = kit_revision(&kit,KIT_COMPANION);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FIELD_SITE && lab.game.field.active_source == GAME_FIELD_NONE);
  kit_input(&kit,KIT_COMPANION,SELECTED_READY,map_frame);
  kit_input(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN,map_frame);
  kit_input(&kit,KIT_COMPANION,SELECTED_CONFIRM_UP,map_frame);
  assert(lab.game.field.active_source == GAME_FIELD_NONE);
  assert(!lab.game.expedition_data && !lab.game.expedition_energy && !lab.game.expedition_essence);
  GameExpeditionField chooser_before = lab.game.field;
  press(&kit,KIT_COMPANION,SELECTED_BACK_DOWN);
  assert(!memcmp(&chooser_before, &lab.game.field, sizeof(chooser_before)));
  uint64_t idle_sequence = lab.game.last_operation_sequence;
  kit_tick(&kit,104);
  assert(lab.game.last_operation_sequence == idle_sequence && !lab.game.gather_attempt_count);
  /* Native travel commits on eligible down, and repeated down/up cannot repeat. */
  unsigned direction = 0;
  const int dx[] = {0,0,-1,1}, dy[] = {-1,1,0,0};
  for (; direction < 4; ++direction) {
    int x = lab.game.field.x + dx[direction], y = lab.game.field.y + dy[direction];
    if (x >= 0 && x < 20 && y >= 0 && y < 11 && lab.game.field.paths[y * 20 + x]) break;
  }
  assert(direction < 4);
  unsigned travel_frame = kit_revision(&kit, KIT_COMPANION);
  kit_input(&kit,KIT_COMPANION,SELECTED_READY,travel_frame);
  kit_input(&kit,KIT_COMPANION,(SelectedInput)(direction * 2),travel_frame);
  assert(lab.game.last_operation_sequence == idle_sequence + 1);
  kit_input(&kit,KIT_COMPANION,(SelectedInput)(direction * 2),travel_frame);
  kit_input(&kit,KIT_COMPANION,(SelectedInput)(direction * 2 + 1),travel_frame);
  assert(lab.game.last_operation_sequence == idle_sequence + 1);
  kit_input(&kit,KIT_COMPANION,(SelectedInput)(direction * 2),travel_frame);
  kit_input(&kit,KIT_COMPANION,SELECTED_CANCEL,travel_frame);
  kit_input(&kit,KIT_COMPANION,(SelectedInput)(direction * 2 + 1),travel_frame);
  assert(lab.game.last_operation_sequence == idle_sequence + 1);
  walk_field_site(&kit,2);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(lab.game.expedition_data == 1200 && !lab.game.field.remaining[4]);
  assert(kit.companion.page == COMP_PROBE);
  walk_field_site(&kit,3);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(lab.game.expedition_energy == 1400 && !lab.game.field.remaining[5]);
  walk_field_site(&kit,1);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FIELD_SITE && kit_option_count(&kit,KIT_COMPANION) == 2);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(lab.game.expedition_essence == 1200 && kit.companion.field_result);
  press(&kit,KIT_COMPANION,SELECTED_BACK_DOWN);
  walk_field_site(&kit,0);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(lab.game.expedition_data == 1400 && lab.game.field.remaining[1] == 2 && lab.game.field.remaining[2] == 1);
  press(&kit,KIT_COMPANION,SELECTED_DOWN_DOWN); /* A result needs no dismissal Confirm. */
  assert(kit.companion.page == COMP_PROBE);
  walk_field_site(&kit,1);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN); /* Only the trace remains here. */
  assert(lab.game.field.trace && !lab.game.field.collected && lab.game.sample_count == 0);
  walk_field_site(&kit,4);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN); /* Capsule remains eligible with40 supplies. */
  assert(lab.game.field.collected && lab.game.sample_count == 0);
  press(&kit,KIT_COMPANION,SELECTED_BACK_DOWN);
  press(&kit,KIT_COMPANION,SELECTED_RIGHT_DOWN);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO && kit.journal.phase == KIT_IDLE);
  GameExpeditionField reviewed = lab.game.field;
  uint32_t preparation[3];
  memcpy(preparation,lab.game.gather_progress_ms,sizeof(preparation));
  kit_tick(&kit,200);
  assert(!memcmp(&reviewed,&lab.game.field,sizeof(reviewed)));
  assert(!memcmp(preparation,lab.game.gather_progress_ms,sizeof(preparation)));
  press(&kit,KIT_COMPANION,SELECTED_BACK_DOWN); /* Leave Cargo without sending. */
  assert(lab.game.field.x == reviewed.x && lab.game.field.active_source == reviewed.active_source);
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(kit_link(&kit,KIT_COMPANION,0));
  press(&kit,KIT_COMPANION,SELECTED_CONFIRM_DOWN);
  assert(kit.journal.version == 5 && kit.journal.phase == KIT_WAITING);
  ExpeditionFieldView sent_view;
  assert(kit_field_projection(&kit, &sent_view));
  assert(!sent_view.delivery_accepted && sent_view.capsule_count == 1 &&
         sent_view.sent_capsule_count == 1);
  assert(!memcmp(sent_view.earned, sent_view.sent, sizeof(sent_view.earned)));
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab,path,300));
  assert(kit_init(&kit,&lab,300));
  assert(kit.journal.phase == KIT_WAITING && !kit.journal.companion_online);
  assert(kit_link(&kit,KIT_COMPANION,1));
  kit_tick(&kit,302);
  assert(kit.journal.phase == KIT_ARRIVED);
  assert(kit_link(&kit,KIT_COMPANION,0));
  press(&kit,KIT_LAB,SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_ACK_PENDING && lab.game.sample_count == 1 && lab.game.received_count == 1);
  accepted_source_is_empty(&kit);
  /* Simulate only the unsaved receipt phase after this real world commit.
   * Exact saved operation evidence, not the failed sidecar, owns acceptance. */
  DeviceKit committed_receipt_error = kit;
  committed_receipt_error.journal.phase = KIT_COMMITTING;
  committed_receipt_error.failed = 1;
  accepted_source_is_empty(&committed_receipt_error);
  assert(!lab.game.field.version && !lab.game.expedition_id[0]);
  ExpeditionFieldView accepted_view;
  assert(kit_field_projection(&kit, &accepted_view));
  assert(accepted_view.delivery_accepted && !accepted_view.capsule_count &&
         accepted_view.sent_capsule_count == 1);
  for (unsigned resource = 0; resource < 3; ++resource)
    assert(!accepted_view.earned[resource] &&
           accepted_view.sent[resource] == sent_view.sent[resource]);
  assert(kit.caller_valid);
  unsigned restored_home_focus = kit.caller.focus;
  press(&kit, KIT_LAB, SELECTED_BACK_DOWN);
  assert(!kit.caller_valid && lab.page == V1_HOME);
  assert(lab.focus == restored_home_focus);
  /* Re-entering Explore after acceptance opens the received log, preserving
   * the accepted haul while navigation returns to the remembered Home focus. */
  while (lab.focus < 1)
    press(&kit, KIT_LAB, SELECTED_DOWN_DOWN);
  while (lab.focus > 1)
    press(&kit, KIT_LAB, SELECTED_UP_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_EXPEDITION && !kit.caller_valid);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(kit.received_detail);
  press(&kit, KIT_LAB, SELECTED_BACK_DOWN);
  assert(!kit.received_detail && lab.page == V1_EXPEDITION);
  press(&kit, KIT_LAB, SELECTED_HOME_DOWN);
  assert(lab.page == V1_HOME && !kit.caller_valid);
  GameState accepted = lab.game;
  kit.journal.phase = KIT_COMMITTING;
  /* The committed game remains authoritative if receipt persistence fails. */
  assert(kit_field_projection(&kit, &accepted_view));
  assert(accepted_view.delivery_accepted && !accepted_view.capsule_count &&
         !accepted_view.earned[0] && !accepted_view.earned[1] && !accepted_view.earned[2]);
  assert(kit_link(&kit,KIT_COMPANION,0)); /* Persist actual envelope crash fixture. */
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab,path,400));
  assert(kit_init(&kit,&lab,400));
  assert(lab.game.data == accepted.data && lab.game.sample_count == 1 && lab.game.received_count == 1);
  assert(kit_link(&kit,KIT_COMPANION,1));
  kit_tick(&kit,402);
  assert(kit.journal.phase == KIT_COMPLETE && kit.acknowledged_capsules == 1);
  accepted_source_is_empty(&kit);
  assert(kit_field_projection(&kit, &accepted_view));
  assert(accepted_view.delivery_accepted && !accepted_view.capsule_count &&
         accepted_view.sent_capsule_count == 1);
  kit_tick(&kit,403);
  assert(kit.acknowledged_capsules == 1);
  ExpeditionReceivedView received;
  assert(kit_received_projection(&kit,0,&received));
  assert(received.record_count == 1 && !received.map.avatar_visible && received.sample_collected);
  assert(received.map.site_visible[2] == !!(lab.game.received[0].visited & (1u << 2)));
  assert(received.map.site_visible[3] == !!(lab.game.received[0].visited & (1u << 3)));
  navigation_sequence = lab.game.last_operation_sequence;
  press(&kit, KIT_LAB, SELECTED_RESEARCH_DOWN);
  assert(lab.page == V1_SAMPLES);
  press(&kit, KIT_LAB, SELECTED_DOWN_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDIES);
  while (lab.focus + 1 < selected_lab_options(&lab))
    press(&kit, KIT_LAB, SELECTED_DOWN_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDIES && strstr(lab.message, "Discover every region"));
  /* A stale/incomplete supported-form view still has a real exit action. */
  lab.page = V1_CREATE;
  lab.focus = 0;
  assert(!strcmp(selected_lab_focus(&lab), "Back to research"));
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDIES && lab.game.last_operation_sequence == navigation_sequence);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(lab.game.field.version && lab.game.field.sample_budget == GAME_MAX_SAMPLES - 1u);
  assert(kit.journal.phase == KIT_IDLE);
  assert(lab.game.field.active_source == GAME_FIELD_NONE && lab.game.sample_count == 1);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_RIGHT_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_FINISH_REVIEW && kit.companion.focus == 1);
  press(&kit, KIT_COMPANION, SELECTED_UP_DOWN);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(!lab.game.expedition_id[0] && lab.game.sample_count == 1 && lab.game.received_count == 1);
  char marker[580];
  snprintf(marker,sizeof(marker),"%s.required",kit.journal_path);
  unlink(marker);
  unlink(kit.journal_path);
  unlink(path);
}
static void legacy_capsule_limit(const char *directory) {
  for (unsigned format = 0; format < 2; ++format) {
    char path[512];
    snprintf(path, sizeof(path), "%s/legacy-capacity-%u", directory, format);
    SelectedLab lab;
    selected_lab_init(&lab);
    assert(selected_lab_load(&lab, path, 100));
    for (unsigned sample = 0; sample < GAME_MAX_SAMPLES; ++sample) {
      snprintf(lab.game.expedition_id, sizeof(lab.game.expedition_id),
               "BEE-E-LEGACY-%u", sample);
      lab.game.expedition_elapsed = GAME_EXPEDITION_SECONDS;
      GameCommand intake = {0};
      char operation[64];
      snprintf(operation, sizeof(operation), "old-intake-%u", sample);
      intake.operation_id = operation;
      intake.sequence = lab.game.last_operation_sequence + 1;
      intake.type = GAME_COMMAND_EXPEDITION_UNLOAD;
      assert(game_apply(path, &lab.game, &intake) == GAME_OK);
    }
    DeviceKit legacy = {0};
    legacy.lab = &lab;
    legacy.journal.version = 4;
    legacy.journal.companion_online = legacy.journal.dock_online = 1;
    snprintf(legacy.journal_path, sizeof(legacy.journal_path), "%s.kit", path);
    persist_fixture(&legacy);
    if (format) {
      /* Frozen envelope V1: original exact size, header and checksum policy. */
      struct {
        char magic[8];
        uint32_t version, size, checksum;
        KitJournal journal;
        KitResidentCache residents;
        uint32_t dock_visits;
      } old = {0};
      assert(sizeof(old) == 4224);
      memcpy(old.magic, "CLKITV1", 8);
      old.version = 1;
      old.size = sizeof(old);
      old.journal = legacy.journal;
      const unsigned char *bytes = (const unsigned char *)&old;
      uint32_t checksum = 2166136261u;
      for (size_t byte = 0; byte < sizeof(old); ++byte)
        if (byte < 16 || byte >= 20)
          checksum = (checksum ^ bytes[byte]) * 16777619u;
      old.checksum = checksum;
      assert(save_bytes_write(legacy.journal_path, &old, sizeof(old)) == 0);
    }
    DeviceKit kit;
    assert(kit_init(&kit, &lab, 100));
    assert(kit.acknowledged_capsules == GAME_MAX_SAMPLES);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    assert(lab.game.field.sample_budget == 0);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
    kit_tick(&kit, 104);
    assert(lab.game.field.active_source == GAME_FIELD_NONE && lab.game.field.attempts[0] == 1);
    assert(lab.game.sample_count == GAME_MAX_SAMPLES && !lab.game.field.collected);
    char marker[580];
    snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
    unlink(marker);
    unlink(kit.journal_path);
    unlink(path);
  }
}

static void native_graphics_retirement(void) {
  SelectedLab lab;
  selected_lab_init(&lab);
  lab.kit_mode = 1;
  DeviceKit kit = {0};
  kit.lab = &lab;
  kit.journal.companion_online = kit.journal.dock_online = 1;
  NativeUiContext *context = native_ui_create_device(KIT_LAB);
  assert(context);
  const SelectedPage pages[] = {V1_EXPEDITION, V1_CARGO, V1_DISCARD_REVIEW,
      (SelectedPage)-1, (SelectedPage)(V1_CREATE_REVIEW + 1)};
  for (unsigned index = 0; index < sizeof(pages) / sizeof(pages[0]); ++index) {
    lab.page = pages[index];
    SelectedLab before_lab = lab;
    DeviceKit before_kit = kit;
    int supported = index < 2;
    assert(!selected_lab_frame_supported(&lab));
    assert(kit_frame_supported(&kit, KIT_LAB) == supported);
    FILE *standalone = tmpfile();
    FILE *generic = tmpfile();
    FILE *persistent = tmpfile();
    assert(standalone && generic && persistent);
    assert(!selected_lab_bmp(&lab, standalone) && !ftell(standalone));
    assert(kit_bmp(&kit, KIT_LAB, generic) == supported);
    assert(kit_bmp_ui(&kit, KIT_LAB, persistent, context, 1) == supported);
    assert(ftell(generic) == (supported ? 1843254 : 0));
    assert(ftell(persistent) == (supported ? 1843254 : 0));
    if (supported) {
      rewind(generic);
      rewind(persistent);
      int left, right;
      do {
        left = fgetc(generic);
        right = fgetc(persistent);
        assert(left == right);
      } while (left != EOF);
    }
    assert(!memcmp(&before_lab, &lab, sizeof(lab)) &&
           !memcmp(&before_kit, &kit, sizeof(kit)));
    assert(!fclose(standalone) && !fclose(generic) && !fclose(persistent));
  }
  assert(!kit_frame_supported(&kit, KIT_DOCK + 1));
  native_ui_destroy(context);
}

int main(void) {
  native_graphics_retirement();
  char directory[] = "/tmp/beecho-kit-XXXXXX";
  assert(mkdtemp(directory));
  field_control_and_receipt(directory);
  frozen_field_receipt(directory);
  legacy_capsule_limit(directory);
  resident_cache_and_visits(directory);
  legacy_intent_recovery(directory);
  reserved_whole_intent_recovery(directory);
  early_unload_journey(directory);
  empty_finish_focus_after_award(directory);
  cargo_action_threshold(directory);
  discard_and_home_reception(directory);
  char path[512];
  snprintf(path, sizeof(path), "%s/game", directory);
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  DeviceKit kit;
  assert(kit_init(&kit, &lab, 100));
  mode_navigation(&kit);
  unsigned painted_dock = kit_revision(&kit, KIT_DOCK);
  unsigned dock_action_epoch = kit.dock.epoch;
  /* Init already populates the cache. Model a missing timestamp so the next
   * tick has an actual passive cache update to publish. */
  kit.journal.dock_updated_at = 0;
  kit_tick(&kit, 100);
  /* A passive cache repaint may occur while an already decoded frame is
   * being acknowledged. It does not change the action meaning. */
  assert(kit_revision(&kit, KIT_DOCK) > painted_dock);
  assert(kit.dock.epoch == dock_action_epoch);
  kit_input(&kit, KIT_DOCK, SELECTED_READY, painted_dock);
  kit_input(&kit, KIT_DOCK, SELECTED_DOWN_DOWN, painted_dock);
  kit_input(&kit, KIT_DOCK, SELECTED_DOWN_UP, painted_dock);
  assert(kit.dock.focus == 1);
  /* Navigation changes the interaction: the previous frame cannot be made
   * eligible again by a late READY or by a fresh down/up pair. */
  kit_input(&kit, KIT_DOCK, SELECTED_READY, painted_dock);
  kit_input(&kit, KIT_DOCK, SELECTED_DOWN_DOWN, painted_dock);
  kit_input(&kit, KIT_DOCK, SELECTED_DOWN_UP, painted_dock);
  assert(kit.dock.focus == 1);
  press(&kit, KIT_DOCK, SELECTED_UP_DOWN);
  assert(kit.dock.focus == 0);
  /* Separate native sizes and four-gray Dock output, including padded BMP
   * rows. */
  for (unsigned device = 0; device < 3; ++device) {
    FILE *frame = tmpfile();
    assert(frame);
    assert(kit_bmp(&kit, device, frame));
    assert(ftell(frame) == 54 + (long)(((kit_width(device) * 3 + 3) & ~3u) *
                                       kit_height(device)));
    if (device == KIT_DOCK) {
      rewind(frame);
      assert(fseek(frame, 54, SEEK_SET) == 0);
      for (unsigned pixel = 0; pixel < kit_width(device) * kit_height(device); ++pixel) {
        int blue = fgetc(frame), green = fgetc(frame), red = fgetc(frame);
        assert(blue >= 0 && blue == green && green == red);
        assert(blue == 0 || blue == 85 || blue == 170 || blue == 255);
      }
      assert(fgetc(frame) == EOF);
    }
    fclose(frame);
  }
  /* Lab cannot start an expedition. */
  press(&kit, KIT_LAB, SELECTED_DOWN_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  press(&kit, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(!lab.game.expedition_id[0]);
  /* Companion runs the route and keeps cargo separate from spendable Lab stock.
   */
  press(&kit, KIT_COMPANION,
        SELECTED_CONFIRM_DOWN); /* Enter actions, no start. */
  assert(!lab.game.expedition_active && kit.companion.page == COMP_PROBE);
  start_legacy_route(&kit);
  assert(lab.game.expedition_active);
  kit_tick(&kit, 110);
  unsigned painted_companion = kit_revision(&kit, KIT_COMPANION);
  unsigned painted_epoch = kit.companion.epoch;
  kit_tick(&kit, 111);
  assert(kit_revision(&kit, KIT_COMPANION) > painted_companion &&
         kit.companion.epoch == painted_epoch);
  kit_input(&kit, KIT_COMPANION, SELECTED_READY, painted_companion);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN, painted_companion);
  kit_input(&kit, KIT_COMPANION, SELECTED_CONFIRM_UP, painted_companion);
  assert(kit.companion.page == COMP_CARGO);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_PROBE);
  kit_tick(&kit, 160);
  assert(lab.game.expedition_elapsed == 60 && lab.game.data == 0);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO);
  assert(kit.companion.task_depth == 1);
  press(&kit, KIT_COMPANION, SELECTED_BACK_DOWN);
  assert(kit.companion.page == COMP_PROBE && !kit.companion.task_depth);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.companion.page == COMP_CARGO && kit.journal.phase == KIT_IDLE);
  uint32_t before_send_cargo = lab.game.expedition_data;
  kit_tick(&kit, 170);
  assert(lab.game.expedition_data == before_send_cargo);
  assert(kit_link(&kit, KIT_COMPANION, 0));
  assert(kit.companion.focus == 0);
  press(&kit, KIT_COMPANION, SELECTED_CONFIRM_DOWN);
  assert(kit.journal.phase == KIT_WAITING);
  uint32_t cargo = kit.journal.cargo[0];
  assert(cargo > 0);
  kit_tick(&kit, 200);
  assert(lab.game.expedition_data == cargo && lab.game.data == 0);
  /* Restart with an offline sealed haul retains intent and original identity.
   */
  SelectedLab reopened;
  selected_lab_init(&reopened);
  assert(selected_lab_load(&reopened, path, 300));
  DeviceKit recovered;
  assert(kit_init(&recovered, &reopened, 300));
  assert(recovered.journal.phase == KIT_WAITING &&
         !recovered.journal.companion_online);
  assert(kit_link(&recovered, KIT_COMPANION, 1));
  press(&recovered, KIT_LAB, SELECTED_LIBRARY_DOWN);
  assert(reopened.page == V1_LIBRARY);
  unsigned old_frame = kit_revision(&recovered, KIT_LAB);
  kit_input(&recovered, KIT_LAB, SELECTED_READY, old_frame);
  kit_input(&recovered, KIT_LAB, SELECTED_CONFIRM_DOWN, old_frame);
  kit_tick(&recovered, 302);
  kit_input(&recovered, KIT_LAB, SELECTED_CONFIRM_UP, old_frame);
  assert(reopened.game.data ==
         0); /* Arrival cannot authorize an old held Confirm. */
  assert(recovered.journal.phase == KIT_ARRIVED);
  assert(reopened.page == V1_CARGO && recovered.caller.page == V1_LIBRARY);
  press(&recovered, KIT_LAB, SELECTED_BACK_DOWN);
  assert(reopened.page == V1_LIBRARY);
  kit_tick(&recovered, 303);
  assert(reopened.page == V1_LIBRARY); /* No repeated forced reopening. */
  press(&recovered, KIT_LAB, SELECTED_BACK_DOWN);
  press(&recovered, KIT_LAB, SELECTED_DOWN_DOWN);
  press(&recovered, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(kit_link(&recovered, KIT_DOCK, 0));
  assert(kit_link(&recovered, KIT_COMPANION, 0));
  press(&recovered, KIT_LAB, SELECTED_CONFIRM_DOWN);
  assert(recovered.journal.phase == KIT_ACK_PENDING &&
         reopened.game.data == cargo / GAME_SUPPLY_UNIT * GAME_SUPPLY_UNIT);
  assert(reopened.game.expedition_data == cargo % GAME_SUPPLY_UNIT);
  assert(reopened.game.sample_count == 1 &&
         recovered.journal.dock_stock[0] == 0);
  uint64_t sequence = reopened.game.last_operation_sequence;
  press(&recovered, KIT_LAB, SELECTED_CONFIRM_DOWN);
  kit_tick(&recovered, 310);
  assert(reopened.game.last_operation_sequence == sequence &&
         reopened.game.data == cargo / GAME_SUPPLY_UNIT * GAME_SUPPLY_UNIT);
  assert(recovered.journal.phase == KIT_ACK_PENDING);
  /* Crash after game commit but before receipt save: intent is reconciled, not
   * credited twice. */
  recovered.journal.phase = KIT_COMMITTING;
  persist_fixture(&recovered);
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 400));
  assert(kit_init(&kit, &lab, 400));
  assert(kit.journal.phase == KIT_ACK_PENDING &&
         lab.game.data == cargo / GAME_SUPPLY_UNIT * GAME_SUPPLY_UNIT &&
         lab.game.sample_count == 1);
  /* A missing/rolled-back accepted world cannot authorize an acknowledgement.
   */
  GameState accepted_world = lab.game;
  game_state_init(&lab.game);
  assert(game_state_save(path, &lab.game) == 0);
  SelectedLab missing;
  selected_lab_init(&missing);
  assert(selected_lab_load(&missing, path, 401));
  DeviceKit missing_kit;
  assert(!kit_init(&missing_kit, &missing, 401));
  assert(missing_kit.failed);
  lab.game = accepted_world;
  assert(game_state_save(path, &lab.game) == 0);
  assert(kit_link(&kit, KIT_COMPANION, 1));
  kit_tick(&kit, 402);
  assert(kit.journal.phase == KIT_COMPLETE && !lab.game.expedition_id[0]);
  assert(kit_link(&kit, KIT_DOCK, 1));
  kit_tick(&kit, 403);
  assert(kit.journal.dock_stock[0] ==
             cargo / GAME_SUPPLY_UNIT * GAME_SUPPLY_UNIT &&
         kit.journal.dock_samples == 1);
  /* No silent recovery from a lost required journal after accepted cargo
   * cleared. */
  assert(unlink(kit.journal_path) == 0);
  SelectedLab blocked;
  selected_lab_init(&blocked);
  assert(selected_lab_load(&blocked, path, 500));
  DeviceKit blocked_kit;
  assert(!kit_init(&blocked_kit, &blocked, 500));
  assert(blocked_kit.failed && blocked.storage_error &&
         blocked.game.data == cargo / GAME_SUPPLY_UNIT * GAME_SUPPLY_UNIT);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit.journal_path);
  unlink(marker);
  unlink(path);
  rmdir(directory);
  puts("Three-device ownership, offline handoff, duplicate, recovery and Dock "
       "cache checks passed");
  return 0;
}
