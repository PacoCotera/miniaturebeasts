#include "action_view.h"
#include "resident_gallery_view.h"
#include "core_art.h"
#include <stdio.h>
#include <string.h>

#define TERMINATED(value) (memchr((value), 0, sizeof(value)) != NULL)

int selected_lab_is_action_page(SelectedPage page) {
  return page == V1_CREATE || page == V1_CREATE_REVIEW || page == V1_INCUBATION ||
      page == V1_REVEAL || page == V1_HABITAT || page == V1_CRITTERS;
}

/* Guard source boundaries before existing helpers inspect their fixed strings.
 * This adapter never repairs state or chooses a replacement resident/genome. */
static int valid_source(const SelectedLab *lab) {
  const GameState *game = &lab->game;
  if (!selected_lab_is_action_page(lab->page) ||
      game->sample_count > GAME_MAX_SAMPLES || game->individual_count > GAME_MAX_INDIVIDUALS ||
      (unsigned)lab->storage_error > 1 || (unsigned)lab->suspended > 1 ||
      game->incubation_active > 1 || game->incubation_ready > 1 ||
      (game->incubation_ready && !game->incubation_active) ||
      game->incubation_elapsed > GAME_INCUBATION_SECONDS || !TERMINATED(lab->message) ||
      (unsigned)lab->creation_draft.valid > 1 ||
      !TERMINATED(lab->creation_draft.sample_id) ||
      !TERMINATED(lab->creation_draft.content_version) ||
      !TERMINATED(lab->creation_draft.candidate_id)) return 0;
  if (game->incubation_active && (game->incubation_sample >= game->sample_count ||
      game->incubation_individual >= game->individual_count)) return 0;
  if ((lab->page == V1_CREATE || lab->page == V1_CREATE_REVIEW) &&
      lab->sample >= game->sample_count) return 0;
  if ((lab->page == V1_REVEAL || lab->page == V1_HABITAT || lab->page == V1_CRITTERS) &&
      game->individual_count && lab->resident >= game->individual_count) return 0;
  for (unsigned index = 0; index < game->sample_count; ++index) {
    const GameSample *sample = &game->samples[index];
    const GameSampleMetadata *metadata = &game->sample_metadata[index];
    if (!TERMINATED(sample->id) || !TERMINATED(sample->origin_expedition_id) ||
        !TERMINATED(metadata->content_version) || sample->incubated > 1 ||
        !pip_sample_metadata_valid(game, index)) return 0;
    if (metadata->profile == GAME_SAMPLE_LEGACY_FIVE &&
        (sample->decoded_studies > PIP_REQUIRED_FACTS_MASK ||
         sample->decoded_facts > PIP_REQUIRED_FACTS_MASK)) return 0;
  }
  for (unsigned index = 0; index < game->individual_count; ++index) {
    const GameIndividual *individual = &game->individuals[index];
    const GameIndividualMetadata *metadata = &game->individual_metadata[index];
    if (!TERMINATED(individual->id) || !TERMINATED(individual->source_sample_id) ||
        !TERMINATED(individual->origin_kind) || !TERMINATED(individual->art_id) ||
        !TERMINATED(individual->art_version) || !TERMINATED(individual->genome.class_id) ||
        !TERMINATED(individual->genome.content_version) || !TERMINATED(individual->genome.rules_version) ||
        !TERMINATED(metadata->candidate_id) || !TERMINATED(metadata->reference_context) ||
        !TERMINATED(metadata->mapping_version) || !TERMINATED(metadata->appearance_descriptor) ||
        !TERMINATED(metadata->original_art_version) || !TERMINATED(metadata->original_art_sha256) ||
        individual->revealed > 1 || individual->art_pending > 1 ||
        individual->expression.pale_markings > 1) return 0;
  }
  unsigned options = selected_lab_options(lab);
  return options && options <= LAB_ACTION_OPTIONS && lab->focus < options;
}

static const char *topic(const SelectedResearchMethod *method) {
  if (!strcmp(method->id, "heritage")) return "Inheritance";
  if (!strcmp(method->id, "movement") || !strcmp(method->id, "movement.drive")) return "Movement";
  if (!strcmp(method->id, "coat-comparison")) return "Coat";
  if (!strcmp(method->id, "effort-comparison") || !strcmp(method->id, "movement.efficiency")) return "Effort";
  if (!strcmp(method->id, "form.crown")) return "Crown";
  if (!strcmp(method->id, "appearance.rings")) return "Eye rings";
  if (!strcmp(method->id, "appearance.markings")) return "Markings";
  return method->title;
}

static int copy_knowledge(const SelectedLab *lab, LabActionView *view) {
  SelectedResearchView knowledge;
  if (!selected_lab_research_view(lab, lab->sample, &knowledge) || knowledge.method_count > 5) return 0;
  strcpy(view->known, "Known: ");
  strcpy(view->missing, "Still: ");
  unsigned known = 0, missing = 0;
  const char *suggested = NULL;
  for (unsigned index = 0; index < knowledge.method_count; ++index) {
    SelectedResearchMethod method;
    if (!selected_lab_research_method(lab, lab->sample, index, &method)) return 0;
    char *line = method.known ? view->known : view->missing;
    unsigned *count = method.known ? &known : &missing;
    size_t length = strlen(line);
    snprintf(line + length, sizeof(view->known) - length, "%s%s", (*count)++ ? " / " : "", topic(&method));
    if (!suggested && method.useful && !method.known) suggested = topic(&method);
  }
  if (!known) strcpy(view->known, "Known: no findings yet");
  if (knowledge.complete) {
    strcpy(view->known, "Known: complete supported form");
    strcpy(view->missing, "No unresolved reference knowledge.");
  }
  if (lab->game.samples[lab->sample].incubated)
    strcpy(view->next, "Sample used / research record stays.");
  else if (suggested) snprintf(view->next, sizeof(view->next), "Suggested: %s", suggested);
  return 1;
}

static int copy_view(const SelectedLab *lab, int normalization_pending, LabActionView *view) {
  const GameState *game = &lab->game;
  view->page = lab->page == V1_CREATE ? LAB_ACTION_CREATE :
      lab->page == V1_CREATE_REVIEW ? LAB_ACTION_REVIEW :
      lab->page == V1_INCUBATION ? LAB_ACTION_INCUBATION :
      lab->page == V1_REVEAL ? LAB_ACTION_REVEAL :
      lab->page == V1_HABITAT ? LAB_ACTION_HABITAT : LAB_ACTION_RESIDENTS;
  const char *titles[] = {"SUPPORTED FORMS", "START INCUBATION?", "INCUBATOR",
      "HELLO, MIBI", "RESIDENT", "POPULATION"};
  snprintf(view->title, sizeof(view->title), "%s", titles[view->page]);
  view->focus = lab->focus;
  view->option_count = selected_lab_options(lab);
  for (unsigned option = 0; option < view->option_count; ++option)
    snprintf(view->options[option], sizeof(view->options[option]), "%s", selected_lab_option(lab, option));
  const unsigned stock[] = {game->data, game->energy, game->essence};
  for (unsigned resource = 0; resource < 3; ++resource)
    view->stock[resource] = stock[resource] / GAME_SUPPLY_UNIT;
  view->storage_error = lab->storage_error;
  view->suspended = lab->suspended;
  snprintf(view->message, sizeof(view->message), "%s", lab->message);
  if (normalization_pending)
    strcpy(view->message, "Accept the existing haul before supply conversion can finish.");
  if (lab->page == V1_CRITTERS) {
    if (!selected_lab_resident_gallery_projection(lab, &view->gallery)) return 0;
    if (view->gallery.count && (lab->focus != view->gallery.selected ||
        !game->individuals[lab->resident].revealed)) return 0;
    snprintf(view->title, sizeof(view->title), "POPULATION / %u resident%s",
        view->gallery.count, view->gallery.count == 1 ? "" : "s");
  }
  if (lab->page == V1_CREATE || lab->page == V1_CREATE_REVIEW) {
    snprintf(view->sample_id, sizeof(view->sample_id), "%s", game->samples[lab->sample].id);
    if (!copy_knowledge(lab, view)) return 0;
    PipSupportedCandidate candidate;
    int review = lab->page == V1_CREATE_REVIEW;
    int permitted = review ? selected_lab_creation_draft(lab, &candidate) :
        selected_lab_candidate(lab, lab->sample, lab->focus, &candidate);
    view->detail = review ? permitted ? LAB_ACTION_REVIEW_VALID : LAB_ACTION_REVIEW_STALE :
        permitted ? LAB_ACTION_CREATE_AVAILABLE : LAB_ACTION_CREATE_LOCKED;
    view->candidate_authorized = !review && permitted;
    view->draft_valid = review && permitted;
    if (!permitted) {
      view->art = LAB_ACTION_ART_TOOLS;
      strcpy(view->heading, review ? "Choose a form again" : "Research is still in progress");
      strcpy(view->body, review ? "This review no longer matches the sample." :
          "Complete this sample's reference knowledge before choosing a form.");
      return 1;
    }
    view->art = candidate.expression.pale_markings ? LAB_ACTION_ART_MARKED : LAB_ACTION_ART_PLAIN;
    strcpy(view->heading, review ? "SELECTED FORM" : "SUPPORTED PREVIEW");
    snprintf(view->form_title, sizeof(view->form_title), "%s", candidate.title);
    snprintf(view->reference_id, sizeof(view->reference_id), "%s", candidate.id);
    strcpy(view->body, review ? "Uses this sample; research record stays." : "Drafting spends nothing.");
    for (unsigned resource = 0; resource < 3; ++resource) view->costs[resource] = 5;
    return 1;
  }
  if (lab->page == V1_INCUBATION) {
    view->duration_ms = GAME_INCUBATION_SECONDS * 1000;
    view->elapsed_ms = game->incubation_elapsed * 1000;
    view->detail = game->incubation_ready ? LAB_ACTION_INCUBATION_READY :
        game->incubation_active ? LAB_ACTION_INCUBATION_ACTIVE : LAB_ACTION_INCUBATION_EMPTY;
    view->art = game->incubation_ready ? LAB_ACTION_ART_INCUBATOR_READY :
        game->incubation_active ? LAB_ACTION_ART_INCUBATOR_ACTIVE : LAB_ACTION_ART_INCUBATOR_EMPTY;
    strcpy(view->heading, game->incubation_ready ? "Ready" :
        game->incubation_active ? "Incubating" : "Empty");
    if (game->incubation_active)
      snprintf(view->sample_id, sizeof(view->sample_id), "%s", game->samples[game->incubation_sample].id);
    return 1;
  }
  view->detail = LAB_ACTION_RESIDENT_EMPTY;
  view->art = LAB_ACTION_ART_NONE;
  strcpy(view->heading, lab->page == V1_CRITTERS ? "No revealed residents yet" : "Your habitat awaits");
  strcpy(view->body, "Research your first sample to begin.");
  if (!game->individual_count || !game->individuals[lab->resident].revealed) return 1;
  const GameIndividual *individual = &game->individuals[lab->resident];
  const GameIndividualMetadata *metadata = &game->individual_metadata[lab->resident];
  view->detail = LAB_ACTION_RESIDENT_SHOWN;
  view->resident_visible = 1;
  view->art = LAB_ACTION_ART_PENDING;
  unsigned asset;
  if (selected_lab_original_art(individual, metadata, &asset))
    view->art = asset == CORE_ART_PIP_MARKED ? LAB_ACTION_ART_MARKED : LAB_ACTION_ART_PLAIN;
  snprintf(view->resident_id, sizeof(view->resident_id), "%s", individual->id);
  snprintf(view->source_sample_id, sizeof(view->source_sample_id), "%s", individual->source_sample_id);
  const char *form = selected_lab_resident_form_title(individual, metadata);
  snprintf(view->form_title, sizeof(view->form_title), "%s", form ? form : "Form reference unavailable");
  snprintf(view->coat, sizeof(view->coat), "%s", individual->expression.pale_markings ? "Pale markings" : "Plain coat");
  strcpy(view->features, "Crown frill / pale eye rings");
  view->visits = individual->care_visits;
  strcpy(view->body, lab->page == V1_REVEAL ? "Ready to meet you." : "");
  return 1;
}

int selected_lab_action_projection(const SelectedLab *lab,
    int normalization_pending, LabActionView *out) {
  if (!lab || !out || !valid_source(lab)) return 0;
  LabActionView view = {0};
  if (!copy_view(lab, normalization_pending, &view)) return 0;
  *out = view;
  return 1;
}

#undef TERMINATED
