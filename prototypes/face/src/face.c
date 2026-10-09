/* The Station's face: a 1024x600 LVGL display that draws into a retained framebuffer, reports the rectangles it redrew,
   takes key input and builds the page's scene (prim/prim.c) and speaks the bridge (bridge/wire.c). This file is the platform-neutral core: nothing in it knows
   JavaScript, SDL or a device. */
#include "face.h"
#include "prim/prim.h"
#include "bridge/wire.h"
#include "spec/spec.h"
#include "vocab/words.h"
#include "screens/screens.h"
#include "anim/anim.h"
#include "vocab/vocab.h"
#include "platform/platform.h"
#include "lvgl.h"
#include <string.h>

static uint8_t g_fb[FACE_W * FACE_H * 4];
static lv_display_t *g_disp;
static int32_t g_dirty[FACE_MAX_DIRTY * 4];
static int g_ndirty;
#define KEYQ 64
static struct { int code; int down; } g_keys[KEYQ];
static int g_kh, g_kt, g_kcount, g_klast;

static void flush_cb(lv_display_t *d, const lv_area_t *a, uint8_t *px) {
  (void)px; /* direct mode: LVGL has drawn into g_fb itself; we only note what changed */
  if (g_ndirty < FACE_MAX_DIRTY) {
    g_dirty[g_ndirty * 4 + 0] = a->x1; g_dirty[g_ndirty * 4 + 1] = a->y1;
    g_dirty[g_ndirty * 4 + 2] = a->x2 - a->x1 + 1; g_dirty[g_ndirty * 4 + 3] = a->y2 - a->y1 + 1;
    g_ndirty++;
  } else { /* too many to list: the whole frame */
    g_dirty[0] = 0; g_dirty[1] = 0; g_dirty[2] = FACE_W; g_dirty[3] = FACE_H; g_ndirty = 1;
  }
  lv_display_flush_ready(d);
}
static void key_read_cb(lv_indev_t *i, lv_indev_data_t *data) {
  (void)i;
  if (g_kh == g_kt) { data->state = LV_INDEV_STATE_RELEASED; data->key = g_klast; data->continue_reading = false; return; }
  data->key = (uint32_t)g_keys[g_kh].code; data->state = g_keys[g_kh].down ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
  g_kh = (g_kh + 1) % KEYQ; data->continue_reading = g_kh != g_kt;
}
void face_init(void) {
  lv_init();
  g_disp = lv_display_create(FACE_W, FACE_H);
  lv_display_set_color_format(g_disp, LV_COLOR_FORMAT_ARGB8888);
  lv_display_set_buffers(g_disp, g_fb, NULL, sizeof g_fb, LV_DISPLAY_RENDER_MODE_DIRECT);
  lv_display_set_flush_cb(g_disp, flush_cb);
  lv_indev_t *kp = lv_indev_create();
  lv_indev_set_type(kp, LV_INDEV_TYPE_KEYPAD);
  lv_indev_set_read_cb(kp, key_read_cb);
  /* the display under the scene is black until the page names its ground (face_background: a palette colour from the spec) */
  lv_obj_set_style_bg_color(lv_screen_active(), lv_color_hex(0x000000), 0);
  lv_obj_set_style_bg_opa(lv_screen_active(), LV_OPA_COVER, 0);
  prim_init(); wire_init();
}
void face_frame(uint32_t ms) {
  static uint32_t last; static int started;
  if (!started) { started = 1; last = ms; }
  lv_tick_inc(ms - last); last = ms;
  { int playing = anim_active(); anim_tick(ms); if (playing || anim_active()) screens_redraw(); }   /* an event plays: the words are drawn again at this frame's time */
  g_ndirty = 0;
  double t0 = platform_now_ms();
  lv_timer_handler();
  wire_after_frame(platform_now_ms() - t0);
}
uint8_t *face_fb(void) { return g_fb; }
int face_width(void) { return FACE_W; }
int face_height(void) { return FACE_H; }
int face_dirty_count(void) { return g_ndirty; }
int32_t *face_dirty_rects(void) { return g_dirty; }
uint32_t face_hash(void) {
  uint32_t h = 2166136261u;
  for (int i = 0; i < FACE_W * FACE_H; i++) { const uint8_t *p = g_fb + i * 4; h = (h ^ p[2]) * 16777619u; h = (h ^ p[1]) * 16777619u; h = (h ^ p[0]) * 16777619u; }
  return h;
}
void face_key(int code, int down) {
  if (down) screens_key(code);   /* the words' screens move the ring and say so (focus, intent) */
  int nt = (g_kt + 1) % KEYQ; if (nt == g_kh) return;
  g_keys[g_kt].code = code; g_keys[g_kt].down = down; g_kt = nt; if (down) { g_kcount++; g_klast = code; }
}
int face_key_count(void) { return g_kcount; }
int face_last_key(void) { return g_klast; }
const char *face_version(void) {
  static char v[24]; if (!v[0]) lv_snprintf(v, sizeof v, "LVGL %d.%d.%d", (int)lv_version_major(), (int)lv_version_minor(), (int)lv_version_patch());
  return v;
}

void face_scene_begin(void) { prim_begin(); }
void face_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b) { prim_node(id, kind, x, y, w, h, rgb, a, b); }
void face_scene_end(void) { prim_end(); wire_changed(); }
char *face_text(void) { return prim_text(); }
int face_text_size(void) { return prim_text_size(); }
int face_measure(int px) { return prim_measure(px); }
uint8_t *face_asset(int handle, int w, int h) { return prim_asset(handle, w, h); }
int face_object_count(void) { return prim_count(); }
int face_node_refused(void) { return prim_unknown(); }
void face_background(uint32_t rgb) { lv_obj_set_style_bg_color(lv_screen_active(), lv_color_hex(rgb), 0); }
int face_asset_limit(void) { return prim_asset_limit(); }

/* ---- the bridge, the tags and test mode ---- */
char *face_in_buf(void) { return wire_in_buf(); }
int face_in_cap(void) { return WIRE_IN_CAP; }
int face_send(int len) { return wire_send(wire_in_buf(), len); }
const char *face_poll(void) { return wire_poll(); }
int face_pending(void) { return wire_pending(); }
int face_last_asset(void) { return wire_last_asset(); }
uint8_t *face_asset_pixels(int handle) { return prim_asset_ptr(handle); }
int face_props_count(void) { return wire_props_count(); }
unsigned face_props_seq(void) { return wire_props_seq(); }
int face_event_count(void) { return wire_event_count(); }
int face_spec_int(const char *screen, const char *path, int dflt) { return spec_int(screen, path, dflt); }
static char g_region[48];
char *face_region(void) { return g_region; }
void face_node_tag(int layer) { prim_tag(layer, g_region); }
void face_test_pass(int pass) { prim_set_pass(pass); lv_refr_now(g_disp); }   /* now, not on the next refresh tick: a pass is measured at once */
int face_test_offpalette(void) {
  int bad = 0;
  for (int i = 0; i < FACE_W * FACE_H; i++) { const uint8_t *p = g_fb + i * 4; if (!prim_palette_has(((uint32_t)p[2] << 16) | ((uint32_t)p[1] << 8) | p[0])) bad++; }
  return bad;
}
/* test mode: one focus ring word on a box, from a form given as JSON ({"ring": "round" | "feet" | "tab" | {"circle": {...}}}, or {} for the default), replacing the scene (the checks of the word alone) */
int face_test_ring(const char *form_json, int x, int y, int w, int h, const char *colour) {
  if (spec_load("ringform", form_json, strlen(form_json)) < 0) return -1;
  int box[4] = { x, y, w, h };
  prim_begin(); v_region("focus", LAYER_CHROME); word_focusRing("focus.ring", box, "ringform", spec_raw("ringform", "ring", NULL) ? "ring" : NULL, colour); prim_end(); wire_changed();
  return prim_unknown();
}
