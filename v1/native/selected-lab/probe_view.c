#include "probe_view.h"
#include "expedition.h"
#include "cargo_view.h"
#include "expedition_render.h"
#include <stdio.h>
#include <string.h>

int kit_probe_projection(const DeviceKit *kit, CompanionProbeView *out) {
  if (!kit || !out || !kit->lab) return 0;
  const KitView *view = &kit->companion;
  int selector = view->page == COMP_MODES;
  if (selector && view->mode > COMP_FRIENDS) return 0;
  if (!selector && view->page != COMP_PROBE && view->page != COMP_FIELD_SITE) return 0;
  memset(out, 0, sizeof(*out));
  out->selector = selector;
  out->failed = kit->failed || kit->lab->storage_error;
  out->suspended = view->suspended;
  out->revision = view->revision;
  out->epoch = view->epoch;
  out->focus = view->focus;
  out->active_mode = view->mode;
  out->result = view->field_result;
  for (unsigned button = 0; button < 10; ++button) {
    out->held |= view->gestures[button].held;
    out->pressed |= view->gestures[button].held && view->gestures[button].allowed;
  }
  if (!kit_cargo_facts(kit, &out->cargo)) return 0;
  int has_field = kit_field_projection(kit, &out->field);
  const GameState *game = &kit->lab->game;
  unsigned transfer = kit->journal.phase;
  int sealed = transfer >= KIT_WAITING && transfer <= KIT_ACK_PENDING;
  int live = has_field && game_field_finite(game) && game->expedition_id[0] &&
             out->field.map.avatar_visible && !sealed && !out->cargo.accepted;
  out->finite = game_field_finite(game);
  out->phase = out->failed ? PROBE_UNAVAILABLE : out->cargo.accepted ? PROBE_ENDED :
      sealed ? PROBE_SENT : live ? (view->page == COMP_FIELD_SITE && !out->result ? PROBE_SITE : PROBE_MAP) :
      game->expedition_id[0] ? PROBE_RETAINED : PROBE_ENTRY;
  const char *title = out->failed ? "Storage unavailable / progress preserved" : live ? out->field.location :
      out->phase == PROBE_ENDED ? "Expedition ended" : out->phase == PROBE_SENT ? "Expedition sent" :
      out->phase == PROBE_RETAINED ? "Return retained cargo" : "Choose an expedition";
  snprintf(out->title, sizeof(out->title), "%s", title);
  snprintf(out->status, sizeof(out->status), "%s", out->failed ? "Storage unavailable / progress preserved" :
      out->phase == PROBE_SENT ? kit_stage(kit) : out->phase == PROBE_ENDED ?
      (transfer == KIT_COMPLETE ? "Cargo transferred / choose a new outing" : "Station accepted / receipt pending") :
      out->phase == PROBE_RETAINED ? "Collection ended / return cargo or finish" :
      live ? "Explore retained supply offers" : "");
  snprintf(out->context, sizeof(out->context), "%s", out->status);
  out->free_slots = 40 - (out->cargo.supplies[0] + out->cargo.supplies[1] + out->cargo.supplies[2]);
  if (live) {
    unsigned count = 0;
    while (count < 3 && kit_field_choice(kit, count) != KIT_FIELD_NO_CHOICE) ++count;
    unsigned choice = kit_field_choice(kit, view->page == COMP_FIELD_SITE ? view->focus : 0);
    const char *names[] = {"Data", "Energy", "Essence"};
    if (count > 1) {
      strcpy(out->context, out->field.current_site == 0 ?
             (out->phase == PROBE_SITE ? "Choose recovered supplies" : "Recovered supplies") :
             (out->phase == PROBE_SITE ? "Choose a finding" : "Supplies and a trace"));
      if (out->field.current_site == 0)
        snprintf(out->source, sizeof(out->source), "Data %u / Energy %u / Essence %u", game->field.remaining[0],
                 game->field.remaining[1], game->field.remaining[2]);
      else snprintf(out->source, sizeof(out->source), "%u free slots / supplies or a trace", out->free_slots);
    } else if (choice < GAME_FIELD_SOURCES) {
      snprintf(out->context, sizeof(out->context), "Take %u %s", game->field.remaining[choice],
               names[game_field_source_resource(choice)]);
      snprintf(out->source, sizeof(out->source), "%u available / %u free slots", game->field.remaining[choice], out->free_slots);
    } else if (choice == KIT_FIELD_TRACE) {
      strcpy(out->context, "Read the trace");
      strcpy(out->source, "Unread trace remains available");
    } else if (choice == KIT_FIELD_CAPSULE) {
      strcpy(out->context, "Collect sealed sample");
      strcpy(out->source, "Contents unknown / separate sample slot");
    } else {
      strcpy(out->context, out->field.map.site_collected[4] ? "Sample collected / contents unknown" :
             out->field.current_site < 5 ? "Place cleared" : "Follow a visible trail");
      snprintf(out->source, sizeof(out->source), "%u free supply slots", out->free_slots);
    }
    if (out->phase == PROBE_SITE && choice < GAME_FIELD_SOURCES)
      snprintf(out->source, sizeof(out->source), "%u %s available / %u free slots", game->field.remaining[choice],
               names[game_field_source_resource(choice)], out->free_slots);
    if (!selector && !out->failed && out->phase == PROBE_SITE) {
      out->action_count = count;
      for (unsigned action = 0; action < count; ++action) {
        out->choices[action] = kit_field_choice(kit, action);
        if (out->choices[action] < GAME_FIELD_SOURCES)
          out->choice_material[action] = 1 + game_field_source_resource(out->choices[action]);
        snprintf(out->actions[action], sizeof(out->actions[action]), "%s", kit_option(kit, KIT_COMPANION, action));
      }
    }
    snprintf(out->footer, sizeof(out->footer), "%s", out->result ? "Directions: continue / Back: map" :
        out->phase == PROBE_SITE ? "Directions: choose / Confirm: act / Back: map" :
        count > 1 ? "Confirm: choose / Back: modes" : choice == KIT_FIELD_TRACE ? "Confirm: read / Back: modes" :
        count ? "Confirm: collect / Back: modes" : "Directions: move / Back: modes");
  } else if (!selector && !out->failed) {
    out->action_count = kit_option_count(kit, KIT_COMPANION);
    if (out->action_count > 3) return 0;
    for (unsigned action = 0; action < out->action_count; ++action)
      snprintf(out->actions[action], sizeof(out->actions[action]), "%s", kit_option(kit, KIT_COMPANION, action));
    strcpy(out->footer, "Confirm: enter / Back: modes");
    if (out->phase == PROBE_ENTRY) {
      strcpy(out->context, "Explore places");
      strcpy(out->source, "Collect supplies / follow traces");
    }
  }
  if (view->message[0] && !out->failed)
    snprintf(out->context, sizeof(out->context), "%s", view->message);
  if (!strcmp(view->message, "Receipt confirmed. Choose a new expedition."))
    strcpy(out->context, "Receipt confirmed / choose a new outing");
  if (out->failed) strcpy(out->source, "Actions unavailable / cargo preserved");
  if (selector) {
    strcpy(out->title, "Companion");
    out->action_count = 3;
    out->focus = view->mode;
    const char *modes[] = {"Probe", "Cargo", "Companions"};
    for (unsigned mode = 0; mode < 3; ++mode)
      snprintf(out->actions[mode], sizeof(out->actions[mode]), "%s", modes[mode]);
    snprintf(out->mode_detail[0], sizeof(out->mode_detail[0]), "%s",
        out->failed ? "Storage unavailable / progress preserved" : live ? out->field.location :
        out->phase == PROBE_SENT ? "Expedition sent" :
        out->phase == PROBE_ENDED ? "Expedition ended" :
        out->phase == PROBE_RETAINED ? "Cargo retained" : "Explore\n3 expeditions");
    snprintf(out->mode_detail[1], sizeof(out->mode_detail[1]),
        "Supplies %u / 40\nSamples %u / %u",
        out->cargo.supplies[0] + out->cargo.supplies[1] + out->cargo.supplies[2],
        out->cargo.capsules, out->cargo.capsule_capacity);
    unsigned residents = kit_resident_count(kit);
    snprintf(out->mode_detail[2], sizeof(out->mode_detail[2]), "%s",
        residents ? "Your mibis" : "No mibis yet");
    out->resident_count = residents;
    out->footer[0] = 0;
  }
  return 1;
}
