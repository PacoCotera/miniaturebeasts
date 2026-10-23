/* kit_tiles (common/): a list of n tiles on the spec's pitch, each drawn by the caller's function at its box. The one loop over a list's places; the boxes are layout_list_pitch's (rule listPitch), never computed by a screen.
   Props: spec (the spec that holds the list); list (the path of the list in it: an object with `forms`, each { upTo, first, pitch, grid }, the form with the smallest upTo of at least n taking the n tiles; or first, pitch and grid on the list itself);
   n (the tiles, 0 or more); draw (called once for each tile i = 0 .. n - 1, in order, with the tile's box x, y, w, h and ctx); ctx (the caller's, passed through); boxes (NULL, or room for n boxes: each tile's box, in order).
   Region and layer: the caller's, and the function's own; kit_tiles sets none. Reads: the spec's list only; never the props or the save.
   Node ids: none of its own; the function names its nodes, and draws the same nodes for every i whether the tile is shown or not, so a count that changes never reorders the screen's nodes.
   Returns the form's upTo (0 for a list with no forms) once all n tiles are drawn; -1, with an error to the host and no call of draw, when n is below 0 or no form holds n, or a form is malformed (layout_list_pitch's refusals). */
#include "../vocab.h"
#include "../words.h"
#include "../../layout/layout.h"
#include <stdio.h>

int kit_tiles(const char *spec, const char *list, int n, kit_tile_fn draw, void *ctx, int boxes[][4]) {
  char name[48], m[160]; int up = layout_list_form(spec, list, n, name, sizeof name);
  if (up < 0) { snprintf(m, sizeof m, "kit_tiles: %.60s holds no form for %d tiles", list, n); v_error(m); return -1; }
  for (int i = 0; i < n; i++) {
    int b[4]; layout_list_pitch(spec, list, n, i, b);
    if (boxes) { boxes[i][0] = b[0]; boxes[i][1] = b[1]; boxes[i][2] = b[2]; boxes[i][3] = b[3]; }
    draw(i, b, ctx);
  }
  return up;
}
