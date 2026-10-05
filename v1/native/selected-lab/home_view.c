#include "home_view.h"
#include "resident_gallery_view.h"
#include "core_art.h"
#include <inttypes.h>
#include <stdio.h>
#include <string.h>

static unsigned known_topics(const SelectedLab *lab) {
  unsigned count = 0;
  for (unsigned sample = 0; sample < lab->game.sample_count; ++sample) {
    SelectedResearchView view;
    if (selected_lab_research_view(lab, sample, &view))
      count += view.completed_methods;
  }
  return count;
}

static unsigned revealed_residents(const GameState *game) {
  unsigned count = 0;
  for (unsigned resident = 0; resident < game->individual_count; ++resident)
    count += game->individuals[resident].revealed;
  return count;
}

static unsigned preview_resident(const SelectedLab *lab) {
  if (lab->resident < lab->game.individual_count &&
      lab->game.individuals[lab->resident].revealed)
    return lab->resident;
  for (unsigned resident = 0; resident < lab->game.individual_count; ++resident)
    if (lab->game.individuals[resident].revealed) return resident;
  return 0;
}

static void overview(const SelectedLab *lab,
                     const SelectedLabRenderContext *context,
                     unsigned topics, unsigned residents, LabHomeView *out) {
  const GameState *game = &lab->game;
  const char *names[] = {"EXPLORE", "RESEARCH", "INCUBATOR", "HABITAT"};
  for (unsigned section = 0; section < 4; ++section)
    strcpy(out->overview[section].name, names[section]);
  strcpy(out->overview[0].status,
      context && context->haul == SELECTED_HAUL_WAITING ? "Supplies waiting" :
      context && context->haul == SELECTED_HAUL_STORED ? "Cargo transferred" :
      lab->kit_mode ? "Received records" : game->expedition_active ? "Gathering" :
      game->expedition_id[0] ? (game_transfer_available(game) ? "Haul ready" : "Paused") :
      "At the Station");
  if (context && context->haul != SELECTED_HAUL_NONE) {
    strcpy(out->overview[0].detail[0], context->haul == SELECTED_HAUL_WAITING
        ? "Open Explore to accept" : "Expedition ended");
    uint64_t incoming = (uint64_t)context->incoming[0] + context->incoming[1] + context->incoming[2];
    if (context->haul == SELECTED_HAUL_WAITING)
      snprintf(out->overview[0].detail[1], sizeof(out->overview[0].detail[1]),
          "%" PRIu64 " incoming unit%s", incoming / GAME_SUPPLY_UNIT,
          incoming == GAME_SUPPLY_UNIT ? "" : "s");
    else strcpy(out->overview[0].detail[1], "Stored in Station stock");
  } else if (lab->kit_mode) {
    snprintf(out->overview[0].detail[0], sizeof(out->overview[0].detail[0]),
        "%u received outing%s", game->received_count, game->received_count == 1 ? "" : "s");
    out->overview[0].detail[1][0] = 0;
  } else if (game->expedition_id[0]) {
    snprintf(out->overview[0].detail[0], sizeof(out->overview[0].detail[0]),
        "%u / 60 seconds", game->expedition_elapsed);
    strcpy(out->overview[0].detail[1], game->expedition_active ? "Expedition active" :
        game_transfer_available(game) ? "Ready to return" :
        game->expedition_elapsed < GAME_EXPEDITION_SECONDS ? "Continue on Companion" : "Finish on Companion");
  } else {
    strcpy(out->overview[0].detail[0], "No expedition");
    strcpy(out->overview[0].detail[1], "Choose a route");
  }
  snprintf(out->overview[1].status, sizeof(out->overview[1].status),
      "%u sample%s", game->sample_count, game->sample_count == 1 ? "" : "s");
  snprintf(out->overview[1].detail[0], sizeof(out->overview[1].detail[0]),
      "%u finding%s", topics, topics == 1 ? "" : "s");
  snprintf(out->overview[1].detail[1], sizeof(out->overview[1].detail[1]), "%s",
      lab->sample < game->sample_count ? game->samples[lab->sample].id : "Awaiting samples");
  strcpy(out->overview[2].status, game->incubation_ready ? "Ready to open" :
      game->incubation_active ? "Incubating" : "Resting");
  if (game->incubation_active || game->incubation_ready) {
    snprintf(out->overview[2].detail[0], sizeof(out->overview[2].detail[0]),
        "%u / %u seconds", game->incubation_elapsed, GAME_INCUBATION_SECONDS);
    strcpy(out->overview[2].detail[1], "Of active play");
  } else strcpy(out->overview[2].detail[0], "No incubation");
  snprintf(out->overview[3].status, sizeof(out->overview[3].status),
      "%u resident%s", residents, residents == 1 ? "" : "s");
  if (residents) {
    strcpy(out->overview[3].detail[0], "Revealed population");
    strcpy(out->overview[3].detail[1], "Saved individual records");
  } else strcpy(out->overview[3].detail[0], "No mibi revealed");
}

static void explore(const SelectedLab *lab,
                    const SelectedLabRenderContext *context, LabHomeView *out) {
  const GameState *game = &lab->game;
  if (context && context->haul != SELECTED_HAUL_NONE) {
    int waiting = context->haul == SELECTED_HAUL_WAITING;
    strcpy(out->landing.heading, waiting ? "SUPPLIES WAITING AT THE STATION" : "SOURCE CARGO EMPTY");
    strcpy(out->landing.body, waiting ? "Open Explore to accept this haul." : "Expedition ended.");
    out->landing.show_resources = out->landing.primary_resources = waiting;
    out->landing.art = LAB_HOME_ART_EXPLORE;
    for (unsigned resource = 0; resource < 3; ++resource)
      out->landing.amounts[resource] = waiting ? context->incoming[resource] / GAME_SUPPLY_UNIT : 0;
    strcpy(out->landing.strip, waiting ? "Incoming supplies are separate from Station stock." :
        "The accepted haul is included in Station stock.");
    return;
  }
  if (lab->kit_mode) {
    strcpy(out->landing.heading, "RECEIVED EXPEDITIONS");
    snprintf(out->landing.body, sizeof(out->landing.body), "%u expedition record%s received",
        game->received_count, game->received_count == 1 ? "" : "s");
    out->landing.art = LAB_HOME_ART_EXPLORE;
    strcpy(out->landing.details[0], "Recorded routes and findings");
    strcpy(out->landing.details[1], "Accepted supplies and samples");
    out->landing.strip[0] = '\0';
    return;
  }
  strcpy(out->landing.heading, game->expedition_active ? "EXPEDITION GATHERING" :
      game->expedition_id[0] ? "HAUL READY TO RETURN" : "NO EXPEDITION ACTIVE");
  out->landing.show_resources = 1;
  if (!game->expedition_id[0]) {
    strcpy(out->landing.body, "Choose an expedition route.");
    strcpy(out->landing.details[0], "Possible finds");
    strcpy(out->landing.strip, "No cargo loaded");
    return;
  }
  snprintf(out->landing.body, sizeof(out->landing.body), "%u / 60 s of active play", game->expedition_elapsed);
  out->landing.show_progress = 1;
  out->landing.progress = game->expedition_elapsed > GAME_EXPEDITION_SECONDS
      ? GAME_EXPEDITION_SECONDS : game->expedition_elapsed;
  out->landing.total = GAME_EXPEDITION_SECONDS;
  out->landing.amounts[0] = game->expedition_data / GAME_SUPPLY_UNIT;
  out->landing.amounts[1] = game->expedition_energy / GAME_SUPPLY_UNIT;
  out->landing.amounts[2] = game->expedition_essence / GAME_SUPPLY_UNIT;
  uint64_t cargo = (uint64_t)game->expedition_data + game->expedition_energy + game->expedition_essence;
  snprintf(out->landing.strip, sizeof(out->landing.strip), "Collected %" PRIu64 " / 40 units", cargo / GAME_SUPPLY_UNIT);
}

static void incubation(const SelectedLab *lab, LabHomeView *out) {
  const GameState *game = &lab->game;
  strcpy(out->landing.heading, game->incubation_ready ? "READY TO OPEN" :
      game->incubation_active ? "INCUBATING" : "NO INCUBATION");
  if (game->incubation_active || game->incubation_ready) {
    out->landing.art = LAB_HOME_ART_SAMPLE;
    snprintf(out->landing.body, sizeof(out->landing.body), "%u / %u s of active play",
        game->incubation_elapsed, GAME_INCUBATION_SECONDS);
    out->landing.show_progress = 1;
    out->landing.progress = game->incubation_elapsed > GAME_INCUBATION_SECONDS
        ? GAME_INCUBATION_SECONDS : game->incubation_elapsed;
    out->landing.total = GAME_INCUBATION_SECONDS;
    if (game->incubation_sample < game->sample_count)
      snprintf(out->landing.details[0], sizeof(out->landing.details[0]), "Source: %s",
          game->samples[game->incubation_sample].id);
    return;
  }
  int prepared = 0;
  for (unsigned sample = 0; sample < game->sample_count; ++sample) {
    SelectedResearchView view;
    prepared |= selected_lab_research_view(lab, sample, &view) &&
                view.complete && !game->samples[sample].incubated;
  }
  strcpy(out->landing.body, prepared ? "A researched sample is ready to prepare." :
      "Complete the supported reference knowledge first.");
  strcpy(out->landing.strip, prepared ? "Choose the sample in Research to see its requirements." :
      "Prepare incubation from Research.");
}

static int copy_home_view(const SelectedLab *lab,
                           const SelectedLabRenderContext *context,
                           int normalization_pending, LabHomeView *out) {
  if (!lab || !out || lab->page != V1_HOME || lab->focus >= 5 ||
      lab->game.sample_count > GAME_MAX_SAMPLES ||
      lab->game.individual_count > GAME_MAX_INDIVIDUALS ||
      (context && (unsigned)context->haul > SELECTED_HAUL_STORED)) return 0;
  /* Reject malformed fixed backing before string copying or provenance checks. */
  if (lab->storage_error && !memchr(lab->message, 0, sizeof(lab->message))) return 0;
  for (unsigned sample = 0; sample < lab->game.sample_count; ++sample) {
    if (!memchr(lab->game.samples[sample].id, 0, sizeof(lab->game.samples[sample].id)) ||
        !memchr(lab->game.sample_metadata[sample].content_version, 0,
                sizeof(lab->game.sample_metadata[sample].content_version))) return 0;
  }
  unsigned residents = revealed_residents(&lab->game);
  if (residents) {
    unsigned selected = preview_resident(lab);
    const GameIndividual *individual = &lab->game.individuals[selected];
    const GameIndividualMetadata *metadata = &lab->game.individual_metadata[selected];
    if (!memchr(individual->id, 0, sizeof(individual->id))) return 0;
    if (lab->focus == 4 &&
        (!memchr(individual->art_id, 0, sizeof(individual->art_id)) ||
         !memchr(individual->art_version, 0, sizeof(individual->art_version)) ||
         !memchr(metadata->original_art_version, 0, sizeof(metadata->original_art_version)) ||
         !memchr(metadata->original_art_sha256, 0, sizeof(metadata->original_art_sha256)))) return 0;
  }
  memset(out, 0, sizeof(*out));
  out->focus = lab->focus;
  out->suspended = lab->suspended;
  for (unsigned button = 0; button < 10; ++button)
    out->pressed |= lab->gestures[button].held && lab->gestures[button].allowed;
  const GameState *game = &lab->game;
  const unsigned stock[] = {game->data, game->energy, game->essence};
  for (unsigned resource = 0; resource < 3; ++resource) {
    out->stock[resource] = stock[resource] / GAME_SUPPLY_UNIT;
    strcpy(out->stock_units[resource], stock[resource] == GAME_SUPPLY_UNIT ? "unit" : "units");
  }
  const char *titles[] = {"Overview - Station", "Overview - Explore", "Overview - Research",
                         "Overview - Incubator", "Overview - Habitat"};
  strcpy(out->title, titles[lab->focus]);
  unsigned topics = known_topics(lab);
  overview(lab, context, topics, residents, out);
  if (lab->focus == 1) explore(lab, context, out);
  else if (lab->focus == 2) {
    out->landing.art = LAB_HOME_ART_RESEARCH;
    snprintf(out->landing.heading, sizeof(out->landing.heading), "%u retained sample%s",
        game->sample_count, game->sample_count == 1 ? "" : "s");
    snprintf(out->landing.body, sizeof(out->landing.body), "%u findings recorded", topics);
    strcpy(out->landing.details[0], "Choose a sample in Research.");
    strcpy(out->landing.strip, game->sample_count ? "Each sample has its own evidence and next investigations." :
        "Bring a sample to the Station to begin.");
  } else if (lab->focus == 3) incubation(lab, out);
  else if (lab->focus == 4) {
    if (!selected_lab_resident_gallery_projection(lab, &out->gallery)) return 0;
    snprintf(out->title, sizeof(out->title), "HABITAT / %u resident%s", residents, residents == 1 ? "" : "s");
    strcpy(out->landing.heading, "No revealed residents yet");
    strcpy(out->landing.body, "");
  }
  if (lab->storage_error) {
    snprintf(out->warning, sizeof(out->warning), "%s", lab->message);
    strcpy(out->footer, "Up/down: focus | Right: inspect | Confirm: act | Back: return");
  } else if (lab->focus == 0) strcpy(out->footer, "Up/down: preview workspaces");
  else snprintf(out->footer, sizeof(out->footer),
      "Up/down: preview | Confirm: enter %s | Back: Overview", selected_lab_focus(lab));
  if (normalization_pending)
    strcpy(out->warning, "Accept the existing haul before supply conversion can finish.");
  return 1;
}

int selected_lab_home_view(const SelectedLab *lab,
    const SelectedLabRenderContext *context, int normalization_pending,
    LabHomeView *out) {
  if (!out) return 0;
  LabHomeView view;
  if (!copy_home_view(lab, context, normalization_pending, &view)) return 0;
  *out = view;
  return 1;
}
