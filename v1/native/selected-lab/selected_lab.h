#ifndef SELECTED_LAB_H
#define SELECTED_LAB_H
#include "game_rules.h"
#include "pip_genetics.h"
#include <stdint.h>
#include <stdio.h>
#define SELECTED_LAB_WIDTH 1024u
#define SELECTED_LAB_HEIGHT 600u
typedef enum {
  V1_HOME,
  V1_EXPEDITION,
  V1_CARGO,
  V1_SAMPLES,
  V1_STUDIES,
  V1_FINDING,
  V1_CREATE,
  V1_INCUBATION,
  V1_REVEAL,
  V1_HABITAT,
  V1_STUDY_REVIEW,
  V1_DISCARD_REVIEW,
  V1_CRITTERS,
  V1_LIBRARY,
  V1_LIBRARY_FINDING,
  V1_CREATE_REVIEW
} SelectedPage;
typedef enum {
  SELECTED_UP_DOWN,
  SELECTED_UP_UP,
  SELECTED_DOWN_DOWN,
  SELECTED_DOWN_UP,
  SELECTED_LEFT_DOWN,
  SELECTED_LEFT_UP,
  SELECTED_RIGHT_DOWN,
  SELECTED_RIGHT_UP,
  SELECTED_RESEARCH_DOWN,
  SELECTED_RESEARCH_UP,
  SELECTED_CRITTERS_DOWN,
  SELECTED_CRITTERS_UP,
  SELECTED_LIBRARY_DOWN,
  SELECTED_LIBRARY_UP,
  SELECTED_HABITAT_DOWN,
  SELECTED_HABITAT_UP,
  SELECTED_CONFIRM_DOWN,
  SELECTED_CONFIRM_UP,
  SELECTED_BACK_DOWN,
  SELECTED_BACK_UP,
  SELECTED_CANCEL,
  SELECTED_SUSPEND,
  SELECTED_RESUME,
  SELECTED_READY
} SelectedInput;
/* The yellow key keeps its old wire values for existing presenters. */
#define SELECTED_HOME_DOWN SELECTED_CRITTERS_DOWN
#define SELECTED_HOME_UP SELECTED_CRITTERS_UP
typedef struct {
  int held, allowed;
  unsigned revision, interaction_epoch;
} SelectedGesture;
typedef struct {
  unsigned sample, preference;
  int valid;
  char sample_id[40], content_version[24], candidate_id[32];
} SelectedCreationDraft;

/* Read-only presentation adapters. Findings and complete candidates are exposed
 * only when the content authority permits them for this particular sample. */
typedef struct {
  int legacy, complete;
  unsigned method_count, completed_methods, known_references,
      required_references, candidate_count, partial_p;
  PipResearchProjection knowledge;
} SelectedResearchView;
typedef struct {
  const char *id, *title, *finding;
  unsigned cost_data, cost_energy, cost_essence;
  int known, useful;
} SelectedResearchMethod;
typedef struct {
  SelectedPage page;
  unsigned focus, sample, study, resident, discard_resource, revision,
      page_revision, interaction_epoch, minimum_action_revision,
      acknowledged_revision, acknowledged_interaction_epoch;
  int ready, suspended, storage_error, kit_mode;
  SelectedGesture gestures[10];
  unsigned workspace, library_index, creation_preference;
  SelectedCreationDraft creation_draft;
  SelectedPage workspace_page[4];
  unsigned workspace_focus[4], workspace_sample[4], workspace_study[4],
      workspace_resident[4];
  GameState game;
  char save_path[512];
  char message[96];
  uint32_t clock;
} SelectedLab;
typedef struct {
  SelectedPage page;
  unsigned focus, sample, study, resident, discard_resource, workspace,
      library_index, creation_preference;
  SelectedPage workspace_page[4];
  unsigned workspace_focus[4], workspace_sample[4], workspace_study[4],
      workspace_resident[4];
  char message[96];
  SelectedCreationDraft creation_draft;
} SelectedLabContext;

void selected_lab_capture_context(const SelectedLab *lab,
                                  SelectedLabContext *context);
void selected_lab_open_reception(SelectedLab *lab);
void selected_lab_restore_context(SelectedLab *lab,
                                  const SelectedLabContext *context);
void selected_lab_init(SelectedLab *lab);
int selected_lab_load(SelectedLab *lab, const char *path, uint32_t clock);
void selected_lab_tick(SelectedLab *lab, uint32_t clock);
void selected_lab_tick_devices(SelectedLab *lab, uint32_t clock, int expedition,
                               int incubation);
void selected_lab_input(SelectedLab *lab, SelectedInput input, int delta,
                        unsigned frame);
const char *selected_lab_page(const SelectedLab *lab);
const char *selected_lab_focus(const SelectedLab *lab);
unsigned selected_lab_options(const SelectedLab *lab);
const char *selected_lab_option(const SelectedLab *lab, unsigned option);
int selected_lab_research_view(const SelectedLab *lab, unsigned sample,
                               SelectedResearchView *view);
int selected_lab_research_method(const SelectedLab *lab, unsigned sample,
                                 unsigned method, SelectedResearchMethod *view);
int selected_lab_candidate(const SelectedLab *lab, unsigned sample,
                            unsigned candidate, PipSupportedCandidate *view);
int selected_lab_creation_draft(const SelectedLab *lab,
                                PipSupportedCandidate *view);
int selected_lab_library_entry(const SelectedLab *lab, unsigned option,
                               unsigned *sample_result, unsigned *study_result);
/* Optional presentation input: Kit owns haul authority, never GameState art. */
typedef enum {
  SELECTED_HAUL_NONE, SELECTED_HAUL_WAITING, SELECTED_HAUL_STORED
} SelectedHaulPresentation;
typedef struct {
  SelectedHaulPresentation haul;
  unsigned incoming[3];
} SelectedLabRenderContext;
/* Resolve only a recorded, supported original; never invent a replacement. */
int selected_lab_original_art(const GameIndividual *individual,
                              const GameIndividualMetadata *metadata,
                              unsigned *asset);
/* Read a revealed resident's retained form under a supported mapping/context.
 * No live source research or candidate reconstruction is needed. */
const char *selected_lab_resident_form_title(
    const GameIndividual *individual,
    const GameIndividualMetadata *metadata);
/* Standalone legacy acquisition pages have no supported graphics. */
int selected_lab_frame_supported(const SelectedLab *lab);
int selected_lab_bmp(const SelectedLab *lab, FILE *output);
#endif
