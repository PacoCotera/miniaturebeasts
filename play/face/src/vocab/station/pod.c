/* kit_pod (station/): the pod's box from its size class, and, when asked, its contact shadow under it.
   Props: spec (the spec that holds classes.pod.<class> and shadow.widen, shadow.h: Pods'); cls (the size class, "" or NULL: none); axis, feet (where the pod stands: its bottom-centre, the caller's, from its own screen's spec);
   shadow (NULL: no shadow; else { id, region, picture (the shadow's picture id), on }, on 1 the shadow is shown, 0 the same node with no size); box (out).
   The pod's own picture is the screen's and is drawn at the box it gets back: which picture shows (the sealed pod, the identified one, the relit one at rest) is the state's, and a lift or a travel is the screen's offset.
   Region and layer: the shadow's region, on painted; the box is only geometry.
   Node ids: the shadow's id, one node (a slot: shown at the box, or the same node with no size), none when shadow is NULL or the class is refused.
   Placement: the box is the class's w x h, centred on axis (x = axis - half(w)) and standing on feet (y = feet - h); the shadow is the box's w + shadow.widen by shadow.h, centred on the axis and on the feet (x = axis - half(sw), y = feet - half(sh)).
   Returns 1 when the class gives a box (both sides above 0); 0 otherwise, with no shadow drawn. The box is set in both cases (from what the spec holds: zero sides for no class). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"

int kit_pod(const char *spec, const char *cls, int axis, int feet, const kit_podShadow_t *shadow, int box[4]) {
  int w = 0, h = 0;
  if (cls && *cls) { w = spec_int(spec, v_fmt("classes.pod.%s.0", cls), 0); h = spec_int(spec, v_fmt("classes.pod.%s.1", cls), 0); }
  box[0] = axis - v_half(w); box[1] = feet - h; box[2] = w; box[3] = h;
  if (w <= 0 || h <= 0) return 0;
  if (shadow) {
    int sw = w + spec_int(spec, "shadow.widen", 0), sh = spec_int(spec, "shadow.h", 0);
    v_region(shadow->region, LAYER_PAINTED); v_slot(shadow->id, shadow->picture, NULL, axis - v_half(sw), feet - v_half(sh), sw, sh, shadow->on);
  }
  return 1;
}
