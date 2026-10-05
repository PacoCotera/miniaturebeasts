#include "lab_action_ui.h"
#include "lab_resident_gallery.h"
#include "../selected-lab/ui_theme.h"
#include "../selected-lab/core_art.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct LabActionUi {
  lv_obj_t *root, *stock[3], *rows[4], *title, *identity, *art;
  lv_obj_t *heading, *form, *reference, *body, *coat, *features;
  lv_obj_t *source_title, *source, *visits, *progress, *pending, *cost, *shortages[3];
  lv_obj_t *summary[3], *message;
  NativeUiFrame header, rail, workpiece, focus;
  LabHomeFonts fonts;
  LabActionView view;
  const lv_image_dsc_t *images[13];
  char stock_text[3][24], shortage_text[3][48], visits_text[48], progress_text[64];
  char reference_text[64];
  LabResidentGallery gallery;
  char selected_text[152], source_text[64];
};

static lv_obj_t *surface(lv_obj_t *parent, int x, int y, int width, int height,
    uint32_t color) {
  lv_obj_t *object = lv_obj_create(parent);
  if (!object) return NULL;
  native_ui_surface(object, color, 0, 0);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  return object;
}
static lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, int x, int y,
    int width, int height, uint32_t color) {
  lv_obj_t *object = lv_label_create(parent);
  if (!object) return NULL;
  native_ui_text(object, font, color);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  lv_label_set_long_mode(object, LV_LABEL_LONG_MODE_WRAP);
  lv_label_set_text_static(object, "");
  return object;
}
static lv_obj_t *image(lv_obj_t *parent, const lv_image_dsc_t *source, int x, int y) {
  lv_obj_t *object = lv_image_create(parent);
  if (!object) return NULL;
  lv_obj_set_clickable(object, false);
  lv_image_set_antialias(object, false);
  lv_image_set_src(object, source);
  lv_obj_set_pos(object, x, y);
  return object;
}

LabActionUi *lab_action_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[13]) {
  if (!parent || !fonts || !images) return NULL;
  LabActionUi *ui = calloc(1, sizeof(*ui));
  if (!ui) return NULL;
  ui->fonts = *fonts;
  for (unsigned index = 0; index < 13; ++index) {
    if (!images[index]) goto failure;
    ui->images[index] = images[index];
  }
  ui->root = surface(parent, 0, 0, 1024, 600, CORE_ART_GRAPHITE_RGB);
  if (!ui->root) goto failure;
  if (!native_ui_frame_init(&ui->header, ui->root, 976, 100, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->rail, ui->root, 330, 416, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->workpiece, ui->root, 624, 416, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->focus, ui->root, 302, 56, CORE_ART_FOCUS_RGB)) goto failure;
  lv_obj_set_pos(ui->header.object, 24, 24);
  lv_obj_set_pos(ui->rail.object, 24, 140);
  lv_obj_set_pos(ui->workpiece.object, 376, 140);
  native_ui_surface(ui->focus.object, 0x292922, CORE_ART_FOCUS_RGB, 0);
  lv_obj_set_style_shadow_color(ui->focus.object, lv_color_hex(0xc58f32), 0);
  lv_obj_set_style_shadow_width(ui->focus.object, 10, 0);
  lv_obj_set_style_shadow_opa(ui->focus.object, 40, 0);
  if (!surface(ui->root, 37, 37, 950, 75, CORE_ART_FIELD_RGB)) goto failure;
  lv_obj_t *lab_title = label(ui->root, fonts->title, 46, 35, 330, 42, CORE_ART_INK_RGB);
  lv_obj_t *stock_title = label(ui->root, fonts->small, 47, 83, 330, 24, CORE_ART_SECONDARY_RGB);
  if (!lab_title || !stock_title) goto failure;
  lv_label_set_text_static(lab_title, "STATION");
  lv_label_set_text_static(stock_title, "STATION STOCK");
  const char *names[] = {"DATA", "ENERGY", "ESSENCE"};
  for (unsigned index = 0; index < 3; ++index) {
    int x = 402 + (int)index * 196;
    if (!image(ui->root, images[4+index], x+(50-(int)images[4+index]->header.w)/2,
        41+(58-(int)images[4+index]->header.h)/2)) goto failure;
    lv_obj_t *name = label(ui->root, fonts->small, x+62, 39, 126, 24, CORE_ART_SECONDARY_RGB);
    lv_obj_t *units = label(ui->root, fonts->small, x+62, 89, 126, 22, CORE_ART_SECONDARY_RGB);
    ui->stock[index] = label(ui->root, fonts->status, x+62, 61, 126, 32, CORE_ART_INK_RGB);
    ui->rows[index] = label(ui->root, fonts->small, 50, 169+(int)index*62, 286, 96, CORE_ART_INK_RGB);
    ui->summary[index] = label(ui->root, fonts->small, 416, 438+(int)index*34, 552, 34,
        index == 0 ? CORE_ART_SAVED_RGB : CORE_ART_SECONDARY_RGB);
    ui->shortages[index] = label(ui->root, fonts->small, 689, 460+(int)index*22, 278, 24, CORE_ART_FOCUS_RGB);
    if (!name || !units || !ui->stock[index] || !ui->rows[index] || !ui->summary[index] || !ui->shortages[index]) goto failure;
    lv_label_set_text_static(name, names[index]);
    lv_label_set_text_static(units, "units");
  }
  ui->rows[3] = label(ui->root, fonts->small, 50, 355, 286, 48, CORE_ART_INK_RGB);
  if (!ui->rows[3]) goto failure;
  ui->title = label(ui->root, fonts->status, 398, 153, 580, 38, CORE_ART_INK_RGB);
  ui->identity = label(ui->root, fonts->small, 402, 197, 574, 48, CORE_ART_SECONDARY_RGB);
  ui->art = image(ui->root, images[1], 405, 247);
  ui->heading = label(ui->root, fonts->small, 689, 238, 278, 30, CORE_ART_SAVED_RGB);
  ui->form = label(ui->root, fonts->body, 689, 275, 278, 64, CORE_ART_INK_RGB);
  ui->reference = label(ui->root, fonts->small, 689, 346, 278, 28, CORE_ART_SECONDARY_RGB);
  ui->cost = label(ui->root, fonts->small, 689, 378, 278, 28, CORE_ART_INK_RGB);
  ui->body = label(ui->root, fonts->small, 689, 409, 278, 48, CORE_ART_INK_RGB);
  ui->coat = label(ui->root, fonts->heading, 689, 247, 278, 44, CORE_ART_FOCUS_RGB);
  ui->features = label(ui->root, fonts->small, 689, 297, 278, 28, CORE_ART_INK_RGB);
  ui->source_title = label(ui->root, fonts->small, 689, 412, 278, 24, CORE_ART_SECONDARY_RGB);
  ui->source = label(ui->root, fonts->small, 689, 436, 278, 48, CORE_ART_INK_RGB);
  ui->visits = label(ui->root, fonts->small, 689, 498, 278, 28, CORE_ART_SAVED_RGB);
  ui->progress = label(ui->root, fonts->body, 416, 473, 552, 34, CORE_ART_FOCUS_RGB);
  ui->pending = label(ui->root, fonts->body, 411, 350, 264, 64, CORE_ART_SECONDARY_RGB);
  ui->message = label(ui->root, fonts->small, 398, 552, 588, 44, CORE_ART_INK_RGB);
  if (!ui->title || !ui->identity || !ui->art || !ui->heading || !ui->form ||
      !ui->reference || !ui->cost || !ui->body || !ui->coat || !ui->features ||
      !ui->source_title || !ui->source || !ui->visits || !ui->progress || !ui->pending || !ui->message) goto failure;
  if (!lab_resident_gallery_init(&ui->gallery, ui->root, fonts->small, images[11], images[12])) goto failure;
  return ui;
failure:
  lab_action_ui_destroy(ui);
  return NULL;
}

void lab_action_ui_destroy(LabActionUi *ui) {
  if (!ui) return;
  if (ui->root) lv_obj_delete(ui->root);
  free(ui);
}
void lab_action_ui_hide(LabActionUi *ui) {
  if (ui) lv_obj_set_hidden(ui->root, true);
}
static int terminated(const char *text, size_t size) { return memchr(text, 0, size) != NULL; }
static int valid(const LabActionView *view) {
  if ((unsigned)view->page > LAB_ACTION_RESIDENTS ||
      (unsigned)view->detail > LAB_ACTION_RESIDENT_SHOWN || (unsigned)view->art > LAB_ACTION_ART_PENDING ||
      !view->option_count || view->option_count > LAB_ACTION_OPTIONS || view->focus >= view->option_count ||
      view->candidate_authorized > 1 || view->draft_valid > 1 || view->resident_visible > 1 ||
      view->storage_error > 1 || view->suspended > 1 || view->elapsed_ms > view->duration_ms) return 0;
#define CHECK_STRING(field) if (!terminated(view->field, sizeof(view->field))) return 0
  CHECK_STRING(title); CHECK_STRING(sample_id); CHECK_STRING(resident_id); CHECK_STRING(source_sample_id);
  CHECK_STRING(form_title); CHECK_STRING(reference_id); CHECK_STRING(heading); CHECK_STRING(body);
  CHECK_STRING(known); CHECK_STRING(missing); CHECK_STRING(next); CHECK_STRING(message);
  CHECK_STRING(coat); CHECK_STRING(features);
#undef CHECK_STRING
  for (unsigned index = 0; index < view->option_count; ++index)
    if (!terminated(view->options[index], sizeof(view->options[index]))) return 0;
  if ((view->page == LAB_ACTION_CREATE && view->detail != LAB_ACTION_CREATE_LOCKED && view->detail != LAB_ACTION_CREATE_AVAILABLE) ||
      (view->page == LAB_ACTION_REVIEW && view->detail != LAB_ACTION_REVIEW_STALE && view->detail != LAB_ACTION_REVIEW_VALID) ||
      (view->page == LAB_ACTION_INCUBATION && (view->detail < LAB_ACTION_INCUBATION_EMPTY || view->detail > LAB_ACTION_INCUBATION_READY)) ||
      (view->page >= LAB_ACTION_REVEAL && view->detail != LAB_ACTION_RESIDENT_EMPTY && view->detail != LAB_ACTION_RESIDENT_SHOWN)) return 0;
  if ((view->page == LAB_ACTION_CREATE && view->option_count !=
          (view->detail == LAB_ACTION_CREATE_AVAILABLE ? 2u : 1u)) ||
      (view->page == LAB_ACTION_REVIEW && view->option_count != 2) ||
      ((view->page == LAB_ACTION_INCUBATION || view->page == LAB_ACTION_REVEAL) && view->option_count != 1) ||
      (view->page == LAB_ACTION_HABITAT && view->option_count !=
          (view->detail == LAB_ACTION_RESIDENT_SHOWN ? 3u : 1u)) ||
      (view->page == LAB_ACTION_RESIDENTS && view->detail == LAB_ACTION_RESIDENT_EMPTY && view->option_count != 1)) return 0;
  if (view->candidate_authorized != (view->detail == LAB_ACTION_CREATE_AVAILABLE) ||
      view->draft_valid != (view->detail == LAB_ACTION_REVIEW_VALID) ||
      view->resident_visible != (view->detail == LAB_ACTION_RESIDENT_SHOWN)) return 0;
  int portrait = view->art == LAB_ACTION_ART_PLAIN || view->art == LAB_ACTION_ART_MARKED;
  int candidate = view->candidate_authorized || view->draft_valid;
  for (unsigned resource = 0; resource < 3; ++resource)
    if (view->costs[resource] != (candidate ? 5u : 0u)) return 0;
  if (portrait && !candidate && !view->resident_visible) return 0;
  if (candidate && !portrait) return 0;
  if (view->resident_visible && !portrait && view->art != LAB_ACTION_ART_PENDING) return 0;
  if (view->art == LAB_ACTION_ART_PENDING && !view->resident_visible) return 0;
  if (view->page == LAB_ACTION_INCUBATION && view->art !=
      (LabActionArt)(LAB_ACTION_ART_INCUBATOR_EMPTY + view->detail - LAB_ACTION_INCUBATION_EMPTY)) return 0;
  if ((view->detail == LAB_ACTION_CREATE_LOCKED || view->detail == LAB_ACTION_REVIEW_STALE) &&
      view->art != LAB_ACTION_ART_TOOLS) return 0;
  if (view->detail == LAB_ACTION_RESIDENT_EMPTY && view->art != LAB_ACTION_ART_NONE) return 0;
  if (!lab_resident_gallery_view_valid(&view->gallery)) return 0;
  if (view->page == LAB_ACTION_RESIDENTS &&
      (view->option_count != (view->gallery.count ? view->gallery.count : 1u) ||
       (view->gallery.count && (view->focus != view->gallery.selected || !view->resident_visible)) ||
       (!view->gallery.count && view->resident_visible))) return 0;
  return 1;
}

int lab_action_ui_update(LabActionUi *ui, const LabActionView *view) {
  if (!ui || !view || !valid(view)) return 0;
  ui->view = *view;
  view = &ui->view;
  int candidate = view->candidate_authorized || view->draft_valid;
  int resident = view->resident_visible;
  int incubation = view->page == LAB_ACTION_INCUBATION;
  int locked = view->detail == LAB_ACTION_CREATE_LOCKED || view->detail == LAB_ACTION_REVIEW_STALE;
  int portrait = view->art == LAB_ACTION_ART_PLAIN || view->art == LAB_ACTION_ART_MARKED;
  int population = view->page == LAB_ACTION_RESIDENTS;
  int activity = view->page == LAB_ACTION_HABITAT && resident;
  lab_resident_gallery_hide(&ui->gallery);
  lv_obj_set_pos(ui->header.object, 24, population ? 16 : 24);
  lv_obj_set_pos(ui->rail.object, 24, population ? 124 : 140);
  native_ui_frame_size(&ui->rail, population || activity ? 208 : 330, population ? 432 : 416);
  lv_obj_set_pos(ui->workpiece.object, population || activity ? 248 : 376, population ? 124 : 140);
  native_ui_frame_size(&ui->workpiece, population || activity ? 752 : 624, population ? 432 : 416);
  lv_obj_set_pos(ui->title, population ? 276 : 398, population ? 128 : 153);
  lv_obj_set_size(ui->title, population ? 696 : 580, population ? 30 : 38);
  lv_obj_set_pos(ui->identity, 402, 197);
  lv_obj_set_size(ui->identity, 574, 48);
  lv_obj_set_style_text_font(ui->form, ui->fonts.body, 0);
  lv_obj_set_size(ui->form, 278, 64);
  lv_obj_set_pos(ui->source, 689, 436);
  lv_obj_set_size(ui->source, 278, 48);
  unsigned row_height = view->page == LAB_ACTION_CREATE || view->page == LAB_ACTION_RESIDENTS ? 110 : 62;
  unsigned visible_rows = view->page == LAB_ACTION_HABITAT ? 4 : 3;
  unsigned first = view->focus >= visible_rows ? view->focus - visible_rows + 1 : 0;
  lv_obj_set_hidden(ui->root, false);
  native_ui_frame_size(&ui->focus, 302, (int)row_height-6);
  lv_obj_set_pos(ui->focus.object, 38, 157+(int)((view->focus-first)*row_height));
  for (unsigned index = 0; index < 4; ++index) {
    unsigned option = first + index;
    lv_obj_set_hidden(ui->rows[index], index >= visible_rows || option >= view->option_count);
    if (index < visible_rows && option < view->option_count) {
      lv_obj_set_pos(ui->rows[index], 50, 169+(int)(index*row_height));
      lv_obj_set_width(ui->rows[index], 286);
      lv_obj_set_height(ui->rows[index], (int)row_height-14);
      lv_label_set_text_static(ui->rows[index], view->options[option]);
      lv_obj_set_style_text_color(ui->rows[index], lv_color_hex(option == view->focus ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
    }
    if (index < 3) {
      snprintf(ui->stock_text[index], sizeof(ui->stock_text[index]), "%u", view->stock[index]);
      lv_label_set_text_static(ui->stock[index], ui->stock_text[index]);
    }
  }
  lv_label_set_text_static(ui->title, view->title);
  lv_label_set_text_static(ui->identity, resident ? view->resident_id : view->sample_id);
  lv_label_set_text_static(ui->heading, view->heading);
  lv_obj_set_hidden(ui->heading, resident);
  lv_obj_set_pos(ui->heading, candidate ? 689 : 416, candidate ? 238 : incubation ? 418 : 251);
  lv_obj_set_size(ui->heading, candidate ? 278 : 552, candidate ? 30 : 64);
  lv_obj_set_style_text_font(ui->heading, candidate ? ui->fonts.small : ui->fonts.status, 0);
  lv_label_set_text_static(ui->body, view->body);
  lv_obj_set_hidden(ui->body, resident && view->page != LAB_ACTION_REVEAL);
  lv_obj_set_pos(ui->body, candidate ? 689 : resident ? 689 : 588,
      candidate ? 409 : resident ? 498 : 286);
  lv_obj_set_size(ui->body, candidate || resident ? 278 : 380, candidate || resident ? 48 : 106);
  lv_label_set_text_static(ui->form, view->form_title);
  lv_obj_set_hidden(ui->form, !candidate && !resident);
  lv_obj_set_pos(ui->form, 689, resident ? 349 : 275);
  snprintf(ui->reference_text, sizeof(ui->reference_text), "Reference: %s", view->reference_id);
  lv_label_set_text_static(ui->reference, candidate ? ui->reference_text : "Selected form");
  lv_obj_set_hidden(ui->reference, !candidate && !resident);
  lv_obj_set_pos(ui->reference, 689, resident ? 327 : 346);
  lv_label_set_text_static(ui->cost, "Cost: 5 of each supply");
  lv_obj_set_hidden(ui->cost, !candidate);
  const char *names[] = {"Data", "Energy", "Essence"};
  unsigned shortage_row = 0;
  for (unsigned index = 0; index < 3; ++index) {
    int shortage = candidate && view->stock[index] < view->costs[index];
    lv_obj_set_hidden(ui->shortages[index], !shortage);
    if (shortage) {
      snprintf(ui->shortage_text[index], sizeof(ui->shortage_text[index]), "%s: %u / %u",
          names[index], view->stock[index], view->costs[index]);
      lv_label_set_text_static(ui->shortages[index], ui->shortage_text[index]);
      lv_obj_set_pos(ui->shortages[index], 689, 460+(int)shortage_row++*22);
    }
  }
  const char *summary[] = {view->known, view->missing, view->next};
  for (unsigned index = 0; index < 3; ++index) {
    lv_label_set_text_static(ui->summary[index], summary[index]);
    lv_obj_set_hidden(ui->summary[index], !locked || !summary[index][0]);
  }
  lv_label_set_text_static(ui->coat, view->coat);
  lv_label_set_text_static(ui->features, view->features);
  lv_label_set_text_static(ui->source_title, "Source sample");
  lv_label_set_text_static(ui->source, view->source_sample_id);
  lv_obj_set_hidden(ui->coat, !resident);
  lv_obj_set_hidden(ui->features, !resident);
  lv_obj_set_hidden(ui->source_title, !resident);
  lv_obj_set_hidden(ui->source, !resident);
  snprintf(ui->visits_text, sizeof(ui->visits_text), "Visits together: %u", view->visits);
  lv_label_set_text_static(ui->visits, ui->visits_text);
  lv_obj_set_hidden(ui->visits, !resident || view->page == LAB_ACTION_REVEAL);
  snprintf(ui->progress_text, sizeof(ui->progress_text), "%u / %u s active play",
      view->elapsed_ms/1000, view->duration_ms/1000);
  lv_label_set_text_static(ui->progress, ui->progress_text);
  lv_obj_set_hidden(ui->progress, !incubation || view->detail == LAB_ACTION_INCUBATION_EMPTY);
  lv_label_set_text_static(ui->pending, "Portrait pending");
  lv_obj_set_hidden(ui->pending, view->art != LAB_ACTION_ART_PENDING);
  int slot = portrait ? view->art == LAB_ACTION_ART_MARKED ? 12 : 11 :
      incubation ? 2 : view->art == LAB_ACTION_ART_TOOLS ? 1 : -1;
  lv_obj_set_hidden(ui->art, slot < 0);
  if (slot >= 0) {
    lv_image_set_src(ui->art, ui->images[slot]);
    lv_obj_set_pos(ui->art, portrait ? 405 : incubation ? 620 : 424,
        portrait ? 247 : incubation ? 247 : 285);
  }
  lv_label_set_text_static(ui->message, view->message);
  lv_obj_set_pos(ui->message, population ? 48 : 398, 552);
  lv_obj_set_size(ui->message, population ? 938 : 588, 44);
  lv_obj_set_hidden(ui->message, !view->message[0]);
  lv_obj_set_style_text_color(ui->message, lv_color_hex(view->storage_error ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
  if (population) {
    lv_obj_set_hidden(ui->focus.object, true);
    for (unsigned index = 0; index < 4; ++index) lv_obj_set_hidden(ui->rows[index], index != 0);
    lv_label_set_text_static(ui->rows[0], "Population");
    lv_obj_set_pos(ui->rows[0], 50, 169);
    lv_obj_set_size(ui->rows[0], 176, 28);
    lv_obj_set_style_text_color(ui->rows[0], lv_color_hex(CORE_ART_SECONDARY_RGB), 0);
    if (!lab_resident_gallery_update(&ui->gallery, &view->gallery, 1)) return 0;
    lv_obj_set_pos(ui->gallery.object, 264, 160);
    lv_obj_set_hidden(ui->art, true);
    lv_obj_set_hidden(ui->pending, true);
    lv_obj_set_hidden(ui->reference, true);
    lv_obj_set_hidden(ui->coat, true);
    lv_obj_set_hidden(ui->features, true);
    lv_obj_set_hidden(ui->source_title, true);
    lv_obj_set_hidden(ui->visits, true);
    lv_obj_set_hidden(ui->body, true);
    lv_obj_set_hidden(ui->identity, !view->gallery.count);
    lv_obj_set_pos(ui->identity, 276, 482);
    lv_obj_set_size(ui->identity, 696, 22);
    lv_label_set_text_static(ui->identity, view->gallery.count ? view->gallery.entries[view->gallery.selected].id : "");
    snprintf(ui->selected_text, sizeof(ui->selected_text), "%s / Visits: %u",
        view->gallery.form_title, (unsigned)view->gallery.visits);
    snprintf(ui->source_text, sizeof(ui->source_text), "Source sample: %s", view->gallery.source_sample_id);
    lv_obj_set_pos(ui->form, 276, 506);
    lv_obj_set_size(ui->form, 696, 22);
    lv_obj_set_style_text_font(ui->form, ui->fonts.small, 0);
    lv_label_set_text_static(ui->form, ui->selected_text);
    lv_obj_set_hidden(ui->form, !view->gallery.count);
    lv_obj_set_pos(ui->source, 276, 530);
    lv_obj_set_size(ui->source, 696, 22);
    lv_label_set_text_static(ui->source, ui->source_text);
    lv_obj_set_hidden(ui->source, !view->gallery.count);
    lv_obj_set_hidden(ui->heading, view->gallery.count != 0);
    lv_obj_set_pos(ui->heading, 276, 276);
    lv_obj_set_size(ui->heading, 696, 38);
    lv_label_set_text_static(ui->heading, "No revealed residents yet");
  } else {
    lv_obj_set_hidden(ui->focus.object, false);
    if (activity) {
      lv_obj_set_hidden(ui->rows[3], true);
      for (unsigned index = 1; index < 3; ++index) {
        lv_obj_set_pos(ui->rows[index], 50, 169+(int)(index-1)*62);
        lv_obj_set_size(ui->rows[index], 176, 48);
        lv_label_set_text_static(ui->rows[index], view->options[index]);
        lv_obj_set_hidden(ui->rows[index], false);
      }
      lv_obj_set_pos(ui->rows[0], 702, 524);
      lv_obj_set_size(ui->rows[0], 254, 24);
      lv_label_set_text_static(ui->rows[0], view->options[0]);
      lv_obj_set_hidden(ui->rows[0], false);
      native_ui_frame_size(&ui->focus, view->focus == 0 ? 278 : 180, view->focus == 0 ? 34 : 56);
      lv_obj_set_pos(ui->focus.object, view->focus == 0 ? 689 : 38,
          view->focus == 0 ? 516 : 157+(int)(view->focus-1)*62);
      lv_obj_set_pos(ui->visits, 689, 492);
    } else lv_obj_set_pos(ui->visits, 689, 498);
  }
  return 1;
}
