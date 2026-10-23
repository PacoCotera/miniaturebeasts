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
#include "../anim/anim.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define F "frame"
#define RP "regions.panel"
#define MAXCARDS 3
/* a colour: a frame role (colours.<name>) when there is one, else the palette name as written */
static const char *col(const char *name) { static char b[8][24]; static int k; char *o = b[k++ & 7]; if (spec_str(F, v_fmt("colours.%s", name), o, 24) <= 0) snprintf(o, 24, "%s", name); return o; }
static const char *rcol(const char *path) { char s[24]; if (spec_str(F, v_fmt(RP ".%s", path), s, sizeof s) <= 0) snprintf(s, sizeof s, "bone"); return col(s); }
/* the strip form (frame.json regions.panel.strip; specs/station-dock-arrival-spec.md, the strip form): the dock arrival's choice, two cards in a plate under what they are about, no title, picture or veil */
static int strip(void) { return strcmp(v_pstr("overlay.form"), "strip") == 0; }
/* the Incubate | Keep shaping form (T-20261016-222; build spec section 6a; panel.json `incubate`): two bezels over the device ground, each with a header (the verb; Incubate's price and the founder's pod) and a window: the sealed capsule with this founder's pod, and Create as it stood when it was left (the face's snapshot) */
static int incubate_form(void) { return strcmp(v_pstr("overlay.form"), "incubate") == 0; }
static int hatchnow_form(void) { return strcmp(v_pstr("overlay.form"), "hatchnow") == 0; }   /* the Hatch now | Wait form: the same frame (bezels, windows, header, focus) as the Incubate form, with the Incubator's day looks in the windows */
#define PN "panel"
static const char *pcol(const char *p) { char s[24]; static char b[8][24]; static int k; char *o = b[k++ & 7]; if (spec_str(PN, v_fmt("incubate.%s", p), s, sizeof s) <= 0) snprintf(s, sizeof s, "bone"); snprintf(o, 24, "%s", col(s)); return o; }
static int ncards(void) { int n = v_plen("overlay.regions.cards"); return n < 0 ? 0 : n > MAXCARDS ? MAXCARDS : n; }
static void card_rect(int i, int n, int r[4]) {
  if (incubate_form() || hatchnow_form()) { v_srect(PN, v_fmt("incubate.%s", i == 0 ? "bezels.incubate" : "bezels.keep"), r); (void)n; return; }
  if (strip()) { int gap = v_si(F, RP ".strip.cards.gap", 16), w = v_si(F, RP ".strip.cards.w", 396); r[0] = v_si(F, RP ".strip.cards.x", 108) + i * (w + gap); r[1] = v_si(F, RP ".strip.cards.y", 392); r[2] = w; r[3] = v_si(F, RP ".strip.cards.h", 128); (void)n; return; }
  int gap = v_si(F, RP ".cards.gap", 16), total = v_si(F, RP ".cards.width", 776), w = (total - gap * (n - 1)) / n;
  r[0] = v_si(F, RP ".cards.x", 124) + i * (w + gap); r[1] = v_si(F, RP ".cards.y", 152); r[2] = w; r[3] = v_si(F, RP ".cards.h", 288);
}
static const char *card_id(int i) { return v_pstr(v_fmt("overlay.regions.cards.%d.id", i)); }
static int cap_top(int px, int y, int pitch) { return y + v_fdiv(pitch - v_cap(px), 2); }

/* the veil: the stage under the panel, 8 of 16 Bayer levels toward stageGround, one composed picture (a cut) */
static void build_veil(void) {
  static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
  int r[4]; v_srect(F, RP ".veil.rect", r); int level = v_si(F, RP ".veil.levels", 8); if (r[2] <= 0) return;
  v_region("veil", LAYER_CHROME);
  if (v_sprite("panel.veil", v_pstr("overlay.regions.art.veil"), r[0], r[1], r[2], r[3])) return;   /* the veil master: a flat layer, never dithered */
  char ops[400]; int n = snprintf(ops, sizeof ops, "[[\"lattice\",0,0,%d,%d,4,[", r[2], r[3]);   /* until it is placed: a Bayer lattice of 8 of 16 levels toward stageGround */
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, sizeof ops - (size_t)n, "],\"%s\"]]", col("stageGround"));
  v_composed("panel.veil", r[0], r[1], r[2], r[3], ops);
}
static void build_plate(void) {
  int r[4]; v_srect(F, RP ".rect", r);
  v_region("panel", LAYER_CHROME);
  if (v_sprite("panel.plate", v_pstr("overlay.regions.art.housing"), r[0], r[1], r[2], r[3])) return;   /* the housing master, 1:1 */
  char fill[24], edge[24]; snprintf(fill, sizeof fill, "%s", rcol("ground")); snprintf(edge, sizeof edge, "%s", rcol("edge"));
  word_panel("panel.plate", r[0], r[1], r[2], r[3], fill, edge);
}
static void build_title(void) {
  int r[4]; v_srect(F, RP ".title.rect", r); const char *t = v_pstr("overlay.regions.title"); int px = v_si(F, RP ".title.px", 28), w = v_measure(t, px);
  v_region("panelTitle", LAYER_TYPE); v_text("panel.title", t, r[0] + v_half(r[2] - w), cap_top(px, v_si(F, RP ".title.lineTop", r[1]), 36), w, px, rcol("title.colour"));
}
static const char *GLYPH[4] = { "\xe2\x9a\xa1", "\xe2\x9d\x80", "\xe2\x97\x86", "\xe2\xa7\x97" };   /* ⚡ ❀ ◆ ⧗, the price's closed table (vocab.c PRICE) */
/* the cost groups on rubber chips: each "glyph figure" of the price string on a chip nine-sliced round it (6 px in, 8 between groups); a short figure in `need`, a gain in `turn` */
static void build_costs(int i, int x, int y, const char *cost, const char *shorts, int gain) {
  const char *chip = v_pstr("overlay.regions.art.chip"); int pad = v_si(F, RP ".art.chip.pad", 6), between = v_si(F, RP ".art.chip.between", 8), ch = v_si(F, RP ".art.chip.h", 20), px = v_si(F, RP ".card.costs.px", 16), k = 0;
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
  int dim = v_pbool(v_fmt("overlay.regions.cards.%d.dim", i), 0), loss = v_pbool(v_fmt("overlay.regions.cards.%d.loss", i), 0), w = r[2], tw = w - 32, pw = w - 32, slotX = r[0] + v_sk(F, RP ".card.picture.at", 0);
  const char *base = v_fmt("overlay.regions.cards.%d.art", i);
  /* the well: the master (the focused one a step up; the ring is over it), else the code-drawn well */
  { const char *id = v_pstr(v_fmt("%s.%s", base, focused ? "focused" : "well")); v_region("cards", LAYER_PAINTED);
    if (!v_sprite(v_fmt("card.%d.well", i), id, r[0], r[1], w, r[3])) { char well[24], edge[24]; snprintf(well, sizeof well, "%s", rcol("cards.well")); snprintf(edge, sizeof edge, "%s", rcol("cards.edge")); v_region("cards", LAYER_CHROME); word_panel(v_fmt("card.%d.well", i), r[0], r[1], w, r[3], well, edge); } }
  /* the glow and the stage: under the picture (the stage at the slot's foot) */
  v_region("cardStage", LAYER_PAINTED);
  const char *scene = v_pstr(v_fmt("%s.scene", base)); int shift = *scene ? v_si(F, RP ".art.scene.shift", 0) : 0;   /* the Return outcome: its place's scene stands in the glow's place and the subject stands right of centre, facing the light */
  v_sprite(v_fmt("card.%d.glow", i), v_pstr(v_fmt("%s.glow", base)), slotX, r[1] + v_sk(F, RP ".art.glow.at", 1), pw, 160);
  if (*scene) v_sprite(v_fmt("card.%d.scene", i), scene, slotX, r[1] + v_sk(F, RP ".art.scene.at", 1), pw, 152);
  v_sprite(v_fmt("card.%d.stage", i), v_pstr(v_fmt("%s.stage", base)), slotX, r[1] + v_sk(F, RP ".art.stage.at", 1), pw, 48);
  /* the picture, 1:1, centred, its feet line (its lowest row of alpha >= 128) on y + 168; its contact shadow across the feet's span plus 16 under it */
  { const char *pic = v_pstr(v_fmt("overlay.regions.cards.%d.picture", i)); int pwid = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.0", i), 0), ph = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.1", i), 0), hd = *pic ? wire_asset_slot(pic) : -1;
    int feet[3] = { ph - 1, 0, pwid - 1 }; if (hd >= 0 && prim_asset_feet(hd, v_si(F, RP ".art.feet.alpha", 128), v_si(F, RP ".art.feet.rows", 4), feet) < 0) { feet[0] = ph - 1; feet[1] = 0; feet[2] = pwid - 1; }
    int px0 = slotX + v_half(pw - pwid) + shift, py0 = r[1] + v_si(F, RP ".art.feet.line", 168) - feet[0];
    { const char *sh = v_pstr("overlay.regions.art.shadow"); int span = feet[2] - feet[1] + 1 + v_si(F, RP ".art.shadow.stretch", 16), ends = v_si(F, RP ".art.shadow.ends", 32), sh_h = v_si(F, RP ".art.shadow.h", 16); if (span < 2 * ends) span = 2 * ends;
      const int caps[4] = { ends, 0, ends, 0 }; v_region("cardStage", LAYER_PAINTED); if (hd >= 0) v_nine(v_fmt("card.%d.shadow", i), sh, px0 + (feet[1] + feet[2] + 1) / 2 - span / 2, r[1] + v_si(F, RP ".art.feet.line", 168) - sh_h / 2, span, sh_h, caps); }
    v_name("cardPictures"); v_slot_at(v_fmt("card.%d.picture", i), pic, NULL, px0, py0, pwid, ph, pwid > 0 && ph > 0, r[0], r[1]); }
  /* the light: over the picture, the pool lighting the subject from below */
  v_region("cardStage", LAYER_PAINTED); v_sprite(v_fmt("card.%d.light", i), v_pstr(v_fmt("%s.light", base)), slotX, r[1] + v_sk(F, RP ".art.light.at", 1), pw, 160);
  /* the destination mark: the title bar's mark of the room it lands in, over the picture's top right; staying here: none */
  { const char *mk = v_pstr(v_fmt("overlay.regions.cards.%d.mark", i)); int ms = v_sk(F, RP ".card.mark.size", 0); if (ms <= 0) ms = 24;
    v_name("cardMarks"); v_slot_at(v_fmt("card.%d.mark", i), mk, NULL, r[0] + w - 40, r[1] + v_sk(F, RP ".card.mark.at", 1), ms, ms, 1, r[0] + w - 40, r[1] + 16); }
  /* the name: 20, the option's verb */
  { const char *s = v_pstr(v_fmt("overlay.regions.cards.%d.name", i)); int px = v_si(F, RP ".card.name.px", 20), sw = v_measure(s, px);
    v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.name", i), s, r[0] + v_sk(F, RP ".card.name.at", 0), cap_top(px, r[1] + v_sk(F, RP ".card.name.at", 1), 28), sw, px, rcol(dim ? "card.name.colourDim" : "card.name.colour")); }
  /* the costs, on their chips; free: nothing drawn */
  build_costs(i, r[0] + v_sk(F, RP ".card.costs.at", 0), r[1] + v_sk(F, RP ".card.costs.at", 1), v_pstr(v_fmt("overlay.regions.cards.%d.cost", i)), v_pstr(v_fmt("overlay.regions.cards.%d.short", i)), v_pbool(v_fmt("overlay.regions.cards.%d.gain", i), 0));
  /* the line: the one thing the picture cannot say, 16; a loss shows it in `need` */
  { const char *s = v_pstr(v_fmt("overlay.regions.cards.%d.line", i)); int px = v_si(F, RP ".card.line.px", 16), sw = v_measure(s, px); (void)tw;
    v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.line", i), s, r[0] + v_sk(F, RP ".card.line.at", 0), cap_top(px, r[1] + v_sk(F, RP ".card.line.at", 1), 20), *s ? sw : 0, px, rcol(dim ? "card.line.colourDim" : loss ? "card.line.colourLoss" : "card.line.colour")); }
}
/* the ring: the focused card's rect, the frame ring { rect: 10 } 4 px out (the ring reaches 5 from the rect it is given, so the rect is drawn 1 px in); no lift */
static void build_ring(int n) {
  const char *c = v_focus_cur_at("overlay.focus.cur"); if (!*c) return;
  for (int i = 0; i < n; i++) if (strcmp(c, v_fmt("card.%s", card_id(i))) == 0) {
    int r[4], box[4]; card_rect(i, n, r); int in = incubate_form() || hatchnow_form() ? 0 : spec_int(F, "focus.ring.reach", 5) - v_si(F, RP ".ring.out", 4); if (in < 0) in = 0;
    box[0] = r[0] + in; box[1] = r[1] + in; box[2] = r[2] - 2 * in; box[3] = r[3] - 2 * in;
    v_region("focus", LAYER_CHROME); word_focusRing("focus", "panel", "focus.targets.card", box); return;
  }
}
/* the strip: the plate (the code-drawn ground and edge while no master is placed), then each card: its well, its 96 × 96 picture, the name, the costs and the one line */
static void build_strip(int n) {
  int r[4]; v_srect(F, RP ".strip.rect", r); char fill[24], edge[24]; snprintf(fill, sizeof fill, "%s", rcol("ground")); snprintf(edge, sizeof edge, "%s", rcol("edge"));
  v_region("panel", LAYER_CHROME); word_panel("panel.plate", r[0], r[1], r[2], r[3], fill, edge);
  const char *cur = v_focus_cur_at("overlay.focus.cur");
  for (int i = 0; i < n; i++) {
    int c[4]; card_rect(i, n, c); int dim = v_pbool(v_fmt("overlay.regions.cards.%d.dim", i), 0), tx = c[0] + v_sk(F, RP ".strip.name.at", 0), maxw = v_si(F, RP ".strip.line.max", 252);
    char well[24], wedge[24]; snprintf(well, sizeof well, "%s", rcol("cards.well")); snprintf(wedge, sizeof wedge, "%s", rcol("cards.edge"));
    v_region("cards", LAYER_CHROME); word_panel(v_fmt("card.%d.well", i), c[0], c[1], c[2], c[3], well, wedge);
    { const char *pic = v_pstr(v_fmt("overlay.regions.cards.%d.picture", i)); int pw = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.0", i), 0), ph = v_pint(v_fmt("overlay.regions.cards.%d.pictureSize.1", i), 0);
      v_name("cardPictures"); v_slot_at(v_fmt("card.%d.picture", i), pic, NULL, c[0] + v_sk(F, RP ".strip.picture.at", 0), c[1] + v_sk(F, RP ".strip.picture.at", 1), pw, ph, pw > 0 && ph > 0, c[0], c[1]); }
    { const char *t = v_pstr(v_fmt("overlay.regions.cards.%d.name", i)); int px = v_si(F, RP ".strip.name.px", 20); char fit[V_STR]; v_clip(t, maxw, px, fit, sizeof fit);
      v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.name", i), fit, tx, cap_top(px, c[1] + v_sk(F, RP ".strip.name.at", 1), v_si(F, RP ".strip.name.h", 28)), v_measure(fit, px), px, rcol(dim ? "strip.name.colourDim" : "strip.name.colour")); }
    { const char *t = v_pstr(v_fmt("overlay.regions.cards.%d.line", i)); int px = v_si(F, RP ".strip.line.px", 16); char fit[V_STR]; v_clip(t, maxw, px, fit, sizeof fit);
      v_region("cardText", LAYER_TYPE); v_text(v_fmt("card.%d.line", i), fit, tx, cap_top(px, c[1] + v_sk(F, RP ".strip.line.at", 1), v_si(F, RP ".strip.line.h", 20)), *fit ? v_measure(fit, px) : 0, px, rcol(dim ? "strip.line.colourDim" : "strip.line.colour")); }
    (void)cur;
  }
}

/* ---- the Incubate | Keep shaping form ---- */
/* a bezel: fill `panel`, radius 10, a 1 px `hairline` edge, the bevel (a 1 px `fog` line at y + 1 from x + 10 to x + w - 10) */
static void build_bezel(int i, const int r[4], const char *verb) {
  int rad = v_si(PN, "incubate.bezels.radius", 10); char ops[320];
  snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"],[\"h\",%d,%d,%d,\"%s\"]]", r[2], r[3], rad, pcol("bezels.fill"), pcol("bezels.edge"), v_si(PN, "incubate.bezels.bevel.inset", 10), v_si(PN, "incubate.bezels.bevel.dy", 1), r[2] - 2 * v_si(PN, "incubate.bezels.bevel.inset", 10), pcol("bezels.bevel.colour"));
  v_region(v_fmt("panelBezel.%d", i), LAYER_CHROME); v_composed(v_fmt("panel.bezel.%d", i), r[0], r[1], r[2], r[3], ops);
  /* the header: the verb, Inter 16 (the spec says 15 medium; the face has 16, 20 and 28), its baseline at y + 20, from x + 12 */
  int px = v_si(PN, "incubate.header.px", 16), base = v_si(PN, "incubate.header.baseline", 20); v_region("panelHeader", LAYER_TYPE);
  v_text(v_fmt("panel.verb.%d", i), verb, r[0] + v_si(PN, "incubate.header.x", 12), r[1] + base - v_cap(px), v_measure(verb, px), px, pcol("header.colour"));
}
/* Incubate's price, right-aligned to x + w - 12: the figures (icon before figure), then the founder's pod (16 x 20, its top at y + 5), which is part of the price: it becomes the mibi */
static void build_price(const int r[4]) {
  const char *cost = v_pstr("overlay.regions.price"), *pod = v_pstr("overlay.regions.pod"); int right = r[0] + r[2] - v_si(PN, "incubate.price.right", 12), pw = v_sk(PN, "incubate.price.pod.size", 0), ph = v_sk(PN, "incubate.price.pod.size", 1), px = v_si(PN, "incubate.header.px", 16), base = v_si(PN, "incubate.header.baseline", 20);
  if (!*pod) pw = 0;   /* Hatch now's price has no pod behind it */
  v_region("panelPrice", LAYER_PAINTED); if (*pod && pw > 0) v_sprite("panel.price.pod", pod, right - pw, r[1] + v_si(PN, "incubate.price.pod.top", 5), pw, ph);
  int endx = *pod ? right - pw - v_si(PN, "incubate.price.gap", 12) : right;
  if (*cost) { v_region("panelPrice", LAYER_TYPE); v_run("panel.price", cost, endx, r[1] + base - v_cap(px), px, pcol("price.colour"), V_ALIGN_RIGHT); }
}
/* a window's frame over its picture: the corners outside the radius 6 in the bezel's colour, then a 1 px `void` inner edge on the radius */
static void build_window_frame(int i, const int w[4]) {
  int rad = v_si(PN, "incubate.windows.radius", 6); char ops[300];
  snprintf(ops, sizeof ops, "[[\"rcorners\",0,0,%d,%d,%d,\"%s\"],[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]]", w[2], w[3], rad, pcol("bezels.fill"), w[2], w[3], rad, pcol("windows.edge"));
  v_region(v_fmt("panelWindow.%d", i), LAYER_CHROME); v_composed(v_fmt("panel.window.%d", i), w[0], w[1], w[2], w[3], ops);
}
static void build_incubate_left(const int w[4]) {
  const char *room = v_pstr("overlay.regions.left.room"), *interior = v_pstr("overlay.regions.left.interior"), *pod = v_pstr("overlay.regions.left.pod"), *glass = v_pstr("overlay.regions.left.glass"), *shell = v_pstr("overlay.regions.left.shell"), *seal = v_pstr("overlay.regions.left.seal");
  int iw = v_pint("overlay.regions.left.layerSize.0", 0), ih = v_pint("overlay.regions.left.layerSize.1", 0), ax = v_sk(PN, "incubate.left.layers", 0), ay = v_sk(PN, "incubate.left.layers", 1);
  v_region("panelRoom", LAYER_PAINTED); if (*room) v_sprite("panel.left.room", room, w[0], w[1], w[2], w[3]);
  if (*interior && iw > 0) v_sprite("panel.left.interior", interior, ax, ay, iw, ih);
  { int pw = v_pint("overlay.regions.left.podSize.0", 0), ph = v_pint("overlay.regions.left.podSize.1", 0), anx = v_pint("overlay.regions.left.podAnchor.0", 0), any = v_pint("overlay.regions.left.podAnchor.1", 0);
    if (*pod && pw > 0) v_sprite("panel.left.pod", pod, v_sk(PN, "incubate.left.foot", 0) - anx, v_sk(PN, "incubate.left.foot", 1) - any, pw, ph); }
  if (*glass && iw > 0) v_sprite("panel.left.glass", glass, ax, ay, iw, ih);
  if (*shell && iw > 0) v_sprite("panel.left.shell", shell, ax, ay, iw, ih);
  if (*seal && iw > 0) v_sprite("panel.left.seal", seal, ax, ay, iw, ih);
}
/* the right window: Create as it stood when it was left, the face's own snapshot of it (prim_snapshot), 1:1 */
static void build_incubate_right(const int w[4]) {
  int h = prim_snapshot_handle(); v_region("panelSnapshot", LAYER_PAINTED);
  if (h >= 0) { prim_tag(LAYER_PAINTED, "panelSnapshot"); prim_node(v_id("panel.right.snapshot"), FN_SPRITE, w[0], w[1], w[2], w[3], 0, h, 0); }
}
/* ---- the Hatch now | Wait form (panel.json `hatchnow`) ---- */
/* the bar's window of its layer: lit from the left, `px` wide from litFrom; the whole bar with its glow at the full width */
static void hn_bar(const char *id, const char *a, int ox, int oy, int px) {
  if (px <= 0 || !*a) return;
  int max = v_si(PN, "hatchnow.bar.max", 137), x = v_sk(PN, "hatchnow.bar.litFrom", 0), y = v_sk(PN, "hatchnow.bar.litFrom", 1), w = px, h = v_si(PN, "hatchnow.bar.h", 29);
  if (px >= max) { x = v_sk(PN, "hatchnow.bar.full", 0); y = v_sk(PN, "hatchnow.bar.full", 1); w = v_sk(PN, "hatchnow.bar.full", 2); h = v_sk(PN, "hatchnow.bar.full", 3); }
  v_sprite_window(id, a, x, y, ox + x, oy + y, w, h);
}
/* the hatched look: the room, the interior, the opened pod, the juvenile it becomes, the shell, the open door clipped by the window, the bar full */
static void build_hatched(const int w[4]) {
  const char *P = "overlay.regions.left."; int lw = v_pint(v_fmt("%slayerSize.0", P), 0), ax = v_sk(PN, "hatchnow.left.layers", 0), ay = v_sk(PN, "hatchnow.left.layers", 1);
  v_region("panelHatched", LAYER_PAINTED);
  { const char *a = v_pstr(v_fmt("%sroom", P)); if (*a) v_sprite("panel.hatched.room", a, w[0], w[1], w[2], w[3]); }
  { const char *a = v_pstr(v_fmt("%sinterior", P)); if (*a && lw > 0) v_sprite("panel.hatched.interior", a, ax, ay, lw, v_pint(v_fmt("%slayerSize.1", P), 0)); }
  { const char *a = v_pstr(v_fmt("%sopened", P)); int pw = v_pint(v_fmt("%sopenedSize.0", P), 0), ph = v_pint(v_fmt("%sopenedSize.1", P), 0);
    if (*a && pw > 0) v_sprite("panel.hatched.opened", a, v_sk(PN, "hatchnow.left.foot", 0) - v_pint(v_fmt("%sopenedAnchor.0", P), 0), v_sk(PN, "hatchnow.left.foot", 1) - v_pint(v_fmt("%sopenedAnchor.1", P), 0), pw, ph); }
  { const char *a = v_pstr(v_fmt("%sjuvenile", P)); int pw = v_pint(v_fmt("%sjuvenileSize.0", P), 0), ph = v_pint(v_fmt("%sjuvenileSize.1", P), 0);
    if (*a && pw > 0) v_sprite("panel.hatched.juvenile", a, v_sk(PN, "hatchnow.left.juvenile.foot", 0) - v_pint(v_fmt("%sjuvenileAnchor.0", P), 0), v_sk(PN, "hatchnow.left.juvenile.foot", 1) - v_pint(v_fmt("%sjuvenileAnchor.1", P), 0), pw, ph); }
  { const char *a = v_pstr(v_fmt("%sshell", P)); if (*a && lw > 0) v_sprite("panel.hatched.shell", a, ax, ay, lw, v_pint(v_fmt("%slayerSize.1", P), 0)); }
  { const char *a = v_pstr(v_fmt("%sdoor", P)); int clip = w[0] + w[2] - ax, r0 = v_sk(PN, "hatchnow.left.door.rows", 0), rh = v_sk(PN, "hatchnow.left.door.rows", 1);   /* the window clips the door's far edge; a window at source (0, 0) is the whole picture, so it starts at the first row with any ink */
    if (*a && clip > 0) v_sprite_window("panel.hatched.door", a, 0, r0, ax, ay + r0, clip, rh); }
  hn_bar("panel.hatched.bar", v_pstr(v_fmt("%sbar", P)), ax, ay, v_si(PN, "hatchnow.bar.max", 137));
}
/* the growing look: the room, the interior, the sealed pod, the closed glass, the shell, the bar lit to its progress; the window carries no text */
static void build_growing(const int w[4]) {
  const char *P = "overlay.regions.right."; int lw = v_pint(v_fmt("%slayerSize.0", P), 0), lh = v_pint(v_fmt("%slayerSize.1", P), 0), ax = v_sk(PN, "hatchnow.right.layers", 0), ay = v_sk(PN, "hatchnow.right.layers", 1);
  v_region("panelGrowing", LAYER_PAINTED);
  { const char *a = v_pstr(v_fmt("%sroom", P)); if (*a) v_sprite("panel.growing.room", a, w[0], w[1], w[2], w[3]); }
  { const char *a = v_pstr(v_fmt("%sinterior", P)); if (*a && lw > 0) v_sprite("panel.growing.interior", a, ax, ay, lw, lh); }
  { const char *a = v_pstr(v_fmt("%spod", P)); int pw = v_pint(v_fmt("%spodSize.0", P), 0), ph = v_pint(v_fmt("%spodSize.1", P), 0);
    if (*a && pw > 0) v_sprite("panel.growing.pod", a, v_sk(PN, "hatchnow.right.foot", 0) - v_pint(v_fmt("%spodAnchor.0", P), 0), v_sk(PN, "hatchnow.right.foot", 1) - v_pint(v_fmt("%spodAnchor.1", P), 0), pw, ph); }
  { const char *a = v_pstr(v_fmt("%sglass", P)); if (*a && lw > 0) v_sprite("panel.growing.glass", a, ax, ay, lw, lh); }
  { const char *a = v_pstr(v_fmt("%sshell", P)); if (*a && lw > 0) v_sprite("panel.growing.shell", a, ax, ay, lw, lh); }
  hn_bar("panel.growing.bar", v_pstr(v_fmt("%sbar", P)), ax, ay, v_pint("overlay.regions.barPx", 1));
}
static void build_hatchnow(void) {
  int stage[4]; if (!v_spec_rect("frame", "regions.stage.rect", stage)) return;
  v_region("panelGround", LAYER_CHROME); v_rect("panel.ground", stage[0], stage[1], stage[2], stage[3], pcol("ground"));
  int l[4], r[4], wl[4], wr[4]; card_rect(0, 2, l); card_rect(1, 2, r); v_srect(PN, "incubate.windows.left", wl); v_srect(PN, "incubate.windows.right", wr);
  build_bezel(0, l, v_pstr("overlay.regions.verbs.grow")); build_bezel(1, r, v_pstr("overlay.regions.verbs.wait"));
  build_price(l);
  { const char *t = v_pstr("overlay.regions.caption"); int px = v_si(PN, "hatchnow.caption.px", 16); static char cc[24]; char s[24];   /* Wait's readout: "ready in about N min", right-aligned in its header as Hatch now's price is in its own */
    if (*t) { spec_str(PN, "hatchnow.caption.colour", s, sizeof s); snprintf(cc, sizeof cc, "%s", col(s)); int tw = v_measure(t, px);
      v_region("panelCaption", LAYER_TYPE); v_text("panel.caption", t, r[0] + r[2] - v_si(PN, "incubate.price.right", 12) - tw, r[1] + v_si(PN, "incubate.header.baseline", 20) - v_cap(px), tw, px, cc); } }
  build_hatched(wl); build_window_frame(0, wl);
  build_growing(wr); build_window_frame(1, wr);
  { anim_state_t t; if (!anim_get(ANIM_DITHER, "stage", &t)) build_ring(2); }
}
static void build_incubate(void) {
  int stage[4]; if (!v_spec_rect("frame", "regions.stage.rect", stage)) return;
  v_region("panelGround", LAYER_CHROME); v_rect("panel.ground", stage[0], stage[1], stage[2], stage[3], pcol("ground"));
  int l[4], r[4], wl[4], wr[4]; card_rect(0, 2, l); card_rect(1, 2, r); v_srect(PN, "incubate.windows.left", wl); v_srect(PN, "incubate.windows.right", wr);
  build_bezel(0, l, v_pstr("overlay.regions.verbs.incubate")); build_bezel(1, r, v_pstr("overlay.regions.verbs.keep"));
  build_price(l);
  build_incubate_left(wl); build_window_frame(0, wl);
  build_incubate_right(wr); build_window_frame(1, wr);
  { anim_state_t t; if (!anim_get(ANIM_DITHER, "stage", &t)) build_ring(2); }   /* the ring stands once the dither in has settled: no ring while a hold drops it (rule 1) */
}
void panel_words(void) {
  int n = ncards(); if (n <= 0) { v_error("word decisionPanel: a panel has at least one card"); return; }
  if (incubate_form()) { build_incubate(); return; }
  if (hatchnow_form()) { build_hatchnow(); return; }
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
    focus_target_t *t = &out[i]; focus_fill(t, "overlay.focus.targets", i, NULL);   /* the group is the id's first part, "card" */
    for (int k = 0; k < nc; k++) if (strcmp(t->id, v_fmt("card.%s", card_id(k))) == 0) { int r[4]; card_rect(k, nc, r); focus_fill(t, "overlay.focus.targets", i, r); }
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
