#include "dock_ui.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct DockUi {
  lv_obj_t *root, *freshness, *cards[3], *icons[3], *names[3], *values[3];
  lv_obj_t *detail, *connections[3], *print[2], *timestamp, *message;
  lv_obj_t *buttons[3], *actions[3];
  lv_group_t *group;
  const lv_image_dsc_t *icons_source[6];
  const lv_font_t *body, *quantity;
  DockView view;
  char amounts[3][32], visits[48];
};
static void surface(lv_obj_t *object, uint32_t fill, unsigned border) {
  lv_obj_remove_style_all(object);
  lv_obj_set_scrollable(object, false);
  lv_obj_set_clickable(object, false);
  lv_obj_set_style_bg_color(object, lv_color_hex(fill), 0);
  lv_obj_set_style_bg_opa(object, LV_OPA_COVER, 0);
  lv_obj_set_style_border_color(object, lv_color_hex(0), 0);
  lv_obj_set_style_border_width(object, border, 0);
  lv_obj_set_style_radius(object, 0, 0);
  lv_obj_set_style_pad_all(object, 0, 0);
}
static lv_obj_t *box(lv_obj_t *parent, int x, int y, int width, int height,
                      uint32_t fill, unsigned border) {
  lv_obj_t *object = lv_obj_create(parent);
  if (!object) return NULL;
  surface(object, fill, border);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  return object;
}
static lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, int x, int y,
                        int width, int height, uint32_t color, const char *value) {
  lv_obj_t *object = lv_label_create(parent);
  if (!object) return NULL;
  lv_obj_remove_style_all(object);
  lv_obj_set_clickable(object, false);
  lv_obj_set_style_text_font(object, font, 0);
  lv_obj_set_style_text_color(object, lv_color_hex(color), 0);
  lv_obj_set_style_text_line_space(object, 0, 0);
  lv_obj_set_pos(object, x, y);
  lv_obj_set_size(object, width, height);
  lv_label_set_long_mode(object, LV_LABEL_LONG_MODE_WRAP);
  lv_label_set_text_static(object, value);
  return object;
}
DockUi *dock_ui_create(lv_obj_t *parent, const lv_font_t *title,
    const lv_font_t *body, const lv_font_t *small, const lv_font_t *quantity,
    const lv_image_dsc_t *const icons[6]) {
  if (!parent || !title || !body || !small || !quantity || !icons) return NULL;
  DockUi *ui = calloc(1, sizeof(*ui));
  if (!ui) return NULL;
  ui->body = body;
  ui->quantity = quantity;
  for (unsigned index = 0; index < 6; ++index) {
    if (!icons[index]) goto failure;
    ui->icons_source[index] = icons[index];
  }
  surface(parent, 0xffffff, 0);
  ui->root = box(parent, 8, 8, 776, 256, 0xffffff, 1);
  ui->group = lv_group_create();
  if (!ui->root || !ui->group) goto failure;
  if (!label(ui->root, title, 15, 13, 430, 34, 0, "STATION / DOCK") ||
      !box(ui->root, 15, 57, 744, 2, 0, 0)) goto failure;
  ui->freshness = label(ui->root, body, 476, 18, 286, 28, 0x555555, "");
  for (unsigned index = 0; index < 3; ++index) {
    int x = 11 + (int)index * 248;
    ui->cards[index] = box(ui->root, x, 73, 228, 70, 0xaaaaaa, 0);
    if (!ui->cards[index]) goto failure;
    ui->icons[index] = lv_image_create(ui->cards[index]);
    if (!ui->icons[index]) goto failure;
    lv_image_set_antialias(ui->icons[index], false);
    lv_obj_set_clickable(ui->icons[index], false);
    lv_obj_set_pos(ui->icons[index], 4, 7);
    ui->names[index] = label(ui->cards[index], body, 51, 3, 173, 28, 0, "");
    ui->values[index] = label(ui->cards[index], quantity, 51, 32, 173, 38, 0, "");
    ui->connections[index] = label(ui->root, index == 2 ? small : body,
        15, 79 + (int)index * 33, 744, index == 2 ? 24 : 28,
        index ? 0x555555 : 0, "");
    if (!ui->names[index] || !ui->values[index] || !ui->connections[index]) goto failure;
    ui->buttons[index] = lv_button_create(ui->root);
    if (!ui->buttons[index]) goto failure;
    surface(ui->buttons[index], 0xffffff, 0);
    lv_obj_set_style_bg_color(ui->buttons[index], lv_color_hex(0xaaaaaa), LV_STATE_FOCUSED);
    lv_obj_set_style_border_width(ui->buttons[index], 1, LV_STATE_FOCUSED);
    lv_obj_set_style_bg_color(ui->buttons[index], lv_color_hex(0x555555), LV_STATE_PRESSED);
    lv_group_add_obj(ui->group, ui->buttons[index]);
    ui->actions[index] = label(ui->buttons[index], small, 12, 4, 204, 24, 0, "");
    if (!ui->actions[index]) goto failure;
  }
  ui->detail = label(ui->root, small, 15, 144, 744, 24, 0x555555, "");
  ui->print[0] = label(ui->root, title, 15, 80, 744, 34, 0, "World summary print preview");
  ui->print[1] = label(ui->root, body, 15, 124, 744, 30, 0,
                        "No physical printer or paper output is connected.");
  ui->timestamp = label(ui->root, small, 15, 169, 744, 24, 0x555555, "");
  ui->message = label(ui->root, small, 15, 192, 744, 24, 0, "");
  if (!ui->freshness || !ui->detail || !ui->print[0] || !ui->print[1] ||
      !ui->timestamp || !ui->message) goto failure;
  return ui;
failure:
  dock_ui_destroy(ui);
  return NULL;
}
void dock_ui_destroy(DockUi *ui) {
  if (!ui) return;
  if (ui->group) lv_group_delete(ui->group);
  if (ui->root) lv_obj_delete(ui->root);
  free(ui);
}
int dock_ui_update(DockUi *ui, const DockView *view) {
  if (!ui || !view || view->page > 2 || view->action_count < 2 ||
      view->action_count > 3 || view->focus >= view->action_count) return 0;
  /* Every label points only at fixed owned storage or immutable literals. */
  ui->view = *view;
  view = &ui->view;
  int print = view->page == 2;
  int world = !print && view->focus == 0;
  int supplies = !print && view->focus == 1;
  int connections = !print && view->focus == 2;
  lv_label_set_text_static(ui->freshness, view->freshness);
  const char *world_names[] = {"Residents", "Samples", "Incubating"};
  const char *supply_names[] = {"Data", "Energy", "Essence"};
  const uint32_t counts[] = {view->residents, view->samples, view->incubations};
  for (unsigned index = 0; index < 3; ++index) {
    lv_obj_set_hidden(ui->cards[index], !world && !supplies);
    lv_image_set_src(ui->icons[index], ui->icons_source[(supplies ? 3 : 0) + index]);
    lv_label_set_text_static(ui->names[index], supplies ? supply_names[index] : world_names[index]);
    if (supplies)
      snprintf(ui->amounts[index], sizeof(ui->amounts[index]), "%" PRIu32 " %s", view->stock[index],
          view->stock[index] == 1 ? "unit" : "units");
    else snprintf(ui->amounts[index], sizeof(ui->amounts[index]), "%" PRIu32, counts[index]);
    lv_obj_set_style_text_font(ui->values[index], supplies ? ui->body : ui->quantity, 0);
    lv_label_set_text_static(ui->values[index], ui->amounts[index]);
    lv_obj_set_hidden(ui->connections[index], !connections);
    lv_obj_remove_state(ui->buttons[index], LV_STATE_FOCUSED | LV_STATE_PRESSED);
    lv_obj_set_hidden(ui->buttons[index], index >= view->action_count);
    if (index < view->action_count) {
      lv_obj_set_pos(ui->buttons[index], 11 + (int)index * (print ? 450 : 248), 213);
      lv_obj_set_size(ui->buttons[index], print && index == 0 ? 420 : 228, 32);
      lv_obj_set_width(ui->actions[index], print && index == 0 ? 396 : 204);
      lv_label_set_text_static(ui->actions[index], view->actions[index]);
    }
  }
  lv_label_set_text_static(ui->connections[0], view->online
      ? "Station link available (simulated)" : "Station link unavailable; last snapshot retained");
  lv_label_set_text_static(ui->connections[1], "Cloud: not connected   Charging: not measured");
  lv_label_set_text_static(ui->connections[2], "Radio protocol: unselected");
  snprintf(ui->visits, sizeof(ui->visits), "Visits together: %" PRIu32, view->visits);
  lv_obj_set_hidden(ui->detail, !world);
  lv_label_set_text_static(ui->detail, ui->visits);
  for (unsigned index = 0; index < 2; ++index) lv_obj_set_hidden(ui->print[index], !print);
  lv_label_set_text_static(ui->timestamp, view->timestamp);
  lv_label_set_text_static(ui->message, view->message);
  lv_group_focus_obj(ui->buttons[view->focus]);
  lv_obj_add_state(ui->buttons[view->focus], LV_STATE_FOCUSED);
  if (view->pressed && !view->suspended)
    lv_obj_add_state(ui->buttons[view->focus], LV_STATE_PRESSED);
  return 1;
}
