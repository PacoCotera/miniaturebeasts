#ifndef CRITTER_LAB_RESEARCH_VIEW_H
#define CRITTER_LAB_RESEARCH_VIEW_H
#include <stdint.h>

enum { LAB_RESEARCH_OPTIONS = 40, LAB_RESEARCH_TOPICS = 5 };
typedef enum {
  LAB_RESEARCH_SAMPLES, LAB_RESEARCH_STUDIES, LAB_RESEARCH_REVIEW,
  LAB_RESEARCH_FINDING, LAB_RESEARCH_LIBRARY, LAB_RESEARCH_LIBRARY_FINDING
} LabResearchPage;
typedef enum {
  LAB_RESEARCH_COLLECTION, LAB_RESEARCH_KNOWLEDGE, LAB_RESEARCH_PLAN,
  LAB_RESEARCH_PREPARATION, LAB_RESEARCH_DISCOVERY, LAB_RESEARCH_RECORDS
} LabResearchDetail;
typedef enum {
  LAB_RESEARCH_ART_NONE, LAB_RESEARCH_ART_SAMPLE, LAB_RESEARCH_ART_TOOLS,
  LAB_RESEARCH_ART_INHERITANCE, LAB_RESEARCH_ART_MOVEMENT,
  LAB_RESEARCH_ART_EFFORT, LAB_RESEARCH_ART_CROWN, LAB_RESEARCH_ART_EYE_RING,
  LAB_RESEARCH_ART_PAIR
} LabResearchArt;
typedef enum {
  LAB_RESEARCH_PORTRAIT_NONE, LAB_RESEARCH_PORTRAIT_PLAIN, LAB_RESEARCH_PORTRAIT_MARKED
} LabResearchPortrait;
typedef enum {
  LAB_RESEARCH_COMPARISON_NONE, LAB_RESEARCH_COMPARISON_A_COAT,
  LAB_RESEARCH_COMPARISON_B_MOVEMENT, LAB_RESEARCH_COMPARISON_B_EFFORT
} LabResearchComparison;
/* Owned presentation data only. Rendering cannot investigate, spend, save or
 * derive a phenotype. Portrait permissions are supplied by the host projection. */
typedef struct {
  LabResearchPage page;
  LabResearchDetail detail;
  LabResearchArt art;
  LabResearchComparison comparison;
  unsigned focus, option_count, topic_count;
  char options[LAB_RESEARCH_OPTIONS][128];
  char option_details[LAB_RESEARCH_OPTIONS][80];
  char title[96], sample_id[40], heading[96], body[192], finding[256];
  char origin_expedition_id[64];
  char topics[LAB_RESEARCH_TOPICS][48];
  uint8_t topic_known[LAB_RESEARCH_TOPICS];
  char known[160], missing[160], next[112], message[96], footer[112];
  /* Shared labels for permitted full portraits or qualitative reference pairs. */
  char portrait_caption[2][80];
  LabResearchPortrait portraits[2];
  unsigned stock[3], costs[3], awaiting, ready, used_records, sample_count;
  uint8_t known_method, useful, legacy, complete, partial_p, used;
  uint8_t show_alternatives, storage_error, suspended;
  uint8_t selected_record, coat_reference_pair;
} LabResearchView;
#endif
