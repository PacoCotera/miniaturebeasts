/* The Incubator's binding table (lvgl-switch.md §2.2, §4 R; incubator.json): the words that draw each of its states (empty, growing, ready, hatch) in draw order, from the `incubator` spec and the props' regions, the frame's
   words after (screens.c). bench, rail, the leaves on their two arcs, the chamber's back, the nest, the bud (and the ready bud's shape), the nest's front, the window's front, the base (its master carries the plaque plate and the foot
   light) with its plaque word, the base's waiting lamp, the juvenile, the stamp label, the code and the ribbon. No ring in any state: ✓ acts on the room. The ready bud's front is registered and not drawn (incubator.json placeholders).
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
  { const char *pic = v_pstr("regions.bud.shape"); int on = has(pic) && strcmp(which, "ready") == 0 && (strcmp(stage, "ready") == 0 || strcmp(stage, "hatch") == 0);   /* ready, and in the hatch until the crack at 600 */ v_name("bud"); if (on) v_sprite("bud.shape", pic, s[0], s[1], s[2], s[3]); else v_sprite_hidden("bud.shape", has(pic) ? pic : v_pstr("regions.bud.ready"), s[0], s[1]); }
}
static void build_base(void) {
  picture("base", "base", "regions.base.rect", v_pstr("regions.base.picture"));
  { int px = ci("regions.plaque.px", 16), cx = ci("regions.plaque.centre", 512); const char *w = v_pstr("regions.plaque"); int tw = v_measure(w, px);
    const char *st = v_pstr("state"); v_region("plaque", LAYER_TYPE);
    v_text("plaque", w, cx - v_half(tw), ci("regions.plaque.lineTop", 502) + v_fdiv(20 - v_cap(px), 2), *w ? tw : 0, px, colr(v_fmt("colours.plaque.%s", strcmp(st, "hatch") == 0 ? "ready" : st))); }
  { const char *pic = v_pstr("regions.lamp.picture"); if (spec_len("props", "regions.lamp") >= 0) { int r[4]; crect("regions.base.lamp.rect", r); v_name("lamp"); if (v_pbool("regions.lamp.on", 0)) v_sprite("lamp", pic, r[0], r[1], r[2], r[3]); else v_sprite_hidden("lamp", pic, r[0], r[1]); } }
}
/* the juvenile stands in its box on the base from 1000 and steps out at 1400 and 1800; the picture is the new mibi's, its placeholder until the painting lands */
static void build_juvenile(int t) {
  if (spec_len("props", "regions.bud") < 0) return;
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
