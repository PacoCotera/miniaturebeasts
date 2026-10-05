#ifndef GAME_STATE_H
#define GAME_STATE_H

#include <stddef.h>
#include <stdint.h>

#define GAME_STATE_VERSION 4u
#define GAME_MAX_SAMPLES 8u
#define GAME_MAX_INDIVIDUALS 8u
#define GAME_OPERATION_SLOTS 32u
#define GAME_GENETIC_LOCI 5u
#define GAME_CARGO_CAPACITY 4000u
#define GAME_PACK_SIZE 1000u
#define GAME_SUPPLY_UNIT 100u
#define GAME_GATHER_ATTEMPT_MS 4000u
#define GAME_GATHER_INITIAL_RANDOM_STATE 0x6d2b79f5u
#define GAME_BALANCE_VERSION "beecho-play-v1-provisional"
#define GAME_EXPEDITION_SECONDS 60u
#define GAME_INCUBATION_SECONDS 20u
#define GAME_HABITAT_COUNT 3u
#define GAME_MAX_CARE_VISITS 255u

typedef enum {
  GAME_EXPEDITION_SURVEY = 0,
  GAME_EXPEDITION_FORAGE = 1,
  GAME_EXPEDITION_RESONANCE = 2
} GameExpeditionKind;

typedef struct {
  char loci[GAME_GENETIC_LOCI][2];
  char class_id[24];
  char content_version[24];
  char rules_version[24];
} PipGenome;

typedef struct {
  char id[40];
  char origin_expedition_id[64];
  uint32_t decoded_facts;
  uint8_t origin_expedition_kind;
  uint8_t decoded_studies;
  uint8_t supported_candidates;
  uint8_t incubated;
} GameSample;

typedef struct {
  uint8_t crown;
  uint8_t eye_rings;
  uint8_t pale_markings;
  uint8_t burst_movement;
  uint8_t efficient_movement;
} PipExpression;

typedef struct {
  char id[40];
  char source_sample_id[40];
  char origin_kind[24];
  char art_id[40];
  char art_version[24];
  PipGenome genome;
  PipExpression expression;
  uint8_t habitat;
  uint8_t care_visits;
  uint8_t origin_founder;
  uint8_t art_pending;
  uint8_t revealed;
} GameIndividual;

typedef struct {
  char id[64];
  uint64_t sequence;
  uint64_t fingerprint;
} GameOperation;

typedef enum {
  GAME_SAMPLE_LEGACY_FIVE = 0,
  GAME_SAMPLE_DISCOVERY_A = 1,
  GAME_SAMPLE_DISCOVERY_B = 2
} GameSampleProfile;

/* Parallel extensions preserve the original sample/genome/operation ABI.
 * Zero sample extensions mean the pinned legacy five-study package. */
typedef struct {
  uint32_t profile;
  char content_version[24];
  uint32_t investigated_methods;
  uint32_t established_references;
  uint32_t disclosed_candidates;
  uint32_t partial_p;
} GameSampleMetadata;

typedef struct {
  char candidate_id[32];
  char reference_context[48];
  char mapping_version[32];
  char appearance_descriptor[40];
  char original_art_version[24];
  char original_art_sha256[65];
} GameIndividualMetadata;

#define GAME_FIELD_COLUMNS 20u
#define GAME_FIELD_ROWS 11u
#define GAME_FIELD_CELLS (GAME_FIELD_COLUMNS * GAME_FIELD_ROWS)
#define GAME_FIELD_SITES 5u
#define GAME_FIELD_SOURCES 6u
#define GAME_FIELD_HISTORY 16u
#define GAME_FIELD_NONE 255u
#define GAME_FIELD_LEGACY_CONTENT_VERSION 1u
#define GAME_FIELD_TIMED_CONTENT_VERSION 2u
#define GAME_FIELD_CONTENT_VERSION 3u

/* Companion field state is distinct from Lab-accepted expedition records. */
typedef struct {
  uint32_t version, seed;
  uint8_t terrain[GAME_FIELD_CELLS], paths[GAME_FIELD_CELLS];
  uint8_t hidden_paths[GAME_FIELD_CELLS], walked[GAME_FIELD_CELLS];
  uint8_t site_x[GAME_FIELD_SITES], site_y[GAME_FIELD_SITES];
  uint8_t x, y, visited, inspected, trace, collected, active_source;
  /* Field1/2: remaining attempts, resolved attempts, units won.
   * Field3: remaining whole units, accepted Take actions, units taken.
   * Layout stays frozen; the content version defines counter interpretation. */
  uint8_t remaining[GAME_FIELD_SOURCES], attempts[GAME_FIELD_SOURCES];
  uint8_t awards[GAME_FIELD_SOURCES], last_source[3], sample_budget;
  uint8_t capsule_profile;
  char capsule_id[40];
} GameExpeditionField;

typedef struct {
  uint32_t version, seed, kind;
  char expedition_id[64], sample_id[40];
  uint64_t accepted_at, accept_sequence;
  uint32_t cargo[3];
  uint8_t terrain[GAME_FIELD_CELLS], walked[GAME_FIELD_CELLS];
  uint8_t site_x[GAME_FIELD_SITES], site_y[GAME_FIELD_SITES];
  uint8_t visited, inspected, trace, collected;
  /* Interpret action/unit counters using this record's content version. */
  uint8_t attempts[GAME_FIELD_SOURCES], awards[GAME_FIELD_SOURCES];
} GameReceivedExpedition;

typedef struct {
  uint32_t version;
  char balance_version[40];
  uint64_t revision;
  uint64_t last_operation_sequence;
  uint32_t data;
  uint32_t energy;
  uint32_t essence;
  uint32_t expedition_data;
  uint32_t expedition_energy;
  uint32_t expedition_essence;
  uint32_t expedition_elapsed;
  uint32_t expedition_last_tick;
  uint32_t expedition_kind;
  uint32_t incubation_elapsed;
  uint32_t incubation_last_tick;
  uint32_t next_identity;
  uint32_t operation_cursor;
  uint8_t expedition_active;
  uint8_t sample_count;
  uint8_t individual_count;
  uint8_t incubation_sample;
  uint8_t incubation_individual;
  uint8_t incubation_choice;
  uint8_t incubation_active;
  uint8_t incubation_ready;
  uint8_t habitat;
  uint8_t reserved;
  uint8_t runtime_anchors_ready;
  uint8_t runtime_commit_uncertain;
  char expedition_id[64];
  GameSample samples[GAME_MAX_SAMPLES];
  GameIndividual individuals[GAME_MAX_INDIVIDUALS];
  GameOperation operations[GAME_OPERATION_SLOTS];
  /* Append-only: the preceding bytes are the version-one save payload.
   * Inventory retains its historical scale of 100 per indivisible item.
   * Preparation time is not inventory and does not occupy cargo capacity. */
  uint32_t gather_progress_ms[3];
  uint32_t gather_random_state;
  uint64_t gather_attempt_count;
  uint8_t legacy_supply_encoding;
  uint8_t gather_last_attempted_mask;
  uint8_t gather_last_awarded_mask;
  /* These five bytes were padding in the frozen V2 payload. Keep them before
   * extensions, so its original length and checksum remain independently read. */
  uint8_t legacy_v2_padding[5];
  GameSampleMetadata sample_metadata[GAME_MAX_SAMPLES];
  GameIndividualMetadata individual_metadata[GAME_MAX_INDIVIDUALS];
  /* V4 appends after all 8040 bytes of the frozen V3 payload. */
  GameExpeditionField field;
  uint32_t received_count, received_cursor;
  GameReceivedExpedition received[GAME_FIELD_HISTORY];
} GameState;

void game_state_init(GameState *state);
int game_state_valid(const GameState *state);
int game_state_load(const char *path, GameState *state);
int game_state_save(const char *path, const GameState *state);

#endif
