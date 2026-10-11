/* One mibi up close, the Vivarium's closest level (habitat.json; station-layouts.md "The Vivarium: the whole and one mibi up close"): the words that draw it from the spec and the props' regions, in draw order, then the focus ring.
   The stage, the living window (the near Vivarium of the light) with the mibi large in it (or the out mark while it is out with the Companion), its name tag (or the meet ribbon), the card (the species line and its guide mark, the story,
   the code, the heart, the skill notches, the stamp label and one plate a chapter), the four modules (the Companion's set, Portrait, Cross, Wild) and the strip of bays. A picture the host has not sent is a slot not yet filled: nothing is drawn.
   The events: `moment` (the placeholder's two hops: the creature lifts by the spec's table, the box, the tag and the ring stay), `read` (the stamp prints its cells row by row over its length), `dither` on the resident (the swap to a tile's mibi), `flash`
   on the tag (the namer saved a name). Habitat's focus is `focus.graph` of habitat.json on the boxes this file drew; while the namer (an overlay, screens/namer.c) is open habitat draws no ring and takes no key. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include "../layout/layout.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "habitat"
#define MAXP 8
#define MAXF 11
static int hi(const char *p, int d) { return spec_int(S, p, d); }
static int hk(const char *base, int k) { return spec_int(S, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(S, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(S, p, o, 24); return o; }
static const char *fcol(const char *p) { static char b[4][24]; static int k; char *o = b[k++ & 3]; spec_str("frame", p, o, 24); return o; }
static int has(const char *id) { return id && *id && wire_has_asset(id); }
static int g_tag[4];   /* the name tag as drawn (the name target's box), zeros while the meet ribbon stands in its place */

/* ---- the stage and the living window ---- */
static void build_stage(void) {
  int r[4]; hrect("regions.stage.rect", r);
  v_region("stage", LAYER_CHROME); v_rect("stage.ground", r[0], r[1], r[2], r[3], fcol("colours.stageGround"));
  v_region("stage", LAYER_PAINTED);
  for (int i = 0, n = v_plen("regions.stage.room"); i < n; i++) if (v_sprite("stage.room", v_pstr(v_fmt("regions.stage.room.%d", i)), r[0], r[1], r[2], r[3])) break;   /* the up-close stage master, until it is signed the ground alone */
}

/* ---- the resident ---- */
/* the lift of the placeholder's hops (events.moment.placeholder): hop h begins at `hops[h]` ms of the moment and runs `ms`; `lift` is [ms into the hop, px above where the creature stands]; whole pixels, no ease */
static int hop_lift(void) {
  anim_state_t t; if (!v_pbool("motion", 1) || !anim_get(ANIM_MOMENT, "resident", &t)) return 0;
  int ms = hi("events.moment.placeholder.ms", 400), lift = 0;
  for (int h = 0, n = spec_len(S, "events.moment.placeholder.hops"); h < n; h++) {
    int at = hk("events.moment.placeholder.hops", h), dt = t.elapsed - at; if (dt < 0 || dt >= ms) continue;
    for (int k = 0, m = spec_len(S, "events.moment.placeholder.lift"); k < m; k++) { int step = hk(v_fmt("events.moment.placeholder.lift.%d", k), 0); if (step <= dt) lift = hk(v_fmt("events.moment.placeholder.lift.%d", k), 1); }
  }
  return lift;
}
static void build_ring_under(const char *cur) {
  if (strcmp(cur, "resident") != 0 || spec_len("props", "overlay") >= 0) return;
  int r[4]; hrect("regions.resident.rect", r); v_region("focus", LAYER_CHROME);
  word_focusRing("focus", r, S, "focus.targets.resident.ring", fcol("colours.ring"));   /* the feet ring: under the creature, as on Home */
}
static void build_resident(const char *cur) {
  int r[4], lp[4]; hrect("regions.resident.rect", r); hrect("regions.resident.lamp.rect", lp);
  const char *pic = v_pstr("regions.resident.picture"), *outPic = v_pstr("regions.resident.out"); int waiting = v_pbool("regions.resident.waiting", 0), lift = (strcmp(cur, "resident") == 0 ? hi("regions.resident.lift", 4) : 0);
  char from[96] = ""; int level = 16; anim_state_t t;
  if (v_pbool("motion", 1) && anim_get(ANIM_DITHER, "resident", &t) && t.from_id[0] && t.ms > 0 && wire_has_asset(t.from_id) && has(pic)) { snprintf(from, sizeof from, "%s", t.from_id); level = 16 * t.elapsed / t.ms; if (level > 16) level = 16; }   /* the swap: the old mibi cross-dithers to the new in 16 levels */
  int y = r[1] - lift - hop_lift(), dithering = from[0] != 0;
  v_region("resident", LAYER_ART);
  if (has(pic) && !dithering) { v_name("resident"); v_sprite("resident.pic", pic, r[0], y, r[2], r[3]); } else if (has(pic)) v_sprite_hidden("resident.pic", pic, r[0], y); else if (has(outPic)) v_sprite_hidden("resident.pic", outPic, r[0], y);
  v_region("resident", LAYER_ART);
  if (dithering) v_dither("resident.dither", from, pic, level, r[0], y, r[2], r[3]);
  if (has(outPic)) { int o[4]; hrect("regions.resident.out.rect", o); v_name("resident"); v_sprite("resident.out", outPic, o[0], o[1], o[2], o[3]); }
  else if (has(pic)) v_sprite_hidden("resident.out", pic, r[0], r[1]);
  v_name("resident.lamp"); build_waitingLamp("resident.lamp", lp[0], lp[1] - lift, waiting && !has(outPic));   /* rides the focus lift */
}

/* ---- the name tag, or the meet ribbon in its place ---- */
static void build_tag(void) {
  int box[4], rib[4]; hrect("regions.resident.rect", box); hrect("regions.meetRibbon.rect", rib);
  const char *name = v_pstr("regions.nameTag.text"), *words = v_pstr("regions.meetRibbon.text"); int meet = strcmp(v_pstr("state"), "meet") == 0 && *words;
  anim_state_t t; int flash = v_pbool("motion", 1) && anim_get(ANIM_FLASH, "nameTag", &t);   /* the frame's flash, solid for the event's 240 ms as a counter's (frame.c) */
  memset(g_tag, 0, sizeof g_tag);
  v_region("meetRibbon", LAYER_CHROME);
  word_ribbon("meetRibbon", rib, meet ? words : "", hi("regions.meetRibbon.px", 20), hi("regions.meetRibbon.pad", 0), flash ? fcol("colours.flash") : colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), flash ? fcol("colours.flashInk") : colr("colours.ribbon.text"));
  if (!meet) { g_tagFlash = flash; build_nameTag(S, "regions.glass", name, box, hi("regions.resident.lift", 4), g_tag); g_tagFlash = 0; }
  else { v_region("nameTag", LAYER_CHROME); word_panel("nameTag", 0, 0, 0, 0, colr("colours.nameTag.fill"), NULL); v_region("nameTag", LAYER_TYPE); v_text("nameTag.text", "", 0, 0, 0, hi("regions.nameTag.px", 20), colr("colours.nameTag.text")); }   /* the same nodes with no size */
}

/* ---- the card ---- */
static void card_sprite(const char *id, const char *pic, int x, int y, int w, int h) { v_name("card"); if (has(pic)) v_sprite(id, pic, x, y, w, h); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), x, y); }
static void build_card(void) {
  int c[4]; hrect("regions.card.rect", c);
  v_region("card", LAYER_CHROME); word_panel("card", c[0], c[1], c[2], c[3], colr("colours.card.fill"), colr("colours.card.edge")); v_rect("card.top", c[0] + 1, c[1] + 1, c[2] - 2, 1, colr("colours.card.top"));
  card_sprite("card.heart", v_pstr("regions.card.heart"), c[0] + hk("regions.card.heart.at", 0), c[1] + hk("regions.card.heart.at", 1), hk("regions.card.heart.size", 0), hk("regions.card.heart.size", 1));
  int n = v_pint("regions.card.notches.count", 0); if (n > 3) n = 3; const char *np = v_pstr("regions.card.notches.picture"); int nw = hk("regions.card.notches.notch", 0), nh = hk("regions.card.notches.notch", 1);
  for (int i = 0; i < 3; i++) { int x = i < n ? hk(v_fmt("regions.card.notches.places.%d.%d", n, i), 0) : 0, y = i < n ? hk(v_fmt("regions.card.notches.places.%d.%d", n, i), 1) : 0; if (i < n) card_sprite(v_fmt("card.notch.%d", i), np, x, y, nw, nh); else card_sprite(v_fmt("card.notch.%d", i), "", 0, 0, 0, 0); }
}
static void build_speciesLine(void) {
  int r[4]; hrect("regions.speciesLine.rect", r); const char *text = v_pstr("regions.card.species.text"), *mark = v_pstr("regions.card.species.mark"); int px = hi("regions.speciesLine.px", 16), w = v_measure(text, px);
  v_region("speciesLine", LAYER_TYPE); v_text("speciesLine.text", text, r[0], hi("regions.speciesLine.lineTop", 66) + v_fdiv(20 - v_cap(px), 2), w, px, colr("colours.card.species"));
  int mw = hk("regions.speciesLine.mark.size", 0), mh = hk("regions.speciesLine.mark.size", 1);
  v_name("speciesLine"); if (has(mark)) v_sprite("speciesLine.mark", mark, r[0] + w + hi("regions.speciesLine.mark.gap", 4), r[1] + v_fdiv(r[3] - mh, 2), mw, mh); else v_sprite_hidden("speciesLine.mark", v_pstr("regions.glass.picture"), 0, 0);   /* 4 px after the line's last word, on its centre */
}
static void build_story(void) {
  v_region("story", LAYER_TYPE); int px = hi("regions.story.px", 16);
  for (int i = 0; i < 3; i++) { const char *t = v_pstr(v_fmt("regions.card.story.%d", i)); int w = v_measure(t, px), top = hk("regions.story.lineTops", i); v_text(v_fmt("story.%d", i), t, hk("regions.story.rect", 0), top + v_fdiv(20 - v_cap(px), 2), *t ? w : 0, px, colr("colours.card.story")); }
}
static void build_code(void) {
  const char *code = v_pstr("regions.card.code"); int px = hi("regions.code.px", 16), w = v_measure(code, px);
  v_region("code", LAYER_TYPE); v_text("code", code, hk("regions.code.rect", 0), hi("regions.code.lineTop", 162) + v_fdiv(20 - v_cap(px), 2), *code ? w : 0, px, colr("colours.card.code"));
}
/* the stamp label: a bone plate with a slate edge and the stamp centred on it; the read event prints its cells row by row from the top over its length (N + 2 rows of `cell` px, whole rows) */
static void build_stamp(void) {
  int r[4]; hrect("regions.stamp.rect", r); v_region("stamp", LAYER_CHROME); word_panel("stamp", r[0], r[1], r[2], r[3], colr("colours.stampLabel.fill"), colr("colours.stampLabel.edge"));
  const char *a = v_pstr("regions.card.stamp.asset"); int size = v_pint("regions.card.stamp.size", 0), N = v_pint("regions.card.stamp.N", 0), cell = v_pint("regions.card.stamp.cell", 0);
  if (!has(a) || !size) return;
  int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size), rows = N + 2, shown = rows; anim_state_t t;
  if (v_pbool("motion", 1)) for (int i = 0, n = v_plen("regions.plates.items"); i < n; i++) if (anim_get(ANIM_READ, v_fmt("plate.%d", i), &t) && t.ms > 0) { shown = rows * t.elapsed / t.ms; break; }
  v_name("stamp"); prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, shown * cell, 0, 1, 0);
  v_sprite("stamp.stamp", a, x, y, size, size);
}

/* ---- the plates: one a chapter in ring order, left-aligned from x 608: the signed ground and the rail's 24 x 24 emblem at (8, 8) ---- */
static void plate_rect(int n, int i, int out[4]) { layout_list_pitch(S, "regions.plates.places", n, i, out); }
static void build_chapterPlates(const char *cur) {
  int n = v_plen("regions.plates.items"); if (n > MAXP) n = MAXP; if (n < 0) n = 0;
  int ex = hk("regions.plates.plate.emblem.at", 0), ey = hk("regions.plates.plate.emblem.at", 1);
  for (int i = 0; i < MAXP; i++) {
    int b[4] = { 0, 0, 0, 0 }; if (i < n) plate_rect(n, i, b);
    int focused = i < n && strncmp(cur, "plate.", 6) == 0 && atoi(cur + 6) == i, lift = focused ? hi("focus.targets.plate.lift", 2) : 0;
    const char *ground = i < n ? v_pstr(v_fmt("regions.plates.items.%d.ground", i)) : "", *emb = i < n ? v_pstr(v_fmt("regions.plates.items.%d.emblem", i)) : "";
    char id[24]; snprintf(id, sizeof id, "plate.%d", i); v_name("plates");
    if (has(ground)) v_sprite(id, ground, b[0], b[1] - lift, b[2], b[3]); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), b[0], b[1]);
    snprintf(id, sizeof id, "plate.%d.emblem", i); v_name("plates");
    if (has(emb)) v_sprite(id, emb, b[0] + ex, b[1] + ey - lift, 24, 24); else v_sprite_hidden(id, v_pstr("regions.glass.picture"), b[0], b[1]);
  }
}

/* ---- the modules: the one `module` build with no lamp (build_module), and each module's objects, lifted with it ---- */
static void dash_box(const char *id, int x, int y, int w, int h, int free_, const char *col) {
  char ops[300];
  if (free_) snprintf(ops, sizeof ops, "[[\"dash\",1,1,%d,\"h\",2,2,\"%s\"],[\"dash\",1,%d,%d,\"h\",2,2,\"%s\"],[\"dash\",1,1,%d,\"v\",2,2,\"%s\"],[\"dash\",%d,1,%d,\"v\",2,2,\"%s\"]]", w - 2, col, h - 2, w - 2, col, h - 2, col, w - 2, h - 2, col);
  else snprintf(ops, sizeof ops, "[]");
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0);   /* the same node a free place or not: empty ops are a clear picture */
}
static void door_objects(int dy) {
  int r[4]; hrect("regions.door.rect", r); int pw = hk("regions.door.places.size", 0), ph = hk("regions.door.places.size", 1), gx = hk("regions.door.glyph.at", 0), gy = hk("regions.door.glyph.at", 1), gw = hk("regions.door.glyph.size", 0), gh = hk("regions.door.glyph.size", 1);
  const char *glyph = v_pstr("regions.door.glyph"), *lampPic = v_pstr("regions.door.lamp");
  v_name("door"); if (has(glyph)) v_sprite("door.glyph", glyph, r[0] + gx, r[1] + dy + gy, gw, gh); else v_sprite_hidden("door.glyph", v_pstr("regions.glass.picture"), r[0], r[1]);
  for (int i = 0; i < 3; i++) {
    int x = r[0] + hk(v_fmt("regions.door.places.at.%d", i), 0), y = r[1] + dy + hk(v_fmt("regions.door.places.at.%d", i), 1);
    char P[48]; snprintf(P, sizeof P, "regions.door.places.%d", i); int some = spec_len("props", P) >= 0 && v_pstr(v_fmt("%s.picture", P))[0];
    const char *pic = some ? v_pstr(v_fmt("%s.picture", P)) : "";
    v_region("door", LAYER_CHROME); v_rect(v_fmt("door.recess.%d", i), x, y, pw, ph, colr("colours.door.recess"));   /* the place's recess: a ground the mibi stands in, or nothing in it */
    v_name("door"); if (has(pic)) v_sprite(v_fmt("door.place.%d", i), pic, x, y, pw, ph); else v_sprite_hidden(v_fmt("door.place.%d", i), glyph[0] ? glyph : v_pstr("regions.glass.picture"), x, y);
    v_name("door"); if (some && v_pbool(v_fmt("%s.waiting", P), 0) && has(lampPic)) v_sprite(v_fmt("door.lamp.%d", i), lampPic, x + hk("regions.door.places.lampAt", 0), y + hk("regions.door.places.lampAt", 1), 8, 8); else v_sprite_hidden(v_fmt("door.lamp.%d", i), v_pstr("regions.glass.picture"), x, y);
    v_region("door", LAYER_CHROME); dash_box(v_fmt("door.free.%d", i), x, y, pw, ph, !some, colr("colours.tile.free"));
  }
}
static void portrait_objects(int dy) {
  int r[4]; hrect("regions.portrait.rect", r); const char *f = v_pstr("regions.portrait.frame"); int fx = hk("regions.portrait.frame.at", 0), fy = hk("regions.portrait.frame.at", 1), fw = hk("regions.portrait.frame.size", 0), fh = hk("regions.portrait.frame.size", 1);
  v_name("portrait"); if (has(f)) v_sprite("portrait.frame", f, r[0] + fx, r[1] + dy + fy, fw, fh); else v_sprite_hidden("portrait.frame", v_pstr("regions.glass.picture"), r[0], r[1]);
}
static void cross_objects(int dy) {
  int r[4]; hrect("regions.cross.rect", r); int n = v_plen("regions.cross.faces"); if (n > MAXF) n = MAXF; if (n < 0) n = 0;
  int w = hk("regions.cross.faces.size", 0), h = hk("regions.cross.faces.size", 1), pitch = hi("regions.cross.faces.pitch", 32), per = hi("regions.cross.faces.perRow", 7);
  for (int i = 0; i < MAXF; i++) {
    if (i >= n) continue;
    char id[32], P[48]; int row = n > per ? i / per : 0, col = n > per ? i % per : i;
    int x = r[0] + hk(n > per ? v_fmt("regions.cross.faces.twoRows.%d", row) : "regions.cross.faces.oneRow", 0) + col * pitch, y = r[1] + dy + hk(n > per ? v_fmt("regions.cross.faces.twoRows.%d", row) : "regions.cross.faces.oneRow", 1);
    snprintf(P, sizeof P, "regions.cross.faces.%d", i); const char *pic = v_pstr(v_fmt("%s.picture", P)); int away = v_pbool(v_fmt("%s.away", P), 0);
    snprintf(id, sizeof id, "cross.face.%d", i); v_name("cross");
    if (has(pic)) v_sprite(id, pic, x, y, w, h); else { v_layer(LAYER_ART); char ops[96]; snprintf(ops, sizeof ops, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", w, h, spec_int("frame", "focus.ring.width", 2), away ? colr("colours.faceRingAway") : colr("colours.faceRing")); snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0); }   /* until the face is painted, the ring alone, as the top bar's */
  }
}
static void wild_objects(int dy) {
  int r[4]; hrect("regions.wild.rect", r); const char *g = v_pstr("regions.wild.gate"); int gx = hk("regions.wild.gate.at", 0), gy = hk("regions.wild.gate.at", 1), gw = hk("regions.wild.gate.size", 0), gh = hk("regions.wild.gate.size", 1);
  v_name("wild"); if (has(g)) v_sprite("wild.gate", g, r[0] + gx, r[1] + dy + gy, gw, gh); else v_sprite_hidden("wild.gate", v_pstr("regions.glass.picture"), r[0], r[1]);
}
static const char *MODS[4] = { "door", "portrait", "cross", "wild" };
static void build_modules(const char *cur) {
  for (int m = 0; m < 4; m++) {
    int dy = strcmp(cur, MODS[m]) == 0 ? -hi(v_fmt("focus.targets.%s.lift", MODS[m]), 2) : 0;
    build_module(S, MODS[m], dy, "");
    if (m == 0) door_objects(dy); else if (m == 1) portrait_objects(dy); else if (m == 2) cross_objects(dy); else wild_objects(dy);
  }
}

/* ---- the targets as the words drew them, in the props' order ---- */
int habitat_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph");
  int n = v_plen("focus.targets"); if (n > cap) n = cap; int np = v_plen("regions.plates.items"), nt = v_plen("regions.tiles.items"); if (nt > 12) return 0;
  int have = nt > 0 && layout_list_form(S, "regions.tiles", nt, NULL, 0) >= 0, k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1); t->index = i; int r[4] = { 0, 0, 0, 0 };
    if (strcmp(t->id, "resident") == 0) hrect("regions.resident.rect", r);
    else if (strcmp(t->id, "name") == 0) memcpy(r, g_tag, sizeof r);
    else if (strcmp(t->id, "species") == 0) hrect("regions.speciesLine.rect", r);
    else if (strncmp(t->id, "plate.", 6) == 0) { int j = atoi(t->id + 6); if (j >= 0 && j < np) plate_rect(np, j, r); }
    else if (strncmp(t->id, "tile.", 5) == 0 && have) { for (int q = 0; q < nt; q++) if (strcmp(v_pstr(v_fmt("regions.tiles.items.%d.id", q)), t->id + 5) == 0) layout_list_pitch(S, "regions.tiles", nt, q, r); t->index = 0; for (int q = 0; q < k; q++) if (strncmp(out[q].id, "tile.", 5) == 0) t->index++; }
    else hrect(v_fmt("regions.%s.rect", t->id), r);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}

/* the ring on the focused target (the resident's is under the creature, drawn before it): a plate or a module lifted 2 px, a tile in its form, the name and the species word round */
static void build_ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "resident") == 0 || spec_len("props", "overlay") >= 0 || anim_holding()) return;
  int box[4] = { 0, 0, 0, 0 }; char form[96];
  v_region("focus", LAYER_CHROME);
  if (strcmp(cur, "name") == 0) { memcpy(box, g_tag, sizeof box); snprintf(form, sizeof form, "focus.targets.name.ring"); }
  else if (strcmp(cur, "species") == 0) { hrect("regions.speciesLine.rect", box); snprintf(form, sizeof form, "focus.targets.species.ring"); }
  else if (strncmp(cur, "plate.", 6) == 0) { int n = v_plen("regions.plates.items"), i = atoi(cur + 6); if (i < 0 || i >= n) return; plate_rect(n, i, box); box[1] -= hi("focus.targets.plate.lift", 2); snprintf(form, sizeof form, "focus.targets.plate.ring"); }
  else if (strncmp(cur, "tile.", 5) == 0) return;   /* the strip's own ring (build_bayStrip's box) */
  else { hrect(v_fmt("regions.%s.rect", cur), box); box[1] -= hi(v_fmt("focus.targets.%s.lift", cur), 2); snprintf(form, sizeof form, "focus.targets.%s.ring", cur); }
  if (box[2] > 0) word_focusRing("focus", box, S, form, fcol("colours.ring"));
}

void habitat_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  build_stage();
  word_livingWindow(S, "glass", "regions.bezel", "regions.glass", "colours.glass", v_pstr("regions.glass.picture"), 0, 0);
  build_ring_under(cur);
  build_resident(cur);
  build_tag();
  build_card(); build_speciesLine(); build_story(); build_code(); build_stamp();
  build_chapterPlates(cur);
  build_modules(cur);
  { int box[4]; build_bayStrip(S, cur, box); if (strncmp(cur, "tile.", 5) == 0 && box[2] > 0 && !anim_holding() && spec_len("props", "overlay") < 0) { v_region("focus", LAYER_CHROME); word_focusRing("focus", box, S, "focus.targets.tile.ring", fcol("colours.ring")); } }
  build_ring(cur);
}

/* a key on one mibi up close: ✓ ← and the room keys say an intent on the focused target; the pad moves the ring by habitat.json focus.graph (the host's selector `tile.shown` in focus.resolve) */
void habitat_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "resident");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[40]; char gkey[24]; int n = habitat_focus(t, 40, gkey, sizeof gkey);
  int glen; const char *graph = spec_raw(S, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  focus_resolve_t r[8]; int nr = 0;
  for (int i = 0, m = spec_len("props", "focus.resolve"); i < m && nr < 8; i++) { if (spec_member("props", "focus.resolve", i, r[nr].sel, sizeof r[nr].sel, r[nr].id, sizeof r[nr].id)) nr++; }
  int roomAt[4] = { 0, 0, 0, 0 };
  char to[48]; int step = focus_move(g, t, n, cur, dir, r, nr, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
