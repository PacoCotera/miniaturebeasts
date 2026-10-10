/* The Incubator's binding table (lvgl-switch.md §2.2, §4 R; incubator.json): the words that draw each of its states (empty, growing, ready, hatch) in draw order, from the `incubator` spec and the props' regions, the frame's
   words after (screens.c). bench, rail, the leaves on their two arcs, the chamber's back, the nest, the bud (and the ready bud's shape), the base with its plaque plate and word, the base's waiting lamp, the juvenile, the stamp label,
   the code and the ribbon. No ring in any state: ✓ acts on the room. The nest's front, the window's front, the ready bud's front and the base's foot light are registered and not drawn (incubator.json placeholders).
   The events: `growNow` (the leaves still to fill turn whole one by one over its length, in the leaves word), `wipe` (a tab turns read, its pips filling, in the rail word) and `hatch` (the chamber's back lifts 384 px in 600 ms clipped to
   the stage, the bud cracks at 600 and 800 and goes at 1000, the juvenile stands at 1000, the ribbon shows at 1200, the juvenile steps out at 1400 and 1800; the hand-off at 2600 is the host's).
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
/* the juvenile's step-out: the meet's hop at half its period (incubator.json events.hatch steps 6 and 7): [ms into the step, px above the feet line], each a cut */
static int step_lift(int ms) {
  static const int T[8][2] = { { 0, 1 }, { 25, 2 }, { 50, 3 }, { 75, 4 }, { 100, 3 }, { 125, 2 }, { 150, 1 }, { 175, 0 } }; int v = 0;
  for (int i = 0; i < 8; i++) if (ms >= T[i][0]) v = T[i][1];
  return v;
}

static void build_bench(void) {
  int r[4]; crect("regions.bench.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], g);
  v_region("bench", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}
static void picture(const char *region, const char *id, const char *path, const char *asset) { int r[4]; crect(path, r); if (has(asset)) { v_name(region); v_sprite(id, asset, r[0], r[1], r[2], r[3]); } }

/* the chamber's back: in the hatch its ready picture lifts 384 px by the Cargo travel's ease over 600 ms, whole pixels, clipped to the stage (0, 88, 1024, 474), and is not drawn after */
static void build_dome(int t) {
  int r[4]; crect("regions.dome.rect", r); const char *pic = v_pstr("regions.dome.back"); if (!has(pic)) return;
  int dy = 0, gone = 0;
  if (t >= 0) { int ms = ci("events.hatch.steps.1.ms", 600); if (t >= ms) gone = 1; else { int p = t * 1000 / ms; dy = layout_lerp(0, 384, layout_ease_io(p)); } }
  int y = r[1] - dy, top = y < 88 ? 88 : y, bot = y + r[3] > 562 ? 562 : y + r[3], h = gone || bot <= top ? 0 : bot - top;
  v_name("dome"); prim_node(v_id("dome.clip"), FN_CLIP, r[0], top, h ? r[2] : 0, h, 0, 1, 0);
  if (h) v_sprite("dome", pic, r[0], y, r[2], r[3]); else v_sprite_hidden("dome", pic, r[0], y);   /* drawn clipped; after the lift a window of no size */
}
/* the bud: its five pictures and the ready shape are always nodes, one shown by the state (and the hatch's time): the wait's first half, the second, ready (with the shape), the crack at 600, the opening at 800, nothing at 1000 */
static void build_bud(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
  int r[4], s[4]; crect("regions.bud.rect", r); crect("regions.bud.shape.rect", s); const char *stage = v_pstr("regions.bud.stage");
  int a1 = ci("events.hatch.steps.2.at", 600), a2 = ci("events.hatch.steps.3.at", 800), a3 = ci("events.hatch.steps.4.at", 1000);
  const char *which = strcmp(stage, "early") == 0 ? "early" : strcmp(stage, "late") == 0 ? "late" : "ready";
  if (t >= a3) which = ""; else if (t >= a2) which = "crack2"; else if (t >= a1) which = "crack1";
  static const char *K[5] = { "early", "late", "ready", "crack1", "crack2" };
  for (int i = 0; i < 5; i++) { v_name("bud"); const char *pic = v_pstr(v_fmt("regions.bud.%s", K[i])); const char *id = v_fmt("bud.%s", K[i]);
    if (has(pic) && strcmp(which, K[i]) == 0) v_sprite(id, pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden(id, has(pic) ? pic : v_pstr("regions.bud.ready"), r[0], r[1]); }
  { const char *pic = v_pstr("regions.bud.shape"); int on = has(pic) && strcmp(which, "ready") == 0 && strcmp(stage, "ready") == 0; v_name("bud"); if (on) v_sprite("bud.shape", pic, s[0], s[1], s[2], s[3]); else v_sprite_hidden("bud.shape", has(pic) ? pic : v_pstr("regions.bud.ready"), s[0], s[1]); }
}
static void build_base(void) {
  picture("base", "base", "regions.base.rect", v_pstr("regions.base.picture"));
  picture("base", "base.plate", "regions.base.plate", v_pstr("regions.base.plate"));
  { int r[4]; crect("regions.plaque.rect", r); int px = ci("regions.plaque.px", 16), cx = ci("regions.plaque.centre", 512); const char *w = v_pstr("regions.plaque"); int tw = v_measure(w, px);
    const char *st = v_pstr("state"); v_region("plaque", LAYER_TYPE);
    v_text("plaque", w, cx - v_half(tw), ci("regions.plaque.lineTop", 502) + v_fdiv(20 - v_cap(px), 2), *w ? tw : 0, px, colr(v_fmt("colours.plaque.%s", strcmp(st, "hatch") == 0 ? "ready" : st))); }
  { const char *pic = v_pstr("regions.lamp.picture"); if (spec_len("props", "regions.lamp") >= 0) { int r[4]; crect("regions.base.lamp.rect", r); v_name("lamp"); if (v_pbool("regions.lamp.on", 0)) v_sprite("lamp", pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden("lamp", pic, r[0], r[1]); } }
}
/* the juvenile stands in its box on the base from 1000 and steps out at 1400 and 1800; the picture is the new mibi's, its placeholder until the painting lands */
static void build_juvenile(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
  int r[4]; crect("regions.juvenile.rect", r); const char *pic = v_pstr("regions.juvenile.picture"); int a = ci("events.hatch.steps.4.at", 1000), s1 = ci("events.hatch.steps.6.at", 1400), s2 = ci("events.hatch.steps.7.at", 1800), up = 0;
  int on = has(pic) && t >= a; if (on && t >= s1 && t < s1 + 200) up = step_lift(t - s1); if (on && t >= s2 && t < s2 + 200) up = step_lift(t - s2);
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
  v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, t >= at ? words : "", ci("regions.ribbon.px", 20), ci("regions.ribbon.pad", 16), colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), colr("colours.ribbon.text"));
}

void incubator_words(void) {
  int t = hatch_time();
  build_bench();
  if (spec_len("props", "regions.rail") >= 0) word_rail(NULL);
  if (spec_len("props", "regions.leaves") >= 0) { v_name("leaves"); word_leavesArc(I, "regions.leaves", v_pstr("regions.leaves.empty"), v_pstr("regions.leaves.filled"), v_pint("regions.leaves.total", 0), v_pint("regions.leaves.full", 0), v_pint("regions.leaves.rows", 0)); }
  build_dome(t);
  picture("nest", "nest", "regions.nest.rect", v_pstr("regions.nest.picture"));
  build_bud(t);
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
