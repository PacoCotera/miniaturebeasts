#include "pip_genetics.h"

#include <string.h>

/* Provisional balance v1. Costs, expedition yields and durations are fixture
 * values for the playable slice; they are not canonical game balance. */
static const PipStudy STUDIES[PIP_STUDY_COUNT] = {
    {.locus_id = "form.crown",
     .title = "Crown form",
     .allele_a = "C",
     .allele_b = "c",
     .finding = "Both supported forms have a soft crown frill.",
     .fact_mask = 1u << 0,
     .cost_data = 500,
     .cost_energy = 0,
     .cost_essence = 0},
    {.locus_id = "appearance.rings",
     .title = "Eye rings",
     .allele_a = "R",
     .allele_b = "r",
     .finding = "Both forms have pale rings around amber eyes.",
     .fact_mask = 1u << 1,
     .cost_data = 0,
     .cost_energy = 500,
     .cost_essence = 0},
    {.locus_id = "appearance.markings",
     .title = "Body markings",
     .allele_a = "P",
     .allele_b = "p",
     .finding = "One form carries pale markings without showing them. The "
                "other shows them.",
     .fact_mask = 1u << 2,
     .cost_data = 0,
     .cost_energy = 0,
     .cost_essence = 500},
    {.locus_id = "movement.drive",
     .title = "Movement",
     .allele_a = "M",
     .allele_b = "m",
     .finding = "Both forms can move in short, quick bursts.",
     .fact_mask = 1u << 3,
     .cost_data = 400,
     .cost_energy = 400,
     .cost_essence = 0},
    {.locus_id = "movement.efficiency",
     .title = "Energy use",
     .allele_a = "E",
     .allele_b = "e",
     .finding = "Both forms share efficient movement.",
     .fact_mask = 1u << 4,
     .cost_data = 0,
     .cost_energy = 400,
     .cost_essence = 400},
};

const PipStudy *pip_studies(void) { return STUDIES; }

const PipStudy *pip_study(unsigned index) {
  return index < PIP_STUDY_COUNT ? &STUDIES[index] : 0;
}

int pip_genome_valid(const PipGenome *genome) {
  static const char EXPECTED[GAME_GENETIC_LOCI][2] = {
      {'C', 'c'}, {'R', 'r'}, {0, 0}, {'M', 'm'}, {'E', 'e'}};
  unsigned locus;
  if (!genome || strcmp(genome->class_id, "critter:pip") != 0 ||
      strcmp(genome->content_version, PIP_CONTENT_VERSION) != 0 ||
      strcmp(genome->rules_version, PIP_RULES_VERSION) != 0)
    return 0;
  for (locus = 0; locus < GAME_GENETIC_LOCI; ++locus) {
    if (locus == 2) {
      int carried =
          genome->loci[locus][0] == 'P' && genome->loci[locus][1] == 'p';
      int expressed =
          genome->loci[locus][0] == 'p' && genome->loci[locus][1] == 'p';
      if (!carried && !expressed)
        return 0;
      continue;
    }
    if (genome->loci[locus][0] != EXPECTED[locus][0] ||
        genome->loci[locus][1] != EXPECTED[locus][1])
      return 0;
  }
  return 1;
}

int pip_genome_for_sample(unsigned candidate, PipGenome *genome) {
  static const char COMMON[GAME_GENETIC_LOCI][2] = {
      {'C', 'c'}, {'R', 'r'}, {'P', 'p'}, {'M', 'm'}, {'E', 'e'}};
  if (!genome || candidate > 1)
    return -1;
  memset(genome, 0, sizeof(*genome));
  memcpy(genome->loci, COMMON, sizeof(COMMON));
  if (candidate == 1) {
    genome->loci[2][0] = 'p';
    genome->loci[2][1] = 'p';
  }
  strcpy(genome->class_id, "critter:pip");
  strcpy(genome->content_version, PIP_CONTENT_VERSION);
  strcpy(genome->rules_version, PIP_RULES_VERSION);
  return 0;
}

void pip_express(const PipGenome *genome, PipExpression *expression) {
  memset(expression, 0, sizeof(*expression));
  expression->crown = genome->loci[0][0] == 'C' || genome->loci[0][1] == 'C';
  expression->eye_rings =
      genome->loci[1][0] == 'R' || genome->loci[1][1] == 'R';
  expression->pale_markings =
      genome->loci[2][0] == 'p' && genome->loci[2][1] == 'p';
  expression->burst_movement =
      genome->loci[3][0] == 'M' || genome->loci[3][1] == 'M';
  expression->efficient_movement =
      genome->loci[4][0] == 'E' || genome->loci[4][1] == 'E';
}

const char *pip_art_id(const PipGenome *genome) {
  if (!pip_genome_valid(genome))
    return 0;
  return genome->loci[2][0] == 'p' && genome->loci[2][1] == 'p'
             ? "design/v1-pip/pip-marked.png"
             : "design/v1-pip/pip-carried.png";
}

int pip_expression_valid(const PipGenome *genome,
                         const PipExpression *expression) {
  PipExpression resolved;
  if (!pip_genome_valid(genome) || !expression)
    return 0;
  pip_express(genome, &resolved);
  return memcmp(&resolved, expression, sizeof(resolved)) == 0;
}

/* The manifest and evidence bundles are pinned content, not UI progress rules.
 * Each bit names an existing reference, including explicit non-applicability. */
static const char *const REFERENCES[PIP_DISCOVERY_REFERENCE_COUNT] = {
    "module:pip.body-plan", "module:pip.sensing-signaling",
    "module:pip.innate-tendencies", "module:pip.energy-nutrition",
    "module:pip.maintenance", "module:pip.affinity", "module:pip.development",
    "module:pip.reproduction", "module:pip.fantastic-exclusion",
    "locus:base.coat", "locus:base.ventrum", "locus:base.eyes",
    "locus:form.crown", "locus:appearance.rings", "locus:appearance.markings",
    "locus:movement.drive", "locus:movement.efficiency"};

static const PipInvestigation DISCOVERY_METHODS[2][3] = {
    {{"heritage", "Read the pattern",
      "Pale variation found. How it shows is still unknown.", 400, 0, 0},
     {"movement", "Trace movement",
      "Short bursts supported. Less energy for the same movement, for a "
      "healthy/rested adult on firm ground in mild conditions.", 0, 400, 0},
     {"coat-comparison", "Compare the coat",
      "Plain coat: pale variation carried. Or pale markings.", 0, 0, 400}},
    {{"heritage", "Read the pattern",
      "Pale variation carried; no pale body markings in the adult reference.", 400, 0, 0},
     {"movement", "Trace movement",
      "Steady and burst-capable patterns found. Their energy relationship is unresolved.", 0, 400, 0},
     {"effort-comparison", "Compare movement effort",
      "Steady: less energy for the same walking action. Burst-capable: baseline "
      "walking energy. Healthy/rested adult, firm ground, mild conditions.", 0, 0, 400}}};

static const char *const CANDIDATE_IDS[] = {"A0", "A1", "B0", "B1"};
static const char *const CANDIDATE_TITLES[] = {
    "Plain coat / pale variation carried", "Pale markings",
    "Steady / lower walking cost", "Burst-capable / baseline walking cost"};

static void discovery_genome(unsigned candidate, PipGenome *genome) {
  pip_genome_for_sample(candidate == 1, genome);
  strcpy(genome->content_version, PIP_DISCOVERY_CONTENT_VERSION);
  if (candidate == 2)
    genome->loci[3][0] = genome->loci[3][1] = 'm';
  if (candidate == 3)
    genome->loci[4][0] = genome->loci[4][1] = 'e';
}

static int discovery_candidate_index(const PipGenome *genome) {
  PipGenome expected;
  for (unsigned candidate = 0; candidate < PIP_DISCOVERY_CANDIDATE_COUNT; ++candidate) {
    discovery_genome(candidate, &expected);
    if (!memcmp(genome, &expected, sizeof(expected)))
      return (int)candidate;
  }
  return -1;
}

int pip_content_genome_valid(const PipGenome *genome) {
  if (!genome || !memchr(genome->class_id, 0, sizeof(genome->class_id)) ||
      !memchr(genome->content_version, 0, sizeof(genome->content_version)) ||
      !memchr(genome->rules_version, 0, sizeof(genome->rules_version)))
    return 0;
  return pip_genome_valid(genome) || discovery_candidate_index(genome) >= 0;
}

int pip_content_expression_valid(const PipGenome *genome,
                                const PipExpression *expression) {
  PipExpression expected;
  if (!expression || !pip_content_genome_valid(genome))
    return 0;
  pip_express(genome, &expected);
  return !memcmp(expression, &expected, sizeof(expected));
}

const char *pip_content_art_id(const PipGenome *genome) {
  if (!pip_content_genome_valid(genome))
    return NULL;
  return genome->loci[2][0] == 'p' && genome->loci[2][1] == 'p'
             ? "design/v1-pip/pip-marked.png" : "design/v1-pip/pip-carried.png";
}

const char *pip_reference_id(unsigned reference) {
  return reference < PIP_DISCOVERY_REFERENCE_COUNT ? REFERENCES[reference] : NULL;
}

const char *pip_sample_content_version(const GameState *state, unsigned sample) {
  if (!state || sample >= state->sample_count)
    return NULL;
  return state->sample_metadata[sample].profile == GAME_SAMPLE_LEGACY_FIVE
             ? PIP_CONTENT_VERSION : state->sample_metadata[sample].content_version;
}

/* Store the authored alternating intake profile once with its stable sample ID.
 * Reload and subsequent studies never consult the current collection ordinal. */
void pip_pin_sample_profile(GameState *state, unsigned sample) {
  GameSampleMetadata *metadata = &state->sample_metadata[sample];
  memset(metadata, 0, sizeof(*metadata));
  metadata->profile = sample % 2 ? GAME_SAMPLE_DISCOVERY_B : GAME_SAMPLE_DISCOVERY_A;
  strcpy(metadata->content_version, PIP_DISCOVERY_CONTENT_VERSION);
}

static uint32_t method_references(unsigned profile, unsigned method) {
  if (method == 0)
    return profile == GAME_SAMPLE_DISCOVERY_A ? 0x3fffu : 0x7fffu;
  if (method == 1)
    return profile == GAME_SAMPLE_DISCOVERY_A ? 0x18000u : 0x8000u;
  return profile == GAME_SAMPLE_DISCOVERY_A ? 0x4000u : 0x18000u;
}

static void resolve_metadata(GameSampleMetadata *metadata) {
  metadata->established_references = 0;
  for (unsigned method = 0; method < PIP_DISCOVERY_METHOD_COUNT; ++method)
    if (metadata->investigated_methods & (1u << method))
      metadata->established_references |= method_references(metadata->profile, method);
  metadata->partial_p = metadata->profile == GAME_SAMPLE_DISCOVERY_A &&
                        (metadata->investigated_methods & 1u) &&
                        !(metadata->established_references & (1u << 14));
  metadata->disclosed_candidates =
      metadata->established_references == PIP_DISCOVERY_REQUIRED_REFERENCES &&
              (metadata->investigated_methods & 4u)
          ? (metadata->profile == GAME_SAMPLE_DISCOVERY_A ? 3u : 12u) : 0u;
}

int pip_sample_metadata_valid(const GameState *state, unsigned sample) {
  const GameSampleMetadata *metadata = &state->sample_metadata[sample];
  GameSampleMetadata expected = {0};
  if (metadata->profile == GAME_SAMPLE_LEGACY_FIVE)
    return !memcmp(metadata, &expected, sizeof(expected));
  if (metadata->profile > GAME_SAMPLE_DISCOVERY_B ||
      !memchr(metadata->content_version, 0, sizeof(metadata->content_version)) ||
      strcmp(metadata->content_version, PIP_DISCOVERY_CONTENT_VERSION) ||
      (metadata->investigated_methods & ~7u) ||
      state->samples[sample].decoded_studies || state->samples[sample].decoded_facts)
    return 0;
  expected = *metadata;
  resolve_metadata(&expected);
  return !memcmp(metadata, &expected, sizeof(expected));
}

int pip_research_projection(const GameState *state, unsigned sample,
                            PipResearchProjection *projection) {
  if (!state || !projection || sample >= state->sample_count ||
      !pip_sample_metadata_valid(state, sample))
    return 0;
  memset(projection, 0, sizeof(*projection));
  const GameSampleMetadata *metadata = &state->sample_metadata[sample];
  projection->profile = metadata->profile;
  projection->content_version = pip_sample_content_version(state, sample);
  if (metadata->profile == GAME_SAMPLE_LEGACY_FIVE) {
    projection->complete = state->samples[sample].decoded_studies == 31;
    projection->disclosed_candidates = projection->complete ? 3 : 0;
    return 1;
  }
  projection->established_references = metadata->established_references;
  projection->disclosed_candidates = metadata->disclosed_candidates;
  projection->partial_p = metadata->partial_p;
  projection->support_relationship_known = (metadata->investigated_methods & 4u) != 0;
  projection->complete = metadata->disclosed_candidates != 0;
  PipGenome first, second;
  discovery_genome(metadata->profile == GAME_SAMPLE_DISCOVERY_A ? 0 : 2, &first);
  discovery_genome(metadata->profile == GAME_SAMPLE_DISCOVERY_A ? 1 : 3, &second);
  for (unsigned locus = 0; locus < GAME_GENETIC_LOCI; ++locus) {
    if (!(metadata->established_references & (1u << (12 + locus))))
      continue;
    if (!memcmp(first.loci[locus], second.loci[locus], 2))
      memcpy(projection->common_loci[locus], first.loci[locus], 2);
    else
      projection->alternative_loci |= 1u << locus;
  }
  if (projection->partial_p)
    projection->common_loci[2][0] = 'p';
  return 1;
}

const PipInvestigation *pip_investigation(const GameState *state, unsigned sample,
                                         unsigned method) {
  if (!state || sample >= state->sample_count || method >= PIP_DISCOVERY_METHOD_COUNT ||
      !pip_sample_metadata_valid(state, sample))
    return NULL;
  unsigned profile = state->sample_metadata[sample].profile;
  if (profile != GAME_SAMPLE_DISCOVERY_A && profile != GAME_SAMPLE_DISCOVERY_B)
    return NULL;
  /* Purposes and prices are public at intake; undiscovered findings are not.
   * This host authority is single threaded. Preview copies hold no secret data. */
  static PipInvestigation previews[2][3];
  if (!previews[0][0].id) {
    memcpy(previews, DISCOVERY_METHODS, sizeof(previews));
    for (unsigned row = 0; row < 2; ++row)
      for (unsigned column = 0; column < 3; ++column)
        previews[row][column].finding = NULL;
  }
  const GameSampleMetadata *metadata = &state->sample_metadata[sample];
  if (profile == GAME_SAMPLE_DISCOVERY_A && method == 0 &&
      (metadata->investigated_methods & 5u) == 5u) {
    static const PipInvestigation resolved_heritage = {
        "heritage", "Read the pattern",
        "Pale variation found; its supported coat alternatives are recorded.",
        400, 0, 0};
    return &resolved_heritage;
  }
  if (profile == GAME_SAMPLE_DISCOVERY_B && method == 1 &&
      (metadata->investigated_methods & 4u)) {
    static const PipInvestigation resolved_movement = {
        "movement", "Trace movement",
        "Steady and burst-capable patterns established; their paired effort is known.",
        0, 0, 0};
    return &resolved_movement;
  }
  return metadata->investigated_methods & (1u << method)
             ? &DISCOVERY_METHODS[profile - 1][method] : &previews[profile - 1][method];
}

int pip_investigation_useful(const GameState *state, unsigned sample,
                            unsigned method) {
  if (!pip_investigation(state, sample, method) || state->samples[sample].incubated)
    return 0;
  const GameSampleMetadata *metadata = &state->sample_metadata[sample];
  uint32_t outputs = method_references(metadata->profile, method);
  return (metadata->established_references & outputs) != outputs ||
         (method == 0 && metadata->profile == GAME_SAMPLE_DISCOVERY_A &&
          !metadata->partial_p && !(metadata->established_references & (1u << 14))) ||
         (method == 2 && !(metadata->investigated_methods & 4u));
}

int pip_record_investigation(GameState *state, unsigned sample, unsigned method) {
  if (!pip_investigation_useful(state, sample, method))
    return 0;
  state->sample_metadata[sample].investigated_methods |= 1u << method;
  resolve_metadata(&state->sample_metadata[sample]);
  return 1;
}

unsigned pip_candidate_count(const GameState *state, unsigned sample) {
  PipResearchProjection projection;
  return pip_research_projection(state, sample, &projection) && projection.complete ? 2 : 0;
}

int pip_supported_candidate(const GameState *state, unsigned sample,
                            unsigned candidate, PipSupportedCandidate *result) {
  if (!result || candidate >= pip_candidate_count(state, sample))
    return 0;
  memset(result, 0, sizeof(*result));
  unsigned profile = state->sample_metadata[sample].profile;
  if (profile == GAME_SAMPLE_LEGACY_FIVE) {
    result->id = candidate ? "legacy-marked" : "legacy-carried";
    result->title = CANDIDATE_TITLES[candidate];
    pip_genome_for_sample(candidate, &result->genome);
  } else {
    unsigned actual = profile == GAME_SAMPLE_DISCOVERY_A ? candidate : candidate + 2;
    result->id = CANDIDATE_IDS[actual];
    result->title = CANDIDATE_TITLES[actual];
    discovery_genome(actual, &result->genome);
  }
  pip_express(&result->genome, &result->expression);
  return 1;
}

int pip_candidate_knowledge(const GameState *state, unsigned sample,
                            unsigned candidate, PipCandidateKnowledge *result) {
  PipResearchProjection projection;
  if (!result || candidate > 1 || !pip_research_projection(state, sample, &projection) ||
      projection.profile == GAME_SAMPLE_LEGACY_FIVE ||
      !projection.alternative_loci)
    return 0;
  unsigned actual = projection.profile == GAME_SAMPLE_DISCOVERY_A ? candidate : candidate + 2;
  PipGenome genome;
  discovery_genome(actual, &genome);
  memset(result, 0, sizeof(*result));
  result->id = CANDIDATE_IDS[actual];
  result->established_references = projection.established_references;
  result->complete = projection.complete;
  for (unsigned locus = 0; locus < GAME_GENETIC_LOCI; ++locus)
    if (projection.established_references & (1u << (12 + locus)))
      memcpy(result->known_loci[locus], genome.loci[locus], 2);
  if (projection.partial_p)
    result->known_loci[2][0] = 'p';
  return 1;
}

static void pin_art(GameIndividualMetadata *metadata, const PipGenome *genome,
                     const char *candidate_id) {
  memset(metadata, 0, sizeof(*metadata));
  strcpy(metadata->candidate_id, candidate_id);
  strcpy(metadata->reference_context, "pip:adult-rested-firm-ground-mild-v1");
  strcpy(metadata->mapping_version, pip_genome_valid(genome)
             ? "pip-proof-map-v1" : "pip-discovery-map-v1");
  int marked = genome->loci[2][0] == 'p' && genome->loci[2][1] == 'p';
  strcpy(metadata->appearance_descriptor, marked ? "pip-reference-marked" : "pip-reference-carried");
  strcpy(metadata->original_art_version, PIP_ART_VERSION);
  /* Approved original bytes in design/v1-pip/manifest.json. Current exports
   * never redefine the identity of an accepted portrait. B shares carried art. */
  strcpy(metadata->original_art_sha256,
         marked ? "39336d1bf4f9cf540d1d5a1ed47a42ccc72fff02376eb98e7b88cf51d3859190"
                : "38b0fa7fc24ffea47cb128fdcaf46f701a2396bd3bfcbb81e3d86f962f262534");
}

void pip_pin_individual_art(GameState *state, unsigned individual,
                            const char *candidate_id) {
  pin_art(&state->individual_metadata[individual], &state->individuals[individual].genome,
          candidate_id);
}

int pip_individual_metadata_valid(const GameState *state, unsigned individual) {
  const PipGenome *genome = &state->individuals[individual].genome;
  const GameIndividualMetadata *metadata = &state->individual_metadata[individual];
  GameIndividualMetadata expected = {0};
  unsigned source = 0;
  while (source < state->sample_count &&
         strcmp(state->samples[source].id, state->individuals[individual].source_sample_id))
    ++source;
  if (source == state->sample_count)
    return 0;
  if (pip_genome_valid(genome)) {
    if (state->sample_metadata[source].profile != GAME_SAMPLE_LEGACY_FIVE)
      return 0;
    if (!memcmp(metadata, &expected, sizeof(expected)))
      return 1; /* Unextended legacy records initialize during old-file load. */
  }
  int candidate = discovery_candidate_index(genome);
  const char *id = candidate >= 0 ? CANDIDATE_IDS[candidate]
      : state->individuals[individual].expression.pale_markings ? "legacy-marked" : "legacy-carried";
  pin_art(&expected, genome, id);
  if (memcmp(metadata, &expected, sizeof(expected)))
    return 0;
  if (candidate >= 0) {
    unsigned profile = state->sample_metadata[source].profile;
    return state->sample_metadata[source].disclosed_candidates &&
           ((profile == GAME_SAMPLE_DISCOVERY_A && candidate < 2) ||
            (profile == GAME_SAMPLE_DISCOVERY_B && candidate >= 2));
  }
  return pip_genome_valid(genome);
}
