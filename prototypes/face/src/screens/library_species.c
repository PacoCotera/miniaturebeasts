/* The Library's Level 2 (library.json `l2`, the screen `library.species`, states sheet and lit): a binding table. The stage (kit_stage on l1.stage, as on Level 1); the sheet picture at l2.picture.rect (the sheet, or its lit
   variant in lit, as the props name it); up to eight glints (kit_glint) at the generator's glint centres plus the sheet's origin; the shelf (kit_bezel with its top band) with its title, the wish row, the face row and the
   sittings row; the Families shelf (kit_bezel) and its faces (kit_tiles on l2.families); the chapter page (lit); the ring (word_focusRing on l2.focus.targets.<kind>). Every node is drawn in the same order in every state: a part the
   state does not show is a node of no size (in lit every shelf node, on met-only every shelf node, glint and the page). Every rect, colour and picture id is the spec's; the props name what (pictures, names, flags) and give the
   generator's facts in sheet or page coordinates (the plates, the glint centres, the page's discs), to which the face adds the sheet's or the page's origin. The pad walks l2.focus.<state>; the glints fade on the face's own clock
   from the frame Level 2 was first drawn in (solid under reduced motion). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../anim/anim.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <string.h>

#define S "library"
#define GLINTS 8
#define WISH 4
#define SITS 9
#define FAMILY 8
#define TARGETS 64

/* ---- the glints' clock: from the first frame Level 2 is drawn in; again from the start when another screen shows ---- */
static uint32_t g_t0; static int g_have, g_level = -1;
void species_hidden(void) { g_have = 0; g_level = -1; }
static int on_l2(void) { return strcmp(v_pstr("screen"), "library.species") == 0 && !v_pbool("idle", 0) && spec_has(S) && spec_len("props", "regions") >= 0; }
int library_l2_tick(uint32_t now) { return on_l2() && g_have && v_pbool("motion", 1) && v_plen("regions.sheet.glints") > 0 && !v_pbool("regions.sheet.met", 0) && kit_glint_level(S, v_sstr(S, "l2.glint.clock"), now - g_t0, 1) != g_level; }

/* ---- the shelf's geometry (library.json l2.shelf.height, l2.families): w the wish pieces, s the sittings, n the family faces ---- */
typedef struct { int shown, w, s, n, face, h, yf, ys, yr, hr; } shelf_t;
static shelf_t shelf_of(void) {
  shelf_t o; o.shown = v_pbool("regions.shelf.shown", 0); o.w = v_plen("regions.shelf.wish"); if (o.w < 0) o.w = 0; if (o.w > WISH) o.w = WISH;
  o.s = v_pint("regions.shelf.sittings", 0); if (o.s > SITS) o.s = SITS; o.n = v_plen("regions.shelf.families"); if (o.n < 0) o.n = 0; if (o.n > FAMILY) o.n = FAMILY;
  o.face = spec_len("props", "regions.shelf.face") > 0;
  int top = v_sk(S, "l2.shelf.rect", 1), head = v_si(S, "l2.shelf.height.head", 0), gap = v_si(S, "l2.shelf.height.gap", 0), pitch = v_si(S, "l2.shelf.wish.pitch", 0), after = v_si(S, "l2.shelf.height.afterWish", 0), fs = v_si(S, "l2.shelf.face.picture.size", 0);
  o.yf = top + head + gap + pitch * o.w + after; o.ys = o.yf + fs + 16;
  o.h = head + gap + pitch * o.w + after + fs + (o.s > 0 ? v_si(S, "l2.shelf.sittings.row", 0) : 0) + v_si(S, "l2.shelf.height.pad", 0);
  o.yr = top + o.h + v_si(S, "l2.families.gap", 0);
  int rows = o.n > v_sk(S, "l2.families.grid", 0) ? 2 : 1; o.hr = v_si(S, "l2.families.head", 0) + v_si(S, "l2.families.rowGap", 0) + v_si(S, "l2.families.rowPitch", 0) * rows + v_si(S, "l2.families.pad", 0);
  return o;
}
/* a label or a line of the shelf at lineTop y: its text when shown, else the node with no size */
static void line(const char *id, const char *s, int x, int y, const char *colour, int align, int clip) {
  char cut[V_STR + 4]; int px = 16; if (clip > 0) { v_clip(s, clip, px, cut, sizeof cut); s = cut; }
  v_region("shelf", LAYER_TYPE); v_line_at(id, s, x, y, V_ANCHOR_LINE, px, colour, align);
}
/* a shelf (kit_bezel with its top band), or its panel's node with no size when hidden (kit_bezel has no hidden form: the hidden part is the panel's slot, as Level 1's hidden glint is the star's) */
static void shelf_bezel(const char *id, int x, int y, int w, int h, int shown) {
  char fill[24], bandFill[24], bandRule[24]; snprintf(fill, sizeof fill, "%s", v_scol(S, "l2.shelf.fill")); snprintf(bandFill, sizeof bandFill, "%s", v_scol(S, "l2.shelf.band.fill")); snprintf(bandRule, sizeof bandRule, "%s", v_scol(S, "l2.shelf.band.rule"));
  kit_band_t band = { v_si(S, "l2.shelf.band.side", 0), v_si(S, "l2.shelf.band.h", 0), bandFill, bandRule };
  if (shown) { v_region("shelf", LAYER_CHROME); kit_bezel(id, x, y, w, h, v_si(S, "l2.shelf.radius", 1), fill, NULL, NULL, &band); }
  else { v_name("shelf"); v_slot(v_fmt("%s.panel", id), v_sstr(S, "l2.glint.slice"), NULL, x, y, 0, 0, 0); }
}

/* ---- one family face (kit_tiles on l2.families: the tile's y is the Families shelf's top plus the tile's own) ---- */
typedef struct { shelf_t sh; } fam_ctx;
static void family(int j, const int b[4], void *vctx) {
  const fam_ctx *c = vctx; int on = c->sh.shown && j < c->sh.n, x = b[0], y = c->sh.yr + b[1];
  char pic[96], name[V_STR]; snprintf(pic, sizeof pic, "%s", on ? v_pstr(v_fmt("regions.shelf.families.%d.picture", j)) : ""); snprintf(name, sizeof name, "%s", on ? v_pstr(v_fmt("regions.shelf.families.%d.name", j)) : "");
  v_name("shelf"); v_slot(v_fmt("family.%d.picture", j), pic, v_sstr(S, "l2.glint.slice"), x, y, b[2], b[3], on && *pic);
  line(v_fmt("family.%d.name", j), name, x + v_si(S, "l2.families.name.dx", 0), y + v_si(S, "l2.families.name.dy", 0), v_scol(S, "l2.families.name.colour"), V_ALIGN_CENTRE, v_si(S, "l2.families.name.clip", 0));
}

/* ---- the focus: the open plates, the shelf (sheet) or the lit chapter's found looks (lit), each its box as drawn ---- */
static void no_draw(int i, const int b[4], void *ctx) { (void)i; (void)b; (void)ctx; }
int species_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap; if (n < 0) n = 0;
  shelf_t sh = shelf_of(); int sx = v_sk(S, "l2.picture.rect", 0), sy = v_sk(S, "l2.picture.rect", 1), px = v_sk(S, "l2.page.rect", 0), py = v_sk(S, "l2.page.rect", 1), boxes[FAMILY][4];
  if (kit_tiles(S, "l2.families", FAMILY, no_draw, NULL, boxes) < 0) return 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int box[4] = { 0, 0, 0, 0 };
    if (strncmp(t->id, "chapter.", 8) == 0) { for (int k = 0, m = v_plen("regions.sheet.plates"); k < m; k++) if (strcmp(v_pstr(v_fmt("regions.sheet.plates.%d.id", k)), t->id) == 0) for (int q = 0; q < 4; q++) box[q] = v_pint(v_fmt("regions.sheet.plates.%d.rect.%d", k, q), 0) + (q == 0 ? sx : q == 1 ? sy : 0); }
    else if (strncmp(t->id, "look.", 5) == 0) { for (int k = 0, m = v_plen("regions.page.discs"); k < m; k++) if (strcmp(v_pstr(v_fmt("regions.page.discs.%d.id", k)), t->id) == 0) for (int q = 0; q < 4; q++) box[q] = v_pint(v_fmt("regions.page.discs.%d.rect.%d", k, q), 0) + (q == 0 ? px : q == 1 ? py : 0); }
    else if (strcmp(t->id, "wish") == 0) { v_srect(S, "l2.shelf.wish.focus.rect", box); box[3] += v_si(S, "l2.shelf.wish.pitch", 0) * sh.w; }
    else if (strcmp(t->id, "face") == 0) { box[0] = v_si(S, "l2.shelf.face.picture.x", 0); box[1] = sh.yf; box[2] = box[3] = v_si(S, "l2.shelf.face.picture.size", 0); }
    else if (strncmp(t->id, "family.", 7) == 0) { for (int k = 0; k < sh.n; k++) if (strcmp(v_fmt("family.%d", v_pint(v_fmt("regions.shelf.families.%d.id", k), -1)), t->id) == 0) { box[0] = boxes[k][0]; box[1] = sh.yr + boxes[k][1]; box[2] = boxes[k][2]; box[3] = boxes[k][3]; } }
    focus_fill(t, "focus.targets", i, box);
  }
  return n;
}
static void ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur()); if (!*c) return;
  focus_target_t t[TARGETS]; int n = species_focus(t, TARGETS);
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0 && t[i].w > 0) {
    const char *kind = strncmp(c, "chapter.", 8) == 0 ? "chapter" : strncmp(c, "look.", 5) == 0 ? "look" : strncmp(c, "family.", 7) == 0 ? "family" : c;
    int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h }; v_region("focus", LAYER_CHROME); word_focusRing("focus", S, v_fmt("l2.focus.targets.%s", kind), box); return;
  }
}

void library_species_words(void) {
  uint32_t now = anim_now(); if (!g_have) { g_have = 1; g_t0 = now; }
  char star[96]; snprintf(star, sizeof star, "%s", v_sstr(S, "l2.glint.slice"));
  int met = v_pbool("regions.sheet.met", 0), r[4];
  g_level = kit_glint_level(S, v_sstr(S, "l2.glint.clock"), now - g_t0, v_pbool("motion", 1));
  /* the stage's nodes are Level 2's own: going from Level 1 the old ground is dropped first, so its whole box is redrawn once, not each of Level 1's sixteen cells (LVGL keeps 128 invalid areas a refresh) */
  kit_stage(S, "l1.stage.rect", v_scol(S, "l1.stage.ground"), "stage", "species.stage.ground", "species.stage.picture", "regions.stage.picture");
  /* the sheet (or its lit variant), then the glints at the generator's centres plus the sheet's origin */
  v_srect(S, "l2.picture.rect", r);
  { char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr("regions.sheet.picture")); v_name("sheet"); v_slot("sheet.picture", pic, star, r[0], r[1], r[2], r[3], *pic != 0); }
  { int n = met ? 0 : v_plen("regions.sheet.glints"), gw = v_sk(S, "l2.glint.size", 0), gh = v_sk(S, "l2.glint.size", 1);
    for (int i = 0; i < GLINTS; i++) { char id[24]; snprintf(id, sizeof id, "sheet.glint.%d", i); int cx = r[0], cy = r[1];
      if (i < n) { cx += v_pint(v_fmt("regions.sheet.glints.%d.0", i), 0); cy += v_pint(v_fmt("regions.sheet.glints.%d.1", i), 0); }
      v_name("sheet"); if (i < n) kit_glint(id, star, cx, cy, gw, gh, g_level); else v_slot(id, star, NULL, cx, cy, 0, 0, 0); } }
  /* the shelf: Unlocked, its title, the wish row, the face row, the sittings row */
  shelf_t sh = shelf_of(); int on = sh.shown, sx = v_sk(S, "l2.shelf.rect", 0), sy = v_sk(S, "l2.shelf.rect", 1), sw = v_sk(S, "l2.shelf.rect", 2);
  char fog[24], bone[24]; snprintf(fog, sizeof fog, "%s", v_scol(S, "l2.shelf.title.colour")); snprintf(bone, sizeof bone, "%s", v_scol(S, "l2.shelf.face.name.colour"));
  shelf_bezel("shelf.unlocked", sx, sy, sw, sh.h, on);
  line("shelf.unlocked.title", on ? v_sstr(S, "l2.strings.shelf.unlocked") : "", v_si(S, "l2.shelf.title.x", 0), v_si(S, "l2.shelf.title.lineTop", 0), fog, V_ALIGN_LEFT, 0);
  line("shelf.wish.label", on && sh.w ? v_sstr(S, "l2.strings.shelf.wish") : "", v_si(S, "l2.shelf.wish.label.x", 0), v_si(S, "l2.shelf.wish.label.lineTop", 0), fog, V_ALIGN_LEFT, 0);
  for (int k = 0; k < WISH; k++) {
    int p = on && k < sh.w, dy = v_si(S, "l2.shelf.wish.pitch", 0) * k; char disc[96], word[V_STR], col[24];
    snprintf(disc, sizeof disc, "%s", p ? v_pstr(v_fmt("regions.shelf.wish.%d.disc", k)) : ""); snprintf(word, sizeof word, "%s", p ? v_pstr(v_fmt("regions.shelf.wish.%d.word", k)) : "");
    snprintf(col, sizeof col, "%s", v_scol(S, p && v_pbool(v_fmt("regions.shelf.wish.%d.carried", k), 0) ? "l2.shelf.wish.word.colour.carried" : "l2.shelf.wish.word.colour.not"));
    v_name("shelf"); v_slot(v_fmt("shelf.wish.%d.disc", k), disc, star, v_sk(S, "l2.shelf.wish.disc.at", 0), v_sk(S, "l2.shelf.wish.disc.at", 1) + dy, v_sk(S, "l2.shelf.wish.disc.size", 0), v_sk(S, "l2.shelf.wish.disc.size", 1), p && *disc);
    v_name("shelf"); v_slot(v_fmt("shelf.wish.%d.star", k), v_sstr(S, "l2.shelf.wish.star.slice"), star, v_sk(S, "l2.shelf.wish.star.at", 0), v_sk(S, "l2.shelf.wish.star.at", 1) + dy, v_sk(S, "l2.shelf.wish.star.size", 0), v_sk(S, "l2.shelf.wish.star.size", 1), p);
    line(v_fmt("shelf.wish.%d.word", k), word, v_si(S, "l2.shelf.wish.word.x", 0), v_si(S, "l2.shelf.wish.word.lineTop", 0) + dy, col, V_ALIGN_LEFT, v_si(S, "l2.shelf.wish.word.clip", 0));
  }
  { int f = on && sh.face, fs = v_si(S, "l2.shelf.face.picture.size", 0); char pic[96], name[V_STR]; snprintf(pic, sizeof pic, "%s", f ? v_pstr("regions.shelf.face.picture") : ""); snprintf(name, sizeof name, "%s", f ? v_pstr("regions.shelf.face.name") : "");
    line("shelf.face.label", f ? v_sstr(S, "l2.strings.shelf.face") : "", v_si(S, "l2.shelf.face.label.x", 0), sh.yf + v_si(S, "l2.shelf.face.label.dy", 0), fog, V_ALIGN_LEFT, 0);
    v_name("shelf"); v_slot("shelf.face.picture", pic, star, v_si(S, "l2.shelf.face.picture.x", 0), sh.yf, fs, fs, f && *pic);
    line("shelf.face.name", name, v_si(S, "l2.shelf.face.name.x", 0), sh.yf + v_si(S, "l2.shelf.face.name.dy", 0), bone, V_ALIGN_LEFT, v_si(S, "l2.shelf.face.name.clip", 0)); }
  { int s = on ? sh.s : 0;
    line("shelf.sit.label", s ? v_sstr(S, "l2.strings.shelf.sittings") : "", v_si(S, "l2.shelf.sittings.label.x", 0), sh.ys + v_si(S, "l2.shelf.sittings.label.dy", 0), fog, V_ALIGN_LEFT, 0);
    for (int k = 0; k < SITS; k++) { v_name("shelf"); v_slot(v_fmt("shelf.sit.%d", k), v_sstr(S, "l2.shelf.sittings.slice"), star, v_si(S, "l2.shelf.sittings.x0", 0) + v_si(S, "l2.shelf.sittings.pitch", 0) * k, sh.ys + v_si(S, "l2.shelf.sittings.dy", 0), v_sk(S, "l2.shelf.sittings.size", 0), v_sk(S, "l2.shelf.sittings.size", 1), k < s); } }
  /* the Families shelf and its faces */
  { int f = on && sh.n > 0; shelf_bezel("shelf.families", v_si(S, "l2.families.x", 0), sh.yr, v_si(S, "l2.families.w", 0), sh.hr, f);
    line("shelf.families.title", f ? v_sstr(S, "l2.strings.shelf.families") : "", v_si(S, "l2.families.title.x", 0), sh.yr + v_si(S, "l2.families.title.dy", 0), fog, V_ALIGN_LEFT, 0);
    fam_ctx c = { sh }; c.sh.shown = f; kit_tiles(S, "l2.families", FAMILY, family, &c, NULL); }
  /* the chapter page (lit), after the shelf */
  { char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr("regions.page.picture")); v_srect(S, "l2.page.rect", r); v_name("page"); v_slot("page.picture", pic, star, r[0], r[1], r[2], r[3], *pic != 0); }
  ring();
}

/* a key on Level 2: ✓ ← and the room keys are intents on the focused target; the pad moves the ring by l2.focus.<state> and says `focus` */
void library_species_key(int code) {
  char g[32]; snprintf(g, sizeof g, "l2.focus.%s", strcmp(v_pstr("state"), "lit") == 0 ? "lit" : "sheet");
  screens_key_graph(code, S, g, species_focus, NULL, &(screens_keys_t){ 0 });
}
