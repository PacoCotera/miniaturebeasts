#ifndef BEECHO_KIT_H
#define BEECHO_KIT_H
#include "selected_lab.h"

enum { KIT_LAB, KIT_COMPANION, KIT_DOCK, KIT_DEVICE_COUNT };
enum {
  KIT_IDLE,
  KIT_WAITING,
  KIT_ARRIVED,
  KIT_COMMITTING,
  KIT_ACK_PENDING,
  KIT_COMPLETE
};
enum {
  COMP_PROBE, COMP_CARGO, COMP_FRIENDS, COMP_MODES, COMP_SEND_REVIEW,
  COMP_DISCARD_CLASS, COMP_DISCARD_QUANTITY, COMP_DISCARD_REVIEW,
  COMP_FINISH_REVIEW, COMP_FRIEND_VISIT, COMP_FIELD_SITE
};
#define COMP_FRIEND_LIST COMP_FRIENDS
enum { KIT_FIELD_TRACE = GAME_FIELD_SOURCES, KIT_FIELD_CAPSULE, KIT_FIELD_NO_CHOICE };

typedef struct {
  unsigned revision, acknowledged, epoch, acknowledged_epoch, focus, page;
  unsigned minimum_action_revision;
  unsigned mode, action_focus[3], task_page[4], task_focus[4], task_depth;
  unsigned discard_resource, discard_quantity;
  int suspended;
  int field_result;
  unsigned movement_consumed;
  SelectedGesture gestures[10];
  char message[96];
} KitView;

/* Host simulation journal; not a production radio packet or MCU save format. */
typedef struct {
  uint32_t checksum, version, phase, companion_online, dock_online;
  uint64_t accept_sequence;
  char haul_id[64];
  uint32_t cargo[3], elapsed, kind;
  uint32_t dock_stock[3], dock_samples, dock_residents, dock_incubations;
  uint64_t dock_world_revision, dock_updated_at;
} KitJournal;

typedef struct {
  GameIndividual individual;
  GameIndividualMetadata metadata;
} KitResidentProjection;

typedef struct {
  uint32_t version, count;
  uint64_t world_revision, updated_at;
  KitResidentProjection residents[GAME_MAX_INDIVIDUALS];
} KitResidentCache;

typedef struct {
  SelectedLab *lab;
  KitView companion, dock;
  KitJournal journal;
  KitResidentCache residents;
  uint32_t dock_visits;
  GameReceivedExpedition sealed_field;
  uint32_t acknowledged_capsules;
  char counted_capsule_haul[64];
  unsigned received_selected, received_detail;
  int resident_cache_failed, dock_cache_failed;
  char selected_resident_id[40];
  char journal_path[560];
  int failed;
  uint32_t clock, next_delivery, dock_updated;
  SelectedLabContext caller;
  /* Named Resident -> received log navigation, separate from arrival return. */
  SelectedLabContext received_caller;
  int received_caller_valid;
  int caller_valid, normalization_pending;
  char opened_haul[64];
} DeviceKit;

int kit_init(DeviceKit *kit, SelectedLab *lab, uint32_t clock);
void kit_tick(DeviceKit *kit, uint32_t clock);
void kit_input(DeviceKit *kit, unsigned device, SelectedInput input,
               unsigned revision);
int kit_link(DeviceKit *kit, unsigned device, int online);
void kit_status(DeviceKit *kit, unsigned device, FILE *output);
int kit_frame_supported(const DeviceKit *kit, unsigned device);
int kit_bmp(const DeviceKit *kit, unsigned device, FILE *output);
unsigned kit_revision(const DeviceKit *kit, unsigned device);
unsigned kit_width(unsigned device);
unsigned kit_height(unsigned device);
const char *kit_option(const DeviceKit *kit, unsigned device, unsigned index);
unsigned kit_option_count(const DeviceKit *kit, unsigned device);
unsigned kit_field_choice(const DeviceKit *kit, unsigned index);
const char *kit_stage(const DeviceKit *kit);
const char *kit_route(const DeviceKit *kit);
const char *kit_expedition_status(const DeviceKit *kit);
const GameSample *kit_received_sample(const DeviceKit *kit);
int kit_lab_explore(const DeviceKit *kit);
/* Includes a saved acceptance whose receipt sidecar is still COMMITTING. */
int kit_delivery_accepted(const DeviceKit *kit);
unsigned kit_resident_count(const DeviceKit *kit);
const KitResidentProjection *kit_resident(const DeviceKit *kit, unsigned index);
const KitResidentProjection *kit_selected_resident(const DeviceKit *kit);
int kit_resident_cache_current(const DeviceKit *kit);
int kit_resident_visit_available(const DeviceKit *kit);
uint64_t kit_residents_updated_at(const DeviceKit *kit);
uint64_t kit_residents_world_revision(const DeviceKit *kit);
unsigned kit_dock_visits(const DeviceKit *kit);
int kit_dock_cache_current(const DeviceKit *kit);
#endif
