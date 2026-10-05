#include "demo_pixels.h"
#include "native_font.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
typedef struct {
  uint8_t *pixels;
  unsigned y;
} LabRow;
static const uint8_t palette[][3] = {
  {16, 27, 50}, {8, 17, 34}, {242, 245, 255}, {173, 187, 211},
  {86, 141, 255}, {192, 160, 255}, {255, 182, 92}, {52, 73, 103}};
static void rectangle(LabRow *row, int x, int y, int w, int h, unsigned color) {
  if ((int)row->y < y || (int)row->y >= y + h)
    return;
  for (int column = x; column < x + w; ++column)
    if (column >= 0 && column < 1024)
      memcpy(row->pixels + column * 3, palette[color], 3);
}
static void outline(LabRow *row, int x, int y, int w, int h, unsigned color) {
  rectangle(row, x, y, w, 1, color);
  rectangle(row, x, y + h - 1, w, 1, color);
  rectangle(row, x, y, 1, h, color);
  rectangle(row, x + w - 1, y, 1, h, color);
}
static const NativeFont *font(int size) {
  for (unsigned i = 0; i < LAB_FONT_COUNT; ++i)
    if (lab_fonts[i].size == size)
      return &lab_fonts[i];
  assert(!"Requested Lab font size is absent from the atlas");
  return NULL;
}
static void label(LabRow *row, int x, int y, const char *text, int size,
                  unsigned color) {
  const NativeFont *selected_font = font(size);
  if (selected_font)
    native_text_row(selected_font, text, x, y, row->y, 1024, row->pixels, 0, palette[color]);
}
static void header(LabRow *row, const char *section, const char *title,
                   const char *context) {
  label(row, 32, 16, section, 24, 3);
  label(row, 32, 68, title, 48, 2);
  if (context) label(row, 32, 126, context, 28, 3);
}
static void explanation(LabRow *row, const char *primary,
                        const char *secondary, int second_size) {
  assert(native_text_width(font(44), primary) <= 960);
  label(row, 32, 414, primary, 44, 2);
  if (secondary) {
    assert(native_text_width(font(second_size), secondary) <= 960);
    label(row, 32, second_size == 44 ? 466 : 474, secondary, second_size, 3);
  }
}
static void pattern(LabRow *row) {
  /* Same whole-specimen stage before and after the Structure study. */
  int inset = row->y < 202 ? 202 - (int)row->y
             : row->y >= 393 ? (int)row->y - 392 : 0;
  rectangle(row, 68 + inset, 170, 364 - 2 * inset, 255, 1);
  rectangle(row, 52, 190, 8, 208, 7);
  rectangle(row, 432, 190, 8, 208, 7);
  rectangle(row, 44, 182, 24, 8, 3);
  rectangle(row, 432, 182, 24, 8, 3);
  rectangle(row, 44, 398, 24, 8, 3);
  rectangle(row, 432, 398, 24, 8, 3);
  rectangle(row, 116, 437, 272, 8, 7);
  rectangle(row, 140, 445, 224, 8, 3);
  /* Original authored occupancy; uniform integer 12px step / 8px fill. */
  for (int y = 0; y < 20; ++y)
    for (int x = 0; x < 20; ++x) {
      int value = (x * 17 + y * 29 + x * y * 3 + (y / 4) * 11) % 19;
      if (value < 8)
        rectangle(row, 132 + x * 12, 185 + y * 12, 8, 8, value < 5 ? 5 : 4);
    }
}
static void trail(LabRow *row) {
  rectangle(row, 32, 172, 520, 214, 1);
  /* Conceptual route, not a promised sensor or geographic map. */
  rectangle(row, 120, 248, 180, 3, 4);
  rectangle(row, 298, 248, 3, 95, 4);
  rectangle(row, 298, 340, 160, 3, 4);
  outline(row, 103, 232, 34, 34, 5);
  outline(row, 283, 232, 34, 34, 5);
  outline(row, 441, 324, 34, 34, 5);
}
static void sealed_sample(LabRow *row, int x, int y) {
  outline(row, x, y, 104, 132, 5);
  rectangle(row, x + 26, y - 16, 52, 17, 4);
  rectangle(row, x + 21, y + 36, 62, 3, 5);
  rectangle(row, x + 21, y + 64, 62, 3, 5);
}
static void cargo(LabRow *row) {
  rectangle(row, 32, 172, 520, 214, 1);
  sealed_sample(row, 244, 214);
}
static void categories(LabRow *row, int loading) {
  sealed_sample(row, 620, 172);
  label(row, 746, 194, "Sample", 40, 2);
  rectangle(row, 620, 330, 38, 3, 5);
  rectangle(row, 620, 344, 38, 3, 5);
  label(row, 676, 306, "Station supplies", 40, 2);
  if (loading) label(row, 600, 349, "Start it on the probe.", 32, 3);
}
static void sketches(LabRow *row) {
  /* Plate and fiber references have equal status, not selectable outcomes. */
  for (int i = 0; i < 4; ++i) {
    int y = 200 + i * 32;
    for (int line = 0; line < 32; ++line) {
      int left = line < 16 ? 134 - line * 8 : (line - 16) * 3;
      int right = line < 16 ? 134 + line * 3 : 182 - (line - 16) * 8;
      rectangle(row, 548 + left, y + line, right - left + 4, 1, 4);
    }
    rectangle(row, 596, y + 31, 112, 3, 5);
  }
  for (int fiber = 0; fiber < 6; ++fiber)
    for (int y = 0; y < 130; ++y) {
      int bend = y < 45 ? 10 - y / 4 : y < 85 ? (y - 45) / 4 : 10 - (y - 85) / 4;
      rectangle(row, 790 + fiber * 24 + bend, 200 + y, 6, 1, 5);
    }
  label(row, 542, 354, "Layered", 36, 2);
  label(row, 792, 354, "Fibrous", 36, 2);
  label(row, 542, 403, "Form references", 28, 3);
}
static void structure(LabRow *row, const Demo *demo, int result) {
  char stock[64];
  label(row, 32, 16, "STATION", 24, 3);
  label(row, 32, 52, "Structure", 48, 2);
  label(row, 32, 120, "Sample 01", 28, 3);
  pattern(row);
  label(row, 32, 474, "Other regions unknown", 32, 3);
  if (result) {
    label(row, 542, 120, "Two possibilities", 36, 2);
    sketches(row);
    label(row, 542, 457, "Neither chosen", 32, 3);
    snprintf(stock, sizeof(stock), "Supplies left %u", demo->reagent);
    label(row, 992 - native_text_width(font(32), stock), 500, stock, 32, 3);
  } else {
    label(row, 542, 120, "Unknown", 36, 3);
    for (int side = 0; side < 2; ++side) {
      int x = side ? 881 : 592;
      rectangle(row, x, 192, 32, 4, 7);
      rectangle(row, x, 356, 32, 4, 7);
      rectangle(row, side ? 913 : 592, 192, 4, 24, 7);
      rectangle(row, side ? 913 : 592, 336, 4, 24, 7);
    }
    rectangle(row, 712, 208, 80, 8, 5);
    rectangle(row, 704, 216, 8, 16, 5);
    rectangle(row, 792, 216, 8, 48, 5);
    rectangle(row, 752, 264, 40, 8, 5);
    rectangle(row, 744, 272, 8, 32, 5);
    rectangle(row, 744, 320, 8, 8, 5);
    label(row, 542, 390, "Station supplies", 32, 3);
    label(row, 542, 430, "Uses 1", 36, 2);
    snprintf(stock, sizeof(stock), "In stock %u", demo->reagent);
    label(row, 752, 430, stock, 36, 2);
    for (unsigned i = 0; i < demo->reagent; ++i) {
      rectangle(row, 944 + (int)i * 22, 398, 16, 16, 3);
      rectangle(row, 948 + (int)i * 22, 394, 8, 4, 3);
    }
    if (!demo->reagent) label(row, 542, 474, "Supplies needed", 32, 3);
  }
}
static void supplies(LabRow *row, const Demo *demo, int y, int remaining) {
  char quantity[64];
  label(row, 600, y, "Station supplies", 32, 3);
  snprintf(quantity, sizeof(quantity), "%u unit%s%s", demo->reagent,
           demo->reagent == 1 ? "" : "s", remaining ? " left" : "");
  label(row, 600, y + 42, quantity, 36, 2);
}
static void note(LabRow *row, const Demo *demo, int y) {
  /* Pending and left encounters do not establish a saved clue. */
  if (demo->event == 1) {
    label(row, 600, y, "Encounter waiting", 32, 3);
  } else if (demo->event == 2) {
    label(row, 600, y, "Clue saved:", 32, 3);
    label(row, 600, y + 38, "Repeated bands", 32, 2);
  }
}
static void rail(LabRow *row, const Demo *demo) {
  DemoAction actions[12];
  size_t count = demo_actions(demo, actions, 12);
  int x = 32;
  size_t lab_count = 0;
  for (size_t i = 0; i < count; ++i)
    if (!strcmp(actions[i].device, "lab")) ++lab_count;
  if (!lab_count) return;
  label(row, 32, 526, "Controls below", 18, 3);
  rectangle(row, 32, 547, 960, 1, 7);
  for (size_t i = 0; i < count; ++i) {
    if (strcmp(actions[i].device, "lab")) continue;
    int width = native_text_width(font(32), actions[i].label);
    assert(x + width <= 992);
    label(row, x, 552, actions[i].label, 32, 2);
    x += width + 24;
  }
}
void demo_lab_render_row(const Demo *demo, unsigned y, uint8_t *pixels) {
  LabRow row = {pixels, y};
  rectangle(&row, 0, 0, 1024, 600, 0);
  if (demo->phase == 0) {
    header(&row, "Expeditions", "Material trail", NULL);
    trail(&row);
    categories(&row, demo->lab_page != 0);
    if (demo->lab_page == 0) {
      explanation(&row, "Gather a sample and", "supplies for the station.", 44);
    } else {
      explanation(&row, "Load this expedition onto your probe.", NULL, 36);
    }
  } else if (demo->phase == 1) {
    header(&row, "Research station", "Probe ready", "Material trail");
    trail(&row);
    categories(&row, 0);
    explanation(&row, "The expedition is loaded.", "Start it on your probe.", 36);
  } else if (demo->phase == 2) {
    header(&row, "Research station", "Out on the trail", "Material trail");
    trail(&row);
    label(&row, 600, 172, "Probe gathering", 32, 2);
    note(&row, demo, 238);
    explanation(&row, "Your probe is gathering.",
                "Check the probe for its latest update.", 36);
  } else if (demo->phase == 3) {
    header(&row, "Research station", "Expedition results", "From: Material trail");
    cargo(&row);
    label(&row, 600, 172, "Sample 01", 36, 2);
    label(&row, 600, 216, "Sealed", 36, 2);
    supplies(&row, demo, 268, 0);
    if (demo->event == 1) label(&row, 600, 352, "Encounter waiting", 32, 3);
    explanation(&row, "Bring these results to the station.",
                "Your probe will be empty.", 36);
  } else {
    int study = !demo->finding && demo->lab_page != 2;
    if (study || (demo->finding && demo->lab_page == 5)) {
      structure(&row, demo, demo->finding != 0);
    } else {
      header(&row, "Research station", "Sample 01", "From: Material trail");
      pattern(&row);
      if (demo->finding) {
        supplies(&row, demo, 172, 1);
        note(&row, demo, 274);
        label(&row, 600, 382, "Layered / Fibrous", 36, 2);
        label(&row, 600, 430, "Two possibilities", 32, 3);
        label(&row, 600, 474, "Neither chosen", 32, 3);
      } else {
        supplies(&row, demo, 172, 0);
        note(&row, demo, 274);
        label(&row, 600, 382, "Structure unknown", 32, 2);
        if (demo->event == 2)
          label(&row, 600, 430, "Bands hint at structure", 32, 3);
      }
      label(&row, 32, 474, "Other regions unknown", 32, 3);
    }
  }
  rail(&row, demo);
}
