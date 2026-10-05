#include "lab_resident_gallery.h"
#include "../selected-lab/core_art.h"
#include <stdio.h>
#include <string.h>

enum { CARD_WIDTH = 176, CARD_HEIGHT = 154, COLUMN_STEP = 184, ROW_STEP = 166 };

int lab_resident_gallery_view_valid(const LabResidentGalleryView *view) {
  if (!view || view->count > LAB_RESIDENT_GALLERY_CAPACITY ||
      (view->count ? view->selected >= view->count : view->selected != 0) ||
      !memchr(view->form_title, 0, sizeof(view->form_title)) ||
      !memchr(view->source_sample_id, 0, sizeof(view->source_sample_id))) return 0;
  if (!view->count && (view->form_title[0] || view->source_sample_id[0] || view->visits)) return 0;
  if (view->count && !view->form_title[0]) return 0;
  for (unsigned index = 0; index < LAB_RESIDENT_GALLERY_CAPACITY; ++index) {
    if (!memchr(view->entries[index].id, 0, sizeof(view->entries[index].id)) ||
        (unsigned)view->entries[index].portrait > LAB_RESIDENT_PORTRAIT_PENDING) return 0;
    if (index >= view->count) {
      if (view->entries[index].id[0] || view->entries[index].portrait != LAB_RESIDENT_PORTRAIT_NONE) return 0;
      continue;
    }
    if (!view->entries[index].id[0] || view->entries[index].portrait == LAB_RESIDENT_PORTRAIT_NONE) return 0;
    for (unsigned other = 0; other < index; ++other)
      if (!strcmp(view->entries[index].id, view->entries[other].id)) return 0;
  }
  return 1;
}

static void draw_gallery(lv_event_t *event) {
  LabResidentGallery *gallery = lv_event_get_user_data(event);
  lv_layer_t *layer = lv_event_get_layer(event);
  lv_area_t bounds;
  lv_obj_get_coords(gallery->object, &bounds);
  for (unsigned index = 0; index < gallery->view.count; ++index) {
    int x = bounds.x1 + (int)(index % 4) * COLUMN_STEP;
    int y = bounds.y1 + (int)(index / 4) * ROW_STEP;
    lv_area_t card = {x, y, x+CARD_WIDTH-1, y+CARD_HEIGHT-1};
    const lv_area_t *clip = &layer->_clip_area;
    if (card.x2 < clip->x1 || card.x1 > clip->x2 || card.y2 < clip->y1 || card.y1 > clip->y2) continue;
    if (index == gallery->view.selected) {
      lv_draw_rect_dsc_t rim;
      lv_draw_rect_dsc_init(&rim);
      rim.bg_opa = LV_OPA_TRANSP;
      rim.border_color = lv_color_hex(gallery->active ? CORE_ART_FOCUS_RGB : CORE_ART_BLUE_HIGHLIGHT_RGB);
      rim.border_width = 2;
      lv_draw_rect(layer, &rim, &card);
    }
    LabResidentPortrait portrait = gallery->view.entries[index].portrait;
    if (portrait == LAB_RESIDENT_PORTRAIT_PLAIN || portrait == LAB_RESIDENT_PORTRAIT_MARKED) {
      const lv_image_dsc_t *source = portrait == LAB_RESIDENT_PORTRAIT_MARKED ? gallery->marked : gallery->plain;
      lv_draw_image_dsc_t image;
      lv_draw_image_dsc_init(&image);
      image.src = source;
      image.scale_x = image.scale_y = 128;
      image.pivot.x = image.pivot.y = 0;
      image.antialias = 0;
      /* The source area stays original-sized; LVGL applies the half transform. */
      lv_area_t area = {x+23, y+4, x+23+(int)source->header.w-1, y+4+(int)source->header.h-1};
      lv_draw_image(layer, &image, &area);
    }
    char ordinal[12];
    snprintf(ordinal, sizeof(ordinal), "%u", index+1);
    lv_draw_label_dsc_t label;
    lv_draw_label_dsc_init(&label);
    label.font = gallery->font;
    label.color = lv_color_hex(CORE_ART_SECONDARY_RGB);
    label.text = portrait == LAB_RESIDENT_PORTRAIT_PENDING ? "Art pending" : ordinal;
    /* Draw tasks must own temporary text through a later partial flush. */
    label.text_local = 1;
    lv_area_t caption = portrait == LAB_RESIDENT_PORTRAIT_PENDING ?
        (lv_area_t){x+28, y+62, x+155, y+107} : (lv_area_t){x+4, y+7, x+22, y+31};
    lv_draw_label(layer, &label, &caption);
  }
}

int lab_resident_gallery_init(LabResidentGallery *gallery, lv_obj_t *parent,
    const lv_font_t *font, const lv_image_dsc_t *plain,
    const lv_image_dsc_t *marked) {
  if (!gallery || !parent || !font || !plain || !marked) return 0;
  memset(gallery, 0, sizeof(*gallery));
  gallery->plain = plain;
  gallery->marked = marked;
  gallery->font = font;
  gallery->object = lv_obj_create(parent);
  if (!gallery->object) return 0;
  native_ui_surface(gallery->object, CORE_ART_FIELD_RGB, 0, 0);
  lv_obj_set_style_bg_opa(gallery->object, LV_OPA_TRANSP, 0);
  lv_obj_set_pos(gallery->object, 264, 160);
  lv_obj_set_size(gallery->object, 728, 320);
  lv_obj_set_clickable(gallery->object, false);
  lv_obj_add_event_cb(gallery->object, draw_gallery, LV_EVENT_DRAW_MAIN, gallery);
  lv_obj_set_hidden(gallery->object, true);
  return 1;
}

int lab_resident_gallery_update(LabResidentGallery *gallery,
    const LabResidentGalleryView *view, int active) {
  if (!gallery || !gallery->object || !lab_resident_gallery_view_valid(view) ||
      (active != 0 && active != 1)) return 0;
  gallery->view = *view;
  gallery->active = active;
  lv_obj_set_hidden(gallery->object, false);
  lv_obj_invalidate(gallery->object);
  return 1;
}

void lab_resident_gallery_hide(LabResidentGallery *gallery) {
  if (gallery && gallery->object) lv_obj_set_hidden(gallery->object, true);
}
