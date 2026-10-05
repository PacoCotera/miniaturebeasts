#include "store.h"
#include "save_bytes.h"
#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <string.h>

static int serialize(char *buffer, size_t capacity, const ReplacementState *state) {
  return snprintf(buffer, capacity,
      "CRITTER_REPLACEMENT 1\nprofile " REPLACEMENT_PROFILE
      "\nrevision %" PRIu64 "\nphase %u\nlab_page %u\nprobe_summary %u"
      "\nelapsed_ms %" PRIu64 "\nsupplies_awarded %u\nsupplies_spent %u"
      "\nsample_sealed %u\nevent %u\nfinding %u\nclock_epoch %s"
      "\nclock_offset_ms %" PRIu64 "\nreceipt_id %s\nreceipt_payload %s"
      "\nreceipt_revision %" PRIu64 "\n",
      state->revision, (unsigned)state->phase, (unsigned)state->lab_page,
      state->probe_summary, state->elapsed_ms, state->supplies_awarded,
      state->supplies_spent, state->sample_sealed, (unsigned)state->event,
      state->finding, state->clock_epoch, state->clock_offset_ms,
      state->receipt_id, state->receipt_payload, state->receipt_revision);
}

int replacement_store_read(const char *path, ReplacementState *state) {
  FILE *file = fopen(path, "r");
  if (!file) {
    if (errno == ENOENT) {
      replacement_init(state);
      return 0;
    }
    return -1;
  }
  char data[2048], canonical[2048];
  size_t length = fread(data, 1, sizeof(data) - 1, file);
  int failed = ferror(file);
  int extra = fgetc(file);
  if (fclose(file)) failed = 1;
  data[length] = 0;
  if (failed || extra != EOF) return -1;
  ReplacementState parsed;
  replacement_init(&parsed);
  unsigned phase, page, event;
  int fields = sscanf(data,
      "CRITTER_REPLACEMENT 1\nprofile " REPLACEMENT_PROFILE
      "\nrevision %" SCNu64 "\nphase %u\nlab_page %u\nprobe_summary %u"
      "\nelapsed_ms %" SCNu64 "\nsupplies_awarded %u\nsupplies_spent %u"
      "\nsample_sealed %u\nevent %u\nfinding %u\nclock_epoch %64s"
      "\nclock_offset_ms %" SCNu64 "\nreceipt_id %64s\nreceipt_payload %255s"
      "\nreceipt_revision %" SCNu64 "\n",
      &parsed.revision, &phase, &page, &parsed.probe_summary, &parsed.elapsed_ms,
      &parsed.supplies_awarded, &parsed.supplies_spent, &parsed.sample_sealed,
      &event, &parsed.finding, parsed.clock_epoch, &parsed.clock_offset_ms,
      parsed.receipt_id, parsed.receipt_payload, &parsed.receipt_revision);
  if (fields != 15) return -1;
  parsed.phase = (ReplacementPhase)phase;
  parsed.lab_page = (ReplacementLabPage)page;
  parsed.event = (ReplacementEvent)event;
  if (!replacement_valid(&parsed)) return -1;
  int expected = serialize(canonical, sizeof(canonical), &parsed);
  if (expected < 0 || (size_t)expected != length || memcmp(data, canonical, length))
    return -1;
  *state = parsed;
  return 0;
}

int replacement_store_write(const char *path, const ReplacementState *state) {
  if (!replacement_valid(state)) return -1;
  char data[2048];
  int length = serialize(data, sizeof(data), state);
  if (length < 0 || (size_t)length >= sizeof(data)) return -1;
  return save_bytes_write(path, data, (size_t)length);
}
