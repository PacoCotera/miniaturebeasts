#include "scene.h"
#include "lvgl.h"
#include "src/lvgl_private.h"
#include <stdlib.h>
#include <string.h>

extern const lv_font_t face_inter_16, face_inter_20, face_inter_28;
#define MAX_OBJ 512
#define MAX_ASSET 64
static struct { uint32_t id; lv_obj_t *obj; int kind, seen; int x, y, w, h; uint32_t rgb; int a, b; } g_o[MAX_OBJ];
static int g_n, g_unknown, g_nseq;
static lv_obj_t *g_seq[MAX_OBJ];
static char g_text[1024];
static struct { int w, h; uint8_t *px; lv_image_dsc_t dsc; } g_a[MAX_ASSET];

void scene_init(void) { g_n = 0; g_unknown = 0; }
char *scene_text(void) { return g_text; }
int scene_text_size(void) { return (int)sizeof g_text; }
int scene_count(void) { return g_n; }
int scene_unknown(void) { return g_unknown; }
static const lv_font_t *font_of(int px) { return px == 16 ? &face_inter_16 : px == 20 ? &face_inter_20 : px == 28 ? &face_inter_28 : NULL; }
int scene_measure(int px) {
  const lv_font_t *f = font_of(px); if (!f) return -1;
  lv_text_attributes_t at; lv_text_attributes_init(&at);
  return (int)lv_text_get_width(g_text, (uint32_t)strlen(g_text), f, &at);
}
uint8_t *scene_asset(int handle, int w, int h) {
  if (handle < 0 || handle >= MAX_ASSET || w <= 0 || h <= 0) return NULL;
  free(g_a[handle].px);
  g_a[handle].px = (uint8_t *)calloc((size_t)w * h, 4); g_a[handle].w = w; g_a[handle].h = h;
  lv_image_dsc_t *d = &g_a[handle].dsc; memset(d, 0, sizeof *d);
  d->header.magic = LV_IMAGE_HEADER_MAGIC; d->header.cf = LV_COLOR_FORMAT_ARGB8888; d->header.w = (uint32_t)w; d->header.h = (uint32_t)h;
  d->header.stride = (uint32_t)w * 4; d->data_size = (uint32_t)w * h * 4; d->data = g_a[handle].px;
  return g_a[handle].px;
}
static void plain(lv_obj_t *o) {
  lv_obj_remove_style_all(o);
  lv_obj_set_clickable(o, false); lv_obj_set_scrollable(o, false);
}
static lv_obj_t *make(int kind, int a) {
  lv_obj_t *s = lv_screen_active(), *o;
  if (kind == FN_TEXT) { o = lv_label_create(s); plain(o); lv_label_set_long_mode(o, LV_LABEL_LONG_MODE_CLIP); lv_obj_set_style_text_font(o, font_of(a), 0); }
  else if (kind == FN_SPRITE) { o = lv_image_create(s); plain(o); }
  else { o = lv_obj_create(s); plain(o); }
  return o;
}
void scene_begin(void) { for (int i = 0; i < g_n; i++) g_o[i].seen = 0; g_unknown = 0; g_nseq = 0; }
static int find(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return i; return -1; }
void scene_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b) {
  if (kind == FN_TEXT && !font_of(a)) { g_unknown++; return; }
  if (kind == FN_SPRITE && (a < 0 || a >= MAX_ASSET || !g_a[a].px || g_a[a].w != w || g_a[a].h != h)) { g_unknown++; return; }
  if (kind < FN_RECT || kind > FN_FEET) { g_unknown++; return; }
  int i = find(id);
  if (i >= 0 && g_o[i].kind != kind) { lv_obj_delete(g_o[i].obj); g_o[i] = g_o[--g_n]; i = -1; }
  if (i < 0) {
    if (g_n >= MAX_OBJ) { g_unknown++; return; }
    i = g_n++; memset(&g_o[i], 0, sizeof g_o[i]); g_o[i].id = id; g_o[i].kind = kind; g_o[i].obj = make(kind, a);
    g_o[i].x = g_o[i].y = g_o[i].w = g_o[i].h = -99999;
  }
  lv_obj_t *o = g_o[i].obj; g_o[i].seen = 1; g_seq[g_nseq++] = o;
  int px = x, py = y;
  if (kind == FN_TEXT) {
    /* the label's top is the line's top; the page gives the cap top. The baseline sits (line height - base line) below the line's top. */
    const lv_font_t *f = font_of(a); py = y + b - (f->line_height - f->base_line);
    if (strcmp(lv_label_get_text(o), g_text) != 0) lv_label_set_text(o, g_text);
    if (g_o[i].a != a) { lv_obj_set_style_text_font(o, f, 0); }
  }
  if (g_o[i].x != px || g_o[i].y != py) lv_obj_set_pos(o, px, py);
  if (g_o[i].w != w || g_o[i].h != h) {
    if (kind == FN_TEXT) lv_obj_set_size(o, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
    else lv_obj_set_size(o, w, h);
  }
  if (g_o[i].rgb != rgb || g_o[i].a != a || g_o[i].b != b || g_o[i].x == -99999) {
    if (kind == FN_RECT) { lv_obj_set_style_bg_color(o, lv_color_hex(rgb), 0); lv_obj_set_style_bg_opa(o, LV_OPA_COVER, 0); }
    else if (kind == FN_TEXT) lv_obj_set_style_text_color(o, lv_color_hex(rgb), 0);
    else if (kind == FN_SPRITE) lv_image_set_src(o, &g_a[a].dsc);
    else { lv_obj_set_style_bg_opa(o, LV_OPA_TRANSP, 0); lv_obj_set_style_border_width(o, a, 0); lv_obj_set_style_border_color(o, lv_color_hex(rgb), 0);
           lv_obj_set_style_border_opa(o, LV_OPA_COVER, 0); lv_obj_set_style_radius(o, kind == FN_FEET ? LV_RADIUS_CIRCLE : b, 0); }
  }
  g_o[i].x = px; g_o[i].y = py; g_o[i].w = w; g_o[i].h = h; g_o[i].rgb = rgb; g_o[i].a = a; g_o[i].b = b;
}
void scene_end(void) {
  for (int i = g_n - 1; i >= 0; i--) if (!g_o[i].seen) { lv_obj_delete(g_o[i].obj); g_o[i] = g_o[--g_n]; }
  /* draw order is child order: put each object at its place in the sequence the page sent */
  for (int k = 0; k < g_nseq; k++) if (lv_obj_get_index(g_seq[k]) != k) lv_obj_move_to_index(g_seq[k], k);
}
