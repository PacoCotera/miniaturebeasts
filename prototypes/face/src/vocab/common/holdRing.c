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

void word_holdRing(void) {
  int size = spec_int("frame", "hold.size", 0), width = spec_int("frame", "hold.width", 0), cx = 0, cy = 0; char track[24] = "", fill[24] = "";
  spec_str("frame", "hold.track", track, sizeof track); spec_str("frame", "hold.fill", fill, sizeof fill);
  if (spec_len("frame", "hold.centre") != 2) { v_error("word holdRing: frame hold.centre is [x, y]"); return; }
  cx = spec_int("frame", "hold.centre.0", -1); cy = spec_int("frame", "hold.centre.1", -1);
  if (size < 8 || width < 1 || width * 2 > size || cx < 0 || cy < 0 || !track[0] || !fill[0]) { v_error("word holdRing: frame hold needs size, centre, width, track and fill"); return; }
  int f = hold_fill(); char ops[200];
  int n = snprintf(ops, sizeof ops, "[[\"arc\",0,0,%d,%d,%d,1000,\"%s\"]", size, size, width, track);   /* the track: the whole band */
  if (f > 0) snprintf(ops + n, sizeof ops - (size_t)n, ",[\"arc\",0,0,%d,%d,%d,%d,\"%s\"]]", size, size, width, f, fill); else snprintf(ops + n, sizeof ops - (size_t)n, "]");
  v_region("hold", LAYER_CHROME); v_composed("hold.ring", cx - size / 2, cy - size / 2, size, size, ops);
}
