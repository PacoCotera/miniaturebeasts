/* The Library's Level 1 (library.json `l1`): a binding table. The stage (kit_stage: the flat libGround, the ground master over it once sent), then the sixteen cells on `l1.grid` (kit_tiles), each the same ten parts in the same order
   whatever its state (found, met or unmet): the cell (kit_bezel), the picture, the plate rule (kit_hairline, dashed), the species mark, the name (v_line through v_clip), the face chip, the wish mark, the glint (kit_glint), the seed
   and the lip (kit_hairline). A part the state does not show is a node of no size (the dashed rule keeps its box with no ops, kit_hairline's hidden form; a hidden glint is the star's slot, as a composed node has a size). Every rect, colour and picture id is the spec's; the props name the species,
   their states, names, pictures and flags. The ring (word_focusRing on `l1.focus.targets.cell`) is drawn last; the pad walks `l1.focus.graph` over the met and found cells. The glints fade on the face's own clock, from the frame
   Level 1 was first drawn in (solid under reduced motion). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../anim/anim.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <string.h>

#define S "library"
#define CELLS 16
#define P(part, key) v_fmt("l1.cell.%s.%s", part, key)

/* ---- the glints' clock: from the first frame Level 1 is drawn in; again from the start when another screen shows ---- */
static uint32_t g_t0; static int g_have, g_level = -1;
void library_hidden(void) { g_have = 0; g_level = -1; }
static int any_glint(void) { for (int i = 0, n = v_plen("regions.cells"); i < n; i++) if (v_pbool(v_fmt("regions.cells.%d.glint", i), 0)) return 1; return 0; }
static int on_l1(void) { return strcmp(v_pstr("screen"), S) == 0 && !v_pbool("idle", 0) && spec_has(S) && spec_len("props", "regions") >= 0; }
int library_l1_tick(uint32_t now) { return on_l1() && g_have && v_pbool("motion", 1) && any_glint() && kit_glint_level(S, "l1.cell.glint", now - g_t0, 1) != g_level; }

/* ---- one cell, by the state the props give ---- */
static void cell(int i, const int b[4], void *ctx) {
  (void)ctx;
  char sid[8], status[8], pic[96], mark[96], face[96], name[V_STR], cut[V_STR + 4], id[48], seed[96], star[96], wish[96];
  snprintf(sid, sizeof sid, "%s", v_pstr(v_fmt("regions.cells.%d.id", i))); snprintf(status, sizeof status, "%s", v_pstr(v_fmt("regions.cells.%d.status", i)));
  snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("regions.cells.%d.picture", i))); snprintf(mark, sizeof mark, "%s", v_pstr(v_fmt("regions.cells.%d.mark", i)));
  snprintf(face, sizeof face, "%s", v_pstr(v_fmt("regions.cells.%d.face", i))); snprintf(name, sizeof name, "%s", v_pstr(v_fmt("regions.cells.%d.name", i)));
  snprintf(seed, sizeof seed, "%s", v_sstr(S, P("seed", "slice"))); snprintf(star, sizeof star, "%s", v_sstr(S, P("glint", "slice"))); snprintf(wish, sizeof wish, "%s", v_sstr(S, P("wish", "slice")));
  int found = strcmp(status, "found") == 0, met = strcmp(status, "met") == 0, known = found || met, x = b[0], y = b[1], r[4];
  const char *st = found ? "found" : met ? "met" : "unmet";
  /* the cell: its fill and bevel by state, the band on a found cell */
  char fill[24], bevel[24], bandFill[24], bandRule[24];
  snprintf(fill, sizeof fill, "%s", v_scol(S, v_fmt("l1.cell.bezel.%s.fill", st))); snprintf(bevel, sizeof bevel, "%s", v_scol(S, v_fmt("l1.cell.bezel.%s.bevel", st)));
  snprintf(bandFill, sizeof bandFill, "%s", v_scol(S, "l1.cell.bezel.found.band.fill")); snprintf(bandRule, sizeof bandRule, "%s", v_scol(S, "l1.cell.bezel.found.band.rule"));
  kit_band_t band = { v_si(S, "l1.cell.bezel.found.band.side", 1), v_si(S, "l1.cell.bezel.found.band.h", 0), bandFill, bandRule };
  v_srect(S, "l1.cell.bezel.rect", r); snprintf(id, sizeof id, "cell.%s", sid);
  v_region("grid", LAYER_CHROME); kit_bezel(id, x + r[0], y + r[1], r[2], r[3], v_si(S, "l1.cell.bezel.radius", 1), fill, NULL, bevel, found ? &band : NULL);
  /* the picture: the specimen as found, the pencil study when met */
  v_srect(S, P("picture", "rect"), r); snprintf(id, sizeof id, "cell.%s.picture", sid);
  v_name("grid"); v_slot(id, pic, seed, x + r[0], y + r[1], r[2], r[3], known && *pic);
  /* the plate rule of a met cell, dashed */
  { int dash[2] = { v_sk(S, P("rule", "dash"), 0), v_sk(S, P("rule", "dash"), 1) }; char col[24]; snprintf(col, sizeof col, "%s", v_scol(S, P("rule", "colour"))); snprintf(id, sizeof id, "cell.%s.rule", sid);
    v_region("grid", LAYER_CHROME); kit_hairline(id, x + v_sk(S, P("rule", "at"), 0), y + v_sk(S, P("rule", "at"), 1), v_si(S, P("rule", "len"), 0), met ? col : NULL, 0, dash); }
  /* the species mark */
  v_srect(S, P("mark", "rect"), r); snprintf(id, sizeof id, "cell.%s.mark", sid);
  v_name("grid"); v_slot(id, mark, seed, x + r[0], y + r[1], r[2], r[3], known && *mark);
  /* the name, cut to its clip: bone when found, mist when met, "" when unmet */
  { int px = v_si(S, P("name", "px"), 16); char col[24]; snprintf(col, sizeof col, "%s", v_scol(S, found ? "l1.cell.name.colour.found" : "l1.cell.name.colour.met"));
    v_clip(known ? name : "", v_si(S, P("name", "clip"), 0), px, cut, sizeof cut); snprintf(id, sizeof id, "cell.%s.name", sid);
    v_region("grid", LAYER_TYPE); v_line_at(id, cut, x + v_si(S, P("name", "x"), 0), y + v_si(S, P("name", "lineTop"), 0), V_ANCHOR_LINE, px, col, V_ALIGN_LEFT); }
  /* the face chip of a found species with a face */
  int chip = found && *face;
  v_srect(S, P("face", "rect"), r); snprintf(id, sizeof id, "cell.%s.face", sid);
  v_name("grid"); v_slot(id, face, seed, x + r[0], y + r[1], r[2], r[3], chip);
  /* the wish mark, beside the chip or alone */
  v_srect(S, chip ? P("wish", "rect") : P("wish", "alone"), r); snprintf(id, sizeof id, "cell.%s.wish", sid);
  v_name("grid"); v_slot(id, wish, seed, x + r[0], y + r[1], r[2], r[3], known && v_pbool(v_fmt("regions.cells.%d.wish", i), 0));
  /* the glint of a found species with a look new this visit; with none, the star's node of no size at the glint's centre (a composed node has a size, so the hidden part is the picture's slot) */
  { int on = found && v_pbool(v_fmt("regions.cells.%d.glint", i), 0), cx = x + v_sk(S, P("glint", "centre"), 0), cy = y + v_sk(S, P("glint", "centre"), 1); snprintf(id, sizeof id, "cell.%s.glint", sid);
    v_name("grid"); if (on) kit_glint(id, star, cx, cy, v_sk(S, P("glint", "size"), 0), v_sk(S, P("glint", "size"), 1), g_level); else v_slot(id, star, NULL, cx, cy, 0, 0, 0); }
  /* the seed and the lip of an unmet cell */
  v_srect(S, P("seed", "rect"), r); snprintf(id, sizeof id, "cell.%s.seed", sid);
  v_name("grid"); v_slot(id, seed, NULL, x + r[0], y + r[1], r[2], r[3], !known);
  { char col[24]; snprintf(col, sizeof col, "%s", v_scol(S, P("lip", "colour"))); snprintf(id, sizeof id, "cell.%s.lip", sid);
    v_region("grid", LAYER_CHROME); kit_hairline(id, x + v_sk(S, P("lip", "at"), 0), y + v_sk(S, P("lip", "at"), 1), known ? 0 : v_si(S, P("lip", "len"), 0), col, 0, NULL); }
}

/* ---- the focus: the met and found cells, each its cell's rect ---- */
static void no_draw(int i, const int b[4], void *ctx) { (void)i; (void)b; (void)ctx; }
int library_focus(focus_target_t *out, int cap) {
  int boxes[CELLS][4], r[4], n = v_plen("focus.targets"), cells = v_plen("regions.cells"); if (n > cap) n = cap;
  if (cells != CELLS || kit_tiles(S, "l1.grid", CELLS, no_draw, NULL, boxes) < 0) return 0;
  v_srect(S, "l1.cell.bezel.rect", r);
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int box[4] = { 0, 0, 0, 0 };
    for (int k = 0; k < CELLS; k++) if (strncmp(t->id, "cell.", 5) == 0 && strcmp(t->id + 5, v_pstr(v_fmt("regions.cells.%d.id", k))) == 0) { box[0] = boxes[k][0] + r[0]; box[1] = boxes[k][1] + r[1]; box[2] = r[2]; box[3] = r[3]; }
    focus_fill(t, "focus.targets", i, box);
  }
  return n;
}
static void ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur()); if (!*c) return;
  focus_target_t t[CELLS]; int n = library_focus(t, CELLS);
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0 && t[i].w > 0) { int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h }; v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "l1.focus.targets.cell", box); return; }
}

void library_words(void) {
  uint32_t now = anim_now(); if (!g_have) { g_have = 1; g_t0 = now; }
  g_level = kit_glint_level(S, "l1.cell.glint", now - g_t0, v_pbool("motion", 1));
  kit_stage(S, "l1.stage.rect", v_scol(S, "l1.stage.ground"), "stage", "stage.ground", "stage.picture", "regions.stage.picture");
  if (v_plen("regions.cells") != CELLS) { v_error("library: Level 1 is built for the sixteen species of l1.grid; another catalogue size comes back to UI/UX"); return; }
  kit_tiles(S, "l1.grid", CELLS, cell, NULL, NULL);
  ring();
}

/* a key on Level 1: ✓ ← and the room keys are intents on the focused cell; the pad moves the ring by l1.focus.graph and says `focus` */
void library_key(int code) { screens_key_graph(code, S, "l1.focus.graph", library_focus, NULL, &(screens_keys_t){ 0 }); }
