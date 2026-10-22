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

void word_livingWindow(const char *spec, const char *region, const char *bezel, const char *glass, const char *colours, const char *glassPicture, int sx, int sy) {
  g_spec = spec; int b[4] = { 0, 0, 0, 0 }, g[4], ground[4], foot[4]; char p[96], id[64];
  v_srect(g_spec, v_fmt("%s.rect", glass), g); v_srect(g_spec, v_fmt("%s.ground", glass), ground); v_srect(g_spec, v_fmt("%s.foot", glass), foot);
  if (bezel) {
    v_srect(g_spec, v_fmt("%s.rect", bezel), b);
    v_region("bezel", LAYER_CHROME);
    v_rect("bezel", b[0], b[1], b[2], b[3], v_scol(g_spec, "colours.bezel.fill"));
    v_rect("bezel.edge.t", b[0], b[1], b[2], 1, v_scol(g_spec, "colours.bezel.edge")); v_rect("bezel.edge.b", b[0], b[1] + b[3] - 1, b[2], 1, v_scol(g_spec, "colours.bezel.edge"));
    v_rect("bezel.edge.l", b[0], b[1], 1, b[3], v_scol(g_spec, "colours.bezel.edge")); v_rect("bezel.edge.r", b[0] + b[2] - 1, b[1], 1, b[3], v_scol(g_spec, "colours.bezel.edge"));
    v_rect("bezel.light.t", b[0] + 1, b[1] + 1, b[2] - 2, 1, v_scol(g_spec, "colours.bezel.light")); v_rect("bezel.light.l", b[0] + 1, b[1] + 1, 1, b[3] - 2, v_scol(g_spec, "colours.bezel.light"));
    v_rect("bezel.shade.b", b[0] + 1, b[1] + b[3] - 2, b[2] - 2, 1, v_scol(g_spec, "colours.bezel.shade")); v_rect("bezel.shade.r", b[0] + b[2] - 2, b[1] + 1, 1, b[3] - 2, v_scol(g_spec, "colours.bezel.shade"));
  }
  int painted = glassPicture && *glassPicture && wire_asset_slot(glassPicture) >= 0;   /* the light's painting is on the face: the flat plates stand only while its slot is empty; painted, they are the same nodes with no size, so the node ids never change */
  v_region(region, LAYER_CHROME);
#define NAME(s) (snprintf(id, sizeof id, "%s.%s", region, s), id)
#define COL(s) (snprintf(p, sizeof p, "%s.%s", colours, s), v_scol(g_spec, p))
  v_rect(NAME("back"), g[0], g[1], painted ? 0 : g[2], painted ? 0 : g[3], COL("back"));
  v_rect(NAME("ground"), ground[0], ground[1], painted ? 0 : ground[2], painted ? 0 : ground[3], COL("ground")); v_rect(NAME("groundTop"), ground[0], ground[1], painted ? 0 : ground[2], painted ? 0 : 1, COL("groundTop"));
  v_rect(NAME("foot"), foot[0], foot[1], painted ? 0 : foot[2], painted ? 0 : foot[3], COL("foot"));
  if (bezel) {
    v_rect(NAME("edge.t"), g[0], g[1], painted ? 0 : g[2], painted ? 0 : 1, COL("edge")); v_rect(NAME("edge.b"), g[0], g[1] + g[3] - 1, painted ? 0 : g[2], painted ? 0 : 1, COL("edge"));
    v_rect(NAME("edge.l"), g[0], g[1], painted ? 0 : 1, painted ? 0 : g[3], COL("edge")); v_rect(NAME("edge.r"), g[0] + g[2] - 1, g[1], painted ? 0 : 1, painted ? 0 : g[3], COL("edge"));
  }
  if (painted) { v_name(region); v_sprite_window(NAME("master"), glassPicture, sx, sy, g[0], g[1], g[2], g[3]); }
#undef NAME
#undef COL
}
