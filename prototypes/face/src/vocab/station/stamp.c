/* kit_stamp (station/): the stamp label: a plate, the genome stamp centred on it, optionally the case it is pressed into and a row clip that prints the stamp from the top.
   Props: spec (the screen's) and rect (the path of the plate's rectangle x, y, w, h in it; read first, so the caller may pass v_fmt's result); plate (the plate's picture id; "" or NULL: none); asset (the stamp's picture id, raw; there is a stamp when it is "sent": the id is not empty, size is not 0 and the host has sent the picture, the one meaning of "has");
   size (the stamp's side in px, 0: no stamp); clipH (-1: no clip; 0 or more: the stamp is cut to its top clipH rows, the caller's clock); o: plateId and plateRegion (the plate's node id and log region), imageRegion (the stamp's log region), plateAlone (1: the plate stands when there is no stamp; 0: only with one),
   caseSpec and caseBase (the spec and the path of its regions that hold stampCase.rect and stampCaseFront.rect; NULL caseSpec: no case; the case's pictures are the props' regions.stamp.case.back and .front, as the case has always read them),
   corner (the corner's picture id; NULL or "": none) and cornerAt (its offset x, y from the label's rect). The ids and regions are the caller's, as the screens have always named them.
   Region and layer: plateRegion and imageRegion, painted; the case sets its own ("stamp"); the corner its own ("stamp.portrayed", painted).
   Node ids, in this order: the case's back (stamp.case); <plateId> (a slot: it keeps its place with no size when the stamp is not shown); stamp.clip (only when clipH is 0 or more and there is a stamp); stamp.stamp; the case's front (stamp.front);
   stamp.corner (the corner 1:1, its own size, at (x + cornerAt[0], y + cornerAt[1]), whether there is a stamp or not; none when corner is NULL or "" or the host has not sent it). The stamp's two nodes stand only when there is a stamp, the case's front stands whether there is or not.
   Placement: the stamp is centred on the plate (x + half of the room left, y + half of the room left, the half rounding up).
   Returns nothing; the stamp's box is (x + half(w - size), y + half(h - size), size, size). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include <stddef.h>

/* the case's two layers (stampCase and stampCaseFront): the back before the label, the front after it. `spec` and `base` name the screen spec and the regions the rects are read from */
static void word_stampCase(const char *spec, const char *base, int front) {
  int r[4]; for (int k = 0; k < 4; k++) r[k] = spec_int(spec, v_fmt("%s.%s.%d", base, front ? "stampCaseFront.rect" : "stampCase.rect", k), 0);
  const char *a = v_pstr(front ? "regions.stamp.case.front" : "regions.stamp.case.back");
  v_region("stamp", LAYER_PAINTED); if (*a) v_sprite(front ? "stamp.front" : "stamp.case", a, r[0], r[1], r[2], r[3]);
}
void kit_stamp(const char *spec, const char *rect, const char *plate, const char *asset, int size, int clipH, const kit_stamp_t *o) {
  int r[4]; v_srect(spec, rect, r);
  int has = asset && *asset && size != 0 && wire_has_asset(asset);
  if (o->caseSpec) word_stampCase(o->caseSpec, o->caseBase, 0);
  v_region(o->plateRegion, LAYER_PAINTED); v_slot(o->plateId, plate, NULL, r[0], r[1], r[2], r[3], o->plateAlone || has);
  if (has) {
    int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size);
    v_region(o->imageRegion, LAYER_PAINTED);
    if (clipH >= 0) prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, clipH, 0, 1, 0);
    v_sprite("stamp.stamp", asset, x, y, size, size);
  }
  if (o->caseSpec) word_stampCase(o->caseSpec, o->caseBase, 1);
  { int cs[2]; if (o->corner && *o->corner && v_asset_size(o->corner, cs) == 0) { v_region("stamp.portrayed", LAYER_PAINTED); v_sprite("stamp.corner", o->corner, r[0] + o->cornerAt[0], r[1] + o->cornerAt[1], cs[0], cs[1]); } }
}
