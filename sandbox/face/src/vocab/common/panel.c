/* kit_panel (common/): a filled pane with a 1 px edge, the one look of a plate drawn by the face's own rects, with a 1 px bevel inside the edge on the top and the left when the site asks.
   Props: id; the box x, y, w, h; fill (a palette name, NULL: no fill, the four edge rects only); edge (a palette name, NULL: no edge); bevel (a palette name, NULL: no bevel; a bevel needs a fill: with fill NULL it
   is refused, v_error, and no node is drawn); slot (1: the same nodes with no size, all at (x, y)).
   Region and layer: the caller's (v_region / v_layer before the call); a pane is chrome. Reads: nothing; takes colours by palette name only.
   Node ids, in this order: <id> (the fill; none when fill is NULL), <id>.et, <id>.eb, <id>.el, <id>.er (the top, bottom, left and right edge; none when edge is NULL), <id>.bt, <id>.bl (the bevel's top and left; none when
   bevel is NULL). The same ids in the same order whichever the state, so showing a slot later never adds a node.
   Shown: the fill is x, y, w, h; the edges are the top row (x, y, w, 1), the bottom row (x, y + h - 1, w, 1), the left column (x, y, 1, h) and the right column (x + w - 1, y, 1, h); the bevel sits inside the edge:
   its top row (x + 1, y + 1, w - 2, 1) and its left column (x + 1, y + 2, 1, h - 3).
   Slot: every node at (x, y) with no size (the far edges of a box of no size would stand a pixel outside it).
   Returns nothing; the drawn box is the caller's x, y, w, h. A site is always one form: filled, or outline only. */
#include "../vocab.h"
#include "../words.h"
#include <stdio.h>

void kit_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge, const char *bevel, int slot) {
  char n[96];
  if (!fill && !edge) { v_error("kit_panel: a panel needs a fill or an edge"); return; }
  if (bevel && !fill) { v_error("kit_panel: a bevel needs a fill"); return; }
  if (slot) w = h = 0;
  if (fill) v_rect(id, x, y, w, h, fill);
  if (edge) {
    snprintf(n, sizeof n, "%s.et", id); v_rect(n, x, y, w, slot ? 0 : 1, edge);
    snprintf(n, sizeof n, "%s.eb", id); v_rect(n, x, slot ? y : y + h - 1, w, slot ? 0 : 1, edge);
    snprintf(n, sizeof n, "%s.el", id); v_rect(n, x, y, slot ? 0 : 1, h, edge);
    snprintf(n, sizeof n, "%s.er", id); v_rect(n, slot ? x : x + w - 1, y, slot ? 0 : 1, h, edge);
  }
  if (!bevel) return;
  snprintf(n, sizeof n, "%s.bt", id); v_rect(n, slot ? x : x + 1, slot ? y : y + 1, slot ? 0 : w - 2, slot ? 0 : 1, bevel);
  snprintf(n, sizeof n, "%s.bl", id); v_rect(n, slot ? x : x + 1, slot ? y : y + 2, slot ? 0 : 1, slot ? 0 : h - 3, bevel);
}
