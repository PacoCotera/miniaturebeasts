/* One mibi up close, the Vivarium's closest level (habitat.json; station-layouts.md "The Vivarium: the whole and one mibi up close"): the words that draw it from the spec and the props' regions, in draw order, then the focus ring.
   The stage, the living window (the near Vivarium of the light) with the mibi large in it (or the out mark while it is out with the Companion), its name tag (or the meet ribbon), the card (the species line and its guide mark, the story,
   the code, the heart, the skill notches, the stamp label and one plate a chapter), the four modules (the Companion's set, Portrait, Cross, Wild) and the strip of bays. A picture the host has not sent is a slot not yet filled: nothing is drawn.
   The events: `moment` (the placeholder's two hops: the creature lifts by the spec's table, the box, the tag and the ring stay), `read` (the stamp prints its cells row by row over its length), `dither` on the resident (the swap to a tile's mibi), `flash`
   on the tag (the namer saved a name). Habitat's focus is `focus.graph` of habitat.json on the boxes this file drew; while the namer (an overlay, screens/namer.c) is open habitat draws no ring and takes no key. */
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

#define S "habitat"
#define MAXP 8
#define MAXF 11
static int hi(const char *p, int d) { return spec_int(S, p, d); }
static int hk(const char *base, int k) { return spec_int(S, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(S, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(S, p, o, 24); return o; }
static const char *fcol(const char *p) { static char b[4][24]; static int k; char *o = b[k++ & 3]; spec_str("frame", p, o, 24); return o; }
static int has(const char *id) { return id && *id && wire_has_asset(id); }
static int g_tag[4];   /* the name tag as drawn (the name target's box), zeros while the meet ribbon stands in its place */

/* ---- the stage and the living window ---- */
static void build_stage(void) {
  int r[4]; hrect("regions.stage.rect", r);
  v_region("stage", LAYER_CHROME); v_rect("stage.ground", r[0], r[1], r[2], r[3], fcol("colours.stageGround"));
  v_region("stage", LAYER_PAINTED);
  for (int i = 0, n = v_plen("regions.stage.room"); i < n; i++) if (v_sprite("stage.room", v_pstr(v_fmt("regions.stage.room.%d", i)), r[0], r[1], r[2], r[3])) break;   /* the up-close stage master, until it is signed the ground alone */
}

/* ---- the resident ---- */
/* the lift of the placeholder's hops (events.moment.placeholder): hop h begins at `hops[h]` ms of the moment and runs `ms`; `lift` is [ms into the hop, px above where the creature stands]; whole pixels, no ease */
static int hop_lift(void) {
  anim_state_t t; if (!v_pbool("motion", 1) || !anim_get(ANIM_MOMENT, "resident", &t)) return 0;
  int ms = hi("events.moment.placeholder.ms", 400), lift = 0;
  for (int h = 0, n = spec_len(S, "events.moment.placeholder.hops"); h < n; h++) {
    int at = hk("events.moment.placeholder.hops", h), dt = t.elapsed - at; if (dt < 0 || dt >= ms) continue;
    for (int k = 0, m = spec_len(S, "events.moment.placeholder.lift"); k < m; k++) { int step = hk(v_fmt("events.moment.placeholder.lift.%d", k), 0); if (step <= dt) lift = hk(v_fmt("events.moment.placeholder.lift.%d", k), 1); }
  }
  return lift;
}
static void build_ring_under(const char *cur) {
  if (strcmp(cur, "resident") != 0 || spec_len("props", "overlay") >= 0) return;
  int r[4]; hrect("regions.resident.rect", r); v_region("focus", LAYER_CHROME);
  word_focusRing("focus", r, S, "focus.targets.resident.ring", fcol("colours.ring"));   /* the feet ring: under the creature, as on Home */
}
/* ---- up close with a moving set (Station M1 §2.4): the resident from the close atlas at the rect and its shadow at the feet (drawn before the feet ring, build_moving_shadow); its own 80 ms tick from the screen's first frame, at the seed's phase; awake the breath, asleep the asleep loop;
   Greet the set's hops (events.moment), a sleeper's Greet wake, hops, curl (events.moment.asleep); dithers 16 levels over 180 ms; the blink (an adult with a blink cell) every 4–9 s for 2 ticks at rest; never mirrored. ---- */
static uint32_t g_ht0; static int g_hhave, g_hlast_tick = -1; static uint32_t g_hbreath0, g_hmoment_end; static int g_hmoment_on; static char g_hid[24];
static unsigned g_bs; static long g_bnext; static int g_bseeded;   /* the blink's LCG and its next tick */
void habitat_hidden(void) { g_hhave = 0; }
static const mv_stage_t *close_set(void) {
  const char *set = v_pstr("regions.resident.moving.set"), *atlas = v_pstr("regions.resident.moving.close"), *stg = v_pstr("regions.resident.stage"); if (!*set || !has(atlas)) return NULL;
  const mv_stage_t *ms = moving_stage(set, !strcmp(stg, "juvenile") ? MV_JUV : !strcmp(stg, "elder") ? MV_ELDER : MV_ADULT); int r[4]; hrect("regions.resident.rect", r);
  return ms && ms->cw == r[2] && ms->ch == r[3] ? ms : NULL;
}
static int loop_at(const mv_loop_t *l, int t) { int p = 0; for (int i = 0; i < l->n; i++) p += l->ms[i] / 80; if (p <= 0) return l->cell[0]; t %= p; for (int i = 0; i < l->n; i++) { int d = l->ms[i] / 80; if (t < d) return l->cell[i]; t -= d; } return l->cell[0]; }
static int loop_len(const mv_loop_t *l) { int p = 0; for (int i = 0; i < l->n; i++) p += l->ms[i] / 80; return p > 0 ? p : 1; }
/* the frame of the moving resident at the face's time: its close cell (by name), lift, dy, a dither (from, to, level; from NULL is clear) and shadow-75 */
typedef struct { const char *cell, *dfrom, *dto; int lift, dy, dl, ddf, ddt, sh75; } close_t;
/* the step up close (closeStep, the animator's S05 ruling): crouch, the step cell, then stand; NULL outside it */
static const char *close_step(const mv_stage_t *S0, int dt) { if (dt < 0 || !S0->cstep_ms || dt >= S0->cstep_crouch + S0->cstep_ms) return NULL; return dt < S0->cstep_crouch ? "crouch" : S0->ccell[S0->cstep_cell]; }
static void close_frame(const mv_stage_t *S0, close_t *f, int scale_n, int scale_d) {
  memset(f, 0, sizeof *f); uint32_t now = anim_now(); int asleep = !strcmp(v_pstr("regions.resident.rest"), "asleep"), seed = v_pint("regions.resident.seed", 0), motion = v_pbool("motion", 1);
  const char *stand = "stand", *curl = "curl";
  if (!motion) { f->cell = asleep ? curl : stand; return; }   /* motion off: stand, or curl when asleep */
  anim_state_t t; int moment = anim_get(ANIM_MOMENT, "resident", &t);
  if (moment && !g_hmoment_on) g_hmoment_on = 1;
  if (!moment && g_hmoment_on) { g_hmoment_on = 0; g_hbreath0 = now; g_hmoment_end = now; }   /* after a moment the breath starts again from b0 */
  int dither = S0->close_dither_ms > 0 ? S0->close_dither_ms : 180;
  if (moment) {
    int e = t.elapsed, h0 = spec_int(S, "events.moment.placeholder.hops.0", 0), h1 = spec_int(S, "events.moment.placeholder.hops.1", 900);
    if (asleep && t.ms == spec_int(S, "events.moment.asleep.ms", 2880)) {   /* a sleeper's Greet: wake (dither, crouch 400, stand), the hops, crouch 320, dither, curl */
      int wcr = S0->wake_crouch ? S0->wake_crouch : 400, hops0 = dither + wcr, hopEnd = hops0 + h1 + (S0->chop_nlift ? S0->chop_crouch + S0->chop_nlift * 80 + S0->chop_land : S0->cstep_crouch + S0->cstep_ms), ccr = S0->curl_crouch ? S0->curl_crouch : 320;
      if (e < dither) { f->cell = "crouch"; f->dy = 2; f->dl = 16 * e / dither; f->dfrom = curl; f->dto = "crouch"; f->ddt = 2; if (f->dl < 1) f->dl = 1; return; }
      if (e < hops0) { f->cell = "crouch"; f->dy = 2; return; }
      if (e < hopEnd) { const char *c = stand; int up = 0, sh = 0; if (S0->chop_nlift) { if (!moving_close_hop(S0, e - hops0 - h0, S0->chop_lift, S0->chop_nlift, scale_n, scale_d, &c, &up, &sh)) moving_close_hop(S0, e - hops0 - h1, S0->chop_lift, S0->chop_nlift, scale_n, scale_d, &c, &up, &sh); } else c = close_step(S0, e - hops0 - h0) ? close_step(S0, e - hops0 - h0) : close_step(S0, e - hops0 - h1) ? close_step(S0, e - hops0 - h1) : stand; f->cell = c; f->lift = up; f->sh75 = sh; return; }
      if (e < hopEnd + ccr) { f->cell = "crouch"; f->dy = 2; return; }
      if (e < hopEnd + ccr + dither) { f->cell = curl; f->dl = 16 * (e - hopEnd - ccr) / dither; if (f->dl < 1) f->dl = 1; f->dfrom = "crouch"; f->ddf = 2; f->dto = curl; return; }
      f->cell = curl; return;
    }
    if (!asleep) { const char *c = stand; int up = 0, sh = 0;   /* Greet: the hops at 0 and 900 ms of the moment */
      if (S0->chop_nlift && (moving_close_hop(S0, e - h0, S0->chop_lift, S0->chop_nlift, scale_n, scale_d, &c, &up, &sh) || moving_close_hop(S0, e - h1, S0->chop_lift, S0->chop_nlift, scale_n, scale_d, &c, &up, &sh))) { f->cell = c; f->lift = up; f->sh75 = sh; return; }
      if (!S0->chop_nlift && S0->cstep_ms) { const char *st = close_step(S0, e - h0); if (!st) st = close_step(S0, e - h1); if (st) { f->cell = st; return; } }   /* a set with no hop up close (S05): the eager step, twice, on the hop's schedule */
      f->cell = stand; return; }
  }
  int tick = (int)((now - g_hbreath0) / 80u);
  if (asleep) { f->cell = S0->ccell[0]; int c = loop_at(&S0->asleep, tick + (g_hbreath0 == g_ht0 ? seed % loop_len(&S0->asleep) : 0)); f->cell = S0->wcell[c]; return; }
  int c = loop_at(&S0->breathe, tick + (g_hbreath0 == g_ht0 ? seed % loop_len(&S0->breathe) : 0)); f->cell = S0->wcell[c];
  if (S0->blink_ms > 0 && moving_close_cell(S0, "blink") >= 0) {   /* the blink: every blink[1]–blink[2] ms (seeded) for blink[0] ms, awake, at rest, never in a moment */
    long at = (long)((now - g_ht0) / 80u), lo = S0->blink_lo / 80, hi = S0->blink_hi / 80, len = S0->blink_ms / 80;
    if (!g_bseeded) { g_bseeded = 1; g_bs = (unsigned)seed ^ 0x9e3779b9u; g_bs = g_bs * 1664525u + 1013904223u; g_bnext = lo + (long)((g_bs >> 16) % (unsigned)(hi - lo + 1)); }
    while (at >= g_bnext + len) { g_bs = g_bs * 1664525u + 1013904223u; g_bnext += lo + (long)((g_bs >> 16) % (unsigned)(hi - lo + 1)); }
    if (at >= g_bnext && at < g_bnext + len) f->cell = "blink";
  }
}
int habitat_tick(uint32_t now) {   /* a moving resident's 80 ms tick is due: draw again */
  if (strcmp(v_pstr("screen"), "habitat") != 0 || !g_hhave || !v_pbool("motion", 1) || !v_pstr("regions.resident.moving.set")[0]) return 0;
  int k = (int)((now - g_ht0) / 80u); if (k == g_hlast_tick) return 0; g_hlast_tick = k; return 1;
}
int habitat_test_cell(void) { const mv_stage_t *S0 = close_set(); if (!S0) return -100; close_t f; close_frame(S0, &f, 1, 1); return f.dl ? -1 - f.dl : moving_close_cell(S0, f.cell); }   /* test hook: the close cell shown (−1 − level while it dithers) */
int habitat_test_lift(void) { const mv_stage_t *S0 = close_set(); if (!S0) return -100; close_t f; close_frame(S0, &f, 1, 1); return f.lift; }
static void close_now(const mv_stage_t *S0, const int r[4], close_t *f) {   /* this frame's close cell: its own tick from the screen's first frame (and a new mibi's), the hop scaled to the window */
  { const char *id = v_pstr("regions.resident.id"); if (!g_hhave || strcmp(g_hid, id)) { g_hhave = 1; g_ht0 = anim_now(); g_hbreath0 = g_ht0; g_hmoment_end = 0; g_hmoment_on = 0; g_bseeded = 0; snprintf(g_hid, sizeof g_hid, "%s", id); } }
  int glass[4]; hrect("regions.glass.rect", glass); int room = r[1] - glass[1], apex = 0; for (int i = 0; i < S0->chop_nlift; i++) if (S0->chop_lift[i] > apex) apex = S0->chop_lift[i];
  int sn = 1, sd = 1; if (apex > room && apex > 0) { sn = room > 0 ? room : 0; sd = apex; }   /* the hop scales down to fit the window above the figure, never clipped */
  close_frame(S0, f, sn, sd);
}
/* the moving resident's shadow at its feet, never lifted, drawn before the feet ring (UI/UX Q8: the walkers' order, glass, shadow, ring, resident); a mibi without a set keeps its baked shadow */
static void build_moving_shadow(void) {
  const mv_stage_t *S0 = close_set(); if (!S0) return;
  const char *shadow = v_pstr("regions.resident.moving.shadow"); char sh[96]; snprintf(sh, sizeof sh, "%s", shadow); if (!has(sh)) return;
  int r[4]; hrect("regions.resident.rect", r); close_t f; close_now(S0, r, &f);
  v_name("resident.shadow"); v_sprite_window("resident.shadow", sh, 1 + (f.sh75 ? 1 : 0) * S0->scw, 0, r[0], r[1] + r[3] - S0->sch, S0->scw, S0->sch);
}
static int build_moving_resident(const char *cur, int r[4], int lift) {
  const mv_stage_t *S0 = close_set(); if (!S0) return 0;
  const char *atlas = v_pstr("regions.resident.moving.close"); char at[96]; snprintf(at, sizeof at, "%s", atlas);
  close_t f; close_now(S0, r, &f);
  int y = r[1] - lift - f.lift + f.dy;
  v_region("resident", LAYER_ART);
  char from[96] = ""; int level = 16; anim_state_t t; const char *pic = v_pstr("regions.resident.picture");
  if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "resident", &t) && t.from_id[0] && t.ms > 0 && wire_has_asset(t.from_id)) { snprintf(from, sizeof from, "%s", t.from_id); level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; }   /* the swap: from the old mibi's picture to this cell */
  int ci = moving_close_cell(S0, f.cell); if (ci < 0) ci = 0;
  if (from[0]) { v_name("resident"); v_sprite_hidden("resident.pic", at, r[0], y); v_dither_window("resident.dither", from, 0, 0, at, 1 + ci * S0->cw, 0, level, r[0], y, r[2], r[3]); }
  else if (f.dl) {
    int a = f.dfrom ? moving_close_cell(S0, f.dfrom) : -1, b = moving_close_cell(S0, f.dto); int D = f.ddf > f.ddt ? f.ddf : f.ddt, hh = r[3] - (f.ddf > f.ddt ? f.ddf - f.ddt : f.ddt - f.ddf);
    v_name("resident"); v_sprite_hidden("resident.pic", at, r[0], y);
    v_dither_window("resident.dither", a >= 0 ? at : NULL, a >= 0 ? 1 + a * S0->cw : 0, D - f.ddf, at, 1 + b * S0->cw, D - f.ddt, f.dl, r[0], r[1] - lift + D, r[2], hh);
  } else { v_name("resident"); v_sprite_window("resident.pic", at, 1 + ci * S0->cw, 0, r[0], y, r[2], r[3]); }
  (void)pic; (void)cur;
  return 1;
}
static void build_resident(const char *cur) {
  int r[4], lp[4]; hrect("regions.resident.rect", r); hrect("regions.resident.lamp.rect", lp);
  if (build_moving_resident(cur, r, strcmp(cur, "resident") == 0 ? hi("regions.resident.lift", 4) : 0)) {
    int waiting = v_pbool("regions.resident.waiting", 0), lift = (strcmp(cur, "resident") == 0 ? hi("regions.resident.lift", 4) : 0); const char *pic = v_pstr("regions.resident.picture");
    if (has(pic)) v_sprite_hidden("resident.out", pic, r[0], r[1]);
    v_name("resident.lamp"); build_waitingLamp("resident.lamp", lp[0], lp[1] - lift, waiting);
    return;
  }
  const char *pic = v_pstr("regions.resident.picture"), *outPic = v_pstr("regions.resident.out"); int waiting = v_pbool("regions.resident.waiting", 0), lift = (strcmp(cur, "resident") == 0 ? hi("regions.resident.lift", 4) : 0);
  char from[96] = ""; int level = 16; anim_state_t t;
  if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "resident", &t) && t.from_id[0] && t.ms > 0 && wire_has_asset(t.from_id) && has(pic)) { snprintf(from, sizeof from, "%s", t.from_id); level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; }   /* the swap: the old mibi cross-dithers to the new in 16 levels */
  int y = r[1] - lift - hop_lift(), dithering = from[0] != 0;
  v_region("resident", LAYER_ART);
  if (has(pic) && !dithering) { v_name("resident"); v_sprite("resident.pic", pic, r[0], y, r[2], r[3]); } else if (has(pic)) v_sprite_hidden("resident.pic", pic, r[0], y); else if (has(outPic)) v_sprite_hidden("resident.pic", outPic, r[0], y);
  v_region("resident", LAYER_ART);
  if (dithering) v_dither("resident.dither", from, pic, level, r[0], y, r[2], r[3]);
  if (has(outPic)) { int o[4]; hrect("regions.resident.out.rect", o); v_name("resident"); v_sprite("resident.out", outPic, o[0], o[1], o[2], o[3]); }
  else if (has(pic)) v_sprite_hidden("resident.out", pic, r[0], r[1]);
  v_name("resident.lamp"); build_waitingLamp("resident.lamp", lp[0], lp[1] - lift, waiting && !has(outPic));   /* rides the focus lift */
}

/* ---- the name tag, or the meet ribbon in its place ---- */
static void build_tag(void) {
  int box[4], rib[4]; hrect("regions.resident.rect", box); hrect("regions.meetRibbon.rect", rib);
  const char *name = v_pstr("regions.nameTag.text"), *words = v_pstr("regions.meetRibbon.text"); int meet = strcmp(v_pstr("state"), "meet") == 0 && *words;
  anim_state_t t; int flash = v_pbool("motion", 1) && anim_get(ANIM_FLASH, "nameTag", &t);   /* the frame's flash, solid for the event's 240 ms as a counter's (frame.c) */
  memset(g_tag, 0, sizeof g_tag);
  v_region("meetRibbon", LAYER_CHROME);
  word_ribbon("meetRibbon", rib, meet ? words : "", hi("regions.meetRibbon.px", 20), hi("regions.meetRibbon.pad", 0), flash ? fcol("colours.flash") : colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), flash ? fcol("colours.flashInk") : colr("colours.ribbon.text"));
  if (!meet) { g_tagFlash = flash; build_nameTag(S, "regions.glass", name, box, hi("regions.resident.lift", 4), g_tag); g_tagFlash = 0; }
  else { g_tagSlot = 1; build_nameTag(S, "regions.glass", name, box, hi("regions.resident.lift", 4), g_tag); g_tagSlot = 0; memset(g_tag, 0, sizeof g_tag); }   /* the same nodes with no size, at the tag's place: the opening redraws nothing at the origin */
}

/* ---- the card ---- */
static void card_sprite(const char *id, const char *pic, int x, int y, int w, int h) { v_name("card"); if (has(pic)) v_sprite(id, pic, x, y, w, h); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), x, y); }
static void build_card(void) {
  int c[4]; hrect("regions.card.rect", c);
  { const char *pl = v_pstr("regions.card.plate"); v_region("card", LAYER_PAINTED); if (*pl) v_sprite("card", pl, c[0], c[1], c[2], c[3]); }   /* fix 2 F1: the card is its device plate, 1:1, the region's first node; no picture, no plate (F6) */
  card_sprite("card.heart", v_pstr("regions.card.heart"), c[0] + hk("regions.card.heart.at", 0), c[1] + hk("regions.card.heart.at", 1), hk("regions.card.heart.size", 0), hk("regions.card.heart.size", 1));
  int n = v_pint("regions.card.notches.count", 0); if (n > 3) n = 3; const char *np = v_pstr("regions.card.notches.picture"); int nw = hk("regions.card.notches.notch", 0), nh = hk("regions.card.notches.notch", 1);
  for (int i = 0; i < 3; i++) { int x = i < n ? hk(v_fmt("regions.card.notches.places.%d.%d", n, i), 0) : 0, y = i < n ? hk(v_fmt("regions.card.notches.places.%d.%d", n, i), 1) : 0; if (i < n) card_sprite(v_fmt("card.notch.%d", i), np, x, y, nw, nh); else card_sprite(v_fmt("card.notch.%d", i), "", 0, 0, 0, 0); }
}
static void build_speciesLine(void) {
  int r[4]; hrect("regions.speciesLine.rect", r); const char *text = v_pstr("regions.card.species.text"), *mark = v_pstr("regions.card.species.mark"); int px = hi("regions.speciesLine.px", 16), w = v_measure(text, px);
  v_region("speciesLine", LAYER_TYPE); v_text("speciesLine.text", text, r[0], hi("regions.speciesLine.lineTop", 66) + v_fdiv(20 - v_cap(px), 2), w, px, colr("colours.card.species"));
  int mw = hk("regions.speciesLine.mark.size", 0), mh = hk("regions.speciesLine.mark.size", 1);
  v_name("speciesLine"); if (has(mark)) v_sprite("speciesLine.mark", mark, r[0] + w + hi("regions.speciesLine.mark.gap", 4), r[1] + v_fdiv(r[3] - mh, 2), mw, mh); else v_sprite_hidden("speciesLine.mark", v_pstr("regions.glass.picture"), 0, 0);   /* 4 px after the line's last word, on its centre */
}
static void build_story(void) {
  v_region("story", LAYER_TYPE); int px = hi("regions.story.px", 16);
  for (int i = 0; i < 3; i++) { const char *t = v_pstr(v_fmt("regions.card.story.%d", i)); int w = v_measure(t, px), top = hk("regions.story.lineTops", i); v_text(v_fmt("story.%d", i), t, hk("regions.story.rect", 0), top + v_fdiv(20 - v_cap(px), 2), *t ? w : 0, px, colr("colours.card.story")); }
}
static void build_code(void) {
  const char *code = v_pstr("regions.card.code"); int px = hi("regions.code.px", 16), w = v_measure(code, px);
  v_region("code", LAYER_TYPE); v_text("code", code, hk("regions.code.rect", 0), hi("regions.code.lineTop", 162) + v_fdiv(20 - v_cap(px), 2), *code ? w : 0, px, colr("colours.card.code"));
}
/* the stamp label: a bone plate with a slate edge and the stamp centred on it; the read event prints its cells row by row from the top over its length (N + 2 rows of `cell` px, whole rows) */
static void build_stamp(void) {
  int r[4]; hrect("regions.stamp.rect", r); v_region("stamp", LAYER_CHROME); word_panel("stamp", r[0], r[1], r[2], r[3], colr("colours.stampLabel.fill"), colr("colours.stampLabel.edge"));
  const char *a = v_pstr("regions.card.stamp.asset"); int size = v_pint("regions.card.stamp.size", 0), N = v_pint("regions.card.stamp.N", 0), cell = v_pint("regions.card.stamp.cell", 0);
  if (!has(a) || !size) return;
  int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size), rows = N + 2, shown = rows; anim_state_t t;
  if (v_pbool("motion", 1)) for (int i = 0, n = v_plen("regions.plates.items"); i < n; i++) if (anim_get(ANIM_READ, v_fmt("plate.%d", i), &t) && t.ms > 0) { shown = rows * t.elapsed / t.ms; break; }
  v_name("stamp"); prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, shown * cell, 0, 1, 0);
  v_sprite("stamp.stamp", a, x, y, size, size);
}

/* ---- the plates: one a chapter in ring order, left-aligned from x 608: the signed ground and the rail's 24 x 24 emblem at (8, 8) ---- */
static void plate_rect(int n, int i, int out[4]) { layout_list_pitch(S, "regions.plates.places", n, i, out); }
static void build_chapterPlates(const char *cur) {
  int n = v_plen("regions.plates.items"); if (n > MAXP) n = MAXP; if (n < 0) n = 0;
  int ex = hk("regions.plates.plate.emblem.at", 0), ey = hk("regions.plates.plate.emblem.at", 1);
  for (int i = 0; i < MAXP; i++) {
    int b[4] = { 0, 0, 0, 0 }; if (i < n) plate_rect(n, i, b);
    int focused = i < n && strncmp(cur, "plate.", 6) == 0 && atoi(cur + 6) == i, lift = focused ? hi("focus.targets.plate.lift", 2) : 0;
    const char *ground = i < n ? v_pstr(v_fmt("regions.plates.items.%d.ground", i)) : "", *emb = i < n ? v_pstr(v_fmt("regions.plates.items.%d.emblem", i)) : "";
    char id[24]; snprintf(id, sizeof id, "plate.%d", i); v_name("plates");
    if (has(ground)) v_sprite(id, ground, b[0], b[1] - lift, b[2], b[3]); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), b[0], b[1]);
    snprintf(id, sizeof id, "plate.%d.emblem", i); v_name("plates");
    if (has(emb)) v_sprite(id, emb, b[0] + ex, b[1] + ey - lift, 24, 24); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), b[0], b[1]);
  }
}

/* ---- the modules: the one `module` build with no lamp (build_module), and each module's objects, lifted with it ---- */
static void free_node(const char *id, int x, int y, int w, int h) {   /* a free place is the well alone, no dash (fix 2 F4): the node keeps its box with no ops */
  snprintf(prim_ops(), (size_t)prim_ops_size(), "[]"); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0);
}
static void door_objects(int dy) {
  int r[4]; hrect("regions.door.rect", r); int pw = hk("regions.door.places.size", 0), ph = hk("regions.door.places.size", 1), gx = hk("regions.door.glyph.at", 0), gy = hk("regions.door.glyph.at", 1), gw = hk("regions.door.glyph.size", 0), gh = hk("regions.door.glyph.size", 1);
  const char *glyph = v_pstr("regions.door.glyph"), *lampPic = v_pstr("regions.door.lamp");
  v_name("door"); if (has(glyph)) v_sprite("door.glyph", glyph, r[0] + gx, r[1] + dy + gy, gw, gh); else v_sprite_hidden("door.glyph", v_pstr("regions.glass.picture"), r[0], r[1]);
  for (int i = 0; i < 3; i++) {
    int x = r[0] + hk(v_fmt("regions.door.places.at.%d", i), 0), y = r[1] + dy + hk(v_fmt("regions.door.places.at.%d", i), 1);
    char P[48]; snprintf(P, sizeof P, "regions.door.places.%d", i); int some = spec_len("props", P) >= 0 && v_pstr(v_fmt("%s.picture", P))[0];
    const char *pic = some ? v_pstr(v_fmt("%s.picture", P)) : "";
    { const char *wl = v_pstr(v_fmt("%s.well", P)); v_region("door", LAYER_PAINTED); if (*wl) v_sprite(v_fmt("door.recess.%d", i), wl, x, y, pw, ph); }   /* the place is its well in every state (fix 2 F4): the mibi stands in it, or the well alone */
    v_name("door"); if (has(pic)) v_sprite(v_fmt("door.place.%d", i), pic, x, y, pw, ph); else v_sprite_hidden(v_fmt("door.place.%d", i), glyph[0] ? glyph : v_pstr("regions.glass.picture"), x, y);
    v_name("door"); if (some && v_pbool(v_fmt("%s.waiting", P), 0) && has(lampPic)) v_sprite(v_fmt("door.lamp.%d", i), lampPic, x + hk("regions.door.places.lampAt", 0), y + hk("regions.door.places.lampAt", 1), 8, 8); else v_sprite_hidden(v_fmt("door.lamp.%d", i), v_pstr("regions.glass.picture"), x, y);
    v_region("door", LAYER_CHROME); free_node(v_fmt("door.free.%d", i), x, y, pw, ph);
  }
}
static void portrait_objects(int dy) {
  int r[4]; hrect("regions.portrait.rect", r); const char *f = v_pstr("regions.portrait.frame"); int fx = hk("regions.portrait.frame.at", 0), fy = hk("regions.portrait.frame.at", 1), fw = hk("regions.portrait.frame.size", 0), fh = hk("regions.portrait.frame.size", 1);
  v_name("portrait"); if (has(f)) v_sprite("portrait.frame", f, r[0] + fx, r[1] + dy + fy, fw, fh); else v_sprite_hidden("portrait.frame", v_pstr("regions.glass.picture"), r[0], r[1]);
}
static void cross_objects(int dy) {
  int r[4]; hrect("regions.cross.rect", r); int n = v_plen("regions.cross.faces"); if (n > MAXF) n = MAXF; if (n < 0) n = 0;
  int w = hk("regions.cross.faces.size", 0), h = hk("regions.cross.faces.size", 1), pitch = hi("regions.cross.faces.pitch", 32), per = hi("regions.cross.faces.perRow", 7);
  for (int i = 0; i < MAXF; i++) {
    if (i >= n) continue;
    char id[32], P[48]; int row = n > per ? i / per : 0, col = n > per ? i % per : i;
    int x = r[0] + hk(n > per ? v_fmt("regions.cross.faces.twoRows.%d", row) : "regions.cross.faces.oneRow", 0) + col * pitch, y = r[1] + dy + hk(n > per ? v_fmt("regions.cross.faces.twoRows.%d", row) : "regions.cross.faces.oneRow", 1);
    snprintf(P, sizeof P, "regions.cross.faces.%d", i); const char *pic = v_pstr(v_fmt("%s.picture", P)); int away = v_pbool(v_fmt("%s.away", P), 0);
    snprintf(id, sizeof id, "cross.face.%d", i); v_name("cross");
    if (has(pic)) v_sprite(id, pic, x, y, w, h); else { v_layer(LAYER_ART); char ops[96]; snprintf(ops, sizeof ops, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", w, h, spec_int("frame", "focus.ring.width", 2), away ? colr("colours.faceRingAway") : colr("colours.faceRing")); snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0); }   /* until the face is painted, the ring alone, as the top bar's */
  }
}
static void wild_objects(int dy) {
  int r[4]; hrect("regions.wild.rect", r); const char *g = v_pstr("regions.wild.gate"); int gx = hk("regions.wild.gate.at", 0), gy = hk("regions.wild.gate.at", 1), gw = hk("regions.wild.gate.size", 0), gh = hk("regions.wild.gate.size", 1);
  v_name("wild"); if (has(g)) v_sprite("wild.gate", g, r[0] + gx, r[1] + dy + gy, gw, gh); else v_sprite_hidden("wild.gate", v_pstr("regions.glass.picture"), r[0], r[1]);
}
static const char *MODS[4] = { "door", "portrait", "cross", "wild" };
static void build_modules(const char *cur) {
  for (int m = 0; m < 4; m++) {
    int dy = strcmp(cur, MODS[m]) == 0 ? -hi(v_fmt("focus.targets.%s.lift", MODS[m]), 2) : 0;
    build_module(S, MODS[m], dy, "");
    if (m == 0) door_objects(dy); else if (m == 1) portrait_objects(dy); else if (m == 2) cross_objects(dy); else wild_objects(dy);
  }
}

/* ---- the targets as the words drew them, in the props' order ---- */
int habitat_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph");
  int n = v_plen("focus.targets"); if (n > cap) n = cap; int np = v_plen("regions.plates.items"), nt = v_plen("regions.tiles.items"); if (nt > 12) return 0;
  int have = nt > 0 && layout_list_form(S, "regions.tiles", nt, NULL, 0) >= 0, k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1); t->index = i; int r[4] = { 0, 0, 0, 0 };
    if (strcmp(t->id, "resident") == 0) hrect("regions.resident.rect", r);
    else if (strcmp(t->id, "name") == 0) memcpy(r, g_tag, sizeof r);
    else if (strcmp(t->id, "species") == 0) hrect("regions.speciesLine.rect", r);
    else if (strncmp(t->id, "plate.", 6) == 0) { int j = atoi(t->id + 6); if (j >= 0 && j < np) plate_rect(np, j, r); }
    else if (strncmp(t->id, "tile.", 5) == 0 && have) { for (int q = 0; q < nt; q++) if (strcmp(v_pstr(v_fmt("regions.tiles.items.%d.id", q)), t->id + 5) == 0) layout_list_pitch(S, "regions.tiles", nt, q, r); t->index = 0; for (int q = 0; q < k; q++) if (strncmp(out[q].id, "tile.", 5) == 0) t->index++; }
    else hrect(v_fmt("regions.%s.rect", t->id), r);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}

/* the ring on the focused target (the resident's is under the creature, drawn before it): a plate or a module lifted 2 px, a tile in its form, the name and the species word round */
static void build_ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "resident") == 0 || spec_len("props", "overlay") >= 0 || anim_holding()) return;
  int box[4] = { 0, 0, 0, 0 }; char form[96];
  v_region("focus", LAYER_CHROME);
  if (strcmp(cur, "name") == 0) { memcpy(box, g_tag, sizeof box); snprintf(form, sizeof form, "focus.targets.name.ring"); }
  else if (strcmp(cur, "species") == 0) { hrect("regions.speciesLine.rect", box); snprintf(form, sizeof form, "focus.targets.species.ring"); }
  else if (strncmp(cur, "plate.", 6) == 0) { int n = v_plen("regions.plates.items"), i = atoi(cur + 6); if (i < 0 || i >= n) return; plate_rect(n, i, box); box[1] -= hi("focus.targets.plate.lift", 2); snprintf(form, sizeof form, "focus.targets.plate.ring"); }
  else if (strncmp(cur, "tile.", 5) == 0) return;   /* the strip's own ring (build_bayStrip's box) */
  else { hrect(v_fmt("regions.%s.rect", cur), box); box[1] -= hi(v_fmt("focus.targets.%s.lift", cur), 2); snprintf(form, sizeof form, "focus.targets.%s.ring", cur); }
  if (box[2] > 0) word_focusRing("focus", box, S, form, fcol("colours.ring"));
}

void habitat_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  build_stage();
  word_livingWindow(S, "glass", "regions.bezel", "regions.glass", "colours.glass", v_pstr("regions.glass.picture"), 0, 0);
  build_moving_shadow();
  build_ring_under(cur);
  build_resident(cur);
  build_tag();
  build_card(); build_speciesLine(); build_story(); build_code(); build_stamp();
  build_chapterPlates(cur);
  build_modules(cur);
  { int box[4]; build_bayStrip(S, cur, box); if (strncmp(cur, "tile.", 5) == 0 && box[2] > 0 && !anim_holding() && spec_len("props", "overlay") < 0) { v_region("focus", LAYER_CHROME); word_focusRing("focus", box, S, "focus.targets.tile.ring", fcol("colours.ring")); } }
  build_ring(cur);
}

/* a key on one mibi up close: ✓ ← and the room keys say an intent on the focused target; the pad moves the ring by habitat.json focus.graph (the host's selector `tile.shown` in focus.resolve) */
void habitat_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "resident");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[40]; char gkey[24]; int n = habitat_focus(t, 40, gkey, sizeof gkey);
  int glen; const char *graph = spec_raw(S, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  focus_resolve_t r[8]; int nr = 0;
  for (int i = 0, m = spec_len("props", "focus.resolve"); i < m && nr < 8; i++) { if (spec_member("props", "focus.resolve", i, r[nr].sel, sizeof r[nr].sel, r[nr].id, sizeof r[nr].id)) nr++; }
  int roomAt[4] = { 0, 0, 0, 0 };
  char to[48]; int step = focus_move(g, t, n, cur, dir, r, nr, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
