/* The living window word (station-layouts.md "Home: the panel and the column"; vocabulary (closed), lvgl-switch.md §2.2): the bezel (the housing round the glass) and the glass, flat plates in the colours of the `home` spec until the glass master is placed.
   A picture the host has not sent is a slot not yet filled: nothing is drawn and the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define H "home"
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(H, p, o, 24); return o; }

/* the living window: the bezel (the housing round the glass) and the glass (a flat plate until its master: back, the ground band with its top row, the foot), then the glass master over it */
void word_livingWindow(const char *screen, const char *bezel, const char *glass, const char *glassPicture) {
  (void)screen; int b[4], g[4], ground[4], foot[4];
  hrect(v_fmt("regions.%s.rect", bezel), b); hrect(v_fmt("regions.%s.rect", glass), g); hrect(v_fmt("regions.%s.ground", glass), ground); hrect(v_fmt("regions.%s.foot", glass), foot);
  v_region("bezel", LAYER_CHROME);
  v_rect("bezel", b[0], b[1], b[2], b[3], colr("colours.bezel.fill"));
  v_rect("bezel.edge.t", b[0], b[1], b[2], 1, colr("colours.bezel.edge")); v_rect("bezel.edge.b", b[0], b[1] + b[3] - 1, b[2], 1, colr("colours.bezel.edge"));
  v_rect("bezel.edge.l", b[0], b[1], 1, b[3], colr("colours.bezel.edge")); v_rect("bezel.edge.r", b[0] + b[2] - 1, b[1], 1, b[3], colr("colours.bezel.edge"));
  v_rect("bezel.light.t", b[0] + 1, b[1] + 1, b[2] - 2, 1, colr("colours.bezel.light")); v_rect("bezel.light.l", b[0] + 1, b[1] + 1, 1, b[3] - 2, colr("colours.bezel.light"));
  v_rect("bezel.shade.b", b[0] + 1, b[1] + b[3] - 2, b[2] - 2, 1, colr("colours.bezel.shade")); v_rect("bezel.shade.r", b[0] + b[2] - 2, b[1] + 1, 1, b[3] - 2, colr("colours.bezel.shade"));
  v_region("glass", LAYER_CHROME);
  v_rect("glass.back", g[0], g[1], g[2], g[3], colr("colours.glass.back"));
  v_rect("glass.ground", ground[0], ground[1], ground[2], ground[3], colr("colours.glass.ground")); v_rect("glass.groundTop", ground[0], ground[1], ground[2], 1, colr("colours.glass.groundTop"));
  v_rect("glass.foot", foot[0], foot[1], foot[2], foot[3], colr("colours.glass.foot"));
  v_rect("glass.edge.t", g[0], g[1], g[2], 1, colr("colours.glass.edge")); v_rect("glass.edge.b", g[0], g[1] + g[3] - 1, g[2], 1, colr("colours.glass.edge"));
  v_rect("glass.edge.l", g[0], g[1], 1, g[3], colr("colours.glass.edge")); v_rect("glass.edge.r", g[0] + g[2] - 1, g[1], 1, g[3], colr("colours.glass.edge"));
  if (glassPicture && *glassPicture) { v_name("glass"); v_sprite("glass.master", glassPicture, g[0], g[1], g[2], g[3]); }
}

