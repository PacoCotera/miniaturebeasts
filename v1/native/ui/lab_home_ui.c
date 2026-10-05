#include "lab_home_ui.h"
#include "lab_resident_gallery.h"
#include "../selected-lab/ui_theme.h"
#include "../selected-lab/core_art.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct LabHomeUi {
  lv_obj_t *root, *title, *nav[5], *stock[3], *units[3];
  lv_obj_t *overview_art[4], *readouts[4][4];
  lv_obj_t *landing_art, *pending, *heading, *body, *detail[2], *strip, *progress, *progress_fill;
  lv_obj_t *resource_art[3], *resource_name[3], *resource_amount[3];
  lv_obj_t *footer, *warning, *divider, *workpiece_fill;
  NativeUiFrame header, rail, workpiece, focus;
  LabHomeView view;
  LabHomeFonts fonts;
  const lv_image_dsc_t *images[13];
  char quantities[3][24], landing_quantities[3][24];
  LabResidentGallery gallery;
  char selected_text[152], source_text[64];
};
static lv_obj_t *surface(lv_obj_t *parent, int x, int y, int width,
    int height, uint32_t color) {
  lv_obj_t *object = lv_obj_create(parent);
  if (!object) return NULL;
  native_ui_surface(object, color, 0, 0);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  return object;
}
static lv_obj_t *text(lv_obj_t *parent, const lv_font_t *font, int x, int y,
    int width, int height, uint32_t color, const char *value) {
  lv_obj_t *object = lv_label_create(parent);
  if (!object) return NULL;
  native_ui_text(object, font, color);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  lv_label_set_long_mode(object, LV_LABEL_LONG_MODE_WRAP);
  lv_label_set_text_static(object, value);
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
LabHomeUi *lab_home_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[13]) {
  if (!parent || !fonts || !images) return NULL;
  LabHomeUi *ui = calloc(1, sizeof(*ui));
  if (!ui) return NULL;
  ui->fonts = *fonts;
  for (unsigned i = 0; i < 13; ++i) {
    if (!images[i]) goto failure;
    ui->images[i] = images[i];
  }
  ui->root = surface(parent, 0, 0, 1024, 600, CORE_ART_GRAPHITE_RGB);
  if (!ui->root) goto failure;
  if (!native_ui_frame_init(&ui->header, ui->root, 976, 100, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->rail, ui->root, 208, 416, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->workpiece, ui->root, 752, 416, CORE_ART_BLUE_RGB)) goto failure;
  lv_obj_set_pos(ui->header.object, 24, 24);
  lv_obj_set_pos(ui->rail.object, 24, 140);
  lv_obj_set_pos(ui->workpiece.object, 248, 140);
  if (!surface(ui->root, 37, 37, 950, 75, CORE_ART_FIELD_RGB)) goto failure;
  ui->workpiece_fill = surface(ui->root, 264, 156, 720, 384, 0x2a3338);
  if (!ui->workpiece_fill) goto failure;
  if (!text(ui->root, fonts->title, 46, 35, 330, 42, CORE_ART_INK_RGB, "STATION") ||
      !text(ui->root, fonts->small, 47, 83, 330, 24, CORE_ART_SECONDARY_RGB, "STATION STOCK")) goto failure;
  const char *names[] = {"DATA", "ENERGY", "ESSENCE"};
  for (unsigned i = 0; i < 3; ++i) {
    int x = 402 + (int)i * 196;
    if (!image(ui->root, images[4+i], x+(50-(int)images[4+i]->header.w)/2,
        41+(58-(int)images[4+i]->header.h)/2) ||
        !text(ui->root, fonts->small, x+62, 39, 126, 24, CORE_ART_SECONDARY_RGB, names[i])) goto failure;
    ui->stock[i] = text(ui->root, fonts->status, x+62, 61, 126, 32, CORE_ART_INK_RGB, "");
    ui->units[i] = text(ui->root, fonts->small, x+62, 89, 126, 22, CORE_ART_SECONDARY_RGB, "");
    if (!ui->stock[i] || !ui->units[i]) goto failure;
  }
  if (!native_ui_frame_init(&ui->focus, ui->root, 188, 58, CORE_ART_FOCUS_RGB)) goto failure;
  native_ui_surface(ui->focus.object, 0x292922, CORE_ART_FOCUS_RGB, 0);
  native_ui_frame_size(&ui->focus, 188, 58);
  lv_obj_set_style_shadow_color(ui->focus.object, lv_color_hex(0xc58f32), 0);
  lv_obj_set_style_shadow_width(ui->focus.object, 10, 0);
  lv_obj_set_style_shadow_opa(ui->focus.object, 40, 0);
  const char *options[] = {"Overview", "Explore", "Research", "Incubator", "Habitat"};
  for (unsigned i = 0; i < 5; ++i) {
    ui->nav[i] = text(ui->root, fonts->body, 56, 195+(int)i*68, 164, 30, CORE_ART_INK_RGB, options[i]);
    if (!ui->nav[i]) goto failure;
  }
  ui->title = text(ui->root, fonts->title, 276, 162, 696, 44, CORE_ART_INK_RGB, "");
  for (unsigned i = 0; i < 4; ++i) {
    int x = i%2 ? 642 : 272, y = i<2 ? 207 : 377;
    ui->overview_art[i] = image(ui->root, images[i], x, y);
    int tx = x+150, ty = y+12;
    ui->readouts[i][0] = text(ui->root, fonts->small, tx, ty, 180, 24, CORE_ART_SECONDARY_RGB, "");
    ui->readouts[i][1] = text(ui->root, fonts->status, tx, ty+32, 180, 34, CORE_ART_INK_RGB, "");
    ui->readouts[i][2] = text(ui->root, fonts->small, tx, ty+69, 180, 40, CORE_ART_SECONDARY_RGB, "");
    ui->readouts[i][3] = text(ui->root, fonts->small, tx, ty+(i<2 ? 107 : 115), 180, 40, CORE_ART_SECONDARY_RGB, "");
    if (!ui->overview_art[i]) goto failure;
    for (unsigned j=0;j<4;++j) if (!ui->readouts[i][j]) goto failure;
  }
  ui->divider = surface(ui->root, 276, 373, 696, 1, 0x386484);
  ui->landing_art = image(ui->root, images[0], 326, 247);
  ui->pending = text(ui->root, fonts->body, 312, 330, 261, 64, CORE_ART_SECONDARY_RGB, "Portrait pending");
  ui->heading = text(ui->root, fonts->heading, 320, 218, 638, 82, CORE_ART_INK_RGB, "");
  ui->body = text(ui->root, fonts->body, 320, 303, 638, 68, CORE_ART_INK_RGB, "");
  for (unsigned i=0;i<2;++i)
    ui->detail[i] = text(ui->root, fonts->small, 505, 360+(int)i*39, 453, 48, CORE_ART_SECONDARY_RGB, "");
  ui->strip = text(ui->root, fonts->small, 334, 482, 594, 50, CORE_ART_INK_RGB, "");
  ui->progress = surface(ui->root, 505, 350, 435, 12, CORE_ART_SHADOW_RGB);
  if (!ui->progress) goto failure;
  ui->progress_fill = surface(ui->progress, 0, 0, 1, 12, CORE_ART_BLUE_HIGHLIGHT_RGB);
  if (!ui->progress_fill) goto failure;
  for (unsigned i=0;i<3;++i) {
    int x=324+(int)i*215;
    ui->resource_art[i] = image(ui->root, images[7+i], x, 327);
    ui->resource_name[i] = text(ui->root, fonts->small, x+101, 345, 105, 24, CORE_ART_SECONDARY_RGB, names[i]);
    ui->resource_amount[i] = text(ui->root, fonts->status, x+101, 375, 105, 34, CORE_ART_INK_RGB, "");
    if (!ui->resource_art[i] || !ui->resource_name[i] || !ui->resource_amount[i]) goto failure;
  }
  ui->footer = text(ui->root, fonts->small, 30, 567, 964, 28, CORE_ART_SECONDARY_RGB, "");
  ui->warning = text(ui->root, fonts->small, 276, 514, 696, 38, CORE_ART_FOCUS_RGB, "");
  if (!ui->title || !ui->divider || !ui->landing_art || !ui->pending || !ui->heading || !ui->body ||
      !ui->detail[0] || !ui->detail[1] || !ui->strip || !ui->footer || !ui->warning) goto failure;
  if (!lab_resident_gallery_init(&ui->gallery, ui->root, fonts->small, images[11], images[12])) goto failure;
  return ui;
failure:
  lab_home_ui_destroy(ui);
  return NULL;
}
void lab_home_ui_destroy(LabHomeUi *ui) {
  if (!ui) return;
  if (ui->root) lv_obj_delete(ui->root);
  free(ui);
}
void lab_home_ui_hide(LabHomeUi *ui) {
  if (ui) lv_obj_set_hidden(ui->root, true);
}
static int terminated(const char *value, size_t size) {
  return memchr(value, 0, size) != NULL;
}
static int valid_strings(const LabHomeView *v) {
  if (!terminated(v->title,sizeof(v->title)) || !terminated(v->footer,sizeof(v->footer)) ||
      !terminated(v->warning,sizeof(v->warning)) ||
      !terminated(v->landing.heading,sizeof(v->landing.heading)) ||
      !terminated(v->landing.body,sizeof(v->landing.body)) ||
      !terminated(v->landing.strip,sizeof(v->landing.strip))) return 0;
  for (unsigned i=0;i<3;++i) if (!terminated(v->stock_units[i],sizeof(v->stock_units[i]))) return 0;
  for (unsigned i=0;i<2;++i) if (!terminated(v->landing.details[i],sizeof(v->landing.details[i]))) return 0;
  for (unsigned i=0;i<4;++i) {
    if (!terminated(v->overview[i].name,sizeof(v->overview[i].name)) ||
        !terminated(v->overview[i].status,sizeof(v->overview[i].status))) return 0;
    for (unsigned j=0;j<2;++j) if (!terminated(v->overview[i].detail[j],sizeof(v->overview[i].detail[j]))) return 0;
  }
  return 1;
}
int lab_home_ui_update(LabHomeUi *ui, const LabHomeView *view) {
  if (!ui || !view || view->focus > 4 || (unsigned)view->landing.art > LAB_HOME_ART_PENDING || !valid_strings(view) ||
      view->landing.show_resources > 1 || view->landing.primary_resources > 1 || view->landing.show_progress > 1 ||
      (view->landing.show_progress && (!view->landing.total || view->landing.progress > view->landing.total)) ||
      !lab_resident_gallery_view_valid(&view->gallery)) return 0;
  ui->view = *view;
  lv_obj_set_hidden(ui->root, false);
  view = &ui->view;
  int population = view->focus == 4;
  lv_obj_set_height(ui->workpiece_fill, population ? 396 : 384);
  lv_obj_set_pos(ui->header.object, 24, population ? 16 : 24);
  lv_obj_set_pos(ui->workpiece.object, 248, population ? 124 : 140);
  native_ui_frame_size(&ui->workpiece, 752, population ? 432 : 416);
  lv_obj_set_pos(ui->title, 276, population ? 128 : 162);
  lv_obj_set_size(ui->title, 696, population ? 30 : 44);
  lv_obj_set_style_text_font(ui->title, population ? ui->fonts.status : ui->fonts.title, 0);
  lab_resident_gallery_hide(&ui->gallery);
  lv_label_set_text_static(ui->title, view->title);
  lv_obj_set_pos(ui->focus.object, 34, 179+(int)view->focus*68);
  for (unsigned i=0;i<5;++i)
    lv_obj_set_style_text_color(ui->nav[i], lv_color_hex(i==view->focus ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
  for (unsigned i=0;i<3;++i) {
    snprintf(ui->quantities[i], sizeof(ui->quantities[i]), "%u", view->stock[i]);
    lv_label_set_text_static(ui->stock[i], ui->quantities[i]);
    lv_label_set_text_static(ui->units[i], view->stock_units[i]);
    lv_obj_set_hidden(ui->resource_art[i], !view->landing.show_resources);
    lv_obj_set_hidden(ui->resource_name[i], !view->landing.show_resources);
    lv_obj_set_hidden(ui->resource_amount[i], !view->landing.show_resources ||
        (!view->landing.primary_resources && !view->landing.show_progress));
    lv_image_set_src(ui->resource_art[i], ui->images[(view->landing.primary_resources ? 7 : 4)+i]);
    snprintf(ui->landing_quantities[i], sizeof(ui->landing_quantities[i]), view->landing.primary_resources ? "%u" : "%u units", view->landing.amounts[i]);
    lv_label_set_text_static(ui->resource_amount[i], ui->landing_quantities[i]);
  }
  for (unsigned i=0;i<4;++i) {
    lv_obj_set_hidden(ui->overview_art[i], view->focus!=0);
    const char *values[] = {view->overview[i].name, view->overview[i].status,
        view->overview[i].detail[0], view->overview[i].detail[1]};
    for (unsigned j=0;j<4;++j) {
      lv_obj_set_hidden(ui->readouts[i][j], view->focus!=0);
      lv_label_set_text_static(ui->readouts[i][j], values[j]);
    }
  }
  lv_obj_set_hidden(ui->divider, view->focus!=0);
  lv_obj_set_hidden(ui->heading, !view->focus);
  lv_obj_set_hidden(ui->body, !view->focus);
  lv_obj_set_hidden(ui->strip, !view->focus || !view->landing.strip[0]);
  lv_label_set_text_static(ui->heading, view->landing.heading);
  lv_label_set_text_static(ui->body, view->landing.body);
  lv_label_set_text_static(ui->strip, view->landing.strip);
  for (unsigned i=0;i<2;++i) {
    lv_obj_set_hidden(ui->detail[i], !view->focus);
    lv_label_set_text_static(ui->detail[i], view->landing.details[i]);
  }
  int art = (int)view->landing.art;
  int slot = art>=1 && art<=4 ? art-1 : art==5 ? 10 : art==6 ? 11 : art==7 ? 12 : -1;
  lv_obj_set_hidden(ui->landing_art, !view->focus || slot<0);
  lv_obj_set_hidden(ui->pending, !view->focus || art != LAB_HOME_ART_PENDING);
  if (slot>=0) lv_image_set_src(ui->landing_art, ui->images[slot]);
  int portrait = art==6 || art==7 || art==8;
  int illustrated = slot>=0 || portrait;
  lv_obj_set_pos(ui->landing_art, portrait ? 312 : art==5 ? 376 : 326,
      portrait ? 220 : art==1 ? 309 : art==5 ? 297 : 247);
  int tx = portrait ? 585 : illustrated ? 505 : 320;
  int width = 958-tx;
  lv_obj_set_pos(ui->heading, tx, portrait ? 247 : illustrated ? 245 : 218);
  lv_obj_set_size(ui->heading, width, 78);
  lv_obj_set_style_text_font(ui->heading, portrait ? ui->fonts.status : ui->fonts.heading, 0);
  lv_obj_set_pos(ui->body, tx, portrait ? 308 : illustrated ? 322 : view->landing.show_resources ? 272 : 303);
  lv_obj_set_size(ui->body, width, 64);
  for (unsigned i=0;i<2;++i) {
    lv_obj_set_pos(ui->detail[i], tx, (portrait ? 370 : 393)+(int)i*44);
    lv_obj_set_width(ui->detail[i], width);
  }
  lv_obj_set_hidden(ui->progress, !view->landing.show_progress);
  if (view->landing.show_progress) {
    lv_obj_set_pos(ui->progress, illustrated ? 505 : 320, illustrated ? 381 : 320);
    lv_obj_set_width(ui->progress, illustrated ? 435 : 622);
    unsigned width = illustrated ? 435 : 622;
    lv_obj_set_width(ui->progress_fill, (int)((uint64_t)view->landing.progress*width/view->landing.total));
    lv_obj_set_hidden(ui->progress_fill, !view->landing.progress);
  }
  lv_label_set_text_static(ui->footer, "");
  lv_obj_set_hidden(ui->footer, true);
  lv_label_set_text_static(ui->warning, view->warning);
  lv_obj_set_hidden(ui->warning, !view->warning[0]);
  lv_obj_set_pos(ui->warning, population ? 264 : 276, population ? 552 : 514);
  lv_obj_set_size(ui->warning, population ? 728 : 696, population ? 44 : 38);
  if (population) {
    if (!lab_resident_gallery_update(&ui->gallery, &view->gallery, 0)) return 0;
    lv_obj_set_pos(ui->gallery.object, 264, 160);
    lv_obj_set_hidden(ui->landing_art, true);
    lv_obj_set_hidden(ui->pending, true);
    lv_obj_set_hidden(ui->strip, true);
    lv_obj_set_hidden(ui->detail[1], true);
    lv_obj_set_pos(ui->heading, 276, view->gallery.count ? 482 : 276);
    lv_obj_set_size(ui->heading, 696, view->gallery.count ? 22 : 38);
    lv_obj_set_style_text_font(ui->heading, view->gallery.count ? ui->fonts.small : ui->fonts.status, 0);
    lv_label_set_text_static(ui->heading, view->gallery.count ?
        view->gallery.entries[view->gallery.selected].id : "No revealed residents yet");
    snprintf(ui->selected_text, sizeof(ui->selected_text), "%s / Visits: %u",
        view->gallery.form_title, (unsigned)view->gallery.visits);
    snprintf(ui->source_text, sizeof(ui->source_text), "Source sample: %s", view->gallery.source_sample_id);
    lv_obj_set_pos(ui->body, 276, 506);
    lv_obj_set_size(ui->body, 696, 22);
    lv_obj_set_style_text_font(ui->body, ui->fonts.small, 0);
    lv_label_set_text_static(ui->body, ui->selected_text);
    lv_obj_set_hidden(ui->body, !view->gallery.count);
    lv_obj_set_pos(ui->detail[0], 276, 530);
    lv_obj_set_size(ui->detail[0], 696, 22);
    lv_label_set_text_static(ui->detail[0], ui->source_text);
    lv_obj_set_hidden(ui->detail[0], !view->gallery.count);
  } else {
    lv_obj_set_style_text_font(ui->body, ui->fonts.body, 0);
    for (unsigned index = 0; index < 2; ++index) lv_obj_set_height(ui->detail[index], 48);
  }
  return 1;
}
