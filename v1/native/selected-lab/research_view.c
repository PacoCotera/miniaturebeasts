#include "research_view.h"
#include <stdio.h>
#include <string.h>

int selected_lab_is_research_page(SelectedPage page) {
  return page == V1_SAMPLES || page == V1_STUDIES || page == V1_STUDY_REVIEW ||
      page == V1_FINDING || page == V1_LIBRARY || page == V1_LIBRARY_FINDING;
}

static const char *topic(const SelectedResearchMethod *entry) {
  if (!strcmp(entry->id, "heritage")) return "Inheritance";
  if (!strcmp(entry->id, "movement") || !strcmp(entry->id, "movement.drive")) return "Movement";
  if (!strcmp(entry->id, "coat-comparison")) return "Coat";
  if (!strcmp(entry->id, "effort-comparison") || !strcmp(entry->id, "movement.efficiency")) return "Effort";
  if (!strcmp(entry->id, "form.crown")) return "Crown";
  if (!strcmp(entry->id, "appearance.rings")) return "Eye rings";
  if (!strcmp(entry->id, "appearance.markings")) return "Markings";
  return entry->title;
}
static const char *purpose(const SelectedResearchMethod *entry) {
  if (!strcmp(entry->id, "heritage")) return "What does this sample carry?";
  if (!strcmp(entry->id, "movement")) return "What movement and effort are supported?";
  if (!strcmp(entry->id, "coat-comparison")) return "How could pale variation show?";
  if (!strcmp(entry->id, "effort-comparison")) return "How does effort compare for the same walking action?";
  return "Investigate this reference feature.";
}
static int valid_samples(const SelectedLab *lab) {
  if (lab->game.sample_count > GAME_MAX_SAMPLES ||
      lab->suspended < 0 || lab->suspended > 1 || lab->storage_error < 0 || lab->storage_error > 1 ||
      !memchr(lab->message, 0, sizeof(lab->message))) return 0;
  for (unsigned index = 0; index < lab->game.sample_count; ++index) {
    const GameSample *sample = &lab->game.samples[index];
    const GameSampleMetadata *metadata = &lab->game.sample_metadata[index];
    if (!sample->id[0] || !memchr(sample->id, 0, sizeof(sample->id)) ||
        !memchr(sample->origin_expedition_id, 0, sizeof(sample->origin_expedition_id)) ||
        !memchr(metadata->content_version, 0, sizeof(metadata->content_version)) ||
        sample->incubated > 1 || !pip_sample_metadata_valid(&lab->game, index)) return 0;
    if (metadata->profile == GAME_SAMPLE_LEGACY_FIVE &&
        (sample->decoded_studies > PIP_REQUIRED_FACTS_MASK ||
         sample->decoded_facts > PIP_REQUIRED_FACTS_MASK)) return 0;
    for (unsigned earlier = 0; earlier < index; ++earlier)
      if (!strcmp(sample->id, lab->game.samples[earlier].id)) return 0;
  }
  return 1;
}

static int copy_knowledge(const SelectedLab *lab, unsigned sample, LabResearchView *out) {
  SelectedResearchView knowledge;
  if (!selected_lab_research_view(lab, sample, &knowledge) ||
      knowledge.method_count > LAB_RESEARCH_TOPICS) return 0;
  out->legacy = knowledge.legacy;
  out->complete = knowledge.complete;
  out->partial_p = knowledge.partial_p;
  out->used = lab->game.samples[sample].incubated;
  out->topic_count = knowledge.method_count;
  out->selected_record = 1;
  snprintf(out->sample_id, sizeof(out->sample_id), "%s", lab->game.samples[sample].id);
  snprintf(out->origin_expedition_id, sizeof(out->origin_expedition_id), "%s",
      lab->game.samples[sample].origin_expedition_id);
  strcpy(out->known, "Known: ");
  strcpy(out->missing, "Still: ");
  unsigned known_count = 0, missing_count = 0;
  const char *suggested = NULL;
  for (unsigned method = 0; method < knowledge.method_count; ++method) {
    SelectedResearchMethod entry;
    if (!selected_lab_research_method(lab, sample, method, &entry)) return 0;
    snprintf(out->topics[method], sizeof(out->topics[method]), "%s", topic(&entry));
    out->topic_known[method] = entry.known;
    char *line = entry.known ? out->known : out->missing;
    unsigned *count = entry.known ? &known_count : &missing_count;
    size_t used = strlen(line);
    snprintf(line + used, sizeof(out->known) - used, "%s%s", (*count)++ ? " / " : "", topic(&entry));
    if (!suggested && entry.useful && !entry.known) suggested = purpose(&entry);
    if (entry.known && !out->finding[0] && entry.finding)
      snprintf(out->finding, sizeof(out->finding), "%s", entry.finding);
  }
  if (knowledge.knowledge.profile == GAME_SAMPLE_DISCOVERY_A) {
    SelectedResearchMethod heritage, coat;
    if (!selected_lab_research_method(lab, sample, 0, &heritage) ||
        !selected_lab_research_method(lab, sample, 2, &coat)) return 0;
    out->coat_reference_pair = heritage.known && coat.known;
  }
  if (!known_count) strcpy(out->known, "Known: no findings yet");
  if (knowledge.complete) {
    strcpy(out->known, "Known: complete supported form");
    strcpy(out->missing, "No unresolved reference knowledge.");
  }
  if (out->used) strcpy(out->next, "Sample used / research record stays.");
  else if (knowledge.complete) strcpy(out->next, "Choose a supported form.");
  else if (suggested) snprintf(out->next, sizeof(out->next), "Next question: %s", suggested);
  else strcpy(out->next, "Inspect your recorded findings.");
  return 1;
}

static int project_research(const SelectedLab *lab,
    int normalization_pending, LabResearchView *out) {
  if (!lab || !out || (normalization_pending != 0 && normalization_pending != 1) ||
      !selected_lab_is_research_page(lab->page) || !valid_samples(lab)) return 0;
  unsigned options = selected_lab_options(lab);
  if (!options || options > LAB_RESEARCH_OPTIONS || lab->focus >= options) return 0;
  int selected = !(lab->page == V1_SAMPLES && !lab->focus);
  unsigned sample = lab->page == V1_SAMPLES ? lab->focus - 1 : lab->sample;
  unsigned library_study = 0;
  if (lab->page == V1_LIBRARY)
    selected = selected_lab_library_entry(lab, lab->focus, &sample, &library_study);
  if (selected && sample >= lab->game.sample_count) return 0;
  memset(out, 0, sizeof(*out));
  out->page = lab->page == V1_SAMPLES ? LAB_RESEARCH_SAMPLES :
      lab->page == V1_STUDIES ? LAB_RESEARCH_STUDIES :
      lab->page == V1_STUDY_REVIEW ? LAB_RESEARCH_REVIEW :
      lab->page == V1_FINDING ? LAB_RESEARCH_FINDING :
      lab->page == V1_LIBRARY ? LAB_RESEARCH_LIBRARY : LAB_RESEARCH_LIBRARY_FINDING;
  const char *titles[] = {"SAMPLES", "RESEARCH", "RESEARCH PLAN", "DISCOVERY", "RECORDED FINDINGS", "SAMPLE FINDING"};
  strcpy(out->title, titles[out->page]);
  out->focus = lab->focus;
  out->option_count = options;
  out->sample_count = lab->game.sample_count;
  out->suspended = lab->suspended;
  out->storage_error = lab->storage_error;
  snprintf(out->message, sizeof(out->message), "%s", lab->message);
  if (normalization_pending)
    strcpy(out->message, "Accept the existing haul before supply conversion can finish.");
  const unsigned stock[] = {lab->game.data, lab->game.energy, lab->game.essence};
  for (unsigned resource = 0; resource < 3; ++resource)
    out->stock[resource] = stock[resource] / GAME_SUPPLY_UNIT;
  for (unsigned option = 0; option < options; ++option) {
    unsigned saved_sample, study;
    if (lab->page == V1_LIBRARY && selected_lab_library_entry(lab, option, &saved_sample, &study)) {
      SelectedResearchMethod method;
      if (!selected_lab_research_method(lab, saved_sample, study, &method)) return 0;
      snprintf(out->options[option], sizeof(out->options[option]), "Finding %u", option + 1);
    } else if (lab->page == V1_SAMPLES && option) {
      snprintf(out->options[option], sizeof(out->options[option]), "Sample %u", option);
    } else {
      /* selected_lab_option may return a shared helper buffer; copy immediately. */
      snprintf(out->options[option], sizeof(out->options[option]), "%s", selected_lab_option(lab, option));
    }
  }
  if (lab->page == V1_SAMPLES && !lab->focus) {
    out->detail = LAB_RESEARCH_COLLECTION;
    out->art = LAB_RESEARCH_ART_TOOLS;
    snprintf(out->heading, sizeof(out->heading), "%u sample%s retained", lab->game.sample_count,
        lab->game.sample_count == 1 ? "" : "s");
    for (unsigned index = 0; index < lab->game.sample_count; ++index) {
      SelectedResearchView knowledge;
      if (!selected_lab_research_view(lab, index, &knowledge)) return 0;
      if (lab->game.samples[index].incubated) ++out->used_records;
      else if (knowledge.complete) ++out->ready;
      else ++out->awaiting;
    }
    out->next[0] = 0;
    return 1;
  }
  if (lab->page == V1_LIBRARY && !selected) {
    out->detail = LAB_RESEARCH_RECORDS;
    out->art = LAB_RESEARCH_ART_TOOLS;
    strcpy(out->heading, "No discoveries yet");
    out->next[0] = 0;
    return 1;
  }
  if (!copy_knowledge(lab, sample, out)) return 0;
  if (lab->page == V1_SAMPLES) {
    out->detail = LAB_RESEARCH_KNOWLEDGE;
    out->art = LAB_RESEARCH_ART_SAMPLE;
    strcpy(out->heading, out->used ? "Retained research record" :
        out->complete ? "Supported forms known" : "Unresolved questions");
    if (!out->finding[0]) strcpy(out->finding, "No findings recorded for this sample yet.");
    return 1;
  }
  if (lab->page == V1_STUDIES && lab->focus == options - 1) {
    out->detail = LAB_RESEARCH_PREPARATION;
    out->art = LAB_RESEARCH_ART_TOOLS;
    strcpy(out->heading, "Prepare incubation");
    strcpy(out->body, out->complete ? "Complete supported forms are ready to compare." :
        "Some reference knowledge is still unresolved.");
    return 1;
  }
  unsigned study = lab->page == V1_LIBRARY ? library_study :
      lab->page == V1_STUDIES ? lab->focus : lab->study;
  if (study >= out->topic_count) return 0;
  SelectedResearchMethod method;
  if (!selected_lab_research_method(lab, sample, study, &method)) return 0;
  out->known_method = method.known;
  out->useful = method.useful;
  snprintf(out->heading, sizeof(out->heading), "%s", method.title);
  if (lab->page == V1_STUDIES || lab->page == V1_STUDY_REVIEW) {
    out->detail = LAB_RESEARCH_PLAN;
    out->art = LAB_RESEARCH_ART_TOOLS;
    strcpy(out->body, method.known ? "Recorded / inspect freely" : purpose(&method));
    const unsigned costs[] = {method.cost_data, method.cost_energy, method.cost_essence};
    for (unsigned resource = 0; resource < 3; ++resource)
      out->costs[resource] = method.known || !method.useful ? 0 : costs[resource] / GAME_SUPPLY_UNIT;
    strcpy(out->next, method.known || !method.useful ? "" :
        lab->page == V1_STUDY_REVIEW ? "Start research spends the listed resources." :
        "");
    return 1;
  }
  out->detail = lab->page == V1_LIBRARY ? LAB_RESEARCH_RECORDS : LAB_RESEARCH_DISCOVERY;
  snprintf(out->title, sizeof(out->title), "%s", method.title);
  snprintf(out->finding, sizeof(out->finding), "%s", method.finding ? method.finding : "No finding disclosed.");
  if (!method.known) return 0;
  if (out->legacy && study < 2 && method.known) {
    out->art = study ? LAB_RESEARCH_ART_EYE_RING : LAB_RESEARCH_ART_CROWN;
    strcpy(out->body, "Reference feature");
  } else {
    PipSupportedCandidate candidates[2];
    if (!strcmp(method.id, "coat-comparison") && out->complete &&
        lab->page != V1_LIBRARY && method.known &&
        selected_lab_candidate(lab, sample, 0, &candidates[0]) &&
        selected_lab_candidate(lab, sample, 1, &candidates[1])) {
      out->art = LAB_RESEARCH_ART_PAIR;
      for (unsigned index = 0; index < 2; ++index) {
        out->portraits[index] = candidates[index].expression.pale_markings ?
            LAB_RESEARCH_PORTRAIT_MARKED : LAB_RESEARCH_PORTRAIT_PLAIN;
        snprintf(out->portrait_caption[index], sizeof(out->portrait_caption[index]), "%s",
            candidates[index].expression.pale_markings ? "Pale markings / expressed" : "Plain coat / pale carried");
      }
      strcpy(out->body, "Coat possibilities / adult / mild reference");
    } else {
      out->art = !strcmp(method.id, "movement") || !strcmp(method.id, "movement.drive") ? LAB_RESEARCH_ART_MOVEMENT :
          !strcmp(method.id, "effort-comparison") || !strcmp(method.id, "movement.efficiency") ? LAB_RESEARCH_ART_EFFORT :
          LAB_RESEARCH_ART_INHERITANCE;
      strcpy(out->body, "Research context");
      out->show_alternatives = !strcmp(method.id, "coat-comparison") && method.finding;
    }
    if (!out->legacy && !strcmp(method.id, "coat-comparison")) {
      out->comparison = LAB_RESEARCH_COMPARISON_A_COAT;
      strcpy(out->body, "Coat possibilities / adult / mild reference");
      if (out->art != LAB_RESEARCH_ART_PAIR) {
        strcpy(out->portrait_caption[0], "Plain coat / pale variation carried");
        strcpy(out->portrait_caption[1], "Pale markings / expressed");
      }
    } else if (!out->legacy &&
        lab->game.sample_metadata[sample].profile == GAME_SAMPLE_DISCOVERY_B &&
        (!strcmp(method.id, "movement") || !strcmp(method.id, "effort-comparison"))) {
      SelectedResearchMethod effort;
      if (!selected_lab_research_method(lab, sample, 2, &effort)) return 0;
      out->comparison = effort.known ? LAB_RESEARCH_COMPARISON_B_EFFORT :
          LAB_RESEARCH_COMPARISON_B_MOVEMENT;
      strcpy(out->portrait_caption[0], effort.known ? "Steady / lower walking energy" : "Steady");
      strcpy(out->portrait_caption[1], effort.known ? "Burst-capable / baseline walking energy" : "Burst-capable");
      strcpy(out->body, effort.known ?
          "Same walking action / healthy-rested adult / firm ground / mild conditions" :
          "Movement possibilities / energy relationship unresolved");
      out->show_alternatives = 1;
    }
  }
  return 1;
}

int selected_lab_research_projection(const SelectedLab *lab,
    int normalization_pending, LabResearchView *out) {
  if (!out) return 0;
  LabResearchView view;
  if (!project_research(lab, normalization_pending, &view)) return 0;
  *out = view;
  return 1;
}
