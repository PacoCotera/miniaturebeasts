#include "model.h"
#include "store.h"
#include "save_bytes.h"
#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int error(const char *message) {
  printf("{\"error\":\"%s\"}\n", message);
  return 2;
}
static int number(const char *value, uint64_t *output) {
  if (!*value) return 0;
  for (const char *digit = value; *digit; ++digit)
    if (*digit < '0' || *digit > '9') return 0;
  char *end;
  errno = 0;
  uintmax_t parsed = strtoumax(value, &end, 10);
  if (errno || *end || parsed > UINT64_MAX) return 0;
  *output = (uint64_t)parsed;
  return 1;
}
static void actions(const ReplacementAction *items, size_t count) {
  fputs(",\"actions\":[", stdout);
  for (size_t i = 0; i < count; ++i)
    printf("%s{\"name\":\"%s\",\"label\":\"%s\",\"device\":\"%s\"}",
           i ? "," : "", items[i].name, items[i].label, items[i].device);
  putchar(']');
}
static void operation(const ReplacementState *state, int replayed) {
  if (replayed < 0) return;
  printf(",\"operation\":{\"id\":\"%s\",\"accepted_revision\":%" PRIu64
         ",\"replayed\":%s}", state->receipt_id, state->receipt_revision,
         replayed ? "true" : "false");
}
static void status(const ReplacementState *state, const char *device, int replayed) {
  if (!strcmp(device, "probe")) {
    ReplacementProbeView view;
    replacement_probe_view(state, &view);
    printf("{\"revision\":%" PRIu64 ",\"device\":\"probe\",\"profile\":\"%s\","
           "\"view\":{\"status\":\"%s\",\"expedition\":", view.revision,
           view.profile, view.status);
    if (view.expedition) printf("\"%s\"", view.expedition);
    else fputs("null", stdout);
    printf(",\"elapsed_ms\":%" PRIu64 ",\"target_ms\":%" PRIu64
           ",\"aboard_sealed_samples\":%u,\"aboard_supplies\":%u,"
           "\"event\":%u,\"summary\":%s}", view.elapsed_ms, view.target_ms,
           view.aboard_sealed_samples, view.aboard_supplies, (unsigned)view.event,
           view.summary ? "true" : "false");
    actions(view.actions, view.action_count);
  } else if (!strcmp(device, "lab")) {
    ReplacementLabView view;
    replacement_lab_view(state, &view);
    printf("{\"revision\":%" PRIu64 ",\"device\":\"lab\",\"profile\":\"%s\","
           "\"view\":{\"phase\":%u,\"page\":%u,\"expedition\":\"%s\","
           "\"sample_present\":%s,\"incoming_sample\":%s,\"supplies\":%u,"
           "\"study_cost\":%u,\"finding\":%s,\"form_selected\":false,"
           "\"unknown_regions\":%u,\"observation\":%u,\"form_references\":[%s]}",
           view.revision, REPLACEMENT_PROFILE, (unsigned)view.phase,
           (unsigned)view.page, view.expedition, view.sample_present ? "true" : "false",
           view.incoming_sample ? "true" : "false", view.supplies, view.study_cost,
           view.finding ? "true" : "false", view.unknown_regions,
           (unsigned)view.observation, view.finding ? "\"Layered\",\"Fibrous\"" : "");
    actions(view.actions, view.action_count);
  } else {
    printf("{\"revision\":%" PRIu64 ",\"device\":\"companion\","
           "\"view\":{\"status\":\"empty\"},\"actions\":[]", state->revision);
  }
  operation(state, replayed);
  puts("}");
}

int main(int argc, char **argv) {
  if (argc < 4 || strcmp(argv[1], "--save") || argv[2][0] != '/')
    return error("Expected --save absolute-path status, command or tick");
  int lock = save_bytes_lock(argv[2]);
  if (lock < 0) return error("Save unavailable");
  ReplacementState state;
  if (replacement_store_read(argv[2], &state)) {
    close(lock);
    return error("Save corrupt, unsupported or unavailable; preserved without reset");
  }
  int result = 0;
  if ((argc == 4 || argc == 5) && !strcmp(argv[3], "status")) {
    const char *device = argc == 5 ? argv[4] : "lab";
    if (strcmp(device, "lab") && strcmp(device, "probe") && strcmp(device, "companion"))
      result = error("Unknown device");
    else status(&state, device, -1);
  } else if (argc == 6 && !strcmp(argv[3], "tick")) {
    uint64_t offset;
    int changed = 0;
    const char *failure = number(argv[5], &offset)
        ? replacement_tick(&state, argv[4], offset, &changed) : "Invalid clock offset";
    if (failure) result = error(failure);
    else if (changed && replacement_store_write(argv[2], &state)) {
      error("Save result uncertain; retry same epoch and offset");
      result = 3;
    } else {
      printf("{\"revision\":%" PRIu64 ",\"elapsed_ms\":%" PRIu64
             ",\"changed\":%s}\n", state.revision, state.elapsed_ms,
             changed ? "true" : "false");
    }
  } else if (argc == 9 && !strcmp(argv[3], "command")) {
    uint64_t revision, offset;
    int replayed = 0;
    const char *failure = number(argv[5], &revision) && number(argv[8], &offset)
        ? replacement_command(&state, argv[4], revision, argv[6], argv[7], offset, &replayed)
        : "Invalid command numbers";
    if (failure) result = error(failure);
    else if (!replayed && replacement_store_write(argv[2], &state)) {
      error("Save result uncertain; retry same user operation");
      result = 3;
    } else status(&state, "lab", replayed);
  } else result = error("Unsupported invocation; renderer not implemented");
  close(lock);
  return result;
}
