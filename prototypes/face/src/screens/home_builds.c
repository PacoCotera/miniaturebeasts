/* Home's compositions (lvgl-switch.md §2.2: a composition is a build of words in the screen's binding table, never a word): the module (a panel, its engraved word, its lamp), the name tag (a panel and text), the rounded panel and the
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

/* the same, in the spec of the screen a composition is drawn for (the name tag and the bay strip serve Home and the Vivarium's whole) */

/* a lamp: the signed 12 × 12 picture of the state (off, well, waiting, needsYou), the ids are one table, frame.json regions.marks.lamp12; one node whichever state it is. A picture the host has not sent leaves a node of no size. */
const char *home_lamp_pic(const char *state) { return v_sstr("frame", v_fmt("regions.marks.lamp12.%s", *state ? state : "off")); }
static void lamp(const char *id, int x, int y, const char *state) {
  const char *pic = home_lamp_pic(state);
  v_slot(id, pic, home_lamp_pic("off"), x, y, 12, 12, *pic);
}

/* a waiting lamp on a resident or a sleeper: home-lamp-sky-12x12, steady; not shown, the same node with no size, so the order of the glass never changes kind */
void build_waitingLamp(const char *id, int x, int y, int shown) {
  if (shown) { lamp(id, x, y, "waiting"); return; }
  v_sprite_hidden(id, home_lamp_pic("waiting"), x, y);
}

/* the module of the screen whose spec is `sp`: its device plate (fix 2: a painted picture placed 1:1, no fill, edge or bevel row), its engraved word at the spec's offset and its lamp (a module whose spec says `"lamp": null` has none, and no lamp node); the objects are the screen's. `dy` is the
   focused module's lift (negative). Draws region `key`. Home's and one mibi up close's modules are this one build. */
void build_module(const char *sp, const char *key, int dy, const char *lampState) {
  int r[4], word[2], lampAt[2] = { 0, 0 }; char p[64]; snprintf(p, sizeof p, "regions.%s.rect", key); v_srect(sp, p, r);
  word[0] = v_sk(sp, v_fmt("regions.%s.word", key), 0); word[1] = v_sk(sp, v_fmt("regions.%s.word", key), 1);
  const char *lraw = spec_raw(sp, v_fmt("regions.%s.lamp", key), NULL); int hasLamp = lraw && lraw[0] == '[';
  if (hasLamp) { lampAt[0] = v_sk(sp, v_fmt("regions.%s.lamp", key), 0); lampAt[1] = v_sk(sp, v_fmt("regions.%s.lamp", key), 1); }
  int x = r[0], y = r[1] + dy;
  { const char *plate = v_pstr(v_fmt("regions.%s.plate", key)); v_region(v_fmt("%s.plate", key), LAYER_PAINTED); if (*plate) v_sprite(v_fmt("%s", key), plate, x, y, r[2], r[3]); }   /* its own region "<module>.plate", so the module's objects keep theirs */   /* the module is its device plate (fix 2 F1), the region's first node, lifting with it; no picture, no plate: no fill falls back (F6) */
  if (hasLamp) { v_name(v_fmt("%s.lamp", key)); lamp(v_fmt("%s.lamp", key), x + lampAt[0], y + lampAt[1], lampState); }   /* the lamp logs as its own region, with the module's lift */
  char w[40]; spec_str(sp, v_fmt("strings.modules.%s", key), w, sizeof w);
  v_region(key, LAYER_TYPE); v_text(v_fmt("%s.word", key), w, x + word[0], y + word[1] + 5, v_measure(w, 16), 16, v_scol(sp, "colours.module.word"));   /* a 24 px zone: the cap top 5 below its top */
}

int g_tagSlot;   /* the name tag is a slot (the meet ribbon stands in its place): the same nodes at the tag's place with no size */
int g_tagFlash;
int g_tagOver;   /* the name tag goes over the box whatever the window's bottom (a resident asleep in place: over its ink box, UI/UX Station M1 item 4) */   /* the name tag takes the frame's flash (the namer saved a name): the frame's `flash` fill and `flashInk` ink while set */
/* the name tag, for the screen whose spec is `sp` and whose window (Home's glass, the whole's window) is the region `glass`: a panel and the name, h tall (regions.nameTag); its width the name's plus twice the pad rounded up to the 8 px grid, 48 at least,
   the widest the spec's max; centred on the box, 12 px under the ring (top at feet + 24), over the box (top = box.y − lift − 8 − h) when its bottom would pass 8 px above the window's bottom, slid to stay 8 px inside the window. `lift`: the box is the resident's
   as drawn (a sleeper does not lift). Returns the tag's rect in out. */
void build_nameTag(const char *sp, const char *glass, const char *name, const int box[4], int lift, int out[4]) {
  int h = v_si(sp, "regions.nameTag.h", 24), pad = v_si(sp, "regions.nameTag.pad", 8), px = v_si(sp, "regions.nameTag.px", 16), round = v_si(sp, "regions.nameTag.round", 8), mn = v_si(sp, "regions.nameTag.min", 48), mx = v_si(sp, "regions.nameTag.max", 1 << 20);
  int tw = v_measure(name, px), w = tw + 2 * pad; w = (w + round - 1) / round * round; if (w < mn) w = mn; if (w > mx) w = mx;
  int gx = v_sk(sp, v_fmt("%s.rect", glass), 0), gy = v_sk(sp, v_fmt("%s.rect", glass), 1), gw = v_sk(sp, v_fmt("%s.rect", glass), 2), gh = v_sk(sp, v_fmt("%s.rect", glass), 3);
  int x = box[0] + v_half(box[2] - w), feet = box[1] + box[3], y = feet + 24;
  if (y + h > gy + gh - 8 || g_tagOver) y = box[1] - lift - 8 - h;   /* the window's bottom less 8: below it the tag goes over the box; a resident asleep in place: always over its ink (UI/UX, M1) */
  if (x < gx + 8) x = gx + 8; if (x + w > gx + gw - 8) x = gx + gw - 8 - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  const char *ink = g_tagFlash ? v_scol("frame", "colours.flashInk") : v_scol(sp, "colours.nameTag.text");
  if (g_tagSlot) { v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, 0, 0, v_scol(sp, "colours.nameTag.fill"), NULL); }
  else { v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, w, h, g_tagFlash ? v_scol("frame", "colours.flash") : v_scol(sp, "colours.nameTag.fill"), v_scol(sp, "colours.nameTag.edge")); }
  /* the name's cap top: 5 px under the tag's top (the 24 px tag), or from the spec's line top (regions.nameTag.lineTop in the tag's rectangle: one mibi up close's 32 px tag at 20 px) */
  int lt = spec_int(sp, "regions.nameTag.lineTop", 0);
  v_region("nameTag", LAYER_TYPE); v_line_at("nameTag.text", g_tagSlot ? "" : name, x + v_half(w - tw), lt > 0 ? y + (lt - v_sk(sp, "regions.nameTag.rect", 1)) : y + 5, lt > 0 ? V_ANCHOR_LINE : V_ANCHOR_CAP, px, ink, V_ALIGN_LEFT);
}

/* The living window's name tag (T-20261018-235): the same panel and name as build_nameTag, centred on the figure's feet point `fx`, its top at `yBelow` (feetY + 16), or at `yOver` (over the figure) when its bottom would pass
   8 px inside the window or `forceOver` (a sleeper's tag is always over its curl); slid to stay 8 px inside the window. Returns the tag's rect in out. */
void build_nameTagAt(const char *sp, const char *glass, const char *name, int fx, int yBelow, int yOver, int forceOver, int out[4]) {
  int h = v_si(sp, "regions.nameTag.h", 24), pad = v_si(sp, "regions.nameTag.pad", 8), px = v_si(sp, "regions.nameTag.px", 16), round = v_si(sp, "regions.nameTag.round", 8), mn = v_si(sp, "regions.nameTag.min", 48), mx = v_si(sp, "regions.nameTag.max", 1 << 20);
  int tw = v_measure(name, px), w = tw + 2 * pad; w = (w + round - 1) / round * round; if (w < mn) w = mn; if (w > mx) w = mx;
  int gx = v_sk(sp, v_fmt("%s.rect", glass), 0), gy = v_sk(sp, v_fmt("%s.rect", glass), 1), gw = v_sk(sp, v_fmt("%s.rect", glass), 2), gh = v_sk(sp, v_fmt("%s.rect", glass), 3);
  int x = fx - w / 2, y = yBelow;
  if (y + h > gy + gh - 8 || forceOver) y = yOver;
  if (x < gx + 8) x = gx + 8; if (x + w > gx + gw - 8) x = gx + gw - 8 - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  const char *ink = v_scol(sp, "colours.nameTag.text");
  v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, w, h, v_scol(sp, "colours.nameTag.fill"), v_scol(sp, "colours.nameTag.edge"));
  v_region("nameTag", LAYER_TYPE); v_line_at("nameTag.text", name, x + v_half(w - tw), y + 5, V_ANCHOR_CAP, px, ink, V_ALIGN_LEFT);
}

/* The bay strip (vivarium.json regions.strip and tiles; the composition `bayStrip`, rule `listPitch`): the strip's panel and a tile a bay, the housed mibis in bay order then the free bays, the tiles by the rule's form for the count. Every tile is the same
   four nodes whichever it is, so a mibi going out or a bay filling never changes the order of the screen's nodes: a panel rect (none for a free bay), the thumbnail (a housed mibi's 48 x 48), the outline glyph (a mibi out with the Companion, centred where the
   thumbnail stands) and the dash outline (a free bay: 1 px `hairline`, 2 on 2 off, a composed picture with no ops while the bay is not free). A hidden node is the glyph's picture with a window of no size. `focus` is the tile the ring is on, lifted by the spec's
   tile lift. Writes the focused tile's box to box. */
void build_bayStrip(const char *sp, const char *cur, int box[4]) {
  int r[4], n = v_plen("regions.tiles.items"); v_srect(sp, "regions.strip.rect", r); if (box) box[0] = box[1] = box[2] = box[3] = 0;
  int any = 0; for (int i = 0; i < n; i++) { const char *st = v_pstr(v_fmt("regions.tiles.items.%d.state", i)); if (strcmp(st, "housed") == 0 || strcmp(st, "out") == 0) any = 1; }
  v_region("strip", LAYER_PAINTED); { const char *pl = v_pstr("regions.strip.plate"); v_slot("strip", pl, v_pstr("regions.tiles.glyph"), r[0], r[1], r[2], r[3], any && *pl); }   /* fix 2 F1/F5: the strip's plate, 1:1; no housed or out tile: no plate (Every state composed, rule 2: no bare panel) */
  char fk[48]; if (n > 12 || layout_list_form(sp, "regions.tiles", n, fk, sizeof fk) < 0) { v_error("word: the bay strip holds twelve bays at most, and its forms must hold this many"); return; }
  int tx = v_sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 0), ty = v_sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 1), tw = v_sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 2), th = v_sk(sp, v_fmt("regions.tiles.tile.thumb.%s", fk), 3);
  int gw = v_sk(sp, "regions.tiles.tile.outGlyph", 0), gh = v_sk(sp, "regions.tiles.tile.outGlyph", 1), lift = v_si(sp, "focus.targets.tile.lift", 2);
  char glyph[96]; snprintf(glyph, sizeof glyph, "%s", v_pstr("regions.tiles.glyph"));   /* a copy: v_pstr's ring of 32 is spent by eight tiles */
  for (int i = 0; i < n; i++) {
    char P[64]; snprintf(P, sizeof P, "regions.tiles.items.%d", i);
    const char *id = v_pstr(v_fmt("%s.id", P)), *state = v_pstr(v_fmt("%s.state", P)), *pic = v_pstr(v_fmt("%s.picture", P));
    int housed = strcmp(state, "housed") == 0, out = strcmp(state, "out") == 0, free_ = !housed && !out;
    int b[4]; layout_list_pitch(sp, "regions.tiles", n, i, b);
    int focused = strncmp(cur, "tile.", 5) == 0 && *id && strcmp(cur + 5, id) == 0, x = b[0], y = b[1] - (focused ? lift : 0), w = b[2], h = b[3];
    if (focused && box) { box[0] = x; box[1] = y; box[2] = w; box[3] = h; }
    char nm[40], reg[24]; snprintf(reg, sizeof reg, "tile.%d", i); v_region(reg, LAYER_PAINTED);   /* a region a tile: the log holds each tile's box; the well is painted (fix 2) */
    snprintf(nm, sizeof nm, "tile.%d", i); { const char *wl = v_pstr(v_fmt("%s.well", P)); v_slot(nm, wl, glyph, x, y, w, h, !free_ && *wl); }
    v_region(reg, LAYER_CHROME);   /* fix 2 F4: the tile is its well, by form (the mibi up close: the -shown well); a free bay draws nothing */
    v_name(reg); snprintf(nm, sizeof nm, "tile.%d.thumb", i);
    v_slot(nm, pic, glyph, x + tx, y + ty, tw, th, housed && *pic);
    snprintf(nm, sizeof nm, "tile.%d.glyph", i);
    v_slot_at(nm, glyph, NULL, x + tx + (tw - gw) / 2, y + ty + (th - gh) / 2, gw, gh, out, x + tx, y + ty);
    snprintf(nm, sizeof nm, "tile.%d.free", i);   /* a free bay draws nothing: the node keeps its box with no ops (fix 6, N7) */
    v_composed(nm, x, y, w, h, "[]");
  }
}

/* A rounded panel drawn by the face's own primitives, palette-exact: a nine-slice of a face-owned source (corners 1:1, the straight parts tiled, never scaled), the way the focus ring is. The source is a box of 2r + 4 on a side with corners of radius r (r >= 1), its whole
   in `fill` and a 1 px `edge` on its outline; the node is the w x h panel at (x, y) (each at least 2r). `edge` NULL leaves the outline out. */
void build_roundPanel(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge) {
  int S = 2 * r + 4; char ops[160];
  if (w < 2 * r || h < 2 * r || r < 1) { v_error("build_roundPanel: a panel under 2r on an axis, or a radius under 1, cannot be drawn"); return; }
  snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]]", S, S, r, fill, edge ? edge : "");
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  int src = prim_source(prim_ops(), S, S);
  if (src < 0) { v_error("build_roundPanel: the panel's source picture is refused"); return; }
  prim_node(v_id(id), FN_NINE, x, y, w, h, ((uint32_t)r << 24) | ((uint32_t)r << 16) | ((uint32_t)r << 8) | (uint32_t)r, src, 0);
}
