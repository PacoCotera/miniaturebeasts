/* kit_stage (common/): a screen's stage, the ground colour over the stage's rectangle and, when the screen has a room master, the master over it.
   Props: spec (the screen's) and rect (the path of the stage's rectangle x, y, w, h in it; read before anything else is formatted, so the caller may pass v_fmt's result); ground (a palette name, the stage's colour);
   region (the log region of both nodes); groundId (the ground's node id); roomId (the room master's node id; NULL: the screen has none and only the ground is drawn); roomPath (the path in the props of the list of candidate picture ids, in order: the first one the host has sent is
   drawn at the stage's rectangle; ignored when roomId is NULL). The ids are the caller's, as the screens have always named them (a screen's records do not change); the colour is never read here.
   Region and layer: region; the ground on chrome, the master on painted (the layer is set only when there is a master, so a ground alone leaves the chrome layer set).
   Node ids, in this order: <groundId>; <roomId> (none until the host has sent one of the candidates; the layout does not move).
   Returns 1 when the stage is drawn; 0, with no node and no error, when the spec holds no rectangle at rect. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"

int kit_stage(const char *spec, const char *rect, const char *ground, const char *region, const char *groundId, const char *roomId, const char *roomPath) {
  int r[4]; if (!v_spec_rect(spec, rect, r)) return 0;
  v_region(region, LAYER_CHROME); v_rect(groundId, r[0], r[1], r[2], r[3], ground);
  if (!roomId) return 1;
  v_region(region, LAYER_PAINTED);
  for (int i = 0, n = v_plen(roomPath); i < n; i++) if (v_sprite(roomId, v_pstr(v_fmt("%s.%d", roomPath, i)), r[0], r[1], r[2], r[3])) break;
  return 1;
}
