/* The living window's code (lvgl-switch.md §2.2): the residents walking (a pure function of their seed and the face's clock, stepped so that no more than half of them change in one step), the with-you bed and its sleepers
   and the name tag of the focused one, on the rectangles of the spec it is drawing for: Idle's painting (frame.json idle) and the Vivarium's whole (vivarium.json). Home's own words are screens/home_frame.c. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../layout/layout.h"
#include "moving.h"
#include "room.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define H "home"
#define MAXR 12
#define MAXS 3
/* The living window is Idle's painting (frame.json idle) and the Vivarium's whole: the same code reads the regions of the spec it is drawing for. On Idle (g_idle) `regions.glass` is `idle.regions.vivarium` and every other `regions.` is
   `idle.regions.`, in the frame spec: the residents, the bed and the walk are the same rules on the other rectangles. */
static int g_idle, g_viv, g_home;   /* g_home: Home's Vivarium window (home.json regions.glass and regions.resident): the same code on a 604 x 362 crop of Idle's painting */   /* g_viv: the Vivarium's whole (vivarium.json): `regions.glass` is `regions.window`; every other region keeps its name */
static const char *hp(const char *p) { if (g_home) return strncmp(p, "regions.glass", 13) == 0 ? v_fmt("regions.window%s", p + 13) : p; if (g_viv) return strncmp(p, "regions.glass", 13) == 0 ? v_fmt("regions.window%s", p + 13) : p; if (!g_idle) return p; if (strncmp(p, "regions.glass", 13) == 0) return v_fmt("idle.regions.vivarium%s", p + 13); if (strncmp(p, "regions.", 8) == 0) return v_fmt("idle.regions.%s", p + 8); return p; }
static const char *sp(void) { return g_viv ? "vivarium" : g_idle ? "frame" : H; }
static int has(const char *asset) { return asset && *asset && wire_has_asset(asset); }

#define STEP_MS 40
/* ---- the residents' walk (home.json regions.resident.walk, the UI/UX designer's ruling) on the rooms' levels (the rooms design §2): integers only ----
   Resident k (props order, sleepers left out) is in group g = k mod 2 and steps at t = 80 m + 40 g ms of the face's time since the screen's first frame, at the speed of its stage (vivarium.json rules.walk.speed, px along the major axis per own
   ticks; the minor axis by Bresenham), and at most one group tick is applied a frame (a later frame drops the time past it by moving the walk's origin later in whole ticks), so at most half of the boxes change in any frame. The residents step in
   the order of their times (one tick of the household at a time), so what a walker reads of the others (the travelling ceiling, the raised cap) is the household's state at that tick, never a frame's. Its own 32-bit LCG runs from its seed. A focused
   resident stands on its pixel and its idle and walk freeze; with motion off it stands at its start. The walk state lives while the screen shows and starts again from the seeds when Home is shown again; a new id starts from its own seed, a props change with the same seed keeps the state. */
static int g_kx, g_ky, g_kw, g_xlo, g_xhi, g_flo, g_fn;   /* g_kw: the room view's keep-out width (a foot-point rect; Home and Idle keep the box rule, their keep-outs reach the walk's right end) */   /* home.json regions.resident.walk, read at each draw: the keep-out zone's corner, the box.x range 8 px inside the glass, the feet's rows of the spec's own ground band */
static int g_rlo, g_rhi;   /* the rows the feet may take: Home's own band, or the spec's ground band when no room is chosen; none on the whole and Idle (the room's levels are the feet band there) */
static int g_lx;   /* the window's left edge (the clip): a rester walks off past it (R4b) */
static int g_stw;   /* home.json regions.resident.walk.startWiden (Home only, 0 elsewhere): a start whose ink box meets a shown resident's ink box widened this many px each side is drawn again (up to eight draws); R4b-1b */
static int g_trmax, g_rdiv, g_lvin, g_spd[3][2], g_nres;   /* vivarium.json rules.travel.max, rules.walk.raisedDiv and .levelOneIn and .speed[stage] = [px, ticks]; the residents shown (the raised cap's N) */
static void walk_load(void) {
  int bed = *v_pstr("regions.bed.state") != 0;   /* the room has a bed (Roots only, the rooms design): the sleepers' keep-out applies only then */
  if (g_viv) {   /* the room view (vivarium.json regions.resident.walk): the box.x range is the walk ground's, 8..680 (the clamp: the ink 8 px inside the window), and the keep-out is the spec's, a foot-point rect over the bed */
    g_kx = bed ? v_sk(sp(), hp("regions.resident.walk.keepOut"), 0) : 1 << 20; g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1); g_kw = v_sk(sp(), hp("regions.resident.walk.keepOut"), 2);
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  } else if (g_idle) {   /* Idle (frame.json idle.regions.resident.walk): the box.x range is the walk ground's own, 16..1008, and the keep-out is the spec's, a foot-point rect over the bed (the bed at the room's centre), never derived from the window's rectangle */
    g_kx = bed ? v_sk(sp(), hp("regions.resident.walk.keepOut"), 0) : 1 << 20; g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1); g_kw = v_sk(sp(), hp("regions.resident.walk.keepOut"), 2);
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  }
  else if (g_home) {   /* Home's window (home.json regions.resident.walk): the box.x range 32 .. 620, the keep-out only while the away frame shows (the corner's feet row is the rect's top less one: the feet reach it) */
    int away = *v_pstr("regions.glass.away.picture") != 0;
    g_kx = away ? v_sk(sp(), hp("regions.resident.walk.keepOut"), 0) : 1 << 20; g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1) - 1;
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  }
  g_stw = g_home ? v_si(sp(), hp("regions.resident.walk.startWiden"), 0) : 0;
  g_flo = v_sk(sp(), hp("regions.resident.walk.ground"), 1); g_fn = v_sk(sp(), hp("regions.resident.walk.ground"), 3); g_lx = v_sk(sp(), hp("regions.glass.rect"), 0);
  /* the room of this window: the window's offset from the painting, derived from the specs' own values (the whole: window.rect.y less painting.rows[0]; Home: window.rect.x less painting.cx and window.rect.y less painting.rows[0]; Idle: none) */
  { int dx = 0, dy = 0;
    if (g_viv) { int c[2]; room_crop(v_pstr("regions.room.id"), c); dx = v_sk(sp(), hp("regions.glass.rect"), 0) - c[0]; dy = v_sk(sp(), hp("regions.glass.rect"), 1) - c[1]; }   /* the room view: screen = painting − (cx, cy) + the window's origin (rooms.json crop) */
    else if (g_home) { dx = v_sk(sp(), hp("regions.glass.rect"), 0) - spec_int(H, "regions.window.painting.cx", 0); dy = v_sk(sp(), hp("regions.glass.rect"), 1) - spec_int(H, "regions.window.painting.rows.0", 0); }
    room_view_mode(g_viv); room_select(v_pstr("regions.room.id"), dx, dy, g_home); }
  /* the feet band: the union of the room's levels in the window's coordinates (the levels set it); Home keeps its own band, and so does a window with no room */
  if (g_home || !room_have()) { g_rlo = g_flo; g_rhi = g_flo + g_fn - 1; } else { g_rlo = -(1 << 20); g_rhi = 1 << 20; }
  g_trmax = v_si("vivarium", "rules.travel.max", 3); g_rdiv = v_si("vivarium", "rules.walk.raisedDiv", 3); g_lvin = v_si("vivarium", "rules.walk.levelOneIn", 4); if (g_rdiv < 1) g_rdiv = 1; if (g_lvin < 1) g_lvin = 1;
  for (int s = 0; s < 3; s++) { static const char *nm[3] = { "juvenile", "adult", "elder" }; g_spd[s][0] = v_si("vivarium", v_fmt("rules.walk.speed.%s.0", nm[s]), 1); g_spd[s][1] = v_si("vivarium", v_fmt("rules.walk.speed.%s.1", nm[s]), 1); if (g_spd[s][0] < 1) g_spd[s][0] = 1; if (g_spd[s][1] < 1) g_spd[s][1] = 1; }
}
/* R4b: a resident the room does not show (props shown false) is a rester. It finishes its trip (a leg 2 included), then rests where the props say (restAt): RK_BED (its sleeper on the bed draws, the walker hides where it stands), RK_CURL (it walks to a nice spot and curls
   there, counted by neither N nor the five) or RK_OUT (it walks off main's left end past the window's clip and hides). RS_FINISH: flagged, still on its trip or waiting out its idle; RS_GOING: on its rest trip; RS_REST: at rest. A shown one comes back from where it rests. */
enum { RK_NONE, RK_BED, RK_CURL, RK_OUT };
enum { RS_SHOWN, RS_FINISH, RS_GOING, RS_REST };
typedef struct { char id[24]; unsigned seed, s; int w, h, x, feet, facing, walking, idle, wx, wy, x0, y0, step, stage, pi, lv, leg, jn, tlv, ax, af, bx, bf, tx, tf, hold, rk, rs, sh, ex, cw; long done; int live; } wk_t;   /* lv: the level it stands on (0 main; on leg 2 the level it leaves); leg: 0 none, 1 to the join, 2 across it, 3 to the target; jn: the join; tlv: the level it is going to; (ax, af), (bx, bf): the join's ends on the two levels and (tx, tf) the target, box x and feet; pi: its index among the props' residents; hold: frozen this frame; rk, rs, sh, ex: where it rests (RK_*), its rest phase (RS_*), shown, and on its way off the window's edge (R4b) */
static wk_t g_w[MAXR]; static int g_nw; static uint32_t g_t0; static int g_have_t0;
static long g_wticks;   /* the walk's group ticks applied since its origin g_t0: tick j is at 40 j ms and steps group j mod 2 */
static int g_ctx = -1;   /* the walk's last context (0 none, 1 Idle, 2 the Vivarium's whole): it starts again from the seeds when the other shows */
static char g_room[24];   /* the shown room (regions.room.id) the walk was last loaded for: another room restarts the walks (R4c) */
void home_hidden(void) { g_have_t0 = 0; g_ctx = -1; library_reset(); }   /* the moving household starts again from the seeds too (No replay) */
static unsigned wr(wk_t *k) { k->s = k->s * 1664525u + 1013904223u; return k->s >> 16; }
static int iabs(int v) { return v < 0 ? -v : v; }
static int bed_k(int x, int feet, int w) { if (g_viv || g_idle) { int fx = x + w / 2; return fx >= g_kx && fx < g_kx + g_kw && feet > g_ky; } return x + w > g_kx && feet > g_ky; }   /* the bed's keep-out keeps its box rule (and Home's away corner); a piece's keep-out is room.c's: the ground point (F.x, feet) inside its rect, by level */
/* a figure box at x (its left) with width w and its feet row stands on level lv: inside the walk ground, off the bed's keep-out, on the level (room_on; with `relaxed` the level itself, w = 0, for the legs that run to and from a join's end, which lies on the level's edge) */
static int gok(int lv, int x, int feet, int w, int relaxed) {
  if (x < g_xlo || x + w > g_xhi || feet < g_rlo || feet > g_rhi || bed_k(x, feet, w)) return 0;
  return room_have() ? room_on(lv, x + w / 2, feet, relaxed ? 0 : w) : lv == 0;
}
/* a point on level lv from two draws: box x in [xa, xb] and feet in [fa, fb] held to the ground (the whole level when the window is wide) */
static void lvl_draw(int lv, unsigned r1, unsigned r2, int w, int xa, int xb, int fa, int fb, int *x, int *feet) {
  if (xa < g_xlo) xa = g_xlo; if (xb > g_xhi - w) xb = g_xhi - w; if (fa < g_rlo) fa = g_rlo; if (fb > g_rhi) fb = g_rhi;
  if (room_have()) { int fx; room_point_in(lv, r1, r2, w, xa + w / 2, xb + w / 2, fa, fb, &fx, feet); *x = fx - w / 2; return; }
  if (xb < xa) xb = xa; if (fb < fa) fb = fa;
  *x = xa + (int)(r1 % (unsigned)(xb - xa + 1)); *feet = fa + (int)(r2 % (unsigned)(fb - fa + 1));
}
#define WIDE (-(1 << 20)), (1 << 20)
/* the room view (the collection v2 design §3, the build's sign-off on Boulders): a raised level is the walk's only when a join links it to main with both ends inside the walk's range for this width; a level no one can climb to
   (Boulders' terrace, its ramp's upper end outside the window's range) is no start, no waypoint and no rest for anyone. Home and Idle climb as built. */
static int lv_open(int lv, int w) {
  if (!g_viv || lv == 0 || !room_have()) return 1;
  int rt[2][2][2] = { { { 0 } } }; if (room_route(0, lv, rt) < 0) return 0;
  return gok(0, rt[0][0][0] - w / 2, rt[0][0][1], w, 1) && gok(lv, rt[0][1][0] - w / 2, rt[0][1][1], w, 1);
}
/* every box along the straight path from (x0, f0) to (x1, f1), at each px of its major axis (the speeds are 1 to 2 px a tick), stays out of the keep-outs and on level lv */
static int path_ok(int lv, int x0, int f0, int x1, int f1, int w, int relaxed) {
  int dx = x1 - x0, dy = f1 - f0, M = iabs(dx) > iabs(dy) ? iabs(dx) : iabs(dy);
  for (int d = 1; d <= M; d++) { int ma = iabs(dx), mb = iabs(dy), px, py;
    if (ma >= mb) { px = x0 + (dx < 0 ? -d : d); py = f0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { py = f0 + (dy < 0 ? -d : d); px = x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (bed_k(px, py, w) || room_keep(lv, px + w / 2, py)) return 0;
    if (!gok(lv, px, py, w, relaxed)) return 0; }
  return 1;
}
/* the raised cap and the travelling ceiling read the household (census_*, below the moving residents' type) */
static int census_raised(const char *skip);   /* the walkers (but `skip`) on a raised level or bound for one */
static int census_travelling(void);           /* the walkers on a trip */
static int start_heap(int x, int feet, int fw, int fh);   /* a start at (box x, feet) whose ink box meets a shown resident's widened ink box (home.json regions.resident.walk.start) */
static int raised_ok(const char *id) { int cap = g_nres / g_rdiv; return census_raised(id) < (cap < 1 ? 1 : cap); }   /* at most max(1, ⌊N / raisedDiv⌋) on the raised levels, N the residents shown */
static int speed_d(int stage, int n) { return n * g_spd[stage][0] / g_spd[stage][1]; }   /* the distance of n own ticks at the stage's speed */
static void wk_init(wk_t *k, const char *id, unsigned seed, int w, int h, int stage, int pi) {
  memset(k, 0, sizeof *k); snprintf(k->id, sizeof k->id, "%s", id); k->seed = seed; k->s = seed; k->w = w; k->h = h; k->live = 1; k->done = 0; k->stage = stage; k->pi = pi;
  unsigned r = wr(k); int nl = room_levels(), lv = nl > 1 && r % (unsigned)g_lvin == 0 && raised_ok(id) ? 1 + (int)((r / (unsigned)g_lvin) % (unsigned)(nl - 1)) : 0;   /* one draw: the level (1 start in lvin, while the raised cap allows) */
  if (!lv_open(lv, w)) lv = 0;   /* a level no one can climb to in the room view: main */
  int x = 32, feet = 300, ok = 0;
  for (int i = 0; i < 8 && !ok; i++) { unsigned a = wr(k), b = wr(k); lvl_draw(lv, a, b, w, WIDE, WIDE, &x, &feet); ok = gok(lv, x, feet, w, 0) && !start_heap(x, feet, w, h); }
  if (!ok) { lv = 0; lvl_draw(0, 0, 0, w, g_xlo, g_xlo, g_rlo, g_rhi, &x, &feet); }   /* all eight failed: main's leftmost point at its top */
  k->lv = k->tlv = lv; k->x = x; k->feet = feet; k->facing = (int)(wr(k) & 1u); k->idle = 25 + (int)(wr(k) % 38u); k->walking = 0;
}
/* a straight segment from where it stands to (tx, tf) */
static void wk_seg(wk_t *k, int tx, int tf) { k->wx = tx; k->wy = tf; k->x0 = k->x; k->y0 = k->feet; k->step = 0; if (tx != k->x) k->facing = tx > k->x; }
static int wk_len(const wk_t *k) { return iabs(k->wx - k->x0) > iabs(k->wy - k->y0) ? iabs(k->wx - k->x0) : iabs(k->wy - k->y0); }
static void wk_next(wk_t *k) {   /* the segment ended: the next of the three legs (a leg of no length is skipped), or the trip's end */
  for (;;) {
    if (k->leg == 1) { k->leg = 2; wk_seg(k, k->bx, k->bf); }   /* across the join, from end to end: lv stays the level it leaves */
    else if (k->leg == 2) { k->lv = k->tlv; k->leg = 3; wk_seg(k, k->tx, k->tf); }   /* its last step: lv becomes the target's */
    else { k->leg = 0; k->lv = k->tlv;
      if (k->rs == RS_GOING) {   /* a rest trip's end: the way out goes on off the window's edge; the others rest where they stand */
        if (k->rk == RK_OUT && !k->ex) { k->ex = 1; wk_seg(k, g_lx - k->w - 2, k->feet); return; }
        k->rs = RS_REST; k->hold = 1; }
      k->walking = 0; k->idle = 25 + (int)(wr(k) % 38u); return; }
    if (wk_len(k)) return;
  }
}
static int curl_clear(const char *self, int fx, int cw, int gap);   /* below the moving residents' type */
/* the room view: a curl at foot (fx, feet), its ink cw wide and at most 32 high, would lie over a back piece of the room (the shishi, the arm, the lantern, the mister: every piece stays unoccluded by a resting figure) */
static int curl_on_piece(int fx, int feet, int cw) {
  if (!g_viv) return 0; const rp_t *bk; int nbk = room_pieces(RP_BACK, &bk), x0 = fx - (cw + 1) / 2, x1 = fx + (cw + 1) / 2, y0 = feet - 32;
  for (int i = 0; i < nbk; i++) if (x0 < bk[i].x + bk[i].w && x1 > bk[i].x && y0 < bk[i].y + bk[i].h && feet > bk[i].y) return 1;
  return 0;
}
/* while the props load: the walkers and movers placed so far this load (a fresh show places its resters one by one, each clear of those before it) */
static const void *g_lw, *g_lm; static const int *g_nlw, *g_nlm;
/* a nice spot for a curl (vivarium.json rules.show.curl; the game designer's cats): a foot point (fx, feet) on level lv that is a valid stand (the walk's own test), at least `gap` from every other curl and from the bed, beside an occluder of lv (fx = its rect.x - beside or
   rect.x + rect.w + beside, feet = its foot - occDy) or on the level's back edge (feet = top(fx) + backDy at a profile breakpoint); chosen by a draw on the mibi's seed among those within rules.night.reach of where its trip ended, else the nearest, else where it stands if
   that is valid. 1 with the foot point in *ox, *of; 0 when there is none (it walks out). */
static int curl_spot(const char *self, unsigned seed, int lv, int w, int cw, int x, int feet, int *ox, int *of) {
  int beside = v_si("vivarium", "rules.show.curl.beside", 56), backDy = v_si("vivarium", "rules.show.curl.backDy", 8), occDy = v_si("vivarium", "rules.show.curl.occDy", 4), gap = v_si("vivarium", "rules.show.curl.gap", 48), reach = v_si("vivarium", "rules.night.reach", 200);
  int cx[24], cf[24], n = 0, here = x + w / 2; const rp_t *oc; int noc = room_pieces(RP_OCCLUDER, &oc);
  for (int k = 0; k < noc && n + 2 <= 20; k++) if (oc[k].level == lv) { cx[n] = oc[k].x - beside; cf[n++] = oc[k].foot - occDy; cx[n] = oc[k].x + oc[k].w + beside; cf[n++] = oc[k].foot - occDy; }
  { int xs[8], nx = room_xs(lv, xs, 8), q = (w + 3) / 4; for (int i = 0; i < nx && n < 24; i++) { int fx = xs[i]; if (fx < xs[0] + q) fx = xs[0] + q; if (fx > xs[nx - 1] - q) fx = xs[nx - 1] - q; cx[n] = fx; cf[n++] = room_top(lv, fx) + backDy; } }
  int ok[24], nok = 0, best = -1, bd = 1 << 30, near[24], nn = 0;
  for (int i = 0; i < n; i++) { ok[i] = gok(lv, cx[i] - w / 2, cf[i], w, 0) && curl_clear(self, cx[i], cw, gap) && lv_open(lv, w) && !curl_on_piece(cx[i], cf[i], cw); if (!ok[i]) continue; nok++;
    int d = iabs(cx[i] - here) > iabs(cf[i] - feet) ? iabs(cx[i] - here) : iabs(cf[i] - feet); if (d < bd) { bd = d; best = i; } if (d <= reach) near[nn++] = i; }
  if (nn) { unsigned r = (seed ^ 0x9e3779b9u) * 2654435761u >> 16; int i = near[r % (unsigned)nn]; *ox = cx[i]; *of = cf[i]; return 1; }
  if (nok) { *ox = cx[best]; *of = cf[best]; return 1; }
  if (gok(lv, x, feet, w, 0) && curl_clear(self, here, cw, gap) && lv_open(lv, w) && !curl_on_piece(here, feet, cw)) { *ox = here; *of = feet; return 1; }
  return 0;
}
/* a trip to a given point, as wk_step's own, with no draws: on lv, or by the join to tlv; 0 when no join links the two */
static int wk_go(wk_t *k, int tlv, int wx, int wf) {
  int jn = -1, rt[2][2][2] = { { { 0 } } };
  if (tlv != k->lv && (jn = room_route(k->lv, tlv, rt)) < 0) return 0;
  k->walking = 1; k->tlv = tlv; k->jn = jn; k->tx = wx; k->tf = wf; k->ex = 0;
  if (tlv == k->lv) { k->leg = 0; wk_seg(k, wx, wf); if (!wk_len(k)) { wk_next(k); } }
  else { k->leg = 1; k->ax = rt[0][0][0] - k->w / 2; k->af = rt[0][0][1]; k->bx = rt[1][0][0] - k->w / 2; k->bf = rt[1][0][1]; wk_seg(k, k->ax, k->af); if (!wk_len(k)) wk_next(k); }
  return 1;
}
/* main's leftmost point at its top: where a rester leaves by and a traveller comes in (rooms.json rest.edge: left, level main) */
static void edge_point(int w, int *x, int *feet) { lvl_draw(0, 0, 0, w, g_xlo, g_xlo, g_rlo, g_rhi, x, feet); }
/* a rester's rest trip from where its own trip ended: its curl spot (else out), or off main's left end */
static int wk_rest_plan(wk_t *k) {
  if (k->rk == RK_CURL) { int ox, of; if (curl_spot(k->id, k->seed, k->lv, k->w, k->cw, k->x, k->feet, &ox, &of)) {
      int bx = ox - k->w / 2; if (bx == k->x && of == k->feet) { k->rs = RS_REST; k->hold = 1; return 1; }
      k->rs = RS_GOING; if (wk_go(k, k->lv, bx, of)) return 1; k->rs = RS_FINISH; }
    k->rk = RK_OUT; }
  int tx, tf; edge_point(k->w, &tx, &tf);
  if (k->lv == 0 && k->x == tx && k->feet == tf) { k->ex = 1; k->walking = 1; k->tlv = 0; k->leg = 0; wk_seg(k, g_lx - k->w - 2, k->feet); k->rs = RS_GOING; return 1; }
  k->rs = RS_GOING; if (wk_go(k, 0, tx, tf)) return 1;
  k->x = g_lx - k->w - 2; k->rs = RS_REST; k->hold = 1; return 1;   /* no way to main: it is simply out of sight */
}
/* a rester placed where it rests, the walk shown from its seed (a new walker that is not shown): out past the edge, or at its curl spot, or where it stands */
static void wk_rest_at(wk_t *k) {
  if (k->rk == RK_CURL) { int ox, of; if (curl_spot(k->id, k->seed, k->lv, k->w, k->cw, k->x, k->feet, &ox, &of)) { k->x = ox - k->w / 2; k->feet = of; k->rs = RS_REST; k->hold = 1; return; } k->rk = RK_OUT; }
  if (k->rk == RK_OUT) { int tx, tf; edge_point(k->w, &tx, &tf); k->lv = k->tlv = 0; k->x = g_lx - k->w - 2; k->feet = tf; }
  k->rs = RS_REST; k->hold = 1;
}
/* a rester shown again, or a traveller home: it comes in from the edge, or stands where it rested */
static void wk_enter(wk_t *k) {
  int tx, tf; edge_point(k->w, &tx, &tf); k->lv = k->tlv = 0; k->x = g_lx - k->w - 2; k->feet = tf; k->leg = 0; k->jn = -1; k->walking = 1; k->tx = tx; k->tf = tf; wk_seg(k, tx, tf); k->rs = RS_SHOWN; k->ex = 0; k->hold = 0;
}
static void wk_return(wk_t *k) {
  int was = k->rs, out = k->rk == RK_OUT || k->ex; k->rs = RS_SHOWN;
  if ((was == RS_REST && out) || (was == RS_GOING && k->ex)) { wk_enter(k); return; }
  k->ex = 0; k->hold = 0;
}
static void wk_step(wk_t *k) {   /* one step of this resident's own time */
  if (!k->walking) {
    if (k->idle > 0) { k->idle--; }
    if (k->idle > 0) return;
    if (census_travelling() >= g_trmax) return;   /* the ceiling: no trip starts while the most that may travel are travelling; it asks again on its next tick */
    if (!k->sh && k->rs == RS_FINISH) { if (k->rk == RK_BED) { k->rs = RS_REST; k->hold = 1; return; } wk_rest_plan(k); return; }   /* a rester: its trip is over, it goes to rest (a rest trip is a trip under the ceiling) */
    unsigned r = wr(k); int nl = room_levels(), tlv = k->lv, jn = -1, rt[2][2][2] = { { { 0 } } };   /* one draw: the target level (1 trip in lvin changes level, when a join links the two and the raised cap allows) */
    if (nl > 1 && r % (unsigned)g_lvin == 0) { int to = k->lv ? 0 : 1 + (int)((r / (unsigned)g_lvin) % (unsigned)(nl - 1)); if ((to == 0 || raised_ok(k->id)) && lv_open(to, k->w) && (jn = room_route(k->lv, to, rt)) >= 0) tlv = to; }
    int ax = rt[0][0][0] - k->w / 2, af = rt[0][0][1], bx = rt[1][0][0] - k->w / 2, bf = rt[1][0][1];
    int wx = k->x, wf = k->feet, ok = 0;   /* idle is over: a waypoint, up to eight tries */
    for (int i = 0; i < 8 && !ok; i++) {
      unsigned a = wr(k), b = wr(k); lvl_draw(tlv, a, b, k->w, WIDE, WIDE, &wx, &wf);
      if (tlv == k->lv) ok = (iabs(wx - k->x) > iabs(wf - k->feet) ? iabs(wx - k->x) : iabs(wf - k->feet)) >= 32 && gok(tlv, wx, wf, k->w, 0) && path_ok(tlv, k->x, k->feet, wx, wf, k->w, 0);
      else ok = gok(tlv, wx, wf, k->w, 0) && path_ok(k->lv, k->x, k->feet, ax, af, k->w, 1) && path_ok(tlv, bx, bf, wx, wf, k->w, 1);   /* leg 2 skips the profile and keep-out samples: a join is walkable by definition */
    }
    if (!ok) { k->idle = 25 + (int)(wr(k) % 38u); return; }
    k->walking = 1; k->tlv = tlv; k->jn = jn; k->tx = wx; k->tf = wf;
    if (tlv == k->lv) { k->leg = 0; wk_seg(k, wx, wf); }
    else { k->leg = 1; k->ax = ax; k->af = af; k->bx = bx; k->bf = bf; wk_seg(k, ax, af); if (!wk_len(k)) wk_next(k); }
    return;
  }
  k->step++;
  { int dx = k->wx - k->x0, dy = k->wy - k->y0, ma = iabs(dx), mb = iabs(dy), M = ma > mb ? ma : mb, d = speed_d(k->stage, k->step); if (d > M) d = M;
    if (ma >= mb) { k->x = k->x0 + (dx < 0 ? -d : d); k->feet = k->y0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { k->feet = k->y0 + (dy < 0 ? -d : d); k->x = k->x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (d >= M) { k->x = k->wx; k->feet = k->wy; wk_next(k); } }
}

/* ---- residents with a moving set (Station M1 §2.3): every change on the resident's own 80 ms group tick, in the household tick of its group (40 ms, group j mod 2), the floor and caps of G10, the night of G7, the per-tick
   budget (architecture.md rule 2), the asleep form (UI/UX "Asleep in place") and the focus hold (game designer R4). Integers only, a pure function of the seeds, the props and the clock. A resident whose `moving` is "" is a still
   and walks exactly as above (wk_step). ---- */
extern int g_home_steps;
enum { C_REST, C_HOP, C_WALK, C_CURL, C_ASLEEP, C_WAKE, C_STIR, C_ACK };
enum { P_CROUCH, P_AIR, P_LAND, P_STAND };
typedef struct {
  char id[24], set[8], walk[96], shadow[96]; int stage; unsigned seed, s; int w, h, native, group, idx, fw, fh, fdx, fdy, bo, hasfig;   /* w, h: the atlas cell; the figure (the rule, measured once per atlas): its width fw and height fh, left fdx and top fdy in the cell, bo the cell row of its feet (no figure: fw = w, fdx = fdy = 0, bo = h) */
  const mv_stage_t *S;
  int x, feet, facing, clip, ct, phase, pt, cell, lift, dy, sh75;     /* the drawn box: (x, feet − h − lift + dy) */
  int dl, dfrom, dto, ddf, ddt;                                       /* a dither: its level (0 none), its from and to base cells and their dy */
  int rest, rested, wx, wf, x0, f0, M, nh, hop, tripd, td0, arrived, settle_tried;
  int lv, leg, jn, tlv, ax, af, bx, bf, tx, tf;                       /* the level it stands on (on leg 2 the one it leaves), the leg (0 none, 1 to the join, 2 across it, 3 to the target), the join, the level it is going to, the join's ends (box x, feet) and the target */
  int want, focus, focus_t, acked, deferred, stir_hold, pending_stir, wander, wander_left, wander_until, wander_wps;
  int rk, rs, sh, ex, cw;                                             /* cw: the curl's measured ink width (R4b-1b). R4b: where it rests (RK_*), its rest phase (RS_*), shown, on its way off the window's edge */
  long flip_due, curl_end, trip_start;
} mv_t;
static mv_t g_m[MAXR]; static int g_nm;
/* a curl's foot x `fx` with ink width `cw` is clear of every other curl at rest, ink to ink (the game designer: |xA - xB| >= ceil(inkA.w / 2) + ceil(inkB.w / 2) + gap, the measured curl ink, at most 96 wide), and of the bed's rect by the same test (R4b-1b) */
static int curl_clear(const char *self, int fx, int cw, int gap) {
  /* a curl at rest where it lies; one on its way to a spot at that spot (two cannot pick spots in the gap of each other) */
  for (int i = 0; i < g_nw; i++) { const wk_t *o = &g_w[i]; int go = o->rs == RS_GOING && !o->ex; if (!strcmp(o->id, self) || (o->rs != RS_REST && !go) || o->rk != RK_CURL) continue; if (iabs((go ? o->tx : o->x) + o->w / 2 - fx) < (cw + 1) / 2 + (o->cw + 1) / 2 + gap) return 0; }
  for (int i = 0; i < g_nm; i++) { const mv_t *o = &g_m[i]; int go = o->rs == RS_GOING && !o->ex; if (!strcmp(o->id, self) || (o->rs != RS_REST && !go) || o->rk != RK_CURL) continue; if (iabs((go ? o->tx : o->x) + o->fw / 2 - fx) < (cw + 1) / 2 + (o->cw + 1) / 2 + gap) return 0; }
  if (g_lw) for (int i = 0; i < *g_nlw; i++) { const wk_t *o = (const wk_t *)g_lw + i; if (!strcmp(o->id, self) || o->rs != RS_REST || o->rk != RK_CURL) continue; if (iabs(o->x + o->w / 2 - fx) < (cw + 1) / 2 + (o->cw + 1) / 2 + gap) return 0; }
  if (g_lm) for (int i = 0; i < *g_nlm; i++) { const mv_t *o = (const mv_t *)g_lm + i; if (!strcmp(o->id, self) || o->rs != RS_REST || o->rk != RK_CURL) continue; if (iabs(o->x + o->fw / 2 - fx) < (cw + 1) / 2 + (o->cw + 1) / 2 + gap) return 0; }
  if (*v_pstr("regions.bed.state")) { int b[4]; v_srect(sp(), hp("regions.bed.rect"), b); if (iabs(b[0] + b[2] / 2 - fx) < (cw + 1) / 2 + (b[2] + 1) / 2 + gap) return 0; }
  return 1;
}
/* the household the raised cap and the travelling ceiling read: pointers to every walker's state as it stands for the planner (the proposals of a household tick, the ones not yet kept of a screen's first frame, the kept ones) */
static const wk_t *cen_w[2 * MAXR]; static int cen_nw; static const mv_t *cen_m[2 * MAXR]; static int cen_nm;
static int census_raised(const char *skip) { int n = 0;
  for (int i = 0; i < cen_nw; i++) if (strcmp(cen_w[i]->id, skip) && cen_w[i]->rs != RS_REST && (cen_w[i]->lv > 0 || cen_w[i]->tlv > 0)) n++;
  for (int i = 0; i < cen_nm; i++) if (strcmp(cen_m[i]->id, skip) && cen_m[i]->rs != RS_REST && (cen_m[i]->lv > 0 || cen_m[i]->tlv > 0)) n++;
  return n; }   /* raised from the moment a walker commits to a climb until it ends leg 2 downward (a walker bound for a raised level counts at once, so that two never climb past the cap on one tick) */
static int mv_travelling(const mv_t *m);
static int census_travelling(void) { int n = 0; for (int i = 0; i < cen_nw; i++) n += cen_w[i]->walking; for (int i = 0; i < cen_nm; i++) n += mv_travelling(cen_m[i]); return n; }
static int start_heap(int x, int feet, int fw, int fh) {
  if (g_stw <= 0) return 0;
  int ay = feet + 1 - fh;
  for (int i = 0; i < cen_nw; i++) { const wk_t *o = cen_w[i]; if (!o->sh) continue; int by = o->feet + 1 - o->h; if (x < o->x + o->w + g_stw && o->x - g_stw < x + fw && ay < by + o->h && by < ay + fh) return 1; }
  for (int i = 0; i < cen_nm; i++) { const mv_t *o = cen_m[i]; if (!o->sh) continue; int by = o->feet + 1 - o->fh; if (x < o->x + o->fw + g_stw && o->x - g_stw < x + fw && ay < by + o->fh && by < ay + fh) return 1; }
  return 0;
}
typedef struct { int fig[4], cf[4], cp[2], asleep, ent, w, h; } sg_t;   /* a still's geometry from the props, kept until its walk has stepped */
static int in_props(const char *id, int nres) { for (int i = 0; i < nres; i++) if (!strcmp(v_pstr(v_fmt("regions.residents.%d.id", i)), id)) return 1; return 0; }
/* a screen's frame while the residents are built: the household is those kept so far and the ones of the last frame not yet reached (in the props still), so that a resident new to the props reads them all */
static void census_load(const wk_t *kw, int nkw, const mv_t *km, int nkm, int nres) {
  cen_nw = cen_nm = 0;
  for (int i = 0; i < nkw; i++) cen_w[cen_nw++] = &kw[i];
  for (int i = 0; i < nkm; i++) cen_m[cen_nm++] = &km[i];
  for (int i = 0; i < g_nw; i++) { int seen = 0; for (int j = 0; j < nkw; j++) if (!strcmp(kw[j].id, g_w[i].id)) seen = 1; if (!seen && in_props(g_w[i].id, nres)) cen_w[cen_nw++] = &g_w[i]; }
  for (int i = 0; i < g_nm; i++) { int seen = 0; for (int j = 0; j < nkm; j++) if (!strcmp(km[j].id, g_m[i].id)) seen = 1; if (!seen && in_props(g_m[i].id, nres)) cen_m[cen_nm++] = &g_m[i]; }
}
static void census_state(void) { cen_nw = g_nw; cen_nm = g_nm; for (int i = 0; i < g_nw; i++) cen_w[i] = &g_w[i]; for (int i = 0; i < g_nm; i++) cen_m[i] = &g_m[i]; }
typedef struct { char id[24], set[8], nap[96]; unsigned seed; int ct, cell, group, w, h, x, y; const mv_stage_t *S; } nap_t;   /* a bed sleeper with a nap set: curl and curl·b1 breathing on its group tick */
static nap_t g_nap[MAXS]; static int g_nnap;
static struct { unsigned s; uint32_t ids; long next_stir, wander_at, last_curl_end; char last_stir[24], last_wander[24]; int all_asleep, settle_open; } g_hh;
int g_mv_offgroup, g_mv_deferred, g_mv_tick_area, g_mv_worst_tick;   /* test hooks (face_test_offgroup, face_test_deferred, face_test_tick_area) */
static int g_mv_motion = 1;
static unsigned mr(mv_t *m) { m->s = m->s * 1664525u + 1013904223u; return m->s >> 16; }
static unsigned hr(void) { g_hh.s = g_hh.s * 1664525u + 1013904223u; return g_hh.s >> 16; }
/* the numbers live in vivarium.json rules.travel, rules.night, rules.tickBudget: one place for the three screens */
static int t80(int ms) { return ms / 80 > 0 ? ms / 80 : 1; }
static int loop_period(const mv_loop_t *l) { int p = 0; for (int i = 0; i < l->n; i++) p += t80(l->ms[i]); return p > 0 ? p : 1; }
static int loop_cell(const mv_loop_t *l, int ct) { int p = loop_period(l), t = ct % p; for (int i = 0; i < l->n; i++) { int d = t80(l->ms[i]); if (t < d) return l->cell[i]; t -= d; } return l->cell[0]; }
static int mv_in_asleep_form(const mv_t *m) { return m->clip == C_CURL || m->clip == C_ASLEEP || m->clip == C_STIR; }   /* the asleep form: curl, asleep or stir (the stir's crouch included); walker form in wake, breathe, hop and walk */
static int mv_frozen_ground(const mv_t *m) { return m->clip == C_CURL || m->clip == C_ASLEEP || m->clip == C_STIR || m->clip == C_WAKE; }   /* the ground point holds from the curl's first tick to the wake's last: its spot is held */
static int mv_travelling(const mv_t *m) { return (m->clip == C_HOP || m->clip == C_WALK) && !m->wander; }
static int mv_airborne(const mv_t *m) { return m->clip == C_HOP && m->phase == P_AIR; }
static int mv_awake(const mv_t *m) { return m->clip == C_REST || m->clip == C_HOP || m->clip == C_WALK || m->clip == C_ACK; }
/* a sleeper's spot (UI/UX item 11): [x + w/2 − 56, feet − 12, 112, 24] */
static int in_spot(const mv_t *o, int gx, int gf) { int fx = o->x + o->fw / 2; return gx >= fx - 56 && gx < fx + 56 && gf >= o->feet - 12 && gf < o->feet + 12; }
static int spot_taken(const mv_t *self, int x, int feet, int w) { for (int i = 0; i < g_nm; i++) { const mv_t *o = &g_m[i]; if (o != self && strcmp(o->id, self->id) && mv_frozen_ground(o) && in_spot(o, x + w / 2, feet)) return 1; } return 0; }
static int mv_rest_len(mv_t *m) { return 25 + (int)(mr(m) % 38u); }
static void mv_place(mv_t *m, int x, int f) { m->x = x; m->feet = f; }
/* along the trip's line, d of M (the major axis by d, the minor by Bresenham, as the stills' walk) */
static void mv_along(mv_t *m, int d) {
  int dx = m->wx - m->x0, dy = m->wf - m->f0, ma = dx < 0 ? -dx : dx, mb = dy < 0 ? -dy : dy, M = ma > mb ? ma : mb; if (!M) { mv_place(m, m->wx, m->wf); return; } if (d > M) d = M;
  if (ma >= mb) mv_place(m, m->x0 + (dx < 0 ? -d : d), m->f0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)));
  else mv_place(m, m->x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)), m->f0 + (dy < 0 ? -d : d));
}
/* the segment of the trip that begins where the resident stands: toward (tx, tf) */
static void mv_seg(mv_t *m, int tx, int tf) {
  int dx = tx - m->x, dy = tf - m->feet; m->wx = tx; m->wf = tf; m->x0 = m->x; m->f0 = m->feet; m->M = iabs(dx) > iabs(dy) ? iabs(dx) : iabs(dy); if (dx) m->facing = dx > 0;
}
/* the clip of a segment that begins from rest: a hopper's crouch (a hop join's leg 2 is one hop), a walker's first cycle cell */
static void mv_clip_start(mv_t *m) {
  m->lift = 0; m->dy = 0; m->sh75 = 0; m->arrived = 0; m->pt = 1;
  if (m->S->hopper) { m->clip = C_HOP; m->phase = P_CROUCH; m->hop = 1; m->nh = m->leg == 2 && room_join_hop(m->jn) ? 1 : (m->M + m->S->hop_travel - 1) / m->S->hop_travel; if (m->nh < 1) m->nh = 1; m->cell = moving_walk_cell(m->S, "crouch"); }
  else { m->clip = C_WALK; m->tripd = 0; m->td0 = 0; m->cell = m->S->cycle_cell[0]; m->lift = m->cell == moving_walk_cell(m->S, "pass") ? m->S->pass_rise : 0; }
}
/* the segment ended on its waypoint: the next of the three legs (a leg of no length is skipped), 1; or the trip is over, 0 (lv is the target's) */
static int mv_legs(mv_t *m) {
  for (;;) {
    if (m->leg == 1) { m->leg = 2; mv_seg(m, m->bx, m->bf); }
    else if (m->leg == 2) { m->lv = m->tlv; m->leg = 3; mv_seg(m, m->tx, m->tf); }
    else { m->leg = 0; m->lv = m->tlv;
      if (m->rs == RS_GOING) {   /* a rest trip's end: the way out goes on off the window's edge; a curler settles where it stands */
        if (m->rk == RK_OUT && !m->ex) { m->ex = 1; mv_seg(m, g_lx - m->fw - 2, m->feet); if (m->M) return 1; }
        m->rs = RS_REST; if (m->rk == RK_CURL) { m->want = 1; m->flip_due = g_wticks; m->settle_tried = 0; } }
      return 0; }
    if (m->M) return 1;
  }
}
/* the trip stops where it stands (focus): a change of level is given up, except on its leg 2, which it resumes on the ramp */
static void mv_stop(mv_t *m) { if (m->leg != 2) { m->leg = 0; m->tlv = m->lv; if (m->rs == RS_GOING && !m->ex) m->rs = RS_FINISH; } }
/* a walker reached the end of a segment: it is placed on its waypoint, and the next leg begins at once (1) or the trip is over (0) */
static int mv_legs_after(mv_t *m) { mv_along(m, m->M); return mv_legs(m); }
/* a trip: one draw for the level and then a waypoint (8 tries: ≥ 32 px, off the keep-out, a clear path, not in another sleeper's spot), within ±3·travel for a hopper or ±reach for a wanderer, on its own level; with `lvl`, 1 trip in lvin
   is a change of level (a join links the two and the raised cap allows) by the three legs of (the rooms design §2.2); facing on the cut. A stop on leg 2 resumes there. */
static int mv_trip(mv_t *m, int reach, int lvl) {
  if (m->leg == 2) { mv_seg(m, m->bx, m->bf); if (!m->M && !mv_legs(m)) return 0; mv_clip_start(m); return 1; }
  int ok = 0, wx = m->x, wf = m->feet, r = reach > 0 ? reach : m->S->hopper ? 3 * m->S->hop_travel : 0;
  unsigned q = mr(m); int nl = room_levels(), tlv = m->lv, jn = -1, rt[2][2][2] = { { { 0 } } };
  if (lvl && nl > 1 && q % (unsigned)g_lvin == 0) { int to = m->lv ? 0 : 1 + (int)((q / (unsigned)g_lvin) % (unsigned)(nl - 1)); if ((to == 0 || raised_ok(m->id)) && (jn = room_route(m->lv, to, rt)) >= 0) tlv = to; }
  int ax = rt[0][0][0] - m->fw / 2, af = rt[0][0][1], bx = rt[1][0][0] - m->fw / 2, bf = rt[1][0][1];
  for (int i = 0; i < 8 && !ok; i++) {
    unsigned a = mr(m), b = mr(m);
    if (tlv == m->lv) {
      if (r > 0) lvl_draw(tlv, a, b, m->fw, m->x - r, m->x + r, m->feet - r, m->feet + r, &wx, &wf); else lvl_draw(tlv, a, b, m->fw, WIDE, WIDE, &wx, &wf);
      int dx = wx - m->x, dy = wf - m->feet, M = iabs(dx) > iabs(dy) ? iabs(dx) : iabs(dy);
      ok = M >= 32 && (reach <= 0 || M <= reach) && gok(tlv, wx, wf, m->fw, 0) && path_ok(tlv, m->x, m->feet, wx, wf, m->fw, 0) && !spot_taken(m, wx, wf, m->fw);
    } else {
      lvl_draw(tlv, a, b, m->fw, WIDE, WIDE, &wx, &wf);
      ok = gok(tlv, wx, wf, m->fw, 0) && path_ok(m->lv, m->x, m->feet, ax, af, m->fw, 1) && path_ok(tlv, bx, bf, wx, wf, m->fw, 1) && !spot_taken(m, wx, wf, m->fw);
    }
  }
  if (!ok) return 0;
  m->tlv = tlv; m->jn = jn; m->tx = wx; m->tf = wf; m->leg = 0;
  if (tlv == m->lv) mv_seg(m, wx, wf);
  else { m->leg = 1; m->ax = ax; m->af = af; m->bx = bx; m->bf = bf; mv_seg(m, ax, af); if (!m->M) mv_legs(m); }
  mv_clip_start(m);
  return 1;
}
/* R4b: a mover's rest, the stills' (wk_rest_plan and the rest): a trip to a given point, its curl spot or off main's left end, a placement where it rests, and the way back */
static int mv_go(mv_t *m, int tlv, int wx, int wf) {
  int jn = -1, rt[2][2][2] = { { { 0 } } };
  if (tlv != m->lv && (jn = room_route(m->lv, tlv, rt)) < 0) return 0;
  m->tlv = tlv; m->jn = jn; m->tx = wx; m->tf = wf; m->leg = 0; m->ex = 0;
  if (tlv == m->lv) mv_seg(m, wx, wf);
  else { m->leg = 1; m->ax = rt[0][0][0] - m->fw / 2; m->af = rt[0][0][1]; m->bx = rt[1][0][0] - m->fw / 2; m->bf = rt[1][0][1]; mv_seg(m, m->ax, m->af); if (!m->M && !mv_legs(m)) return 1; }
  mv_clip_start(m); return 1;
}
static int mv_rest_trip(mv_t *m) {
  if (m->rk == RK_CURL) { int ox, of; if (curl_spot(m->id, m->seed, m->lv, m->fw, m->cw, m->x, m->feet, &ox, &of)) {
      int bx = ox - m->fw / 2; if (bx == m->x && of == m->feet) { m->rs = RS_REST; m->want = 1; m->flip_due = g_wticks; m->settle_tried = 0; return 1; }
      m->rs = RS_GOING; if (mv_go(m, m->lv, bx, of)) return 1; m->rs = RS_FINISH; }
    m->rk = RK_OUT; }
  int tx, tf; edge_point(m->fw, &tx, &tf);
  if (m->lv == 0 && m->x == tx && m->feet == tf) { m->ex = 1; m->tlv = 0; m->leg = 0; mv_seg(m, g_lx - m->fw - 2, m->feet); m->rs = RS_GOING; mv_clip_start(m); return 1; }
  m->rs = RS_GOING; if (mv_go(m, 0, tx, tf)) return 1;
  m->x = g_lx - m->fw - 2; m->rs = RS_REST; return 1;
}
static void mv_to_rest(mv_t *m, int fresh);
static void mv_to_asleep(mv_t *m, int ct);
static int loop_period(const mv_loop_t *l);
static void mv_rest_at(mv_t *m) {   /* a new mover that is not shown: at rest already */
  if (m->rk == RK_CURL) { int ox, of; if (curl_spot(m->id, m->seed, m->lv, m->fw, m->cw, m->x, m->feet, &ox, &of)) { m->x = ox - m->fw / 2; m->feet = of; m->rs = RS_REST; m->want = 1; mv_to_asleep(m, (int)(m->seed % (unsigned)loop_period(&m->S->asleep))); return; } m->rk = RK_OUT; }
  if (m->rk == RK_OUT) { int tx, tf; edge_point(m->fw, &tx, &tf); m->lv = m->tlv = 0; m->x = g_lx - m->fw - 2; m->feet = tf; }
  m->rs = RS_REST;
}
static void mv_enter(mv_t *m) {
  int tx, tf; edge_point(m->fw, &tx, &tf); m->lv = m->tlv = 0; m->x = g_lx - m->fw - 2; m->feet = tf; m->facing = 1; m->rs = RS_SHOWN; m->ex = 0; m->want = 0; m->wander = 0; mv_to_rest(m, 1); mv_go(m, 0, tx, tf);
}
static void mv_return(mv_t *m) {
  int was = m->rs, out = m->rk == RK_OUT || m->ex; m->rs = RS_SHOWN;
  if ((was == RS_REST && out) || (was == RS_GOING && m->ex)) { mv_enter(m); return; }
  m->ex = 0;
}
static void mv_to_rest(mv_t *m, int fresh) { m->clip = C_REST; m->ct = 0; m->phase = 0; m->pt = 0; m->lift = 0; m->dy = 0; m->sh75 = 0; m->dl = 0; m->cell = loop_cell(&m->S->breathe, 0); if (fresh) { m->rest = mv_rest_len(m); m->rested = 0; } }
static void mv_to_asleep(mv_t *m, int ct) { m->clip = C_ASLEEP; m->ct = ct; m->lift = 0; m->dy = 0; m->sh75 = 0; m->dl = 0; m->cell = loop_cell(&m->S->asleep, ct); }
static void mv_dither(mv_t *m, int level, int from, int dyf, int to, int dyt) { m->dl = level; m->dfrom = from; m->dto = to; m->ddf = dyf; m->ddt = dyt; }
static void mv_curl_begin(mv_t *m) { m->clip = C_CURL; m->phase = 0; m->pt = 1; m->dl = 0; m->lift = 0; m->sh75 = 0; m->cell = moving_walk_cell(m->S, "crouch"); m->dy = m->S->curl_nlower > 0 ? m->S->curl_lower[0] : 0; }
static void mv_wake_begin(mv_t *m) { int cu = moving_walk_cell(m->S, "curl"), cr = moving_walk_cell(m->S, "crouch"); m->clip = C_WAKE; m->phase = 0; m->pt = 1; m->cell = cr; m->dy = 2; mv_dither(m, 4, cu, 0, cr, 2); }
static void mv_stir_begin(mv_t *m) { int cu = moving_walk_cell(m->S, "curl"), cr = moving_walk_cell(m->S, "crouch"); m->clip = C_STIR; m->phase = 0; m->pt = 1; m->cell = cr; m->dy = 2; m->pending_stir = 0; m->stir_hold = t80(m->S->stir_lo) + (int)(mr(m) % (unsigned)(t80(m->S->stir_hi) - t80(m->S->stir_lo) + 1)); mv_dither(m, 4, cu, 0, cr, 2); }
/* may a rest change begin now (R4): not under the ring, unless it has waited 60 s past its due time */
static int mv_may_flip(const mv_t *m, long j) { return !m->focus || (m->flip_due >= 0 && j - m->flip_due >= 1500); }
/* one own tick of a resident (the household tick of its group); `start` set when the scheduler started its trip; `air_ok` whether a crouch may lift off (≤ 2 airborne) */
static void mv_step(mv_t *m, long j, int air_ok) {
  const mv_stage_t *S = m->S; int cr = moving_walk_cell(S, "crouch"), cu = moving_walk_cell(S, "curl"), st = moving_walk_cell(S, "stand");
  if (m->focus) m->focus_t++;
  switch (m->clip) {
  case C_REST:
    if (m->want && !m->wander && mv_may_flip(m, j)) {   /* a settle flip: curl where it stands (after one trip off another sleeper's spot) */
      if (m->leg == 2 && mv_trip(m, 0, 0)) return;   /* a stop on a ramp finishes its crossing before it curls */
      if (!m->settle_tried && spot_taken(m, m->x, m->feet, m->fw)) { m->settle_tried = 1; if (mv_trip(m, 0, 0)) return; }
      mv_curl_begin(m); return;
    }
    if (m->wander && j >= m->wander_until && m->ct >= 2 * loop_period(&S->breathe) && mv_may_flip(m, j)) { if (m->leg == 2 && mv_trip(m, 0, 0)) return; mv_curl_begin(m); return; }   /* at least two breaths */   /* the wanderer's rest is over: it curls where it stands */
    if (m->focus && m->focus_t >= 3 && !m->acked && !mv_in_asleep_form(m)) { m->acked = 1; m->clip = C_ACK; m->pt = 1; m->cell = cr; m->ct = 0; return; }   /* G4: the ring still on it 3 ticks after focus: crouch, then stand */
    m->ct++; if (!m->focus) { m->rested++; if (m->rest > 0) m->rest--; }
    m->cell = loop_cell(&S->breathe, m->ct); return;
  case C_ACK:
    if (++m->pt > t80(S->ack_crouch)) mv_to_rest(m, 0); return;
  case C_HOP: {
    int nA = S->hop_nlift > 0 ? S->hop_nlift : 1;
    if (m->phase == P_CROUCH) {
      if (m->focus && m->hop >= 1 && !m->arrived) { m->cell = st; mv_stop(m); mv_to_rest(m, 1); return; }   /* focus: it stops on its next beat */
      if (++m->pt > t80(S->hop_crouch)) { if (!air_ok) { m->pt--; return; } m->phase = P_AIR; m->pt = 1; }
      else return;
    } else if (m->phase == P_AIR) { if (++m->pt > nA) { m->phase = P_LAND; m->pt = 1; m->lift = 0; m->sh75 = 0; m->cell = cr; return; } }
    else if (m->phase == P_LAND) { if (++m->pt > t80(S->hop_land)) {
        if (m->focus) { mv_stop(m); mv_to_rest(m, 1); return; }   /* under the ring it stops where the arc landed */
        m->phase = P_STAND; m->pt = 1; m->cell = st; } return; }
    else { if (++m->pt > t80(S->hop_stand)) {
        if (m->focus) { mv_stop(m); mv_to_rest(m, 1); return; }
        if (m->hop >= m->nh) { if (mv_legs(m)) { m->hop = 1; m->nh = m->leg == 2 && room_join_hop(m->jn) ? 1 : (m->M + S->hop_travel - 1) / S->hop_travel; if (m->nh < 1) m->nh = 1; m->phase = P_CROUCH; m->pt = 1; m->cell = cr; return; }   /* the next leg's first hop: no rest between legs */
          mv_to_rest(m, 1); return; }   /* the trip ends on its waypoint after the last stand */
        m->hop++; m->phase = P_CROUCH; m->pt = 1; m->cell = cr; } return; }   /* each hop is crouch, air, land, stand */
    /* an air tick: the lift from the table, the travel spread over the air ticks, d = M·((h − 1)·5 + j) / (nh·5) */
    m->cell = moving_walk_cell(S, "air"); m->lift = S->hop_lift[m->pt - 1]; m->sh75 = S->sh75[m->pt - 1];
    mv_along(m, m->M * ((m->hop - 1) * nA + m->pt) / (m->nh * nA)); return; }
  case C_WALK: {
    int pass = moving_walk_cell(S, "pass"), period = 0; for (int i = 0; i < S->cycle_n; i++) period += t80(S->cycle_ms[i]);
    if (m->arrived) { if (m->cell == pass) { m->lift = 0; mv_to_rest(m, 1); } else { m->cell = pass; m->lift = S->pass_rise; } return; }   /* arrival on a step cuts to pass, holds 80, then stand */
    if (m->focus) { mv_stop(m); m->arrived = 1; if (m->cell != pass) { m->cell = pass; m->lift = S->pass_rise; } else { mv_to_rest(m, 1); } return; }
    m->tripd++;
    { int d = speed_d(m->stage, m->tripd - m->td0); if (d >= m->M) { d = m->M; if (mv_legs_after(m)) { m->td0 = m->tripd; } else m->arrived = 1; } else mv_along(m, d); }   /* the speed of its stage (rules.walk.speed); at the end of a leg that is not the last, the next begins on the same step */
    { int t = m->tripd % period, c = S->cycle_cell[0]; for (int i = 0; i < S->cycle_n; i++) { int dd = t80(S->cycle_ms[i]); if (t < dd) { c = S->cycle_cell[i]; break; } t -= dd; } m->cell = c; }
    m->lift = m->cell == pass ? S->pass_rise : 0;
    return; }
  case C_CURL:
    if (m->phase == 0) { if (++m->pt > t80(S->curl_crouch)) { m->phase = 1; m->pt = 1; mv_dither(m, 4, cr, m->dy, cu, 0); return; } if (m->pt - 1 < S->curl_nlower) m->dy += S->curl_lower[m->pt - 1]; return; }
    if (m->phase == 1) { if (++m->pt > 4) { m->phase = 2; m->pt = 1; m->dl = 0; m->dy = 0; m->cell = cu; m->curl_end = j; g_hh.last_curl_end = j; if (m->wander) { m->wander = 0; g_hh.all_asleep = 0; } return; } m->dl = 4 * m->pt; return; }
    if (++m->pt > t80(S->curl_after)) mv_to_asleep(m, 0);
    return;
  case C_ASLEEP:
    if (!m->want && !m->wander && mv_may_flip(m, j)) { mv_wake_begin(m); return; }   /* a wake flip */
    if (m->pending_stir && !m->focus) { mv_stir_begin(m); return; }
    m->ct++; m->cell = loop_cell(&S->asleep, m->ct); return;
  case C_WAKE:
    if (m->phase == 0) { if (++m->pt > 4) { m->phase = 1; m->pt = 1; m->dl = 0; m->cell = cr; m->dy = 2; } else m->dl = 4 * m->pt; return; }
    if (++m->pt > t80(S->wake_crouch)) {   /* stand, risen to its line; then breathe from b0 */
      mv_to_rest(m, 1);
      if (m->wander) { m->wander_wps = 1 + (int)(mr(m) % 2u); if (!mv_trip(m, v_si("vivarium", "rules.night.reach", 200), 0)) m->wander_wps = 0; else m->wander_wps--; }
    }
    return;
  case C_STIR:
    if (m->phase == 0) { if (++m->pt > 4) { m->phase = 1; m->pt = 1; m->dl = 0; m->cell = cr; m->dy = 2; } else m->dl = 4 * m->pt; return; }
    if (m->phase == 1) { if (++m->pt > m->stir_hold) { m->phase = 2; m->pt = 1; mv_dither(m, 4, cr, 2, cu, 0); } return; }
    if (++m->pt > 4) { mv_to_asleep(m, 0); m->dy = 0; } else m->dl = 4 * m->pt; return;
  }
}
/* the box the picture takes, and its shadow's, for the budget: a change's area is the union of the old and new boxes plus the shadow's when it changes */
static void mv_box(const mv_t *m, int b[4]) { b[0] = m->x - m->fdx; b[1] = m->feet - m->bo - m->lift + m->dy; b[2] = m->w; b[3] = m->h; }
static int mv_shown_cell(const mv_t *m) { return moving_shown(m->S, m->cell, m->facing, m->native); }
static int uarea(const int a[4], const int b[4]) { int x0 = a[0] < b[0] ? a[0] : b[0], y0 = a[1] < b[1] ? a[1] : b[1], x1 = a[0] + a[2] > b[0] + b[2] ? a[0] + a[2] : b[0] + b[2], y1 = a[1] + a[3] > b[1] + b[3] ? a[1] + a[3] : b[1] + b[3]; return (x1 - x0) * (y1 - y0); }
static int mv_change_area(const mv_t *o, const mv_t *n) {
  int a[4], b[4]; mv_box(o, a); mv_box(n, b);
  int pic = (a[0] != b[0] || a[1] != b[1] || mv_shown_cell(o) != mv_shown_cell(n) || o->dl != n->dl || (n->dl && (o->dfrom != n->dfrom || o->dto != n->dto))) ? uarea(a, b) : 0;
  int sa[4] = { o->x - o->fdx, o->feet - 16, o->w, 16 }, sb[4] = { n->x - n->fdx, n->feet - 16, n->w, 16 };
  int sh = (o->x != n->x || o->feet != n->feet || o->sh75 != n->sh75) ? uarea(sa, sb) : 0;
  return pic + sh;
}
/* the change's class (§2.3 item 7): 1 mid-trip moves, 2 breaths and sleepers' cells, 3 trip starts, 4 one-shots */
static int mv_class(const mv_t *o, const mv_t *n) {
  if ((o->clip == C_HOP || o->clip == C_WALK)) return 1;
  if (o->clip == C_REST && (n->clip == C_HOP || n->clip == C_WALK)) return 3;
  if (o->clip == n->clip && (o->clip == C_REST || o->clip == C_ASLEEP)) return 2;
  return 4;
}
/* the household tick j (group j mod 2): the night's choices, the trip starts (G10), every changed resident by class inside the budget; returns the changes applied */
static int mv_household(long j) {
  int grp = (int)(j & 1), budget = v_si("vivarium", "rules.tickBudget", 148000), fdiv = v_si("vivarium", "rules.travel.floorDiv", 3), cmin = v_si("vivarium", "rules.travel.capMin", 4), cdiv = v_si("vivarium", "rules.travel.capDiv", 2), amax = v_si("vivarium", "rules.travel.airborne", 2), minrest = v_si("vivarium", "rules.travel.minRest", 25);
  int N = 0, trav = 0, air = 0, asleepN = 0, wanderUp = 0, allAsleep = g_nm > 0, settling = 0, stillsWalking = 0;
  for (int i = 0; i < g_nw; i++) stillsWalking += g_w[i].walking;   /* the stills' trips count toward the ceiling too */
  census_state();
  for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->wander && !m->want && (m->clip == C_REST || m->clip == C_HOP || m->clip == C_WALK)) m->wander = 0;   /* a wanderer whose own rest flips to awake joins N where it stands */
    if (m->pending_stir && m->focus) { m->pending_stir = 0; g_hh.next_stir = j; }   /* a due stir never lands on a focused sleeper: it goes to another */ }
  for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->sh && mv_awake(m) && !m->focus && !m->wander) N++; if (mv_travelling(m)) trav++; if (mv_airborne(m)) air++; if (m->sh && m->clip == C_ASLEEP) asleepN++; if (m->wander) wanderUp = 1; if (m->sh && !m->want) allAsleep = 0; if (m->clip != C_ASLEEP && m->want && m->sh) settling = 1; }
  for (int i = 0, n = v_plen("regions.residents"); i < n; i++) if (v_pbool(v_fmt("regions.residents.%d.shown", i), 1) && strcmp(v_pstr(v_fmt("regions.residents.%d.rest", i)), "asleep") != 0) allAsleep = 0;   /* only the shown count: a rester is out of the night's stirs and wanders (R4b) */
  for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (!m->sh && m->rs == RS_FINISH && m->rk == RK_BED && m->clip == C_REST && !m->focus) m->rs = RS_REST; }   /* a rester bound for the bed rests where it stands once its trip is over (its sleeper on the bed draws) */   /* every resident at home asleep (a still has no rest: it is awake) */
  /* G7: the stir, one every 250–500 ticks across the household while one is asleep (none while one wanders, never a focused sleeper, never in the 20 s after its own curl, never the last one twice) */
  int s_lo = v_si("vivarium", "rules.night.stir.0", 250), s_hi = v_si("vivarium", "rules.night.stir.1", 500), w_lo = v_si("vivarium", "rules.night.wander.0", 3000), w_hi = v_si("vivarium", "rules.night.wander.1", 4500), after = v_si("vivarium", "rules.night.afterCurl", 250);
  if (!asleepN || wanderUp) { if (!asleepN) g_hh.next_stir = -1; }
  else {
    if (g_hh.next_stir < 0) g_hh.next_stir = j + 2L * (s_lo + (long)(hr() % (unsigned)(s_hi - s_lo + 1)));
    if (j >= g_hh.next_stir) {
      int el[MAXR], ne = 0;
      for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->sh && m->clip == C_ASLEEP && !m->focus && !m->pending_stir && j - m->curl_end >= 2L * after && !(asleepN >= 2 && !strcmp(m->id, g_hh.last_stir))) el[ne++] = i; }
      if (ne) { mv_t *m = &g_m[el[hr() % (unsigned)ne]]; m->pending_stir = 1; snprintf(g_hh.last_stir, sizeof g_hh.last_stir, "%s", m->id); g_hh.next_stir = j + 2L * (s_lo + (long)(hr() % (unsigned)(s_hi - s_lo + 1))); }
    }
  }
  /* G7: the wanderer, when every resident is asleep and settled: every 3,000–4,500 ticks one wakes (juveniles first, then adults, never an elder, never the last one twice), from the end of the last curl */
  if (allAsleep && !settling && !wanderUp) {
    if (!g_hh.all_asleep) { g_hh.all_asleep = 1; g_hh.wander_at = (g_hh.last_curl_end > 0 ? g_hh.last_curl_end : j) + 2L * (w_lo + (long)(hr() % (unsigned)(w_hi - w_lo + 1))); }
    if (j >= g_hh.wander_at) {
      int el[MAXR], ne = 0, n2 = 0;
      for (int pass = 0; pass < 2 && !ne; pass++) { n2 = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].sh && g_m[i].stage == pass && g_m[i].clip == C_ASLEEP) n2++;
        for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->sh && m->stage == pass && m->clip == C_ASLEEP && !m->focus && !(n2 >= 2 && !strcmp(m->id, g_hh.last_wander))) el[ne++] = i; } }
      if (ne) { mv_t *m = &g_m[el[hr() % (unsigned)ne]]; m->wander = 1; m->pending_stir = 0; snprintf(g_hh.last_wander, sizeof g_hh.last_wander, "%s", m->id);
        m->wander_until = j + 2L * (v_si("vivarium", "rules.night.awake.0", 250) + (long)(mr(m) % (unsigned)(v_si("vivarium", "rules.night.awake.1", 750) - v_si("vivarium", "rules.night.awake.0", 250) + 1)));
        mv_wake_begin(m); g_hh.all_asleep = 0; }
    }
  } else if (!allAsleep) g_hh.all_asleep = 0;
  /* the proposals: each resident of this group stepped on a copy */
  typedef struct { int i, cls, area; mv_t n; } prop_t;
  prop_t pr[MAXR]; int np = 0, at[MAXR];
  for (int i = 0; i < g_nm; i++) at[i] = -1;
  /* every resident of this group steps first (a trip that ends on this tick ends before the scheduler counts), then the scheduler starts trips from those still at rest */
  for (int i = 0; i < g_nm; i++) {
    mv_t *m = &g_m[i]; if (m->group != grp) continue;
    if (m->rs == RS_REST && m->rk != RK_CURL) continue;   /* a rester out of sight (off the edge, or on the bed) does not step */
    mv_t c = *m; int leaving = mv_airborne(m) && m->pt >= m->S->hop_nlift; if (leaving) air--;
    int ok = air < amax; int wasAir = mv_airborne(&c); mv_step(&c, j, ok); if (!wasAir && mv_airborne(&c)) air++;
    if (c.clip == C_REST && m->wander && c.wander && m->clip != C_REST) { /* arrived on a wanderer's waypoint: the next, or rest */ if (c.wander_wps > 0 && mv_trip(&c, v_si("vivarium", "rules.night.reach", 200), 0)) c.wander_wps--; }
    at[i] = np; pr[np].i = i; pr[np].n = c; cen_m[i] = &pr[np].n; np++;   /* what the planner reads of this resident now: its proposal */
  }
  trav = stillsWalking; for (int i = 0; i < g_nm; i++) if (at[i] >= 0 ? mv_travelling(&pr[at[i]].n) : mv_travelling(&g_m[i])) trav++;
  int cap = (N + cdiv - 1) / cdiv; if (cap < cmin) cap = cmin; if (cap > g_trmax) cap = g_trmax;   /* G10: min(rules.travel.max, max(capMin, ⌈N/capDiv⌉)) */ int fl = (N + fdiv - 1) / fdiv, tried[MAXR] = { 0 };
  /* the floor holds on every frame: a trip of the other group that ends on that group's next tick (40 ms on) is not counted toward the floor here, so its successor starts on this tick, never a tick late */
  int ending = 0; for (int i = 0; i < g_nm; i++) { const mv_t *m = &g_m[i]; if (m->group == grp || !mv_travelling(m)) continue;
    if ((m->clip == C_HOP && m->phase == P_STAND && m->pt + 1 > t80(m->S->hop_stand) && m->hop >= m->nh) || (m->clip == C_WALK && m->arrived && m->cell == moving_walk_cell(m->S, "pass"))) ending++; }
  for (int pass = 0; pass < 2; pass++) {   /* G10: rest run out, longest first, while travelling < cap; then rested ≥ minRest, longest first, while travelling < floor */
    for (;;) {
      if (pass == 0 ? trav >= cap : trav - ending >= fl || trav >= cap) break;
      int best = -1;
      for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->group != grp || tried[i] || m->clip != C_REST || at[i] < 0 || pr[at[i]].n.clip != C_REST || m->focus || m->want || m->wander || !g_mv_motion) continue;
        const mv_t *q = &pr[at[i]].n; if (q->rs == RS_REST) continue; if (!q->sh && q->rs == RS_FINISH) { if (q->rk == RK_BED) continue; } else if (pass == 0 ? q->rest > 0 : q->rested < minrest) continue;   /* its rest as of this tick; a rester's trip to rest does not wait for it (R4b) */
        if (best < 0 || q->rested > pr[at[best]].n.rested) best = i; }
      if (best < 0) break;
      tried[best] = 1; mv_t c = pr[at[best]].n;
      if (!c.sh && c.rs == RS_FINISH ? mv_rest_trip(&c) : mv_trip(&c, 0, 1)) { pr[at[best]].n = c; trav++; }
      else { mv_t *q = &pr[at[best]].n; q->s = c.s; q->rest = mv_rest_len(q); q->rested = 0; }   /* eight draws failed: it rests again, and the next is tried */
    }
  }
  for (int k = 0; k < np; k++) { mv_t *o = &g_m[pr[k].i]; pr[k].area = mv_change_area(o, &pr[k].n); pr[k].cls = mv_class(o, &pr[k].n); }
  /* nap sleepers: class 2 */
  int used = 0, applied = 0;
  /* order: class, then a deferred change first, then props order */
  for (int a = 1; a < np; a++) { prop_t t = pr[a]; int b = a - 1;
    while (b >= 0) { int ka = t.cls * 4 - g_m[t.i].deferred, kb = pr[b].cls * 4 - g_m[pr[b].i].deferred; if (kb < ka || (kb == ka && pr[b].i < t.i)) break; pr[b + 1] = pr[b]; b--; }
    pr[b + 1] = t; }
  for (int k = 0; k < np; k++) {
    mv_t *o = &g_m[pr[k].i];
    if (pr[k].area && used + pr[k].area > budget) { o->deferred = 1; g_mv_deferred++; continue; }   /* deferred: its clip does not advance this tick and goes first in its class next own tick */
    used += pr[k].area; if (pr[k].area) { applied++; g_home_steps++; }
    if (mv_travelling(&pr[k].n) && !mv_travelling(o)) pr[k].n.trip_start = j;
    *o = pr[k].n; o->deferred = 0;
  }
  for (int i = 0; i < g_nnap; i++) { nap_t *z = &g_nap[i]; if (z->group != grp) continue; z->ct++; int c = loop_cell(&z->S->asleep, z->ct); if (c != z->cell) { int area = z->w * z->h; if (used + area > budget) { z->ct--; g_mv_deferred++; continue; } used += area; z->cell = c; applied++; g_home_steps++; } }
  g_mv_tick_area = used; if (used > g_mv_worst_tick) g_mv_worst_tick = used;
  return applied;
}

/* ---- what the last draw put where (the focus reads these boxes) ---- */
typedef struct { char id[24]; char name[40]; char pic[96], stand[96]; int juvenile, waiting, sleeper, box[4], draw[4], mv, nap, asleep, ink[4], rank, hasfig, curled, sbox[4], hidden, carried; char mark[64]; unsigned seed; } ent_t;   /* hasfig: box is the figure's, draw the picture's; sbox: the slot a stand picture takes; hidden: a rester out of sight (off the window's edge, or resting on the bed: its sleeper draws) is neither drawn nor a target (R4b) */   /* box: the focus target's; draw: where the picture goes; mv / nap: the moving resident or nap sleeper (-1: a still); asleep: the asleep form, ink its ink box */
static ent_t g_e[MAXR + MAXS]; static int g_ne;
int g_home_steps;   /* test hook: the residents that stepped since face_frame began (face_test_steps) */

/* the walk's clock: at most one group tick a frame (a late frame steps the next group only and the time past that tick is dropped by moving the walk's origin later in whole ticks); the moving household runs on the tick it applies */
static int walk_clock(uint32_t now) {
  if (library_swap_pending(now)) return 0;   /* the Library's breathing swap is 124,528 px: the residents do not step on its frame (build spec 4.2), and take their tick on the next */
  long due = (long)((now - g_t0) / STEP_MS) + 1;
  if (due > g_wticks + 1) { g_t0 += (uint32_t)(due - g_wticks - 1) * STEP_MS; due = g_wticks + 1; }
  if (due <= g_wticks) return 0;
  g_wticks = due;
  return (g_nm || g_nnap) ? mv_household(g_wticks - 1) : 0;
}
/* a moving resident new to the props: at its seed's start point on the current tick (no replay), in its rest: asleep in the asleep loop at phase seed mod 60, awake breathing at phase seed mod the breath's period */
static void mv_init(mv_t *m, const char *id, unsigned seed, const char *set, int stage, const mv_stage_t *S, int w, int h, const int fig[4], int want, const mv_t *earlier, int ne) {
  memset(m, 0, sizeof *m); snprintf(m->id, sizeof m->id, "%s", id); snprintf(m->set, sizeof m->set, "%s", set); m->seed = seed; m->s = seed; m->stage = stage; m->S = S; m->w = w; m->h = h; m->hasfig = fig != NULL; m->fw = fig ? fig[2] : w; m->fh = fig ? fig[3] : h; m->fdx = fig ? fig[0] : 0; m->fdy = fig ? fig[1] : 0; m->bo = fig ? fig[1] + fig[3] - 1 : h; m->want = want; m->flip_due = -1; m->curl_end = -100000; m->trip_start = 0;
  { const mv_set_t *ms = moving_set(set); m->native = ms ? ms->native_right : 1; }
  unsigned r = mr(m); int nl = room_levels(), lv = nl > 1 && r % (unsigned)g_lvin == 0 && raised_ok(id) ? 1 + (int)((r / (unsigned)g_lvin) % (unsigned)(nl - 1)) : 0;   /* one draw: the level (1 start in lvin, while the raised cap allows) */
  int x = 32, feet = 300, ok = 0;
  for (int i = 0; i < 8 && !ok; i++) { unsigned a = mr(m), b = mr(m); lvl_draw(lv, a, b, m->fw, WIDE, WIDE, &x, &feet); ok = gok(lv, x, feet, m->fw, 0) && !start_heap(x, feet, m->fw, m->fh);
    if (ok && want) for (int k = 0; k < ne; k++) if (earlier[k].want && in_spot(&earlier[k], x + m->fw / 2, feet)) ok = 0; }   /* at screen show, asleep: not in an earlier sleeper's spot */
  if (!ok) { lv = 0; lvl_draw(0, 0, 0, m->fw, g_xlo, g_xlo, g_rlo, g_rhi, &x, &feet); }   /* all eight failed: main's leftmost point at its top */
  m->lv = m->tlv = lv; m->x = x; m->feet = feet; m->facing = (int)(mr(m) & 1u); m->rest = mv_rest_len(m); m->rested = 0;
  if (want) mv_to_asleep(m, (int)(seed % (unsigned)loop_period(&S->asleep))); else { mv_to_rest(m, 0); m->ct = (int)(seed % (unsigned)loop_period(&S->breathe)); m->cell = loop_cell(&S->breathe, m->ct); }
}

/* the stills' ticks up to the screen's time `rel`, in the order of their times (one household tick at a time; ties by props order): a still reads the household as it stood at its own tick */
static void stills_step(uint32_t rel) {
  long due[MAXR]; int px[MAXR], pf[MAXR];
  for (int i = 0; i < g_nw; i++) { wk_t *k = &g_w[i]; unsigned off = 40u * (unsigned)(k->pi & 1); due[i] = rel >= off ? (long)((rel - off) / 80u) + 1 : 0; if (due[i] - k->done > 4000) k->done = due[i] - 4000;   /* a long gap: catch up no further than the route repeats */
    px[i] = k->x; pf[i] = k->feet; }
  census_state();
  for (;;) {
    int best = -1; long bt = 0;
    for (int i = 0; i < g_nw; i++) if (g_w[i].done < due[i]) { long t = 80L * g_w[i].done + 40L * (g_w[i].pi & 1); if (best < 0 || t < bt) { best = i; bt = t; } }
    if (best < 0) break;
    wk_t *k = &g_w[best]; if (!k->hold) wk_step(k); k->done++;
  }
  for (int i = 0; i < g_nw; i++) if (g_w[i].x != px[i] || g_w[i].feet != pf[i]) g_home_steps++;
}
static int ent_focused(const ent_t *e, const char *cur);
static int rk_of(const char *s) { return !strcmp(s, "bed") ? RK_BED : !strcmp(s, "curl") ? RK_CURL : !strcmp(s, "out") ? RK_OUT : RK_NONE; }
/* the sleeper of a rester on the bed is drawn once its walker rests there (R4b): until then (its trip, its idle) the walker is the one drawn */
static int bed_pending(const char *id) {
  for (int i = 0; i < g_nw; i++) if (!strcmp(g_w[i].id, id)) return !(g_w[i].rs == RS_REST && g_w[i].rk == RK_BED);
  for (int i = 0; i < g_nm; i++) if (!strcmp(g_m[i].id, id)) return !(g_m[i].rs == RS_REST && g_m[i].rk == RK_BED);
  return 0;
}
/* a resident's curl ink width: the host's measured curl figure (props curlFigure, [dx, dy, W, H]), else the nap pose's widest ink (regions.bed.sleepers.ink.max, 96) */
static int curl_ink(const char *P) {
  if (v_plen(v_fmt("%s.curlFigure", P)) == 4) { int w = v_pint(v_fmt("%s.curlFigure.2", P), 0); if (w > 0) return w; }
  int d = v_sk(sp(), hp("regions.bed.sleepers.ink.max"), 0); return d > 0 ? d : 96;
}
/* the set-downs the face makes on ✓ while a mibi is in hand (the collection v2 design §3): its id and the ground point the hand was on, the swapped one's at the point the carried one left; applied once the props have no carry */
typedef struct { char id[24]; int fx, feet; } place_t;
static place_t g_place[2]; static int g_nplace;
static int ent_load(const char *cur) {
  g_ne = 0; walk_load();
  int motion = v_pbool("motion", 1); uint32_t now = anim_now(); g_mv_motion = motion;
  { int ctx = g_viv ? 2 : g_idle ? 1 : g_home ? 3 : 0; const char *rid = v_pstr("regions.room.id");   /* a new screen context or a new shown room: the walks start from their seeds on the room's own levels (R4c) */
    if (g_ctx != ctx || strcmp(g_room, rid)) { g_have_t0 = 0; g_ctx = ctx; snprintf(g_room, sizeof g_room, "%s", rid); } }
  int firstLoad = !g_have_t0;   /* the walk starts from the seeds on this frame: a traveller's walk-in (props enter) is for a walk that is already running (R4b) */
  if (!g_have_t0) { g_nw = 0; g_nm = 0; g_nnap = 0; g_t0 = now; g_wticks = 0; g_have_t0 = 1; memset(&g_hh, 0, sizeof g_hh); g_hh.next_stir = -1; }   /* Home shown again (home_hidden ran in between): the walks start from their seeds */
  if (motion) walk_clock(now);
  int nres = v_plen("regions.residents"); if (nres > MAXR) nres = MAXR; g_nres = 0;
  for (int i = 0; i < nres; i++) g_nres += v_pbool(v_fmt("regions.residents.%d.shown", i), 1);   /* N for the raised cap and for G10 counts the shown only (R4b) */
  uint32_t rel = now - g_t0; wk_t kept[MAXR]; int nk = 0; mv_t mk[MAXR]; int nmk = 0; sg_t sg[MAXR]; g_lw = kept; g_nlw = &nk; g_lm = mk; g_nlm = &nmk;   /* the walk state is kept per resident id: found by id, a new id or a new seed starts from its seed, one that is gone is dropped */
  uint32_t ids = 2166136261u;
  for (int i = 0; i < nres; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.residents.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 0; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0); e->mv = -1; e->nap = -1; e->asleep = 0;
    snprintf(e->mark, sizeof e->mark, "%s", v_pstr(v_fmt("%s.mark", P))); e->carried = v_pbool(v_fmt("%s.carried", P), 0);   /* the collection's mark (its master id) and the one in hand (it pauses where it stands) */
    const char *sz = e->juvenile ? "regions.resident.juvenile" : "regions.resident.adult"; int w = v_sk(sp(), hp(sz), 0), h = v_sk(sp(), hp(sz), 1);
    /* a moving set (M1 §2.2): { set, walk, shadow } with the set loaded, its stage present at this size and its walk atlas sent; else a still */
    char mset[8], mwalk[96], mshadow[96]; snprintf(mset, sizeof mset, "%s", v_pstr(v_fmt("%s.moving.set", P))); snprintf(mwalk, sizeof mwalk, "%s", v_pstr(v_fmt("%s.moving.walk", P))); snprintf(mshadow, sizeof mshadow, "%s", v_pstr(v_fmt("%s.moving.shadow", P)));
    const char *stg = v_pstr(v_fmt("%s.stage", P)); int stage = !strcmp(stg, "juvenile") ? MV_JUV : !strcmp(stg, "elder") ? MV_ELDER : MV_ADULT;
    const mv_stage_t *MS = mset[0] ? moving_stage(mset, stage) : NULL;
    if (MS && has(mwalk) && MS->ww == w && MS->wh == h && nmk < MAXR) {
      int want = strcmp(v_pstr(v_fmt("%s.rest", P)), "asleep") == 0, ssh = v_pbool(v_fmt("%s.shown", P), 1), srk = rk_of(v_pstr(v_fmt("%s.restAt", P)));
      mv_t *old = NULL; for (int j = 0; j < g_nm; j++) if (!strcmp(g_m[j].id, e->id) && g_m[j].seed == e->seed && !strcmp(g_m[j].set, mset) && g_m[j].stage == stage) old = &g_m[j];
      mv_t *m = &mk[nmk]; int fig[4], hf = 0;   /* the atlas's figure, when the props give one inside the cell */
      if (v_plen(v_fmt("%s.figure", P)) == 4) { for (int q = 0; q < 4; q++) fig[q] = v_pint(v_fmt("%s.figure.%d", P, q), -1); hf = fig[0] >= 0 && fig[1] >= 0 && fig[2] > 0 && fig[3] > 0 && fig[0] + fig[2] <= w && fig[1] + fig[3] <= h; }
      if (old) { *m = *old; if (!ssh) want = (old->rs == RS_REST && old->rk == RK_CURL) ? 1 : (old->rs == RS_REST ? want : 0);   /* a rester is awake until it rests, and curled at its spot */
        if (m->want != want) { m->want = want; m->flip_due = (long)g_wticks; m->settle_tried = 0; } }
      else { census_load(kept, nk, mk, nmk, nres); mv_init(m, e->id, e->seed, mset, stage, MS, w, h, hf ? fig : NULL, want, mk, nmk); }
      if (old) { m->hasfig = hf; m->fw = hf ? fig[2] : w; m->fh = hf ? fig[3] : h; m->fdx = hf ? fig[0] : 0; m->fdy = hf ? fig[1] : 0; m->bo = hf ? fig[1] + fig[3] - 1 : h; }
      m->S = MS; m->idx = i; m->cw = curl_ink(P); snprintf(m->walk, sizeof m->walk, "%s", mwalk); snprintf(m->shadow, sizeof m->shadow, "%s", mshadow);
      { int f = ent_focused(e, cur); if (f && !m->focus) { m->focus_t = 0; m->acked = 0; } m->focus = f; }
      m->sh = ssh; if (!ssh) m->rk = srk ? srk : RK_OUT;   /* R4b: a rester finishes its trip, then rests where restAt says; a shown one comes back; a new rester starts at rest */
      if (!old) { if (!ssh) mv_rest_at(m); else if (motion && !firstLoad && !strcmp(v_pstr(v_fmt("%s.enter", P)), "edge")) mv_enter(m); }   /* a traveller home walks in from the edge (reduced motion: a cut to its walk start) */
      else if (!ssh && m->rs == RS_SHOWN) m->rs = RS_FINISH;
      else if (ssh && m->rs != RS_SHOWN) { mv_return(m); if (!motion && m->x < g_xlo) { int tx, tf; edge_point(m->fw, &tx, &tf); m->x = tx; m->feet = tf; } }
      if (!motion && !ssh && (m->rs == RS_FINISH || m->rs == RS_GOING)) mv_rest_at(m);   /* with motion off a flip is a cut */
      e->hidden = m->rs == RS_REST && m->rk != RK_CURL;
      if (!motion) {   /* motion off: stand, or curl when asleep, in the facing it has; no travel, no step, no dither; flips are cuts */
        int x = m->x, f = m->feet, fc = m->facing; if (m->want) mv_to_asleep(m, 0); else mv_to_rest(m, 0);
        m->x = x; m->feet = f; m->facing = fc; m->cell = moving_walk_cell(MS, m->want ? "curl" : "stand"); m->wander = 0; m->pending_stir = 0;
      }
      e->mv = nmk++; e->asleep = mv_in_asleep_form(m);
      e->hasfig = m->hasfig;   /* the focus target: the figure's ground box (no figure: the slot's), never lifted (UI/UX §2) */
      if (m->hasfig) { e->box[0] = m->x; e->box[1] = m->feet + 1 - m->fh; e->box[2] = m->fw; e->box[3] = m->fh; } else { e->box[0] = m->x; e->box[1] = m->feet - h; e->box[2] = w; e->box[3] = h; }
      mv_box(m, e->draw); memcpy(e->sbox, e->box, sizeof e->sbox);
      { int fx = m->x + m->fw / 2; e->ink[0] = fx - 48; e->ink[1] = m->feet - 88; e->ink[2] = 96; e->ink[3] = 88; }
      for (const char *c = e->id; *c; c++) { ids ^= (uint8_t)*c; ids *= 16777619u; }
      g_ne++; continue;
    }
    /* a still: the walk is the figure's: its box x is the figure's left, its feet the last ink row; the picture is placed so that its drawn bbox [dx, dy, W, H] lands there. No figure: the picture is the figure */
    int fig[4] = { 0, 0, w, h }; e->hasfig = 0; e->curled = 0;
    int cf[4] = { 0 }, cp[2] = { 0 }, asleepStill = 0, curlOk = 0; char cpic[96] = "";   /* asleep (or curled at its rest spot) and with a curl (its picture sent): the curl is drawn in place, its foot on the stand's feet line */
    if (v_plen(v_fmt("%s.curlFigure", P)) == 4) { snprintf(cpic, sizeof cpic, "%s", v_pstr(v_fmt("%s.curl", P))); int sl = wire_asset_slot(cpic);
      if (sl >= 0 && prim_asset_size(sl, cp) == 0) { for (int q = 0; q < 4; q++) cf[q] = v_pint(v_fmt("%s.curlFigure.%d", P, q), -1);
        if (cf[0] >= 0 && cf[1] >= 0 && cf[2] > 0 && cf[3] > 0 && cf[0] + cf[2] <= cp[0] && cf[1] + cf[3] <= cp[1]) curlOk = 1; } }
    int propAsleep = !strcmp(v_pstr(v_fmt("%s.rest", P)), "asleep"), ssh = v_pbool(v_fmt("%s.shown", P), 1), srk = rk_of(v_pstr(v_fmt("%s.restAt", P)));
    if (v_plen(v_fmt("%s.figure", P)) == 4) { int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("%s.figure.%d", P, q), -1);
      if (f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= w && f[1] + f[3] <= h) { memcpy(fig, f, sizeof fig); e->hasfig = 1; } }
    wk_t *old = NULL; for (int j = 0; j < g_nw; j++) if (strcmp(g_w[j].id, e->id) == 0 && g_w[j].seed == e->seed && g_w[j].w == fig[2]) old = &g_w[j];
    if (old) kept[nk] = *old; else { census_load(kept, nk, mk, nmk, nres); wk_init(&kept[nk], e->id, e->seed, fig[2], fig[3], !strcmp(stg, "juvenile") ? MV_JUV : !strcmp(stg, "elder") ? MV_ELDER : MV_ADULT, i); }
    wk_t *k = &kept[nk]; k->pi = i; k->cw = curl_ink(P);
    k->sh = ssh; if (!ssh) k->rk = srk ? srk : RK_OUT;   /* R4b: a rester finishes its trip, then rests where restAt says; a shown one comes back; a new rester starts at rest */
    if (!old) { if (!ssh) wk_rest_at(k); else if (motion && !firstLoad && !strcmp(v_pstr(v_fmt("%s.enter", P)), "edge")) wk_enter(k); }   /* a traveller home walks in from the edge (reduced motion: a cut to its walk start) */
    else if (!ssh && k->rs == RS_SHOWN) k->rs = RS_FINISH;
    else if (ssh && k->rs != RS_SHOWN) { wk_return(k); if (!motion && k->x < g_xlo) { int tx, tf; edge_point(k->w, &tx, &tf); k->x = tx; k->feet = tf; k->walking = 0; } }
    if (!motion && !ssh && (k->rs == RS_FINISH || k->rs == RS_GOING)) { k->walking = 0; wk_rest_at(k); }   /* with motion off a flip is a cut */
    asleepStill = curlOk && ((propAsleep && (ssh || k->rs == RS_REST)) || (!ssh && k->rs == RS_REST && k->rk == RK_CURL)); if (asleepStill) snprintf(e->pic, sizeof e->pic, "%s", cpic);
    k->hold = (!g_viv && ent_focused(e, cur)) || asleepStill || (k->rs == RS_REST) || e->carried;   /* a sleeping resident stays where it is; so does one at rest; the room view's focused mibi keeps walking (the collection v2 design §3) and only the carried one pauses */
    memcpy(sg[nk].fig, fig, sizeof fig); memcpy(sg[nk].cf, cf, sizeof cf); memcpy(sg[nk].cp, cp, sizeof cp); sg[nk].asleep = asleepStill; sg[nk].ent = g_ne; sg[nk].w = w; sg[nk].h = h; nk++;
    g_ne++;
  }
  g_lw = g_lm = NULL; g_nlw = g_nlm = NULL;
  memcpy(g_w, kept, sizeof(wk_t) * (size_t)nk); g_nw = nk;
  memcpy(g_m, mk, sizeof(mv_t) * (size_t)nmk); g_nm = nmk;
  if (motion && !library_swap_pending(now)) stills_step(rel);   /* not on the frame the Library's breathing swap lands on (build spec 4.2): they take their steps on the next */
  if (g_viv && g_nplace && !*v_pstr("regions.carry.id")) {   /* a set-down (the collection v2 design §3): the mibi stands where the hand set it, the swapped one at the point the other left, and resumes from there */
    for (int p = 0; p < g_nplace; p++) for (int q = 0; q < g_nw; q++) if (!strcmp(g_w[q].id, g_place[p].id)) { wk_t *k = &g_w[q]; k->x = g_place[p].fx - k->w / 2; k->feet = g_place[p].feet; k->lv = k->tlv = room_level_at(g_place[p].fx, g_place[p].feet); k->walking = 0; k->leg = 0; k->jn = -1; k->hold = 0; k->idle = 25 + (int)(wr(k) % 38u); }
    g_nplace = 0; }
  for (int q = 0; q < g_nw; q++) {   /* the stills' boxes where the walk left them */
    const wk_t *k = &g_w[q]; const sg_t *z = &sg[q]; ent_t *e = &g_e[z->ent];
    e->box[0] = k->x; e->box[1] = k->feet + (e->hasfig ? 1 : 0) - z->fig[3];   /* no figure: the picture's bottom edge is the feet, as it was */ e->box[2] = z->fig[2]; e->box[3] = z->fig[3];   /* the figure box: the focus target */
    e->draw[0] = k->x - z->fig[0]; e->draw[1] = e->box[1] - z->fig[1]; e->draw[2] = z->w; e->draw[3] = z->h; memcpy(e->sbox, e->draw, sizeof e->sbox);
    e->hidden = k->rs == RS_REST && k->rk != RK_CURL;
    if (z->asleep) { int fx = k->x + z->fig[2] / 2, x0 = fx - z->cf[2] / 2;   /* the curl on the same feet point: its own figure's box, ring and tag; no lift */
      e->hasfig = 1; e->curled = 1; e->box[0] = x0; e->box[1] = k->feet + 1 - z->cf[3]; e->box[2] = z->cf[2]; e->box[3] = z->cf[3]; e->draw[0] = x0 - z->cf[0]; e->draw[1] = e->box[1] - z->cf[1]; e->draw[2] = z->cp[0]; e->draw[3] = z->cp[1]; }
  }
  /* groups (§2.3 item 3, override 8): g = i mod 2, or, when a moving cell is over 21,888 px, the large residents 0, 1, 0, 1… in props order and the others joining the group with fewer, a tie to 0 */
  { int big = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h > 21888) big = 1;
    if (!big) for (int i = 0; i < g_nm; i++) g_m[i].group = g_m[i].idx & 1;
    else { int n0 = 0, n1 = 0, alt = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h > 21888) { g_m[i].group = alt; alt ^= 1; if (g_m[i].group) n1++; else n0++; }
      for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h <= 21888) { g_m[i].group = n1 < n0 ? 1 : 0; if (g_m[i].group) n1++; else n0++; } } }
  if (g_hh.ids != ids) { g_hh.ids = ids; g_hh.s = 0x5bd1e995u; for (int i = 0; i < g_nm; i++) g_hh.s ^= g_m[i].seed; }   /* the household LCG, seeded when the set of ids changes or the screen is shown */
  int ns = strcmp(v_pstr("regions.bed.state"), "resting") == 0 ? v_plen("regions.bed.sleepers") : 0; if (ns > MAXS) ns = MAXS;   /* the bed is the resters' alone (R4b): the carried set is never drawn */
  nap_t nk2[MAXS]; int nn = 0;
  for (int i = 0; i < ns; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.bed.sleepers.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 1; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0); e->mv = -1; e->nap = -1; e->asleep = 0;
    e->hidden = bed_pending(e->id); snprintf(e->mark, sizeof e->mark, "%s", v_pstr(v_fmt("%s.mark", P))); e->carried = 0;
    int foot = v_sk(sp(), hp(v_fmt("regions.bed.sleepers.places.%d", ns)), i), bw = v_sk(sp(), hp("regions.bed.sleepers.ink.max"), 0), bh = v_sk(sp(), hp("regions.bed.sleepers.ink.max"), 1), footY = v_si(sp(), hp("regions.bed.sleepers.footY"), 512);
    if (e->juvenile) { e->box[0] = foot - v_si(sp(), hp("regions.bed.sleepers.juvenile.size.0"), 104) / 2; e->box[1] = footY - v_sk(sp(), hp("regions.bed.sleepers.juvenile.size"), 1); e->box[2] = v_sk(sp(), hp("regions.bed.sleepers.juvenile.size"), 0); e->box[3] = v_sk(sp(), hp("regions.bed.sleepers.juvenile.size"), 1); }
    else { e->box[0] = foot - v_sk(sp(), hp("regions.bed.sleepers.adult.size"), 0) / 2; e->box[1] = footY - v_sk(sp(), hp("regions.bed.sleepers.adult.size"), 1); e->box[2] = v_sk(sp(), hp("regions.bed.sleepers.adult.size"), 0); e->box[3] = v_sk(sp(), hp("regions.bed.sleepers.adult.size"), 1); }
    e->draw[0] = foot - bw / 2; e->draw[1] = footY - bh; e->draw[2] = bw; e->draw[3] = bh;   /* the stand-in fitted in the nap pose's ink, centred on the foot, its bottom on the foot's y */
    memcpy(e->sbox, e->box, sizeof e->sbox); e->hasfig = 0;
    { int ps[2], sl = wire_asset_slot(e->pic);   /* the world-size curl: the picture is as its host made it, its drawn bbox [dx, dy, W, H] sits on the foot (F.x = the place, the last ink row on the row above footY) */
      if (sl >= 0 && prim_asset_size(sl, ps) == 0 && !*v_pstr(v_fmt("%s.moving.set", P)) && (v_plen(v_fmt("%s.figure", P)) == 4 || ps[0] != bw || ps[1] != bh)) { int f[4] = { 0, 0, ps[0], ps[1] }; if (v_plen(v_fmt("%s.figure", P)) == 4) for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("%s.figure.%d", P, q), -1);   /* no figure and not the nap's size: it sleeps as its standing picture, the whole of it the figure */
        if (f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= ps[0] && f[1] + f[3] <= ps[1]) {
          e->box[0] = foot - f[2] / 2; e->box[1] = footY - f[3]; e->box[2] = f[2]; e->box[3] = f[3]; e->draw[0] = e->box[0] - f[0]; e->draw[1] = e->box[1] - f[1]; e->draw[2] = ps[0]; e->draw[3] = ps[1]; e->hasfig = 1; } } }
    { char mset[8], mnap[96]; snprintf(mset, sizeof mset, "%s", v_pstr(v_fmt("%s.moving.set", P))); snprintf(mnap, sizeof mnap, "%s", v_pstr(v_fmt("%s.moving.nap", P)));   /* a nap set: curl and curl·b1 from the nap atlas at the ink rect, breathing on its group tick */
      const mv_stage_t *MS = mset[0] ? moving_stage(mset, e->juvenile ? MV_JUV : !strcmp(v_pstr(v_fmt("%s.stage", P)), "elder") ? MV_ELDER : MV_ADULT) : NULL;
      if (MS && has(mnap) && MS->nw == bw && MS->nh == bh) {
        nap_t *z = &nk2[nn], *old = NULL; for (int j = 0; j < g_nnap && j < MAXS; j++) if (!strcmp(g_nap[j].id, e->id) && g_nap[j].seed == e->seed) old = &g_nap[j];
        if (old) *z = *old; else { memset(z, 0, sizeof *z); snprintf(z->id, sizeof z->id, "%s", e->id); z->seed = e->seed; z->ct = (int)(e->seed % (unsigned)loop_period(&MS->asleep)); }
        z->S = MS; snprintf(z->nap, sizeof z->nap, "%s", mnap); snprintf(z->set, sizeof z->set, "%s", mset); z->group = i & 1; z->w = bw; z->h = bh; z->x = e->draw[0]; z->y = e->draw[1];
        if (!motion) z->ct = 0;
        z->cell = loop_cell(&MS->asleep, z->ct); e->nap = nn++;
      } }
    g_ne++;
  }
  memcpy(g_nap, nk2, sizeof(nap_t) * (size_t)nn); g_nnap = nn;
  return g_ne;
}
static int ent_focused(const ent_t *e, const char *cur) { return !e->hidden && strncmp(cur, "resident.", 9) == 0 && strcmp(cur + 9, e->id) == 0; }

/* ---- a moving resident drawn in its slot (§2.3 item 8, UI/UX "Asleep in place" item 8): its shadow at the ground point (never lifted), the ring when focused, the picture (hidden while it dithers), the dither node, the lamp.
   In the asleep form the ring is the feet form on the ink box [fx − 48, feet − 88, 96, 88] and the lamp sits on the ink box's top right; the lift is 0. In the walker form, focused and stopped, the picture rises 4 px. ---- */
/* the cell of a moving resident whose footprint its ring takes (architect, fix 14): curl in the asleep form; shadow on a hop's air tick that shows shadow-75 (the ring stays on the ground, on the contact shadow's ink); else stand, "-m" when the shown cell is the mirrored one (facing against native) */
static const char *foot_cell(const mv_t *m, int asleep) { return asleep ? "curl" : m->sh75 ? "shadow" : m->facing != m->native ? "stand-m" : "stand"; }
static void mv_draw(const ent_t *e, int focused, int lift) {
  const mv_t *m = &g_m[e->mv]; const mv_stage_t *S = m->S; int asleep = mv_in_asleep_form(m);
  int up = focused && !asleep && m->clip != C_HOP && m->clip != C_WALK ? lift : 0;
  int b[4]; mv_box(m, b); b[1] -= up;
  if (has(m->shadow)) { v_name("resident.shadow"); v_sprite_window(v_fmt("g.%s.s", e->id), m->shadow, 1 + (m->sh75 ? 1 : 0) * S->sww, 0, m->x - m->fdx, m->feet - m->bo + m->h - S->swh, S->sww, S->swh); }
  if (focused) { int rb[4] = { m->x - m->fdx, m->feet - m->bo, m->w, m->h }; v_region("focus", LAYER_CHROME);
    if (m->hasfig && !asleep) word_focusRingFigure("focus", sp(), "focus.targets.resident", m->walk, m->x + m->fw / 2, m->feet, m->fw);   /* held still on the figure's feet while the cells animate; a hop keeps its F */
    else word_focusRingFootprint("focus", sp(), "focus.targets.resident", m->walk, foot_cell(m, asleep), rb); }   /* the footprint on the ground, not lifted */
  v_name("resident");
  if (m->dl) {
    v_sprite_hidden(v_fmt("g.%s", e->id), m->walk, b[0], b[1]);
    int ca = moving_shown(S, m->dfrom, m->facing, m->native), cb = moving_shown(S, m->dto, m->facing, m->native), D = m->ddf > m->ddt ? m->ddf : m->ddt, hh = m->h - (m->ddf > m->ddt ? m->ddf - m->ddt : m->ddt - m->ddf);
    int y0 = m->feet - m->bo - m->lift + D - up;   /* both cells at their own dy: the node starts at the lower of the two and drops the rows the other lacks */
    v_dither_window(v_fmt("g.%s.d", e->id), m->walk, 1 + ca * m->w, D - m->ddf, m->walk, 1 + cb * m->w, D - m->ddt, m->dl, m->x - m->fdx, y0, m->w, hh);
  } else v_sprite_window(v_fmt("g.%s", e->id), m->walk, 1 + mv_shown_cell(m) * m->w, 0, b[0], b[1], m->w, m->h);
  v_name("resident.lamp");
  if (asleep) build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->ink[0] + e->ink[2] - 12, e->ink[1], e->waiting);
  else build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, b[1] + m->fdy, e->waiting);
}
static void nap_draw(const ent_t *e) {
  const nap_t *z = &g_nap[e->nap]; int c = 0; for (int i = 0; i < z->S->nnap; i++) if (moving_walk_cell(z->S, z->S->ncell[i]) == z->cell) c = i;
  v_name("bed.sleepers"); v_sprite_window(v_fmt("g.%s", e->id), z->nap, 1 + c * z->w, 0, e->draw[0], e->draw[1], z->w, z->h);
  v_name("bed.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, e->box[1], e->waiting);
}

/* ---- a rester on the bed (R4b): drawn as a sleeper once its walker rests there ---- */
static int sleeper_nodes(const ent_t *e) { return e->hidden ? 0 : e->nap >= 0 ? 1 : has(e->pic); }
static void sleeper_draw(const ent_t *e) {
  if (e->hidden) return;
  if (e->nap >= 0) { nap_draw(e); return; }
  v_name("bed.sleepers"); v_sprite(v_fmt("g.%s", e->id), e->pic, e->draw[0], e->draw[1], e->draw[2], e->draw[3]); v_name("bed.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, e->box[1], e->waiting);
}

/* the focused one's name tag: below the ring at feetY + 16 and, past the window's foot, over the figure at feetY − H − 32 less the lift; a sleeper's, or one asleep in place, is always over its ink, 32 above its top, with no lift */
static void ent_tag(const ent_t *e, const char *glass) {
  int tag[4], below = v_si(sp(), hp("regions.nameTag.below"), 16), over = v_si(sp(), hp("regions.nameTag.over"), 32), lift = v_si(sp(), hp("regions.resident.lift"), 4);
  const char *fill = v_scol(sp(), "colours.nameTag.fill"), *edge = v_scol(sp(), "colours.nameTag.edge");
  if (e->sleeper || e->curled) { const int *b = e->hasfig ? e->box : e->draw; kit_nameTag(sp(), glass, e->name, b, 0, b[1] - over, KIT_TAG_OVER, 0, fill, edge, NULL, tag); }
  else if (e->asleep) kit_nameTag(sp(), glass, e->name, e->ink, 0, e->ink[1] - over, KIT_TAG_OVER, 0, fill, edge, NULL, tag);
  else { int feetY = e->box[1] + e->box[3] - 1; kit_nameTag(sp(), glass, e->name, e->box, feetY + below, feetY - e->box[3] - over - lift, KIT_TAG_AUTO, 0, fill, edge, NULL, tag); }
}

/* ---- the collection v2 room view's extras (the collection v2 design §3, §6): the hand, the drop spots, the reserved silhouettes, the mark discs and the pick frame ---- */
typedef struct { int ok, fx, feet, self, other; } hand_t;   /* the ground point the hand is over (a drop spot or a mibi's feet), whether it is the carried one's own point, and the mibi under it (an index into g_e, or -1) */
static int g_vnudge[2];   /* the ring's nudge (a press with nothing beyond, vivarium.c): dx, dy */
void home_viv_nudge(int dx, int dy) { g_vnudge[0] = dx; g_vnudge[1] = dy; }
static int carry_lift(void) { return v_si("vivarium", "regions.resident.carry.lift", 8); }
static int ent_index(const char *id) { for (int i = 0; i < g_ne; i++) if (!strcmp(g_e[i].id, id)) return i; return -1; }
static hand_t hand_of(const char *cur) {
  hand_t h = { 0, 0, 0, 0, -1 }; const char *cid = v_pstr("regions.carry.id"); if (!g_viv || !*cid) return h;
  if (strncmp(cur, "drop.", 5) == 0) { h.ok = room_drop(atoi(cur + 5), &h.fx, &h.feet) == 0; return h; }
  if (strncmp(cur, "resident.", 9) == 0) { int i = ent_index(cur + 9); if (i < 0 || g_e[i].hidden) return h; const ent_t *e = &g_e[i];
    h.ok = 1; h.fx = e->box[0] + e->box[2] / 2; h.feet = e->box[1] + e->box[3] - 1; h.self = !strcmp(cur + 9, cid); h.other = h.self ? -1 : i; }
  return h;
}
/* ✓ while a mibi is in hand (vivarium.c, before the intent): where it is set down, the hand's ground point, and in a swap of this room the other one at the point the carried one left; applied once the props have no carry */
void home_viv_setdown(const char *cur) {
  g_nplace = 0; int was = g_viv; g_viv = 1; hand_t hd = hand_of(cur); const char *cid = v_pstr("regions.carry.id"); int ce = *cid ? ent_index(cid) : -1; g_viv = was;
  if (!hd.ok || hd.self) return;
  snprintf(g_place[0].id, sizeof g_place[0].id, "%s", cid); g_place[0].fx = hd.fx; g_place[0].feet = hd.feet; g_nplace = 1;
  if (hd.other >= 0 && ce >= 0) { const ent_t *c = &g_e[ce]; snprintf(g_place[1].id, sizeof g_place[1].id, "%s", g_e[hd.other].id); g_place[1].fx = c->box[0] + c->box[2] / 2; g_place[1].feet = c->box[1] + c->box[3] - 1; g_nplace = 2; }
}
void home_viv_noplace(void) { g_nplace = 0; }
/* the mark disc on a figure's ink (§6): [ink right − 14, ink top − 8, 20, 20], clamped inside the window; the 16 x 16 master (the lamp at 12) centred on it */
static int disc_nodes(const char *mark) { return mark && *mark && has(mark) ? 2 : 0; }
static void disc_draw(const char *id, const char *mark, const int ink[4], const int g[4]) {
  if (!disc_nodes(mark)) return;
  int x = ink[0] + ink[2] - 14, y = ink[1] - 8, ms[2] = { 16, 16 };
  if (x < g[0]) x = g[0]; if (y < g[1]) y = g[1]; if (x + 20 > g[0] + g[2]) x = g[0] + g[2] - 20; if (y + 20 > g[1] + g[3]) y = g[1] + g[3] - 20;
  char ops[160]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,20,20,10,\"%s\",\"%s\"]]", v_scol("vivarium", "colours.markDisc.fill"), v_scol("vivarium", "colours.markDisc.rim"));
  v_region("marks", LAYER_CHROME); v_composed(v_fmt("%s.disc", id), x, y, 20, 20, ops); v_asset_size(mark, ms); v_slot(v_fmt("%s.mark", id), mark, NULL, x + (20 - ms[0]) / 2, y + (20 - ms[1]) / 2, ms[0], ms[1], 1);
}
/* the pick of two's frame (§3): a 1 px bone outline round the first parent's figure, 3 px out, which follows it */
static int pick_nodes(const ent_t *e) { return g_viv && *v_pstr("regions.pick.id") && !strcmp(v_pstr("regions.pick.id"), e->id) ? 1 : 0; }
static void pick_draw(const ent_t *e, int up) {
  if (!pick_nodes(e)) return; const int *b = e->hasfig ? e->box : e->draw; int x = b[0] - 3, y = b[1] - 3 - up, w = b[2] + 6, h = b[3] + 6; char ops[200]; const char *c = v_scol("vivarium", "colours.pick");
  snprintf(ops, sizeof ops, "[[\"h\",0,0,%d,\"%s\"],[\"h\",0,%d,%d,\"%s\"],[\"v\",0,0,%d,\"%s\"],[\"v\",%d,0,%d,\"%s\"]]", w, c, h - 1, w, c, h, c, w - 1, h, c);
  v_region("pick", LAYER_CHROME); v_composed(v_fmt("g.%s.pick", e->id), x, y, w, h, ops);
}
/* the reserved silhouettes (a mibi coming out on its drop spot): their figures' boxes, for the sort and the focus */
#define MAXRES 8
typedef struct { char id[24], name[40], pic[96], mark[64]; int box[4], draw[4]; } res_t;
static res_t g_res[MAXRES]; static int g_nres2;
static void res_load(void) {
  g_nres2 = 0; if (!g_viv) return;
  int n = v_plen("regions.reserved.items"); if (n > MAXRES) n = MAXRES;
  for (int i = 0; i < n; i++) { res_t *r = &g_res[g_nres2]; const char *P = v_fmt("regions.reserved.items.%d", i); char base[48]; snprintf(base, sizeof base, "%s", P);
    int fx, feet; if (room_drop(v_pint(v_fmt("%s.spot", base), 0), &fx, &feet) != 0) continue;
    snprintf(r->id, sizeof r->id, "%s", v_pstr(v_fmt("%s.id", base))); snprintf(r->name, sizeof r->name, "%s", v_pstr(v_fmt("%s.name", base))); snprintf(r->pic, sizeof r->pic, "%s", v_pstr(v_fmt("%s.picture", base))); snprintf(r->mark, sizeof r->mark, "%s", v_pstr(v_fmt("%s.mark", base)));
    int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("%s.figure.%d", base, q), 0);
    int ps[2] = { f[0] + f[2], f[1] + f[3] }; v_asset_size(r->pic, ps);
    r->box[0] = fx - f[2] / 2; r->box[1] = feet + 1 - f[3]; r->box[2] = f[2]; r->box[3] = f[3]; r->draw[0] = r->box[0] - f[0]; r->draw[1] = r->box[1] - f[1]; r->draw[2] = ps[0]; r->draw[3] = ps[1]; g_nres2++; }
}
int home_viv_box(const char *id, int r[4]) {   /* a room-view target's box as the last draw put it: a resident (or a reserved silhouette) by its figure, a drop spot by its ellipse, a flip at the field's edge; 0 when there is none */
  int g[4]; v_srect("vivarium", "regions.window.rect", g);
  if (strncmp(id, "resident.", 9) == 0) { for (int e = 0; e < g_ne; e++) if (!strcmp(g_e[e].id, id + 9) && !g_e[e].hidden) { memcpy(r, g_e[e].box, sizeof(int) * 4); return 1; } for (int k = 0; k < g_nres2; k++) if (!strcmp(g_res[k].id, id + 9)) { memcpy(r, g_res[k].box, sizeof(int) * 4); return 1; } return 0; }
  if (strncmp(id, "drop.", 5) == 0) { int fx, feet; if (room_drop(atoi(id + 5), &fx, &feet) != 0) return 0; r[0] = fx - 32; r[1] = feet - 5; r[2] = 64; r[3] = 10; return 1; }
  if (!strcmp(id, "flip.prev")) { r[0] = g[0]; r[1] = g[1]; r[2] = 1; r[3] = g[3]; return 1; }
  if (!strcmp(id, "flip.next")) { r[0] = g[0] + g[2] - 1; r[1] = g[1]; r[2] = 1; r[3] = g[3]; return 1; }
  return 0;
}

/* ---- the glass: the room's back pieces over the base, then residents, the bed and the room's occluders in the order of their feet, clipped to the glass; the focused one last: its feet ring, then it ---- */
typedef struct { int kind; int ent; } item_t;   /* kind 0: a resident; 1: the bed group (the bed, then its sleepers right to left); 2: the focused resident or sleeper, drawn last under its ring; 3: an occluder (ent: its index in room_pieces); 4: a reserved silhouette (ent: its index in g_res); 5: the hand (the carried mibi over the hand's target) */
static int piece_in(const rp_t *p, const int g[4]) { return p->x < g[0] + g[2] && p->x + p->w > g[0] && p->y < g[1] + g[3] && p->y + p->h > g[1]; }   /* a piece that falls in the glass: Home draws the pieces in its window, clipped */
/* a piece drawn: its picture is on the face and it falls in the glass (a back piece with an opacity is drawn with it: prim_sprite_opa) */
static int piece_drawn(const rp_t *p, const int g[4]) { return has(p->pic) && piece_in(p, g); }
static void glass_group(const char *cur) {
  int glass[4], bed[4]; v_srect(sp(), hp("regions.glass.rect"), glass); v_srect(sp(), hp("regions.bed.rect"), bed);
  const rp_t *bk, *oc; int nbk = room_pieces(RP_BACK, &bk), noc = room_pieces(RP_OCCLUDER, &oc);
  item_t it[MAXR + 2 + 8 + MAXRES + 1]; int ni = 0, focused = -1;
  res_load();
  hand_t hd = hand_of(cur); int ce = g_viv && *v_pstr("regions.carry.id") ? ent_index(v_pstr("regions.carry.id")) : -1;   /* the carried one, when it is in this room's residents (its own room) */
  const char *outline = v_pstr("regions.carry.outline"); char outl[96]; snprintf(outl, sizeof outl, "%s", outline);
  if (ce >= 0 && g_e[ce].hidden) ce = -1;
  for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) focused = i;
  if (g_viv && *v_pstr("regions.carry.id")) focused = hd.ok && hd.self ? ce : -1;   /* while carrying the hand is the focus: the carried one raised at its own point, or over another target (the hand item) */
  for (int i = 0; i < g_ne; i++) if (!g_e[i].sleeper && !g_e[i].hidden && i != focused) it[ni++] = (item_t){ 0, i };
  int hasBed = !g_home && *v_pstr("regions.bed.state") != 0;   /* Home has no bed: the bed and its sleepers are the Vivarium's, and only in a room that has one */
  if (hasBed) it[ni++] = (item_t){ 1, -1 };
  for (int k = 0; k < noc && ni < MAXR + 2 + 8 - 1; k++) if (piece_drawn(&oc[k], glass)) it[ni++] = (item_t){ 3, k };
  for (int k = 0; k < g_nres2; k++) it[ni++] = (item_t){ 4, k };
  /* by the feet's y, lower in front (later); on a tie an occluder in front of what is not one, else left first; the bed group sorts at the bed's foot */
  int bedFoot = v_sk(sp(), hp("regions.glass.foot"), 1);
#define FOOT(q) ((q).kind == 3 ? oc[(q).ent].foot + 1 : (q).kind == 4 ? g_res[(q).ent].box[1] + g_res[(q).ent].box[3] : (q).kind ? bedFoot : g_e[(q).ent].box[1] + g_e[(q).ent].box[3])
#define LEFT(q) ((q).kind == 3 ? oc[(q).ent].x : (q).kind == 4 ? g_res[(q).ent].box[0] : (q).kind ? bed[0] : g_e[(q).ent].box[0])
  for (int a = 1; a < ni; a++) { item_t t = it[a]; int b = a - 1;
    int fa = FOOT(t), xa = LEFT(t);
    while (b >= 0) { int fb = FOOT(it[b]), xb = LEFT(it[b]);
      if (fb < fa || (fb == fa && ((it[b].kind == 3) != (t.kind == 3) ? t.kind == 3 : xb <= xa))) break; it[b + 1] = it[b]; b--; }
    it[b + 1] = t; }
#undef FOOT
#undef LEFT
  if (focused >= 0) it[ni++] = (item_t){ 2, focused };
  int handItem = g_viv && *v_pstr("regions.carry.id") && hd.ok && !hd.self; if (handItem) it[ni++] = (item_t){ 5, -1 };
  /* the drop spots while a mibi is in hand: on the ground, under every figure */
  int nd = g_viv && *v_pstr("regions.carry.id") ? v_plen("regions.drops.items") : 0; if (nd < 0) nd = 0;
  /* the nodes inside the clip, counted before they are sent */
  int count = 0, lift = v_si(sp(), hp("regions.resident.lift"), 4), cl = g_viv ? carry_lift() : 0;
  for (int k = 0; k < nbk; k++) count += piece_drawn(&bk[k], glass);
  count += nd;
  int bedPic = hasBed ? has(v_pstr("regions.bed.picture")) : 0, lampN = wire_has_asset(home_lamp_pic("waiting")) ? 1 : 0;   /* a waiting lamp is one node (its picture, or the same node with no size) when the host has sent the picture */
  const char *cpic = v_pstr("regions.carry.picture"); char cpicb[96]; snprintf(cpicb, sizeof cpicb, "%s", cpic); char cmark[64]; snprintf(cmark, sizeof cmark, "%s", v_pstr("regions.carry.mark"));
  for (int k = 0; k < ni; k++) {
    if (it[k].kind == 3) count++;
    else if (it[k].kind == 4) count += has(g_res[it[k].ent].pic) + disc_nodes(g_res[it[k].ent].mark);
    else if (it[k].kind == 5) count += 1 + has(cpicb) + disc_nodes(cmark);
    else if (it[k].kind != 1) { const ent_t *e = &g_e[it[k].ent]; int sil = it[k].ent == ce && it[k].kind == 0;
      if (e->mv >= 0) { const mv_t *m = &g_m[e->mv]; count += 1 + (has(m->shadow) ? 1 : 0) + (m->dl ? 1 : 0) + lampN + (it[k].kind == 2 ? 1 : 0); }   /* a moving resident: its shadow, the picture (hidden while it dithers), the dither node, the lamp */
      else if (e->nap >= 0) count += 1 + lampN + (it[k].kind == 2 ? 1 : 0);
      else count += (sil ? has(outl) : has(e->pic)) + lampN + (it[k].kind == 2 ? 1 : 0);
      if (!sil && g_viv) count += disc_nodes(e->mark) + pick_nodes(e); }
    else { count += bedPic; for (int i = 0; i < g_ne; i++) if (g_e[i].sleeper && !g_e[i].hidden && i != focused) count += sleeper_nodes(&g_e[i]) + lampN + (g_viv ? disc_nodes(g_e[i].mark) + pick_nodes(&g_e[i]) : 0); }
  }
  if (count == 0) return;
  v_clip_box("glass.clip", glass[0], glass[1], glass[2], glass[3], count);
  /* the room's back pieces, in data order, over the base and under every walker, never sorted: a stable node p.<pieceId> each */
  for (int k = 0; k < nbk; k++) if (piece_drawn(&bk[k], glass)) { v_name("room"); prim_sprite_opa(bk[k].opa); v_slot(v_fmt("p.%s", bk[k].id), bk[k].pic, NULL, bk[k].x, bk[k].y, bk[k].w, bk[k].h, 1); }
  for (int q = 0; q < nd; q++) { int k = v_pint(v_fmt("regions.drops.items.%d", q), 0), fx = 0, feet = 0; room_drop(k, &fx, &feet); char ops[96]; snprintf(ops, sizeof ops, "[[\"oval\",0,0,64,10,\"%s\"]]", v_scol("vivarium", "colours.drop")); v_region("drops", LAYER_CHROME); v_composed(v_fmt("drop.%d", k), fx - 32, feet - 5, 64, 10, ops); }
  /* the nodes are named by the mibi (g.<id>, g.<id>.lamp, g.bed, g.bed.mark) and by the piece (p.<pieceId>): when two items change places in depth the objects change places in the order and only where they overlap is redrawn
     (prim.c move_to), an item that did not step is not redrawn */
  for (int k = 0; k < ni; k++) {
    if (it[k].kind == 3) { const rp_t *o = &oc[it[k].ent]; v_name("room"); v_slot(v_fmt("p.%s", o->id), o->pic, NULL, o->x, o->y, o->w, o->h, 1); continue; }
    if (it[k].kind == 4) { const res_t *r = &g_res[it[k].ent]; v_name("reserved"); if (has(r->pic)) v_slot(v_fmt("r.%s", r->id), r->pic, NULL, r->draw[0], r->draw[1], r->draw[2], r->draw[3], 1); disc_draw(v_fmt("r.%s", r->id), r->mark, r->box, glass); continue; }
    if (it[k].kind == 5) {   /* the hand: the carried one over the target, raised by the carry's lift, its ring with it */
      int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("regions.carry.figure.%d", q), 0);
      int ps[2] = { f[0] + f[2], f[1] + f[3] }; v_asset_size(cpicb, ps);
      int bx = hd.fx - f[2] / 2, by = hd.feet + 1 - f[3] - cl, box[4] = { bx, by, f[2], f[3] };
      v_region("focus", LAYER_CHROME); word_focusRingFigure("focus", sp(), "focus.targets.resident", cpicb, hd.fx + g_vnudge[0], hd.feet - cl + g_vnudge[1], f[2]);
      v_name("resident"); if (has(cpicb)) v_slot(v_fmt("g.%s.hand", v_pstr("regions.carry.id")), cpicb, NULL, bx - f[0], by - f[1], ps[0], ps[1], 1);
      disc_draw(v_fmt("g.%s.hand", v_pstr("regions.carry.id")), cmark, box, glass); continue; }
    if (it[k].kind != 1) {
      const ent_t *e = &g_e[it[k].ent];
      if (e->mv >= 0) { mv_draw(e, it[k].kind == 2, lift); if (g_viv) { disc_draw(v_fmt("g.%s", e->id), e->mark, e->box, glass); pick_draw(e, 0); } continue; }
      if (e->nap >= 0) { if (it[k].kind == 2) { const nap_t *z = &g_nap[e->nap]; int rb[4] = { e->draw[0], e->draw[1], z->w, z->h }; v_region("focus", LAYER_CHROME); word_focusRingFootprint("focus", sp(), "focus.targets.resident", z->nap, "curl", rb); } nap_draw(e); if (g_viv) { disc_draw(v_fmt("g.%s", e->id), e->mark, e->hasfig ? e->box : e->draw, glass); pick_draw(e, 0); } continue; }
      int sil = it[k].ent == ce && it[k].kind == 0;   /* the carried one, the hand elsewhere: its 1 px fog silhouette at the point it left */
      int up = it[k].kind == 2 && !e->sleeper && !e->curled ? (it[k].ent == ce ? cl : lift) : 0, y = e->draw[1] - up, ly = e->box[1] - up;
      if (it[k].kind == 2) { v_region("focus", LAYER_CHROME);
        if (e->hasfig) word_focusRingFigure("focus", sp(), "focus.targets.resident", e->pic, e->box[0] + e->box[2] / 2 + g_vnudge[0], e->box[1] + e->box[3] - 1 - (it[k].ent == ce ? cl : 0) + g_vnudge[1], e->box[2]);   /* the ring on the figure's feet, never lifted (raised with a carried one) */
        else { int rb[4]; memcpy(rb, e->draw, sizeof rb); rb[0] += g_vnudge[0]; rb[1] += g_vnudge[1]; word_focusRingFootprint("focus", sp(), "focus.targets.resident", e->pic, "", rb); } }
      v_name(e->sleeper ? "bed.sleepers" : sil ? "carry.from" : "resident"); v_sprite(v_fmt("g.%s", e->id), sil ? outl : e->pic, e->draw[0], y, e->draw[2], e->draw[3]);   /* a slot is a picture and its waiting lamp, the same two nodes every draw */
      v_name(e->sleeper ? "bed.lamp" : "resident.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, ly, e->waiting);
      if (g_viv && !sil) { int ink[4] = { e->box[0], e->box[1] - up, e->box[2], e->box[3] }; disc_draw(v_fmt("g.%s", e->id), e->mark, e->hasfig ? ink : e->draw, glass); pick_draw(e, up); }
    } else {
      v_name("bed"); v_sprite("g.bed", v_pstr("regions.bed.picture"), bed[0], bed[1], bed[2], bed[3]);
      for (int i = g_ne - 1; i >= 0; i--) if (g_e[i].sleeper && i != focused) {   /* right to left: the first rester is drawn last, in front */
        sleeper_draw(&g_e[i]); if (g_viv && !g_e[i].hidden) { disc_draw(v_fmt("g.%s", g_e[i].id), g_e[i].mark, g_e[i].hasfig ? g_e[i].box : g_e[i].draw, glass); pick_draw(&g_e[i], 0); }
      }
    }
  }
}

/* a step of the residents' walk is due (the redraw every STEP_MS while any resident walks) */
int home_tick(uint32_t now) {
  int lib = library_tick(now);   /* the Library's swap or glint step is due: Home is drawn again, the residents held on a swap frame (walk_clock) */
  int idle = v_pbool("idle", 0);
  int home = strcmp(v_pstr("screen"), "home") == 0;
  if ((strcmp(v_pstr("screen"), "vivarium") != 0 && !idle && !home) || !spec_has(idle ? "frame" : home ? "home" : "vivarium") || !v_pbool("motion", 1) || v_plen("regions.residents") <= 0) return lib;
  if (!g_have_t0) return lib;
  if (!((long)((now - g_t0) / STEP_MS) + 1 > g_wticks)) return lib;   /* no group tick is due that the walk has not applied */
  if (g_nw > 0 || !(g_nm || g_nnap)) return 1;   /* a still walks: every tick draws, as before */
  return walk_clock(now) > 0 || lib;   /* only moving residents: the tick is applied here and a frame asked only when something changed (§2.3 item 10: a night Idle of sleepers draws a few times a second, not 25) */
}
/* test hooks (face.c): a moving resident by its index among the props' residents */
static const mv_t *mv_at(int i) { for (int k = 0; k < g_nm; k++) if (g_m[k].idx == i) return &g_m[k]; return NULL; }
int home_test_cell(int i) { const mv_t *m = mv_at(i); return m ? (m->dl ? -1 - (m->dl) : mv_shown_cell(m)) : -100; }
int home_test_state(int i) {   /* a moving resident's clip | ..., and for every resident (a still: travelling only) its level lv << 16 and its leg << 20 (the rooms design §9) */
  const mv_t *m = mv_at(i);
  if (!m) { for (int k = 0; k < g_nw; k++) if (g_w[k].pi == i) return g_w[k].walking << 4 | g_w[k].lv << 16 | g_w[k].leg << 20; return -1; }
  return m->clip | mv_travelling(m) << 4 | mv_airborne(m) << 5 | (m->clip == C_ASLEEP || m->clip == C_CURL || m->clip == C_STIR) << 6 | m->wander << 7 | m->focus << 8 | m->phase << 12 | m->lv << 16 | m->leg << 20; }
int home_test_mv(int i, int field) {   /* 0 x, 1 feet, 2 facing, 3 lift, 4 dy, 5 dither level, 6 rested, 7 trip start (group tick), 8 waypoint x, 9 waypoint feet, 10 group, 11 shadow75, 12 the walk's group ticks */
  if (field == 12) return (int)g_wticks;
  const mv_t *m = mv_at(i); if (!m) return -100000;
  switch (field) { case 0: return m->x; case 1: return m->feet; case 2: return m->facing; case 3: return m->lift; case 4: return m->dy; case 5: return m->dl; case 6: return m->rested; case 7: return (int)m->trip_start; case 8: return m->wx; case 9: return m->wf; case 10: return m->group; case 11: return m->sh75; default: return -100000; }
}
int home_test_rest(int i, int field) {   /* R4b: a resident by its index among the props': 0 rest phase (RS_*), 1 where it rests (RK_*), 2 shown, 3 hidden (out of sight), 4 x, 5 feet, 6 walking, 7 level, 8 foot x, 9 the curl's ink width, 10 the figure's height, 11 its width (R4b-1b), -1 unknown */
  const wk_t *k = NULL; const mv_t *m = mv_at(i); for (int q = 0; q < g_nw; q++) if (g_w[q].pi == i) k = &g_w[q];
  if (!k && !m) return -100000;
  int rs = m ? m->rs : k->rs, rk = m ? m->rk : k->rk, sh = m ? m->sh : k->sh, x = m ? m->x : k->x, f = m ? m->feet : k->feet, wl = m ? mv_travelling(m) : k->walking, lv = m ? m->lv : k->lv;
  switch (field) { case 0: return rs; case 1: return rk; case 2: return sh; case 3: return rs == RS_REST && rk != RK_CURL; case 4: return x; case 5: return f; case 6: return wl; case 7: return lv; case 8: return x + (m ? m->fw : k->w) / 2; case 9: return m ? m->cw : k->cw; case 10: return m ? m->fh : k->h; case 11: return m ? m->fw : k->w; default: return -100000; }
}
int home_test_nap(int i) { return i >= 0 && i < g_nnap ? g_nap[i].cell : -1; }

/* ---- Idle (frame.json idle, station-layouts.md Idle): the whole 1024 x 600 with no frame: the Vivarium's painting (until its master the flat plates of idle.colours), the residents walking, the bed and the carried set asleep,
   and the one line on its strip. The same living-window code as the Vivarium's whole, on the frame spec's rectangles. ---- */
void idle_words(void) {
  g_idle = 1; library_reset(); ent_load("");   /* Idle has no Library module: Home's clock starts again when Home shows */
  word_livingWindow("frame", "vivarium", NULL, "idle.regions.vivarium", "idle.colours", v_pstr("regions.vivarium.picture"), 0, 0, NULL, 0);
  glass_group("");
  g_idle = 0;
}

/* ---- Home's Vivarium window (home.json regions.glass, regions.resident; build spec section 3): a 1:1 crop of Idle's painting of the light (columns cx .. cx + 603, rows 194 .. 555, cx = 64), its 2 px inner shade on the top and left, the residents at home
   (at most six) walking on the Vivarium's ground profile moved to this crop, with their contact shadows, the event tag on one mibi, and the away frame. The same living-window code as the whole's, on this spec's rectangles. Nothing in it is a focus target. ---- */
static int home_painted(void) { const char *pic = v_pstr("regions.glass.picture"); return pic && *pic && wire_asset_slot(pic) >= 0; }
int home_window_painted(void) { return home_painted(); }
static void away_frame(void) {
  const char *pic = v_pstr("regions.glass.away.picture"); if (!*pic) return;
  int r[4]; v_srect(sp(), hp("regions.away.rect"), r);
  char fill[24], edge[24], cap[40], col[24]; spec_str(H, "regions.away.fill", fill, sizeof fill); spec_str(H, "regions.away.edge", edge, sizeof edge); spec_str(H, "regions.away.caption.colour", col, sizeof col); spec_str(H, "strings.away", cap, sizeof cap);
  v_region("away", LAYER_CHROME);
  kit_panel("away", r[0], r[1], r[2], r[3], fill, edge, NULL, 0);
  if (has(pic) && v_plen("regions.glass.away.figure") == 4) {   /* the figure of its stand at its world size, bottom-centred inside the edge: its window of the picture, clipped to the frame's inside */
    int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("regions.glass.away.figure.%d", q), 0);
    int ix = r[0] + 1, iy = r[1] + 1, iw = r[2] - 2, ih = r[3] - 2, dx = ix + (iw - f[2]) / 2, dy = iy + ih - f[3];
    v_clip_box("away.clip", ix, iy, iw, ih, 1);
    v_name("away.figure"); v_sprite_window("away.figure", pic, f[0], f[1], dx, dy, f[2], f[3]);
  }
  v_region("away", LAYER_TYPE);
  { int px = v_si(sp(), hp("regions.away.caption.px"), 16), w = v_measure(cap, px), cx = v_si(sp(), hp("regions.away.caption.centre"), 588), y = v_si(sp(), hp("regions.away.caption.y"), 418);
    v_text("away.caption", cap, cx - (w + 1) / 2, y + (px == 16 ? 4 : 5), w, px, col); }   /* y is the line box's top: the cap top 4 under it at 16 px */
}
void home_window(void) {
  g_home = 1; ent_load("");
  int g[4]; v_srect(sp(), hp("regions.window.rect"), g); char shade[24]; spec_str(H, "regions.window.shade.colour", shade, sizeof shade);
  int painted = home_painted(), sx = v_sk(sp(), hp("regions.window.painting.at"), 0), sy = v_sk(sp(), hp("regions.window.painting.at"), 1), sp2 = v_si(sp(), hp("regions.window.shade.px"), 2);
  v_region("vivarium", LAYER_CHROME);
  if (painted) { v_name("vivarium"); v_sprite_window("vivarium.glass", v_pstr("regions.glass.picture"), sx, sy, g[0], g[1], g[2], g[3]); }
  v_rect("vivarium.shade.t", g[0], g[1], painted ? g[2] : 0, painted ? sp2 : 0, shade); v_rect("vivarium.shade.l", g[0], g[1], painted ? sp2 : 0, painted ? g[3] : 0, shade);   /* omitted on a placeholder: nodes of no size */
  glass_group("");
  { const char *tag = v_pstr("regions.glass.tag"); if (*tag) for (int i = 0; i < g_ne; i++) if (strcmp(g_e[i].id, tag) == 0) ent_tag(&g_e[i], "regions.window"); }
  away_frame();
  g_home = 0;
}

/* ---- The Vivarium's whole (vivarium.json, station-layouts.md "The Vivarium: the whole"): the living window edge to edge (its flat plates only while the whole's painting is not placed), every mibi at home walking in it, the with-you bed and its
   sleepers, the focused one's name tag, and the two slate panes along the foot (build_rooms, build_places: the room chips and the eight places of the room shown); no card, no module, no word in the window but the name tag. The same code as Home's
   glass and Idle's painting on the spec's own rectangles. The empty state (no mibi housed in the room shown) is the window, the rooms pane, the places pane's free places and the frame. While the room shown changes (events.swap, the dither of target
   `window`) the window and each place's thumbnail cross-dither from the old room's. ---- */
void home_viv_room(const char *cur) {   /* the room view's field (screens/vivarium.c draws the rest): the window of the room's painting at its crop, its mibis at one scale, the bed, the drop spots, the reserved silhouettes, the hand and the marks */
  g_viv = 1;
  ent_load(cur);
  { anim_state_t t; char from[96] = ""; int level = 16, c[2]; room_crop(v_pstr("regions.room.id"), c);   /* the swap: the window's painting from the old room's (the event's from), 16 levels over its 200 ms */
    if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "window", &t) && t.from_id[0] && t.ms > 0) { snprintf(from, sizeof from, "%s", t.from_id); level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; }
    word_livingWindow("vivarium", "window", NULL, "regions.window", "colours.window", v_pstr("regions.window.picture"), c[0], c[1], from[0] ? from : NULL, level); }   /* a 688 x 472 window of the room's painting at its crop, 1:1 */
  glass_group(cur);   /* the bed in the empty state too (no resident, no sleeper): the nest */
  if (*v_pstr("regions.carry.id")) {   /* the carried one's tag under it: at its own point, or over the hand's target */
    hand_t hd = hand_of(cur); int ce = ent_index(v_pstr("regions.carry.id"));
    if (hd.ok && hd.self && ce >= 0) ent_tag(&g_e[ce], "regions.window");
    else if (hd.ok) { ent_t t; memset(&t, 0, sizeof t); snprintf(t.name, sizeof t.name, "%s", v_pstr("regions.carry.name")); int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("regions.carry.figure.%d", q), 0);
      t.box[0] = hd.fx - f[2] / 2; t.box[1] = hd.feet + 1 - f[3] - carry_lift(); t.box[2] = f[2]; t.box[3] = f[3]; t.hasfig = 1; ent_tag(&t, "regions.window"); } }
  else for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) ent_tag(&g_e[i], "regions.window");
  { int k = -1; for (int q = 0; q < g_nres2; q++) if (strncmp(cur, "resident.", 9) == 0 && !strcmp(g_res[q].id, cur + 9)) k = q;   /* the ring on a reserved silhouette: its box's ring and its tag */
    if (k >= 0) { v_region("focus", LAYER_CHROME); int rb[4]; memcpy(rb, g_res[k].box, sizeof rb); rb[0] += g_vnudge[0]; rb[1] += g_vnudge[1]; word_focusRingFigure("focus", "vivarium", "focus.targets.resident", g_res[k].pic, rb[0] + rb[2] / 2, rb[1] + rb[3] - 1, rb[2]);
      ent_t t; memset(&t, 0, sizeof t); snprintf(t.name, sizeof t.name, "%s", g_res[k].name); memcpy(t.box, g_res[k].box, sizeof t.box); t.hasfig = 1; ent_tag(&t, "regions.window"); } }
  g_viv = 0;
}
