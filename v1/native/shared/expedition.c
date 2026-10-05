#include "expedition.h"
#include "pip_genetics.h"
#include <stdio.h>
#include <string.h>

#define FIELD_ATTEMPTS 12u
unsigned game_field_initial_units(unsigned source) {
  static const unsigned units[GAME_FIELD_SOURCES] = {2, 2, 1, 12, 12, 14};
  return source < GAME_FIELD_SOURCES ? units[source] : 0;
}
int game_field_finite(const GameState *state) {
  return state->field.version == GAME_FIELD_CONTENT_VERSION;
}
static unsigned cell(unsigned x, unsigned y) { return y * GAME_FIELD_COLUMNS + x;
}
unsigned game_field_source_resource(unsigned source) {
  static const unsigned resources[GAME_FIELD_SOURCES] = {0, 1, 2, 2, 0, 1};
  return source < GAME_FIELD_SOURCES ? resources[source] : GAME_FIELD_NONE;
}
unsigned game_field_source_site(unsigned source) {
  static const unsigned sites[GAME_FIELD_SOURCES] = {0, 0, 0, 1, 2, 3};
  return source < GAME_FIELD_SOURCES ? sites[source] : GAME_FIELD_NONE;
}
const char *game_field_site_name(unsigned site) {
  static const char *names[] = {"Camp", "Moss bend", "Relay", "Stone shelf", "Old cache"};
  return site < GAME_FIELD_SITES ? names[site] : "On the trail";
}
unsigned game_field_site(const GameState *state) {
  const GameExpeditionField *field = &state->field;
  if (!field->version) return GAME_FIELD_NONE;
  for (unsigned site = 0; site < GAME_FIELD_SITES; ++site)
    if ((site != 4 || field->trace) && field->x == field->site_x[site] &&
        field->y == field->site_y[site]) return site;
  return GAME_FIELD_NONE;
}
static uint32_t random_next(uint32_t *state) {
  uint32_t value = *state;
  value ^= value << 13;
  value ^= value >> 17;
  value ^= value << 5;
  *state = value;
  return value;
}
static void corridor(uint8_t *paths, unsigned x, unsigned y, unsigned end_x,
                     unsigned end_y, int vertical_first) {
  paths[cell(x, y)] = 1;
  while (x != end_x || y != end_y) {
    if ((vertical_first && y != end_y) || x == end_x)
      y = y < end_y ? y + 1 : y - 1;
    else x = x < end_x ? x + 1 : x - 1;
    paths[cell(x, y)] = 1;
  }
}
/* Saved legacy outings retain their exact topology and terrain draw order. */
static void generate_geometry_v1(GameExpeditionField *field) {
  int second = (field->seed & 1u) != 0;
  const uint8_t first_x[GAME_FIELD_SITES] = {2, 7, 2, 7, 16}, first_y[GAME_FIELD_SITES] = {8, 8, 2, 2, 5};
  const uint8_t second_x[GAME_FIELD_SITES] = {9, 9, 3, 15, 17}, second_y[GAME_FIELD_SITES] = {8, 2, 5, 5, 0};
  memcpy(field->site_x, second ? second_x : first_x, 5);
  memcpy(field->site_y, second ? second_y : first_y, 5);
  const unsigned routes_a[4][2] = {{0,1},{0,2},{2,3},{3,1}};
  const unsigned routes_b[4][2] = {{0,2},{0,3},{2,1},{3,1}};
  for (unsigned route = 0; route < 4; ++route) {
    unsigned a = second ? routes_b[route][0] : routes_a[route][0];
    unsigned b = second ? routes_b[route][1] : routes_a[route][1];
    /* B's arms turn outside the central spine, preserving its distinct graph. */
    corridor(field->paths, field->site_x[a], field->site_y[a],
             field->site_x[b], field->site_y[b], second && a != 0);
  }
  corridor(field->hidden_paths, field->site_x[1], field->site_y[1],
           field->site_x[4], field->site_y[4], second);
  uint32_t terrain_random = field->seed;
  for (unsigned index = 0; index < GAME_FIELD_CELLS; ++index) {
    unsigned value = random_next(&terrain_random) % 20u;
    field->terrain[index] = value < 2 ? 2 : value < 4 ? 3 : 1;
    if (index % GAME_FIELD_COLUMNS == (second ? 11u : 10u)) field->terrain[index] = 4;
  }
}
static void generate_geometry_v2(GameExpeditionField *field) {
  _Static_assert(GAME_FIELD_COLUMNS == 20u && GAME_FIELD_ROWS == 11u &&
                 GAME_FIELD_SITES == 5u, "Version2 geometry is pinned to its20x11 five-place grid");
  uint32_t geometry_random = field->seed;
  field->site_x[0] = (uint8_t)(2u + random_next(&geometry_random) % 16u);
  field->site_y[0] = 9;
  field->site_x[1] = (uint8_t)(2u + random_next(&geometry_random) % 16u);
  field->site_y[1] = 4;

  /* Enumerate a small finite pool rather than retrying random placements. */
  for (unsigned site = 2; site < 4; ++site) {
    uint8_t candidate_x[64], candidate_y[64];
    unsigned candidate_count = 0;
    for (unsigned y = 5; y <= 8; ++y) {
      for (unsigned x = 2; x <= 17; ++x) {
        int separated = 1;
        for (unsigned previous = 0; previous < site; ++previous) {
          int dx = (int)x - field->site_x[previous];
          int dy = (int)y - field->site_y[previous];
          unsigned separation = (unsigned)(dx < 0 ? -dx : dx) +
                                (unsigned)(dy < 0 ? -dy : dy);
          if (separation < 4) separated = 0;
        }
        if (separated) {
          candidate_x[candidate_count] = (uint8_t)x;
          candidate_y[candidate_count++] = (uint8_t)y;
        }
      }
    }
    /* The fixed interior band always leaves candidates for these two sites. */
    unsigned selected = random_next(&geometry_random) % candidate_count;
    field->site_x[site] = candidate_x[selected];
    field->site_y[site] = candidate_y[selected];
  }
  field->site_x[4] = (uint8_t)(2u + random_next(&geometry_random) % 16u);
  field->site_y[4] = 1;

  unsigned order[4] = {0, 1, 2, 3};
  uint8_t connected[4][4] = {{0}};
  for (unsigned remaining = 4; remaining > 1; --remaining) {
    unsigned selected = random_next(&geometry_random) % remaining;
    unsigned saved = order[remaining - 1];
    order[remaining - 1] = order[selected];
    order[selected] = saved;
  }
  for (unsigned index = 1; index < 4; ++index) {
    unsigned first = order[index];
    unsigned second = order[random_next(&geometry_random) % index];
    connected[first][second] = connected[second][first] = 1;
    corridor(field->paths, field->site_x[first], field->site_y[first],
             field->site_x[second], field->site_y[second],
             (int)(random_next(&geometry_random) & 1u));
  }
  if (random_next(&geometry_random) & 1u) {
    unsigned first_choices[6], second_choices[6], count = 0;
    for (unsigned first = 0; first < 4; ++first) {
      for (unsigned second = first + 1; second < 4; ++second) {
        if (!connected[first][second]) {
          first_choices[count] = first;
          second_choices[count++] = second;
        }
      }
    }
    unsigned selected = random_next(&geometry_random) % count;
    unsigned first = first_choices[selected], second = second_choices[selected];
    corridor(field->paths, field->site_x[first], field->site_y[first],
             field->site_x[second], field->site_y[second],
             (int)(random_next(&geometry_random) & 1u));
  }

  /* Public corridors stay at y>=4. Only deliberate trace opens this branch. */
  corridor(field->hidden_paths, field->site_x[1], field->site_y[1],
           field->site_x[1], field->site_y[4], 1);
  corridor(field->hidden_paths, field->site_x[1], field->site_y[4],
           field->site_x[4], field->site_y[4], 0);
  unsigned river_column = 3u + random_next(&geometry_random) % 14u;
  for (unsigned index = 0; index < GAME_FIELD_CELLS; ++index) {
    unsigned value = random_next(&geometry_random) % 20u;
    field->terrain[index] = value < 2 ? 2 : value < 4 ? 3 : 1;
    if (index % GAME_FIELD_COLUMNS == river_column) field->terrain[index] = 4;
  }
}
static int supported_field_version(uint32_t version) {
  return version == GAME_FIELD_LEGACY_CONTENT_VERSION ||
         version == GAME_FIELD_TIMED_CONTENT_VERSION ||
         version == GAME_FIELD_CONTENT_VERSION;
}
static void generate_geometry(GameExpeditionField *field) {
  if (field->version == GAME_FIELD_LEGACY_CONTENT_VERSION)
    generate_geometry_v1(field);
  else if (field->version == GAME_FIELD_TIMED_CONTENT_VERSION || field->version == GAME_FIELD_CONTENT_VERSION)
    generate_geometry_v2(field);
}
GameResult game_field_start(GameState *state, const GameCommand *command) {
  if (state->expedition_id[0] || state->legacy_supply_encoding ||
      !state->runtime_anchors_ready || command->data.field.kind > 2 ||
      command->data.field.sample_budget > GAME_MAX_SAMPLES ||
      !command->data.field.seed) return GAME_UNAVAILABLE;
  GameExpeditionField *field = &state->field;
  memset(field, 0, sizeof(*field));
  field->version = GAME_FIELD_CONTENT_VERSION;
  field->seed = command->data.field.seed;
  field->sample_budget = (uint8_t)command->data.field.sample_budget;
  field->active_source = GAME_FIELD_NONE;
  memset(field->last_source, GAME_FIELD_NONE, sizeof(field->last_source));
  for (unsigned source = 0; source < GAME_FIELD_SOURCES; ++source)
    field->remaining[source] = (uint8_t)game_field_initial_units(source);
  generate_geometry(field);
  field->x = field->site_x[0];
  field->y = field->site_y[0];
  field->visited = 1;
  field->walked[cell(field->x, field->y)] = 1;
  state->expedition_kind = command->data.field.kind;
  state->expedition_elapsed = 0;
  state->expedition_active = 1;
  state->expedition_last_tick = command->data.field.monotonic_seconds;
  if (state->next_identity == UINT32_MAX) return GAME_UNAVAILABLE;
  snprintf(state->expedition_id, sizeof(state->expedition_id), "BEE-E-%05u",
           state->next_identity++);
  return GAME_OK;
}
GameResult game_field_action(GameState *state, const GameCommand *command) {
  GameExpeditionField *field = &state->field;
  unsigned site = game_field_site(state);
  if (!field->version || !state->expedition_id[0]) return GAME_UNAVAILABLE;
  if (strcmp(state->expedition_id, command->data.field.expedition_id))
    return GAME_CONFLICT;
  if (command->type == GAME_COMMAND_FIELD_MOVE) {
    int x = field->x, y = field->y;
    switch (command->data.field.direction) {
    case 0: --y;
    break;
    case 1: ++y;
    break;
    case 2: --x;
    break;
    case 3: ++x;
    break;
    default: return GAME_INVALID;
    }
    if (x < 0 || x >= (int)GAME_FIELD_COLUMNS || y < 0 || y >= (int)GAME_FIELD_ROWS ||
        !(field->paths[cell((unsigned)x,(unsigned)y)] ||
          (field->trace && field->hidden_paths[cell((unsigned)x,(unsigned)y)])))
      return GAME_UNAVAILABLE;
    field->x = (uint8_t)x;
    field->y = (uint8_t)y;
    field->walked[cell(field->x, field->y)] = 1;
    site = game_field_site(state);
    if (site < GAME_FIELD_SITES) field->visited |= (uint8_t)(1u << site);
    return GAME_OK;
  }
  if (site >= GAME_FIELD_SITES || command->data.field.site != site) return GAME_UNAVAILABLE;
  if (command->type == GAME_COMMAND_FIELD_INSPECT) {
    field->inspected |= (uint8_t)(1u << site);
    return GAME_OK;
  }
  if (command->type == GAME_COMMAND_FIELD_TAKE) {
    unsigned source = command->data.field.source;
    unsigned quantity = command->data.field.quantity;
    uint64_t total = (uint64_t)state->expedition_data + state->expedition_energy + state->expedition_essence;
    if (!game_field_finite(state) || !state->expedition_active ||
        source >= GAME_FIELD_SOURCES || game_field_source_site(source) != site ||
        !quantity || quantity > field->remaining[source] ||
        total > GAME_CARGO_CAPACITY || (uint64_t)quantity * GAME_SUPPLY_UNIT > GAME_CARGO_CAPACITY - total)
      return GAME_UNAVAILABLE;
    uint32_t *cargo[] = {&state->expedition_data, &state->expedition_energy, &state->expedition_essence};
    field->remaining[source] -= (uint8_t)quantity;
    field->awards[source] += (uint8_t)quantity;
    ++field->attempts[source];
    field->inspected |= (uint8_t)(1u << site);
    *cargo[game_field_source_resource(source)] += quantity * GAME_SUPPLY_UNIT;
    return GAME_OK;
  }
  if (!(field->inspected & (1u << site)) &&
      !(game_field_finite(state) && (command->type == GAME_COMMAND_FIELD_TRACE ||
                                   command->type == GAME_COMMAND_FIELD_COLLECT))) return GAME_UNAVAILABLE;
  if (command->type == GAME_COMMAND_FIELD_SOURCE) {
    unsigned source = command->data.field.source;
    if (!game_field_finite(state) || source >= GAME_FIELD_SOURCES || game_field_source_site(source) != site ||
        !field->remaining[source]) return GAME_UNAVAILABLE;
    field->active_source = (uint8_t)source;
    field->last_source[game_field_source_resource(source)] = (uint8_t)source;
    state->expedition_last_tick = command->data.field.monotonic_seconds;
    return GAME_OK;
  }
  if (command->type == GAME_COMMAND_FIELD_TRACE) {
    if (!game_field_finite(state) || site != 1 || field->trace || !field->sample_budget) return GAME_UNAVAILABLE;
    field->trace = 1;
    field->inspected |= (uint8_t)(1u << site);
    return GAME_OK;
  }
  if (command->type == GAME_COMMAND_FIELD_COLLECT) {
    if (!game_field_finite(state) || site != 4 || !field->trace || field->collected || !field->sample_budget ||
        state->next_identity == UINT32_MAX) return GAME_UNAVAILABLE;
    snprintf(field->capsule_id, sizeof(field->capsule_id), "BEE-S-%05u",
             state->next_identity++);
    field->capsule_profile = (uint8_t)((GAME_MAX_SAMPLES - field->sample_budget) % 2
                            ? GAME_SAMPLE_DISCOVERY_B : GAME_SAMPLE_DISCOVERY_A);
    field->collected = 1;
    field->inspected |= (uint8_t)(1u << site);
    return GAME_OK;
  }
  return GAME_INVALID;
}
GameResult game_field_tick(GameState *state, uint32_t now) {
  if (!state->runtime_anchors_ready || now < state->expedition_last_tick)
    return GAME_INVALID;
  /* Field1/2 remain frozen; field3 collection is an explicit saved command. */
  state->expedition_last_tick = now;
  return GAME_UNAVAILABLE;
}

void game_field_record(const GameState *state, GameReceivedExpedition *record) {
  const GameExpeditionField *field = &state->field;
  memset(record, 0, sizeof(*record));
  record->version = field->version;
  record->seed = field->seed;
  record->kind = state->expedition_kind;
  strcpy(record->expedition_id, state->expedition_id);
  if (field->collected) strcpy(record->sample_id, field->capsule_id);
  record->cargo[0] = state->expedition_data;
  record->cargo[1] = state->expedition_energy;
  record->cargo[2] = state->expedition_essence;
  memcpy(record->terrain, field->terrain, sizeof(record->terrain));
  memcpy(record->walked, field->walked, sizeof(record->walked));
  for (unsigned site = 0; site < GAME_FIELD_SITES; ++site)
    if (field->visited & (1u << site)) {
      record->site_x[site] = field->site_x[site];
      record->site_y[site] = field->site_y[site];
    }
  record->visited = field->visited;
  record->inspected = field->inspected;
  record->trace = field->trace;
  record->collected = field->collected;
  memcpy(record->attempts, field->attempts, 6);
  memcpy(record->awards, field->awards, 6);
}
GameResult game_field_unload(GameState *state, const GameCommand *command) {
  const GameReceivedExpedition *record = command->data.field.record;
  if (!record || !state->field.version || !state->expedition_id[0] ||
      (state->field.collected && state->sample_count >= GAME_MAX_SAMPLES)) return GAME_UNAVAILABLE;
  GameReceivedExpedition expected;
  game_field_record(state, &expected);
  expected.accepted_at = record->accepted_at;
  expected.accept_sequence = command->sequence;
  if (!record->accepted_at || memcmp(&expected, record, sizeof(expected))) return GAME_CONFLICT;
  uint32_t *stock[3] = {&state->data, &state->energy, &state->essence};
  for (unsigned resource = 0; resource < 3; ++resource) {
    if (*stock[resource] > 1000000u - record->cargo[resource]) return GAME_UNAVAILABLE;
    *stock[resource] += record->cargo[resource];
  }
  if (state->field.collected) {
    GameSample *sample = &state->samples[state->sample_count];
    memset(sample, 0, sizeof(*sample));
    strcpy(sample->id, state->field.capsule_id);
    strcpy(sample->origin_expedition_id, state->expedition_id);
    sample->origin_expedition_kind = (uint8_t)state->expedition_kind;
    sample->supported_candidates = PIP_SAMPLE_CANDIDATE_MASK;
    GameSampleMetadata *metadata = &state->sample_metadata[state->sample_count];
    metadata->profile = state->field.capsule_profile;
    strcpy(metadata->content_version, PIP_DISCOVERY_CONTENT_VERSION);
    ++state->sample_count;
  }
  state->received[state->received_cursor] = *record;
  state->received_cursor = (state->received_cursor + 1u) % GAME_FIELD_HISTORY;
  if (state->received_count < GAME_FIELD_HISTORY) ++state->received_count;
  state->expedition_data = state->expedition_energy = state->expedition_essence = 0;
  state->expedition_active = 0;
  state->expedition_id[0] = 0;
  state->expedition_elapsed = 0;
  memset(&state->field, 0, sizeof(state->field));
  return GAME_OK;
}
int game_received_valid(const GameReceivedExpedition *record) {
  if (!supported_field_version(record->version) || !record->seed || record->kind > 2 ||
      !record->expedition_id[0] || !memchr(record->expedition_id,0,64) ||
      !memchr(record->sample_id,0,40) || record->visited > 31 ||
      (record->inspected & ~record->visited) || record->trace > 1 || record->collected > 1 ||
      (!!record->sample_id[0] != !!record->collected) ||
      (record->collected && !record->trace)) return 0;
  uint64_t total = 0;
  for (unsigned i = 0; i < 3; ++i) {
    if (record->cargo[i] % GAME_SUPPLY_UNIT) return 0;
    total += record->cargo[i];
  }
  if (total > GAME_CARGO_CAPACITY) return 0;
  for (unsigned i = 0; i < GAME_FIELD_CELLS; ++i)
    if (record->terrain[i] > 4 || record->walked[i] > 1) return 0;
  for (unsigned i = 0; i < GAME_FIELD_SOURCES; ++i) {
    if (record->version == GAME_FIELD_CONTENT_VERSION) {
      if (record->awards[i] > game_field_initial_units(i) || record->attempts[i] > record->awards[i] ||
          (!!record->attempts[i] != !!record->awards[i])) return 0;
    } else if (record->attempts[i] > FIELD_ATTEMPTS || record->awards[i] > record->attempts[i]) return 0;
  }
  for (unsigned i = 0; i < GAME_FIELD_SITES; ++i)
    if (record->site_x[i] >= GAME_FIELD_COLUMNS || record->site_y[i] >= GAME_FIELD_ROWS ||
        (!(record->visited & (1u << i)) && (record->site_x[i] || record->site_y[i]))) return 0;
  return 1;
}
int game_field_valid(const GameState *state) {
  const GameExpeditionField *field = &state->field;
  if (!field->version) {
    const GameExpeditionField empty = {0};
    return !memcmp(field,&empty,sizeof(empty));
  }
  if (!supported_field_version(field->version) || !field->seed ||
      !state->expedition_id[0] || state->expedition_elapsed || field->x >= (int)GAME_FIELD_COLUMNS ||
      field->y >= (int)GAME_FIELD_ROWS || field->visited > 31 || (field->inspected & ~field->visited) ||
      field->trace > 1 || field->collected > 1 || field->sample_budget > 8 ||
      (field->trace && !field->sample_budget) ||
      (field->active_source >= GAME_FIELD_SOURCES && field->active_source != GAME_FIELD_NONE) ||
      !memchr(field->capsule_id,0,40) || (!!field->capsule_id[0] != !!field->collected) ||
      (field->collected && (!field->trace || field->capsule_profile < 1 || field->capsule_profile > 2))) return 0;
  /* Pinned geometry must still represent its versioned connected topology.
   * This detects a checksum-valid edited corridor or hidden connector, rather
   * than merely accepting bounded bytes that could strand the player. */
  GameExpeditionField expected = {0};
  expected.version = field->version;
  expected.seed = field->seed;
  generate_geometry(&expected);
  if (memcmp(field->terrain, expected.terrain, sizeof(field->terrain)) ||
      memcmp(field->paths, expected.paths, sizeof(field->paths)) ||
      memcmp(field->hidden_paths, expected.hidden_paths, sizeof(field->hidden_paths)) ||
      memcmp(field->site_x, expected.site_x, sizeof(field->site_x)) ||
      memcmp(field->site_y, expected.site_y, sizeof(field->site_y))) return 0;
  for (unsigned i = 0; i < GAME_FIELD_CELLS; ++i)
    if (field->terrain[i] > 4 || field->paths[i] > 1 || field->hidden_paths[i] > 1 ||
        field->walked[i] > 1 || (field->walked[i] && !field->paths[i] &&
        !(field->trace && field->hidden_paths[i]))) return 0;
  if (!field->walked[cell(field->x,field->y)]) return 0;
  for (unsigned i = 0; i < GAME_FIELD_SOURCES; ++i) {
    if (field->version == GAME_FIELD_CONTENT_VERSION) {
      if (field->remaining[i] + field->awards[i] != game_field_initial_units(i) ||
          field->attempts[i] > field->awards[i] || (!!field->attempts[i] != !!field->awards[i])) return 0;
    } else if (field->remaining[i] + field->attempts[i] != FIELD_ATTEMPTS ||
               field->awards[i] > field->attempts[i]) return 0;
  }
  for (unsigned i = 0; i < 3; ++i)
    if (field->last_source[i] != GAME_FIELD_NONE &&
        game_field_source_resource(field->last_source[i]) != i) return 0;
  for (unsigned i = 0; i < GAME_FIELD_SITES; ++i)
    if (field->site_x[i] >= GAME_FIELD_COLUMNS || field->site_y[i] >= GAME_FIELD_ROWS) return 0;
  return 1;
}
