#include "selected_lab.h"
#include "home_view.h"
#include "native_ui.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
static void ready(SelectedLab *lab) {
  selected_lab_input(lab, SELECTED_READY, 0, lab->revision);
}
static void press(SelectedLab *lab) {
  selected_lab_input(lab, SELECTED_CONFIRM_DOWN, 0, lab->revision);
  selected_lab_input(lab, SELECTED_CONFIRM_UP, 0, lab->revision);
}
static void button(SelectedLab *lab, SelectedInput down) {
  ready(lab);
  unsigned revision = lab->revision;
  selected_lab_input(lab, down, 0, revision);
  selected_lab_input(lab, (SelectedInput)(down + 1), 0, revision);
}
static void choose(SelectedLab *lab, const char *label) {
  unsigned options = selected_lab_options(lab);
  for (unsigned i = 0; i < options; ++i) {
    if (!strcmp(selected_lab_focus(lab), label)) {
      button(lab, SELECTED_CONFIRM_DOWN);
      return;
    }
    button(lab, SELECTED_DOWN_DOWN);
  }
  assert(!"Option not found");
}
static void accept_test_haul(SelectedLab *lab, const char *id, int sample,
                              unsigned data, unsigned energy, unsigned essence) {
  strcpy(lab->game.expedition_id, id);
  lab->game.expedition_elapsed = sample ? GAME_EXPEDITION_SECONDS : 1;
  lab->game.expedition_data = data;
  lab->game.expedition_energy = energy;
  lab->game.expedition_essence = essence;
  GameCommand action = {0};
  action.type = GAME_COMMAND_EXPEDITION_UNLOAD;
  action.operation_id = id;
  action.sequence = lab->game.last_operation_sequence + 1;
  assert(game_apply(lab->save_path, &lab->game, &action) == GAME_OK);
}
static void discovery_workbench(void) {
  char path[128];
  snprintf(path, sizeof(path), "/tmp/beecho-discovery-ui-%ld.save", (long)getpid());
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  lab.game.data = lab.game.essence = 2000;
  lab.game.energy = 300;
  accept_test_haul(&lab, "intake-A", 1, 0, 0, 0);
  accept_test_haul(&lab, "intake-B", 1, 0, 0, 0);
  button(&lab, SELECTED_RESEARCH_DOWN);
  assert(lab.page == V1_SAMPLES && lab.focus == 0 && selected_lab_options(&lab) == 3);
  GameState before = lab.game;
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(lab.page == V1_SAMPLES && !memcmp(&before, &lab.game, sizeof(before)));
  button(&lab, SELECTED_DOWN_DOWN);
  assert(lab.sample == 0 && lab.focus == 1);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDIES && selected_lab_options(&lab) == 4);
  SelectedResearchView research;
  SelectedResearchMethod method;
  PipSupportedCandidate candidate;
  assert(selected_lab_research_view(&lab, 0, &research) &&
         !research.legacy && !research.known_references && !research.candidate_count);
  assert(selected_lab_research_method(&lab, 0, 0, &method) &&
         !method.finding && method.useful && method.cost_data == 400);
  assert(!selected_lab_candidate(&lab, 0, 0, &candidate));
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(lab.page == V1_STUDIES && !memcmp(&before, &lab.game, sizeof(before)));
  choose(&lab, "Read the pattern");
  assert(lab.page == V1_STUDY_REVIEW && !memcmp(&before, &lab.game, sizeof(before)));
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_FINDING && lab.game.data == before.data - 400);
  assert(selected_lab_research_view(&lab, 0, &research) &&
         research.known_references == 14 && research.partial_p && !research.complete);
  button(&lab, SELECTED_CONFIRM_DOWN);
  before = lab.game;
  choose(&lab, "Read the pattern");
  assert(lab.page == V1_FINDING && !memcmp(&before, &lab.game, sizeof(before)));
  button(&lab, SELECTED_CONFIRM_DOWN);
  choose(&lab, "Prepare incubation");
  assert(lab.page == V1_STUDIES && !memcmp(&before, &lab.game, sizeof(before)));
  choose(&lab, "Trace movement");
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDY_REVIEW && !memcmp(&before, &lab.game, sizeof(before)));
  assert(strstr(lab.message, "Need 0 Data, 1 Energy, 0 Essence more"));
  /* Resupply may replace the view, but preserves this exact sample/method. */
  SelectedLabContext caller;
  selected_lab_capture_context(&lab, &caller);
  selected_lab_open_reception(&lab);
  accept_test_haul(&lab, "movement-resupply", 0, 600, 1200, 600);
  selected_lab_restore_context(&lab, &caller);
  assert(lab.page == V1_STUDY_REVIEW && lab.sample == 0 && lab.study == 1);
  button(&lab, SELECTED_HOME_DOWN);
  button(&lab, SELECTED_RESEARCH_DOWN);
  assert(lab.page == V1_STUDY_REVIEW && lab.sample == 0 && lab.study == 1);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_FINDING &&
         selected_lab_research_view(&lab, 0, &research) && research.known_references == 16);
  button(&lab, SELECTED_CONFIRM_DOWN);
  choose(&lab, "Compare the coat");
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(selected_lab_research_view(&lab, 0, &research) && research.complete &&
         research.known_references == 17 && research.candidate_count == 2);
  /* B's coupled comparison before Movement removes the redundant purchase. */
  button(&lab, SELECTED_BACK_DOWN);
  assert(lab.page == V1_SAMPLES && lab.focus == 1);
  button(&lab, SELECTED_DOWN_DOWN);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_STUDIES && lab.sample == 1);
  choose(&lab, "Compare movement effort");
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_CONFIRM_DOWN);
  before = lab.game;
  assert(selected_lab_research_method(&lab, 1, 1, &method) && method.known &&
         !method.useful && !method.cost_energy);
  choose(&lab, "Trace movement");
  assert(lab.page == V1_FINDING && !memcmp(&before, &lab.game, sizeof(before)));
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(lab.page == V1_FINDING && !memcmp(&before, &lab.game, sizeof(before)));
  button(&lab, SELECTED_CONFIRM_DOWN);
  choose(&lab, "Read the pattern");
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_CONFIRM_DOWN);
  choose(&lab, "Prepare incubation");
  assert(lab.page == V1_CREATE && selected_lab_candidate(&lab, 1, 1, &candidate) &&
         !strcmp(candidate.id, "B1") && !candidate.expression.efficient_movement);
  before = lab.game;
  choose(&lab, candidate.title);
  assert(lab.page == V1_CREATE_REVIEW && selected_lab_creation_draft(&lab, &candidate) &&
         !strcmp(candidate.id, "B1") && !memcmp(&before, &lab.game, sizeof(before)));
  selected_lab_capture_context(&lab, &caller);
  selected_lab_open_reception(&lab);
  selected_lab_restore_context(&lab, &caller);
  button(&lab, SELECTED_HOME_DOWN);
  button(&lab, SELECTED_RESEARCH_DOWN);
  assert(lab.page == V1_CREATE_REVIEW && selected_lab_creation_draft(&lab, &candidate));
  strcpy(lab.creation_draft.candidate_id, "A0");
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_CREATE_REVIEW && !memcmp(&before, &lab.game, sizeof(before)));
  strcpy(lab.creation_draft.candidate_id, "B1");
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_INCUBATION && lab.game.individual_count == 1 &&
         !strcmp(lab.game.individual_metadata[0].candidate_id, "B1") &&
         lab.game.individuals[0].genome.loci[4][0] == 'e' &&
         lab.game.data == before.data - 500 && lab.game.energy == before.energy - 500 &&
         lab.game.essence == before.essence - 500);
  SelectedLab restarted;
  selected_lab_init(&restarted);
  assert(selected_lab_load(&restarted, path, 200));
  assert(!restarted.creation_draft.valid && restarted.page == V1_HOME);
  button(&restarted, SELECTED_RESEARCH_DOWN);
  assert(restarted.page == V1_SAMPLES && restarted.focus == 0);
  assert(selected_lab_research_view(&restarted, 0, &research) && research.complete);
  assert(selected_lab_research_view(&restarted, 1, &research) && research.complete);
  before = restarted.game;
  button(&restarted, SELECTED_CONFIRM_DOWN);
  assert(!memcmp(&before, &restarted.game, sizeof(before)));
  unlink(path);
  char lockpath[140];
  snprintf(lockpath, sizeof(lockpath), "%s.lock", path);
  unlink(lockpath);
}
static void creation_review(void) {
  char path[128];
  snprintf(path, sizeof(path), "/tmp/beecho-creation-review-%ld.save", (long)getpid());
  SelectedLab lab;
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 100));
  lab.game.data = lab.game.energy = lab.game.essence = 1000;
  lab.game.sample_count = 2;
  for (unsigned i = 0; i < 2; ++i) {
    GameSample *sample = &lab.game.samples[i];
    snprintf(sample->id, sizeof(sample->id), "sample-review-%u", i);
    snprintf(sample->origin_expedition_id, sizeof(sample->origin_expedition_id), "expedition-review-%u", i);
    sample->decoded_studies = 31;
    sample->decoded_facts = PIP_REQUIRED_FACTS_MASK;
    sample->supported_candidates = PIP_SAMPLE_CANDIDATE_MASK;
  }
  assert(game_state_save(path, &lab.game) == 0);
  SelectedResearchView research;
  SelectedResearchMethod method;
  assert(selected_lab_research_view(&lab, 0, &research) && research.legacy &&
         research.method_count == 5 && research.complete && research.known_references == 5);
  assert(selected_lab_research_method(&lab, 0, 0, &method) && method.known &&
         !method.useful && method.cost_data == 500);
  GameState before = lab.game;
  lab.page = V1_CREATE;
  lab.focus = 1;
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_CREATE_REVIEW && lab.creation_preference == 1);
  assert(memcmp(&before, &lab.game, sizeof(before)) == 0);
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(memcmp(&before, &lab.game, sizeof(before)) == 0);
  button(&lab, SELECTED_BACK_DOWN);
  assert(lab.page == V1_CREATE && lab.focus == 1);
  button(&lab, SELECTED_CONFIRM_DOWN);
  unsigned old_frame = lab.revision;
  button(&lab, SELECTED_HOME_DOWN);
  assert(lab.page == V1_HOME && lab.focus == 0);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, old_frame);
  assert(memcmp(&before, &lab.game, sizeof(before)) == 0);
  button(&lab, SELECTED_RESEARCH_DOWN);
  assert(lab.page == V1_CREATE_REVIEW && lab.creation_preference == 1);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_INCUBATION && lab.game.incubation_choice == 1);
  assert(lab.game.data == 500 && lab.game.energy == 500 && lab.game.essence == 500);
  assert(lab.game.samples[0].incubated && lab.game.sample_count == 2);
  assert(lab.game.individual_count == 1 && !lab.game.individuals[0].revealed);
  GameState persisted;
  assert(game_state_load(path, &persisted) == 0 && persisted.incubation_choice == 1);
  assert(persisted.individual_count == 1 &&
         persisted.individuals[0].expression.pale_markings &&
         !strcmp(persisted.individuals[0].source_sample_id, "sample-review-0") &&
         !strcmp(persisted.individuals[0].art_id, lab.game.individuals[0].art_id));
  uint64_t sequence = lab.game.last_operation_sequence;
  lab.sample = 1;
  lab.page = V1_CREATE;
  lab.focus = 0;
  button(&lab, SELECTED_CONFIRM_DOWN);
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_CREATE_REVIEW && lab.game.last_operation_sequence == sequence);
  assert(strstr(lab.message, "already active") && lab.game.data == 500);
  unlink(path);
}
static void frame(SelectedLab *lab) {
  FILE *output = tmpfile();
  assert(output);
  assert(selected_lab_bmp(lab, output));
  assert(ftell(output) == 54L + SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3L);
  assert(fclose(output) == 0);
}
int main(void) {
  discovery_workbench();
  creation_review();
  SelectedLab lab;
  selected_lab_init(&lab);
  press(&lab);
  assert(lab.page == V1_HOME);
  ready(&lab);
  unsigned old = lab.revision;
  selected_lab_input(&lab, SELECTED_CONFIRM_DOWN, 0, old);
  selected_lab_input(&lab, SELECTED_DOWN_DOWN, 0, old);
  selected_lab_input(&lab, SELECTED_DOWN_UP, 0, old);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, old);
  assert(lab.page == V1_HOME && lab.focus == 0);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_DOWN_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_DOWN_UP, 0, lab.revision);
  assert(lab.focus == 1 && !lab.ready);
  /* A status tick queued ahead of a press changes pixels but not this action.
   */
  SelectedLab timed;
  selected_lab_init(&timed);
  char timed_path[128];
  snprintf(timed_path, sizeof(timed_path), "/tmp/beecho-timed-%ld.save",
           (long)getpid());
  strcpy(timed.save_path, timed_path);
  timed.game.expedition_active = 1;
  strcpy(timed.game.expedition_id, "timed-survey");
  timed.game.expedition_data = 100;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  ready(&timed);
  unsigned displayed = timed.revision;
  unsigned action_epoch = timed.interaction_epoch;
  selected_lab_tick(&timed, 11);
  assert(timed.revision > displayed && !timed.ready);
  assert(timed.interaction_epoch == action_epoch);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, displayed);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, displayed);
  assert(timed.focus == 1);
  /* READY itself can arrive after a harmless tick during frame transport. */
  selected_lab_init(&timed);
  strcpy(timed.save_path, timed_path);
  timed.game.expedition_active = 1;
  strcpy(timed.game.expedition_id, "late-ready");
  timed.game.expedition_data = 100;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  displayed = timed.revision;
  selected_lab_tick(&timed, 11);
  selected_lab_input(&timed, SELECTED_READY, 0, displayed);
  assert(timed.acknowledged_revision == displayed && !timed.ready);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, displayed);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, displayed);
  assert(timed.focus == 1);
  /* The first cargo and survey completion change available actions. */
  selected_lab_init(&timed);
  strcpy(timed.save_path, timed_path);
  timed.game.expedition_active = 1;
  strcpy(timed.game.expedition_id, "first-cargo");
  timed.game.gather_progress_ms[0] = GAME_GATHER_ATTEMPT_MS - 1000;
  timed.game.gather_random_state = 1;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  ready(&timed);
  displayed = timed.revision;
  selected_lab_tick(&timed, 11);
  assert(timed.interaction_epoch != timed.acknowledged_interaction_epoch);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, displayed);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, displayed);
  assert(timed.focus == 0);
  ready(&timed);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, timed.revision);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, timed.revision);
  assert(timed.focus == 1);
  selected_lab_init(&timed);
  strcpy(timed.save_path, timed_path);
  timed.game.expedition_active = 1;
  strcpy(timed.game.expedition_id, "completion");
  timed.game.expedition_data = 100;
  timed.game.expedition_elapsed = 59;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  ready(&timed);
  displayed = timed.revision;
  selected_lab_tick(&timed, 11);
  assert(timed.interaction_epoch != timed.acknowledged_interaction_epoch);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, displayed);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, displayed);
  assert(timed.focus == 0);
  /* Crossing a complete-pack boundary must not arm an unseen discard. */
  selected_lab_init(&timed);
  strcpy(timed.save_path, timed_path);
  timed.page = V1_DISCARD_REVIEW;
  timed.discard_resource = 0;
  timed.game.expedition_active = 1;
  strcpy(timed.game.expedition_id, "pack-threshold");
  timed.game.expedition_data = 900;
  timed.game.gather_progress_ms[0] = GAME_GATHER_ATTEMPT_MS - 1000;
  timed.game.gather_random_state = 1;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  ready(&timed);
  displayed = timed.revision;
  selected_lab_tick(&timed, 11);
  assert(timed.game.expedition_data == 1000);
  unsigned tick_sequence = timed.game.last_operation_sequence;
  selected_lab_input(&timed, SELECTED_CONFIRM_DOWN, 0, displayed);
  selected_lab_input(&timed, SELECTED_CONFIRM_UP, 0, displayed);
  assert(timed.game.expedition_data == 1000 &&
         timed.game.last_operation_sequence == tick_sequence);
  ready(&timed);
  press(&timed);
  assert(timed.game.expedition_data == 0 &&
         timed.game.last_operation_sequence == tick_sequence + 1);
  /* Right remains read-only; fresh physical return/store ends an early outing.
   * The next route starts from zero with a new identity and retained activity. */
  selected_lab_init(&timed);
  strcpy(timed.save_path, timed_path);
  timed.page = V1_EXPEDITION;
  strcpy(timed.game.expedition_id, "early-unload");
  timed.game.expedition_active = 1;
  timed.game.expedition_data = 100;
  timed.game.expedition_elapsed = 5;
  timed.game.gather_progress_ms[0] = 1000;
  uint32_t random_before_unload = timed.game.gather_random_state;
  timed.clock = 10;
  game_rules_resume_runtime(&timed.game, timed.clock);
  assert(game_state_save(timed_path, &timed.game) == 0);
  ready(&timed);
  selected_lab_input(&timed, SELECTED_RIGHT_DOWN, 0, timed.revision);
  selected_lab_input(&timed, SELECTED_RIGHT_UP, 0, timed.revision);
  assert(timed.game.expedition_active && timed.game.expedition_elapsed == 5 &&
         !timed.game.last_operation_sequence);
  ready(&timed);
  selected_lab_input(&timed, SELECTED_DOWN_DOWN, 0, timed.revision);
  selected_lab_input(&timed, SELECTED_DOWN_UP, 0, timed.revision);
  assert(!strcmp(selected_lab_focus(&timed), "Cargo"));
  ready(&timed);
  press(&timed);
  assert(timed.page == V1_CARGO);
  assert(!strcmp(selected_lab_focus(&timed), "Return + store haul"));
  ready(&timed);
  press(&timed);
  assert(timed.page == V1_SAMPLES && timed.game.data == 100 &&
         timed.game.expedition_data == 0 && timed.game.sample_count == 0);
  assert(!timed.game.expedition_active && !timed.game.expedition_id[0] &&
         timed.game.expedition_elapsed == 0);
  assert(timed.game.gather_progress_ms[0] == 1000 &&
         timed.game.gather_random_state == random_before_unload &&
         timed.game.gather_attempt_count == 0);
  ready(&timed);
  press(&timed); /* Collection Overview previews without starting a route. */
  assert(timed.page == V1_SAMPLES && timed.focus == 0);
  button(&timed, SELECTED_HOME_DOWN);
  button(&timed, SELECTED_DOWN_DOWN);
  button(&timed, SELECTED_CONFIRM_DOWN);
  assert(timed.page == V1_EXPEDITION &&
         !strcmp(selected_lab_focus(&timed), "Field survey"));
  ready(&timed);
  press(&timed);
  assert(timed.game.expedition_active && timed.game.expedition_elapsed == 0 &&
         strcmp(timed.game.expedition_id, "early-unload") != 0);
  assert(timed.game.gather_progress_ms[0] == 1000 &&
         timed.game.gather_random_state == random_before_unload &&
         timed.game.sample_count == 0);
  unlink(timed_path);
  press(&lab);
  assert(lab.page == V1_HOME);
  ready(&lab);
  press(&lab);
  assert(lab.page == V1_EXPEDITION);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_BACK_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_BACK_UP, 0, lab.revision);
  assert(lab.page == V1_HOME);
  selected_lab_input(&lab, SELECTED_CONFIRM_DOWN, 0, old);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, lab.revision);
  assert(lab.page == V1_HOME);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_CONFIRM_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_SUSPEND, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_RESUME, 0, lab.revision);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, lab.revision);
  assert(lab.page == V1_HOME);
  /* Workspace keys expose only retained player knowledge and never commit. */
  lab.game.sample_count = 1;
  strcpy(lab.game.samples[0].id, "sample-test");
  lab.game.samples[0].decoded_studies = 1;
  ready(&lab);
  selected_lab_input(&lab, SELECTED_LIBRARY_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_LIBRARY_UP, 0, lab.revision);
  assert(lab.page == V1_LIBRARY && selected_lab_options(&lab) == 1);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_RIGHT_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_RIGHT_UP, 0, lab.revision);
  assert(lab.page == V1_LIBRARY_FINDING && lab.study == 0);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_CRITTERS_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_CRITTERS_UP, 0, lab.revision);
  assert(lab.page == V1_HOME && lab.game.last_operation_sequence == 0);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_LIBRARY_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_LIBRARY_UP, 0, lab.revision);
  assert(lab.page == V1_LIBRARY_FINDING);
  /* Right never starts a study, expedition, incubation or care operation. */
  lab.page = V1_STUDY_REVIEW;
  ready(&lab);
  selected_lab_input(&lab, SELECTED_RIGHT_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_RIGHT_UP, 0, lab.revision);
  assert(lab.page == V1_STUDY_REVIEW && lab.game.last_operation_sequence == 0);
  /* Home focus previews cannot mutate the world; only non-Home Confirm enters.
   */
  SelectedLab navigation;
  selected_lab_init(&navigation);
  ready(&navigation);
  press(&navigation);
  assert(navigation.page == V1_HOME && navigation.focus == 0);
  for (unsigned home_focus = 1; home_focus <= 4; ++home_focus) {
    ready(&navigation);
    selected_lab_input(&navigation, SELECTED_DOWN_DOWN, 0, navigation.revision);
    selected_lab_input(&navigation, SELECTED_DOWN_UP, 0, navigation.revision);
    assert(navigation.page == V1_HOME && navigation.focus == home_focus);
    assert(navigation.game.last_operation_sequence == 0);
    ready(&navigation);
    selected_lab_input(&navigation, SELECTED_CONFIRM_DOWN, 0,
                       navigation.revision);
    selected_lab_input(&navigation, SELECTED_CONFIRM_UP, 0,
                       navigation.revision);
    assert(navigation.page != V1_HOME);
    assert(navigation.game.last_operation_sequence == 0);
    ready(&navigation);
    selected_lab_input(&navigation, SELECTED_BACK_DOWN, 0, navigation.revision);
    selected_lab_input(&navigation, SELECTED_BACK_UP, 0, navigation.revision);
    assert(navigation.page == V1_HOME && navigation.focus == home_focus);
  }
  char path[128];
  snprintf(path, sizeof(path), "/tmp/beecho-ui-recovery-%ld.save",
           (long)getpid());
  GameState durable;
  game_state_init(&durable);
  durable.data = 500;
  assert(game_state_save(path, &durable) == 0);
  selected_lab_init(&lab);
  assert(selected_lab_load(&lab, path, 10));
  lab.storage_error = 1;
  lab.game.data = 0;
  selected_lab_input(&lab, SELECTED_RESUME, 0, lab.revision);
  assert(!lab.storage_error && lab.game.data == 500 && !lab.ready);
  unlink(path);
  char lockpath[140];
  snprintf(lockpath, sizeof(lockpath), "%s.lock", path);
  unlink(lockpath);
  /* Legacy commands remain domain fixtures; their graphics are retired. */
  const SelectedPage retired[] = {V1_EXPEDITION, V1_CARGO, V1_DISCARD_REVIEW,
      (SelectedPage)-1, (SelectedPage)(V1_CREATE_REVIEW + 1)};
  for (unsigned index = 0; index < sizeof(retired) / sizeof(retired[0]); ++index) {
    lab.page = retired[index];
    SelectedLab before = lab;
    FILE *output = tmpfile();
    assert(output && !selected_lab_bmp(&lab, output) && !ftell(output));
    assert(!memcmp(&before, &lab, sizeof(lab)) && !fclose(output));
  }
  /* Populated rows exercise fonts and assets absent from empty-page fixtures.
   */
  lab.game.sample_count = 2;
  strcpy(lab.game.samples[0].id, "sample-0001");
  strcpy(lab.game.samples[1].id, "sample-0002");
  lab.game.samples[0].decoded_studies = 31;
  lab.game.samples[1].decoded_studies = 1;
  lab.game.individual_count = 3;
  strcpy(lab.game.individuals[0].id, "resident-hidden");
  strcpy(lab.game.individuals[1].id, "resident-0001");
  strcpy(lab.game.individuals[2].id, "resident-0002");
  lab.game.individuals[1].revealed = lab.game.individuals[2].revealed = 1;
  lab.page = V1_HOME;
  for (lab.focus = 0; lab.focus < 5; ++lab.focus)
    frame(&lab);
  lab.page = V1_LIBRARY;
  for (lab.focus = 0; lab.focus < selected_lab_options(&lab); ++lab.focus)
    frame(&lab);
  lab.page = V1_LIBRARY_FINDING;
  lab.sample = lab.focus = 0;
  for (lab.study = 0; lab.study < 5; ++lab.study)
    frame(&lab);
  lab.page = V1_STUDIES;
  lab.focus = 5;
  frame(&lab);
  lab.page = V1_HOME;
  lab.workspace = 4;
  lab.resident = 2;
  ready(&lab);
  selected_lab_input(&lab, SELECTED_CRITTERS_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_CRITTERS_UP, 0, lab.revision);
  assert(lab.page == V1_HOME && lab.focus == 0);
  frame(&lab);
  ready(&lab);
  selected_lab_input(&lab, SELECTED_HABITAT_DOWN, 0, lab.revision);
  selected_lab_input(&lab, SELECTED_HABITAT_UP, 0, lab.revision);
  assert(lab.page == V1_CRITTERS && lab.focus == 1 && lab.resident == 2);
  frame(&lab);
  GameState resident_browse = lab.game;
  button(&lab, SELECTED_UP_DOWN);
  assert(lab.focus == 1 && lab.resident == 2); /* First-row Up clamps. */
  button(&lab, SELECTED_DOWN_DOWN);
  assert(lab.focus == 1 && lab.resident == 2); /* Missing same-column row clamps. */
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(lab.focus == 1 && lab.resident == 2); /* No third occupied column. */
  button(&lab, SELECTED_LEFT_DOWN);
  assert(lab.focus == 0 && lab.resident == 1);
  assert(!memcmp(&resident_browse, &lab.game, sizeof(resident_browse)));
  button(&lab, SELECTED_CONFIRM_DOWN);
  assert(lab.page == V1_HABITAT && lab.focus == 1 && lab.resident == 1);
  assert(!memcmp(&resident_browse, &lab.game, sizeof(resident_browse)));
  button(&lab, SELECTED_RIGHT_DOWN);
  assert(lab.focus == 0 && lab.resident == 1);
  button(&lab, SELECTED_UP_DOWN);
  button(&lab, SELECTED_DOWN_DOWN);
  assert(lab.focus == 0 && !memcmp(&resident_browse, &lab.game, sizeof(resident_browse)));
  button(&lab, SELECTED_LEFT_DOWN);
  assert(lab.page == V1_HABITAT && lab.focus == 1);
  button(&lab, SELECTED_DOWN_DOWN);
  button(&lab, SELECTED_DOWN_DOWN);
  assert(lab.focus == 2 && lab.resident == 1);
  button(&lab, SELECTED_UP_DOWN);
  button(&lab, SELECTED_UP_DOWN);
  assert(lab.focus == 1);
  button(&lab, SELECTED_BACK_DOWN);
  assert(lab.page == V1_CRITTERS && lab.focus == 0 && lab.resident == 1);
  assert(!memcmp(&resident_browse, &lab.game, sizeof(resident_browse)));
  ready(&lab);
  unsigned resident_frame = lab.revision;
  selected_lab_input(&lab, SELECTED_CONFIRM_DOWN, 0, resident_frame);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, resident_frame);
  assert(lab.page == V1_HABITAT && lab.focus == 1 && lab.resident == 1);
  selected_lab_input(&lab, SELECTED_CONFIRM_DOWN, 0, resident_frame);
  selected_lab_input(&lab, SELECTED_CONFIRM_UP, 0, resident_frame);
  assert(lab.focus == 1 && !memcmp(&resident_browse, &lab.game, sizeof(resident_browse)));
  /* Maximum valid stock must not paint over the header's right-hand inset. */
  SelectedLab empty_header, full_header;
  selected_lab_init(&empty_header);
  full_header = empty_header;
  full_header.game.data = full_header.game.energy = full_header.game.essence =
      1000000;
  NativeUiContext *header_context = native_ui_create_device(KIT_LAB);
  LabHomeView header_view;
  assert(header_context && selected_lab_home_view(&empty_header, NULL, 0, &header_view));
  const uint8_t *header_frame = native_ui_home(header_context, &header_view);
  assert(header_frame);
  uint8_t inset[36][(SELECTED_LAB_WIDTH - 972) * 3];
  uint8_t quantities[36][(972 - 398) * 3];
  for (unsigned row = 60; row < 96; ++row) {
    memcpy(inset[row - 60], header_frame + (row * SELECTED_LAB_WIDTH + 972) * 3,
        sizeof(inset[0]));
    memcpy(quantities[row - 60], header_frame + (row * SELECTED_LAB_WIDTH + 398) * 3,
        sizeof(quantities[0]));
  }
  assert(selected_lab_home_view(&full_header, NULL, 0, &header_view));
  assert(header_view.stock[0] == 10000 && header_view.stock[1] == 10000 && header_view.stock[2] == 10000);
  header_frame = native_ui_home(header_context, &header_view);
  assert(header_frame);
  unsigned quantity_changed = 0;
  for (unsigned row = 60; row < 96; ++row) {
    assert(!memcmp(inset[row - 60], header_frame + (row * SELECTED_LAB_WIDTH + 972) * 3,
        sizeof(inset[0])));
    quantity_changed += memcmp(quantities[row - 60],
        header_frame + (row * SELECTED_LAB_WIDTH + 398) * 3, sizeof(quantities[0])) != 0;
  }
  assert(quantity_changed); /* Compare real changed glyphs, not two blank rows. */
  native_ui_destroy(header_context);
  puts("Native V1 input and frame checks passed");
  return 0;
}
