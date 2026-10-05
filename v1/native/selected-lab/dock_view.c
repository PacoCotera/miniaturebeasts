#include "kit.h"
#include "../ui/dock_view.h"
#include <string.h>
#include <time.h>

int kit_dock_projection(const DeviceKit *kit, DockView *view) {
  if (!kit || !kit->lab || !view || kit->dock.page > 2) return 0;
  memset(view, 0, sizeof(*view));
  const KitJournal *journal = &kit->journal;
  view->page = kit->dock.page;
  view->focus = kit->dock.focus;
  view->action_count = kit_option_count(kit, KIT_DOCK);
  if (view->focus >= view->action_count) return 0;
  view->revision = kit->dock.revision;
  view->epoch = kit->dock.epoch;
  view->suspended = kit->dock.suspended;
  view->pressed = kit->dock.gestures[SELECTED_CONFIRM_DOWN / 2].held &&
      kit->dock.gestures[SELECTED_CONFIRM_DOWN / 2].allowed;
  view->online = journal->dock_online != 0;
  view->current = kit_dock_cache_current(kit);
  view->unavailable = kit->failed || kit->lab->storage_error || kit->dock_cache_failed;
  for (unsigned resource = 0; resource < 3; ++resource)
    view->stock[resource] = journal->dock_stock[resource] / GAME_SUPPLY_UNIT;
  view->residents = journal->dock_residents;
  view->samples = journal->dock_samples;
  view->incubations = journal->dock_incubations;
  view->visits = kit_dock_visits(kit);
  view->world_revision = journal->dock_world_revision;
  view->updated_at = journal->dock_updated_at;
  snprintf(view->freshness, sizeof(view->freshness), "%s",
      view->unavailable ? "Unavailable / cached" : view->current ? "Synced (simulation)"
      : view->online ? "Cached / stale" : "Offline / cached");
  char stamp[32] = "unknown";
  time_t local_stamp = (time_t)view->updated_at - 6 * 3600;
  struct tm *local_time = gmtime(&local_stamp);
  if (view->updated_at && local_time)
    strftime(stamp, sizeof(stamp), "%H:%M:%S Mexico City", local_time);
  snprintf(view->timestamp, sizeof(view->timestamp), "Snapshot %s%s",
      stamp, view->current ? "" : " / stale");
  snprintf(view->message, sizeof(view->message), "%s", kit->dock.message[0]
      ? kit->dock.message : view->unavailable ? "Storage unavailable; last snapshot retained." : "");
  for (unsigned index = 0; index < view->action_count; ++index)
    snprintf(view->actions[index], sizeof(view->actions[index]), "%s",
             kit_option(kit, KIT_DOCK, index));
  return 1;
}
