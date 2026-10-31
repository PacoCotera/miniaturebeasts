/* The Wall (the mibi collection's inventory page; vivarium.json `wall`): the room rail, the toolbar, the wall of portraits with their ticks and marks, the scroll track and the card. A binding table: every number is the spec's, every
   word and picture the props'; the focus ring is the frame's (word_focusRing) on the target's box. The wall's keys are the host's steps (focus.graph: every group is a stepper), so the face keeps no walk of its own. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../anim/anim.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define V "vivarium"
#define P_(x) "regions." x
static int has(const char *asset) { return asset && *asset && wire_has_asset(asset); }
static void fill(const char *id, const int r[4], const char *colour) { kit_panel(id, r[0], r[1], r[2], r[3], colour, NULL, NULL, 0); }
static void pic(const char *id, const char *asset, int x, int y, int w, int h) { if (has(asset)) v_slot(id, asset, NULL, x, y, w, h, 1); }
static void copy(char *dst, int cap, const char *s) { snprintf(dst, (size_t)cap, "%s", s ? s : ""); }

/* ---- the rail: row boxes by kind and slot ---- */
static int rail_box(int i, int r[4]) {
  const char *kind = v_pstr(v_fmt(P_("rail.rows.%d.kind"), i)); char k[8]; copy(k, sizeof k, kind);
  int n = v_pint(P_("rail.n"), 1), first = v_pint(P_("rail.first"), 0), rows = v_si(V, "wall.rail.pane.rows", 8), pitch = v_si(V, "wall.rail.pitch", 44), y0 = v_si(V, "wall.rail.firstRoom", 92);
  int w = v_sk(V, "wall.rail.row", 0), h = v_sk(V, "wall.rail.row", 1), x = v_sk(V, "wall.rail.rect", 0), pinned = n > rows;
  r[0] = x; r[2] = w; r[3] = h;
  if (!strcmp(k, "all")) { v_srect(V, "wall.rail.all", r); return 1; }
  if (!strcmp(k, "room")) { int id = atoi(v_pstr(v_fmt(P_("rail.rows.%d.id"), i))); r[1] = y0 + pitch * (id - first); return 1; }
  if (!strcmp(k, "tucked")) { r[1] = pinned ? v_si(V, "wall.rail.tuckedMax", 444) : y0 + pitch * n; return 1; }
  if (!strcmp(k, "add")) { r[1] = pinned ? v_si(V, "wall.rail.addMax", 488) : y0 + pitch * n + pitch; r[3] = v_sk(V, "wall.rail.add", 1); return 1; }
  return 0;
}
/* a tick: 20 x 3 solid, or three segments of 9 px with a 2 px gap (rooms 7 to 10); its colour is the room's place in the bought order */
static void tick(const char *id, int x, int y, const char *colour, int broken) {
  int w = v_sk(V, "wall.wall.tick.size", 0), h = v_sk(V, "wall.wall.tick.size", 1); v_region("ticks", LAYER_CHROME);
  if (!broken) { int r[4] = { x, y, w, h }; fill(id, r, colour); return; }
  int seg = v_sk(V, "wall.wall.tick.broken", 0), gap = v_sk(V, "wall.wall.tick.broken", 1);
  for (int a = 0; a < 2; a++) { int r[4] = { x + a * (seg + gap), y, seg, h }; fill(v_fmt("%s.%d", id, a), r, colour); }
}
static void rail_words(const char *cur) {
  int n = v_plen(P_("rail.rows")), ring_ok = !anim_holding() && spec_len("props", "overlay") < 0;
  for (int i = 0; i < n; i++) {
    int r[4]; if (!rail_box(i, r)) continue; char base[40]; snprintf(base, sizeof base, P_("rail.rows.%d"), i);
    char kind[8], id[24], name[40], count[24], pc[96]; copy(kind, sizeof kind, v_pstr(v_fmt("%s.kind", base))); copy(id, sizeof id, v_pstr(v_fmt("%s.id", base)));
    copy(name, sizeof name, v_pstr(v_fmt("%s.name", base))); copy(count, sizeof count, v_pstr(v_fmt("%s.count", base))); copy(pc, sizeof pc, v_pstr(v_fmt("%s.picture", base)));
    int settling = v_pint(v_fmt("%s.settling", base), 0), lit = v_pbool(v_fmt("%s.lit", base), 0), full = v_pbool(v_fmt("%s.full", base), 0);
    char rid[40]; snprintf(rid, sizeof rid, "row.%s", id);
    v_region("rail", LAYER_CHROME);
    if (!strcmp(kind, "room") && has(pc)) { v_name("rail"); pic(rid, pc, r[0], r[1], r[2], r[3]); }
    else if (!strcmp(kind, "tucked")) fill(rid, r, v_scol(V, "wall.colours.cold"));
    else fill(rid, r, v_scol(V, !strcmp(kind, "add") ? "wall.colours.add" : "wall.colours.row"));
    int ty = r[1] + v_sk(V, "wall.rail.name.at", 1);
    if (!strcmp(kind, "add")) {
      int ly = r[1] + v_si(V, "wall.rail.addRow.line1", 6), held = !v_pbool(v_fmt("%s.live", base), 0);
      v_region(v_fmt("%s.name", rid), LAYER_TYPE); v_say(v_fmt("%s.name", rid), name, r[0] + v_sk(V, "wall.rail.name.at", 0), ly, V_ANCHOR_LINE, held ? "small.quiet" : "small", "pane", V_ALIGN_LEFT);
      const char *pr = v_pstr(v_fmt("%s.price", base)); char price[24]; copy(price, sizeof price, pr);
      if (*price) { const char *role = v_pbool(v_fmt("%s.short", base), 0) ? "figure.short" : "figure.price", *cols[V_PRICE_N] = { role, role, role, role }; int w = v_role_width(price, "figure");
        v_region(v_fmt("%s.price", rid), LAYER_TYPE); v_say_price(v_fmt("%s.price", rid), price, r[0] + v_si(V, "wall.rail.addRow.price.right", 156) - w, ly, "figure", "pane", cols, "figure"); }
      if (v_plen(v_fmt("%s.find", base)) >= 0 && spec_len("props", v_fmt("%s.find.text", base)) < 0) {
        int gy = r[1] + v_si(V, "wall.rail.addRow.line2", 32); char text[48]; copy(text, sizeof text, v_pstr(v_fmt("%s.find.text", base))); int on = v_pbool(v_fmt("%s.find.lit", base), 0);
        v_region(v_fmt("%s.text", rid), LAYER_TYPE); v_say(v_fmt("%s.text", rid), text, r[0] + v_si(V, "wall.rail.addRow.text", 28), gy, V_ANCHOR_LINE, on ? "small" : "small.quiet", "pane", V_ALIGN_LEFT);
        { char ops[400]; int n = 0; const char *col = on ? "sand" : "stone";   /* the glint: a four-point star of the palette (a plus with a block at its centre), lit when a find is home, dimmed when none is */
          n += snprintf(ops + n, sizeof ops - (size_t)n, "[");
          for (int y = 2; y <= 13; y++) n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", y > 2 ? "," : "", (y >= 5 && y <= 10) ? 3 : 7, y, (y >= 5 && y <= 10) ? 10 : 2, col);
          snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_region(v_fmt("%s.glint", rid), LAYER_CHROME); v_composed(v_fmt("%s.glint", rid), r[0] + v_sk(V, "wall.rail.addRow.glint", 0), gy, 16, 16, ops); }
      }
    } else {
      int nx = r[0] + v_sk(V, "wall.rail.name.at", 0), cw = v_si(V, "wall.rail.count.right", 156);
      if (!strcmp(kind, "tucked")) { char mk[96]; copy(mk, sizeof mk, v_pstr(v_fmt("%s.mark", base))); v_name("rail"); pic(v_fmt("%s.mark", rid), mk, r[0] + v_sk(V, "wall.rail.tucked.mark", 0), r[1] + v_sk(V, "wall.rail.tucked.mark", 1), 16, 16); nx = r[0] + 32; }
      if (!strcmp(kind, "room")) { int nw = v_role_width(name, "small"), pl[4] = { r[0] + 4, r[1] + 4, nw + 8 + 8, 22 }; v_region(v_fmt("%s.plate", rid), LAYER_CHROME); fill(v_fmt("%s.plate", rid), pl, v_scol(V, "wall.colours.plate")); }
      v_region(v_fmt("%s.name", rid), LAYER_TYPE); v_say(v_fmt("%s.name", rid), name, nx, ty, V_ANCHOR_LINE, settling ? "small.quiet" : "small", "pane", V_ALIGN_LEFT);
      if (*count) { v_region(v_fmt("%s.count", rid), LAYER_TYPE); v_say(v_fmt("%s.count", rid), count, r[0] + cw, ty, V_ANCHOR_LINE, full ? "small.full" : "small.quiet", "pane", V_ALIGN_RIGHT); }
      if (!strcmp(kind, "room")) {
        const char *tc = v_pstr(v_fmt("%s.tick.colour", base)); char col[16]; copy(col, sizeof col, tc);
        if (*col) tick(v_fmt("%s.tick", rid), r[0] + v_sk(V, "wall.rail.tick.at", 0), r[1] + v_sk(V, "wall.rail.tick.at", 1), col, v_pbool(v_fmt("%s.tick.broken", base), 0));
        if (!settling) { int b[4] = { r[0] + v_sk(V, "wall.rail.bar.at", 0), r[1] + v_sk(V, "wall.rail.bar.at", 1), v_sk(V, "wall.rail.bar.at", 2), v_sk(V, "wall.rail.bar.at", 3) }; int have = v_pint(v_fmt("%s.fill", base), 0);
          v_region(v_fmt("%s.bar", rid), LAYER_CHROME); fill(v_fmt("%s.bar", rid), b, v_scol(V, "wall.colours.track"));
          int seg = b[2] / 8; for (int q = 0; q < have && q < 8; q++) { int s[4] = { b[0] + q * seg, b[1], seg - 1, b[3] }; fill(v_fmt("%s.bar.%d", rid, q), s, full ? "amber" : "fog"); } }
      }
    }
    if (lit) { int l[4] = { r[0], r[1], v_si(V, "wall.rail.lit.w", 2), r[3] }; v_region(v_fmt("%s.lit", rid), LAYER_CHROME); fill(v_fmt("%s.lit", rid), l, v_scol(V, "wall.colours.litBar")); }
    if (v_pbool(v_fmt("%s.edge", base), 0)) { int e[4] = { r[0] + r[2] - 2, r[1], 2, r[3] }; v_region(v_fmt("%s.edge", rid), LAYER_CHROME); fill(v_fmt("%s.edge", rid), e, "bone"); }
    char tid[40]; snprintf(tid, sizeof tid, "rail.%s", id); if (ring_ok && !strcmp(cur, tid)) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.rail", r); }
  }
  /* the window's carets: a 10 px fog caret centred at its top or bottom edge when more lies beyond */
  if (v_plen(P_("rail.pane")) >= 0) { int w[4]; v_srect(V, "wall.rail.pane.rect", w); int c = v_si(V, "wall.rail.pane.caret", 10);
    for (int up = 0; up < 2; up++) if (v_pbool(up ? P_("rail.pane.more.top") : P_("rail.pane.more.bottom"), 0)) { int x = w[0] + w[2] / 2 - c / 2, y = up ? w[1] : w[1] + w[3] - c / 2; char ops[160];
      snprintf(ops, sizeof ops, up ? "[[\"h\",4,0,2,\"fog\"],[\"h\",3,1,4,\"fog\"],[\"h\",2,2,6,\"fog\"],[\"h\",1,3,8,\"fog\"],[\"h\",0,4,10,\"fog\"]]" : "[[\"h\",0,0,10,\"fog\"],[\"h\",1,1,8,\"fog\"],[\"h\",2,2,6,\"fog\"],[\"h\",3,3,4,\"fog\"],[\"h\",4,4,2,\"fog\"]]");
      v_region("caret", LAYER_CHROME); v_composed(up ? "caret.top" : "caret.bottom", x, y, c, c / 2 + 1, ops); } }
}

/* ---- the toolbar ---- */
static int tool_box(const char *id, int r[4]) {
  if (!strcmp(id, "pill")) { v_srect(V, "wall.toolbar.pill", r); return 1; }
  for (int k = 0, n = v_plen("regions.toolbar.sorts"); k < n; k++) if (!strcmp(v_fmt("sort.%s", v_pstr(v_fmt("regions.toolbar.sorts.%d.id", k))), id)) { v_srect(V, v_fmt("wall.toolbar.sorts.%d.rect", k), r); return 1; }
  return 0;
}
static void tool_words(const char *cur) {
  int ring_ok = !anim_holding() && spec_len("props", "overlay") < 0;
  for (int k = 0, n = v_plen("regions.toolbar.sorts"); k < n; k++) {
    char id[24], label[24]; snprintf(id, sizeof id, "sort.%s", v_pstr(v_fmt("regions.toolbar.sorts.%d.id", k))); copy(label, sizeof label, v_pstr(v_fmt("regions.toolbar.sorts.%d.label", k)));
    int r[4]; if (!tool_box(id, r)) continue; int lit = v_pbool(v_fmt("regions.toolbar.sorts.%d.lit", k), 0);
    v_region(id, LAYER_CHROME); kit_panel(id, r[0], r[1], r[2], r[3], v_scol(V, lit ? "wall.colours.toolLit" : "wall.colours.tool"), v_scol(V, "wall.colours.toolEdge"), NULL, 0);
    int w = v_role_width(label, "small"); v_region(v_fmt("%s.label", id), LAYER_TYPE); v_say(v_fmt("%s.label", id), label, r[0] + (r[2] - w) / 2, r[1] + (r[3] - v_role_pitch("small")) / 2, V_ANCHOR_LINE, lit ? "small" : "small.quiet", "pane", V_ALIGN_LEFT);
    if (ring_ok && !strcmp(cur, id)) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.tool", r); }
  }
  int r[4]; tool_box("pill", r); char text[40]; copy(text, sizeof text, v_pstr("regions.toolbar.pill.text")); int on = v_pbool("regions.toolbar.pill.on", 0);
  v_region("pill", LAYER_CHROME); kit_panel("pill", r[0], r[1], r[2], r[3], v_scol(V, on ? "wall.colours.toolLit" : "wall.colours.tool"), v_scol(V, on ? "wall.colours.pickEdge" : "wall.colours.toolEdge"), NULL, 0);
  int w = v_role_width(text, "small"); v_region("pill.label", LAYER_TYPE); v_say("pill.label", text, r[0] + (r[2] - w) / 2, r[1] + (r[3] - v_role_pitch("small")) / 2, V_ANCHOR_LINE, on ? "small" : "small.quiet", "pane", V_ALIGN_LEFT);
  if (ring_ok && !strcmp(cur, "pill")) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.tool", r); }
}

/* ---- the wall ---- */
typedef struct { int pitch[2], cols, size[2], canvas[2], feet, ring[4]; } step_t;
static int cur_step(step_t *s) {
  int sz = v_pint(P_("wall.size.0"), 100), which = sz <= 64 ? 1 : 0; char b[40]; snprintf(b, sizeof b, "wall.wall.steps.%d", which);
  s->pitch[0] = v_sk(V, v_fmt("%s.pitch", b), 0); s->pitch[1] = v_sk(V, v_fmt("%s.pitch", b), 1); s->cols = v_si(V, v_fmt("%s.cols", b), 5); s->size[0] = v_sk(V, v_fmt("%s.size", b), 0); s->size[1] = v_sk(V, v_fmt("%s.size", b), 1);
  s->canvas[0] = v_sk(V, v_fmt("%s.canvas", b), 0); s->canvas[1] = v_sk(V, v_fmt("%s.canvas", b), 1); s->feet = v_si(V, v_fmt("%s.feet", b), 0); v_srect(V, v_fmt("%s.ring", b), s->ring);
  return which;
}
static void cell_origin(const step_t *s, int index, int *cx, int *cy) {
  int o[2] = { v_sk(V, "wall.wall.origin", 0), v_sk(V, "wall.wall.origin", 1) }, row0 = v_pint(P_("wall.row0"), 0);
  *cx = o[0] + (index % s->cols) * s->pitch[0]; *cy = o[1] + (index / s->cols - row0) * s->pitch[1];
}
static int wall_cell_find(const char *id, int *k) { for (int i = 0, n = v_plen(P_("wall.cells")); i < n; i++) if (!strcmp(v_pstr(v_fmt(P_("wall.cells.%d.id"), i)), id)) { *k = i; return 1; } return 0; }
static void cell_ring_box(const step_t *s, int index, int r[4]) { int cx, cy; cell_origin(s, index, &cx, &cy); r[0] = cx + s->ring[0]; r[1] = cy + s->ring[1]; r[2] = s->ring[2]; r[3] = s->ring[3]; }
static void disc(const char *id, const char *mark, int x, int y) {
  if (!has(mark)) return; char ops[160]; int ms[2] = { 16, 16 }; v_asset_size(mark, ms);
  snprintf(ops, sizeof ops, "[[\"rrect\",0,0,20,20,10,\"%s\",\"%s\"]]", v_scol(V, "colours.markDisc.fill"), v_scol(V, "colours.markDisc.rim"));
  v_region("marks", LAYER_CHROME); v_composed(v_fmt("%s.disc", id), x, y, 20, 20, ops); v_name("marks"); pic(v_fmt("%s.mark", id), mark, x + (20 - ms[0]) / 2, y + (20 - ms[1]) / 2, ms[0], ms[1]);
}
static void check(const char *id, int x, int y) {   /* the pick check: an orange disc with a tick */
  char ops[360]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,20,20,10,\"orange\",\"orange\"],[\"h\",5,9,2,\"void\"],[\"h\",6,10,2,\"void\"],[\"h\",7,11,2,\"void\"],[\"h\",8,10,2,\"void\"],[\"h\",9,9,2,\"void\"],[\"h\",10,8,2,\"void\"],[\"h\",11,7,2,\"void\"],[\"h\",12,6,2,\"void\"],[\"h\",13,5,2,\"void\"]]");
  v_region("checks", LAYER_CHROME); v_composed(id, x, y, 20, 20, ops);
}
static void wall_words(const char *cur) {
  step_t s; cur_step(&s); int n = v_plen(P_("wall.cells")), ring_ok = !anim_holding() && spec_len("props", "overlay") < 0, ringed = -1;
  for (int i = 0; i < n; i++) {
    char base[40], id[24], pc[96]; snprintf(base, sizeof base, P_("wall.cells.%d"), i); copy(id, sizeof id, v_pstr(v_fmt("%s.id", base))); copy(pc, sizeof pc, v_pstr(v_fmt("%s.picture", base)));
    int index = v_pint(v_fmt("%s.index", base), i), cx, cy; cell_origin(&s, index, &cx, &cy);
    char tid[40]; snprintf(tid, sizeof tid, "cell.%s", id); if (!strcmp(cur, tid)) { ringed = i; }
    v_region("wall", LAYER_ART); v_name("wall"); pic(v_fmt("cell.%s", id), pc, cx + s.canvas[0], cy + s.canvas[1], s.size[0], s.size[1]);
    const char *tc = v_pstr(v_fmt("%s.tick.colour", base)); char col[16]; copy(col, sizeof col, tc);
    if (*col) { int under = v_si(V, "wall.wall.tick.under", 6), tw = v_sk(V, "wall.wall.tick.size", 0); tick(v_fmt("cell.%s.tick", id), cx + s.canvas[0] + s.size[0] / 2 - tw / 2, cy + s.feet + under, col, v_pbool(v_fmt("%s.tick.broken", base), 0)); }
  }
  for (int i = 0; i < n; i++) {   /* the marks and checks, after the ring box's corner */
    char base[40], id[24], mk[96]; snprintf(base, sizeof base, P_("wall.cells.%d"), i); copy(id, sizeof id, v_pstr(v_fmt("%s.id", base))); copy(mk, sizeof mk, v_pstr(v_fmt("%s.mark", base)));
    int index = v_pint(v_fmt("%s.index", base), i), b[4]; cell_ring_box(&s, index, b);
    if (i == ringed && ring_ok) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.cell", b); }
    if (*mk) disc(v_fmt("cell.%s", id), mk, b[0] + b[2] + v_sk(V, "wall.wall.mark.at", 0), b[1] + v_sk(V, "wall.wall.mark.at", 1));
    if (v_pbool(v_fmt("%s.picked", base), 0)) check(v_fmt("cell.%s.check", id), b[0] + v_sk(V, "wall.wall.check.at", 0), b[1] + v_sk(V, "wall.wall.check.at", 1));
  }
  /* while the ring is off the wall the card's mibi keeps the frame's hold mark on its ring box (at most one) */
  if (ringed < 0 && ring_ok) { int k; const char *card = v_pstr("regions.card.id"); if (*card && wall_cell_find(card, &k)) { int b[4]; cell_ring_box(&s, v_pint(v_fmt(P_("wall.cells.%d.index"), k), k), b); v_region("hold", LAYER_CHROME); kit_focusRingHold("hold", b, 6); } }
  char msg[120]; copy(msg, sizeof msg, v_pstr("regions.wall.message"));
  if (*msg) { int w[4]; v_srect(V, "wall.wall.rect", w); v_region("wall.message", LAYER_TYPE); v_say_in("wall.message", msg, w[0], w[2], w[1] + v_sk(V, "wall.wall.message.at", 1), V_ANCHOR_LINE, "label", "ground"); }
  if (v_plen(P_("wall.track")) >= 0) {   /* the scroll track: 2 px at x 686, the thumb (fog, at least 24 px) by the rows shown */
    int w[4]; v_srect(V, "wall.wall.rect", w); int row0 = v_pint(P_("wall.track.thumb.0"), 0), vis = v_pint(P_("wall.track.thumb.1"), 1), rows = v_pint(P_("wall.track.thumb.2"), 1);
    int tx = v_si(V, "wall.wall.track.x", 686), tw = v_si(V, "wall.wall.track.w", 2), minh = v_si(V, "wall.wall.track.thumbMin", 24), th = w[3] * vis / (rows > 0 ? rows : 1); if (th < minh) th = minh;
    int ty = w[1] + (w[3] - th) * row0 / (rows - vis > 0 ? rows - vis : 1); int tr[4] = { tx, w[1], tw, w[3] }, thumb[4] = { tx, ty, tw, th };
    v_region("track", LAYER_CHROME); fill("track", tr, v_scol(V, "wall.colours.track")); fill("track.thumb", thumb, "fog");
  }
}

/* ---- the card ---- */
static int plate_box(int k, int r[4]) { v_srect(V, "wall.card.plates.first", r); r[1] += k * v_si(V, "wall.card.plates.pitch", 40); return 1; }
static void move_words(const char *cur);
static void card_words(const char *cur) {
  int c[4]; v_srect(V, "wall.card.rect", c); int ring_ok = !anim_holding() && spec_len("props", "overlay") < 0;
  v_region("card", LAYER_CHROME); kit_panel("card", c[0], c[1], c[2], c[3], v_scol(V, "wall.colours.card"), v_scol(V, "wall.colours.hairline"), NULL, 0);
  if (v_plen(P_("move.rows")) >= 0) { move_words(cur); return; }
  const char *state = v_pstr("regions.card.state"); char st[12]; copy(st, sizeof st, state);
  if (!strcmp(st, "mibi")) {
    int w[4]; v_srect(V, "wall.card.well", w); v_region("card.well", LAYER_CHROME); fill("card.well", w, v_scol(V, "wall.colours.well"));
    char pcb[96]; copy(pcb, sizeof pcb, v_pstr("regions.card.picture")); int ps[2] = { 120, 124 }; v_asset_size(pcb, ps);
    v_region("card.portrait", LAYER_ART); v_name("card.portrait"); pic("card.portrait", pcb, w[0] + (w[2] - ps[0]) / 2, w[1] + w[3] - ps[1], ps[0], ps[1]);
    char name[48]; copy(name, sizeof name, v_pstr("regions.card.name")); int nx = v_sk(V, "wall.card.name", 0), ny = v_sk(V, "wall.card.name", 1);
    v_region("card.name", LAYER_TYPE); v_say("card.name", name, nx, ny, V_ANCHOR_LINE, "figure", "pane", V_ALIGN_LEFT);
    int ly = v_sk(V, "wall.card.lines", 1), lp = v_si(V, "wall.card.linePitch", 17), lx = v_sk(V, "wall.card.lines", 0), lw = v_sk(V, "wall.card.lines", 2), room = v_si(V, "wall.card.linesMax", 5);
    const char *st1 = v_pstr("regions.card.stateText"); char stt[64]; copy(stt, sizeof stt, st1); char bc[40]; copy(bc, sizeof bc, v_pstr("regions.card.bredClose"));
    int maxl = room - (*bc ? 1 : 0) - (*stt ? 1 : 0), nl = 0; char buf[400] = ""; const char *q = buf;   /* the looks joined by " · " in the column's width, as many lines as are left; the last looks are left off, ending their line with … */
    if (maxl > 3) maxl = 3;
    for (int k = v_plen("regions.card.looks"); k > 0; k--) { char joined[200] = "";
      for (int i = 0; i < k; i++) { if (i) strncat(joined, " \xc2\xb7 ", sizeof joined - strlen(joined) - 1); strncat(joined, v_pstr(v_fmt("regions.card.looks.%d", i)), sizeof joined - strlen(joined) - 1); }
      nl = v_role_wrap(joined, lw, "small.quiet", buf, sizeof buf, maxl + 3); if (nl <= maxl) break; if (k == 1) nl = maxl; }
    int y = ly; for (int i = 0; i < nl; i++) { v_region("card.looks", LAYER_TYPE); v_say(v_fmt("card.looks.%d", i), q, lx, y, V_ANCHOR_LINE, "small.quiet", "pane", V_ALIGN_LEFT); q += strlen(q) + 1; y += lp; }
    if (*bc) { v_region("card.bred", LAYER_TYPE); v_say("card.bred", bc, lx, y, V_ANCHOR_LINE, "small.quiet", "pane", V_ALIGN_LEFT); y += lp; }
    if (*stt) { char mk[96]; copy(mk, sizeof mk, v_pstr("regions.card.mark")); if (has(mk)) { v_name("card.mark"); pic("card.mark", mk, lx, y, 16, 16); } v_region("card.state", LAYER_TYPE); v_say("card.state", stt, lx + 20, y, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT); y += lp; }
    int bd[4]; v_srect(V, "wall.card.band", bd); char bp[96]; copy(bp, sizeof bp, v_pstr("regions.card.room.picture")); char rn[40]; copy(rn, sizeof rn, v_pstr("regions.card.room.name"));
    v_region("card.band", LAYER_CHROME); if (has(bp)) { v_name("card.band"); pic("card.band", bp, bd[0], bd[1], bd[2], bd[3]); } else fill("card.band", bd, v_scol(V, "wall.colours.cold"));
    { int nw = v_role_width(rn, "small"), pl[4] = { bd[0] + 4, bd[1] + 4, nw + 16, bd[3] - 8 }; v_region("card.band.plate", LAYER_CHROME); fill("card.band.plate", pl, v_scol(V, "wall.colours.plate")); }
    v_region("card.band.name", LAYER_TYPE); v_say("card.band.name", rn, bd[0] + 8, bd[1] + (bd[3] - v_role_pitch("small")) / 2, V_ANCHOR_LINE, "small", "pane", V_ALIGN_LEFT);
    int pips = v_pint("regions.card.room.of", 8), have = v_pint("regions.card.room.n", 0), pw = v_si(V, "wall.card.pip", 8);
    for (int q = 0; q < pips; q++) { int pr[4] = { bd[0] + bd[2] - 8 - (pips - q) * (pw + 2) + 2, bd[1] + (bd[3] - pw) / 2, pw, pw }; v_region("card.pips", LAYER_CHROME); fill(v_fmt("card.pip.%d", q), pr, q < have ? "amber" : v_scol(V, "wall.colours.track")); }
    if (ring_ok && !strcmp(cur, "band")) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.band", bd); }
  } else if (!strcmp(st, "picks")) {   /* the pick pane: "{n} picked", the faces strip (36 px on a 40 px pitch, up to 4 and "+n"), then the plates below */
    char name[48]; copy(name, sizeof name, v_pstr("regions.card.name")); v_region("card.name", LAYER_TYPE); v_say("card.name", name, v_sk(V, "wall.card.plates.first", 0), v_sk(V, "wall.card.name", 1), V_ANCHOR_LINE, "figure", "pane", V_ALIGN_LEFT);
    int sr[4]; v_srect(V, "wall.move.strip.at", sr); int pitch = v_si(V, "wall.move.strip.pitch", 40), nf = v_plen("regions.card.faces");
    for (int i = 0; i < nf && i < 4; i++) { char fc[96]; copy(fc, sizeof fc, v_pstr(v_fmt("regions.card.faces.%d", i))); int fs[2] = { 36, 37 }; v_asset_size(fc, fs); v_region("card.faces", LAYER_ART); v_name("card.faces"); pic(v_fmt("card.face.%d", i), fc, sr[0] + i * pitch, sr[1], fs[0], fs[1]); }
    int more = v_pint("regions.card.more", 0); if (more > 0) { char mt[12]; snprintf(mt, sizeof mt, "+%d", more); v_region("card.more", LAYER_TYPE); v_say("card.more", mt, sr[0] + 4 * pitch + 4, sr[1] + 10, V_ANCHOR_LINE, "small.quiet", "pane", V_ALIGN_LEFT); }
  } else {
    char name[48]; copy(name, sizeof name, v_pstr("regions.card.name")); v_region("card.name", LAYER_TYPE); v_say("card.name", name, v_sk(V, "wall.card.plates.first", 0), v_sk(V, "wall.card.name", 1), V_ANCHOR_LINE, "figure", "pane", V_ALIGN_LEFT);
  }
  for (int k = 0, n = v_plen("regions.card.plates"); k < n; k++) {
    char base[40]; snprintf(base, sizeof base, "regions.card.plates.%d", k); int r[4]; plate_box(k, r); int held = v_pbool(v_fmt("%s.held", base), 0);
    char id[24]; snprintf(id, sizeof id, "plate.%d", k); v_region(id, LAYER_CHROME); kit_panel(id, r[0], r[1], r[2], r[3], NULL, v_scol(V, "wall.colours.hairline"), NULL, held);
    char verb[48], price[24]; copy(verb, sizeof verb, v_pstr(v_fmt("%s.verb", base))); copy(price, sizeof price, v_pstr(v_fmt("%s.price", base)));
    int vx = r[0] + v_si(V, "wall.card.plates.verb", 13), vy = r[1] + (r[3] - v_role_pitch("plate")) / 2;
    v_region(v_fmt("%s.verb", id), LAYER_TYPE); v_say(v_fmt("%s.verb", id), verb, vx, vy, V_ANCHOR_LINE, held ? "plate.held" : "plate", "pane", V_ALIGN_LEFT);
    if (*price) { const char *pro = held ? "quiet" : "label", *cols[V_PRICE_N] = { pro, pro, pro, pro }; int w = v_role_width(price, pro);
      v_region(v_fmt("%s.price", id), LAYER_TYPE); v_say_price(v_fmt("%s.price", id), price, r[0] + r[2] - 12 - w, vy, pro, "pane", cols, pro); }
    if (ring_ok && !strcmp(cur, id)) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.plate", r); }
  }
  char why[300]; copy(why, sizeof why, v_pstr("regions.card.why"));
  if (*why) { int wr[4]; v_srect(V, "wall.card.why", wr); char b[600]; int n = v_role_wrap(why, wr[2], "small.why", b, sizeof b, 3); const char *q = b;
    for (int i = 0; i < n; i++) { v_region("card.why", LAYER_TYPE); v_say(v_fmt("card.why.%d", i), q, wr[0], wr[1] + i * v_si(V, "wall.card.whyPitch", 20), V_ANCHOR_LINE, "small.why", "pane", V_ALIGN_LEFT); q += strlen(q) + 1; } }
}

/* ---- Move to: the card becomes the room list (regions.move) ---- */
static int move_box(int i, int r[4]) {   /* the i-th row of the window (below the faces' strip when several move) */
  v_srect(V, "wall.move.row", r); r[1] = (v_plen(P_("move.faces")) > 0 ? v_si(V, "wall.move.strip.rowsTopMany", 140) : r[1]) + i * v_si(V, "wall.move.pitch", 50); return 1;
}
static int move_find(const char *id, int *k) { for (int i = 0, n = v_plen(P_("move.rows")); i < n; i++) if (!strcmp(v_pstr(v_fmt(P_("move.rows.%d.id"), i)), id)) { *k = i; return 1; } return 0; }
static void move_words(const char *cur) {
  int ring_ok = !anim_holding() && spec_len("props", "overlay") < 0; char title[60]; copy(title, sizeof title, v_pstr(P_("move.title")));
  v_region("move.title", LAYER_TYPE); v_say("move.title", title, v_sk(V, "wall.move.title", 0), v_sk(V, "wall.move.title", 1), V_ANCHOR_LINE, "figure", "pane", V_ALIGN_LEFT);
  { int sr[4]; v_srect(V, "wall.move.strip.at", sr); int pitch = v_si(V, "wall.move.strip.pitch", 40);
    for (int i = 0, nf = v_plen(P_("move.faces")); i < nf && i < 4; i++) { char fc[96]; copy(fc, sizeof fc, v_pstr(v_fmt(P_("move.faces.%d"), i))); int fs[2] = { 36, 37 }; v_asset_size(fc, fs); v_region("move.faces", LAYER_ART); v_name("move.faces"); pic(v_fmt("move.face.%d", i), fc, sr[0] + i * pitch, sr[1], fs[0], fs[1]); }
    int more = v_pint(P_("move.more"), 0); if (more > 0) { char mt[12]; snprintf(mt, sizeof mt, "+%d", more); v_region("move.more", LAYER_TYPE); v_say("move.more", mt, sr[0] + 4 * pitch + 4, sr[1] + 10, V_ANCHOR_LINE, "small.quiet", "pane", V_ALIGN_LEFT); } }
  char face[96]; copy(face, sizeof face, v_pstr(P_("move.face"))); int fr[4]; v_srect(V, "wall.move.face", fr); int fs[2] = { fr[2], fr[3] }; v_asset_size(face, fs); v_region("move.face", LAYER_ART); v_name("move.face"); pic("move.face", face, fr[0], fr[1], fs[0], fs[1]);   /* the picture at its own size, 1:1 */
  for (int i = 0, n = v_plen(P_("move.rows")); i < n; i++) {
    char base[40]; snprintf(base, sizeof base, P_("move.rows.%d"), i); int r[4]; move_box(i, r);
    char id[24], kind[8], name[40], pc[96], count[40], state[12]; copy(id, sizeof id, v_pstr(v_fmt("%s.id", base))); copy(kind, sizeof kind, v_pstr(v_fmt("%s.kind", base))); copy(name, sizeof name, v_pstr(v_fmt("%s.name", base)));
    copy(pc, sizeof pc, v_pstr(v_fmt("%s.picture", base))); copy(count, sizeof count, v_pstr(v_fmt("%s.count", base))); copy(state, sizeof state, v_pstr(v_fmt("%s.state", base)));
    char rid[40]; snprintf(rid, sizeof rid, "mv.%s", id); v_region(rid, LAYER_CHROME);
    if (!strcmp(kind, "add")) {
      fill(rid, r, v_scol(V, "wall.colours.add")); int held = !v_pbool(v_fmt("%s.live", base), 0); v_region(v_fmt("%s.name", rid), LAYER_TYPE); v_say(v_fmt("%s.name", rid), name, r[0] + 8, r[1] + (r[3] - v_role_pitch("small")) / 2, V_ANCHOR_LINE, held ? "small.quiet" : "small", "pane", V_ALIGN_LEFT);
      char price[24]; copy(price, sizeof price, v_pstr(v_fmt("%s.price", base))); if (*price) { const char *role = v_pbool(v_fmt("%s.short", base), 0) ? "figure.short" : "figure.price", *cols[V_PRICE_N] = { role, role, role, role }; int w = v_role_width(price, "figure");
        v_region(v_fmt("%s.price", rid), LAYER_TYPE); v_say_price(v_fmt("%s.price", rid), price, r[0] + v_si(V, "wall.move.countRight", 270) - w, r[1] + (r[3] - v_role_pitch("figure")) / 2, "figure", "pane", cols, "figure"); }
    } else {
      if (has(pc)) { v_name(rid); pic(rid, pc, r[0], r[1], r[2], r[3]); } else fill(rid, r, v_scol(V, "wall.colours.row"));
      int nw = v_role_width(name, "small"), pl[4] = { r[0] + 4, r[1] + 4, nw + 16, 22 }; v_region(v_fmt("%s.plate", rid), LAYER_CHROME); fill(v_fmt("%s.plate", rid), pl, v_scol(V, "wall.colours.plate"));
      v_region(v_fmt("%s.name", rid), LAYER_TYPE); v_say(v_fmt("%s.name", rid), name, r[0] + v_sk(V, "wall.move.nameAt", 0), r[1] + v_sk(V, "wall.move.nameAt", 1), V_ANCHOR_LINE, !strcmp(state, "settling") ? "small.quiet" : "small", "pane", V_ALIGN_LEFT);
      int cw = v_role_width(count, "small"), cp[4] = { r[0] + v_si(V, "wall.move.countRight", 270) - cw - 8, r[1] + 4, cw + 16, 22 }; v_region(v_fmt("%s.cplate", rid), LAYER_CHROME); fill(v_fmt("%s.cplate", rid), cp, v_scol(V, "wall.colours.plate"));
      v_region(v_fmt("%s.count", rid), LAYER_TYPE); v_say(v_fmt("%s.count", rid), count, r[0] + v_si(V, "wall.move.countRight", 270), r[1] + v_sk(V, "wall.move.nameAt", 1), V_ANCHOR_LINE, !strcmp(state, "full") ? "small.full" : "small.quiet", "pane", V_ALIGN_RIGHT);
      int dn = v_pint(v_fmt("%s.dots", base), 0), dp = v_si(V, "wall.move.dots.pitch", 10), ds = v_si(V, "wall.move.dots.size", 8), dx = r[0] + v_sk(V, "wall.move.dots.at", 0), dy = r[1] + v_sk(V, "wall.move.dots.at", 1), of = v_pint(v_fmt("%s.of", base), 8), nx = v_pint(v_fmt("%s.next", base), -1);
      for (int q = 0; q < of; q++) { int d[4] = { dx + q * dp, dy, ds, ds }; v_region(v_fmt("%s.dots", rid), LAYER_CHROME);
        if (q < dn) fill(v_fmt("%s.dot.%d", rid, q), d, !strcmp(state, "full") ? "amber" : "fog"); else { fill(v_fmt("%s.dot.%d", rid, q), d, v_scol(V, "wall.colours.track")); int in[4] = { d[0] + 1, d[1] + 1, d[2] - 2, d[3] - 2 }; fill(v_fmt("%s.dotin.%d", rid, q), in, q == nx ? v_scol(V, "wall.colours.litBar") : v_scol(V, "wall.colours.hollow")); } }
    }
    char tid[40]; snprintf(tid, sizeof tid, "move.%s", id); if (ring_ok && !strcmp(cur, tid)) { v_region("focus", LAYER_CHROME); word_focusRing("focus", V, "focus.targets.move", r); }
  }
  if (v_plen(P_("move.pane")) >= 0) { int w[4]; v_srect(V, "wall.move.row", w); int c = 10, x = w[0] + w[2] / 2 - c / 2; char ops[160];
    for (int up = 0; up < 2; up++) if (v_pbool(up ? P_("move.pane.more.top") : P_("move.pane.more.bottom"), 0)) { int y = up ? w[1] - 8 : w[1] + 9 * v_si(V, "wall.move.pitch", 50) - 2;
      snprintf(ops, sizeof ops, up ? "[[\"h\",4,0,2,\"fog\"],[\"h\",3,1,4,\"fog\"],[\"h\",2,2,6,\"fog\"],[\"h\",1,3,8,\"fog\"],[\"h\",0,4,10,\"fog\"]]" : "[[\"h\",0,0,10,\"fog\"],[\"h\",1,1,8,\"fog\"],[\"h\",2,2,6,\"fog\"],[\"h\",3,3,4,\"fog\"],[\"h\",4,4,2,\"fog\"]]");
      v_region("mcaret", LAYER_CHROME); v_composed(up ? "mcaret.top" : "mcaret.bottom", x, y, c, 5, ops); } }
}

/* ---- the targets' boxes ---- */
int wall_target_box(const char *id, int r[4]) {
  r[0] = r[1] = r[2] = r[3] = 0;
  if (!strncmp(id, "rail.", 5)) { for (int i = 0, n = v_plen(P_("rail.rows")); i < n; i++) if (!strcmp(v_pstr(v_fmt(P_("rail.rows.%d.id"), i)), id + 5)) return rail_box(i, r); return 0; }
  if (!strncmp(id, "sort.", 5) || !strcmp(id, "pill")) return tool_box(id, r);
  if (!strncmp(id, "cell.", 5)) { step_t s; cur_step(&s); int k; if (!wall_cell_find(id + 5, &k)) return 0; cell_ring_box(&s, v_pint(v_fmt(P_("wall.cells.%d.index"), k), k), r); return 1; }
  if (!strncmp(id, "plate.", 6)) return plate_box(atoi(id + 6), r);
  if (!strcmp(id, "band")) { v_srect(V, "wall.card.band", r); return 1; }
  if (!strncmp(id, "move.", 5)) { int k; if (!move_find(id + 5, &k)) return 0; return move_box(k, r); }
  return 0;
}
void wall_words_all(const char *cur) {
  v_region("wall.stage", LAYER_CHROME);
  rail_words(cur); tool_words(cur); wall_words(cur); card_words(cur);
}
