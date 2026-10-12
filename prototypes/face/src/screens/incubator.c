/* The Incubator's binding table (lvgl-switch.md §2.2, §4 R; incubator.json): the words that draw each of its states (empty, growing, ready, hatch) in draw order, from the `incubator` spec and the props' regions, the frame's
   words after (screens.c). bench, rail, the leaves on their two arcs, the chamber's back, the nest, the bud (and the ready bud's shape), the nest's front, the window's front, the base (its master carries the plaque plate and the foot
   light) with its plaque word, the base's waiting lamp, the juvenile, the stamp label, the code and the ribbon. No ring in any state: ✓ acts on the room. The ready bud's front is drawn over the shape; the cracks are drawn over the ready bud.
   The events: `growNow` (the leaves still to fill turn whole one by one over its length, in the leaves word), `wipe` (a tab turns read, its pips filling, in the rail word) and `hatch` (a still beat: the chamber stays as it stands, its
   window open with no pane, and nothing moves; the bud keeps its ready picture and shape until the crack at 600, opens at 800 and goes at 1000, the juvenile stands at 1000 over the chamber, the ribbon shows at 1200, the juvenile steps
   out at 1400 and 1800; the hand-off at 2600 is the host's).
   Every part has its node in every state from growing on (a part not shown has none of the size), so a minute passing, growNow and the hatch change nodes and never add or remove one (§2.2). A picture the host has not sent is a slot not yet filled. */
#include "../layout/layout.h"
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../focus/focus.h"
#include "moving.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define I "incubator"
static int ci(const char *p, int d) { return spec_int(I, p, d); }
static void crect(const char *p, int r[4]) { if (!v_spec_rect(I, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(I, p, o, 24); return o; }
static int has(const char *id) { return id && *id; }
static int in_state(const char *s) { return strcmp(v_pstr("state"), s) == 0; }

/* ---- the hatch: how far it has got (the end state when no event plays) ---- */
#define HATCH_END 1000000
static int hatch_time(void) { anim_state_t t; if (!in_state("hatch")) return -1; return v_pbool("motion", 1) && anim_get(ANIM_HATCH, "room", &t) ? t.elapsed : HATCH_END; }
/* the juvenile's step-outs: the steps of incubator.json events.hatch that carry a `lift` key, each with its `at` and `ms`; the table is the first `lift` that is an array, [ms into the step, px above the feet line], each a cut (a step whose lift is a note reads the same table) */
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

static void build_bench(void) {
  int r[4]; crect("regions.bench.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], g);
  v_region("bench", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}
static void picture(const char *region, const char *id, const char *path, const char *asset) { int r[4]; crect(path, r); if (has(asset)) { v_name(region); v_sprite(id, asset, r[0], r[1], r[2], r[3]); } }

static int hatch_moving(void);
#define HATCH_FADE0 1000
static int hatch_fade_level(int t) { return 16 * (t - HATCH_FADE0) / 180; }   /* the crossfade's level n at t ms, 1000–1180 (motion-spec §2.7a): floor(16 · (t − 1000) / 180) */
/* the bud: its five pictures, the ready shape and the ready front are always nodes, in this draw order (early, late, ready, shape, front, crack1, crack2); the state and the hatch's time show some of them: early, late, ready with its shape
   and its front (and in the hatch until 600), at 600 crack1 over ready (the shape and the front go), at 800 crack2 alone over ready, nothing at 1000 */
static void build_bud(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
  int r[4], s[4]; crect("regions.bud.rect", r); crect("regions.bud.shape.rect", s); const char *stage = v_pstr("regions.bud.stage");
  int a1 = ci("events.hatch.steps.2.at", 600), a2 = ci("events.hatch.steps.3.at", 800), a3 = hatch_moving() ? 1180 : ci("events.hatch.steps.4.at", 1000);   /* with a moving set the open bud is held under the curl's dither-in, gone at 1180 */
  int gone = t >= a3, c2 = !gone && t >= a2, c1 = !gone && !c2 && t >= a1;
  int early = !gone && !c1 && !c2 && strcmp(stage, "early") == 0, late = !gone && !c1 && !c2 && strcmp(stage, "late") == 0;
  int ready = !gone && (c1 || c2 || (strcmp(stage, "early") != 0 && strcmp(stage, "late") != 0));
  int front = ready && !c1 && !c2 && (strcmp(stage, "ready") == 0 || strcmp(stage, "hatch") == 0);   /* the shape and the front: ready, and in the hatch until the crack at 600 */
  const char *fb = v_pstr("regions.bud.ready");
  int fading = hatch_moving() && t >= HATCH_FADE0 && t < a3, n = fading ? hatch_fade_level(t) : 0;   /* with a moving set (motion-spec §2.7a): the crack-2 bud goes out at 16 − n while the curl comes in at n, 1000–1180, on the same Bayer: the bud keeps the pixels the curl has not taken */
  static const char *K[3] = { "early", "late", "ready" }; const int on3[3] = { early, late, ready };
  for (int i = 0; i < 3; i++) { v_name("bud"); const char *pic = v_pstr(v_fmt("regions.bud.%s", K[i])); const char *id = v_fmt("bud.%s", K[i]);
    if (has(pic) && on3[i] && fading) { v_sprite_hidden(id, pic, r[0], r[1]); v_dither_window(v_fmt("bud.%s.fade", K[i]), pic, 0, 0, NULL, 0, 0, n, r[0], r[1], r[2], r[3]); }
    else if (has(pic) && on3[i]) v_sprite(id, pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden(id, has(pic) ? pic : fb, r[0], r[1]); }
  { const char *pic = v_pstr("regions.bud.shape"); v_name("bud"); if (has(pic) && front) v_sprite("bud.shape", pic, s[0], s[1], s[2], s[3]); else v_sprite_hidden("bud.shape", has(pic) ? pic : fb, s[0], s[1]); }
  { const char *pic = v_pstr("regions.bud.front"); v_name("bud"); if (has(pic) && front) v_sprite("bud.front", pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden("bud.front", has(pic) ? pic : fb, r[0], r[1]); }
  static const char *C[2] = { "crack1", "crack2" }; const int onc[2] = { c1, c2 };
  for (int i = 0; i < 2; i++) { v_name("bud"); const char *pic = v_pstr(v_fmt("regions.bud.%s", C[i])); const char *id = v_fmt("bud.%s", C[i]);
    if (has(pic) && onc[i] && fading) { v_sprite_hidden(id, pic, r[0], r[1]); v_dither_window(v_fmt("bud.%s.fade", C[i]), pic, 0, 0, NULL, 0, 0, n, r[0], r[1], r[2], r[3]); }
    else if (has(pic) && onc[i]) v_sprite(id, pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden(id, has(pic) ? pic : fb, r[0], r[1]); }
}
static void build_base(void) {
  picture("base", "base", "regions.base.rect", v_pstr("regions.base.picture"));
  { int px = ci("regions.plaque.px", 16), cx = ci("regions.plaque.centre", 512); const char *w = v_pstr("regions.plaque"); int tw = v_measure(w, px);
    const char *st = v_pstr("state"); v_region("plaque", LAYER_TYPE);
    v_text("plaque", w, cx - v_half(tw), ci("regions.plaque.lineTop", 502) + v_fdiv(20 - v_cap(px), 2), *w ? tw : 0, px, colr(v_fmt("colours.plaque.%s", strcmp(st, "hatch") == 0 ? "ready" : st))); }
  { const char *pic = v_pstr("regions.lamp.picture"); if (spec_len("props", "regions.lamp") >= 0) { int r[4]; crect("regions.base.lamp.rect", r); v_name("lamp"); if (v_pbool("regions.lamp.on", 0)) v_sprite("lamp", pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden("lamp", pic, r[0], r[1]); } }
}
/* ---- the hatch's first motion (Station M1 §2.5; incubator.json events.hatch.moving) for a juvenile with a moving set: the curl dithers in from clear over the held open bud (1000–1180), curl, curl·b1 (1500), curl to crouch
   (2140–2320, the crouch 2 px lower), crouch held, the stand at 2720 and its first breath, the first hop at 5120 (crouch 160, air 400 on the up-close table at 0.7×, crouch 160), stand at 5840 breathing from b0. ---- */
static const mv_stage_t *hatch_set(void) {
  const char *set = v_pstr("regions.juvenile.moving.set"), *atlas = v_pstr("regions.juvenile.moving.close"); if (!*set || !wire_has_asset(atlas)) return NULL;
  const mv_stage_t *ms = moving_stage(set, MV_JUV); int r[4]; crect("regions.juvenile.rect", r); return ms && ms->cw == r[2] && ms->ch == r[3] ? ms : NULL;
}
static int hatch_moving(void) { return hatch_set() != NULL && in_state("hatch"); }
int incubator_tick(uint32_t now) { (void)now; return 0; }   /* the hatch is an event: its frames are drawn while it plays */
static int mv_at(int at_ms) { return at_ms; }
/* the cell (close-cell name), dy, lift, a dither (from NULL: clear) and shadow-75 at t ms of the hatch; NULL cell: not shown yet */
typedef struct { const char *cell, *dfrom; int dy, lift, dl, ddf, ddt, sh75, shadow, up, dup; } hatchf_t;   /* up, dup: the stand-in anchor's raise of the cell and of the dither's from (HATCH_STANDIN_FEET) */
/* M1a only (motion-spec §2.7a): the curl stand-in's feet sit at row 424, centred on x 512, from 1000 to the end of the curl-to-crouch dither at 2320; the crouch comes in at 472 inside that dither, never a cut.
   M1b drops this: the real 304 x 312 curl stands at 472 from 1000. One constant. */
#define HATCH_STANDIN_FEET 424
static void hatch_frame(const mv_stage_t *S0, int t, hatchf_t *f) {
  memset(f, 0, sizeof *f);
  if (t == HATCH_END || t >= mv_at(5840)) {   /* stand, breathing from b0 (the hand-off at 6400 is the host's); the end state is the stand */
    int k = t == HATCH_END ? 0 : (t - 5840) / 80, p = 0; for (int i = 0; i < S0->breathe.n; i++) p += S0->breathe.ms[i] / 80; k %= p > 0 ? p : 1;
    int c = S0->breathe.cell[0]; for (int i = 0; i < S0->breathe.n; i++) { int d = S0->breathe.ms[i] / 80; if (k < d) { c = S0->breathe.cell[i]; break; } k -= d; }
    f->cell = S0->wcell[c]; f->shadow = 1; return; }
  if (t < 1000) return;
  int jr[4]; crect("regions.juvenile.rect", jr); const int up = jr[1] + jr[3] - HATCH_STANDIN_FEET;   /* the stand-in anchor (M1a): 472 - 424 */
  if (t < 1180) { int n = hatch_fade_level(t); if (n <= 0) return; f->cell = "curl"; f->dl = n; f->dfrom = NULL; f->up = up; return; }   /* the curl comes in at n from clear while the bud goes out at 16 − n (motion-spec §2.7a); level 0 shows nothing */
  if (t < 1500) { f->cell = "curl"; f->shadow = 1; f->up = up; return; }
  if (t < 2140) { f->cell = "curl-b1"; f->shadow = 1; f->up = up; return; }
  if (t < 2320) { f->cell = "crouch"; f->dy = 2; f->dl = 1 + 15 * (t - 2140) / 180; f->dfrom = "curl"; f->ddt = 2; f->shadow = 1; f->dup = up; return; }   /* the curl goes out at its anchor while the crouch comes in at 472 */
  if (t < 2720) { f->cell = "crouch"; f->dy = 2; f->shadow = 1; return; }
  if (t < 5120) { int k = (t - 2720) / 80, c = S0->breathe.cell[0]; for (int i = 0; i < S0->breathe.n; i++) { int d = S0->breathe.ms[i] / 80; if (k < d) { c = S0->breathe.cell[i]; break; } k -= d; } f->cell = S0->wcell[c]; f->shadow = 1; return; }   /* the first breath from 2720 */
  { int lift[8], n = 0; for (int i = 0, m = spec_len(I, "events.hatch.moving.steps"); i < m; i++) if (spec_len(I, v_fmt("events.hatch.moving.steps.%d.lift", i)) > 0) { n = spec_len(I, v_fmt("events.hatch.moving.steps.%d.lift", i)); if (n > 8) n = 8; for (int k = 0; k < n; k++) lift[k] = spec_int(I, v_fmt("events.hatch.moving.steps.%d.lift.%d", i, k), 0); break; }
    const char *c = "stand"; int up = 0, sh = 0;
    if (!S0->chop_nlift && S0->cstep_ms) { f->cell = t - 5120 < S0->cstep_ms ? S0->ccell[S0->cstep_cell] : "stand"; f->shadow = 1; return; }   /* a set with no hop (S05, the animator's ruling): one step at 5120, stepa 320, then stand */
    if (n && moving_close_hop(S0, t - 5120, lift, n, 1, 1, &c, &up, &sh)) { f->cell = c; f->lift = up; f->sh75 = sh; } else f->cell = "stand"; f->shadow = 1; }
}
int incubator_test_cell(void) { const mv_stage_t *S0 = hatch_set(); if (!S0) return -100; hatchf_t f; hatch_frame(S0, hatch_time(), &f); return !f.cell ? -50 : f.dl ? -1 - f.dl : moving_close_cell(S0, f.cell); }
static void build_moving_juvenile(const mv_stage_t *S0, int t) {
  int r[4]; crect("regions.juvenile.rect", r); const char *atlas = v_pstr("regions.juvenile.moving.close"), *shadow = v_pstr("regions.juvenile.moving.shadow"); char at[96], sh[96]; snprintf(at, sizeof at, "%s", atlas); snprintf(sh, sizeof sh, "%s", shadow);
  hatchf_t f; hatch_frame(S0, t, &f); int feet = r[1] + r[3];
  if (wire_has_asset(sh)) { v_name("juvenile.shadow"); if (f.cell && f.shadow) v_sprite_window("juvenile.shadow", sh, 1 + (f.sh75 ? 1 : 0) * S0->scw, 0, r[0], feet - S0->sch, S0->scw, S0->sch); else v_sprite_hidden("juvenile.shadow", sh, r[0], feet - S0->sch); }
  v_name("juvenile");
  if (!f.cell) { v_sprite_hidden("juvenile", at, r[0], r[1]); return; }
  int ci = moving_close_cell(S0, f.cell); if (ci < 0) ci = 0;
  if (f.dl && f.dfrom && f.dup != f.up) {   /* the from at another anchor (the stand-in's step down, M1a): two nodes on the same screen Bayer, the from going out where it stands, the cell coming in at its own place */
    int a = moving_close_cell(S0, f.dfrom); if (a < 0) a = 0;
    v_sprite_hidden("juvenile", at, r[0], r[1]);
    v_region("juvenile", LAYER_ART); v_dither_window("juvenile.out", at, 1 + a * S0->cw, 0, NULL, 0, 0, f.dl, r[0], r[1] + f.ddf - f.dup, r[2], r[3]);
    v_dither_window("juvenile.dither", NULL, 0, 0, at, 1 + ci * S0->cw, 0, f.dl, r[0], r[1] + f.ddt - f.up, r[2], r[3]);
  } else if (f.dl) {
    int a = f.dfrom ? moving_close_cell(S0, f.dfrom) : -1, D = f.ddf > f.ddt ? f.ddf : f.ddt, hh = r[3] - (f.ddf > f.ddt ? f.ddf - f.ddt : f.ddt - f.ddf);
    v_sprite_hidden("juvenile", at, r[0], r[1]);
    v_region("juvenile", LAYER_ART); v_dither_window("juvenile.dither", a >= 0 ? at : NULL, a >= 0 ? 1 + a * S0->cw : 0, D - f.ddf, at, 1 + ci * S0->cw, D - f.ddt, f.dl, r[0], r[1] + D - f.up, r[2], hh);
  } else v_sprite_window("juvenile", at, 1 + ci * S0->cw, 0, r[0], r[1] - f.lift + f.dy - f.up, r[2], r[3]);
}
/* the juvenile stands in its box on the base from 1000 and steps out at 1400 and 1800; the picture is the new mibi's, its placeholder until the painting lands */
static void build_juvenile(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
  { const mv_stage_t *S0 = hatch_set(); if (S0 && in_state("hatch")) { build_moving_juvenile(S0, t); return; } }
  int r[4]; crect("regions.juvenile.rect", r); const char *pic = v_pstr("regions.juvenile.picture"); int a = ci("events.hatch.steps.4.at", 1000), up = 0, sat[4], sms[4], table, ns = lift_steps(sat, sms, &table, 4);
  int on = has(pic) && t >= a; for (int i = 0; on && i < ns; i++) if (t >= sat[i] && t < sat[i] + sms[i]) up = step_lift(table, t - sat[i]);
  v_name("juvenile"); if (on) v_sprite("juvenile", pic, r[0], r[1] - up, r[2], r[3]); else v_sprite_hidden("juvenile", has(pic) ? pic : v_pstr("regions.bud.ready"), r[0], r[1]);
}
/* the stamp label: a bone plate with a slate edge, the stamp centred on it */
static void build_stamp(void) {
  if (spec_len("props", "regions.stamp") < 0) return;
  int r[4]; crect("regions.stamp.rect", r); v_region("stamp", LAYER_CHROME); word_panel("stamp", r[0], r[1], r[2], r[3], colr("colours.stampLabel.fill"), colr("colours.stampLabel.edge"));
  const char *a = v_pstr("regions.stamp.asset"); int size = v_pint("regions.stamp.size", 0); if (!has(a) || !size) return;
  v_name("stamp"); v_sprite("stamp.stamp", a, r[0] + v_half(r[2] - size), r[1] + v_half(r[3] - size), size, size);
}
static void build_code(void) {
  if (spec_len("props", "regions.code") < 0 && !has(v_pstr("regions.code"))) return;
  int px = ci("regions.code.px", 16), cx = ci("regions.code.centre", 900); const char *code = v_pstr("regions.code"); int w = v_measure(code, px);
  v_region("code", LAYER_TYPE); v_text("code", code, cx - v_half(w), ci("regions.code.lineTop", 426) + v_fdiv(20 - v_cap(px), 2), *code ? w : 0, px, colr("colours.code"));
}
static void build_ribbon(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
  int r[4]; crect("regions.ribbon.rect", r); int at = ci("events.hatch.steps.5.at", 1200); const char *words = v_pstr("regions.ribbon");
  v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, t >= at ? words : "", ci("regions.ribbon.px", 20), ci("regions.ribbon.pad", 0), colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), colr("colours.ribbon.text"));
}

void incubator_words(void) {
  int t = hatch_time();
  build_bench();
  if (spec_len("props", "regions.rail") >= 0) word_rail(NULL);
  if (spec_len("props", "regions.leaves") >= 0) { v_name("leaves"); word_leavesArc(I, "regions.leaves", v_pstr("regions.leaves.empty"), v_pstr("regions.leaves.filled"), v_pint("regions.leaves.total", 0), v_pint("regions.leaves.full", 0), v_pint("regions.leaves.rows", 0)); }
  picture("dome", "dome", "regions.dome.rect", v_pstr("regions.dome.back"));
  picture("nest", "nest", "regions.nest.rect", v_pstr("regions.nest.picture"));
  build_bud(t);
  picture("nestFront", "nestFront", "regions.nestFront.rect", v_pstr("regions.nestFront.picture"));
  picture("domeFront", "domeFront", "regions.domeFront.rect", v_pstr("regions.domeFront.picture"));
  build_base();
  build_juvenile(t);
  build_stamp();
  build_code();
  build_ribbon(t);
}

/* a key on the Incubator: ✓, ← and the room keys say an intent on the room; the pad does nothing (one subject, no ring) */
void incubator_key(int code) {
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) screens_say("intent", "room", verb);
}
