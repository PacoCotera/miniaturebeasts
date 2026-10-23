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
/* the metrics (metrics.json, made from the table of the compiled fonts): lv_text_get_width gives the width the table sums, for every Station string at 16, 20 and 28 px */
static void metrics_vectors(const char *dir) {
  char path[512]; snprintf(path, sizeof path, "%s/metrics.json", dir); long len; char *js = slurp(path, &len);
  if (!js) { check(0, "metrics.json", "cannot read"); return; }
  if (spec_load("metrics", js, (size_t)len) < 0) { check(0, "metrics.json", spec_error()); free(js); return; }
  int n = spec_len("metrics", "cases"), bad = 0;
  for (int c = 0; c < n; c++) {
    char p[64]; snprintf(p, sizeof p, "cases.%d.px", c); int px = spec_int("metrics", p, 0); snprintf(p, sizeof p, "cases.%d.width", c); int want = spec_int("metrics", p, -1);
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
  static const char *FILES[] = { "frame", "pods", "incubator", "vivarium", "habitat" };
  for (int i = 0; i < 5; i++) {
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
  {   /* leafArc: each arc's table holds 2·perArc − 1 slots, no other length (lvgl-switch.md §2.2) */
    static const char GOOD[] = "{\"r\":{\"leaf\":[16,20],\"leafArc\":{\"perArc\":2,\"inner\":[[0,0],[1,0],[2,0]],\"outer\":[[0,1],[1,1],[2,1]]}}}";
    static const char SHORT[] = "{\"r\":{\"leaf\":[16,20],\"leafArc\":{\"perArc\":2,\"inner\":[[0,0],[1,0],[2,0]],\"outer\":[[0,1],[1,1]]}}}";
    static const char LONG[] = "{\"r\":{\"leaf\":[16,20],\"leafArc\":{\"perArc\":2,\"inner\":[[0,0],[1,0],[2,0],[3,0]],\"outer\":[[0,1],[1,1],[2,1]]}}}";
    int box[LAYOUT_LEAVES][4];
    static const char TGOOD[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":2,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]},\"b\":{\"upTo\":4,\"first\":[0,0,4,8],\"pitch\":[5,0],\"grid\":[4,1]}}}}}";
    static const char TTWO[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":2,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]},\"b\":{\"upTo\":2,\"first\":[0,0,4,8],\"pitch\":[5,0],\"grid\":[4,1]}}}}}";
    static const char TNONE[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]}}}}}";
    static const char TSHORT[] = "{\"regions\":{\"t\":{\"layout\":[\"listPitch\"],\"forms\":{\"a\":{\"upTo\":3,\"first\":[0,0,8,8],\"pitch\":[10,0],\"grid\":[2,1]}}}}}";
    char verr[200]; int lb[4], lf = -1;
    spec_load("tgood", TGOOD, sizeof TGOOD - 1); check(screens_vet_spec("tgood", verr, sizeof verr) == 0 && (lf = layout_list_pitch("tgood", "regions.t", 3, 2, lb)) == 4 && lb[0] == 10 && lb[2] == 4 && layout_list_pitch("tgood", "regions.t", 2, 1, lb) == 2 && lb[0] == 10 && lb[2] == 8 && layout_list_pitch("tgood", "regions.t", 5, 0, lb) == -1 && layout_list_pitch("tgood", "regions.t", 3, 3, lb) == -1, "listPitch: n takes the smallest form that holds it, no form holds 5, an item past n is refused", "wrong");
    spec_load("ttwo", TTWO, sizeof TTWO - 1); check(screens_vet_spec("ttwo", verr, sizeof verr) == -1, "listPitch: two forms with one upTo are refused at load", "accepted");
    spec_load("tnone", TNONE, sizeof TNONE - 1); check(screens_vet_spec("tnone", verr, sizeof verr) == -1, "listPitch: a form with no upTo is refused at load", "accepted");
    spec_load("tshort", TSHORT, sizeof TSHORT - 1); check(screens_vet_spec("tshort", verr, sizeof verr) == -1, "listPitch: a grid shorter than its upTo is refused at load", "accepted");
    spec_load("arcgood", GOOD, sizeof GOOD - 1); check(layout_leaf_arc("arcgood", "r", 3, box) == 3, "leafArc: a table of 2·perArc − 1 slots", "refused");
    spec_load("arcshort", SHORT, sizeof SHORT - 1); check(layout_leaf_arc("arcshort", "r", 3, box) == -1, "leafArc: a short outer table is refused", "accepted");
    spec_load("arclong", LONG, sizeof LONG - 1); check(layout_leaf_arc("arclong", "r", 3, box) == -1, "leafArc: a long inner table is refused", "accepted");
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
static void kit_words(void) {
  face_init(); prim_palette_add("kitA", KA); prim_palette_add("kitB", KB); prim_palette_add("kitC", KC); prim_palette_add("kitD", KD);
  /* kit_panel: the fill and the four edges, in that order, the edge rows inside the box */
  prim_begin(); int n0 = table_nodes();
  v_region("kp.shown", LAYER_CHROME); kit_panel("kp.shown", 10, 20, 30, 40, "kitA", "kitB", 0);
  v_region("kp.noedge", LAYER_CHROME); kit_panel("kp.noedge", 10, 20, 30, 40, "kitA", NULL, 0);
  v_region("kp.outline", LAYER_CHROME); kit_panel("kp.outline", 10, 20, 30, 40, NULL, "kitB", 0);
  v_region("kp.slot", LAYER_CHROME); kit_panel("kp.slot", 10, 20, 30, 40, "kitA", "kitB", 1);
  v_region("kp.slotnoedge", LAYER_CHROME); kit_panel("kp.slotnoedge", 10, 20, 30, 40, "kitA", NULL, 1);
  int n1 = table_nodes(); prim_end();
  check(n1 - n0 == 5 + 1 + 4 + 5 + 1, "kit_panel: five nodes with an edge, one without, four for an outline only, the same five as a slot", "");
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
  /* kit_bezel: the nine-slice of the 2r + 4 source with a bevel line; h 0 is no band */
  static const kit_band_t B0 = { 0, 0, "kitC", "kitD" }, BT = { 0, 10, "kitC", "kitD" }, BB = { 1, 10, "kitC", NULL }, BX = { 0, 0, NULL, NULL };
  char s0[200], s1[200], sb[2000];
  prim_begin(); n0 = table_nodes();
  v_region("kb.a", LAYER_CHROME); kit_bezel("kb.a", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", NULL); snprintf(s0, sizeof s0, "%s", prim_ops());
  v_region("kb.nb", LAYER_CHROME); kit_bezel("kb.nb", 40, 30, 200, 90, 10, "kitA", "kitB", NULL, NULL);
  v_region("kb.z", LAYER_CHROME); kit_bezel("kb.z", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", &B0); snprintf(s1, sizeof s1, "%s", prim_ops());
  v_region("kb.x", LAYER_CHROME); kit_bezel("kb.x", 40, 30, 200, 90, 10, "kitA", "kitB", "kitC", &BX);
  v_region("kb.t", LAYER_CHROME); kit_bezel("kb.t", 40, 30, 200, 90, 6, "kitA", "kitB", "kitC", &BT);
  v_region("kb.b", LAYER_CHROME); kit_bezel("kb.b", 40, 30, 200, 90, 6, "kitA", "kitB", NULL, &BB); snprintf(sb, sizeof sb, "%s", prim_ops());
  v_region("kb.sm", LAYER_CHROME); kit_bezel("kb.sm", 40, 30, 200, 14, 6, "kitA", "kitB", NULL, &BT);
  v_region("kb.r0", LAYER_CHROME); kit_bezel("kb.r0", 40, 30, 200, 90, 0, "kitA", "kitB", NULL, NULL);
  n1 = table_nodes(); prim_end();
  check(n1 - n0 == 2 + 1 + 2 + 2 + 2 + 1, "kit_bezel: the panel and its bevel, a band adds no node, a bezel under its insets or a radius under 1 makes none", "");
  check(kat("kb.a.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.a.bevel", FN_RECT, 50, 31, 180, 1) && kabsent("kb.nb.bevel") && kat("kb.nb.panel", FN_NINE, 40, 30, 200, 90), "kit_bezel: <id>.panel and, with a bevel, <id>.bevel from x + r, y + 1, w - 2r long", "");
  check(strcmp(s0, "[[\"rrect\",0,0,24,24,10,\"kitA\",\"kitB\"]]") == 0, "kit_bezel: the source is a 2r + 4 box of the fill and edge", s0);
  check(strcmp(s0, s1) == 0 && kat("kb.z.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.z.bevel", FN_RECT, 50, 31, 180, 1) && kat("kb.x.panel", FN_NINE, 40, 30, 200, 90), "kit_bezel: a band of h 0 is no band: the same source and nodes", "");
  check(kat("kb.t.panel", FN_NINE, 40, 30, 200, 90) && kat("kb.t.bevel", FN_RECT, 46, 31, 188, 1) && kat("kb.b.panel", FN_NINE, 40, 30, 200, 90) && kabsent("kb.b.bevel") && kabsent("kb.sm.panel") && kabsent("kb.r0.panel"), "kit_bezel: a banded bezel is the same two nodes", "");
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
  printf("face_test: %d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
