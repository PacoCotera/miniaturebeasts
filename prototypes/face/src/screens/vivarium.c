/* The Vivarium (the collection v2 design; vivarium.json): one screen, three fields. The chip row and the card never move; only the field changes: the room view (screens/home.c home_viv_room: the room's painting at its crop, its mibis at one
   scale, the drop spots, the reserved silhouettes, the hand and the marks), the Tucked away page (the cold recess and its rails) or the house view (five slate bands). Every rectangle is vivarium.json's; the props name what is drawn. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../layout/layout.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define V "vivarium"
static int has(const char *asset) { return asset && *asset && wire_has_asset(asset); }
static const char *view(void) { const char *v = v_pstr("view"); return *v ? v : "room"; }
/* the one picture call of this file: a picture placed 1:1 (a slot that is the picture when it is on the face) */
static void pic(const char *id, const char *asset, int x, int y, int w, int h) { if (has(asset)) v_slot(id, asset, NULL, x, y, w, h, 1); }
/* the nudge (§3): a press with nothing beyond moves the ring 4 px toward it and lights that edge, until the next key */
static int g_nudge; static char g_nudge_at[48];
static void nudge_of(const char *cur, int *dx, int *dy) { *dx = *dy = 0; if (!g_nudge || strcmp(cur, g_nudge_at)) return; int d = g_nudge - 1; *dx = d == FOCUS_LEFT ? -4 : d == FOCUS_RIGHT ? 4 : 0; *dy = d == FOCUS_UP ? -4 : d == FOCUS_DOWN ? 4 : 0; }
static void ring(const char *target, const int box[4], const char *cur) {
  int dx, dy, r[4]; nudge_of(cur, &dx, &dy); memcpy(r, box, sizeof r); r[0] += dx; r[1] += dy;
  v_region("focus", LAYER_CHROME); word_focusRing("focus", V, target, r);
}
static void disc(const char *id, const char *mark, int x, int y) {   /* the 20 px mark disc (regions.marks.disc: panel fill, a 1 px bevel rim), the 16 x 16 master (the lamp at 12) centred on it */
  if (!has(mark)) return; char ops[160]; int ms[2] = { 16, 16 }; v_asset_size(mark, ms);
  snprintf(ops, sizeof ops, "[[\"rrect\",0,0,20,20,10,\"%s\",\"%s\"]]", v_scol(V, "colours.markDisc.fill"), v_scol(V, "colours.markDisc.rim"));
  v_region("marks", LAYER_CHROME); v_composed(v_fmt("%s.disc", id), x, y, 20, 20, ops); pic(v_fmt("%s.mark", id), mark, x + (20 - ms[0]) / 2, y + (20 - ms[1]) / 2, ms[0], ms[1]);
}
static void fill(const char *id, const int r[4], const char *colour) { kit_panel(id, r[0], r[1], r[2], r[3], colour, NULL, NULL, 0); }
/* a price after a word: its figure's cap top so that the two share a baseline (the word's line top `top` in its role; the price in `prole`) */
static int price_top(int top, const char *role, const char *prole) { return v_role_cap_top(top, V_ANCHOR_LINE, role) + v_cap(v_role_font(role)) - v_cap(v_role_font(prole)); }

/* ---- the chip row (regions.rooms, regions.chips) ---- */
static int chip_box(int i, int r[4]) {
  const char *kind = v_pstr(v_fmt("regions.rooms.items.%d.kind", i));
  if (!strcmp(kind, "all")) { v_srect(V, "regions.chips.all", r); return 1; }
  if (!strcmp(kind, "tucked")) { v_srect(V, "regions.chips.tucked", r); return 1; }
  return layout_list_pitch(V, "regions.chips", 4, i, r) >= 0;
}
static void chips_words(const char *cur, int lit[4]) {
  int n = v_plen("regions.rooms.items"); memset(lit, 0, sizeof(int) * 4);
  v_region("rooms", LAYER_CHROME);
  for (int i = 0; i < n; i++) {
    int r[4]; if (!chip_box(i, r)) continue; char base[40]; snprintf(base, sizeof base, "regions.rooms.items.%d", i);
    const char *kind = v_pstr(v_fmt("%s.kind", base)); char k[12]; snprintf(k, sizeof k, "%s", kind);
    char id[24]; snprintf(id, sizeof id, "chip.%d", i);
    const char *p = v_pstr(v_fmt("%s.picture", base)); char pc[96]; snprintf(pc, sizeof pc, "%s", p);
    v_region("rooms", LAYER_CHROME);   /* the chips are the region `rooms` (the chip row, vivarium.json), each node its own id chip.<i> */
    if (!strcmp(k, "tucked")) fill(id, r, v_scol(V, "colours.coldVeil"));
    else if (!strcmp(k, "room") && has(pc)) { v_name("rooms"); pic(id, pc, r[0], r[1], r[2], r[3]); }
    else fill(id, r, v_scol(V, "colours.chip.fill"));
    int nx = r[0] + v_sk(V, "regions.chips.name.at", 0), ty = r[1] + (r[3] - v_role_pitch("small")) / 2;
    if (!strcmp(k, "tucked")) { int mk[4]; v_srect(V, "regions.chips.tuckedChip.mark", mk); if (has(pc)) { v_name("rooms"); pic(v_fmt("%s.mark", id), pc, r[0] + mk[0], r[1] + mk[1], mk[2], mk[3]); } nx = r[0] + v_si(V, "regions.chips.tuckedChip.name", 32); }
    v_region(v_fmt("%s.name", id), LAYER_TYPE); v_say(v_fmt("%s.name", id), v_pstr(v_fmt("%s.name", base)), nx, ty, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT);
    const char *count = v_pstr(v_fmt("%s.count", base)); char cnt[24]; snprintf(cnt, sizeof cnt, "%s", count);
    if (*cnt) { int right = r[0] + (!strcmp(k, "tucked") ? v_si(V, "regions.chips.count.rightTucked", 296) : v_si(V, "regions.chips.count.right", 120));
      v_region(v_fmt("%s.count", id), LAYER_TYPE);
      if (!strcmp(k, "new")) { const char *cols[V_PRICE_N] = { "label", "label", "label", "label" }; int w = v_role_width(cnt, "label"); v_say_price(v_fmt("%s.count", id), cnt, right - w, price_top(ty, "small", "label"), "label", "pane", cols, "label"); }
      else v_say(v_fmt("%s.count", id), cnt, right, ty, V_ANCHOR_LINE, v_pbool(v_fmt("%s.full", base), 0) ? "small.full" : "small", "pane", V_ALIGN_RIGHT); }
    if (v_pbool(v_fmt("%s.lit", base), 0)) { int u[4] = { r[0], v_si(V, "regions.chips.underline.y", 80), r[2], v_si(V, "regions.chips.underline.h", 2) }; v_region(v_fmt("%s.lit", id), LAYER_CHROME); fill(v_fmt("%s.lit", id), u, v_scol(V, "colours.chip.lit")); memcpy(lit, r, sizeof(int) * 4); }
    if (strncmp(cur, "room.", 5) == 0 && !strcmp(cur + 5, v_pstr(v_fmt("%s.id", base))) && !anim_holding() && spec_len("props", "overlay") < 0) ring("focus.targets.room", r, cur);
  }
}

/* ---- the card (regions.card) ---- */
static void plate_box(int k, int r[4]) { v_srect(V, "regions.card.plates.first", r); r[1] += k * v_si(V, "regions.card.plates.pitch", 36); }
static void card_words(const char *cur) {
  int c[4]; v_srect(V, "regions.card.rect", c); const char *state = v_pstr("regions.card.state"); char st[12]; snprintf(st, sizeof st, "%s", state);
  v_region("card", LAYER_CHROME); kit_panel("card", c[0], c[1], c[2], c[3], v_scol(V, "colours.card.fill"), NULL, v_scol(V, "colours.card.bevel"), 0);
  if (!strcmp(st, "none")) return;
  int nm[4]; v_srect(V, "regions.card.name.rect", nm);
  char name[48]; snprintf(name, sizeof name, "%s", v_pstr("regions.card.name"));
  if (!strcmp(st, "mibi")) {
    int w[4], pl[4]; v_srect(V, "regions.card.well", w); v_srect(V, "regions.card.place", pl);
    v_region("card.well", LAYER_CHROME); fill("card.well", w, v_scol(V, "colours.card.well"));
    const char *pc = v_pstr("regions.card.picture"); char pcb[96]; snprintf(pcb, sizeof pcb, "%s", pc); int ps[2] = { 144, 148 }; v_asset_size(pcb, ps);
    v_name("card.portrait"); pic("card.portrait", pcb, pl[0] + (pl[2] - ps[0]) / 2, pl[1] + pl[3] - ps[1], ps[0], ps[1]);   /* its bottom row on the place's foot */
  }
  const char *role = v_role_width(name, "label") <= nm[2] ? "label" : "small";   /* 16 px; 14 px when it does not fit; never clipped */
  if (strcmp(st, "mibi")) nm[0] = v_sk(V, "regions.card.plates.first", 0);   /* no portrait (No mibis yet): the words over the plate */
  v_region("card.name", LAYER_TYPE); v_say("card.name", name, nm[0], nm[1], V_ANCHOR_LINE, role, "pane", V_ALIGN_LEFT);
  int y = v_sk(V, "regions.card.looks.rect", 1), lx = v_sk(V, "regions.card.looks.rect", 0), lw = v_sk(V, "regions.card.looks.rect", 2), lp = v_si(V, "regions.card.looks.pitch", 18);
  if (!strcmp(st, "mibi")) {
    /* the looks joined by " · " in 120 px lines, three at most; when they take more, the last looks are left off (trait order kept): no line is wider than the column */
    int maxl = v_si(V, "regions.card.looks.max", 3), nl = 0; char buf[400] = ""; const char *q = buf;
    for (int k = v_plen("regions.card.looks"); k > 0; k--) { char joined[200] = "";
      for (int i = 0; i < k; i++) { if (i) strncat(joined, " \xc2\xb7 ", sizeof joined - strlen(joined) - 1); strncat(joined, v_pstr(v_fmt("regions.card.looks.%d", i)), sizeof joined - strlen(joined) - 1); }
      nl = v_role_wrap(joined, lw, "small.quiet", buf, sizeof buf, maxl + 3); if (nl <= maxl) break; if (k == 1) nl = maxl; }
    for (int i = 0; i < nl; i++) { v_region("card.looks", LAYER_TYPE); v_say(v_fmt("card.looks.%d", i), q, lx, y, V_ANCHOR_LINE, "small.quiet", "pane", V_ALIGN_LEFT); q += strlen(q) + 1; y += lp; }
    const char *mk = v_pstr("regions.card.mark"); char mkb[64]; snprintf(mkb, sizeof mkb, "%s", mk); const char *words = v_pstr("regions.card.words"); char wb[96]; snprintf(wb, sizeof wb, "%s", words);
    if (*wb) { int wr[4]; v_srect(V, "regions.card.state.words", wr); char b2[200]; int n2 = v_role_wrap(wb, wr[2], "small", b2, sizeof b2, v_si(V, "regions.card.state.lines", 2)); const char *q2 = b2;
      if (has(mkb)) { int ms[2] = { 16, 16 }; v_asset_size(mkb, ms); v_name("card.mark"); pic("card.mark", mkb, v_si(V, "regions.card.state.markX", 880) + (16 - ms[0]) / 2, y + 1 + (16 - ms[1]) / 2, ms[0], ms[1]); }
      for (int i = 0; i < n2; i++) { v_region("card.state", LAYER_TYPE); v_say(v_fmt("card.state.%d", i), q2, wr[0], y, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT); q2 += strlen(q2) + 1; y += lp; } }
  }
  for (int k = 0, n = v_plen("regions.card.plates"); k < n; k++) {
    char base[40]; snprintf(base, sizeof base, "regions.card.plates.%d", k); int r[4]; plate_box(k, r); int held = v_pbool(v_fmt("%s.held", base), 0);
    char id[24]; snprintf(id, sizeof id, "plate.%d", k);
    v_region(id, LAYER_CHROME); kit_panel(id, r[0], r[1], r[2], r[3], NULL, v_scol(V, "colours.card.plate"), NULL, held);   /* live: a 1 px hairline; held: no hairline (the same nodes with no size) */
    char verb[48]; snprintf(verb, sizeof verb, "%s", v_pstr(v_fmt("%s.verb", base))); const char *pr = v_pstr(v_fmt("%s.price", base)); char price[24]; snprintf(price, sizeof price, "%s", pr);
    int vx = r[0] + v_si(V, "regions.card.plates.verb", 12), vy = r[1] + (r[3] - v_role_pitch("plate")) / 2;
    v_region(v_fmt("%s.verb", id), LAYER_TYPE); v_say(v_fmt("%s.verb", id), verb, vx, vy, V_ANCHOR_LINE, held ? "plate.held" : "plate", "pane", V_ALIGN_LEFT);
    if (*price) { const char *pro = held ? "quiet" : "label", *cols[V_PRICE_N] = { pro, pro, pro, pro };
      v_region(v_fmt("%s.price", id), LAYER_TYPE); v_say_price(v_fmt("%s.price", id), price, vx + v_role_width(verb, "plate") + v_si(V, "regions.card.plates.price.gap", 6), price_top(vy, held ? "plate.held" : "plate", pro), pro, "pane", cols, pro); }
    const char *pid = v_pstr(v_fmt("%s.id", base)); if (!strcmp(cur, pid) && !anim_holding() && spec_len("props", "overlay") < 0) ring("focus.targets.plate", r, cur);
  }
  const char *why = v_pstr("regions.card.why"); char wb[300]; snprintf(wb, sizeof wb, "%s", why);
  if (*wb) { int wr[4]; v_srect(V, "regions.card.why.rect", wr); char b[600]; int n = v_role_wrap(wb, wr[2], "small.why", b, sizeof b, v_si(V, "regions.card.why.lines", 3)); const char *q = b;
    for (int i = 0; i < n; i++) { v_region("card.why", LAYER_TYPE); v_say_run(v_fmt("card.why.%d", i), q, wr[0], v_role_cap_top(wr[1] + i * v_si(V, "regions.card.why.pitch", 20), V_ANCHOR_LINE, "small.why"), "small.why", "pane", V_ALIGN_LEFT); q += strlen(q) + 1; } }   /* a run: a price's icon inline */
}

/* ---- the house view (regions.house) ---- */
static void band_rect(int j, int r[4]) { v_srect(V, "regions.house.bands.first", r); r[1] += j * v_si(V, "regions.house.bands.pitch", 96); }
static void place_rect(int j, int k, const char *what, int r[4]) { int b[4]; band_rect(j, b); v_srect(V, v_fmt("regions.house.place.%s", what), r); r[0] += b[0] + k * v_si(V, "regions.house.place.pitch", 84) - 16; r[1] += b[1]; }   /* the place's offsets are from the screen's x 16 (the band's left) */
static int house_find(const char *id, int *j, int *k) {
  int nb = v_plen("regions.house.bands");
  for (int b = 0; b < nb; b++) { const char *kind = v_pstr(v_fmt("regions.house.bands.%d.kind", b));
    if ((!strcmp(id, "house.add") && !strcmp(kind, "add")) || (!strcmp(id, "house.cold") && !strcmp(kind, "cold"))) { *j = b; *k = -1; return 1; }
    for (int q = 0, n = v_plen(v_fmt("regions.house.bands.%d.places", b)); q < n; q++) if (!strcmp(v_pstr(v_fmt("regions.house.bands.%d.places.%d.id", b, q)), id)) { *j = b; *k = q; return 1; } }
  return 0;
}
static int house_box(const char *id, int r[4]) { int j, k; if (!house_find(id, &j, &k)) return 0; if (k < 0) band_rect(j, r); else place_rect(j, k, "ring", r); return 1; }
static void house_words(const char *cur) {
  int nb = v_plen("regions.house.bands"); int focusRing[4] = { 0 }, fj = -1, fk = -1; char fmark[64] = "";
  for (int j = 0; j < nb; j++) {
    char base[40]; snprintf(base, sizeof base, "regions.house.bands.%d", j); char kind[12]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("%s.kind", base)));
    int r[4]; band_rect(j, r); char id[24]; snprintf(id, sizeof id, "band.%d", j);
    v_region(id, LAYER_CHROME);
    if (!strcmp(kind, "later")) kit_panel(id, r[0], r[1], r[2], r[3], NULL, v_scol(V, "colours.house.later"), NULL, 0);
    else fill(id, r, !strcmp(kind, "cold") ? v_scol(V, "colours.coldVeil") : v_scol(V, "colours.house.band"));
    int nx = r[0] + v_sk(V, "regions.house.name.at", 0), ny = r[1] + v_sk(V, "regions.house.name.at", 1);
    char name[48]; snprintf(name, sizeof name, "%s", v_pstr(v_fmt("%s.name", base)));
    if (!strcmp(kind, "cold")) { const char *mk = v_pstr(v_fmt("%s.mark", base)); char mkb[64]; snprintf(mkb, sizeof mkb, "%s", mk); if (has(mkb)) { v_name(id); pic(v_fmt("%s.mark", id), mkb, nx, ny + 1, 16, 16); } nx += 20; }
    if (*name) { v_region(v_fmt("%s.name", id), LAYER_TYPE); v_say(v_fmt("%s.name", id), name, nx, ny, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT); }
    if (!strcmp(kind, "add")) { const char *pr = v_pstr(v_fmt("%s.price", base)); char price[24]; snprintf(price, sizeof price, "%s", pr); if (*price) { const char *cols[V_PRICE_N] = { "label", "label", "label", "label" }; v_region(v_fmt("%s.price", id), LAYER_TYPE); v_say_price(v_fmt("%s.price", id), price, nx + v_role_width(name, "small") + 8, price_top(ny, "small", "label"), "label", "pane", cols, "label"); } }
    if (!strcmp(kind, "cold")) { const char *cn = v_pstr(v_fmt("%s.count", base)); char cnt[12]; snprintf(cnt, sizeof cnt, "%s", cn); v_region(v_fmt("%s.count", id), LAYER_TYPE); v_say(v_fmt("%s.count", id), cnt, nx + v_role_width(name, "small") + 8, ny, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT); }
    if (v_pbool(v_fmt("%s.full", base), 0)) { v_region(v_fmt("%s.full", id), LAYER_TYPE); v_say(v_fmt("%s.full", id), v_sstr(V, "strings.band.full"), r[0] + v_si(V, "regions.house.full.right", 664), ny, V_ANCHOR_LINE, "small.full", "pane", V_ALIGN_RIGHT); }
    for (int k = 0, n = v_plen(v_fmt("%s.places", base)); k < n; k++) {
      char pb[80]; snprintf(pb, sizeof pb, "%s.places.%d", base, k); char pst[12]; snprintf(pst, sizeof pst, "%s", v_pstr(v_fmt("%s.state", pb)));
      int bx[4]; place_rect(j, k, "box", bx); char pid[40]; snprintf(pid, sizeof pid, "%s", v_pstr(v_fmt("%s.id", pb)));
      if (!strcmp(pst, "more")) { char more[12]; snprintf(more, sizeof more, "%s", v_pstr(v_fmt("%s.more", pb))); char ops[160]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]]", bx[2], bx[3], bx[2] / 2, v_scol(V, "colours.markDisc.fill"), v_scol(V, "colours.markDisc.rim"));
        v_region(v_fmt("place.%d.%d", j, k), LAYER_CHROME); v_composed(v_fmt("place.%d.%d", j, k), bx[0], bx[1], bx[2], bx[3], ops); v_region(v_fmt("place.%d.%d.more", j, k), LAYER_TYPE); v_say_in(v_fmt("place.%d.%d.more", j, k), more, bx[0], bx[2], bx[1] + (bx[3] - v_role_pitch("small")) / 2, V_ANCHOR_LINE, "small", "pane"); }
      else if (strcmp(pst, "free")) { char pc[96]; snprintf(pc, sizeof pc, "%s", v_pstr(v_fmt("%s.picture", pb))); int ps[2] = { 48, 50 }; v_asset_size(pc, ps); v_name("house.mibi"); pic(v_fmt("place.%d.%d", j, k), pc, bx[0] + (bx[2] - ps[0]) / 2, bx[1] + bx[3] - ps[1], ps[0], ps[1]); }
      char mk[64]; snprintf(mk, sizeof mk, "%s", v_pstr(v_fmt("%s.mark", pb)));
      if (*pid && !strcmp(pid, cur)) { place_rect(j, k, "ring", focusRing); fj = j; fk = k; snprintf(fmark, sizeof fmark, "%s", mk); }
      else if (*mk) { int d[4]; place_rect(j, k, "disc", d); disc(v_fmt("place.%d.%d", j, k), mk, d[0], d[1]); }
    }
    if ((!strcmp(cur, "house.add") && !strcmp(kind, "add")) || (!strcmp(cur, "house.cold") && !strcmp(kind, "cold"))) { memcpy(focusRing, r, sizeof r); fj = j; fk = -1; }
  }
  if (fj >= 0 && !anim_holding() && spec_len("props", "overlay") < 0) { ring("focus.targets.house", focusRing, cur); if (fk >= 0 && *fmark) { int d[4]; place_rect(fj, fk, "disc", d); disc(v_fmt("place.%d.%d", fj, fk), fmark, d[0], d[1]); } }   /* the ring, then its disc: the disc's rim breaks the ring there */
  if (fj >= 0 && *v_pstr("regions.carry.id")) { const char *cp = v_pstr("regions.carry.picture"); char cpb[96]; snprintf(cpb, sizeof cpb, "%s", cp); int ps[2] = { 48, 50 }; v_asset_size(cpb, ps); int bx[4];
    if (fk >= 0) { place_rect(fj, fk, "box", bx); } else { band_rect(fj, bx); bx[0] += bx[2] - 64; bx[1] += 32; bx[2] = 48; bx[3] = 48; }
    v_name("resident"); pic("house.hand", cpb, bx[0] + (bx[2] - ps[0]) / 2, bx[1] + bx[3] - ps[1] - v_si(V, "regions.resident.carry.lift", 8), ps[0], ps[1]); }   /* the carried one over the hand's place, raised */
  { const char *pk = v_pstr("regions.pick.id"); int j, k; if (*pk && house_find(v_fmt("house.%s", pk), &j, &k) && k >= 0) { int r[4]; place_rect(j, k, "box", r); char ops[200]; const char *c = v_scol(V, "colours.pick"); int x = r[0] - 3, y = r[1] - 3, w = r[2] + 6, h = r[3] + 6;
      snprintf(ops, sizeof ops, "[[\"h\",0,0,%d,\"%s\"],[\"h\",0,%d,%d,\"%s\"],[\"v\",0,0,%d,\"%s\"],[\"v\",%d,0,%d,\"%s\"]]", w, c, h - 1, w, c, h, c, w - 1, h, c); v_region("pick", LAYER_CHROME); v_composed("house.pick", x, y, w, h, ops); } }
}

/* ---- the Tucked away page (regions.tucked): the cold recess ---- */
static void cold_box(int i, int r[4]) { int sz[2] = { v_sk(V, "regions.tucked.boxes.size", 0), v_sk(V, "regions.tucked.boxes.size", 1) }; r[0] = v_sk(V, "regions.tucked.boxes.x", i & 3); r[1] = v_sk(V, "regions.tucked.boxes.tops", (i >> 2) & 1); r[2] = sz[0]; r[3] = sz[1]; }
static int tucked_box(const char *id, int r[4]) {
  int n = v_plen("regions.tucked.items"), i = -1;
  if (!strcmp(id, "tucked.here")) i = n; else for (int k = 0; k < n; k++) if (!strcmp(v_fmt("tucked.%s", v_pstr(v_fmt("regions.tucked.items.%d.id", k))), id)) i = k;
  if (i < 0 || i > 7) return 0; cold_box(i, r); r[0] -= 4; r[1] -= 4; r[2] += 8; r[3] += 8; return 1;
}
static void tucked_words(const char *cur) {
  int g[4]; v_srect(V, "regions.window.rect", g); v_region("window", LAYER_CHROME); fill("window", g, v_scol(V, "colours.coldVeil"));
  for (int k = 0; k < 2; k++) { int r[4]; v_srect(V, v_fmt("regions.tucked.rails.%d", k), r); int top[4] = { r[0], r[1], r[2], 1 }, under[4] = { r[0], r[1] + 1, r[2], 1 };
    v_region(v_fmt("rail.%d", k), LAYER_CHROME); fill(v_fmt("rail.%d.top", k), top, v_scol(V, "colours.rail.top")); fill(v_fmt("rail.%d.under", k), under, v_scol(V, "colours.rail.under")); }
  int n = v_plen("regions.tucked.items");
  for (int i = 0; i < n && i < 8; i++) { int b[4]; cold_box(i, b); char pc[96]; snprintf(pc, sizeof pc, "%s", v_pstr(v_fmt("regions.tucked.items.%d.picture", i))); int ps[2] = { 96, 99 }; v_asset_size(pc, ps);
    v_name("tucked"); pic(v_fmt("cold.%d", i), pc, b[0] + (b[2] - ps[0]) / 2, b[1] + b[3] - ps[1], ps[0], ps[1]); }
  int pages = v_pint("regions.tucked.pages", 1), page = v_pint("regions.tucked.page", 0);
  if (pages > 1) { int pr[4]; v_srect(V, "regions.tucked.pips", pr); int w = pages * 16 - 8, x0 = pr[0] + (pr[2] - w) / 2;
    for (int p = 0; p < pages && p < 16; p++) { int q[4] = { x0 + p * 16, pr[1], 8, pr[3] }; v_region("pips", LAYER_CHROME); fill(v_fmt("pip.%d", p), q, p == page ? v_scol(V, "colours.pips.on") : v_scol(V, "colours.pips.off")); } }
  int r[4]; if (tucked_box(cur, r)) {
    if (!anim_holding() && spec_len("props", "overlay") < 0) ring("focus.targets.house", r, cur);
    if (!strcmp(cur, "tucked.here") && *v_pstr("regions.carry.id")) { char cp[96]; snprintf(cp, sizeof cp, "%s", v_pstr("regions.carry.picture")); int ps[2] = { 96, 99 }; v_asset_size(cp, ps); int b[4]; cold_box(n, b);
      v_name("resident"); pic("cold.hand", cp, b[0] + (b[2] - ps[0]) / 2, b[1] + b[3] - ps[1] - v_si(V, "regions.resident.carry.lift", 8), ps[0], ps[1]); } }
}

/* the lit edge of a nudge: a 2 px bone line on the side of the region the ring could not leave */
static void edge_words(const char *cur) {
  if (!g_nudge || strcmp(cur, g_nudge_at)) return; int d = g_nudge - 1, r[4];
  if (strncmp(cur, "room.", 5) == 0) v_srect(V, "regions.rooms.rect", r); else if (strncmp(cur, "plate.", 6) == 0) v_srect(V, "regions.card.rect", r); else v_srect(V, "regions.window.rect", r);
  if (strncmp(cur, "room.tucked", 11) == 0) v_srect(V, "regions.chips.tucked", r);
  int e[4] = { d == FOCUS_RIGHT ? r[0] + r[2] - 2 : r[0], d == FOCUS_DOWN ? r[1] + r[3] - 2 : r[1], d == FOCUS_LEFT || d == FOCUS_RIGHT ? 2 : r[2], d == FOCUS_UP || d == FOCUS_DOWN ? 2 : r[3] };
  v_region("edge", LAYER_CHROME); fill("edge", e, "bone");
}

void vivarium_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); char vw[8]; snprintf(vw, sizeof vw, "%s", view());
  kit_stage(V, "regions.stage.rect", v_scol(V, "colours.stageGround"), "stage", "stage.ground", NULL, NULL);
  { int dx, dy; nudge_of(cur, &dx, &dy); home_viv_nudge(dx, dy); }
  if (!strcmp(vw, "house")) { int g[4]; v_srect(V, "regions.window.rect", g); v_region("window", LAYER_CHROME); fill("window", g, v_scol(V, "colours.stageGround")); house_words(cur); }
  else if (!strcmp(vw, "tucked")) tucked_words(cur);
  else home_viv_room(cur);
  home_viv_nudge(0, 0);
  int lit[4]; chips_words(cur, lit);
  card_words(cur);
  edge_words(cur);
}

/* the targets as the words drew them, in the props' order */
int vivarium_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL);
    int r[4] = { 0, 0, 0, 0 };
    if (strncmp(t->id, "resident.", 9) == 0 || strncmp(t->id, "drop.", 5) == 0 || strncmp(t->id, "flip.", 5) == 0) home_viv_box(t->id, r);
    else if (strncmp(t->id, "room.", 5) == 0) { for (int k = 0, m = v_plen("regions.rooms.items"); k < m; k++) if (!strcmp(v_pstr(v_fmt("regions.rooms.items.%d.id", k)), t->id + 5)) chip_box(k, r); }
    else if (strncmp(t->id, "plate.", 6) == 0) plate_box(!strcmp(t->id, "plate.incubator") ? 0 : atoi(t->id + 6), r);
    else if (strncmp(t->id, "house.", 6) == 0) house_box(t->id, r);
    else if (strncmp(t->id, "tucked.", 7) == 0) tucked_box(t->id, r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}

/* the card reach rule (the build's sign-off): the room view's field is one ordered row, the present mibis by foot x (the figure box's doubled centre), ties front first (the larger foot y), then the props' order,
   taken from the boxes the words drew on the frame of the key; the face answers row.first, row.prev and row.next ("" at the ends). The house view and the Tucked away page are the host's (their places do not walk). */
static int row_own(const focus_target_t *t, int n, const char *cur, focus_resolve_t *out, int cap) {
  if (strcmp(view(), "room") || *v_pstr("regions.carry.id") || cap < 3) return 0;
  int row[FOCUS_TARGETS], nr = 0;
  for (int i = 0; i < n && nr < FOCUS_TARGETS; i++) { if (strcmp(t[i].group, "resident")) continue;
    long fx = 2L * t[i].x + t[i].w, fy = t[i].y + t[i].h; int j = nr++;
    while (j > 0) { const focus_target_t *p = &t[row[j - 1]]; long px = 2L * p->x + p->w, py = p->y + p->h; if (px < fx || (px == fx && py >= fy)) break; row[j] = row[j - 1]; j--; }
    row[j] = i; }
  int at = -1; for (int k = 0; k < nr; k++) if (!strcmp(t[row[k]].id, cur)) at = k;
  snprintf(out[0].sel, sizeof out[0].sel, "row.first"); snprintf(out[0].id, sizeof out[0].id, "%s", nr ? t[row[0]].id : "");
  snprintf(out[1].sel, sizeof out[1].sel, "row.prev"); snprintf(out[1].id, sizeof out[1].id, "%s", at > 0 ? t[row[at - 1]].id : "");
  snprintf(out[2].sel, sizeof out[2].sel, "row.next"); snprintf(out[2].id, sizeof out[2].id, "%s", at >= 0 && at < nr - 1 ? t[row[at + 1]].id : "");
  return 3;
}

/* a key: ✓, ← and the room keys say an intent on the focused target; the pad moves the ring by vivarium.json focus.graph (the host's selectors in focus.resolve); a press with nothing beyond, and ✓ on a room's chip, nudge the ring */
void vivarium_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); int stuck = 0, was = g_nudge; g_nudge = 0;
  if (code == 10 && strncmp(cur, "room.", 5) == 0 && cur[5] >= '0' && cur[5] <= '9') { g_nudge = FOCUS_DOWN + 1; snprintf(g_nudge_at, sizeof g_nudge_at, "%s", cur); screens_redraw(); }   /* a room's chip has no ✓ cap */
  if (*v_pstr("regions.carry.id")) { if (code == 10) home_viv_setdown(cur); else home_viv_noplace(); }   /* ✓ sets the carried one down where the hand is (§3); any other key leaves nothing pending */
  screens_key_graph(code, V, "focus.graph", vivarium_focus, "room", &(screens_keys_t){ .resolve = 1, .room_at = "focus.roomAt", .stuck = &stuck, .own = row_own });
  if (stuck) { g_nudge = stuck; snprintf(g_nudge_at, sizeof g_nudge_at, "%s", cur); screens_redraw(); }
  else if (was && !g_nudge) screens_redraw();
}
