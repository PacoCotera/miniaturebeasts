/* face_test: the native test binary (lvgl-switch.md §4 L2.0): the vectors of tests/vectors, run on the C modules. Today the focus graph (focus.json); the layout and metrics vectors join it
   with their words. The same vectors run on the JavaScript side (tests/focus.test.mjs), so both give the same answer for every case.   face_test <vectors dir> */
#include "../focus/focus.h"
#include "../spec/spec.h"
#include "../layout/layout.h"
#include "../prim/ring.h"
#include "../prim/prim.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *slurp(const char *path, long *len) {
  FILE *f = fopen(path, "rb"); if (!f) return NULL;
  fseek(f, 0, SEEK_END); *len = ftell(f); fseek(f, 0, SEEK_SET);
  char *b = (char *)malloc((size_t)*len + 1); if (b && fread(b, 1, (size_t)*len, f) != (size_t)*len) { free(b); b = NULL; } if (b) b[*len] = 0; fclose(f); return b;
}
static int fails, checks;
static void check(int ok, const char *what, const char *detail) { checks++; if (!ok) { fails++; printf("FAIL %s%s%s\n", what, detail[0] ? ": " : "", detail); } }
static int dir_of(const char *k) { return strcmp(k, "up") == 0 ? FOCUS_UP : strcmp(k, "down") == 0 ? FOCUS_DOWN : strcmp(k, "left") == 0 ? FOCUS_LEFT : FOCUS_RIGHT; }

static void focus_vectors(const char *dir) {
  char path[512]; snprintf(path, sizeof path, "%s/focus.json", dir); long len; char *js = slurp(path, &len);
  if (!js) { check(0, "focus.json", "cannot read"); return; }
  if (spec_load("focus", js, (size_t)len) < 0) { check(0, "focus.json", spec_error()); free(js); return; }
  int ncases = spec_len("focus", "cases");
  for (int c = 0; c < ncases; c++) {
    char p[96], name[160], from[FOCUS_ID], key[16], to[FOCUS_ID], got[FOCUS_ID];
    snprintf(p, sizeof p, "cases.%d.name", c); spec_str("focus", p, name, sizeof name);
    snprintf(p, sizeof p, "cases.%d.from", c); spec_str("focus", p, from, sizeof from);
    snprintf(p, sizeof p, "cases.%d.key", c); spec_str("focus", p, key, sizeof key);
    snprintf(p, sizeof p, "cases.%d.to", c); spec_str("focus", p, to, sizeof to);
    snprintf(p, sizeof p, "cases.%d.graph", c); int glen; const char *graph = spec_raw("focus", p, &glen); char err[200];
    focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL;
    if (!g) { check(0, name, graph ? err : "no graph"); continue; }
    snprintf(p, sizeof p, "cases.%d.targets", c); int nt = spec_len("focus", p); focus_target_t *t = (focus_target_t *)calloc((size_t)nt + 1, sizeof *t);
    for (int i = 0; i < nt; i++) {
      char q[128]; snprintf(q, sizeof q, "cases.%d.targets.%d.id", c, i); spec_str("focus", q, t[i].id, sizeof t[i].id);
      snprintf(q, sizeof q, "cases.%d.targets.%d.group", c, i); spec_str("focus", q, t[i].group, sizeof t[i].group);
      snprintf(q, sizeof q, "cases.%d.targets.%d.index", c, i); t[i].index = spec_int("focus", q, 0);
      snprintf(q, sizeof q, "cases.%d.targets.%d.enabled", c, i); t[i].enabled = 1;
      snprintf(q, sizeof q, "cases.%d.targets.%d.rect.0", c, i); t[i].x = spec_int("focus", q, 0);
      snprintf(q, sizeof q, "cases.%d.targets.%d.rect.1", c, i); t[i].y = spec_int("focus", q, 0);
      snprintf(q, sizeof q, "cases.%d.targets.%d.rect.2", c, i); t[i].w = spec_int("focus", q, 0);
      snprintf(q, sizeof q, "cases.%d.targets.%d.rect.3", c, i); t[i].h = spec_int("focus", q, 0);
    }
    snprintf(p, sizeof p, "cases.%d.resolve", c); int nr = spec_len("focus", p); if (nr < 0) nr = 0; focus_resolve_t *r = (focus_resolve_t *)calloc((size_t)nr + 1, sizeof *r);
    for (int i = 0; i < nr; i++) spec_member("focus", p, i, r[i].sel, sizeof r[i].sel, r[i].id, sizeof r[i].id);
    int room[4], has_room = 0; snprintf(p, sizeof p, "cases.%d.roomAt", c);
    if (spec_len("focus", p) == 4) { has_room = 1; for (int i = 0; i < 4; i++) { char q[96]; snprintf(q, sizeof q, "cases.%d.roomAt.%d", c, i); room[i] = spec_int("focus", q, 0); } }
    focus_next(g, t, nt, from, dir_of(key), r, nr, has_room ? room : NULL, got, sizeof got);
    char detail[200]; snprintf(detail, sizeof detail, "expected %s, got %s", to, got); check(strcmp(got, to) == 0, name, detail);
    free(t); free(r); focus_graph_free(g);
  }
  int nref = spec_len("focus", "refusals");
  for (int i = 0; i < nref; i++) {
    char p[64], name[120], err[200]; snprintf(p, sizeof p, "refusals.%d.name", i); spec_str("focus", p, name, sizeof name); snprintf(p, sizeof p, "refusals.%d.graph", i);
    int glen; const char *graph = spec_raw("focus", p, &glen); focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL;
    check(g == NULL, name, "should be refused"); if (g) focus_graph_free(g);
  }
  int nok = spec_len("focus", "sound");
  for (int i = 0; i < nok; i++) {
    char p[64], name[120], err[200]; snprintf(p, sizeof p, "sound.%d.name", i); spec_str("focus", p, name, sizeof name); snprintf(p, sizeof p, "sound.%d.graph", i);
    int glen; const char *graph = spec_raw("focus", p, &glen); focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL;
    check(g != NULL, name, graph ? err : "no graph"); if (g) focus_graph_free(g);
  }
  printf("focus: %d cases, %d refusals, %d sound graphs\n", ncases, nref, nok);
  free(js);
}
/* the graphs the spec files carry must pass the face's own refusals: one per Pods state, and Home's */
static void spec_graphs(const char *dir) {
  static const struct { const char *file, *screen, *path; } G[] = { { "pods.json", "pods", "focus.collection" }, { "pods.json", "pods", "focus.overview" }, { "pods.json", "pods", "focus.chapter" }, { "home.json", "home", "focus.graph" } };
  for (size_t i = 0; i < sizeof G / sizeof *G; i++) {
    char path[512], err[200], what[160]; snprintf(path, sizeof path, "%s/%s", dir, G[i].file); long len; char *js = slurp(path, &len);
    snprintf(what, sizeof what, "%s %s", G[i].file, G[i].path);
    if (!js) { check(0, what, "cannot read"); continue; }
    if (spec_load(G[i].screen, js, (size_t)len) < 0) { check(0, what, spec_error()); free(js); continue; }
    int glen; const char *graph = spec_raw(G[i].screen, G[i].path, &glen); focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL;
    check(g != NULL, what, graph ? err : "absent"); if (g) focus_graph_free(g); free(js);
  }
}
/* SHA-256, for the ring vectors */
typedef struct { uint32_t h[8]; uint8_t buf[64]; uint64_t len; size_t n; } sha_t;
static const uint32_t K256[64] = { 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2 };
#define ROR(x, n) (((x) >> (n)) | ((x) << (32 - (n))))
static void sha_block(sha_t *s, const uint8_t *p) {
  uint32_t w[64], a, b, c, d, e, f, g, h;
  for (int i = 0; i < 16; i++) w[i] = (uint32_t)p[i * 4] << 24 | (uint32_t)p[i * 4 + 1] << 16 | (uint32_t)p[i * 4 + 2] << 8 | p[i * 4 + 3];
  for (int i = 16; i < 64; i++) { uint32_t s0 = ROR(w[i - 15], 7) ^ ROR(w[i - 15], 18) ^ (w[i - 15] >> 3), s1 = ROR(w[i - 2], 17) ^ ROR(w[i - 2], 19) ^ (w[i - 2] >> 10); w[i] = w[i - 16] + s0 + w[i - 7] + s1; }
  a = s->h[0]; b = s->h[1]; c = s->h[2]; d = s->h[3]; e = s->h[4]; f = s->h[5]; g = s->h[6]; h = s->h[7];
  for (int i = 0; i < 64; i++) {
    uint32_t t1 = h + (ROR(e, 6) ^ ROR(e, 11) ^ ROR(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i], t2 = (ROR(a, 2) ^ ROR(a, 13) ^ ROR(a, 22)) + ((a & b) ^ (a & c) ^ (b & c));
    h = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
  }
  s->h[0] += a; s->h[1] += b; s->h[2] += c; s->h[3] += d; s->h[4] += e; s->h[5] += f; s->h[6] += g; s->h[7] += h;
}
static void sha_init(sha_t *s) { static const uint32_t I[8] = { 0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19 }; memcpy(s->h, I, sizeof I); s->len = 0; s->n = 0; }
static void sha_add(sha_t *s, const uint8_t *p, size_t n) { s->len += n; while (n--) { s->buf[s->n++] = *p++; if (s->n == 64) { sha_block(s, s->buf); s->n = 0; } } }
static void sha_hex(sha_t *s, char out[65]) {
  uint64_t bits = s->len * 8; uint8_t pad = 0x80; sha_add(s, &pad, 1); pad = 0; while (s->n != 56) sha_add(s, &pad, 1);
  uint8_t l[8]; for (int i = 0; i < 8; i++) l[i] = (uint8_t)(bits >> (56 - 8 * i)); sha_add(s, l, 8);
  for (int i = 0; i < 8; i++) snprintf(out + i * 8, 9, "%08x", s->h[i]);
}
static void mask_sha(const uint8_t *m, size_t n, char out[65]) { sha_t s; sha_init(&s); sha_add(&s, m, n); sha_hex(&s, out); }

/* the focus ring (rings.json, made from ui/rings.mjs): the C ops give the masks the JavaScript gives, the 20 x 20 source expands to the full-size ring, every refusal is refused */
static void ring_vectors(const char *dir) {
  char path[512]; snprintf(path, sizeof path, "%s/rings.json", dir); long len; char *js = slurp(path, &len);
  if (!js) { check(0, "rings.json", "cannot read"); return; }
  if (spec_load("rings", js, (size_t)len) < 0) { check(0, "rings.json", spec_error()); free(js); return; }
  prim_palette_clear(); prim_palette_add("focus", 0xffe6ad);
  int n = spec_len("rings", "cases"), bad = 0; uint8_t *mask = (uint8_t *)malloc(1024 * 600), *px = (uint8_t *)malloc(64 * 64 * 4);
  uint8_t src[20 * 20]; ring_mask(src, 20, 20, 2, 6, 0);
  for (int c = 0; c < n; c++) {
    char p[64], op[16], want[80], got[65]; int ok = 0;
    snprintf(p, sizeof p, "cases.%d.op", c); spec_str("rings", p, op, sizeof op);
#define I(k) (snprintf(p, sizeof p, "cases.%d." k, c), spec_int("rings", p, 0))
    snprintf(p, sizeof p, "cases.%d.sha256", c); spec_str("rings", p, want, sizeof want);
    if (strcmp(op, "ring") == 0) {
      char shape[16]; snprintf(p, sizeof p, "cases.%d.shape", c); spec_str("rings", p, shape, sizeof shape); int w = I("w"), h = I("h");
      ok = ring_mask(mask, w, h, I("width"), I("radius"), strcmp(shape, "ellipse") == 0) == 0; if (ok) { mask_sha(mask, (size_t)w * h, got); ok = strcmp(got, want) == 0; }
      if (ok && w <= 64 && h <= 64) {   /* the composed op draws the same pixels */
        char ops[200]; snprintf(ops, sizeof ops, "[[\"ring\",\"%s\",0,0,%d,%d,%d,%d,\"focus\"]]", shape, w, h, I("width"), I("radius")); memset(px, 0, 64 * 64 * 4);
        ok = prim_compose(px, 64, 64, ops) == 1; for (int y = 0; ok && y < h; y++) for (int x = 0; x < w; x++) if ((px[(y * 64 + x) * 4 + 3] == 255) != (mask[y * w + x] == 255)) ok = 0;
      }
    } else if (strcmp(op, "tabRing") == 0) {
      ring_tab_t t = { I("body"), I("width"), I("slant"), I("outside"), I("top"), I("slantTo"), I("bottom"), I("radius"), I("tabTop") };
      int tw = I("w"), th = I("h"); ok = ring_tab_w(&t) == tw && ring_tab_h(&t) == th && ring_tab_mask(mask, &t) == 0; if (ok) { mask_sha(mask, (size_t)tw * th, got); ok = strcmp(got, want) == 0; }
    } else if (strcmp(op, "nine") == 0) {   /* corners 1:1, the 4 px middle tiled, insets 8 */
      int w = I("w"), h = I("h"); uint8_t *e = (uint8_t *)malloc((size_t)w * h);
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) { int sx = x < 8 ? x : x >= w - 8 ? 20 - (w - x) : 8 + (x - 8) % 4, sy = y < 8 ? y : y >= h - 8 ? 20 - (h - y) : 8 + (y - 8) % 4; e[y * w + x] = src[sy * 20 + sx]; }
      mask_sha(e, (size_t)w * h, got); ok = strcmp(got, want) == 0; free(e);
    } else if (strcmp(op, "refuse") == 0) {
      char ops[400]; snprintf(p, sizeof p, "cases.%d.ops", c); spec_str("rings", p, ops, sizeof ops); memset(px, 0, 64 * 64 * 4); ok = prim_compose(px, 64, 64, ops) < 0;
    }
#undef I
    if (!ok) { bad++; char d[100]; snprintf(d, sizeof d, "case %d (%s)", c, op); check(0, "rings", d); } else checks++;
  }
  printf("rings: %d cases, %d differ\n", n, bad);
  free(mask); free(px); free(js);
}
/* the derived rules (layout.json, made from ui/specs/derive.mjs): the C rules give the same integers for every case */
static void layout_vectors(const char *dir, const char *specs) {
  char path[512]; long len; char *js;
  static const char *FILES[] = { "frame", "pods" };
  for (int i = 0; i < 2; i++) {
    snprintf(path, sizeof path, "%s/%s.json", specs, FILES[i]); js = slurp(path, &len);
    if (!js || spec_load(FILES[i], js, (size_t)len) < 0) { check(0, path, js ? spec_error() : "cannot read"); free(js); return; }
    free(js);
  }
  snprintf(path, sizeof path, "%s/layout.json", dir); js = slurp(path, &len);
  if (!js) { check(0, "layout.json", "cannot read"); return; }
  if (spec_load("layout", js, (size_t)len) < 0) { check(0, "layout.json", spec_error()); free(js); return; }
  int n = spec_len("layout", "cases"), bad = 0;
  for (int c = 0; c < n; c++) {
    char p[96], rule[32], sp[16], where[96], what[200]; int args[16], na, want[160], nw, got[160];
    snprintf(p, sizeof p, "cases.%d.rule", c); spec_str("layout", p, rule, sizeof rule);
    snprintf(p, sizeof p, "cases.%d.spec", c); spec_str("layout", p, sp, sizeof sp);
    snprintf(p, sizeof p, "cases.%d.path", c); spec_str("layout", p, where, sizeof where);
    snprintf(p, sizeof p, "cases.%d.args", c); na = spec_len("layout", p); if (na > 16) na = 16;
    for (int i = 0; i < na; i++) { char q[96]; snprintf(q, sizeof q, "cases.%d.args.%d", c, i); args[i] = spec_int("layout", q, 0); }
    snprintf(p, sizeof p, "cases.%d.expect", c); nw = spec_len("layout", p); if (nw > 160) nw = 160;
    for (int i = 0; i < nw; i++) { char q[96]; snprintf(q, sizeof q, "cases.%d.expect.%d", c, i); want[i] = spec_int("layout", q, -999999); }
    int ng = layout_eval(rule, sp, where, args, na, got, 160);
    int ok = ng == nw; for (int i = 0; ok && i < nw; i++) if (got[i] != want[i]) ok = 0;
    snprintf(what, sizeof what, "layout %s %s %s", rule, where, "case");
    if (!ok) { bad++; char d[200]; snprintf(d, sizeof d, "case %d args [%d,%d,%d..] got %d ints, wanted %d", c, na > 0 ? args[0] : 0, na > 1 ? args[1] : 0, na > 2 ? args[2] : 0, ng, nw); check(0, what, d); }
    else checks++;
  }
  printf("layout: %d cases, %d differ\n", n, bad);
  free(js);
}
int main(int argc, char **argv) {
  const char *dir = argc > 1 ? argv[1] : "tests/vectors";
  focus_vectors(dir);
  spec_graphs(argc > 2 ? argv[2] : "../ui/specs/station");
  ring_vectors(dir);
  layout_vectors(dir, argc > 2 ? argv[2] : "../ui/specs/station");
  printf("face_test: %d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
