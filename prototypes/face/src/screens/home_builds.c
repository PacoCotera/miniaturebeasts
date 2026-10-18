/* Home's compositions (lvgl-switch.md §2.2: a composition is a build of words in the screen's binding table, never a word): the module (a panel, its engraved word, its lamp), the name tag (a panel and text) and the rest knob, and the
   lamps they use. Spec: the `home` spec. A picture the host has not sent is a slot not yet filled: nothing is drawn. A flat plate is drawn only where the spec itself names the colours (the lamps, the knob, the name tag). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../layout/layout.h"
#include <stdio.h>
#include <string.h>

#define H "home"
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(H, p, o, 24); return o; }
/* the same, in the spec of the screen a composition is drawn for (the name tag and the bay strip serve Home and the Vivarium's whole) */
static int si(const char *sp, const char *p, int d) { return spec_int(sp, p, d); }
static int sk(const char *sp, const char *base, int k) { return spec_int(sp, v_fmt("%s.%d", base, k), 0); }
static const char *scol(const char *sp, const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(sp, p, o, 24); return o; }

/* a lamp: the signed 12 × 12 picture of the state (off, well, waiting, needsYou), the ids are one table, frame.json regions.marks.lamp12; one node whichever state it is. A picture the host has not sent leaves a node of no size. */
const char *home_lamp_pic(const char *state) {
  static char b[4][96]; static int k; char *o = b[k++ & 3]; spec_str("frame", v_fmt("regions.marks.lamp12.%s", *state ? state : "off"), o, 96); return o;
}
static void lamp(const char *id, int x, int y, const char *state) {
  const char *pic = home_lamp_pic(state);
  if (*pic) v_sprite(id, pic, x, y, 12, 12); else v_sprite_hidden(id, home_lamp_pic("off"), x, y);
}

/* a waiting lamp on a resident or a sleeper: home-lamp-sky-12x12, steady; not shown, the same node with no size, so the order of the glass never changes kind */
void build_waitingLamp(const char *id, int x, int y, int shown) {
  if (shown) { lamp(id, x, y, "waiting"); return; }
  v_sprite_hidden(id, home_lamp_pic("waiting"), x, y);
}

/* the module of the screen whose spec is `sp`: its device plate (fix 2: a painted picture placed 1:1, no fill, edge or bevel row), its engraved word at the spec's offset and its lamp (a module whose spec says `"lamp": null` has none, and no lamp node); the objects are the screen's. `dy` is the
   focused module's lift (negative). Draws region `key`. Home's and one mibi up close's modules are this one build. */
void build_module(const char *sp, const char *key, int dy, const char *lampState) {
  int r[4], word[2], lampAt[2] = { 0, 0 }; char p[64]; snprintf(p, sizeof p, "regions.%s.rect", key); if (!v_spec_rect(sp, p, r)) r[0] = r[1] = r[2] = r[3] = 0;
  word[0] = sk(sp, v_fmt("regions.%s.word", key), 0); word[1] = sk(sp, v_fmt("regions.%s.word", key), 1);
  const char *lraw = spec_raw(sp, v_fmt("regions.%s.lamp", key), NULL); int hasLamp = lraw && lraw[0] == '[';
  if (hasLamp) { lampAt[0] = sk(sp, v_fmt("regions.%s.lamp", key), 0); lampAt[1] = sk(sp, v_fmt("regions.%s.lamp", key), 1); }
  int x = r[0], y = r[1] + dy;
  { const char *plate = v_pstr(v_fmt("regions.%s.plate", key)); v_region(v_fmt("%s.plate", key), LAYER_PAINTED); if (*plate) v_sprite(v_fmt("%s", key), plate, x, y, r[2], r[3]); }   /* its own region "<module>.plate", so the module's objects keep theirs */   /* the module is its device plate (fix 2 F1), the region's first node, lifting with it; no picture, no plate: no fill falls back (F6) */
  if (hasLamp) { v_name(v_fmt("%s.lamp", key)); lamp(v_fmt("%s.lamp", key), x + lampAt[0], y + lampAt[1], lampState); }   /* the lamp logs as its own region, with the module's lift */
  char w[40]; spec_str(sp, v_fmt("strings.modules.%s", key), w, sizeof w);
  v_region(key, LAYER_TYPE); v_text(v_fmt("%s.word", key), w, x + word[0], y + word[1] + 5, v_measure(w, 16), 16, scol(sp, "colours.module.word"));   /* a 24 px zone: the cap top 5 below its top */
}

int g_tagSlot;   /* the name tag is a slot (the meet ribbon stands in its place): the same nodes at the tag's place with no size */
int g_tagFlash;
int g_tagOver;   /* the name tag goes over the box whatever the window's bottom (a resident asleep in place: over its ink box, UI/UX Station M1 item 4) */   /* the name tag takes the frame's flash (the namer saved a name): the frame's `flash` fill and `flashInk` ink while set */
/* the name tag, for the screen whose spec is `sp` and whose window (Home's glass, the whole's window) is the region `glass`: a panel and the name, h tall (regions.nameTag); its width the name's plus twice the pad rounded up to the 8 px grid, 48 at least,
   the widest the spec's max; centred on the box, 12 px under the ring (top at feet + 24), over the box (top = box.y − lift − 8 − h) when its bottom would pass 8 px above the window's bottom, slid to stay 8 px inside the window. `lift`: the box is the resident's
   as drawn (a sleeper does not lift). Returns the tag's rect in out. */
void build_nameTag(const char *sp, const char *glass, const char *name, const int box[4], int lift, int out[4]) {
  int h = si(sp, "regions.nameTag.h", 24), pad = si(sp, "regions.nameTag.pad", 8), px = si(sp, "regions.nameTag.px", 16), round = si(sp, "regions.nameTag.round", 8), mn = si(sp, "regions.nameTag.min", 48), mx = si(sp, "regions.nameTag.max", 1 << 20);
  int tw = v_measure(name, px), w = tw + 2 * pad; w = (w + round - 1) / round * round; if (w < mn) w = mn; if (w > mx) w = mx;
  int gx = sk(sp, v_fmt("%s.rect", glass), 0), gy = sk(sp, v_fmt("%s.rect", glass), 1), gw = sk(sp, v_fmt("%s.rect", glass), 2), gh = sk(sp, v_fmt("%s.rect", glass), 3);
  int x = box[0] + v_half(box[2] - w), feet = box[1] + box[3], y = feet + 24;
  if (y + h > gy + gh - 8 || g_tagOver) y = box[1] - lift - 8 - h;   /* the window's bottom less 8: below it the tag goes over the box; a resident asleep in place: always over its ink (UI/UX, M1) */
  if (x < gx + 8) x = gx + 8; if (x + w > gx + gw - 8) x = gx + gw - 8 - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  const char *ink = g_tagFlash ? scol("frame", "colours.flashInk") : scol(sp, "colours.nameTag.text");
  if (g_tagSlot) { v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, 0, 0, scol(sp, "colours.nameTag.fill"), NULL); }
  else { v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, w, h, g_tagFlash ? scol("frame", "colours.flash") : scol(sp, "colours.nameTag.fill"), scol(sp, "colours.nameTag.edge")); }
  /* the name's cap top: 5 px under the tag's top (the 24 px tag), or from the spec's line top (regions.nameTag.lineTop in the tag's rectangle: one mibi up close's 32 px tag at 20 px) on the type's line pitch (20 at 16, 28 at 20, 36 at 28) */
  int ty = y + 5; if (spec_int(sp, "regions.nameTag.lineTop", 0) > 0) { int pitch = px == 16 ? 20 : px == 20 ? 28 : 36; ty = y + (spec_int(sp, "regions.nameTag.lineTop", 0) - sk(sp, "regions.nameTag.rect", 1)) + v_fdiv(pitch - v_cap(px), 2); }
  v_region("nameTag", LAYER_TYPE); v_text("nameTag.text", g_tagSlot ? "" : name, x + v_half(w - tw), ty, g_tagSlot ? 0 : tw, px, ink);
}

/* the rest knob on the bezel's bottom rail: 32 x 6, at rest at y 546, lifted to 544 while focused; settling from the lift while the `rest` event plays. A flat plate in the knob's three roles. */
void build_restKnob(int focused) {
  int r[4]; hrect("regions.knob.rect", r); int drawn_w = hk("regions.knob.drawn", 0), drawn_h = hk("regions.knob.drawn", 1);
  int y = hk("regions.knob.states.focused.rect", 1) ? hk("regions.knob.states.focused.rect", 1) : r[1];
  int rest_y = hk("regions.knob.states.rest.rect", 1);
  anim_state_t t; int lifted = focused && !anim_holding();   /* a rest holding: the knob stays settled */
  if (anim_get(ANIM_REST, "knob", &t)) { lifted = 0; y = t.elapsed < 100 ? y : t.elapsed < 200 ? y + 1 : rest_y; }   /* the knob settles from its lift in the first 200 ms */
  else y = lifted ? y : rest_y;
  v_region("knob", LAYER_CHROME);
  v_rect("knob.light", r[0], y, drawn_w, 1, colr("colours.knob.light")); v_rect("knob.body", r[0], y + 1, drawn_w, drawn_h - 2, colr("colours.knob.fill")); v_rect("knob.shade", r[0], y + drawn_h - 1, drawn_w, 1, colr("colours.knob.shade"));
}


/* The bay strip (vivarium.json regions.strip and tiles; the composition `bayStrip`, rule `listPitch`): the strip's panel and a tile a bay, the housed mibis in bay order then the free bays, the tiles by the rule's form for the count. Every tile is the same
   four nodes whichever it is, so a mibi going out or a bay filling never changes the order of the screen's nodes: a panel rect (none for a free bay), the thumbnail (a housed mibi's 48 x 48), the outline glyph (a mibi out with the Companion, centred where the
   thumbnail stands) and the dash outline (a free bay: 1 px `hairline`, 2 on 2 off, a composed picture with no ops while the bay is not free). A hidden node is the glyph's picture with a window of no size. `focus` is the tile the ring is on, lifted by the spec's
   tile lift. Writes the focused tile's box to box. */
void build_bayStrip(const char *sp, const char *cur, int box[4]) {
  int r[4], n = v_plen("regions.tiles.items"); if (!v_spec_rect(sp, "regions.strip.rect", r)) r[0] = r[1] = r[2] = r[3] = 0; if (box) box[0] = box[1] = box[2] = box[3] = 0;
  int any = 0; for (int i = 0; i < n; i++) { const char *st = v_pstr(v_fmt("regions.tiles.items.%d.state", i)); if (strcmp(st, "housed") == 0 || strcmp(st, "out") == 0) any = 1; }
  v_region("strip", LAYER_PAINTED); { const char *pl = v_pstr("regions.strip.plate"); if (any && *pl) v_sprite("strip", pl, r[0], r[1], r[2], r[3]); else v_sprite_hidden("strip", v_pstr("regions.tiles.glyph"), r[0], r[1]); }   /* fix 2 F1/F5: the strip's plate, 1:1; no housed or out tile: no plate (Every state composed, rule 2: no bare panel) */
  char fk[48]; if (n > 12 || layout_list_form(sp, "regions.tiles", n, fk, sizeof fk) < 0) { v_error("word: the bay strip holds twelve bays at most, and its forms must hold this many"); return; }
  int tx = sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 0), ty = sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 1), tw = sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 2), th = sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 3);
  int gw = sk(sp, "regions.tiles.tile.outGlyph", 0), gh = sk(sp, "regions.tiles.tile.outGlyph", 1), lift = si(sp, "focus.targets.tile.lift", 2);
  char glyph[96]; snprintf(glyph, sizeof glyph, "%s", v_pstr("regions.tiles.glyph"));   /* a copy: v_pstr's ring of 32 is spent by eight tiles */
  for (int i = 0; i < n; i++) {
    char P[64]; snprintf(P, sizeof P, "regions.tiles.items.%d", i);
    const char *id = v_pstr(v_fmt("%s.id", P)), *state = v_pstr(v_fmt("%s.state", P)), *pic = v_pstr(v_fmt("%s.picture", P));
    int housed = strcmp(state, "housed") == 0, out = strcmp(state, "out") == 0, free_ = !housed && !out;
    int b[4]; layout_list_pitch(sp, "regions.tiles", n, i, b);
    int focused = strncmp(cur, "tile.", 5) == 0 && *id && strcmp(cur + 5, id) == 0, x = b[0], y = b[1] - (focused ? lift : 0), w = b[2], h = b[3];
    if (focused && box) { box[0] = x; box[1] = y; box[2] = w; box[3] = h; }
    char nm[40], reg[24]; snprintf(reg, sizeof reg, "tile.%d", i); v_region(reg, LAYER_PAINTED);   /* a region a tile: the log holds each tile's box; the well is painted (fix 2) */
    snprintf(nm, sizeof nm, "tile.%d", i); { const char *wl = v_pstr(v_fmt("%s.well", P)); if (!free_ && *wl) v_sprite(nm, wl, x, y, w, h); else v_sprite_hidden(nm, glyph, x, y); }
    v_region(reg, LAYER_CHROME);   /* fix 2 F4: the tile is its well, by form (the mibi up close: the -shown well); a free bay draws nothing */
    v_name(reg); snprintf(nm, sizeof nm, "tile.%d.thumb", i);
    if (housed && *pic) v_sprite(nm, pic, x + tx, y + ty, tw, th); else v_sprite_hidden(nm, glyph, x + tx, y + ty);
    snprintf(nm, sizeof nm, "tile.%d.glyph", i);
    if (out) v_sprite(nm, glyph, x + tx + (tw - gw) / 2, y + ty + (th - gh) / 2, gw, gh); else v_sprite_hidden(nm, glyph, x + tx, y + ty);
    snprintf(nm, sizeof nm, "tile.%d.free", i);   /* a free bay draws nothing: the node keeps its box with no ops (fix 6, N7) */
    snprintf(prim_ops(), (size_t)prim_ops_size(), "[]"); prim_node(v_id(nm), FN_COMPOSED, x, y, w, h, 0, 0, 0);
  }
}
