/* The decision panel, an overlay over the screen that opens it (panel.json; frame.json regions.panel; specs/station-decision-panel-spec.md Part 1; lvgl-switch.md §2.2): drawn after the screen's words, before the frame's, so the ring and the
   message plate stand over it. Its words are `panel` (the plate and the card wells), `text`, `price` (a card's cost as the bottom line's kit icons and figures), `sprite` (the outcome's picture, 1:1 and never scaled, bottom-centred on the slot's
   floor, and the destination mark) and the focus ring: the veil (a Bayer lattice of 8 of 16 levels toward stageGround), the panel, the title, then each card. Every number is frame.json regions.panel; the title, the cards' names, costs and
   lines, their pictures' ids and sizes, the masters' ids and the focus are props (`overlay.regions`, `overlay.focus`), never the spec. The panel is drawn from the passed masters (T-20261016-47, -70) in T-70's composite rule per card:
   the glow, the stage, the contact shadow (nine-sliced across the feet's span plus 16), the picture 1:1 with its feet line (its lowest row of alpha >= 128) on y + 168, the light; the cost groups on rubber chips; the veil a flat layer. While a master is not placed the
   code-drawn plate (stageGround, plateEdge, chrome wells) stands in. While it is open its focus is its own (the cards, in the props' order): the screen beneath draws no ring and takes no key.
   The card at i of n (1 to 3): [x + (w + gap) i, y, w, h] with w = (776 - gap (n - 1)) / n: 776, 380 or 248. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define F "frame"
#define RP "regions.panel"
#define MAXCARDS 3
static int fi(const char *p, int d) { return spec_int(F, v_fmt(RP ".%s", p), d); }
static int fk(const char *p, int k) { return spec_int(F, v_fmt(RP ".%s.%d", p, k), 0); }
static void frect(const char *p, int r[4]) { if (!v_spec_rect(F, v_fmt(RP ".%s", p), r)) r[0] = r[1] = r[2] = r[3] = 0; }
/* a colour: a frame role (colours.<name>) when there is one, else the palette name as written */
static const char *col(const char *name) { static char b[8][24]; static int k; char *o = b[k++ & 7]; if (spec_str(F, v_fmt("colours.%s", name), o, 24) <= 0) snprintf(o, 24, "%s", name); return o; }
static const char *rcol(const char *path) { char s[24]; if (spec_str(F, v_fmt(RP ".%s", path), s, sizeof s) <= 0) snprintf(s, sizeof s, "bone"); return col(s); }
/* the strip form (frame.json regions.panel.strip; T-20261016-48 §2): the dock arrival's choice, two cards in a plate under what they are about, no title, picture or veil */
static int strip(void) { return strcmp(v_pstr("overlay.form"), "strip") == 0; }
static int si(const char *p, int d) { return spec_int(F, v_fmt(RP ".strip.%s", p), d); }
static int sk(const char *p, int k) { return spec_int(F, v_fmt(RP ".strip.%s.%d", p, k), 0); }
static int ncards(void) { int n = v_plen("overlay.regions.cards"); return n < 0 ? 0 : n > MAXCARDS ? MAXCARDS : n; }
static void card_rect(int i, int n, int r[4]) {
  if (strip()) { int gap = si("cards.gap", 16), w = si("cards.w", 396); r[0] = si("cards.x", 108) + i * (w + gap); r[1] = si("cards.y", 392); r[2] = w; r[3] = si("cards.h", 128); (void)n; return; }
  int gap = fi("cards.gap", 16), total = fi("cards.width", 776), w = (total - gap * (n - 1)) / n;
  r[0] = fi("cards.x", 124) + i * (w + gap); r[1] = fi("cards.y", 152); r[2] = w; r[3] = fi("cards.h", 288);
}
static const char *card_id(int i) { return v_pstr(v_fmt("overlay.regions.cards.%d.id", i)); }
static int cap_top(int px, int y, int pitch) { return y + v_fdiv(pitch - v_cap(px), 2); }

/* the veil: the stage under the panel, 8 of 16 Bayer levels toward stageGround, one composed picture (a cut) */
static void build_veil(void) {
  static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
  int r[4]; frect("veil.rect", r); int level = fi("veil.levels", 8); if (r[2] <= 0) return;
  v_region("veil", LAYER_CHROME);
  if (v_sprite("panel.veil", v_pstr("overlay.regions.art.veil"), r[0], r[1], r[2], r[3])) return;   /* the veil master: a flat layer, never dithered */
  char ops[400]; int n = snprintf(ops, sizeof ops, "[[\"lattice\",0,0,%d,%d,4,[", r[2], r[3]);   /* until it is placed: a Bayer lattice of 8 of 16 levels toward stageGround */
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, sizeof ops - (size_t)n, "],\"%s\"]]", col("stageGround"));
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  prim_node(v_id("panel.veil"), FN_COMPOSED, r[0], r[1], r[2], r[3], 0, 0, 0);
}
static void build_plate(void) {
  int r[4]; frect("rect", r);
  v_region("panel", LAYER_CHROME);
  if (v_sprite("panel.plate", v_pstr("overlay.regions.art.housing"), r[0], r[1], r[2], r[3])) return;   /* the housing master, 1:1 */
  char fill[24], edge[24]; snprintf(fill, sizeof fill, "%s", rcol("ground")); snprintf(edge, sizeof edge, "%s", rcol("edge"));
  word_panel("panel.plate", r[0], r[1], r[2], r[3], fill, edge);
}
static void build_title(void) {
  int r[4]; frect("title.rect", r); const char *t = v_pstr("overlay.regions.title"); int px = fi("title.px", 28), w = v_measure(t, px);
  v_region("panelTitle", LAYER_TYPE); v_text("panel.title", t, r[0] + v_half(r[2] - w), cap_top(px, fi("title.lineTop", r[1]), 36), w, px, rcol("title.colour"));
}
static const char *GLYPH[4] = { "\xe2\x9a\xa1", "\xe2\x9d\x80", "\xe2\x97\x86", "\xe2\xa7\x97" };   /* ⚡ ❀ ◆ ⧗, the price's closed table (vocab.c PRICE) */
/* the cost groups on rubber chips: each "glyph figure" of the price string on a chip nine-sliced round it (6 px in, 8 between groups); a short figure in `need`, a gain in `turn` */
static void build_costs(int i, int x, int y, const char *cost, const char *shorts, int gain) {
  const char *chip = v_pstr("overlay.regions.art.chip"); int pad = fi("art.chip.pad", 6), between = fi("art.chip.between", 8), ch = fi("art.chip.h", 20), px = fi("card.costs.px", 16), k = 0;
  static const int CAPS[4] = { 10, 0, 10, 0 };
  for (const char *p = cost; *p;) {
    int g = -1; for (int j = 0; j < 4; j++) if (strncmp(p, GLYPH[j], strlen(GLYPH[j])) == 0) g = j;
    if (g < 0) { p++; continue; }
    const char *q = p + strlen(GLYPH[g]); while (*q == ' ') q++; int n = 0; while (q[n] && q[n] != ' ') n++;
    char grp[48]; snprintf(grp, sizeof grp, "%s %.*s", GLYPH[g], n, q);
    int rw = v_run_width(grp, px), cw = rw + 2 * pad; const char *colour = col(gain ? "turn" : (g < 3 && *shorts && strstr(shorts, GLYPH[g])) ? "need" : "price");
    v_region("cardChips", LAYER_PAINTED); if (*chip) v_nine(v_fmt("card.%d.chip.%d", i, k), chip, x, y, cw, ch, CAPS);
    v_region("cardText", LAYER_TYPE); v_run(v_fmt("card.%d.cost.%d", i, k), grp, x + pad, y, px, colour, V_ALIGN_LEFT);
    x += cw + between; k++; p = q + n;
  }
}
static void build_card(int i, int n, int focused) {
  int r[4]; card_rect(i, n, r);
  int dim = v_pbool(v_fmt("overlay.regions.cards.%d.dim", i), 0), loss = v_pbool(v_fmt("overlay.regions.cards.%d.loss", i), 0), w = r[2], tw = w - 32, pw = w - 32, slotX = r[0] + fk("card.picture.at", 0);
  const char *base = v_fmt("overlay.regions.cards.%d.art", i);
  /* the well: the master (the focused one a step up; the ring is over it), else the code-drawn well */
  { const char *id = v_pstr(v_fmt("%s.%s", base, focused ? "focused" : "well")); v_region("cards", LAYER_PAINTED);
    if (!v_sprite(v_fmt("card.%d.well", i), id, r[0], r[1], w, r[3])) { char well[24], edge[24]; snprintf(well, sizeof well, "%s", rcol("cards.well")); snprintf(edge, sizeof edge, "%s", rcol("cards.edge")); v_region("cards", LAYER_CHROME); word_panel(v_fmt("card.%d.well", i), r[0], r[1], w, r[3], well, edge); } }
  /* the glow and the stage: under the picture (the stage at the slot's foot) */
  v_region("cardStage", LAYER_PAINTED);
  const char *scene = v_pstr(v_fmt("%s.scene", base)); int shift = *scene ? fi("art.scene.shift", 0) : 0;   /* the Return outcome: its place's scene stands in the glow's place and the subject stands right of centre, facing the light */
  v_sprite(v_fmt("card.%d.glow", i), v_pstr(v_fmt("%s.glow", base)), slotX, r[1] + fk("art.glow.at", 1), pw, 160);
  if (*scene) v_sprite(v_fmt("card.%d.scene", i), scene, slotX, r[1] + fk("art.scene.at", 1), pw, 152);
  v_sprite(v_fmt("card.%d.stage", i), v_pstr(v_fmt("%s.stage", base)), slotX, r[1] + fk("art.stage.at", 1), pw, 48);
  /* the picture, 1:1, centred, its feet line (its lowest row of alpha >= 128) on y + 168; its contact shadow across the feet's span plus 16 under it */
  { const char *pic = v_pstr(v_fmt("overlay.regions.cards.%d.picture", i)); int pwid = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.0", i), 0), ph = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.1", i), 0), hd = *pic ? wire_asset_slot(pic) : -1;
    int feet[3] = { ph - 1, 0, pwid - 1 }; if (hd >= 0 && prim_asset_feet(hd, fi("art.feet.alpha", 128), fi("art.feet.rows", 4), feet) < 0) { feet[0] = ph - 1; feet[1] = 0; feet[2] = pwid - 1; }
    int px0 = slotX + v_half(pw - pwid) + shift, py0 = r[1] + fi("art.feet.line", 168) - feet[0];
    { const char *sh = v_pstr("overlay.regions.art.shadow"); int span = feet[2] - feet[1] + 1 + fi("art.shadow.stretch", 16), ends = fi("art.shadow.ends", 32), sh_h = fi("art.shadow.h", 16); if (span < 2 * ends) span = 2 * ends;
      const int caps[4] = { ends, 0, ends, 0 }; v_region("cardStage", LAYER_PAINTED); if (hd >= 0) v_nine(v_fmt("card.%d.shadow", i), sh, px0 + (feet[1] + feet[2] + 1) / 2 - span / 2, r[1] + fi("art.feet.line", 168) - sh_h / 2, span, sh_h, caps); }
    v_name("cardPictures"); if (hd >= 0 && pwid > 0 && ph > 0) v_sprite(v_fmt("card.%d.picture", i), pic, px0, py0, pwid, ph); else v_sprite_hidden(v_fmt("card.%d.picture", i), pic, r[0], r[1]); }
  /* the light: over the picture, the pool lighting the subject from below */
  v_region("cardStage", LAYER_PAINTED); v_sprite(v_fmt("card.%d.light", i), v_pstr(v_fmt("%s.light", base)), slotX, r[1] + fk("art.light.at", 1), pw, 160);
  /* the destination mark: the title bar's mark of the room it lands in, over the picture's top right; staying here: none */
  { const char *mk = v_pstr(v_fmt("overlay.regions.cards.%d.mark", i)); int ms = fk("card.mark.size", 0); if (ms <= 0) ms = 24;
    v_name("cardMarks"); if (*mk) v_sprite(v_fmt("card.%d.mark", i), mk, r[0] + w - 40, r[1] + fk("card.mark.at", 1), ms, ms); else v_sprite_hidden(v_fmt("card.%d.mark", i), mk, r[0] + w - 40, r[1] + 16); }
  /* the name: 20, the option's verb */
  { const char *s = v_pstr(v_fmt("overlay.regions.cards.%d.name", i)); int px = fi("card.name.px", 20), sw = v_measure(s, px);
    v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.name", i), s, r[0] + fk("card.name.at", 0), cap_top(px, r[1] + fk("card.name.at", 1), 28), sw, px, rcol(dim ? "card.name.colourDim" : "card.name.colour")); }
  /* the costs, on their chips; free: nothing drawn */
  build_costs(i, r[0] + fk("card.costs.at", 0), r[1] + fk("card.costs.at", 1), v_pstr(v_fmt("overlay.regions.cards.%d.cost", i)), v_pstr(v_fmt("overlay.regions.cards.%d.short", i)), v_pbool(v_fmt("overlay.regions.cards.%d.gain", i), 0));
  /* the line: the one thing the picture cannot say, 16; a loss shows it in `need` */
  { const char *s = v_pstr(v_fmt("overlay.regions.cards.%d.line", i)); int px = fi("card.line.px", 16), sw = v_measure(s, px); (void)tw;
    v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.line", i), s, r[0] + fk("card.line.at", 0), cap_top(px, r[1] + fk("card.line.at", 1), 20), *s ? sw : 0, px, rcol(dim ? "card.line.colourDim" : loss ? "card.line.colourLoss" : "card.line.colour")); }
}
/* the ring: the focused card's rect, the frame ring { rect: 10 } 4 px out (the ring reaches 5 from the rect it is given, so the rect is drawn 1 px in); no lift */
static void build_ring(int n) {
  const char *c = v_focus_cur_at("overlay.focus.cur"); if (!*c) return;
  for (int i = 0; i < n; i++) if (strcmp(c, v_fmt("card.%s", card_id(i))) == 0) {
    int r[4], box[4]; card_rect(i, n, r); int in = spec_int(F, "focus.ring.reach", 5) - fi("ring.out", 4); if (in < 0) in = 0;
    box[0] = r[0] + in; box[1] = r[1] + in; box[2] = r[2] - 2 * in; box[3] = r[3] - 2 * in;
    v_region("focus", LAYER_CHROME); word_focusRing("focus", "panel", "focus.targets.card", box); return;
  }
}
/* the strip: the plate (the code-drawn ground and edge while no master is placed), then each card: its well, its 96 × 96 picture, the name, the costs and the one line */
static void build_strip(int n) {
  int r[4]; frect("strip.rect", r); char fill[24], edge[24]; snprintf(fill, sizeof fill, "%s", rcol("ground")); snprintf(edge, sizeof edge, "%s", rcol("edge"));
  v_region("panel", LAYER_CHROME); word_panel("panel.plate", r[0], r[1], r[2], r[3], fill, edge);
  const char *cur = v_focus_cur_at("overlay.focus.cur");
  for (int i = 0; i < n; i++) {
    int c[4]; card_rect(i, n, c); int dim = v_pbool(v_fmt("overlay.regions.cards.%d.dim", i), 0), tx = c[0] + sk("name.at", 0), maxw = si("line.max", 252);
    char well[24], wedge[24]; snprintf(well, sizeof well, "%s", rcol("cards.well")); snprintf(wedge, sizeof wedge, "%s", rcol("cards.edge"));
    v_region("cards", LAYER_CHROME); word_panel(v_fmt("card.%d.well", i), c[0], c[1], c[2], c[3], well, wedge);
    { const char *pic = v_pstr(v_fmt("overlay.regions.cards.%d.picture", i)); int pw = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.0", i), 0), ph = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.1", i), 0);
      v_name("cardPictures"); if (pw > 0 && ph > 0 && v_sprite(v_fmt("card.%d.picture", i), pic, c[0] + sk("picture.at", 0), c[1] + sk("picture.at", 1), pw, ph)) {} else v_sprite_hidden(v_fmt("card.%d.picture", i), pic, c[0], c[1]); }
    { const char *t = v_pstr(v_fmt("overlay.regions.cards.%d.name", i)); int px = si("name.px", 20); char fit[V_STR]; v_clip(t, maxw, px, fit, sizeof fit);
      v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.name", i), fit, tx, cap_top(px, c[1] + sk("name.at", 1), si("name.h", 28)), v_measure(fit, px), px, rcol(dim ? "strip.name.colourDim" : "strip.name.colour")); }
    { const char *t = v_pstr(v_fmt("overlay.regions.cards.%d.line", i)); int px = si("line.px", 16); char fit[V_STR]; v_clip(t, maxw, px, fit, sizeof fit);
      v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.line", i), fit, tx, cap_top(px, c[1] + sk("line.at", 1), si("line.h", 20)), *fit ? v_measure(fit, px) : 0, px, rcol(dim ? "strip.line.colourDim" : "strip.line.colour")); }
    (void)cur;
  }
}
void panel_words(void) {
  int n = ncards(); if (n <= 0) { v_error("word decisionPanel: a panel has at least one card"); return; }
  if (strip()) { build_strip(n); build_ring(n); return; }
  build_veil(); build_plate(); build_title();
  const char *cur = v_focus_cur_at("overlay.focus.cur");
  for (int i = 0; i < n; i++) build_card(i, n, strcmp(cur, v_fmt("card.%s", card_id(i))) == 0);
  build_ring(n);
}

/* the targets the props list, in their order, with the boxes the words gave them */
int panel_focus(focus_target_t *out, int cap) {
  int n = v_plen("overlay.focus.targets"), nc = ncards(); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("overlay.focus.targets.%d.id", i))); t->enabled = v_pbool(v_fmt("overlay.focus.targets.%d.enabled", i), 1); t->index = i;
    snprintf(t->group, sizeof t->group, "card");
    for (int k = 0; k < nc; k++) if (strcmp(t->id, v_fmt("card.%s", card_id(k))) == 0) { int r[4]; card_rect(k, nc, r); t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; }
  }
  return n;
}
/* a key while the panel is open: ✓ and ← and the room keys say an intent for the focused card (screen "panel"); ◀ ▶ move to the previous and next card and stop at the ends (a dimmed card can be focused); ▲ ▼ do nothing */
void panel_key(int code) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur_at("overlay.focus.cur"));
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", c, verb); return; }
  int step = code == 20 ? -1 : code == 19 ? 1 : 0; if (!step) return;
  focus_target_t t[MAXCARDS + 1]; int n = panel_focus(t, MAXCARDS + 1), at = -1;
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0) at = i;
  int to = at + step; if (at < 0 || to < 0 || to >= n) return;
  v_focus_set(t[to].id); screens_redraw(); screens_say("focus", t[to].id, NULL);
}
