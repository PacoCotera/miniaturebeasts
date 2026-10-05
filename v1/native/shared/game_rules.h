#ifndef GAME_RULES_H
#define GAME_RULES_H

#include "game_state.h"

#include <stdint.h>

typedef enum {
  GAME_OK = 0,
  GAME_DUPLICATE = 1,
  GAME_INVALID = -1,
  GAME_UNAVAILABLE = -2,
  GAME_CONFLICT = -3,
  GAME_STORAGE = -4,
  GAME_COMMITTED_UNCERTAIN = 2
} GameResult;

typedef enum {
  GAME_RESOURCE_DATA = 0,
  GAME_RESOURCE_ENERGY = 1,
  GAME_RESOURCE_ESSENCE = 2
} GameResource;

typedef enum {
  GAME_COMMAND_EXPEDITION_START = 1,
  GAME_COMMAND_EXPEDITION_TICK,
  GAME_COMMAND_EXPEDITION_OFFLOAD,
  GAME_COMMAND_EXPEDITION_DISCARD,
  GAME_COMMAND_STUDY,
  GAME_COMMAND_INCUBATION_START,
  GAME_COMMAND_INCUBATION_TICK,
  GAME_COMMAND_INCUBATION_OPEN,
  GAME_COMMAND_HABITAT_VISIT,
  GAME_COMMAND_CARE_VISIT,
  /* Append commands: saved legacy fingerprints include the numeric type. */
  GAME_COMMAND_EXPEDITION_TRANSFER,
  GAME_COMMAND_STOCK_NORMALIZE,
  GAME_COMMAND_EXPEDITION_CONTINUE,
  GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER,
  GAME_COMMAND_EXPEDITION_FINISH,
  /* Fresh unload ends its source outing; command14 remains replayable. */
  GAME_COMMAND_EXPEDITION_UNLOAD,
  GAME_COMMAND_INVESTIGATE,
  GAME_COMMAND_SUPPORTED_CREATION,
  GAME_COMMAND_FIELD_START,
  GAME_COMMAND_FIELD_MOVE,
  GAME_COMMAND_FIELD_INSPECT,
  GAME_COMMAND_FIELD_SOURCE,
  GAME_COMMAND_FIELD_TRACE,
  GAME_COMMAND_FIELD_COLLECT,
  GAME_COMMAND_FIELD_UNLOAD,
  GAME_COMMAND_FIELD_TAKE
} GameCommandType;

typedef struct {
  const char *operation_id;
  uint64_t sequence;
  GameCommandType type;
  union {
    struct {
      uint32_t kind, seed, monotonic_seconds, sample_budget;
      unsigned direction, site, source, quantity;
      const char *expedition_id;
      const GameReceivedExpedition *record;
    } field;
    struct {
      GameExpeditionKind kind;
      uint32_t monotonic_seconds;
    } expedition;
    uint32_t monotonic_seconds;
    struct {
      GameResource resource;
      uint32_t quantity;
      uint8_t confirm;
    } discard;
    struct {
      unsigned sample;
      unsigned study;
    } study;
    struct {
      unsigned sample;
      unsigned preference;
      uint32_t monotonic_seconds;
    } incubation;
    struct {
      unsigned sample;
      unsigned preference;
      uint32_t monotonic_seconds;
    } creation;
    struct {
      unsigned individual;
      unsigned habitat;
    } habitat;
    unsigned individual;
    struct {
      unsigned sample;
      const char *sample_id;
      const char *content_version;
      const char *method_id;
    } investigation;
    struct {
      unsigned sample;
      const char *sample_id;
      const char *content_version;
      const char *candidate_id;
      uint32_t monotonic_seconds;
    } supported_creation;
  } data;
} GameCommand;

/* Call once after each store load. It anchors active-only clocks and prevents
 * time while the application was stopped from advancing the simulation. */
void game_rules_resume_runtime(GameState *state, uint32_t monotonic_seconds);

/* Legacy raw encoding remains readable until its reserved intent is settled.
 * STOCK_NORMALIZE converts historical remainders into preparation time. */
int game_supply_conversion_pending(const GameState *state);
int game_stock_normalized(const GameState *state);

/* Normal UI eligibility. UNLOAD also permits fresh acceptance of an immutable
 * legacy haul, converting its encoding atomically. WHOLE_TRANSFER retains the
 * preceding policy for already reserved version3 journal intents. */
int game_transfer_available(const GameState *state);

/* Provisional V1 opportunity timing. Bits 1/2/4 name Data/Energy/Essence.
 * Due mask identifies the classes at the earliest actual next opportunity.
 * Capacity reserves room for every class that could award in the next second;
 * blocked time consumes neither preparation nor a chance result. */
uint32_t game_gather_remaining_ms(const GameState *state);
unsigned game_gather_due_mask(const GameState *state);
unsigned game_gather_required_slots(const GameState *state);
int game_gather_capacity_blocked(const GameState *state);

/* Saves a candidate state atomically before publishing it through state.
 * sequence must be the next durable command number. Replayed older numbers
 * never apply again, even after their detailed result ages out of the journal.
 */
GameResult game_apply(const char *path, GameState *state,
                      const GameCommand *command);

#endif
