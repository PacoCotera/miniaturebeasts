#include "model.h"
#include <inttypes.h>
#include <stdio.h>
#include <string.h>

void replacement_init(ReplacementState *state) {
  memset(state, 0, sizeof(*state));
  strcpy(state->clock_epoch, "-");
  strcpy(state->receipt_id, "-");
  strcpy(state->receipt_payload, "-");
}

int replacement_token(const char *value, size_t limit) {
  size_t length = strlen(value);
  if (!length || length > limit) return 0;
  for (size_t i = 0; i < length; ++i) {
    char c = value[i];
    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') || c == '-' || c == '_')) return 0;
  }
  return 1;
}

int replacement_valid(const ReplacementState *state) {
  if ((unsigned)state->phase > REPLACEMENT_RECEIVED ||
      (unsigned)state->lab_page > REPLACEMENT_FINDING || state->probe_summary > 1 ||
      state->elapsed_ms > REPLACEMENT_TARGET_MS ||
      (unsigned)state->event > REPLACEMENT_LEFT_EVENT || state->finding > 1 ||
      state->sample_sealed > 1 || state->supplies_spent > 1 ||
      !replacement_token(state->clock_epoch, 64) ||
      !replacement_token(state->receipt_id, 64) ||
      state->receipt_revision > state->revision) return 0;
  unsigned awarded = (state->elapsed_ms >= UINT64_C(30000)) +
                     (state->elapsed_ms >= UINT64_C(90000));
  if (state->supplies_awarded != awarded ||
      state->sample_sealed != (state->elapsed_ms == REPLACEMENT_TARGET_MS) ||
      state->supplies_spent != state->finding ||
      (state->elapsed_ms < UINT64_C(45000)) != (state->event == REPLACEMENT_NO_EVENT))
    return 0;
  if (state->phase < REPLACEMENT_GATHERING && state->elapsed_ms) return 0;
  if (state->phase == REPLACEMENT_GATHERING && state->sample_sealed) return 0;
  if (state->phase >= REPLACEMENT_COMPLETE && !state->sample_sealed) return 0;
  if (state->phase == REPLACEMENT_PREPARATION &&
      state->lab_page > REPLACEMENT_EXPEDITION_REVIEW) return 0;
  if (state->phase > REPLACEMENT_PREPARATION && state->phase < REPLACEMENT_RECEIVED &&
      state->lab_page != REPLACEMENT_EXPEDITION_REVIEW) return 0;
  if (state->phase == REPLACEMENT_RECEIVED && state->lab_page < REPLACEMENT_SAMPLE)
    return 0;
  if (state->finding && (state->phase != REPLACEMENT_RECEIVED ||
      state->lab_page == REPLACEMENT_STUDY)) return 0;
  if (state->lab_page == REPLACEMENT_FINDING && !state->finding) return 0;
  if (state->probe_summary && state->phase != REPLACEMENT_COMPLETE) return 0;
  if (!strcmp(state->clock_epoch, "-") &&
      (state->clock_offset_ms || state->phase >= REPLACEMENT_GATHERING)) return 0;
  if (!strcmp(state->receipt_id, "-"))
    return !strcmp(state->receipt_payload, "-") && !state->receipt_revision;
  char name[65], canonical[256], extra;
  uint64_t revision;
  if (sscanf(state->receipt_payload, "%64[^:]:%" SCNu64 "%c", name, &revision, &extra) != 2 ||
      !replacement_token(name, 64) || revision == UINT64_MAX ||
      state->receipt_revision != revision + 1) return 0;
  snprintf(canonical, sizeof(canonical), "%s:%" PRIu64, name, revision);
  return !strcmp(canonical, state->receipt_payload);
}

size_t replacement_actions(const ReplacementState *state,
                           ReplacementAction *actions, size_t capacity) {
  size_t count = 0;
#define ACTION(key, caption, surface) do { \
  if (count < capacity) actions[count] = (ReplacementAction){key, caption, surface}; \
  ++count; \
} while (0)
  if (state->phase == REPLACEMENT_PREPARATION) {
    if (state->lab_page == REPLACEMENT_EXPEDITIONS) {
      ACTION("review", "Expedition details", "lab");
    } else {
      ACTION("back", "Back", "lab");
      ACTION("load", "Load probe", "lab");
    }
  } else if (state->phase == REPLACEMENT_READY) {
    ACTION("start", "Start", "probe");
  } else if (state->phase == REPLACEMENT_GATHERING) {
    ACTION("check", "Check", "probe");
    if (state->event == REPLACEMENT_PENDING_EVENT) {
      ACTION("inspect", "Inspect", "probe");
      ACTION("leave", "Leave", "probe");
    }
  } else if (state->phase == REPLACEMENT_COMPLETE) {
    ACTION("haul", "Review results", "probe");
    ACTION("receive", "Bring to lab", "lab");
  } else if (state->lab_page == REPLACEMENT_SAMPLE) {
    if (state->finding) ACTION("finding", "View finding", "lab");
    else ACTION("study_review", "Review study", "lab");
  } else {
    ACTION("back", state->lab_page == REPLACEMENT_FINDING ? "Back to sample" : "Back", "lab");
    if (state->lab_page == REPLACEMENT_STUDY && !state->finding &&
        state->supplies_awarded > state->supplies_spent)
      ACTION("run", "Start study", "lab");
  }
  if (state->phase >= REPLACEMENT_COMPLETE && state->event == REPLACEMENT_PENDING_EVENT)
    ACTION("inspect", "Inspect note", "lab");
#undef ACTION
  return count;
}

/* The host supplies monotonic observations, never browser or wall-clock time. */
static const char *observe(ReplacementState *state, const char *epoch,
                           uint64_t offset_ms) {
  if (!replacement_token(epoch, 64) || !strcmp(epoch, "-")) return "Invalid clock epoch";
  if (strcmp(state->clock_epoch, epoch)) {
    strcpy(state->clock_epoch, epoch);
    state->clock_offset_ms = offset_ms;
    return NULL; /* A service restart earns no downtime. */
  }
  if (offset_ms < state->clock_offset_ms) return "Clock observation moved backwards";
  uint64_t delta = offset_ms - state->clock_offset_ms;
  state->clock_offset_ms = offset_ms;
  if (state->phase != REPLACEMENT_GATHERING || !delta) return NULL;
  uint64_t remaining = REPLACEMENT_TARGET_MS - state->elapsed_ms;
  state->elapsed_ms += delta < remaining ? delta : remaining;
  state->supplies_awarded = (state->elapsed_ms >= UINT64_C(30000)) +
                            (state->elapsed_ms >= UINT64_C(90000));
  if (state->elapsed_ms >= UINT64_C(45000) && state->event == REPLACEMENT_NO_EVENT)
    state->event = REPLACEMENT_PENDING_EVENT;
  if (state->elapsed_ms == REPLACEMENT_TARGET_MS) {
    state->sample_sealed = 1;
    state->phase = REPLACEMENT_COMPLETE;
  }
  return NULL;
}

const char *replacement_tick(ReplacementState *state, const char *epoch,
                             uint64_t offset_ms, int *changed) {
  ReplacementState next = *state;
  const char *failure = observe(&next, epoch, offset_ms);
  if (failure) return failure;
  if (next.elapsed_ms != state->elapsed_ms) {
    if (state->revision == UINT64_MAX) return "Revision exhausted";
    ++next.revision;
  }
  *changed = strcmp(next.clock_epoch, state->clock_epoch) ||
             next.clock_offset_ms != state->clock_offset_ms;
  *state = next;
  return NULL;
}

const char *replacement_command(ReplacementState *state, const char *name,
                                uint64_t expected_revision, const char *operation,
                                const char *epoch, uint64_t offset_ms, int *replayed) {
  *replayed = 0;
  if (!replacement_token(name, 64) || !replacement_token(operation, 64) ||
      !strcmp(operation, "-")) return "Invalid command identity";
  char payload[256];
  snprintf(payload, sizeof(payload), "%s:%" PRIu64, name, expected_revision);
  /* Trusted execution metadata is not part of logical user-operation identity.
     A restart may supply a new epoch; an accepted retry never observes it. */
  if (!strcmp(state->receipt_id, operation)) {
    if (strcmp(state->receipt_payload, payload)) return "Operation ID reused for different command";
    *replayed = 1;
    return NULL;
  }
  if (state->revision != expected_revision || state->revision == UINT64_MAX)
    return "Stale revision; refresh before acting";
  ReplacementAction actions[REPLACEMENT_ACTION_CAPACITY];
  size_t count = replacement_actions(state, actions, REPLACEMENT_ACTION_CAPACITY);
  size_t action = 0;
  while (action < count && strcmp(actions[action].name, name)) ++action;
  if (action == count) return "Action unavailable";
  ReplacementState next = *state;
  const char *failure = observe(&next, epoch, offset_ms);
  if (failure) return failure;
  if (!strcmp(name, "review")) next.lab_page = REPLACEMENT_EXPEDITION_REVIEW;
  else if (!strcmp(name, "load")) next.phase = REPLACEMENT_READY;
  else if (!strcmp(name, "start")) next.phase = REPLACEMENT_GATHERING;
  else if (!strcmp(name, "inspect")) next.event = REPLACEMENT_SAVED_OBSERVATION;
  else if (!strcmp(name, "leave")) next.event = REPLACEMENT_LEFT_EVENT;
  else if (!strcmp(name, "haul")) next.probe_summary = 1;
  else if (!strcmp(name, "receive")) {
    next.phase = REPLACEMENT_RECEIVED;
    next.lab_page = REPLACEMENT_SAMPLE;
    next.probe_summary = 0;
  } else if (!strcmp(name, "study_review")) next.lab_page = REPLACEMENT_STUDY;
  else if (!strcmp(name, "run")) {
    next.supplies_spent = 1;
    next.finding = 1;
    next.lab_page = REPLACEMENT_FINDING;
  } else if (!strcmp(name, "finding")) next.lab_page = REPLACEMENT_FINDING;
  else if (!strcmp(name, "back"))
    next.lab_page = next.phase == REPLACEMENT_PREPARATION ? REPLACEMENT_EXPEDITIONS : REPLACEMENT_SAMPLE;
  /* Check changes no domain fact; only independently elapsed host time can accrue. */
  ++next.revision;
  strcpy(next.receipt_id, operation);
  strcpy(next.receipt_payload, payload);
  next.receipt_revision = next.revision;
  if (!replacement_valid(&next)) return "Invalid transition";
  *state = next;
  return NULL;
}

static size_t device_actions(const ReplacementState *state, const char *device,
                             ReplacementAction *output) {
  ReplacementAction actions[REPLACEMENT_ACTION_CAPACITY];
  size_t count = replacement_actions(state, actions, REPLACEMENT_ACTION_CAPACITY);
  size_t selected = 0;
  for (size_t i = 0; i < count; ++i)
    if (!strcmp(actions[i].device, device)) output[selected++] = actions[i];
  return selected;
}

void replacement_probe_view(const ReplacementState *state, ReplacementProbeView *view) {
  memset(view, 0, sizeof(*view));
  view->revision = state->revision;
  view->profile = REPLACEMENT_PROFILE;
  view->target_ms = REPLACEMENT_TARGET_MS;
  int empty = state->phase == REPLACEMENT_PREPARATION || state->phase == REPLACEMENT_RECEIVED;
  view->status = empty ? "empty" : state->phase == REPLACEMENT_READY ? "ready"
                  : state->phase == REPLACEMENT_COMPLETE ? "complete" : "gathering";
  if (!empty) {
    view->expedition = "Material trail";
    view->elapsed_ms = state->elapsed_ms;
    view->aboard_supplies = state->supplies_awarded;
    view->aboard_sealed_samples = state->sample_sealed;
    view->event = state->event;
    view->summary = state->probe_summary;
  }
  view->action_count = device_actions(state, "probe", view->actions);
}

void replacement_lab_view(const ReplacementState *state, ReplacementLabView *view) {
  memset(view, 0, sizeof(*view));
  view->revision = state->revision;
  view->phase = state->phase;
  view->page = state->lab_page;
  view->expedition = "Material trail";
  view->sample_present = state->phase == REPLACEMENT_RECEIVED;
  view->incoming_sample = state->phase == REPLACEMENT_COMPLETE;
  if (view->sample_present) view->supplies = state->supplies_awarded - state->supplies_spent;
  else if (view->incoming_sample) view->supplies = state->supplies_awarded;
  view->study_cost = 1;
  view->finding = state->finding;
  view->unknown_regions = 2;
  view->observation = state->event;
  view->action_count = device_actions(state, "lab", view->actions);
}
