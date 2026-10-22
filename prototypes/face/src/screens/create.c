/* Create's binding table (lvgl-switch.md §2.2, §4 R; create.json): the words that draw each of its states (nothingRead, shape, grow) in draw order, from the `create` spec and the props' regions, the frame's words after (screens.c).
   bench, rail, the small chamber and its bud, the pod, the origin, the work tray with the founder, the roll (a stepper: the ring stays on the chosen picture), the trait line, the small chamber's front, the
   the stamp label and the code, then the ring. The compositions are the spec's: `roll` and `traitLine`.
   The events: `dither` on the founder (the old picture to the new in 16 Bayer levels over 200 ms; the props carry the new one), and `grow` (the stamp prints row by row for 300 ms, the code appears at 300, the pod travels from 300 to 900).
   A picture the host has not sent is a slot not yet filled: nothing is drawn and the layout does not move. The work tray, the small chamber, the notches and the roll's pictures are labelled placeholders until their masters (create.json placeholders). */
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
static int has(const char *id) { return id && *id; }
static int cap_top(int px, int y, int pitch) { return y + v_fdiv(pitch - v_cap(px), 2); }


/* ---- the grow event: how far it has got (-1: not playing, the end state shows) ---- */
static int grow_time(void) { anim_state_t t; return v_pbool("motion", 1) && anim_get(ANIM_GROW, "pod", &t) ? t.elapsed : -1; }

/* ---- the roll: its pictures' rectangles and the chosen one ---- */
static int roll_n(void) { return v_plen("regions.roll.pictures"); }
static const char *roll_path(void) { return strcmp(v_pstr("regions.roll.form"), "roll") == 0 ? "regions.roll.forms.roll.pictures" : "regions.roll.forms.single.pictures"; }
static void roll_rect(int i, int r[4]) { v_srect(C, v_fmt("%s.%d", roll_path(), i), r); }
static int has_roll(void) { return spec_len("props", "regions.roll") >= 0; }

/* ---- the pod: bottom-centred on its axis and feet by the size class of the species (pods.json classes.pod); it travels in grow ---- */
static int pod_box(int box[4]) {
  char cls[16]; snprintf(cls, sizeof cls, "%s", v_pstr("regions.pod.sizeClass")); if (!cls[0]) return 0;
  int w = spec_int("pods", v_fmt("classes.pod.%s.0", cls), 0), h = spec_int("pods", v_fmt("classes.pod.%s.1", cls), 0); if (w <= 0 || h <= 0) return 0;
  box[0] = v_si(C, "regions.pod.axis", 160) - v_half(w); box[1] = v_si(C, "regions.pod.feet", 408) - h; box[2] = w; box[3] = h; return 1;
}

/* the bench: the stage's ground (the frame's) and the room master over it */
static void build_bench(void) {
  int r[4]; v_srect(C, "regions.bench.rect", r); char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], g);
  v_region("bench", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}
static void picture(const char *region, const char *id, const char *path, const char *asset) { int r[4]; v_srect(C, path, r); if (has(asset)) { v_name(region); v_sprite(id, asset, r[0], r[1], r[2], r[3]); } }

static void build_pod(int grow) {
  int b[4]; if (!pod_box(b)) return; const char *pic = v_pstr("regions.pod.picture"); if (!has(pic)) return;
  int dx = 0, dy = 0, rest = 0;
  {   /* the contact shadow (as on Pods, specimen.c): pods.json `shadow` widens the class's width by `widen`, `h` tall, centred on the axis and the feet, on the painted layer before the pod; it never travels: shown in shape and nothing read, and in grow until the travel starts (a cut to a zero-size node), never with reduced motion in grow */
    int sw = b[2] + spec_int("pods", "shadow.widen", 0), sh = spec_int("pods", "shadow.h", 0), at = v_si(C, "events.grow.steps.2.at", 300), t = grow_time(), on = !grow || (t >= 0 && t < at);
    v_region("podShadow", LAYER_PAINTED); v_slot("podShadow", v_pstr("regions.podShadow.picture"), NULL, v_si(C, "regions.pod.axis", 160) - v_half(sw), v_si(C, "regions.pod.feet", 408) - v_half(sh), sw, sh, on);
  }
  if (grow) {   /* the pod travels from its box to the dome in a straight line, whole pixels, eased: from `travel.at` over `travel.ms`, feet (160, 408) to (864, 296) */
    int at = v_si(C, "events.grow.steps.2.at", 300), ms = v_si(C, "events.grow.steps.2.ms", 600), t = grow_time(), p = t < 0 || t >= at + ms ? 1000 : t <= at ? 0 : (t - at) * 1000 / ms, e = layout_ease_io(p);
    dx = layout_lerp(0, v_sk(C, "regions.travel.foot.to", 0) - v_sk(C, "regions.travel.foot.from", 0), e); dy = layout_lerp(0, v_sk(C, "regions.travel.foot.to", 1) - v_sk(C, "regions.travel.foot.from", 1), e);
    rest = t < 0 || t >= v_si(C, "regions.travel.rest.at", 530);   /* from 530 ms (and with reduced motion) the pod rests at the collection class, a step and never interpolated, on the same foot */
  }
  v_region(grow ? "travel" : "pod", LAYER_PAINTED);
  if (rest && has(v_pstr("regions.pod.dome"))) { int w = v_pint("regions.pod.domeSize.0", 0), h = v_pint("regions.pod.domeSize.1", 0), ax = v_pint("regions.pod.domeAnchor.0", 0), ay = v_pint("regions.pod.domeAnchor.1", 0);   /* the relit pod of the capsule (T-20261016-222): its foot on the travel's foot */
    v_sprite("pod", v_pstr("regions.pod.dome"), v_si(C, "regions.pod.axis", 160) + dx - ax, v_si(C, "regions.pod.feet", 408) + dy - ay, w, h); }
  else v_sprite("pod", pic, b[0] + dx, b[1] + dy, b[2], b[3]);
}
static void build_origin(void) {
  int r[4]; v_srect(C, "regions.origin.rect", r); int px = v_si(C, "regions.origin.px", 16), pitch = v_si(C, "regions.origin.pitch", 20), maxLines = v_si(C, "regions.origin.lines", 2), cx = v_si(C, "regions.origin.centre", 160), line = 0;
  v_region("origin", LAYER_TYPE);
  int gone = strcmp(v_pstr("state"), "grow") == 0 && (grow_time() < 0 || grow_time() >= v_si(C, "events.grow.steps.1.at", 300));   /* grow from 300: each line is "" with no width, its node kept (fix 5 Create C7) */
  for (int i = 0, n = gone ? 0 : v_plen("regions.origin"); i < n && line < maxLines; i++) {
    char s[V_STR], buf[V_STR * 3]; snprintf(s, sizeof s, "%s", v_pstr(v_fmt("regions.origin.%d", i)));
    int nl = v_wrap(s, r[2], px, buf, sizeof buf, 8); const char *l = buf;
    for (int j = 0; j < nl && line < maxLines; j++, line++) { int w = v_measure(l, px); v_text(v_fmt("origin.%d", line), l, cx - v_half(w), cap_top(px, r[1] + pitch * line, pitch), w, px, v_scol(C, "colours.origin")); l += strlen(l) + 1; }
  }
}
/* The roll's gate (fix 5 Create C8; CD item 7, 07:10), computed here from the two founder pictures the face holds, in integers: the change dithers (16 Bayer levels) only when both the silhouette box (pixels clear in one picture and not the other)
   and the change box (pixels whose alpha differs, or whose colour differs where neither is clear) fit in events.roll.gate (each 160 x 160); a re-posed body, or a colour over the whole body, is a cut on the frame of the key. A failed query (an empty slot,
   different sizes) is a cut. Each pair is measured once, cached by the two ids. */
static int roll_dithers(const char *from, const char *to) {
  static char cf[96], ct[96]; static int ok, have;
  if (have && strcmp(cf, from) == 0 && strcmp(ct, to) == 0) return ok;
  int gs[2] = { v_sk(C, "events.roll.gate.silhouette", 0), v_sk(C, "events.roll.gate.silhouette", 1) }, gc[2] = { v_sk(C, "events.roll.gate.change", 0), v_sk(C, "events.roll.gate.change", 1) }, b[4], s[4];
  ok = v_change_box(from, to, b) == 0 && b[2] <= gc[0] && b[3] <= gc[1] && (v_silhouette_box(from, to, s) == 0 && s[2] <= gs[0] && s[3] <= gs[1]);   /* every change box contains its silhouette box, so the change test is the one that decides; the silhouette is asked only when it can still pass */
  snprintf(cf, sizeof cf, "%s", from); snprintf(ct, sizeof ct, "%s", to); have = 1; return ok;
}
/* the founder: its picture in its box, always as one composed picture (the Bayer pick of `from` and `to`), so its node never changes kind: while a `dither` event on the founder plays, the old picture cross-dithers to the new in
   16 levels over the event (a cut with reduced motion); otherwise level 16 is the new picture alone (§2.7). */
static void build_founder(void) {
  int r[4]; v_srect(C, "regions.founder.rect", r); v_set_focal(r); const char *pic = v_pstr("regions.founder.picture"); if (!has(pic)) return;
  anim_state_t t; const char *from = pic; int level = 16;
  if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "founder", &t) && t.from_id[0] && t.ms > 0 && wire_has_asset(t.from_id)) { from = t.from_id; level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; if (!roll_dithers(t.from_id, pic)) { from = pic; level = 16; } }   /* the gate (fix 5 Create C8): a small change dithers, anything larger is a cut */
  v_region("founder", LAYER_ART); v_dither("founder", from, pic, level, r[0], r[1], r[2], r[3]);
}
/* a rectangle or its node with no size (a slot kept for a state that has not come, so that showing it never adds a node, §2.2) */
static void rect_or(const char *id, int on, int x, int y, int w, int h, const char *colour) { if (on) v_rect(id, x, y, w, h, colour); else v_rect(id, x, y, 0, 0, colour); }
/* the roll: three places for pictures and the two notches are always there, with a node for each (a trait that does not roll shows one picture at the middle place and no notch); the clash's edge is four rectangles, with no size when there is none */
/* a place whose picture is not a placed master draws nothing (Every state composed 2-4; Pods P2): the slot id the props name is a picture the host has, or an empty slot */
static int roll_placed(int i) { char id[96]; snprintf(id, sizeof id, "%s", v_pstr(v_fmt("regions.roll.pictures.%d", i))); return id[0] && wire_has_asset(id); }
static void build_roll(void) {
  if (!has_roll()) return;
  int n = roll_n(), chosen = v_pint("regions.roll.chosen", 0), form = strcmp(v_pstr("regions.roll.form"), "roll") == 0, clash = v_pbool("regions.roll.clash", 0), w = v_si(C, "regions.roll.clashEdge.width", 2);
  const char *any = v_pstr("regions.roll.pictures.0"); int shown = v_pbool("regions.roll.shown", 1);   /* grow: every node kept, none sized (fix 5 Create C7) */
  for (int i = 0; i < 3; i++) {
    int r[4] = { 0, 0, 0, 0 }, on = i < n && shown; if (on) roll_rect(i, r); else v_srect(C, v_fmt("regions.roll.forms.roll.pictures.%d", i), r);
    v_region("roll", LAYER_CHROME); rect_or(v_fmt("roll.ground.%d", i), on && roll_placed(i), r[0], r[1], r[2], r[3], v_scol(C, "colours.roll.ground"));
    v_name("roll"); v_slot(v_fmt("roll.pic.%d", i), on ? v_pstr(v_fmt("regions.roll.pictures.%d", i)) : any, NULL, r[0], r[1], r[2], r[3], on);
  }
  { int r[4] = { 0, 0, 0, 0 }, on = shown && clash && chosen >= 0 && chosen < n && roll_placed(chosen); if (on) roll_rect(chosen, r); const char *red = v_scol(C, "colours.roll.clashEdge"); v_region("roll", LAYER_CHROME);   /* a 2 px red edge inside the chosen picture's own rectangle */
    rect_or("roll.clash.t", on, r[0], r[1], r[2], w, red); rect_or("roll.clash.b", on, r[0], r[1] + r[3] - w, r[2], w, red); rect_or("roll.clash.l", on, r[0], r[1] + w, w, r[3] - 2 * w, red); rect_or("roll.clash.r", on, r[0] + r[2] - w, r[1] + w, w, r[3] - 2 * w, red); }
  { int r[4] = { 0, 0, 0, 0 }, on = shown && form && chosen >= 0 && chosen < n && roll_placed(chosen), nw = v_sk(C, "regions.roll.notch.size", 0), nh = v_sk(C, "regions.roll.notch.size", 1); if (on) roll_rect(chosen, r); else v_srect(C, "regions.roll.forms.roll.pictures.1", r);   /* the notches ▲ ▼ above and below the chosen picture, outside the ring: chrome rects of `bone` in one composed 12 × 6 picture each (empty when the trait does not roll) */
    int x = r[0] + (r[2] - nw) / 2; static const int UX[6] = { 5, 4, 3, 2, 1, 0 }, UW[6] = { 2, 4, 6, 8, 10, 12 }; v_region("roll", LAYER_CHROME);
    for (int d = 0; d < 2; d++) {
      char ops[400]; int o = 0; o += snprintf(ops + o, sizeof ops - (size_t)o, "[");
      if (on) for (int row = 0; row < 6; row++) { int rr = d ? 5 - row : row; o += snprintf(ops + o, sizeof ops - (size_t)o, "%s[\"h\",%d,%d,%d,\"%s\"]", row ? "," : "", UX[rr], row, UW[rr], v_scol(C, "colours.roll.notch")); }
      snprintf(ops + o, sizeof ops - (size_t)o, "]"); v_composed(d ? "roll.notch.down" : "roll.notch.up", x, v_si(C, d ? "regions.roll.notch.down" : "regions.roll.notch.up", d ? 184 : 90), nw, nh, ops);
    }
  }
}
/* the trait line: the changed tag or the breed mark with the line, the group centred on x 512; a clash's ✕ is the line's first glyph. Every part has its node in every state (the tag, its word, the ✕, the line, the mark) and a part that is not shown has none of the size. */
static void build_traitLine(void) {
  int r[4]; v_srect(C, "regions.traitLine.rect", r); int px = v_si(C, "regions.traitLine.px", 16), gap = v_si(C, "regions.traitLine.tag.gap", 8), th = v_si(C, "regions.traitLine.tag.h", 24), cx = v_si(C, "regions.traitLine.centre", 512), ic = px + 4;
  char s[V_STR], word[24]; snprintf(s, sizeof s, "%s", v_pstr("regions.traitLine.text")); spec_str(C, "strings.changed", word, sizeof word);
  const char *breed = v_pstr("regions.traitLine.breed"), *line = s;
  int changed = v_pbool("regions.traitLine.changed", 0), doing = v_pbool("regions.traitLine.doing", 0), clash = v_pbool("regions.traitLine.clash", 0), cross = strncmp(s, "\xe2\x9c\x95 ", 4) == 0;
  if (cross) line = s + 4;   /* the ✕ is the icon's own node, ahead of the words */
  int tw = changed ? layout_plate_width(C, "regions.traitLine.tag", v_measure(word, px)) : 0, lw = v_run_width(line, px), bw = doing ? v_sk(C, "regions.traitLine.breedMark.size", 0) : 0, bg = v_si(C, "regions.traitLine.breedMark.gap", 8);
  int total = (tw ? tw + gap : 0) + (cross ? ic : 0) + lw + (bw ? bg + bw : 0), x = cx - v_half(total), tx = r[1] + v_fdiv(r[3] - th, 2);
  v_region("traitLine", LAYER_PAINTED); if (tw > 0) v_plate_in(C, "traitLine.tag", "regions.traitLine.tag", tw, x, tx); else { char series[48], hid[96]; spec_str(C, "regions.traitLine.tag.plate.series", series, sizeof series); snprintf(hid, sizeof hid, "%s-%dx%d", series, v_si(C, "regions.traitLine.tag.plate.min", 80), th); v_sprite_hidden("traitLine.tag", hid, x, tx); }   /* the face picks the plate of the plate-name series (C9); no tag: the series' smallest, no size, the node kept */   /* the tag is the signed plate-name-88x24 on the painted layer, drawn at its width (the word's + 16 on the 8 px grid, 88 for "changed"), never stretched */
  v_region("traitLine", LAYER_TYPE); v_text("traitLine.tag.word", tw ? word : "", x + v_half(tw - v_measure(word, px)), cap_top(px, tx + v_fdiv(th - 20, 2), 20), tw ? v_measure(word, px) : 0, px, v_scol(C, "colours.traitLine.tagWord")); if (tw) x += tw + gap;
  v_name("traitLine"); v_slot("traitLine.cross", "icon-cross-16", NULL, x + 2, r[1] + v_fdiv(r[3] - 16, 2), px, px, cross); if (cross) x += ic;
  v_region("traitLine", LAYER_TYPE); v_text("traitLine.text", line, x, v_si(C, "regions.traitLine.lineTop", 202) + v_fdiv(20 - v_cap(px), 2), lw, px, v_scol(C, clash ? "colours.traitLine.clash" : "colours.traitLine.line"));
  v_name("traitLine"); v_slot("traitLine.breed", breed, NULL, x + lw + bg, r[1] + v_fdiv(r[3] - v_sk(C, "regions.traitLine.breedMark.size", 1), 2), bw ? bw : 28, v_sk(C, "regions.traitLine.breedMark.size", 1), bw);
}
/* the stamp label: the dimmed plate (stampCase: 120 x 120, a 1 px edge) and the dimmed stamp centred on it; in grow the stamp prints its cells row by row from the top over `steps.0.ms` (N + 2 rows of `cell` px, whole rows); nothing read: no label is drawn */
static void build_stamp(void) {
  int r[4]; v_srect(C, "regions.stamp.rect", r); const char *pl = v_pstr("regions.stamp.plate");
  const char *a = v_pstr("regions.stamp.asset"); int size = v_pint("regions.stamp.size", 0), N = v_pint("regions.stamp.N", 0), cell = v_pint("regions.stamp.cell", 0);
  word_stampCase(C, "regions", 0);   /* the case the label is pressed into, drawn in every state (fix 5 Create C1; Pods' signed case, the same word's part) */
  v_region("stamp.plate", LAYER_PAINTED); if (has(pl)) v_slot("stamp.plate", pl, NULL, r[0], r[1], r[2], r[3], has(a) && size);
  v_region("stampImage", LAYER_PAINTED);   /* the stamp's own region (as Pods'), so the case's rectangle is not folded into it */
  if (!has(a) || !size) { word_stampCase(C, "regions", 1); return; }
  int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size), rows = N + 2, shown = rows;
  if (strcmp(v_pstr("state"), "grow") == 0) { int t = grow_time(), ms = v_si(C, "events.grow.steps.0.ms", 300); if (has_roll() && t >= 0 && t < ms) shown = rows * t / ms; }   /* nothing read (no roll): the stamp is a cut, the whole of it from 0 */
  v_name("stampImage"); prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, shown * cell, 0, 1, 0);
  v_sprite("stamp.stamp", a, x, y, size, size);
  word_stampCase(C, "regions", 1);   /* the case's front glass over the label */
}
static void build_code(void) {
  int r[4]; v_srect(C, "regions.code.rect", r); const char *code = v_pstr("regions.code"); int t = grow_time(), at = v_si(C, "events.grow.steps.1.at", 300), px = v_si(C, "regions.code.px", 16), shown = *code && (t < 0 || t >= at), w = v_measure(code, px);
  v_region("code", LAYER_CHROME); rect_or("code.rule", shown, v_sk(C, "regions.code.rule.x", 0), v_si(C, "regions.code.rule.y", 505), v_sk(C, "regions.code.rule.x", 1) - v_sk(C, "regions.code.rule.x", 0), v_si(C, "regions.code.rule.h", 1), v_scol(C, "colours.code.rule"));   /* the rule and the code are one object: both have no size until grow 300 (fix 5 Create C4) */
  v_region("code", LAYER_TYPE);   /* the code's node is there in every state: until it prints it is the same node with no text and no width, so Grow changes a node and never adds one (§2.2) */
  v_text("code", shown ? code : "", v_si(C, "regions.code.centre", 864) - v_half(w), v_si(C, "regions.code.baseline", 497) - v_cap(px), shown ? w : 0, px, v_scol(C, "colours.code.text"));
}

/* ---- the targets as the words drew them, and the ring ---- */
int create_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "%s", v_pstr("state")); int n = v_plen("focus.targets"); if (n > cap) n = cap; int k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i))); t->enabled = 1;
    int r[4] = { 0, 0, 0, 0 }; if (strcmp(t->id, "roll") == 0 && has_roll()) { int c = v_pint("regions.roll.chosen", 0); if (c >= 0 && c < roll_n()) roll_rect(c, r); }
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}
static void build_ring(void) {
  if (spec_len("props", "overlay") >= 0) return;   /* the decision panel is open: its ring is the only one */
  char cur[40]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (strcmp(cur, "roll") != 0 || !has_roll()) return;
  int r[4], c = v_pint("regions.roll.chosen", 0); if (c < 0 || c >= roll_n() || !roll_placed(c)) return; roll_rect(c, r);
  v_region("focus", LAYER_CHROME); word_focusRing("focus", C, "focus.shape.targets.roll", r);
}

void create_words(void) {
  int grow = strcmp(v_pstr("state"), "grow") == 0;
  build_bench();
  word_rail(C);
  picture("dome", "dome", "regions.dome.rect", v_pstr("regions.dome.back"));
  { const char *pod = v_pstr("regions.dome.pod"); int w = v_pint("regions.dome.podSize.0", 0), h = v_pint("regions.dome.podSize.1", 0), ax = v_pint("regions.dome.podAnchor.0", 0), ay = v_pint("regions.dome.podAnchor.1", 0);   /* the bud growing or ready: its pod in the chamber */
    v_name("domePod"); if (has(pod) && w > 0) v_sprite("dome.pod", pod, v_sk(C, "regions.travel.foot.to", 0) - ax, v_sk(C, "regions.travel.foot.to", 1) - ay, w, h); }
  build_pod(grow);
  { char u[8]; if (spec_str(C, "regions.cradleFront.until", u, sizeof u) <= 0) picture("cradleFront", "cradleFront", "regions.cradleFront.rect", v_pstr("regions.cradle.front")); }   /* the dish's near lip over the pod, drawn once Create's own stage lands (the spec drops `until`) */
  build_origin();
  picture("chamber", "chamber", "regions.chamber.rect", v_pstr("regions.chamber.back"));
  { int r[4]; v_srect(C, "regions.founderShadow.rect", r); const char *sp = v_pstr("regions.founderShadow.picture"); v_region("founderShadow", LAYER_PAINTED); v_slot("founderShadow", sp, NULL, r[0], r[1], r[2], r[3], 1); }   /* the painted contact shadow under the founder (fix 6 A2): after the chamber, before the founder; no size until its picture is on the face */
  build_founder();
  picture("chamberFront", "chamberFront", "regions.chamberFront.rect", v_pstr("regions.chamberFront.picture"));   /* the tray's rim and floor, over the founder: its ink is rows 310 to 319 only */
  build_roll();
  build_traitLine();
  { int r[4]; v_srect(C, "regions.domeFront.rect", r);   /* the capsule's glass (code-drawn), shell and bar, over the travelling pod; the bar is lit while another bud grows (T-20261016-222, build spec section 5) */
    const char *ds = v_pstr("regions.dome.state"); int growing = strcmp(ds, "growing") == 0, ready = strcmp(ds, "ready") == 0, gr = strcmp(ds, "grow") == 0, landed = gr && (grow_time() < 0 || grow_time() >= v_si(C, "regions.travel.rest.at", 530));
    int closed = growing || landed;   /* the glass only when it is closed, never with the door open */
    v_name("domeGlass"); { const char *g = v_pstr("regions.dome.glass"); if (has(g) && closed) v_sprite("dome.glass", g, r[0], r[1], r[2], r[3]); }
    picture("domeFront", "domeFront", "regions.domeFront.rect", v_pstr("regions.domeFront.picture"));
    v_name("domeDoor"); { const char *d = v_pstr("regions.dome.door"); if (has(d) && !closed && !gr) v_sprite("dome.door", d, r[0], r[1], r[2], r[3]); }
    v_name("domeBar"); { const char *b = v_pstr("regions.dome.bar"); if (has(b) && (growing || ready || landed)) v_sprite("dome.bar", b, r[0], r[1], r[2], r[3]); } }
  build_stamp();
  build_code();
  build_ring();
}

/* a key on Create: ✓, ← and the room keys say an intent on the focus (the roll, or the room when nothing is read); the pad is the spec's graph on the roll: a stepper, so each direction says step:<key> and the ring stays */
void create_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "room");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[4]; char gkey[24]; int n = create_focus(t, 4, gkey, sizeof gkey); if (n <= 0) return;
  char path[64], err[200]; snprintf(path, sizeof path, "focus.%s.graph", gkey); int glen; const char *graph = spec_raw(C, path, &glen);
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  char to[48]; int step = focus_move(g, t, n, cur, dir, NULL, 0, NULL, to, sizeof to); focus_graph_free(g);
  if (step) { char v[16]; snprintf(v, sizeof v, "step:%s", dir == FOCUS_UP ? "up" : dir == FOCUS_DOWN ? "down" : dir == FOCUS_LEFT ? "left" : "right"); screens_say("intent", cur, v); return; }
  if (strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
