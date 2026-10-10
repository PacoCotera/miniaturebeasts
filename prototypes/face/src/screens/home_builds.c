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

/* The compositions read the `home` spec, or the `vivarium` spec when the whole sets the context (builds_context(1)): there `regions.glass` is `regions.window`, and the name tag's text colour is `colours.nameTag.name`. */
static int g_win;
#define H (g_win ? "vivarium" : "home")
void builds_context(int vivarium) { g_win = vivarium; }
static const char *bp(const char *p) { return g_win && strncmp(p, "regions.glass", 13) == 0 ? v_fmt("regions.window%s", p + 13) : p; }
static int hi(const char *p, int d) { return spec_int(H, bp(p), d); }
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", bp(base), k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, bp(p), r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(H, p, o, 24); return o; }

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

/* the module: a panel (fill, bevel top, hairline edge), its engraved word at the spec's offset and its lamp; the objects are the screen's. `dy` is the focused module's lift (negative). Draws region `key`. */
void build_module(const char *key, int dy, const char *lampState) {
  int r[4], word[2], lampAt[2]; char p[64]; snprintf(p, sizeof p, "regions.%s.rect", key); hrect(p, r);
  word[0] = hk(v_fmt("regions.%s.word", key), 0); word[1] = hk(v_fmt("regions.%s.word", key), 1); lampAt[0] = hk(v_fmt("regions.%s.lamp", key), 0); lampAt[1] = hk(v_fmt("regions.%s.lamp", key), 1);
  int x = r[0], y = r[1] + dy;
  v_region(key, LAYER_CHROME);
  word_panel(v_fmt("%s", key), x, y, r[2], r[3], colr("colours.module.fill"), colr("colours.module.edge"));
  v_rect(v_fmt("%s.top", key), x + 1, y + 1, r[2] - 2, 1, colr("colours.module.top"));
  if (lampState) { v_name(v_fmt("%s.lamp", key)); lamp(v_fmt("%s.lamp", key), x + lampAt[0], y + lampAt[1], lampState); }   /* the lamp logs as its own region, with the module's lift; the Vivarium's modules pass none: no lamp node */
  char w[40]; spec_str(H, v_fmt("strings.modules.%s", key), w, sizeof w);
  v_region(key, LAYER_TYPE); v_text(v_fmt("%s.word", key), w, x + word[0], y + word[1] + 5, v_measure(w, 16), 16, colr("colours.module.word"));   /* a 24 px zone: the cap top 5 below its top */
}

/* the name tag: a panel and the name, 24 tall; its width the name's plus 16 rounded up to the 8 px grid, 48 at least; centred on the box, 12 px under the ring (top at feet + 24), over the box when it would pass 536,
   slid to stay 8 px inside the glass. `lifted`: the box is the resident's as drawn (a sleeper does not lift). Returns the tag's rect in out. */
void build_nameTag(const char *name, const int box[4], int lift, int out[4]) {
  int h = hi("regions.nameTag.h", 24), pad = hi("regions.nameTag.pad", 8), px = hi("regions.nameTag.px", 16), tw = v_measure(name, px), w = tw + 2 * pad;
  w = (w + 7) / 8 * 8; if (w < 48) w = 48;
  int x = box[0] + v_half(box[2] - w), feet = box[1] + box[3], y = feet + 24;
  int flip = hk("regions.glass.rect", 1) + hk("regions.glass.rect", 3) - 8;   /* the glass's bottom less 8: below it the tag goes over the box */
  if (y + h > flip) y = box[1] - lift - 8 - h;
  int gl = hi("regions.glass.rect.0", 24) + 8, gr = hi("regions.glass.rect.0", 24) + hi("regions.glass.rect.2", 640) - 8;
  if (x < gl) x = gl; if (x + w > gr) x = gr - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, w, h, colr("colours.nameTag.fill"), colr("colours.nameTag.edge"));
  v_region("nameTag", LAYER_TYPE); v_text("nameTag.text", name, x + v_half(w - tw), y + 5, tw, px, colr(g_win ? "colours.nameTag.name" : "colours.nameTag.text"));
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
void build_bayStrip(const char *cur, int box[4]) {
  int r[4], n = v_plen("regions.tiles.items"), form = 0, b[LAYOUT_ITEMS][4]; hrect("regions.strip.rect", r); if (box) box[0] = box[1] = box[2] = box[3] = 0;
  v_region("strip", LAYER_CHROME); word_panel("strip", r[0], r[1], r[2], r[3], colr("colours.strip.fill"), colr("colours.strip.edge"));
  if (n > LAYOUT_ITEMS) n = LAYOUT_ITEMS;
  if (layout_list_pitch(H, "regions.tiles", n, b, &form) < 0) { v_error("word: the bay strip's forms hold no form for this many bays"); return; }
  char fk[48], dummy[2]; spec_member(H, "regions.tiles.forms", form, fk, sizeof fk, dummy, sizeof dummy);
  int tx = hk(v_fmt("regions.tiles.tile.thumb.%s", fk), 0), ty = hk(v_fmt("regions.tiles.tile.thumb.%s", fk), 1), tw = hk(v_fmt("regions.tiles.tile.thumb.%s", fk), 2), th = hk(v_fmt("regions.tiles.tile.thumb.%s", fk), 3);
  int gw = hk("regions.tiles.tile.outGlyph", 0), gh = hk("regions.tiles.tile.outGlyph", 1), lift = hi("focus.targets.tile.lift", 2);
  const char *glyph = v_pstr("regions.tiles.glyph"), *fill = colr("colours.tile.fill"), *dash = colr("colours.tile.free");
  for (int i = 0; i < n; i++) {
    char P[64]; snprintf(P, sizeof P, "regions.tiles.items.%d", i);
    const char *id = v_pstr(v_fmt("%s.id", P)), *state = v_pstr(v_fmt("%s.state", P)), *pic = v_pstr(v_fmt("%s.picture", P));
    int housed = strcmp(state, "housed") == 0, out = strcmp(state, "out") == 0, free_ = !housed && !out;
    int focused = strncmp(cur, "tile.", 5) == 0 && *id && strcmp(cur + 5, id) == 0, x = b[i][0], y = b[i][1] - (focused ? lift : 0), w = b[i][2], h = b[i][3];
    if (focused && box) { box[0] = x; box[1] = y; box[2] = w; box[3] = h; }
    char nm[40], reg[24]; snprintf(reg, sizeof reg, "tile.%d", i); v_region(reg, LAYER_CHROME);   /* a region a tile: the log holds each tile's box */
    snprintf(nm, sizeof nm, "tile.%d", i); v_rect(nm, x, y, free_ ? 0 : w, free_ ? 0 : h, fill);
    v_name(reg); snprintf(nm, sizeof nm, "tile.%d.thumb", i);
    if (housed && *pic) v_sprite(nm, pic, x + tx, y + ty, tw, th); else v_sprite_hidden(nm, glyph, x + tx, y + ty);
    snprintf(nm, sizeof nm, "tile.%d.glyph", i);
    if (out) v_sprite(nm, glyph, x + tx + (tw - gw) / 2, y + ty + (th - gh) / 2, gw, gh); else v_sprite_hidden(nm, glyph, x + tx, y + ty);
    snprintf(nm, sizeof nm, "tile.%d.free", i);
    { char ops[256]; int k = 0;
      if (free_) k = snprintf(ops, sizeof ops, "[[\"dash\",0,0,%d,\"h\",2,2,\"%s\"],[\"dash\",0,%d,%d,\"h\",2,2,\"%s\"],[\"dash\",0,0,%d,\"v\",2,2,\"%s\"],[\"dash\",%d,0,%d,\"v\",2,2,\"%s\"]]", w, dash, h - 1, w, dash, h, dash, w - 1, h, dash);
      else k = snprintf(ops, sizeof ops, "[]");
      (void)k; snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(nm), FN_COMPOSED, x, y, w, h, 0, 0, 0); }
  }
}
