#define _POSIX_C_SOURCE 200809L
#include "demo_store.h"
#include "save_bytes.h"
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/file.h>
#include <unistd.h>
static int serialize(char *buffer, size_t size, const Demo *d) {
  return snprintf(buffer, size,
                  "CRITTER_DEMO 1\nrevision %u\nphase %u\nselected "
                  "%u\nlab_page %u\nprobe_page %u\nelapsed %u\nevent "
                  "%u\nreagent %u\nfinding %u\nlast_id %s\nlast_payload %s\n",
                  d->revision, d->phase, d->selected, d->lab_page,
                  d->probe_page, d->elapsed, d->event, d->reagent, d->finding,
                  d->last_id, d->last_payload);
}
int demo_store_lock(const char *path) {
  return save_bytes_lock(path);
}
int demo_store_read(const char *path, Demo *d) {
  FILE *file = fopen(path, "r");
  if (!file) {
    if (errno == ENOENT) {
      demo_init(d);
      return 0;
    }
    return -1;
  }
  char data[1024], expected[1024];
  size_t n = fread(data, 1, sizeof(data) - 1, file);
  int extra = fgetc(file);
  fclose(file);
  data[n] = 0;
  if (extra != EOF)
    return -1;
  int fields =
      sscanf(data,
             "CRITTER_DEMO 1\nrevision %u\nphase %u\nselected %u\nlab_page "
             "%u\nprobe_page %u\nelapsed %u\nevent %u\nreagent %u\nfinding "
             "%u\nlast_id %64s\nlast_payload %127s\n",
             &d->revision, &d->phase, &d->selected, &d->lab_page,
             &d->probe_page, &d->elapsed, &d->event, &d->reagent, &d->finding,
             d->last_id, d->last_payload);
  if (fields != 11 || !demo_valid(d))
    return -1;
  int length = serialize(expected, sizeof(expected), d);
  return length < 0 || (size_t)length != n || memcmp(data, expected, n) ? -1
                                                                        : 0;
}
int demo_store_write(const char *path, const Demo *d) {
  char data[1024];
  int length = serialize(data, sizeof(data), d);
  if (length < 0 || (size_t)length >= sizeof(data)) return -1;
  return save_bytes_write(path, data, (size_t)length);
}
