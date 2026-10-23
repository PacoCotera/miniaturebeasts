/* kit_panel (common/): a filled pane with a 1 px edge, the one look of a plate drawn by the face's own rects.
   Props: id; the box x, y, w, h; fill (a palette name, NULL: no fill, the four edge rects only); edge (a palette name, NULL: no edge); slot (1: the same nodes with no size, all at (x, y)).
   Region and layer: the caller's (v_region / v_layer before the call); a pane is chrome. Reads: nothing; takes colours by palette name only.
   Node ids, in this order: <id> (the fill; none when fill is NULL), <id>.et, <id>.eb, <id>.el, <id>.er (the top, bottom, left and right edge; none when edge is NULL). The same ids in the same order whichever the state, so showing a slot later never adds a node.
   Shown: the fill is x, y, w, h; the edges are the top row (x, y, w, 1), the bottom row (x, y + h - 1, w, 1), the left column (x, y, 1, h) and the right column (x + w - 1, y, 1, h).
   Slot: every node at (x, y) with no size (the far edges of a box of no size would stand a pixel outside it).
   Returns nothing; the drawn box is the caller's x, y, w, h. A site is always one form: filled, or outline only. */
#include "../vocab.h"
#include "../words.h"
#include <stdio.h>

void kit_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge, int slot) {
  char n[96];
  if (!fill && !edge) { v_error("kit_panel: a panel needs a fill or an edge"); return; }
  if (slot) w = h = 0;
  if (fill) v_rect(id, x, y, w, h, fill);
  if (!edge) return;
  snprintf(n, sizeof n, "%s.et", id); v_rect(n, x, y, w, slot ? 0 : 1, edge);
  snprintf(n, sizeof n, "%s.eb", id); v_rect(n, x, slot ? y : y + h - 1, w, slot ? 0 : 1, edge);
  snprintf(n, sizeof n, "%s.el", id); v_rect(n, x, y, slot ? 0 : 1, h, edge);
  snprintf(n, sizeof n, "%s.er", id); v_rect(n, slot ? x : x + w - 1, y, slot ? 0 : 1, h, edge);
}
