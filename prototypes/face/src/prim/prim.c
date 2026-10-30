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

extern const lv_font_t face_inter_14, face_inter_15, face_inter_16, face_inter_16m, face_inter_20, face_inter_28;
#define MAX_OBJ 1024            /* the table is larger than the 400-object budget so a breach is measured, not refused (lvgl-switch.md §2.2) */
#define MAX_ASSET 256
#define MAX_SRC 16         /* face-owned sources for nine-slices (the focus rings, the bezels: the Library's three cell bezels with the rest), after the host's pictures in the same table; kept for the session, so every screen's together */
#define MAX_REGION 96
#define OPS_CAP (128 * 1024)
#define NINE_PARTS 9
#define RING_PARTS 8
static const int RING_JK[RING_PARTS][2] = { { 0, 0 }, { 0, 2 }, { 2, 0 }, { 2, 2 }, { 0, 1 }, { 2, 1 }, { 1, 0 }, { 1, 2 } };   /* the corners first, then the edges: top, bottom, left, right (row j, column k of the nine) */
typedef struct {
  uint32_t id, parent;          /* parent: the id of the clip this node sits in, 0 at the root */
  lv_obj_t *obj; lv_obj_t *part[NINE_PARTS];
  int ringed; lv_obj_t *rp[RING_PARTS];   /* ringed: a nine-slice of a ring's source: no container and no middle, eight border parts that are siblings on the node's parent (obj is the first of them) */
  int kind, seen, fresh, born, layer, region, child_k, nchild;
  int x, y, w, h; uint32_t rgb; int a, b;
  lv_image_dsc_t crop;
  uint8_t *composed; lv_image_dsc_t cdsc; uint32_t ops_hash; int ring, dd;   /* dd: the ops drew a dash or a dot (the log flags a closed box of them, fix 14 rule 4); ring: the composed ops drew a ring or tabRing (the test-mode log flags it, fix 14 rule 1) */
  uint32_t run;                 /* the run (one v_run or v_price call, prim_run) the node was sent in, 0 for none */
  uint32_t win_gen; int win_key[4], win_solid[4], win_cut;   /* a window of a larger picture (a sprite with a source origin): its solid-ink box in the window and whether the window cuts solid ink, kept for the asset's gen and the window (the log) */
  int hold;                     /* the node is a hold mark (prim_hold: kit_focusRingHold), not a focus ring: the log counts it as a hold */
  int opa;                      /* a sprite's opacity, 0..255 (prim_sprite_opa), 255 when the node is made */
  char role[24], ground[16];    /* a text node: the role and ground the words set it by (prim_text_role), "" for a text set by size */
} node_t;
static node_t g_o[MAX_OBJ];
static int g_n, g_unknown, g_nseq, g_pass = 3, g_hide = -1;   /* g_hide: a region the test mode hides (fix 14 rule F2 draws the same state without the ring) */
static uint32_t g_seq[MAX_OBJ];
static lv_obj_t *g_nursery;
static char g_text[1024];
static uint32_t g_run;   /* the run the nodes sent from now on belong to (prim_run), 0 for none */
static int g_hold;       /* the nodes sent from now on are a hold mark (prim_hold) */
static int g_sopa = 255;   /* the opacity of the next sprite node (prim_sprite_opa), 255 again once it is sent */
static char g_trole[24], g_tground[16];   /* the role and ground of the next text node (prim_text_role), cleared when it is sent */
static char g_ops[OPS_CAP];   /* the ops of a composed picture, JSON: their own buffer, 128 KiB (the splice's wires and ticks are thousands of ops, a text run at most 1 KiB) */
typedef struct { int w, h, layer, ring; uint32_t src_key; uint8_t *px; lv_image_dsc_t dsc; lv_image_dsc_t view[NINE_PARTS]; uint32_t view_key; int ink[4], ink_ok, solid[4], solid_ok; uint32_t gen; } asset_t;   /* ink: the box of the pixels with alpha above 0, solid: the solid-ink box (prim_asset_solid_box), for the log; ink_ok and solid_ok 0 once the pixels may have been written, and gen a new number then (a window's box is kept by its node against it) */
#define SNAP_SLOT (MAX_ASSET + MAX_SRC)   /* the one face-owned picture a snapshot fills (prim_snapshot), after the sources */
static asset_t g_a[MAX_ASSET + MAX_SRC + 1];
static uint32_t g_gen;   /* the last gen given a picture whose pixels may have changed */
static void touched(asset_t *s) { s->ink_ok = 0; s->solid_ok = 0; s->gen = ++g_gen; }   /* the pixels may have been written: the log's boxes are taken again */
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

void prim_init(void) { g_run = 0; g_hold = 0; g_n = 0; g_unknown = 0; g_nreg = 1; strcpy(g_reg[0], "?"); g_region = 0; g_layer = LAYER_CHROME; g_pass = 3; g_nursery = NULL; }
char *prim_text(void) { return g_text; }
void prim_text_role(const char *role, const char *ground) { snprintf(g_trole, sizeof g_trole, "%s", role ? role : ""); snprintf(g_tground, sizeof g_tground, "%s", ground ? ground : ""); }
void prim_sprite_opa(int opa) { g_sopa = opa < 0 ? 0 : opa > 255 ? 255 : opa; }
void prim_run(uint32_t run) { g_run = run; }
uint32_t prim_run_get(void) { return g_run; }
void prim_hold(int on) { g_hold = on ? 1 : 0; }
char *prim_ops(void) { return g_ops; }
int prim_ops_size(void) { return (int)sizeof g_ops; }
int prim_text_size(void) { return (int)sizeof g_text; }
int prim_count(void) { return g_n; }
int prim_unknown(void) { return g_unknown; }
void prim_refuse(void) { g_unknown++; }
int prim_asset_limit(void) { return MAX_ASSET; }
int prim_object_limit(void) { return MAX_OBJ; }
int prim_lvgl_objects(void) { int n = g_n; for (int i = 0; i < g_n; i++) if (g_o[i].kind == FN_NINE) n += g_o[i].ringed ? RING_PARTS - 1 : NINE_PARTS; return n; }
/* A painted picture of the scene covering a pixel, whatever pass is showing: the test's pass 1 and 2 hide the painted layer, and a painting that carries a whole region (the light's painting under Home's and Idle's living window) leaves no chrome under it by design, so its pixels are not off-palette findings (face_test_offpalette). */
int prim_painted_at(int x, int y) {
  if (g_pass >= 3) return 0;   /* the painted layer shows: its pixels are counted like any other */
  for (int i = 0; i < g_n; i++) { const node_t *n = &g_o[i]; if (n->seen && n->kind == FN_SPRITE && n->parent == 0 && n->layer == LAYER_PAINTED && n->w > 0 && n->h > 0 && x >= n->x && y >= n->y && x < n->x + n->w && y < n->y + n->h) return 1; }
  return 0;
}
int prim_pictures(void) { int n = 0; for (int i = 0; i < MAX_ASSET + MAX_SRC + 1; i++) if (g_a[i].px) n++; for (int i = 0; i < g_n; i++) if (g_o[i].composed) n++; return n; }
/* the font of a code (prim.h PRIM_FONT_*): the six the face holds, NULL for any other */
static const lv_font_t *font_of(int code) { return code == PRIM_FONT_R14 ? &face_inter_14 : code == PRIM_FONT_R15 ? &face_inter_15 : code == PRIM_FONT_R16 ? &face_inter_16 : code == PRIM_FONT_M16 ? &face_inter_16m : code == PRIM_FONT_M20 ? &face_inter_20 : code == PRIM_FONT_SB28 ? &face_inter_28 : NULL; }
int prim_font_px(int code) { return font_of(code) ? code % 1000 : 0; }
int prim_measure(int code) {
  const lv_font_t *f = font_of(code); if (!f) return -1;
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
static int g_bad, g_ringdrawn, g_dashdot;   /* set when an op argument is not a JSON integer: prim_compose refuses the picture */
static int tokint(const char *s, const jsmntok_t *t) { int v = 0; if (t->type != JSMN_PRIMITIVE || !json_int(s + t->start, t->end - t->start, &v)) { g_bad = 1; return 0; } return v; }
static int skip(const jsmntok_t *t, int i) { int n = t[i].size; i++; for (; n > 0; n--) i = skip(t, i); return i; }   /* the token after the one at i, with its children */
static int compose_tokens(uint8_t *px, int w, int h, const char *ops, size_t len, jsmntok_t *tok, int ntok);
int prim_compose(uint8_t *px, int w, int h, const char *ops) {
  jsmn_parser p; g_bad = 0; g_ringdrawn = 0; g_dashdot = 0; jsmn_init(&p);
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
    } else if (nl == 4 && strncmp(name, "dash", 4) == 0 && tok[i].size == 8) {  g_dashdot = 1;
      if (!COL(6)) return -1; int x = A(0), y = A(1), len = A(2), on = A(4), off = A(5), vert = ops[tok[j + 3].start] == 'v';
      if (on <= 0 || off < 0) return -1;
      for (int k = 0; k < len; k++) if (k % (on + off) < on) put(px, w, h, x + (vert ? 0 : k), y + (vert ? k : 0), rgb);
    } else if (nl == 3 && strncmp(name, "dot", 3) == 0 && tok[i].size == 4) {  g_dashdot = 1;
      if (!COL(2)) return -1; put(px, w, h, A(0), A(1), rgb);
    } else if (nl == 7 && strncmp(name, "lattice", 7) == 0 && tok[i].size == 8) {
      int x = A(0), y = A(1), lw = A(2), lh = A(3), mod = A(4), pairs = j + 5;
      if (mod <= 0 || tok[pairs].type != JSMN_ARRAY) return -1;
      int ci = skip(tok, pairs);   /* the colour follows the pairs' tokens, not the pairs array itself */
      if (colour_of(ops + tok[ci].start, tok[ci].end - tok[ci].start, &rgb) != 0) return -1;
      int np = tok[pairs].size, q = pairs + 1; int ax[16], ay[16]; if (np > 16) return -1;
      for (int k = 0; k < np; k++) { if (tok[q].type != JSMN_ARRAY || tok[q].size != 2) return -1; ax[k] = tokint(ops, &tok[q + 1]); ay[k] = tokint(ops, &tok[q + 2]); q += 3; }
      for (int yy = 0; yy < lh; yy++) for (int xx = 0; xx < lw; xx++) for (int k = 0; k < np; k++) if (xx % mod == ax[k] && yy % mod == ay[k]) { put(px, w, h, x + xx, y + yy, rgb); break; }
    } else if (nl == 4 && strncmp(name, "ring", 4) == 0 && tok[i].size == 9) {  g_ringdrawn = 1;   /* ["ring", shape, x, y, w, h, width, radius, colour] */
      if (!COL(7)) return -1;
      int ell = tok[j].end - tok[j].start == 7 && strncmp(ops + tok[j].start, "ellipse", 7) == 0, rnd = tok[j].end - tok[j].start == 5 && strncmp(ops + tok[j].start, "round", 5) == 0;
      if (tok[j].type != JSMN_STRING || (!ell && !rnd)) return -1;
      int x = A(1), y = A(2), bw = A(3), bh = A(4), width = A(5), radius = A(6);
      if (g_bad || width > 4096 || radius > 4096 || bw < 1 || bh < 1 || x < 0 || y < 0 || x + bw > w || y + bh > h || (long)bw * bh > 1024L * 600) return -1;
      uint8_t *mask = (uint8_t *)malloc((size_t)bw * bh); if (!mask) return -1;
      if (ring_mask(mask, bw, bh, width, radius, ell) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else if (nl == 5 && strncmp(name, "rrect", 5) == 0 && tok[i].size == 8) {   /* ["rrect", x, y, w, h, radius, fill, edge]: a rounded box, its whole in `fill` ("" none) and a 1 px edge on its outline in `edge` ("" none), integer corners with no anti-aliasing (the Incubate panel's bezels and window edges; not a focus ring, so it sets no ring flag) */
      uint32_t fillc = 0, edgec = 0; int hasf = tok[j + 5].end > tok[j + 5].start, hase = tok[j + 6].end > tok[j + 6].start;
      if (hasf && colour_of(ops + tok[j + 5].start, tok[j + 5].end - tok[j + 5].start, &fillc) != 0) return -1;
      if (hase && colour_of(ops + tok[j + 6].start, tok[j + 6].end - tok[j + 6].start, &edgec) != 0) return -1;
      int x = A(0), y = A(1), bw = A(2), bh = A(3), radius = A(4);
      if (g_bad || radius < 0 || radius > 4096 || bw < 1 || bh < 1 || x < 0 || y < 0 || x + bw > w || y + bh > h || (long)bw * bh > 1024L * 600) return -1;
      uint8_t *mask = (uint8_t *)malloc((size_t)bw * bh); if (!mask) return -1;
      if (hasf) { if (ring_mask(mask, bw, bh, 4000, radius, 0) < 0) { free(mask); return -1; } for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, fillc); }
      if (hase) { if (ring_mask(mask, bw, bh, 1, radius, 0) < 0) { free(mask); return -1; } for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, edgec); }
      free(mask);
    } else if (nl == 4 && strncmp(name, "oval", 4) == 0 && tok[i].size == 6) {   /* ["oval", x, y, w, h, colour]: a 1 px ellipse outline inside the box (the collection's drop spots); not a focus ring, so it sets no ring flag */
      if (!COL(4)) return -1;
      int x = A(0), y = A(1), bw = A(2), bh = A(3);
      if (g_bad || bw < 1 || bh < 1 || x < 0 || y < 0 || x + bw > w || y + bh > h || (long)bw * bh > 1024L * 600) return -1;
      uint8_t *mask = (uint8_t *)malloc((size_t)bw * bh); if (!mask) return -1;
      if (ring_mask(mask, bw, bh, 1, 0, 1) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else if (nl == 8 && strncmp(name, "rcorners", 8) == 0 && tok[i].size == 7) {   /* ["rcorners", x, y, w, h, radius, colour]: the corners of a w x h box that lie outside its rounded shape, in colour (a square picture seated in a rounded window) */
      if (!COL(5)) return -1;
      int x = A(0), y = A(1), bw = A(2), bh = A(3), radius = A(4);
      if (g_bad || radius < 0 || radius > 4096 || bw < 1 || bh < 1 || x < 0 || y < 0 || x + bw > w || y + bh > h || (long)bw * bh > 1024L * 600) return -1;
      uint8_t *mask = (uint8_t *)malloc((size_t)bw * bh); if (!mask) return -1;
      if (ring_mask(mask, bw, bh, 4000, radius, 0) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (!mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else if (nl == 7 && strncmp(name, "tabRing", 7) == 0 && tok[i].size == 13) {  g_ringdrawn = 1;   /* ["tabRing", x, y, body, width, slant, outside, top, slantTo, bottom, radius, tabTop, colour] */
      if (!COL(11)) return -1;
      int x = A(0), y = A(1); ring_tab_t t = { A(2), A(3), A(4), A(5), A(6), A(7), A(8), A(9), A(10) };
      if (g_bad) return -1;
      { const int *q = &t.body; for (int k = 0; k < 9; k++) if (q[k] < -4096 || q[k] > 4096) return -1; }   /* the products stay far inside int64 */
      uint8_t *mask = (uint8_t *)malloc(1024 * 64); int bw = ring_tab_w(&t), bh = ring_tab_h(&t);
      if (!mask) return -1;
      if (bw < 1 || bh < 1 || bw * bh > 1024 * 64 || x < 0 || y < 0 || x + bw > w || y + bh > h || ring_tab_mask(mask, &t) < 0) { free(mask); return -1; }
      for (int yy = 0; yy < bh; yy++) for (int xx = 0; xx < bw; xx++) if (mask[yy * bw + xx]) put(px, w, h, x + xx, y + yy, rgb);
      free(mask);
    } else if (nl == 9 && strncmp(name, "bayerPick", 9) == 0 && tok[i].size == 10) {   /* ["bayerPick", from, to, level, ox, oy, fsx, fsy, tsx, tsy]: the same pick between two windows of the picture's w x h, `from`'s at (fsx, fsy) and `to`'s at (tsx, tsy) (two cells of an atlas, M1 §2.1); each window lies inside its asset; `from` -1 is clear (a dither-in), `to` -1 is clear (a dither-out: `from` keeps the pixels a dither-in at the same level leaves) */
      static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
      int fh = A(0), th = A(1), level = A(2), ox = A(3), oy = A(4), fsx = A(5), fsy = A(6), tsx = A(7), tsy = A(8);
      if (g_bad || fh < -1 || th < -1 || (fh < 0 && th < 0) || fh >= MAX_ASSET || th >= MAX_ASSET || level < 0 || level > 16 || fsx < 0 || fsy < 0 || tsx < 0 || tsy < 0) return -1;
      const uint8_t *to = th >= 0 ? g_a[th].px : NULL, *from = fh >= 0 ? g_a[fh].px : NULL; static const uint8_t CLEAR[4] = { 0, 0, 0, 0 };
      if (th >= 0 && (!to || tsx + w > g_a[th].w || tsy + h > g_a[th].h)) return -1;
      if (fh >= 0 && (!from || fsx + w > g_a[fh].w || fsy + h > g_a[fh].h)) return -1;
      int tw = th >= 0 ? g_a[th].w : 0, fw = fh >= 0 ? g_a[fh].w : 0;
      for (int yy = 0; yy < h; yy++) for (int xx = 0; xx < w; xx++) { const int pick = BAYER[((oy + yy) & 3) * 4 + ((ox + xx) & 3)] < level;
        memcpy(px + (yy * w + xx) * 4, pick ? (to ? to + ((tsy + yy) * tw + tsx + xx) * 4 : CLEAR) : from ? from + ((fsy + yy) * fw + fsx + xx) * 4 : CLEAR, 4); }
    } else if (nl == 9 && strncmp(name, "bayerPick", 9) == 0 && tok[i].size == 6) {   /* ["bayerPick", from, to, level, ox, oy]: the picture of asset `to` where BAYER[((oy + y) & 3) * 4 + ((ox + x) & 3)] < level (0..16), else that of asset `from`: whole pixels, no blend (lvgl-switch.md §2.7). Both are the picture's own size. */
      static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
      int fh = A(0), th = A(1), level = A(2), ox = A(3), oy = A(4);
      if (g_bad || fh < 0 || th < 0 || fh >= MAX_ASSET || th >= MAX_ASSET || level < 0 || level > 16) return -1;
      const uint8_t *from = g_a[fh].px, *to = g_a[th].px; if (!from || !to || g_a[fh].w != w || g_a[fh].h != h || g_a[th].w != w || g_a[th].h != h) return -1;
      for (int yy = 0; yy < h; yy++) for (int xx = 0; xx < w; xx++) memcpy(px + (yy * w + xx) * 4, (BAYER[((oy + yy) & 3) * 4 + ((ox + xx) & 3)] < level ? to : from) + (yy * w + xx) * 4, 4);
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
  g_a[handle].px = (uint8_t *)calloc((size_t)w * h, 4); g_a[handle].w = w; g_a[handle].h = h; g_a[handle].view_key = 0; touched(&g_a[handle]);
  if (!g_a[handle].px) return NULL;
  dsc_of(&g_a[handle].dsc, g_a[handle].px, w, h, w * 4);
  return g_a[handle].px;
}
/* Read-only queries on two held pictures of one size, in integers (fix 5 Create C8; the roll's gate): the bounding box of the pixels that are clear (alpha 0) in one and not the other (the silhouette box), or of the pixels that differ (alpha differs, or neither is clear
   and the colour differs: the change box). 0 with out = x, y, w, h (all 0 when there is none); -1 for an empty slot, a handle out of range or pictures of different sizes. No allocation; not a node kind, an op or a word. */
static int box_of(int fh, int th, int out[4], int diff) {
  out[0] = out[1] = out[2] = out[3] = 0;
  if (fh < 0 || th < 0 || fh >= MAX_ASSET || th >= MAX_ASSET) return -1;
  const uint8_t *a = g_a[fh].px, *b = g_a[th].px; if (!a || !b) return -1;
  int w = g_a[fh].w, h = g_a[fh].h; if (w != g_a[th].w || h != g_a[th].h) return -1;
  int x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
    const uint8_t *p = a + (y * w + x) * 4, *q = b + (y * w + x) * 4; int ca = p[3] == 0, cb = q[3] == 0, hit;
    if (!diff) hit = ca != cb; else hit = p[3] != q[3] || (!ca && (p[0] != q[0] || p[1] != q[1] || p[2] != q[2]));
    if (hit) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 >= 0) { out[0] = x0; out[1] = y0; out[2] = x1 - x0 + 1; out[3] = y1 - y0 + 1; }
  return 0;
}
int prim_asset_size(int handle, int out[2]) { out[0] = out[1] = 0; if (handle < 0 || handle >= MAX_ASSET + MAX_SRC + 1 || !g_a[handle].px) return -1; out[0] = g_a[handle].w; out[1] = g_a[handle].h; return 0; }
int prim_asset_box(int handle, int out[4]) {
  out[0] = out[1] = out[2] = out[3] = 0; if (handle < 0 || handle >= MAX_ASSET + MAX_SRC + 1 || !g_a[handle].px) return -1;
  const uint8_t *a = g_a[handle].px; int w = g_a[handle].w, h = g_a[handle].h, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 >= 0) { out[0] = x0; out[1] = y0; out[2] = x1 - x0 + 1; out[3] = y1 - y0 + 1; }
  return 0;
}
/* The solid-ink box of a w x h window at (sx, sy) of a picture (C9): the span of the columns and the span of the rows that hold at least 3 pixels of alpha >= 128, as x, y, w, h in the window (all 0 when
   none); *cut (when not NULL) is 1 when a pixel of alpha >= 128 lies on the row or the column just outside the window and inside the picture: the window cuts solid ink. -1 when the counts cannot be held. */
static int solid_of(const asset_t *s, int sx, int sy, int w, int h, int out[4], int *cut) {
  out[0] = out[1] = out[2] = out[3] = 0; if (cut) *cut = 0;
  int *cols = (int *)calloc((size_t)w, sizeof *cols); if (!cols) return -1;
  int y0 = -1, y1 = -1;
  for (int y = 0; y < h; y++) { const uint8_t *row = s->px + ((size_t)(sy + y) * s->w + sx) * 4; int k = 0;
    for (int x = 0; x < w; x++) if (row[x * 4 + 3] >= 128) { k++; cols[x]++; }
    if (k >= 3) { if (y0 < 0) y0 = y; y1 = y; } }
  int x0 = -1, x1 = -1; for (int x = 0; x < w; x++) if (cols[x] >= 3) { if (x0 < 0) x0 = x; x1 = x; }
  free(cols);
  if (x0 >= 0 && y0 >= 0) { out[0] = x0; out[1] = y0; out[2] = x1 - x0 + 1; out[3] = y1 - y0 + 1; }
  if (cut) {
    const int ys[2] = { sy - 1, sy + h }, xs[2] = { sx - 1, sx + w };
    for (int k = 0; k < 2 && !*cut; k++) { if (ys[k] < 0 || ys[k] >= s->h) continue; for (int x = sx; x < sx + w; x++) if (s->px[((size_t)ys[k] * s->w + x) * 4 + 3] >= 128) { *cut = 1; break; } }
    for (int k = 0; k < 2 && !*cut; k++) { if (xs[k] < 0 || xs[k] >= s->w) continue; for (int y = sy; y < sy + h; y++) if (s->px[((size_t)y * s->w + xs[k]) * 4 + 3] >= 128) { *cut = 1; break; } }
  }
  return 0;
}
int prim_asset_solid_box(int handle, int out[4]) {
  out[0] = out[1] = out[2] = out[3] = 0; if (handle < 0 || handle >= MAX_ASSET + MAX_SRC + 1 || !g_a[handle].px) return -1;
  asset_t *s = &g_a[handle]; if (!s->solid_ok) { if (solid_of(s, 0, 0, s->w, s->h, s->solid, NULL) < 0) return -1; s->solid_ok = 1; }
  memcpy(out, s->solid, sizeof s->solid); return 0;
}
int prim_asset_alpha_box(int fh, int th, int out[4]) { return box_of(fh, th, out, 0); }
int prim_asset_diff_box(int fh, int th, int out[4]) { return box_of(fh, th, out, 1); }
int prim_asset_feet(int handle, int alpha, int rows, int out[3]) {
  out[0] = out[1] = out[2] = 0; if (handle < 0 || handle >= MAX_ASSET || !g_a[handle].px) return -1;
  const uint8_t *a = g_a[handle].px; int w = g_a[handle].w, h = g_a[handle].h, row = -1;
  for (int y = h - 1; y >= 0 && row < 0; y--) for (int x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] >= alpha) { row = y; break; }
  if (row < 0) return -1;
  int x0 = w, x1 = -1; for (int y = row; y > row - rows && y >= 0; y--) for (int x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] >= alpha) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  out[0] = row; out[1] = x0; out[2] = x1; return 0;
}
/* the layer a picture shows on, its asset's own (the host's policy: art or painted); a composed source has none and takes its node's */
int prim_asset_layer_of(int handle) { return handle >= 0 && handle < MAX_ASSET && g_a[handle].layer ? g_a[handle].layer : LAYER_ART; }
void prim_asset_layer(int handle, int layer) { if (handle >= 0 && handle < MAX_ASSET) g_a[handle].layer = layer; }
void prim_asset_free(int handle) { if (handle < 0 || handle >= MAX_ASSET) return; free(g_a[handle].px); memset(&g_a[handle], 0, sizeof g_a[handle]); }
/* A face-owned source picture from composed ops (w x h), cached by the ops' hash: the same ops are the same picture, kept once. A handle for a nine-slice or a sprite, or -1 when refused or the table is full. */
int prim_source(const char *ops, int w, int h) {
  if (w <= 0 || h <= 0 || (long)w * h > 256 * 256) return -1;
  uint32_t key = hash_str(ops) ^ ((uint32_t)w * 40503u) ^ ((uint32_t)h * 9973u); if (!key) key = 1;
  int free_slot = -1;
  for (int i = MAX_ASSET; i < MAX_ASSET + MAX_SRC; i++) { if (g_a[i].px && g_a[i].src_key == key && g_a[i].w == w && g_a[i].h == h) return i; if (!g_a[i].px && free_slot < 0) free_slot = i; }
  if (free_slot < 0) return -1;
  asset_t *s = &g_a[free_slot]; s->px = (uint8_t *)calloc((size_t)w * h, 4); touched(s); if (!s->px) return -1;
  if (prim_compose(s->px, w, h, ops) < 0) { free(s->px); s->px = NULL; return -1; }
  s->w = w; s->h = h; s->src_key = key; s->ring = g_ringdrawn; s->view_key = 0; dsc_of(&s->dsc, s->px, w, h, w * 4); return free_slot;
}
/* The framebuffer rect (x, y, w, h) as the screen's objects draw it now, copied into the face's one snapshot picture (lv_snapshot): the Incubate panel's right window shows Create as it stood when it was left. Returns the picture's handle, or -1 (a rect outside the screen, no memory). A later call replaces the picture; prim_snapshot_free releases it. */
static char g_snap_js[65536]; static int g_snap_len = -1, g_snap_from[4];   /* the snapshot's source nodes (the log's entries, cut to its rect) as they were when it was taken, and that rect; -1: none */
static node_t *find_node(uint32_t id);
static int node_json(char *buf, int cap, int *pn, node_t *nd, const int *cut, int first);
static void snap_record(int x, int y, int w, int h) {   /* the screen's nodes now, cut to the snapshot's rect, for the log (log.snapshot): log only, no pixel */
  int n = 0, first = 1, cut[4] = { x, y, w, h }; g_snap_len = -1; lv_obj_update_layout(lv_screen_active());
  for (int k = 0; k < g_nseq; k++) { node_t *nd = find_node(g_seq[k]); if (!nd || !nd->seen) continue; int r = node_json(g_snap_js, (int)sizeof g_snap_js, &n, nd, cut, first); if (r < 0) return; if (r) first = 0; }
  g_snap_len = n; memcpy(g_snap_from, cut, sizeof cut);
}
int prim_snapshot(int x, int y, int w, int h) {
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1024 || y + h > 600) return -1;
  lv_draw_buf_t *b = lv_snapshot_take(lv_screen_active(), LV_COLOR_FORMAT_ARGB8888); if (!b) return -1;
  asset_t *s = &g_a[SNAP_SLOT]; free(s->px); s->px = (uint8_t *)calloc((size_t)w * h, 4); touched(s);
  if (!s->px) { lv_draw_buf_destroy(b); return -1; }
  const uint8_t *src = (const uint8_t *)b->data; const uint32_t stride = b->header.stride;
  for (int yy = 0; yy < h; yy++) memcpy(s->px + (size_t)yy * w * 4, src + (size_t)(y + yy) * stride + (size_t)x * 4, (size_t)w * 4);
  lv_draw_buf_destroy(b);
  s->w = w; s->h = h; s->layer = LAYER_PAINTED; s->view_key = 0; dsc_of(&s->dsc, s->px, w, h, w * 4); snap_record(x, y, w, h); return SNAP_SLOT;
}
void prim_snapshot_free(void) { asset_t *s = &g_a[SNAP_SLOT]; free(s->px); memset(s, 0, sizeof *s); g_snap_len = -1; }
int prim_snapshot_handle(void) { return g_a[SNAP_SLOT].px ? SNAP_SLOT : -1; }
uint8_t *prim_asset_ptr(int handle) { if (handle < 0 || handle >= MAX_ASSET) return NULL; touched(&g_a[handle]); return g_a[handle].px; }   /* the caller may write the pixels: the log's ink and solid boxes are taken again */
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
/* A new object is sized and placed at its parent's origin, and LVGL invalidates there (lv_obj_class_init_obj, lv_obj_refr_size, lv_obj_refr_pos): a real redraw of a box nobody sees. A root node is therefore made on an unloaded screen of the display's size, given its place and size there, and moved onto the active screen at the end of the frame. */
static lv_obj_t *nursery(void) {
  if (!g_nursery) { lv_display_t *d = lv_display_get_default(); g_nursery = lv_obj_create(NULL); lv_obj_remove_style_all(g_nursery); lv_obj_set_size(g_nursery, lv_display_get_horizontal_resolution(d), lv_display_get_vertical_resolution(d)); }
  return g_nursery;
}
static node_t *find_node(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return &g_o[i]; return NULL; }
#ifdef FACE_NODE_API
/* a node's box as the scene holds it (the test build's per-part region check): its kind, or -1 when no node has the id */
int prim_node_opa(uint32_t id) { node_t *n = find_node(id); return n ? n->opa : -1; }   /* a sprite node's opacity (-1 when no node has the id) */
int prim_node_box(uint32_t id, int out[4]) { node_t *n = find_node(id); if (!n) return -1; out[0] = n->x; out[1] = n->y; out[2] = n->w; out[3] = n->h; return n->kind; }
#endif
static int find(uint32_t id) { for (int i = 0; i < g_n; i++) if (g_o[i].id == id) return i; return -1; }
static lv_obj_t *make(node_t *n, int a, lv_obj_t *parent) {
  lv_obj_t *o;
  if (n->kind == FN_TEXT) { o = lv_label_create(parent); plain(o); lv_label_set_long_mode(o, LV_LABEL_LONG_MODE_CLIP); lv_obj_set_style_text_font(o, font_of(a), 0); }
  else if (n->kind == FN_SPRITE || n->kind == FN_COMPOSED) { o = lv_image_create(parent); plain(o); }
  else if (n->kind == FN_NINE && n->ringed) {   /* a ring: eight strips on the parent, no container that would invalidate the box it encloses (they are made on the nursery with the node and join its screen together) */
    for (int i = 0; i < RING_PARTS; i++) { n->rp[i] = lv_image_create(parent); plain(n->rp[i]); lv_image_set_inner_align(n->rp[i], LV_IMAGE_ALIGN_TILE); }
    o = n->rp[0];
  } else if (n->kind == FN_NINE) {
    o = lv_obj_create(parent); plain(o);
    for (int i = 0; i < NINE_PARTS; i++) { n->part[i] = lv_image_create(o); plain(n->part[i]); lv_image_set_inner_align(n->part[i], LV_IMAGE_ALIGN_TILE); }
  } else { o = lv_obj_create(parent); plain(o); }   /* a rectangle, or a clip: an object whose bounds cut its children (LVGL's default) */
  return o;
}
/* The node moved into a removed node's place keeps its image pointing at its own descriptor: a composed picture's `cdsc` and a cropped sprite's `crop` live in the node, and the node has moved. */
static void remove_at(int i) {
  if (g_o[i].ringed) for (int k = 0; k < RING_PARTS; k++) lv_obj_delete(g_o[i].rp[k]); else lv_obj_delete(g_o[i].obj);
  free(g_o[i].composed);
  int last = --g_n; if (i == last) return;
  g_o[i] = g_o[last]; node_t *m = &g_o[i];
  if (m->kind == FN_COMPOSED && m->composed) lv_image_set_src(m->obj, &m->cdsc);
  else if (m->kind == FN_SPRITE && m->rgb != 0) lv_image_set_src(m->obj, &m->crop);
}
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
static void show(node_t *n) { int hide = n->layer > (g_pass >= 3 ? LAYER_TYPE : g_pass - 1) || (g_hide >= 0 && n->region == g_hide); if (n->ringed) for (int k = 0; k < RING_PARTS; k++) lv_obj_set_hidden(n->rp[k], hide); else lv_obj_set_hidden(n->obj, hide); }   /* pass 1 shows chrome, 2 adds art, 3 everything */
void prim_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b) {
  /* the clip's bookkeeping comes first: a node sent while a clip is open counts against it whether or not it is drawn, so a refused child never leaves the next root node inside the clip;
     a refused clip refuses the children it announced. A clip does not hold a clip. */
  uint32_t parent = 0; lv_obj_t *pobj = lv_screen_active(); int ox = 0, oy = 0, in_clip = 0;
#define REFUSE() do { g_unknown++; if (kind == FN_CLIP && !in_clip) { g_clip_left = a > 0 ? a : 0; g_clip_id = 0; } if (kind == FN_TEXT) { g_trole[0] = 0; g_tground[0] = 0; } if (kind == FN_SPRITE) g_sopa = 255; return; } while (0)
  if (g_clip_left > 0) {
    in_clip = 1; g_clip_left--;
    node_t *c = g_clip_id ? find_node(g_clip_id) : NULL;
    if (kind == FN_CLIP || !c) REFUSE();
    parent = g_clip_id; pobj = c->obj; (void)pobj; ox = g_clip_x; oy = g_clip_y;
  }
  if (kind < FN_RECT || kind > FN_COMPOSED) REFUSE();
  if (w < 0 || h < 0) REFUSE();   /* a size is never negative: a node with no size is a slot kept for a step that has not come (0 by 0) */
  if (kind == FN_TEXT && !font_of(a)) REFUSE();
  int sx = (int)(rgb >> 16), sy = (int)(rgb & 0xffff);
  if (kind == FN_SPRITE && (a < 0 || a >= MAX_ASSET + MAX_SRC + 1 || !g_a[a].px || (rgb == 0 ? (g_a[a].w != w || g_a[a].h != h) : (sx + w > g_a[a].w || sy + h > g_a[a].h)))) REFUSE();
  int nl = (int)(rgb >> 24), nt = (int)((rgb >> 16) & 255), nr = (int)((rgb >> 8) & 255), nb = (int)(rgb & 255);   /* a nine-slice: its insets l, t, r, b in rgb, its tile in b */
  if (kind == FN_NINE && (a < 0 || a >= MAX_ASSET + MAX_SRC || !g_a[a].px || g_a[a].w <= nl + nr || g_a[a].h <= nt + nb || w < nl + nr || h < nt + nb)) REFUSE();
  if (kind == FN_COMPOSED && ((long)w * h > 1024L * 600 || ((w == 0 || h == 0) && strcmp(g_ops, "[]") != 0))) REFUSE();   /* a composed node of no size is a slot (ops []): no picture */
  int want_ring = kind == FN_NINE && !parent && a >= 0 && a < MAX_ASSET + MAX_SRC && g_a[a].ring;   /* a ring's nine-slice is built as eight strips (RING_PARTS) */
  int i = find(id);
  if (i >= 0 && (g_o[i].kind != kind || g_o[i].parent != parent || (kind == FN_NINE && g_o[i].ringed != want_ring))) { drop(i); i = -1; }
  if (i < 0) {
    if (g_n >= MAX_OBJ) REFUSE();
    i = g_n++; memset(&g_o[i], 0, sizeof g_o[i]); g_o[i].id = id; g_o[i].opa = 255; g_o[i].kind = kind; g_o[i].parent = parent; g_o[i].fresh = 1; g_o[i].born = 1; g_o[i].ringed = want_ring; g_o[i].obj = make(&g_o[i], a, nursery());   /* a clip's child too: made on the nursery and moved into its clip at the end of the frame, so its birth invalidates nothing at the clip's origin */
  }
  node_t *n = &g_o[i]; lv_obj_t *o = n->obj; n->seen = 1; g_seq[g_nseq++] = id; n->layer = g_layer; n->region = g_region; n->run = g_run; n->hold = g_hold;
  if ((kind == FN_SPRITE || kind == FN_NINE) && a >= 0 && a < MAX_ASSET && g_a[a].layer) n->layer = g_a[a].layer;   /* a picture takes its layer from its asset (lvgl-switch.md §2.1); words choose a layer only for rects, text and composed pictures */
  if (kind == FN_SPRITE) { int opa = g_sopa; g_sopa = 255; if (n->fresh || n->opa != opa) { lv_obj_set_style_image_opa(o, (lv_opa_t)opa, 0); n->opa = opa; } }   /* the opacity is the next sprite node's only */
  int px = x - ox, py = y - oy;
  if (kind == FN_TEXT) {
    snprintf(n->role, sizeof n->role, "%s", g_trole); snprintf(n->ground, sizeof n->ground, "%s", g_tground); g_trole[0] = 0; g_tground[0] = 0;   /* the tag is the next text node's only */
    /* the label's top is the line's top; the page gives the cap top. The baseline sits (line height - base line) below the line's top. */
    const lv_font_t *f = font_of(a); py = py + b - (f->line_height - f->base_line);
    if (strcmp(lv_label_get_text(o), g_text) != 0) lv_label_set_text(o, g_text);
    if (n->a != a) lv_obj_set_style_text_font(o, f, 0);
  }
  if (!n->ringed && (n->fresh || n->x != px || n->y != py)) { if (n->born && in_clip) lv_obj_set_pos(o, x, y); else lv_obj_set_pos(o, px, py); }   /* a clip's child born this frame stands on the nursery at its screen place, so moving it into its clip invalidates its own box, not the box at its clip-relative place */
  if (!n->ringed && (n->fresh || n->w != w || n->h != h)) {
    if (kind == FN_TEXT) lv_obj_set_size(o, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
    else lv_obj_set_size(o, w, h);
  }
  if (kind == FN_NINE && n->ringed && (n->fresh || n->x != px || n->y != py || n->w != w || n->h != h || n->a != a || n->b != b || n->rgb != rgb)) {
    asset_t *s = &g_a[a]; views_of(s, nl, nt, nr, nb, b);
    const int xs[3] = { 0, nl, w - nr }, ys[3] = { 0, nt, h - nb }, ws[3] = { nl, w - nl - nr, nr }, hs[3] = { nt, h - nt - nb, nb };
    for (int q = 0; q < RING_PARTS; q++) { int j = RING_JK[q][0], k = RING_JK[q][1]; lv_obj_t *p = n->rp[q]; lv_image_set_src(p, &s->view[j * 3 + k]);
      lv_obj_set_pos(p, px + xs[k], py + ys[j]); lv_obj_set_size(p, ws[k] > 0 ? ws[k] : 1, hs[j] > 0 ? hs[j] : 1); }
  }
  if (kind == FN_NINE && !n->ringed && (n->fresh || n->w != w || n->h != h || n->a != a || n->b != b || n->rgb != rgb)) {
    asset_t *s = &g_a[a]; views_of(s, nl, nt, nr, nb, b);
    const int xs[3] = { 0, nl, w - nr }, ys[3] = { 0, nt, h - nb }, ws[3] = { nl, w - nl - nr, nr }, hs[3] = { nt, h - nt - nb, nb };
    for (int j = 0; j < 3; j++) for (int k = 0; k < 3; k++) {
      lv_obj_t *p = n->part[j * 3 + k]; lv_image_set_src(p, &s->view[j * 3 + k]);
      lv_obj_set_pos(p, xs[k], ys[j]); lv_obj_set_size(p, ws[k] > 0 ? ws[k] : 1, hs[j] > 0 ? hs[j] : 1);
    }
  }
  if (kind == FN_COMPOSED) {   /* the ops are drawn into the picture's own pixels again only when they or its size change */
    uint32_t oh = hash_str(g_ops) ^ ((uint32_t)w * 40503u) ^ ((uint32_t)h * 9973u);
    if ((n->fresh || n->ops_hash != oh) && (w == 0 || h == 0)) { free(n->composed); n->composed = NULL; n->ring = 0; n->dd = 0; lv_image_set_src(o, NULL); lv_obj_invalidate(o); n->ops_hash = oh; }   /* a slot: no pixels kept */
    else if (n->fresh || n->ops_hash != oh) {
      if (n->w != w || n->h != h || !n->composed) { free(n->composed); n->composed = (uint8_t *)calloc((size_t)w * h, 4); }
      else memset(n->composed, 0, (size_t)w * h * 4);
      if (!n->composed || prim_compose(n->composed, w, h, g_ops) < 0) { g_unknown++; if (n->composed) memset(n->composed, 0, (size_t)w * h * 4); }
      n->ring = g_ringdrawn; n->dd = g_dashdot;
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
/* lv_obj_move_to_index without its whole-parent invalidation: only where the object and the siblings it passes overlap is redrawn (the picture of two
   residents that cross in depth is redrawn where they meet, nowhere else) */
static void move_to(lv_obj_t *obj, int32_t idx) {
  lv_obj_t *par = lv_obj_get_parent(obj); if (!par) return;
  int32_t old = (int32_t)lv_obj_get_index(obj), cnt = (int32_t)lv_obj_get_child_count(par);
  if (idx < 0 || idx >= cnt || idx == old) return;
  lv_obj_update_layout(obj);
  int32_t lo = idx < old ? idx : old, hi = idx < old ? old : idx;
  for (int32_t i = lo; i <= hi; i++) {
    lv_obj_t *s = par->spec_attr->children[i]; lv_area_t a;
    if (s != obj && lv_area_intersect(&a, &obj->coords, &s->coords)) lv_obj_invalidate_area(par, &a);
  }
  if (idx < old) for (int32_t i = old; i > idx; i--) par->spec_attr->children[i] = par->spec_attr->children[i - 1];
  else for (int32_t i = old; i < idx; i++) par->spec_attr->children[i] = par->spec_attr->children[i + 1];
  par->spec_attr->children[idx] = obj;
  lv_obj_send_event(par, LV_EVENT_CHILD_CHANGED, NULL);
}
void prim_end(void) {
  for (int again = 1; again;) { again = 0; for (int i = 0; i < g_n; i++) if (!g_o[i].seen) { drop(i); again = 1; break; } }
  { int any = 0; for (int i = 0; i < g_n; i++) if (g_o[i].born) any = 1;   /* the new root nodes have their places and sizes: they join the screen, and only now is anything invalidated */
    if (any) { lv_obj_update_layout(nursery()); for (int i = 0; i < g_n; i++) if (g_o[i].born) { node_t *c = g_o[i].parent ? find_node(g_o[i].parent) : NULL; if (g_o[i].ringed) { for (int k = 0; k < RING_PARTS; k++) lv_obj_set_parent(g_o[i].rp[k], lv_screen_active()); } else { lv_obj_set_parent(g_o[i].obj, c ? c->obj : lv_screen_active()); if (c) lv_obj_set_pos(g_o[i].obj, g_o[i].x, g_o[i].y); } g_o[i].born = 0; } } }
  /* draw order is child order: put each object at its place in the sequence the page sent, among its siblings (the screen's, or its clip's) */
  int root = 0; for (int i = 0; i < g_n; i++) g_o[i].child_k = 0;
  for (int k = 0; k < g_nseq; k++) {
    node_t *n = find_node(g_seq[k]); if (!n) continue;
    int idx;
    if (n->parent) { node_t *c = find_node(n->parent); if (!c) continue; idx = c->child_k++; } else idx = root++;
    /* a nine-slice's own parts are not siblings: they are not in the sequence; a ring's eight strips are: they sit together at the node's place, in order */
    if (n->ringed) { for (int q = 0; q < RING_PARTS; q++) if ((int)lv_obj_get_index(n->rp[q]) != idx + q) move_to(n->rp[q], idx + q); root += n->parent ? 0 : RING_PARTS - 1; }
    else if ((int)lv_obj_get_index(n->obj) != idx) move_to(n->obj, idx);
  }
}

/* ---- test mode: the passes and the logs ---- */
void prim_set_hide(const char *region) {   /* test mode: hide every node of a region (NULL or "": none), as a layer is hidden by a pass */
  g_hide = -1; if (region && *region) for (int i = 1; i < g_nreg; i++) if (strncmp(g_reg[i], region, sizeof g_reg[0] - 1) == 0) { g_hide = i; break; }
  for (int i = 0; i < g_n; i++) show(&g_o[i]);
  lv_obj_invalidate(lv_screen_active());
}
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
static const char *v_fmt_ring(char *b, size_t n, int k) { snprintf(b, n, ",\"%s\":%d", "ring", k); return b; }   /* the entry's count of shown nodes holding a ring op (fix 14 rule 1) */
static const char *v_fmt_hold(char *b, size_t n, int k) { snprintf(b, n, ",\"%s\":%d", "hold", k); return b; }   /* the entry's count of shown hold marks (prim_hold): a ring op that is not the focus ring */
/* a composed node whose dash or dot ops left a closed box: each of its four bounding edges is at least half covered (fix 14 rule 4: the focus ring is the one outline) */
static int closed_box(const node_t *nd) {
  int w = nd->w, h = nd->h; if (w < 3 || h < 3) return 0; const uint8_t *px = nd->composed; int top = 0, bot = 0, lft = 0, rgt = 0;
  for (int x = 0; x < w; x++) { if (px[x * 4 + 3]) top++; if (px[((h - 1) * w + x) * 4 + 3]) bot++; }
  for (int y = 0; y < h; y++) { if (px[(y * w) * 4 + 3]) lft++; if (px[(y * w + w - 1) * 4 + 3]) rgt++; }
  return 2 * top >= w && 2 * bot >= w && 2 * lft >= h && 2 * rgt >= h;
}
/* A box x, y, w, h cut to the rect [x0, x1) x [y0, y1): w and h 0 when nothing is left. */
static void cut_box(int b[4], int x0, int y0, int x1, int y1) {
  int jx = b[0] > x0 ? b[0] : x0, jy = b[1] > y0 ? b[1] : y0, kx = b[0] + b[2] < x1 ? b[0] + b[2] : x1, ky = b[1] + b[3] < y1 ? b[1] + b[3] : y1;
  if (b[2] > 0 && b[3] > 0 && kx > jx && ky > jy) { b[0] = jx; b[1] = jy; b[2] = kx - jx; b[3] = ky - jy; } else { b[2] = 0; b[3] = 0; }
}
/* One node's entry of the log's node list: [id, kind, layer, region, x, y, w, h, flags, ink x, y, w, h, run, solid x, y, w, h]. The box on the screen (a clip's child cut to its clip; `cut`, when not NULL,
   cuts it further to that rect x, y, w, h: the snapshot's source rect). Flags: 1 a ring (a composed ring op, or a nine-slice or sprite of a ring source), 2 inside a clip, 4 a hold mark (prim_hold: not a ring),
   8 a window of a larger picture (a sprite with a source origin), 16 that window cuts solid ink (a pixel of alpha >= 128 on the source row or column just outside it), 32 composed content (the face's snapshot).
   Then the run (prim_run). The ink is a picture's (a sprite shown whole) box of pixels with alpha above 0 on the screen, else the box. The solid box (C9): a sprite's solid ink (prim_asset_solid_box, or a
   window's own rows and columns), a text's advance x cap top to baseline, any other node's box. 1 when written, 0 when the node shows nothing (there), -1 when buf is full. */
static int node_json(char *buf, int cap, int *pn, node_t *nd, const int *cut, int first) {
  int n = *pn;
  int ax = nd->x, ay = nd->y, aw = nd->kind == FN_TEXT ? (int)lv_obj_get_width(nd->obj) : nd->w, ah = nd->kind == FN_TEXT ? (int)lv_obj_get_height(nd->obj) : nd->h; node_t *c = nd->parent ? find_node(nd->parent) : NULL;
  if (nd->kind == FN_TEXT && !lv_label_get_text(nd->obj)[0]) return 0;
  if (aw <= 0 || ah <= 0) return 0;
  int ox = c ? c->x : 0, oy = c ? c->y : 0; ax += ox; ay += oy;
  int ex = ax + aw, ey = ay + ah; if (c) { if (ax < c->x) ax = c->x; if (ay < c->y) ay = c->y; if (ex > c->x + c->w) ex = c->x + c->w; if (ey > c->y + c->h) ey = c->y + c->h; if (ex <= ax || ey <= ay) return 0; }
  if (cut) { if (ax < cut[0]) ax = cut[0]; if (ay < cut[1]) ay = cut[1]; if (ex > cut[0] + cut[2]) ex = cut[0] + cut[2]; if (ey > cut[1] + cut[3]) ey = cut[1] + cut[3]; if (ex <= ax || ey <= ay) return 0; }
  int ring = !nd->hold && ((nd->kind == FN_COMPOSED && nd->ring) || ((nd->kind == FN_NINE || nd->kind == FN_SPRITE) && nd->a >= 0 && nd->a < MAX_ASSET + MAX_SRC && g_a[nd->a].ring));
  int flags = ring | (c ? 2 : 0) | (nd->hold ? 4 : 0);
  int ink[4] = { ax, ay, ex - ax, ey - ay }, solid[4] = { ax, ay, ex - ax, ey - ay };
  int pic = nd->kind == FN_SPRITE && nd->a >= 0 && nd->a < MAX_ASSET + MAX_SRC + 1 && g_a[nd->a].px;
  if (pic && nd->rgb == 0) {   /* a picture shown whole: its pixels' box (a window of a larger picture keeps its box) */
    asset_t *s = &g_a[nd->a]; if (!s->ink_ok) { prim_asset_box(nd->a, s->ink); s->ink_ok = 1; }
    int ix = nd->x + ox + s->ink[0], iy = nd->y + oy + s->ink[1], iw = s->ink[2], ih = s->ink[3];
    int jx = ix > ax ? ix : ax, jy = iy > ay ? iy : ay, kx = ix + iw < ex ? ix + iw : ex, ky = iy + ih < ey ? iy + ih : ey;
    if (iw > 0 && kx > jx && ky > jy) { ink[0] = jx; ink[1] = jy; ink[2] = kx - jx; ink[3] = ky - jy; } else { ink[2] = 0; ink[3] = 0; }
    int sb[4]; prim_asset_solid_box(nd->a, sb); solid[0] = nd->x + ox + sb[0]; solid[1] = nd->y + oy + sb[1]; solid[2] = sb[2]; solid[3] = sb[3]; cut_box(solid, ax, ay, ex, ey);
  } else if (pic) {   /* a window of a larger picture at source (sx, sy): its own solid rows and columns, and whether it cuts solid ink, kept for the picture's gen and the window */
    asset_t *s = &g_a[nd->a]; int sx = (int)(nd->rgb >> 16), sy = (int)(nd->rgb & 0xffff);
    if (nd->win_gen != s->gen || nd->win_key[0] != sx || nd->win_key[1] != sy || nd->win_key[2] != nd->w || nd->win_key[3] != nd->h) {
      if (solid_of(s, sx, sy, nd->w, nd->h, nd->win_solid, &nd->win_cut) < 0) { nd->win_solid[2] = nd->win_solid[3] = 0; nd->win_cut = 0; }
      nd->win_gen = s->gen; nd->win_key[0] = sx; nd->win_key[1] = sy; nd->win_key[2] = nd->w; nd->win_key[3] = nd->h;
    }
    flags |= 8 | (nd->win_cut ? 16 : 0);
    solid[0] = nd->x + ox + nd->win_solid[0]; solid[1] = nd->y + oy + nd->win_solid[1]; solid[2] = nd->win_solid[2]; solid[3] = nd->win_solid[3]; cut_box(solid, ax, ay, ex, ey);
  } else if (nd->kind == FN_TEXT) {   /* the advance (the label's width) by the cap top to the baseline */
    const lv_font_t *f = font_of(nd->a); solid[0] = nd->x + ox; solid[1] = nd->y + oy - nd->b + (f ? f->line_height - f->base_line : 0); solid[2] = aw; solid[3] = nd->b; cut_box(solid, ax, ay, ex, ey);
  }
  if (pic && nd->a == SNAP_SLOT) flags |= 32;
  if (cut) cut_box(ink, ax, ay, ex, ey);
#define NPUT(...) do { int w_ = snprintf(buf + n, (size_t)(cap - n), __VA_ARGS__); if (w_ < 0 || n + w_ >= cap) return -1; n += w_; } while (0)
  NPUT("%s[%u,%d,%d,", first ? "" : ",", (unsigned)nd->id, nd->kind, nd->layer); if (!jstr(buf, cap, &n, g_reg[nd->region])) return -1;
  NPUT(",%d,%d,%d,%d,%d,%d,%d,%d,%d,%u,%d,%d,%d,%d]", ax, ay, ex - ax, ey - ay, flags, ink[0], ink[1], ink[2], ink[3], (unsigned)nd->run, solid[0], solid[1], solid[2], solid[3]);
#undef NPUT
  *pn = n; return 1;
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
    int x0 = 1 << 30, y0 = 1 << 30, x1 = -(1 << 30), y1 = -(1 << 30), any = 0, ring = 0, hold = 0, box = 0; char rb[24], hb[24];
    for (int i = 0; i < g_n; i++) {
      node_t *nd = &g_o[i]; if (!nd->seen || nd->region != r || nd->layer != l || nd->kind == FN_CLIP) continue;
      if (nd->kind == FN_TEXT ? lv_obj_get_width(nd->obj) == 0 : (nd->w == 0 || nd->h == 0)) continue;   /* a node with no size is a slot kept for a step that has not come (§2.2): it draws nothing and is not in its region */
      int ax = nd->x, ay = nd->y; node_t *c = nd->parent ? find_node(nd->parent) : NULL; if (c) { ax += c->x; ay += c->y; }
      int ex = ax + (nd->kind == FN_TEXT ? lv_obj_get_width(nd->obj) : nd->w), ey = ay + (nd->kind == FN_TEXT ? lv_obj_get_height(nd->obj) : nd->h);
      if (c) { if (ax < c->x) ax = c->x; if (ay < c->y) ay = c->y; if (ex > c->x + c->w) ex = c->x + c->w; if (ey > c->y + c->h) ey = c->y + c->h; if (ex <= ax || ey <= ay) continue; }   /* a clip's child counts only where the clip shows it */
      if (ax < x0) x0 = ax; if (ay < y0) y0 = ay; if (ex > x1) x1 = ex; if (ey > y1) y1 = ey; any = 1; if (nd->hold) hold++; else if ((nd->kind == FN_COMPOSED && nd->ring) || ((nd->kind == FN_NINE || nd->kind == FN_SPRITE) && nd->a >= 0 && nd->a < MAX_ASSET + MAX_SRC && g_a[nd->a].ring)) ring++;   /* a nine-slice or a sprite of a face-owned source composed with a ring op counts */ if (nd->kind == FN_COMPOSED && nd->dd && nd->composed && closed_box(nd)) box = 1;
    }
    if (!any) continue;
    PUT("%s{\"id\":", first ? "" : ","); STR(g_reg[r]); PUT(",\"layer\":\"%s\",\"rect\":[%d,%d,%d,%d]%s%s%s}", LAYERS[l], x0, y0, x1 - x0, y1 - y0, (ring ? v_fmt_ring(rb, sizeof rb, ring) : ""), (hold ? v_fmt_hold(hb, sizeof hb, hold) : ""), box ? ",\"box\":true" : ""); first = 0;
  }
  PUT("],\"type\":[");
  first = 1;
  for (int i = 0; i < g_n; i++) {
    node_t *nd = &g_o[i]; if (!nd->seen || nd->kind != FN_TEXT || !lv_label_get_text(nd->obj)[0]) continue;   /* a text slot with no words (§2.2) says nothing */
    PUT("%s{\"text\":", first ? "" : ","); STR(lv_label_get_text(nd->obj)); PUT(",\"px\":%d,\"region\":", nd->a); STR(g_reg[nd->region]);
    { const lv_font_t *f = font_of(nd->a); int ox = 0, oy = 0; node_t *c = nd->parent ? find_node(nd->parent) : NULL; if (c) { ox = c->x; oy = c->y; }
      int top = nd->y + oy - nd->b + (f ? f->line_height - f->base_line : 0);   /* the cap top the page gave (prim_node turned it into the label's top) */
      PUT(",\"role\":"); STR(nd->role); PUT(",\"ground\":"); STR(nd->ground); PUT(",\"run\":%u", (unsigned)nd->run); PUT(",\"x\":%d,\"w\":%d,\"cap\":%d,\"base\":%d", nd->x + ox, (int)lv_obj_get_width(nd->obj), top, top + nd->b); }
    PUT("}"); first = 0;
  }
  /* every node shown with a size, in draw order, for the clearance and layout checks (node_json): the face's own nodes, then the snapshot's source nodes when a node shows the snapshot */
  PUT("],\"nodes\":[");
  first = 1; node_t *snap = NULL;
  for (int k = 0; k < g_nseq; k++) {
    node_t *nd = find_node(g_seq[k]); if (!nd || !nd->seen) continue;
    int r = node_json(buf, cap, &n, nd, NULL, first); if (r < 0) return -1; if (r) first = 0;
    if (r && nd->kind == FN_SPRITE && nd->a == SNAP_SLOT && !snap) snap = nd;
  }
  PUT("]");
  if (snap && g_snap_len >= 0) {   /* the snapshot: the region and place of the node that shows it, the source rect, and the source screen's nodes cut to that rect, as they were when it was taken */
    node_t *c = snap->parent ? find_node(snap->parent) : NULL;
    PUT(",\"snapshot\":{\"region\":"); STR(g_reg[snap->region]); PUT(",\"from\":[%d,%d,%d,%d],\"at\":[%d,%d],\"nodes\":[", g_snap_from[0], g_snap_from[1], g_snap_from[2], g_snap_from[3], snap->x + (c ? c->x : 0), snap->y + (c ? c->y : 0));
    if (n + g_snap_len + 3 >= cap) return -1; memcpy(buf + n, g_snap_js, (size_t)g_snap_len); n += g_snap_len; PUT("]}");
  }
  PUT(",\"refused\":%d,\"objects\":%d,\"table\":%d,\"pictures\":%d}", g_unknown, prim_lvgl_objects(), g_n, prim_pictures());   /* objects: the LVGL objects alive (a nine-slice is nine); table: the face's own, one a node */
#undef PUT
#undef STR
  return n;
}
