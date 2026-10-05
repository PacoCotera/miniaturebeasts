#include "resident_gallery_view.h"
#include "core_art.h"
#include <stdio.h>
#include <string.h>

#define TERMINATED(value) (memchr((value), 0, sizeof(value)) != NULL)

int selected_lab_resident_gallery_projection(const SelectedLab *lab,
    LabResidentGalleryView *out) {
  if (!lab || !out || lab->game.individual_count > GAME_MAX_INDIVIDUALS) return 0;
  LabResidentGalleryView view = {0};
  unsigned selected_record = GAME_MAX_INDIVIDUALS;
  for (unsigned index = 0; index < lab->game.individual_count; ++index) {
    const GameIndividual *individual = &lab->game.individuals[index];
    const GameIndividualMetadata *metadata = &lab->game.individual_metadata[index];
    if (individual->revealed > 1 || individual->art_pending > 1) return 0;
    if (!individual->revealed) continue;
    if (!TERMINATED(individual->id) || !individual->id[0] ||
        !TERMINATED(individual->source_sample_id) || !TERMINATED(individual->art_id) ||
        !TERMINATED(individual->art_version) || !TERMINATED(metadata->candidate_id) ||
        !TERMINATED(metadata->reference_context) || !TERMINATED(metadata->mapping_version) ||
        !TERMINATED(metadata->original_art_version) || !TERMINATED(metadata->original_art_sha256)) return 0;
    unsigned ordinal = view.count++;
    snprintf(view.entries[ordinal].id, sizeof(view.entries[ordinal].id), "%s", individual->id);
    view.entries[ordinal].portrait = LAB_RESIDENT_PORTRAIT_PENDING;
    unsigned asset;
    if (selected_lab_original_art(individual, metadata, &asset))
      view.entries[ordinal].portrait = asset == CORE_ART_PIP_MARKED ?
          LAB_RESIDENT_PORTRAIT_MARKED : LAB_RESIDENT_PORTRAIT_PLAIN;
    if (selected_record == GAME_MAX_INDIVIDUALS || index == lab->resident) {
      selected_record = index;
      view.selected = ordinal;
    }
  }
  if (view.count) {
    const GameIndividual *individual = &lab->game.individuals[selected_record];
    const char *form = selected_lab_resident_form_title(individual,
        &lab->game.individual_metadata[selected_record]);
    snprintf(view.form_title, sizeof(view.form_title), "%s", form ? form : "Form reference unavailable");
    snprintf(view.source_sample_id, sizeof(view.source_sample_id), "%s", individual->source_sample_id);
    view.visits = individual->care_visits;
  }
  if (!lab_resident_gallery_view_valid(&view)) return 0;
  *out = view;
  return 1;
}
#undef TERMINATED
