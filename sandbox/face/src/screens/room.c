/* The rooms' loader and queries (the rooms design; room.h): the `rooms` spec checked whole and turned into tables, the room chosen for a window, its pieces and keep-outs in that window's coordinates. It refuses, through the
   spec's error, what the data guards 1, 2, 3 and 6 of place-masters --check refuse: a profile that does not strictly increase or whose tops are not above its bottom; a raised level whose bottom is not above the main floor under
   it; a join end off its level; more than six occluders or occluders over 15 % of the window. Integers only. */
#include "room.h"
#include "../spec/spec.h"
#include "../vocab/vocab.h"
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define RM_ROOMS 4
#define RM_LEVELS 4
#define RM_X 8
#define RM_KEEP 8
#define RM_JOINS 4
#define RM_PIECES 12
typedef struct { char id[16]; int nx, x[RM_X + 1], top[RM_X], bottom, nk, ko[RM_KEEP][4]; } rm_level_t;
typedef struct { int upper, lower, hop, ends[2][2], rect[4]; } rm_join_t;
typedef struct { char id[32]; int kind, has_pic, rect[4], foot, opa, level; } rm_piece_t;
typedef struct { char id[16]; int nl, nj, np; rm_level_t lv[RM_LEVELS]; rm_join_t jn[RM_JOINS]; rm_piece_t pc[RM_PIECES]; } rm_room_t;

static rm_room_t g_r[RM_ROOMS]; static int g_nr;
static const char *M = "rooms";
static char g_err[200]; static int g_bad;
static const char *P(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
static const char *P(const char *fmt, ...) { static char b[32][160]; static int k; k = (k + 1) & 31; va_list a; va_start(a, fmt); vsnprintf(b[k], sizeof b[k], fmt, a); va_end(a); return b[k]; }
static void bad(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
static void bad(const char *fmt, ...) { if (g_bad) return; g_bad = 1; va_list a; va_start(a, fmt); int n = snprintf(g_err, sizeof g_err, "rooms: "); vsnprintf(g_err + n, sizeof g_err - (size_t)n, fmt, a); va_end(a); }
static int num(const char *path) { int v = spec_int(M, path, -0x7fffffff); if (v == -0x7fffffff) bad("%s is not a whole number", path); return v; }
static void rect(const char *path, int r[4]) { if (spec_len(M, path) != 4) { bad("%s is [x, y, w, h]", path); return; } for (int i = 0; i < 4; i++) r[i] = num(P("%s.%d", path, i)); if (!g_bad && (r[2] <= 0 || r[3] <= 0)) bad("%s: the size is not above 0", path); }
static int top_at(const rm_level_t *l, int fx) { int t = l->top[0]; for (int i = 0; i < l->nx; i++) if (fx >= l->x[i]) t = l->top[i]; return t; }   /* the top of the band holding fx (x[0] <= fx <= x[nx]) */

static void level(const char *base0, rm_level_t *l) {
  char base[96]; snprintf(base, sizeof base, "%s", base0);   /* P() reuses its buffers: the path is kept here */
  spec_str(M, P("%s.id", base), l->id, sizeof l->id); if (!l->id[0]) { bad("%s.id is a name", base); return; }
  int nx = spec_len(M, P("%s.x", base)), nt = spec_len(M, P("%s.top", base));
  if (nt < 1 || nt > RM_X) { bad("%s.top has %d values (1 to %d)", base, nt, RM_X); return; }
  if (nx != nt + 1) { bad("guard 1: %s.x has %d values for %d tops (one more is needed)", base, nx, nt); return; }
  l->nx = nt; for (int i = 0; i <= nt; i++) { l->x[i] = num(P("%s.x.%d", base, i)); if (g_bad) return; if (i && l->x[i] <= l->x[i - 1]) { bad("guard 1: %s.x does not strictly increase (%d after %d)", base, l->x[i], l->x[i - 1]); return; } }
  l->bottom = num(P("%s.bottom", base)); if (g_bad) return;
  for (int i = 0; i < nt; i++) { l->top[i] = num(P("%s.top.%d", base, i)); if (g_bad) return; if (l->top[i] >= l->bottom) { bad("guard 1: %s.top.%d (%d) is not above the bottom (%d)", base, i, l->top[i], l->bottom); return; } }
  int nk = spec_len(M, P("%s.keepOuts", base)); if (nk < 0 || nk > RM_KEEP) { bad("%s.keepOuts holds %d rects (at most %d)", base, nk, RM_KEEP); return; }
  l->nk = nk; for (int i = 0; i < nk; i++) { rect(P("%s.keepOuts.%d", base, i), l->ko[i]); if (g_bad) return; }
}
static int level_index(const rm_room_t *r, const char *id) { for (int i = 0; i < r->nl; i++) if (!strcmp(r->lv[i].id, id)) return i; return -1; }
static void room(const char *name, rm_room_t *r, int window_area) {
  char base[64]; snprintf(base, sizeof base, "rooms.%s", name); snprintf(r->id, sizeof r->id, "%s", name);
  r->nl = spec_len(M, P("%s.levels", base)); if (r->nl < 1 || r->nl > RM_LEVELS) { bad("%s.levels holds %d levels (1 to %d)", base, r->nl, RM_LEVELS); return; }
  for (int i = 0; i < r->nl; i++) { level(P("%s.levels.%d", base, i), &r->lv[i]); if (g_bad) return; }
  if (strcmp(r->lv[0].id, "main")) { bad("%s: levels.0 is %s, not main", base, r->lv[0].id); return; }
  /* guard 2: every raised level's bottom is above the main floor's top under its whole span (one sort by the feet's row stays right across levels) */
  for (int i = 1; i < r->nl; i++) { const rm_level_t *u = &r->lv[i], *m = &r->lv[0];
    for (int b = 0; b < m->nx; b++) if (m->x[b + 1] > u->x[0] && m->x[b] < u->x[u->nx] && !(u->bottom < m->top[b])) { bad("guard 2: %s level %s: the bottom %d is not above the main floor's top %d at x %d..%d", base, u->id, u->bottom, m->top[b], m->x[b], m->x[b + 1]); return; } }
  r->nj = spec_len(M, P("%s.joins", base)); if (r->nj < 0 || r->nj > RM_JOINS) { bad("%s.joins holds %d joins (at most %d)", base, r->nj, RM_JOINS); return; }
  for (int j = 0; j < r->nj; j++) { char jb[96], up[16], lo[16]; snprintf(jb, sizeof jb, "%s.joins.%d", base, j);
    spec_str(M, P("%s.upper", jb), up, sizeof up); spec_str(M, P("%s.lower", jb), lo, sizeof lo);
    rm_join_t *q = &r->jn[j]; q->upper = level_index(r, up); q->lower = level_index(r, lo); if (q->upper < 0 || q->lower < 0) { bad("%s: the join names a level that is not in the room (%s, %s)", jb, up, lo); return; }
    { char kd[8]; spec_str(M, P("%s.kind", jb), kd, sizeof kd); if (strcmp(kd, "ramp") && strcmp(kd, "hop")) { bad("%s.kind is ramp or hop, not %s", jb, kd); return; } q->hop = !strcmp(kd, "hop"); }
    rect(P("%s.rect", jb), q->rect); if (g_bad) return;
    for (int e = 0; e < 2; e++) for (int c = 0; c < 2; c++) { q->ends[e][c] = num(P("%s.ends.%d.%d", jb, e, c)); if (g_bad) return; }
    /* guard 3: each end lies on its level (in its x span, top(fx) <= y <= bottom) */
    for (int e = 0; e < 2; e++) { const rm_level_t *l = &r->lv[e ? q->lower : q->upper]; int fx = q->ends[e][0], y = q->ends[e][1];
      if (fx < l->x[0] || fx > l->x[l->nx] || y < top_at(l, fx) || y > l->bottom) { bad("guard 3: %s: end %d (%d, %d) is not on the level %s", jb, e, fx, y, l->id); return; } } }
  r->np = spec_len(M, P("%s.pieces", base)); if (r->np < 0 || r->np > RM_PIECES) { bad("%s.pieces holds %d pieces (at most %d)", base, r->np, RM_PIECES); return; }
  int occ = 0, area = 0;
  for (int i = 0; i < r->np; i++) { char pb[96]; snprintf(pb, sizeof pb, "%s.pieces.%d", base, i); rm_piece_t *p = &r->pc[i]; char kind[12], lv[16];
    spec_str(M, P("%s.id", pb), p->id, sizeof p->id); spec_str(M, P("%s.kind", pb), kind, sizeof kind); if (!p->id[0]) { bad("%s.id is a name", pb); return; }
    if (!strcmp(kind, "occluder")) p->kind = RP_OCCLUDER; else if (!strcmp(kind, "back")) p->kind = RP_BACK; else { bad("%s.kind is occluder or back, not %s", pb, kind); return; }
    rect(P("%s.rect", pb), p->rect); if (g_bad) return; p->opa = 255; p->foot = 0; p->level = 0;
    { char pic[8]; p->has_pic = spec_str(M, P("%s.picture", pb), pic, sizeof pic) > 0; }
    if (p->kind == RP_OCCLUDER) { p->foot = num(P("%s.foot", pb)); spec_str(M, P("%s.level", pb), lv, sizeof lv); p->level = level_index(r, lv); if (g_bad) return; if (p->level < 0) { bad("%s.level %s is not in the room", pb, lv); return; } occ++; area += p->rect[2] * p->rect[3]; }
    else if (spec_raw(M, P("%s.opa", pb), NULL)) { p->opa = num(P("%s.opa", pb)); if (g_bad) return; if (p->opa < 0 || p->opa > 255) { bad("%s.opa is 0 to 255", pb); return; } } }
  if (occ > 6) { bad("guard 6: %s has %d occluders (at most 6)", base, occ); return; }
  if (window_area > 0 && area * 100 > window_area * 15) { bad("guard 6: %s: the occluders cover %d px, over 15 %% of the window (%d px)", base, area, window_area); return; }
}
int room_load(char *err, int cap) {
  g_bad = 0; g_err[0] = 0; g_nr = 0; memset(g_r, 0, sizeof g_r);
  int n = spec_len(M, "order"); if (n < 1 || n > RM_ROOMS) { bad("order lists %d rooms (1 to %d)", n, RM_ROOMS); }
  int window = spec_has("vivarium") ? spec_int("vivarium", "regions.window.rect.2", 0) * spec_int("vivarium", "regions.window.rect.3", 0) : 0;   /* the whole's window (guard 6's 15 %), when its spec is loaded */
  for (int i = 0; !g_bad && i < n; i++) { char name[16]; if (spec_str(M, P("order.%d", i), name, sizeof name) <= 0) { bad("order.%d is a room name", i); break; } if (spec_len(M, P("rooms.%s", name)) < 0) { bad("order names %s, which has no room", name); break; }
    room(name, &g_r[i], window); g_nr = i + 1; }
  if (g_bad) { snprintf(err, (size_t)cap, "%s", g_err); g_nr = 0; return -1; }
  return 0;
}

/* ---- the room chosen for the window drawn now ---- */
static int g_sel = -1, g_dx, g_dy, g_main;
static rp_t g_back[RM_PIECES], g_occ[RM_PIECES]; static int g_nb, g_no;
static int g_lk[RM_LEVELS][RM_KEEP][4], g_nlk[RM_LEVELS];   /* each usable level's keep-outs in the window's coordinates */
int room_select(const char *id, int dx, int dy, int main_only) {
  g_nb = g_no = 0; memset(g_nlk, 0, sizeof g_nlk); g_sel = -1; g_dx = dx; g_dy = dy; g_main = main_only;
  if (!g_nr || !id || !*id) return -1;   /* no spec, or props that name no room: no pieces and no keep-outs */
  int found = 0; for (int i = 0; i < g_nr; i++) if (id && !strcmp(g_r[i].id, id)) { g_sel = i; found = 1; }
  if (!found) g_sel = 0;
  const rm_room_t *r = &g_r[g_sel];
  for (int i = 0; i < r->nl && (!main_only || i == 0); i++) { g_nlk[i] = r->lv[i].nk; for (int k = 0; k < r->lv[i].nk; k++) { const int *o = r->lv[i].ko[k]; g_lk[i][k][0] = o[0] + dx; g_lk[i][k][1] = o[1] + dy; g_lk[i][k][2] = o[2]; g_lk[i][k][3] = o[3]; } }
  for (int i = 0; i < r->np; i++) { const rm_piece_t *p = &r->pc[i]; if (!p->has_pic) continue;
    const char *pic = v_pstr(v_fmt("regions.room.pieces.%s", p->id)); if (!pic || !*pic) continue;   /* the props name no picture for it: it is a keep-out alone */
    rp_t *o = p->kind == RP_OCCLUDER ? &g_occ[g_no++] : &g_back[g_nb++];
    snprintf(o->id, sizeof o->id, "%s", p->id); snprintf(o->pic, sizeof o->pic, "%s", pic); o->kind = p->kind; o->x = p->rect[0] + dx; o->y = p->rect[1] + dy; o->w = p->rect[2]; o->h = p->rect[3]; o->foot = p->foot + dy; o->opa = p->opa; o->level = p->level; }
  return found ? 0 : -1;
}
int room_levels(void) { return g_sel < 0 ? 1 : g_main ? 1 : g_r[g_sel].nl; }
int room_pieces(int kind, const rp_t **out) { if (kind == RP_BACK) { *out = g_back; return g_nb; } if (kind == RP_OCCLUDER) { *out = g_occ; return g_no; } *out = NULL; return 0; }
int room_have(void) { return g_sel >= 0; }
int room_keep(int lv, int fx, int feet) { if (lv < 0 || lv >= room_levels() || g_sel < 0) return 0; for (int i = 0; i < g_nlk[lv]; i++) { const int *o = g_lk[lv][i]; if (fx >= o[0] && fx < o[0] + o[2] && feet >= o[1] && feet < o[1] + o[3]) return 1; } return 0; }

/* ---- levels, the walk's ground and the joins (R4, the rooms design §2) ---- */
static int margin(int w) { return w > 0 ? (w + 3) / 4 : 0; }   /* ⌈w/4⌉ */
int room_on(int lv, int fx, int feet, int w) {
  if (g_sel < 0 || lv < 0 || lv >= room_levels()) return 0;
  const rm_level_t *l = &g_r[g_sel].lv[lv]; int q = margin(w), px = fx - g_dx, py = feet - g_dy;
  if (px < l->x[0] + q || px > l->x[l->nx] - q) return 0;   /* ⌈w/4⌉ inside each end (the end itself, with w = 0) */
  if (py < top_at(l, px) || py > l->bottom) return 0;
  return !room_keep(lv, fx, feet);
}
void room_point_in(int lv, unsigned r1, unsigned r2, int w, int xa, int xb, int fa, int fb, int *fx, int *feet) {
  const rm_level_t *l = &g_r[g_sel].lv[lv]; int q = margin(w);
  int lo = l->x[0] + q + g_dx, hi = l->x[l->nx] - q + g_dx; if (xa > lo) lo = xa; if (xb < hi) hi = xb; if (hi < lo) hi = lo;
  int x = lo + (int)(r1 % (unsigned)(hi - lo + 1)), t = top_at(l, x - g_dx) + g_dy, b = l->bottom + g_dy;
  if (fa > t) t = fa; if (fb < b) b = fb; if (b < t) b = t;
  *fx = x; *feet = t + (int)(r2 % (unsigned)(b - t + 1));
}
int room_top(int lv, int fx) { if (g_sel < 0 || lv < 0 || lv >= room_levels()) return 0; return top_at(&g_r[g_sel].lv[lv], fx - g_dx) + g_dy; }
int room_xs(int lv, int *xs, int cap) { if (g_sel < 0 || lv < 0 || lv >= room_levels()) return 0; const rm_level_t *l = &g_r[g_sel].lv[lv]; int n = 0; for (int i = 0; i <= l->nx && n < cap; i++) xs[n++] = l->x[i] + g_dx; return n; }
void room_point(int lv, unsigned r1, unsigned r2, int w, int *fx, int *feet) { room_point_in(lv, r1, r2, w, -(1 << 20), 1 << 20, -(1 << 20), 1 << 20, fx, feet); }
int room_route(int from, int to, int leg[2][2][2]) {
  if (g_sel < 0 || from == to || from < 0 || to < 0 || from >= room_levels() || to >= room_levels()) return -1;
  const rm_room_t *r = &g_r[g_sel];
  for (int j = 0; j < r->nj; j++) { const rm_join_t *q = &r->jn[j]; int up = q->upper, lo = q->lower;
    if (!((from == up && to == lo) || (from == lo && to == up))) continue;
    int a = from == up ? 0 : 1, b = 1 - a;   /* the end on `from` and the end on `to` (ends: upper first) */
    for (int c = 0; c < 2; c++) { leg[0][0][c] = q->ends[a][c] + (c ? g_dy : g_dx); leg[0][1][c] = q->ends[b][c] + (c ? g_dy : g_dx); leg[1][0][c] = leg[0][1][c]; leg[1][1][c] = leg[0][0][c]; }
    return j; }
  return -1;
}
int room_join_hop(int jn) { return g_sel >= 0 && jn >= 0 && jn < g_r[g_sel].nj && g_r[g_sel].jn[jn].hop; }
