#include "lab_research_ui.h"
#include "../selected-lab/ui_theme.h"
#include "../selected-lab/core_art.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct LabResearchUi {
  lv_obj_t *root, *stock[3], *units[3], *rows[6], *nav_context;
  lv_obj_t *title, *sample, *heading, *body, *art, *portraits[2], *captions[2];
  lv_obj_t *finding, *summary[3], *partial;
  lv_obj_t *costs[3], *cost_art[3], *cost_title, *counts[3];
  lv_obj_t *alternatives[2], *footer, *message;
  lv_obj_t *coat_clips;
  NativeUiFrame header, rail, workpiece, focus;
  LabHomeFonts fonts;
  LabResearchView view;
  const lv_image_dsc_t *images[18];
  char stock_text[3][24], cost_text[3][48], count_text[3][64];
  char origin_text[96];
  unsigned reference_scale;
};

static void draw_coat_references(lv_event_t *event) {
  LabResearchUi *ui = lv_event_get_user_data(event);
  lv_layer_t *layer = lv_event_get_layer(event);
  lv_area_t bounds;
  lv_obj_get_coords(ui->coat_clips, &bounds);
  lv_area_t incoming_clip = layer->_clip_area;
  unsigned scale = ui->reference_scale;
  for (unsigned index = 0; index < 2; ++index) {
    int x = bounds.x1 + (int)index * 270;
    int y = bounds.y1;
    lv_area_t panel = {x, y, x + 48 * (int)scale - 1, y + 40 * (int)scale - 1};
    lv_area_t clip = {
      panel.x1 > incoming_clip.x1 ? panel.x1 : incoming_clip.x1,
      panel.y1 > incoming_clip.y1 ? panel.y1 : incoming_clip.y1,
      panel.x2 < incoming_clip.x2 ? panel.x2 : incoming_clip.x2,
      panel.y2 < incoming_clip.y2 ? panel.y2 : incoming_clip.y2
    };
    if (clip.x1 > clip.x2 || clip.y1 > clip.y2) continue;
    const lv_image_dsc_t *source = ui->images[11 + index];
    lv_draw_image_dsc_t image;
    lv_draw_image_dsc_init(&image);
    image.src = source;
    image.scale_x = image.scale_y = 256 * scale;
    image.pivot.x = image.pivot.y = 0;
    image.antialias = 0;
    lv_area_t original = {x - 164 * (int)scale, y - 148 * (int)scale,
      x - 164 * (int)scale + (int)source->header.w - 1,
      y - 148 * (int)scale + (int)source->header.h - 1};
    /* LVGL snapshots this task's clip. Restore the incoming partial-flush clip
     * immediately so the original body cannot leak into subsequent tasks. */
    layer->_clip_area = clip;
    lv_draw_image(layer, &image, &original);
    layer->_clip_area = incoming_clip;
  }
}
static lv_obj_t *surface(lv_obj_t *parent, int x, int y, int w, int h, uint32_t color) {
  lv_obj_t *object = lv_obj_create(parent);
  if (!object) return NULL;
  native_ui_surface(object, color, 0, 0);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, w, h);
  return object;
}
static lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, int x, int y,
    int w, int h, uint32_t color, const char *value) {
  lv_obj_t *object = lv_label_create(parent);
  if (!object) return NULL;
  native_ui_text(object, font, color);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, w, h);
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
LabResearchUi *lab_research_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const images[18]) {
  if (!parent || !fonts || !images) return NULL;
  LabResearchUi *ui = calloc(1, sizeof(*ui));
  if (!ui) return NULL;
  ui->fonts = *fonts;
  ui->reference_scale = 2;
  for (unsigned index = 0; index < 18; ++index) {
    if (!images[index]) goto failure;
    ui->images[index] = images[index];
  }
  ui->root = surface(parent, 0, 0, 1024, 600, CORE_ART_GRAPHITE_RGB);
  if (!ui->root ||
      !native_ui_frame_init(&ui->header, ui->root, 976, 100, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->rail, ui->root, 208, 416, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->workpiece, ui->root, 752, 416, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->focus, ui->root, 302, 56, CORE_ART_FOCUS_RGB)) goto failure;
  lv_obj_set_pos(ui->header.object, 24, 24);
  lv_obj_set_pos(ui->rail.object, 24, 140);
  lv_obj_set_pos(ui->workpiece.object, 248, 140);
  native_ui_surface(ui->focus.object, 0x292922, CORE_ART_FOCUS_RGB, 0);
  native_ui_frame_size(&ui->focus, 302, 56);
  lv_obj_set_style_shadow_color(ui->focus.object, lv_color_hex(0xc58f32), 0);
  lv_obj_set_style_shadow_width(ui->focus.object, 10, 0);
  lv_obj_set_style_shadow_opa(ui->focus.object, 40, 0);
  if (!surface(ui->root, 37, 37, 950, 75, CORE_ART_FIELD_RGB)) goto failure;
  if (!label(ui->root, fonts->title, 46, 35, 330, 42, CORE_ART_INK_RGB, "STATION") ||
      !label(ui->root, fonts->small, 47, 83, 330, 24, CORE_ART_SECONDARY_RGB, "STATION STOCK")) goto failure;
  const char *names[] = {"DATA", "ENERGY", "ESSENCE"};
  for (unsigned index = 0; index < 3; ++index) {
    int x = 402 + (int)index * 196;
    if (!image(ui->root, images[4+index], x+(50-(int)images[4+index]->header.w)/2,
        41+(58-(int)images[4+index]->header.h)/2) ||
        !label(ui->root, fonts->small, x+62, 39, 126, 24, CORE_ART_SECONDARY_RGB, names[index])) goto failure;
    ui->stock[index] = label(ui->root, fonts->status, x+62, 61, 126, 32, CORE_ART_INK_RGB, "");
    ui->units[index] = label(ui->root, fonts->small, x+62, 89, 126, 22, CORE_ART_SECONDARY_RGB, "");
    ui->cost_art[index] = image(ui->root, images[4+index], 600, 332+(int)index*56);
    ui->costs[index] = label(ui->root, fonts->body, 665, 343+(int)index*56, 284, 32, CORE_ART_INK_RGB, "");
    ui->counts[index] = label(ui->root, fonts->body, 588, 315+(int)index*42, 380, 34, CORE_ART_INK_RGB, "");
    if (!ui->stock[index] || !ui->units[index] || !ui->cost_art[index] || !ui->costs[index] || !ui->counts[index]) goto failure;
  }
  for (unsigned row = 0; row < 6; ++row) {
    ui->rows[row] = label(ui->root, fonts->small, 50, 169+(int)row*62, 286, 48, CORE_ART_INK_RGB, "");
    if (!ui->rows[row]) goto failure;
  }
  ui->nav_context = label(ui->root, fonts->small, 46, 170, 164, 26,
      CORE_ART_SECONDARY_RGB, "Research");
  ui->title = label(ui->root, fonts->status, 398, 153, 580, 38, CORE_ART_INK_RGB, "");
  ui->sample = label(ui->root, fonts->small, 402, 197, 574, 25, CORE_ART_SECONDARY_RGB, "");
  ui->heading = label(ui->root, fonts->status, 416, 245, 560, 70, CORE_ART_INK_RGB, "");
  ui->body = label(ui->root, fonts->small, 416, 282, 560, 54, CORE_ART_SECONDARY_RGB, "");
  ui->art = image(ui->root, images[1], 424, 315);
  ui->finding = label(ui->root, fonts->body, 610, 247, 356, 164, CORE_ART_INK_RGB, "");
  ui->cost_title = label(ui->root, fonts->small, 665, 307, 290, 28, CORE_ART_SECONDARY_RGB, "Cost / Station stock");
  ui->partial = label(ui->root, fonts->small, 416, 400, 556, 28, CORE_ART_SECONDARY_RGB,
      "Pale variation known / appearance unresolved");
  for (unsigned index = 0; index < 2; ++index) {
    ui->portraits[index] = image(ui->root, images[11+index], 405+(int)index*294, 247);
    ui->captions[index] = label(ui->root, fonts->small, 405+(int)index*294, 219, 275, 27, CORE_ART_INK_RGB, "");
    ui->alternatives[index] = label(ui->root, fonts->small, 614+(int)index*178, 349, 169, 90,
        CORE_ART_SECONDARY_RGB, index ? "Pale markings\nAppearance expressed" : "Plain coat\nPale variation carried");
    if (!ui->portraits[index] || !ui->captions[index] || !ui->alternatives[index]) goto failure;
  }
  for (unsigned index = 0; index < 3; ++index) {
    ui->summary[index] = label(ui->root, fonts->small, 416, 458+(int)index*26, 552, 48,
        index == 0 ? CORE_ART_SAVED_RGB : index == 1 ? CORE_ART_SECONDARY_RGB : CORE_ART_INK_RGB, "");
    if (!ui->summary[index]) goto failure;
  }
  ui->footer = label(ui->root, fonts->small, 30, 569, 964, 27, CORE_ART_SECONDARY_RGB, "");
  ui->message = label(ui->root, fonts->small, 398, 552, 588, 44, CORE_ART_INK_RGB, "");
  ui->coat_clips = surface(ui->root, 300, 290, 366, 80, CORE_ART_FIELD_RGB);
  if (ui->coat_clips) {
    lv_obj_set_style_bg_opa(ui->coat_clips, LV_OPA_TRANSP, 0);
    lv_obj_set_clickable(ui->coat_clips, false);
    lv_obj_add_event_cb(ui->coat_clips, draw_coat_references, LV_EVENT_DRAW_MAIN, ui);
    lv_obj_set_hidden(ui->coat_clips, true);
  }
  if (!ui->title || !ui->sample || !ui->heading || !ui->body || !ui->art || !ui->finding ||
      !ui->cost_title || !ui->partial || !ui->footer || !ui->message ||
      !ui->coat_clips || !ui->nav_context) goto failure;
  return ui;
failure:
  lab_research_ui_destroy(ui);
  return NULL;
}
void lab_research_ui_destroy(LabResearchUi *ui) {
  if (!ui) return;
  if (ui->root) lv_obj_delete(ui->root);
  free(ui);
}
void lab_research_ui_hide(LabResearchUi *ui) {
  if (ui) lv_obj_set_hidden(ui->root, true);
}
static int terminated(const char *text, size_t size) { return memchr(text, 0, size) != NULL; }
static int valid(const LabResearchView *view) {
  if ((unsigned)view->page > LAB_RESEARCH_LIBRARY_FINDING ||
      (unsigned)view->detail > LAB_RESEARCH_RECORDS || (unsigned)view->art > LAB_RESEARCH_ART_PAIR ||
      !view->option_count || view->option_count > LAB_RESEARCH_OPTIONS || view->focus >= view->option_count ||
      view->topic_count > LAB_RESEARCH_TOPICS || view->known_method > 1 || view->useful > 1 ||
      view->legacy > 1 || view->complete > 1 || view->partial_p > 1 || view->used > 1 ||
      view->show_alternatives > 1 || view->storage_error > 1 || view->suspended > 1 ||
      view->selected_record > 1 || view->coat_reference_pair > 1 ||
      (unsigned)view->comparison > LAB_RESEARCH_COMPARISON_B_EFFORT ||
      view->sample_count > 8 || view->awaiting > 8 || view->ready > 8 || view->used_records > 8 ||
      view->awaiting + view->ready + view->used_records > 8) return 0;
  if ((view->page == LAB_RESEARCH_SAMPLES && view->detail != LAB_RESEARCH_COLLECTION && view->detail != LAB_RESEARCH_KNOWLEDGE) ||
      (view->page == LAB_RESEARCH_STUDIES && view->detail != LAB_RESEARCH_PLAN && view->detail != LAB_RESEARCH_PREPARATION) ||
      (view->page == LAB_RESEARCH_REVIEW && view->detail != LAB_RESEARCH_PLAN) ||
      ((view->page == LAB_RESEARCH_FINDING || view->page == LAB_RESEARCH_LIBRARY_FINDING) && view->detail != LAB_RESEARCH_DISCOVERY) ||
      (view->page == LAB_RESEARCH_LIBRARY && view->detail != LAB_RESEARCH_RECORDS)) return 0;
  int result = view->detail == LAB_RESEARCH_DISCOVERY ||
      (view->detail == LAB_RESEARCH_RECORDS && view->selected_record);
  if ((view->page == LAB_RESEARCH_SAMPLES && view->option_count != view->sample_count + 1) ||
      (view->page == LAB_RESEARCH_STUDIES && view->option_count != view->topic_count + 1) ||
      (view->page == LAB_RESEARCH_REVIEW && view->option_count != 2) ||
      ((view->page == LAB_RESEARCH_FINDING || view->page == LAB_RESEARCH_LIBRARY_FINDING) && view->option_count != 1)) return 0;
  if (view->show_alternatives && (!result || !view->known_method || view->legacy ||
      view->comparison == LAB_RESEARCH_COMPARISON_NONE)) return 0;
  if ((view->art == LAB_RESEARCH_ART_CROWN || view->art == LAB_RESEARCH_ART_EYE_RING) &&
      (!result || !view->legacy || !view->known_method)) return 0;
#define CHECK_STRING(field) if (!terminated(view->field, sizeof(view->field))) return 0
  CHECK_STRING(title); CHECK_STRING(sample_id); CHECK_STRING(heading); CHECK_STRING(body);
  CHECK_STRING(finding); CHECK_STRING(known); CHECK_STRING(missing); CHECK_STRING(next);
  CHECK_STRING(message); CHECK_STRING(footer);
  CHECK_STRING(origin_expedition_id);
#undef CHECK_STRING
  for (unsigned index = 0; index < view->option_count; ++index)
    if (!terminated(view->options[index], sizeof(view->options[index])) ||
        !terminated(view->option_details[index], sizeof(view->option_details[index]))) return 0;
  for (unsigned index = 0; index < LAB_RESEARCH_TOPICS; ++index) {
    if (view->topic_known[index] > 1 || !terminated(view->topics[index], sizeof(view->topics[index]))) return 0;
    if (index >= view->topic_count && (view->topic_known[index] || view->topics[index][0])) return 0;
  }
  for (unsigned index = 0; index < 2; ++index) {
    if ((unsigned)view->portraits[index] > LAB_RESEARCH_PORTRAIT_MARKED ||
        !terminated(view->portrait_caption[index], sizeof(view->portrait_caption[index]))) return 0;
    if (view->art != LAB_RESEARCH_ART_PAIR && view->portraits[index] != LAB_RESEARCH_PORTRAIT_NONE) return 0;
    if (view->comparison == LAB_RESEARCH_COMPARISON_NONE && view->portrait_caption[index][0]) return 0;
  }
  if (view->selected_record != (view->sample_id[0] != 0) ||
      (view->page == LAB_RESEARCH_SAMPLES &&
       ((view->focus == 0) != (view->detail == LAB_RESEARCH_COLLECTION))) ||
      (view->page != LAB_RESEARCH_SAMPLES && view->page != LAB_RESEARCH_LIBRARY && !view->selected_record) ||
      (view->page == LAB_RESEARCH_LIBRARY && !view->selected_record && view->option_count != 1) ||
      (view->detail == LAB_RESEARCH_COLLECTION && (view->selected_record ||
       view->topic_count || view->awaiting + view->ready + view->used_records != view->sample_count)) ||
      (!view->selected_record && (view->origin_expedition_id[0] || view->topic_count ||
       view->coat_reference_pair || view->comparison || view->legacy || view->complete ||
       view->partial_p || view->used || view->known_method || view->useful ||
       view->finding[0] || view->known[0] || view->missing[0]))) return 0;
  if (view->coat_reference_pair && (view->legacy || view->partial_p || view->topic_count != 3 ||
      !view->topic_known[0] || !view->topic_known[2] || strcmp(view->topics[2], "Coat"))) return 0;
  if (view->comparison != LAB_RESEARCH_COMPARISON_NONE &&
      (!result || !view->known_method || view->legacy || view->topic_count != 3)) return 0;
  if (view->comparison == LAB_RESEARCH_COMPARISON_A_COAT &&
      (!view->topic_known[2] || strcmp(view->topics[2], "Coat"))) return 0;
  if ((view->comparison == LAB_RESEARCH_COMPARISON_B_MOVEMENT ||
       view->comparison == LAB_RESEARCH_COMPARISON_B_EFFORT) &&
      (view->coat_reference_pair || !view->topic_known[1] || strcmp(view->topics[2], "Effort") ||
       (view->comparison == LAB_RESEARCH_COMPARISON_B_EFFORT) != (view->topic_known[2] != 0))) return 0;
  if (view->art == LAB_RESEARCH_ART_PAIR &&
      (view->detail != LAB_RESEARCH_DISCOVERY || !view->complete || !view->known_method || view->partial_p ||
       view->legacy || !view->coat_reference_pair || view->comparison != LAB_RESEARCH_COMPARISON_A_COAT ||
       !view->portraits[0] || !view->portraits[1] || view->portraits[0] == view->portraits[1] ||
       (view->page != LAB_RESEARCH_FINDING && view->page != LAB_RESEARCH_LIBRARY_FINDING))) return 0;
  return 1;
}
static void place(lv_obj_t *object, int x, int y, int width, int height) {
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
}

int lab_research_ui_reference_scale(LabResearchUi *ui, unsigned scale) {
  if (!ui || (scale != 1 && scale != 2)) return 0;
  ui->reference_scale = scale;
  lv_obj_invalidate(ui->coat_clips);
  return 1;
}

int lab_research_ui_update(LabResearchUi *ui, const LabResearchView *view) {
  if (!ui || !view || !valid(view)) return 0;
  ui->view = *view;
  view = &ui->view;
  lv_obj_set_hidden(ui->root, false);
  int pair = view->art == LAB_RESEARCH_ART_PAIR;
  int collection = view->detail == LAB_RESEARCH_COLLECTION;
  int knowledge = view->detail == LAB_RESEARCH_KNOWLEDGE;
  int plan = view->detail == LAB_RESEARCH_PLAN;
  int records = view->detail == LAB_RESEARCH_RECORDS;
  int result = view->detail == LAB_RESEARCH_DISCOVERY || (records && view->selected_record);
  int main_actions = view->page == LAB_RESEARCH_STUDIES || view->page == LAB_RESEARCH_REVIEW;
  int comparison = result && view->comparison != LAB_RESEARCH_COMPARISON_NONE;
  int crop = comparison && view->coat_reference_pair && !pair;
  unsigned visible_rows = 6;
  unsigned row_height = main_actions ? (view->option_count > 4 ? 36 : 48) : 62;
  unsigned first = view->focus >= visible_rows ? view->focus - visible_rows + 1 : 0;
  for (unsigned row = 0; row < 6; ++row) {
    unsigned option = first + row;
    int visible = option < view->option_count;
    lv_obj_set_hidden(ui->rows[row], !visible);
    if (!visible) continue;
    lv_label_set_text_static(ui->rows[row], view->options[option]);
    lv_obj_set_style_text_color(ui->rows[row], lv_color_hex(option == view->focus ?
        CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
    place(ui->rows[row], main_actions ? 282 : 46,
        (main_actions ? 325 : 170) + (int)(row * row_height),
        main_actions ? 306 : 164, main_actions ? (int)row_height - 4 : 48);
  }
  native_ui_frame_size(&ui->focus, main_actions ? 342 : 180, (int)row_height - 6);
  lv_obj_set_pos(ui->focus.object, main_actions ? 264 : 38,
      (main_actions ? 318 : 157) + (int)((view->focus - first) * row_height));
  /* Inactive destination context, never another focused action. */
  lv_obj_set_hidden(ui->nav_context, !main_actions);
  lv_label_set_text_static(ui->title, view->title);
  place(ui->title, 264, 153, 720, 38);
  lv_label_set_text_static(ui->sample, view->sample_id);
  place(ui->sample, 264, 196, 720, 24);
  lv_obj_set_hidden(ui->sample, !view->selected_record);
  snprintf(ui->origin_text, sizeof(ui->origin_text), "Origin: %s",
      view->origin_expedition_id[0] ? view->origin_expedition_id : "unavailable");
  lv_label_set_text_static(ui->partial, ui->origin_text);
  place(ui->partial, 264, 221, 720, 44);
  lv_obj_set_hidden(ui->partial, !knowledge);
  lv_label_set_text_static(ui->heading, view->heading);
  lv_obj_set_hidden(ui->heading, result);
  place(ui->heading, main_actions ? 620 : collection || (records && !view->selected_record) ? 434 : 264,
      main_actions ? 245 : knowledge ? 275 : 251,
      main_actions ? 360 : collection ? 540 : 720, main_actions ? 58 : 38);
  lv_label_set_text_static(ui->body, view->body);
  lv_obj_set_hidden(ui->body, !view->body[0] || collection || knowledge);
  place(ui->body, pair ? 824 : main_actions ? 620 : 264,
      pair ? 219 : main_actions ? 305 : result ? 238 : 299,
      pair ? 160 : main_actions ? 360 : 720, plan || crop ? 44 : 66);
  lv_obj_set_style_text_font(ui->body, ui->fonts.small, 0);
  lv_label_set_text_static(ui->finding, view->finding);
  lv_obj_set_hidden(ui->finding, !view->finding[0]);
  place(ui->finding, pair ? 824 : main_actions ? 264 : knowledge ? 434 : 264,
      pair ? 291 : main_actions ? 247 : knowledge ? 324 : crop ? 425 : comparison ? 403 : 309,
      pair ? 160 : main_actions ? 336 : knowledge ? 540 : 720,
      pair ? 132 : main_actions ? 66 : knowledge ? 88 : crop ? 44 : comparison ? 66 : 110);
  lv_obj_set_style_text_font(ui->finding, ui->fonts.small, 0);
  const char *summaries[] = {view->known, view->missing, view->next};
  for (unsigned index = 0; index < 3; ++index) {
    lv_label_set_text_static(ui->summary[index], summaries[index]);
    int visible = summaries[index][0] && !collection && !(records && !view->selected_record) &&
        (!plan || index == 2) && (!pair || index == 2);
    lv_obj_set_hidden(ui->summary[index], !visible);
    int y = pair ? 433 : plan ? 530 : main_actions ? 380 + (int)index * 52 :
        comparison ? 475 + (int)index * 24 : 422 + (int)index * 40;
    place(ui->summary[index], pair ? 824 : main_actions ? 620 : 264, y,
        pair ? 160 : main_actions ? 360 : 720, pair ? 110 : plan ? 26 : main_actions ? 48 : comparison ? 24 : 40);
    if (view->page == LAB_RESEARCH_REVIEW && index == 2)
      place(ui->summary[index], 264, 430, 336, 88);
  }
  for (unsigned index = 0; index < 2; ++index) {
    lv_obj_set_hidden(ui->portraits[index], !pair);
    lv_obj_set_hidden(ui->captions[index], !pair && !comparison);
    lv_obj_set_hidden(ui->alternatives[index], !comparison || pair);
    int x = 264 + (int)index * 286;
    if (pair) {
      lv_image_set_src(ui->portraits[index], ui->images[
          view->portraits[index] == LAB_RESEARCH_PORTRAIT_MARKED ? 12 : 11]);
      lv_obj_set_pos(ui->portraits[index], x, 247);
    }
    lv_label_set_text_static(ui->captions[index], view->portrait_caption[index]);
    place(ui->captions[index], pair ? x : 300 + (int)index * 270,
        pair ? 218 : 292, pair ? 270 : 230, pair ? 28 : 66);
    /* Crop captions sit below both equal reference windows. Text-only early
     * comparison and B relationships use these same modest content slots. */
    if (crop) place(ui->captions[index], 300 + (int)index * 270, 375, 230, 44);
    lv_label_set_text_static(ui->alternatives[index], view->portrait_caption[index]);
    place(ui->alternatives[index], 300 + (int)index * 270, 310, 230, 88);
    lv_obj_set_hidden(ui->alternatives[index], !comparison || pair || crop);
    lv_obj_set_hidden(ui->captions[index], !pair && (!crop || !comparison));
  }
  lv_obj_set_hidden(ui->coat_clips, !crop);
  if (crop) lv_obj_invalidate(ui->coat_clips);
  const int art_slots[] = {-1, 10, 1, 13, 14, 15, 16, 17, -1};
  int slot = art_slots[view->art];
  if (result && view->art != LAB_RESEARCH_ART_CROWN && view->art != LAB_RESEARCH_ART_EYE_RING)
    slot = 10; /* Neutral sample subject, never assay evidence. */
  int show_art = slot >= 0 && !pair && !comparison && !main_actions;
  lv_obj_set_hidden(ui->art, !show_art);
  if (show_art) {
    lv_image_set_src(ui->art, ui->images[slot]);
    lv_obj_set_pos(ui->art, 280, collection ? 285 : knowledge ? 324 : 309);
    if (result) {
      place(ui->finding, 484, 309, 500, 110);
      place(ui->body, 484, 247, 500, 54);
    }
  }
  lv_obj_set_hidden(ui->cost_title, !plan);
  place(ui->cost_title, 665, 350, 300, 26);
  const unsigned counts[] = {view->awaiting, view->ready, view->used_records};
  const char *count_names[] = {"awaiting research", "ready to prepare", "used / records retained"};
  for (unsigned index = 0; index < 3; ++index) {
    snprintf(ui->stock_text[index], sizeof(ui->stock_text[index]), "%u", view->stock[index]);
    lv_label_set_text_static(ui->stock[index], ui->stock_text[index]);
    lv_label_set_text_static(ui->units[index], view->stock[index] == 1 ? "unit" : "units");
    lv_obj_set_hidden(ui->cost_art[index], !plan);
    lv_obj_set_hidden(ui->costs[index], !plan);
    lv_obj_set_pos(ui->cost_art[index], 620, 380 + (int)index * 52);
    snprintf(ui->cost_text[index], sizeof(ui->cost_text[index]), "%u / %u", view->costs[index], view->stock[index]);
    lv_label_set_text_static(ui->costs[index], ui->cost_text[index]);
    place(ui->costs[index], 684, 385 + (int)index * 52, 284, 32);
    lv_obj_set_hidden(ui->counts[index], !collection);
    snprintf(ui->count_text[index], sizeof(ui->count_text[index]), "%u %s", counts[index], count_names[index]);
    lv_label_set_text_static(ui->counts[index], ui->count_text[index]);
    place(ui->counts[index], 434, 320 + (int)index * 52, 550, 34);
  }
  lv_label_set_text_static(ui->message, view->message);
  place(ui->message, 48, 552, 938, 44);
  lv_obj_set_hidden(ui->message, !view->message[0]);
  lv_obj_set_style_text_color(ui->message, lv_color_hex(view->storage_error ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
  lv_label_set_text_static(ui->footer, "");
  lv_obj_set_hidden(ui->footer, true);
  return 1;
}
