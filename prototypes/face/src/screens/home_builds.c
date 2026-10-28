/* Home's compositions (lvgl-switch.md §2.2: a composition is a build of words in the screen's binding table, never a word): the module (a panel, its engraved word, its lamp), the name tag (a panel and text) and the
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
  int lift = v_si(sp, "focus.targets.tile.lift", 2);
  char glyph[96], glyphDocked[96]; snprintf(glyph, sizeof glyph, "%s", v_pstr("regions.tiles.glyph")); snprintf(glyphDocked, sizeof glyphDocked, "%s", v_pstr("regions.tiles.glyphDocked"));   /* a copy: v_pstr's ring of 32 is spent by eight tiles */
  int vx = v_sk(sp, "regions.tiles.tile.traveller.thumb", 0), vy = v_sk(sp, "regions.tiles.tile.traveller.thumb", 1), lx = v_sk(sp, "regions.tiles.tile.traveller.glyph", 0), ly = v_sk(sp, "regions.tiles.tile.traveller.glyph", 1), lw = v_sk(sp, "regions.tiles.tile.traveller.glyph", 2), lh = v_sk(sp, "regions.tiles.tile.traveller.glyph", 3);   /* R4b: a carried mibi's tile keeps its thumbnail and the Companion's glyph beside it */
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
    v_slot(nm, pic, glyph, out ? x + vx : x + tx, out ? y + vy : y + ty, tw, th, (housed || out) && *pic);
    snprintf(nm, sizeof nm, "tile.%d.glyph", i);
    v_slot_at(nm, strcmp(v_pstr(v_fmt("%s.where", P)), "docked") == 0 ? glyphDocked : glyph, NULL, x + lx, y + ly, lw, lh, out, x + lx, y + ly);
    snprintf(nm, sizeof nm, "tile.%d.free", i);   /* a free bay draws nothing: the node keeps its box with no ops (fix 6, N7) */
    v_composed(nm, x, y, w, h, "[]");
  }
}

/* The Vivarium whole's two slate panes (vivarium.json regions.rooms, chips, places and tiles; the rooms design, T-20261027-318): the rooms pane and its chips, the places pane and its eight places. Only kit components and helpers: a pane is kit_panel,
   the chips and the places are kit_tiles on rule listPitch's forms, a picture is v_slot. `cur` is the focused target's id; the focused chip or place is lifted by its target's lift and its lifted box goes to box (zeros when the ring is on neither). */
typedef struct { const char *sp; const char *cur; int lift; int box[4]; int level; } pane_ctx_t;
/* the swap's clock (events.swap, the dither of target `window`): 1 and its level 0 to 16 while it runs with motion, else 0 */
static int swap_level(int *level) {
  anim_state_t t; *level = 16; if (!v_pbool("motion", 1) || !anim_get(ANIM_DITHER, "window", &t) || t.ms <= 0) return 0;
  *level = 16 * t.elapsed / t.ms; if (*level > 16) *level = 16; return 1;
}
/* a recess: the inverse of a raised pane: the ground over the rect, a 1 px hairline on the bottom row and the right column, then a 1 px void on the top row and the left column (the void wins at the two corners they share); nothing else. slot: the same nodes with no size at (x, y). Kit parts only (kit_panel, kit_hairline). */
static void recess_draw(const pane_ctx_t *c, const char *id, int x, int y, int w, int h, int slot) {
  char n[48]; const char *hl = v_scol(c->sp, "colours.recess.edge"), *vd = v_scol(c->sp, "colours.recess.shade"); if (slot) w = h = 0;
  kit_panel(id, x, y, w, h, v_scol(c->sp, "colours.recess.fill"), NULL, NULL, slot);
  snprintf(n, sizeof n, "%s.eb", id); kit_hairline(n, x, y + (h ? h - 1 : 0), w, hl, 0, NULL);
  snprintf(n, sizeof n, "%s.er", id); kit_hairline(n, x + (w ? w - 1 : 0), y, h, hl, 1, NULL);
  snprintf(n, sizeof n, "%s.et", id); kit_hairline(n, x, y, w, vd, 0, NULL);
  snprintf(n, sizeof n, "%s.el", id); kit_hairline(n, x, y, h, vd, 1, NULL);
}
/* a chip: its recess (the room shown one step up), its picture (rooms.json chip, none until cut) and its lamp (the new-room chip's); the same four nodes whichever it is */
static void chip_draw(int i, const int b[4], void *vc) {
  pane_ctx_t *c = vc; char P[40], nm[40], target[40], state[16], pic[96], lamp[96];
  snprintf(P, sizeof P, "regions.rooms.items.%d", i);
  snprintf(target, sizeof target, "room.%s", v_pstr(v_fmt("%s.id", P))); snprintf(state, sizeof state, "%s", v_pstr(v_fmt("%s.state", P)));
  snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("%s.picture", P))); snprintf(lamp, sizeof lamp, "%s", v_pstr(v_fmt("%s.lamp", P)));
  int focused = strcmp(c->cur, target) == 0, x = b[0], y = b[1] - (focused ? c->lift : 0), w = b[2], h = b[3];
  if (focused) { c->box[0] = x; c->box[1] = y; c->box[2] = w; c->box[3] = h; }
  snprintf(nm, sizeof nm, "chip.%d", i); v_region(nm, LAYER_CHROME);
  if (strcmp(state, "shown") == 0) { const char *f = v_scol(c->sp, "colours.chipShown.fill"); kit_panel(nm, x, y, w, h, f, v_scol(c->sp, "colours.chipShown.edge"), f, 0); }   /* one step up: hairline fill, bevel edge (the bevel line takes the fill) */
  else recess_draw(c, nm, x, y, w, h, 0);   /* a recess: ground, void top and left, hairline bottom and right */
  int px = v_sk(c->sp, "regions.chips.picture", 0), py = v_sk(c->sp, "regions.chips.picture", 1), pw = v_sk(c->sp, "regions.chips.picture", 2), ph = v_sk(c->sp, "regions.chips.picture", 3);
  int lx = v_sk(c->sp, "regions.chips.lamp", 0), ly = v_sk(c->sp, "regions.chips.lamp", 1), lw = v_sk(c->sp, "regions.chips.lamp", 2), lh = v_sk(c->sp, "regions.chips.lamp", 3);
  v_name(nm); snprintf(P, sizeof P, "chip.%d.pic", i); v_slot(P, pic, NULL, x + px, y + py, pw, ph, *pic);
  v_name(nm); snprintf(P, sizeof P, "chip.%d.lamp", i); v_slot(P, lamp, NULL, x + lx, y + ly, lw, lh, *lamp);
}
/* a place: a housed or out mibi's well (the placed master) with its thumbnail or the outline glyph, a free place's recess; while the swap runs the thumbnail dithers from the old room's place (props `from`) to this one's, clear when either has none */
static void place_draw(int i, const int b[4], void *vc) {
  pane_ctx_t *c = vc; char P[48], nm[48], reg[24], id[24], state[16], pic[96], wl[96], from[96], glyph[96];
  snprintf(P, sizeof P, "regions.tiles.items.%d", i); snprintf(id, sizeof id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(state, sizeof state, "%s", v_pstr(v_fmt("%s.state", P)));
  snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("%s.picture", P))); snprintf(wl, sizeof wl, "%s", v_pstr(v_fmt("%s.well", P))); snprintf(from, sizeof from, "%s", v_pstr(v_fmt("%s.from", P))); snprintf(glyph, sizeof glyph, "%s", v_pstr("regions.tiles.glyph"));
  char glyphDocked[96], where[12]; snprintf(glyphDocked, sizeof glyphDocked, "%s", v_pstr("regions.tiles.glyphDocked")); snprintf(where, sizeof where, "%s", v_pstr(v_fmt("%s.where", P)));
  int vx = v_sk(c->sp, "regions.tiles.tile.traveller.thumb", 0), vy = v_sk(c->sp, "regions.tiles.tile.traveller.thumb", 1), lx = v_sk(c->sp, "regions.tiles.tile.traveller.glyph", 0), ly = v_sk(c->sp, "regions.tiles.tile.traveller.glyph", 1), lw = v_sk(c->sp, "regions.tiles.tile.traveller.glyph", 2), lh = v_sk(c->sp, "regions.tiles.tile.traveller.glyph", 3);   /* R4b: a carried mibi's tile keeps its thumbnail and the Companion's glyph beside it */
  int housed = strcmp(state, "housed") == 0, out = strcmp(state, "out") == 0, free_ = !housed && !out;
  int tx = v_sk(c->sp, "regions.tiles.tile.thumb.compact", 0), ty = v_sk(c->sp, "regions.tiles.tile.thumb.compact", 1), tw = v_sk(c->sp, "regions.tiles.tile.thumb.compact", 2), th = v_sk(c->sp, "regions.tiles.tile.thumb.compact", 3);
  int focused = strncmp(c->cur, "tile.", 5) == 0 && *id && strcmp(c->cur + 5, id) == 0, x = b[0], y = b[1] - (focused ? c->lift : 0), w = b[2], h = b[3];
  if (focused) { c->box[0] = x; c->box[1] = y; c->box[2] = w; c->box[3] = h; }
  snprintf(reg, sizeof reg, "tile.%d", i); v_region(reg, LAYER_PAINTED);
  snprintf(nm, sizeof nm, "tile.%d", i); v_slot(nm, wl, glyph, x, y, w, h, !free_ && *wl);   /* a housed place is its well, by form (fix 2 F4) */
  v_region(reg, LAYER_CHROME);
  snprintf(nm, sizeof nm, "tile.%d.recess", i); recess_draw(c, nm, x, y, w, h, !free_);   /* a free place is its recess, nothing in it */
  v_name(reg); snprintf(nm, sizeof nm, "tile.%d.thumb", i);
  int hasFrom = c->level < 16 && *from && wire_asset_slot(from) >= 0, hasTo = housed && *pic && wire_asset_slot(pic) >= 0, dith = c->level < 16 && (hasFrom || hasTo);
  v_slot(nm, pic, glyph, out ? x + vx : x + tx, out ? y + vy : y + ty, tw, th, (housed || out) && *pic && !dith);
  if (dith) { v_name(reg); snprintf(nm, sizeof nm, "tile.%d.dither", i); v_dither_window(nm, hasFrom ? from : NULL, 0, 0, hasTo ? pic : NULL, 0, 0, c->level, x + tx, y + ty, tw, th); }
  snprintf(nm, sizeof nm, "tile.%d.glyph", i);
  v_slot_at(nm, strcmp(where, "docked") == 0 ? glyphDocked : glyph, NULL, x + lx, y + ly, lw, lh, out, x + lx, y + ly);
  snprintf(nm, sizeof nm, "tile.%d.free", i); v_composed(nm, x, y, w, h, "[]");   /* the place's box in the log, drawn or not */
}
void build_rooms(const char *sp, const char *cur, int box[4]) {
  pane_ctx_t c = { sp, cur, v_si(sp, "focus.targets.room.lift", 2), { 0, 0, 0, 0 }, 16 }; int r[4], n = v_plen("regions.rooms.items");
  v_srect(sp, "regions.rooms.rect", r); v_region("rooms", LAYER_CHROME);
  kit_panel("rooms", r[0], r[1], r[2], r[3], v_scol(sp, "colours.pane.fill"), v_scol(sp, "colours.pane.edge"), v_scol(sp, "colours.pane.bevel"), 0);
  if (n > 0 && n <= 4) kit_tiles(sp, "regions.chips", n, chip_draw, &c, NULL); else if (n > 4) v_error("word: the rooms pane holds four rooms at most");
  if (box) memcpy(box, c.box, sizeof c.box);
}
void build_places(const char *sp, const char *cur, int box[4]) {
  pane_ctx_t c = { sp, cur, v_si(sp, "focus.targets.tile.lift", 2), { 0, 0, 0, 0 }, 16 }; int r[4], n = v_plen("regions.tiles.items"), lv;
  if (swap_level(&lv)) c.level = lv;
  v_srect(sp, "regions.places.rect", r); v_region("places", LAYER_CHROME);
  kit_panel("places", r[0], r[1], r[2], r[3], v_scol(sp, "colours.pane.fill"), v_scol(sp, "colours.pane.edge"), v_scol(sp, "colours.pane.bevel"), 0);
  if (n > 0 && n <= 8) kit_tiles(sp, "regions.tiles", n, place_draw, &c, NULL); else if (n > 8) v_error("word: the places pane holds eight places at most");
  if (box) memcpy(box, c.box, sizeof c.box);
}
