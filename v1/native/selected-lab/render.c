#include "native_ui.h"
#include "home_view.h"
#include "research_view.h"
#include "action_view.h"
#include "core_art.h"
#include "selected_lab.h"
#include <string.h>

int selected_lab_original_art(const GameIndividual *individual,
                               const GameIndividualMetadata *metadata,
                               unsigned *asset) {
  if (!individual || !metadata || !asset || !individual->revealed ||
      individual->art_pending || strcmp(individual->art_version, PIP_ART_VERSION) ||
      strcmp(metadata->original_art_version, PIP_ART_VERSION))
    return 0;
  for (unsigned id = CORE_ART_PIP_PLAIN; id <= CORE_ART_PIP_MARKED; ++id) {
    const CoreArtSprite *original = core_art_sprite((CoreArtId)id);
    char path[40];
    snprintf(path, sizeof(path), "design/v1-pip/%s.png", original->name);
    if (!strcmp(individual->art_id, path) &&
        !strcmp(metadata->original_art_sha256, original->source_sha256)) {
      *asset = id;
      return 1;
    }
  }
  return 0;
}

const char *selected_lab_resident_form_title(
    const GameIndividual *individual,
    const GameIndividualMetadata *metadata) {
  if (!individual || !metadata || !individual->revealed ||
      !individual->id[0] || !individual->source_sample_id[0] ||
      strcmp(metadata->reference_context, "pip:adult-rested-firm-ground-mild-v1"))
    return NULL;
  /* Creation saved the selected form under this mapping and context. Resident
   * views must not reconstruct candidates from mutable source research. */
  if (!strcmp(metadata->mapping_version, "pip-discovery-map-v1")) {
    static const struct { const char *id, *title; } forms[] = {
        {"A0", "Plain coat / pale variation carried"},
        {"A1", "Pale markings"},
        {"B0", "Steady / lower walking cost"},
        {"B1", "Burst-capable / baseline walking cost"}};
    for (unsigned form = 0; form < sizeof(forms) / sizeof(forms[0]); ++form)
      if (!strcmp(metadata->candidate_id, forms[form].id))
        return forms[form].title;
  } else if (!strcmp(metadata->mapping_version, "pip-proof-map-v1")) {
    if (!strcmp(metadata->candidate_id, "legacy-carried"))
      return "Plain coat / pale variation carried";
    if (!strcmp(metadata->candidate_id, "legacy-marked"))
      return "Pale markings";
  }
  return NULL;
}

int selected_lab_frame_supported(const SelectedLab *lab) {
  return lab && (lab->page == V1_HOME ||
      selected_lab_is_research_page(lab->page) ||
      selected_lab_is_action_page(lab->page));
}

static int word(FILE *output, unsigned value, unsigned bytes) {
  for (unsigned index = 0; index < bytes; ++index)
    if (fputc((int)((value >> (index * 8)) & 255u), output) == EOF)
      return 0;
  return 1;
}

int selected_lab_bmp(const SelectedLab *lab, FILE *output) {
  if (!selected_lab_frame_supported(lab) || !output) return 0;
  NativeUiContext *context = NULL;
  const uint8_t *frame = NULL;
  if (lab->page == V1_HOME) {
    LabHomeView view;
    if (!selected_lab_home_view(lab, NULL, 0, &view)) return 0;
    context = native_ui_create_device(KIT_LAB);
    if (!context) return 0;
    frame = native_ui_home(context, &view);
    if (!frame) { native_ui_destroy(context); return 0; }
  }
  if (selected_lab_is_research_page(lab->page)) {
    LabResearchView view;
    if (!selected_lab_research_projection(lab, 0, &view)) return 0;
    context = native_ui_create_device(KIT_LAB);
    if (!context) return 0;
    frame = native_ui_research(context, &view);
    if (!frame) { native_ui_destroy(context); return 0; }
  }
  if (selected_lab_is_action_page(lab->page)) {
    LabActionView view;
    if (!selected_lab_action_projection(lab, 0, &view)) return 0;
    context = native_ui_create_device(KIT_LAB);
    if (!context) return 0;
    frame = native_ui_actions(context, &view);
    if (!frame) { native_ui_destroy(context); return 0; }
  }
  if (!frame) { native_ui_destroy(context); return 0; }
  const unsigned stride = SELECTED_LAB_WIDTH * 3;
  uint8_t pixels[SELECTED_LAB_WIDTH * 3];
  if (fwrite("BM", 1, 2, output) != 2)
    goto failure;
  unsigned fields[][2] = {{54 + stride * SELECTED_LAB_HEIGHT, 4},
                          {0, 4},
                          {54, 4},
                          {40, 4},
                          {SELECTED_LAB_WIDTH, 4},
                          {SELECTED_LAB_HEIGHT, 4},
                          {1, 2},
                          {24, 2},
                          {0, 4},
                          {stride * SELECTED_LAB_HEIGHT, 4},
                          {2835, 4},
                          {2835, 4},
                          {0, 4},
                          {0, 4}};
  for (unsigned index = 0; index < sizeof(fields) / sizeof(fields[0]); ++index)
    if (!word(output, fields[index][0], fields[index][1]))
      goto failure;
  for (unsigned y = SELECTED_LAB_HEIGHT; y > 0; --y) {
    memcpy(pixels, frame + (y - 1) * stride, stride);
    for (unsigned column = 0; column < SELECTED_LAB_WIDTH; ++column) {
      uint8_t swap = pixels[column * 3];
      pixels[column * 3] = pixels[column * 3 + 2];
      pixels[column * 3 + 2] = swap;
    }
    if (fwrite(pixels, 1, stride, output) != stride)
      goto failure;
  }
  { int success = !ferror(output); native_ui_destroy(context); return success; }
failure:
  native_ui_destroy(context);
  return 0;
}
