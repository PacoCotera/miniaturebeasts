#include "native_ui.h"
#include "../ui/lab_home_ui.h"
#include "../ui/lab_reception_ui.h"
#include "../ui/lab_research_ui.h"
#include "../ui/lab_action_ui.h"
#include "field_art.h"
#include "ui_assets.h"
#include "ui_theme.h"
#include "probe_ui.h"
#include "../ui/display.h"
#include "../ui/host_frame.h"
#include "../ui/dock_ui.h"
#include "../ui/companion_cargo_ui.h"
#include "../ui/companion_resident_ui.h"
#include "overview_assets.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

enum { CARGO_WIDTH = 450, CARGO_HEIGHT = 600, DRAW_ROWS = 60 };
struct NativeUiContext {
  unsigned device;
  LabHomeUi *home;
  LabReceptionUi *reception;
  LabResearchUi *research;
  LabActionUi *lab_actions;
  NativeUiImage research_images[5];
  NativeUiImage reception_tiles[FIELD_ART_COUNT];
  NativeUiImage home_images[13];
  lv_font_t home_fonts[5];
  UiDisplay *transport;
  UiHostFrame frame;
  DockUi *dock;
  NativeUiImage dock_images[6];
  lv_display_t *display;
  NativeProbeUi *probe;
  CompanionCargoUi *cargo;
  CompanionResidentUi *residents;
  NativeUiImage resident_images[3];
  lv_group_t *actions;
  lv_font_t title_font, body_font, small_font, quantity_font, action_font;
  NativeUiImage images[4];
  uint8_t *rgb, *draw;
};
NativeUiContext *native_ui_create(void) {
  return native_ui_create_device(KIT_COMPANION);
}
NativeUiContext *native_ui_create_device(unsigned device) {
  if (device != KIT_COMPANION && device != KIT_DOCK && device != KIT_LAB) return NULL;
  NativeUiContext *context = calloc(1, sizeof(*context));
  if (!context) return NULL;
  context->device = device;
  UiDisplayProfile profile = {device == KIT_LAB ? 1024 : device == KIT_DOCK ? 792 : CARGO_WIDTH,
      device == KIT_DOCK ? 272 : CARGO_HEIGHT, device == KIT_LAB ? 8 : DRAW_ROWS, UI_COLOR_RGB888};
  size_t draw_size = ui_display_buffer_size(&profile);
  context->draw = malloc(draw_size);
  if (!context->draw || !ui_host_frame_init(&context->frame, &profile)) goto failure;
  context->rgb = context->frame.rgb;
  context->transport = ui_display_create(&profile, context->draw, draw_size,
                                         ui_host_frame_flush, &context->frame);
  if (!context->transport) goto failure;
  context->display = ui_display_lvgl(context->transport);
  if (device == KIT_LAB) {
    native_ui_font_init(&context->home_fonts[0], &lab_heading_narrow_fonts[2]);
    native_ui_font_init(&context->home_fonts[1], &lab_heading_narrow_fonts[1]);
    native_ui_font_init(&context->home_fonts[2], &lab_heading_narrow_fonts[0]);
    native_ui_font_init(&context->home_fonts[3], &lab_fonts[3]);
    native_ui_font_init(&context->home_fonts[4], &lab_fonts[0]);
    const CoreArtId ids[] = {CORE_ART_DATA_COMPACT, CORE_ART_ENERGY_COMPACT,
        CORE_ART_ESSENCE_COMPACT, CORE_ART_DATA_PRIMARY, CORE_ART_ENERGY_PRIMARY,
        CORE_ART_ESSENCE_PRIMARY, CORE_ART_SAMPLE_NEUTRAL, CORE_ART_PIP_PLAIN, CORE_ART_PIP_MARKED};
    const lv_image_dsc_t *sources[13];
    for (unsigned index = 0; index < 13; ++index) {
      if (index < 4) {
        const CoreArtSprite sprite = {"home-destination", OVERVIEW_SPRITE_WIDTH,
            OVERVIEW_SPRITE_HEIGHT, overview_pixels[index], NULL, NULL, 0, 0};
        if (!native_ui_image_from_sprite(&context->home_images[index], &sprite)) goto failure;
      } else if (!native_ui_image_init(&context->home_images[index], ids[index-4])) goto failure;
      sources[index] = &context->home_images[index].image;
    }
    const LabHomeFonts fonts = {&context->home_fonts[0], &context->home_fonts[1],
        &context->home_fonts[2], &context->home_fonts[3], &context->home_fonts[4]};
    lv_display_set_default(context->display);
    context->home = lab_home_ui_create(lv_display_get_screen_active(context->display), &fonts, sources);
    if (!context->home) goto failure;
    return context;
  }
  native_ui_font_init(&context->title_font, &lab_heading_fonts[0]);
  native_ui_font_init(&context->body_font, &lab_fonts[0]);
  native_ui_font_init(&context->small_font, &lab_fonts[15]);
  native_ui_font_init(&context->quantity_font, &lab_fonts[7]);
  native_ui_font_init(&context->action_font, &lab_heading_fonts[4]);
  if (device == KIT_DOCK) {
    native_ui_font_init(&context->body_font, &lab_fonts[3]);
    native_ui_font_init(&context->small_font, &lab_fonts[0]);
    native_ui_font_init(&context->quantity_font, &lab_fonts[8]);
    const CoreArtId ids[] = {CORE_ART_RESIDENTS_MONO, CORE_ART_SAMPLES_MONO,
        CORE_ART_INCUBATING_MONO, CORE_ART_DATA_MONO, CORE_ART_ENERGY_MONO, CORE_ART_ESSENCE_MONO};
    const lv_image_dsc_t *icons[6];
    for (unsigned index = 0; index < 6; ++index) {
      if (!native_ui_image_init(&context->dock_images[index], ids[index])) goto failure;
      icons[index] = &context->dock_images[index].image;
    }
    lv_display_set_default(context->display);
    context->dock = dock_ui_create(lv_display_get_screen_active(context->display),
        &context->title_font, &context->body_font, &context->small_font,
        &context->quantity_font, icons);
    if (!context->dock) goto failure;
    return context;
  }
  for (unsigned index = 0; index < 4; ++index) {
    CoreArtId id = index == 3 ? CORE_ART_SAMPLE_NEUTRAL : (CoreArtId)(CORE_ART_DATA_PRIMARY + index);
    if (!native_ui_image_init(&context->images[index], id)) goto failure;
  }
  context->actions = lv_group_create();
  if (!context->actions) goto failure;
  const CompanionCargoFonts fonts = {&context->title_font, &context->body_font,
      &context->small_font, &context->quantity_font, &context->action_font};
  const lv_image_dsc_t *images[4];
  for (unsigned index = 0; index < 4; ++index) images[index] = &context->images[index].image;
  lv_display_set_default(context->display);
  lv_obj_t *screen = lv_display_get_screen_active(context->display);
  context->cargo = companion_cargo_ui_create(screen, context->actions, &fonts, images);
  if (!context->cargo) goto failure;
  context->probe = native_probe_ui_create(screen, context->actions,
      &context->body_font, &context->title_font, &context->small_font, &context->action_font, &context->images[3]);
  if (!context->probe) goto failure;
  return context;
failure:
  native_ui_destroy(context);
  return NULL;
}
void native_ui_cancel(NativeUiContext *context) {
  if (context) companion_cargo_ui_cancel(context->cargo);
}
void native_ui_destroy(NativeUiContext *context) {
  if (!context) return;
  native_ui_cancel(context);
  native_probe_ui_destroy(context->probe);
  companion_cargo_ui_destroy(context->cargo);
  companion_resident_ui_destroy(context->residents);
  dock_ui_destroy(context->dock);
  lab_home_ui_destroy(context->home);
  lab_reception_ui_destroy(context->reception);
  lab_research_ui_destroy(context->research);
  lab_action_ui_destroy(context->lab_actions);
  if (context->actions) lv_group_delete(context->actions);
  ui_display_destroy(context->transport);
  for (unsigned index = 0; index < 4; ++index) native_ui_image_destroy(&context->images[index]);
  for (unsigned index = 0; index < 6; ++index) native_ui_image_destroy(&context->dock_images[index]);
  for (unsigned index = 0; index < 3; ++index) native_ui_image_destroy(&context->resident_images[index]);
  for (unsigned index = 0; index < 13; ++index) native_ui_image_destroy(&context->home_images[index]);
  for (unsigned index = 0; index < FIELD_ART_COUNT; ++index)
    native_ui_image_destroy(&context->reception_tiles[index]);
  for (unsigned index = 0; index < 5; ++index)
    native_ui_image_destroy(&context->research_images[index]);
  ui_host_frame_destroy(&context->frame);
  free(context->draw);
  free(context);
}
int native_ui_animation_pending(const NativeUiContext *context) {
  return context && companion_cargo_ui_animation_pending(context->cargo);
}
void native_ui_advance(NativeUiContext *context, unsigned milliseconds) {
  if (context) companion_cargo_ui_advance(context->cargo, milliseconds);
}
const uint8_t *native_ui_cargo(NativeUiContext *context,
                               const CompanionCargoView *view, int still) {
  if (!context || context->device != KIT_COMPANION || !view ||
      ui_display_failed(context->transport)) return NULL;
  native_probe_ui_hide(context->probe);
  companion_resident_ui_hide(context->residents);
  if (!companion_cargo_ui_update(context->cargo, view, still)) return NULL;
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}
const uint8_t *native_ui_probe(NativeUiContext *context, const CompanionProbeView *view) {
  if (!context || context->device != KIT_COMPANION || !view ||
      ui_display_failed(context->transport)) return NULL;
  native_ui_cancel(context);
  companion_cargo_ui_hide(context->cargo);
  companion_resident_ui_hide(context->residents);
  if (!native_probe_ui_update(context->probe, view)) return NULL;
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}
const uint8_t *native_ui_resident(NativeUiContext *context, const CompanionResidentView *view) {
  if (!context || context->device != KIT_COMPANION || !view ||
      view->portrait > RESIDENT_EMPTY_HABITAT || ui_display_failed(context->transport)) return NULL;
  const lv_image_dsc_t *image = NULL;
  if (view->portrait != RESIDENT_PORTRAIT_PENDING) {
    unsigned slot = view->portrait - 1;
    NativeUiImage *backing = &context->resident_images[slot];
    if (!backing->pixels) {
      if (view->portrait == RESIDENT_EMPTY_HABITAT) {
        const CoreArtSprite habitat = {"overview-habitat", OVERVIEW_SPRITE_WIDTH,
            OVERVIEW_SPRITE_HEIGHT, overview_pixels[OVERVIEW_HABITAT], NULL, NULL, 0, 0};
        if (!native_ui_image_from_sprite(backing, &habitat)) return NULL;
      } else if (!native_ui_image_init(backing,
          view->portrait == RESIDENT_PORTRAIT_PLAIN ? CORE_ART_PIP_PLAIN : CORE_ART_PIP_MARKED)) return NULL;
    }
    image = &backing->image;
  }
  if (!context->residents) {
    const CompanionResidentFonts fonts = {&context->title_font, &context->body_font,
        &context->small_font, &context->quantity_font, &context->action_font};
    context->residents = companion_resident_ui_create(
        lv_display_get_screen_active(context->display), &fonts);
    if (!context->residents) {
      for (unsigned index = 0; index < 3; ++index)
        native_ui_image_destroy(&context->resident_images[index]);
      return NULL;
    }
  }
  native_ui_cancel(context);
  native_probe_ui_hide(context->probe);
  companion_cargo_ui_hide(context->cargo);
  if (!companion_resident_ui_update(context->residents, view, image)) return NULL;
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}
const uint8_t *native_ui_dock(NativeUiContext *context, const DockView *view) {
  if (!context || context->device != KIT_DOCK || !view ||
      ui_display_failed(context->transport) || !dock_ui_update(context->dock, view)) return NULL;
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : ui_host_frame_rgb(&context->frame, 1);
}

const uint8_t *native_ui_home(NativeUiContext *context, const LabHomeView *view) {
  if (!context || context->device != KIT_LAB || !view ||
      ui_display_failed(context->transport) || !lab_home_ui_update(context->home, view)) return NULL;
  lab_reception_ui_hide(context->reception);
  lab_research_ui_hide(context->research);
  lab_action_ui_hide(context->lab_actions);
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}

const uint8_t *native_ui_reception(NativeUiContext *context, const LabReceptionView *view) {
  if (!context || context->device != KIT_LAB || !view ||
      ui_display_failed(context->transport)) return NULL;
  if (!context->reception) {
    const lv_image_dsc_t *tiles[FIELD_ART_COUNT], *materials[7];
    for (unsigned i=0; i<FIELD_ART_COUNT; ++i) {
      if (!context->reception_tiles[i].pixels && !native_ui_image_from_sprite(
          &context->reception_tiles[i], field_art_sprite((FieldArtId)i))) return NULL;
      tiles[i] = &context->reception_tiles[i].image;
    }
    for (unsigned i=0; i<4; ++i) materials[i] = &context->home_images[7+i].image;
    for (unsigned i=0; i<3; ++i) materials[4+i] = &context->home_images[4+i].image;
    const LabHomeFonts fonts = {&context->home_fonts[0], &context->home_fonts[1],
        &context->home_fonts[2], &context->home_fonts[3], &context->home_fonts[4]};
    context->reception = lab_reception_ui_create(
        lv_display_get_screen_active(context->display), &fonts, materials, tiles);
    if (!context->reception) return NULL;
  }
  if (!lab_reception_ui_update(context->reception, view)) return NULL;
  lab_home_ui_hide(context->home);
  lab_research_ui_hide(context->research);
  lab_action_ui_hide(context->lab_actions);
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}

int native_ui_research_reference_scale(NativeUiContext *context, unsigned scale) {
  if (!context || !context->research || (scale != 1 && scale != 2)) return 0;
  return lab_research_ui_reference_scale(context->research, scale);
}

const uint8_t *native_ui_research(NativeUiContext *context, const LabResearchView *view) {
  if (!context || context->device != KIT_LAB || !view ||
      ui_display_failed(context->transport)) return NULL;
  if (!context->research) {
    const CoreArtId ids[] = {CORE_ART_RESEARCH_INHERITANCE, CORE_ART_RESEARCH_MOVEMENT,
        CORE_ART_RESEARCH_EFFORT, CORE_ART_CROWN_REFERENCE, CORE_ART_EYE_RING_REFERENCE};
    const lv_image_dsc_t *images[18];
    for (unsigned index = 0; index < 13; ++index) images[index] = &context->home_images[index].image;
    for (unsigned index = 0; index < 5; ++index) {
      if (!context->research_images[index].pixels &&
          !native_ui_image_init(&context->research_images[index], ids[index])) return NULL;
      images[13+index] = &context->research_images[index].image;
    }
    const LabHomeFonts fonts = {&context->home_fonts[0], &context->home_fonts[1],
        &context->home_fonts[2], &context->home_fonts[3], &context->home_fonts[4]};
    context->research = lab_research_ui_create(
        lv_display_get_screen_active(context->display), &fonts, images);
    if (!context->research) return NULL;
  }
  if (!lab_research_ui_update(context->research, view)) return NULL;
  lab_home_ui_hide(context->home);
  lab_reception_ui_hide(context->reception);
  lab_action_ui_hide(context->lab_actions);
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}

const uint8_t *native_ui_actions(NativeUiContext *context, const LabActionView *view) {
  if (!context || context->device != KIT_LAB || !view ||
      ui_display_failed(context->transport)) return NULL;
  if (!context->lab_actions) {
    const lv_image_dsc_t *images[13];
    for (unsigned index = 0; index < 13; ++index)
      images[index] = &context->home_images[index].image;
    const LabHomeFonts fonts = {&context->home_fonts[0], &context->home_fonts[1],
        &context->home_fonts[2], &context->home_fonts[3], &context->home_fonts[4]};
    context->lab_actions = lab_action_ui_create(
        lv_display_get_screen_active(context->display), &fonts, images);
    if (!context->lab_actions) return NULL;
  }
  if (!lab_action_ui_update(context->lab_actions, view)) return NULL;
  lab_home_ui_hide(context->home);
  lab_reception_ui_hide(context->reception);
  lab_research_ui_hide(context->research);
  lv_refr_now(context->display);
  return ui_display_failed(context->transport) ? NULL : context->rgb;
}
