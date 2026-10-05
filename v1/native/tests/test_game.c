#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 200809L
#include "game_rules.h"
#include "expedition.h"
#include "pip_genetics.h"

#include <assert.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <unistd.h>

static int fail_second_fsync;
static unsigned transaction_fsync_count;

int fsync(int file_descriptor) {
  if (fail_second_fsync && ++transaction_fsync_count == 2u) {
    fail_second_fsync = 0;
    errno = EIO;
    return -1;
  }
  return (int)syscall(SYS_fsync, file_descriptor);
}

static GameResult apply(GameState *state, const char *path,
                        GameCommand command) {
  char operation_id[64];
  command.sequence = state->last_operation_sequence + 1u;
  (void)snprintf(operation_id, sizeof(operation_id), "test-op-%llu",
                 (unsigned long long)command.sequence);
  command.operation_id = operation_id;
  if (((command.type >= GAME_COMMAND_FIELD_MOVE && command.type <= GAME_COMMAND_FIELD_COLLECT) ||
       command.type == GAME_COMMAND_FIELD_TAKE) &&
      !command.data.field.expedition_id)
    command.data.field.expedition_id = state->expedition_id;
  return game_apply(path, state, &command);
}

static GameCommand command(GameCommandType type) {
  GameCommand result;
  memset(&result, 0, sizeof(result));
  result.type = type;
  return result;
}

static void complete_expedition(GameState *state, const char *path,
                                GameExpeditionKind kind, uint32_t start_time) {
  unsigned before_samples = state->sample_count;
  GameCommand action = command(GAME_COMMAND_EXPEDITION_START);
  action.data.expedition.kind = kind;
  action.data.expedition.monotonic_seconds = start_time;
  assert(apply(state, path, action) == GAME_OK);
  uint32_t now = start_time;
  unsigned batches = 0;
  do {
    assert(++batches <= 2u);
    now += GAME_EXPEDITION_SECONDS;
    action = command(GAME_COMMAND_EXPEDITION_TICK);
    action.data.monotonic_seconds = now;
    assert(apply(state, path, action) == GAME_OK);
    if (state->expedition_elapsed < GAME_EXPEDITION_SECONDS) {
      action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
      assert(apply(state, path, action) == GAME_OK);
      action = command(GAME_COMMAND_EXPEDITION_CONTINUE);
      action.data.monotonic_seconds = now;
      assert(apply(state, path, action) == GAME_OK);
    }
  } while (state->expedition_elapsed < GAME_EXPEDITION_SECONDS);
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(state, path, action) == GAME_OK);
  assert(state->sample_count == before_samples + 1u);
  assert(!state->expedition_id[0] && !state->expedition_active);
  assert(game_stock_normalized(state));
}
static void study_all(GameState *state, const char *path, unsigned sample) {
  unsigned index;
  for (index = 0; index < PIP_STUDY_COUNT; ++index) {
    GameCommand action = command(GAME_COMMAND_STUDY);
    action.data.study.sample = sample;
    action.data.study.study = index;
    assert(apply(state, path, action) == GAME_OK);
  }
  assert(state->samples[sample].decoded_studies == 0x1fu);
  assert(state->samples[sample].decoded_facts == PIP_REQUIRED_FACTS_MASK);
}

static void start_and_open(GameState *state, const char *path, unsigned sample,
                           unsigned preference, uint32_t start_time) {
  GameCommand action = command(GAME_COMMAND_INCUBATION_START);
  unsigned individual = state->individual_count;
  action.data.creation.sample = sample;
  action.data.creation.preference = preference;
  action.data.creation.monotonic_seconds = start_time;
  assert(apply(state, path, action) == GAME_OK);
  assert(state->individual_count == individual + 1u);
  assert(!state->individuals[individual].revealed);
  assert(state->individuals[individual].origin_founder);
  assert(strcmp(state->individuals[individual].source_sample_id,
                state->samples[sample].id) == 0);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(state, path, action) == GAME_UNAVAILABLE);
  action = command(GAME_COMMAND_INCUBATION_TICK);
  action.data.monotonic_seconds = start_time + GAME_INCUBATION_SECONDS - 1u;
  assert(apply(state, path, action) == GAME_OK);
  assert(!state->incubation_ready);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(state, path, action) == GAME_UNAVAILABLE);
  action = command(GAME_COMMAND_INCUBATION_TICK);
  action.data.monotonic_seconds = start_time + GAME_INCUBATION_SECONDS;
  assert(apply(state, path, action) == GAME_OK);
  assert(state->incubation_ready);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(state, path, action) == GAME_OK);
  assert(state->individuals[individual].revealed);
}

/* Write the historical same-ABI payload without the appended V2 fields. This
 * deliberately does not call the current writer, whose header must be V3. */
static void write_legacy_save(const char *path, const GameState *state) {
  struct {
    char magic[8];
    uint32_t version;
    uint32_t payload_size;
    uint32_t checksum;
    GameState state;
  } saved;
  memset(&saved, 0, sizeof(saved));
  memcpy(saved.magic, "BEECHOV1", 8u);
  saved.version = 1u;
  saved.payload_size = (uint32_t)offsetof(GameState, gather_progress_ms);
  saved.state = *state;
  saved.state.version = 1u;
  saved.state.runtime_anchors_ready = 0;
  saved.state.expedition_last_tick = 0;
  saved.state.incubation_last_tick = 0;
  const unsigned char *bytes = (const unsigned char *)&saved.state;
  saved.checksum = 2166136261u;
  for (size_t i = 0; i < saved.payload_size; ++i) {
    saved.checksum ^= bytes[i];
    saved.checksum *= 16777619u;
  }
  FILE *file = fopen(path, "wb");
  assert(file);
  size_t length = offsetof(GameState, gather_progress_ms) +
                  (size_t)((unsigned char *)&saved.state - (unsigned char *)&saved);
  assert(fwrite(&saved, 1, length, file) == length);
  assert(fclose(file) == 0);
}

static void start_gathering(GameState *state, const char *path, uint32_t now) {
  game_rules_resume_runtime(state, now);
  GameCommand action = command(GAME_COMMAND_EXPEDITION_START);
  action.data.expedition.kind = GAME_EXPEDITION_FORAGE;
  action.data.expedition.monotonic_seconds = now;
  assert(apply(state, path, action) == GAME_OK);
}

static void tick_gathering(GameState *state, const char *path, uint32_t now) {
  GameCommand action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = now;
  assert(apply(state, path, action) == GAME_OK);
}

static void test_whole_supply_rules(const char *path) {
  GameState state;
  GameState reopened;
  GameState unchanged;
  GameCommand action;
  assert(GAME_COMMAND_EXPEDITION_OFFLOAD == 3);
  assert(GAME_COMMAND_EXPEDITION_TRANSFER == 11);
  assert(GAME_COMMAND_STOCK_NORMALIZE == 12);
  assert(GAME_COMMAND_EXPEDITION_CONTINUE == 13);
  assert(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER == 14);
  assert(GAME_COMMAND_EXPEDITION_FINISH == 15);
  assert(GAME_COMMAND_EXPEDITION_UNLOAD == 16);
  assert(GAME_COMMAND_INVESTIGATE == 17);
  assert(GAME_COMMAND_SUPPORTED_CREATION == 18);

  /* A legacy file is decoded without modifying raw inventory or its source
   * file. Its pending encoding flag survives a V2 save and restart. */
  game_state_init(&state);
  strcpy(state.expedition_id, "BEE-E-90001");
  state.expedition_elapsed = 5u;
  state.expedition_data = state.expedition_energy = state.expedition_essence = 110u;
  write_legacy_save(path, &state);
  assert(game_state_load(path, &state) == 0);
  int legacy_file = open(path, O_RDONLY);
  uint32_t source_version = 0;
  assert(legacy_file >= 0);
  assert(pread(legacy_file, &source_version, sizeof(source_version), 8) ==
         (ssize_t)sizeof(source_version));
  close(legacy_file);
  assert(source_version == 1u); /* Decoding did not rewrite the old file. */
  assert(state.version == GAME_STATE_VERSION);
  assert(game_supply_conversion_pending(&state));
  assert(state.expedition_data == 110u && !game_stock_normalized(&state));
  assert(game_state_save(path, &state) == 0);
  assert(game_state_load(path, &reopened) == 0);
  state = reopened;
  assert(game_supply_conversion_pending(&state));
  action = command(GAME_COMMAND_EXPEDITION_OFFLOAD);
  action.sequence = 1u;
  action.operation_id = "legacy-offload-reserved";
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.operations[0].fingerprint == UINT64_C(13000014988436593482));
  assert(state.data == 110u && !state.expedition_id[0]);
  assert(game_state_load(path, &reopened) == 0);
  state = reopened;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  GameCommand wrong_policy = action;
  wrong_policy.type = GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER;
  assert(game_apply(path, &state, &wrong_policy) == GAME_CONFLICT);
  action = command(GAME_COMMAND_STOCK_NORMALIZE);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.data == 100u && state.energy == 100u && state.essence == 100u);
  assert(state.expedition_data == 0u && state.gather_progress_ms[0] == 400u);
  assert(!state.expedition_id[0] && state.expedition_elapsed == 0u);
  assert(game_stock_normalized(&state));
  unchanged = state;
  assert(apply(&state, path, action) == GAME_DUPLICATE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);

  /* A reserved V2 command11 keeps its raw split behavior. Conversion happens
   * only after that receipt has been settled, without inventing an item. */
  game_state_init(&state);
  state.legacy_supply_encoding = 1;
  state.data = 99u;
  state.expedition_data = 110u;
  state.expedition_elapsed = 5u;
  strcpy(state.expedition_id, "BEE-E-90002");
  action = command(GAME_COMMAND_EXPEDITION_TRANSFER);
  action.sequence = 1u;
  action.operation_id = "legacy-split-reserved";
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.operations[0].fingerprint == UINT64_C(6414028411195858737));
  assert(state.data == 100u && state.expedition_data == 109u);
  assert(state.expedition_elapsed == 5u && state.expedition_id[0]);
  assert(game_state_load(path, &reopened) == 0);
  state = reopened;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  action = command(GAME_COMMAND_STOCK_NORMALIZE);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.expedition_data == 100u && state.gather_progress_ms[0] == 360u);

  /* Combining two old residues yields historical time credit, never a whole
   * inventory item. The credit uses no cargo capacity, even above one interval. */
  game_state_init(&state);
  state.legacy_supply_encoding = 1;
  state.data = 99u;
  state.expedition_data = 99u;
  action = command(GAME_COMMAND_STOCK_NORMALIZE);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.data == 0u && state.expedition_data == 0u);
  assert(state.gather_progress_ms[0] == 7920u);
  assert(game_gather_remaining_ms(&state) == 0u);
  assert(game_gather_due_mask(&state) == 1u);
  assert(game_gather_required_slots(&state) == 1u);
  assert(!game_gather_capacity_blocked(&state));
  state.gather_random_state = 1u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 101u);
  assert(state.expedition_data == 100u && state.expedition_energy == 0u);
  assert(state.gather_progress_ms[0] == 4920u && state.gather_attempt_count == 1u);
  tick_gathering(&state, path, 102u);
  assert(state.expedition_data == 200u && state.gather_progress_ms[0] == 1920u);
  game_state_init(&state);
  state.legacy_supply_encoding = 1;
  state.data = state.energy = state.essence = 99u;
  state.expedition_data = 1334u;
  state.expedition_energy = state.expedition_essence = 1333u;
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.expedition_data + state.expedition_energy +
         state.expedition_essence == 3900u);
  assert(state.gather_progress_ms[0] == 5320u);
  assert(state.gather_progress_ms[1] == 5280u);
  assert(game_gather_capacity_blocked(&state));

  /* Fresh acceptance of a sealed old partial-only haul can convert atomically.
   * A normal new empty send remains unavailable; its preparation stays here. */
  game_state_init(&state);
  state.legacy_supply_encoding = 1;
  state.expedition_data = 44u;
  state.expedition_elapsed = 2u;
  strcpy(state.expedition_id, "BEE-E-90003");
  assert(!game_transfer_available(&state));
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.data == 0u && state.expedition_data == 0u);
  assert(state.gather_progress_ms[0] == 1760u);
  assert(!state.expedition_active && state.expedition_elapsed == 2u);
  assert(strcmp(state.expedition_id, "BEE-E-90003") == 0);
  assert(state.sample_count == 0u);
  unchanged = state;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  assert(game_gather_due_mask(&state) == 1u);
  assert(game_gather_remaining_ms(&state) == 2240u);
  assert(game_state_load(path, &reopened) == 0);
  game_rules_resume_runtime(&reopened, 900u);
  state = reopened;
  assert(state.gather_progress_ms[0] == 1760u &&
         state.gather_random_state == GAME_GATHER_INITIAL_RANDOM_STATE);
  action = command(GAME_COMMAND_EXPEDITION_CONTINUE);
  action.data.monotonic_seconds = 900u;
  assert(apply(&state, path, action) == GAME_OK);
  tick_gathering(&state, path, 903u);
  assert(state.gather_attempt_count == 1u &&
         state.gather_last_attempted_mask == 1u);
  assert(state.gather_last_awarded_mask == 0u && state.expedition_data == 0u &&
         state.gather_random_state == 1085196063u);
  assert(state.gather_progress_ms[0] == 760u &&
         state.gather_progress_ms[1] == 3000u);
  assert(game_gather_due_mask(&state) == 6u &&
         game_gather_remaining_ms(&state) == 1000u);

  /* Seed1 makes the first three class attempts succeed; the next Data attempt
   * misses. Three seconds are only preparation, not partly collected items. */
  game_state_init(&state);
  state.gather_random_state = 1u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 103u);
  assert(state.expedition_data == 0u && !game_transfer_available(&state));
  assert(state.gather_progress_ms[0] == 3000u);
  assert(game_gather_remaining_ms(&state) == 1000u);
  assert(game_gather_due_mask(&state) == 7u);
  assert(state.gather_attempt_count == 0u && state.gather_random_state == 1u);
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 104u;
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "chance-save-failure";
  char missing_path[256];
  assert(snprintf(missing_path, sizeof(missing_path), "%s/missing/save", path) > 0);
  unchanged = state;
  assert(game_apply(missing_path, &state, &action) == GAME_STORAGE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  tick_gathering(&state, path, 104u);
  assert(state.expedition_data == 100u && state.expedition_energy == 100u &&
         state.expedition_essence == 100u);
  assert(state.gather_attempt_count == 3u);
  assert(state.gather_last_attempted_mask == 7u &&
         state.gather_last_awarded_mask == 7u);
  tick_gathering(&state, path, 108u);
  assert(state.expedition_data == 100u && state.expedition_energy == 200u &&
         state.expedition_essence == 200u);
  assert(state.gather_attempt_count == 6u && state.gather_last_awarded_mask == 6u);
  tick_gathering(&state, path, 109u);
  assert(state.gather_progress_ms[0] == 1000u);
  assert(state.gather_last_awarded_mask == 6u);
  uint32_t random_before_transfer = state.gather_random_state;
  uint64_t attempts_before_transfer = state.gather_attempt_count;
  char expedition_id[64];
  strcpy(expedition_id, state.expedition_id);
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "whole-early-haul";
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.data == 100u && state.energy == 200u && state.essence == 200u);
  assert(state.expedition_data == 0u && state.gather_progress_ms[0] == 1000u);
  assert(state.gather_random_state == random_before_transfer &&
         state.gather_attempt_count == attempts_before_transfer);
  assert(!state.expedition_active && state.expedition_elapsed == 9u &&
         strcmp(state.expedition_id, expedition_id) == 0);
  assert(game_state_load(path, &reopened) == 0);
  game_rules_resume_runtime(&reopened, 900u);
  state = reopened;
  unchanged = state;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  action = command(GAME_COMMAND_EXPEDITION_CONTINUE);
  action.data.monotonic_seconds = 900u;
  assert(apply(&state, path, action) == GAME_OK);
  tick_gathering(&state, path, 903u);
  assert(state.expedition_elapsed == 12u && state.gather_attempt_count == 9u);
  assert(strcmp(state.expedition_id, expedition_id) == 0);

  /* Restart and different tick batching produce the same opportunity sequence.
   * Downtime is anchored away; replay cannot redraw a committed chance result. */
  game_state_init(&state);
  state.gather_random_state = 1u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 112u);
  GameState uninterrupted = state;
  game_state_init(&state);
  state.gather_random_state = 1u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 103u);
  assert(game_state_load(path, &reopened) == 0);
  game_rules_resume_runtime(&reopened, 900u);
  state = reopened;
  tick_gathering(&state, path, 909u);
  assert(state.expedition_data == uninterrupted.expedition_data);
  assert(state.expedition_energy == uninterrupted.expedition_energy);
  assert(state.expedition_essence == uninterrupted.expedition_essence);
  assert(state.gather_random_state == uninterrupted.gather_random_state);
  assert(state.gather_attempt_count == uninterrupted.gather_attempt_count);
  assert(memcmp(state.gather_progress_ms, uninterrupted.gather_progress_ms,
                sizeof(state.gather_progress_ms)) == 0);
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 909u;
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "chance-tick-retry";
  assert(game_apply(path, &state, &action) == GAME_OK);
  unchanged = state;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);

  /* Near-full capacity reserves all possible awards BEFORE time and RNG. After
   * acceptance+continuation, the same next outcome awards all three classes. */
  game_state_init(&state);
  state.gather_random_state = 1u;
  state.expedition_data = 3800u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 104u);
  assert(state.expedition_elapsed == 3u && state.gather_progress_ms[0] == 3000u);
  assert(state.gather_attempt_count == 0u && state.gather_random_state == 1u);
  assert(game_gather_capacity_blocked(&state));
  unchanged = state;
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 105u;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_EXPEDITION_CONTINUE);
  action.data.monotonic_seconds = 900u;
  assert(apply(&state, path, action) == GAME_OK);
  tick_gathering(&state, path, 901u);
  assert(state.expedition_data == 100u && state.expedition_energy == 100u &&
         state.expedition_essence == 100u && state.gather_attempt_count == 3u);
  assert(state.expedition_elapsed == 4u && state.data == 3800u);
  game_state_init(&state);
  state.expedition_data = GAME_CARGO_CAPACITY;
  start_gathering(&state, path, 100u);
  unchanged = state;
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 101u;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);

  /* Completion awards a sample independently of loot. With a full shelf and
   * no items, FINISH releases the route; a new route keeps preparation. */
  game_state_init(&state);
  strcpy(state.expedition_id, "BEE-E-SAMPLE-ONLY");
  state.expedition_elapsed = GAME_EXPEDITION_SECONDS;
  state.gather_progress_ms[0] = 2000u;
  assert(game_transfer_available(&state));
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.sample_count == 1u && !state.expedition_id[0]);
  assert(state.gather_progress_ms[0] == 2000u);
  for (unsigned i = 1; i < GAME_MAX_SAMPLES; ++i) {
    state.samples[i] = state.samples[0];
    assert(snprintf(state.samples[i].id, sizeof(state.samples[i].id),
                    "BEE-S-SHELF-%u", i) > 0);
  }
  state.sample_count = GAME_MAX_SAMPLES;
  strcpy(state.expedition_id, "BEE-E-FULL-SHELF");
  state.expedition_elapsed = GAME_EXPEDITION_SECONDS;
  assert(game_state_valid(&state) && !game_transfer_available(&state));
  unchanged = state;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  action = command(GAME_COMMAND_EXPEDITION_FINISH);
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.expedition_id[0] && state.gather_progress_ms[0] == 2000u);
  start_gathering(&state, path, 1000u);
  assert(state.gather_progress_ms[0] == 2000u);
  assert(strcmp(state.expedition_id, "BEE-E-FULL-SHELF") != 0);

  /* Paid Lab actions are gated by encoding, even when old stocks are multiples
   * of100. Converted validation rejects fractional inventory and discard. */
  game_state_init(&state);
  strcpy(state.expedition_id, "BEE-E-SPENDING");
  state.expedition_elapsed = GAME_EXPEDITION_SECONDS;
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(&state, path, action) == GAME_OK);
  state.data = state.energy = state.essence = 3000u;
  state.legacy_supply_encoding = 1;
  action = command(GAME_COMMAND_STUDY);
  action.data.study.sample = 0u;
  action.data.study.study = 0u;
  unchanged = state;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  action = command(GAME_COMMAND_STOCK_NORMALIZE);
  assert(apply(&state, path, action) == GAME_OK);
  study_all(&state, path, 0u);
  state.legacy_supply_encoding = 1;
  action = command(GAME_COMMAND_INCUBATION_START);
  action.data.creation.sample = 0u;
  unchanged = state;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  state.legacy_supply_encoding = 0;
  ++state.expedition_data;
  assert(!game_state_valid(&state));
  --state.expedition_data;
  start_gathering(&state, path, 100u);
  state.expedition_data = 100u;
  action = command(GAME_COMMAND_EXPEDITION_DISCARD);
  action.data.discard.resource = GAME_RESOURCE_DATA;
  action.data.discard.quantity = 1u;
  action.data.discard.confirm = 1u;
  unchanged = state;
  assert(apply(&state, path, action) == GAME_INVALID);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);

  /* Idle items can transfer without a fake sample. A stock overflow rejects
   * the whole candidate, including conversion and its preparation credits. */
  game_state_init(&state);
  state.expedition_data = 100u;
  action = command(GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.data == 100u && state.sample_count == 0u);
  state.legacy_supply_encoding = 1;
  state.data = 1000000u;
  state.expedition_data = 199u;
  unchanged = state;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
}

/* Navigate the actual tile graph; generated routes have no scripted turn list. */
static int field_route(const GameExpeditionField *field, unsigned site,
                       unsigned route[GAME_FIELD_CELLS]) {
  unsigned start = field->y * GAME_FIELD_COLUMNS + field->x;
  unsigned target = field->site_y[site] * GAME_FIELD_COLUMNS + field->site_x[site];
  int previous[GAME_FIELD_CELLS];
  unsigned directions[GAME_FIELD_CELLS], queue[GAME_FIELD_CELLS];
  for (unsigned tile = 0; tile < GAME_FIELD_CELLS; ++tile) previous[tile] = -1;
  unsigned head = 0, tail = 0;
  previous[start] = (int)start;
  queue[tail++] = start;
  while (head < tail && previous[target] < 0) {
    unsigned current = queue[head++];
    for (unsigned move = 0; move < 4; ++move) {
      int x = (int)(current % GAME_FIELD_COLUMNS), y = (int)(current / GAME_FIELD_COLUMNS);
      if (move == 0) --y;
      if (move == 1) ++y;
      if (move == 2) --x;
      if (move == 3) ++x;
      if (x < 0 || x >= (int)GAME_FIELD_COLUMNS || y < 0 || y >= (int)GAME_FIELD_ROWS) continue;
      unsigned next = (unsigned)y * GAME_FIELD_COLUMNS + (unsigned)x;
      if (previous[next] < 0 && (field->paths[next] || (field->trace && field->hidden_paths[next]))) {
        previous[next] = (int)current;
        directions[next] = move;
        queue[tail++] = next;
      }
    }
  }
  if (previous[target] < 0) return -1;
  unsigned count = 0;
  for (unsigned tile = target; tile != start; tile = (unsigned)previous[tile])
    route[count++] = directions[tile];
  return (int)count;
}
static void walk_field(GameState *state, const char *path, unsigned site) {
  unsigned route[GAME_FIELD_CELLS];
  int count = field_route(&state->field, site, route);
  assert(count >= 0);
  while (count) {
    GameCommand action = command(GAME_COMMAND_FIELD_MOVE);
    action.data.field.direction = route[--count];
    assert(apply(state, path, action) == GAME_OK);
  }
  assert(game_field_site(state) == site);
}
static void test_procedural_geometry(const char *path) {
  GameExpeditionField previous[64];
  for (unsigned seed = 1; seed <= 64; ++seed) {
    GameState state, reopened;
    game_state_init(&state);
    game_rules_resume_runtime(&state, 100);
    uint32_t gather_random = state.gather_random_state;
    GameCommand action = command(GAME_COMMAND_FIELD_START);
    action.data.field.seed = seed;
    action.data.field.sample_budget = GAME_MAX_SAMPLES;
    action.data.field.monotonic_seconds = 100;
    assert(apply(&state, path, action) == GAME_OK);
    assert(state.field.version == GAME_FIELD_CONTENT_VERSION);
    assert(state.gather_random_state == gather_random);
    for (unsigned earlier = 0; earlier + 1 < seed; ++earlier)
      assert(memcmp(previous[earlier].site_x, state.field.site_x, GAME_FIELD_SITES) ||
             memcmp(previous[earlier].site_y, state.field.site_y, GAME_FIELD_SITES) ||
             memcmp(previous[earlier].paths, state.field.paths, GAME_FIELD_CELLS));
    previous[seed - 1] = state.field;
    unsigned route[GAME_FIELD_CELLS];
    for (unsigned site = 0; site < 4; ++site) assert(field_route(&state.field, site, route) >= 0);
    assert(field_route(&state.field, 4, route) == -1);
    state.field.trace = 1; /* Bounded graph fixture; no claimed player action. */
    assert(field_route(&state.field, 4, route) >= 0);
    state.field.trace = 0;
    assert(game_state_load(path, &reopened) == 0);
    assert(!memcmp(&state.field, &reopened.field, sizeof(state.field)));
    GameState malformed = state;
    malformed.field.paths[state.field.y * GAME_FIELD_COLUMNS + state.field.x] = 0;
    assert(!game_state_valid(&malformed));
    malformed = state;
    malformed.field.version = GAME_FIELD_CONTENT_VERSION + 1;
    assert(!game_state_valid(&malformed));
  }
}
static void test_frozen_field_geometry(const char *path) {
  const char *names[] = {"field-v1.save", "field-v1-even.save"};
  for (unsigned fixture = 0; fixture < 2; ++fixture) {
    char fixture_path[1024];
    const char *separator = strrchr(__FILE__, '/');
    assert(separator);
    snprintf(fixture_path, sizeof(fixture_path), "%.*s/fixtures/%s",
             (int)(separator - __FILE__), __FILE__, names[fixture]);
    GameState state, reopened;
    assert(game_state_load(fixture_path, &state) == 0);
    assert(state.field.version == GAME_FIELD_LEGACY_CONTENT_VERSION);
    assert(state.field.site_x[0] == (fixture ? 2 : 9) && state.field.site_y[0] == 8);
    assert(state.field.site_x[1] == (fixture ? 7 : 9) && state.field.site_y[1] == (fixture ? 8 : 2));
    unsigned received_before = state.received_count, record_index = state.received_cursor;
    assert(game_state_save(path, &state) == 0);
    assert(game_state_load(path, &reopened) == 0);
    assert(!memcmp(&state.field, &reopened.field, sizeof(state.field)));
    game_rules_resume_runtime(&state, 100);
    GameState frozen = state;
    GameCommand action = command(GAME_COMMAND_EXPEDITION_TICK);
    action.data.monotonic_seconds = 160;
    assert(apply(&state, path, action) == GAME_UNAVAILABLE);
    assert(!memcmp(&frozen, &state, sizeof(state)));
    GameReceivedExpedition record;
    game_field_record(&state, &record);
    assert(record.version == GAME_FIELD_LEGACY_CONTENT_VERSION && game_received_valid(&record));
    record.accepted_at = 1234;
    record.accept_sequence = state.last_operation_sequence + 1;
    action = command(GAME_COMMAND_FIELD_UNLOAD);
    action.data.field.record = &record;
    assert(apply(&state, path, action) == GAME_OK);
    assert(game_state_load(path, &reopened) == 0);
    assert(reopened.received_count == received_before + 1 &&
           reopened.received[record_index].version == GAME_FIELD_LEGACY_CONTENT_VERSION);
    record.version = GAME_FIELD_CONTENT_VERSION + 1;
    assert(!game_received_valid(&record));
    record.version = 0;
    assert(!game_received_valid(&record));
  }
}
static void test_frozen_field_v2(const char *path) {
  GameState state, reopened;
  game_state_init(&state);
  game_rules_resume_runtime(&state, 100);
  GameCommand action = command(GAME_COMMAND_FIELD_START);
  action.data.field.seed = 7183;
  action.data.field.monotonic_seconds = 100;
  assert(apply(&state, path, action) == GAME_OK);
  /* Version2 geometry is identical, but its saved arrays retain timed meaning. */
  state.field.version = GAME_FIELD_TIMED_CONTENT_VERSION;
  memset(state.field.remaining, 12, sizeof(state.field.remaining));
  state.field.active_source = state.field.last_source[0] = 0;
  state.gather_progress_ms[0] = 1500;
  state.expedition_data = 100;
  assert(game_state_valid(&state) && game_state_save(path, &state) == 0);
  assert(game_state_load(path, &reopened) == 0);
  assert(!memcmp(&state.field, &reopened.field, sizeof(state.field)));
  GameState before = state;
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 160;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(!memcmp(&before, &state, sizeof(state)));
  GameReceivedExpedition record;
  game_field_record(&state, &record);
  record.accepted_at = 1000;
  record.accept_sequence = state.last_operation_sequence + 1;
  assert(game_received_valid(&record));
  action = command(GAME_COMMAND_FIELD_UNLOAD);
  action.data.field.record = &record;
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.data == 100 && state.gather_progress_ms[0] == 1500 && !state.field.version);
}
static void test_field_loop(const char *path) {
  GameState state, reopened;
  game_state_init(&state);
  game_rules_resume_runtime(&state, 100);
  GameCommand action = command(GAME_COMMAND_FIELD_START);
  action.data.field.seed = 1428;
  action.data.field.sample_budget = GAME_MAX_SAMPLES;
  action.data.field.monotonic_seconds = 100;
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.field.version == 3 && state.field.active_source == GAME_FIELD_NONE);
  uint32_t random_state = state.gather_random_state;
  GameState before = state;
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 200;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(!memcmp(&before, &state, sizeof(state)));
  action = command(GAME_COMMAND_FIELD_INSPECT);
  action.data.field.site = 0;
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_FIELD_SOURCE);
  action.data.field.site = 0;
  action.data.field.source = 0;
  action.data.field.monotonic_seconds = 200;
  assert(apply(&state, path, action) == GAME_OK && !game_transfer_available(&state));
  assert(game_state_load(path, &reopened) == 0 && reopened.field.active_source == 0);
  const unsigned sources[] = {3, 4, 5};
  for (unsigned index = 0; index < 3; ++index) {
    unsigned source = sources[index];
    walk_field(&state, path, game_field_source_site(source));
    action = command(GAME_COMMAND_FIELD_TAKE);
    action.data.field.site = game_field_source_site(source);
    action.data.field.source = source;
    action.data.field.quantity = game_field_initial_units(source);
    assert(apply(&state, path, action) == GAME_OK);
    assert(!state.field.remaining[source] && state.field.attempts[source] == 1);
    assert(state.field.awards[source] == action.data.field.quantity);
    assert(state.gather_random_state == random_state && !state.gather_attempt_count);
  }
  assert(state.expedition_data + state.expedition_energy + state.expedition_essence == 3800);
  walk_field(&state, path, 0);
  char capacity_path[600];
  snprintf(capacity_path, sizeof(capacity_path), "%s-capacity", path);
  GameState capacity = state;
  action = command(GAME_COMMAND_FIELD_TAKE);
  action.data.field.site = 0;
  action.data.field.source = 0;
  action.data.field.quantity = 1;
  assert(apply(&capacity, capacity_path, action) == GAME_OK);
  action.data.field.source = 1;
  action.data.field.quantity = 2;
  before = capacity;
  assert(apply(&capacity, capacity_path, action) == GAME_UNAVAILABLE);
  assert(!memcmp(&before, &capacity, sizeof(capacity)));
  assert(game_state_load(capacity_path, &reopened) == 0 && reopened.expedition_data == 1300);
  action.data.field.source = 2;
  action.data.field.quantity = 1;
  action.data.field.expedition_id = capacity.expedition_id;
  action.sequence = capacity.last_operation_sequence + 1;
  action.operation_id = "finite-uncertain";
  transaction_fsync_count = 0;
  fail_second_fsync = 1;
  assert(game_apply(capacity_path, &capacity, &action) == GAME_COMMITTED_UNCERTAIN);
  assert(capacity.runtime_commit_uncertain && !capacity.field.remaining[2]);
  assert(game_state_load(capacity_path, &reopened) == 0);
  assert(game_apply(capacity_path, &reopened, &action) == GAME_DUPLICATE);
  assert(reopened.expedition_essence == 1300 && !reopened.field.remaining[2]);
  unlink(capacity_path);
  /* Exact payload replay and failed storage cannot alter retained offers. */
  action = command(GAME_COMMAND_FIELD_TAKE);
  action.data.field.site = 0;
  action.data.field.source = 0;
  action.data.field.quantity = 2;
  action.data.field.expedition_id = state.expedition_id;
  action.sequence = state.last_operation_sequence + 1;
  action.operation_id = "finite-camp-data";
  before = state;
  char missing[600];
  snprintf(missing, sizeof(missing), "%s/missing/world", path);
  assert(game_apply(missing, &state, &action) == GAME_STORAGE);
  assert(!memcmp(&before, &state, sizeof(state)));
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  action.data.field.quantity = 1;
  assert(game_apply(path, &state, &action) == GAME_CONFLICT);
  assert(state.expedition_data + state.expedition_energy + state.expedition_essence == 4000);
  assert(!state.field.remaining[0] && state.field.remaining[1] == 2 && state.field.remaining[2] == 1);
  assert(state.gather_random_state == random_state && !state.gather_progress_ms[0]);
  assert(game_state_load(path, &reopened) == 0 && !memcmp(&state.field, &reopened.field, sizeof(state.field)));
  before = state;
  action = command(GAME_COMMAND_FIELD_TAKE);
  action.data.field.site = 0;
  action.data.field.source = 1;
  action.data.field.quantity = 2;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE && !memcmp(&before, &state, sizeof(state)));
  GameState malformed = state;
  ++malformed.field.remaining[0];
  assert(!game_state_valid(&malformed));
  walk_field(&state, path, 1);
  action = command(GAME_COMMAND_FIELD_TRACE);
  action.data.field.site = 1;
  assert(apply(&state, path, action) == GAME_OK && state.field.trace);
  walk_field(&state, path, 4);
  action = command(GAME_COMMAND_FIELD_COLLECT);
  action.data.field.site = 4;
  assert(apply(&state, path, action) == GAME_OK && state.field.collected && !state.sample_count);
  GameReceivedExpedition record;
  game_field_record(&state, &record);
  assert(game_received_valid(&record));
  record.accepted_at = 1234;
  record.accept_sequence = state.last_operation_sequence + 1;
  action = command(GAME_COMMAND_FIELD_UNLOAD);
  action.sequence = record.accept_sequence;
  action.operation_id = "finite-haul";
  action.data.field.record = &record;
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(!state.field.version && !state.expedition_id[0] && state.sample_count == 1 && state.received_count == 1);
  assert(state.data + state.energy + state.essence == 4000);
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  ++record.accepted_at;
  assert(game_apply(path, &state, &action) == GAME_CONFLICT);
}
static void test_unload_ends_outing(const char *path) {
  GameState state;
  GameState reopened;
  game_state_init(&state);
  state.gather_random_state = 1u;
  start_gathering(&state, path, 100u);
  tick_gathering(&state, path, 105u);
  assert(state.expedition_elapsed == 5u && state.gather_attempt_count == 3u);
  char source_id[64];
  strcpy(source_id, state.expedition_id);
  uint32_t preparation[3];
  memcpy(preparation, state.gather_progress_ms, sizeof(preparation));
  uint32_t random_state = state.gather_random_state;
  uint64_t attempts = state.gather_attempt_count;
  uint32_t awarded[] = {state.expedition_data, state.expedition_energy,
                        state.expedition_essence};
  GameCommand action = command(GAME_COMMAND_EXPEDITION_UNLOAD);
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "fresh-early-unload";
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.data == awarded[0] && state.energy == awarded[1] &&
         state.essence == awarded[2]);
  assert(!state.expedition_id[0] && !state.expedition_active &&
         state.expedition_elapsed == 0u && state.sample_count == 0u);
  assert(state.gather_random_state == random_state &&
         state.gather_attempt_count == attempts);
  assert(memcmp(preparation, state.gather_progress_ms, sizeof(preparation)) == 0);
  assert(game_state_load(path, &reopened) == 0);
  game_rules_resume_runtime(&reopened, 900u);
  state = reopened;
  GameState unchanged = state;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  action = command(GAME_COMMAND_EXPEDITION_CONTINUE);
  action.data.monotonic_seconds = 900u;
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  start_gathering(&state, path, 900u);
  assert(strcmp(state.expedition_id, source_id) != 0 &&
         state.expedition_elapsed == 0u);
  assert(state.gather_random_state == random_state &&
         state.gather_attempt_count == attempts);
  assert(memcmp(preparation, state.gather_progress_ms, sizeof(preparation)) == 0);
  /* Finishing an empty outing is an explicit ending, never a phantom Send or
   * completed sample. Its independent preparation/chance state survives. */
  action = command(GAME_COMMAND_EXPEDITION_FINISH);
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.expedition_active && !state.expedition_id[0] &&
         state.sample_count == 0u && state.gather_random_state == random_state);
  assert(memcmp(preparation, state.gather_progress_ms, sizeof(preparation)) == 0);
  /* Capacity pausing also ends on fresh unload without a late chance draw. */
  state.expedition_data = 3800u;
  for (unsigned i = 0; i < 3; ++i)
    state.gather_progress_ms[i] = 3000u;
  start_gathering(&state, path, 1000u);
  assert(game_gather_capacity_blocked(&state));
  action = command(GAME_COMMAND_EXPEDITION_UNLOAD);
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.expedition_id[0] && state.sample_count == 0u &&
         state.gather_random_state == random_state &&
         state.gather_attempt_count == attempts);
  /* A fresh old partial-only haul converts preparation and ends atomically. */
  game_state_init(&state);
  state.legacy_supply_encoding = 1u;
  state.expedition_data = 44u;
  state.expedition_elapsed = 2u;
  strcpy(state.expedition_id, "old-partial-haul");
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.expedition_id[0] && state.expedition_elapsed == 0u &&
         state.sample_count == 0u && state.data == 0u &&
         state.gather_progress_ms[0] == 1760u);
}

static uint32_t frozen_checksum(const unsigned char *bytes, size_t length) {
  uint32_t hash = 2166136261u;
  for (size_t i = 0; i < length; ++i)
    hash = (hash ^ bytes[i]) * 16777619u;
  return hash;
}

static void test_frozen_save_files(const char *path) {
  const char *names[] = {"authored-v1.save", "authored-v2.save", "runtime-v2.save"};
  for (unsigned fixture = 0; fixture < 3; ++fixture) {
    char fixture_path[1024];
    const char *separator = strrchr(__FILE__, '/');
    assert(separator);
    snprintf(fixture_path, sizeof(fixture_path), "%.*s/fixtures/%s",
             (int)(separator - __FILE__), __FILE__, names[fixture]);
    FILE *file = fopen(fixture_path, "rb");
    assert(file);
    unsigned char original[6000];
    size_t length = fread(original, 1, sizeof(original), file);
    assert(feof(file) && fclose(file) == 0);
    assert(length == (fixture == 0 ? 5752u : 5784u));
    uint32_t payload_size, stored_checksum;
    memcpy(&payload_size, original + 12, 4);
    memcpy(&stored_checksum, original + 16, 4);
    assert(payload_size == (fixture == 0 ? 5728u : 5760u));
    assert(stored_checksum == frozen_checksum(original + 24, payload_size));
    GameState loaded;
    assert(game_state_load(fixture_path, &loaded) == 0);
    unsigned char expected[5760];
    memcpy(expected, original + 24, payload_size);
    uint32_t new_version = GAME_STATE_VERSION;
    memcpy(expected, &new_version, 4);
    assert(!memcmp(&loaded, expected, payload_size));
    assert(loaded.sample_metadata[0].profile == GAME_SAMPLE_LEGACY_FIVE);
    if (fixture < 2) {
      assert(loaded.samples[0].decoded_studies == 1 && loaded.samples[0].decoded_facts == 1);
      assert(!strcmp(loaded.individuals[0].id, "frozen-resident"));
      assert(!strcmp(loaded.individual_metadata[0].candidate_id, "legacy-carried"));
      assert(!strcmp(loaded.individual_metadata[0].original_art_sha256,
                     "38b0fa7fc24ffea47cb128fdcaf46f701a2396bd3bfcbb81e3d86f962f262534"));
      GameCommand retry = command(GAME_COMMAND_STUDY);
      retry.operation_id = "frozen-study";
      retry.sequence = 1;
      retry.data.study.sample = retry.data.study.study = 0;
      GameState before = loaded;
      assert(game_apply(path, &loaded, &retry) == GAME_DUPLICATE);
      assert(!memcmp(&loaded, &before, sizeof(before)));
      /* A normal accepted mutation writes V3 without reinterpreting stock or
       * partial legacy findings. The original fixture remains read-only. */
      GameCommand care = command(GAME_COMMAND_CARE_VISIT);
      care.data.individual = 0;
      assert(apply(&loaded, path, care) == GAME_OK);
      GameState reopened;
      assert(game_state_load(path, &reopened) == 0);
      assert(reopened.data == before.data && reopened.energy == before.energy &&
             reopened.essence == before.essence);
      assert(!memcmp(reopened.samples, before.samples, sizeof(before.samples)));
      assert(!memcmp(&reopened.operations[0], &before.operations[0], sizeof(GameOperation)));
      assert(reopened.legacy_supply_encoding == (fixture == 0));
    } else {
      assert(loaded.last_operation_sequence == 15 && loaded.gather_attempt_count == 9);
      assert(loaded.gather_random_state == 4184948546u);
      assert(game_state_save(path, &loaded) == 0);
      GameState reopened;
      assert(game_state_load(path, &reopened) == 0);
      assert(!memcmp(&loaded, &reopened, sizeof(loaded)));
    }
    unsigned char after[6000];
    file = fopen(fixture_path, "rb");
    assert(file && fread(after, 1, sizeof(after), file) == length && fclose(file) == 0);
    assert(!memcmp(original, after, length));
  }
}

static GameCommand investigation(const GameState *state, unsigned sample, unsigned method) {
  GameCommand action = command(GAME_COMMAND_INVESTIGATE);
  action.data.investigation.sample = sample;
  action.data.investigation.sample_id = state->samples[sample].id;
  action.data.investigation.content_version = pip_sample_content_version(state, sample);
  action.data.investigation.method_id = pip_investigation(state, sample, method)->id;
  return action;
}

static GameCommand supported_creation(const GameState *state, unsigned sample,
                                      const char *candidate) {
  GameCommand action = command(GAME_COMMAND_SUPPORTED_CREATION);
  action.data.supported_creation.sample = sample;
  action.data.supported_creation.sample_id = state->samples[sample].id;
  action.data.supported_creation.content_version = pip_sample_content_version(state, sample);
  action.data.supported_creation.candidate_id = candidate;
  action.data.supported_creation.monotonic_seconds = 100;
  return action;
}

static void test_discovery_content(const char *path) {
  GameState state;
  game_state_init(&state);
  state.data = state.energy = state.essence = 4000;
  game_rules_resume_runtime(&state, 100);
  for (unsigned sample = 0; sample < 2; ++sample) {
    snprintf(state.expedition_id, sizeof(state.expedition_id), "discovery-intake-%u", sample);
    state.expedition_elapsed = GAME_EXPEDITION_SECONDS;
    GameCommand accept = command(GAME_COMMAND_EXPEDITION_UNLOAD);
    assert(apply(&state, path, accept) == GAME_OK);
  }
  assert(state.sample_metadata[0].profile == GAME_SAMPLE_DISCOVERY_A &&
         state.sample_metadata[1].profile == GAME_SAMPLE_DISCOVERY_B);
  GameState initial = state;
  PipResearchProjection projection;
  PipSupportedCandidate candidate;
  PipCandidateKnowledge knowledge;
  assert(pip_research_projection(&state, 0, &projection) && !projection.established_references);
  assert(!pip_candidate_count(&state, 0) && !pip_supported_candidate(&state, 0, 0, &candidate));
  assert(!pip_investigation(&state, 0, 0)->finding);
  assert(!pip_candidate_knowledge(&state, 0, 0, &knowledge));
  for (unsigned reference = 0; reference < 17; ++reference)
    assert(pip_reference_id(reference));
  assert(!pip_reference_id(17));
  GameCommand action = investigation(&state, 0, 0);
  action.operation_id = "A-heritage";
  action.sequence = state.last_operation_sequence + 1;
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.data == 3600 && state.energy == 4000 && state.essence == 4000);
  GameState before = state;
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  assert(!memcmp(&state, &before, sizeof(before)));
  GameState investigation_reload;
  assert(game_state_load(path, &investigation_reload) == 0);
  assert(investigation_reload.sample_metadata[0].profile == GAME_SAMPLE_DISCOVERY_A &&
         investigation_reload.sample_metadata[1].profile == GAME_SAMPLE_DISCOVERY_B);
  game_rules_resume_runtime(&investigation_reload, 100);
  GameState before_retry = investigation_reload;
  assert(game_apply(path, &investigation_reload, &action) == GAME_DUPLICATE &&
         !memcmp(&investigation_reload, &before_retry, sizeof(before_retry)));
  action.data.investigation.method_id = "movement";
  assert(game_apply(path, &state, &action) == GAME_CONFLICT);
  assert(pip_research_projection(&state, 0, &projection));
  assert(projection.established_references == 0x3fff && projection.partial_p);
  assert(projection.common_loci[2][0] == 'p' && !projection.common_loci[2][1]);
  assert(!projection.complete && !projection.disclosed_candidates);
  assert(pip_investigation(&state, 0, 0)->finding);
  action = supported_creation(&state, 0, "A0");
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(!memcmp(&state, &before, sizeof(before)));
  state.energy = 300;
  before = state;
  action = investigation(&state, 0, 1);
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  assert(!memcmp(&state, &before, sizeof(before)));
  state.energy = 4000;
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 0, &projection) &&
         projection.established_references == 0x1bfff && !projection.complete);
  action = investigation(&state, 0, 2);
  before = state;
  action.data.investigation.content_version = "pip-discovery-v2";
  assert(apply(&state, path, action) == GAME_CONFLICT && !memcmp(&before, &state, sizeof(state)));
  action = investigation(&state, 0, 2);
  action.data.investigation.sample_id = "wrong-sample";
  assert(apply(&state, path, action) == GAME_CONFLICT && !memcmp(&before, &state, sizeof(state)));
  action = investigation(&state, 0, 2);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 0, &projection) && projection.complete &&
         projection.established_references == 0x1ffff && projection.disclosed_candidates == 3);
  assert(pip_supported_candidate(&state, 0, 1, &candidate) && !strcmp(candidate.id, "A1"));
  assert(candidate.genome.loci[2][0] == 'p' && candidate.genome.loci[2][1] == 'p');
  before = state;
  action = supported_creation(&state, 0, "B0");
  assert(apply(&state, path, action) == GAME_INVALID && !memcmp(&before, &state, sizeof(state)));
  action = supported_creation(&state, 0, "A1");
  action.data.supported_creation.content_version = "pip-discovery-v2";
  assert(apply(&state, path, action) == GAME_CONFLICT && !memcmp(&before, &state, sizeof(state)));
  action = supported_creation(&state, 0, "A1");
  action.data.supported_creation.sample_id = "wrong-sample";
  assert(apply(&state, path, action) == GAME_CONFLICT && !memcmp(&before, &state, sizeof(state)));
  action = supported_creation(&state, 0, "A1");
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.individuals[0].expression.pale_markings && state.samples[0].incubated);
  assert(!strcmp(state.individual_metadata[0].candidate_id, "A1"));
  action = command(GAME_COMMAND_INCUBATION_TICK);
  action.data.monotonic_seconds = 120;
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(&state, path, action) == GAME_OK);
  before = state;
  action = supported_creation(&state, 0, "A1");
  assert(apply(&state, path, action) == GAME_UNAVAILABLE &&
         !memcmp(&before, &state, sizeof(state)));
  /* B's early coupled comparison supplies M/E itself: no paid Movement gate. */
  action = investigation(&state, 1, 2);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 1, &projection) &&
         projection.established_references == 0x18000 && !projection.complete);
  assert(!pip_investigation_useful(&state, 1, 1));
  assert(pip_investigation(&state, 1, 1)->finding && !pip_investigation(&state, 1, 1)->cost_energy);
  before = state;
  action = investigation(&state, 1, 1);
  assert(apply(&state, path, action) == GAME_DUPLICATE && !memcmp(&before, &state, sizeof(state)));
  action = investigation(&state, 1, 0);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 1, &projection) && projection.complete &&
         projection.disclosed_candidates == 12);
  assert(pip_supported_candidate(&state, 1, 0, &candidate) && !candidate.expression.burst_movement &&
         candidate.expression.efficient_movement && !pip_genome_valid(&candidate.genome));
  assert(pip_supported_candidate(&state, 1, 1, &candidate) && candidate.expression.burst_movement &&
         !candidate.expression.efficient_movement);
  before = state;
  action = supported_creation(&state, 1, "A0"); /* The appealing Mm/Ee mix is unsupported for B. */
  assert(apply(&state, path, action) == GAME_INVALID && !memcmp(&before, &state, sizeof(state)));
  state.data = 400;
  before = state;
  action = supported_creation(&state, 1, "B1");
  assert(apply(&state, path, action) == GAME_UNAVAILABLE && !memcmp(&before, &state, sizeof(state)));
  state.data = 2000;
  before = state;
  action = supported_creation(&state, 1, "B1");
  action.operation_id = "B-creation";
  action.sequence = state.last_operation_sequence + 1;
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(state.data == before.data - 500 && state.energy == before.energy - 500 &&
         state.essence == before.essence - 500 && state.individual_count == 2);
  assert(!strcmp(state.individual_metadata[1].candidate_id, "B1") &&
         !strcmp(state.individuals[1].art_id, "design/v1-pip/pip-carried.png"));
  GameState reopened;
  assert(game_state_load(path, &reopened) == 0);
  game_rules_resume_runtime(&reopened, 200);
  before = reopened;
  assert(game_apply(path, &reopened, &action) == GAME_DUPLICATE &&
         !memcmp(&reopened, &before, sizeof(before)));
  action.data.supported_creation.candidate_id = "B0";
  assert(game_apply(path, &reopened, &action) == GAME_CONFLICT);
  assert(!memcmp(state.individuals, reopened.individuals, sizeof(state.individuals)) &&
         !memcmp(state.individual_metadata, reopened.individual_metadata, sizeof(state.individual_metadata)));
  reopened.sample_metadata[1].disclosed_candidates = 3;
  assert(!game_state_valid(&reopened));
  reopened = initial;
  reopened.sample_metadata[0].established_references = 0x1ffff;
  reopened.sample_metadata[0].disclosed_candidates = 3;
  assert(!game_state_valid(&reopened)); /* All-known flags alone are not evidence. */
  /* Ordinary A comparison can run first, but grants only P/support, not baseline. */
  state = initial;
  action = investigation(&state, 0, 2);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 0, &projection) &&
         projection.established_references == 0x4000 && !projection.complete);
  assert(pip_candidate_knowledge(&state, 0, 0, &knowledge) &&
         knowledge.known_loci[2][0] == 'P' && !knowledge.known_loci[0][0]);
  action = investigation(&state, 0, 0);
  assert(apply(&state, path, action) == GAME_OK);
  action = investigation(&state, 0, 1);
  assert(apply(&state, path, action) == GAME_OK);
  action = investigation(&state, 1, 0);
  assert(apply(&state, path, action) == GAME_OK);
  action = investigation(&state, 1, 1);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_research_projection(&state, 1, &projection) &&
         projection.established_references == 0xffff && !projection.complete);
  assert(pip_candidate_knowledge(&state, 1, 1, &knowledge) &&
         knowledge.known_loci[3][0] == 'M' && !knowledge.known_loci[4][0]);
  action = investigation(&state, 1, 2);
  assert(apply(&state, path, action) == GAME_OK);
  assert(pip_candidate_count(&state, 0) == 2 && pip_candidate_count(&state, 1) == 2);
  /* Capacity rejection is independent of completeness and resource shortage.
   * Populate valid legacy resident records; keep B's unused material intact. */
  GameState capacity;
  game_state_init(&capacity);
  capacity.sample_count = 2;
  strcpy(capacity.samples[0].id, "legacy-capacity-source");
  strcpy(capacity.samples[0].origin_expedition_id, "capacity-reference");
  capacity.samples[0].decoded_studies = capacity.samples[0].decoded_facts = 31;
  capacity.samples[0].supported_candidates = 3;
  capacity.samples[0].incubated = 1;
  capacity.samples[1] = state.samples[1];
  capacity.sample_metadata[1] = state.sample_metadata[1];
  capacity.data = capacity.energy = capacity.essence = 1000;
  capacity.individual_count = GAME_MAX_INDIVIDUALS;
  for (unsigned individual = 0; individual < GAME_MAX_INDIVIDUALS; ++individual) {
    GameIndividual *resident = &capacity.individuals[individual];
    snprintf(resident->id, sizeof(resident->id), "legacy-capacity-%u", individual);
    strcpy(resident->source_sample_id, capacity.samples[0].id);
    strcpy(resident->origin_kind, "parentless-founder");
    pip_genome_for_sample(0, &resident->genome);
    pip_express(&resident->genome, &resident->expression);
    strcpy(resident->art_id, pip_art_id(&resident->genome));
    strcpy(resident->art_version, PIP_ART_VERSION);
    resident->origin_founder = resident->revealed = 1;
  }
  assert(game_state_valid(&capacity));
  before = capacity;
  action = supported_creation(&capacity, 1, "B0");
  assert(apply(&capacity, path, action) == GAME_UNAVAILABLE &&
         !memcmp(&capacity, &before, sizeof(before)));
}

int main(void) {
  char path[] = "/tmp/beecho-game-XXXXXX";
  GameState state;
  GameState reopened;
  GameCommand action;
  int file = mkstemp(path);
  unsigned first_individual;
  unsigned index;
  assert(file >= 0);
  close(file);
  unlink(path);
  assert(game_state_load(path, &state) == 1);
  game_state_init(&state);
  assert(game_state_save(path, &state) == 0);
  assert(game_state_load(path, &reopened) == 0);
  state = reopened;
  game_rules_resume_runtime(&state, 100u);

  /* An early return transfers its gathered resources but grants no sample. */
  action = command(GAME_COMMAND_EXPEDITION_START);
  action.data.expedition.kind = GAME_EXPEDITION_SURVEY;
  action.data.expedition.monotonic_seconds = 100u;
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "pre-rename-failure";
  GameState unchanged = state;
  char unavailable_path[256];
  assert(snprintf(unavailable_path, sizeof(unavailable_path), "%s/missing/save",
                  path) > 0);
  assert(game_apply(unavailable_path, &state, &action) == GAME_STORAGE);
  assert(memcmp(&state, &unchanged, sizeof(state)) == 0);
  assert(game_apply(path, &state, &action) == GAME_OK);
  action = command(GAME_COMMAND_EXPEDITION_TICK);
  action.data.monotonic_seconds = 110u;
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_EXPEDITION_UNLOAD);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.sample_count == 0 && !state.expedition_id[0] &&
         state.expedition_elapsed == 0u);
  assert(game_stock_normalized(&state) &&
         state.data + state.energy + state.essence > 0u);

  /* A fresh completed outing can independently earn its sample. */
  complete_expedition(&state, path, GAME_EXPEDITION_SURVEY, 110u);
  assert(state.sample_count == 1);
  assert(state.samples[0].origin_expedition_kind == GAME_EXPEDITION_SURVEY);
  assert(game_stock_normalized(&state));
  complete_expedition(&state, path, GAME_EXPEDITION_FORAGE, 170u);
  /* Existing knowledge does not choose the genotype. Choice is explicit. */
  study_all(&state, path, 0u);
  assert(state.samples[0].incubated == 0);
  complete_expedition(&state, path, GAME_EXPEDITION_RESONANCE, 230u);
  assert(state.sample_count == 3);
  start_and_open(&state, path, 0u, 0u, 290u);
  first_individual = state.individual_count - 1u;
  assert(state.individuals[first_individual].genome.loci[2][0] == 'P');
  assert(strcmp(state.individuals[first_individual].art_id,
                "design/v1-pip/pip-carried.png") == 0);
  assert(!state.individuals[first_individual].expression.pale_markings);
  assert(state.individuals[first_individual].expression.efficient_movement);

  action = command(GAME_COMMAND_HABITAT_VISIT);
  action.data.habitat.individual = first_individual;
  action.data.habitat.habitat = 1u;
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_CARE_VISIT);
  action.data.individual = first_individual;
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.individuals[first_individual].care_visits == 1u);

  /* Restart during incubation resets the timer anchor; downtime adds nothing.
   */
  complete_expedition(&state, path, GAME_EXPEDITION_SURVEY, 310u);
  assert(state.sample_count == 4);
  study_all(&state, path, 1u);
  action = command(GAME_COMMAND_INCUBATION_START);
  action.data.creation.sample = 1u;
  action.data.creation.preference = 1u;
  action.data.creation.monotonic_seconds = 370u;
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.individuals[1].revealed);
  assert(state.individuals[1].genome.loci[2][0] == 'p');
  assert(state.individuals[1].expression.pale_markings);
  assert(game_state_save(path, &state) == 0);
  assert(game_state_load(path, &reopened) == 0);
  assert(reopened.incubation_elapsed == 0);
  game_rules_resume_runtime(&reopened, 900u);
  state = reopened;
  action = command(GAME_COMMAND_INCUBATION_TICK);
  action.data.monotonic_seconds = 919u;
  assert(apply(&state, path, action) == GAME_OK);
  assert(!state.incubation_ready);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(&state, path, action) == GAME_UNAVAILABLE);
  action = command(GAME_COMMAND_INCUBATION_TICK);
  action.data.monotonic_seconds = 920u;
  assert(apply(&state, path, action) == GAME_OK);
  action = command(GAME_COMMAND_INCUBATION_OPEN);
  assert(apply(&state, path, action) == GAME_OK);
  assert(state.individual_count == 2 && state.individuals[1].revealed);

  /* If rename succeeds but directory fsync fails, the operation is committed
   * and visible in memory, but the process must stop writes until reloaded. */
  action = command(GAME_COMMAND_CARE_VISIT);
  action.data.individual = 1u;
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "directory-sync-uncertain";
  transaction_fsync_count = 0;
  fail_second_fsync = 1;
  assert(game_apply(path, &state, &action) == GAME_COMMITTED_UNCERTAIN);
  assert(!fail_second_fsync);
  assert(state.runtime_commit_uncertain);
  assert(state.individuals[1].care_visits == 1u);
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  GameCommand blocked = command(GAME_COMMAND_CARE_VISIT);
  blocked.data.individual = 1u;
  blocked.sequence = state.last_operation_sequence + 1u;
  blocked.operation_id = "blocked-until-reload";
  assert(game_apply(path, &state, &blocked) == GAME_COMMITTED_UNCERTAIN);
  assert(game_state_load(path, &reopened) == 0);
  assert(reopened.last_operation_sequence == state.last_operation_sequence);
  assert(reopened.individuals[1].care_visits == 1u);
  state = reopened;

  /* A durable operation retry is a no-op; stale retries stay inert after
   * their detail slot rotates out of the bounded journal. */
  action = command(GAME_COMMAND_CARE_VISIT);
  action.data.individual = 1u;
  action.sequence = state.last_operation_sequence + 1u;
  action.operation_id = "care-retry-check";
  assert(game_apply(path, &state, &action) == GAME_OK);
  assert(game_apply(path, &state, &action) == GAME_DUPLICATE);
  GameCommand stale_retry = action;
  for (index = 0; index < GAME_OPERATION_SLOTS + 1u; ++index) {
    action = command(GAME_COMMAND_CARE_VISIT);
    action.data.individual = 1u;
    assert(apply(&state, path, action) == GAME_OK);
  }
  assert(game_apply(path, &state, &stale_retry) == GAME_DUPLICATE);
  assert(game_state_load(path, &reopened) == 0);
  assert(reopened.last_operation_sequence == state.last_operation_sequence);

  /* Corrupt bytes and unsupported versions fail closed. */
  file = open(path, O_RDWR);
  assert(file >= 0);
  unsigned char changed = 0xffu;
  assert(pwrite(file, &changed, 1u, 16) == 1);
  close(file);
  assert(game_state_load(path, &reopened) == -1);
  test_whole_supply_rules(path);
  test_unload_ends_outing(path);
  test_frozen_save_files(path);
  test_discovery_content(path);
  test_field_loop(path);
  test_frozen_field_v2(path);
  test_procedural_geometry(path);
  test_frozen_field_geometry(path);
  unlink(path);
  char lock_path[256];
  char temporary_path[256];
  assert(snprintf(lock_path, sizeof(lock_path), "%s.lock", path) > 0);
  assert(snprintf(temporary_path, sizeof(temporary_path), "%s.tmp", path) > 0);
  unlink(lock_path);
  unlink(temporary_path);
  return 0;
}
