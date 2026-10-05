#include "demo_domain.h"
#include "demo_pixels.h"
#include "demo_store.h"
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static int error(const char *message) {
  printf("{\"error\":\"%s\"}\n", message);
  return 2;
}
static int number(const char *s, unsigned *n) {
  char *end;
  unsigned long value = strtoul(s, &end, 10);
  if (!*s || *end || value > UINT_MAX || *s == '-')
    return 0;
  *n = (unsigned)value;
  return 1;
}
static int token(const char *s) {
  size_t n = strlen(s);
  if (!n || n > 64)
    return 0;
  for (size_t i = 0; i < n; ++i)
    if (!((s[i] >= 'a' && s[i] <= 'z') || (s[i] >= 'A' && s[i] <= 'Z') ||
          (s[i] >= '0' && s[i] <= '9') || s[i] == '-' || s[i] == '_'))
      return 0;
  return 1;
}
static void status(const Demo *d) {
  DemoAction a[12];
  size_t n = demo_actions(d, a, 12);
  printf("{\"revision\":%u,\"phase\":%u,\"sample\":\"Sample "
         "01\",\"reagent\":%u,\"finding\":%s,\"unknown_regions\":2,\"event\":%"
         "u,\"actions\":[",
         d->revision, d->phase, d->reagent, d->finding ? "true" : "false",
         d->event);
  for (size_t i = 0; i < n; ++i)
    printf("%s{\"name\":\"%s\",\"label\":\"%s\",\"device\":\"%s\"}",
           i ? "," : "", a[i].name, a[i].label, a[i].device);
  puts("]}");
}
static void word(unsigned n, unsigned bytes) {
  for (unsigned i = 0; i < bytes; ++i)
    putchar((int)((n >> (i * 8)) & 255));
}
static void frame(const Demo *d, DemoDisplay display) {
  const DemoDisplayProfile *profile = demo_display_profile(display);
  unsigned w = profile->width, h = profile->height;
  unsigned stride = (w * 3 + 3) & ~3u;
  uint8_t row[1024 * 3];
  fputs("BM", stdout);
  word(54 + stride * h, 4);
  word(0, 4);
  word(54, 4);
  word(40, 4);
  word(w, 4);
  word(h, 4);
  word(1, 2);
  word(24, 2);
  word(0, 4);
  word(stride * h, 4);
  word(2835, 4);
  word(2835, 4);
  word(0, 4);
  word(0, 4);
  for (unsigned y = h; y > 0; --y) {
    demo_render_row(d, display, y - 1, row, sizeof(row));
    for (unsigned x = 0; x < w; ++x) {
      if (profile->format == DEMO_MONO1) {
        int value = row[x / 8] & (0x80u >> (x % 8)) ? 0 : 255;
        putchar(value);
        putchar(value);
        putchar(value);
      } else {
        putchar(row[x * 3 + 2]);
        putchar(row[x * 3 + 1]);
        putchar(row[x * 3]);
      }
    }
    for (unsigned i = w * 3; i < stride; ++i)
      putchar(0);
  }
}
int main(int argc, char **argv) {
  if (argc < 4 || strcmp(argv[1], "--save") || argv[2][0] != '/')
    return error("Expected --save absolute-path status, command or frame");
  int lock = demo_store_lock(argv[2]);
  if (lock < 0)
    return error("Save unavailable");
  Demo d;
  if (demo_store_read(argv[2], &d)) {
    close(lock);
    return error("Save is corrupt or unavailable; preserved without reset");
  }
  int result = 0;
  if (argc == 4 && !strcmp(argv[3], "status"))
    status(&d);
  else if (argc == 6 && !strcmp(argv[3], "frame")) {
    unsigned revision;
    if (!number(argv[5], &revision) || revision != d.revision)
      result = error("Stale frame");
    else if (strcmp(argv[4], "lab") && strcmp(argv[4], "probe") &&
             strcmp(argv[4], "companion"))
      result = error("Unknown device");
    else
      frame(&d, !strcmp(argv[4], "probe") ? DEMO_PROBE
                : !strcmp(argv[4], "companion") ? DEMO_COMPANION
                                                : DEMO_LAB);
  } else if (argc == 7 && !strcmp(argv[3], "command")) {
    unsigned revision;
    char payload[128];
    if (!number(argv[5], &revision) || !token(argv[4]) || !token(argv[6]))
      result = error("Invalid command");
    else {
      snprintf(payload, sizeof(payload), "%s:%u", argv[4], revision);
      if (!strcmp(d.last_id, argv[6])) {
        if (strcmp(d.last_payload, payload))
          result = error("Operation ID reused for different command");
        else
          status(&d);
      } else if (revision != d.revision || d.revision == UINT_MAX)
        result = error("Stale revision; refresh before acting");
      else {
        const char *failure = NULL;
        if (!strcmp(argv[4], "reset")) {
          /* Host-only sandbox control: retain revision ordering across resets. */
          unsigned previous_revision = d.revision;
          demo_init(&d);
          d.revision = previous_revision;
        } else {
          failure = demo_apply(&d, argv[4]);
        }
        if (failure)
          result = error(failure);
        else {
          ++d.revision;
          strcpy(d.last_id, argv[6]);
          strcpy(d.last_payload, payload);
          if (demo_store_write(argv[2], &d)) {
            error("Save result uncertain; retry the same operation");
            result = 3;
          } else
            status(&d);
        }
      }
    }
  } else
    result = error("Unsupported invocation");
  close(lock);
  return result;
}
