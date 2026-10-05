#include "kit.h"
#include "expedition.h"
#include "expedition_render.h"
#include "save_bytes.h"
#include <errno.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define KIT_ENVELOPE_MAGIC "CLKITV1"
#define KIT_ENVELOPE_VERSION 2u
#define KIT_RESIDENT_CACHE_VERSION 1u

/* The transfer journal remains the exact old record. The envelope owns only
 * accepted read-only projections and has its own independent checksum. */
typedef struct {
  char magic[8];
  uint32_t version, file_size, checksum;
  KitJournal journal;
  KitResidentCache residents;
  uint32_t dock_visits;
} SavedKitEnvelopeV1;
typedef struct {
  SavedKitEnvelopeV1 original;
  GameReceivedExpedition sealed_field;
  uint32_t acknowledged_capsules;
  char counted_capsule_haul[64];
} SavedKitEnvelope;

_Static_assert(sizeof(KitJournal) == 160, "Frozen Kit journal size changed");
_Static_assert(offsetof(KitJournal, accept_sequence) == 24, "Frozen sequence offset");
_Static_assert(offsetof(KitJournal, haul_id) == 32, "Frozen haul offset");
_Static_assert(offsetof(KitJournal, dock_world_revision) == 144, "Frozen Dock offset");
_Static_assert(sizeof(KitResidentProjection) == 501, "Resident envelope record ABI changed");
_Static_assert(sizeof(KitResidentCache) == 4032, "Resident cache schema needs a new version");
_Static_assert(offsetof(SavedKitEnvelopeV1, journal) == 24, "Envelope journal offset changed");
_Static_assert(sizeof(SavedKitEnvelopeV1) == 4224, "Kit envelope schema needs a new version");

static int sync_projections(DeviceKit *kit, int force_companion, int force_dock);

static void refresh(KitView *view, int interaction) {
  ++view->revision;
  if (interaction) {
    ++view->epoch;
    view->minimum_action_revision = view->revision;
  }
}
static void refresh_all(DeviceKit *kit) {
  ++kit->lab->revision;
  ++kit->lab->interaction_epoch;
  kit->lab->minimum_action_revision = kit->lab->revision;
  kit->lab->ready = 0;
  for (unsigned i = 0; i < 10; ++i)
    kit->lab->gestures[i].allowed = 0;
  refresh(&kit->companion, 1);
  refresh(&kit->dock, 1);
}
static void fail(DeviceKit *kit) {
  kit->failed = 1;
  kit->lab->storage_error = 1;
  strcpy(kit->lab->message,
         "Device journal unavailable. Preserve files; reload to recover.");
  strcpy(kit->companion.message, "Storage unavailable. Cargo preserved.");
  refresh_all(kit);
}
static uint32_t checksum(const KitJournal *journal) {
  const unsigned char *bytes = (const unsigned char *)journal;
  uint32_t hash = 2166136261u;
  for (size_t i = sizeof(journal->checksum); i < sizeof(*journal); ++i)
    hash = (hash ^ bytes[i]) * 16777619u;
  return hash;
}
static uint32_t envelope_checksum_length(const SavedKitEnvelope *saved, size_t length) {
  const unsigned char *bytes = (const unsigned char *)saved;
  uint32_t hash = 2166136261u;
  for (size_t i = 0; i < length; ++i)
    if (i < offsetof(SavedKitEnvelopeV1, checksum) ||
        i >= offsetof(SavedKitEnvelopeV1, checksum) + sizeof(saved->original.checksum))
      hash = (hash ^ bytes[i]) * 16777619u;
  return hash;
}
static uint32_t envelope_checksum(const SavedKitEnvelope *saved) {
  return envelope_checksum_length(saved, sizeof(*saved));
}
static int write_envelope(const DeviceKit *kit, const KitJournal *journal,
                          const KitResidentCache *residents, unsigned dock_visits) {
  SavedKitEnvelope saved;
  memset(&saved, 0, sizeof(saved));
  memcpy(saved.original.magic, KIT_ENVELOPE_MAGIC, sizeof(saved.original.magic));
  saved.original.version = KIT_ENVELOPE_VERSION;
  saved.original.file_size = sizeof(saved);
  saved.original.journal = *journal;
  saved.original.journal.checksum = checksum(&saved.original.journal);
  saved.original.residents = *residents;
  saved.original.dock_visits = dock_visits;
  saved.sealed_field = kit->sealed_field;
  saved.acknowledged_capsules = kit->acknowledged_capsules;
  strcpy(saved.counted_capsule_haul, kit->counted_capsule_haul);
  saved.original.checksum = envelope_checksum(&saved);
  return save_bytes_write_status(kit->journal_path, &saved, sizeof(saved));
}
static int persist(DeviceKit *kit) {
  kit->journal.checksum = checksum(&kit->journal);
  if (write_envelope(kit, &kit->journal, &kit->residents, kit->dock_visits) !=
      SAVE_BYTES_COMMITTED) {
    fail(kit);
    return 0;
  }
  return 1;
}
static int pending(const DeviceKit *kit) {
  return kit->journal.phase >= KIT_WAITING &&
         kit->journal.phase <= KIT_ACK_PENDING;
}
static const char *source_expedition(const KitJournal *journal) {
  if (!strncmp(journal->haul_id, "haul-", 5)) {
    const char *separator = strchr(journal->haul_id, '/');
    if (separator)
      return !strcmp(separator + 1, "-") ? "" : separator + 1;
  }
  return journal->haul_id;
}
static int same_cargo(const DeviceKit *kit) {
  const GameState *game = &kit->lab->game;
  const KitJournal *journal = &kit->journal;
  if (journal->version == 5) {
    GameReceivedExpedition field;
    game_field_record(game, &field);
    field.accepted_at = kit->sealed_field.accepted_at;
    field.accept_sequence = kit->sealed_field.accept_sequence;
    if (!game->field.version || memcmp(&field,&kit->sealed_field,sizeof(field))) return 0;
  }
  return !strcmp(game->expedition_id, source_expedition(journal)) &&
         game->expedition_data == journal->cargo[0] &&
         game->expedition_energy == journal->cargo[1] &&
         game->expedition_essence == journal->cargo[2] &&
         game->expedition_elapsed == journal->elapsed &&
         game->expedition_kind == journal->kind;
}
static GameResult apply(DeviceKit *kit, GameCommand command,
                        const char *identity) {
  char generated[64];
  if (kit->failed || kit->lab->storage_error)
    return GAME_STORAGE;
  if (!command.sequence)
    command.sequence = kit->lab->game.last_operation_sequence + 1;
  snprintf(generated, sizeof(generated), "kit-%llu",
           (unsigned long long)command.sequence);
  command.operation_id = identity ? identity : generated;
  if ((command.type >= GAME_COMMAND_FIELD_MOVE && command.type <= GAME_COMMAND_FIELD_COLLECT) ||
      command.type == GAME_COMMAND_FIELD_TAKE)
    command.data.field.expedition_id = kit->lab->game.expedition_id;
  GameResult result =
      game_apply(kit->lab->save_path, &kit->lab->game, &command);
  if (result == GAME_STORAGE || result == GAME_COMMITTED_UNCERTAIN)
    fail(kit);
  if (result == GAME_OK) {
    int field_tick = command.type == GAME_COMMAND_EXPEDITION_TICK && kit->lab->game.field.version;
    if (!field_tick) ++kit->lab->revision;
    refresh(&kit->companion, !field_tick);
  } else if (result != GAME_STORAGE && result != GAME_COMMITTED_UNCERTAIN &&
             result != GAME_DUPLICATE) {
    strcpy(kit->companion.message, "Action unavailable. No change saved.");
    refresh(&kit->companion, 1);
  }
  return result;
}
/* A persisted intent reserves the next game sequence. No later command can run
 * until this exact operation is committed/reconciled and its receipt is saved.
 */
static int reconcile(DeviceKit *kit) {
  if (kit->journal.phase != KIT_COMMITTING)
    return 1;
  GameState *game = &kit->lab->game;
  GameCommand command = {0};
  command.type = kit->journal.version == 1 ? GAME_COMMAND_EXPEDITION_OFFLOAD
                 : kit->journal.version == 2
                     ? GAME_COMMAND_EXPEDITION_TRANSFER
                 : kit->journal.version == 3
                     ? GAME_COMMAND_EXPEDITION_WHOLE_TRANSFER
                 : kit->journal.version == 5 ? GAME_COMMAND_FIELD_UNLOAD
                     : GAME_COMMAND_EXPEDITION_UNLOAD;
  if (command.type == GAME_COMMAND_FIELD_UNLOAD)
    command.data.field.record = &kit->sealed_field;
  command.sequence = kit->journal.accept_sequence;
  int committed = 0;
  if (game->last_operation_sequence == kit->journal.accept_sequence) {
    for (unsigned i = 0; i < GAME_OPERATION_SLOTS; ++i)
      if (game->operations[i].sequence == kit->journal.accept_sequence &&
          !strcmp(game->operations[i].id, kit->journal.haul_id))
        committed = apply(kit, command, kit->journal.haul_id) == GAME_DUPLICATE;
  } else if (game->last_operation_sequence + 1 ==
                 kit->journal.accept_sequence &&
             same_cargo(kit)) {
    committed = apply(kit, command, kit->journal.haul_id) == GAME_OK;
  }
  if (!committed) {
    fail(kit);
    return 0;
  }
  kit->journal.phase = KIT_ACK_PENDING;
  if (!persist(kit))
    return 0;
  strcpy(kit->lab->message, "Haul accepted. Receipt waiting for Companion.");
  kit->next_delivery = kit->clock + 2;
  refresh_all(kit);
  return 1;
}
static int valid_journal(const KitJournal *journal) {
  if (!memchr(journal->haul_id, 0, sizeof(journal->haul_id)))
    return 0;
  if (!strncmp(journal->haul_id, "haul-", 5)) {
    char *separator = NULL;
    errno = 0;
    unsigned long long sequence =
        strtoull(journal->haul_id + 5, &separator, 10);
    if (errno || !sequence || journal->haul_id[5] < '0' ||
        journal->haul_id[5] > '9' || !separator || *separator != '/' ||
        !separator[1] || strchr(separator + 1, '/'))
      return 0;
  }
  return journal->version >= 1 && journal->version <= 5 &&
         journal->checksum == checksum(journal) &&
         journal->phase <= KIT_COMPLETE && journal->companion_online <= 1 &&
         journal->dock_online <= 1 &&
         (journal->phase == KIT_IDLE || journal->haul_id[0]) &&
         journal->cargo[0] + (uint64_t)journal->cargo[1] + journal->cargo[2] <=
             GAME_CARGO_CAPACITY &&
         journal->elapsed <= GAME_EXPEDITION_SECONDS &&
         journal->kind <= GAME_EXPEDITION_RESONANCE;
}
static int cache_text(const char *text, size_t size) {
  return text[0] && memchr(text, 0, size);
}
static int valid_residents(const KitResidentCache *cache) {
  if (!cache->version) {
    const KitResidentCache empty = {0};
    return !memcmp(cache, &empty, sizeof(empty));
  }
  if (cache->version != KIT_RESIDENT_CACHE_VERSION ||
      cache->count > GAME_MAX_INDIVIDUALS || !cache->updated_at)
    return 0;
  for (unsigned i = 0; i < cache->count; ++i) {
    const KitResidentProjection *record = &cache->residents[i];
    const GameIndividual *resident = &record->individual;
    const GameIndividualMetadata *metadata = &record->metadata;
    if (!cache_text(resident->id, sizeof(resident->id)) ||
        !cache_text(resident->source_sample_id, sizeof(resident->source_sample_id)) ||
        !cache_text(resident->origin_kind, sizeof(resident->origin_kind)) ||
        !cache_text(resident->art_id, sizeof(resident->art_id)) ||
        !cache_text(resident->art_version, sizeof(resident->art_version)) ||
        resident->revealed != 1 || resident->origin_founder != 1 ||
        resident->art_pending || resident->habitat >= GAME_HABITAT_COUNT ||
        !pip_content_genome_valid(&resident->genome) ||
        !pip_content_expression_valid(&resident->genome, &resident->expression) ||
        !cache_text(metadata->candidate_id, sizeof(metadata->candidate_id)) ||
        !cache_text(metadata->reference_context, sizeof(metadata->reference_context)) ||
        !cache_text(metadata->mapping_version, sizeof(metadata->mapping_version)) ||
        !cache_text(metadata->appearance_descriptor, sizeof(metadata->appearance_descriptor)) ||
        !cache_text(metadata->original_art_version, sizeof(metadata->original_art_version)) ||
        !cache_text(metadata->original_art_sha256, sizeof(metadata->original_art_sha256)) ||
        strlen(metadata->original_art_sha256) != 64)
      return 0;
    for (unsigned digit = 0; digit < 64; ++digit) {
      char value = metadata->original_art_sha256[digit];
      if (!((value >= '0' && value <= '9') || (value >= 'a' && value <= 'f')))
        return 0;
    }
    for (unsigned earlier = 0; earlier < i; ++earlier)
      if (!strcmp(resident->id, cache->residents[earlier].individual.id))
        return 0;
  }
  const KitResidentProjection empty = {0};
  for (unsigned i = cache->count; i < GAME_MAX_INDIVIDUALS; ++i)
    if (memcmp(&cache->residents[i], &empty, sizeof(empty)))
      return 0;
  return 1;
}
static void project_residents(const GameState *game, KitResidentCache *cache) {
  memset(cache, 0, sizeof(*cache));
  cache->version = KIT_RESIDENT_CACHE_VERSION;
  for (unsigned i = 0; i < game->individual_count; ++i) {
    if (!game->individuals[i].revealed)
      continue;
    KitResidentProjection *record = &cache->residents[cache->count++];
    record->individual = game->individuals[i];
    record->metadata = game->individual_metadata[i];
  }
}
static int same_residents(const KitResidentCache *left, const KitResidentCache *right) {
  return left->version == right->version && left->count == right->count &&
         !memcmp(left->residents, right->residents, sizeof(left->residents));
}
unsigned kit_resident_count(const DeviceKit *kit) { return kit->residents.count; }
const KitResidentProjection *kit_resident(const DeviceKit *kit, unsigned index) {
  return index < kit->residents.count ? &kit->residents.residents[index] : NULL;
}
const KitResidentProjection *kit_selected_resident(const DeviceKit *kit) {
  for (unsigned i = 0; i < kit->residents.count; ++i)
    if (!strcmp(kit->selected_resident_id, kit->residents.residents[i].individual.id))
      return &kit->residents.residents[i];
  return NULL;
}
int kit_resident_cache_current(const DeviceKit *kit) {
  if (!kit->journal.companion_online || kit->resident_cache_failed ||
      kit->failed || kit->lab->storage_error)
    return 0;
  KitResidentCache current;
  project_residents(&kit->lab->game, &current);
  return same_residents(&kit->residents, &current);
}
int kit_resident_visit_available(const DeviceKit *kit) {
  const KitResidentProjection *resident = kit_selected_resident(kit);
  return resident && kit_resident_cache_current(kit) && !pending(kit) &&
         resident->individual.care_visits < GAME_MAX_CARE_VISITS;
}
uint64_t kit_residents_updated_at(const DeviceKit *kit) { return kit->residents.updated_at; }
uint64_t kit_residents_world_revision(const DeviceKit *kit) { return kit->residents.world_revision; }
unsigned kit_dock_visits(const DeviceKit *kit) { return kit->dock_visits; }
int kit_dock_cache_current(const DeviceKit *kit) {
  if (!kit->journal.dock_online || kit->dock_cache_failed ||
      kit->failed || kit->lab->storage_error || !kit->journal.dock_updated_at)
    return 0;
  const GameState *game = &kit->lab->game;
  unsigned residents = 0, visits = 0;
  for (unsigned i = 0; i < game->individual_count; ++i)
    if (game->individuals[i].revealed) {
      ++residents;
      visits += game->individuals[i].care_visits;
    }
  return kit->journal.dock_stock[0] == game->data &&
         kit->journal.dock_stock[1] == game->energy &&
         kit->journal.dock_stock[2] == game->essence &&
         kit->journal.dock_samples == game->sample_count &&
         kit->journal.dock_residents == residents &&
         kit->journal.dock_incubations == game->incubation_active && kit->dock_visits == visits;
}
static void retain_resident_selection(DeviceKit *kit) {
  unsigned selected = 0;
  for (unsigned i = 0; i < kit->residents.count; ++i)
    if (!strcmp(kit->selected_resident_id, kit->residents.residents[i].individual.id))
      selected = i;
  if (kit->residents.count)
    strcpy(kit->selected_resident_id, kit->residents.residents[selected].individual.id);
  else
    kit->selected_resident_id[0] = 0;
  kit->companion.action_focus[COMP_FRIENDS] = selected;
  if (kit->companion.page == COMP_FRIENDS)
    kit->companion.focus = selected;
  for (unsigned depth = 0; depth < kit->companion.task_depth; ++depth)
    if (kit->companion.task_page[depth] == COMP_FRIENDS)
      kit->companion.task_focus[depth] = selected;
}
static int sync_projections(DeviceKit *kit, int force_companion, int force_dock) {
  KitResidentCache residents = kit->residents;
  KitJournal journal = kit->journal;
  unsigned dock_visits = kit->dock_visits;
  int companion_changed = 0, dock_changed = 0;
  const GameState *game = &kit->lab->game;
  if (journal.companion_online && (!kit->resident_cache_failed || force_companion)) {
    KitResidentCache current;
    project_residents(game, &current);
    companion_changed = force_companion || kit->resident_cache_failed ||
                        !same_residents(&residents, &current);
    if (companion_changed) {
      current.world_revision = game->revision;
      current.updated_at = (uint64_t)time(NULL);
      residents = current;
    }
  }
  if (journal.dock_online && (!kit->dock_cache_failed || force_dock)) {
    unsigned count = 0, visits = 0;
    for (unsigned i = 0; i < game->individual_count; ++i)
      if (game->individuals[i].revealed) {
        ++count;
        visits += game->individuals[i].care_visits;
      }
    dock_changed = force_dock || kit->dock_cache_failed ||
        journal.dock_stock[0] != game->data || journal.dock_stock[1] != game->energy ||
        journal.dock_stock[2] != game->essence || journal.dock_samples != game->sample_count ||
        journal.dock_residents != count || journal.dock_incubations != game->incubation_active ||
        dock_visits != visits || !journal.dock_updated_at;
    if (dock_changed) {
      journal.dock_stock[0] = game->data;
      journal.dock_stock[1] = game->energy;
      journal.dock_stock[2] = game->essence;
      journal.dock_samples = game->sample_count;
      journal.dock_residents = count;
      journal.dock_incubations = game->incubation_active;
      journal.dock_world_revision = game->revision;
      journal.dock_updated_at = (uint64_t)time(NULL);
      dock_visits = visits;
    }
  }
  if (!companion_changed && !dock_changed)
    return 1;
  int result = write_envelope(kit, &journal, &residents, dock_visits);
  if (result != SAVE_BYTES_COMMITTED) {
    /* World acceptance is independent. Keep last accepted projection bytes;
     * a later sync retries only this envelope, never the CARE_VISIT command. */
    kit->resident_cache_failed |= companion_changed;
    kit->dock_cache_failed |= dock_changed;
    if (companion_changed)
      strcpy(kit->companion.message, "Snapshot not saved. Cached record is stale; reconnect to refresh.");
    refresh(&kit->companion, 1);
    refresh(&kit->dock, 0);
    return 0;
  }
  journal.checksum = checksum(&journal);
  kit->journal = journal;
  kit->residents = residents;
  kit->dock_visits = dock_visits;
  if (companion_changed)
    kit->resident_cache_failed = 0;
  if (dock_changed)
    kit->dock_cache_failed = 0;
  retain_resident_selection(kit);
  if (companion_changed)
    refresh(&kit->companion, 1);
  if (dock_changed) {
    kit->dock_updated = kit->clock;
    refresh(&kit->dock, 0);
  }
  return 1;
}
static void open_reception(DeviceKit *kit) {
  if (kit->journal.phase != KIT_ARRIVED ||
      !strcmp(kit->opened_haul, kit->journal.haul_id))
    return;
  SelectedLab *lab = kit->lab;
  selected_lab_capture_context(lab, &kit->caller);
  kit->caller_valid = 1;
  strcpy(kit->opened_haul, kit->journal.haul_id);
  selected_lab_open_reception(lab);
  refresh(&kit->companion, 1);
  refresh(&kit->dock, 1);
}
static void return_to_caller(DeviceKit *kit) {
  SelectedLab *lab = kit->lab;
  selected_lab_restore_context(lab, &kit->caller);
  kit->caller_valid = 0;
  refresh(&kit->companion, 1);
  refresh(&kit->dock, 1);
}
static int normalize_stock(DeviceKit *kit) {
  kit->normalization_pending = game_supply_conversion_pending(&kit->lab->game);
  if (!kit->normalization_pending || kit->journal.phase == KIT_WAITING ||
      kit->journal.phase == KIT_ARRIVED || kit->journal.phase == KIT_COMMITTING)
    return 1;
  GameCommand command = {0};
  command.type = GAME_COMMAND_STOCK_NORMALIZE;
  GameResult result = apply(kit, command, NULL);
  if (result == GAME_OK)
    kit->normalization_pending = 0;
  return result == GAME_OK || result == GAME_UNAVAILABLE;
}
static unsigned legacy_acknowledged_capsules(const DeviceKit *kit) {
  unsigned count = 0;
  const GameState *game = &kit->lab->game;
  for (unsigned sample = 0; sample < game->sample_count; ++sample) {
    const char *origin = game->samples[sample].origin_expedition_id;
    if (strncmp(origin, "BEE-E-", 6))
      continue;
    if ((kit->journal.phase == KIT_ACK_PENDING || kit->journal.phase == KIT_COMMITTING) &&
        !strcmp(origin, source_expedition(&kit->journal)))
      continue;
    ++count;
  }
  return count;
}

int kit_init(DeviceKit *kit, SelectedLab *lab, uint32_t clock) {
  memset(kit, 0, sizeof(*kit));
  kit->lab = lab;
  lab->kit_mode = 1;
  kit->clock = clock;
  kit->companion.revision = kit->companion.epoch = 1;
  kit->dock.revision = kit->dock.epoch = 1;
  kit->companion.minimum_action_revision = 1;
  kit->companion.page = COMP_MODES;
  kit->dock.minimum_action_revision = 1;
  snprintf(kit->journal_path, sizeof(kit->journal_path), "%s.kit",
           lab->save_path);
  char marker[580];
  snprintf(marker, sizeof(marker), "%s.required", kit->journal_path);
  FILE *file = fopen(kit->journal_path, "rb");
  if (file) {
    SavedKitEnvelope saved;
    memset(&saved, 0, sizeof(saved));
    size_t read = fread(&saved, 1, sizeof(saved), file);
    int extra = fgetc(file);
    int closed = fclose(file);
    if (extra != EOF || closed) {
      fail(kit);
      return 0;
    }
    if (read == sizeof(KitJournal)) {
      /* Validate the exact old bytes before wrapping any version1-4 intent. */
      memcpy(&kit->journal, &saved, sizeof(kit->journal));
      if (!valid_journal(&kit->journal)) {
        fail(kit);
        return 0;
      }
      kit->acknowledged_capsules = legacy_acknowledged_capsules(kit);
    } else {
      const SavedKitEnvelopeV1 *original = &saved.original;
      int old = read == sizeof(SavedKitEnvelopeV1) && original->version == 1;
      if ((!old && (read != sizeof(saved) || original->version != KIT_ENVELOPE_VERSION)) ||
          memcmp(original->magic, KIT_ENVELOPE_MAGIC, sizeof(original->magic)) ||
          original->file_size != read ||
          original->checksum != envelope_checksum_length(&saved, read) ||
          !valid_journal(&original->journal) || !valid_residents(&original->residents) ||
          original->dock_visits > GAME_MAX_INDIVIDUALS * GAME_MAX_CARE_VISITS ||
          saved.acknowledged_capsules > GAME_MAX_SAMPLES ||
          !memchr(saved.counted_capsule_haul, 0, sizeof(saved.counted_capsule_haul)) ||
          (original->journal.version == 5 && !game_received_valid(&saved.sealed_field))) {
        fail(kit);
        return 0;
      }
      kit->journal = original->journal;
      kit->residents = original->residents;
      kit->dock_visits = original->dock_visits;
      kit->sealed_field = saved.sealed_field;
      kit->acknowledged_capsules = saved.acknowledged_capsules;
      strcpy(kit->counted_capsule_haul, saved.counted_capsule_haul);
      if (old) {
        /* Migrate only actual accepted own-capsule provenance; the current
         * unacknowledged source remains excluded until its matching receipt. */
        kit->acknowledged_capsules = legacy_acknowledged_capsules(kit);
      }
    }
  } else {
    if (errno != ENOENT) {
      fail(kit);
      return 0;
    }
    file = fopen(marker, "rb");
    if (file) {
      fclose(file);
      fail(kit);
      return 0;
    }
    if (errno != ENOENT) {
      fail(kit);
      return 0;
    }
    kit->journal.version = 4;
    kit->journal.companion_online = kit->journal.dock_online = 1;
    kit->acknowledged_capsules = legacy_acknowledged_capsules(kit);
    if (!persist(kit))
      return 0;
  }
  if (save_bytes_write(marker, "KIT1", 4)) {
    fail(kit);
    return 0;
  }
  if ((kit->journal.phase == KIT_WAITING ||
       kit->journal.phase == KIT_ARRIVED) &&
      !same_cargo(kit)) {
    fail(kit);
    return 0;
  }
  if (kit->journal.phase >= KIT_ACK_PENDING) {
    if (!kit->journal.accept_sequence ||
        lab->game.last_operation_sequence < kit->journal.accept_sequence) {
      fail(kit);
      return 0;
    }
    int found = 0;
    for (unsigned i = 0; i < GAME_OPERATION_SLOTS; ++i) {
      const GameOperation *operation = &lab->game.operations[i];
      if (operation->sequence == kit->journal.accept_sequence)
        found = 1;
      if (operation->sequence == kit->journal.accept_sequence &&
          strcmp(operation->id, kit->journal.haul_id)) {
        fail(kit);
        return 0;
      }
    }
    if (lab->game.last_operation_sequence == kit->journal.accept_sequence &&
        !found) {
      fail(kit);
      return 0;
    }
  }
  if (kit->journal.phase == KIT_ACK_PENDING &&
      (lab->game.expedition_active ||
       (kit->journal.version == 1 || kit->journal.version >= 4
            ? lab->game.expedition_id[0] != 0 ||
                  lab->game.expedition_elapsed != 0
        : kit->journal.elapsed < GAME_EXPEDITION_SECONDS
            ? strcmp(lab->game.expedition_id,
                     source_expedition(&kit->journal)) ||
                  lab->game.expedition_elapsed != kit->journal.elapsed ||
                  lab->game.expedition_kind != kit->journal.kind
            : lab->game.expedition_id[0] != 0 ||
                  lab->game.expedition_elapsed != 0))) {
    fail(kit);
    return 0;
  }
  kit->next_delivery = clock + 2;
  if (!reconcile(kit) || !normalize_stock(kit))
    return 0;
  open_reception(kit);
  retain_resident_selection(kit);
  (void)sync_projections(kit, kit->journal.companion_online,
                        kit->journal.dock_online);
  return 1;
}
const char *kit_stage(const DeviceKit *kit) {
  if (kit->failed || kit->lab->storage_error)
    return "Storage unavailable";
  if (kit->journal.phase == KIT_WAITING)
    return kit->journal.companion_online ? "Sending to Station"
                                         : "Waiting for Station link";
  static const char *names[] = {"",
                                "",
                                "Received at Station - accept there",
                                "Saving in Station",
                                "Accepted in Station - receipt pending",
                                "Receipt confirmed"};
  return names[kit->journal.phase];
}
const char *kit_route(const DeviceKit *kit) {
  static const char *routes[] = {"Field survey", "Garden forage",
                                 "Weather watch"};
  if (pending(kit) && !source_expedition(&kit->journal)[0])
    return "Stored supplies";
  unsigned kind =
      pending(kit) ? kit->journal.kind : kit->lab->game.expedition_kind;
  return routes[kind % 3];
}
const char *kit_expedition_status(const DeviceKit *kit) {
  const GameState *game = &kit->lab->game;
  if (kit->journal.phase >= KIT_ACK_PENDING &&
      !game->expedition_id[0] && source_expedition(&kit->journal)[0])
    return "Expedition ended";
  if (pending(kit))
    return "Returning";
  if (game->field.version)
    return game_field_finite(game) ? "Exploring" : "Collection ended";
  if (game->expedition_elapsed >= GAME_EXPEDITION_SECONDS)
    return "Expedition complete";
  if (kit->companion.page == COMP_SEND_REVIEW ||
      (game->expedition_id[0] && !game->expedition_active))
    return "Paused";
  if (game->expedition_active) {
    return game_gather_capacity_blocked(game) ? "Not enough room" : "Gathering";
  }
  return "Choose a route";
}
const GameSample *kit_received_sample(const DeviceKit *kit) {
  if (kit->journal.phase < KIT_ACK_PENDING)
    return NULL;
  for (unsigned i = 0; i < kit->lab->game.sample_count; ++i)
    if (!strcmp(kit->lab->game.samples[i].origin_expedition_id,
                source_expedition(&kit->journal)))
      return &kit->lab->game.samples[i];
  return NULL;
}
int kit_lab_explore(const DeviceKit *kit) {
  return kit->lab->page == V1_EXPEDITION || kit->lab->page == V1_CARGO;
}
static unsigned probe_option_count(const DeviceKit *kit) {
  if (kit->lab->game.field.version && game_field_finite(&kit->lab->game)) return 1;
  if (!pending(kit) && kit->lab->game.expedition_id[0] &&
      !game_transfer_available(&kit->lab->game))
    return 2;
  return kit->lab->game.expedition_id[0] || pending(kit) ? 1 : 3;
}
unsigned kit_field_choice(const DeviceKit *kit, unsigned index) {
  const GameExpeditionField *field = &kit->lab->game.field;
  if (!game_field_finite(&kit->lab->game) || pending(kit)) return KIT_FIELD_NO_CHOICE;
  unsigned site = game_field_site(&kit->lab->game);
  for (unsigned source = 0; source < GAME_FIELD_SOURCES; ++source) {
    if (game_field_source_site(source) == site && field->remaining[source]) {
      if (!index) return source;
      --index;
    }
  }
  if (site == 1 && !field->trace && field->sample_budget) {
    if (!index) return KIT_FIELD_TRACE;
    --index;
  }
  if (site == 4 && field->trace && !field->collected && field->sample_budget && !index)
    return KIT_FIELD_CAPSULE;
  return KIT_FIELD_NO_CHOICE;
}
static unsigned field_choice_count(const DeviceKit *kit) {
  unsigned count = 0;
  while (count < 3 && kit_field_choice(kit, count) != KIT_FIELD_NO_CHOICE) ++count;
  return count;
}
static unsigned carried_units(const DeviceKit *kit, unsigned resource) {
  const GameState *game = &kit->lab->game;
  const unsigned quantities[] = {game->expedition_data, game->expedition_energy,
                                 game->expedition_essence};
  return quantities[resource % 3] / GAME_SUPPLY_UNIT;
}
unsigned kit_option_count(const DeviceKit *kit, unsigned device) {
  if (device == KIT_DOCK)
    return kit->dock.page == 2 ? 2 : 3;
  switch (kit->companion.page) {
  case COMP_FIELD_SITE: {
    return field_choice_count(kit);
  }
  case COMP_MODES:
    return 3;
  case COMP_SEND_REVIEW:
  case COMP_DISCARD_REVIEW:
  case COMP_FINISH_REVIEW:
    return 2;
  case COMP_DISCARD_CLASS:
    return 4;
  case COMP_DISCARD_QUANTITY:
    return carried_units(kit, kit->companion.discard_resource) + 1;
  case COMP_CARGO:
    return !pending(kit) && kit->lab->game.expedition_id[0] &&
                   game_transfer_available(&kit->lab->game) ? 2 : 1;
  case COMP_FRIENDS:
    return kit->residents.count ? kit->residents.count : 1;
  case COMP_FRIEND_VISIT:
    return 2;
  default:
    return probe_option_count(kit);
  }
}
const char *kit_option(const DeviceKit *kit, unsigned device, unsigned index) {
  if (device == KIT_DOCK) {
    if (kit->dock.page == 2)
      return index ? "Cancel" : "Print preview (simulation)";
    static const char *pages[] = {"World", "Supplies", "Connections"};
    return pages[index % 3];
  }
  switch (kit->companion.page) {
  case COMP_FIELD_SITE: {
    unsigned choice = kit_field_choice(kit, index);
    if (choice == KIT_FIELD_TRACE) return "Read trace";
    if (choice == KIT_FIELD_CAPSULE) return "Collect sealed sample";
    if (choice >= GAME_FIELD_SOURCES) return "Place cleared";
    static char offer[64];
    const char *names[] = {"Data", "Energy", "Essence"};
    snprintf(offer, sizeof(offer), "Take %u %s", kit->lab->game.field.remaining[choice],
             names[game_field_source_resource(choice)]);
    return offer;
  }
  case COMP_MODES: {
    static const char *modes[] = {"Probe", "Cargo", "Companions"};
    return modes[index % 3];
  }
  case COMP_SEND_REVIEW:
    return index ? "Keep cargo" : "Send to Station";
  case COMP_DISCARD_CLASS: {
    static const char *resources[] = {"Data", "Energy", "Essence", "Keep cargo"};
    return resources[index % 4];
  }
  case COMP_DISCARD_QUANTITY: {
    if (index >= carried_units(kit, kit->companion.discard_resource))
      return "Keep cargo";
    static char quantity[40];
    snprintf(quantity, sizeof(quantity), "%u whole %s", index + 1,
             index ? "items" : "item");
    return quantity;
  }
  case COMP_DISCARD_REVIEW:
    return index ? "Keep these items" : "Discard selected items";
  case COMP_FINISH_REVIEW:
    return index ? "Keep exploring" : "End expedition";
  case COMP_CARGO:
    if (index)
      return "Discard items";
    return pending(kit)                               ? "Return to Probe"
           : game_transfer_available(&kit->lab->game) ? "Send to Station"
           : kit->lab->game.field.version ? "Finish expedition"
           : !kit->lab->game.expedition_id[0] &&
                     kit->journal.phase >= KIT_ACK_PENDING
               ? "Choose a new expedition"
                                                      : "Return to Probe";
  case COMP_FRIENDS:
    return index < kit->residents.count ? kit->residents.residents[index].individual.id
                                        : "Return to Probe";
  case COMP_FRIEND_VISIT:
    return index ? "Choose resident" : "Spend time together";
  default: {
    static const char *routes[] = {"Field survey", "Garden forage",
                                   "Weather watch"};
    if (game_field_finite(&kit->lab->game) && !pending(kit)) {
      unsigned count = field_choice_count(kit);
      if (count > 1) return "Choose a finding";
      unsigned choice = kit_field_choice(kit, 0);
      if (choice == KIT_FIELD_TRACE) return "Read trace";
      if (choice == KIT_FIELD_CAPSULE) return "Collect sealed sample";
      if (choice >= GAME_FIELD_SOURCES) return "Place cleared / keep exploring";
      static char offer[64];
      const char *names[] = {"Data", "Energy", "Essence"};
      snprintf(offer, sizeof(offer), "Take %u %s", kit->lab->game.field.remaining[choice],
               names[game_field_source_resource(choice)]);
      return offer;
    }
    if (!pending(kit) && kit->lab->game.expedition_id[0] &&
        !game_transfer_available(&kit->lab->game))
      return index ? "Finish expedition" : "View cargo";
    return kit->lab->game.expedition_id[0] || pending(kit) ? "View cargo"
                                                           : routes[index % 3];
  }
  }
}
static void companion_page(DeviceKit *kit, unsigned page) {
  kit->companion.page = page;
  kit->companion.focus = 0;
  kit->companion.field_result = 0;
  if (page < COMP_MODES)
    kit->companion.mode = page;
  refresh(&kit->companion, 1);
}
static void companion_task(DeviceKit *kit, unsigned page) {
  KitView *view = &kit->companion;
  if (view->task_depth < 4) {
    view->task_page[view->task_depth] = view->page;
    view->task_focus[view->task_depth] = view->focus;
    ++view->task_depth;
  }
  companion_page(kit, page);
  if (page == COMP_SEND_REVIEW || page == COMP_DISCARD_REVIEW ||
      page == COMP_FINISH_REVIEW)
    kit->companion.focus = 1; /* Review starts on the reversible Keep action. */
}
static void companion_back(DeviceKit *kit) {
  KitView *view = &kit->companion;
  if (view->task_depth) {
    --view->task_depth;
    companion_page(kit, view->task_page[view->task_depth]);
    unsigned count = kit_option_count(kit, KIT_COMPANION);
    unsigned remembered = view->task_focus[view->task_depth];
    view->focus = count && remembered < count ? remembered : 0;
  } else if (view->page != COMP_MODES) {
    if (view->page < COMP_MODES) {
      view->mode = view->page;
      view->action_focus[view->mode] = view->focus;
    }
    view->page = COMP_MODES;
    view->focus = view->mode;
    refresh(view, 1);
  }
  /* Results can remove rows (for example discarding the final item). */
  unsigned count = kit_option_count(kit, KIT_COMPANION);
  if (view->focus >= count)
    view->focus = 0;
}
static void companion_enter_actions(DeviceKit *kit) {
  KitView *view = &kit->companion;
  companion_page(kit, view->mode);
  unsigned count = kit_option_count(kit, KIT_COMPANION);
  unsigned remembered = view->action_focus[view->mode];
  view->focus = count && remembered < count ? remembered : 0;
  if (view->mode == COMP_FRIENDS)
    retain_resident_selection(kit);
}
static void visit_resident(DeviceKit *kit) {
  if (!kit_resident_visit_available(kit)) {
    const char *reason = !kit->journal.companion_online
        ? "Offline snapshot. Reconnect before visiting."
        : pending(kit) ? "Finish the pending transfer before visiting."
        : !kit_resident_cache_current(kit)
            ? "Cached record is stale. Reconnect before visiting."
            : "Visit unavailable for this resident.";
    snprintf(kit->companion.message, sizeof(kit->companion.message), "%s", reason);
    refresh(&kit->companion, 1);
    return;
  }
  const KitResidentProjection *selected = kit_selected_resident(kit);
  unsigned index = 0;
  while (index < kit->lab->game.individual_count &&
         strcmp(kit->lab->game.individuals[index].id, selected->individual.id))
    ++index;
  if (index == kit->lab->game.individual_count)
    return;
  GameCommand command = {0};
  command.type = GAME_COMMAND_CARE_VISIT;
  command.data.individual = index;
  if (apply(kit, command, NULL) != GAME_OK)
    return;
  unsigned visits = kit->lab->game.individuals[index].care_visits;
  snprintf(kit->lab->message, sizeof(kit->lab->message), "Visit saved for %s (%u).",
           kit->lab->game.individuals[index].id, visits);
  int cached = sync_projections(kit, 0, 0);
  snprintf(kit->companion.message, sizeof(kit->companion.message),
           cached ? "Visit saved (%u). Pip settles beside you."
                  : "Visit saved in Station (%u). Snapshot stale; reconnect to refresh.", visits);
  refresh_all(kit);
}
static void seal(DeviceKit *kit) {
  GameState *game = &kit->lab->game;
  if (pending(kit) || !game_transfer_available(game))
    return;
  char identity[64];
  int length = snprintf(identity, sizeof(identity), "haul-%llu/%s",
                        (unsigned long long)(game->last_operation_sequence + 1),
                        game->expedition_id[0] ? game->expedition_id : "-");
  if (length < 0 || length >= (int)sizeof(identity)) {
    strcpy(kit->companion.message,
           "Transfer identity is too long. Cargo kept.");
    refresh(&kit->companion, 1);
    return;
  }
  kit->journal.version = game->field.version ? 5 : 4;
  memset(&kit->sealed_field, 0, sizeof(kit->sealed_field));
  if (game->field.version) game_field_record(game, &kit->sealed_field);
  strcpy(kit->journal.haul_id, identity);
  kit->journal.cargo[0] = game->expedition_data;
  kit->journal.cargo[1] = game->expedition_energy;
  kit->journal.cargo[2] = game->expedition_essence;
  kit->journal.elapsed = game->expedition_elapsed;
  kit->journal.kind = game->expedition_kind;
  kit->journal.phase = KIT_WAITING;
  kit->journal.accept_sequence = 0;
  if (!persist(kit))
    return;
  kit->next_delivery = kit->clock + 2;
  if (kit->companion.page == COMP_SEND_REVIEW) companion_back(kit);
  refresh_all(kit);
}
static void activate_companion(DeviceKit *kit) {
  unsigned focus = kit->companion.focus;
  switch (kit->companion.page) {
  case COMP_FIELD_SITE: {
    if (kit->companion.field_result) break;
    unsigned choice = kit_field_choice(kit, focus);
    unsigned site = game_field_site(&kit->lab->game);
    GameCommand command = {0};
    command.data.field.site = site;
    if (choice == KIT_FIELD_TRACE) command.type = GAME_COMMAND_FIELD_TRACE;
    else if (choice == KIT_FIELD_CAPSULE) command.type = GAME_COMMAND_FIELD_COLLECT;
    else if (choice < GAME_FIELD_SOURCES) {
      command.type = GAME_COMMAND_FIELD_TAKE;
      command.data.field.source = choice;
      command.data.field.quantity = kit->lab->game.field.remaining[choice];
    } else {
      strcpy(kit->companion.message, "Place cleared. Keep exploring.");
      refresh(&kit->companion, 1);
      break;
    }
    GameResult result = apply(kit, command, NULL);
    if (result == GAME_OK) {
      if (command.type == GAME_COMMAND_FIELD_TAKE) {
        const char *names[] = {"Data", "Energy", "Essence"};
        snprintf(kit->companion.message, sizeof(kit->companion.message), "Collected %u %s / saved",
                 command.data.field.quantity, names[game_field_source_resource(choice)]);
      } else strcpy(kit->companion.message, choice == KIT_FIELD_TRACE
                   ? "Trace read / route revealed" : "Sealed sample collected");
      kit->companion.field_result = 1;
      kit->companion.focus = 0;
    } else if (!kit->failed) {
      snprintf(kit->companion.message, sizeof(kit->companion.message), "%s",
               command.type == GAME_COMMAND_FIELD_TAKE ? "Not enough room / whole offer kept" : "Action unavailable / progress kept");
    }
    refresh(&kit->companion, 1);
    break;
  }
  case COMP_MODES:
    companion_enter_actions(kit);
    break;
  case COMP_SEND_REVIEW:
    if (focus)
      companion_back(kit);
    else
      seal(kit);
    break;
  case COMP_DISCARD_CLASS:
    if (focus == 3) {
      companion_back(kit);
    } else if (pending(kit)) {
      strcpy(kit->companion.message, "Haul sealed. Discard is unavailable.");
      refresh(&kit->companion, 1);
    } else if (!carried_units(kit, focus)) {
      strcpy(kit->companion.message, "No whole items of this kind in Cargo.");
      refresh(&kit->companion, 1);
    } else {
      kit->companion.discard_resource = focus;
      companion_task(kit, COMP_DISCARD_QUANTITY);
    }
    break;
  case COMP_DISCARD_QUANTITY:
    if (focus >= carried_units(kit, kit->companion.discard_resource))
      companion_back(kit);
    else {
      kit->companion.discard_quantity = (focus + 1) * GAME_SUPPLY_UNIT;
      companion_task(kit, COMP_DISCARD_REVIEW);
    }
    break;
  case COMP_DISCARD_REVIEW:
    if (focus)
      companion_back(kit);
    else if (pending(kit)) {
      strcpy(kit->companion.message, "Haul sealed. Items preserved.");
      refresh(&kit->companion, 1);
    } else {
      GameCommand command = {0};
      command.type = GAME_COMMAND_EXPEDITION_DISCARD;
      command.data.discard.resource = (GameResource)kit->companion.discard_resource;
      command.data.discard.quantity = kit->companion.discard_quantity;
      command.data.discard.confirm = 1;
      if (apply(kit, command, NULL) == GAME_OK) {
        while (kit->companion.task_depth &&
               kit->companion.page != COMP_CARGO)
          companion_back(kit);
        snprintf(kit->companion.message, sizeof(kit->companion.message),
                 "Discarded %u whole items. Cargo space freed.",
                 command.data.discard.quantity / GAME_SUPPLY_UNIT);
        refresh_all(kit);
      }
    }
    break;
  case COMP_FINISH_REVIEW:
    if (focus)
      companion_back(kit);
    else if (!pending(kit)) {
      GameCommand command = {0};
      command.type = GAME_COMMAND_EXPEDITION_FINISH;
      if (apply(kit, command, NULL) == GAME_OK) {
        companion_back(kit);
        kit->companion.focus = 0;
        strcpy(kit->companion.message, "Expedition ended. No sample earned.");
        refresh_all(kit);
      }
    }
    break;
  case COMP_CARGO:
    if (pending(kit)) {
      if (kit->companion.task_depth)
        companion_back(kit);
      else
        companion_page(kit, COMP_PROBE);
    } else if (game_transfer_available(&kit->lab->game)) {
      if (focus) companion_task(kit, COMP_DISCARD_CLASS);
      else seal(kit);
    } else if (kit->lab->game.field.version)
      companion_task(kit, COMP_FINISH_REVIEW);
    else {
      companion_page(kit, COMP_PROBE);
      strcpy(kit->companion.message, "Ready to gather. Choose an expedition.");
    }
    break;
  case COMP_FRIENDS:
    if (!kit->residents.count)
      companion_page(kit, COMP_PROBE);
    else if (focus < kit->residents.count) {
      strcpy(kit->selected_resident_id, kit->residents.residents[focus].individual.id);
      companion_task(kit, COMP_FRIEND_VISIT);
    }
    break;
  case COMP_FRIEND_VISIT:
    if (focus)
      companion_back(kit);
    else
      visit_resident(kit);
    break;
  default:
    if (game_field_finite(&kit->lab->game) && !pending(kit)) {
      unsigned site = game_field_site(&kit->lab->game);
      if (site >= GAME_FIELD_SITES) {
        strcpy(kit->companion.message, "Inspect at a named place.");
        refresh(&kit->companion, 1);
      } else if (field_choice_count(kit) == 1) {
        /* The full retained offer was visible before this fresh Confirm. */
        kit->companion.focus = 0;
        kit->companion.page = COMP_FIELD_SITE;
        activate_companion(kit);
        kit->companion.page = COMP_PROBE;
        refresh(&kit->companion, 1);
      } else {
        GameCommand inspect = {0};
        inspect.type = GAME_COMMAND_FIELD_INSPECT;
        inspect.data.field.site = site;
        if (apply(kit, inspect, NULL) == GAME_OK) companion_task(kit, COMP_FIELD_SITE);
      }
      break;
    }
    if (!pending(kit) && kit->lab->game.expedition_id[0] &&
        focus == 1 &&
        !game_transfer_available(&kit->lab->game)) {
      companion_task(kit, COMP_FINISH_REVIEW);
      break;
    }
    if (kit->lab->game.expedition_id[0] || pending(kit))
      companion_task(kit, COMP_CARGO);
    else {
      GameCommand command = {0};
      command.type = GAME_COMMAND_FIELD_START;
      command.data.field.kind = focus;
      command.data.field.monotonic_seconds = kit->clock;
      command.data.field.seed = 1428u + kit->lab->game.next_identity * 5755u;
      command.data.field.sample_budget = GAME_MAX_SAMPLES - kit->acknowledged_capsules;
      if (apply(kit, command, NULL) == GAME_OK) {
        if (kit->journal.phase == KIT_COMPLETE) {
          kit->journal.phase = KIT_IDLE;
          kit->journal.version = 4;
          memset(&kit->sealed_field, 0, sizeof(kit->sealed_field));
          persist(kit);
        }
        kit->companion.focus = 0;
        kit->companion.message[0] = 0; /* Route and activity already show success. */
      }
    }
  }
}
static void accept(DeviceKit *kit) {
  if (kit->journal.phase != KIT_ARRIVED || !same_cargo(kit))
    return;
  kit->journal.accept_sequence = kit->lab->game.last_operation_sequence + 1;
  /* A preacceptance snapshot stays intact; only this fresh intent adopts the
   * ending policy. Already reserved v1/v2/v3 intents keep their exact command. */
  if (kit->journal.version == 5) {
    kit->sealed_field.accepted_at = (uint64_t)time(NULL);
    kit->sealed_field.accept_sequence = kit->journal.accept_sequence;
  } else kit->journal.version = 4;
  kit->journal.phase = KIT_COMMITTING;
  if (persist(kit) && reconcile(kit))
    normalize_stock(kit);
}
static int held(const KitView *view) {
  for (unsigned i = 0; i < 10; ++i)
    if (view->gestures[i].held)
      return 1;
  return 0;
}
void kit_input(DeviceKit *kit, unsigned device, SelectedInput input,
               unsigned revision) {
  if (device == KIT_LAB) {
    if (kit->failed || kit->journal.phase == KIT_COMMITTING)
      return;
    int log = kit_lab_explore(kit) && kit->journal.phase != KIT_ARRIVED &&
              kit->journal.phase != KIT_COMMITTING && !kit->caller_valid;
    if (log && ((input == SELECTED_UP_UP || input == SELECTED_DOWN_UP ||
                 input == SELECTED_CONFIRM_UP) ||
                 (input == SELECTED_BACK_UP && (kit->received_detail || kit->received_caller_valid)) ||
                 (input == SELECTED_LEFT_UP && kit->received_caller_valid))) {
      unsigned button = (unsigned)input / 2;
      SelectedGesture gesture = kit->lab->gestures[button];
      memset(&kit->lab->gestures[button],0,sizeof(SelectedGesture));
      if (gesture.held && gesture.allowed && gesture.revision == revision &&
          gesture.interaction_epoch == kit->lab->interaction_epoch && !kit->lab->suspended) {
        unsigned count = kit_received_count(kit);
        if (input == SELECTED_CONFIRM_UP && count) kit->received_detail = 1;
        else if (input == SELECTED_BACK_UP || input == SELECTED_LEFT_UP) {
          if (kit->received_detail) kit->received_detail = 0;
          else {
            selected_lab_restore_context(kit->lab, &kit->received_caller);
            kit->received_caller_valid = 0;
            return;
          }
        }
        else if (!kit->received_detail && count) {
          if (input == SELECTED_UP_UP && kit->received_selected) --kit->received_selected;
          if (input == SELECTED_DOWN_UP && kit->received_selected + 1 < count) ++kit->received_selected;
        }
        ++kit->lab->revision; ++kit->lab->interaction_epoch;
        kit->lab->minimum_action_revision = kit->lab->revision; kit->lab->ready = 0;
      }
    } else if (kit_lab_explore(kit) &&
        ((input == SELECTED_CONFIRM_UP && kit->journal.phase == KIT_ARRIVED) ||
         ((input == SELECTED_BACK_UP || input == SELECTED_LEFT_UP) &&
          kit->caller_valid))) {
      unsigned button = (unsigned)input / 2;
      SelectedGesture before = kit->lab->gestures[button];
      int allowed = before.held && before.allowed &&
                    before.revision == revision &&
                    before.interaction_epoch == kit->lab->interaction_epoch &&
                    !kit->lab->suspended;
      memset(&kit->lab->gestures[button], 0, sizeof(SelectedGesture));
      if (allowed) {
        if (input == SELECTED_CONFIRM_UP)
          accept(kit);
        else
          return_to_caller(kit);
      }
    } else {
      unsigned before = kit->lab->revision;
      uint64_t before_world = kit->lab->game.revision;
      int from_resident = kit->lab->page == V1_HABITAT && kit->lab->focus == 2 &&
          input == SELECTED_CONFIRM_UP;
      SelectedLabContext received_caller;
      if (from_resident) selected_lab_capture_context(kit->lab, &received_caller);
      selected_lab_input(kit->lab, input, 0, revision);
      if (from_resident && kit->lab->page == V1_EXPEDITION && kit->lab->revision != before) {
        kit->received_caller = received_caller;
        kit->received_caller_valid = 1;
        kit->received_detail = 0;
      } else if (kit->lab->page != V1_EXPEDITION && kit->lab->page != V1_CARGO)
        kit->received_caller_valid = 0;
      if (input == SELECTED_HOME_UP && kit->lab->revision != before &&
          kit->lab->page == V1_HOME)
        kit->caller_valid = 0;
      if (kit->lab->game.revision != before_world)
        (void)sync_projections(kit, 0, 0);
    }
    return;
  }
  KitView *view = device == KIT_COMPANION ? &kit->companion : &kit->dock;
  if (input == SELECTED_READY) {
    if (!view->suspended && revision >= view->minimum_action_revision &&
        revision <= view->revision) {
      view->acknowledged = revision;
      view->acknowledged_epoch = view->epoch;
    }
    return;
  }
  if (input >= SELECTED_CANCEL) {
    memset(view->gestures, 0, sizeof(view->gestures));
    view->movement_consumed = 0;
    if (input != SELECTED_CANCEL) {
      view->suspended = input == SELECTED_SUSPEND;
      refresh(view, 1);
    }
    return;
  }
  unsigned button = (unsigned)input / 2;
  if (button >= 10)
    return;
  SelectedGesture *gesture = &view->gestures[button];
  if ((unsigned)input % 2 == 0) {
    if (gesture->held)
      return;
    int overlap = held(view);
    if (overlap)
      for (unsigned i = 0; i < 10; ++i)
        view->gestures[i].allowed = 0;
    gesture->held = 1;
    gesture->revision = revision;
    gesture->interaction_epoch = view->epoch;
    gesture->allowed = !overlap && !view->suspended && !kit->failed &&
                       !kit->lab->storage_error &&
                       revision == view->acknowledged &&
                       view->acknowledged_epoch == view->epoch;
    if (gesture->allowed && device == KIT_COMPANION && view->page == COMP_PROBE &&
        kit->lab->game.field.version && !pending(kit) && button < 4) {
      /* Travel is one eligible fresh press; release cannot take a second step.
       * Confirm/Send/acceptance retain their separate fresh-release contract. */
      gesture->allowed = 0;
      view->movement_consumed |= 1u << button;
      view->field_result = 0;
      view->message[0] = 0;
      GameCommand move = {0};
      move.type = GAME_COMMAND_FIELD_MOVE;
      move.data.field.direction = button;
      if (apply(kit, move, NULL) != GAME_OK && !kit->failed)
        strcpy(view->message, "Follow a visible path.");
      return;
    }
    if (gesture->allowed)
      refresh(view, 0);
    return;
  }
  int allowed = gesture->held && gesture->allowed &&
                gesture->revision == revision &&
                gesture->interaction_epoch == view->epoch;
  memset(gesture, 0, sizeof(*gesture));
  if (view->movement_consumed & (1u << button)) {
    view->movement_consumed &= ~(1u << button);
    refresh(view, 0);
    return;
  }
  if (!allowed || view->suspended)
    return;
  refresh(view, 0);
  view->message[0] = 0;
  if (device == KIT_COMPANION && view->page == COMP_FIELD_SITE &&
      view->field_result && button < 4) {
    companion_back(kit);
    view->page = COMP_PROBE;
  }
  if (device == KIT_COMPANION && view->page == COMP_FIELD_SITE && button < 4) {
    unsigned count = field_choice_count(kit);
    unsigned next = view->focus;
    if ((button == 0 || button == 2) && next) --next;
    if ((button == 1 || button == 3) && next + 1 < count) ++next;
    if (next != view->focus) {
      view->focus = next;
      refresh(view, 1);
    }
    return;
  }
  if (device == KIT_COMPANION && view->page == COMP_PROBE &&
      kit->lab->game.field.version && !pending(kit) && button < 4) {
    GameCommand command = {0};
    command.type = GAME_COMMAND_FIELD_MOVE;
    command.data.field.direction = button;
    if (apply(kit, command, NULL) != GAME_OK)
      strcpy(view->message, "Follow a visible path.");
    return;
  }
  if (device == KIT_COMPANION && view->page == COMP_MODES) {
    if (button <= 3) {
      unsigned mode = view->mode;
      if ((button == 0 || button == 2) && mode) --mode;
      if ((button == 1 || button == 3) && mode < COMP_FRIENDS) ++mode;
      if (mode != view->mode) {
        view->mode = view->focus = mode;
        refresh(view, 1);
      }
    } else if (button == 8) companion_enter_actions(kit);
    return;
  }
  if (button <= 1) {
    unsigned count = kit_option_count(kit, device);
    if (!count)
      return;
    if (device == KIT_COMPANION) {
      if (!button && !view->focus && !view->task_depth) {
        companion_back(kit);
        return;
      }
      unsigned focus = view->focus;
      if (!button && focus)
        --focus;
      if (button && focus + 1 < count)
        ++focus;
      if (focus != view->focus) {
        view->focus = focus;
        if (view->page < COMP_MODES)
          view->action_focus[view->page] = focus;
        if (view->page == COMP_FRIENDS && focus < kit->residents.count)
          strcpy(kit->selected_resident_id, kit->residents.residents[focus].individual.id);
        refresh(view, 1);
      }
    } else {
      view->focus = (view->focus + (button ? 1 : count - 1)) % count;
      refresh(view, 1);
    }
  } else if (device == KIT_COMPANION) {
    if (button == 9)
      companion_back(kit);
    else if (button == 8)
      activate_companion(kit);
  } else if (button == 4) {
    view->page = 2;
    view->focus = 0;
    refresh(view, 1);
  } else if (button == 5) {
    strcpy(view->message, "Feed simulated. No physical printer.");
    refresh(view, 0);
  } else if (button == 8) {
    if (view->page == 2) {
      strcpy(view->message, view->focus
                                ? "Print cancelled"
                                : "Preview only. Printer not connected.");
      view->page = 0;
      view->focus = 0;
    } else
      view->page = view->page ? 0 : 1;
    refresh(view, 1);
  }
}
int kit_link(DeviceKit *kit, unsigned device, int online) {
  if (kit->failed || (device != KIT_COMPANION && device != KIT_DOCK))
    return 0;
  if (device == KIT_COMPANION)
    kit->journal.companion_online = online != 0;
  else
    kit->journal.dock_online = online != 0;
  if (!persist(kit))
    return 0;
  if (online)
    (void)sync_projections(kit, device == KIT_COMPANION, device == KIT_DOCK);
  kit->next_delivery = kit->clock + 2;
  refresh_all(kit);
  return 1;
}
void kit_tick(DeviceKit *kit, uint32_t clock) {
  kit->clock = clock;
  if (kit->failed || kit->lab->storage_error || !reconcile(kit) ||
      !normalize_stock(kit))
    return;
  uint64_t before = kit->lab->game.revision;
  int before_active = kit->lab->game.expedition_active;
  int before_transfer = game_transfer_available(&kit->lab->game);
  int before_empty =
      !(kit->lab->game.expedition_data + kit->lab->game.expedition_energy +
        kit->lab->game.expedition_essence);
  int portable_held = held(&kit->companion);
  int expedition = !pending(kit) && !portable_held &&
                   !kit->companion.suspended &&
                   kit->companion.page != COMP_SEND_REVIEW &&
                   kit->companion.page != COMP_FINISH_REVIEW &&
                   kit->companion.page != COMP_DISCARD_CLASS &&
                   kit->companion.page != COMP_DISCARD_QUANTITY &&
                   kit->companion.page != COMP_DISCARD_REVIEW;
  if (!expedition)
    kit->lab->game.expedition_last_tick = clock;
  if (kit->lab->game.field.version) {
    kit->lab->game.expedition_last_tick = clock;
    selected_lab_tick_devices(kit->lab, clock, 0, 1);
  } else selected_lab_tick_devices(kit->lab, clock, expedition, 1);
  if (kit->lab->game.revision != before) {
    unsigned count = kit_option_count(kit, KIT_COMPANION);
    int focus_changed = kit->companion.focus >= count &&
                        kit->companion.focus != 0;
    if (focus_changed)
      kit->companion.focus = count ? count - 1 : 0;
    unsigned probe_count = probe_option_count(kit);
    if (kit->companion.action_focus[COMP_PROBE] >= probe_count)
      kit->companion.action_focus[COMP_PROBE] = probe_count - 1;
    int after_empty =
        !(kit->lab->game.expedition_data + kit->lab->game.expedition_energy +
          kit->lab->game.expedition_essence);
    refresh(&kit->companion,
            focus_changed ||
                before_active != kit->lab->game.expedition_active ||
                before_empty != after_empty ||
                before_transfer != game_transfer_available(&kit->lab->game));
  }
  if (kit->journal.companion_online && clock >= kit->next_delivery) {
    if (kit->journal.phase == KIT_WAITING) {
      kit->journal.phase = KIT_ARRIVED;
      if (!persist(kit))
        return;
      open_reception(kit);
    } else if (kit->journal.phase == KIT_ACK_PENDING) {
      const GameSample *sample = kit_received_sample(kit);
      if (sample && strcmp(kit->counted_capsule_haul,kit->journal.haul_id)) {
        if (kit->acknowledged_capsules >= GAME_MAX_SAMPLES) { fail(kit); return; }
        ++kit->acknowledged_capsules;
        strcpy(kit->counted_capsule_haul,kit->journal.haul_id);
      }
      kit->journal.phase = KIT_COMPLETE;
      if (!persist(kit))
        return;
      strcpy(kit->companion.message,
             "Receipt confirmed. Choose a new expedition.");
      strcpy(kit->lab->message, "Haul accepted; Companion receipt confirmed.");
      refresh_all(kit);
    }
  }
  (void)sync_projections(kit, 0, 0);
}
unsigned kit_revision(const DeviceKit *kit, unsigned device) {
  return device == KIT_LAB         ? kit->lab->revision
         : device == KIT_COMPANION ? kit->companion.revision
                                   : kit->dock.revision;
}
unsigned kit_width(unsigned device) {
  return device == KIT_LAB ? 1024 : device == KIT_COMPANION ? 450 : 792;
}
unsigned kit_height(unsigned device) { return device == KIT_DOCK ? 272 : 600; }
unsigned kit_received_count(const DeviceKit *kit) { return kit->lab->game.received_count; }
static const GameReceivedExpedition *received_record(const DeviceKit *kit, unsigned index) {
  const GameState *game = &kit->lab->game;
  if (index >= game->received_count) return NULL;
  unsigned position = (game->received_cursor + GAME_FIELD_HISTORY - 1u - index) % GAME_FIELD_HISTORY;
  return &game->received[position];
}
int kit_received_projection(const DeviceKit *kit, unsigned index, ExpeditionReceivedView *out) {
  memset(out,0,sizeof(*out));
  out->record_count = kit_received_count(kit);
  out->selected = out->record_count && index < out->record_count ? index : 0;
  out->detail = kit->received_detail;
  for (unsigned row = 0; row < out->record_count; ++row) {
    const GameReceivedExpedition *record = received_record(kit,row);
    snprintf(out->record_labels[row],sizeof(out->record_labels[row]),"%s / %u supplies%s",
             record->expedition_id,
             (record->cargo[0]+record->cargo[1]+record->cargo[2])/GAME_SUPPLY_UNIT,
             record->collected ? " / sample" : "");
  }
  const GameReceivedExpedition *record = received_record(kit,out->selected);
  if (!record) { strcpy(out->message,"No expedition records received yet."); return 1; }
  memcpy(out->map.terrain,record->terrain,sizeof(out->map.terrain));
  memcpy(out->map.paths,record->walked,sizeof(out->map.paths));
  memcpy(out->map.walked,record->walked,sizeof(out->map.walked));
  memcpy(out->map.site_x,record->site_x,5); memcpy(out->map.site_y,record->site_y,5);
  for (unsigned site = 0; site < 5; ++site) {
    out->map.site_visible[site] = out->map.site_visited[site] = !!(record->visited & (1u << site));
    out->map.site_inspected[site] = !!(record->inspected & (1u << site));
  }
  out->map.site_collected[4] = record->collected;
  strcpy(out->outing_id,record->expedition_id);
  strcpy(out->sample_id,record->sample_id);
  out->accepted_at = record->accepted_at;
  time_t received_at = (time_t)record->accepted_at;
  struct tm *date = gmtime(&received_at);
  if (date) strftime(out->received_label,sizeof(out->received_label),"Received %d %b / %H:%M UTC",date);
  else strcpy(out->received_label,"Received at Station");
  for (unsigned resource = 0; resource < 3; ++resource) out->accepted[resource] = record->cargo[resource]/GAME_SUPPLY_UNIT;
  out->trace_inspected = record->trace; out->sample_collected = record->collected;
  return 1;
}
int kit_delivery_accepted(const DeviceKit *kit) {
  if (!kit || !kit->lab) return 0;
  if (kit->journal.phase >= KIT_ACK_PENDING) return 1;
  if (kit->journal.phase != KIT_COMMITTING) return 0;
  /* The game commit can survive a failed receipt-sidecar write. */
  const GameState *game = &kit->lab->game;
  if (kit->journal.version == 5 &&
      (game->field.version || game->expedition_id[0])) return 0;
  for (unsigned i = 0; i < GAME_OPERATION_SLOTS; ++i)
    if (game->operations[i].sequence == kit->journal.accept_sequence &&
        !strcmp(game->operations[i].id, kit->journal.haul_id)) return 1;
  return 0;
}
int kit_field_projection(const DeviceKit *kit, ExpeditionFieldView *out) {
  memset(out,0,sizeof(*out));
  const GameState *game = &kit->lab->game;
  const GameExpeditionField *field = &game->field;
  if (kit->sealed_field.version && kit->journal.phase >= KIT_WAITING) {
    out->delivery_accepted = kit_delivery_accepted(kit);
    out->sent_capsule_count = kit->sealed_field.collected;
    for (unsigned resource = 0; resource < 3; ++resource)
      out->sent[resource] = kit->sealed_field.cargo[resource]/GAME_SUPPLY_UNIT;
  }
  if (!field->version) {
    if (!kit->sealed_field.version || kit->journal.phase < KIT_WAITING) return 0;
    const GameReceivedExpedition *sealed = &kit->sealed_field;
    strcpy(out->outing_id,sealed->expedition_id);
    out->capsule_count = out->delivery_accepted ? 0 : sealed->collected;
    out->capsule_capacity = 1;
    for (unsigned resource = 0; resource < 3; ++resource) {
      out->earned[resource] = out->delivery_accepted ? 0 : out->sent[resource];
      out->preparation_status[resource] = EXPEDITION_PREP_PAUSED;
    }
    return 1;
  }
  out->page = kit->companion.page == COMP_FIELD_SITE ? EXPEDITION_PAGE_SITE : EXPEDITION_PAGE_MAP;
  out->current_site = game_field_site(game);
  strcpy(out->location,game_field_site_name(out->current_site));
  strcpy(out->outing_id,game->expedition_id);
  strcpy(out->route,kit_route(kit));
  memcpy(out->map.terrain,field->terrain,sizeof(out->map.terrain));
  memcpy(out->map.walked,field->walked,sizeof(out->map.walked));
  for (unsigned tile = 0; tile < GAME_FIELD_CELLS; ++tile)
    out->map.paths[tile] = field->paths[tile] || (field->trace && field->hidden_paths[tile]);
  memcpy(out->map.site_x,field->site_x,5); memcpy(out->map.site_y,field->site_y,5);
  for (unsigned site = 0; site < 5; ++site) {
    out->map.site_visible[site] = site != 4 || field->trace;
    out->map.site_visited[site] = !!(field->visited & (1u << site));
    out->map.site_inspected[site] = !!(field->inspected & (1u << site));
    out->map.site_active[site] = game_field_source_site(field->active_source) == site;
  }
  out->map.site_collected[4] = field->collected;
  out->map.avatar_visible = 1; out->map.avatar_x = field->x; out->map.avatar_y = field->y;
  const uint32_t cargo[] = {game->expedition_data,game->expedition_energy,game->expedition_essence};
  for (unsigned resource = 0; resource < 3; ++resource) {
    out->earned[resource] = cargo[resource]/GAME_SUPPLY_UNIT;
    out->preparation_ms[resource] = game->gather_progress_ms[resource];
    unsigned source = field->last_source[resource];
    if (source >= GAME_FIELD_SOURCES) {
      strcpy(out->source_name[resource],"Not started");
      out->preparation_status[resource] = EXPEDITION_PREP_NOT_STARTED;
    } else {
      strcpy(out->source_name[resource],game_field_site_name(game_field_source_site(source)));
      out->remaining_chances[resource] = field->remaining[source];
      out->preparation_status[resource] = !field->remaining[source] ? EXPEDITION_PREP_FINISHED
        : source != field->active_source || pending(kit) || kit->companion.page == COMP_SEND_REVIEW
          ? EXPEDITION_PREP_PAUSED
        : game_gather_capacity_blocked(game) ? EXPEDITION_PREP_CAPACITY_FULL : EXPEDITION_PREP_ACTIVE;
    }
  }
  out->capsule_count = field->collected; out->capsule_capacity = 1;
  if (out->page == EXPEDITION_PAGE_SITE) {
    out->action_count = kit_option_count(kit,KIT_COMPANION);
    out->focus = kit->companion.focus;
    for (unsigned action = 0; action < out->action_count; ++action)
      snprintf(out->actions[action],sizeof(out->actions[action]),"%s",kit_option(kit,KIT_COMPANION,action));
  }
  strcpy(out->message,kit->companion.message);
  return 1;
}
static void json_string(FILE *output, const char *text) {
  fputc('"', output);
  for (const unsigned char *byte = (const unsigned char *)text; *byte; ++byte) {
    if (*byte == '"' || *byte == '\\') {
      fputc('\\', output);
      fputc(*byte, output);
    } else if (*byte < 0x20)
      fprintf(output, "\\u%04x", *byte);
    else
      fputc(*byte, output);
  }
  fputc('"', output);
}
static void resident_status(const DeviceKit *kit, FILE *output) {
  fprintf(output, ",\"resident_snapshot\":{\"count\":%u,\"current\":%s,"
          "\"visit_available\":%s,\"world_revision\":%llu,\"updated_at\":%llu,\"selected\":",
          kit_resident_count(kit), kit_resident_cache_current(kit) ? "true" : "false",
          kit_resident_visit_available(kit) ? "true" : "false",
          (unsigned long long)kit_residents_world_revision(kit),
          (unsigned long long)kit_residents_updated_at(kit));
  const KitResidentProjection *record = kit_selected_resident(kit);
  if (!record) {
    fputs("null}", output);
    return;
  }
  const char *keys[] = {"id", "source_sample_id", "art_id", "art_version",
                       "original_art_sha256", "appearance_descriptor", "reference_context",
                       "mapping_version", "original_art_version"};
  const char *values[] = {record->individual.id, record->individual.source_sample_id,
      record->individual.art_id, record->individual.art_version,
      record->metadata.original_art_sha256, record->metadata.appearance_descriptor,
      record->metadata.reference_context, record->metadata.mapping_version,
      record->metadata.original_art_version};
  fputc('{', output);
  for (unsigned field = 0; field < sizeof(keys) / sizeof(keys[0]); ++field) {
    if (field)
      fputc(',', output);
    json_string(output, keys[field]);
    fputc(':', output);
    json_string(output, values[field]);
  }
  fprintf(output, ",\"visits\":%u}}", record->individual.care_visits);
}
void kit_status(DeviceKit *kit, unsigned device, FILE *output) {
  const KitView *view = device == KIT_COMPANION ? &kit->companion : &kit->dock;
  const GameState *game = &kit->lab->game;
  unsigned visible_residents = 0;
  for (unsigned i = 0; i < game->individual_count; ++i)
    visible_residents += game->individuals[i].revealed;
  unsigned resident_count = device == KIT_COMPANION ? kit_resident_count(kit)
      : device == KIT_DOCK ? kit->journal.dock_residents : visible_residents;
  const unsigned stock[] = {
      device == KIT_DOCK ? kit->journal.dock_stock[0] : game->data,
      device == KIT_DOCK ? kit->journal.dock_stock[1] : game->energy,
      device == KIT_DOCK ? kit->journal.dock_stock[2] : game->essence};
  const char *focus =
      device == KIT_LAB
          ? (kit_lab_explore(kit)
                 ? (kit->journal.phase == KIT_ARRIVED ? "Accept haul"
                                                      : "Companion expeditions")
                 : selected_lab_focus(kit->lab))
          : device == KIT_COMPANION && game->field.version && view->page == COMP_PROBE
              ? (game_field_finite(game) ? kit_option(kit, device, view->focus) : "Collection ended / return cargo")
              : kit_option(kit, device, view->focus);
  const char *page = device == KIT_LAB          ? selected_lab_page(kit->lab)
                     : device == KIT_DOCK       ? "dock"
                     : view->page == COMP_PROBE ? "probe"
                     : view->page == COMP_CARGO ? "cargo"
                     : view->page == COMP_MODES ? "modes"
                     : view->page == COMP_SEND_REVIEW ? "send-review"
                     : view->page == COMP_DISCARD_CLASS ? "discard-class"
                     : view->page == COMP_DISCARD_QUANTITY ? "discard-quantity"
                     : view->page == COMP_DISCARD_REVIEW ? "discard-review"
                     : view->page == COMP_FINISH_REVIEW ? "finish-review"
                     : view->page == COMP_FRIEND_VISIT ? "resident-visit"
                     : view->page == COMP_FIELD_SITE ? "field-site"
                                                      : "companions";
  int online = device == KIT_COMPANION ? kit->journal.companion_online
               : device == KIT_DOCK    ? kit->journal.dock_online
                                       : 1;
  const uint32_t *cargo =
      kit->journal.phase >= KIT_WAITING && kit->journal.phase <= KIT_COMMITTING &&
              !kit_delivery_accepted(kit)
          ? kit->journal.cargo
          : NULL;
  uint32_t visible_cargo[3] = {0};
  uint32_t visible_preparation[3] = {0};
  if (device == KIT_COMPANION) {
    visible_cargo[0] = cargo ? cargo[0] : game->expedition_data;
    visible_cargo[1] = cargo ? cargo[1] : game->expedition_energy;
    visible_cargo[2] = cargo ? cargo[2] : game->expedition_essence;
    memcpy(visible_preparation, game->gather_progress_ms, sizeof(visible_preparation));
  } else if (device == KIT_LAB && kit->journal.phase >= KIT_ARRIVED &&
             !kit_delivery_accepted(kit)) {
    memcpy(visible_cargo, kit->journal.cargo, sizeof(visible_cargo));
  }
  fprintf(
      output,
      "{\"device\":%u,\"revision\":%u,\"width\":%u,\"height\":%u,\"page\":",
      device, kit_revision(kit, device), kit_width(device), kit_height(device));
  json_string(output, page);
  fputs(",\"focus\":", output);
  json_string(output, focus);
  fprintf(output, ",\"workspace\":%u,\"online\":%s,\"transfer\":",
          kit->lab->workspace, online ? "true" : "false");
  json_string(output, device == KIT_LAB && kit->journal.phase == KIT_ACK_PENDING
                         ? "Haul accepted; Companion receipt pending" : kit_stage(kit));
  fprintf(output, ",\"phase\":%u,\"haul\":", kit->journal.phase);
  json_string(output, kit->journal.haul_id);
  fprintf(output, ",\"stock\":[%u,%u,%u],\"cargo\":["
      "%u,%u,%u],\"samples\":%u,\"residents\":%u,\"dock_stock\":[%u,%u,%u],"
      "\"dock_cached\":%s,\"failed\":%s,\"stock_conversion_pending\":%s,"
      "\"mode\":%u,\"expedition_seconds\":%u,\"gather_progress_ms\":[%u,%u,%u],"
      "\"gather_remaining_ms\":%u,\"gather_attempted\":%u,\"gather_awarded\":%"
      "u,"
      "\"boundary\":\"Simulated wireless; "
      "radio not selected\"",
      stock[0], stock[1], stock[2], visible_cargo[0], visible_cargo[1], visible_cargo[2],
      device == KIT_DOCK ? kit->journal.dock_samples : game->sample_count, resident_count,
      kit->journal.dock_stock[0],
      kit->journal.dock_stock[1], kit->journal.dock_stock[2],
      kit_dock_cache_current(kit) ? "false" : "true",
      kit->failed ? "true" : "false",
      kit->normalization_pending ? "true" : "false", device == KIT_COMPANION ? kit->companion.mode : 0,
      device == KIT_COMPANION ? game->expedition_elapsed : 0, visible_preparation[0],
      visible_preparation[1], visible_preparation[2],
      device == KIT_COMPANION && !game->field.version ? game_gather_remaining_ms(game) : 0,
      device == KIT_COMPANION ? game->gather_last_attempted_mask : 0,
      device == KIT_COMPANION ? game->gather_last_awarded_mask : 0);
  fprintf(output, ",\"received_count\":%u,\"received_selected\":%u,\"received_detail\":%s",
          device == KIT_LAB ? game->received_count : 0, kit->received_selected,
          kit->received_detail ? "true" : "false");
  if (device == KIT_COMPANION) {
    ExpeditionFieldView field;
    int has_field = kit_field_projection(kit, &field);
    fprintf(output, ",\"cargo_capsules\":%u", has_field ? field.capsule_count : 0);
    if (has_field && kit->sealed_field.version && kit->journal.phase >= KIT_WAITING) {
      fprintf(output, ",\"delivery_record\":{\"accepted\":%s,\"supplies\":[%u,%u,%u],\"capsules\":%u}",
              field.delivery_accepted ? "true" : "false", field.sent[0], field.sent[1],
              field.sent[2], field.sent_capsule_count);
    }
  }
  if (device == KIT_COMPANION && game->field.version) {
    ExpeditionFieldView field;
    kit_field_projection(kit, &field);
    fprintf(output, ",\"field\":{\"content_version\":%u,\"remaining_unit\":\"%s\",\"position\":[%u,%u],\"site\":%u,\"trace\":%s,"
            "\"capsules\":%u,\"active_source\":%u,\"sample_budget\":%u,\"paths\":[",
            game->field.version, game_field_finite(game) ? "whole supplies" : "frozen legacy attempts",
            field.map.avatar_x, field.map.avatar_y, field.current_site,
            game->field.trace ? "true" : "false", field.capsule_count,
            game->field.active_source, game->field.sample_budget);
    int separator = 0;
    for (unsigned tile = 0; tile < GAME_FIELD_CELLS; ++tile)
      if (field.map.paths[tile]) {
        fprintf(output, "%s%u", separator ? "," : "", tile);
        separator = 1;
      }
    fputs("],\"sites\":[", output);
    separator = 0;
    for (unsigned site = 0; site < GAME_FIELD_SITES; ++site)
      if (field.map.site_visible[site]) {
        fprintf(output,"%s{\"id\":%u,\"tile\":[%u,%u],\"name\":",separator ? "," : "",
                site,field.map.site_x[site],field.map.site_y[site]);
        json_string(output,game_field_site_name(site));
        fputc('}',output);
        separator = 1;
      }
    fputs("],\"remaining\":[",output);
    for (unsigned source = 0; source < GAME_FIELD_SOURCES; ++source)
      fprintf(output,"%s%u",source ? "," : "",game->field.remaining[source]);
    fputs("]}",output);
  }
  fprintf(output, ",\"dock_visits\":%u,\"dock_updated_at\":%llu,"
          "\"dock_world_revision\":%llu,\"message\":", kit_dock_visits(kit),
          (unsigned long long)kit->journal.dock_updated_at,
          (unsigned long long)kit->journal.dock_world_revision);
  json_string(output, device == KIT_LAB ? kit->lab->message : view->message);
  resident_status(kit, output);
  fputs("}\n", output);
}
