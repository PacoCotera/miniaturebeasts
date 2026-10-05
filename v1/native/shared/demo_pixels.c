#include "demo_pixels.h"
#include "native_font.h"
#include <stdio.h>
#include <string.h>
static const DemoDisplayProfile profiles[] = {
    {1024, 600, DEMO_RGB888, 3072},
    {122, 250, DEMO_MONO1, 16},
    {368, 448, DEMO_RGB888, 1104}};
const DemoDisplayProfile *demo_display_profile(DemoDisplay display) {
  if (display < DEMO_LAB || display > DEMO_COMPANION)
    return NULL;
  return &profiles[display];
}
typedef struct {
  uint8_t *pixels;
  const DemoDisplayProfile *profile;
  unsigned width, y;
} Row;
static void pixel(Row *r, unsigned x, int shade) {
  if (r->profile->format == DEMO_MONO1) {
    uint8_t mask = (uint8_t)(0x80u >> (x % 8));
    if (shade)
      r->pixels[x / 8] |= mask;
    else
      r->pixels[x / 8] &= (uint8_t)~mask;
  } else {
    uint8_t *color = r->pixels + x * 3;
    static const uint8_t colors[][3] = {
        {242, 235, 221}, {41, 42, 39}, {216, 203, 176},
        {198, 107, 46}, {71, 99, 77}};
    memcpy(color, colors[shade], 3);
  }
}
static void box(Row *r, int x, int y, int w, int h, int shade) {
  if ((int)r->y < y || (int)r->y >= y + h)
    return;
  for (int i = x; i < x + w; ++i)
    if (i >= 0 && i < (int)r->width)
      pixel(r, (unsigned)i, shade);
}
static void text(Row *r, int x, int y, const char *value, int size) {
  const NativeFont *font = &portable_fonts[0];
  for (unsigned i = 0; i < 4; ++i)
    if (portable_fonts[i].size == size)
      font = &portable_fonts[i];
  static const uint8_t ink[3] = {41, 42, 39};
  native_text_row(font, value, x, y, r->y, r->width, r->pixels,
                  r->profile->format == DEMO_MONO1, ink);
}
static void wrapped(Row *r, int x, int y, const char *value, int width) {
  char line[80];
  size_t length = 0;
  while (*value) {
    const char *word = value;
    while (*value && *value != ' ') ++value;
    size_t word_length = (size_t)(value-word);
    char candidate[80];
    memcpy(candidate, line, length);
    size_t offset = length;
    if (offset) candidate[offset++] = ' ';
    memcpy(candidate + offset, word, word_length);
    candidate[offset + word_length] = 0;
    if (length && native_text_width(&portable_fonts[0], candidate) > width) {
      line[length] = 0;
      text(r, x, y, line, 9);
      y += 14;
      length = 0;
    }
    if (length) line[length++] = ' ';
    memcpy(line + length, word, word_length);
    length += word_length;
    while (*value == ' ') ++value;
  }
  line[length] = 0;
  text(r, x, y, line, 9);
}
static void fragment(Row *r) {
  for (int band = 0; band < 3; ++band) {
    box(r, 8 + band * 2, 159 + band * 8, 24, 3, 1);
    box(r, 8 + band * 2, 162 + band * 8, 3, 4, 1);
  }
}
static void probe_scene(Row *r, const Demo *d) {
  int empty = d->phase == 0 || d->phase == 4;
  const char *title = empty ? "Probe empty" : d->phase == 1 ? "Ready"
      : d->phase == 3 ? (d->probe_page == 2 ? "Results" : "Return to station")
      : d->event == 1 ? "Fragment found"
      : d->event == 2 ? "Clue saved" : "Gathering";
  text(r, 8, 8, title, 11);
  if (empty) {
    wrapped(r, 8, 49, d->phase == 0 ? "Load an expedition at the station."
                                          : "Sample and supplies are at the station.", 106);
    return;
  }
  text(r, 8, 27, "Material trail", 9);
  text(r, 8, 49, "Collection stages", 9);
  for (unsigned stage = 0; stage < 2; ++stage) {
    int x = 8 + (int)stage * 56;
    box(r, x, 66, 50, 1, 1);
    box(r, x, 79, 50, 1, 1);
    box(r, x, 66, 1, 14, 1);
    box(r, x + 49, 66, 1, 14, 1);
    if (stage < d->elapsed) box(r, x + 2, 68, 46, 10, 1);
  }
  char quantity[48];
  snprintf(quantity, sizeof(quantity), "%u of 2", d->elapsed);
  text(r, 8, 87, quantity, 11);
  text(r, 8, 110, d->phase == 1 ? "Not started"
                             : d->phase == 3 ? "1 sealed sample" : "Sample forming", 9);
  snprintf(quantity, sizeof(quantity), "Station supplies %u", d->reagent);
  text(r, 8, 129, quantity, 11);
  if (d->phase == 1) {
    wrapped(r, 8, 158, "Expedition loaded. Start when ready.", 106);
  } else if (d->phase == 3) {
    text(r, 8, 158, "Sample 01", 9);
    if (d->probe_page == 2 && d->event == 2)
      wrapped(r, 8, 174, "Clue: repeated bands.", 106);
    else if (d->probe_page == 2 && d->event == 1)
      wrapped(r, 8, 174, "Fragment awaiting inspection at station.", 106);
  } else if (d->event == 1) {
    fragment(r);
    wrapped(r, 40, 158, "Inspect or leave it.", 74);
  } else if (d->event == 2) {
    wrapped(r, 8, 158, "Repeated bands may hint at structure.", 106);
  } else if (d->event == 3) {
    wrapped(r, 8, 158, "Fragment left behind.", 106);
  } else {
    wrapped(r, 8, 158, "Expedition underway.", 106);
  }
  DemoAction actions[12];
  size_t count = demo_actions(d, actions, 12);
  int slot_y = 211;
  for (size_t i = 0; i < count; ++i) {
    if (strcmp(actions[i].device, "probe")) continue;
    text(r, 8, slot_y, actions[i].label, 9);
    slot_y += 12;
  }
}static void companion_scene(Row *r) {
  text(r, 24, 32, "Companion", 24);
  box(r, 64, 112, 240, 2, 1);
  box(r, 64, 270, 240, 2, 1);
  box(r, 64, 112, 2, 160, 1);
  box(r, 302, 112, 2, 160, 1);
  text(r, 80, 310, "No mibi here yet.", 20);
}
#ifdef CRITTER_LAB_SCENE
void demo_lab_render_row(const Demo *demo, unsigned y, uint8_t *pixels);
#endif
int demo_render_row(const Demo *d, DemoDisplay display, unsigned y,
                    uint8_t *pixels, size_t capacity) {
  const DemoDisplayProfile *profile = demo_display_profile(display);
  if (!d || !profile || !pixels || y >= profile->height ||
      capacity < profile->row_bytes)
    return 0;
#ifndef CRITTER_LAB_SCENE
  if (display == DEMO_LAB)
    return 0;
#endif
  memset(pixels, 0, profile->row_bytes);
  Row r = {pixels, profile, profile->width, y};
  box(&r, 0, 0, (int)profile->width, (int)profile->height, 0);
  if (display == DEMO_PROBE) {
    probe_scene(&r, d);
    return 1;
  }
  if (display == DEMO_COMPANION) {
    companion_scene(&r);
    return 1;
  }
#ifdef CRITTER_LAB_SCENE
  demo_lab_render_row(d, y, pixels);
#else
  /* MCU entries have only their portable scene resources. */
  return 0;
#endif
  return 1;
}
