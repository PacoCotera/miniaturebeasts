/* The Incubator's binding table (lvgl-switch.md §2.2, §4 R; incubator.json; build-spec results/T-20261017-incubator-object/build-spec.md): the painted capsule. The words that draw each of its states (empty, growing, ready, hatch)
   and its moments (the incubate moment, Hatch now, the hatch) in draw order, from the `incubator` spec and the props' regions, the frame's words after (screens.c): the stage ground, the room (a 1:1 crop, day or dusk), the capsule's
   interior, the pod inside (the host's relit picture, with its shadow and moss blades), the opened pod at the hatch, the juvenile, the glass (the host's code-drawn picture, closed looks only), the shell, the door (open looks), the bar
   (lit from the left, as the progress), the seal ring, then the left wall's column (the stamp case, the stamp, the code, "ready in about {n} min") and the ribbon. No ring in any state: ✓ acts on the room.
   Every picture is placed 1:1 at the place the spec gives it; the pictures of one layer that two looks differ in (dusk and day) are two pictures of one size, and a step between looks is a cut or the house dither (16 levels, 180 ms, the
   screen's Bayer), never a fade. The events: `incubate` (0: the dusk look, sealed; 1200 to 1380: the dither to growing; the column cuts in at 1200), `growNow` (the bar fills in 8 cuts 50 ms apart; at 400 the 180 ms dither from closed to open:
   the glass goes, the door comes in) and `hatch` (a still beat; crack 1 at 600 and 2 at 800 on the pod; at 1000 the 180 ms dither to the opened pod, the juvenile dithering in from clear; the ribbon at 1200; the two steps at 1400 and 1800;
   the hand-off at 2600 is the host's). A picture the host has not sent is a slot not yet filled: nothing is drawn. */
#include "../layout/layout.h"
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../focus/focus.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define I "incubator"
static int ci(const char *p, int d) { return spec_int(I, p, d); }
static int ck(const char *base, int k) { return spec_int(I, v_fmt("%s.%d", base, k), 0); }
static void crect(const char *p, int r[4]) { if (!v_spec_rect(I, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(I, p, o, 24); return o; }
static int has(const char *id) { return id && *id; }
static int in_state(const char *s) { return strcmp(v_pstr("state"), s) == 0; }
static int clampi(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ---- the clocks: how far each moment has got (-1: it is not playing; with motion off every moment is at its end) ---- */
#define END 1000000
static int moment_time(int kind) { anim_state_t t; if (!v_pbool("motion", 1)) return END; return anim_get(kind, "room", &t) ? t.elapsed : -1; }
static int hatch_time(void) { return in_state("hatch") ? moment_time(ANIM_HATCH) : -1; }
static int grownow_time(void) { return in_state("growing") ? moment_time(ANIM_GROW_NOW) : -1; }
static int incubate_time(void) { return in_state("growing") ? moment_time(ANIM_INCUBATE) : -1; }
/* the dither's level n at t ms for a 180 ms dither that starts at t0: floor(16 (t - t0) / 180), 0 before it, 16 after */
static int level_at(int t, int t0) { return clampi(16 * (t - t0) / 180, 0, 16); }

/* the juvenile's step-outs: the steps of incubator.json events.hatch that carry a `lift` key, each with its `at` and `ms`; the table is the first `lift` that is an array, [ms into the step, px above the feet line], each a cut */
static int lift_steps(int *at, int *ms, int *table, int cap) {
  int k = 0; *table = -1;
  for (int i = 0, n = spec_len(I, "events.hatch.steps"); i < n && k < cap; i++) {
    const char *key = v_fmt("events.hatch.steps.%d.lift", i); if (!spec_raw(I, key, NULL)) continue;
    if (*table < 0 && spec_len(I, key) >= 0) *table = i;
    at[k] = spec_int(I, v_fmt("events.hatch.steps.%d.at", i), 0); ms[k] = spec_int(I, v_fmt("events.hatch.steps.%d.ms", i), 0); k++;
  }
  return k;
}
static int step_lift(int table, int ms) {
  int v = 0; if (table < 0) return 0;
  for (int i = 0, n = spec_len(I, v_fmt("events.hatch.steps.%d.lift", table)); i < n; i++) { if (ms >= spec_int(I, v_fmt("events.hatch.steps.%d.lift.%d.0", table, i), 1 << 30)) v = spec_int(I, v_fmt("events.hatch.steps.%d.lift.%d.1", table, i), 0); }
  return v;
}

/* ---- the building blocks: a picture of one layer that changes between two pictures, comes in from clear or goes out to clear at a dither level ---- */
/* from `a` to `b` at level n (n <= 0: a; n >= 16: b; else the dither of the two, which are one size and one place) */
static void swap(const char *id, const char *a, const char *b, int n, const int r[4]) {
  v_name(id);
  if (n <= 0 || n >= 16 || !has(a) || !has(b)) { const char *p = n >= 16 ? b : a; if (has(p)) v_sprite(id, p, r[0], r[1], r[2], r[3]); return; }
  v_region(id, LAYER_PAINTED); v_dither_window(v_fmt("%s.dither", id), a, 0, 0, b, 0, 0, n, r[0], r[1], r[2], r[3]);
}
/* in from clear at level n (n <= 0: nothing; n >= 16: the picture) */
static void come_in(const char *id, const char *a, int n, const int r[4]) {
  v_name(id); if (!has(a) || n <= 0) return;
  if (n >= 16) { v_sprite(id, a, r[0], r[1], r[2], r[3]); return; }
  v_region(id, LAYER_PAINTED); v_dither_window(v_fmt("%s.dither", id), NULL, 0, 0, a, 0, 0, n, r[0], r[1], r[2], r[3]);
}
/* out to clear at level n (n <= 0: the picture; n >= 16: nothing) */
static void go_out(const char *id, const char *a, int n, const int r[4]) {
  v_name(id); if (!has(a) || n >= 16) return;
  if (n <= 0) { v_sprite(id, a, r[0], r[1], r[2], r[3]); return; }
  v_region(id, LAYER_PAINTED); v_dither_window(v_fmt("%s.dither", id), a, 0, 0, NULL, 0, 0, n, r[0], r[1], r[2], r[3]);
}
/* the bar's window of its layer: lit from the left, `px` wide from the layer's x 89 (screen 433); the whole bar with its glow at 158 px */
static void bar_window(int px, int out[4]) {
  int max = ci("regions.capsule.bar.max", 158), h = ci("regions.capsule.bar.h", 34), x0 = ck("regions.capsule.bar.litFrom", 0), y0 = ck("regions.capsule.bar.litFrom", 1);
  if (px >= max) { out[0] = ck("regions.capsule.bar.full", 0); out[1] = ck("regions.capsule.bar.full", 1); out[2] = ck("regions.capsule.bar.full", 2); out[3] = ck("regions.capsule.bar.full", 3); return; }
  out[0] = x0; out[1] = y0; out[2] = px; out[3] = h;
}
static void bar(const char *a, int px, int level_in) {   /* level_in: the dither in from clear (16: no dither) */
  if (px <= 0 || !has(a)) return;
  int cr[4], w[4]; crect("regions.capsule.rect", cr); bar_window(px, w); v_name("bar");
  if (level_in <= 0) return;
  if (level_in >= 16) { v_sprite_window("bar", a, w[0], w[1], cr[0] + w[0], cr[1] + w[1], w[2], w[3]); return; }
  v_region("bar", LAYER_PAINTED); v_dither_window("bar.dither", NULL, 0, 0, a, w[0], w[1], level_in, cr[0] + w[0], cr[1] + w[1], w[2], w[3]);
}

/* ---- the picture of the room as one view of the capsule: layers by look ---- */
static void build_stage(void) {
  int r[4]; crect("regions.bench.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], g);
}
/* the draw: t_inc, t_gn and t_h are the clocks of the three moments (-1: not playing) */
static void build_capsule(int t_inc, int t_gn, int t_h) {
  int st_empty = in_state("empty"), st_growing = in_state("growing"), st_hatch = in_state("hatch");
  int room[4], cap[4], ins[4]; crect("regions.room.rect", room); crect("regions.capsule.rect", cap); crect("regions.inside.rect", ins);
  /* the light: the incubate moment is dusk until 1200, dithers to day to 1380 (level n of 16 toward day) */
  int dn = 16; if (t_inc >= 0) dn = t_inc < 1200 ? 0 : level_at(t_inc, 1200);
  int sealed_t = t_inc >= 0 && t_inc < 1200;   /* the seal ring is on until 1200, out by 1380 */
  int seal_n = t_inc >= 0 ? dn : 16;           /* the ring goes out as the day comes in */
  /* the look: closed (glass, no door) or open (door, no glass) */
  int closed = st_growing && (t_gn < 0 || t_gn < 400), opening = t_gn >= 400 && t_gn < 580 ? level_at(t_gn, 400) : (t_gn >= 580 ? 16 : 0), open_look = !st_growing || t_gn >= 580;
  int dither_open = st_growing && t_gn >= 400 && t_gn < 580;
  v_region("room", LAYER_PAINTED);
  swap("room", v_pstr("regions.room.dusk"), v_pstr("regions.room.day"), dn, room);
  swap("interior", v_pstr("regions.capsule.interior.dusk"), v_pstr("regions.capsule.interior.day"), dn, cap);
  /* what is inside: the pod (the sealed one, cracking at the hatch), or at the hatch's step at 1000 the opened pod; empty: nothing */
  {
    int pod_on = !st_empty, opened_n = 0, juv_n = 0;
    if (st_hatch && t_h >= 1000) { opened_n = t_h >= 1180 ? 16 : level_at(t_h, 1000); juv_n = opened_n; }
    if (pod_on) {
      const char *day = v_pstr("regions.inside.pod.day"), *dusk = v_pstr("regions.inside.pod.dusk");
      if (st_hatch) {
        const char *shown = t_h >= 800 ? v_pstr("regions.inside.pod.crack2") : t_h >= 600 ? v_pstr("regions.inside.pod.crack1") : day;
        if (!has(shown)) shown = day;
        const char *op = v_pstr("regions.inside.opened");
        if (opened_n <= 0) { v_name("pod"); if (has(shown)) v_sprite("pod", shown, ins[0], ins[1], ins[2], ins[3]); }
        else swap("pod", shown, op, opened_n, ins);
      } else swap("pod", dusk, day, dn, ins);
    }
    /* the juvenile: its own picture, feet on (532, 415) (the picture's anchor on the foot), dithering in from clear at 1000, stepping out at 1400 and 1800 */
    if (st_hatch && juv_n > 0) {
      const char *pic = v_pstr("regions.juvenile.picture"); int w = v_pint("regions.juvenile.size.0", 0), h = v_pint("regions.juvenile.size.1", 0), ax = v_pint("regions.juvenile.anchor.0", 0), ay = v_pint("regions.juvenile.anchor.1", 0);
      int fx = ck("regions.juvenile.foot", 0), fy = ck("regions.juvenile.foot", 1), up = 0, sat[4], sms[4], table, ns = lift_steps(sat, sms, &table, 4);
      for (int i = 0; i < ns; i++) if (t_h >= sat[i] && t_h < sat[i] + sms[i]) up = step_lift(table, t_h - sat[i]);
      int r[4] = { fx - ax, fy - ay - up, w, h };
      if (w > 0 && h > 0) come_in("juvenile", pic, juv_n, r);
    }
  }
  /* the glass: closed looks only (growing, the incubate moment); it goes out as Hatch now opens the door */
  { const char *gl = v_pstr("regions.capsule.glass"); if (closed) { v_name("glass"); if (has(gl) && !dither_open) v_sprite("glass", gl, cap[0], cap[1], cap[2], cap[3]); else if (has(gl)) go_out("glass", gl, opening, cap); } else if (dither_open) go_out("glass", gl, opening, cap); }
  swap("shell", v_pstr("regions.capsule.shell.dusk"), v_pstr("regions.capsule.shell.day"), dn, cap);
  /* the door: open looks (empty, ready, the hatch); Hatch now brings it in with the dither at 400 */
  { const char *dr = v_pstr("regions.capsule.door"); if (dither_open) come_in("door", dr, opening, cap); else { v_name("door"); if (open_look && has(dr)) v_sprite("door", dr, cap[0], cap[1], cap[2], cap[3]); } }
  /* the bar: empty off; the incubate moment off until 1200, then from its first pixel; growing at its width, Hatch now filling it in 8 cuts; ready and the hatch full */
  {
    const char *b = v_pstr("regions.capsule.bar"); int max = ci("regions.capsule.bar.max", 158), px = v_pint("regions.capsule.barPx", 0);
    if (st_empty) {}
    else if (st_hatch || in_state("ready")) bar(b, max, 16);
    else if (t_gn >= 0) { int w0 = px, k = t_gn < 0 ? 0 : (t_gn / 50) + 1; if (k > 8) k = 8; bar(b, k <= 0 ? w0 : w0 + (max - w0) * k / 8, 16); }
    else if (t_inc >= 0 && t_inc < 1200) {}
    else if (t_inc >= 1200 && t_inc != END) bar(b, px < 1 ? 1 : px, level_at(t_inc, 1200));
    else bar(b, px, 16);
  }
  /* the seal ring: the incubate moment only, out with the dither */
  { const char *sl = v_pstr("regions.capsule.seal"); if (t_inc >= 0 && (sealed_t || seal_n < 16)) go_out("seal", sl, sealed_t ? 0 : seal_n, cap); }
}
/* the left wall: the stamp case, the stamp, the code and the time; bare wall when empty, and in the incubate moment until 1200 */
static void build_column(int t_inc) {
  int st_empty = in_state("empty"); if (st_empty || (t_inc >= 0 && t_inc < 1200)) return;
  if (spec_len("props", "regions.stamp") >= 0) {
    int r[4]; crect("regions.stamp.rect", r); const char *a = v_pstr("regions.stamp.asset"); int size = v_pint("regions.stamp.size", 0);
    word_stampCase(I, "regions", 0);
    v_region("stamp.plate", LAYER_PAINTED); { const char *pl = v_pstr("regions.stamp.plate"); if (has(pl)) { if (has(a) && size) v_sprite("stamp.plate", pl, r[0], r[1], r[2], r[3]); else v_sprite_hidden("stamp.plate", pl, r[0], r[1]); } }
    v_region("stamp", LAYER_PAINTED); if (has(a) && size) { v_name("stamp"); v_sprite("stamp.stamp", a, r[0] + v_half(r[2] - size), r[1] + v_half(r[3] - size), size, size); }
    word_stampCase(I, "regions", 1);
  }
  { const char *code = v_pstr("regions.code"); if (has(code)) { int px = ci("regions.code.px", 16), cx = ci("regions.code.centre", 152), w = v_measure(code, px); v_region("code", LAYER_TYPE); v_text("code", code, cx - v_half(w), ci("regions.code.lineTop", 344) + v_fdiv(20 - v_cap(px), 2), w, px, colr("colours.code")); } }
  { const char *s = v_pstr("regions.readyIn"); if (has(s) && in_state("growing")) { int px = ci("regions.readyIn.px", 16), cx = ci("regions.readyIn.centre", 152), w = v_measure(s, px); v_region("readyIn", LAYER_TYPE); v_text("readyIn", s, cx - v_half(w), ci("regions.readyIn.lineTop", 384) + v_fdiv(20 - v_cap(px), 2), w, px, colr("colours.readyIn")); } }
}
static void build_ribbon(int t) {
  if (!in_state("hatch")) return;
  int r[4]; crect("regions.ribbon.rect", r); int at = ci("events.hatch.steps.4.at", 1200); const char *words = v_pstr("regions.ribbon");
  v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, t >= at ? words : "", ci("regions.ribbon.px", 20), ci("regions.ribbon.pad", 0), colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), colr("colours.ribbon.text"));
}

int incubator_tick(uint32_t now) { (void)now; return 0; }   /* the moments are events: their frames are drawn while they play */
int incubator_test_cell(void) { return -100; }              /* the hatch has no moving set on the capsule (open question in the T-20261016-222 report) */

void incubator_words(void) {
  int t_inc = incubate_time(), t_gn = grownow_time(), t_h = hatch_time();
  build_stage();
  build_capsule(t_inc, t_gn, t_h);
  build_column(t_inc);
  build_ribbon(t_h);
}

/* a key on the Incubator: ✓, ← and the room keys say an intent on the room; the pad does nothing (one subject, no ring) */
void incubator_key(int code) {
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) screens_say("intent", "room", verb);
}
