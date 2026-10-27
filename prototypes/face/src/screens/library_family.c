/* The Library's Level 3 (library.json `l3`, the screen `library.family`): a binding table.
   far: the stage (kit_stage on l1.stage, as on Levels 1 and 2); the whole lineage as one picture at l3.far.rect (the generator's lineage-far picture, as the props name it); the ring (word_focusRing on
   l3.focus.targets.node) on the focused node's dot box. The props give the generator's facts in the picture's own coordinates (each target's dot box), to which the face adds the picture's origin. No panel.
   close (l3.close): the stage; the tree's links in four tiles over the view (screen-specific, the architect's ruling: composed here from the props' segments in grid units with the spec's spacing); the compare
   path's node (no size); the 32 node slots the host assigned (v_slot of each node's picture, its name under it); the info panel (kit_bezel) with the focused node's rows (l3.close.panel.rows) and its overview
   inset (the mini, its outline, the view box); the hold mark's node (no size); the ring on the focused node's slot. compare (l3.compare): the same tree and camera, the path between the held and the focused mibi
   (the props' segments, drawn as the links are, in tree.path), the hold mark on the held mibi's slot (kit_focusRingHold); in the panel the held mibi, the divider, the fact band and the focused rows moved down
   (the block light on both stamps); no inset. The camera is the props' (regions.tree.cam), or while a pan plays its step's (anim pan): the slots and the tiles are drawn at it, so no node is added. Every rect,
   colour and picture id is the spec's; every word the props' or the spec's strings, by role. The pad walks l3.focus.graph with the host's answers to its selectors (focus.resolve). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../anim/anim.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <string.h>

#define S "library"
#define C3 "l3.close"
#define SLOTS 32

static int is_compare(void) { return strcmp(v_pstr("state"), "compare") == 0; }
static int is_close(void) { return is_compare() || strcmp(v_pstr("state"), "close") == 0; }   /* CLOSE's tree: close and compare */

/* ---- CLOSE's geometry: the camera, a grid point on screen, a node's box ---- */
typedef struct { int x0, y0, du, drow, view[4]; } grid_t;
static grid_t grid_of(void) { grid_t g; g.x0 = v_si(S, C3 ".grid.x0", 0); g.y0 = v_si(S, C3 ".grid.y0", 0); g.du = v_si(S, C3 ".grid.du", 0); g.drow = v_si(S, C3 ".grid.drow", 0); v_srect(S, C3 ".view", g.view); return g; }
/* the camera the tree is drawn at: a playing pan's step, else the props' */
static void camera(int cam[2]) { cam[0] = v_pint("regions.tree.cam.0", 0); cam[1] = v_pint("regions.tree.cam.1", 0); anim_pan_at(v_sstr(S, C3 ".pan.target"), cam); }
/* a node's box under the camera: boxes.<kind> centred on its grid point (x0 + u du - cam.x, y0 + row drow - cam.y) */
static void node_box(const grid_t *g, const char *kind, int u, int row, const int cam[2], int box[4]) {
  int w = v_sk(S, v_fmt(C3 ".boxes.%s", kind), 0), h = v_sk(S, v_fmt(C3 ".boxes.%s", kind), 1), x = g->x0 + u * g->du - cam[0], y = g->y0 + row * g->drow - cam[1];
  box[0] = x - w / 2; box[1] = y - h / 2; box[2] = w; box[3] = h;
}
static int inside(const int r[4], const int z[4]) { return r[0] >= z[0] && r[1] >= z[1] && r[0] + r[2] <= z[0] + z[2] && r[1] + r[3] <= z[1] + z[3]; }
/* the slots (regions.tree.slots, at most SLOTS): each node's id, kind, grid point and box under the camera, and whether it is drawn (wholly inside the view, a mibi's and the bud's name line with it);
   the count the props hold */
typedef struct { char id[FOCUS_ID], kind[8]; int u, row, box[4], drawn; } slot_t;
static int slots_of(const grid_t *g, const int cam[2], slot_t s[SLOTS]) {
  int n = v_plen("regions.tree.slots"); if (n < 0) n = 0; if (n > SLOTS) n = SLOTS; memset(s, 0, sizeof(slot_t) * SLOTS);
  for (int k = 0; k < n; k++) {
    snprintf(s[k].id, sizeof s[k].id, "%s", v_pstr(v_fmt("regions.tree.slots.%d.id", k))); snprintf(s[k].kind, sizeof s[k].kind, "%s", v_pstr(v_fmt("regions.tree.slots.%d.kind", k)));
    s[k].u = v_pint(v_fmt("regions.tree.slots.%d.u", k), 0); s[k].row = v_pint(v_fmt("regions.tree.slots.%d.row", k), 0);
    node_box(g, s[k].kind, s[k].u, s[k].row, cam, s[k].box);
    int named = strcmp(s[k].kind, "pod") != 0, ext[4] = { s[k].box[0], s[k].box[1], s[k].box[2], s[k].box[3] };   /* a mibi or the bud with its name line: the node as drawn */
    if (named) ext[3] = s[k].box[3] / 2 + v_si(S, v_fmt(C3 ".names.%s", strcmp(s[k].kind, "bud") == 0 ? "bud" : "mibi"), 0) + v_role_pitch(v_sstr(S, C3 ".names.role"));
    s[k].drawn = inside(ext, g->view);
  }
  return n;
}

/* ---- the focus: far, the mibis and the bud at their dot boxes in the picture plus its origin; close, at their slots' boxes (a node not drawn has no box) ---- */
int family_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap; if (n < 0) n = 0;
  int close = is_close(), ox = v_sk(S, "l3.far.rect", 0), oy = v_sk(S, "l3.far.rect", 1), cam[2], ns = 0; static slot_t sl[SLOTS];
  if (close) { grid_t g = grid_of(); camera(cam); ns = slots_of(&g, cam, sl); }
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int box[4] = { 0, 0, 0, 0 };
    if (!close) v_pbox("regions.far.boxes", t->id, ox, oy, box);
    else for (int k = 0; k < ns; k++) if (sl[k].drawn && strcmp(sl[k].id, t->id) == 0) memcpy(box, sl[k].box, sizeof box);
    focus_fill(t, "focus.targets", i, box);
  }
  return n;
}
static void ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur()); if (!*c || anim_holding()) return;   /* no ring while an event holds input (the zoom's dither), as every screen's */
  focus_target_t t[FOCUS_TARGETS]; int n = family_focus(t, FOCUS_TARGETS), close = is_close();
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0 && t[i].w > 0) {
    int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h }; v_region("focus", LAYER_CHROME);
    word_focusRing("focus", S, close ? (strcmp(c, "node.bud") == 0 ? "l3.focus.targets.bud" : "l3.focus.targets.mibi") : "l3.focus.targets.node", box); return;
  }
}

/* ---- the links (l3.close.links): pixel runs in screen coordinates, then cut into the four tiles ---- */
#define RUNS 3072
typedef struct { short x, y, len; char vert, col; } run_t;   /* a 1 px run: len pixels from (x, y), down when vert; col: 0 the link colour, 1 the faded, 2 the junction's */
static run_t g_run[RUNS]; static int g_nrun;
static void run_add(int x, int y, int len, int vert, int col) { if (len <= 0) return; if (g_nrun >= RUNS) { if (g_nrun++ == RUNS) v_error("library.family: the tree's links hold more runs than the face keeps"); return; } g_run[g_nrun++] = (run_t){ (short)x, (short)y, (short)len, (char)vert, (char)col }; }
/* a line `width` px wide along one axis, from a to b inclusive (the pixels along it), at `at` across it (the columns at - 1 and at, or the rows); clipped to the view across */
static void line_px(const grid_t *g, int vert, int at, int a, int b, int width, int col) {
  for (int k = 0; k < width; k++) { int c = at - width / 2 + k, lo = vert ? g->view[0] : g->view[1], hi = lo + (vert ? g->view[2] : g->view[3]);
    if (c < lo || c >= hi) continue; if (vert) run_add(c, a, b - a + 1, 1, col); else run_add(a, c, b - a + 1, 0, col); }
}
/* a piece [a, b] of a link, its ends stubbed when they leave (sa, sb): the last `len` px at a stubbed end dotted, `on` px at the end, then `off`, and so on */
static void piece(const grid_t *g, int vert, int at, int a, int b, int sa, int sb, int width, int col, int len, int on, int off) {
  if (a > b) return;
  int mid = a + (b - a) / 2, s0 = sa ? (a + len - 1 < (sb ? mid : b) ? a + len - 1 : (sb ? mid : b)) : a - 1, s1 = sb ? (b - len + 1 > (sa ? mid + 1 : a) ? b - len + 1 : (sa ? mid + 1 : a)) : b + 1;
  if (sa) for (int p = a; p <= s0; p += on + off) line_px(g, vert, at, p, p + on - 1 < s0 ? p + on - 1 : s0, width, col);
  if (s0 + 1 <= s1 - 1) line_px(g, vert, at, s0 + 1, s1 - 1, width, col);
  if (sb) for (int p = b; p >= s1; p -= on + off) line_px(g, vert, at, p - on + 1 > s1 ? p - on + 1 : s1, p, width, col);
}
/* the lineage's nodes (regions.lineage.nodes: id, kind, grid point), read once a draw */
#define NODES 256
typedef struct { char id[FOCUS_ID], kind[8]; int u, row; } lnode_t;
static lnode_t g_node[NODES]; static int g_nnode;
static void nodes_read(void) {
  g_nnode = v_plen("regions.lineage.nodes"); if (g_nnode < 0) g_nnode = 0; if (g_nnode > NODES) g_nnode = NODES;
  for (int i = 0; i < g_nnode; i++) { snprintf(g_node[i].id, sizeof g_node[i].id, "%s", v_pstr(v_fmt("regions.lineage.nodes.%d.id", i))); snprintf(g_node[i].kind, sizeof g_node[i].kind, "%s", v_pstr(v_fmt("regions.lineage.nodes.%d.kind", i)));
    g_node[i].u = v_pint(v_fmt("regions.lineage.nodes.%d.u", i), 0); g_node[i].row = v_pint(v_fmt("regions.lineage.nodes.%d.row", i), 0); }
}
/* the node at grid point (u, h half rows): its kind into kind, and whether a slot draws it; 0 when no node is there */
static int node_at(int u, int h, const slot_t *sl, int ns, char kind[8], int *drawn) {
  if (h & 1) return 0;
  for (int i = 0; i < g_nnode; i++) if (g_node[i].u == u && g_node[i].row == h / 2) {
    snprintf(kind, 8, "%s", g_node[i].kind); *drawn = 0;
    for (int k = 0; k < ns; k++) if (sl[k].drawn && strcmp(sl[k].id, g_node[i].id) == 0) *drawn = 1;
    return 1;
  }
  return 0;
}
/* the props' segments (regions.tree.links), read once a draw: a and b as [u, h half rows], faded */
#define LINKS 512
typedef struct { int ua, ha, ub, hb, faded; } seg_t;
static seg_t g_seg[LINKS]; static int g_nseg;
static void links_read(void) {
  g_nseg = v_plen("regions.tree.links"); if (g_nseg < 0) g_nseg = 0; if (g_nseg > LINKS) g_nseg = LINKS;
  for (int i = 0; i < g_nseg; i++) { seg_t *s = &g_seg[i]; s->ua = v_pint(v_fmt("regions.tree.links.%d.a.0", i), 0); s->ha = v_pint(v_fmt("regions.tree.links.%d.a.1", i), 0); s->ub = v_pint(v_fmt("regions.tree.links.%d.b.0", i), 0); s->hb = v_pint(v_fmt("regions.tree.links.%d.b.1", i), 0); s->faded = v_pbool(v_fmt("regions.tree.links.%d.faded", i), 0); }
}
/* one segment's runs, (ua, ha) to (ub, hb) in grid units and half rows, `width` px in colour `col`: it stops at a node's box (a drawn mibi's below its name, `below`); with `stubs`, an end that leaves the view or ends at a node
   not drawn is a stub, else the segment is cut there solid; a stem a bus crosses keeps the bridge's gap (the bus is drawn whole) */
typedef struct { int width, bridge, len, on, off, below, stubs; } segstyle_t;
static void seg_runs(const grid_t *g, const int cam[2], const slot_t *sl, int ns, int ua, int ha, int ub, int hb, int col, const segstyle_t *st) {
  int width = st->width, nl = g_nseg, vt = g->view[1], vb = g->view[1] + g->view[3] - 1, vl = g->view[0], vr = g->view[0] + g->view[2] - 1, vert = ua == ub;
  if (vert ? ha > hb : ua > ub) { int t = ua; ua = ub; ub = t; t = ha; ha = hb; hb = t; }
  int at = vert ? g->x0 + ua * g->du - cam[0] : g->y0 + ha * g->drow / 2 - cam[1];
  int a = vert ? g->y0 + ha * g->drow / 2 - cam[1] : g->x0 + ua * g->du - cam[0], b = vert ? g->y0 + hb * g->drow / 2 - cam[1] : g->x0 + ub * g->du - cam[0], sa = 0, sb = 0;
  /* a link stops at a node's box (a drawn mibi's below its name); at a node not drawn it ends in a stub */
  char kind[8]; int drawn, box[4];
  if (node_at(ua, ha, sl, ns, kind, &drawn)) { node_box(g, kind, ua, ha / 2, cam, box); a = vert ? (drawn && strcmp(kind, "mibi") == 0 ? box[1] + box[3] / 2 + st->below : box[1] + box[3]) : box[0] + box[2]; sa = !drawn; }
  if (node_at(ub, hb, sl, ns, kind, &drawn)) { node_box(g, kind, ub, hb / 2, cam, box); b = (vert ? box[1] : box[0]) - 1; sb = !drawn; }
  /* the view: a link that leaves it is cut at its edge, and that end is a stub */
  int lo = vert ? vt : vl, hi = vert ? vb : vr, alo = vert ? vl : vt, ahi = vert ? vr : vb;
  if (at + width - width / 2 - 1 < alo || at - width / 2 > ahi) return;
  if (a < lo) { a = lo; sa = 1; } if (b > hi) { b = hi; sb = 1; } if (a > b) return;
  if (!st->stubs) sa = sb = 0;
  if (!vert) { piece(g, 0, at, a, b, sa, sb, width, col, st->len, st->on, st->off); return; }
  /* a stem a bus crosses (the bus's span strictly holds the stem's u and the stem's strictly holds the bus's row): a gap of `bridge` px on each side of the bus, top to bottom, the ground showing (the bus is drawn whole) */
  int ys[16], ny = 0;
  for (int j = 0; j < nl && ny < 16; j++) {
    int bu = g_seg[j].ua, bu2 = g_seg[j].ub, bh = g_seg[j].ha; if (bh != g_seg[j].hb || bu == bu2) continue; if (bu > bu2) { int t = bu; bu = bu2; bu2 = t; }
    if (bu < ua && ua < bu2 && ha < bh && bh < hb) { int y = g->y0 + bh * g->drow / 2 - cam[1], q = ny++; while (q > 0 && ys[q - 1] > y) { ys[q] = ys[q - 1]; q--; } ys[q] = y; }
  }
  int from = a, first = 1;
  for (int q = 0; q < ny; q++) {
    int g0 = ys[q] - width / 2 - st->bridge, g1 = ys[q] + width - width / 2 - 1 + st->bridge;
    if (g1 < from) continue; if (g0 > b) break;
    if (g0 - 1 >= from) piece(g, 1, at, from, g0 - 1, first ? sa : 0, 0, width, col, st->len, st->on, st->off);
    from = g1 + 1; first = 0;
  }
  piece(g, 1, at, from, b, first ? sa : 0, sb, width, col, st->len, st->on, st->off);
}
static segstyle_t style_of(void) {
  segstyle_t s = { v_si(S, C3 ".links.width", 2), v_si(S, C3 ".links.bridge", 3), v_si(S, C3 ".links.stub.len", 16), v_si(S, C3 ".links.stub.on", 2), v_si(S, C3 ".links.stub.off", 2),
    v_si(S, C3 ".names.mibi", 0) + v_role_pitch(v_sstr(S, C3 ".names.role")) + v_si(S, C3 ".names.gap", 0), 1 };
  return s;
}
static void links_runs(const grid_t *g, const int cam[2], const slot_t *sl, int ns) {
  g_nrun = 0; nodes_read(); links_read();
  segstyle_t st = style_of(); int js = v_si(S, C3 ".links.junction.size", 4), nl = g_nseg;
  int vt = g->view[1], vb = g->view[1] + g->view[3] - 1, vl = g->view[0], vr = g->view[0] + g->view[2] - 1;
  for (int i = 0; i < nl; i++) seg_runs(g, cam, sl, ns, g_seg[i].ua, g_seg[i].ha, g_seg[i].ub, g_seg[i].hb, g_seg[i].faded ? 1 : 0, &st);
  /* the junction dots: where a stem meets its bus (a stem's end on a half row), each once, inside the view */
  int seen[512][2], nseen = 0;
  for (int i = 0; i < nl; i++) for (int e = 0; e < 2; e++) {
    int u = e ? g_seg[i].ub : g_seg[i].ua, h = e ? g_seg[i].hb : g_seg[i].ha, u2 = e ? g_seg[i].ua : g_seg[i].ub;
    if (!(h & 1) || u2 != u) continue;
    int dup = 0; for (int k = 0; k < nseen; k++) if (seen[k][0] == u && seen[k][1] == h) dup = 1; if (dup) continue; if (nseen < 512) { seen[nseen][0] = u; seen[nseen][1] = h; nseen++; }
    int x = g->x0 + u * g->du - cam[0] - js / 2, y = g->y0 + h * g->drow / 2 - cam[1] - js / 2;
    for (int r = 0; r < js; r++) { int yy = y + r, x0 = x < vl ? vl : x, x1 = x + js - 1 > vr ? vr : x + js - 1; if (yy >= vt && yy <= vb && x0 <= x1) run_add(x0, yy, x1 - x0 + 1, 0, 2); }
  }
}
/* the four tiles (l3.close.links.tiles, .tile): each a composed node of the runs that fall in it, in its own coordinates; an empty tile keeps its box with ops [] */
static void links_tiles(const grid_t *g) {
  char col[3][24]; snprintf(col[0], 24, "%s", v_scol(S, C3 ".links.colour")); snprintf(col[1], 24, "%s", v_scol(S, C3 ".links.faded")); snprintf(col[2], 24, "%s", v_scol(S, C3 ".links.junction.colour"));
  int cols = v_sk(S, C3 ".links.tiles", 0), rows = v_sk(S, C3 ".links.tiles", 1), tw = v_sk(S, C3 ".links.tile", 0), th = v_sk(S, C3 ".links.tile", 1);
  v_region("links", LAYER_ART);
  for (int t = 0; t < cols * rows; t++) {
    int tx = g->view[0] + tw * (t % cols), ty = g->view[1] + th * (t / cols); char *o = prim_ops(); int cap = prim_ops_size(), n = snprintf(o, (size_t)cap, "["), first = 1;
    for (int i = 0; i < g_nrun && i < RUNS && n < cap - 64; i++) {
      const run_t *r = &g_run[i]; int x0 = r->x, y0 = r->y, x1 = r->vert ? r->x : r->x + r->len - 1, y1 = r->vert ? r->y + r->len - 1 : r->y;
      if (x0 < tx) x0 = tx; if (y0 < ty) y0 = ty; if (x1 > tx + tw - 1) x1 = tx + tw - 1; if (y1 > ty + th - 1) y1 = ty + th - 1; if (x0 > x1 || y0 > y1) continue;
      n += snprintf(o + n, (size_t)(cap - n), "%s[\"%s\",%d,%d,%d,\"%s\"]", first ? "" : ",", r->vert ? "v" : "h", x0 - tx, y0 - ty, r->vert ? y1 - y0 + 1 : x1 - x0 + 1, col[(int)r->col]); first = 0;
    }
    snprintf(o + n, (size_t)(cap - n), "]");
    v_composed(v_fmt("tree.links.%d", t), tx, ty, tw, th, o);
  }
}

/* ---- compare's path (l3.compare.path): the props' segments (regions.tree.path, as the links) drawn as the links are, solid with no stubs and no junctions, in one composed node at their bounds; no size when none ---- */
#define PSEGS 64
static void path_node(const grid_t *g, const int cam[2], const slot_t *sl, int ns) {
  int n = v_plen("regions.tree.path"); if (n < 0) n = 0; if (n > PSEGS) n = PSEGS;
  segstyle_t st = style_of(); st.width = v_si(S, "l3.compare.path.width", 2); st.stubs = 0; g_nrun = 0;
  for (int i = 0; i < n; i++) seg_runs(g, cam, sl, ns, v_pint(v_fmt("regions.tree.path.%d.a.0", i), 0), v_pint(v_fmt("regions.tree.path.%d.a.1", i), 0), v_pint(v_fmt("regions.tree.path.%d.b.0", i), 0), v_pint(v_fmt("regions.tree.path.%d.b.1", i), 0), 3, &st);
  /* after its segments, each bus junction (the links' 4 x 4 dots) whose box the segments touch is drawn again whole in the junction's colour, in this same node (AD7-2) */
  { int js = v_si(S, C3 ".links.junction.size", 4), nsr = g_nrun, nl = g_nseg, seen[512][2], nseen = 0;
    int vt = g->view[1], vb = g->view[1] + g->view[3] - 1, vl = g->view[0], vr = g->view[0] + g->view[2] - 1;
    for (int i = 0; i < nl; i++) for (int e = 0; e < 2; e++) {
      int u = e ? g_seg[i].ub : g_seg[i].ua, h = e ? g_seg[i].hb : g_seg[i].ha, u2 = e ? g_seg[i].ua : g_seg[i].ub;
      if (!(h & 1) || u2 != u) continue;
      int dup = 0; for (int k = 0; k < nseen; k++) if (seen[k][0] == u && seen[k][1] == h) dup = 1; if (dup) continue; if (nseen < 512) { seen[nseen][0] = u; seen[nseen][1] = h; nseen++; }
      int x = g->x0 + u * g->du - cam[0] - js / 2, y = g->y0 + h * g->drow / 2 - cam[1] - js / 2, touch = 0;
      for (int k = 0; k < nsr && k < RUNS; k++) { const run_t *r = &g_run[k]; int ex = r->vert ? r->x : r->x + r->len - 1, ey = r->vert ? r->y + r->len - 1 : r->y; if (r->x <= x + js - 1 && ex >= x && r->y <= y + js - 1 && ey >= y) touch = 1; }
      if (!touch) continue;
      for (int rr = 0; rr < js; rr++) { int yy = y + rr, xa = x < vl ? vl : x, xb = x + js - 1 > vr ? vr : x + js - 1; if (yy >= vt && yy <= vb && xa <= xb) run_add(xa, yy, xb - xa + 1, 0, 2); }
    }
  }
  int x0 = 1 << 30, y0 = 1 << 30, x1 = -1, y1 = -1;
  for (int i = 0; i < g_nrun && i < RUNS; i++) { const run_t *r = &g_run[i]; int ex = r->vert ? r->x : r->x + r->len - 1, ey = r->vert ? r->y + r->len - 1 : r->y; if (r->x < x0) x0 = r->x; if (r->y < y0) y0 = r->y; if (ex > x1) x1 = ex; if (ey > y1) y1 = ey; }
  v_region("links", LAYER_ART);
  if (x1 < 0) { v_composed("tree.path", g->view[0], g->view[1], 0, 0, "[]"); return; }
  char col[24], jcol[24]; snprintf(col, sizeof col, "%s", v_scol(S, "l3.compare.path.colour")); snprintf(jcol, sizeof jcol, "%s", v_scol(S, C3 ".links.junction.colour")); char *o = prim_ops(); int cap = prim_ops_size(), k = snprintf(o, (size_t)cap, "[");
  for (int i = 0; i < g_nrun && i < RUNS && k < cap - 64; i++) { const run_t *r = &g_run[i]; k += snprintf(o + k, (size_t)(cap - k), "%s[\"%s\",%d,%d,%d,\"%s\"]", i ? "," : "", r->vert ? "v" : "h", r->x - x0, r->y - y0, r->len, r->col == 2 ? jcol : col); }
  snprintf(o + k, (size_t)(cap - k), "]");
  v_composed("tree.path", x0, y0, x1 - x0 + 1, y1 - y0 + 1, o);
}
/* compare's hold mark (l3.compare.hold): kit_focusRingHold on the held mibi's slot box; no size when nothing is held or its slot is not drawn */
static void hold_mark(const grid_t *g, const slot_t *sl, int ns) {
  char h[FOCUS_ID]; snprintf(h, sizeof h, "%s", v_pstr("regions.tree.hold")); int box[4] = { g->view[0], g->view[1], 0, 0 };
  if (*h) for (int k = 0; k < ns; k++) if (sl[k].drawn && strcmp(sl[k].id, h) == 0) memcpy(box, sl[k].box, sizeof box);
  v_region("tree", LAYER_CHROME); kit_focusRingHold("tree.hold", box, v_si(S, "l3.focus.targets.mibi.shape.rect", 0));   /* the ring's outer corner on the same target */
}

/* ---- the slots (l3.close.slot, .names): the node's picture, its name under it; a slot with no node, or one not wholly inside the view, has no size ---- */
static void slots(const grid_t *g, const slot_t *sl) {
  char ground[24], role[24], rrole[24], fallback[96]; snprintf(ground, sizeof ground, "%s", v_scol(S, "l1.stage.ground")); snprintf(role, sizeof role, "%s", v_sstr(S, C3 ".names.role")); snprintf(rrole, sizeof rrole, "%s", v_sstr(S, C3 ".names.released"));
  snprintf(fallback, sizeof fallback, "%s", v_pstr("regions.stage.picture.0"));
  int clip = v_si(S, C3 ".names.clip", 0);
  for (int k = 0; k < SLOTS; k++) {
    const slot_t *s = &sl[k]; int on = s->drawn, x = on ? s->box[0] + s->box[2] / 2 : g->view[0], y = on ? s->box[1] + s->box[3] / 2 : g->view[1], mibi = strcmp(s->kind, "mibi") == 0, bud = strcmp(s->kind, "bud") == 0;   /* a slot not drawn: its nodes with no size at the view's corner */
    char pic[96], name[V_STR], cut[V_STR + 4]; snprintf(pic, sizeof pic, "%s", on ? v_pstr(v_fmt("regions.tree.slots.%d.picture", k)) : ""); snprintf(name, sizeof name, "%s", on && (mibi || bud) ? v_pstr(v_fmt("regions.tree.slots.%d.name", k)) : "");
    v_name("tree"); v_slot(v_fmt("tree.slot.%d.face", k), pic, fallback, on ? s->box[0] : x, on ? s->box[1] : y, s->box[2], s->box[3], on && *pic);
    v_role_clip(name, clip, role, cut, sizeof cut);
    v_region("tree", LAYER_TYPE);
    v_say(v_fmt("tree.slot.%d.name", k), cut, x, on ? y + v_si(S, v_fmt(C3 ".names.%s", bud ? "bud" : "mibi"), 0) : y, V_ANCHOR_LINE, on && v_pbool(v_fmt("regions.tree.slots.%d.released", k), 0) ? rrole : role, ground, V_ALIGN_CENTRE);
  }
}

/* ---- the info panel (l3.close.panel): the bezel; in compare the held mibi (l3.compare.held), the divider and the fact band; the focused node's rows (l3.close.panel.rows), moved down by l3.compare.shift in compare;
   the overview inset (l3.close.inset) only when the props name the mini (close, the tree exceeds the view), else its nodes with no size. Every part not shown keeps its nodes with no size ---- */
#define PR C3 ".panel.rows"
#define CH "l3.compare"
#define LIGHTS 9
static char g_pground[24], g_fallback[96];
/* a line on the panel, in region `region`, by role at (x, lineTop), cut to clip px when clip > 0; returns its width. The panel's texts that caption a picture or may end in an ellipsis are drawn in sub-regions
   (library.json regions.panel: head, par.0, par.1, held), which mark `labels` and `ellipsis` for the clearance check */
static int panel_say_in(const char *region, const char *id, const char *s, int x, int top, const char *role, int clip) {
  char cut[V_STR + 4]; if (clip > 0) v_role_clip(s, clip, role, cut, sizeof cut); else snprintf(cut, sizeof cut, "%.*s", V_STR - 1, s);
  v_region(region, LAYER_TYPE); return v_say(id, cut, x, top, V_ANCHOR_LINE, role, g_pground, V_ALIGN_LEFT);
}
static int panel_say(const char *id, const char *s, int x, int top, const char *role, int clip) { return panel_say_in("panel", id, s, x, top, role, clip); }
static void panel_pic(const char *id, const char *pic, int x, int y, int w, int h, int shown) { v_name("panel"); v_slot(id, pic, g_fallback, x, y, w, h, shown && *pic); }
/* a stamp in its slot (rows.stamp): the slot's outline, the stamp's picture centred in it at its size, then the block light (l3.compare.light): LIGHTS chapter slots, each a 2 px outline on its block's rect (props
   <pp>.stamp.lights: { c, rect } in the stamp's own pixels) as kit_panel twice, <light>.<c> and <light>.<c>.in one pixel inside; no size when unlit */
static void stamp_slot(const char *base, const char *pp, const int r[4], int shown, const char *light) {
  char edge[24], mint[24], pic[96]; snprintf(edge, sizeof edge, "%s", v_scol(S, PR ".stamp.edge")); snprintf(mint, sizeof mint, "%s", v_scol(S, CH ".light.colour"));
  v_region("panel", LAYER_CHROME); kit_panel(v_fmt("%s.slot", base), r[0], r[1], r[2], r[3], NULL, edge, NULL, !shown);
  snprintf(pic, sizeof pic, "%s", shown ? v_pstr(v_fmt("%s.stamp.picture", pp)) : ""); int size = shown ? v_pint(v_fmt("%s.stamp.size", pp), 0) : 0, x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size);
  panel_pic(v_fmt("%s.picture", base), pic, shown ? x : r[0], shown ? y : r[1], size, size, shown && size > 0);
  int n = shown ? v_plen(v_fmt("%s.stamp.lights", pp)) : 0;
  for (int c = 0; c < LIGHTS; c++) {
    int b[4] = { 0, 0, 0, 0 }, on = 0;
    for (int i = 0; i < n; i++) if (v_pint(v_fmt("%s.stamp.lights.%d.c", pp, i), -1) == c) { for (int q = 0; q < 4; q++) b[q] = v_pint(v_fmt("%s.stamp.lights.%d.rect.%d", pp, i, q), 0); on = b[2] > 0 && b[3] > 0; }
    v_region("panel", LAYER_ART);   /* over the stamp, a picture: art, as the inset's view box */
    kit_panel(v_fmt("%s.%d", light, c), on ? x + b[0] : r[0], on ? y + b[1] : r[1], b[2], b[3], NULL, mint, NULL, !on);
    kit_panel(v_fmt("%s.%d.in", light, c), on ? x + b[0] + 1 : r[0], on ? y + b[1] + 1 : r[1], b[2] - 2, b[3] - 2, NULL, mint, NULL, !on || b[2] < 3 || b[3] < 3);
  }
}
/* the held mibi (l3.compare.held): its label, name and mark at the drawn name's end, portrait, stamp label and stamp */
static void held_block(int on) {
  const char *lrole = v_sstr(S, PR ".labels.role"); char role[24], nrole[24]; snprintf(role, sizeof role, "%s", lrole); snprintf(nrole, sizeof nrole, "%s", v_sstr(S, CH ".held.name.role"));
  int x = v_si(S, PR ".x", 0), r[4]; char pic[96];
  panel_say("held.label", on ? v_sstr(S, "l3.strings.panel.holding") : "", x, v_si(S, CH ".held.label.lineTop", 0), role, 0);
  int top = v_si(S, CH ".held.name.lineTop", 0);
  v_inline(v_sstr(S, CH ".held.mark.inline"));   /* the name and its mark are one run (T8: the gap is 4) */
  int w = panel_say_in("panel.held", "held.name", on ? v_pstr("regions.panel.held.name") : "", x, top, nrole, v_si(S, CH ".held.name.clip", 0));
  int ms = v_si(S, CH ".held.mark.size", 0), cap = v_role_cap_top(top, V_ANCHOR_LINE, nrole), my = cap + v_fdiv(v_cap(v_role_font(nrole)) - ms, 2);   /* centred on the name's cap */
  snprintf(pic, sizeof pic, "%s", on ? v_pstr("regions.panel.held.mark") : ""); panel_pic("held.mark", pic, on ? x + w + v_si(S, CH ".held.mark.gap", 0) : x, on ? my : top, ms, ms, on);
  v_inline_end();
  v_srect(S, CH ".held.portrait.rect", r); snprintf(pic, sizeof pic, "%s", on ? v_pstr("regions.panel.held.portrait") : ""); panel_pic("held.portrait", pic, r[0], r[1], r[2], r[3], on);
  panel_say("held.stampLabel", "", x, 0, role, 0);   /* no word: the node stays at no size (held.stampLabel) */
  v_srect(S, CH ".held.stamp.slot", r); stamp_slot("held.stamp", "regions.panel.held", r, on, "held.light");
}
/* the divider (l3.compare.divider: two 1 px rules) and the fact band (l3.compare.fact: the props' words wrapped, at most its lines) */
static void divider_fact(int on) {
  int x = v_si(S, CH ".divider.x", 0), len = v_si(S, CH ".divider.len", 0);
  v_region("panel", LAYER_CHROME); for (int k = 0; k < 2; k++) kit_hairline(v_fmt("panel.div.%d", k), x, v_sk(S, CH ".divider.y", k), on ? len : 0, v_scol(S, v_fmt(CH ".divider.colours.%d", k)), 0, NULL);
  char role[24], buf[2 * V_STR]; snprintf(role, sizeof role, "%s", v_sstr(S, CH ".fact.role")); const char *s = on ? v_pstr("regions.panel.fact") : "";
  int max = v_si(S, CH ".fact.lines", 2), fw = v_si(S, CH ".fact.width", 0), n = *s ? v_role_wrap(s, fw, role, buf, sizeof buf, max < 2 ? max : 2) : 0, top = v_si(S, CH ".fact.lineTop", 0), fx = v_si(S, CH ".fact.x", 0), pitch = v_role_pitch(role);
  const char *q = buf, *ln[2] = { "", "" }; char l0[V_STR], l1[V_STR];
  for (int k = 0; k < n; k++) { ln[k] = q; q += strlen(q) + 1; }
  /* fact.wrap, "and starts the second line": a first line that ends on the word "and" gives it to the second */
  if (n == 2) { size_t m = strlen(ln[0]); if (m > 4 && strcmp(ln[0] + m - 4, " and") == 0) { snprintf(l0, sizeof l0, "%.*s", (int)(m - 4), ln[0]); snprintf(l1, sizeof l1, "and %s", ln[1]); ln[0] = l0; ln[1] = l1; } }
  top += n == 1 ? v_half(pitch) : 0;   /* a single line is centred in the two-line band */
  v_region("panel", LAYER_TYPE);
  for (int k = 0; k < 2; k++) v_say_in(v_fmt("panel.fact.%d", k), k < n ? ln[k] : "", fx, fw, top + k * pitch, V_ANCHOR_LINE, role, g_pground);   /* each line centred in the band (fact.align) */
}
/* the focused node's rows (l3.close.panel.rows), dy below their close places */
static void rows(int dy) {
  char lrole[24], nrole[24], qrole[24], brole[24], prole[24], pic[96]; snprintf(lrole, sizeof lrole, "%s", v_sstr(S, PR ".labels.role")); snprintf(nrole, sizeof nrole, "%s", v_sstr(S, PR ".name.role"));
  snprintf(qrole, sizeof qrole, "%s", v_sstr(S, PR ".age.role")); snprintf(brole, sizeof brole, "%s", v_sstr(S, PR ".now.role")); snprintf(prole, sizeof prole, "%s", v_sstr(S, PR ".parents.name.role"));
  int x = v_si(S, PR ".x", 0), r[4];
  /* the bud's portrait (rows.portraitSlot): the stamp slot's outline round the portrait rect, its rack pod centred in it at its own size; a mibi's face carries its own frame (the slot keeps its node, no size) */
  int bud = v_pbool("regions.panel.rows.portraitSlot", 0), pod[2]; v_srect(S, PR ".portrait.rect", r); pod[0] = v_sk(S, PR ".portraitSlot.pod", 0); pod[1] = v_sk(S, PR ".portraitSlot.pod", 1);
  { char pedge[24]; snprintf(pedge, sizeof pedge, "%s", v_scol(S, PR ".portraitSlot.edge")); v_region("panel", LAYER_CHROME); kit_panel("panel.portrait.slot", r[0], r[1] + dy, r[2], r[3], NULL, pedge, NULL, !bud); }
  snprintf(pic, sizeof pic, "%s", v_pstr("regions.panel.rows.portrait"));
  if (bud) panel_pic("panel.portrait", pic, r[0] + v_half(r[2] - pod[0]), r[1] + dy + v_half(r[3] - pod[1]), pod[0], pod[1], 1); else panel_pic("panel.portrait", pic, r[0], r[1] + dy, r[2], r[3], 1);
  panel_say_in("panel.head", "panel.name", v_pstr("regions.panel.rows.name"), v_si(S, PR ".name.x", 0), v_si(S, PR ".name.lineTop", 0) + dy, nrole, v_si(S, PR ".name.clip", 0));
  v_srect(S, PR ".mark.rect", r); snprintf(pic, sizeof pic, "%s", v_pstr("regions.panel.rows.mark")); panel_pic("panel.mark", pic, r[0], r[1] + dy, r[2], r[3], 1);
  for (int k = 0; k < 2; k++) panel_say_in("panel.head", v_fmt("panel.age.%d", k), v_pstr(v_fmt("regions.panel.rows.age.%d", k)), v_si(S, PR ".age.x", x), v_sk(S, PR ".age.lineTop", k) + dy, qrole, 0);
  int nt = v_si(S, PR ".now.lineTop", 0) + dy;
  panel_say("panel.now.label", v_sstr(S, "l3.strings.panel.now"), x, nt, lrole, 0); panel_say("panel.now.value", v_pstr("regions.panel.rows.now"), v_si(S, PR ".now.x", 0), nt, brole, 0);
  panel_say_in("panel.par.0", "panel.par.label", v_sstr(S, "l3.strings.panel.parents"), x, v_si(S, PR ".parents.lineTop", 0) + dy, lrole, 0);
  int np = v_plen("regions.panel.rows.parents"), pitch = v_si(S, PR ".parents.pitch", 0), face[4], podb[4]; v_srect(S, PR ".parents.face", face); v_srect(S, PR ".parents.pod", podb);
  for (int k = 0; k < 2; k++) {
    int on = k < np, pod = on && v_pbool(v_fmt("regions.panel.rows.parents.%d.pod", k), 0); const int *b = pod ? podb : face;
    snprintf(pic, sizeof pic, "%s", on ? v_pstr(v_fmt("regions.panel.rows.parents.%d.face", k)) : "");
    panel_pic(v_fmt("panel.par.%d.face", k), pic, b[0], b[1] + (pod ? 0 : pitch * k) + dy, b[2], b[3], on);
    panel_say_in(k ? "panel.par.1" : "panel.par.0", v_fmt("panel.par.%d.name", k), on ? v_pstr(v_fmt("regions.panel.rows.parents.%d.name", k)) : "", v_si(S, PR ".parents.name.x", 0), v_si(S, PR ".parents.name.lineTop", 0) + pitch * k + dy, prole, v_si(S, PR ".parents.name.clip", 0));
  }
  panel_say("panel.stamp.label", v_sstr(S, "l3.strings.panel.stamp"), x, v_si(S, PR ".stamp.lineTop", 0) + dy, lrole, 0);
  v_srect(S, PR ".stamp.slot", r); r[1] += dy; stamp_slot("panel.stamp", "regions.panel.rows", r, 1, "panel.light");
}
static void panel(void) {
  int r[4], cmp = is_compare(); v_srect(S, C3 ".panel.rect", r); if (!cmp && !*v_pstr("regions.panel.ov.picture")) v_srect(S, C3 ".panel.rectFits", r);   /* no inset: the panel is the height of its rows */
  char fill[24], bevel[24]; snprintf(fill, sizeof fill, "%s", v_scol(S, C3 ".panel.fill")); snprintf(bevel, sizeof bevel, "%s", v_scol(S, C3 ".panel.bevel"));
  snprintf(g_pground, sizeof g_pground, "%s", fill); snprintf(g_fallback, sizeof g_fallback, "%s", v_pstr("regions.stage.picture.0"));
  v_region("panel", LAYER_CHROME); kit_bezel("panel", r[0], r[1], r[2], r[3], v_si(S, C3 ".panel.radius", 1), fill, NULL, bevel, NULL);
  held_block(cmp); divider_fact(cmp); rows(cmp ? v_si(S, CH ".shift", 0) : 0);
  int in[4], b[4]; v_srect(S, C3 ".inset.rect", in); char mini[96], edge[24], box[24]; snprintf(mini, sizeof mini, "%s", v_pstr("regions.panel.ov.picture")); snprintf(edge, sizeof edge, "%s", v_scol(S, C3 ".inset.edge")); snprintf(box, sizeof box, "%s", v_scol(S, C3 ".inset.box"));
  int shown = *mini != 0; for (int q = 0; q < 4; q++) b[q] = v_pint(v_fmt("regions.panel.ov.box.%d", q), 0);
  v_name("panel"); v_slot("panel.ov.picture", mini, v_pstr("regions.stage.picture.0"), in[0], in[1], in[2], in[3], shown);
  v_region("panel", LAYER_CHROME); kit_panel("panel.ov.edge", in[0], in[1], in[2], in[3], NULL, edge, NULL, !shown);
  v_region("panel", LAYER_ART); kit_panel("panel.ov.box", in[0] + b[0], in[1] + b[1], b[2], b[3], NULL, box, NULL, !shown || b[2] <= 0 || b[3] <= 0);   /* the view box is over the mini, a picture: art, never the ring's chrome */
}

static void close_words(void) {
  grid_t g = grid_of(); int cam[2]; camera(cam); static slot_t sl[SLOTS]; int ns = slots_of(&g, cam, sl);
  links_runs(&g, cam, sl, ns); links_tiles(&g);
  path_node(&g, cam, sl, ns);   /* compare's path over the tiles (no size in close: the props give no segment) */
  slots(&g, sl);
  panel();
  hold_mark(&g, sl, ns);   /* before the ring */
}

void library_family_words(void) {
  int r[4];
  kit_stage(S, "l1.stage.rect", v_scol(S, "l1.stage.ground"), "stage", "family.stage.ground", "family.stage.picture", "regions.stage.picture");
  if (is_close()) close_words();
  else { v_srect(S, "l3.far.rect", r); char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr("regions.far.picture")); v_name("far"); v_slot("far.picture", pic, NULL, r[0], r[1], r[2], r[3], *pic != 0); }
  ring();
}

/* a key on Level 3: ✓ ← and the room keys are intents on the focused node; the pad moves the ring by l3.focus.graph with the host's selectors */
void library_family_key(int code) { screens_key_graph(code, S, "l3.focus.graph", family_focus, NULL, &(screens_keys_t){ .resolve = 1 }); }
