/* The Incubator's binding table (lvgl-switch.md §2.2, §4 R; incubator.json; specs/station-incubator-tabs-ruling.md): the words that draw each of its states (empty, growing, ready, hatch) in draw order, from the `incubator` spec and the props' regions, the
   frame's words after (screens.c). Option B, candling: the stage (the ring's track recessed in it), the ring of time (the word arcFill, then a cut for each chapter that will clear: its emblem at its angle on the track), the cradle, the bud's own pod
   (its shell, the light of its step over it), the founder's shadow in it, the pod's seams and cracks, the cradle's near lip, the juvenile, the slip (left), the just-cleared card (right), the stamp label, the code and the ribbon, then the ring on the pod
   or the card. The events: `growNow` (the ring is a cut to full, the screen shows the bud as it was until the event ends: the ready state lands then) and `hatch` (a still beat with the pod as it stood at ready; the shell cracks at 600 and opens at
   800, goes at 1000, the juvenile stands at 1000 on the nest, the ribbon shows at 1200, the juvenile steps out at 1400 and 1800; the hand-off at 2600 is the host's). Every part has its node in every state from growing on (a part not shown has none of
   the size), so a minute passing, growNow and the hatch change nodes and never add or remove one (§2.2). A picture the host has not sent is a slot not yet filled. */
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
#include "../prim/angle_table.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define I "incubator"
static int ci(const char *p, int d) { return spec_int(I, p, d); }
static void crect(const char *p, int r[4]) { if (!v_spec_rect(I, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(I, p, o, 24); return o; }
static int ck(const char *base, int k) { return spec_int(I, v_fmt("%s.%d", base, k), 0); }
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

static void picture(const char *region, const char *id, const char *path, const char *asset) { int r[4]; crect(path, r); if (has(asset)) { v_name(region); v_sprite(id, asset, r[0], r[1], r[2], r[3]); } }

static void pic_or(const char *id, int on, const char *asset, int x, int y, int w, int h) { if (on) v_sprite(id, asset, x, y, w, h); else v_sprite_hidden(id, asset, x, y); }
static int hatch_moving(void);
#define HATCH_FADE0 1000
static int hatch_fade_level(int t) { return 16 * (t - HATCH_FADE0) / 180; }   /* the crossfade's level n at t ms, 1000–1180 (motion-spec §2.7a): floor(16 · (t − 1000) / 180) */

/* the stage: the frame's ground and the slate master over it (the ring's track is recessed in it) */
static void build_stage(void) {
  int r[4]; crect("regions.stage.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("stage", LAYER_CHROME); v_rect("stage", r[0], r[1], r[2], r[3], g);
  v_region("stage", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.stage.room"); i++) if (v_sprite("stage.room", v_pstr(v_fmt("regions.stage.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}

/* ---- the ring of time: the arc fill (specs/face-arc-and-shadow.md §1; the word steps whole degrees, deg = floor(264 · f)), then a cut for each chapter that will clear: the chapter's emblem, 24 × 24, centred on the track's centre line at its angle ---- */
static void build_ring(void) {
  if (spec_len("props", "regions.ring") < 0 && !has(v_pstr("regions.ring.fill"))) return;
  int deg = v_pint("regions.ring.f", 0) * ci("regions.ring.arc.sweep", 264) / 10000;
  v_region("ring", LAYER_ART); word_arcFill(I, "regions.ring", v_pstr("regions.ring.fill"), v_pstr("regions.ring.closedArt"), deg, v_pbool("regions.ring.closed", 0));
  int n = v_plen("regions.ring.cuts"), mx = ci("regions.ring.cuts.max", 8), cw = ck("regions.ring.cuts.size", 0), chh = ck("regions.ring.cuts.size", 1), rad = ci("regions.ring.cuts.radius", 188), cx = ci("regions.ring.arc.center.0", 512), cy = ci("regions.ring.arc.center.1", 288);
  const char *any = n > 0 ? v_pstr("regions.ring.cuts.0.emblem") : "";
  for (int k = 0; k < mx; k++) {
    v_name("ring"); const char *em = k < n ? v_pstr(v_fmt("regions.ring.cuts.%d.emblem", k)) : any;
    if (k < n && has(em)) { int a = ((v_pint(v_fmt("regions.ring.cuts.%d.at", k), 0) % 360) + 360) % 360, x = cx + v_fdiv(rad * ANGLE_S[a] + 16383, 32767), y = cy + v_fdiv(rad * ANGLE_C[a] + 16383, 32767); v_sprite(v_fmt("ring.cut.%d", k), em, x - cw / 2, y - chh / 2, cw, chh); }
    else if (has(em)) v_sprite_hidden(v_fmt("ring.cut.%d", k), em, 0, 0);
  }
}

/* ---- the pod: its shell, the light of its step over it (cool, warm or glowing; ready is glowing and, after the shadow, the seams), the founder's shadow in it, then the seams and the cracks (the hatch: crack 1 from 600, crack 2 from 800); the pod
   and its shadow go at 1000 (1180 with a moving set, a cut as the curl comes in), the cradle stays. Every node is there from growing on. ---- */
static int pod_gone(int t) { return t >= (hatch_moving() ? 1180 : ci("events.hatch.steps.4.at", 1000)); }
static void build_pod_front(int t) {
  if (spec_len("props", "regions.pod") < 0 && !has(v_pstr("regions.pod.shell"))) return;
  int r[4]; crect("regions.pod.rect", r); v_set_focal(r); int gone = t >= 0 && pod_gone(t); const char *stage = v_pstr("regions.pod.stage"), *step = v_pstr("regions.pod.step"), *shell = v_pstr("regions.pod.shell");
  int ready = !strcmp(stage, "ready") || !strcmp(stage, "hatch"), show = has(shell) && !gone;
  v_region("pod", LAYER_PAINTED); v_name("pod"); pic_or("pod.shell", show, shell, r[0], r[1], r[2], r[3]);
  static const char *LS[3] = { "cool", "warm", "glowing" };
  for (int i = 0; i < 3; i++) { const char *p = v_pstr(v_fmt("regions.pod.%s", LS[i])); v_name("pod"); pic_or(v_fmt("pod.light.%s", LS[i]), show && has(p) && (!strcmp(step, LS[i]) || (!strcmp(step, "ready") && i == 2)), p, r[0], r[1], r[2], r[3]); }
  { int s[4]; crect("regions.shadow.rect", s); const char *sh = v_pstr("regions.shadow.asset"); v_region("shadow", LAYER_PAINTED); v_name("shadow"); pic_or("shadow", show && has(sh), sh, s[0], s[1], s[2], s[3]); }
  { const char *se = v_pstr("regions.pod.seams"), *c1 = v_pstr("regions.pod.crack1"), *c2 = v_pstr("regions.pod.crack2"); int a1 = ci("regions.pod.cracks.crack1", 600), a2 = ci("regions.pod.cracks.crack2", 800);
    v_region("pod", LAYER_PAINTED); v_name("pod"); pic_or("pod.seams", show && ready && has(se), se, r[0], r[1], r[2], r[3]);
    v_name("pod"); pic_or("pod.crack1", show && t >= a1 && has(c1), c1, r[0], r[1], r[2], r[3]); v_name("pod"); pic_or("pod.crack2", show && t >= a2 && has(c2), c2, r[0], r[1], r[2], r[3]); }
}
static void build_cradle(void) {
  const char *p = v_pstr("regions.cradle.picture"); if (has(p)) picture("cradle", "cradle", "regions.cradle.rect", p);
}
static void build_cradle_front(void) { const char *p = v_pstr("regions.cradle.front"); if (has(p)) picture("cradleFront", "cradleFront", "regions.cradleFront.rect", p); }

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
typedef struct { const char *cell, *dfrom; int dy, lift, dl, ddf, ddt, sh75, shadow, shl, up, dup; } hatchf_t;   /* up, dup: the stand-in anchor's raise of the cell and of the dither's from (HATCH_STANDIN_FEET); shl: the shadow's dither-in level (0: whole) */
/* M1a only (motion-spec §2.7a): the curl stand-in's feet sit at row 424, centred on x 512, from 1000 to the end of the curl-to-crouch dither at 2320; the crouch comes in at 472 inside that dither, never a cut.
   While the stand-in stands there no juvenile shadow is drawn (the nest's painted shade grounds it); the shadow comes in with the crouch through that dither and is on from 2320.
   M1b drops this: the real 304 x 312 curl stands at 472 from 1000, its shadow on from 1180. One constant. */
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
  if (t < 1500) { f->cell = "curl"; f->shadow = !up; f->up = up; return; }   /* the anchored stand-in has no shadow */
  if (t < 2140) { f->cell = "curl-b1"; f->shadow = !up; f->up = up; return; }
  if (t < 2320) { f->cell = "crouch"; f->dy = 2; f->dl = 1 + 15 * (t - 2140) / 180; f->dfrom = "curl"; f->ddt = 2; f->shadow = 1; f->shl = up ? f->dl : 0; f->dup = up; return; }   /* the curl goes out at its anchor while the crouch, and with an anchor its shadow, come in at 472 */
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
  if (wire_has_asset(sh)) { v_name("juvenile.shadow"); const int sx = 1 + (f.sh75 ? 1 : 0) * S0->scw;
    if (f.cell && f.shadow && f.shl) { v_sprite_hidden("juvenile.shadow", sh, r[0], feet - S0->sch); v_dither_window("juvenile.shadow.in", NULL, 0, 0, sh, sx, 0, f.shl, r[0], feet - S0->sch, S0->scw, S0->sch); }   /* coming in with the crouch (the stand-in anchor, M1a) */
    else if (f.cell && f.shadow) v_sprite_window("juvenile.shadow", sh, sx, 0, r[0], feet - S0->sch, S0->scw, S0->sch); else v_sprite_hidden("juvenile.shadow", sh, r[0], feet - S0->sch); }
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
  if (!in_state("hatch")) { const char *sh = v_pstr("regions.pod.shell"); if (has(sh)) { int r[4]; crect("regions.juvenile.rect", r); v_name("juvenile"); v_sprite_hidden("juvenile", sh, r[0], r[1]); } return; }   /* its node is there from growing on, with no size until the hatch */
  { const mv_stage_t *S0 = hatch_set(); if (S0 && in_state("hatch")) { build_moving_juvenile(S0, t); return; } }
  int r[4]; crect("regions.juvenile.rect", r); const char *pic = v_pstr("regions.juvenile.picture"); int a = ci("events.hatch.steps.4.at", 1000), up = 0, sat[4], sms[4], table, ns = lift_steps(sat, sms, &table, 4);
  int on = has(pic) && t >= a; for (int i = 0; on && i < ns; i++) if (t >= sat[i] && t < sat[i] + sms[i]) up = step_lift(table, t - sat[i]);
  v_name("juvenile"); if (on) v_sprite("juvenile", pic, r[0], r[1] - up, r[2], r[3]); else v_sprite_hidden("juvenile", has(pic) ? pic : v_pstr("regions.pod.shell"), r[0], r[1]);
}

/* ---- the slip (left): the species name at 20 px, how it was found (two lines at most, `mist`), "Your changes" with a line a change (three at most), "Cleared while growing" with a line a chapter, newest first (five at most), then "still to come"
   (a crossed bud: "read it when it's out"). The text stacks from the top of the paper by its pitches; a block with nothing to say takes no room and its nodes keep no size. A line is cut at a word with … at 176 px. ---- */
static void slip_line(const char *id, const char *text, int *y, int x, int px, int pitch, int maxw, const char *colour) {
  char cut[V_STR]; if (*text) v_clip(text, maxw, px, cut, sizeof cut); else cut[0] = 0;
  int w = v_measure(cut, px); v_text(id, cut, x, v_fdiv(pitch - v_cap(px), 2) + *y, *cut ? w : 0, px, colour); if (*cut) *y += pitch;
}
static void build_slip(void) {
  if (spec_len("props", "regions.slip") < 0 && !has(v_pstr("regions.slip.paper"))) return;
  int r[4]; crect("regions.slip.rect", r); int x = ci("regions.slip.textX", 104), px = ci("regions.slip.px", 16), pitch = ci("regions.slip.pitch", 24), gap = ci("regions.slip.gap", 8), maxw = ci("regions.slip.maxLine", 176), y = r[1] + ci("regions.slip.pad", 16);
  v_region("slip", LAYER_PAINTED); picture("slip", "slip", "regions.slip.rect", v_pstr("regions.slip.paper"));
  v_region("slip", LAYER_TYPE);
  slip_line("slip.name", v_pstr("regions.slip.name"), &y, x, ci("regions.slip.namePx", 20), ci("regions.slip.namePitch", 32), maxw, colr("colours.slip.name"));
  { int nf = v_plen("regions.slip.found"), maxf = ci("regions.slip.foundLines", 2), line = 0; char buf[V_STR * 3];
    for (int i = 0; i < nf && line < maxf; i++) { char s[V_STR]; snprintf(s, sizeof s, "%s", v_pstr(v_fmt("regions.slip.found.%d", i))); int nl = v_wrap(s, maxw, px, buf, sizeof buf, 8); const char *l = buf; for (int j = 0; j < nl && line < maxf; j++, line++) { slip_line(v_fmt("slip.found.%d", line), l, &y, x, px, pitch, maxw, colr("colours.slip.found")); l += strlen(l) + 1; } }
    for (; line < maxf; line++) { int y0 = y; slip_line(v_fmt("slip.found.%d", line), "", &y0, x, px, pitch, maxw, colr("colours.slip.found")); } }
  { int nc = v_plen("regions.slip.changes"), maxc = ci("regions.slip.maxChanges", 3); char head[48]; spec_str(I, "strings.slip.changes", head, sizeof head); if (nc > 0) y += gap;
    slip_line("slip.changes", nc > 0 ? head : "", &y, x, px, pitch, maxw, colr("colours.slip.heading"));
    for (int k = 0; k < maxc; k++) slip_line(v_fmt("slip.change.%d", k), k < nc ? v_pstr(v_fmt("regions.slip.changes.%d", k)) : "", &y, x, px, pitch, maxw, colr("colours.slip.line")); }
  { int nl = v_plen("regions.slip.cleared"), maxl = ci("regions.slip.maxCleared", 5), cross = v_pbool("regions.slip.cross", 0), more = *v_pstr("regions.slip.toCome") != 0; char head[48], cross_w[64]; spec_str(I, "strings.slip.cleared", head, sizeof head); spec_str(I, "strings.slip.cross", cross_w, sizeof cross_w);
    int any = nl > 0 || more || cross; if (any) y += gap;
    slip_line("slip.cleared", any ? head : "", &y, x, px, pitch, maxw, colr("colours.slip.heading"));
    for (int k = 0; k < maxl; k++) slip_line(v_fmt("slip.clear.%d", k), k < nl ? v_pstr(v_fmt("regions.slip.cleared.%d", k)) : "", &y, x, px, pitch, maxw, colr("colours.slip.line"));
    slip_line("slip.toCome", cross ? cross_w : v_pstr("regions.slip.toCome"), &y, x, px, pitch, maxw, colr("colours.slip.quiet")); }
}

/* ---- the card (right): "Just cleared" (before the first clearing "Next to clear"), the cleared chapter's first trait picture at 160 × 128 (its emblem centred while no crop is placed), the chapter and the look in words. A focus target while drawn. ---- */
static void build_card(void) {
  int r[4]; crect("regions.card.rect", r); int on = spec_len("props", "regions.card") >= 0 || has(v_pstr("regions.card.ground"));
  const char *ground = v_pstr("regions.card.ground"), *crop = v_pstr("regions.card.picture"), *em = v_pstr("regions.card.emblem");
  v_region("card", LAYER_PAINTED); v_name("card"); pic_or("card.ground", on && has(ground), ground, r[0], r[1], r[2], r[3]);
  int px = 16, hx = r[0] + ck("regions.card.heading.at", 0), hy = r[1] + ck("regions.card.heading.at", 1), pw = ck("regions.card.picture.size", 0), ph = ck("regions.card.picture.size", 1), ex = r[0] + ck("regions.card.picture.at", 0), ey = r[1] + ck("regions.card.picture.at", 1);
  int crop_ok = on && has(crop) && wire_has_asset(crop);
  v_name("card"); pic_or("card.crop", crop_ok, has(crop) ? crop : em, ex, ey, pw, ph);
  v_name("card"); pic_or("card.emblem", on && has(em) && !crop_ok, em, ex + (pw - 24) / 2, ey + (ph - 24) / 2, 24, 24);
  v_region("card", LAYER_TYPE);
  { const char *w = on ? v_pstr("regions.card.heading") : ""; int tw = v_measure(w, px); v_text("card.heading", w, hx, v_fdiv(ck("regions.card.heading.size", 1) - v_cap(px), 2) + hy, *w ? tw : 0, px, colr("colours.card.heading")); }
  { const char *w = on ? v_pstr("regions.card.chapter") : ""; char cut[V_STR]; v_clip(w, ck("regions.card.trait.size", 0), px, cut, sizeof cut); int tw = v_measure(cut, px); v_text("card.trait", cut, r[0] + ck("regions.card.trait.at", 0), v_fdiv(ck("regions.card.trait.size", 1) - v_cap(px), 2) + r[1] + ck("regions.card.trait.at", 1), *cut ? tw : 0, px, colr("colours.card.trait")); }
  { const char *w = on ? v_pstr("regions.card.look") : ""; char cut[V_STR]; v_clip(w, ck("regions.card.look.size", 0), px, cut, sizeof cut); int tw = v_measure(cut, px); v_text("card.look", cut, r[0] + ck("regions.card.look.at", 0), v_fdiv(ck("regions.card.look.size", 1) - v_cap(px), 2) + r[1] + ck("regions.card.look.at", 1), *cut ? tw : 0, px, colr("colours.card.look")); }
}

/* the stamp label: the dimmed plate (stampCase: 120 x 120, a 1 px edge), the dimmed stamp centred on it; no plate with no stamp */
static void build_stamp(void) {
  if (spec_len("props", "regions.stamp") < 0) return;
  int r[4]; crect("regions.stamp.rect", r); const char *pl = v_pstr("regions.stamp.plate"), *a = v_pstr("regions.stamp.asset"); int size = v_pint("regions.stamp.size", 0);
  v_region("stamp.plate", LAYER_PAINTED); if (has(pl)) { if (has(a) && size) v_sprite("stamp.plate", pl, r[0], r[1], r[2], r[3]); else v_sprite_hidden("stamp.plate", pl, r[0], r[1]); }
  v_region("stamp", LAYER_PAINTED);
  if (!has(a) || !size) return;
  v_name("stamp"); v_sprite("stamp.stamp", a, r[0] + v_half(r[2] - size), r[1] + v_half(r[3] - size), size, size);
}
static void build_code(void) {
  if (spec_len("props", "regions.code") < 0 && !has(v_pstr("regions.code"))) return;
  int px = ci("regions.code.px", 16), cx = ci("regions.code.centre", 900); const char *code = v_pstr("regions.code"); int w = v_measure(code, px);
  v_region("code", LAYER_CHROME); v_rect("code.rule", ck("regions.code.rule.x", 0), ci("regions.code.rule.y", 405), ck("regions.code.rule.x", 1) - ck("regions.code.rule.x", 0), ci("regions.code.rule.h", 1), colr("colours.codeRule"));   /* the 1 px rule under the code (the shared stamp slot) */
  v_region("code", LAYER_TYPE); v_text("code", code, cx - v_half(w), ci("regions.code.lineTop", 426) + v_fdiv(20 - v_cap(px), 2), *code ? w : 0, px, colr("colours.code"));
}
static void build_ribbon(int t) {
  if (!in_state("hatch")) return;
  int r[4]; crect("regions.ribbon.rect", r); int at = ci("events.hatch.steps.5.at", 1200); const char *words = v_pstr("regions.ribbon");
  v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, t >= at ? words : "", ci("regions.ribbon.px", 20), ci("regions.ribbon.pad", 0), colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), colr("colours.ribbon.text"));
}


/* ---- the targets as the words drew them (the pod, the card while it is drawn), and the ring ---- */
int incubator_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph"); int n = v_plen("focus.targets"); if (n > cap) n = cap; int k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i))); t->enabled = 1;
    int r[4] = { 0, 0, 0, 0 }; crect(strcmp(t->id, "card") == 0 ? "regions.card.rect" : "regions.pod.rect", r); t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}
static void build_ring_focus(void) {
  const char *cur = v_focus_cur(); int card = strcmp(cur, "card") == 0, pod = strcmp(cur, "pod") == 0; if ((!card && !pod) || anim_holding()) return;   /* the ring goes while a hold plays (Home's rule) */
  int r[4]; crect(card ? "regions.card.rect" : "regions.pod.rect", r); v_region("focus", LAYER_CHROME); word_focusRing("focus", I, card ? "focus.targets.card" : "focus.targets.pod", r);
}

void incubator_words(void) {
  int t = hatch_time();
  build_stage();
  build_ring();
  build_cradle();
  build_pod_front(t);
  build_cradle_front();
  build_juvenile(t);
  build_slip();
  build_card();
  build_stamp();
  build_code();
  build_ribbon(t);
  build_ring_focus();
}

/* a key on the Incubator: ✓, ← and the room keys say an intent on the focus (the pod, the card, or the room when nothing is focusable); ◀ ▶ move the ring between the pod and the card (a focus message); ▲ ▼ do nothing */
void incubator_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "room");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[4]; char gkey[24]; int n = incubator_focus(t, 4, gkey, sizeof gkey); if (n <= 0) return;
  int glen; const char *graph = spec_raw(I, "focus.graph", &glen); char err[200]; focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  char to[48]; focus_move(g, t, n, cur, dir, NULL, 0, NULL, to, sizeof to); focus_graph_free(g);
  if (strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
