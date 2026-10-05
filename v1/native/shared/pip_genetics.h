#ifndef PIP_GENETICS_H
#define PIP_GENETICS_H

#include "game_state.h"

#include <stdint.h>

#define PIP_STUDY_COUNT 5u
#define PIP_SAMPLE_CANDIDATE_MASK 0x03u
/* Five variable-locus study facts for this pinned Pip content package only. */
#define PIP_REQUIRED_VARIABLE_FACTS_MASK 0x1fu
#define PIP_REQUIRED_FACTS_MASK PIP_REQUIRED_VARIABLE_FACTS_MASK
#define PIP_CONTENT_VERSION "pip-proof-v1"
#define PIP_RULES_VERSION "pip-rules-v1"
#define PIP_ART_VERSION "pip-playtest-art-v1"
#define PIP_DISCOVERY_CONTENT_VERSION "pip-discovery-v1"
#define PIP_DISCOVERY_REFERENCE_COUNT 17u
#define PIP_DISCOVERY_REQUIRED_REFERENCES 0x1ffffu
#define PIP_DISCOVERY_METHOD_COUNT 3u
#define PIP_DISCOVERY_CANDIDATE_COUNT 4u

typedef struct {
  const char *id;
  const char *title;
  const char *finding; /* NULL until supported by this sample's accepted evidence. */
  uint16_t cost_data, cost_energy, cost_essence;
} PipInvestigation;

typedef struct {
  const char *id;
  const char *title;
  PipGenome genome;
  PipExpression expression;
} PipSupportedCandidate;

typedef struct {
  unsigned profile;
  const char *content_version;
  uint32_t established_references;
  uint32_t disclosed_candidates;
  unsigned partial_p;
  char common_loci[GAME_GENETIC_LOCI][2];
  uint32_t alternative_loci;
  int support_relationship_known;
  int complete;
} PipResearchProjection;

typedef struct {
  const char *id;
  char known_loci[GAME_GENETIC_LOCI][2];
  uint32_t established_references;
  int complete;
} PipCandidateKnowledge;

typedef struct {
  const char *locus_id;
  const char *title;
  const char *allele_a;
  const char *allele_b;
  const char *finding;
  uint32_t fact_mask;
  uint16_t cost_data;
  uint16_t cost_energy;
  uint16_t cost_essence;
} PipStudy;

const PipStudy *pip_studies(void);
const PipStudy *pip_study(unsigned index);
int pip_genome_valid(const PipGenome *genome);
int pip_genome_for_sample(unsigned sample_ordinal, PipGenome *genome);
int pip_expression_valid(const PipGenome *genome,
                         const PipExpression *expression);
void pip_express(const PipGenome *genome, PipExpression *expression);
const char *pip_art_id(const PipGenome *genome);

/* Version dispatch leaves pip_genome_valid's original content unchanged. */
int pip_content_genome_valid(const PipGenome *genome);
int pip_content_expression_valid(const PipGenome *genome,
                                const PipExpression *expression);
const char *pip_content_art_id(const PipGenome *genome);
const char *pip_reference_id(unsigned reference);
const char *pip_sample_content_version(const GameState *state, unsigned sample);
void pip_pin_sample_profile(GameState *state, unsigned sample);
int pip_sample_metadata_valid(const GameState *state, unsigned sample);
int pip_research_projection(const GameState *state, unsigned sample,
                            PipResearchProjection *projection);
const PipInvestigation *pip_investigation(const GameState *state, unsigned sample,
                                         unsigned method);
int pip_investigation_useful(const GameState *state, unsigned sample,
                            unsigned method);
int pip_record_investigation(GameState *state, unsigned sample, unsigned method);
int pip_supported_candidate(const GameState *state, unsigned sample,
                            unsigned candidate, PipSupportedCandidate *result);
int pip_candidate_knowledge(const GameState *state, unsigned sample,
                            unsigned candidate, PipCandidateKnowledge *result);
unsigned pip_candidate_count(const GameState *state, unsigned sample);
void pip_pin_individual_art(GameState *state, unsigned individual,
                            const char *candidate_id);
int pip_individual_metadata_valid(const GameState *state, unsigned individual);

#endif
