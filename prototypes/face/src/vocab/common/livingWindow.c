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

/* Home's glass and Idle's painting are one word: the spec's `bezel` (a housing round the glass: its rectangle path, or NULL for none: the part `inside`, with no bezel and no glass edges), the `glass` (its rectangle, ground band and foot at <glass>.rect, .ground and .foot)
   and `colours` (<colours>.back, .ground, .groundTop, .foot and, with a bezel, .edge; the bezel's own are `colours.bezel.*` of the same spec). `region` names the glass in the log ("glass" on Home, "vivarium" on Idle). */
static const char *g_spec;
static void wrect(const char *p, int r[4]) { if (!v_spec_rect(g_spec, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(g_spec, p, o, 24); return o; }

void word_livingWindow(const char *spec, const char *region, const char *bezel, const char *glass, const char *colours, const char *glassPicture) {
  g_spec = spec; int b[4] = { 0, 0, 0, 0 }, g[4], ground[4], foot[4]; char p[96], id[64];
  wrect(v_fmt("%s.rect", glass), g); wrect(v_fmt("%s.ground", glass), ground); wrect(v_fmt("%s.foot", glass), foot);
  if (bezel) {
    wrect(v_fmt("%s.rect", bezel), b);
    v_region("bezel", LAYER_CHROME);
    v_rect("bezel", b[0], b[1], b[2], b[3], colr("colours.bezel.fill"));
    v_rect("bezel.edge.t", b[0], b[1], b[2], 1, colr("colours.bezel.edge")); v_rect("bezel.edge.b", b[0], b[1] + b[3] - 1, b[2], 1, colr("colours.bezel.edge"));
    v_rect("bezel.edge.l", b[0], b[1], 1, b[3], colr("colours.bezel.edge")); v_rect("bezel.edge.r", b[0] + b[2] - 1, b[1], 1, b[3], colr("colours.bezel.edge"));
    v_rect("bezel.light.t", b[0] + 1, b[1] + 1, b[2] - 2, 1, colr("colours.bezel.light")); v_rect("bezel.light.l", b[0] + 1, b[1] + 1, 1, b[3] - 2, colr("colours.bezel.light"));
    v_rect("bezel.shade.b", b[0] + 1, b[1] + b[3] - 2, b[2] - 2, 1, colr("colours.bezel.shade")); v_rect("bezel.shade.r", b[0] + b[2] - 2, b[1] + 1, 1, b[3] - 2, colr("colours.bezel.shade"));
  }
  v_region(region, LAYER_CHROME);
#define NAME(s) (snprintf(id, sizeof id, "%s.%s", region, s), id)
#define COL(s) (snprintf(p, sizeof p, "%s.%s", colours, s), colr(p))
  v_rect(NAME("back"), g[0], g[1], g[2], g[3], COL("back"));
  v_rect(NAME("ground"), ground[0], ground[1], ground[2], ground[3], COL("ground")); v_rect(NAME("groundTop"), ground[0], ground[1], ground[2], 1, COL("groundTop"));
  v_rect(NAME("foot"), foot[0], foot[1], foot[2], foot[3], COL("foot"));
  if (bezel) {
    v_rect(NAME("edge.t"), g[0], g[1], g[2], 1, COL("edge")); v_rect(NAME("edge.b"), g[0], g[1] + g[3] - 1, g[2], 1, COL("edge"));
    v_rect(NAME("edge.l"), g[0], g[1], 1, g[3], COL("edge")); v_rect(NAME("edge.r"), g[0] + g[2] - 1, g[1], 1, g[3], COL("edge"));
  }
  if (glassPicture && *glassPicture) { v_name(region); v_sprite(NAME("master"), glassPicture, g[0], g[1], g[2], g[3]); }
#undef NAME
#undef COL
}
