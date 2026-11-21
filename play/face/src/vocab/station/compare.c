/* Compare's words (direction 2, the pods design; the reading screen spec §4): the bench behind, two cream papers (this pod and its kin), a row a trait of the open chapter, Take to the reading room on each.
   Spec: `pods` regions.compare. Props: regions.compare { bench, sides [{ pod, title, which, rail { pic, inset, lanes, marks, hand, nudge }, goal, chapter, count, rows [{ name, look, picture, differs }], sealed, differs, take }] }. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define S "pods"
#define CM "regions.compare"

void inv_say(const char *id, const char *text, int x, int top, int w, int h, const char *role, const char *ground, int align);
void inv_plate(const char *id, const int r[4], const char *text, int dim, int lit, const char *base);
void mini_rail(const char *ns, const char *pp, const int inset[4]);

static void str(char *out, int cap, const char *path) { snprintf(out, (size_t)cap, "%s", v_pstr(path)); }
static void paper(const char *id, const int r[4]) { v_region(id, LAYER_CHROME); kit_panel(v_fmt("%s.paper", id), r[0], r[1], r[2], r[3], v_scol(S, CM ".paper.fill"), v_scol(S, CM ".paper.edge"), NULL, 0); }
static void bench_of(const char *path) { int b[4]; v_srect(S, CM ".bench.rect", b); char bench[96]; str(bench, sizeof bench, path); int g[4]; v_srect("frame", "regions.stage.rect", g); v_region("bench", LAYER_CHROME); v_rect("room.ground", g[0], g[1], g[2], g[3], v_scol(S, CM ".bench.ground")); v_name("bench"); v_slot("room.bench", bench, NULL, b[0], b[1], b[2], b[3], *bench != 0); }
static void tile(const char *id, const char *pic, int x, int y, int s) {
  v_region("page.tile", LAYER_CHROME); kit_panel(v_fmt("%s.t", id), x, y, s, s, v_scol(S, CM ".rows.tileFill"), v_scol(S, CM ".rows.tileEdge"), NULL, 0);
  v_name("page.tile"); v_slot(id, pic, NULL, x, y, s, s, *pic != 0);
}

/* ---- Compare (direction 2): the bench, two cream papers, a row a trait of the open chapter, Take to the reading room on each ---- */
int compare_take_rect(int k, int out[4]) { int p[4], t[4]; v_srect(S, v_fmt(CM ".panels.%d", k), p); v_srect(S, CM ".take", t); out[0] = p[0] + t[0]; out[1] = p[1] + t[1]; out[2] = t[2]; out[3] = t[3]; return out[2] > 0; }
static void compare_side(int k) {
  char B[40], t[V_STR], pic[96]; snprintf(B, sizeof B, "regions.compare.sides.%d", k); if (spec_len("props", B) < 0) return;
  int P[4], q[4]; v_srect(S, v_fmt(CM ".panels.%d", k), P); char id[16]; snprintf(id, sizeof id, "cmp.%d", k); paper(id, P);
  v_srect(S, CM ".pod", q); str(pic, sizeof pic, v_fmt("%s.pod", B)); v_name("compare.pod"); v_slot(v_fmt("cmp.%d.pod", k), pic, NULL, P[0] + q[0], P[1] + q[1], q[2], q[3], *pic != 0);
  v_region("compare.words", LAYER_TYPE);
  const char *line[5][2] = { { "title", "heading.umber" }, { "which", "quiet.umber" }, { "goal", "quiet.umber" }, { "chapter", "heading.umber" }, { "count", "quiet.umber" } };   /* the rail replaces the worth line (UI/UX 2026-10-30) */
  for (int i = 0; i < 5; i++) { v_srect(S, v_fmt(CM ".%s", line[i][0]), q); str(t, sizeof t, v_fmt("%s.%s", B, line[i][0])); if (*t) inv_say(v_fmt("cmp.%d.%s", k, line[i][0]), t, P[0] + q[0], P[1] + q[1], q[2], q[3], line[i][1], "paper", i == 4 ? V_ALIGN_RIGHT : V_ALIGN_LEFT); }
  { int ins[4]; v_srect(S, CM ".rail.inset", ins); ins[0] += P[0]; ins[1] += P[1]; mini_rail(v_fmt("cmp.%d.rail", k), v_fmt("%s.rail", B), ins); }   /* the pod's rail on its dark inset, the bracket on the open chapter's lane */
  v_srect(S, CM ".rule", q); v_region("compare.rule", LAYER_CHROME); v_rect(v_fmt("cmp.%d.rule", k), P[0] + q[0], P[1] + q[1], q[2], q[3], "soil");
  int rr[4], dw[4]; v_srect(S, CM ".rows.rect", rr); v_srect(S, CM ".rows.differs", dw); int pitch = v_si(S, CM ".rows.pitch", 40), ts = v_si(S, CM ".rows.tile", 36), wx = v_si(S, CM ".rows.words", 44), bh = v_si(S, CM ".rows.bandH", 38), ndy = v_si(S, CM ".rows.nameDy", -1), ldy = v_si(S, CM ".rows.lookDy", 18), tdy = v_si(S, CM ".rows.tileDy", 1);
  str(t, sizeof t, v_fmt("%s.sealed", B));
  if (*t) { v_region("compare.words", LAYER_TYPE); inv_say(v_fmt("cmp.%d.sealed", k), t, P[0] + rr[0], P[1] + rr[1], rr[2], 24, "body.umber", "paper", V_ALIGN_LEFT); }
  for (int i = 0, n = v_plen(v_fmt("%s.rows", B)); i < n && i < v_si(S, CM ".rows.max", 6); i++) {
    char R[56]; snprintf(R, sizeof R, "%s.rows.%d", B, i); int x = P[0] + rr[0], y = P[1] + rr[1] + i * pitch, differs = v_pbool(v_fmt("%s.differs", R), 0);
    if (differs) { char bf[24], be[24]; snprintf(bf, sizeof bf, "%s", v_scol(S, CM ".rows.band")); snprintf(be, sizeof be, "%s", v_scol(S, CM ".rows.bandEdge")); v_region("compare.row", LAYER_CHROME); kit_panel(v_fmt("cmp.%d.row.%d", k, i), x - 6, y, rr[2] + 12, bh, bf, be, NULL, 0); }   /* a difference: the row raised on a bone band */
    str(pic, sizeof pic, v_fmt("%s.picture", R)); if (*pic) tile(v_fmt("cmp.%d.tile.%d", k, i), pic, x, y + tdy, ts);   /* the tile only where the trait has a picture: never an empty box */
    v_region("compare.words", LAYER_TYPE);
    str(t, sizeof t, v_fmt("%s.name", R)); inv_say(v_fmt("cmp.%d.name.%d", k, i), t, x + wx, y + ndy, dw[0] - wx - 4, 20, "label.umber", "paper", V_ALIGN_LEFT);
    str(t, sizeof t, v_fmt("%s.look", R)); inv_say(v_fmt("cmp.%d.look.%d", k, i), t, x + wx, y + ldy, rr[2] - wx, 20, "body.umber", "paper", V_ALIGN_LEFT);
    if (differs) { char dword[24]; str(dword, sizeof dword, v_fmt("%s.differs", B)); inv_say(v_fmt("cmp.%d.differs.%d", k, i), dword, x + dw[0], y + dw[1], dw[2], dw[3], "label.umber", "paper", V_ALIGN_RIGHT);
      int tw = v_role_width(dword, "label.umber"); if (tw > dw[2]) tw = dw[2]; v_region("compare.row", LAYER_CHROME); v_rect(v_fmt("cmp.%d.differs.%d.u", k, i), x + dw[0] + dw[2] - tw, y + dw[1] + dw[3] - 1, tw, 1, v_scol(S, CM ".rows.underline")); }   /* the word underlined: a difference never lives in colour alone */
  }
  compare_take_rect(k, q); str(t, sizeof t, v_fmt("%s.take", B)); inv_plate(v_fmt("cmp.%d.take", k), q, t, 0, 0, CM ".plate");
}
void word_compare(void) { bench_of("regions.compare.bench"); compare_side(0); compare_side(1); }

