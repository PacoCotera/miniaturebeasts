#include "cargo_view.h"
#include "expedition_render.h"
#include <inttypes.h>
#include <stdio.h>
#include <string.h>

int kit_cargo_facts(const DeviceKit *kit, CompanionCargoFacts *out) {
  if (!kit || !out || !kit->lab)
    return 0;
  memset(out, 0, sizeof(*out));
  const GameState *game = &kit->lab->game;
  unsigned phase = kit->journal.phase;
  int sealed = phase >= KIT_WAITING && phase <= KIT_ACK_PENDING;
  ExpeditionFieldView field;
  if (kit_field_projection(kit, &field)) {
    memcpy(out->supplies, field.earned, sizeof(out->supplies));
    memcpy(out->delivered, field.sent, sizeof(out->delivered));
    out->capsules = field.capsule_count;
    out->capsule_capacity = field.capsule_capacity;
    out->accepted = field.delivery_accepted;
    out->delivered_capsules = field.sent_capsule_count;
    snprintf(out->identity, sizeof(out->identity), "%s", field.outing_id);
  } else {
    const uint32_t current[] = {game->expedition_data, game->expedition_energy,
                                game->expedition_essence};
    out->accepted = kit_delivery_accepted(kit);
    out->delivered_capsules = out->accepted && kit_received_sample(kit) ? 1 : 0;
    out->capsule_capacity = 1;
    for (unsigned resource = 0; resource < 3; ++resource) {
      out->delivered[resource] = kit->journal.cargo[resource] / GAME_SUPPLY_UNIT;
      out->supplies[resource] = out->accepted ? 0 :
          (sealed ? kit->journal.cargo[resource] : current[resource]) / GAME_SUPPLY_UNIT;
    }
    snprintf(out->identity, sizeof(out->identity), "%s",
             game->expedition_id[0] ? game->expedition_id : kit->journal.haul_id);
  }
  return 1;
}
static int cargo_task_projection(const DeviceKit *kit, CompanionCargoView *out) {
  const KitView *view = &kit->companion;
  const char *names[] = {"Data", "Energy", "Essence"};
  unsigned page = view->page;
  int finish = page == COMP_FINISH_REVIEW;
  int selector = page == COMP_DISCARD_CLASS || page == COMP_DISCARD_QUANTITY;
  unsigned count = kit_option_count(kit, KIT_COMPANION);
  if (!count || view->focus >= count ||
      (page != COMP_DISCARD_CLASS && !finish && view->discard_resource >= 3))
    return 0;
  out->screen = finish ? COMPANION_FINISH_SCREEN :
      page == COMP_DISCARD_CLASS ? COMPANION_DISCARD_CLASS_SCREEN :
      page == COMP_DISCARD_QUANTITY ? COMPANION_DISCARD_QUANTITY_SCREEN :
      COMPANION_DISCARD_REVIEW_SCREEN;
  out->logical_focus = view->focus;
  out->option_count = count;
  out->first_visible = selector && view->focus >= 2 ? view->focus - 1 : 0;
  out->focus = view->focus - out->first_visible;
  out->selected_resource = page == COMP_DISCARD_CLASS ? view->focus :
                           finish ? 3 : view->discard_resource;
  snprintf(out->title, sizeof(out->title), "%s", finish ? "End expedition?" :
      page == COMP_DISCARD_CLASS ? "Choose item kind" :
      page == COMP_DISCARD_QUANTITY ? "Choose quantity" : "Discard items?");
  snprintf(out->context, sizeof(out->context), "%s", kit_route(kit));
  snprintf(out->footer, sizeof(out->footer), "%s", finish ?
           "Back: Keep exploring" : "Back: Keep items");
  if (finish) {
    snprintf(out->capsule, sizeof(out->capsule), "%s", "No sample / nothing sent to Station");
    snprintf(out->detail, sizeof(out->detail), "%s", "Ends this expedition.\nKeep exploring to stay here.");
  } else if (page == COMP_DISCARD_CLASS) {
    snprintf(out->capsule, sizeof(out->capsule), "%s", view->focus < 3 ? names[view->focus] : "Keep cargo");
    snprintf(out->detail, sizeof(out->detail), "%s", "Choose a kind, then a whole quantity.\nSealed samples stay in cargo.");
  } else {
    unsigned resource = view->discard_resource;
    uint32_t quantity = page == COMP_DISCARD_QUANTITY ?
        (view->focus < count - 1 ? view->focus + 1 : 0) :
        view->discard_quantity / GAME_SUPPLY_UNIT;
    if (page == COMP_DISCARD_REVIEW && (!quantity ||
        view->discard_quantity % GAME_SUPPLY_UNIT || quantity > out->supplies[resource]))
      return 0;
    if (quantity) {
      snprintf(out->capsule, sizeof(out->capsule), "Discard %" PRIu32 " %s?", quantity, names[resource]);
      snprintf(out->detail, sizeof(out->detail), "Keep %" PRIu32 " %s.\nLoss permanent; sealed samples stay.",
               out->supplies[resource] - quantity, names[resource]);
    } else {
      snprintf(out->capsule, sizeof(out->capsule), "%s", "Keep cargo");
      snprintf(out->detail, sizeof(out->detail), "%s", "All items stay in cargo.");
    }
  }
  if (selector && !view->message[0] && !out->failed)
    snprintf(out->feedback, sizeof(out->feedback), "Choice %u / %u", view->focus + 1, count);
  int sealed = out->phase >= KIT_WAITING && out->phase <= KIT_ACK_PENDING;
  int blocked = sealed || out->accepted || !kit->lab->game.expedition_id[0] ||
                (finish && game_transfer_available(&kit->lab->game));
  out->action_count = out->failed || blocked ? 0 : count - out->first_visible;
  if (out->action_count > 2) out->action_count = 2;
  for (unsigned action = 0; action < out->action_count; ++action) {
    unsigned index = out->first_visible + action;
    if (page == COMP_DISCARD_REVIEW && index == 0)
      snprintf(out->actions[action], sizeof(out->actions[action]), "Discard %u %s",
               view->discard_quantity / GAME_SUPPLY_UNIT, names[view->discard_resource]);
    else
      snprintf(out->actions[action], sizeof(out->actions[action]), "%s",
               kit_option(kit, KIT_COMPANION, index));
  }
  if (blocked) {
    snprintf(out->capsule, sizeof(out->capsule), "%s", "Review unavailable");
    snprintf(out->detail, sizeof(out->detail), "%s", sealed || out->accepted ?
             "Transfer already sealed or accepted.\nNo items changed." :
             "Send or discard cargo before ending.\nNo items changed.");
    snprintf(out->footer, sizeof(out->footer), "%s", "Back: return to previous view");
  }
  if (out->failed) {
    snprintf(out->detail, sizeof(out->detail), "%s", "Storage unavailable. Cargo preserved.");
    snprintf(out->footer, sizeof(out->footer), "%s", "Storage recovery required");
  }
  return 1;
}
int kit_cargo_projection(const DeviceKit *kit, CompanionCargoView *out) {
  if (!kit || !out || (kit->companion.page != COMP_CARGO &&
                       !(kit->companion.page == COMP_MODES && kit->companion.mode == COMP_CARGO) &&
                       kit->companion.page != COMP_SEND_REVIEW &&
                       kit->companion.page != COMP_DISCARD_CLASS &&
                       kit->companion.page != COMP_DISCARD_QUANTITY &&
                       kit->companion.page != COMP_DISCARD_REVIEW &&
                       kit->companion.page != COMP_FINISH_REVIEW))
    return 0;
  if (kit->companion.page == COMP_MODES && kit->companion.focus != COMP_CARGO)
    return 0;
  CompanionCargoFacts facts;
  if (!kit_cargo_facts(kit, &facts)) return 0;
  memset(out, 0, sizeof(*out));
  int review = kit->companion.page == COMP_SEND_REVIEW;
  out->screen = review ? COMPANION_SEND_SCREEN : COMPANION_CARGO_SCREEN;
  memcpy(out->supplies, facts.supplies, sizeof(out->supplies));
  memcpy(out->delivered, facts.delivered, sizeof(out->delivered));
  out->capsules = facts.capsules;
  out->capsule_capacity = facts.capsule_capacity;
  out->delivered_capsules = facts.delivered_capsules;
  out->accepted = facts.accepted;
  strcpy(out->identity, facts.identity);
  const KitView *view = &kit->companion;
  out->phase = kit->journal.phase;
  out->failed = kit->failed || kit->lab->storage_error;
  out->focus = view->focus;
  out->selector = view->page == COMP_MODES;
  if (out->selector) out->focus = 0;
  out->selected_resource = 3;
  if (view->mode > COMP_FRIENDS) return 0;
  out->active_mode = view->mode;
  out->revision = view->revision;
  out->epoch = view->epoch;
  out->suspended = view->suspended;
  for (unsigned button = 0; button < 10; ++button) {
    out->held |= view->gestures[button].held;
    out->pressed |= view->gestures[button].held && view->gestures[button].allowed;
  }
  int sealed = out->phase >= KIT_WAITING && out->phase <= KIT_ACK_PENDING;
  int no_outing = !kit->lab->game.expedition_id[0] && !sealed;
  int empty_cargo = !out->supplies[0] && !out->supplies[1] &&
                    !out->supplies[2] && !out->capsules;
  snprintf(out->title, sizeof(out->title), "%s", out->accepted || (no_outing && empty_cargo) ? "Cargo empty" :
           no_outing ? "Stored cargo" :
           sealed ? "Cargo sealed" : review ? "Return to Station" : "Cargo");
  snprintf(out->context, sizeof(out->context), "%s",
           out->accepted ? "Expedition ended" : sealed ? kit_stage(kit) :
           no_outing ? "No active expedition" : kit_route(kit));
  snprintf(out->capsule, sizeof(out->capsule), "%s",
           out->capsules ? "1 sealed sample" : "No sample in cargo");
  if (out->accepted) {
    snprintf(out->capsule, sizeof(out->capsule), "%s", "No sample in cargo");
    snprintf(out->detail, sizeof(out->detail), "%s", "Cargo transferred to Station.");
  } else {
    const char *detail = sealed ? "This expedition cannot resume." :
        no_outing ? (empty_cargo ? "No cargo." :
                                  "Cargo remains here. Nothing sent to Station.") :
        review ? (out->capsules ? "Contents unknown\nSeals cargo; exploration stops."
                               : "Seals cargo; exploration stops.") :
        game_transfer_available(&kit->lab->game) ?
            (out->capsules ? "Contents unknown.\nSending stops collection." :
                             "Sending stops collection.") :
        out->capsules ? "Contents unknown" : "Whole items / source progress retained.";
    snprintf(out->detail, sizeof(out->detail), "%s", detail);
  }
  /* Legacy timed outings record their completed sample on acceptance. Show
   * that expected result separately; it is not an already carried capsule. */
  const GameState *game = &kit->lab->game;
  if (review && !sealed && !out->accepted && !game->field.version &&
      game->expedition_id[0] && game->expedition_elapsed >= GAME_EXPEDITION_SECONDS) {
    if (game->sample_count < GAME_MAX_SAMPLES) {
      snprintf(out->capsule, sizeof(out->capsule), "%s", "Sample ready at Station");
      snprintf(out->detail, sizeof(out->detail), "%s",
               "Recorded on acceptance.\nSeals cargo; exploration stops.");
    } else {
      snprintf(out->capsule, sizeof(out->capsule), "%s", "No sample / Station shelf full");
    }
  }
  uint32_t total = out->supplies[0] + out->supplies[1] + out->supplies[2];
  snprintf(out->capacity, sizeof(out->capacity), "Supplies %" PRIu32 " / %u   Capsules %" PRIu32 " / %" PRIu32,
           total, GAME_CARGO_CAPACITY / GAME_SUPPLY_UNIT, out->capsules, out->capsule_capacity);
  const char *feedback = view->message[0] ? view->message :
      out->accepted ? (out->phase == KIT_COMPLETE ? "Delivery complete / choose a new outing." : "Station accepted / receipt pending.") :
      sealed ? kit_stage(kit) : kit->journal.companion_online ? "Station link available" : "Station offline";
  if (out->failed) {
    snprintf(out->detail, sizeof(out->detail), "%s", out->accepted ?
             "Cargo transferred. Delivery record needs recovery." :
             "Storage unavailable. Cargo preserved.");
    feedback = "Storage unavailable";
  }
  snprintf(out->feedback, sizeof(out->feedback), "%s", feedback);
  if (view->page == COMP_DISCARD_CLASS || view->page == COMP_DISCARD_QUANTITY ||
      view->page == COMP_DISCARD_REVIEW || view->page == COMP_FINISH_REVIEW)
    return cargo_task_projection(kit, out);
  /* Normal sealing returns to Cargo. A restored/defensive sealed review must
   * never offer Keep as cancellation or Send as a second seal operation. */
  out->action_count = out->selector || out->failed || (review && (sealed || out->accepted))
                         ? 0 : kit_option_count(kit, KIT_COMPANION);
  if (out->action_count > 2)
    return 0;
  for (unsigned action = 0; action < out->action_count; ++action)
    snprintf(out->actions[action], sizeof(out->actions[action]), "%s",
             kit_option(kit, KIT_COMPANION, action));
  snprintf(out->footer, sizeof(out->footer), "%s", out->failed ? "Storage recovery required" :
           out->selector ? "Left/Right: modes" :
           review && !sealed && !out->accepted ? "Back: Keep cargo" :
           "Up/Down: choose / Back: modes");
  return 1;
}
