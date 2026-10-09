/* face_test: the native test binary (lvgl-switch.md §4 L2.0): the vectors of tests/vectors, run on the C modules. Today the focus graph (focus.json); the layout and metrics vectors join it
   with their words. The same vectors run on the JavaScript side (tests/focus.test.mjs), so both give the same answer for every case.   face_test <vectors dir> */
#include "../focus/focus.h"
#include "../spec/spec.h"
#include "../layout/layout.h"
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
  layout_vectors(dir, argc > 2 ? argv[2] : "../ui/specs/station");
  printf("face_test: %d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
