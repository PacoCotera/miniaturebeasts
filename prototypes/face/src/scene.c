#include "scene.h"
#include "lvgl.h"
#include "src/lvgl_private.h"
#include <stdlib.h>
#include <string.h>

extern const lv_font_t face_inter_16, face_inter_20, face_inter_28;
#define MAX_OBJ 512
#define MAX_ASSET 256
#define NINE_PARTS 9
typedef struct { uint32_t id; lv_obj_t *obj; lv_obj_t *part[NINE_PARTS]; int kind, seen, fresh; int x, y, w, h; uint32_t rgb; int a, b; lv_image_dsc_t crop; } node_t;
static node_t g_o[MAX_OBJ];
static int g_n, g_unknown, g_nseq;
static lv_obj_t *g_seq[MAX_OBJ];
static char g_text[1024];
typedef struct { int w, h; uint8_t *px; lv_image_dsc_t dsc; lv_image_dsc_t view[NINE_PARTS]; uint32_t view_key; } asset_t;
static asset_t g_a[MAX_ASSET];

void scene_init(void) { g_n = 0; g_unknown = 0; }
char *scene_text(void) { return g_text; }
int scene_text_size(void) { return (int)sizeof g_text; }
int scene_count(void) { return g_n; }
int scene_unknown(void) { return g_unknown; }
int scene_asset_limit(void) { return MAX_ASSET; }
static const lv_font_t *font_of(int px) { return px == 16 ? &face_inter_16 : px == 20 ? &face_inter_20 : px == 28 ? &face_inter_28 : NULL; }
int scene_measure(int px) {
  const lv_font_t *f = font_of(px); if (!f) return -1;
  lv_text_attributes_t at; lv_text_attributes_init(&at);
  return (int)lv_text_get_width(g_text, (uint32_t)strlen(g_text), f, &at);
}
static void dsc_of(lv_image_dsc_t *d, uint8_t *data, int w, int h, int stride) {
  memset(d, 0, sizeof *d);
  d->header.magic = LV_IMAGE_HEADER_MAGIC; d->header.cf = LV_COLOR_FORMAT_ARGB8888; d->header.w = (uint32_t)w; d->header.h = (uint32_t)h;
  d->header.stride = (uint32_t)stride; d->data_size = (uint32_t)stride * (uint32_t)h; d->data = data;
}
uint8_t *scene_asset(int handle, int w, int h) {
  if (handle < 0 || handle >= MAX_ASSET || w <= 0 || h <= 0) return NULL;
  free(g_a[handle].px);
  g_a[handle].px = (uint8_t *)calloc((size_t)w * h, 4); g_a[handle].w = w; g_a[handle].h = h; g_a[handle].view_key = 0;
  dsc_of(&g_a[handle].dsc, g_a[handle].px, w, h, w * 4);
  return g_a[handle].px;
}
/* the nine parts of a picture as views into its own pixels (no copy): the corners at the insets l, t, r, b, and the edges and the middle as one tile each (the first `tile` px
   of the strip, or all of it when tile is 0), repeated by the objects over the target */
#define INSETS(l, t, r, b) ((uint32_t)(l) << 24 | (uint32_t)(t) << 16 | (uint32_t)(r) << 8 | (uint32_t)(b))
static void views_of(asset_t *s, int l, int t, int r, int b, int tile) {
  uint32_t key = INSETS(l, t, r, b) ^ ((uint32_t)tile * 2654435761u) ^ 1u;
  if (s->view_key == key) return;
  int w = s->w, h = s->h, st = w * 4, mw = w - l - r, mh = h - t - b;
  if (tile > 0 && tile < mw) mw = tile;
  if (tile > 0 && tile < mh) mh = tile;
  const int xs[3] = { 0, l, w - r }, ys[3] = { 0, t, h - b }, ws[3] = { l, mw, r }, hs[3] = { t, mh, b };
  for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) dsc_of(&s->view[j * 3 + i], s->px + ys[j] * st + xs[i] * 4, ws[i] > 0 ? ws[i] : 1, hs[j] > 0 ? hs[j] : 1, st);
  s->view_key = key;
}
static void plain(lv_obj_t *o) {
  lv_obj_remove_style_all(o);
  lv_obj_set_clickable(o, false); lv_obj_set_scrollable(o, false);
}
static lv_obj_t *make(node_t *n, int a) {
  lv_obj_t *s = lv_screen_active(), *o;
  if (n->kind == FN_TEXT) { o = lv_label_create(s); plain(o); lv_label_set_long_mode(o, LV_LABEL_LONG_MODE_CLIP); lv_obj_set_style_text_font(o, font_of(a), 0); }
  else if (n->kind == FN_SPRITE) { o = lv_image_create(s); plain(o); }
  else if (n->kind == FN_NINE) {
    o = lv_obj_create(s); plain(o);
    for (int i = 0; i < NINE_PARTS; i++) { n->part[i] = lv_image_create(o); plain(n->part[i]); lv_image_set_inner_align(n->part[i], LV_IMAGE_ALIGN_TILE); }
  } else { o = lv_obj_create(s); plain(o); }
  return o;
}
void scene_begin(void) { for (int i = 0; i < g_n; i++) g_o[i].seen = 0; g_unknown = 0; g_nseq = 0; }
static int find(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return i; return -1; }
static void drop(int i) { lv_obj_delete(g_o[i].obj); g_o[i] = g_o[--g_n]; }
void scene_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b) {
  if (kind < FN_RECT || kind > FN_NINE) { g_unknown++; return; }
  if (kind == FN_TEXT && !font_of(a)) { g_unknown++; return; }
  /* a picture placed 1:1; with a crop (rgb = source x << 16 | source y) the node shows that window of a larger picture, as a view into its pixels */
  int sx = (int)(rgb >> 16), sy = (int)(rgb & 0xffff);
  if (kind == FN_SPRITE && (a < 0 || a >= MAX_ASSET || !g_a[a].px || (rgb == 0 ? (g_a[a].w != w || g_a[a].h != h) : (sx + w > g_a[a].w || sy + h > g_a[a].h)))) { g_unknown++; return; }
  int nl = (int)(rgb >> 24), nt = (int)((rgb >> 16) & 255), nr = (int)((rgb >> 8) & 255), nb = (int)(rgb & 255);   /* a nine-slice: its insets l, t, r, b in rgb, its tile in b */
  if (kind == FN_NINE && (a < 0 || a >= MAX_ASSET || !g_a[a].px || g_a[a].w <= nl + nr || g_a[a].h <= nt + nb || w < nl + nr || h < nt + nb)) { g_unknown++; return; }
  int i = find(id);
  if (i >= 0 && g_o[i].kind != kind) { drop(i); i = -1; }
  if (i < 0) {
    if (g_n >= MAX_OBJ) { g_unknown++; return; }
    i = g_n++; memset(&g_o[i], 0, sizeof g_o[i]); g_o[i].id = id; g_o[i].kind = kind; g_o[i].fresh = 1; g_o[i].obj = make(&g_o[i], a);
  }
  node_t *n = &g_o[i]; lv_obj_t *o = n->obj; n->seen = 1; g_seq[g_nseq++] = o;
  int py = y;
  if (kind == FN_TEXT) {
    /* the label's top is the line's top; the page gives the cap top. The baseline sits (line height - base line) below the line's top. */
    const lv_font_t *f = font_of(a); py = y + b - (f->line_height - f->base_line);
    if (strcmp(lv_label_get_text(o), g_text) != 0) lv_label_set_text(o, g_text);
    if (n->a != a) lv_obj_set_style_text_font(o, f, 0);
  }
  if (n->fresh || n->x != x || n->y != py) lv_obj_set_pos(o, x, py);
  if (n->fresh || n->w != w || n->h != h) {
    if (kind == FN_TEXT) lv_obj_set_size(o, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
    else lv_obj_set_size(o, w, h);
  }
  if (kind == FN_NINE && (n->fresh || n->w != w || n->h != h || n->a != a || n->b != b || n->rgb != rgb)) {
    asset_t *s = &g_a[a]; views_of(s, nl, nt, nr, nb, b);
    const int xs[3] = { 0, nl, w - nr }, ys[3] = { 0, nt, h - nb }, ws[3] = { nl, w - nl - nr, nr }, hs[3] = { nt, h - nt - nb, nb };
    for (int j = 0; j < 3; j++) for (int k = 0; k < 3; k++) {
      lv_obj_t *p = n->part[j * 3 + k]; lv_image_set_src(p, &s->view[j * 3 + k]);
      lv_obj_set_pos(p, xs[k], ys[j]); lv_obj_set_size(p, ws[k] > 0 ? ws[k] : 1, hs[j] > 0 ? hs[j] : 1);
    }
  }
  if (n->fresh || n->rgb != rgb || n->a != a || n->b != b || (kind == FN_SPRITE && rgb != 0 && (n->w != w || n->h != h))) {
    if (kind == FN_RECT) { lv_obj_set_style_bg_color(o, lv_color_hex(rgb), 0); lv_obj_set_style_bg_opa(o, LV_OPA_COVER, 0); }
    else if (kind == FN_TEXT) lv_obj_set_style_text_color(o, lv_color_hex(rgb), 0);
    else if (kind == FN_SPRITE) { if (rgb == 0) lv_image_set_src(o, &g_a[a].dsc); else { dsc_of(&n->crop, g_a[a].px + sy * g_a[a].w * 4 + sx * 4, w, h, g_a[a].w * 4); lv_image_set_src(o, &n->crop); } }
  }
  n->fresh = 0; n->x = x; n->y = py; n->w = w; n->h = h; n->rgb = rgb; n->a = a; n->b = b;
}
void scene_end(void) {
  for (int i = g_n - 1; i >= 0; i--) if (!g_o[i].seen) drop(i);
  /* draw order is child order: put each object at its place in the sequence the page sent */
  for (int k = 0; k < g_nseq; k++) if (lv_obj_get_index(g_seq[k]) != k) lv_obj_move_to_index(g_seq[k], k);
}
