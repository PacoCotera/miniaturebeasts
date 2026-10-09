/* The focus ring (station-layouts.md, "States shared by every screen"; lvgl-switch.md §2.2): one ring per screen in a palette role, composed by the face from the ring and tabRing ops, never a
   picture from the host. Forms, by the target group's `ring` in the screen spec: "round" (the default: a nine-slice of a composed 20 x 20 source, corners 1:1, the middle tiled), "feet" (the
   ellipse under a creature's feet), "tab" (the rail tab's ring) or { "circle": { "radius": r, "centre": [cx, cy] } } (fixed) or { "circle": { "outside": n } } (from the box). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include <stdio.h>
#include <string.h>

#define F "frame"
static int fi(const char *path, int dflt) { return spec_int(F, path, dflt); }

static void composed(const char *id, int x, int y, int w, int h, const char *ops) {
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0);
}
static void draw(const char *id, const int box[4], const char *shape, int circle, int fixedR, int cx, int cy, int cout, const char *colour);
/* box: the focused target's x, y, w, h. form: the path of the group's `ring` in `spec`, or NULL for the default. colour: a palette name. */
void word_focusRing(const char *id, const int box[4], const char *spec, const char *form, const char *colour) {
  char shape[16] = "round"; int circle = 0, fixedR = 0, cx = 0, cy = 0, cout = 0;
  if (form && spec_str(spec, form, shape, sizeof shape) == 0) {
    char p[160];
    snprintf(p, sizeof p, "%s.circle", form);
    if (spec_len(spec, p) >= 0) {
      circle = 1; snprintf(p, sizeof p, "%s.circle.radius", form); fixedR = spec_int(spec, p, 0);
      if (fixedR > 0) { snprintf(p, sizeof p, "%s.circle.centre.0", form); cx = spec_int(spec, p, 0); snprintf(p, sizeof p, "%s.circle.centre.1", form); cy = spec_int(spec, p, 0); }
      else { snprintf(p, sizeof p, "%s.circle.outside", form); cout = spec_int(spec, p, 0); }
    } else { char b[100]; snprintf(b, sizeof b, "word focusRing: %.40s is not a ring form", form); v_error(b); return; }
  }
  draw(id, box, shape, circle, fixedR, cx, cy, cout, colour);
}
/* the forms a word names itself (the rail's tab ring, a fixed circle, a circle from the box) */
void word_focusRingShape(const char *id, const int box[4], const char *shape, const char *colour) { draw(id, box, shape, 0, 0, 0, 0, 0, colour); }
void word_focusRingCircle(const char *id, const int box[4], int radius, int cx, int cy, int outside, const char *colour) { draw(id, box, "round", 1, radius, cx, cy, outside, colour); }

void word_focusRingFor(const char *id, const int box[4], const char *group, const char *colour) {
  char screen[32]; spec_str("props", "screen", screen, sizeof screen);
  for (int i = 0, n = spec_len(screen, "targets"); i < n; i++) {
    char key[48], dummy[2], g[32], p[96]; if (!spec_member(screen, "targets", i, key, sizeof key, dummy, sizeof dummy)) continue;
    snprintf(p, sizeof p, "targets.%s.group", key); spec_str(screen, p, g, sizeof g);
    if (strcmp(g, group) == 0) { snprintf(p, sizeof p, "targets.%s.ring", key); word_focusRing(id, box, screen, p, colour); return; }
  }
  word_focusRing(id, box, NULL, NULL, colour);
}
static void draw(const char *id, const int box[4], const char *shape, int circle, int fixedR, int cx, int cy, int cout, const char *colour) {
  char ops[320]; int x = box[0], y = box[1], w = box[2], h = box[3];
  int width = fi("focus.ring.width", 2), outside = fi("focus.ring.outside", 4), radius = fi("focus.ring.radius", 6);
  if (circle) {
    int rho, ox, oy;
    if (fixedR > 0) { rho = fixedR; ox = x + cx; oy = y + cy; } else { rho = (w >> 1) + cout; ox = x + (w >> 1); oy = y + (h >> 1); }
    snprintf(ops, sizeof ops, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", 2 * rho, 2 * rho, width, colour);
    v_layer(LAYER_ART); composed(id, ox - rho, oy - rho, 2 * rho, 2 * rho, ops);
  } else if (strcmp(shape, "feet") == 0) {
    int widen = fi("focus.feet.widen", 16), eh = fi("focus.feet.height", 24), ew = w + widen;
    snprintf(ops, sizeof ops, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", ew, eh, width, colour);
    v_layer(LAYER_ART); composed(id, x + ((w + 1) >> 1) - ((ew + 1) >> 1), y + h - ((eh + 1) >> 1), ew, eh, ops);
  } else if (strcmp(shape, "tab") == 0) {
    int slant = fi("focus.ring.tab.slant", 16), tout = fi("focus.ring.tab.outside", 4), top = fi("focus.ring.tab.top", 42), slantTo = fi("focus.ring.tab.slantTo", 80), bottom = fi("focus.ring.tab.bottom", 84), rb = fi("focus.ring.tab.radiusBottom", 6), tabTop = fi("regions.rail.y", 40);
    snprintf(ops, sizeof ops, "[[\"tabRing\",0,0,%d,%d,%d,%d,%d,%d,%d,%d,%d,\"%s\"]]", w, width, slant, tout, top, slantTo, bottom, rb, tabTop, colour);
    v_layer(LAYER_ART); composed(id, x - tout, top, w + 2 * tout + slant, bottom - top, ops);
  } else if (strcmp(shape, "round") == 0) {
    if (w < 8 || h < 8) { v_error("word focusRing: a target under 8 px on an axis cannot have a round ring"); return; }
    int S = 2 * (radius + width) + 4, inset = radius + width;
    snprintf(ops, sizeof ops, "[[\"ring\",\"round\",0,0,%d,%d,%d,%d,\"%s\"]]", S, S, width, radius, colour);
    int src = prim_source(ops, S, S);
    if (src < 0) { v_error("word focusRing: the ring's source picture is refused"); return; }
    v_layer(LAYER_CHROME); prim_node(v_id(id), FN_NINE, x - outside, y - outside, w + 2 * outside, h + 2 * outside, ((uint32_t)inset << 24) | ((uint32_t)inset << 16) | ((uint32_t)inset << 8) | (uint32_t)inset, src, 0);
  } else { char b[100]; snprintf(b, sizeof b, "word focusRing: %.40s is not a ring form", shape); v_error(b); }
}
