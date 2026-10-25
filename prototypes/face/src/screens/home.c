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
/* ---- the residents' walk (home.json regions.resident.walk, the UI/UX designer's ruling): integers only ----
   Resident k (props order, sleepers left out) is in group g = k mod 2 and steps at t = 80 m + 40 g ms of the face's time since the screen's first frame, 2 px along the major axis of its path (the minor axis by
   Bresenham), and at most one group tick is applied a frame (a later frame drops the time past it by moving the walk's origin later in whole ticks), so at most half of the boxes change in any frame. Its own 32-bit LCG runs from its seed. A focused resident stands on its pixel and its idle and walk freeze; with motion off it stands
   at its start. The walk state lives while the screen shows and starts again from the seeds when Home is shown again; a new id starts from its own seed, a props change with the same seed keeps the state. */
static int g_kx, g_ky, g_xlo, g_xhi, g_flo, g_fn;   /* home.json regions.resident.walk, read at each draw: the keep-out zone's corner, the box.x range 8 px inside the glass, the feet's rows of the ground band */
static int g_pn, g_pdx, g_pdy, g_px[8], g_pt[8];   /* the ground profile: band starts of F.x and the lowest feetY of each (vivarium.json regions.resident.walk.profile), g_pdy added */
static int ground_top(int fx) { int t = g_pt[0]; for (int i = 0; i < g_pn; i++) if (fx + g_pdx >= g_px[i]) t = g_pt[i]; return t + g_pdy; }   /* Home reads the whole's profile at x + dx, dy higher: groundTop_home(x) = groundTop_viv(x - 24 + cx) - 36 */
static void walk_load(void) {
  if (g_viv) {   /* the whole (vivarium.json regions.resident.walk): the box.x range is the walk ground's, 16..1008, and the keep-out is the spec's */
    g_kx = v_sk(sp(), hp("regions.resident.walk.keepOut"), 0); g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1);
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  } else if (g_idle) {   /* Idle (frame.json idle.regions.resident.walk): the box.x range is the walk ground's own, 16..1008, and the keep-out is the spec's, never derived from the window's rectangle */
    g_kx = v_sk(sp(), hp("regions.resident.walk.keepOut"), 0); g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1);
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  }
  else if (g_home) {   /* Home's window (home.json regions.resident.walk): the box.x range 32 .. 620, the keep-out only while the away frame shows (the corner's feet row is the rect's top less one: the feet reach it) */
    int away = *v_pstr("regions.glass.away.picture") != 0;
    g_kx = away ? v_sk(sp(), hp("regions.resident.walk.keepOut"), 0) : 1 << 20; g_ky = v_sk(sp(), hp("regions.resident.walk.keepOut"), 1) - 1;
    g_xlo = v_sk(sp(), hp("regions.resident.walk.ground"), 0); g_xhi = g_xlo + v_sk(sp(), hp("regions.resident.walk.ground"), 2);
  }
  g_flo = v_sk(sp(), hp("regions.resident.walk.ground"), 1); g_fn = v_sk(sp(), hp("regions.resident.walk.ground"), 3);
  /* the ground profile, the whole's and Idle's, 80 px lower on Idle */
  g_pn = 0; g_pdx = 0; g_pdy = 0;
  if (g_viv || g_idle || g_home) { g_pdy = g_idle ? spec_int("vivarium", "regions.resident.walk.profile.idle", 80) : g_home ? v_si(sp(), hp("regions.resident.walk.profile.dy"), 0) : 0; if (g_home) g_pdx = v_si(sp(), hp("regions.resident.walk.profile.dx"), 0);
    int n = spec_len("vivarium", "regions.resident.walk.profile.x"); if (n > 8) n = 8;
    for (int i = 0; i < n; i++) { g_px[i] = spec_int("vivarium", v_fmt("regions.resident.walk.profile.x.%d", i), 0); g_pt[i] = spec_int("vivarium", v_fmt("regions.resident.walk.profile.top.%d", i), 0); g_pn = i + 1; } }}
typedef struct { char id[24]; unsigned seed, s; int w, h, x, feet, facing, walking, idle, wx, wy, x0, y0, nstep, step; long done; int live; } wk_t;
static wk_t g_w[MAXR]; static int g_nw; static uint32_t g_t0; static int g_have_t0;
static long g_wticks;   /* the walk's group ticks applied since its origin g_t0: tick j is at 40 j ms and steps group j mod 2 */
static int g_ctx = -1;   /* the walk's last context (0 none, 1 Idle, 2 the Vivarium's whole): it starts again from the seeds when the other shows */
void home_hidden(void) { g_have_t0 = 0; g_ctx = -1; library_reset(); }   /* the moving household starts again from the seeds too (No replay) */
static unsigned wr(wk_t *k) { k->s = k->s * 1664525u + 1013904223u; return k->s >> 16; }
static int meets_k(int x, int feet, int w) { return x + w > g_kx && feet > g_ky; }
/* a figure box at x (its left) with width w and its feet row is walkable when the feet are at or below the ground profile at F.x = x + w/2 (always, with no profile) */
static int walkable(int x, int feet, int w) { return !g_pn || feet >= ground_top(x + w / 2); }
static void draw_point(wk_t *k, int *x, int *feet) { *x = g_xlo + (int)(wr(k) % (unsigned)(g_xhi - k->w - g_xlo + 1)); *feet = g_flo + (int)(wr(k) % (unsigned)g_fn); }
static int path_clear(const wk_t *k, int x1, int f1) {   /* every box along the straight path stays out of the keep-out zone */
  int dx = x1 - k->x, dy = f1 - k->feet, M = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy), n = (M + 1) / 2;
  for (int i = 1; i <= n; i++) { int d = 2 * i > M ? M : 2 * i, ax = dx, ay = dy, ma = ax < 0 ? -ax : ax, mb = ay < 0 ? -ay : ay, px, py;
    if (ma >= mb) { px = k->x + (ax < 0 ? -d : d); py = k->feet + (ay < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { py = k->feet + (ay < 0 ? -d : d); px = k->x + (ax < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (meets_k(px, py, k->w)) return 0;
    if ((d % 8 == 0 || d == M) && !walkable(px, py, k->w)) return 0; }   /* the profile, sampled every 8 px along the major axis */
  return 1;
}
static void wk_init(wk_t *k, const char *id, unsigned seed, int w, int h) {
  memset(k, 0, sizeof *k); snprintf(k->id, sizeof k->id, "%s", id); k->seed = seed; k->s = seed; k->w = w; k->h = h; k->live = 1; k->done = 0;
  int x = 32, feet = 300, ok = 0;
  for (int i = 0; i < 8 && !ok; i++) { draw_point(k, &x, &feet); ok = !meets_k(x, feet, w) && walkable(x, feet, w); }
  if (!ok) { x = g_xlo; if (g_pn && feet < ground_top(x + w / 2)) feet = ground_top(x + w / 2); }   /* all eight failed: the box at the left end with the last feet, moved down to its column's groundTop */
  k->x = x; k->feet = feet; k->facing = (int)(wr(k) & 1u); k->idle = 25 + (int)(wr(k) % 38u); k->walking = 0;
}
static void wk_step(wk_t *k) {   /* one step of this resident's own time */
  if (!k->walking) {
    if (k->idle > 0) { k->idle--; }
    if (k->idle > 0) return;
    int wx = k->x, wf = k->feet, ok = 0;   /* idle is over: a waypoint, up to eight tries */
    for (int i = 0; i < 8 && !ok; i++) {
      draw_point(k, &wx, &wf); int dx = wx - k->x, dy = wf - k->feet, M = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy);
      ok = M >= 32 && !meets_k(wx, wf, k->w) && walkable(wx, wf, k->w) && path_clear(k, wx, wf);
    }
    if (!ok) { k->idle = 25 + (int)(wr(k) % 38u); return; }
    int dx = wx - k->x, M = (dx < 0 ? -dx : dx), dy = wf - k->feet, Mb = dy < 0 ? -dy : dy; if (Mb > M) M = Mb;
    if (dx) k->facing = dx > 0;
    k->walking = 1; k->wx = wx; k->wy = wf; k->x0 = k->x; k->y0 = k->feet; k->nstep = (M + 1) / 2; k->step = 0; return;
  }
  k->step++;
  { int dx = k->wx - k->x0, dy = k->wy - k->y0, ma = dx < 0 ? -dx : dx, mb = dy < 0 ? -dy : dy, M = ma > mb ? ma : mb, d = 2 * k->step > M ? M : 2 * k->step;
    if (ma >= mb) { k->x = k->x0 + (dx < 0 ? -d : d); k->feet = k->y0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { k->feet = k->y0 + (dy < 0 ? -d : d); k->x = k->x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (k->step >= k->nstep) { k->x = k->wx; k->feet = k->wy; k->walking = 0; k->idle = 25 + (int)(wr(k) % 38u); } }
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
  int rest, rested, wx, wf, x0, f0, M, nh, hop, tripd, arrived, settle_tried;
  int want, focus, focus_t, acked, deferred, stir_hold, pending_stir, wander, wander_left, wander_until, wander_wps;
  long flip_due, curl_end, trip_start;
} mv_t;
static mv_t g_m[MAXR]; static int g_nm;
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
static void mv_draw_point(mv_t *m, int xa, int xb, int fa, int fb, int *x, int *feet) {   /* a point in the window [xa, xb] × [fa, fb] (clipped to the band) by the resident's own LCG */
  int lo = g_xlo > xa ? g_xlo : xa, hi = (g_xhi - m->fw) < xb ? (g_xhi - m->fw) : xb, flo = g_flo > fa ? g_flo : fa, fhi = (g_flo + g_fn - 1) < fb ? (g_flo + g_fn - 1) : fb;
  if (hi < lo) hi = lo; if (fhi < flo) fhi = flo;
  *x = lo + (int)(mr(m) % (unsigned)(hi - lo + 1)); *feet = flo + (int)(mr(m) % (unsigned)(fhi - flo + 1));
}
static int mv_path_clear(const mv_t *m, int x1, int f1) { wk_t k; memset(&k, 0, sizeof k); k.x = m->x; k.feet = m->feet; k.w = m->fw; return path_clear(&k, x1, f1); }
static int mv_rest_len(mv_t *m) { return 25 + (int)(mr(m) % 38u); }
static void mv_place(mv_t *m, int x, int f) { m->x = x; m->feet = f; }
/* along the trip's line, d of M (the major axis by d, the minor by Bresenham, as the stills' walk) */
static void mv_along(mv_t *m, int d) {
  int dx = m->wx - m->x0, dy = m->wf - m->f0, ma = dx < 0 ? -dx : dx, mb = dy < 0 ? -dy : dy, M = ma > mb ? ma : mb; if (!M) { mv_place(m, m->wx, m->wf); return; } if (d > M) d = M;
  if (ma >= mb) mv_place(m, m->x0 + (dx < 0 ? -d : d), m->f0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)));
  else mv_place(m, m->x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)), m->f0 + (dy < 0 ? -d : d));
}
/* a trip: a waypoint (8 tries: ≥ 32 px, off the keep-out, a clear path, not in another sleeper's spot), within ±3·travel for a hopper or ±reach for a wanderer; facing on the cut */
static int mv_trip(mv_t *m, int reach) {
  int ok = 0, wx = m->x, wf = m->feet, r = reach > 0 ? reach : m->S->hopper ? 3 * m->S->hop_travel : 0;
  for (int i = 0; i < 8 && !ok; i++) {
    if (r > 0) mv_draw_point(m, m->x - r, m->x + r, m->feet - r, m->feet + r, &wx, &wf); else mv_draw_point(m, g_xlo, g_xhi, g_flo, g_flo + g_fn - 1, &wx, &wf);
    int dx = wx - m->x, dy = wf - m->feet, M = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy);
    ok = M >= 32 && (reach <= 0 || M <= reach) && !meets_k(wx, wf, m->fw) && walkable(wx, wf, m->fw) && mv_path_clear(m, wx, wf) && !spot_taken(m, wx, wf, m->fw);
  }
  if (!ok) return 0;
  int dx = wx - m->x, dy = wf - m->feet, ma = dx < 0 ? -dx : dx, mb = dy < 0 ? -dy : dy;
  m->wx = wx; m->wf = wf; m->x0 = m->x; m->f0 = m->feet; m->M = ma > mb ? ma : mb; if (dx) m->facing = dx > 0;
  m->lift = 0; m->dy = 0; m->sh75 = 0; m->arrived = 0; m->pt = 1;
  if (m->S->hopper) { m->clip = C_HOP; m->phase = P_CROUCH; m->hop = 1; m->nh = (m->M + m->S->hop_travel - 1) / m->S->hop_travel; if (m->nh < 1) m->nh = 1; m->cell = moving_walk_cell(m->S, "crouch"); }
  else { m->clip = C_WALK; m->tripd = 0; m->cell = m->S->cycle_cell[0]; m->lift = m->cell == moving_walk_cell(m->S, "pass") ? m->S->pass_rise : 0; }
  return 1;
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
      if (!m->settle_tried && spot_taken(m, m->x, m->feet, m->fw)) { m->settle_tried = 1; if (mv_trip(m, 0)) return; }
      mv_curl_begin(m); return;
    }
    if (m->wander && j >= m->wander_until && m->ct >= 2 * loop_period(&S->breathe) && mv_may_flip(m, j)) { mv_curl_begin(m); return; }   /* at least two breaths */   /* the wanderer's rest is over: it curls where it stands */
    if (m->focus && m->focus_t >= 3 && !m->acked && !mv_in_asleep_form(m)) { m->acked = 1; m->clip = C_ACK; m->pt = 1; m->cell = cr; m->ct = 0; return; }   /* G4: the ring still on it 3 ticks after focus: crouch, then stand */
    m->ct++; if (!m->focus) { m->rested++; if (m->rest > 0) m->rest--; }
    m->cell = loop_cell(&S->breathe, m->ct); return;
  case C_ACK:
    if (++m->pt > t80(S->ack_crouch)) mv_to_rest(m, 0); return;
  case C_HOP: {
    int nA = S->hop_nlift > 0 ? S->hop_nlift : 1;
    if (m->phase == P_CROUCH) {
      if (m->focus && m->hop >= 1 && !m->arrived) { m->cell = st; mv_to_rest(m, 1); return; }   /* focus: it stops on its next beat */
      if (++m->pt > t80(S->hop_crouch)) { if (!air_ok) { m->pt--; return; } m->phase = P_AIR; m->pt = 1; }
      else return;
    } else if (m->phase == P_AIR) { if (++m->pt > nA) { m->phase = P_LAND; m->pt = 1; m->lift = 0; m->sh75 = 0; m->cell = cr; return; } }
    else if (m->phase == P_LAND) { if (++m->pt > t80(S->hop_land)) {
        if (m->focus) { mv_to_rest(m, 1); return; }   /* under the ring it stops where the arc landed */
        m->phase = P_STAND; m->pt = 1; m->cell = st; } return; }
    else { if (++m->pt > t80(S->hop_stand)) { if (m->focus || m->hop >= m->nh) { mv_to_rest(m, 1); return; } m->hop++; m->phase = P_CROUCH; m->pt = 1; m->cell = cr; } return; }   /* each hop is crouch, air, land, stand; the trip ends on its waypoint after the last stand */
    /* an air tick: the lift from the table, the travel spread over the air ticks, d = M·((h − 1)·5 + j) / (nh·5) */
    m->cell = moving_walk_cell(S, "air"); m->lift = S->hop_lift[m->pt - 1]; m->sh75 = S->sh75[m->pt - 1];
    mv_along(m, m->M * ((m->hop - 1) * nA + m->pt) / (m->nh * nA)); return; }
  case C_WALK: {
    int pass = moving_walk_cell(S, "pass"), period = 0; for (int i = 0; i < S->cycle_n; i++) period += t80(S->cycle_ms[i]);
    if (m->arrived) { if (m->cell == pass) { m->lift = 0; mv_to_rest(m, 1); } else { m->cell = pass; m->lift = S->pass_rise; } return; }   /* arrival on a step cuts to pass, holds 80, then stand */
    if (m->focus) { m->arrived = 1; if (m->cell != pass) { m->cell = pass; m->lift = S->pass_rise; } else { mv_to_rest(m, 1); } return; }
    m->tripd++;
    { int d = m->tripd * S->stride * 80 / (2 * S->beat_mean); if (d >= m->M) { d = m->M; m->arrived = 1; } mv_along(m, d); }
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
      if (m->wander) { m->wander_wps = 1 + (int)(mr(m) % 2u); if (!mv_trip(m, v_si("vivarium", "rules.night.reach", 200))) m->wander_wps = 0; else m->wander_wps--; }
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
  int N = 0, trav = 0, air = 0, asleepN = 0, wanderUp = 0, allAsleep = g_nm > 0, settling = 0;
  for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->wander && !m->want && (m->clip == C_REST || m->clip == C_HOP || m->clip == C_WALK)) m->wander = 0;   /* a wanderer whose own rest flips to awake joins N where it stands */
    if (m->pending_stir && m->focus) { m->pending_stir = 0; g_hh.next_stir = j; }   /* a due stir never lands on a focused sleeper: it goes to another */ }
  for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (mv_awake(m) && !m->focus && !m->wander) N++; if (mv_travelling(m)) trav++; if (mv_airborne(m)) air++; if (m->clip == C_ASLEEP) asleepN++; if (m->wander) wanderUp = 1; if (!m->want) allAsleep = 0; if (m->clip != C_ASLEEP && m->want) settling = 1; }
  for (int i = 0, n = v_plen("regions.residents"); i < n; i++) if (strcmp(v_pstr(v_fmt("regions.residents.%d.rest", i)), "asleep") != 0) allAsleep = 0;   /* every resident at home asleep (a still has no rest: it is awake) */
  /* G7: the stir, one every 250–500 ticks across the household while one is asleep (none while one wanders, never a focused sleeper, never in the 20 s after its own curl, never the last one twice) */
  int s_lo = v_si("vivarium", "rules.night.stir.0", 250), s_hi = v_si("vivarium", "rules.night.stir.1", 500), w_lo = v_si("vivarium", "rules.night.wander.0", 3000), w_hi = v_si("vivarium", "rules.night.wander.1", 4500), after = v_si("vivarium", "rules.night.afterCurl", 250);
  if (!asleepN || wanderUp) { if (!asleepN) g_hh.next_stir = -1; }
  else {
    if (g_hh.next_stir < 0) g_hh.next_stir = j + 2L * (s_lo + (long)(hr() % (unsigned)(s_hi - s_lo + 1)));
    if (j >= g_hh.next_stir) {
      int el[MAXR], ne = 0;
      for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->clip == C_ASLEEP && !m->focus && !m->pending_stir && j - m->curl_end >= 2L * after && !(asleepN >= 2 && !strcmp(m->id, g_hh.last_stir))) el[ne++] = i; }
      if (ne) { mv_t *m = &g_m[el[hr() % (unsigned)ne]]; m->pending_stir = 1; snprintf(g_hh.last_stir, sizeof g_hh.last_stir, "%s", m->id); g_hh.next_stir = j + 2L * (s_lo + (long)(hr() % (unsigned)(s_hi - s_lo + 1))); }
    }
  }
  /* G7: the wanderer, when every resident is asleep and settled: every 3,000–4,500 ticks one wakes (juveniles first, then adults, never an elder, never the last one twice), from the end of the last curl */
  if (allAsleep && !settling && !wanderUp) {
    if (!g_hh.all_asleep) { g_hh.all_asleep = 1; g_hh.wander_at = (g_hh.last_curl_end > 0 ? g_hh.last_curl_end : j) + 2L * (w_lo + (long)(hr() % (unsigned)(w_hi - w_lo + 1))); }
    if (j >= g_hh.wander_at) {
      int el[MAXR], ne = 0, n2 = 0;
      for (int pass = 0; pass < 2 && !ne; pass++) { n2 = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].stage == pass && g_m[i].clip == C_ASLEEP) n2++;
        for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->stage == pass && m->clip == C_ASLEEP && !m->focus && !(n2 >= 2 && !strcmp(m->id, g_hh.last_wander))) el[ne++] = i; } }
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
    mv_t c = *m; int leaving = mv_airborne(m) && m->pt >= m->S->hop_nlift; if (leaving) air--;
    int ok = air < amax; int wasAir = mv_airborne(&c); mv_step(&c, j, ok); if (!wasAir && mv_airborne(&c)) air++;
    if (c.clip == C_REST && m->wander && c.wander && m->clip != C_REST) { /* arrived on a wanderer's waypoint: the next, or rest */ if (c.wander_wps > 0 && mv_trip(&c, v_si("vivarium", "rules.night.reach", 200))) c.wander_wps--; }
    at[i] = np; pr[np].i = i; pr[np].n = c; np++;
  }
  trav = 0; for (int i = 0; i < g_nm; i++) if (at[i] >= 0 ? mv_travelling(&pr[at[i]].n) : mv_travelling(&g_m[i])) trav++;
  int cap = (N + cdiv - 1) / cdiv; if (cap < cmin) cap = cmin; int fl = (N + fdiv - 1) / fdiv, tried[MAXR] = { 0 };
  /* the floor holds on every frame: a trip of the other group that ends on that group's next tick (40 ms on) is not counted toward the floor here, so its successor starts on this tick, never a tick late */
  int ending = 0; for (int i = 0; i < g_nm; i++) { const mv_t *m = &g_m[i]; if (m->group == grp || !mv_travelling(m)) continue;
    if ((m->clip == C_HOP && m->phase == P_STAND && m->pt + 1 > t80(m->S->hop_stand) && m->hop >= m->nh) || (m->clip == C_WALK && m->arrived && m->cell == moving_walk_cell(m->S, "pass"))) ending++; }
  for (int pass = 0; pass < 2; pass++) {   /* G10: rest run out, longest first, while travelling < cap; then rested ≥ minRest, longest first, while travelling < floor */
    for (;;) {
      if (pass == 0 ? trav >= cap : trav - ending >= fl || trav >= cap) break;
      int best = -1;
      for (int i = 0; i < g_nm; i++) { mv_t *m = &g_m[i]; if (m->group != grp || tried[i] || m->clip != C_REST || at[i] < 0 || pr[at[i]].n.clip != C_REST || m->focus || m->want || m->wander || !g_mv_motion) continue;
        const mv_t *q = &pr[at[i]].n; if (pass == 0 ? q->rest > 0 : q->rested < minrest) continue;   /* its rest as of this tick */
        if (best < 0 || q->rested > pr[at[best]].n.rested) best = i; }
      if (best < 0) break;
      tried[best] = 1; mv_t c = pr[at[best]].n;
      if (mv_trip(&c, 0)) { pr[at[best]].n = c; trav++; }
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
typedef struct { char id[24]; char name[40]; char pic[96], stand[96]; int juvenile, waiting, sleeper, box[4], draw[4], mv, nap, asleep, ink[4], rank, hasfig, curled, sbox[4]; unsigned seed; } ent_t;   /* hasfig: box is the figure's, draw the picture's; sbox: the slot a stand picture takes (the send-off) */   /* box: the focus target's; draw: where the picture goes; mv / nap: the moving resident or nap sleeper (-1: a still); asleep: the asleep form, ink its ink box */
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
  int x = 32, feet = 300, ok = 0;
  for (int i = 0; i < 8 && !ok; i++) { mv_draw_point(m, g_xlo, g_xhi, g_flo, g_flo + g_fn - 1, &x, &feet); ok = !meets_k(x, feet, m->fw) && walkable(x, feet, m->fw);
    if (ok && want) for (int k = 0; k < ne; k++) if (earlier[k].want && in_spot(&earlier[k], x + m->fw / 2, feet)) ok = 0; }   /* at screen show, asleep: not in an earlier sleeper's spot */
  if (!ok) { x = g_xlo; if (g_pn && feet < ground_top(x + m->fw / 2)) feet = ground_top(x + m->fw / 2); }
  m->x = x; m->feet = feet; m->facing = (int)(mr(m) & 1u); m->rest = mv_rest_len(m); m->rested = 0;
  if (want) mv_to_asleep(m, (int)(seed % (unsigned)loop_period(&S->asleep))); else { mv_to_rest(m, 0); m->ct = (int)(seed % (unsigned)loop_period(&S->breathe)); m->cell = loop_cell(&S->breathe, m->ct); }
}

static int ent_focused(const ent_t *e, const char *cur);
static int ent_load(const char *cur) {
  g_ne = 0; walk_load();
  int motion = v_pbool("motion", 1); uint32_t now = anim_now(); g_mv_motion = motion;
  { int ctx = g_viv ? 2 : g_idle ? 1 : g_home ? 3 : 0; if (g_ctx != ctx) { g_have_t0 = 0; g_ctx = ctx; } }
  if (!g_have_t0) { g_nw = 0; g_nm = 0; g_nnap = 0; g_t0 = now; g_wticks = 0; g_have_t0 = 1; memset(&g_hh, 0, sizeof g_hh); g_hh.next_stir = -1; }   /* Home shown again (home_hidden ran in between): the walks start from their seeds */
  if (motion) walk_clock(now);
  int nres = v_plen("regions.residents"); if (nres > MAXR) nres = MAXR;
  uint32_t rel = now - g_t0; wk_t kept[MAXR]; int nk = 0; mv_t mk[MAXR]; int nmk = 0;   /* the walk state is kept per resident id: found by id, a new id or a new seed starts from its seed, one that is gone is dropped */
  uint32_t ids = 2166136261u;
  for (int i = 0; i < nres; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.residents.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 0; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0); e->mv = -1; e->nap = -1; e->asleep = 0;
    const char *sz = e->juvenile ? "regions.resident.juvenile" : "regions.resident.adult"; int w = v_sk(sp(), hp(sz), 0), h = v_sk(sp(), hp(sz), 1);
    /* a moving set (M1 §2.2): { set, walk, shadow } with the set loaded, its stage present at this size and its walk atlas sent; else a still */
    char mset[8], mwalk[96], mshadow[96]; snprintf(mset, sizeof mset, "%s", v_pstr(v_fmt("%s.moving.set", P))); snprintf(mwalk, sizeof mwalk, "%s", v_pstr(v_fmt("%s.moving.walk", P))); snprintf(mshadow, sizeof mshadow, "%s", v_pstr(v_fmt("%s.moving.shadow", P)));
    const char *stg = v_pstr(v_fmt("%s.stage", P)); int stage = !strcmp(stg, "juvenile") ? MV_JUV : !strcmp(stg, "elder") ? MV_ELDER : MV_ADULT;
    const mv_stage_t *MS = mset[0] ? moving_stage(mset, stage) : NULL;
    if (MS && has(mwalk) && MS->ww == w && MS->wh == h && nmk < MAXR) {
      int want = strcmp(v_pstr(v_fmt("%s.rest", P)), "asleep") == 0;
      mv_t *old = NULL; for (int j = 0; j < g_nm; j++) if (!strcmp(g_m[j].id, e->id) && g_m[j].seed == e->seed && !strcmp(g_m[j].set, mset) && g_m[j].stage == stage) old = &g_m[j];
      mv_t *m = &mk[nmk]; int fig[4], hf = 0;   /* the atlas's figure, when the props give one inside the cell */
      if (v_plen(v_fmt("%s.figure", P)) == 4) { for (int q = 0; q < 4; q++) fig[q] = v_pint(v_fmt("%s.figure.%d", P, q), -1); hf = fig[0] >= 0 && fig[1] >= 0 && fig[2] > 0 && fig[3] > 0 && fig[0] + fig[2] <= w && fig[1] + fig[3] <= h; }
      if (old) { *m = *old; if (m->want != want) { m->want = want; m->flip_due = (long)g_wticks; m->settle_tried = 0; } }
      else mv_init(m, e->id, e->seed, mset, stage, MS, w, h, hf ? fig : NULL, want, mk, nmk);
      if (old) { m->hasfig = hf; m->fw = hf ? fig[2] : w; m->fh = hf ? fig[3] : h; m->fdx = hf ? fig[0] : 0; m->fdy = hf ? fig[1] : 0; m->bo = hf ? fig[1] + fig[3] - 1 : h; }
      m->S = MS; m->idx = i; snprintf(m->walk, sizeof m->walk, "%s", mwalk); snprintf(m->shadow, sizeof m->shadow, "%s", mshadow);
      { int f = ent_focused(e, cur); if (f && !m->focus) { m->focus_t = 0; m->acked = 0; } m->focus = f; }
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
    int cf[4], cp[2], asleepStill = 0;   /* asleep and with a curl (its picture sent): the curl is drawn in place, its foot on the stand's feet line */
    if (!strcmp(v_pstr(v_fmt("%s.rest", P)), "asleep") && v_plen(v_fmt("%s.curlFigure", P)) == 4) { const char *cpic = v_pstr(v_fmt("%s.curl", P)); int sl = wire_asset_slot(cpic);
      if (sl >= 0 && prim_asset_size(sl, cp) == 0) { for (int q = 0; q < 4; q++) cf[q] = v_pint(v_fmt("%s.curlFigure.%d", P, q), -1);
        if (cf[0] >= 0 && cf[1] >= 0 && cf[2] > 0 && cf[3] > 0 && cf[0] + cf[2] <= cp[0] && cf[1] + cf[3] <= cp[1]) { asleepStill = 1; snprintf(e->pic, sizeof e->pic, "%s", cpic); } } }
    if (v_plen(v_fmt("%s.figure", P)) == 4) { int f[4]; for (int q = 0; q < 4; q++) f[q] = v_pint(v_fmt("%s.figure.%d", P, q), -1);
      if (f[0] >= 0 && f[1] >= 0 && f[2] > 0 && f[3] > 0 && f[0] + f[2] <= w && f[1] + f[3] <= h) { memcpy(fig, f, sizeof fig); e->hasfig = 1; } }
    wk_t *old = NULL; for (int j = 0; j < g_nw; j++) if (strcmp(g_w[j].id, e->id) == 0 && g_w[j].seed == e->seed && g_w[j].w == fig[2]) old = &g_w[j];
    if (old) kept[nk] = *old; else wk_init(&kept[nk], e->id, e->seed, fig[2], fig[3]);
    wk_t *k = &kept[nk++];
    if (motion && !library_swap_pending(now) && rel >= 40u * (unsigned)(i & 1)) {   /* not on the frame the Library's breathing swap lands on (build spec 4.2): it takes its steps on the next */
      long due = (long)((rel - 40u * (unsigned)(i & 1)) / 80u) + 1;
      if (due - k->done > 4000) k->done = due - 4000;   /* a long gap: catch up no further than the route repeats */
      int frozen = ent_focused(e, cur) || asleepStill, x0 = k->x, f0 = k->feet;   /* a sleeping resident stays where it is */
      for (; k->done < due; k->done++) if (!frozen) wk_step(k);
      if (k->x != x0 || k->feet != f0) g_home_steps++;
    }
    e->box[0] = k->x; e->box[1] = k->feet + (e->hasfig ? 1 : 0) - fig[3];   /* no figure: the picture's bottom edge is the feet, as it was */ e->box[2] = fig[2]; e->box[3] = fig[3];   /* the figure box: the focus target */
    e->draw[0] = k->x - fig[0]; e->draw[1] = e->box[1] - fig[1]; e->draw[2] = w; e->draw[3] = h; memcpy(e->sbox, e->draw, sizeof e->sbox);
    if (asleepStill) { int fx = k->x + fig[2] / 2, x0 = fx - cf[2] / 2;   /* the curl on the same feet point: its own figure's box, ring and tag; no lift */
      e->hasfig = 1; e->curled = 1; e->box[0] = x0; e->box[1] = k->feet + 1 - cf[3]; e->box[2] = cf[2]; e->box[3] = cf[3]; e->draw[0] = x0 - cf[0]; e->draw[1] = e->box[1] - cf[1]; e->draw[2] = cp[0]; e->draw[3] = cp[1]; }
    g_ne++;
  }
  memcpy(g_w, kept, sizeof(wk_t) * (size_t)nk); g_nw = nk;
  memcpy(g_m, mk, sizeof(mv_t) * (size_t)nmk); g_nm = nmk;
  /* groups (§2.3 item 3, override 8): g = i mod 2, or, when a moving cell is over 21,888 px, the large residents 0, 1, 0, 1… in props order and the others joining the group with fewer, a tie to 0 */
  { int big = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h > 21888) big = 1;
    if (!big) for (int i = 0; i < g_nm; i++) g_m[i].group = g_m[i].idx & 1;
    else { int n0 = 0, n1 = 0, alt = 0; for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h > 21888) { g_m[i].group = alt; alt ^= 1; if (g_m[i].group) n1++; else n0++; }
      for (int i = 0; i < g_nm; i++) if (g_m[i].w * g_m[i].h <= 21888) { g_m[i].group = n1 < n0 ? 1 : 0; if (g_m[i].group) n1++; else n0++; } } }
  if (g_hh.ids != ids) { g_hh.ids = ids; g_hh.s = 0x5bd1e995u; for (int i = 0; i < g_nm; i++) g_hh.s ^= g_m[i].seed; }   /* the household LCG, seeded when the set of ids changes or the screen is shown */
  int ns = strcmp(v_pstr("regions.bed.state"), "docked") == 0 ? v_plen("regions.bed.sleepers") : 0; if (ns > MAXS) ns = MAXS;
  nap_t nk2[MAXS]; int nn = 0;
  for (int i = 0; i < ns; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.bed.sleepers.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 1; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0); e->mv = -1; e->nap = -1; e->asleep = 0;
    snprintf(e->stand, sizeof e->stand, "%s", v_pstr(v_fmt("%s.stand", P))); e->rank = ns - 1 - i;   /* the send-off: the resident's own standing painting, and the order out (rightmost first) */
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
static int ent_focused(const ent_t *e, const char *cur) { return strncmp(cur, "resident.", 9) == 0 && strcmp(cur + 9, e->id) == 0; }

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

/* ---- the lift's send-off on the bed (home.json events.sendoff; specs/station-dock-arrival-spec.md §4): the sleepers wake (the nap pose cuts to the standing painting), hop once and dither out, rightmost first, 200 ms apart ---- */
static int sendoff_t(void) {
  anim_state_t t; if (!v_pbool("motion", 1) || !v_pbool("regions.bed.sendoff", 0)) return -1;
  if (anim_get(ANIM_SENDOFF, "bed", &t)) return t.elapsed; return 1 << 20;   /* a send-off that has ended is its last frame until the host clears the flag */
}
/* the sleeper's phase at t: 0 asleep, 1 standing and hopping (lift), 2 dithering out (level), 3 gone */
static int so_phase(const ent_t *e, int t, int *lift, int *level) {
  *lift = 0; *level = 0; if (t < 0 || !e->stand[0] || !has(e->stand)) return 0;
  int el = t - (spec_int(H, "events.sendoff.start", 200) + spec_int(H, "events.sendoff.stagger", 200) * e->rank); if (el < 0) return 0;
  int hop = spec_int(H, "events.sendoff.hop.ms", 175), out = spec_int(H, "events.sendoff.out.ms", 400), levels = spec_int(H, "events.sendoff.out.levels", 16);
  if (el < hop) { for (int q = 0, n = spec_len(H, "events.sendoff.hop.lift"); q < n; q++) if (el >= spec_int(H, v_fmt("events.sendoff.hop.lift.%d.0", q), 1 << 30)) *lift = spec_int(H, v_fmt("events.sendoff.hop.lift.%d.1", q), 0); return 1; }
  if (el - hop < out) { *level = (el - hop) * levels / out; return 2; }
  return 3;
}
static int sleeper_nodes(const ent_t *e, int t) { int lift, level, ph = so_phase(e, t, &lift, &level); return ph == 0 ? (e->nap >= 0 ? 1 : has(e->pic)) : ph == 2 ? 2 : 1; }
static void sleeper_draw(const ent_t *e, int t) {
  int lift, level, ph = so_phase(e, t, &lift, &level);
  if (ph == 0) { if (e->nap >= 0) { nap_draw(e); return; } v_name("bed.sleepers"); v_sprite(v_fmt("g.%s", e->id), e->pic, e->draw[0], e->draw[1], e->draw[2], e->draw[3]); v_name("bed.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, e->box[1], e->waiting); return; }
  v_name("bed.sleepers");
  if (ph == 1) v_sprite(v_fmt("g.%s", e->id), e->stand, e->sbox[0], e->sbox[1] - lift, e->sbox[2], e->sbox[3]);
  else { v_sprite_hidden(v_fmt("g.%s", e->id), e->stand, e->sbox[0], e->sbox[1]); if (ph == 2) v_dither_window(v_fmt("g.%s.d", e->id), e->stand, 0, 0, "", 0, 0, level, e->sbox[0], e->sbox[1], e->sbox[2], e->sbox[3]); }
  v_name("bed.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->sbox[0] + e->sbox[2] - 12, e->sbox[1] - lift, e->waiting);
}

/* the focused one's name tag: below the ring at feetY + 16 and, past the window's foot, over the figure at feetY − H − 32 less the lift; a sleeper's, or one asleep in place, is always over its ink, 32 above its top, with no lift */
static void ent_tag(const ent_t *e, const char *glass) {
  int tag[4], below = v_si(sp(), hp("regions.nameTag.below"), 16), over = v_si(sp(), hp("regions.nameTag.over"), 32), lift = v_si(sp(), hp("regions.resident.lift"), 4);
  const char *fill = v_scol(sp(), "colours.nameTag.fill"), *edge = v_scol(sp(), "colours.nameTag.edge");
  if (e->sleeper || e->curled) { const int *b = e->hasfig ? e->box : e->draw; kit_nameTag(sp(), glass, e->name, b, 0, b[1] - over, KIT_TAG_OVER, 0, fill, edge, NULL, tag); }
  else if (e->asleep) kit_nameTag(sp(), glass, e->name, e->ink, 0, e->ink[1] - over, KIT_TAG_OVER, 0, fill, edge, NULL, tag);
  else { int feetY = e->box[1] + e->box[3] - 1; kit_nameTag(sp(), glass, e->name, e->box, feetY + below, feetY - e->box[3] - over - lift, KIT_TAG_AUTO, 0, fill, edge, NULL, tag); }
}

/* ---- the glass: residents and the bed in the order of their feet, clipped to the glass; the focused one last: its feet ring, then it ---- */
typedef struct { int kind; int ent; } item_t;   /* kind 0: a resident; 1: the bed group (the bed, then its sleepers right to left); 2: the focused resident or sleeper, drawn last under its ring */
static void glass_group(const char *cur) {
  int glass[4], bed[4]; v_srect(sp(), hp("regions.glass.rect"), glass); v_srect(sp(), hp("regions.bed.rect"), bed);
  item_t it[MAXR + 2]; int ni = 0, focused = -1;
  for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) focused = i;
  for (int i = 0; i < g_ne; i++) if (!g_e[i].sleeper && i != focused) it[ni++] = (item_t){ 0, i };
  if (!g_home) it[ni++] = (item_t){ 1, -1 };   /* Home has no bed: the bed and its sleepers are the Vivarium's */
  /* by the feet's y, lower in front (later), left first on a tie; the bed group sorts at the bed's foot */
  int bedFoot = v_sk(sp(), hp("regions.glass.foot"), 1);
  for (int a = 1; a < ni; a++) { item_t t = it[a]; int b = a - 1;
    int fa = t.kind ? bedFoot : g_e[t.ent].box[1] + g_e[t.ent].box[3], xa = t.kind ? bed[0] : g_e[t.ent].box[0];
    while (b >= 0) { int fb = it[b].kind ? bedFoot : g_e[it[b].ent].box[1] + g_e[it[b].ent].box[3], xb = it[b].kind ? bed[0] : g_e[it[b].ent].box[0]; if (fb < fa || (fb == fa && xb <= xa)) break; it[b + 1] = it[b]; b--; }
    it[b + 1] = t; }
  if (focused >= 0) it[ni++] = (item_t){ 2, focused };
  /* the nodes inside the clip, counted before they are sent */
  int count = 0, lift = v_si(sp(), hp("regions.resident.lift"), 4);
  int bedPic = g_home ? 0 : has(v_pstr("regions.bed.picture")), lampN = wire_has_asset(home_lamp_pic("waiting")) ? 1 : 0;   /* a waiting lamp is one node (its picture, or the same node with no size) when the host has sent the picture */
  const char *mk = v_pstr("regions.bed.mark"); int markN = (mk && *mk) ? wire_has_asset(mk) : bedPic;   /* the bed's mark: its picture away, else a node of no size on the bed's own picture */
  for (int k = 0; k < ni; k++) {
    if (it[k].kind != 1) { const ent_t *e = &g_e[it[k].ent];
      if (e->mv >= 0) { const mv_t *m = &g_m[e->mv]; count += 1 + (has(m->shadow) ? 1 : 0) + (m->dl ? 1 : 0) + lampN + (it[k].kind == 2 ? 1 : 0); }   /* a moving resident: its shadow, the picture (hidden while it dithers), the dither node, the lamp */
      else if (e->nap >= 0) count += 1 + lampN + (it[k].kind == 2 ? 1 : 0);
      else count += has(e->pic) + lampN + (it[k].kind == 2 ? 1 : 0); }
    else { int sot = sendoff_t(); count += bedPic + markN; for (int i = 0; i < g_ne; i++) if (g_e[i].sleeper && i != focused) count += sleeper_nodes(&g_e[i], sot) + lampN; }
  }
  if (count == 0) return;
  v_clip_box("glass.clip", glass[0], glass[1], glass[2], glass[3], count);
  /* the nodes are named by the mibi (g.<id>, g.<id>.lamp, g.bed, g.bed.mark): when two residents change places in depth the objects change places in the order and only where they overlap is redrawn
     (prim.c move_to), a resident that did not step is not redrawn */
  for (int k = 0; k < ni; k++) {
    if (it[k].kind != 1) {
      const ent_t *e = &g_e[it[k].ent];
      if (e->mv >= 0) { mv_draw(e, it[k].kind == 2, lift); continue; }
      if (e->nap >= 0) { if (it[k].kind == 2) { const nap_t *z = &g_nap[e->nap]; int rb[4] = { e->draw[0], e->draw[1], z->w, z->h }; v_region("focus", LAYER_CHROME); word_focusRingFootprint("focus", sp(), "focus.targets.resident", z->nap, "curl", rb); } nap_draw(e); continue; }
      int up = it[k].kind == 2 && !e->sleeper && !e->curled ? lift : 0, y = e->draw[1] - up, ly = e->box[1] - up;
      if (it[k].kind == 2) { v_region("focus", LAYER_CHROME);
        if (e->hasfig) word_focusRingFigure("focus", sp(), "focus.targets.resident", e->pic, e->box[0] + e->box[2] / 2, e->box[1] + e->box[3] - 1, e->box[2]);   /* the ring on the figure's feet, never lifted */
        else { int rb[4]; memcpy(rb, e->draw, sizeof rb); word_focusRingFootprint("focus", sp(), "focus.targets.resident", e->pic, "", rb); } }
      v_name(e->sleeper ? "bed.sleepers" : "resident"); v_sprite(v_fmt("g.%s", e->id), e->pic, e->draw[0], y, e->draw[2], e->draw[3]);   /* a slot is a picture and its waiting lamp, the same two nodes every draw */
      v_name(e->sleeper ? "bed.lamp" : "resident.lamp"); build_waitingLamp(v_fmt("g.%s.lamp", e->id), e->box[0] + e->box[2] - 12, ly, e->waiting);
    } else {
      v_name("bed"); v_sprite("g.bed", v_pstr("regions.bed.picture"), bed[0], bed[1], bed[2], bed[3]);
      { int mk[4]; v_srect(sp(), hp("regions.bed.markRect"), mk); const char *mp = v_pstr("regions.bed.mark"); v_name("bed");   /* away only: the Companion's mark, 1:1 over the bed, a stable node (no size when it is not shown) */
        v_slot("g.bed.mark", mp, v_pstr("regions.bed.picture"), mk[0], mk[1], mk[2], mk[3], mp && *mp); }
      for (int i = g_ne - 1; i >= 0; i--) if (g_e[i].sleeper && i != focused) {   /* right to left: the first carried is drawn last, in front */
        sleeper_draw(&g_e[i], sendoff_t());
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
int home_test_state(int i) { const mv_t *m = mv_at(i); if (!m) return -1; return m->clip | mv_travelling(m) << 4 | mv_airborne(m) << 5 | (m->clip == C_ASLEEP || m->clip == C_CURL || m->clip == C_STIR) << 6 | m->wander << 7 | m->focus << 8 | m->phase << 12; }
int home_test_mv(int i, int field) {   /* 0 x, 1 feet, 2 facing, 3 lift, 4 dy, 5 dither level, 6 rested, 7 trip start (group tick), 8 waypoint x, 9 waypoint feet, 10 group, 11 shadow75, 12 the walk's group ticks */
  if (field == 12) return (int)g_wticks;
  const mv_t *m = mv_at(i); if (!m) return -100000;
  switch (field) { case 0: return m->x; case 1: return m->feet; case 2: return m->facing; case 3: return m->lift; case 4: return m->dy; case 5: return m->dl; case 6: return m->rested; case 7: return (int)m->trip_start; case 8: return m->wx; case 9: return m->wf; case 10: return m->group; case 11: return m->sh75; default: return -100000; }
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
  kit_panel("away", r[0], r[1], r[2], r[3], fill, edge, 0);
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
   sleepers, the focused one's name tag, and the strip of bays along the foot (build_bayStrip); no card, no module, no word in the window but the name tag. The same code as Home's glass and Idle's painting on the spec's own rectangles. The empty state
   (no housed mibi) is the window, the strip's free bays and the frame. ---- */
void vivarium_words(void) {
  g_viv = 1;
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  ent_load(cur);
  kit_stage("vivarium", "regions.stage.rect", v_scol("vivarium", "colours.stageGround"), "stage", "stage.ground", NULL, NULL);
  word_livingWindow("vivarium", "window", NULL, "regions.window", "colours.window", v_pstr("regions.window.picture"), 0, spec_int("vivarium", "regions.window.painting.rows.0", 0), NULL, 0);   /* rows 120 to 560 of Idle's painting of the light, 1:1, at the window */
  glass_group(cur);   /* the bed in the empty state too (no resident, no sleeper): the nest, and its mark while away */
  for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) ent_tag(&g_e[i], "regions.window");
  { int box[4]; build_bayStrip("vivarium", cur, box);
    if (strncmp(cur, "tile.", 5) == 0 && box[2] > 0 && !anim_holding()) { v_region("focus", LAYER_CHROME); word_focusRing("focus", "vivarium", "focus.targets.tile", box); } }
  g_viv = 0;
}

/* the targets as the words drew them, in the props' order: a resident's box where the face stepped it, a tile's rectangle in its form (not lifted) */
int vivarium_focus(focus_target_t *out, int cap) {
  g_viv = 1;
  int n = v_plen("focus.targets"); if (n > cap) n = cap; int nt = v_plen("regions.tiles.items"); if (nt > 12) { g_viv = 0; return 0; }   /* the strip refuses more than twelve bays: no targets */
  int have = nt > 0 && layout_list_form("vivarium", "regions.tiles", nt, NULL, 0) >= 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL);
    int r[4] = { 0, 0, 0, 0 }, ix = i;
    if (strncmp(t->id, "resident.", 9) == 0) { for (int e = 0; e < g_ne; e++) if (strcmp(g_e[e].id, t->id + 9) == 0) memcpy(r, g_e[e].box, sizeof r); }
    else if (strncmp(t->id, "tile.", 5) == 0 && have) { for (int k = 0; k < nt; k++) if (strcmp(v_pstr(v_fmt("regions.tiles.items.%d.id", k)), t->id + 5) == 0) layout_list_pitch("vivarium", "regions.tiles", nt, k, r); ix = 0; for (int k = 0; k < i; k++) if (strncmp(out[k].id, "tile.", 5) == 0) ix++; }
    focus_fill(t, "focus.targets", i, r); t->index = ix;
  }
  g_viv = 0; return n;
}

/* a key on the whole: ✓ says look on the focused resident or tile (nothing on the room), ← goes Home, the room keys; the pad moves the ring by vivarium.json focus.graph (the host's selectors in focus.resolve) */
void vivarium_key(int code) { screens_key_graph(code, "vivarium", "focus.graph", vivarium_focus, "room", &(screens_keys_t){ .resolve = 1, .room_at = "focus.roomAt" }); }
