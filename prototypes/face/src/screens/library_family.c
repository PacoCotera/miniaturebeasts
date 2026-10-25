/* The Library's Level 3 (library.json `l3`, the screen `library.family`): a binding table.
   far: the stage (kit_stage on l1.stage, as on Levels 1 and 2); the whole lineage as one picture at l3.far.rect (the generator's lineage-far picture, as the props name it); the ring (word_focusRing on
   l3.focus.targets.node) on the focused node's dot box. The props give the generator's facts in the picture's own coordinates (each target's dot box), to which the face adds the picture's origin. No panel.
   close (l3.close): the stage; the tree's links in four tiles over the view (screen-specific, the architect's ruling: composed here from the props' segments in grid units with the spec's spacing); the compare
   path's node, kept; the 32 node slots the host assigned (v_slot of each node's picture, its name under it); the info panel (kit_bezel) and its overview inset (the mini, its outline, the view box); the ring on
   the focused node's slot. The camera is the props' (regions.tree.cam), or while a pan plays its step's (anim pan): the slots and the tiles are drawn at it, so no node is added. Every rect, colour and picture id
   is the spec's. The pad walks l3.focus.graph with the host's answers to its selectors (focus.resolve). `compare` is drawn by the frame's notBuilt composition until its screen is built. */
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

static int is_close(void) { return strcmp(v_pstr("state"), "close") == 0; }

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
static void links_runs(const grid_t *g, const int cam[2], const slot_t *sl, int ns) {
  g_nrun = 0; nodes_read(); links_read();
  int width = v_si(S, C3 ".links.width", 2), bridge = v_si(S, C3 ".links.bridge", 3), len = v_si(S, C3 ".links.stub.len", 16), on = v_si(S, C3 ".links.stub.on", 2), off = v_si(S, C3 ".links.stub.off", 2), js = v_si(S, C3 ".links.junction.size", 4);
  int below = v_si(S, C3 ".names.mibi", 0) + v_role_pitch(v_sstr(S, C3 ".names.role")) + v_si(S, C3 ".names.gap", 0), nl = g_nseg;
  int vt = g->view[1], vb = g->view[1] + g->view[3] - 1, vl = g->view[0], vr = g->view[0] + g->view[2] - 1;
  for (int i = 0; i < nl; i++) {
    int ua = g_seg[i].ua, ha = g_seg[i].ha, ub = g_seg[i].ub, hb = g_seg[i].hb, col = g_seg[i].faded ? 1 : 0, vert = ua == ub;
    if (vert ? ha > hb : ua > ub) { int t = ua; ua = ub; ub = t; t = ha; ha = hb; hb = t; }
    int at = vert ? g->x0 + ua * g->du - cam[0] : g->y0 + ha * g->drow / 2 - cam[1];
    int a = vert ? g->y0 + ha * g->drow / 2 - cam[1] : g->x0 + ua * g->du - cam[0], b = vert ? g->y0 + hb * g->drow / 2 - cam[1] : g->x0 + ub * g->du - cam[0], sa = 0, sb = 0;
    /* a link stops at a node's box (a drawn mibi's below its name); at a node not drawn it ends in a stub */
    char kind[8]; int drawn, box[4];
    if (node_at(ua, ha, sl, ns, kind, &drawn)) { node_box(g, kind, ua, ha / 2, cam, box); a = vert ? (drawn && strcmp(kind, "mibi") == 0 ? box[1] + box[3] / 2 + below : box[1] + box[3]) : box[0] + box[2]; sa = !drawn; }
    if (node_at(ub, hb, sl, ns, kind, &drawn)) { node_box(g, kind, ub, hb / 2, cam, box); b = (vert ? box[1] : box[0]) - 1; sb = !drawn; }
    /* the view: a link that leaves it is cut at its edge, and that end is a stub */
    int lo = vert ? vt : vl, hi = vert ? vb : vr, alo = vert ? vl : vt, ahi = vert ? vr : vb;
    if (at + width - width / 2 - 1 < alo || at - width / 2 > ahi) continue;
    if (a < lo) { a = lo; sa = 1; } if (b > hi) { b = hi; sb = 1; } if (a > b) continue;
    if (!vert) { piece(g, 0, at, a, b, sa, sb, width, col, len, on, off); continue; }
    /* a stem a bus crosses (the bus's span strictly holds the stem's u and the stem's strictly holds the bus's row): a gap of `bridge` px on each side of the bus, top to bottom, the ground showing (the bus is drawn whole) */
    int ys[16], ny = 0;
    for (int j = 0; j < nl && ny < 16; j++) {
      int bu = g_seg[j].ua, bu2 = g_seg[j].ub, bh = g_seg[j].ha; if (bh != g_seg[j].hb || bu == bu2) continue; if (bu > bu2) { int t = bu; bu = bu2; bu2 = t; }
      if (bu < ua && ua < bu2 && ha < bh && bh < hb) { int y = g->y0 + bh * g->drow / 2 - cam[1], q = ny++; while (q > 0 && ys[q - 1] > y) { ys[q] = ys[q - 1]; q--; } ys[q] = y; }
    }
    int from = a, first = 1;
    for (int q = 0; q < ny; q++) {
      int g0 = ys[q] - width / 2 - bridge, g1 = ys[q] + width - width / 2 - 1 + bridge;
      if (g1 < from) continue; if (g0 > b) break;
      if (g0 - 1 >= from) piece(g, 1, at, from, g0 - 1, first ? sa : 0, 0, width, col, len, on, off);
      from = g1 + 1; first = 0;
    }
    piece(g, 1, at, from, b, first ? sa : 0, sb, width, col, len, on, off);
  }
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

/* ---- the info panel (l3.close.panel) and its overview inset (l3.close.inset): the inset only when the props name the mini (the tree exceeds the view), else its nodes with no size ---- */
static void panel(void) {
  int r[4]; v_srect(S, C3 ".panel.rect", r); char fill[24], bevel[24]; snprintf(fill, sizeof fill, "%s", v_scol(S, C3 ".panel.fill")); snprintf(bevel, sizeof bevel, "%s", v_scol(S, C3 ".panel.bevel"));
  v_region("panel", LAYER_CHROME); kit_bezel("panel", r[0], r[1], r[2], r[3], v_si(S, C3 ".panel.radius", 1), fill, NULL, bevel, NULL);
  int in[4], b[4]; v_srect(S, C3 ".inset.rect", in); char mini[96], edge[24], box[24]; snprintf(mini, sizeof mini, "%s", v_pstr("regions.panel.ov.picture")); snprintf(edge, sizeof edge, "%s", v_scol(S, C3 ".inset.edge")); snprintf(box, sizeof box, "%s", v_scol(S, C3 ".inset.box"));
  int shown = *mini != 0; for (int q = 0; q < 4; q++) b[q] = v_pint(v_fmt("regions.panel.ov.box.%d", q), 0);
  v_name("panel"); v_slot("panel.ov.picture", mini, v_pstr("regions.stage.picture.0"), in[0], in[1], in[2], in[3], shown);
  v_region("panel", LAYER_CHROME); kit_panel("panel.ov.edge", in[0], in[1], in[2], in[3], NULL, edge, !shown);
  v_region("panel", LAYER_ART); kit_panel("panel.ov.box", in[0] + b[0], in[1] + b[1], b[2], b[3], NULL, box, !shown || b[2] <= 0 || b[3] <= 0);   /* the view box is over the mini, a picture: art, never the ring's chrome */
}

static void close_words(void) {
  grid_t g = grid_of(); int cam[2]; camera(cam); static slot_t sl[SLOTS]; int ns = slots_of(&g, cam, sl);
  links_runs(&g, cam, sl, ns); links_tiles(&g);
  { int pr[4]; v_srect(S, C3 ".path.rect", pr); v_region("links", LAYER_ART); v_composed("tree.path", pr[0], pr[1], pr[2], pr[3], "[]"); }   /* the compare path: its node kept, nothing drawn until compare */
  slots(&g, sl);
  panel();
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
