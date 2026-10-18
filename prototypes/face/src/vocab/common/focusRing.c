/* The focus ring (station-layouts.md, "States shared by every screen"; lvgl-switch.md §2.2; fix 14): one ring per screen, one solid cased line outside the object and parallel to its outline, composed by the
   face from the ring and tabRing ops, never a picture from the host. The target's `shape` in its screen spec picks the form: { "rect": r } (a nine-slice of a composed source, the object's radius r),
   { "rect": 0, "chip": n } (a text target, n px each side), "oval", { "circle": { "centre": [cx, cy], "r": r } } or { "circle": "box" }, "footprint" (a creature's feet on the ground) and "tab" (the rail tab);
   its ground is always the default (fix 14: one form; the paper ground is retired). The bands, gap, reach, colours and shapes are frame.json's focus.ring; a screen passes only the rect it drew and which target it is. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define F "frame"
#define RING "focus.ring"
static int fi(const char *path, int dflt) { return spec_int(F, path, dflt); }

typedef struct { int w[3], gap, reach; char key[24], core[24]; int hasKey; } bands_t;
/* the cased line's bands and the colours of the target's ground */
static int read_bands(const char *ground, bands_t *b) {
  char p[96];
  for (int k = 0; k < 3; k++) { snprintf(p, sizeof p, RING ".bands.%d.w", k); b->w[k] = fi(p, 0); }
  b->gap = fi(RING ".gap", 1); b->reach = fi(RING ".reach", 5);
  if (b->w[0] < 1 || b->w[1] < 1 || b->w[2] < 1 || b->reach != b->gap + b->w[0] + b->w[1] + b->w[2]) { v_error("word focusRing: frame focus.ring bands, gap and reach do not agree"); return -1; }
  snprintf(p, sizeof p, RING ".colours.%s.core", ground); spec_str(F, p, b->core, sizeof b->core);
  snprintf(p, sizeof p, RING ".colours.%s.key", ground); b->hasKey = spec_str(F, p, b->key, sizeof b->key) > 0;
  if (!b->core[0]) { char m[100]; snprintf(m, sizeof m, "word focusRing: frame focus.ring.colours.%.30s has no core", ground); v_error(m); return -1; }
  return 0;
}
static void composed(const char *id, int x, int y, int w, int h, const char *ops) {
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0);
}
/* the three bands as ops of one shape in a W x H picture, each band's ring at the inset of the bands inside it; the key bands are left out on a ground that has none */
static int bands_ops(char *ops, int cap, const char *shape, int W, int H, int R, const bands_t *b, const int insets[3], const int widths[3]) {
  int n = snprintf(ops, (size_t)cap, "["), first = 1;
  for (int k = 0; k < 3; k++) {
    int isKey = k != 1; if (isKey && !b->hasKey) continue;
    int rad = strcmp(shape, "round") == 0 ? R - insets[k] : 0;
    n += snprintf(ops + n, (size_t)(cap - n), "%s[\"ring\",\"%s\",%d,%d,%d,%d,%d,%d,\"%s\"]", first ? "" : ",", shape, insets[k], insets[k], W - 2 * insets[k], H - 2 * insets[k], widths[k], rad, isKey ? b->key : b->core);
    first = 0;
  }
  snprintf(ops + n, (size_t)(cap - n), "]"); return 0;
}
static void ground_of(const char *spec, const char *target, char *g, int cap) { (void)spec; (void)target; snprintf(g, (size_t)cap, "default"); }   /* one form on every ground: the paper ground is retired (specs/station-library-spec.md) */

/* a rect ring round `r` (the object's drawn rect), the object's corner radius `rad`: a nine-slice of S = 2R + 4 with R = rad + reach */
static void ring_rect(const char *id, const int r[4], int rad, int chip, const bands_t *b) {
  int R = rad + b->reach, S = 2 * R + 4, x = r[0] - chip - b->reach, y = r[1] - b->reach, w = r[2] + 2 * chip + 2 * b->reach, h = r[3] + 2 * b->reach;
  if (w < 2 * R || h < 2 * R) { v_error("word focusRing: a ring box under 2R on an axis cannot be drawn"); return; }
  int ins[3] = { 0, b->w[0], b->w[0] + b->w[1] }; char ops[400]; bands_ops(ops, sizeof ops, "round", S, S, R, b, ins, b->w);
  int src = prim_source(ops, S, S);
  if (src < 0) { v_error("word focusRing: the ring's source picture is refused"); return; }
  prim_node(v_id(id), FN_NINE, x, y, w, h, ((uint32_t)R << 24) | ((uint32_t)R << 16) | ((uint32_t)R << 8) | (uint32_t)R, src, 0);
}
/* an ellipse ring in the box (x, y, W, H) */
static void ring_ellipse(const char *id, int x, int y, int W, int H, const bands_t *b, const int insets[3], const int widths[3]) {
  if (W < 8 || H < 8) { v_error("word focusRing: an ellipse ring under 8 px on an axis cannot be drawn"); return; }
  char ops[400]; bands_ops(ops, sizeof ops, "ellipse", W, H, 0, b, insets, widths); composed(id, x, y, W, H, ops);
}
static void ring_tab(const char *id, const int r[4], const bands_t *b) {
  char p[96]; int slant = fi(RING ".shapes.tab.slant", 16), slantTo = fi(RING ".shapes.tab.slantTo", 80), tabTop = fi("regions.rail.y", 40), out[3], top[3], bot[3], rad[3];
  for (int k = 0; k < 3; k++) {
    snprintf(p, sizeof p, RING ".shapes.tab.outside.%d", k); out[k] = fi(p, 0); snprintf(p, sizeof p, RING ".shapes.tab.top.%d", k); top[k] = fi(p, 0);
    snprintf(p, sizeof p, RING ".shapes.tab.bottom.%d", k); bot[k] = fi(p, 0); snprintf(p, sizeof p, RING ".shapes.tab.radius.%d", k); rad[k] = fi(p, 0);
  }
  int W = r[2] + 2 * out[0] + slant, H = bot[0] - top[0]; char ops[640]; int n = snprintf(ops, sizeof ops, "["), first = 1;
  for (int k = 0; k < 3; k++) {
    int isKey = k != 1; if (isKey && !b->hasKey) continue;
    int d = top[k] - top[0];   /* the band's picture offset: its top edge under the outer key's */
    n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"tabRing\",%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,\"%s\"]", first ? "" : ",", out[0] - out[k], d, r[2], b->w[k], slant, out[k], top[k], slantTo, bot[k], rad[k], tabTop, isKey ? b->key : b->core);
    first = 0;
  }
  snprintf(ops + n, sizeof ops - (size_t)n, "]");
  composed(id, r[0] - out[0], top[0], W, H, ops);
}

/* A creature ring's weight by the light (the 2 px floor, fix 14 §14.4): frame.json focus.ring.shapes.footprint.weight maps each light to "default" or "light". When the four agree, that is the weight and no light is read;
   when they differ, the light is the suffix of the picture id (:dawn, :dusk, :night; a day id has none): 1 for "light", 0 for "default", -1 for a suffix that names no light. */
static int footprint_light(const char *picture) {
  static const char *L[4] = { "dawn", "day", "dusk", "night" }; char w[4][12]; int same = 1;
  for (int k = 0; k < 4; k++) { char p[96]; snprintf(p, sizeof p, RING ".shapes.footprint.weight.%s", L[k]); if (spec_str(F, p, w[k], sizeof w[k]) <= 0) snprintf(w[k], sizeof w[k], "default"); if (strcmp(w[k], w[0])) same = 0; }
  if (same) return strcmp(w[0], "light") == 0;
  const char *at = picture ? strrchr(picture, ':') : NULL; int k = 1;   /* day */
  if (at) { at++; if (!strcmp(at, "dawn")) k = 0; else if (!strcmp(at, "dusk")) k = 2; else if (!strcmp(at, "night")) k = 3; else { int alpha = *at != 0; for (const char *q = at; *q; q++) if (*q < 'a' || *q > 'z') alpha = 0; if (alpha && strcmp(at, "species")) return -1; } }
  return strcmp(w[k], "light") == 0;
}
/* The shape of a target: 0 on a kind drawn, -1 (with the error sent) otherwise. */
static void ring_of(const char *id, const char *spec, const char *target, const int r[4], const int foot[3], const char *light, int mirrored) {
  char p[176], g[12], shape[16]; ground_of(spec, target, g, sizeof g);
  bands_t b; if (read_bands(g, &b) < 0) return;
  int ins[3] = { 0, b.w[0], b.w[0] + b.w[1] };
  snprintf(p, sizeof p, "%s.shape", target);
  if (spec_str(spec, p, shape, sizeof shape) > 0) {   /* a form named by a word */
    if (strcmp(shape, "oval") == 0) { ring_ellipse(id, r[0] - b.reach, r[1] - b.reach, r[2] + 2 * b.reach, r[3] + 2 * b.reach, &b, ins, b.w); return; }
    if (strcmp(shape, "tab") == 0) { ring_tab(id, r, &b); return; }
    if (strcmp(shape, "footprint") == 0) {
      if (!foot) { char m[120]; snprintf(m, sizeof m, "word focusRing: no footprint for %.60s", id); v_error(m); return; }
      int w = foot[2], fh = 2 * v_fdiv(w + 6, 12); { int lo = fi(RING ".shapes.footprint.hMin", 6), hi = fi(RING ".shapes.footprint.hMax", 16); if (fh < lo) fh = lo; if (fh > hi) fh = hi; }
      int lw = footprint_light(light); if (lw < 0) { char m[120]; snprintf(m, sizeof m, "word focusRing: unknown light on %.60s", light); v_error(m); return; }
      int W = w + 10, H = fh + 10, x = r[0] + (mirrored ? r[2] - foot[0] - w : foot[0]) - 5, y = r[1] + foot[1] - H / 2;
      if (lw) { int li[3], wd[3]; for (int k = 0; k < 3; k++) { snprintf(p, sizeof p, RING ".shapes.footprint.light.insets.%d", k); li[k] = fi(p, k + 1); snprintf(p, sizeof p, RING ".shapes.footprint.light.widths.%d", k); wd[k] = fi(p, 1); } ring_ellipse(id, x, y, W, H, &b, li, wd); }
      else ring_ellipse(id, x, y, W, H, &b, ins, b.w);
      return;
    }
    char m[100]; snprintf(m, sizeof m, "word focusRing: %.40s is not a ring shape", shape); v_error(m); return;
  }
  snprintf(p, sizeof p, "%s.shape.rect", target);
  if (spec_len(spec, p) < 0 && spec_int(spec, p, -1) >= 0) {
    int rad = spec_int(spec, p, 0); snprintf(p, sizeof p, "%s.shape.chip", target); ring_rect(id, r, rad, spec_int(spec, p, 0), &b); return;
  }
  snprintf(p, sizeof p, "%s.shape.circle", target);
  {
    char c[8];
    if (spec_str(spec, p, c, sizeof c) > 0 && strcmp(c, "box") == 0) {
      int rho = (r[2] >> 1) + b.reach, ox = r[0] + (r[2] >> 1), oy = r[1] + (r[3] >> 1); ring_ellipse(id, ox - rho, oy - rho, 2 * rho, 2 * rho, &b, ins, b.w); return;
    }
    if (spec_len(spec, p) >= 0) {
      char q[190]; snprintf(q, sizeof q, "%s.r", p); int rho = spec_int(spec, q, 0) + b.reach; snprintf(q, sizeof q, "%s.centre.0", p); int cx = spec_int(spec, q, 0); snprintf(q, sizeof q, "%s.centre.1", p); int cy = spec_int(spec, q, 0);
      ring_ellipse(id, r[0] + cx - rho, r[1] + cy - rho, 2 * rho, 2 * rho, &b, ins, b.w); return;
    }
  }
  char m[120]; snprintf(m, sizeof m, "word focusRing: %.80s has no ring shape", target); v_error(m);
}

/* The ring is drawn on the layer the caller set (chrome, by every screen): a ring has no layer of its own.
   target: the path of the target's entry in `spec`; drawn: the object's rect as the screen drew it this frame (lifted where it lifts). */
void word_focusRing(const char *id, const char *spec, const char *target, const int drawn[4]) { ring_of(id, spec, target, drawn, NULL, NULL, 0); }

/* A creature's ring: its footprint on the ground, from the `foot` the host measured for the picture as drawn. `cell`: "stand", "curl", "shadow" or "" (the whole picture); drawn: the picture's box, not lifted. */
void word_focusRingFootprint(const char *id, const char *spec, const char *target, const char *picture, const char *cell, const int drawn[4]) {
  char name[12]; snprintf(name, sizeof name, "%s", cell); size_t cl = strlen(name); int mirrored = cl > 2 && !strcmp(name + cl - 2, "-m"); if (mirrored) name[cl - 2] = 0;   /* "stand-m": the mirrored cell, x is cellW − x − w */
  int c = !strcmp(name, "stand") ? 1 : !strcmp(name, "curl") ? 2 : !strcmp(name, "shadow") ? 3 : 0, foot[3];
  if (!wire_asset_foot(wire_asset_slot(picture), c, foot)) { char m[120]; snprintf(m, sizeof m, "word focusRing: no footprint for %.60s", picture); v_error(m); return; }
  ring_of(id, spec, target, drawn, foot, picture, mirrored);
}

/* A figure's ring (T-20261018-235, build-spec §1): the footprint form on the figure the host measured (its drawn bbox, the shadow left out): the ellipse (W + 10) x (fh + 10), fh = 2 floor((W + 6) / 12) held to 6..16, centred on
   the feet point F = (fx, feetY), W the figure's width. `picture` names the light as a footprint's does. The ring stays on the ground: the caller gives the unlifted feet. */
void word_focusRingFigure(const char *id, const char *spec, const char *target, const char *picture, int fx, int feetY, int W) {
  int foot[3] = { fx - W / 2, feetY, W }, r[4] = { 0, 0, 0, 0 };
  ring_of(id, spec, target, r, foot, picture, 0);
}

/* the ring of the target group of the screen in props (the rail's, Pods'): the target whose `group` this is */
void word_focusRingFor(const char *id, const int drawn[4], const char *group) {
  char screen[32]; spec_str("props", "screen", screen, sizeof screen);
  for (int i = 0, n = spec_len(screen, "targets"); i < n; i++) {
    char key[48], dummy[2], g[32], p[96]; if (!spec_member(screen, "targets", i, key, sizeof key, dummy, sizeof dummy)) continue;
    snprintf(p, sizeof p, "targets.%s.group", key); spec_str(screen, p, g, sizeof g);
    if (strcmp(g, group) == 0) { snprintf(p, sizeof p, "targets.%s", key); ring_of(id, screen, p, drawn, NULL, NULL, 0); return; }
  }
  v_error("word focusRing: the screen's spec names no target of that group");
}
