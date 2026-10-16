/* Create's binding table (lvgl-switch.md §2.2, §4 R; create.json; specs/station-create-bench-spec.md): the words that draw each of its states (nothingRead, shape, grow) in draw order, from the `create` spec and the props' regions, the frame's
   words after (screens.c). The gene bench: bench, the well and the pod in it (closed from Grow 300, then carried out), the gene line, the dish, the founder, the bank of drums (a window of them: drums stand in slots, so a slide changes what a slot
   shows and never adds a node), the slip (Your changes, Still a surprise; at Grow printed with the stamp, the code and "to the Incubator"), then the ring on the focused drum.
   The events: `dither` on the founder (the old picture to the new in 16 Bayer levels over 200 ms; the props carry the new one), and `grow` (the stamp prints row by row for 300 ms, the code appears at 300, the pod closes and travels from 300 to 900).
   A picture the host has not sent is a slot not yet filled: nothing is drawn and the layout does not move. The bench's art is a labelled placeholder until its masters (T-20261016-41). */
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

#define C "create"
#define SLOTS 10   /* the drums a span can hold: 816 px at a pitch of 88 */
#define MAXDRUMS 32
static int ci(const char *p, int d) { return spec_int(C, p, d); }
static int ck(const char *base, int k) { return spec_int(C, v_fmt("%s.%d", base, k), 0); }
static void crect(const char *p, int r[4]) { if (!v_spec_rect(C, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(C, p, o, 24); return o; }
static int has(const char *id) { return id && *id; }
static int cap_top(int px, int y, int pitch) { return y + v_fdiv(pitch - v_cap(px), 2); }
static int in_state(const char *s) { return strcmp(v_pstr("state"), s) == 0; }

/* ---- the grow event: how far it has got (-1: not playing, the end state shows) ---- */
static int grow_time(void) { anim_state_t t; return v_pbool("motion", 1) && anim_get(ANIM_GROW, "pod", &t) ? t.elapsed : -1; }

/* a rectangle or its node with no size (a slot kept for a state that has not come, so that showing it never adds a node, §2.2) */
static void rect_or(const char *id, int on, int x, int y, int w, int h, const char *colour) { if (on) v_rect(id, x, y, w, h, colour); else v_rect(id, x, y, 0, 0, colour); }
static void pic_or(const char *id, int on, const char *asset, int x, int y, int w, int h) { if (on) v_sprite(id, asset, x, y, w, h); else v_sprite_hidden(id, asset, x, y); }
static void picture(const char *region, const char *id, const char *path, const char *asset) { int r[4]; crect(path, r); if (has(asset)) { v_name(region); v_sprite(id, asset, r[0], r[1], r[2], r[3]); } }

/* the bench: the stage's ground (the frame's) and the room master over it */
static void build_bench(void) {
  int r[4]; crect("regions.bench.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], g);
  v_region("bench", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}

/* ---- the pod: in its well, open until Grow 300, then closed and carried out toward the Incubator (regions.travel): from its box to the `to` box in a straight line, whole pixels, eased, clipped at the interior's right edge ---- */
static void build_pod(int grow) {
  int b[4], tr[4], to[4]; crect("regions.pod.rect", b); crect("regions.travel.rect", tr); crect("regions.travel.to", to);
  const char *open = v_pstr("regions.pod.picture"), *closed = v_pstr("regions.pod.closed"); int dx = 0, dy = 0, shut = 0;
  if (grow) {
    int at = ci("events.grow.steps.1.at", 300), ms = ci("events.grow.steps.2.ms", 600), t = grow_time(), p = t < 0 || t >= at + ms ? 1000 : t <= at ? 0 : (t - at) * 1000 / ms, e = layout_ease_io(p);
    dx = layout_lerp(0, to[0] - b[0], e); dy = layout_lerp(0, to[1] - b[1], e); shut = t < 0 || t >= at;
  }
  v_region(grow ? "travel" : "pod", LAYER_PAINTED);
  prim_node(v_id("pod.clip"), FN_CLIP, tr[0], tr[1], tr[2], tr[3], 0, 1, 0);   /* the interior's edge: a pod carried out is cut at 953 */
  const char *pic = shut && has(closed) ? closed : open; if (has(pic)) v_sprite("pod", pic, b[0] + dx, b[1] + dy, b[2], b[3]);
}
static void build_name(void) {
  int r[4]; crect("regions.name.rect", r); char text[V_STR]; snprintf(text, sizeof text, "%s", v_pstr("regions.name")); int px = ci("regions.name.px", 16), cx = ci("regions.name.centre", 192);
  int tw = v_measure(text, px), pw = layout_plate_width(C, "regions.name", tw);
  v_region("name", LAYER_PAINTED); v_plate_in(C, "name.plate", "regions.name", pw, cx - v_half(pw), r[1]);
  v_region("name", LAYER_TYPE); v_text("name", text, cx - v_half(tw), cap_top(px, r[1], r[3]), tw, px, colr("colours.name"));
}
static void build_found(void) {
  int r[4]; crect("regions.found.rect", r); int px = ci("regions.found.px", 16), pitch = ci("regions.found.pitch", 24), maxLines = ci("regions.found.lines", 2), cx = ci("regions.found.centre", 192), line = 0;
  v_region("found", LAYER_TYPE);
  for (int i = 0, n = v_plen("regions.found"); i < n && line < maxLines; i++) {
    char s[V_STR], buf[V_STR * 3]; snprintf(s, sizeof s, "%s", v_pstr(v_fmt("regions.found.%d", i)));
    int nl = v_wrap(s, r[2], px, buf, sizeof buf, 8); const char *l = buf;
    for (int j = 0; j < nl && line < maxLines; j++, line++) { int w = v_measure(l, px); v_text(v_fmt("found.%d", line), l, cx - v_half(w), cap_top(px, r[1] + pitch * line, pitch), w, px, colr("colours.found")); l += strlen(l) + 1; }
  }
  for (; line < maxLines; line++) v_text(v_fmt("found.%d", line), "", 0, r[1], 0, px, colr("colours.found"));   /* a line the sentence does not use keeps its node */
}
/* The roll's gate (fix 5 Create C8; CD item 7, 07:10), computed here from the two founder pictures the face holds, in integers: the change dithers (16 Bayer levels) only when both the silhouette box (pixels clear in one picture and not the other)
   and the change box (pixels whose alpha differs, or whose colour differs where neither is clear) fit in events.roll.gate (each 160 x 160); a re-posed body, or a colour over the whole body, is a cut on the frame of the key. A failed query (an empty slot,
   different sizes) is a cut. Each pair is measured once, cached by the two ids. */
static int roll_dithers(const char *from, const char *to) {
  static char cf[96], ct[96]; static int ok, have;
  if (have && strcmp(cf, from) == 0 && strcmp(ct, to) == 0) return ok;
  int gs[2] = { ck("events.roll.gate.silhouette", 0), ck("events.roll.gate.silhouette", 1) }, gc[2] = { ck("events.roll.gate.change", 0), ck("events.roll.gate.change", 1) }, b[4], s[4];
  ok = v_change_box(from, to, b) == 0 && b[2] <= gc[0] && b[3] <= gc[1] && (v_silhouette_box(from, to, s) == 0 && s[2] <= gs[0] && s[3] <= gs[1]);   /* every change box contains its silhouette box, so the change test is the one that decides; the silhouette is asked only when it can still pass */
  snprintf(cf, sizeof cf, "%s", from); snprintf(ct, sizeof ct, "%s", to); have = 1; return ok;
}
/* the founder: its picture in its box, always as one composed picture (the Bayer pick of `from` and `to`), so its node never changes kind: while a `dither` event on the founder plays, the old picture cross-dithers to the new in
   16 levels over the event (a cut with reduced motion); otherwise level 16 is the new picture alone (§2.7). */
static void build_founder(void) {
  int r[4]; crect("regions.founder.rect", r); v_set_focal(r); const char *pic = v_pstr("regions.founder.picture"); if (!has(pic)) return;
  anim_state_t t; const char *from = pic; int level = 16;
  if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "founder", &t) && t.from_id[0] && t.ms > 0 && wire_has_asset(t.from_id)) { from = t.from_id; level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; if (!roll_dithers(t.from_id, pic)) { from = pic; level = 16; } }   /* the gate (fix 5 Create C8): a small change dithers, anything larger is a cut */
  v_region("founder", LAYER_ART); v_dither("founder", from, pic, level, r[0], r[1], r[2], r[3]);
}

/* ---- the bank: the drums in slots (spec §3). Drum `first + s` stands in slot s at x = left + s · pitch + (its group − the first's group) · chapterGap, y 440; every part of a slot has its node in every state and a part not shown has none of the size ---- */
typedef struct { int i, x, y, shown; } slot_t;
static int bank_left(void) { return ck("regions.bank.span", 0) + (v_pbool("regions.bank.moreLeft", 0) ? ck("regions.bank.more.size", 0) : 0); }
static int drum_slot(int i, slot_t *s) {   /* where drum i stands now; 0 when it is not shown */
  int first = v_pint("regions.bank.first", 0), last = v_pint("regions.bank.last", -1); s->i = i; s->shown = 0; s->x = s->y = 0; if (i < first || i > last) return 0;
  int g0 = v_pint(v_fmt("regions.bank.drums.%d.group", first), 0), g = v_pint(v_fmt("regions.bank.drums.%d.group", i), 0);
  s->x = bank_left() + (i - first) * ci("regions.bank.drum.pitch", 88) + (g - g0) * ci("regions.bank.drum.chapterGap", 16); s->y = ci("regions.bank.drum.y", 440); s->shown = 1; return 1;
}
static int focused_drum(void) { const char *cur = v_focus_cur(); return strncmp(cur, "drum.", 5) == 0 ? atoi(cur + 5) : -1; }
static const char *state_pic(const char *state) {
  if (!strcmp(state, "pinned")) return v_pstr("regions.bank.pictures.pinned"); if (!strcmp(state, "capped")) return v_pstr("regions.bank.pictures.capped"); if (!strcmp(state, "clash")) return v_pstr("regions.bank.pictures.clash");
  return v_pstr("regions.bank.pictures.rest");
}
static void build_bank(void) {
  int n = v_plen("regions.bank.drums"), first = v_pint("regions.bank.first", 0), last = v_pint("regions.bank.last", -1), locked = v_pbool("regions.bank.locked", 0), fd = locked ? -1 : focused_drum(), lift = ci("regions.bank.drum.lift", 2);
  int dw = ck("regions.bank.drum.size", 0), dh = ck("regions.bank.drum.size", 1), gx = ck("regions.bank.drum.glass", 0), gy = ck("regions.bank.drum.glass", 1), gw = ck("regions.bank.drum.glass", 2), gh = ck("regions.bank.drum.glass", 3);
  int nw = ck("regions.bank.drum.notch.size", 0), nh = ck("regions.bank.drum.notch.size", 1), nx = ck("regions.bank.drum.notch.at", 0), ny = ck("regions.bank.drum.notch.at", 1);
  int uw = ck("regions.bank.drum.turn.up.size", 0), uh = ck("regions.bank.drum.turn.up.size", 1), ux = ck("regions.bank.drum.turn.up.at", 0), uy = ck("regions.bank.drum.turn.up.at", 1), dwn = ck("regions.bank.drum.turn.down.size", 0), dhn = ck("regions.bank.drum.turn.down.size", 1), dx = ck("regions.bank.drum.turn.down.at", 0), dy = ck("regions.bank.drum.turn.down.at", 1);
  int px = ci("regions.bank.word.px", 16), wtop = ci("regions.bank.word.lineTop", 414), cx = ck("regions.bank.drum.cross.at", 0), cy = ck("regions.bank.drum.cross.at", 1);
  const char *wcol = colr("colours.bank.word"), *ncol = colr("colours.bank.notch"); (void)ncol;
  const char *cross = v_pstr("regions.bank.cross"), *upPic = v_pstr("regions.bank.pictures.up"), *downPic = v_pstr("regions.bank.pictures.down"), *notchPic = v_pstr("regions.bank.pictures.notch"), *restPic = v_pstr("regions.bank.pictures.rest");
  v_region("bank", LAYER_PAINTED);
  { int r[4]; crect("regions.bank.rect", r); (void)r; }
  /* the more marks: 16 x 80 at the span's two ends, only beside hidden drums */
  { int mw = ck("regions.bank.more.size", 0), mh = ck("regions.bank.more.size", 1), my = ci("regions.bank.more.y", 440); v_name("bank");
    pic_or("bank.more.left", v_pbool("regions.bank.moreLeft", 0), v_pstr("regions.bank.more.left"), ci("regions.bank.more.left.x", 104), my, mw, mh);
    pic_or("bank.more.right", v_pbool("regions.bank.moreRight", 0), v_pstr("regions.bank.more.right"), ci("regions.bank.more.right.x", 904), my, mw, mh); }
  for (int s = 0; s < SLOTS; s++) {
    int i = first + s; slot_t d; int on = i < n && drum_slot(i, &d); char state[16] = "rest", look[96] = "", word[48] = ""; int faces = 1, lead = 0, foc = 0;
    if (on) { snprintf(state, sizeof state, "%s", v_pstr(v_fmt("regions.bank.drums.%d.state", i))); snprintf(look, sizeof look, "%s", v_pstr(v_fmt("regions.bank.drums.%d.closeUp", i))); snprintf(word, sizeof word, "%s", v_pstr(v_fmt("regions.bank.drums.%d.word", i)));
      faces = v_pint(v_fmt("regions.bank.drums.%d.faces", i), 1); lead = v_pbool(v_fmt("regions.bank.drums.%d.lead", i), 0); foc = i == fd; }
    int x = on ? d.x : 0, y = on ? d.y - (foc ? lift : 0) : 0, turn = on && foc && faces > 1 && strcmp(state, "capped") != 0 && strcmp(state, "pinned") != 0;
    const char *base = on ? state_pic(state) : restPic;
    v_name("bank"); pic_or(v_fmt("bank.%d.drum", s), on, base, x, y, dw, dh);
    pic_or(v_fmt("bank.%d.look", s), on && has(look), has(look) ? look : restPic, x + gx, y + gy, gw, gh);
    pic_or(v_fmt("bank.%d.notch", s), on && !strcmp(state, "changed") && !turn, notchPic, x + nx, y + ny, nw, nh);   /* the notch and ▲ share the rim's top: the mark covers the notch while the drum is focused */
    pic_or(v_fmt("bank.%d.up", s), turn, upPic, x + ux, y + uy, uw, uh);
    pic_or(v_fmt("bank.%d.down", s), turn, downPic, x + dx, y + dy, dwn, dhn);
    pic_or(v_fmt("bank.%d.cross", s), on && !strcmp(state, "clash"), cross, x + cx, y + cy, 16, 16);
    /* the chapter word: on a group's first drum, or on the first shown drum of a group that began off the left edge */
    int show_word = on && (lead || s == 0) && *word; char clipped[V_STR];
    if (show_word) { int groupw = 0; for (int j = i; j <= last && j < n && v_pint(v_fmt("regions.bank.drums.%d.group", j), -1) == v_pint(v_fmt("regions.bank.drums.%d.group", i), -2); j++) groupw += ci("regions.bank.drum.pitch", 88); groupw -= 8; v_clip(word, groupw > 0 ? groupw : 0, px, clipped, sizeof clipped); } else clipped[0] = 0;
    int tw = v_measure(clipped, px);
    v_region("bank", LAYER_TYPE); v_text(v_fmt("bank.%d.word", s), clipped, x, cap_top(px, wtop, 22), show_word ? tw : 0, px, wcol); v_region("bank", LAYER_PAINTED);
  }
}

/* ---- the slip: paper, then text lines stacked from the top (padding 16): Your changes, its lines newest first, "and n more" or "none yet", the clash line; 8 below, Still a surprise and its words (2 lines). A line is cut at a word with … at 176 px.
   At Grow the lists are cut away: every text node stays, with no text and no width. ---- */
static void slip_line(const char *id, const char *text, int *y, int x, int px, int pitch, int maxw, const char *colour, int on) {
  char cut[V_STR]; if (on && *text) v_clip(text, maxw, px, cut, sizeof cut); else cut[0] = 0;
  int w = v_measure(cut, px); v_text(id, cut, x, cap_top(px, *y, pitch), *cut ? w : 0, px, colour); if (*cut) *y += pitch;
}
static void build_slip(void) {
  int r[4]; crect("regions.slip.rect", r); int px = ci("regions.slip.px", 16), pitch = ci("regions.slip.pitch", 24), gap = ci("regions.slip.gap", 8), x = ci("regions.slip.textX", 744), maxw = ci("regions.slip.maxLine", 176), pad = ci("regions.slip.pad", 16), y = r[1] + pad, grow = v_pbool("regions.slip.printed", 0);
  v_region("slip", LAYER_PAINTED); picture("slip", "slip", "regions.slip.rect", v_pstr("regions.slip.picture"));
  v_region("slip", LAYER_TYPE);
  slip_line("slip.heading", v_pstr("regions.slip.heading"), &y, x, px, pitch, maxw, colr("colours.slip.heading"), !grow);
  for (int k = 0; k < ci("regions.slip.maxChanges", 4); k++) slip_line(v_fmt("slip.line.%d", k), k < v_plen("regions.slip.lines") ? v_pstr(v_fmt("regions.slip.lines.%d", k)) : "", &y, x, px, pitch, maxw, colr("colours.slip.line"), !grow);
  slip_line("slip.more", v_pstr("regions.slip.more"), &y, x, px, pitch, maxw, colr("colours.slip.quiet"), !grow);
  slip_line("slip.none", v_pstr("regions.slip.none"), &y, x, px, pitch, maxw, colr("colours.slip.quiet"), !grow);
  slip_line("slip.clash", v_pstr("regions.slip.clash"), &y, x, px, pitch, maxw, colr("colours.slip.clash"), !grow);
  int sur = !grow && has(v_pstr("regions.slip.surprise.heading")); if (sur) y += gap;
  slip_line("slip.surprise", sur ? v_pstr("regions.slip.surprise.heading") : "", &y, x, px, pitch, maxw, colr("colours.slip.heading"), sur);
  { char words[V_STR], buf[V_STR * 3]; snprintf(words, sizeof words, "%s", sur ? v_pstr("regions.slip.surprise.words") : ""); int nl = *words ? v_wrap(words, maxw, px, buf, sizeof buf, 4) : 0; const char *l = buf;
    for (int k = 0; k < 2; k++) { if (k < nl) { slip_line(v_fmt("slip.words.%d", k), l, &y, x, px, pitch, maxw, colr("colours.slip.surprise"), 1); l += strlen(l) + 1; } else slip_line(v_fmt("slip.words.%d", k), "", &y, x, px, pitch, maxw, colr("colours.slip.surprise"), 0); } }
}
/* the stamp label printed on the slip at Grow (772, 128): the plate and the stamp centred on it, row by row from the top over `steps.0.ms` (N + 2 rows of `cell` px, whole rows); no size outside Grow */
static void build_stamp(void) {
  int r[4]; crect("regions.stamp.rect", r); const char *pl = v_pstr("regions.stamp.plate"), *a = v_pstr("regions.stamp.asset"); int size = v_pint("regions.stamp.size", 0), N = v_pint("regions.stamp.N", 0), cell = v_pint("regions.stamp.cell", 0), grow = in_state("grow");
  v_region("stamp.plate", LAYER_PAINTED); if (has(pl)) { if (grow && has(a) && size) v_sprite("stamp.plate", pl, r[0], r[1], r[2], r[3]); else v_sprite_hidden("stamp.plate", pl, r[0], r[1]); }
  v_region("stampImage", LAYER_PAINTED);   /* the stamp's own region (as Pods') */
  if (!has(a) || !size) return;
  int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size), rows = N + 2, shown = grow ? rows : 0;
  if (grow) { int t = grow_time(), ms = ci("events.grow.steps.0.ms", 300); if (t >= 0 && t < ms) shown = rows * t / ms; }
  v_name("stampImage"); prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, shown * cell, 0, 1, 0);
  if (grow) v_sprite("stamp.stamp", a, x, y, size, size); else v_sprite_hidden("stamp.stamp", a, x, y);
}
static void build_code(void) {
  const char *code = v_pstr("regions.code"); int t = grow_time(), at = ci("events.grow.steps.1.at", 300), px = ci("regions.code.px", 16), shown = *code && (t < 0 || t >= at), w = v_measure(code, px);
  v_region("code", LAYER_CHROME); rect_or("code.rule", shown, ck("regions.code.rule.x", 0), ci("regions.code.rule.y", 288), ck("regions.code.rule.x", 1) - ck("regions.code.rule.x", 0), ci("regions.code.rule.h", 1), colr("colours.code.rule"));   /* the rule and the code are one object: both have no size until grow 300 */
  v_region("code", LAYER_TYPE);   /* the code's node is there in every state: until it prints it is the same node with no text and no width, so Grow changes a node and never adds one (§2.2) */
  v_text("code", shown ? code : "", ci("regions.code.centre", 832) - v_half(w), ci("regions.code.baseline", 280) - v_cap(px), shown ? w : 0, px, colr("colours.code.text"));
  { const char *words = v_pstr("regions.toIncubator"); int ww = v_measure(words, 16); v_region("toIncubator", LAYER_TYPE); v_text("toIncubator", shown ? words : "", ci("regions.toIncubator.centre", 832) - v_half(ww), cap_top(16, ci("regions.toIncubator.lineTop", 316), 24), shown ? ww : 0, 16, colr("colours.toIncubator")); }
}

/* ---- the targets as the words drew them, and the ring ---- */
int create_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "%s", v_pstr("state")); int n = v_plen("focus.targets"); if (n > cap) n = cap; int k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i))); t->enabled = 1;
    slot_t d; int r[4] = { 0, 0, 0, 0 }; if (strncmp(t->id, "drum.", 5) == 0 && drum_slot(atoi(t->id + 5), &d)) { r[0] = d.x; r[1] = d.y; r[2] = ci("regions.bank.drum.size.0", 80); r[3] = ci("regions.bank.drum.size.1", 80); }
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}
static void build_ring(void) {
  int i = focused_drum(); if (i < 0 || v_pbool("regions.bank.locked", 0)) return; slot_t d; if (!drum_slot(i, &d)) return;
  int r[4] = { d.x, d.y - ci("regions.bank.drum.lift", 2), ck("regions.bank.drum.size", 0), ck("regions.bank.drum.size", 1) };
  v_region("focus", LAYER_CHROME); word_focusRing("focus", C, "focus.shape.targets.drum", r);
}

void create_words(void) {
  int grow = in_state("grow");
  build_bench();
  picture("well", "well", "regions.well.rect", v_pstr("regions.well.picture"));
  build_pod(grow);
  build_name();
  build_found();
  picture("geneLine", "geneLine", "regions.geneLine.rect", v_pstr("regions.geneLine.picture"));
  picture("dish", "dish", "regions.dish.rect", v_pstr("regions.dish.picture"));
  build_founder();
  build_bank();
  build_slip();
  build_stamp();
  build_code();
  build_ring();
}

/* a key on Create: ✓, ← and the room keys say an intent on the focus (a drum, or the room while it grows); the pad is the spec's graph on the drums: ◀ ▶ move the ring along them (a focus message; the host slides the tray), ▲ ▼ are steppers
   (step:up, step:down on the focused drum, the ring stays) */
void create_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "room");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[MAXDRUMS]; char gkey[24]; int n = create_focus(t, MAXDRUMS, gkey, sizeof gkey); if (n <= 0) return;
  char path[64], err[200]; snprintf(path, sizeof path, "focus.%s.graph", gkey); int glen; const char *graph = spec_raw(C, path, &glen);
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  char to[48]; int step = focus_move(g, t, n, cur, dir, NULL, 0, NULL, to, sizeof to); focus_graph_free(g);
  if (step) { char v[16]; snprintf(v, sizeof v, "step:%s", dir == FOCUS_UP ? "up" : dir == FOCUS_DOWN ? "down" : dir == FOCUS_LEFT ? "left" : "right"); screens_say("intent", cur, v); return; }
  if (strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
