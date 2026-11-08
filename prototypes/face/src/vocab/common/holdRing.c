/* The hold ring word (common/): the ring that fills while ✓ is held (frame.json hold). Props: frame.hold (present: the frame holds; nothing is read from it). Spec: hold.size (the ring's outer
   diameter, 96), hold.centre ([x, y] of its centre), hold.width (the band's thickness), hold.track and hold.fill (palette colours). The fill is anim/hold.c's, in thousandths of a turn, clockwise from twelve
   o'clock. Region "hold", chrome layer, one composed node "hold.ring": the track whole, then the filled part over it. Draws nothing, and says so to the host, when the spec lacks any of these. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../anim/hold.h"
#include <stdio.h>
#include <string.h>

static int g_ox = -1, g_oy = -1;
/* a screen that holds ✓ for something under its ring (Pods' Let go) names the centre the ring is drawn at, for the next frame word only */
void holdring_at(int x, int y) { g_ox = x; g_oy = y; }
void word_holdRing(void) {
  int size = spec_int("frame", "hold.size", 0), width = spec_int("frame", "hold.width", 0), cx = 0, cy = 0; char track[24] = "", fill[24] = "";
  spec_str("frame", "hold.track", track, sizeof track); spec_str("frame", "hold.fill", fill, sizeof fill);
  if (spec_len("frame", "hold.centre") != 2) { v_error("word holdRing: frame hold.centre is [x, y]"); return; }
  cx = spec_int("frame", "hold.centre.0", -1); cy = spec_int("frame", "hold.centre.1", -1);
  if (g_ox >= 0) { cx = g_ox; cy = g_oy; g_ox = g_oy = -1; }
  if (size < 8 || width < 1 || width * 2 > size || cx < 0 || cy < 0 || !track[0] || !fill[0]) { v_error("word holdRing: frame hold needs size, centre, width, track and fill"); return; }
  int f = hold_fill(); char ops[400];
  int n = snprintf(ops, sizeof ops, "[[\"arc\",0,0,%d,%d,%d,1000,\"%s\"]", size, size, width, track);   /* the track: the whole band */
  if (f > 0) snprintf(ops + n, sizeof ops - (size_t)n, ",[\"arc\",0,0,%d,%d,%d,%d,\"%s\"]]", size, size, width, f, fill); else snprintf(ops + n, sizeof ops - (size_t)n, "]");
  int tw = spec_int("frame", "hold.tick.w", 0); char tc[24] = ""; spec_str("frame", "hold.tick.colour", tc, sizeof tc);
  if (tw > 0 && tc[0] && f < 1000) {   /* the tick at twelve o'clock (loop-audit UX F5b): where the fill must come back round to, always drawn, the band's thickness long, `tw` px wide */
    size_t l = strlen(ops); if (l > 0 && ops[l - 1] == ']') { ops[l - 1] = 0; for (int k = 0; k < tw; k++) { l = strlen(ops); snprintf(ops + l, sizeof ops - l, ",[\"v\",%d,0,%d,\"%s\"]", size / 2 - tw / 2 + k, width, tc); } l = strlen(ops); snprintf(ops + l, sizeof ops - l, "]"); }
  }
  v_region("hold", LAYER_CHROME); v_composed("hold.ring", cx - size / 2, cy - size / 2, size, size, ops);
}
