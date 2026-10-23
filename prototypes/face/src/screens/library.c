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
static int has(const char *id) { return id && *id && wire_has_asset(id); }
static const char *cur(void) { return v_focus_cur_at("focus.cur"); }

/* the place of the frame k of a page (0 left, 1 right): the page's `places` by listPitch, 8 items, no forms */
static void frame_rect(int page, int k, int out[4]) { layout_list_pitch(S, page ? "spread.regions.rightPage.places" : "spread.regions.leftPage.places", PAGE_ITEMS, k, out); }
static const char *item_path(int page, int k) { return v_fmt("regions.%s.items.%d", page ? "rightPage" : "leftPage", k); }

/* ---- the stage: the flat ground at the stage's rectangle (what the chrome layer reads, covered by the picture) and the master or its labelled placeholder over it ---- */
static void build_stage(void) {
  int r[4] = { v_sk(S, "spread.regions.stage.rect", 0), v_sk(S, "spread.regions.stage.rect", 1), v_sk(S, "spread.regions.stage.rect", 2), v_sk(S, "spread.regions.stage.rect", 3) };
  const char *pic = v_pstr("regions.stage.picture");
  v_region("stage", LAYER_CHROME); v_rect("stage.ground", r[0], r[1], r[2], r[3], v_scol("frame", "colours.stageGround"));
  v_name("stage"); if (has(pic)) v_sprite("stage.picture", pic, r[0], r[1], r[2], r[3]);
}

/* ---- one frame of spreadPage, by the status the props give ---- */
static void build_frame(int page, int k) {
  char it[64]; snprintf(it, sizeof it, "%s", item_path(page, k));   /* a copy: v_fmt below reuses its buffers */
  const char *reg = page ? "rightPage" : "leftPage"; int f[4]; frame_rect(page, k, f);
  const char *sid = v_pstr(v_fmt("%s.id", it)), *status = v_pstr(v_fmt("%s.status", it)); int found = strcmp(status, "found") == 0, met = strcmp(status, "met") == 0, known = found || met;
  char id[48]; const char *pic = v_pstr(v_fmt("%s.picture", it)), *roundel = v_pstr(v_fmt("%s.roundel", it)), *clan = v_pstr(v_fmt("%s.clan", it)), *name = v_pstr(v_fmt("%s.name", it));
  int px = f[0] + v_sk(S, "spread.item.plate.at", 0), py = f[1] + v_sk(S, "spread.item.plate.at", 1);
  /* the focused frame's picture lifts `spread.item.lift` px in its mat (the frame is printed and the ring stays) */
  { char fid[48], c[48]; snprintf(fid, sizeof fid, "frame.%s", sid); snprintf(c, sizeof c, "%s", cur()); if (!strcmp(c, fid)) py -= v_si(S, "spread.item.lift", 0); }   /* copies: cur() and v_pstr share buffers */
  /* the plate (found) or the study (met), in the 8 px mat */
  snprintf(id, sizeof id, "frame.%s.picture", sid); v_name(reg);
  v_slot(id, pic, v_pstr("regions.stage.picture"), px, py, v_sk(S, "spread.item.plate.at", 2), v_sk(S, "spread.item.plate.at", 3), known);
  /* the clan's flat ink rule over the frame, and its roundel before it */
  int rx = f[0] + v_sk(S, "spread.item.clanRule.at", 0), ry = f[1] + v_sk(S, "spread.item.clanRule.at", 1), rw = v_sk(S, "spread.item.clanRule.at", 2), rh = v_sk(S, "spread.item.clanRule.at", 3);
  snprintf(id, sizeof id, "frame.%s.rule", sid); v_region(reg, LAYER_CHROME);
  /* a frame that shows no rule is a rect of no size: its colour (a stand-in) is never drawn */
  v_rect(id, rx, ry, known && *clan ? rw : 0, known && *clan ? rh : 0, known && *clan ? v_scol(S, v_fmt("spread.clanColours.%s", clan)) : v_scol(S, "spread.colours.nameFound"));
  int qx = f[0] + v_sk(S, "spread.item.roundel.at", 0), qy = f[1] + v_sk(S, "spread.item.roundel.at", 1);
  snprintf(id, sizeof id, "frame.%s.roundel", sid); v_name(reg);
  v_slot(id, roundel, v_pstr("regions.stage.picture"), qx, qy, v_sk(S, "spread.item.roundel.at", 2), v_sk(S, "spread.item.roundel.at", 3), known);
  /* the name on the caption rule: 16 px, centred, ink when found and stone when met */
  int npx = v_si(S, "spread.item.name.px", 16), nw = known ? v_measure(name, npx) : 0, bx = f[0] + v_sk(S, "spread.item.name.at", 0), by = f[1] + v_sk(S, "spread.item.name.at", 1), bw = v_sk(S, "spread.item.name.at", 2), bh = v_sk(S, "spread.item.name.at", 3);
  snprintf(id, sizeof id, "frame.%s.name", sid); v_region(reg, LAYER_TYPE);
  v_text(id, known ? name : "", bx + v_half(bw - nw), by + v_fdiv(bh - v_cap(npx), 2), nw, npx, v_scol(S, found ? "spread.colours.nameFound" : "spread.colours.nameMet"));
  /* the gilt corner of a portrayed species */
  int gx = f[0] + v_sk(S, "spread.item.gilt.at", 0), gy = f[1] + v_sk(S, "spread.item.gilt.at", 1); const char *gp = v_sstr(S, "spread.item.gilt.slice");
  snprintf(id, sizeof id, "frame.%s.gilt", sid); v_name(reg);
  v_slot(id, gp, v_pstr("regions.stage.picture"), gx, gy, v_sk(S, "spread.item.gilt.at", 2), v_sk(S, "spread.item.gilt.at", 3), found && v_pbool(v_fmt("%s.portrayed", it), 0));
  /* the progress: four seeds, the first `progress` full, the rest empty (found only) */
  int progress = v_pint(v_fmt("%s.progress", it), 0), nseed = v_si(S, "spread.item.progress.count", 4); const char *full = v_sstr(S, "spread.item.progress.slices.full"), *empty = v_sstr(S, "spread.item.progress.slices.empty");
  for (int s = 0; s < nseed; s++) {
    int sx = f[0] + spec_int(S, v_fmt("spread.item.progress.places.%d.0", s), 0), sy = f[1] + spec_int(S, v_fmt("spread.item.progress.places.%d.1", s), 0); const char *sp = s < progress ? full : empty;
    snprintf(id, sizeof id, "frame.%s.seed.%d", sid, s); v_name(reg);
    v_slot(id, sp, v_pstr("regions.stage.picture"), sx, sy, v_sk(S, "spread.item.progress.seed", 0), v_sk(S, "spread.item.progress.seed", 1), found && progress > 0);
  }
  /* the seal of a complete guide */
  int zx = f[0] + v_sk(S, "spread.item.seal.at", 0), zy = f[1] + v_sk(S, "spread.item.seal.at", 1); const char *zp = v_sstr(S, "spread.item.seal.slice");
  snprintf(id, sizeof id, "frame.%s.seal", sid); v_name(reg);
  v_slot(id, zp, v_pstr("regions.stage.picture"), zx, zy, v_sk(S, "spread.item.seal.at", 2), v_sk(S, "spread.item.seal.at", 3), found && v_pbool(v_fmt("%s.complete", it), 0));
}
static void build_pages(void) {
  for (int page = 0; page < 2; page++) {
    int n = v_plen(v_fmt("regions.%s.items", page ? "rightPage" : "leftPage")); if (n > PAGE_ITEMS) n = PAGE_ITEMS;
    for (int k = 0; k < n; k++) build_frame(page, k);
  }
}

/* ---- the focus: sixteen targets `frame.<SNN>`, each its frame's place; the ring is the last thing drawn ---- */
int library_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"), k = 0; if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; focus_fill(t, "focus.targets", i, NULL); int r[4] = { 0, 0, 0, 0 };
    for (int page = 0; page < 2; page++) for (int j = 0, m = v_plen(v_fmt("regions.%s.items", page ? "rightPage" : "leftPage")); j < m && j < PAGE_ITEMS; j++)
      if (strncmp(t->id, "frame.", 6) == 0 && strcmp(t->id + 6, v_pstr(v_fmt("%s.id", item_path(page, j)))) == 0) frame_rect(page, j, r);
    focus_fill(t, "focus.targets", i, r); k++;
  }
  return k;
}
static void build_ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", cur()); if (!*c) return;   /* a copy: v_pstr below reuses the buffer */
  focus_target_t t[40]; int n = library_focus(t, 40), box[4] = { 0, 0, 0, 0 };
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0) { box[0] = t[i].x; box[1] = t[i].y; box[2] = t[i].w; box[3] = t[i].h; }
  if (box[2] <= 0) return;
  v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "spread.focus.targets.frame", box);
}
void library_words(void) { build_stage(); build_pages(); build_ring(); }

/* a key on the spread: ✓ ← and the room keys are intents on the focused frame; the pad moves the ring by spread.focus.graph and says `focus` */
void library_key(int code) { screens_key_graph(code, S, "spread.focus.graph", library_focus, NULL, &(screens_keys_t){ 0 }); }
