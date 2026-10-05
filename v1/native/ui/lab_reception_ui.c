#include "lab_reception_ui.h"
#include "companion_probe_view.h"
#include "../selected-lab/ui_theme.h"
#include "../selected-lab/core_art.h"
#include "../selected-lab/field_art.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct LabReceptionUi {
  lv_obj_t *root, *arrival, *log, *map, *title, *footer, *warning;
  lv_obj_t *incoming[3], *stock[3], *status, *hint, *sample, *accept;
  lv_obj_t *rows[4], *record_title, *received_at, *facts, *received_amount[3];
  lv_obj_t *received_art[3], *sample_art, *empty;
  NativeUiFrame outer, left, right, focus, action;
  LabHomeFonts fonts;
  LabReceptionView view;
  const lv_image_dsc_t *materials[7], *field[FIELD_ART_COUNT];
  char incoming_text[3][32], stock_text[3][32], received_text[3][48];
  char facts_text[192], record_text[80];
  char row_text[4][96];
  unsigned cell_size;
};

static lv_obj_t *surface(lv_obj_t *parent, int x, int y, int w, int h) {
  lv_obj_t *object = lv_obj_create(parent);
  if (!object) return NULL;
  native_ui_surface(object, CORE_ART_FIELD_RGB, 0, 0);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, w, h);
  lv_obj_set_clickable(object, false);
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
static unsigned tile_source(const ExpeditionMapView *map, unsigned cell) {
  if (map->paths[cell]) return FIELD_ART_PATH_0 + probe_path_neighbors(map, cell);
  switch (map->terrain[cell]) {
    case EXPEDITION_TERRAIN_TREE: return FIELD_ART_TREE;
    case EXPEDITION_TERRAIN_STONE: return FIELD_ART_BOULDER;
    case EXPEDITION_TERRAIN_WATER: return FIELD_ART_WATER;
    default: return FIELD_ART_GRASS_A;
  }
}
static void draw_tile(LabReceptionUi *ui, lv_layer_t *layer,
    unsigned source, int x, int y) {
  lv_draw_image_dsc_t descriptor;
  lv_draw_image_dsc_init(&descriptor);
  descriptor.src = ui->field[source];
  descriptor.scale_x = descriptor.scale_y = (int)ui->cell_size * 8;
  descriptor.pivot.x = descriptor.pivot.y = 0;
  descriptor.antialias = 0;
  lv_area_t area = {x, y, x+31, y+31};
  lv_draw_image(layer, &descriptor, &area);
}
static void draw_map(lv_event_t *event) {
  LabReceptionUi *ui = lv_event_get_user_data(event);
  lv_layer_t *layer = lv_event_get_layer(event);
  lv_area_t bounds;
  lv_obj_get_coords(ui->map, &bounds);
  const ExpeditionMapView *map = &ui->view.received.map;
  unsigned size = ui->cell_size;
  for (unsigned cell = 0; cell < EXPEDITION_MAP_CELLS; ++cell) {
    int x = bounds.x1 + (int)(cell % EXPEDITION_MAP_COLUMNS * size);
    int y = bounds.y1 + (int)(cell / EXPEDITION_MAP_COLUMNS * size);
    /* Respect the partial-flush clip before allocating LVGL draw tasks. */
    lv_area_t area = {x, y, x+(int)size-1, y+(int)size-1};
    const lv_area_t *clip = &layer->_clip_area;
    if (area.x2 < clip->x1 || area.x1 > clip->x2 ||
        area.y2 < clip->y1 || area.y1 > clip->y2) continue;
    draw_tile(ui, layer, tile_source(map, cell), x, y);
  }
  const unsigned sites[5] = {FIELD_ART_CAMP, FIELD_ART_MOSS_BEND,
      FIELD_ART_RELAY, FIELD_ART_STONE_SHELF, FIELD_ART_CACHE};
  for (unsigned site = 0; site < EXPEDITION_SITE_COUNT; ++site) {
    if (!map->site_visible[site]) continue;
    int x = bounds.x1 + (int)map->site_x[site]*(int)size;
    int y = bounds.y1 + (int)map->site_y[site]*(int)size;
    draw_tile(ui, layer, sites[site], x, y);
    if (map->site_inspected[site]) {
      lv_draw_rect_dsc_t inspection;
      lv_draw_rect_dsc_init(&inspection);
      inspection.bg_opa = LV_OPA_TRANSP;
      inspection.border_color = lv_color_hex(CORE_ART_BLUE_HIGHLIGHT_RGB);
      inspection.border_width = 2;
      lv_area_t outline = {x, y, x+(int)size-1, y+(int)size-1};
      lv_draw_rect(layer, &inspection, &outline);
    }
    if (map->site_collected[site]) {
      lv_draw_rect_dsc_t marker;
      lv_draw_rect_dsc_init(&marker);
      marker.bg_color = lv_color_hex(CORE_ART_SAVED_RGB);
      marker.bg_opa = LV_OPA_COVER;
      marker.border_color = lv_color_hex(CORE_ART_SHADOW_RGB);
      marker.border_width = 1;
      lv_area_t badge = {x+(int)size-9, y+1, x+(int)size-2, y+8};
      lv_draw_rect(layer, &marker, &badge);
    }
  }
  const char *names[5] = {"Camp", "Moss bend", "Relay", "Stone shelf", "Old cache"};
  for (unsigned site=0; site<EXPEDITION_SITE_COUNT; ++site) {
    if (!map->site_visible[site]) continue;
    int x = bounds.x1 + (int)map->site_x[site]*(int)size;
    int y = bounds.y1 + (int)(map->site_y[site]+1)*(int)size;
    if (x+120 > bounds.x2) x=bounds.x2-119;
    if (y+22 > bounds.y2) y=bounds.y2-21;
    lv_draw_rect_dsc_t background;
    lv_draw_rect_dsc_init(&background);
    background.bg_color = lv_color_hex(CORE_ART_FIELD_RGB);
    background.bg_opa = LV_OPA_80;
    lv_area_t caption={x,y,x+119,y+21};
    lv_draw_rect(layer,&background,&caption);
    lv_draw_label_dsc_t text;
    lv_draw_label_dsc_init(&text);
    text.font=ui->fonts.small;
    text.color=lv_color_hex(CORE_ART_INK_RGB);
    text.text=names[site];
    lv_draw_label(layer,&text,&caption);
  }
}
LabReceptionUi *lab_reception_ui_create(lv_obj_t *parent, const LabHomeFonts *fonts,
    const lv_image_dsc_t *const materials[7], const lv_image_dsc_t *const field[29]) {
  if (!parent || !fonts || !materials || !field) return NULL;
  LabReceptionUi *ui = calloc(1, sizeof(*ui));
  if (!ui) return NULL;
  ui->fonts = *fonts;
  for (unsigned i=0; i<7; ++i) {
    if (!materials[i]) goto failure;
    ui->materials[i] = materials[i];
  }
  for (unsigned i=0; i<FIELD_ART_COUNT; ++i) {
    if (!field[i]) goto failure;
    ui->field[i] = field[i];
  }
  ui->root = surface(parent, 0, 0, 1024, 600);
  if (!ui->root || !native_ui_frame_init(&ui->outer, ui->root, 976, 524, CORE_ART_BLUE_RGB)) goto failure;
  lv_obj_set_pos(ui->outer.object, 24, 24);
  ui->title = label(ui->root, fonts->title, 48, 40, 928, 48, CORE_ART_INK_RGB, "");
  ui->footer = label(ui->root, fonts->small, 32, 568, 960, 28, CORE_ART_SECONDARY_RGB, "");
  ui->warning = label(ui->root, fonts->small, 48, 512, 928, 30, CORE_ART_FOCUS_RGB, "");
  ui->arrival = surface(ui->root, 40, 112, 944, 392);
  ui->log = surface(ui->root, 40, 112, 944, 428);
  if (!ui->title || !ui->footer || !ui->warning || !ui->arrival || !ui->log) goto failure;
  if (!native_ui_frame_init(&ui->left, ui->arrival, 292, 350, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->right, ui->arrival, 292, 350, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&ui->action, ui->arrival, 296, 62, CORE_ART_FOCUS_RGB)) goto failure;
  lv_obj_set_pos(ui->right.object, 652, 0);
  lv_obj_set_pos(ui->action.object, 324, 203);
  if (!label(ui->arrival, fonts->status, 18, 12, 266, 35, CORE_ART_INK_RGB, "FROM COMPANION") ||
      !label(ui->arrival, fonts->status, 670, 12, 266, 35, CORE_ART_INK_RGB, "STATION STOCK")) goto failure;
  const char *names[3] = {"Data", "Energy", "Essence"};
  for (unsigned i=0; i<3; ++i) {
    int y=56+(int)i*95;
    if (!image(ui->arrival, materials[i], 14, y) || !image(ui->arrival, materials[i], 666, y)) goto failure;
    ui->incoming[i] = label(ui->arrival, fonts->heading, 116, y+8, 165, 38, CORE_ART_INK_RGB, "");
    ui->stock[i] = label(ui->arrival, fonts->heading, 768, y+8, 165, 38, CORE_ART_INK_RGB, "");
    if (!ui->incoming[i] || !ui->stock[i] ||
        !label(ui->arrival, fonts->body, 116, y+48, 165, 30, CORE_ART_SECONDARY_RGB, names[i]) ||
        !label(ui->arrival, fonts->body, 768, y+48, 165, 30, CORE_ART_SECONDARY_RGB, names[i])) goto failure;
  }
  ui->status = label(ui->arrival, fonts->heading, 324, 55, 296, 85, CORE_ART_INK_RGB, "");
  ui->hint = label(ui->arrival, fonts->small, 324, 282, 296, 64, CORE_ART_SECONDARY_RGB, "");
  ui->accept = label(ui->arrival, fonts->status, 342, 218, 266, 40, CORE_ART_FOCUS_RGB, "ACCEPT HAUL");
  ui->sample = label(ui->arrival, fonts->small, 14, 356, 916, 36, CORE_ART_INK_RGB, "");
  if (!ui->status || !ui->hint || !ui->accept || !ui->sample) goto failure;
  if (!native_ui_frame_init(&ui->focus, ui->log, 334, 62, CORE_ART_FOCUS_RGB)) goto failure;
  for (unsigned i=0;i<4;++i) {
    ui->rows[i] = label(ui->log, fonts->small, 16, 36+(int)i*60, 318, 54, CORE_ART_INK_RGB, "");
    if (!ui->rows[i]) goto failure;
  }
  ui->record_title = label(ui->log, fonts->status, 358, 0, 572, 66, CORE_ART_INK_RGB, "");
  ui->received_at = label(ui->log, fonts->small, 358, 62, 572, 28, CORE_ART_SECONDARY_RGB, "");
  ui->map = surface(ui->log, 358, 100, 480, 264);
  if (!ui->map) goto failure;
  lv_obj_add_event_cb(ui->map, draw_map, LV_EVENT_DRAW_MAIN, ui);
  ui->facts = label(ui->log, fonts->small, 846, 106, 96, 270, CORE_ART_SECONDARY_RGB, "");
  ui->sample_art = image(ui->log, materials[3], 866, 104);
  ui->empty = label(ui->log, fonts->heading, 16, 90, 912, 144, CORE_ART_INK_RGB,
      "No expedition records received yet.\n\nReturn with your Companion to record an outing.");
  for (unsigned i=0;i<3;++i) {
    ui->received_art[i] = image(ui->log, materials[4+i], 0, 0);
    ui->received_amount[i] = label(ui->log, fonts->body, 0, 0, 172, 60, CORE_ART_INK_RGB, "");
    if (!ui->received_art[i] || !ui->received_amount[i]) goto failure;
  }
  if (!ui->record_title || !ui->received_at || !ui->facts || !ui->sample_art || !ui->empty) goto failure;
  lab_reception_ui_hide(ui);
  return ui;
failure:
  lab_reception_ui_destroy(ui);
  return NULL;
}
static int terminated(const char *text, size_t size) { return memchr(text, 0, size) != NULL; }
static void record_name(const char *identity, char *output, size_t capacity) {
  const char *number = strrchr(identity, '-');
  if (number && number[1]) {
    ++number;
    const char *end = number;
    while (*end >= '0' && *end <= '9') ++end;
    if (!*end) {
      snprintf(output, capacity, "Expedition %02lu", strtoul(number, NULL, 10));
      return;
    }
  }
  snprintf(output, capacity, "Expedition");
}
static int valid(const LabReceptionView *view) {
  if ((unsigned)view->mode > LAB_RECEPTION_LOG_EMPTY ||
      !terminated(view->incoming_title,sizeof(view->incoming_title)) ||
      !terminated(view->status,sizeof(view->status)) || !terminated(view->hint,sizeof(view->hint)) ||
      !terminated(view->sample,sizeof(view->sample)) || !terminated(view->footer,sizeof(view->footer)) ||
      !terminated(view->warning,sizeof(view->warning))) return 0;
  if (view->mode == LAB_RECEPTION_ARRIVAL) return 1;
  const ExpeditionReceivedView *record = &view->received;
  if ((view->mode == LAB_RECEPTION_LOG_EMPTY && (record->record_count || record->detail)) ||
      (view->mode != LAB_RECEPTION_LOG_EMPTY && !record->record_count) ||
      (view->mode == LAB_RECEPTION_LOG_LIST && record->detail) ||
      (view->mode == LAB_RECEPTION_LOG_DETAIL && record->detail != 1)) return 0;
  if (record->record_count > EXPEDITION_VIEW_RECORDS ||
      (record->record_count && record->selected >= record->record_count) ||
      !terminated(record->outing_id,sizeof(record->outing_id)) ||
      !terminated(record->received_label,sizeof(record->received_label)) ||
      !terminated(record->sample_id,sizeof(record->sample_id)) ||
      !terminated(record->message,sizeof(record->message)) || record->map.avatar_visible) return 0;
  for (unsigned i=0;i<record->record_count;++i)
    if (!terminated(record->record_labels[i],sizeof(record->record_labels[i]))) return 0;
  for (unsigned i=0;i<EXPEDITION_MAP_CELLS;++i)
    if (record->map.terrain[i]>EXPEDITION_TERRAIN_WATER || record->map.paths[i]>1 ||
        record->map.walked[i]>1 || record->map.paths[i]!=record->map.walked[i]) return 0;
  for (unsigned i=0;i<EXPEDITION_SITE_COUNT;++i)
    if (record->map.site_x[i]>=EXPEDITION_MAP_COLUMNS || record->map.site_y[i]>=EXPEDITION_MAP_ROWS ||
        record->map.site_visible[i]>1 || record->map.site_visited[i]>1 ||
        record->map.site_inspected[i]>1 || record->map.site_collected[i]>1 || record->map.site_active[i] ||
        record->map.site_visible[i]!=record->map.site_visited[i] ||
        (!record->map.site_visible[i] && (record->map.site_x[i] || record->map.site_y[i] ||
            record->map.site_inspected[i] || record->map.site_collected[i]))) return 0;
  return 1;
}
int lab_reception_ui_update(LabReceptionUi *ui, const LabReceptionView *view) {
  if (!ui || !view || !valid(view)) return 0;
  ui->view = *view;
  view = &ui->view;
  const ExpeditionReceivedView *record = &view->received;
  int arrival = view->mode == LAB_RECEPTION_ARRIVAL;
  int empty = view->mode == LAB_RECEPTION_LOG_EMPTY;
  int detail = view->mode == LAB_RECEPTION_LOG_DETAIL;
  lv_obj_set_hidden(ui->root, false);
  lv_obj_set_hidden(ui->arrival, !arrival);
  lv_obj_set_hidden(ui->log, arrival);
  lv_label_set_text_static(ui->title, arrival ? "HAUL RECEPTION" : "EXPEDITION LOG");
  lv_label_set_text_static(ui->footer, "");
  lv_obj_set_hidden(ui->footer, true);
  lv_label_set_text_static(ui->warning, view->warning);
  lv_obj_set_pos(ui->warning,48,arrival ? 512 : 86);
  lv_obj_set_hidden(ui->warning, !view->warning[0]);
  if (arrival) {
    for (unsigned i=0;i<3;++i) {
      snprintf(ui->incoming_text[i],sizeof(ui->incoming_text[i]),"%u",view->incoming[i]);
      snprintf(ui->stock_text[i],sizeof(ui->stock_text[i]),"%u",view->stock[i]);
      lv_label_set_text_static(ui->incoming[i],ui->incoming_text[i]);
      lv_label_set_text_static(ui->stock[i],ui->stock_text[i]);
    }
    lv_label_set_text_static(ui->status,view->status);
    lv_label_set_text_static(ui->hint,view->hint);
    lv_label_set_text_static(ui->sample,view->sample);
    lv_obj_set_hidden(ui->action.object,!view->can_accept);
    lv_obj_set_hidden(ui->accept,!view->can_accept);
    native_ui_frame_opacity(&ui->action,view->pressed ? LV_OPA_COVER : LV_OPA_80);
    return 1;
  }
  lv_obj_set_hidden(ui->empty,!empty);
  lv_obj_set_hidden(ui->map,empty);
  lv_obj_set_hidden(ui->record_title,empty);
  lv_obj_set_hidden(ui->received_at,empty);
  lv_obj_set_hidden(ui->facts,empty);
  lv_obj_set_hidden(ui->focus.object,empty || detail);
  unsigned first=record->selected>=3 ? record->selected-2 : 0;
  for (unsigned i=0;i<4;++i) {
    unsigned index=first+i;
    lv_obj_set_hidden(ui->rows[i],empty || detail || index>=record->record_count);
    if (index<record->record_count) {
      char identity[64], name[64];
      snprintf(identity,sizeof(identity),"%s",record->record_labels[index]);
      char *contents=strstr(identity," / ");
      if (contents) { *contents=0; contents+=3; }
      record_name(identity,name,sizeof(name));
      snprintf(ui->row_text[i],sizeof(ui->row_text[i]),"%s\n%.28s",name,contents ? contents : "");
      lv_label_set_text_static(ui->rows[i],ui->row_text[i]);
    }
  }
  lv_obj_set_pos(ui->focus.object,0,28+(int)(record->selected-first)*60);
  record_name(record->outing_id,ui->record_text,sizeof(ui->record_text));
  lv_label_set_text_static(ui->record_title,ui->record_text);
  lv_label_set_text_static(ui->received_at,record->received_label);
  ui->cell_size=detail ? 32 : 24;
  lv_obj_set_pos(ui->map,detail ? 0 : 358,detail ? 40 : 100);
  lv_obj_set_size(ui->map,(int)ui->cell_size*20,(int)ui->cell_size*11);
  lv_obj_invalidate(ui->map);
  lv_obj_set_pos(ui->record_title,detail ? 664 : 358,0);
  lv_obj_set_size(ui->record_title,detail ? 270 : 572,detail ? 68 : 62);
  lv_obj_set_pos(ui->received_at,detail ? 0 : 358,detail ? 7 : 62);
  lv_obj_set_width(ui->received_at,detail ? 640 : 572);
  snprintf(ui->facts_text,sizeof(ui->facts_text),"%s%s%s",
      record->sample_collected ? "1 sealed sample collected\n" : "Supplies only\n",
      detail ? (record->trace_inspected ? "Mossbend trace inspected\n" : "Recorded visited places\n") : "",
      record->sample_collected ? "Research at Station" : "");
  lv_label_set_text_static(ui->facts,ui->facts_text);
  lv_obj_set_pos(ui->facts,detail ? 664 : 846,detail ? 322 : 168);
  lv_obj_set_size(ui->facts,detail ? 270 : 96,detail ? 68 : 216);
  lv_obj_set_hidden(ui->sample_art,empty || !record->sample_collected);
  lv_obj_set_pos(ui->sample_art,866,detail ? 259 : 104);
  const char *names[3]={"Data","Energy","Essence"};
  for (unsigned i=0;i<3;++i) {
    lv_obj_set_hidden(ui->received_art[i],empty);
    lv_obj_set_hidden(ui->received_amount[i],empty);
    int x=detail ? 664 : 358+(int)i*178, y=detail ? 86+(int)i*72 : 368;
    lv_obj_set_pos(ui->received_art[i],x,y);
    lv_obj_set_style_text_font(ui->received_amount[i],ui->fonts.body,0);
    lv_obj_set_pos(ui->received_amount[i],x+55,y+5);
    lv_obj_set_size(ui->received_amount[i],detail ? 204 : 170,54);
    snprintf(ui->received_text[i],sizeof(ui->received_text[i]),"%u\n%s",record->accepted[i],names[i]);
    lv_label_set_text_static(ui->received_amount[i],ui->received_text[i]);
  }
  return 1;
}
void lab_reception_ui_hide(LabReceptionUi *ui) { if (ui) lv_obj_set_hidden(ui->root,true); }
void lab_reception_ui_destroy(LabReceptionUi *ui) {
  if (!ui) return;
  if (ui->root) lv_obj_delete(ui->root);
  free(ui);
}
