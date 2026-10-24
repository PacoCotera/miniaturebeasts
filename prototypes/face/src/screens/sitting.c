/* The sitting (sitting.json): a binding table. In draw order: the stage (kit_stage), the living window (word_livingWindow: Habitat's glass on the pose step, the place's backdrop after, cross-dithered from the picture
   the host names in the `dither` event on "glass"), the resident (kit_resident, placed by its figure on the spec's axis and feet; cross-dithered from the host's `dither` on "resident"), the name tag (kit_nameTag; its slot only
   in state portrait), the portrait in the gilt's opening, the gilt (rest or lit; the begin event's dither on "gilt" takes the lit gilt out), the deck's plate, the heading, the cards (kit_tiles: a well and a picture each,
   the focused card lifted), the chosen pair (kit_tiles), the stamp label with its portrayed corner (kit_stamp), the strip's plate, the three steps (kit_tiles: a well, the word, Portray's frame, the thumb) and the ring
   (word_focusRing on the focused card). Every rect, colour and offset is the spec's; the props name the pictures, words and states. A picture the host has not sent is a slot not yet filled: nothing is drawn. The pad walks
   focus.pose.graph over the cards on the pose and place steps; on the confirm and portrait steps the ring is on nothing and the pad does nothing. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../anim/anim.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "sitting"
#define CARDS 6

/* a dither the host plays on `target` (events.backdrop, the pose change, events.begin's gilt): its from-id and level 0..16 on the event's own clock; 0 when none plays, motion is off or the from is not on the face */
static int dither_of(const char *target, char *from, int cap, int *level) {
  anim_state_t t; from[0] = 0; *level = 16;
  if (!v_pbool("motion", 1) || !anim_get(ANIM_DITHER, target, &t) || !t.from_id[0] || t.ms <= 0) return 0;
  int sz[2]; if (v_asset_size(t.from_id, sz) < 0) return 0;
  snprintf(from, (size_t)cap, "%s", t.from_id); *level = 16 * t.elapsed / t.ms; if (*level > 16) *level = 16;
  return 1;
}
static int on_cards(void) { const char *st = v_pstr("state"); return strcmp(st, "pose") == 0 || strcmp(st, "place") == 0; }

/* ---- the window: the glass and the resident in it, the name tag, the portrait and the gilt ---- */
static void window(void) {
  char from[96]; int level, g[4]; v_srect(S, "regions.glass.rect", g);
  if (dither_of("glass", from, sizeof from, &level)) { int sz[2]; v_asset_size(from, sz); if (sz[0] != g[2] || sz[1] != g[3]) { from[0] = 0; level = 16; } }   /* a cross-dither only between pictures of the glass's own size */
  word_livingWindow(S, "glass", "regions.bezel", "regions.glass", "colours.glass", v_pstr("regions.glass.picture"), 0, 0, from[0] ? from : NULL, level);
  int fig[4], hasFig = v_plen("regions.resident.figure") == 4; for (int k = 0; k < 4; k++) fig[k] = hasFig ? v_pint(v_fmt("regions.resident.figure.%d", k), 0) : 0;
  char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr("regions.resident.picture"));
  dither_of("resident", from, sizeof from, &level);
  kit_resident(S, "regions.resident.rect", "regions.resident.rect", "resident", pic, "", 0, from[0] ? from : NULL, level, hasFig ? fig : NULL, "regions.resident.axis", "regions.resident.feet");
  { int box[4], out[4]; v_srect(S, "regions.resident.rect", box); const char *name = v_pstr("regions.nameTag.text"); int y = v_sk(S, "regions.nameTag.rect", 1);
    kit_nameTag(S, "regions.glass", name, box, y, y, KIT_TAG_AUTO, !*name, v_scol(S, "colours.nameTag.fill"), v_scol(S, "colours.nameTag.edge"), v_scol(S, "colours.nameTag.name"), out); }
  { int r[4]; v_srect(S, "regions.portrait.rect", r); const char *p = v_pstr("regions.portrait.picture"); v_name("portrait"); v_slot("portrait", p, NULL, r[0], r[1], r[2], r[3], *p != 0); }
  { int r[4]; v_srect(S, "regions.gilt.rect", r); char p[96]; snprintf(p, sizeof p, "%s", v_pstr("regions.gilt.picture")); int out = dither_of("gilt", from, sizeof from, &level);
    v_name("gilt"); v_slot("gilt", p, out ? from : NULL, r[0], r[1], r[2], r[3], *p && !out);
    if (out) { v_name("gilt"); v_dither_window("gilt.dither", from, 0, 0, NULL, 0, 0, level, r[0], r[1], r[2], r[3]); } }   /* events.begin: the lit gilt dithers out to clear */
}

/* ---- the deck: its plate, the heading, the cards, the chosen pair and the stamp label ---- */
static void heading(void) {
  char text[V_STR]; snprintf(text, sizeof text, "%s", v_pstr("regions.heading.text")); int portrait = strcmp(v_pstr("state"), "portrait") == 0, r[4];
  v_srect(S, portrait ? "regions.heading.portrait.rect" : "regions.heading.rect", r);
  int px = portrait ? v_sk(S, "regions.heading.portrait.px", 0) : v_si(S, "regions.heading.px", 20);
  if (portrait && v_measure(text, px) > r[2]) px = v_sk(S, "regions.heading.portrait.px", 1);   /* 20 px, or 16 when 20 does not fit the rect */
  v_region("heading", LAYER_TYPE); v_line_at("heading", text, r[0], v_si(S, "regions.heading.lineTop", 66), V_ANCHOR_LINE, px, v_scol(S, "colours.heading"), V_ALIGN_LEFT);
}
static void card(int i, const int b[4], void *ctx) {
  const char *list = ctx; int lift = on_cards() && strcmp(list, "cards") == 0 && strcmp(v_focus_cur(), v_fmt("card.%d", i)) == 0 ? v_si(S, "focus.pose.targets.card.lift", 2) : 0;
  char well[96], pic[96]; snprintf(well, sizeof well, "%s", v_pstr(v_fmt("regions.%s.items.%d.well", list, i))); snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("regions.%s.items.%d.picture", list, i)));
  int px = v_sk(S, "regions.cards.card.picture.at", 0), py = v_sk(S, "regions.cards.card.picture.at", 1), pw = v_sk(S, "regions.cards.card.picture.size", 0), ph = v_sk(S, "regions.cards.card.picture.size", 1);
  v_name(list); v_slot(v_fmt("%s.%d.well", strcmp(list, "cards") == 0 ? "card" : "chosen", i), well, NULL, b[0], b[1] - lift, b[2], b[3], 1);
  v_name(list); v_slot(v_fmt("%s.%d.pic", strcmp(list, "cards") == 0 ? "card" : "chosen", i), pic, NULL, b[0] + px, b[1] - lift + py, pw, ph, 1);
}
static void deck(void) {
  int r[4]; v_srect(S, "regions.deck.rect", r); v_name("deck"); v_slot("deck", v_pstr("regions.deck.plate"), NULL, r[0], r[1], r[2], r[3], 1);
  heading();
  { int n = v_plen("regions.cards.items"); if (n > 0) kit_tiles(S, "regions.cards", n, card, (void *)"cards", NULL); }
  { int n = v_plen("regions.chosen.items"); if (n > 0) kit_tiles(S, "regions.chosen", n, card, (void *)"chosen", NULL); }
  kit_stamp_t o = { "stamp", "stamp", "stamp", 0, NULL, NULL, v_pstr("regions.stamp.corner"), { v_sk(S, "regions.stamp.portrayed.at", 0), v_sk(S, "regions.stamp.portrayed.at", 1) } };
  char asset[96], plate[96], corner[96]; snprintf(asset, sizeof asset, "%s", v_pstr("regions.stamp.asset")); snprintf(plate, sizeof plate, "%s", v_pstr("regions.stamp.plate")); snprintf(corner, sizeof corner, "%s", o.corner); o.corner = corner;
  kit_stamp(S, "regions.stamp.rect", plate, asset, v_pint("regions.stamp.size", 0), -1, &o);
}

/* ---- the strip and the steps: a well, the word, Portray's frame and the thumb each ---- */
static void step(int i, const int b[4], void *ctx) {
  (void)ctx; char st[16], word[V_STR], cut[V_STR + 4], well[96], pic[96], frame[96];
  snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.steps.items.%d.state", i))); snprintf(word, sizeof word, "%s", v_pstr(v_fmt("regions.steps.items.%d.word", i)));
  snprintf(well, sizeof well, "%s", v_pstr(v_fmt("regions.steps.items.%d.well", i))); snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("regions.steps.items.%d.picture", i))); snprintf(frame, sizeof frame, "%s", v_pstr(v_fmt("regions.steps.items.%d.frame", i)));
  int done = strcmp(st, "done") == 0, px = v_si(S, "regions.steps.word.px", 16);
  v_name("steps"); v_slot(v_fmt("step.%d.well", i), well, NULL, b[0], b[1], b[2], b[3], 1);
  v_clip(word, v_si(S, "regions.steps.word.box", 0), px, cut, sizeof cut);
  v_region("steps", LAYER_TYPE); v_line_at(v_fmt("step.%d.word", i), cut, b[0] + v_sk(S, "regions.steps.word.at", 0), b[1] + v_sk(S, "regions.steps.word.at", 1), V_ANCHOR_MID, px, v_scol(S, v_fmt("regions.steps.word.colour.%s", st)), V_ALIGN_LEFT);
  const char *T = *frame ? "regions.steps.thumb.portrait.picture" : "regions.steps.thumb";
  if (*frame) { int fs[2] = { 0, 0 }; v_asset_size(frame, fs); v_name("steps"); v_slot(v_fmt("step.%d.frame", i), frame, NULL, b[0] + v_sk(S, "regions.steps.thumb.portrait.at", 0), b[1] + v_sk(S, "regions.steps.thumb.portrait.at", 1), fs[0], fs[1], 1); }   /* Portray's frame 1:1 at its own size */
  v_name("steps"); v_slot(v_fmt("step.%d.thumb", i), pic, NULL, b[0] + v_sk(S, v_fmt("%s.at", T), 0), b[1] + v_sk(S, v_fmt("%s.at", T), 1), v_sk(S, v_fmt("%s.size", T), 0), v_sk(S, v_fmt("%s.size", T), 1), done && *pic);
}
static void strip(void) {
  int r[4]; v_srect(S, "regions.strip.rect", r); v_name("strip"); v_slot("strip", v_pstr("regions.strip.plate"), NULL, r[0], r[1], r[2], r[3], 1);
  int n = v_plen("regions.steps.items"); if (n > 0) kit_tiles(S, "regions.steps", n, step, NULL, NULL);
}

/* ---- the focus: the cards on the pose and place steps, each its card's rect; none on the others ---- */
static void no_draw(int i, const int b[4], void *ctx) { (void)i; (void)b; (void)ctx; }
int sitting_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"), nc = v_plen("regions.cards.items"), boxes[CARDS][4]; if (n > cap) n = cap;
  if (!on_cards() || nc <= 0 || nc > CARDS || kit_tiles(S, "regions.cards", nc, no_draw, NULL, boxes) < 0) return 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int k = strncmp(t->id, "card.", 5) == 0 ? atoi(t->id + 5) : -1, box[4] = { 0, 0, 0, 0 };
    if (k >= 0 && k < nc) memcpy(box, boxes[k], sizeof box);
    focus_fill(t, "focus.targets", i, box);
  }
  return n;
}
static void ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur()); if (!*c || anim_holding()) return;
  focus_target_t t[CARDS]; int n = sitting_focus(t, CARDS);
  for (int i = 0; i < n && i < CARDS; i++) if (strcmp(t[i].id, c) == 0 && t[i].w > 0) { int box[4] = { t[i].x, t[i].y - v_si(S, "focus.pose.targets.card.lift", 2), t[i].w, t[i].h }; v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "focus.pose.targets.card", box); return; }
}

void sitting_words(void) {
  kit_stage(S, "regions.stage.rect", v_scol("frame", "colours.stageGround"), "stage", "stage.ground", "stage.room", "regions.stage.room");
  window();
  deck();
  strip();
  ring();
}

/* a key on the sitting: ✓ ← and the room keys are intents on the focused card or the room; the pad walks focus.pose.graph on the pose and place steps (focus.place is the same) and nothing on the others */
void sitting_key(int code) { screens_key_graph(code, S, on_cards() ? "focus.pose.graph" : NULL, sitting_focus, "room", &(screens_keys_t){ 0 }); }
