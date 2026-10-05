#include "companion_cargo_ui.h"
#include "display.h"
#include "../selected-lab/ui_theme.h"
#include "../selected-lab/core_art.h"
#include <inttypes.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

enum { CARGO_WIDTH = 450, CARGO_HEIGHT = 600, FADE_MS = 120 };
struct CompanionCargoUi {
  lv_obj_t *screen, *cargo_root;
  lv_group_t *actions;
  lv_obj_t *title, *context, *quantity[3], *capsule, *detail;
  lv_obj_t *capacity, *feedback, *footer, *buttons[2], *button_text[2], *capsule_image;
  lv_obj_t *mode_labels[3];
  lv_obj_t *preview_hints[2];
  NativeUiFrame outer_frame, subject_frame, focus_frame, halo_frame;
  CompanionCargoFonts fonts;
  const lv_image_dsc_t *images[4];
  char quantity_text[3][16];
  CompanionCargoView previous;
  int has_previous, pending;
  unsigned elapsed;
};
static int valid_view(const CompanionCargoView *view) {
  if (!view || view->screen < COMPANION_CARGO_SCREEN || view->screen > COMPANION_FINISH_SCREEN ||
      view->action_count > 2 ||
      view->active_mode > 2 ||
      view->selector > 1 ||
      (view->selector && (view->screen != COMPANION_CARGO_SCREEN ||
                          view->active_mode != 1 || view->action_count || view->focus)) ||
      (view->action_count && view->focus >= view->action_count)) return 0;
  if (view->screen >= COMPANION_DISCARD_CLASS_SCREEN &&
      (!view->option_count || view->logical_focus >= view->option_count ||
       view->first_visible > view->logical_focus ||
       view->focus != view->logical_focus - view->first_visible ||
       view->first_visible + view->action_count > view->option_count ||
       view->selected_resource > 3)) return 0;
  const char *strings[] = {view->identity, view->title, view->context, view->capsule,
      view->detail, view->capacity, view->feedback, view->footer,
      view->actions[0], view->actions[1]};
  const size_t sizes[] = {sizeof(view->identity), sizeof(view->title), sizeof(view->context),
      sizeof(view->capsule), sizeof(view->detail), sizeof(view->capacity),
      sizeof(view->feedback), sizeof(view->footer), sizeof(view->actions[0]), sizeof(view->actions[1])};
  for (unsigned index = 0; index < sizeof(strings) / sizeof(strings[0]); ++index)
    if (!memchr(strings[index], 0, sizes[index])) return 0;
  return 1;
}
static lv_obj_t *surface(lv_obj_t *parent, int width, int height) {
  lv_obj_t *object = lv_obj_create(parent);
  if (object) {
    native_ui_surface(object, CORE_ART_FIELD_RGB, CORE_ART_BLUE_RGB, 0);
    lv_obj_set_size(object, width, height);
  }
  return object;
}
static lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, uint32_t color,
                       int x, int y, int width, int height, const char *text) {
  lv_obj_t *object = lv_label_create(parent);
  if (object) {
    native_ui_text(object, font, color);
    lv_obj_set_pos(object, x, y);
    lv_obj_set_size(object, width, height);
    lv_label_set_long_mode(object, LV_LABEL_LONG_MODE_WRAP);
    lv_label_set_text_static(object, text);
  }
  return object;
}
static int compose(CompanionCargoUi *context) {
  lv_display_set_default(lv_obj_get_display(context->screen));
  native_ui_surface(context->screen, CORE_ART_GRAPHITE_RGB, CORE_ART_BLUE_RGB, 0);
  context->cargo_root = surface(context->screen, 450, 600);
  if (!context->cargo_root) return 0;
  native_ui_surface(context->cargo_root, CORE_ART_GRAPHITE_RGB, CORE_ART_BLUE_RGB, 0);
  /* Applying the surface style removes LVGL's local size styles. Restore the
   * full display bounds before composing children, or Cargo clips to130px. */
  lv_obj_set_size(context->cargo_root, CARGO_WIDTH, CARGO_HEIGHT);
  lv_obj_t *rim = surface(context->cargo_root, 426, 576);
  if (!rim) return 0;
  lv_obj_set_pos(rim, 12, 12);
  lv_obj_t *content = surface(context->cargo_root, 402, 560);
  if (!content) return 0;
  lv_obj_set_pos(content, 24, 24);
  static const int32_t columns[] = {402, LV_GRID_TEMPLATE_LAST};
  static const int32_t rows[] = {32, 56, 318, 56, 78, 20, LV_GRID_TEMPLATE_LAST};
  lv_obj_set_grid_dsc_array(content, columns, rows);
  lv_obj_t *bands[6];
  for (unsigned index = 0; index < 6; ++index) {
    bands[index] = surface(content, 402, rows[index]);
    if (!bands[index]) return 0;
    lv_obj_set_grid_cell(bands[index], LV_GRID_ALIGN_STRETCH, 0, 1,
                         LV_GRID_ALIGN_STRETCH, index, 1);
  }
  lv_obj_set_flex_flow(bands[0], LV_FLEX_FLOW_ROW);
  lv_obj_set_flex_align(bands[0], LV_FLEX_ALIGN_SPACE_BETWEEN,
                        LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
  const char *modes[] = {"Probe", "Cargo", "Companions"};
  for (unsigned mode = 0; mode < 3; ++mode) {
    lv_obj_t *name = label(bands[0], context->fonts.small,
                           mode == 1 ? CORE_ART_INK_RGB : CORE_ART_SECONDARY_RGB,
                           0, 0, mode == 2 ? 132 : 104, 26, modes[mode]);
    if (!name) return 0;
    context->mode_labels[mode] = name;
    lv_obj_set_style_border_side(name, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_border_color(name, lv_color_hex(CORE_ART_BLUE_RGB), 0);
  }
  context->title = label(bands[1], context->fonts.title, CORE_ART_INK_RGB,
                         4, 8, 394, 32, "Cargo");
  context->context = label(bands[1], context->fonts.small, CORE_ART_SECONDARY_RGB,
                           5, 38, 390, 20, "");
  static const int32_t material_columns[] = {132, 134, 132, LV_GRID_TEMPLATE_LAST};
  static const int32_t subject_rows[] = {228, 1, 85, LV_GRID_TEMPLATE_LAST};
  lv_obj_set_style_pad_all(bands[2], 2, 0);
  lv_obj_set_grid_dsc_array(bands[2], material_columns, subject_rows);
  const char *names[] = {"Data", "Energy", "Essence"};
  const int image_x[] = {29, 30, 27}, image_y[] = {64, 67, 67};
  for (unsigned index = 0; index < 3; ++index) {
    int cell_width = material_columns[index];
    lv_obj_t *cell = surface(bands[2], cell_width, 228);
    if (!cell) return 0;
    lv_obj_set_grid_cell(cell, LV_GRID_ALIGN_STRETCH, index, 1, LV_GRID_ALIGN_STRETCH, 0, 1);
    lv_obj_t *image = lv_image_create(cell);
    if (!image) return 0;
    lv_image_set_src(image, context->images[index]);
    lv_obj_set_pos(image, image_x[index], image_y[index]);
    lv_image_set_antialias(image, false);
    context->quantity[index] = label(cell, context->fonts.quantity, CORE_ART_INK_RGB,
                                    0, 160, cell_width, 36, "0");
    lv_obj_t *name = label(cell, context->fonts.small, CORE_ART_SECONDARY_RGB,
                           0, 196, cell_width, 24, names[index]);
    if (!context->quantity[index] || !name) return 0;
    lv_obj_set_style_text_align(context->quantity[index], LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_style_text_align(name, LV_TEXT_ALIGN_CENTER, 0);
  }
  lv_obj_t *divider = surface(bands[2], 398, 1);
  lv_obj_t *sample = surface(bands[2], 398, 85);
  if (!divider || !sample) return 0;
  lv_obj_set_grid_cell(divider, LV_GRID_ALIGN_STRETCH, 0, 3, LV_GRID_ALIGN_STRETCH, 1, 1);
  lv_obj_set_style_bg_color(divider, lv_color_hex(CORE_ART_BLUE_RGB), 0);
  lv_obj_set_grid_cell(sample, LV_GRID_ALIGN_STRETCH, 0, 3, LV_GRID_ALIGN_STRETCH, 2, 1);
  context->capsule_image = lv_image_create(sample);
  if (!context->capsule_image) return 0;
  lv_image_set_src(context->capsule_image, context->images[3]);
  lv_obj_set_pos(context->capsule_image, 17, 15);
  lv_image_set_antialias(context->capsule_image, false);
  context->capsule = label(sample, context->fonts.body, CORE_ART_INK_RGB,
                           86, 10, 298, 24, "");
  context->detail = label(sample, context->fonts.small, CORE_ART_SECONDARY_RGB,
                          86, 34, 298, 51, "");
  context->capacity = label(bands[3], context->fonts.body, CORE_ART_SECONDARY_RGB,
                            4, 4, 394, 25, "");
  context->feedback = label(bands[3], context->fonts.small, CORE_ART_SECONDARY_RGB,
                            4, 29, 394, 24, "");
  lv_obj_set_flex_flow(bands[4], LV_FLEX_FLOW_COLUMN);
  lv_obj_set_style_pad_row(bands[4], 4, 0);
  for (unsigned action = 0; action < 2; ++action) {
    context->buttons[action] = lv_button_create(bands[4]);
    if (!context->buttons[action]) return 0;
    native_ui_action(context->buttons[action]);
    lv_obj_set_size(context->buttons[action], 402, action ? 30 : 38);
    lv_group_add_obj(context->actions, context->buttons[action]);
    context->button_text[action] = label(context->buttons[action], context->fonts.action,
                                         CORE_ART_INK_RGB, 16, action ? 2 : 6, 370, 26, "");
    if (!context->button_text[action]) return 0;
  }
  context->preview_hints[0] = label(bands[4], context->fonts.action, CORE_ART_INK_RGB,
      4, 6, 394, 26, "");
  context->preview_hints[1] = label(bands[4], context->fonts.small, CORE_ART_SECONDARY_RGB,
      4, 36, 394, 26, "");
  for (unsigned index = 0; index < 2; ++index) {
    if (!context->preview_hints[index]) return 0;
    lv_obj_set_hidden(context->preview_hints[index], true);
  }
  context->footer = label(bands[5], context->fonts.small, CORE_ART_SECONDARY_RGB,
                           4, 2, 394, 20, "");
  if (!context->footer) return 0;
  /* Overlay retained frame widgets after content so grid cells cannot erase
   * their stepped edges. Their points are owned by this context. */
  if (!native_ui_frame_init(&context->outer_frame, context->cargo_root, 426, 576, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&context->subject_frame, context->cargo_root, 402, 318, CORE_ART_BLUE_RGB) ||
      !native_ui_frame_init(&context->focus_frame, context->cargo_root, 402, 38, CORE_ART_FOCUS_RGB) ||
      !native_ui_frame_init(&context->halo_frame, context->cargo_root, 408, 44, CORE_ART_FOCUS_RGB)) return 0;
  lv_obj_set_pos(context->outer_frame.object, 12, 12);
  lv_obj_set_pos(context->subject_frame.object, 24, 112);
  lv_obj_set_hidden(context->focus_frame.object, true);
  /* A separate transparent outer edge leaves the solid focused border visible. */
  lv_obj_set_hidden(context->halo_frame.object, true);
  return context->title && context->context && context->capsule && context->detail &&
         context->capacity && context->feedback;
}
CompanionCargoUi *companion_cargo_ui_create(lv_obj_t *parent, lv_group_t *actions,
    const CompanionCargoFonts *fonts, const lv_image_dsc_t *const images[4]) {
  if (!parent || !actions || !fonts || !fonts->title || !fonts->body ||
      !fonts->small || !fonts->quantity || !fonts->action || !images) return NULL;
  for (unsigned index = 0; index < 4; ++index) if (!images[index]) return NULL;
  CompanionCargoUi *context = calloc(1, sizeof(*context));
  if (!context) return NULL;
  context->screen = parent;
  context->actions = actions;
  context->fonts = *fonts;
  memcpy(context->images, images, sizeof(context->images));
  if (!compose(context)) {
    companion_cargo_ui_destroy(context);
    return NULL;
  }
  return context;
}
static void halo_opacity(void *frame, int32_t value) {
  native_ui_frame_opacity(frame, (lv_opa_t)value);
}
void companion_cargo_ui_cancel(CompanionCargoUi *context) {
  if (!context) return;
  if (context->halo_frame.object) {
    lv_anim_delete(&context->halo_frame, halo_opacity);
    lv_obj_set_hidden(context->halo_frame.object, true);
  }
  context->pending = 0;
  context->has_previous = 0;
}
int companion_cargo_ui_animation_pending(const CompanionCargoUi *context) {
  return context && context->pending;
}
void companion_cargo_ui_advance(CompanionCargoUi *context, unsigned milliseconds) {
  /* LVGL's timer clock is process-wide. Export one animated context at a time;
   * advancing one must never silently animate another held context. */
  if (!context || ui_display_count() != 1 || !context->pending ||
      context->previous.held || context->previous.suspended) return;
  unsigned remaining = FADE_MS - context->elapsed;
  if (milliseconds > remaining) milliseconds = remaining;
  context->elapsed += milliseconds;
  lv_tick_inc(milliseconds);
  lv_anim_refr_now();
  if (context->elapsed >= FADE_MS) context->pending = 0;
}
int companion_cargo_ui_update(CompanionCargoUi *context,
                               const CompanionCargoView *view, int still) {
  if (!context || !valid_view(view)) return 0;
  lv_obj_set_hidden(context->cargo_root, false);
  int same = context->has_previous &&
      !strcmp(context->previous.identity, view->identity) &&
      context->previous.screen == view->screen &&
      !strcmp(context->previous.title, view->title) &&
      !strcmp(context->previous.context, view->context) &&
      !strcmp(context->previous.detail, view->detail) &&
      !strcmp(context->previous.capacity, view->capacity) &&
      !strcmp(context->previous.footer, view->footer) &&
      context->previous.phase == view->phase && context->previous.accepted == view->accepted &&
      context->previous.failed == view->failed && context->previous.action_count == view->action_count &&
      context->previous.first_visible == view->first_visible &&
      context->previous.logical_focus == view->logical_focus &&
      context->previous.option_count == view->option_count &&
      context->previous.selected_resource == view->selected_resource &&
      context->previous.active_mode == view->active_mode &&
      context->previous.selector == view->selector &&
      context->previous.capsules == view->capsules &&
      !strcmp(context->previous.capsule, view->capsule) &&
      !memcmp(context->previous.supplies, view->supplies, sizeof(view->supplies)) &&
      !strcmp(context->previous.feedback, view->feedback) &&
      !memcmp(context->previous.actions, view->actions, sizeof(view->actions));
  int focus_changed = same && context->previous.focus != view->focus;
  if (!same || still || view->suspended) companion_cargo_ui_cancel(context);
  /* Static labels borrow only this context's fixed storage, never a caller's
   * Kit or stack projection. Ordinary updates do not allocate text buffers. */
  context->previous = *view;
  view = &context->previous;
  lv_label_set_text_static(context->title, view->title);
  lv_label_set_text_static(context->context, view->context);
  for (unsigned mode = 0; mode < 3; ++mode) {
    lv_obj_set_style_border_width(context->mode_labels[mode], mode == view->active_mode ? 2 : 0, 0);
    lv_obj_set_style_text_color(context->mode_labels[mode], lv_color_hex(
        mode == view->active_mode ? (view->selector && !view->failed ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB)
                                 : CORE_ART_SECONDARY_RGB), 0);
  }
  int task = view->screen >= COMPANION_DISCARD_CLASS_SCREEN;
  for (unsigned resource = 0; resource < 3; ++resource) {
    snprintf(context->quantity_text[resource], sizeof(context->quantity_text[resource]),
             "%" PRIu32, view->supplies[resource]);
    lv_label_set_text_static(context->quantity[resource], context->quantity_text[resource]);
    lv_obj_set_style_text_color(context->quantity[resource], lv_color_hex(
        task && resource == view->selected_resource ? CORE_ART_FOCUS_RGB : CORE_ART_INK_RGB), 0);
  }
  lv_label_set_text_static(context->capsule, view->capsule);
  lv_obj_set_hidden(context->capsule_image, task || view->capsules == 0);
  lv_obj_set_pos(context->capsule, task ? 8 : 86, 10);
  lv_obj_set_width(context->capsule, task ? 382 : 298);
  lv_obj_set_pos(context->detail, task ? 8 : 86, 34);
  lv_obj_set_width(context->detail, task ? 382 : 298);
  lv_label_set_text_static(context->detail, view->detail);
  lv_label_set_text_static(context->capacity, view->capacity);
  lv_label_set_text_static(context->feedback, view->feedback);
  lv_label_set_text_static(context->footer, view->failed ? view->footer : "");
  lv_obj_set_hidden(context->footer, !view->failed);
  for (unsigned index = 0; index < 2; ++index)
    lv_obj_set_hidden(context->preview_hints[index], true);
  for (unsigned action = 0; action < 2; ++action) {
    lv_obj_remove_state(context->buttons[action], LV_STATE_FOCUSED | LV_STATE_PRESSED);
    if (action >= view->action_count) lv_obj_set_hidden(context->buttons[action], true);
    else {
      lv_obj_set_hidden(context->buttons[action], false);
      lv_label_set_text_static(context->button_text[action], view->actions[action]);
    }
  }
  if (view->selector && !view->failed) {
    /* The interaction layer owns the selected mode. These are presentation
     * frames, with no clickable action or domain callback on the label. */
    lv_obj_update_layout(context->cargo_root);
    lv_area_t bounds;
    lv_obj_get_coords(context->mode_labels[view->active_mode], &bounds);
    lv_obj_set_hidden(context->focus_frame.object, false);
    lv_obj_set_pos(context->focus_frame.object, bounds.x1 - 2, bounds.y1 - 2);
    native_ui_frame_size(&context->focus_frame, lv_area_get_width(&bounds) + 4,
                         lv_area_get_height(&bounds) + 4);
    lv_obj_set_hidden(context->halo_frame.object, true);
    context->pending = 0;
  } else if (view->focus < view->action_count) {
    lv_obj_t *selected = context->buttons[view->focus];
    lv_group_focus_obj(selected);
    lv_obj_add_state(selected, LV_STATE_FOCUSED);
    if (view->pressed) lv_obj_add_state(selected, LV_STATE_PRESSED);
    lv_obj_set_hidden(context->focus_frame.object, false);
    lv_obj_set_pos(context->focus_frame.object, 24, view->focus ? 528 : 486);
    native_ui_frame_size(&context->focus_frame, 402, view->focus ? 30 : 38);
    lv_obj_set_hidden(context->halo_frame.object, false);
    lv_obj_set_pos(context->halo_frame.object, 21, view->focus ? 525 : 483);
    native_ui_frame_size(&context->halo_frame, 408, view->focus ? 36 : 44);
    if (focus_changed && !still && !view->held && !view->suspended) {
      lv_anim_delete(&context->halo_frame, halo_opacity);
      lv_anim_t animation;
      lv_anim_init(&animation);
      lv_anim_set_var(&animation, &context->halo_frame);
      lv_anim_set_exec_cb(&animation, halo_opacity);
      lv_anim_set_values(&animation, 0, 180);
      lv_anim_set_duration(&animation, FADE_MS);
      context->pending = lv_anim_start(&animation) != NULL;
      context->elapsed = 0;
    } else if (!context->pending) halo_opacity(&context->halo_frame, 180);
  } else {
    lv_obj_set_hidden(context->focus_frame.object, true);
    lv_obj_set_hidden(context->halo_frame.object, true);
    context->pending = 0;
  }
  context->has_previous = 1;
  return 1;
}
void companion_cargo_ui_hide(CompanionCargoUi *context) {
  if (!context) return;
  companion_cargo_ui_cancel(context);
  lv_obj_set_hidden(context->cargo_root, true);
}
void companion_cargo_ui_destroy(CompanionCargoUi *context) {
  if (!context) return;
  companion_cargo_ui_cancel(context);
  if (context->cargo_root) lv_obj_delete(context->cargo_root);
  free(context);
}
