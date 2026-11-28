/* kit_windowFrame (common/): the frame of a rounded window over its picture: the corners outside the radius in the ground's colour, then a 1 px edge on the radius, one composed picture.
   Props: id; the window's box x, y, w, h; radius (px, at least 0); ground (a palette name: the colour of what lies round the window; NULL: no corners op, the edge op alone); edge (a palette name).
   Region and layer: the caller's (the frame lies over the picture, so its region is chrome). Reads: nothing; takes colours by palette name only.
   Node id: <id>, one composed node of the box, always sent. Ops: [["rcorners",0,0,w,h,radius,"ground"],["rrect",0,0,w,h,radius,"","edge"]]; with ground NULL: [["rrect",0,0,w,h,radius,"","edge"]].
   Returns nothing; the drawn box is the caller's x, y, w, h. */
#include "../vocab.h"
#include "../words.h"
#include <stdio.h>

void kit_windowFrame(const char *id, int x, int y, int w, int h, int radius, const char *ground, const char *edge) {
  char ops[300];
  if (radius < 0 || w < 1 || h < 1) { v_error("kit_windowFrame: a window frame needs a box and a radius of 0 or more"); return; }
  if (ground) snprintf(ops, sizeof ops, "[[\"rcorners\",0,0,%d,%d,%d,\"%s\"],[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]]", w, h, radius, ground, w, h, radius, edge);
  else snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]]", w, h, radius, edge);
  v_composed(id, x, y, w, h, ops);
}
