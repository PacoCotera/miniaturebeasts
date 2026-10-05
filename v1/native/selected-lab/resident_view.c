#include "resident_view.h"
#include "core_art.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

#define TERMINATED(value) (memchr((value), 0, sizeof(value)) != NULL)
int kit_resident_projection(const DeviceKit *kit, CompanionResidentView *out) {
  if (!kit || !kit->lab || !out || kit->companion.mode != COMP_FRIENDS ||
      kit->residents.count > GAME_MAX_INDIVIDUALS ||
      !TERMINATED(kit->selected_resident_id) || !TERMINATED(kit->companion.message)) return 0;
  unsigned page = kit->companion.page;
  if (page != COMP_MODES && page != COMP_FRIENDS && page != COMP_FRIEND_VISIT) return 0;
  if ((page == COMP_MODES && kit->companion.focus != COMP_FRIENDS) ||
      (page == COMP_FRIENDS && kit->companion.focus >= (kit->residents.count ? kit->residents.count : 1)) ||
      (page == COMP_FRIEND_VISIT && (!kit->residents.count || kit->companion.focus > 1))) return 0;
  /* These are the only strings consumed by existing identity/art/form guards.
   * Domain validity remains the saved-state owner's responsibility. */
  for (unsigned index = 0; index < kit->residents.count; ++index) {
    const KitResidentProjection *record = &kit->residents.residents[index];
    if (!TERMINATED(record->individual.id) || !TERMINATED(record->individual.source_sample_id) ||
        !TERMINATED(record->individual.art_id) || !TERMINATED(record->individual.art_version) ||
        !TERMINATED(record->metadata.original_art_version) ||
        !TERMINATED(record->metadata.original_art_sha256) ||
        !TERMINATED(record->metadata.reference_context) || !TERMINATED(record->metadata.mapping_version) ||
        !TERMINATED(record->metadata.candidate_id)) return 0;
  }
  const KitResidentProjection *record = kit_selected_resident(kit);
  if (kit->residents.count && (!record || !record->individual.revealed)) return 0;
  if (record && page == COMP_FRIENDS &&
      kit->companion.focus != (unsigned)(record - kit->residents.residents)) return 0;
  memset(out, 0, sizeof(*out));
  out->count = kit_resident_count(kit);
  out->failed = kit->failed || kit->lab->storage_error;
  out->online = kit->journal.companion_online != 0;
  out->current = kit_resident_cache_current(kit);
  out->portrait = RESIDENT_EMPTY_HABITAT;
  out->screen = page == COMP_MODES ? RESIDENT_PREVIEW : page == COMP_FRIENDS ? RESIDENT_LIST : RESIDENT_VISIT;
  out->focus = page == COMP_MODES ? 0 : kit->companion.focus;
  out->suspended = kit->companion.suspended != 0;
  out->pressed = kit->companion.gestures[8].held && kit->companion.gestures[8].allowed;
  time_t updated = (time_t)kit_residents_updated_at(kit) - 6 * 3600;
  struct tm *snapshot = gmtime(&updated);
  char stamp[16] = "unknown";
  if (kit_residents_updated_at(kit) && snapshot) strftime(stamp, sizeof(stamp), "%H:%M", snapshot);
  snprintf(out->status, sizeof(out->status), "%s / %s %s", out->online ? "Station connected" : "Offline",
      out->current ? "Updated" : "Last Station update", stamp);
  if (record) {
    out->selected_index = (uint32_t)(record - kit->residents.residents);
    out->visits = record->individual.care_visits;
    snprintf(out->identity, sizeof(out->identity), "%s", record->individual.id);
    snprintf(out->coat, sizeof(out->coat), "%s",
             record->individual.expression.pale_markings ? "Pale markings" : "Plain coat");
    unsigned asset;
    out->portrait = RESIDENT_PORTRAIT_PENDING;
    if (selected_lab_original_art(&record->individual, &record->metadata, &asset))
      out->portrait = asset == CORE_ART_PIP_PLAIN ? RESIDENT_PORTRAIT_PLAIN : RESIDENT_PORTRAIT_MARKED;
    const char *form = selected_lab_resident_form_title(&record->individual, &record->metadata);
    if (form && !strcmp(record->metadata.candidate_id, "B1"))
      strcpy(out->property, "Burst capable / Baseline walking energy");
    else if (form && !strcmp(record->metadata.candidate_id, "B0"))
      strcpy(out->property, "Steady / Lower walking energy");
    int reserved = kit->journal.phase >= KIT_WAITING && kit->journal.phase <= KIT_ACK_PENDING;
    int saved_message = !strncmp(kit->companion.message, "Visit saved", 11);
    const char *feedback = kit_resident_visit_available(kit)
        ? saved_message ? "You spent time together. Visit saved."
                        : kit->companion.message[0] ? kit->companion.message : "Spend time together."
        : reserved ? "Finish transfer before visiting."
                   : out->current ? "Visit unavailable for this resident."
                   : saved_message ? "Previous visit saved in Station. Reconnect."
                                   : "Reconnect to the Station to spend time together.";
    snprintf(out->feedback, sizeof(out->feedback), "%s", feedback);
  } else {
    snprintf(out->feedback, sizeof(out->feedback), "%s", out->current
        ? "No revealed residents in the Station." : "Last snapshot only. Reconnect to update.");
  }
  if (out->failed) {
    strcpy(out->status, "Storage unavailable / last snapshot");
    strcpy(out->feedback, "Resident snapshot preserved. Storage recovery required.");
  } else if (kit->resident_cache_failed) {
    snprintf(out->status, sizeof(out->status), "Cache unavailable / last update %s", stamp);
    strcpy(out->feedback, page != COMP_MODES &&
        !strncmp(kit->companion.message, "Visit saved", 11)
        ? "Visit saved in Station. Snapshot stale."
        : "Last snapshot only. Reconnect to the Station to update.");
  }
  if (!out->failed && out->screen == RESIDENT_VISIT) {
    out->action_count = 2;
    out->available[0] = kit_resident_visit_available(kit);
    out->available[1] = 1;
    for (unsigned index = 0; index < 2; ++index)
      snprintf(out->actions[index], sizeof(out->actions[index]), "%s", kit_option(kit, KIT_COMPANION, index));
  } else if (!out->failed && out->screen == RESIDENT_LIST && !out->count) {
    out->action_count = 1;
    out->available[0] = 1;
    snprintf(out->actions[0], sizeof(out->actions[0]), "%s", kit_option(kit, KIT_COMPANION, 0));
  }
  snprintf(out->footer, sizeof(out->footer), "%s", out->failed ? "Storage recovery required" :
      out->screen == RESIDENT_PREVIEW ? "Left/Right: modes" :
      out->screen == RESIDENT_VISIT ? "Confirm: choose / Back: residents" :
      out->count ? "Up/Down: resident / Back: modes" : "Confirm: Probe / Back: modes");
  return 1;
}
#undef TERMINATED
