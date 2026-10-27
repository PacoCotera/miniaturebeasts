/* face_test: the native test binary (lvgl-switch.md §4 L2.0): the vectors of tests/vectors, run on the C modules. Today the focus graph (focus.json); the layout and metrics vectors join it
   with their words. The same vectors run on the JavaScript side (tests/focus.test.mjs), so both give the same answer for every case.   face_test <vectors dir> */
#include "../focus/focus.h"
#include "../spec/spec.h"
#include "../layout/layout.h"
#include "../screens/screens.h"
#include "../prim/ring.h"
#include "../prim/prim.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../bridge/wire.h"
#include "../face.h"
#include "../anim/anim.h"
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
    snprintf(p, sizeof p, "cases.%d.verb", c); char verb[24]; spec_str("focus", p, verb, sizeof verb);
    int stepped = focus_move(g, t, nt, from, dir_of(key), r, nr, has_room ? room : NULL, got, sizeof got);
    char detail[200]; snprintf(detail, sizeof detail, "expected %s%s%s, got %s%s", to, verb[0] ? " " : "", verb, got, stepped ? " (a step)" : ""); check(strcmp(got, to) == 0 && stepped == (verb[0] != 0) && (!stepped || (strncmp(verb, "step:", 5) == 0 && strcmp(verb + 5, key) == 0)), name, detail);
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
  prim_palette_clear(); prim_palette_add("focus", 0xffe6ad); prim_palette_add("void", 0x0c0a12);
  int n = spec_len("rings", "cases"), bad = 0; uint8_t *mask = (uint8_t *)malloc(1024 * 600), *px = (uint8_t *)malloc(64 * 64 * 4), *big = (uint8_t *)malloc(256 * 256 * 4), *roles = (uint8_t *)malloc(256 * 256), *ex = (uint8_t *)malloc(512 * 256);
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
    } else if (strcmp(op, "cased") == 0) {   /* the cased ring (fix 14): its three ops composed give the roles (0 none, 1 key, 2 core) the oracle gives; a nine-slice source expands to its ring box (insets R, the middle tiled) */
      char kind[12], ops[800]; snprintf(p, sizeof p, "cases.%d.kind", c); spec_str("rings", p, kind, sizeof kind); snprintf(p, sizeof p, "cases.%d.ops", c); spec_str("rings", p, ops, sizeof ops);
      int nine = strcmp(kind, "nine") == 0, w = I("w"), h = I("h"), S = I("S"), R = I("R"), pw = nine ? S : w, ph = nine ? S : h;
      ok = pw <= 256 && ph <= 256 && w * h <= 512 * 256; if (ok) { memset(big, 0, (size_t)pw * ph * 4); ok = prim_compose(big, pw, ph, ops) >= 1; }
      if (ok) {
        for (int i = 0; i < pw * ph; i++) { const uint8_t *q = big + i * 4; uint32_t rgb = ((uint32_t)q[2] << 16) | ((uint32_t)q[1] << 8) | q[0]; roles[i] = q[3] != 255 ? 0 : rgb == 0xffe6ad ? 2 : 1; }
        if (nine) { for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) { int sx = x < R ? x : x >= w - R ? S - (w - x) : R + (x - R) % (S - 2 * R), sy = y < R ? y : y >= h - R ? S - (h - y) : R + (y - R) % (S - 2 * R); ex[y * w + x] = roles[sy * S + sx]; } mask_sha(ex, (size_t)w * h, got); }
        else mask_sha(roles, (size_t)w * h, got);
        ok = strcmp(got, want) == 0;
      }
    } else if (strcmp(op, "refuse") == 0) {
      char ops[400]; snprintf(p, sizeof p, "cases.%d.ops", c); spec_str("rings", p, ops, sizeof ops); memset(px, 0, 64 * 64 * 4); ok = prim_compose(px, 64, 64, ops) < 0;
    }
#undef I
    if (!ok) { bad++; char d[100]; snprintf(d, sizeof d, "case %d (%s)", c, op); check(0, "rings", d); } else checks++;
  }
  printf("rings: %d cases, %d differ\n", n, bad);
  free(mask); free(px); free(big); free(roles); free(ex); free(js);
}
/* the metrics (metrics.json, made from the table of the compiled fonts): lv_text_get_width gives the width the table sums, for every Station string at 16, 20 and 28 px and in Medium 16 ("font": "16m") */
static void metrics_vectors(const char *dir) {
  char path[512]; snprintf(path, sizeof path, "%s/metrics.json", dir); long len; char *js = slurp(path, &len);
  if (!js) { check(0, "metrics.json", "cannot read"); return; }
  if (spec_load("metrics", js, (size_t)len) < 0) { check(0, "metrics.json", spec_error()); free(js); return; }
  int n = spec_len("metrics", "cases"), bad = 0;
  for (int c = 0; c < n; c++) {
    char p[64], font[8]; snprintf(p, sizeof p, "cases.%d.px", c); int px = spec_int("metrics", p, 0); snprintf(p, sizeof p, "cases.%d.width", c); int want = spec_int("metrics", p, -1);
    snprintf(p, sizeof p, "cases.%d.font", c); if (spec_str("metrics", p, font, sizeof font) > 0) px = strcmp(font, "16m") == 0 ? PRIM_FONT_M16 : -1;   /* a case by font key: "16m" is Medium 16's code */
    snprintf(p, sizeof p, "cases.%d.text", c); spec_str("metrics", p, prim_text(), prim_text_size()); int got = prim_measure(px);
    if (got != want) { bad++; char d[200]; snprintf(d, sizeof d, "%d px \"%.60s\": width %d, wanted %d", px, prim_text(), got, want); check(0, "metrics", d); } else checks++;
  }
  printf("metrics: %d cases, %d differ\n", n, bad);
  free(js);
}
/* fix 6 N1a: the Incubate line's price with the bud's wait: ⧗ is the icon picture (20 px, 16 + 4), and the whole action (the cap at 16, 36 where the verb starts, the verb, the 24 px gap, the price) ends inside the zone (16, 570, 376, 24), x <= 392, with the widest price and three digits a figure */
static void price_width(void) {
  const char *widest = "\xe2\x9a\xa1 999 \xe2\x9d\x80 999 \xe2\x97\x86 999 \xe2\xa7\x97 999", *real = "\xe2\x9a\xa1 2 \xe2\x9d\x80 4 \xe2\x97\x86 18 \xe2\xa7\x97 38";
  check(v_run_width("\xe2\xa7\x97", 16) == 20, "the wait counts as an icon: 20 px", "");
  int end = 36 + v_measure("Incubate", 16) + 24 + v_run_width(widest, 16); check(end <= 392, "the Incubate line with ⧗ 999 ends inside its zone", "");
  int real_end = 36 + v_measure("Incubate", 16) + 24 + v_run_width(real, 16); check(real_end <= 392 && real_end > 36, "the widest real price ends inside its zone", "");
  printf("price: the widest price ends at %d, a real one at %d (zone ends at 392)\n", end, real_end);
}
/* the derived rules (layout.json, made from ui/specs/derive.mjs): the C rules give the same integers for every case */
static void layout_vectors(const char *dir, const char *specs) {
  char path[512]; long len; char *js;
  static const char *FILES[] = { "frame", "pods", "incubator", "vivarium", "habitat", "home", "cargo", "namer", "bench" };
  for (int i = 0; i < 9; i++) {
    snprintf(path, sizeof path, "%s/%s.json", specs, FILES[i]); js = slurp(path, &len);
    if (!js || spec_load(FILES[i], js, (size_t)len) < 0) { check(0, path, js ? spec_error() : "cannot read"); free(js); return; }
    free(js);
  }
  snprintf(path, sizeof path, "%s/layout.json", dir); js = slurp(path, &len);
  if (!js) { check(0, "layout.json", "cannot read"); return; }
  if (spec_load("layout", js, (size_t)len) < 0) { check(0, "layout.json", spec_error()); free(js); return; }
  int n = spec_len("layout", "cases"), bad = 0;
  for (int c = 0; c < n; c++) {
    char p[96], rule[32], sp[16], where[96], what[200]; int args[16], na, want[200], nw, got[200];
    snprintf(p, sizeof p, "cases.%d.rule", c); spec_str("layout", p, rule, sizeof rule);
    snprintf(p, sizeof p, "cases.%d.spec", c); spec_str("layout", p, sp, sizeof sp);
    snprintf(p, sizeof p, "cases.%d.path", c); spec_str("layout", p, where, sizeof where);
    snprintf(p, sizeof p, "cases.%d.args", c); na = spec_len("layout", p); if (na > 16) na = 16;
    for (int i = 0; i < na; i++) { char q[96]; snprintf(q, sizeof q, "cases.%d.args.%d", c, i); args[i] = spec_int("layout", q, 0); }
    snprintf(p, sizeof p, "cases.%d.expect", c); nw = spec_len("layout", p); if (nw > 200) nw = 200;
    for (int i = 0; i < nw; i++) { char q[96]; snprintf(q, sizeof q, "cases.%d.expect.%d", c, i); want[i] = spec_int("layout", q, -999999); }
    int ng = layout_eval(rule, sp, where, args, na, got, 200);
    int ok = ng == nw; for (int i = 0; ok && i < nw; i++) if (got[i] != want[i]) ok = 0;
    snprintf(what, sizeof what, "layout %s %s %s", rule, where, "case");
    if (!ok) { bad++; char d[200]; snprintf(d, sizeof d, "case %d args [%d,%d,%d..] got %d ints, wanted %d", c, na > 0 ? args[0] : 0, na > 1 ? args[1] : 0, na > 2 ? args[2] : 0, ng, nw); check(0, what, d); }
    else checks++;
  }
  printf("layout: %d cases, %d differ\n", n, bad);
  free(js);
  {   /* listPitch: n takes the smallest form that holds it; a list of bad forms is refused at load */
    static const char TGOOD[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":2,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]},\"b\":{\"upTo\":4,\"first\":[0,0,4,8],\"pitch\":[5,0],\"grid\":[4,1]}}}}}";
    static const char TTWO[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":2,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]},\"b\":{\"upTo\":2,\"first\":[0,0,4,8],\"pitch\":[5,0],\"grid\":[4,1]}}}}}";
    static const char TNONE[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]}}}}}";
    static const char TSHORT[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":3,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]}}}}}";
    char verr[200]; int lb[4], lf = -1;
    spec_load("tgood", TGOOD, sizeof TGOOD - 1); check(screens_vet_spec("tgood", verr, sizeof verr) == 0 && (lf = layout_list_pitch("tgood", "regions.t", 3, 2, lb)) == 4 && lb[0] == 10 && lb[2] == 4 && layout_list_pitch("tgood", "regions.t", 2, 1, lb) == 2 && lb[0] == 10 && lb[2] == 8 && layout_list_pitch("tgood", "regions.t", 5, 0, lb) == -1 && layout_list_pitch("tgood", "regions.t", 3, 3, lb) == -1, "listPitch: n takes the smallest form that holds it, no form holds 5, an item past n is refused", "wrong");
    spec_load("ttwo", TTWO, sizeof TTWO - 1); check(screens_vet_spec("ttwo", verr, sizeof verr) == -1, "listPitch: two forms with one upTo are refused at load", "accepted");
    spec_load("tnone", TNONE, sizeof TNONE - 1); check(screens_vet_spec("tnone", verr, sizeof verr) == -1, "listPitch: a form with no upTo is refused at load", "accepted");
    spec_load("tshort", TSHORT, sizeof TSHORT - 1); check(screens_vet_spec("tshort", verr, sizeof verr) == -1, "listPitch: a grid shorter than its upTo is refused at load", "accepted");
  }
}
/* No picture binds under the empty id: "" marks a free slot of the picture table (a dropped picture leaves it), so a lookup of "" finds nothing, and v_sprite and v_sprite_hidden with "" make no node. */
static int table_nodes(void) { static char b[65536]; int n = prim_log_json(b, (int)sizeof b); const char *p = n > 0 ? strstr(b, "\"table\":") : NULL; return p ? atoi(p + 8) : -1; }
static void empty_id(void) {
  face_init(); { const char *hi = "{\"t\":\"hello\",\"contract\":1}"; check(wire_send(hi, (int)strlen(hi)) == 0, "empty id: hello", ""); }
  const char *up = "{\"t\":\"asset\",\"id\":\"empty-id-probe\",\"w\":4,\"h\":4,\"policy\":\"art\",\"status\":\"placeholder\"}", *down = "{\"t\":\"asset\",\"id\":\"empty-id-probe\",\"drop\":true}";
  check(wire_send(up, (int)strlen(up)) == 0 && wire_asset_slot("empty-id-probe") >= 0, "empty id: a picture is loaded", "");
  { /* an asset message with an empty id is refused, with or without drop, and changes no slot */
    int pslot = wire_asset_slot("empty-id-probe");
    const char *e1 = "{\"t\":\"asset\",\"id\":\"\",\"w\":4,\"h\":4,\"policy\":\"art\",\"status\":\"placeholder\"}", *e2 = "{\"t\":\"asset\",\"id\":\"\",\"drop\":true}", *nx = "{\"t\":\"asset\",\"id\":\"empty-id-next\",\"w\":4,\"h\":4,\"policy\":\"art\",\"status\":\"placeholder\"}", *nd = "{\"t\":\"asset\",\"id\":\"empty-id-next\",\"drop\":true}";
    check(wire_send(e1, (int)strlen(e1)) == -1, "empty id: a load under \"\" is refused", "");
    check(wire_send(e2, (int)strlen(e2)) == -1, "empty id: a drop of \"\" is refused", "");
    check(wire_asset_slot("empty-id-probe") == pslot && wire_asset_slot("") < 0, "empty id: the refused messages changed no slot", "");
    check(wire_send(nx, (int)strlen(nx)) == 0 && wire_asset_slot("empty-id-next") == pslot + 1, "empty id: and took none (the next picture takes the next slot)", "");
    wire_send(nd, (int)strlen(nd));
  }
  check(wire_send(down, (int)strlen(down)) == 0 && wire_asset_slot("empty-id-probe") < 0, "empty id: the picture is dropped", "");
  check(wire_asset_slot("") < 0 && wire_asset_slot(NULL) < 0, "empty id: the free slot the drop left is not found under \"\" or NULL", "");
  prim_begin(); int before = table_nodes();
  check(v_sprite("empty.id.sprite", "", 0, 0, 4, 4) == 0 && v_sprite_hidden("empty.id.hidden", "", 0, 0) == 0, "empty id: v_sprite and v_sprite_hidden with \"\" return 0", "");
  check(table_nodes() == before, "empty id: and make no node", "");
  prim_end();
}
/* v_line: the cap top is (pitch - cap) / 2 under the line top, the pitch is frame.json type.pitch.<px>; left, centre and right put the edge, the middle and the end of the string on x; a px with no pitch draws nothing and says so. */
static int type_y(const char *id) {   /* the y of the type region `id` in the log */
  static char b[65536]; int n = prim_log_json(b, (int)sizeof b); char key[96]; snprintf(key, sizeof key, "{\"id\":\"%s\",\"layer\":\"type\",\"rect\":[", id);
  const char *p = n > 0 ? strstr(b, key) : NULL; if (!p) return -9999; p += strlen(key); while (*p != ',') p++; return atoi(p + 1);
}
static int type_x(const char *id) {
  static char b[65536]; int n = prim_log_json(b, (int)sizeof b); char key[96]; snprintf(key, sizeof key, "{\"id\":\"%s\",\"layer\":\"type\",\"rect\":[", id);
  const char *p = n > 0 ? strstr(b, key) : NULL; return p ? atoi(p + strlen(key)) : -9999;
}
static void line_words(void) {
  int w = v_measure("Hello", 16), w28 = v_measure("Hello", 28), w22 = v_measure("Hello", 22);
  prim_begin();
  v_region("vl.l", LAYER_TYPE); check(v_line_at("vl.l", "Hello", 100, 50, V_ANCHOR_LINE, 16, "ink", V_ALIGN_LEFT) == w, "v_line_at: returns the width", "");
  v_region("vl.c", LAYER_TYPE); v_line_at("vl.c", "Hello", 100, 50, V_ANCHOR_LINE, 16, "ink", V_ALIGN_CENTRE);
  v_region("vl.r", LAYER_TYPE); v_line_at("vl.r", "Hello", 100, 50, V_ANCHOR_LINE, 16, "ink", V_ALIGN_RIGHT);
  v_region("vl.t", LAYER_TYPE); v_line_at("vl.t", "Hello", 100, 50, V_ANCHOR_LINE, 28, "ink", V_ALIGN_LEFT);
  v_region("vl.e", LAYER_TYPE); v_text("vl.e", "Hello", 100, 50 + (20 - v_cap(16)) / 2, w, 16, "ink");
  v_region("vl.f", LAYER_TYPE); v_text("vl.f", "Hello", 100, 50 + (36 - v_cap(28)) / 2, w28, 28, "ink");
  v_region("vl.n", LAYER_TYPE); check(v_line_at("vl.n", "Hello", 100, 50, V_ANCHOR_LINE, 17, "ink", V_ALIGN_LEFT) == 0, "v_line_at: a px with no type.pitch draws nothing", "");
  v_region("vl.nc", LAYER_TYPE); check(v_line_in("vl.nc", "Hello", 100, 200, 50, V_ANCHOR_LINE, 17, "ink") == 0, "v_line_in: a px with no type.pitch draws nothing", "");
  v_region("vl.a", LAYER_TYPE); v_line_at("vl.a", "Hello", 100, 50, V_ANCHOR_CAP, 16, "ink", V_ALIGN_LEFT);
  v_region("vl.b", LAYER_TYPE); v_line_at("vl.b", "Hello", 100, 50, V_ANCHOR_BASE, 16, "ink", V_ALIGN_LEFT);
  v_region("vl.m", LAYER_TYPE); v_line_at("vl.m", "Hello", 100, 50, V_ANCHOR_MID, 28, "ink", V_ALIGN_LEFT);
  v_region("vl.q", LAYER_TYPE); v_line_at("vl.q", "Hello", 100, 50, V_ANCHOR_BASE, 22, "ink", V_ALIGN_LEFT);
  v_region("vl.ar", LAYER_TYPE); v_text("vl.ar", "Hello", 100, 50, w, 16, "ink");
  v_region("vl.br", LAYER_TYPE); v_text("vl.br", "Hello", 100, 50 - v_cap(16), w, 16, "ink");
  v_region("vl.mr", LAYER_TYPE); v_text("vl.mr", "Hello", 100, 50 - v_fdiv(v_cap(28), 2), w28, 28, "ink");
  v_region("vl.qr", LAYER_TYPE); v_text("vl.qr", "Hello", 100, 50 - v_cap(22), w22, 22, "ink");
  v_region("vl.ci", LAYER_TYPE); v_line_at("vl.ci", "Hello", 100, v_cap_in(50, 20, 16), V_ANCHOR_CAP, 16, "ink", V_ALIGN_LEFT);
  v_region("vl.cj", LAYER_TYPE); v_line_in("vl.cj", "Hello", 100, 200, v_cap_in(50, 25, 22), V_ANCHOR_CAP, 22, "ink");
  v_region("vl.cr", LAYER_TYPE); v_text("vl.cr", "Hello", 100, 50 + (25 - v_cap(22)) / 2, w22, 22, "ink");
  v_region("vl.i", LAYER_TYPE); check(v_line_in("vl.i", "Hello", 100, 200, 50, V_ANCHOR_LINE, 16, "ink") == w, "v_line_in: returns the width", "");
  prim_end();
  check(type_y("vl.l") == type_y("vl.e"), "v_line_at: 16 px puts its cap top (20 - cap) / 2 under the line top", "");
  check(type_y("vl.t") == type_y("vl.f"), "v_line_at: 28 px puts its cap top (36 - cap) / 2 under the line top", "");
  check(type_x("vl.l") == 100 && type_x("vl.c") == 100 - v_half(w) && type_x("vl.r") == 100 - w, "v_line_at: left, centre and right", "");
  check(type_y("vl.a") == type_y("vl.ar"), "v_line_at: V_ANCHOR_CAP puts the cap top at y", "");
  check(type_y("vl.b") == type_y("vl.br"), "v_line_at: V_ANCHOR_BASE puts the cap top a cap above y", "");
  check(type_y("vl.m") == type_y("vl.mr"), "v_line_at: V_ANCHOR_MID puts the cap top half a cap (floor) above y", "");
  check(type_y("vl.q") == type_y("vl.qr"), "v_line_at: a px with no type.pitch is drawn by the anchors that need none", "");
  check(type_x("vl.i") == 100 + v_half(200 - w), "v_line_in: centred in the box", "");
  check(type_y("vl.i") == type_y("vl.e"), "v_line_in: the cap top of the same anchor", "");
  check(v_cap_top(50, V_ANCHOR_LINE, 16) == 50 + v_fdiv(20 - v_cap(16), 2) && v_cap_top(50, V_ANCHOR_LINE, 28) == 50 + v_fdiv(36 - v_cap(28), 2), "v_cap_top: the line anchor on the frame's pitch", "");
  check(type_y("vl.ci") == type_y("vl.e") && type_y("vl.cj") == type_y("vl.cr"), "v_cap_in: a line at the cap top it gives sits where the centring puts it (any px, no type.pitch needed)", "");
  check(v_cap_in(50, 24, 20) == 55 && v_cap_in(50, 25, 16) == 56 && v_cap_in(50, 13, 16) == 50 && v_cap_in(50, 10, 16) == 49 && v_cap_in(50, 20, 17) == 50 + v_fdiv(20 - v_cap(17), 2), "v_cap_in: top + floor((h - cap) / 2), a cap taller than the box a row above it", "");
  check(v_cap_top(50, V_ANCHOR_LINE, 17) == 50, "v_cap_top: a px with no type.pitch gives y back", "");
  check(v_cap_top(50, V_ANCHOR_CAP, 22) == 50 && v_cap_top(50, V_ANCHOR_BASE, 22) == 50 - v_cap(22) && v_cap_top(50, V_ANCHOR_MID, 21) == 50 - v_fdiv(v_cap(21), 2), "v_cap_top: the other anchors take any px", "");
}
/* The kit's panels and rules (K4): kit_panel, kit_hairline, kit_windowFrame and kit_bezel (with its band): the nodes they make, their boxes and ops, the forms (slot, outline only, dash, hidden, band). */
static int kbox(const char *id, int b[4]) { return prim_node_box(v_id(id), b); }
static int kat(const char *id, int kind, int x, int y, int w, int h) { int b[4]; return kbox(id, b) == kind && b[0] == x && b[1] == y && b[2] == w && b[3] == h; }
static int kabsent(const char *id) { int b[4]; return kbox(id, b) < 0; }
static uint32_t kpx(const uint8_t *px, int W, int x, int y) { const uint8_t *q = px + (y * W + x) * 4; return ((uint32_t)q[3] << 24) | ((uint32_t)q[2] << 16) | ((uint32_t)q[1] << 8) | q[0]; }
#define KA 0x00112233u   /* the palette names kitA (fill), kitB (edge), kitC (bevel and band fill), kitD (the rule) */
#define KB 0x00445566u
#define KC 0x00778899u
#define KD 0x00aabbccu
typedef struct { int n; int i[8]; int b[8][4]; } kt_rec_t;
static void kt_rec(int i, const int box[4], void *ctx) { kt_rec_t *r = ctx; if (r->n < 8) { r->i[r->n] = i; memcpy(r->b[r->n], box, 4 * sizeof(int)); } r->n++; }
static int ktext(int x, int w) { int b[4]; return kbox("nameTag.text", b) == FN_TEXT && b[0] == x && b[2] == w; }   /* the name's node: its left edge and width (its height is the font's) */
static void kit_words(void) {
  face_init(); prim_palette_add("kitA", KA); prim_palette_add("kitB", KB); prim_palette_add("kitC", KC); prim_palette_add("kitD", KD);
  /* kit_panel: the fill and the four edges, in that order, the edge rows inside the box */
  prim_begin(); int n0 = table_nodes();
  v_region("kp.shown", LAYER_CHROME); kit_panel("kp.shown", 10, 20, 30, 40, "kitA", "kitB", NULL, 0);
  v_region("kp.noedge", LAYER_CHROME); kit_panel("kp.noedge", 10, 20, 30, 40, "kitA", NULL, NULL, 0);
  v_region("kp.outline", LAYER_CHROME); kit_panel("kp.outline", 10, 20, 30, 40, NULL, "kitB", NULL, 0);
  v_region("kp.slot", LAYER_CHROME); kit_panel("kp.slot", 10, 20, 30, 40, "kitA", "kitB", NULL, 1);
  v_region("kp.slotnoedge", LAYER_CHROME); kit_panel("kp.slotnoedge", 10, 20, 30, 40, "kitA", NULL, NULL, 1);
  v_region("kp.bevel", LAYER_CHROME); kit_panel("kp.bevel", 10, 20, 30, 40, "kitA", "kitB", "kitC", 0);
  v_region("kp.slotbevel", LAYER_CHROME); kit_panel("kp.slotbevel", 10, 20, 30, 40, "kitA", "kitB", "kitC", 1);
  { const char *m; while ((m = wire_poll()) != NULL) {} } v_region("kp.nofillbevel", LAYER_CHROME); kit_panel("kp.nofillbevel", 10, 20, 30, 40, NULL, "kitB", "kitC", 0);
  int n1 = table_nodes(); prim_end();
  check(n1 - n0 == 5 + 1 + 4 + 5 + 1 + 7 + 7, "kit_panel: five nodes with an edge, one without, four for an outline only, the same five as a slot; seven with a bevel, shown or as a slot", "");
  check(kat("kp.bevel.bt", FN_RECT, 11, 21, 28, 1) && kat("kp.bevel.bl", FN_RECT, 11, 22, 1, 37) && kat("kp.bevel.er", FN_RECT, 39, 20, 1, 40), "kit_panel: the bevel inside the edge, its top row (x + 1, y + 1, w - 2) and its left column (x + 1, y + 2, h - 3), after the edges", "");
  check(kat("kp.slotbevel.bt", FN_RECT, 10, 20, 0, 0) && kat("kp.slotbevel.bl", FN_RECT, 10, 20, 0, 0), "kit_panel: a slot's bevel nodes at (x, y) with no size", "");
  int nr = 0; { const char *m; while ((m = wire_poll()) != NULL) if (strstr(m, "a bevel needs a fill")) nr++; }
  check(nr == 1 && kabsent("kp.nofillbevel.et") && kabsent("kp.nofillbevel.bt"), "kit_panel: a bevel with no fill is refused and draws no node", "");
  check(kat("kp.shown", FN_RECT, 10, 20, 30, 40) && kat("kp.shown.et", FN_RECT, 10, 20, 30, 1) && kat("kp.shown.eb", FN_RECT, 10, 59, 30, 1) && kat("kp.shown.el", FN_RECT, 10, 20, 1, 40) && kat("kp.shown.er", FN_RECT, 39, 20, 1, 40), "kit_panel: the fill is the box, the edges its four outer rows", "");
  check(kat("kp.noedge", FN_RECT, 10, 20, 30, 40) && kabsent("kp.noedge.et") && kabsent("kp.noedge.er"), "kit_panel: edge NULL leaves the edges out", "");
  check(kabsent("kp.outline") && kat("kp.outline.et", FN_RECT, 10, 20, 30, 1) && kat("kp.outline.eb", FN_RECT, 10, 59, 30, 1) && kat("kp.outline.el", FN_RECT, 10, 20, 1, 40) && kat("kp.outline.er", FN_RECT, 39, 20, 1, 40), "kit_panel: fill NULL draws the four edge rects only", "");
  check(kat("kp.slot", FN_RECT, 10, 20, 0, 0) && kat("kp.slot.et", FN_RECT, 10, 20, 0, 0) && kat("kp.slot.eb", FN_RECT, 10, 20, 0, 0) && kat("kp.slot.el", FN_RECT, 10, 20, 0, 0) && kat("kp.slot.er", FN_RECT, 10, 20, 0, 0) && kat("kp.slotnoedge", FN_RECT, 10, 20, 0, 0) && kabsent("kp.slotnoedge.et"), "kit_panel: a slot is the same nodes, every one at (x, y) with no size", "");
  /* kit_hairline: solid rect, dashed composed picture, hidden dashed keeps its box with no ops */
  static const int D[2] = { 3, 2 };
  prim_begin(); n0 = table_nodes();
  v_region("kh.h", LAYER_CHROME); kit_hairline("kh.h", 5, 6, 24, "kitA", 0, NULL);
  v_region("kh.v", LAYER_CHROME); kit_hairline("kh.v", 5, 6, 24, "kitA", 1, NULL);
  v_region("kh.dh", LAYER_CHROME); kit_hairline("kh.dh", 5, 6, 24, "kitA", 0, D); char dh[200]; snprintf(dh, sizeof dh, "%s", prim_ops());
  v_region("kh.dv", LAYER_CHROME); kit_hairline("kh.dv", 5, 6, 24, "kitA", 1, D); char dv[200]; snprintf(dv, sizeof dv, "%s", prim_ops());
  v_region("kh.hid", LAYER_CHROME); kit_hairline("kh.hid", 5, 6, 24, NULL, 0, D); char hid[200]; snprintf(hid, sizeof hid, "%s", prim_ops());
  v_region("kh.bad", LAYER_CHROME); kit_hairline("kh.bad", 5, 6, 24, "kitA", 0, (const int[2]){ 0, 2 });
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 5, "kit_hairline: one node each (a dash with on 0 is refused and makes none)", "");
  check(kat("kh.h", FN_RECT, 5, 6, 24, 1) && kat("kh.v", FN_RECT, 5, 6, 1, 24), "kit_hairline: solid is a rect, len x 1 or 1 x len", "");
  check(kat("kh.dh", FN_COMPOSED, 5, 6, 24, 1) && strcmp(dh, "[[\"dash\",0,0,24,\"h\",3,2,\"kitA\"]]") == 0, "kit_hairline: dashed is one composed picture with the dash op", dh);
  check(kat("kh.dv", FN_COMPOSED, 5, 6, 1, 24) && strcmp(dv, "[[\"dash\",0,0,24,\"v\",3,2,\"kitA\"]]") == 0, "kit_hairline: a vertical dash runs down", dv);
  check(kat("kh.hid", FN_COMPOSED, 5, 6, 24, 1) && strcmp(hid, "[]") == 0 && kabsent("kh.bad"), "kit_hairline: hidden keeps the box with the ops []", hid);
  { uint8_t px[24 * 4]; memset(px, 0, sizeof px); check(prim_compose(px, 24, 1, "[[\"dash\",0,0,24,\"h\",3,2,\"kitA\"]]") >= 0, "kit_hairline: the ops compose", "");
    int ok = 1; for (int i = 0; i < 24; i++) ok &= (i % 5 < 3) ? kpx(px, 24, i, 0) == (0xff000000u | KA) : kpx(px, 24, i, 0) == 0; check(ok, "kit_hairline: 3 on, 2 off, from the first pixel", ""); }
  /* kit_windowFrame: the corners outside the radius in the ground, a 1 px edge on the radius */
  prim_begin(); n0 = table_nodes();
  v_region("kw.a", LAYER_CHROME); kit_windowFrame("kw.a", 100, 50, 64, 48, 6, "kitA", "kitB"); char kw[300]; snprintf(kw, sizeof kw, "%s", prim_ops());
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 1 && kat("kw.a", FN_COMPOSED, 100, 50, 64, 48), "kit_windowFrame: one composed node of the box", "");
  check(strcmp(kw, "[[\"rcorners\",0,0,64,48,6,\"kitA\"],[\"rrect\",0,0,64,48,6,\"\",\"kitB\"]]") == 0, "kit_windowFrame: the corners op, then the edge op", kw);
  prim_begin(); n0 = table_nodes();
  v_region("kw.n", LAYER_CHROME); kit_windowFrame("kw.n", 100, 50, 24, 32, 6, NULL, "kitB"); char kn[300]; snprintf(kn, sizeof kn, "%s", prim_ops());
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 1 && kat("kw.n", FN_COMPOSED, 100, 50, 24, 32), "kit_windowFrame: ground NULL is still one composed node of the box", "");
  check(strcmp(kn, "[[\"rrect\",0,0,24,32,6,\"\",\"kitB\"]]") == 0, "kit_windowFrame: ground NULL is the edge op alone, no corners op", kn);
  /* kit_bezelComposed: one composed node, the rrect op, then the bevel's h op; no node when refused */
  prim_begin(); n0 = table_nodes();
  v_region("kc.a", LAYER_CHROME); kit_bezelComposed("kc.a", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC"); char ca[300]; snprintf(ca, sizeof ca, "%s", prim_ops());
  v_region("kc.b", LAYER_CHROME); kit_bezelComposed("kc.b", 40, 30, 200, 90, 10, "kitA", "kitB", NULL); char cb[300]; snprintf(cb, sizeof cb, "%s", prim_ops());
  v_region("kc.c", LAYER_CHROME); kit_bezelComposed("kc.c", 40, 30, 200, 90, 10, "kitA", NULL, "kitC"); char cc[300]; snprintf(cc, sizeof cc, "%s", prim_ops());
  v_region("kc.r", LAYER_CHROME); kit_bezelComposed("kc.r", 40, 30, 200, 90, 0, "kitA", "kitB", "kitC");
  v_region("kc.w", LAYER_CHROME); kit_bezelComposed("kc.w", 40, 30, 19, 90, 10, "kitA", "kitB", "kitC");
  v_region("kc.h", LAYER_CHROME); kit_bezelComposed("kc.h", 40, 30, 200, 19, 10, "kitA", "kitB", "kitC");
  v_region("kc.ok", LAYER_CHROME); kit_bezelComposed("kc.ok", 40, 30, 20, 20, 10, "kitA", "kitB", "kitC");
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 4 && kat("kc.a", FN_COMPOSED, 40, 30, 200, 90) && kat("kc.b", FN_COMPOSED, 40, 30, 200, 90) && kat("kc.ok", FN_COMPOSED, 40, 30, 20, 20), "kit_bezelComposed: one composed node of the box", "");
  check(strcmp(ca, "[[\"rrect\",0,0,200,90,10,\"kitA\",\"kitB\"],[\"h\",10,1,180,\"kitC\"]]") == 0, "kit_bezelComposed: the rrect op, then the bevel on row 1 from x r, w - 2r long", ca);
  check(strcmp(cb, "[[\"rrect\",0,0,200,90,10,\"kitA\",\"kitB\"]]") == 0, "kit_bezelComposed: no bevel, the rrect op alone", cb);
  check(strcmp(cc, "[[\"rrect\",0,0,200,90,10,\"kitA\",\"\"],[\"h\",10,1,180,\"kitC\"]]") == 0, "kit_bezelComposed: edge NULL is an empty edge", cc);
  check(kabsent("kc.r") && kabsent("kc.w") && kabsent("kc.h"), "kit_bezelComposed: a radius under 1, a width under 2r and a height under 2r make no node", "");
  /* kit_focusRingHold: one composed node at the box grown by frame focus.ring.hold's gap and band, a square 1 px ring op in the core colour, no key bands; the chrome layer of the caller's region;
     the log counts it as a hold, never a ring (rule 1 stays one ring); a box of no size keeps the node with no size and ops [] */
  { uint32_t fc; if (prim_palette_rgb("focus", &fc) < 0) prim_palette_add("focus", 0xffe6ad); }
  prim_begin(); n0 = table_nodes();
  v_region("kfh", LAYER_TYPE); kit_focusRingHold("kfh.a", (const int[4]){ 100, 200, 56, 56 }, 2); char fh[200]; snprintf(fh, sizeof fh, "%s", prim_ops());
  v_region("kfh.z", LAYER_ART); kit_focusRingHold("kfh.b", (const int[4]){ 16, 44, 0, 0 }, 2); char fz[200]; snprintf(fz, sizeof fz, "%s", prim_ops());
  n1 = table_nodes(); prim_end();
  { static char lb[65536]; prim_log_json(lb, (int)sizeof lb); int g = v_si("frame", "focus.ring.hold.gap", -1), w = v_si("frame", "focus.ring.hold.bands.0.w", 0), o = g + w; char want[160];
    snprintf(want, sizeof want, "[[\"ring\",\"round\",0,0,%d,%d,%d,%d,\"focus\"]]", 56 + 2 * o, 56 + 2 * o, w, 2 + o);
    check(g == 4 && w == 1, "kit_focusRingHold: frame focus.ring.hold is one 1 px core band and a gap of 4", "");
    check(n1 - n0 == 2 && kat("kfh.a", FN_COMPOSED, 100 - o, 200 - o, 56 + 2 * o, 56 + 2 * o) && strcmp(fh, want) == 0, "kit_focusRingHold: one composed node at box + gap + band, one rounded ring op (radius 2 + gap + band, the ring's outer corner) in focus, no key bands", fh);
    check(kat("kfh.b", FN_COMPOSED, 16, 44, 0, 0) && strcmp(fz, "[]") == 0, "kit_focusRingHold: a box of no size keeps its node with no size and ops []", fz);
    check(strstr(lb, "{\"id\":\"kfh\",\"layer\":\"chrome\",\"rect\":[95,195,66,66],\"hold\":1}") != NULL, "kit_focusRingHold: the caller's region at the chrome layer, logged as a hold and not as a ring", "");
    uint8_t *px = calloc((size_t)(66 * 66 * 4), 1); check(px && prim_compose(px, 66, 66, fh) >= 0 && kpx(px, 66, 0, 0) == 0 && kpx(px, 66, 33, 0) == 0xffffe6adu && kpx(px, 66, 1, 1) == 0 && kpx(px, 66, 33, 33) == 0, "kit_focusRingHold: the ops compose a 1 px line on the box's edge with a rounded corner", ""); free(px); }
  /* kit_tiles: the callback once for each tile in order at the list's box, the form that holds n, a refusal draws nothing */
  { static const char KT[] = "{\"l\":{\"forms\":{\"a\":{\"upTo\":2,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]},\"b\":{\"upTo\":4,\"first\":[0,0,4,8],\"pitch\":[5,0],\"grid\":[4,1]}}},\"p\":{\"first\":[1,2,3,4],\"pitch\":[10,20],\"grid\":[2,2]}}";
    spec_load("ktile", KT, sizeof KT - 1);
    kt_rec_t rec; int bx[8][4], r;
    #define KT_RUN(list, cnt, boxes) (memset(&rec, 0, sizeof rec), r = kit_tiles("ktile", list, cnt, kt_rec, &rec, boxes))
    KT_RUN("l", 2, bx); check(r == 2 && rec.n == 2 && rec.b[0][0] == 0 && rec.b[1][0] == 10 && rec.b[1][2] == 8 && bx[1][0] == 10 && bx[1][3] == 8, "kit_tiles: two tiles take the form of two, the boxes handed out as they are drawn", "");
    KT_RUN("l", 3, NULL); check(r == 4 && rec.n == 3 && rec.b[0][2] == 4 && rec.b[2][0] == 10 && rec.i[0] == 0 && rec.i[1] == 1 && rec.i[2] == 2, "kit_tiles: three tiles take the form of four, called in order, a NULL boxes is allowed", "");
    KT_RUN("l", 0, NULL); check(r == 2 && rec.n == 0, "kit_tiles: none is drawn and is not a refusal", "");
    KT_RUN("l", 5, NULL); check(r == -1 && rec.n == 0, "kit_tiles: a count no form holds is refused and draws nothing", "");
    KT_RUN("l", -1, NULL); check(r == -1 && rec.n == 0, "kit_tiles: a count below none is refused", "");
    KT_RUN("p", 4, bx); check(r == 0 && rec.n == 4 && bx[3][0] == 11 && bx[3][1] == 22 && bx[3][2] == 3 && bx[3][3] == 4 && bx[2][0] == 1 && bx[2][1] == 22, "kit_tiles: a list with no forms is its own first, pitch and grid (a 2 x 2 grid, row-major)", "");
    #undef KT_RUN
  }
  /* kit_nameTag: six nodes in a fixed order, centred on the anchor, 8 px inside the window, over the anchor by its rule, the width by the plate rule */
  { static const char KG[] = "{\"regions\":{\"glass\":{\"rect\":[0,0,400,300]},\"nameTag\":{\"h\":24,\"px\":16,\"plate\":{\"min\":48,\"max\":96,\"pad\":8,\"round\":8}}},\"colours\":{\"nameTag\":{\"text\":\"kitC\"}}}";
    spec_load("ktag", KG, sizeof KG - 1);
    int tw = v_measure("Moss", 16), want = (tw + 16 + 7) / 8 * 8; if (want < 48) want = 48; if (want > 96) want = 96;
    int a[4] = { 150, 100, 100, 60 }, al[4] = { -20, 100, 20, 60 }, ar[4] = { 390, 100, 20, 60 }, o[7][4], cnt = 0, okp = 0, oks = 0;
    #define KTAG(k, anc, yb, yo, rl, sl) do { prim_begin(); n0 = table_nodes(); kit_nameTag("ktag", "regions.glass", "Moss", anc, yb, yo, rl, sl, "kitA", "kitB", NULL, o[k]); n1 = table_nodes(); \
      if (k == 0) { cnt = n1 - n0; okp = kat("nameTag", FN_RECT, o[0][0], 180, want, 24) && kat("nameTag.et", FN_RECT, o[0][0], 180, want, 1) && kat("nameTag.er", FN_RECT, o[0][0] + want - 1, 180, 1, 24) && ktext(o[0][0] + (want - tw + 1) / 2, tw); } \
      if (k == 6) oks = n1 - n0 == 2 && kat("nameTag", FN_RECT, o[6][0], 180, 0, 0) && kabsent("nameTag.et") && ktext(o[6][0] + (want - tw + 1) / 2, 0); \
      prim_end(); } while (0)
    KTAG(6, a, 180, 60, KIT_TAG_AUTO, 1); KTAG(0, a, 180, 60, KIT_TAG_AUTO, 0); KTAG(1, a, 290, 60, KIT_TAG_AUTO, 0); KTAG(2, a, 180, 60, KIT_TAG_OVER, 0); KTAG(3, a, 290, 60, KIT_TAG_BELOW, 0);
    KTAG(4, al, 180, 60, KIT_TAG_AUTO, 0); KTAG(5, ar, 180, 60, KIT_TAG_AUTO, 0);
    #undef KTAG
    check(cnt == 4 && okp, "kit_nameTag: the four edges join the slot's fill and name (six nodes in all), at the box the plate rule gives", "");
    check(o[0][0] == 200 - want / 2 && o[0][1] == 180 && o[0][2] == want && o[0][3] == 24, "kit_nameTag: centred on the anchor, the top at yBelow", "");
    check(o[1][1] == 60 && o[2][1] == 60 && o[3][1] == 290, "kit_nameTag: AUTO goes over when the bottom would pass 8 above the window's bottom, OVER always, BELOW never", "");
    check(o[4][0] == 8 && o[5][0] + o[5][2] == 392, "kit_nameTag: slid to stay 8 px inside the window's left and right", "");
    check(oks && o[6][0] == o[0][0] && o[6][1] == 180 && o[6][2] == want && o[6][3] == 24, "kit_nameTag: a slot is the fill and the name with no size at the tag's place (no edge nodes, as before), and returns the same box", "");
  }
  /* kit_stage, kit_stamp and kit_pod: the nodes and boxes they draw, the ids the caller names, the forms (no room master, none sent, no stamp, no case, no clip, a refused class) */
  { static const struct { const char *id; int w, h; } PIC[] = { { "ks-room-b", 300, 200 }, { "ks-plate", 120, 120 }, { "ks-stamp", 64, 64 }, { "ks-case-b", 128, 128 }, { "ks-case-f", 128, 128 }, { "ks-shadow", 136, 14 }, { "ks-shadow-odd", 137, 14 } };   /* a picture is drawn 1:1, so each is loaded at the size it is drawn */
    { const char *hi = "{\"t\":\"hello\",\"contract\":1}"; wire_send(hi, (int)strlen(hi)); }
    for (int i = 0; i < 7; i++) { char m[160]; snprintf(m, sizeof m, "{\"t\":\"asset\",\"id\":\"%s\",\"w\":%d,\"h\":%d,\"policy\":\"art\",\"status\":\"placeholder\"}", PIC[i].id, PIC[i].w, PIC[i].h); check(wire_send(m, (int)strlen(m)) == 0 && wire_asset_slot(PIC[i].id) >= 0, "kit_stage, kit_stamp and kit_pod: a picture is loaded", PIC[i].id); }
    static const char PR[] = "{\"room\":[\"\",\"ks-missing\",\"ks-room-b\"],\"none\":[\"ks-missing\"],\"regions\":{\"stamp\":{\"case\":{\"back\":\"ks-case-b\",\"front\":\"ks-case-f\"}}}}";
    static const char KST[] = "{\"regions\":{\"stage\":{\"rect\":[10,20,300,200]}},\"r\":{\"rect\":[100,50,120,120]},\"cs\":{\"stampCase\":{\"rect\":[96,46,128,128]},\"stampCaseFront\":{\"rect\":[96,46,128,128]}},\"classes\":{\"pod\":{\"medium\":[120,152],\"odd\":[121,150],\"flat\":[120,0]}},\"shadow\":{\"widen\":16,\"h\":14}}";
    spec_load("props", PR, sizeof PR - 1); spec_load("kst", KST, sizeof KST - 1);
    int ok1, ok2, ok3, ok4, cnt1;
    prim_begin(); n0 = table_nodes();
    ok1 = kit_stage("kst", "regions.stage.rect", "kitA", "ks", "ks.ground", "ks.room", "room");
    n1 = table_nodes(); cnt1 = n1 - n0;
    check(ok1 == 1 && cnt1 == 2 && kat("ks.ground", FN_RECT, 10, 20, 300, 200) && kat("ks.room", FN_SPRITE, 10, 20, 300, 200), "kit_stage: the ground over the rect, then the first candidate the host has sent (the unsent and the empty ones skipped) at the same rect", "");
    ok2 = kit_stage("kst", "regions.stage.rect", "kitA", "ks", "ks.g2", NULL, NULL); ok3 = kit_stage("kst", "regions.stage.rect", "kitA", "ks", "ks.g3", "ks.r3", "none"); ok4 = kit_stage("kst", "regions.nowhere.rect", "kitA", "ks", "ks.g4", "ks.r4", "room");
    check(ok2 == 1 && kat("ks.g2", FN_RECT, 10, 20, 300, 200) && ok3 == 1 && kat("ks.g3", FN_RECT, 10, 20, 300, 200) && kabsent("ks.r3"), "kit_stage: no room master named, or none of the candidates sent: the ground alone, and no room node", "");
    check(ok4 == 0 && kabsent("ks.g4") && kabsent("ks.r4"), "kit_stage: a spec with no rectangle draws nothing and returns 0", "");
    prim_end();
    /* kit_stamp: the case's back, the plate, the clip, the stamp centred on the plate, the case's front, in this order. The ids of the stamp's own nodes are fixed, so each case is its own frame and is read after the frame ends (a node not drawn is dropped then). A node inside a clip is placed from the clip's corner. */
    kit_stamp_t full = { "st.plate", "st", "st.img", 0, "kst", "cs", NULL, { 0, 0 } }, bare = { "st.plate", "st", "st.img", 0, NULL, NULL, NULL, { 0, 0 } }, alone = { "st.plate", "st", "st.img", 1, "kst", "cs", NULL, { 0, 0 } };
    prim_begin(); kit_stamp("kst", "r.rect", "ks-plate", "ks-stamp", 64, 20, &full); prim_end();
    check(table_nodes() == 5 && kat("stamp.case", FN_SPRITE, 96, 46, 128, 128) && kat("st.plate", FN_SPRITE, 100, 50, 120, 120) && kat("stamp.clip", FN_CLIP, 128, 78, 64, 20) && kat("stamp.stamp", FN_SPRITE, 0, 0, 64, 64) && kat("stamp.front", FN_SPRITE, 96, 46, 128, 128),
      "kit_stamp: the case's back, the plate, the clip cut to clipH rows at the stamp's place (half the room left, rounding up), the stamp in it, the case's front: five nodes", "");
    prim_begin(); kit_stamp("kst", "r.rect", "ks-plate", "", 64, 20, &full); prim_end();
    check(table_nodes() == 3 && kat("stamp.case", FN_SPRITE, 96, 46, 128, 128) && kat("st.plate", FN_SPRITE, 100, 50, 0, 0) && kabsent("stamp.clip") && kabsent("stamp.stamp") && kat("stamp.front", FN_SPRITE, 96, 46, 128, 128),
      "kit_stamp: with no stamp the plate keeps its node with no size at the plate's corner, the stamp and the clip are not drawn, and the case's front stands", "");
    prim_begin(); kit_stamp("kst", "r.rect", "ks-plate", "ks-stamp", 0, 20, &alone); prim_end();
    check(table_nodes() == 3 && kat("st.plate", FN_SPRITE, 100, 50, 120, 120) && kabsent("stamp.stamp") && kabsent("stamp.clip"), "kit_stamp: a size of 0 is no stamp, and plateAlone keeps the plate shown without one", "");
    prim_begin(); kit_stamp("kst", "r.rect", "ks-plate", "ks-stamp", 64, -1, &bare); prim_end();
    check(table_nodes() == 2 && kat("st.plate", FN_SPRITE, 100, 50, 120, 120) && kat("stamp.stamp", FN_SPRITE, 128, 78, 64, 64) && kabsent("stamp.clip") && kabsent("stamp.case") && kabsent("stamp.front"), "kit_stamp: no clip (clipH -1) and no case (caseSpec NULL) are not drawn, and the stamp stands at its own place", "");
    prim_begin(); kit_stamp("kst", "r.rect", "", "ks-stamp", 64, 0, &bare); prim_end();
    check(table_nodes() == 2 && kabsent("st.plate") && kat("stamp.clip", FN_CLIP, 128, 78, 64, 0), "kit_stamp: no plate picture draws no plate node, and a clipH of 0 is a clip of no height (the first row not yet printed)", "");
    prim_begin(); kit_stamp("kst", "r.rect", "ks-plate", "ks-missing", 64, 20, &full); prim_end();
    check(table_nodes() == 3 && kat("st.plate", FN_SPRITE, 100, 50, 0, 0) && kabsent("stamp.clip") && kabsent("stamp.stamp") && kat("stamp.front", FN_SPRITE, 96, 46, 128, 128),
      "kit_stamp: a stamp named but not sent is no stamp (one meaning of \"has\"): the plate keeps its node with no size, no clip and no stamp", "");
    /* v_clip_box and v_snapshot: a screen's clip and the face's own snapshot, drawn through the toolbox */
    { int s0, s1;
      prim_begin(); v_region("vk", LAYER_CHROME); v_clip_box("vk.clip", 10, 20, 30, 40, 1); v_rect("vk.in", 15, 25, 5, 5, "kitA"); prim_end();
      check(table_nodes() == 2 && kat("vk.clip", FN_CLIP, 10, 20, 30, 40) && kat("vk.in", FN_RECT, 5, 5, 5, 5), "v_clip_box: a clip over the box that holds the next count nodes (the child placed from the clip's corner)", "");
      prim_snapshot_free(); prim_begin(); s0 = v_snapshot("vk.snap", 0, 0, 40, 30); prim_end();
      check(s0 == 0 && kabsent("vk.snap"), "v_snapshot: no snapshot, no node, returns 0", "");
      prim_begin(); v_region("vk", LAYER_CHROME); v_rect("vk.ground", 0, 0, 40, 30, "kitA"); prim_end();
      check(prim_snapshot(0, 0, 40, 30) >= 0, "v_snapshot: the face's snapshot is taken", "");
      prim_begin(); v_region("vk", LAYER_PAINTED); s1 = v_snapshot("vk.snap", 50, 60, 40, 30); prim_end();
      check(s1 == 1 && table_nodes() == 1 && kat("vk.snap", FN_SPRITE, 50, 60, 40, 30), "v_snapshot: the snapshot 1:1 as one sprite at its box, returns 1", "");
      prim_snapshot_free(); }
    /* kit_pod: the class's box on the axis and feet, the shadow a slot under it, a refused class */
    { int b[4], bo[4], bn[4], bx[4], r1, r2, r3, r4, r5; kit_podShadow_t on = { "pd.shadow", "pd", "ks-shadow", 1 }, off = { "pd.off", "pd", "ks-shadow", 0 };
      prim_begin(); n0 = table_nodes();
      r1 = kit_pod("kst", "medium", 160, 408, &on, b); r2 = kit_pod("kst", "medium", 160, 408, &off, bo); r3 = kit_pod("kst", "odd", 160, 408, &(kit_podShadow_t){ "pd.odd", "pd", "ks-shadow-odd", 1 }, bn); r4 = kit_pod("kst", "medium", 160, 408, NULL, bx);
      n1 = table_nodes();
      check(r1 == 1 && b[0] == 100 && b[1] == 256 && b[2] == 120 && b[3] == 152, "kit_pod: the class's box, centred on the axis and standing on the feet", "");
      check(kat("pd.shadow", FN_SPRITE, 92, 401, 136, 14), "kit_pod: the shadow is the box's width and shadow.widen by shadow.h, centred on the axis and the feet", "");
      check(r2 == 1 && bo[0] == 100 && kat("pd.off", FN_SPRITE, 92, 401, 0, 0), "kit_pod: shadow off keeps the shadow's node with no size at the shadow's corner", "");
      check(r3 == 1 && bn[0] == 99 && bn[1] == 258 && kat("pd.odd", FN_SPRITE, 160 - 69, 401, 137, 14), "kit_pod: an odd width centres by rounding the half up (the axis less 61 for 121, the shadow's less 69 for 137)", "");
      check(r4 == 1 && bx[0] == 100 && bx[3] == 152 && n1 - n0 == 3, "kit_pod: no shadow (NULL) is the box alone and draws no node", "");
      prim_end();
      prim_begin(); n0 = table_nodes();
      r5 = kit_pod("kst", "flat", 160, 408, &on, b); r1 = kit_pod("kst", "", 160, 408, &on, bo); r2 = kit_pod("kst", NULL, 160, 408, &on, bn); r3 = kit_pod("kst", "nothing", 160, 408, &on, bx); n1 = table_nodes();
      check(r5 == 0 && r1 == 0 && r2 == 0 && r3 == 0 && n1 == n0 && bo[0] == 160 && bo[1] == 408 && bo[2] == 0 && bo[3] == 0 && b[2] == 120 && b[3] == 0, "kit_pod: a class with a side of 0, an empty, a NULL and an unknown class return 0, draw no shadow and give the box from what the spec holds (zero sides)", "");
      prim_end();
    }
    spec_drop("kst"); spec_drop("props");   /* the spec table holds a fixed number of screens */
  }
  /* v_scol_or and v_token */
  { static const char KS[] = "{\"colours\":{\"chrome\":\"kitA\",\"blank\":\"\"},\"x\":{\"c\":\"kitB\",\"e\":\"\"}}";
    spec_load("kcol", KS, sizeof KS - 1);
    check(strcmp(v_scol_or("kcol", "x.c", "zz"), "kitB") == 0 && strcmp(v_scol_or("kcol", "x.none", "zz"), "zz") == 0 && strcmp(v_scol_or("kcol", "x.e", "zz"), "zz") == 0 && strcmp(v_scol_or("nospec", "x.c", "zz"), "zz") == 0, "v_scol_or: the string at the path; the default when it is absent or empty", "");
    check(strcmp(v_token("kcol", "chrome"), "kitA") == 0 && strcmp(v_token("kcol", "kitC"), "kitC") == 0 && strcmp(v_token("kcol", "blank"), "blank") == 0, "v_token: a named role gives its colour, a bare name stands for itself, an empty role falls back to the name", "");
    const char *k0 = v_scol_or("kcol", "x.c", "zz"); for (int i = 0; i < 15; i++) v_scol_or("kcol", "x.none", "yy"); check(strcmp(k0, "kitB") == 0, "v_scol_or: a result stays valid for the next 15 calls", ""); }
  /* kit_bezel: the nine-slice of the 2r + 4 source with a bevel line; h 0 is no band */
  static const kit_band_t B0 = { 0, 0, "kitC", "kitD" }, BT = { 0, 10, "kitC", "kitD" }, BB = { 1, 10, "kitC", NULL }, BX = { 0, 0, NULL, NULL };
  char s0[200], s1[200], sb[2000];
  prim_begin(); n0 = table_nodes();
  v_region("kb.a", LAYER_CHROME); kit_bezel("kb.a", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", NULL); snprintf(s0, sizeof s0, "%s", prim_ops());
  v_region("kb.nb", LAYER_CHROME); kit_bezel("kb.nb", 40, 30, 200, 90, 10, "kitA", "kitB", NULL, NULL);
  v_region("kb.z", LAYER_CHROME); kit_bezel("kb.z", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", &B0); snprintf(s1, sizeof s1, "%s", prim_ops());
  v_region("kb.x", LAYER_CHROME); kit_bezel("kb.x", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", &BX);
  v_region("kb.t", LAYER_CHROME); kit_bezel("kb.t", 40, 30, 200, 90, 6, "kitA", "kitB", NULL, &BT);
  v_region("kb.b", LAYER_CHROME); kit_bezel("kb.b", 40, 30, 200, 90, 6, "kitA", "kitB", NULL, &BB); snprintf(sb, sizeof sb, "%s", prim_ops());
  v_region("kb.sm", LAYER_CHROME); kit_bezel("kb.sm", 40, 30, 200, 14, 6, "kitA", "kitB", NULL, &BT);
  v_region("kb.r0", LAYER_CHROME); kit_bezel("kb.r0", 40, 30, 200, 90, 0, "kitA", "kitB", NULL, NULL);
  static const kit_band_t BS = { 1, 2, "kitC", NULL };
  v_region("kb.tb", LAYER_CHROME); kit_bezel("kb.tb", 40, 30, 200, 90, 6, "kitA", "kitB", "kitC", &BT);   /* a top band takes the bevel's row */
  v_region("kb.bb", LAYER_CHROME); kit_bezel("kb.bb", 40, 30, 200, 90, 6, "kitA", "kitB", "kitC", &BB);   /* a bottom band keeps the bevel */
  v_region("kb.r1", LAYER_CHROME); kit_bezel("kb.r1", 40, 30, 200, 4, 1, "kitA", "kitB", "kitC", &BS);    /* r 1, h under the bottom inset + 2: the bevel's row is the band's */
  v_region("kb.r1ok", LAYER_CHROME); kit_bezel("kb.r1ok", 40, 30, 200, 5, 1, "kitA", "kitB", "kitC", &BS);
  v_region("kb.short", LAYER_CHROME); kit_bezel("kb.short", 40, 30, 200, 8, 6, "kitA", "kitB", "kitC", NULL);   /* shorter than 2r: no panel, the bevel is still drawn */
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 2 + 1 + 2 + 2 + 1 + 1 + 0 + 0 + 0 + 2 + 0 + 2 + 1, "kit_bezel: the panel and its bevel, a band adds no node, a bezel under its insets or a radius under 1 makes none (its bevel stays), the band's bevel refusals make none", "");
  check(kabsent("kb.tb.panel") && kabsent("kb.tb.bevel"), "kit_bezel: a top band with a bevel makes no node", "");
  check(kat("kb.bb.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.bb.bevel", FN_RECT, 46, 31, 188, 1), "kit_bezel: a bottom band with a bevel keeps <id>.bevel at x + r, y + 1, w - 2r long", "");
  check(kabsent("kb.r1.panel") && kabsent("kb.r1.bevel") && kat("kb.r1ok.panel", FN_NINE, 40, 30, 200, 5) && kat("kb.r1ok.bevel", FN_RECT, 41, 31, 198, 1), "kit_bezel: at r 1 a bevel whose row is a band row is refused (h under bi + 2), a body row is drawn", "");
  check(kabsent("kb.short.panel") && kat("kb.short.bevel", FN_RECT, 46, 31, 188, 1), "kit_bezel: a bezel shorter than its insets draws its bevel and no panel", "");
  check(kat("kb.a.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.a.bevel", FN_RECT, 50, 31, 180, 1) && kabsent("kb.nb.bevel") && kat("kb.nb.panel", FN_NINE, 40, 30, 200, 90), "kit_bezel: <id>.panel and, with a bevel, <id>.bevel from x + r, y + 1, w - 2r long", "");
  check(strcmp(s0, "[[\"rrect\",0,0,24,24,10,\"kitA\",\"kitB\"]]") == 0, "kit_bezel: the source is a 2r + 4 box of the fill and edge", s0);
  check(strcmp(s0, s1) == 0 && kat("kb.z.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.z.bevel", FN_RECT, 50, 31, 180, 1) && kat("kb.x.panel", FN_NINE, 40, 30, 200, 90), "kit_bezel: a band of h 0 is no band: the same source and nodes", "");
  check(kat("kb.t.panel", FN_NINE, 40, 30, 200, 90) && kabsent("kb.t.bevel") && kat("kb.b.panel", FN_NINE, 40, 30, 200, 90) && kabsent("kb.b.bevel") && kabsent("kb.sm.panel") && kabsent("kb.r0.panel"), "kit_bezel: a banded bezel is the one panel node (a top band has no bevel)", "");
  { /* the band's pixels: the banded source against the plain one of the same size */
    int r = 6, W = 2 * r + 4, Ht = 12 + r + 4; char plain[200]; snprintf(plain, sizeof plain, "[[\"rrect\",0,0,%d,%d,%d,\"kitA\",\"kitB\"]]", W, Ht, r);
    uint8_t *pa = (uint8_t *)calloc((size_t)W * Ht * 4, 1), *pb = (uint8_t *)calloc((size_t)W * Ht * 4, 1); int c = W / 2;
    /* BT: the top band, h 10, rule: the source is 12 + 6 + 4 tall. The banded ops are in prim_prim ops of the last top call, rebuilt here from the same call */
    prim_begin(); v_region("kb.t2", LAYER_CHROME); kit_bezel("kb.t2", 0, 0, 200, 90, r, "kitA", "kitB", NULL, &BT); char top[2000]; snprintf(top, sizeof top, "%s", prim_ops()); prim_end();
    check(prim_compose(pa, W, Ht, plain) >= 0 && prim_compose(pb, W, Ht, top) >= 0, "kit_bezel: both sources compose", "");
    int shape = 1, edge = 1, inside = 1; for (int y = 0; y < Ht; y++) for (int x = 0; x < W; x++) {
      uint32_t a = kpx(pa, W, x, y), b = kpx(pb, W, x, y);
      if ((a >> 24) != (b >> 24)) shape = 0;              /* the same pixels are painted */
      if ((a & 0xffffff) == KB && a >> 24 && b != a) edge = 0;   /* the edge stays the edge's */
      if (y >= 12 && b != a) inside = 0;                  /* below the band's rows nothing changes */
    }
    check(shape && edge && inside, "kit_bezel: a band paints inside the outline only: the shape and the edge are the plain source's, nothing below the band changes", "");
    check(kpx(pb, W, c, 0) == (0xff000000u | KB) && kpx(pb, W, c, 1) == (0xff000000u | KC) && kpx(pb, W, c, 10) == (0xff000000u | KC) && kpx(pb, W, c, 11) == (0xff000000u | KD) && kpx(pb, W, c, 12) == (0xff000000u | KA), "kit_bezel: the edge row, then h rows of the band's fill, then the rule, then the body", "");
    check(kpx(pb, W, 1, 1) == kpx(pa, W, 1, 1) && kpx(pb, W, 1, 6) == (0xff000000u | KC) && kpx(pb, W, 1, 11) == (0xff000000u | KD), "kit_bezel: the band follows the corner arc (row 1 starts where the arc leaves the edge, row 6 and the rule reach the edge column)", "");
    free(pa); free(pb);
    int Hb = r + 11 + 4; uint8_t *pc = (uint8_t *)calloc((size_t)W * Hb * 4, 1); check(prim_compose(pc, W, Hb, sb) >= 0, "kit_bezel: the bottom source composes", "");
    check(kpx(pc, W, c, Hb - 1) == (0xff000000u | KB) && kpx(pc, W, c, Hb - 2) == (0xff000000u | KC) && kpx(pc, W, c, Hb - 11) == (0xff000000u | KC) && kpx(pc, W, c, Hb - 12) == (0xff000000u | KA) && kpx(pc, W, c, 1) == (0xff000000u | KA), "kit_bezel: side 1 is the same from the bottom edge, and the rule NULL leaves no rule row", "");
    free(pc);
  }
}
/* The layout check's log additions (log only, no pixel): a sprite's solid-ink box (alpha >= 128, rows and columns with at least 3 such pixels), a window of a larger picture flagged 8 and, when it cuts solid
   ink, 16, and the snapshot flagged 32 with its source nodes beside it (log.snapshot) */
static int log_has(const char *lg, const char *want) { return strstr(lg, want) != NULL; }
static void layout_log(void) {
  face_init(); prim_palette_add("kitA", KA); prim_palette_add("kitB", KB);
  { const char *hi = "{\"t\":\"hello\",\"contract\":1}"; wire_send(hi, (int)strlen(hi)); }
  static const struct { const char *id; int w, h; } PIC[] = { { "ll-soft", 20, 16 }, { "ll-big", 40, 40 } };
  for (int i = 0; i < 2; i++) { char m[160]; snprintf(m, sizeof m, "{\"t\":\"asset\",\"id\":\"%s\",\"w\":%d,\"h\":%d,\"policy\":\"art\",\"status\":\"placeholder\"}", PIC[i].id, PIC[i].w, PIC[i].h); check(wire_send(m, (int)strlen(m)) == 0 && wire_asset_slot(PIC[i].id) >= 0, "layout log: a picture is loaded", PIC[i].id); }
  { uint8_t *p = prim_asset_ptr(wire_asset_slot("ll-soft"));   /* a faint halo (alpha 40) over the whole, a solid block (alpha 200) at x 5..10, y 4..11, two solid pixels on row 14 and two on column 18 (too few to count) */
    for (int y = 0; y < 16; y++) for (int x = 0; x < 20; x++) { uint8_t *q = p + (y * 20 + x) * 4; q[0] = 0x33; q[1] = 0x22; q[2] = 0x11; q[3] = 40; if (x >= 5 && x <= 10 && y >= 4 && y <= 11) q[3] = 200; }
    p[(14 * 20 + 1) * 4 + 3] = 255; p[(14 * 20 + 2) * 4 + 3] = 255; p[(1 * 20 + 18) * 4 + 3] = 255; p[(2 * 20 + 18) * 4 + 3] = 255; }
  { uint8_t *p = prim_asset_ptr(wire_asset_slot("ll-big"));   /* clear, with a solid block (alpha 255) at x 10..29, y 10..29 */
    for (int y = 10; y < 30; y++) for (int x = 10; x < 30; x++) { uint8_t *q = p + (y * 40 + x) * 4; q[0] = 0x33; q[1] = 0x22; q[2] = 0x11; q[3] = 255; } }
  { int sb[4]; check(prim_asset_solid_box(wire_asset_slot("ll-soft"), sb) == 0 && sb[0] == 5 && sb[1] == 4 && sb[2] == 6 && sb[3] == 8, "layout log: prim_asset_solid_box: the soft-alpha picture's solid box is its block, the halo and the lone pixels left out", ""); }
  static char lg[65536]; char want[200]; int n;
  prim_begin(); v_region("ll.pic", LAYER_ART);
  v_sprite("ll.soft", "ll-soft", 100, 200, 20, 16);
  v_sprite_window("ll.cut", "ll-big", 15, 12, 300, 300, 10, 10);      /* inside the block: every edge's outer row or column is solid */
  v_sprite_window("ll.part", "ll-big", 12, 5, 400, 300, 10, 10);      /* rows 5..14: the block's rows 10..14 in it, row 15 outside is solid */
  v_sprite_window("ll.clear", "ll-big", 1, 1, 500, 300, 5, 5);        /* the clear corner: nothing solid in it or around it */
  prim_end(); n = prim_log_json(lg, (int)sizeof lg);
  snprintf(want, sizeof want, "[%u,3,1,\"ll.pic\",100,200,20,16,0,100,200,20,16,0,105,204,6,8]", (unsigned)v_id("ll.soft"));
  check(n > 0 && log_has(lg, want), "layout log: a soft-alpha sprite logs its ink (alpha above 0) and its solid-ink box (alpha >= 128, rows and columns with 3 or more) as values 14 to 17", want);
  snprintf(want, sizeof want, "[%u,3,1,\"ll.pic\",300,300,10,10,24,300,300,10,10,0,300,300,10,10]", (unsigned)v_id("ll.cut"));
  check(n > 0 && log_has(lg, want), "layout log: a window of a larger picture is flagged 8, and 16 when solid ink lies just outside it", want);
  snprintf(want, sizeof want, "[%u,3,1,\"ll.pic\",400,300,10,10,24,400,300,10,10,0,400,305,10,5]", (unsigned)v_id("ll.part"));
  check(n > 0 && log_has(lg, want), "layout log: a window's solid box is its own rows and columns of solid ink", want);
  snprintf(want, sizeof want, "[%u,3,1,\"ll.pic\",500,300,5,5,8,500,300,5,5,0,", (unsigned)v_id("ll.clear"));
  check(n > 0 && log_has(lg, want), "layout log: a window that cuts no solid ink is flagged 8 alone", want);
  check(n > 0 && !log_has(lg, "\"snapshot\""), "layout log: no snapshot shown, no snapshot in the log", "");
  /* a text's solid box: its advance by its cap top to its baseline */
  prim_begin(); v_region("ll.text", LAYER_TYPE); int tw = v_line_at("ll.t", "Hello", 40, 60, V_ANCHOR_CAP, 16, "kitA", V_ALIGN_LEFT); prim_end(); n = prim_log_json(lg, (int)sizeof lg);
  { char tail[80]; snprintf(want, sizeof want, "[%u,2,3,\"ll.text\",40,", (unsigned)v_id("ll.t")); snprintf(tail, sizeof tail, ",40,60,%d,%d]", tw, v_cap(16)); const char *p = strstr(lg, want), *e = p ? strchr(p, ']') : NULL;
    check(n > 0 && p && e && (size_t)(e - p) + 1 >= strlen(tail) && strncmp(e - strlen(tail) + 1, tail, strlen(tail)) == 0, "layout log: a text's solid box is its advance by its cap top to its baseline", tail); }
  /* the snapshot: its node flagged 32, its source nodes cut to its rect beside it (a node outside the rect left out) */
  prim_snapshot_free();
  prim_begin(); v_region("ll.src", LAYER_CHROME); v_rect("ll.ground", 0, 0, 60, 40, "kitA"); v_rect("ll.mark", 10, 8, 12, 6, "kitB"); v_rect("ll.out", 200, 200, 10, 10, "kitB"); prim_end();
  check(prim_snapshot(0, 0, 40, 30) >= 0, "layout log: the snapshot is taken", "");
  prim_begin(); v_region("ll.panel", LAYER_PAINTED); v_snapshot("ll.snap", 500, 100, 40, 30); prim_end(); n = prim_log_json(lg, (int)sizeof lg);
  snprintf(want, sizeof want, "[%u,3,2,\"ll.panel\",500,100,40,30,32,", (unsigned)v_id("ll.snap"));
  check(n > 0 && log_has(lg, want), "layout log: the snapshot's node is flagged 32 (composed content)", want);
  snprintf(want, sizeof want, "\"snapshot\":{\"region\":\"ll.panel\",\"from\":[0,0,40,30],\"at\":[500,100],\"nodes\":[[%u,1,0,\"ll.src\",0,0,40,30,0,0,0,40,30,0,0,0,40,30],", (unsigned)v_id("ll.ground"));
  check(n > 0 && log_has(lg, want), "layout log: log.snapshot carries the region and place of its node, the source rect and the source nodes cut to it", want);
  snprintf(want, sizeof want, "[%u,1,0,\"ll.src\",10,8,12,6,0,10,8,12,6,0,10,8,12,6]", (unsigned)v_id("ll.mark"));
  { char out[24]; snprintf(out, sizeof out, "[%u,", (unsigned)v_id("ll.out")); check(n > 0 && log_has(lg, want) && !log_has(lg, out), "layout log: a source node inside the rect is kept whole, one outside it is left out", want); }
  prim_snapshot_free(); prim_begin(); prim_end(); n = prim_log_json(lg, (int)sizeof lg);
  check(n > 0 && !log_has(lg, "\"snapshot\""), "layout log: a freed snapshot leaves the log", "");
}
/* kit_glint (Home's Library glints on it) and the top bar's readout after the title */
static void glint_readout(void) {
  static const char *GP = "regions.library.specimen.glint";
  int ms = spec_int("home", "regions.library.specimen.glint.ms", 0), top = spec_int("home", "regions.library.specimen.glint.levels", 0);
  check(ms == 2000 && top == 16, "kit_glint_level: home.json holds the period 2000 and 16 levels", "");
  check(kit_glint_level("home", GP, 0, 1) == 0 && kit_glint_level("home", GP, (uint32_t)ms / 4, 1) == 8 && kit_glint_level("home", GP, (uint32_t)ms / 2, 1) == 16 && kit_glint_level("home", GP, (uint32_t)(3 * ms / 4), 1) == 8 && kit_glint_level("home", GP, (uint32_t)ms, 1) == 0,
    "kit_glint_level: 0, 8, 16, 8, 0 at 0, ms/4, ms/2, 3ms/4 and ms (in over the first half, out over the second)", "");
  check(kit_glint_level("home", GP, 0, 0) == 16 && kit_glint_level("home", GP, (uint32_t)ms / 4, 0) == 16 && kit_glint_level("home", GP, (uint32_t)ms / 2, 0) == 16 && kit_glint_level("home", GP, (uint32_t)(3 * ms / 4), 0) == 16 && kit_glint_level("home", GP, (uint32_t)ms, 0) == 16,
    "kit_glint_level: motion 0 gives the top level at every time", "");
  { const char *m = "{\"t\":\"asset\",\"id\":\"kg-star-12\",\"w\":12,\"h\":12,\"policy\":\"art\",\"status\":\"placeholder\"}"; check(wire_send(m, (int)strlen(m)) == 0 && wire_asset_slot("kg-star-12") >= 0, "kit_glint: a picture is loaded", ""); }
  int g[4], gw = v_sk("home", "regions.library.specimen.glint.size", 0), gh = v_sk("home", "regions.library.specimen.glint.size", 1), bx = 100, by = 60; v_srect("home", "regions.library.window", g);
  char o0[160], o16[160];
  prim_begin(); v_region("library.window", LAYER_ART); kit_glint("library.glint.0", "kg-star-12", g[0] + bx, g[1] + by, gw, gh, 0); snprintf(o0, sizeof o0, "%s", prim_ops()); prim_end();
  check(table_nodes() == 1 && kat("library.glint.0", FN_COMPOSED, g[0] + bx - gw / 2, g[1] + by - gh / 2, gw, gh) && strstr(o0, "[[\"bayerPick\",-1,") == o0 && strstr(o0, ",0,") != NULL, "kit_glint: at level 0 one composed node, the bead's box as Home draws it (centred, glint.size), dithered in from clear", o0);
  prim_begin(); v_region("library.window", LAYER_ART); kit_glint("library.glint.0", "kg-star-12", g[0] + bx, g[1] + by, gw, gh, top); snprintf(o16, sizeof o16, "%s", prim_ops()); prim_end();
  { char want[160]; snprintf(want, sizeof want, "[[\"bayerPick\",-1,%d,16,%d,%d,0,0,0,0]]", wire_asset_slot("kg-star-12"), g[0] + bx - gw / 2, g[1] + by - gh / 2);
    check(table_nodes() == 1 && kat("library.glint.0", FN_COMPOSED, g[0] + bx - gw / 2, g[1] + by - gh / 2, gw, gh) && strcmp(o16, want) == 0, "kit_glint: at the top level the same node and box, the whole star", o16); }
  prim_begin(); kit_glint("library.glint.1", "kg-not-sent", 50, 50, 12, 12, 16); prim_end();
  check(kabsent("library.glint.1"), "kit_glint: an asset the host has not sent makes no node", "");
  /* the readout: "Library" (20 px) ends at x 115, the readout starts at 123 (137 for the text after a 10 px mark and 4 px), ending by x 248 */
  { const char *m = "{\"t\":\"asset\",\"id\":\"kr-mark-10\",\"w\":10,\"h\":10,\"policy\":\"art\",\"status\":\"placeholder\"}"; check(wire_send(m, (int)strlen(m)) == 0 && wire_asset_slot("kr-mark-10") >= 0, "readout: a mark is loaded", ""); }
  static const char *PRS[] = {
    "{\"frame\":{\"top\":{\"screen\":\"library\",\"title\":\"Library\",\"readout\":{\"text\":\"Untuva family\",\"mark\":\"kr-mark-10\"}}}}",
    "{\"frame\":{\"top\":{\"screen\":\"library\",\"title\":\"Library\",\"readout\":{\"text\":\"All species\",\"mark\":null}}}}",
    "{\"frame\":{\"top\":{\"screen\":\"library\",\"title\":\"Library\",\"readout\":{\"text\":\"Untuva family of the long hollow\",\"mark\":\"kr-mark-10\"}}}}",
    "{\"frame\":{\"top\":{\"screen\":\"library\",\"title\":\"Library\"}}}" };
  int tb[4], rb[4], mb[4], kt[4], km[4];
  for (int i = 0; i < 4; i++) {
    spec_drop("props"); spec_load("props", PRS[i], strlen(PRS[i]));
    prim_begin(); word_topBar(); prim_end();
    kbox("top.title.0", tb); kt[i] = kbox("top.readout.text", rb); km[i] = kbox("top.readout.mark", mb);
    int tm[4]; kbox("top.m.e", tm);   /* the Energy figure: a 16 px word of the bar, cap top 14 (centred in the bar) */
    if (i == 0) {
      check(tb[0] + tb[2] == 115, "readout: the title \"Library\" (20 px) ends at x 115", "");
      check(km[i] == FN_SPRITE && mb[0] == 127 && mb[2] == 10 && mb[3] == 10 && mb[1] == 15 && rb[1] == tm[1], "readout: with a mark, the 10 x 10 mark at the title's end + 12 (x 127), y 15: centred on the text's cap, 14 to 26, the cap centred in the bar as the counters'", "");
      check(kt[i] == FN_TEXT && rb[0] == 141 && rb[2] == v_measure("Untuva family", 16) && rb[2] == 103 && rb[0] + rb[2] <= 248, "readout: then 4 px, then the text at x 141, \"Untuva family\" (103 px) whole in the 107 px left", "");
    }
    if (i == 1) check(kabsent("top.readout.mark") && kt[i] == FN_TEXT && rb[0] == 127 && rb[1] == tm[1] && rb[2] == v_measure("All species", 16), "readout: without a mark, the text at the title's end + 12 (x 127) and no mark node", "");
    if (i == 2) { char cut[V_STR + 4]; v_clip("Untuva family of the long hollow", 248 - 141, 16, cut, sizeof cut); size_t n = strlen(cut);
      check(kt[i] == FN_TEXT && rb[0] == 141 && rb[2] == v_measure(cut, 16) && rb[0] + rb[2] <= 248 && n > 3 && strcmp(cut + n - 3, "\xe2\x80\xa6") == 0 && strlen(cut) < strlen("Untuva family of the long hollow"), "readout: a text too long is cut by v_clip to end by x 248, ending in the ellipsis", cut); }
    if (i == 3) check(kabsent("top.readout.text") && kabsent("top.readout.mark") && tb[0] + tb[2] == 115, "readout: props without frame.top.readout draw no readout node", "");
  }
  spec_drop("props");
}
/* kit_resident, word_livingWindow's cross-dither and kit_stamp's corner: the nodes, boxes and ops they draw, and the forms that draw as before */
static void resident_window_corner(void) {
  face_init(); prim_palette_add("kitA", KA); prim_palette_add("kitB", KB); prim_palette_add("kitC", KC); prim_palette_add("kitD", KD);
  { const char *hi = "{\"t\":\"hello\",\"contract\":1}"; wire_send(hi, (int)strlen(hi)); }
  static const struct { const char *id; int w, h; } PIC[] = { { "kr-pic", 30, 40 }, { "kr-from", 30, 40 }, { "kr-out", 10, 20 }, { "lw-pic", 40, 50 }, { "lw-from", 40, 50 }, { "kc-plate", 120, 120 }, { "kc-stamp", 64, 64 }, { "kc-corner", 16, 16 }, { "kf-pic", 304, 312 }, { "kf-from", 304, 312 } };
  for (int i = 0; i < 10; i++) { char m[160]; snprintf(m, sizeof m, "{\"t\":\"asset\",\"id\":\"%s\",\"w\":%d,\"h\":%d,\"policy\":\"art\",\"status\":\"placeholder\"}", PIC[i].id, PIC[i].w, PIC[i].h); check(wire_send(m, (int)strlen(m)) == 0 && wire_asset_slot(PIC[i].id) >= 0, "kit_resident, livingWindow and the corner: a picture is loaded", PIC[i].id); }
  static const char KRS[] = "{\"f\":{\"rect\":[144,68,304,312],\"axis\":296,\"feet\":380},\"r\":{\"rect\":[100,50,30,40]},\"o\":{\"rect\":[110,70,10,20]},\"g\":{\"rect\":[10,20,40,30],\"ground\":[10,40,40,6],\"foot\":[10,46,40,4]},\"colours\":{\"g\":{\"back\":\"kitA\",\"ground\":\"kitB\",\"groundTop\":\"kitC\",\"foot\":\"kitD\"}},\"s\":{\"rect\":[872,64,120,120]}}";
  spec_load("krs", KRS, sizeof KRS - 1);
  int ret;
  /* kit_resident: the still, the slot, the out mark, the dither */
  prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "kr-pic", "", 4, NULL, 0, NULL, NULL, NULL); prim_end();
  check(ret == 1 && table_nodes() == 2 && kat("kr.pic", FN_SPRITE, 100, 46, 30, 40) && kabsent("kr.dither") && kat("kr.out", FN_SPRITE, 100, 50, 0, 0), "kit_resident: the still picture 1:1 at its box lifted, the out mark's node with no size at the box's corner, not lifted; returns 1", "");
  prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "kr-pic", "", 0, "kr-missing", 8, NULL, NULL, NULL); prim_end();
  check(ret == 1 && table_nodes() == 2 && kat("kr.pic", FN_SPRITE, 100, 50, 30, 40) && kabsent("kr.dither"), "kit_resident: a from the host has not sent is no dither, the still as before", "");
  prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "kr-missing", "", 4, "kr-from", 8, NULL, NULL, NULL); prim_end();
  check(ret == 0 && table_nodes() == 0 && kabsent("kr.pic") && kabsent("kr.dither") && kabsent("kr.out"), "kit_resident: no picture sent and no out mark: no node, returns 0", "");
  prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "", "kr-out", 4, NULL, 0, NULL, NULL, NULL); prim_end();
  check(ret == 0 && table_nodes() == 2 && kat("kr.pic", FN_SPRITE, 100, 46, 0, 0) && kabsent("kr.dither") && kat("kr.out", FN_SPRITE, 110, 70, 10, 20), "kit_resident: out with no picture: the picture's node with no size over the out mark, the mark 1:1 at its rect; returns 0", "");
  prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "kr-pic", "kr-out", 0, NULL, 0, NULL, NULL, NULL); prim_end();
  check(ret == 1 && table_nodes() == 2 && kat("kr.pic", FN_SPRITE, 100, 50, 30, 40) && kat("kr.out", FN_SPRITE, 110, 70, 10, 20), "kit_resident: the picture and the out mark both sent: both drawn", "");
  static const int LV[3] = { 1, 8, 15 };
  for (int i = 0; i < 3; i++) {
    char ops[200], want[200];
    prim_begin(); ret = kit_resident("krs", "r.rect", "o.rect", "kr", "kr-pic", "", 4, "kr-from", LV[i], NULL, NULL, NULL); snprintf(ops, sizeof ops, "%s", prim_ops()); prim_end();
    snprintf(want, sizeof want, "[[\"bayerPick\",%d,%d,%d,100,46,0,0,0,0]]", wire_asset_slot("kr-from"), wire_asset_slot("kr-pic"), LV[i]);
    check(ret == 1 && table_nodes() == 3 && kat("kr.pic", FN_SPRITE, 100, 46, 0, 0) && kat("kr.dither", FN_COMPOSED, 100, 46, 30, 40) && strcmp(ops, want) == 0 && kat("kr.out", FN_SPRITE, 100, 50, 0, 0),
      "kit_resident: dithering, the picture's node with no size, then the pick from `from` to the picture at the level over the lifted box (levels 1, 8, 15), then the out slot", ops);
  }
  /* kit_resident with a figure: the picture's own size placed so the figure centres on the axis and its last solid row stands on the feet; NULL draws at the rect as before */
  { static const struct { const char *what; int f[4]; } FIG[] = { { "the adult stand (anchor)", { 84, 190, 136, 118 } }, { "the adult curl", { 88, 212, 130, 95 } }, { "the juvenile curl", { 100, 226, 103, 79 } } };
    for (int i = 0; i < 3; i++) {
      const int *f = FIG[i].f; int b[4];
      prim_begin(); ret = kit_resident("krs", "f.rect", "o.rect", "kr", "kf-pic", "", 0, NULL, 0, f, "f.axis", "f.feet"); prim_end();
      int k = kbox("kr.pic", b);
      check(ret == 1 && k == FN_SPRITE && table_nodes() == 2 && b[2] == 304 && b[3] == 312 && b[0] + f[0] + f[2] / 2 == 296 && b[1] + f[1] + f[3] - 1 == 380 && kat("kr.out", FN_SPRITE, b[0], b[1], 0, 0), "kit_resident: with a figure, the picture at its own size, the figure's centre on the axis (296) and its last solid row on the feet (380); the out slot at the same box", FIG[i].what);
      prim_begin(); ret = kit_resident("krs", "f.rect", "o.rect", "kr", "kf-pic", "", 2, "kf-from", 8, f, "f.axis", "f.feet"); prim_end();
      int d[4]; int kd = kbox("kr.dither", d);
      check(ret == 1 && kd == FN_COMPOSED && d[0] == b[0] && d[1] == b[1] - 2 && d[2] == 304 && d[3] == 312 && kat("kr.pic", FN_SPRITE, b[0], b[1] - 2, 0, 0) && kat("kr.out", FN_SPRITE, b[0], b[1], 0, 0), "kit_resident: with a figure, the lift rides up from the figure's box, the dither over that box, the out slot unlifted at it", FIG[i].what);
    }
    prim_begin(); kit_resident("krs", "f.rect", "o.rect", "kr", "kf-pic", "", 4, "kf-from", 8, NULL, NULL, NULL); prim_end();
    int nb[4]; kbox("kr.dither", nb);
    check(table_nodes() == 3 && nb[0] == 144 && nb[1] == 64 && nb[2] == 304 && nb[3] == 312 && kat("kr.out", FN_SPRITE, 144, 68, 0, 0), "kit_resident: figure NULL draws at the rect, lifted, as before", "");
    prim_begin(); kit_resident("krs", "f.rect", "o.rect", "kr", "kf-missing", "", 4, NULL, 0, FIG[1].f, "f.axis", "f.feet"); prim_end();
    check(table_nodes() == 0, "kit_resident: a figure with no picture sent draws no node, as with none", ""); }
  /* word_livingWindow: no from draws as before; a sent from hides the master's node and dithers to it from the same windows */
  int g[4] = { 10, 20, 40, 30 };
  prim_begin(); word_livingWindow("krs", "lw", NULL, "g", "colours.g", "lw-pic", 0, 10, NULL, 0); prim_end();
  check(table_nodes() == 5 && kat("lw.back", FN_RECT, 10, 20, 0, 0) && kat("lw.master", FN_SPRITE, g[0], g[1], g[2], g[3]) && kabsent("lw.dither"), "livingWindow: without from, the plates with no size and the master over the glass, as before", "");
  prim_begin(); word_livingWindow("krs", "lw", NULL, "g", "colours.g", "lw-pic", 0, 10, "", 9); prim_end();
  check(table_nodes() == 5 && kat("lw.master", FN_SPRITE, g[0], g[1], g[2], g[3]) && kabsent("lw.dither"), "livingWindow: an empty from is no from", "");
  prim_begin(); word_livingWindow("krs", "lw", NULL, "g", "colours.g", "lw-pic", 0, 10, "lw-missing", 9); prim_end();
  check(table_nodes() == 5 && kat("lw.master", FN_SPRITE, g[0], g[1], g[2], g[3]) && kabsent("lw.dither"), "livingWindow: a from the host has not sent is no from", "");
  { char ops[200], want[200];
    prim_begin(); word_livingWindow("krs", "lw", NULL, "g", "colours.g", "lw-pic", 0, 10, "lw-from", 9); snprintf(ops, sizeof ops, "%s", prim_ops()); prim_end();
    snprintf(want, sizeof want, "[[\"bayerPick\",%d,%d,9,10,20,0,10,0,10]]", wire_asset_slot("lw-from"), wire_asset_slot("lw-pic"));
    check(table_nodes() == 6 && kat("lw.master", FN_SPRITE, g[0], g[1], 0, 0) && kat("lw.dither", FN_COMPOSED, g[0], g[1], g[2], g[3]) && strcmp(ops, want) == 0, "livingWindow: with from, the master's node with no size, then the pick from `from` to the master at the level, both windows at (sx, sy), over the glass", ops); }
  prim_begin(); word_livingWindow("krs", "lw", NULL, "g", "colours.g", "", 0, 10, "lw-from", 9); prim_end();
  check(table_nodes() == 4 && kat("lw.back", FN_RECT, 10, 20, 40, 30) && kabsent("lw.master") && kabsent("lw.dither"), "livingWindow: with from and no master, the flat plates alone", "");
  /* kit_stamp's corner: a fifth fixed node after the front, 1:1 at cornerAt from the label's rect; NULL or "" adds none */
  kit_stamp_t cn = { "st.plate", "st", "st.img", 0, NULL, NULL, "kc-corner", { 104, 0 } }, cnull = { "st.plate", "st", "st.img", 0, NULL, NULL, NULL, { 104, 0 } }, cempty = { "st.plate", "st", "st.img", 0, NULL, NULL, "", { 104, 0 } }, cmiss = { "st.plate", "st", "st.img", 0, NULL, NULL, "kc-missing", { 104, 0 } };
  prim_begin(); kit_stamp("krs", "s.rect", "kc-plate", "kc-stamp", 64, -1, &cn); prim_end();
  check(table_nodes() == 3 && kat("st.plate", FN_SPRITE, 872, 64, 120, 120) && kat("stamp.stamp", FN_SPRITE, 900, 92, 64, 64) && kat("stamp.corner", FN_SPRITE, 976, 64, 16, 16), "kit_stamp: the corner 1:1 at the rect + cornerAt (976, 64, 16 x 16), after the label", "");
  prim_begin(); kit_stamp("krs", "s.rect", "kc-plate", "", 64, -1, &cn); prim_end();
  check(table_nodes() == 2 && kat("st.plate", FN_SPRITE, 872, 64, 0, 0) && kat("stamp.corner", FN_SPRITE, 976, 64, 16, 16), "kit_stamp: the corner stands with no stamp", "");
  prim_begin(); kit_stamp("krs", "s.rect", "kc-plate", "kc-stamp", 64, -1, &cnull); prim_end();
  check(table_nodes() == 2 && kabsent("stamp.corner"), "kit_stamp: a NULL corner adds no node", "");
  prim_begin(); kit_stamp("krs", "s.rect", "kc-plate", "kc-stamp", 64, -1, &cempty); prim_end();
  check(table_nodes() == 2 && kabsent("stamp.corner"), "kit_stamp: an empty corner adds no node", "");
  prim_begin(); kit_stamp("krs", "s.rect", "kc-plate", "kc-stamp", 64, -1, &cmiss); prim_end();
  check(table_nodes() == 2 && kabsent("stamp.corner"), "kit_stamp: a corner the host has not sent adds no node", "");
  spec_drop("krs");
}
/* The kit for type: the font codes (prim.h PRIM_FONT_*), the roles of frame.json type.roles resolved by the v_say forms, the refusals of an unknown role, ground or variant (an error and a
   node of no size), v_say equal to v_line_at for every role whose font is one of the three a px names (R16, M20, SB28), the role and ground in the log, and the cache dropped on a new load. */
static int ty_errors(const char *needle) { int n = 0; const char *m; while ((m = wire_poll()) != NULL) if (strstr(m, "\"error\"") && (!needle || strstr(m, needle))) n++; return n; }
static int ty_none(const char *id, int x) { int b[4]; return kbox(id, b) == FN_TEXT && b[0] == x && b[2] == 0 && b[3] == 0; }   /* a text node of no size at x */
static int ty_same(const char *a, const char *b) { int x[4], y[4]; int ka = kbox(a, x), kb = kbox(b, y); return ka == FN_TEXT && kb == FN_TEXT && x[0] == y[0] && x[1] == y[1] && x[2] == y[2] && x[3] == y[3]; }
/* the pan (anim.h anim_add_pan), tests/vectors/pan.json: the step's camera from the pan's first frame, over at its last step; the refusals; motion off is over at once; the same vectors run on the host's
   step cameras (station/tests/lineage.test.mjs, lineage.mjs panSteps) */
static void pan_vectors(const char *dir) {
  char path[512]; snprintf(path, sizeof path, "%s/pan.json", dir); long len; char *js = slurp(path, &len);
  if (!js) { check(0, "pan.json", "cannot read"); return; }
  if (spec_load("panv", js, (size_t)len) < 0) { check(0, "pan.json", spec_error()); free(js); return; }
  for (int c = 0, nc = spec_len("panv", "cases"); c < nc; c++) {
    char name[160], P[64]; snprintf(P, sizeof P, "cases.%d", c); spec_str("panv", v_fmt("%s.name", P), name, sizeof name);
    int from[2], to[2], steps[8], frac[8], n = spec_len("panv", v_fmt("%s.steps", P));
    for (int k = 0; k < 2; k++) { from[k] = spec_int("panv", v_fmt("%s.from.%d", P, k), 0); to[k] = spec_int("panv", v_fmt("%s.to.%d", P, k), 0); }
    for (int k = 0; k < n && k < 8; k++) { steps[k] = spec_int("panv", v_fmt("%s.steps.%d", P, k), 0); frac[k] = spec_int("panv", v_fmt("%s.frac.%d", P, k), 0); }
    anim_reset(); anim_tick(1000); int rc = anim_add_pan("tree", from, to, steps, frac, n, 1);
    if (spec_bool("panv", v_fmt("%s.refused", P), 0)) { int cam[2]; check(rc < 0 && !anim_pan_at("tree", cam), name, "refused, and no pan plays"); continue; }
    check(rc == 0, name, "added"); int cam[2] = { -1, -1 }, before = anim_pan_at("tree", cam);
    if (n > 1) check(before && cam[0] == from[0] + (to[0] - from[0]) * frac[0] / 100 && cam[1] == from[1] + (to[1] - from[1]) * frac[0] / 100, name, "before its first frame: the first step");
    anim_tick(1016);   /* the pan's first frame: its clock starts here */
    for (int a = 0, na = spec_len("panv", v_fmt("%s.at", P)); a < na; a++) {
      int ms = spec_int("panv", v_fmt("%s.at.%d.0", P, a), 0), want = spec_len("panv", v_fmt("%s.at.%d.1", P, a)) == 2; anim_tick(1016 + (uint32_t)ms);
      int got[2] = { 0, 0 }, on = anim_pan_at("tree", got); char d[160];
      snprintf(d, sizeof d, "at %d ms: want %s [%d, %d], got %s [%d, %d]", ms, want ? "" : "none", want ? spec_int("panv", v_fmt("%s.at.%d.1.0", P, a), 0) : 0, want ? spec_int("panv", v_fmt("%s.at.%d.1.1", P, a), 0) : 0, on ? "" : "none", got[0], got[1]);
      check(want ? on && got[0] == spec_int("panv", v_fmt("%s.at.%d.1.0", P, a), 0) && got[1] == spec_int("panv", v_fmt("%s.at.%d.1.1", P, a), 0) : !on, name, d);
    }
  }
  { int from[2] = { 0, 0 }, to[2] = { 10, 10 }, steps[3] = { 0, 67, 133 }, frac[3] = { 50, 85, 100 }, cam[2]; anim_reset(); anim_tick(10); check(anim_add_pan("tree", from, to, steps, frac, 3, 0) == 0 && !anim_pan_at("tree", cam), "pan: motion off, over at once (one step at the full offset: the screen's own camera)", ""); }
  { int from[2] = { 0, 0 }, to[2] = { 10, 10 }, steps[3] = { 0, 67, 133 }, frac[3] = { 50, 85, 100 }, cam[2]; anim_reset(); anim_tick(10); anim_add_pan("tree", from, to, steps, frac, 3, 1); anim_tick(26); anim_tick(80);
    int to2[2] = { -10, 0 }; anim_add_pan("tree", to, to2, steps, frac, 3, 1); anim_pan_at("tree", cam); check(anim_active() == 1 && cam[0] == 0 && cam[1] == 5, "pan: a pan on the same target again starts over (its first step from its own from)", ""); }
  anim_reset(); spec_drop("panv"); free(js);
}
/* the focus table's cap (focus.h FOCUS_TARGETS): a screen lists at most 64 targets; a selector the host answers with a 65th is taken as unanswered (its group's first target), an edge never lands past the table */
static void focus_cap(void) {
  check(FOCUS_TARGETS == 64, "focus: the table holds 64 targets", "");
  const char *g = "{\"fallback\":\"none\",\"node\":{\"up\":[\"node.parent\",\"none\"],\"down\":[\"node.child\",\"none\"]}}"; char err[200];
  focus_graph_t *gr = focus_graph_parse(g, (int)strlen(g), err, sizeof err); if (!gr) { check(0, "focus cap: the graph", err); return; }
  static focus_target_t t[FOCUS_TARGETS + 1]; memset(t, 0, sizeof t);
  for (int i = 0; i <= FOCUS_TARGETS; i++) { snprintf(t[i].id, sizeof t[i].id, "node.%d", i); snprintf(t[i].group, sizeof t[i].group, "node"); t[i].enabled = 1; t[i].index = i; t[i].x = 20 * (i % 32); t[i].y = 40 * (i / 32); t[i].w = t[i].h = 12; }
  focus_resolve_t r[1]; char out[FOCUS_ID];
  snprintf(r[0].sel, sizeof r[0].sel, "node.parent"); snprintf(r[0].id, sizeof r[0].id, "node.63");
  focus_move(gr, t, FOCUS_TARGETS, "node.10", FOCUS_UP, r, 1, NULL, out, sizeof out); check(strcmp(out, "node.63") == 0, "focus cap: the 64th target is on the table", out);
  snprintf(r[0].id, sizeof r[0].id, "node.64");
  focus_move(gr, t, FOCUS_TARGETS, "node.10", FOCUS_UP, r, 1, NULL, out, sizeof out); check(strcmp(out, "node.0") == 0, "focus cap: a selector answered with the 65th is taken as unanswered: the group's first target", out);
  focus_move(gr, t, FOCUS_TARGETS, "node.64", FOCUS_UP, r, 1, NULL, out, sizeof out); check(strcmp(out, "node.0") == 0, "focus cap: the ring on the 65th is not on the table: a move lands on the first target", out);
  focus_graph_free(gr);
}
static void type_kit(void) {
  face_init(); { const char *hi = "{\"t\":\"hello\",\"contract\":1}"; wire_send(hi, (int)strlen(hi)); }
  static const char *COLS[] = { "bone", "fog", "mist", "ink", "void", "orange", "amber", "focus", "gold", "coral" };
  for (unsigned i = 0; i < sizeof COLS / sizeof *COLS; i++) { uint32_t rgb; if (prim_palette_rgb(COLS[i], &rgb) < 0) prim_palette_add(COLS[i], 0x101010u * (i + 1)); }
  ty_errors(NULL);
  /* the font codes: the three a px names keep the px, Medium 16 is 1016, any other is refused */
  check(prim_font_px(PRIM_FONT_R16) == 16 && prim_font_px(PRIM_FONT_M16) == 16 && prim_font_px(PRIM_FONT_M20) == 20 && prim_font_px(PRIM_FONT_SB28) == 28 && PRIM_FONT_R16 == 16 && PRIM_FONT_M16 == 1016 && PRIM_FONT_M20 == 20 && PRIM_FONT_SB28 == 28, "font codes: 16, 1016, 20 and 28 name Regular 16, Medium 16, Medium 20 and SemiBold 28", "");
  check(prim_font_px(17) == 0 && prim_font_px(1020) == 0 && prim_font_px(2016) == 0 && prim_font_px(0) == 0 && prim_font_px(-16) == 0, "font codes: any other code names no font", "");
  snprintf(prim_text(), (size_t)prim_text_size(), "Open the Bay");
  { int r = prim_measure(PRIM_FONT_R16), m = prim_measure(PRIM_FONT_M16), bad = prim_measure(1020); char d[96]; snprintf(d, sizeof d, "Regular %d, Medium %d, 1020: %d", r, m, bad);
    check(r > 0 && m >= r && bad == -1 && prim_measure(17) == -1, "prim_measure: by code, Medium 16 as wide or wider than Regular 16, an unknown code -1", d); }
  prim_begin(); v_region("ty.code", LAYER_TYPE); int u0 = prim_unknown();
  snprintf(prim_text(), (size_t)prim_text_size(), "Hi"); prim_node(v_id("ty.c1016"), FN_TEXT, 100, 100, 20, 20, 0, PRIM_FONT_M16, 12);
  snprintf(prim_text(), (size_t)prim_text_size(), "Hi"); prim_node(v_id("ty.c1020"), FN_TEXT, 100, 140, 20, 20, 0, 1020, 14);
  int u1 = prim_unknown(); prim_end();
  check(kbox("ty.c1016", (int[4]){0}) == FN_TEXT && kabsent("ty.c1020") && u1 - u0 == 1, "prim_node: a text node at code 1016 is drawn, one at 1020 refused", "");
  /* every role of frame.json type.roles on every ground it has a colour on: its font is type.fonts' code, it draws one node (two with the shadow on a painting), no error */
  int nroles = spec_len("frame", "type.roles"), resolved = 0, pairs = 0, same = 0, shadows = 0;
  check(nroles == 16, "type.roles: the sixteen roles of the role table", "");
  for (int i = 0; i < nroles; i++) {
    char role[40], dummy[4]; if (!spec_member("frame", "type.roles", i, role, sizeof role, dummy, sizeof dummy)) continue;
    char font[16]; spec_str("frame", v_fmt("type.roles.%s.font", role), font, sizeof font);
    int want = strcmp(font, "R16") == 0 ? PRIM_FONT_R16 : strcmp(font, "M16") == 0 ? PRIM_FONT_M16 : strcmp(font, "M20") == 0 ? PRIM_FONT_M20 : strcmp(font, "SB28") == 0 ? PRIM_FONT_SB28 : -1;
    check(v_role_font(role) == want && want > 0, "role resolve: the role's font code is its type.fonts name's", role);
    int np = spec_len("frame", v_fmt("type.roles.%s.colour", role));
    for (int k = 0; k < np; k++) {
      char kind[16], col[24]; if (!spec_member("frame", v_fmt("type.roles.%s.colour", role), k, kind, sizeof kind, col, sizeof col)) continue;
      char sh[24]; spec_str("frame", v_fmt("type.roles.%s.shadow.%s", role, kind), sh, sizeof sh);
      const char *id = v_fmt("ty.%s.%s", role, kind); char sid[64]; snprintf(sid, sizeof sid, "%s.shadow", id); char idc[64]; snprintf(idc, sizeof idc, "%s", id);
      prim_begin(); v_region("ty.say", LAYER_TYPE); int w = v_say(idc, "Hello", 200, 100, V_ANCHOR_CAP, role, kind, V_ALIGN_LEFT); prim_end();
      int b[4], e = ty_errors(NULL), kb = kbox(idc, b), s4[4], ks = kbox(sid, s4);
      check(e == 0 && kb == FN_TEXT && w == v_measure("Hello", want) && b[0] == 200 && b[2] == w && (sh[0] ? ks == FN_TEXT && s4[0] == 201 && s4[1] == b[1] + 1 && s4[2] == w : ks < 0), "role resolve: v_say draws the role on each ground it has a colour on (and its shadow where it has one)", idc);
      pairs++; if (sh[0]) shadows++;
      if (want != PRIM_FONT_M16 && !sh[0]) {   /* v_say is v_line_at for the fonts a px names: every anchor and alignment, and v_say_in is v_line_in */
        int ok = 1; static const int AN[] = { V_ANCHOR_LINE, V_ANCHOR_CAP, V_ANCHOR_BASE, V_ANCHOR_MID }, AL[] = { V_ALIGN_LEFT, V_ALIGN_CENTRE, V_ALIGN_RIGHT };
        for (int a = 0; a < 4; a++) for (int l = 0; l < 3; l++) {
          prim_begin(); v_region("ty.eq", LAYER_TYPE); int w1 = v_say("ty.eq.say", "Legs & Tail", 300, 120, AN[a], role, kind, AL[l]); int w2 = v_line_at("ty.eq.line", "Legs & Tail", 300, 120, AN[a], want, col, AL[l]);
          int w3 = v_say_in("ty.eq.sin", "Legs & Tail", 300, 200, 120, AN[a], role, kind), w4 = v_line_in("ty.eq.lin", "Legs & Tail", 300, 200, 120, AN[a], want, col); prim_end();
          if (!(w1 == w2 && w3 == w4 && ty_same("ty.eq.say", "ty.eq.line") && ty_same("ty.eq.sin", "ty.eq.lin"))) ok = 0;
        }
        check(ok && ty_errors(NULL) == 0, "v_say == v_line_at and v_say_in == v_line_in for a role whose font a px names, every anchor and alignment", idc); same++;
      }
    }
    resolved++;
  }
  { char d[96]; snprintf(d, sizeof d, "%d roles, %d role-ground pairs, %d with a shadow, %d compared with v_line_at", resolved, pairs, shadows, same); check(resolved == 16 && same > 0 && shadows > 0, "role resolve: every role", d); printf("type kit: %s\n", d); }
  /* a ground by palette name, a variant */
  prim_begin(); v_region("ty.v", LAYER_TYPE);
  int wp = v_say("ty.pal", "Hello", 10, 10, V_ANCHOR_CAP, "quiet", "panel", V_ALIGN_LEFT), wv = v_say("ty.var", "12", 10, 40, V_ANCHOR_CAP, "figure.price", "bar", V_ALIGN_LEFT);
  v_run_t rr = v_say_run("ty.run", "Hello", 10, 70, "verb", "bar", V_ALIGN_LEFT); prim_end();
  check(wp == v_measure("Hello", 16) && wv == v_measure("12", PRIM_FONT_M16) && rr.width == v_measure("Hello", PRIM_FONT_M16) && ty_errors(NULL) == 0 && kbox("ty.run.0", (int[4]){0}) == FN_TEXT, "role resolve: a ground by its palette name (panel: pane, bar: band), a variant (figure.price), a run by role", "");
  /* the log carries the role, the ground, the cap top and the baseline */
  { static char b[65536]; prim_begin(); v_region("ty.log", LAYER_TYPE); v_say("ty.log.a", "Eyebrow", 40, 60, V_ANCHOR_CAP, "eyebrow", "pane", V_ALIGN_LEFT); v_line_at("ty.log.b", "Sized", 40, 100, V_ANCHOR_CAP, 16, "bone", V_ALIGN_LEFT); int n = prim_log_json(b, (int)sizeof b); prim_end();
    check(n > 0 && strstr(b, "{\"text\":\"Eyebrow\",\"px\":1016,\"region\":\"ty.log\",\"role\":\"eyebrow\",\"ground\":\"pane\",\"run\":0,\"x\":40,") && strstr(b, ",\"cap\":60,\"base\":72}") && strstr(b, "{\"text\":\"Sized\",\"px\":16,\"region\":\"ty.log\",\"role\":\"\",\"ground\":\"\",\"run\":0,\"x\":40,") && strstr(b, ",\"cap\":100,\"base\":112}"), "the log: a text node's role, ground, x, width, cap top and baseline (\"\" for a text set by size)", ""); }
  /* refusals: an error and one node of no size */
  static const struct { const char *role, *ground, *why; } BAD[] = { { "nope", "field", "no such role" }, { "title", "field", "no colour on this ground" }, { "label", "zzz", "no such ground" }, { "label.zzz", "field", "no such variant" }, { "", "field", "no such role" } };
  for (unsigned i = 0; i < sizeof BAD / sizeof *BAD; i++) {
    char id[32]; snprintf(id, sizeof id, "ty.bad.%u", i);
    prim_begin(); v_region("ty.bad", LAYER_TYPE); int w = v_say(id, "Hello", 50, 60, V_ANCHOR_CAP, BAD[i].role, BAD[i].ground, V_ALIGN_LEFT); int u = prim_unknown(); prim_end();
    int e = ty_errors(BAD[i].why);
    { char d[96]; snprintf(d, sizeof d, "%s: errors %d, refused %d", BAD[i].why, e, u);
    check(w == 0 && e == 1 && u == 0 && ty_none(id, 50), "refusal: an unknown role, a ground with no colour, an unknown ground or variant: an error and one text node of no size", d); }
  }
  prim_begin(); v_region("ty.bad", LAYER_TYPE); v_run_t br = v_say_run("ty.badrun", "Hello", 50, 60, "nope", "band", V_ALIGN_LEFT); prim_end();
  check(br.width == 0 && ty_errors("no such role") == 1 && ty_none("ty.badrun.0", 50), "refusal: v_say_run with an unknown role: an error and its first node with no size", "");
  check(v_role_width("Hello", "nope") == 0 && v_role_pitch("nope") == 0 && v_role_cap_in(10, 20, "nope") == 10 && v_role_cap_top(10, V_ANCHOR_LINE, "nope") == 10 && ty_errors("no such role") == 4, "refusal: the role measures of an unknown role answer 0 (the cap forms y), with an error each", "");
  check(v_role_width("Hello", "heading") == v_measure("Hello", 20) && v_role_pitch("heading") == 28 && v_role_pitch("label") == 20 && v_role_cap_in(48, 30, "eyebrow") == v_cap_in(48, 30, 16) && v_role_cap_top(48, V_ANCHOR_LINE, "heading") == v_cap_top(48, V_ANCHOR_LINE, 20), "the role measures: width, pitch (a role with none takes its px's), cap", "");
  /* a variant may carry a font, a pitch, a colour or a shadow (type.roles.<r>.variants.<v>): the measures follow it, the colour and the shadow too */
  check(v_role_font("nameTag") == PRIM_FONT_M20 && v_role_font("nameTag.crowd") == PRIM_FONT_M16 && v_role_font("figure.large") == PRIM_FONT_M20 && v_role_font("figure.price") == PRIM_FONT_M16, "variant font: nameTag.crowd is Medium 16, figure.large Medium 20, a palette-name variant keeps the role's", "");
  check(v_role_pitch("body.facts") == 24 && v_role_pitch("quiet.facts") == 24 && v_role_pitch("body") == 20 && v_role_pitch("quiet.bay") == 20 && v_role_pitch("nameTag.crowd") == 20 && v_role_pitch("figure.large") == 28, "variant pitch: body.facts and quiet.facts 24, a variant with none keeps the role's (or its font's)", "");
  check(v_role_width("Hello", "nameTag.crowd") == v_measure("Hello", PRIM_FONT_M16) && v_role_cap_in(10, 20, "figure.large") == v_cap_in(10, 20, PRIM_FONT_M20) && ty_errors(NULL) == 0, "variant font: the role measures follow the variant's font", "");
  { int b[4], s4[4]; static char lg[65536];
    prim_begin(); v_region("ty.var2", LAYER_TYPE);
    v_say("ty.wall", "Painted", 200, 100, V_ANCHOR_CAP, "code.wall", "painted", V_ALIGN_LEFT); v_say("ty.nowall", "Painted", 200, 140, V_ANCHOR_CAP, "code", "painted", V_ALIGN_LEFT);
    v_say("ty.crowd", "Crowd", 200, 180, V_ANCHOR_CAP, "nameTag.crowd", "pane", V_ALIGN_LEFT); v_say("ty.large", "12", 200, 220, V_ANCHOR_CAP, "figure.large", "field", V_ALIGN_LEFT);
    int n = prim_log_json(lg, (int)sizeof lg); prim_end();
    check(kbox("ty.wall", b) == FN_TEXT && kabsent("ty.wall.shadow") && kbox("ty.nowall", b) == FN_TEXT && kbox("ty.nowall.shadow", s4) == FN_TEXT && ty_errors(NULL) == 0, "variant shadow: code.wall on painted casts none (its shadow is {}), code does", "");
    check(n > 0 && strstr(lg, "{\"text\":\"Painted\",\"px\":16,\"region\":\"ty.var2\",\"role\":\"code.wall\",\"ground\":\"painted\"") && strstr(lg, "{\"text\":\"Crowd\",\"px\":1016,") && strstr(lg, "{\"text\":\"12\",\"px\":20,"), "variant font: the log carries the variant's font code (nameTag.crowd 1016, figure.large 20) and the role string", ""); }
  /* a shadow is drawn where the text node is drawn: a run's pieces and a price's figures cast the role's shadow, each just before its text; an icon casts none */
  { static char lg[65536]; int b[4], s4[4];
    prim_begin(); v_region("ty.run", LAYER_TYPE);
    v_say_run("ty.prun", "Hello", 10, 100, "quiet.bay", "painted", V_ALIGN_LEFT);
    prim_end(); int n = prim_log_json(lg, (int)sizeof lg);   /* after prim_end: the nodes have their sizes and join the screen */
    char key[40]; snprintf(key, sizeof key, "[%u,", (unsigned)v_id("ty.prun.0.shadow")); const char *ps = strstr(lg, key); snprintf(key, sizeof key, "[%u,", (unsigned)v_id("ty.prun.0")); const char *pt = strstr(lg, key);
    check(n > 0 && kbox("ty.prun.0", b) == FN_TEXT && kbox("ty.prun.0.shadow", s4) == FN_TEXT && s4[0] == 11 && s4[1] == b[1] + 1 && s4[2] == b[2] && b[0] == 10 && ps && pt && ps < pt, "run shadow: v_say_run in quiet.bay on painted draws ty.prun.0.shadow at (11, cap + 1) before ty.prun.0", "");
    prim_begin(); v_region("ty.run2", LAYER_TYPE); v_say_run("ty.prun2", "Hello", 10, 100, "quiet.bay", "painted", V_ALIGN_LEFT); v_say_run("ty.prun3", "Hello", 10, 140, "quiet.bay", "pane", V_ALIGN_LEFT); prim_end();
    check(kbox("ty.prun2.0.shadow", s4) == FN_TEXT && kabsent("ty.prun3.0.shadow") && ty_errors(NULL) == 0, "run shadow: only on the ground the role casts one", "");
    const char *cols[V_PRICE_N] = { "body", "body", "body", "body" };
    prim_begin(); v_region("ty.pr", LAYER_TYPE); v_say_price("ty.price", "\xe2\x9a\xa1 2 \xe2\x9d\x80 4", 10, 100, "quiet.bay", "painted", cols, "body"); prim_end();
    ty_errors("is not on the face");   /* the test face holds no icon pictures: the icons say so, the figures are drawn */
    check(kbox("ty.price.0.t", b) == FN_TEXT && kbox("ty.price.0.t.shadow", s4) == FN_TEXT && s4[0] == b[0] + 1 && s4[1] == b[1] + 1 && kabsent("ty.price.0.i.shadow") && kabsent("ty.price.3.t.shadow") && ty_errors(NULL) == 0, "price shadow: v_say_price casts the role's shadow under each figure, none under an icon or a group the price lacks", ""); }
  /* a run is logged by id: the pieces of one v_run or v_price call carry its v_id, on the type entries and as the 14th value of each node */
  { static char lg[65536];
    prim_begin(); v_region("ty.runlog", LAYER_TYPE);
    v_say_run("ty.runa", "Hello", 10, 100, "label", "field", V_ALIGN_LEFT); v_say("ty.runb", "Plain", 200, 100, V_ANCHOR_CAP, "label", "field", V_ALIGN_LEFT);
    const char *cols[V_PRICE_N] = { "label", "label", "label", "label" }; v_say_price("ty.runp", "\xe2\x9a\xa1 2", 300, 100, "label", "field", cols, "label");
    prim_end(); int n = prim_log_json(lg, (int)sizeof lg); ty_errors(NULL);   /* the price's icon, which the test face does not hold */
    char want[160]; snprintf(want, sizeof want, "{\"text\":\"Hello\",\"px\":16,\"region\":\"ty.runlog\",\"role\":\"label\",\"ground\":\"field\",\"run\":%u,", (unsigned)v_id("ty.runa"));
    char plain[160]; snprintf(plain, sizeof plain, "\"text\":\"Plain\",\"px\":16,\"region\":\"ty.runlog\",\"role\":\"label\",\"ground\":\"field\",\"run\":0,");
    char fig[160]; snprintf(fig, sizeof fig, "\"text\":\"2\",\"px\":16,\"region\":\"ty.runlog\",\"role\":\"label\",\"ground\":\"field\",\"run\":%u,", (unsigned)v_id("ty.runp"));
    char nd[64], r[24]; snprintf(nd, sizeof nd, "[%u,2,3,", (unsigned)v_id("ty.runa.0")); snprintf(r, sizeof r, ",%u]", (unsigned)v_id("ty.runa")); const char *p = strstr(lg, nd), *e = p ? strchr(p, ']') : NULL;
    int tail = 0; if (p && e) { const char *q = p; for (int k = 0; k < 13 && q && q < e; k++) q = strchr(q + 1, ','); tail = q && q < e && strncmp(q, r, strlen(r) - 1) == 0 && q[strlen(r) - 1] == ','; }   /* the node's 14th value is its run (the solid box follows it) */
    check(n > 0 && strstr(lg, want) && strstr(lg, plain) && strstr(lg, fig) && tail, "run log: a type entry carries the run's v_id (0 for a plain line), a node's 14th value is its run", ""); }
  /* an inline group: a v_run and a v_say inside v_inline carry the group's run, the run after v_inline_end is its own again */
  { static char lg[65536];
    prim_begin(); v_region("ty.inl", LAYER_TYPE);
    v_inline("ty.grp"); v_say_run("ty.ia", "Hello", 10, 100, "label", "field", V_ALIGN_LEFT); v_say("ty.ib", "Plain", 200, 100, V_ANCHOR_CAP, "label", "field", V_ALIGN_LEFT); v_inline_end();
    v_say_run("ty.ic", "After", 300, 100, "label", "field", V_ALIGN_LEFT);
    prim_end(); int n = prim_log_json(lg, (int)sizeof lg);
    char a[200], b[200], c[200];
    snprintf(a, sizeof a, "\"text\":\"Hello\",\"px\":16,\"region\":\"ty.inl\",\"role\":\"label\",\"ground\":\"field\",\"run\":%u,", (unsigned)v_id("ty.grp"));
    snprintf(b, sizeof b, "\"text\":\"Plain\",\"px\":16,\"region\":\"ty.inl\",\"role\":\"label\",\"ground\":\"field\",\"run\":%u,", (unsigned)v_id("ty.grp"));
    snprintf(c, sizeof c, "\"text\":\"After\",\"px\":16,\"region\":\"ty.inl\",\"role\":\"label\",\"ground\":\"field\",\"run\":%u,", (unsigned)v_id("ty.ic"));
    check(n > 0 && strstr(lg, a) && strstr(lg, b) && strstr(lg, c) && prim_run_get() == 0, "inline group: a v_run inside a v_inline carries the group's run, as does a plain line; after v_inline_end a run is its own", ""); }
  /* a variant neither a string nor an object, or naming a font the face does not hold, is refused: an error and a node of no size */
  { int len = 0; const char *raw = spec_raw("frame", "", &len); char *orig = raw ? (char *)malloc((size_t)len + 1) : NULL, *alt = raw ? (char *)malloc((size_t)len + 64) : NULL;
    if (orig && alt) { memcpy(orig, raw, (size_t)len); orig[len] = 0;
      static const struct { const char *from, *to, *why; int font; } BADV[] = { { "\"crowd\": { \"font\": \"M16\" }", "\"crowd\": { \"font\": \"X9\" }", "font", 0 }, { "\"crowd\": { \"font\": \"M16\" }", "\"crowd\": 5", "no such variant", 0 }, { "\"crowd\": { \"font\": \"M16\" }", "\"crowd\": [\"M16\"]", "no such variant", 0 }, { "\"crowd\": { \"font\": \"M16\" }", "\"crowd\": { \"colour\": 7 }", "colour", PRIM_FONT_M20 } };
      for (unsigned i = 0; i < sizeof BADV / sizeof *BADV; i++) {
        const char *at = strstr(orig, BADV[i].from); int ok = at != NULL, fo = -1, e = 0, w = -1, nz = 0, after = -1; char id[32]; snprintf(id, sizeof id, "ty.badv.%u", i);
        if (ok) { size_t head = (size_t)(at - orig); memcpy(alt, orig, head); size_t tl = strlen(BADV[i].to); memcpy(alt + head, BADV[i].to, tl); strcpy(alt + head + tl, at + strlen(BADV[i].from)); spec_load("frame", alt, strlen(alt));
          ty_errors(NULL); fo = v_role_font("nameTag.crowd");
          prim_begin(); v_region("ty.badv", LAYER_TYPE); w = v_say(id, "Hello", 50, 60, V_ANCHOR_CAP, "nameTag.crowd", "pane", V_ALIGN_LEFT); int u = prim_unknown(); prim_end(); e = ty_errors(NULL); nz = ty_none(id, 50) && u == 0;
          spec_load("frame", orig, strlen(orig)); after = v_role_font("nameTag.crowd"); }
        char d[96]; snprintf(d, sizeof d, "%s: font %d, errors %d, then %d", BADV[i].why, fo, e, after);
        check(ok && fo == BADV[i].font && w == 0 && e >= 1 && nz && after == PRIM_FONT_M16, "refusal: a variant of a font the face does not hold, or neither a string nor an object: an error and a node of no size", d);
      } }
    else check(0, "variant refusals: the frame's text", "absent");
    free(orig); free(alt); }
  /* the cache follows the spec: a new load of the frame with another font for a role is read */
  { int len = 0; const char *raw = spec_raw("frame", "", &len); char *orig = raw ? (char *)malloc((size_t)len + 1) : NULL, *alt = raw ? (char *)malloc((size_t)len + 1) : NULL;
    if (orig && alt) { memcpy(orig, raw, (size_t)len); orig[len] = 0; memcpy(alt, raw, (size_t)len + 1); alt[len] = 0;
      char *h = strstr(alt, "\"heading\": { \"font\": \"M20\""); int before = v_role_font("heading"), during = -1, after = -1;
      if (h) { memcpy(strstr(h, "M20"), "M16", 3); spec_load("frame", alt, strlen(alt)); during = v_role_font("heading"); spec_load("frame", orig, strlen(orig)); after = v_role_font("heading"); }
      char d[80]; snprintf(d, sizeof d, "%d, then %d, then %d", before, during, after);
      check(h && before == PRIM_FONT_M20 && during == PRIM_FONT_M16 && after == PRIM_FONT_M20, "role cache: a new load of the frame is read again (the heading set to M16 and back)", d); }
    else check(0, "role cache: the frame's text", "absent");
    free(orig); free(alt); }
  ty_errors(NULL);
}
int main(int argc, char **argv) {
  const char *dir = argc > 1 ? argv[1] : "tests/vectors";
  focus_vectors(dir);
  spec_graphs(argc > 2 ? argv[2] : "../ui/specs/station");
  metrics_vectors(dir);
  ring_vectors(dir);
  price_width();
  empty_id();
  layout_vectors(dir, argc > 2 ? argv[2] : "../ui/specs/station");
  line_words();
  kit_words();
  layout_log();
  glint_readout();
  resident_window_corner();
  type_kit();
  pan_vectors(dir);
  focus_cap();
  printf("face_test: %d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
