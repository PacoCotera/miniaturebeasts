#define _POSIX_C_SOURCE 200809L
#include "kit.h"
#include "native_ui.h"
#include "research_view.h"
#include "action_view.h"
#include "save_bytes.h"
#include "selected_lab.h"
#include <limits.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

static int number(const char *value, unsigned *result) {
  char *end;
  unsigned long parsed = strtoul(value, &end, 10);
  if (!*value || *end || *value == '-' || parsed > UINT_MAX)
    return 0;
  *result = (unsigned)parsed;
  return 1;
}

static uint32_t now_seconds(void) {
  struct timespec time;
  clock_gettime(CLOCK_MONOTONIC, &time);
  return (uint32_t)time.tv_sec;
}
static void status(SelectedLab *lab) {
  if (!lab->kit_mode)
    selected_lab_tick(lab, now_seconds());
  printf(
      "{\"revision\":%u,\"page\":\"%s\",\"focus\":\"%s\",\"ready\":%s,"
      "\"workspace\":%u,\"suspended\":%s,\"width\":1024,\"height\":600,"
      "\"stock\":[%u,%u,%u],"
      "\"cargo\":[%u,%u,%u],\"message\":\"%s\","
      "\"samples\":%u,\"individuals\":%u,\"decoded\":%u,\"expedition_seconds\":"
      "%u,\"gather_capacity_blocked\":%s,\"incubation_seconds\":%u,"
      "\"incubation_ready\":%s,\"boundary\":"
      "\"Standalone V1; authored sensor simulation; local save\"}\n",
      lab->revision, selected_lab_page(lab), selected_lab_focus(lab),
      lab->ready ? "true" : "false", lab->workspace,
      lab->suspended ? "true" : "false", lab->game.data, lab->game.energy,
      lab->game.essence, lab->game.expedition_data, lab->game.expedition_energy,
      lab->game.expedition_essence, lab->message, lab->game.sample_count,
      lab->game.individual_count,
      lab->game.sample_count ? lab->game.samples[lab->sample].decoded_studies
                             : 0,
      lab->game.expedition_elapsed,
      game_gather_capacity_blocked(&lab->game) ? "true" : "false",
      lab->game.incubation_elapsed,
      lab->game.incubation_ready ? "true" : "false");
}

static int event(const char *name, SelectedInput *input) {
  if (!strcmp(name, "home-down") || !strcmp(name, "home-up")) {
    *input = !strcmp(name, "home-down") ? SELECTED_HOME_DOWN : SELECTED_HOME_UP;
    return 1;
  }
  static const char *const names[] = {
      "up-down",       "up-up",       "down-down",     "down-up",
      "left-down",     "left-up",     "right-down",    "right-up",
      "research-down", "research-up", "critters-down", "critters-up",
      "library-down",  "library-up",  "habitat-down",  "habitat-up",
      "confirm-down",  "confirm-up",  "back-down",     "back-up",
      "cancel",        "suspend",     "resume",        "ready"};
  for (unsigned index = 0; index < sizeof(names) / sizeof(names[0]); ++index)
    if (!strcmp(name, names[index])) {
      *input = (SelectedInput)index;
      return 1;
    }
  return 0;
}

int main(int argc, char **argv) {
  SelectedLab lab;
  selected_lab_init(&lab);
  if (argc == 3 && !strcmp(argv[1], "frame")) {
    FILE *output = fopen(argv[2], "wb");
    if (!output)
      return 2;
    int success = selected_lab_bmp(&lab, output);
    if (fclose(output))
      success = 0;
    return success ? 0 : 2;
  }
  int kit_mode = argc == 2 && !strcmp(argv[1], "kit-serve");
  if (argc != 2 || (strcmp(argv[1], "serve") && !kit_mode)) {
    fprintf(stderr,
            "Usage: selected_lab frame OUTPUT.bmp | selected_lab serve\n");
    return 2;
  }
  const char *save = getenv("BEECHO_V1_SAVE");
  char default_save[512], session_lock[560];
  if (!save) {
    const char *legacy = getenv("CRITTER_DEMO_SAVE");
    snprintf(default_save, sizeof(default_save), "%s.beecho-v1",
             legacy ? legacy : "./beecho");
    save = default_save;
  }
  snprintf(session_lock, sizeof(session_lock), "%s.session", save);
  int lock = save_bytes_lock(session_lock);
  if (lock < 0) {
    fprintf(stderr, "Save is locked or unavailable\n");
    return 2;
  }
  selected_lab_load(&lab, save, now_seconds());
  /* Kit must reconcile reserved receipts before conversion. The standalone
   * regression fixture has no device sidecar and can convert immediately. */
  if (!kit_mode && !lab.storage_error &&
      game_supply_conversion_pending(&lab.game)) {
    GameCommand command = {0};
    char identity[64];
    command.type = GAME_COMMAND_STOCK_NORMALIZE;
    command.sequence = lab.game.last_operation_sequence + 1;
    snprintf(identity, sizeof(identity), "convert-%llu",
             (unsigned long long)command.sequence);
    command.operation_id = identity;
    if (game_apply(lab.save_path, &lab.game, &command) != GAME_OK) {
      lab.storage_error = 1;
      strcpy(lab.message, "Save conversion unavailable. Preserve files.");
    }
  }
  DeviceKit kit;
  if (kit_mode)
    kit_init(&kit, &lab, now_seconds());
  NativeUiContext *ui = kit_mode ? native_ui_create() : NULL;
  NativeUiContext *dock_ui = kit_mode ? native_ui_create_device(KIT_DOCK) : NULL;
  if (kit_mode && (!ui || !dock_ui)) {
    fprintf(stderr, "Native device renderer unavailable\n");
    native_ui_destroy(ui);
    native_ui_destroy(dock_ui);
    close(lock);
    return 2;
  }
  NativeUiContext *lab_ui = NULL;
  char line[128];
  while (fgets(line, sizeof(line), stdin)) {
    if (kit_mode && !strncmp(line, "device ", 7)) {
      char action[32], token[32], extra_token[2];
      unsigned device = KIT_DEVICE_COUNT, revision;
      int fields = sscanf(line, "device %u %31s %31s %1s", &device, action,
                          token, extra_token);
      if (device >= KIT_DEVICE_COUNT || fields < 2)
        puts("{\"error\":\"Invalid device command\"}");
      else {
        kit_tick(&kit, now_seconds());
        if (fields == 2 && !strcmp(action, "status"))
          kit_status(&kit, device, stdout);
        else if (fields == 3 && number(token, &revision) &&
                 !strcmp(action, "frame")) {
          if (revision != kit_revision(&kit, device))
            puts("{\"error\":\"Stale frame request\"}");
          else if (!kit_frame_supported(&kit, device))
            puts("{\"error\":\"Unsupported frame page\"}");
          else {
            unsigned stride = (kit_width(device) * 3 + 3) & ~3u;
            printf("{\"revision\":%u,\"bytes\":%u}\n", revision,
                   54 + stride * kit_height(device));
            if (device == KIT_LAB && (lab.page == V1_HOME || selected_lab_is_research_page(lab.page) || selected_lab_is_action_page(lab.page) || kit_lab_explore(&kit)) && !lab_ui)
              lab_ui = native_ui_create_device(KIT_LAB);
            if (device == KIT_LAB && (lab.page == V1_HOME || selected_lab_is_research_page(lab.page) || selected_lab_is_action_page(lab.page) || kit_lab_explore(&kit)) && !lab_ui) goto failure;
            if (!kit_bmp_ui(&kit, device, stdout,
                device == KIT_LAB ? lab_ui : device == KIT_DOCK ? dock_ui : ui, 1))
              goto failure;
          }
        } else if (fields == 3 && number(token, &revision) &&
                   !strcmp(action, "link") && revision <= 1 &&
                   device != KIT_LAB) {
          kit_link(&kit, device, (int)revision);
          kit_status(&kit, device, stdout);
        } else {
          SelectedInput input;
          if (fields != 3 || !number(token, &revision) ||
              !event(action, &input))
            puts("{\"error\":\"Invalid device input\"}");
          else {
            kit_input(&kit, device, input, revision);
            kit_status(&kit, device, stdout);
          }
        }
      }
      if (fflush(stdout))
        goto failure;
      continue;
    }
    char name[32], argument[32], frame_argument[32], extra[2];
    int count = sscanf(line, "%31s %31s %31s %1s", name, argument,
                       frame_argument, extra);
    unsigned frame = 0;
    if (count == 1 && !strcmp(name, "status")) {
      if (kit_mode)
        kit_status(&kit, KIT_LAB, stdout);
      else
        status(&lab);
    }
    else if (count == 2 && !strcmp(name, "frame") && number(argument, &frame)) {
      if (frame != lab.revision)
        puts("{\"error\":\"Stale frame request\"}");
      else if (!(kit_mode ? kit_frame_supported(&kit, KIT_LAB)
                          : selected_lab_frame_supported(&lab)))
        puts("{\"error\":\"Unsupported frame page\"}");
      else {
        printf("{\"revision\":%u,\"bytes\":%u}\n", lab.revision,
               54u + SELECTED_LAB_WIDTH * SELECTED_LAB_HEIGHT * 3u);
        if (kit_mode && (lab.page == V1_HOME || selected_lab_is_research_page(lab.page) || selected_lab_is_action_page(lab.page) || kit_lab_explore(&kit)) && !lab_ui)
          lab_ui = native_ui_create_device(KIT_LAB);
        if (kit_mode && (lab.page == V1_HOME || selected_lab_is_research_page(lab.page) || selected_lab_is_action_page(lab.page) || kit_lab_explore(&kit)) && !lab_ui) goto failure;
        int rendered = kit_mode ? kit_bmp_ui(&kit, KIT_LAB, stdout, lab_ui, 1)
                                : selected_lab_bmp(&lab, stdout);
        if (!rendered)
          goto failure;
      }
    } else {
      SelectedInput input;
      int valid = !kit_mode && count >= 2 && event(name, &input);
      valid = valid && count == 2 && number(argument, &frame);
      if (!valid)
        puts("{\"error\":\"Unsupported input\"}");
      else {
        if (input == SELECTED_RESUME)
          lab.clock = now_seconds();
        if (input != SELECTED_RESUME)
          selected_lab_tick(&lab, now_seconds());
        selected_lab_input(&lab, input, 0, frame);
        status(&lab);
      }
    }
    if (fflush(stdout))
      goto failure;
  }
  native_ui_destroy(lab_ui);
  native_ui_destroy(ui);
  native_ui_destroy(dock_ui);
  close(lock);
  return ferror(stdin) ? 2 : 0;
failure:
  native_ui_destroy(lab_ui);
  native_ui_destroy(ui);
  native_ui_destroy(dock_ui);
  close(lock);
  return 2;
}
