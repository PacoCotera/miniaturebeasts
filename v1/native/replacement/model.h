#ifndef REPLACEMENT_MODEL_H
#define REPLACEMENT_MODEL_H
#include <stddef.h>
#include <stdint.h>

#define REPLACEMENT_TARGET_MS UINT64_C(120000)
#define REPLACEMENT_PROFILE "simulated-expedition-120s-v1"
#define REPLACEMENT_ACTION_CAPACITY 8

typedef enum {
  REPLACEMENT_PREPARATION, REPLACEMENT_READY, REPLACEMENT_GATHERING,
  REPLACEMENT_COMPLETE, REPLACEMENT_RECEIVED
} ReplacementPhase;
typedef enum {
  REPLACEMENT_NO_EVENT, REPLACEMENT_PENDING_EVENT,
  REPLACEMENT_SAVED_OBSERVATION, REPLACEMENT_LEFT_EVENT
} ReplacementEvent;
typedef enum {
  REPLACEMENT_EXPEDITIONS, REPLACEMENT_EXPEDITION_REVIEW,
  REPLACEMENT_SAMPLE, REPLACEMENT_STUDY, REPLACEMENT_FINDING
} ReplacementLabPage;

typedef struct {
  const char *name;
  const char *label;
  const char *device;
} ReplacementAction;

typedef struct {
  uint64_t revision;
  ReplacementPhase phase;
  ReplacementLabPage lab_page;
  unsigned probe_summary;
  uint64_t elapsed_ms;
  unsigned supplies_awarded;
  unsigned supplies_spent;
  unsigned sample_sealed;
  ReplacementEvent event;
  unsigned finding;
  char clock_epoch[65];
  uint64_t clock_offset_ms;
  char receipt_id[65];
  char receipt_payload[256];
  uint64_t receipt_revision;
} ReplacementState;

/* This type is the Probe disclosure boundary, not a filtered save object. */
typedef struct {
  uint64_t revision;
  const char *expedition;
  const char *profile;
  const char *status;
  uint64_t elapsed_ms;
  uint64_t target_ms;
  unsigned aboard_sealed_samples;
  unsigned aboard_supplies;
  ReplacementEvent event;
  unsigned summary;
  ReplacementAction actions[REPLACEMENT_ACTION_CAPACITY];
  size_t action_count;
} ReplacementProbeView;

typedef struct {
  uint64_t revision;
  ReplacementPhase phase;
  ReplacementLabPage page;
  const char *expedition;
  unsigned sample_present;
  unsigned incoming_sample;
  unsigned supplies;
  unsigned study_cost;
  unsigned finding;
  unsigned form_selected;
  unsigned unknown_regions;
  ReplacementEvent observation;
  ReplacementAction actions[REPLACEMENT_ACTION_CAPACITY];
  size_t action_count;
} ReplacementLabView;

void replacement_init(ReplacementState *state);
int replacement_token(const char *value, size_t limit);
int replacement_valid(const ReplacementState *state);
size_t replacement_actions(const ReplacementState *state,
                           ReplacementAction *actions, size_t capacity);
const char *replacement_tick(ReplacementState *state, const char *epoch,
                             uint64_t offset_ms, int *changed);
const char *replacement_command(ReplacementState *state, const char *name,
                                uint64_t expected_revision, const char *operation,
                                const char *epoch, uint64_t offset_ms, int *replayed);
void replacement_probe_view(const ReplacementState *state, ReplacementProbeView *view);
void replacement_lab_view(const ReplacementState *state, ReplacementLabView *view);
#endif
