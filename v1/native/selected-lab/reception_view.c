#include "reception_view.h"
#include "expedition.h"
#include "expedition_render.h"
#include <stdio.h>
#include <string.h>

static int arrival_sources_valid(const DeviceKit *kit) {
  const GameState *game = &kit->lab->game;
  if (game->sample_count > GAME_MAX_SAMPLES ||
      !memchr(kit->journal.haul_id, 0, sizeof(kit->journal.haul_id)) ||
      !memchr(game->expedition_id, 0, sizeof(game->expedition_id)) ||
      !memchr(kit->companion.message, 0, sizeof(kit->companion.message)) ||
      !memchr(kit->sealed_field.expedition_id, 0, sizeof(kit->sealed_field.expedition_id)) ||
      !memchr(kit->sealed_field.sample_id, 0, sizeof(kit->sealed_field.sample_id)))
    return 0;
  for (unsigned index = 0; index < game->sample_count; ++index) {
    const GameSample *sample = &game->samples[index];
    if (!memchr(sample->id, 0, sizeof(sample->id)) ||
        !memchr(sample->origin_expedition_id, 0, sizeof(sample->origin_expedition_id)))
      return 0;
  }
  for (unsigned index = 0; index < GAME_OPERATION_SLOTS; ++index)
    if (!memchr(game->operations[index].id, 0, sizeof(game->operations[index].id)))
      return 0;
  if (game->field.version && !game_field_valid(game)) return 0;
  if (kit->sealed_field.version && !game_received_valid(&kit->sealed_field)) return 0;
  return 1;
}

static int received_sources_valid(const DeviceKit *kit) {
  const GameState *game = &kit->lab->game;
  if (game->received_count > GAME_FIELD_HISTORY ||
      game->received_count > EXPEDITION_VIEW_RECORDS ||
      game->received_cursor >= GAME_FIELD_HISTORY || kit->received_detail > 1)
    return 0;
  /* Guard the ring and every source label before the existing projection writes
   * its copied label array or reads an identifier/map coordinate. */
  for (unsigned index = 0; index < game->received_count; ++index) {
    unsigned position = (game->received_cursor + GAME_FIELD_HISTORY - 1u - index) %
                        GAME_FIELD_HISTORY;
    if (!game_received_valid(&game->received[position])) return 0;
  }
  return 1;
}

static void arrival_projection(const DeviceKit *kit, LabReceptionView *out) {
  const GameState *game = &kit->lab->game;
  unsigned phase = kit->journal.phase;
  ExpeditionFieldView field = {0};
  int map_outing = kit_field_projection(kit, &field);
  /* The game commit may survive a failed receipt-sidecar write. Preserve the
   * existing operation-evidence projection for that COMMITTING recovery case. */
  int accepted = kit_delivery_accepted(kit);
  int failed = kit->failed || kit->lab->storage_error;

  strcpy(out->incoming_title, "FROM COMPANION");
  strcpy(out->status, accepted ? "Cargo transferred / source empty" :
                                "Supplies waiting at the Station");
  strcpy(out->hint, accepted ? "The haul is included in Station stock." :
                              "Store haul / End expedition");
  for (unsigned resource = 0; resource < 3; ++resource)
    out->incoming[resource] = accepted ? 0 :
        kit->journal.cargo[resource] / GAME_SUPPLY_UNIT;

  const GameSample *sample = kit_received_sample(kit);
  /* kit_received_sample intentionally waits for ACK_PENDING. A committed map
   * haul can already have a saved sample while its receipt sidecar has failed. */
  if (accepted && !sample && map_outing && phase == KIT_COMMITTING) {
    for (unsigned index = 0; index < game->sample_count; ++index) {
      if (!strcmp(game->samples[index].origin_expedition_id, field.outing_id)) {
        sample = &game->samples[index];
        break;
      }
    }
  }
  if (accepted && sample)
    snprintf(out->sample, sizeof(out->sample), "Sample recorded: %s", sample->id);
  else if (accepted)
    strcpy(out->sample, "Supplies saved / no sample recorded");
  else if (map_outing)
    strcpy(out->sample, field.capsule_count ?
        "Sealed sample waiting / contents unknown" :
        "Supplies only / no sample collected");
  else
    strcpy(out->sample, kit->journal.elapsed < GAME_EXPEDITION_SECONDS ?
        "Supplies only / no sample" : game->sample_count < GAME_MAX_SAMPLES ?
        "Sample ready to record" : "Sample shelf full / supplies only");

  out->can_accept = phase == KIT_ARRIVED && !failed && !out->suspended;
  if (failed)
    strcpy(out->warning, accepted ? "Delivery committed. Receipt recovery needed." :
                                   "Storage unavailable. Cargo preserved.");
  else if (phase == KIT_COMMITTING)
    strcpy(out->warning, "Saving haul at the Station");
  else if (phase == KIT_ACK_PENDING)
    strcpy(out->warning, "Waiting for Companion receipt");
  else if (phase == KIT_COMPLETE)
    strcpy(out->warning, "Companion receipt confirmed");

  strcpy(out->footer, kit->caller_valid ? "Back: return to your previous screen" :
                                        "Back: Station overview");
}

int kit_reception_projection(const DeviceKit *kit, LabReceptionView *out) {
  if (!kit || !kit->lab || !out || !kit_lab_explore(kit)) return 0;
  memset(out, 0, sizeof(*out));
  const SelectedLab *lab = kit->lab;
  const GameState *game = &lab->game;
  out->stock[0] = game->data / GAME_SUPPLY_UNIT;
  out->stock[1] = game->energy / GAME_SUPPLY_UNIT;
  out->stock[2] = game->essence / GAME_SUPPLY_UNIT;
  out->suspended = lab->suspended;
  for (unsigned button = 0; button < 10; ++button)
    out->pressed |= lab->gestures[button].held && lab->gestures[button].allowed;

  unsigned phase = kit->journal.phase;
  if (phase > KIT_COMPLETE) return 0;
  if (phase == KIT_ARRIVED || phase == KIT_COMMITTING ||
      (kit->caller_valid && (phase == KIT_ACK_PENDING || phase == KIT_COMPLETE))) {
    if (!arrival_sources_valid(kit)) return 0;
    out->mode = LAB_RECEPTION_ARRIVAL;
    arrival_projection(kit, out);
    return 1;
  }

  if (!received_sources_valid(kit) ||
      !kit_received_projection(kit, kit->received_selected, &out->received)) return 0;
  for (unsigned site=0; site<EXPEDITION_SITE_COUNT; ++site) {
    if (!out->received.map.site_visible[site]) {
      out->received.map.site_x[site] = 0;
      out->received.map.site_y[site] = 0;
    }
  }
  if (!out->received.record_count) out->received.detail = 0;
  out->mode = !out->received.record_count ? LAB_RECEPTION_LOG_EMPTY :
      out->received.detail ? LAB_RECEPTION_LOG_DETAIL : LAB_RECEPTION_LOG_LIST;
  strcpy(out->status, "Received expeditions");
  strcpy(out->footer, out->received.detail ? "Back: expedition log" :
      out->received.record_count ? "Up/Down: choose / Confirm: details / Back: Station overview" :
                                  "Back: Station overview");
  if (kit->failed || lab->storage_error)
    strcpy(out->warning, "Storage unavailable. Received records preserved.");
  return 1;
}
