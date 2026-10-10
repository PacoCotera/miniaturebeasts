#include "prim.h"
#include "ring.h"
#include "lvgl.h"
#include "src/lvgl_private.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define JSMN_STATIC
#define JSMN_STRICT
#include "../vendor/jsmn.h"
#include "../spec/jnum.h"

extern const lv_font_t face_inter_16, face_inter_20, face_inter_28;
#define MAX_OBJ 1024            /* the table is larger than the 400-object budget so a breach is measured, not refused (lvgl-switch.md §2.2) */
#define MAX_ASSET 256
#define MAX_SRC 4          /* face-owned sources for nine-slices (the focus ring's 20 x 20), after the host's pictures in the same table */
#define MAX_REGION 96
#define OPS_CAP (128 * 1024)
#define NINE_PARTS 9
typedef struct {
  uint32_t id, parent;          /* parent: the id of the clip this node sits in, 0 at the root */
  lv_obj_t *obj; lv_obj_t *part[NINE_PARTS];
  int kind, seen, fresh, layer, region, child_k, nchild;
  int x, y, w, h; uint32_t rgb; int a, b;
  lv_image_dsc_t crop;
  uint8_t *composed; lv_image_dsc_t cdsc; uint32_t ops_hash;
} node_t;
static node_t g_o[MAX_OBJ];
static int g_n, g_unknown, g_nseq, g_pass = 3;
static uint32_t g_seq[MAX_OBJ];
static char g_text[1024];
static char g_ops[OPS_CAP];   /* the ops of a composed picture, JSON: their own buffer, 128 KiB (the splice's wires and ticks are thousands of ops, a text run at most 1 KiB) */
typedef struct { int w, h, layer; uint32_t src_key; uint8_t *px; lv_image_dsc_t dsc; lv_image_dsc_t view[NINE_PARTS]; uint32_t view_key; } asset_t;
static asset_t g_a[MAX_ASSET + MAX_SRC];
/* the tag of the nodes now arriving, and the clip they are inside */
static int g_layer = LAYER_CHROME, g_region;
static char g_reg[MAX_REGION][48];
static int g_nreg;
static uint32_t g_clip_id; static int g_clip_left, g_clip_x, g_clip_y;
/* the palette, by name */
typedef struct { char name[24]; uint32_t rgb; } pal_t;
static pal_t g_pal[256];
static int g_npal;
static uint32_t g_hash[1024];   /* rgb + 1, open addressing */

void prim_init(void) { g_n = 0; g_unknown = 0; g_nreg = 1; strcpy(g_reg[0], "?"); g_region = 0; g_layer = LAYER_CHROME; g_pass = 3; }
char *prim_text(void) { return g_text; }
char *prim_ops(void) { return g_ops; }
int prim_ops_size(void) { return (int)sizeof g_ops; }
int prim_text_size(void) { return (int)sizeof g_text; }
int prim_count(void) { return g_n; }
int prim_unknown(void) { return g_unknown; }
void prim_refuse(void) { g_unknown++; }
int prim_asset_limit(void) { return MAX_ASSET; }
int prim_object_limit(void) { return MAX_OBJ; }
int prim_lvgl_objects(void) { int n = g_n; for (int i = 0; i < g_n; i++) if (g_o[i].kind == FN_NINE) n += NINE_PARTS; return n; }
int prim_pictures(void) { int n = 0; for (int i = 0; i < MAX_ASSET + MAX_SRC; i++) if (g_a[i].px) n++; for (int i = 0; i < g_n; i++) if (g_o[i].composed) n++; return n; }
static const lv_font_t *font_of(int px) { return px == 16 ? &face_inter_16 : px == 20 ? &face_inter_20 : px == 28 ? &face_inter_28 : NULL; }
int prim_measure(int px) {
  const lv_font_t *f = font_of(px); if (!f) return -1;
  lv_text_attributes_t at; lv_text_attributes_init(&at);
  return (int)lv_text_get_width(g_text, (uint32_t)strlen(g_text), f, &at);
}

/* ---- the palette ---- */
void prim_palette_clear(void) { g_npal = 0; memset(g_hash, 0, sizeof g_hash); }
int prim_palette_count(void) { return g_npal; }
static uint32_t mix(uint32_t v) { v ^= v >> 16; v *= 0x7feb352dU; v ^= v >> 15; v *= 0x846ca68bU; v ^= v >> 16; return v; }
int prim_palette_add(const char *name, uint32_t rgb) {
  if (g_npal >= 256 || strlen(name) >= sizeof g_pal[0].name) return -1;
  strcpy(g_pal[g_npal].name, name); g_pal[g_npal].rgb = rgb & 0xffffff; g_npal++;
  uint32_t h = mix(rgb) & 1023; while (g_hash[h] && g_hash[h] != (rgb & 0xffffff) + 1) h = (h + 1) & 1023; g_hash[h] = (rgb & 0xffffff) + 1;
  return 0;
}
int prim_palette_rgb(const char *name, uint32_t *rgb) { for (int i = 0; i < g_npal; i++) if (strcmp(g_pal[i].name, name) == 0) { *rgb = g_pal[i].rgb; return 0; } return -1; }
int prim_palette_has(uint32_t rgb) { rgb &= 0xffffff; uint32_t h = mix(rgb) & 1023; while (g_hash[h]) { if (g_hash[h] == rgb + 1) return 1; h = (h + 1) & 1023; } return 0; }
static int colour_of(const char *name, int len, uint32_t *rgb) {
  for (int i = 0; i < g_npal; i++) if ((int)strlen(g_pal[i].name) == len && strncmp(g_pal[i].name, name, (size_t)len) == 0) { *rgb = g_pal[i].rgb; return 0; }
  return -1;
}

/* ---- composed pictures: whole-pixel line work in palette colours, one object for what would be hundreds ---- */
static void put(uint8_t *px, int w, int h, int x, int y, uint32_t rgb) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  uint8_t *q = px + (y * w + x) * 4; q[0] = (uint8_t)rgb; q[1] = (uint8_t)(rgb >> 8); q[2] = (uint8_t)(rgb >> 16); q[3] = 255;
}
static int g_bad;   /* set when an op argument is not a JSON integer: prim_compose refuses the picture */
static int tokint(const char *s, const jsmntok_t *t) { int v = 0; if (t->type != JSMN_PRIMITIVE || !json_int(s + t->start, t->end - t->start, &v)) { g_bad = 1; return 0; } return v; }
static int skip(const jsmntok_t *t, int i) { int n = t[i].size; i++; for (; n > 0; n--) i = skip(t, i); return i; }   /* the token after the one at i, with its children */
static int compose_tokens(uint8_t *px, int w, int h, const char *ops, size_t len, jsmntok_t *tok, int ntok);
int prim_compose(uint8_t *px, int w, int h, const char *ops) {
  jsmn_parser p; g_bad = 0; jsmn_init(&p);
  size_t len = strlen(ops); int n = jsmn_parse(&p, ops, len, NULL, 0);
  if (n < 1 || n > 40000 || !json_clean(ops, (int)len)) return -1;
  jsmntok_t *tok = (jsmntok_t *)malloc(sizeof *tok * (size_t)n); if (!tok) return -1;
  jsmn_init(&p); int rc = compose_tokens(px, w, h, ops, len, tok, n); free(tok); return rc;
}
static int compose_tokens(uint8_t *px, int w, int h, const char *ops, size_t len, jsmntok_t *tok, int ntok) {
  jsmn_parser p; jsmn_init(&p);
  int n = jsmn_parse(&p, ops, len, tok, (unsigned)ntok);
  if (n != ntok || tok[0].type != JSMN_ARRAY) return -1;
  { size_t e = len; while (e > 0 && (ops[e - 1] == ' ' || ops[e - 1] == '\n' || ops[e - 1] == '\t' || ops[e - 1] == '\r')) e--; if ((size_t)tok[0].end != e) return -1; }
  int drawn = 0, i = 1;
  for (int op = 0; op < tok[0].size; op++) {
    if (tok[i].type != JSMN_ARRAY || tok[i].size < 1) return -1;
    int e = skip(tok, i), j = i + 1; const char *name = ops + tok[j].start; int nl = tok[j].end - tok[j].start; j++;
    uint32_t rgb;
#define A(k) tokint(ops, &tok[j + (k)])
#define COL(k) (colour_of(ops + tok[j + (k)].start, tok[j + (k)].end - tok[j + (k)].start, &rgb) == 0)
    if ((nl == 1 && (name[0] == 'h' || name[0] == 'v')) && tok[i].size == 5) {
      if (!COL(3)) return -1; int x = A(0), y = A(1), len = A(2);
      for (int k = 0; k < len; k++) put(px, w, h, x + (name[0] == 'h' ? k : 0), y + (name[0] == 'v' ? k : 0), rgb);
    } else if (nl == 4 && strncmp(name, "dash", 4) == 0 && tok[i].size == 8) {
      if (!COL(6)) return -1; int x = A(0), y = A(1), len = A(2), on = A(4), off = A(5), vert = ops[tok[j + 3].start] == 'v';
      if (on <= 0 || off < 0) return -1;
      for (int k = 0; k < len; k++) if (k % (on + off) < on) put(px, w, h, x + (vert ? 0 : k), y + (vert ? k : 0), rgb);
    } else if (nl == 3 && strncmp(name, "dot", 3) == 0 && tok[i].size == 4) {
      if (!COL(2)) return -1; put(px, w, h, A(0), A(1), rgb);
    } else if (nl == 7 && strncmp(name, "lattice", 7) == 0 && tok[i].size == 8) {
      int x = A(0), y = A(1), lw = A(2), lh = A(3), mod = A(4), pairs = j + 5;
      if (mod <= 0 || tok[pairs].type != JSMN_ARRAY) return -1;
      int ci = skip(tok, pairs);   /* the colour follows the pairs' tokens, not the pairs array itself */
      if (colour_of(ops + tok[ci].start, tok[ci].end - tok[ci].start, &rgb) != 0) return -1;
      int np = tok[pairs].size, q = pairs + 1; int ax[16], ay[16]; if (np > 16) return -1;
      for (int k = 0; k < np; k++) { if (tok[q].type != JSMN_ARRAY || tok[q].size != 2) return -1; ax[k] = tokint(ops, &tok[q + 1]); ay[k] = tokint(ops, &tok[q + 2]); q += 3; }
      for (int yy = 0; yy < lh; yy++) for (int xx = 0; xx < lw; xx++) for (int k = 0; k < np; k++) if (xx % mod == ax[k] && yy % mod == ay[k]) { put(px, w, h, x + xx, y + yy, rgb); break; }
    } else if (nl == 4 && strncmp(name, "ring", 4) == 0 && tok[i].size == 9) {   /* ["ring", shape, x, y, w, h, width, radius, colour] */
      if (!COL(7)) return -1;
      int ell = tok[j].end - tok[j].start == 7 && strncmp(ops + tok[j].start, "ellipse", 7) == 0, rnd = tok[j].end - tok[j].start == 5 && strncmp(ops + tok[j].start, "round", 5) == 0;
      if (tok[j].type != JSMN_STRING || (!ell && !rnd)) return -1;
      int x = A(1), y = A(2), bw = A(3), bh = A(4), width = A(5), radius = A(6);
      if (g_bad || width > 4096 || radius > 4096 || bw < 1 || bh < 1 || x < 0 || y < 0 || x + bw > w || y + bh > h || (long)bw * bh > 1024L * 600) return -1;
      uint8_t *mask = (uint8_t *)malloc((size_t)bw * bh); if (!mask) return -1;
      if (ring_mask(mask, bw, bh, width, radius, ell) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else if (nl == 7 && strncmp(name, "tabRing", 7) == 0 && tok[i].size == 13) {   /* ["tabRing", x, y, body, width, slant, outside, top, slantTo, bottom, radius, tabTop, colour] */
      if (!COL(11)) return -1;
      int x = A(0), y = A(1); ring_tab_t t = { A(2), A(3), A(4), A(5), A(6), A(7), A(8), A(9), A(10) };
      if (g_bad) return -1;
      { const int *q = &t.body; for (int k = 0; k < 9; k++) if (q[k] < -4096 || q[k] > 4096) return -1; }   /* the products stay far inside int64 */
      uint8_t *mask = (uint8_t *)malloc(1024 * 64); int bw = ring_tab_w(&t), bh = ring_tab_h(&t);
      if (!mask) return -1;
      if (bw < 1 || bh < 1 || bw * bh > 1024 * 64 || x < 0 || y < 0 || x + bw > w || y + bh > h || ring_tab_mask(mask, &t) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else return -1;
#undef A
#undef COL
    if (g_bad) return -1;
    drawn++; i = e;
  }
  return drawn;
}

/* ---- pictures ---- */
static uint32_t hash_str(const char *s);
static void dsc_of(lv_image_dsc_t *d, uint8_t *data, int w, int h, int stride) {
  memset(d, 0, sizeof *d);
  d->header.magic = LV_IMAGE_HEADER_MAGIC; d->header.cf = LV_COLOR_FORMAT_ARGB8888; d->header.w = (uint32_t)w; d->header.h = (uint32_t)h;
  d->header.stride = (uint32_t)stride; d->data_size = (uint32_t)stride * (uint32_t)h; d->data = data;
}
uint8_t *prim_asset(int handle, int w, int h) {
  if (handle < 0 || handle >= MAX_ASSET || w <= 0 || h <= 0 || (long)w * h > 4L * 1024 * 1024) return NULL;
  free(g_a[handle].px);
  g_a[handle].px = (uint8_t *)calloc((size_t)w * h, 4); g_a[handle].w = w; g_a[handle].h = h; g_a[handle].view_key = 0;
  if (!g_a[handle].px) return NULL;
  dsc_of(&g_a[handle].dsc, g_a[handle].px, w, h, w * 4);
  return g_a[handle].px;
}
/* the layer a picture shows on, its asset's own (the host's policy: art or painted); a composed source has none and takes its node's */
void prim_asset_layer(int handle, int layer) { if (handle >= 0 && handle < MAX_ASSET) g_a[handle].layer = layer; }
void prim_asset_free(int handle) { if (handle < 0 || handle >= MAX_ASSET) return; free(g_a[handle].px); memset(&g_a[handle], 0, sizeof g_a[handle]); }
/* A face-owned source picture from composed ops (w x h), cached by the ops' hash: the same ops are the same picture, kept once. A handle for a nine-slice or a sprite, or -1 when refused or the table is full. */
int prim_source(const char *ops, int w, int h) {
  if (w <= 0 || h <= 0 || (long)w * h > 256 * 256) return -1;
  uint32_t key = hash_str(ops) ^ ((uint32_t)w * 40503u) ^ ((uint32_t)h * 9973u); if (!key) key = 1;
  int free_slot = -1;
  for (int i = MAX_ASSET; i < MAX_ASSET + MAX_SRC; i++) { if (g_a[i].px && g_a[i].src_key == key && g_a[i].w == w && g_a[i].h == h) return i; if (!g_a[i].px && free_slot < 0) free_slot = i; }
  if (free_slot < 0) return -1;
  asset_t *s = &g_a[free_slot]; s->px = (uint8_t *)calloc((size_t)w * h, 4); if (!s->px) return -1;
  if (prim_compose(s->px, w, h, ops) < 0) { free(s->px); s->px = NULL; return -1; }
  s->w = w; s->h = h; s->src_key = key; s->view_key = 0; dsc_of(&s->dsc, s->px, w, h, w * 4); return free_slot;
}
uint8_t *prim_asset_ptr(int handle) { return handle >= 0 && handle < MAX_ASSET ? g_a[handle].px : NULL; }
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

/* ---- the objects ---- */
static void plain(lv_obj_t *o) {
  lv_obj_remove_style_all(o);
  lv_obj_set_clickable(o, false); lv_obj_set_scrollable(o, false);
}
static node_t *find_node(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return &g_o[i]; return NULL; }
static int find(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return i; return -1; }
static lv_obj_t *make(node_t *n, int a, lv_obj_t *parent) {
  lv_obj_t *o;
  if (n->kind == FN_TEXT) { o = lv_label_create(parent); plain(o); lv_label_set_long_mode(o, LV_LABEL_LONG_MODE_CLIP); lv_obj_set_style_text_font(o, font_of(a), 0); }
  else if (n->kind == FN_SPRITE || n->kind == FN_COMPOSED) { o = lv_image_create(parent); plain(o); }
  else if (n->kind == FN_NINE) {
    o = lv_obj_create(parent); plain(o);
    for (int i = 0; i < NINE_PARTS; i++) { n->part[i] = lv_image_create(o); plain(n->part[i]); lv_image_set_inner_align(n->part[i], LV_IMAGE_ALIGN_TILE); }
  } else { o = lv_obj_create(parent); plain(o); }   /* a rectangle, or a clip: an object whose bounds cut its children (LVGL's default) */
  return o;
}
static void remove_at(int i) { lv_obj_delete(g_o[i].obj); free(g_o[i].composed); g_o[i] = g_o[--g_n]; }
/* drop a node; a clip takes its children with it (their records go first, so none is left pointing at a deleted object) */
static void drop(int i) {
  if (g_o[i].kind == FN_CLIP) { uint32_t cid = g_o[i].id; for (int k = g_n - 1; k >= 0; k--) if (g_o[k].parent == cid) remove_at(k); i = find(cid); if (i < 0) return; }
  remove_at(i);
}
void prim_tag(int layer, const char *region) {
  g_layer = layer < 0 || layer > 3 ? LAYER_CHROME : layer; g_region = 0;
  if (!region || !*region) return;
  for (int i = 1; i < g_nreg; i++) if (strncmp(g_reg[i], region, sizeof g_reg[0] - 1) == 0) { g_region = i; return; }
  if (g_nreg < MAX_REGION) { strncpy(g_reg[g_nreg], region, sizeof g_reg[0] - 1); g_reg[g_nreg][sizeof g_reg[0] - 1] = 0; g_region = g_nreg++; }
}
void prim_begin(void) { for (int i = 0; i < g_n; i++) g_o[i].seen = 0; g_unknown = 0; g_nseq = 0; g_clip_left = 0; g_clip_id = 0; g_nreg = 1; g_region = 0; g_layer = LAYER_CHROME; }
static uint32_t hash_str(const char *s) { uint32_t h = 2166136261u; for (; *s; s++) { h ^= (uint8_t)*s; h *= 16777619u; } return h ? h : 1; }
static void show(node_t *n) { lv_obj_set_hidden(n->obj, n->layer > (g_pass >= 3 ? LAYER_TYPE : g_pass - 1)); }   /* pass 1 shows chrome, 2 adds art, 3 everything */
void prim_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b) {
  /* the clip's bookkeeping comes first: a node sent while a clip is open counts against it whether or not it is drawn, so a refused child never leaves the next root node inside the clip;
     a refused clip refuses the children it announced. A clip does not hold a clip. */
  uint32_t parent = 0; lv_obj_t *pobj = lv_screen_active(); int ox = 0, oy = 0, in_clip = 0;
#define REFUSE() do { g_unknown++; if (kind == FN_CLIP && !in_clip) { g_clip_left = a > 0 ? a : 0; g_clip_id = 0; } return; } while (0)
  if (g_clip_left > 0) {
    in_clip = 1; g_clip_left--;
    node_t *c = g_clip_id ? find_node(g_clip_id) : NULL;
    if (kind == FN_CLIP || !c) REFUSE();
    parent = g_clip_id; pobj = c->obj; ox = g_clip_x; oy = g_clip_y;
  }
  if (kind < FN_RECT || kind > FN_COMPOSED) REFUSE();
  if (kind == FN_TEXT && !font_of(a)) REFUSE();
  int sx = (int)(rgb >> 16), sy = (int)(rgb & 0xffff);
  if (kind == FN_SPRITE && (a < 0 || a >= MAX_ASSET + MAX_SRC || !g_a[a].px || (rgb == 0 ? (g_a[a].w != w || g_a[a].h != h) : (sx + w > g_a[a].w || sy + h > g_a[a].h)))) REFUSE();
  int nl = (int)(rgb >> 24), nt = (int)((rgb >> 16) & 255), nr = (int)((rgb >> 8) & 255), nb = (int)(rgb & 255);   /* a nine-slice: its insets l, t, r, b in rgb, its tile in b */
  if (kind == FN_NINE && (a < 0 || a >= MAX_ASSET + MAX_SRC || !g_a[a].px || g_a[a].w <= nl + nr || g_a[a].h <= nt + nb || w < nl + nr || h < nt + nb)) REFUSE();
  if (kind == FN_COMPOSED && (w <= 0 || h <= 0 || (long)w * h > 1024L * 600)) REFUSE();
  int i = find(id);
  if (i >= 0 && (g_o[i].kind != kind || g_o[i].parent != parent)) { drop(i); i = -1; }
  if (i < 0) {
    if (g_n >= MAX_OBJ) REFUSE();
    i = g_n++; memset(&g_o[i], 0, sizeof g_o[i]); g_o[i].id = id; g_o[i].kind = kind; g_o[i].parent = parent; g_o[i].fresh = 1; g_o[i].obj = make(&g_o[i], a, pobj);
  }
  node_t *n = &g_o[i]; lv_obj_t *o = n->obj; n->seen = 1; g_seq[g_nseq++] = id; n->layer = g_layer; n->region = g_region;
  if ((kind == FN_SPRITE || kind == FN_NINE) && a >= 0 && a < MAX_ASSET && g_a[a].layer) n->layer = g_a[a].layer;   /* a picture takes its layer from its asset (lvgl-switch.md §2.1); words choose a layer only for rects, text and composed pictures */
  int px = x - ox, py = y - oy;
  if (kind == FN_TEXT) {
    /* the label's top is the line's top; the page gives the cap top. The baseline sits (line height - base line) below the line's top. */
    const lv_font_t *f = font_of(a); py = py + b - (f->line_height - f->base_line);
    if (strcmp(lv_label_get_text(o), g_text) != 0) lv_label_set_text(o, g_text);
    if (n->a != a) lv_obj_set_style_text_font(o, f, 0);
  }
  if (n->fresh || n->x != px || n->y != py) lv_obj_set_pos(o, px, py);
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
  if (kind == FN_COMPOSED) {   /* the ops are drawn into the picture's own pixels again only when they or its size change */
    uint32_t oh = hash_str(g_ops) ^ ((uint32_t)w * 40503u) ^ ((uint32_t)h * 9973u);
    if (n->fresh || n->ops_hash != oh) {
      if (n->w != w || n->h != h || !n->composed) { free(n->composed); n->composed = (uint8_t *)calloc((size_t)w * h, 4); }
      else memset(n->composed, 0, (size_t)w * h * 4);
      if (!n->composed || prim_compose(n->composed, w, h, g_ops) < 0) { g_unknown++; if (n->composed) memset(n->composed, 0, (size_t)w * h * 4); }
      dsc_of(&n->cdsc, n->composed, w, h, w * 4); lv_image_set_src(o, &n->cdsc); lv_obj_invalidate(o); n->ops_hash = oh;
    }
  }
  if (n->fresh || n->rgb != rgb || n->a != a || n->b != b || (kind == FN_SPRITE && rgb != 0 && (n->w != w || n->h != h))) {
    if (kind == FN_RECT) { lv_obj_set_style_bg_color(o, lv_color_hex(rgb), 0); lv_obj_set_style_bg_opa(o, LV_OPA_COVER, 0); }
    else if (kind == FN_TEXT) lv_obj_set_style_text_color(o, lv_color_hex(rgb), 0);
    else if (kind == FN_SPRITE) { if (rgb == 0) lv_image_set_src(o, &g_a[a].dsc); else { dsc_of(&n->crop, g_a[a].px + sy * g_a[a].w * 4 + sx * 4, w, h, g_a[a].w * 4); lv_image_set_src(o, &n->crop); } }
  }
  if (kind == FN_CLIP) { g_clip_id = id; g_clip_left = a; g_clip_x = x; g_clip_y = y; n->nchild = a; }
  n->fresh = 0; n->x = px; n->y = py; n->w = w; n->h = h; n->rgb = rgb; n->a = a; n->b = b; show(n);
}
void prim_end(void) {
  for (int again = 1; again;) { again = 0; for (int i = 0; i < g_n; i++) if (!g_o[i].seen) { drop(i); again = 1; break; } }
  /* draw order is child order: put each object at its place in the sequence the page sent, among its siblings (the screen's, or its clip's) */
  int root = 0; for (int i = 0; i < g_n; i++) g_o[i].child_k = 0;
  for (int k = 0; k < g_nseq; k++) {
    node_t *n = find_node(g_seq[k]); if (!n) continue;
    int idx;
    if (n->parent) { node_t *c = find_node(n->parent); if (!c) continue; idx = c->child_k++; } else idx = root++;
    /* a nine-slice's own parts are not siblings: they are not in the sequence */
    if ((int)lv_obj_get_index(n->obj) != idx) lv_obj_move_to_index(n->obj, idx);
  }
}

/* ---- test mode: the passes and the logs ---- */
void prim_set_pass(int pass) {
  g_pass = pass < 1 ? 1 : pass > 3 ? 3 : pass;
  for (int i = 0; i < g_n; i++) show(&g_o[i]);
  lv_obj_invalidate(lv_screen_active());
}
static int jstr(char *buf, int cap, int *n, const char *s) {   /* a JSON string, escaped; 0 on overflow */
  if (*n + 2 >= cap) return 0; buf[(*n)++] = '"';
  for (; *s; s++) {
    unsigned char c = (unsigned char)*s;
    if (c == '"' || c == '\\') { if (*n + 3 >= cap) return 0; buf[(*n)++] = '\\'; buf[(*n)++] = (char)c; }
    else if (c < 0x20) { if (*n + 8 >= cap) return 0; *n += snprintf(buf + *n, (size_t)(cap - *n), "\\u%04x", c); }
    else { if (*n + 2 >= cap) return 0; buf[(*n)++] = (char)c; }
  }
  if (*n + 2 >= cap) return 0; buf[(*n)++] = '"'; return 1;
}
int prim_log_json(char *buf, int cap) {
  static const char *LAYERS[] = { "chrome", "art", "painted", "type" };
  int n = 0;
#define PUT(...) do { int w_ = snprintf(buf + n, (size_t)(cap - n), __VA_ARGS__); if (w_ < 0 || n + w_ >= cap) return -1; n += w_; } while (0)
#define STR(s) do { if (!jstr(buf, cap, &n, (s))) return -1; } while (0)
  lv_obj_update_layout(lv_screen_active());   /* a text label is as wide as its text only once the layout has run */
  PUT("{\"regions\":[");
  int first = 1;
  for (int r = 1; r < g_nreg; r++) for (int l = 0; l < 4; l++) {   /* one entry a region and layer: the union of its nodes' rects */
    int x0 = 1 << 30, y0 = 1 << 30, x1 = -(1 << 30), y1 = -(1 << 30), any = 0;
    for (int i = 0; i < g_n; i++) {
      node_t *nd = &g_o[i]; if (!nd->seen || nd->region != r || nd->layer != l || nd->kind == FN_CLIP) continue;
      int ax = nd->x, ay = nd->y; node_t *c = nd->parent ? find_node(nd->parent) : NULL; if (c) { ax += c->x; ay += c->y; }
      int ex = ax + (nd->kind == FN_TEXT ? lv_obj_get_width(nd->obj) : nd->w), ey = ay + (nd->kind == FN_TEXT ? lv_obj_get_height(nd->obj) : nd->h);
      if (c) { if (ax < c->x) ax = c->x; if (ay < c->y) ay = c->y; if (ex > c->x + c->w) ex = c->x + c->w; if (ey > c->y + c->h) ey = c->y + c->h; if (ex <= ax || ey <= ay) continue; }   /* a clip's child counts only where the clip shows it */
      if (ax < x0) x0 = ax; if (ay < y0) y0 = ay; if (ex > x1) x1 = ex; if (ey > y1) y1 = ey; any = 1;
    }
    if (!any) continue;
    PUT("%s{\"id\":", first ? "" : ","); STR(g_reg[r]); PUT(",\"layer\":\"%s\",\"rect\":[%d,%d,%d,%d]}", LAYERS[l], x0, y0, x1 - x0, y1 - y0); first = 0;
  }
  PUT("],\"type\":[");
  first = 1;
  for (int i = 0; i < g_n; i++) {
    node_t *nd = &g_o[i]; if (!nd->seen || nd->kind != FN_TEXT) continue;
    PUT("%s{\"text\":", first ? "" : ","); STR(lv_label_get_text(nd->obj)); PUT(",\"px\":%d,\"region\":", nd->a); STR(g_reg[nd->region]); PUT("}"); first = 0;
  }
  PUT("],\"refused\":%d,\"objects\":%d,\"table\":%d,\"pictures\":%d}", g_unknown, prim_lvgl_objects(), g_n, prim_pictures());   /* objects: the LVGL objects alive (a nine-slice is nine); table: the face's own, one a node */
#undef PUT
#undef STR
  return n;
}
