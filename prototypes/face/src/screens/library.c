/* The Library spread (library.json `spread`; station-layouts.md "Library spread"): the words that draw it from the spec and the props' regions, in draw order, then the focus ring. The stage (the field journal open across it, its
   labelled placeholder until the master is signed), then the sixteen frames of `spreadPage` on the two pages: `listPitch` with no forms over each page's places, n = 8 always (an unmet frame is still a place). A frame's nodes have
   stable ids (frame.<SNN>.picture, .rule, .roundel, .name, .gilt, .seed.0 to .seed.3, .seal) and are tagged with the page's region; a part the status does not give is hidden, never destroyed. Nothing clips; the pad's graph is
   `spread.focus.graph` on the boxes this file drew, and the ring draws last, over the gilt corner and the seal. The Book (a state of the library screen) is drawn by the frame's notBuilt composition. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../layout/layout.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "library"
#define PAGE_ITEMS 8
static int li(const char *p, int d) { return spec_int(S, p, d); }
static int lk(const char *base, int k) { return spec_int(S, v_fmt("%s.%d", base, k), 0); }
static const char *lcol(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(S, p, o, 24); return o; }
static const char *fcol(const char *p) { static char b[4][24]; static int k; char *o = b[k++ & 3]; spec_str("frame", p, o, 24); return o; }
static const char *lstr(const char *p) { static char b[8][96]; static int k; char *o = b[k++ & 7]; spec_str(S, p, o, 96); return o; }
static int has(const char *id) { return id && *id && wire_has_asset(id); }
static const char *cur(void) { return v_focus_cur_at("focus.cur"); }

/* the place of the frame k of a page (0 left, 1 right): the page's `places` by listPitch, 8 items, no forms */
static void frame_rect(int page, int k, int out[4]) { layout_list_pitch(S, page ? "spread.regions.rightPage.places" : "spread.regions.leftPage.places", PAGE_ITEMS, k, out); }
static const char *item_path(int page, int k) { return v_fmt("regions.%s.items.%d", page ? "rightPage" : "leftPage", k); }

/* ---- the stage: the flat ground at the stage's rectangle (what the chrome layer reads, covered by the picture) and the master or its labelled placeholder over it ---- */
static void build_stage(void) {
  int r[4] = { lk("spread.regions.stage.rect", 0), lk("spread.regions.stage.rect", 1), lk("spread.regions.stage.rect", 2), lk("spread.regions.stage.rect", 3) };
  const char *pic = v_pstr("regions.stage.picture");
  v_region("stage", LAYER_CHROME); v_rect("stage.ground", r[0], r[1], r[2], r[3], fcol("colours.stageGround"));
  v_name("stage"); if (has(pic)) v_sprite("stage.picture", pic, r[0], r[1], r[2], r[3]);
}

/* ---- one frame of spreadPage, by the status the props give ---- */
static void hidden_sprite(const char *id, int x, int y) { v_sprite_hidden(id, v_pstr("regions.stage.picture"), x, y); }
static void build_frame(int page, int k) {
  char it[64]; snprintf(it, sizeof it, "%s", item_path(page, k));   /* a copy: v_fmt below reuses its buffers */
  const char *reg = page ? "rightPage" : "leftPage"; int f[4]; frame_rect(page, k, f);
  const char *sid = v_pstr(v_fmt("%s.id", it)), *status = v_pstr(v_fmt("%s.status", it)); int found = strcmp(status, "found") == 0, met = strcmp(status, "met") == 0, known = found || met;
  char id[48]; const char *pic = v_pstr(v_fmt("%s.picture", it)), *roundel = v_pstr(v_fmt("%s.roundel", it)), *clan = v_pstr(v_fmt("%s.clan", it)), *name = v_pstr(v_fmt("%s.name", it));
  int px = f[0] + lk("spread.item.plate.at", 0), py = f[1] + lk("spread.item.plate.at", 1);
  /* the focused frame's picture lifts `spread.item.lift` px in its mat (the frame is printed and the ring stays) */
  { char fid[48], c[48]; snprintf(fid, sizeof fid, "frame.%s", sid); snprintf(c, sizeof c, "%s", cur()); if (!strcmp(c, fid)) py -= li("spread.item.lift", 0); }   /* copies: cur() and v_pstr share buffers */
  /* the plate (found) or the study (met), in the 8 px mat */
  snprintf(id, sizeof id, "frame.%s.picture", sid); v_name(reg);
  if (known && has(pic)) v_sprite(id, pic, px, py, lk("spread.item.plate.at", 2), lk("spread.item.plate.at", 3)); else hidden_sprite(id, px, py);
  /* the clan's flat ink rule over the frame, and its roundel before it */
  int rx = f[0] + lk("spread.item.clanRule.at", 0), ry = f[1] + lk("spread.item.clanRule.at", 1), rw = lk("spread.item.clanRule.at", 2), rh = lk("spread.item.clanRule.at", 3);
  snprintf(id, sizeof id, "frame.%s.rule", sid); v_region(reg, LAYER_CHROME);
  /* a frame that shows no rule is a rect of no size: its colour (a stand-in) is never drawn */
  v_rect(id, rx, ry, known && *clan ? rw : 0, known && *clan ? rh : 0, known && *clan ? lcol(v_fmt("spread.clanColours.%s", clan)) : lcol("spread.colours.nameFound"));
  int qx = f[0] + lk("spread.item.roundel.at", 0), qy = f[1] + lk("spread.item.roundel.at", 1);
  snprintf(id, sizeof id, "frame.%s.roundel", sid); v_name(reg);
  if (known && has(roundel)) v_sprite(id, roundel, qx, qy, lk("spread.item.roundel.at", 2), lk("spread.item.roundel.at", 3)); else hidden_sprite(id, qx, qy);
  /* the name on the caption rule: 16 px, centred, ink when found and stone when met */
  int npx = li("spread.item.name.px", 16), nw = known ? v_measure(name, npx) : 0, bx = f[0] + lk("spread.item.name.at", 0), by = f[1] + lk("spread.item.name.at", 1), bw = lk("spread.item.name.at", 2), bh = lk("spread.item.name.at", 3);
  snprintf(id, sizeof id, "frame.%s.name", sid); v_region(reg, LAYER_TYPE);
  v_text(id, known ? name : "", bx + v_half(bw - nw), by + v_fdiv(bh - v_cap(npx), 2), nw, npx, lcol(found ? "spread.colours.nameFound" : "spread.colours.nameMet"));
  /* the gilt corner of a portrayed species */
  int gx = f[0] + lk("spread.item.gilt.at", 0), gy = f[1] + lk("spread.item.gilt.at", 1); const char *gp = lstr("spread.item.gilt.slice");
  snprintf(id, sizeof id, "frame.%s.gilt", sid); v_name(reg);
  if (found && v_pbool(v_fmt("%s.portrayed", it), 0) && has(gp)) v_sprite(id, gp, gx, gy, lk("spread.item.gilt.at", 2), lk("spread.item.gilt.at", 3)); else hidden_sprite(id, gx, gy);
  /* the progress: four seeds, the first `progress` full, the rest empty (found only) */
  int progress = v_pint(v_fmt("%s.progress", it), 0), nseed = li("spread.item.progress.count", 4); const char *full = lstr("spread.item.progress.slices.full"), *empty = lstr("spread.item.progress.slices.empty");
  for (int s = 0; s < nseed; s++) {
    int sx = f[0] + spec_int(S, v_fmt("spread.item.progress.places.%d.0", s), 0), sy = f[1] + spec_int(S, v_fmt("spread.item.progress.places.%d.1", s), 0); const char *sp = s < progress ? full : empty;
    snprintf(id, sizeof id, "frame.%s.seed.%d", sid, s); v_name(reg);
    if (found && progress > 0 && has(sp)) v_sprite(id, sp, sx, sy, lk("spread.item.progress.seed", 0), lk("spread.item.progress.seed", 1)); else hidden_sprite(id, sx, sy);
  }
  /* the seal of a complete guide */
  int zx = f[0] + lk("spread.item.seal.at", 0), zy = f[1] + lk("spread.item.seal.at", 1); const char *zp = lstr("spread.item.seal.slice");
  snprintf(id, sizeof id, "frame.%s.seal", sid); v_name(reg);
  if (found && v_pbool(v_fmt("%s.complete", it), 0) && has(zp)) v_sprite(id, zp, zx, zy, lk("spread.item.seal.at", 2), lk("spread.item.seal.at", 3)); else hidden_sprite(id, zx, zy);
}
static void build_pages(void) {
  for (int page = 0; page < 2; page++) {
    int n = v_plen(v_fmt("regions.%s.items", page ? "rightPage" : "leftPage")); if (n > PAGE_ITEMS) n = PAGE_ITEMS;
    for (int k = 0; k < n; k++) build_frame(page, k);
  }
}

/* ---- the focus: sixteen targets `frame.<SNN>`, each its frame's place; the ring is the last thing drawn ---- */
int library_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "spread.focus.graph");
  int n = v_plen("focus.targets"), k = 0; if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1); t->index = i; int r[4] = { 0, 0, 0, 0 };
    for (int page = 0; page < 2; page++) for (int j = 0, m = v_plen(v_fmt("regions.%s.items", page ? "rightPage" : "leftPage")); j < m && j < PAGE_ITEMS; j++)
      if (strncmp(t->id, "frame.", 6) == 0 && strcmp(t->id + 6, v_pstr(v_fmt("%s.id", item_path(page, j)))) == 0) frame_rect(page, j, r);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}
static void build_ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", cur()); if (!*c) return;   /* a copy: v_pstr below reuses the buffer */
  focus_target_t t[40]; char gk[32]; int n = library_focus(t, 40, gk, sizeof gk), box[4] = { 0, 0, 0, 0 };
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0) { box[0] = t[i].x; box[1] = t[i].y; box[2] = t[i].w; box[3] = t[i].h; }
  if (box[2] <= 0) return;
  v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "spread.focus.targets.frame", box);
}
void library_words(void) { build_stage(); build_pages(); build_ring(); }

/* a key on the spread: ✓ ← and the room keys are intents on the focused frame; the pad moves the ring by spread.focus.graph and says `focus` */
void library_key(int code) {
  char c[48]; snprintf(c, sizeof c, "%s", cur());
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", c, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[40]; char gk[32]; int n = library_focus(t, 40, gk, sizeof gk); int glen; const char *graph = spec_raw(S, "spread.focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  int roomAt[4] = { 0, 0, 0, 0 }; char to[48]; int step = focus_move(g, t, n, c, dir, NULL, 0, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, c) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
