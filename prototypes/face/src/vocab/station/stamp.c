/* kit_stamp (station/): the stamp label: a plate, the genome stamp centred on it, optionally the case it is pressed into and a row clip that prints the stamp from the top.
   Props: spec (the screen's) and rect (the path of the plate's rectangle x, y, w, h in it; read first, so the caller may pass v_fmt's result); plate (the plate's picture id; "" or NULL: none); asset (the stamp's picture id; "" or NULL: no stamp, and the caller has already applied its own idea of "sent");
   size (the stamp's side in px, 0: no stamp); clipH (-1: no clip; 0 or more: the stamp is cut to its top clipH rows, the caller's clock); o: plateId and plateRegion (the plate's node id and log region), imageRegion (the stamp's log region), plateAlone (1: the plate stands when there is no stamp; 0: only with one),
   caseSpec and caseBase (the spec and the path of its regions that hold stampCase.rect and stampCaseFront.rect; NULL caseSpec: no case; the case's pictures are the props' regions.stamp.case.back and .front, as the case has always read them). The ids and regions are the caller's, as the screens have always named them.
   Region and layer: plateRegion and imageRegion, painted; the case sets its own ("stamp").
   Node ids, in this order: the case's back (stamp.case); <plateId> (a slot: it keeps its place with no size when the stamp is not shown); stamp.clip (only when clipH is 0 or more and there is a stamp); stamp.stamp; the case's front (stamp.front). The stamp's two nodes stand only when there is a stamp, the case's front stands whether there is or not.
   Placement: the stamp is centred on the plate (x + half of the room left, y + half of the room left, the half rounding up).
   Returns nothing; the stamp's box is (x + half(w - size), y + half(h - size), size, size). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stddef.h>

void kit_stamp(const char *spec, const char *rect, const char *plate, const char *asset, int size, int clipH, const kit_stamp_t *o) {
  int r[4]; v_srect(spec, rect, r);
  int has = asset && *asset && size != 0;
  if (o->caseSpec) word_stampCase(o->caseSpec, o->caseBase, 0);
  v_region(o->plateRegion, LAYER_PAINTED); v_slot(o->plateId, plate, NULL, r[0], r[1], r[2], r[3], o->plateAlone || has);
  if (has) {
    int x = r[0] + v_half(r[2] - size), y = r[1] + v_half(r[3] - size);
    v_region(o->imageRegion, LAYER_PAINTED);
    if (clipH >= 0) prim_node(v_id("stamp.clip"), FN_CLIP, x, y, size, clipH, 0, 1, 0);
    v_sprite("stamp.stamp", asset, x, y, size, size);
  }
  if (o->caseSpec) word_stampCase(o->caseSpec, o->caseBase, 1);
}
