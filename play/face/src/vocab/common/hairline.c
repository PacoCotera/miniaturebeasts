/* kit_hairline (common/): a 1 px rule, solid or dashed.
   Props: id; x, y (the rule's first pixel); len (its length in px); colour (a palette name; NULL: hidden); vertical (0: runs right from x, 1: runs down from y); dash (NULL: solid; else { on, off } in px, on at least 1, off at least 0).
   Region and layer: the caller's. Reads: nothing; takes the colour by palette name only.
   Node id: <id>, one node. Solid: a rect len x 1 (1 x len when vertical); a solid rule is hidden by a len of 0, as any rect of no size. Dashed: one composed picture of the same box with the dash op, [["dash",0,0,len,"h"|"v",on,off,"colour"]]; hidden (colour NULL) it keeps the box and the ops are [].
   Returns nothing; the drawn box is (x, y, len, 1), or (x, y, 1, len) when vertical. A site is always one form: solid, or dashed. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stdio.h>

void kit_hairline(const char *id, int x, int y, int len, const char *colour, int vertical, const int dash[2]) {
  if (!dash) {
    if (!colour) { v_error("kit_hairline: a solid hairline needs a colour"); return; }
    if (vertical) v_rect(id, x, y, 1, len, colour); else v_rect(id, x, y, len, 1, colour);
    return;
  }
  if (dash[0] < 1 || dash[1] < 0 || len < 1) { v_error("kit_hairline: a dash needs on >= 1, off >= 0 and a length of 1 or more"); return; }
  char ops[160];
  if (colour) snprintf(ops, sizeof ops, "[[\"dash\",0,0,%d,\"%c\",%d,%d,\"%s\"]]", len, vertical ? 'v' : 'h', dash[0], dash[1], colour);
  else snprintf(ops, sizeof ops, "[]");
  v_composed(id, x, y, vertical ? 1 : len, vertical ? len : 1, ops);
}
