/* The arc fill word (vocabulary (closed), lvgl-switch.md §2.2; specs/face-arc-and-shadow.md §1; incubator.json regions.ring.arc): the ring of time as 12 composed pictures, one for each 22 degree segment of the 264 degree arc. Segment k's node is at its box
   (layout.c layout_arc_segments) and its one op is `anglePick`: the fill art's pixels whose centre lies in the filled part of the span [start + 22k, start + 22(k + 1)) (the first deg - 22k degrees of it, clamped to 0..22), every other pixel clear. A degree filling
   recomposes only the segment holding it; the other segments' ops did not change, so the face redraws only that box (at most 4,331 px). All 12 nodes exist in every state, an empty segment composing to clear, so a degree filling never adds or removes a node.
   The closed ring (ready): all 12 segments full, and one more sprite window of the closed art over its difference box (prim_asset_diff_box of the fill and the closed picture), so ready redraws only the gap where the ends meet the light; in every other state that
   node has no size. growNow is a cut to 264. A picture the host has not sent is a slot not yet filled: nothing is drawn. Pictures: the fill (the whole fill, the track full, clear outside it, the box's size) and the closed art, signed masters or their placeholders. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../anim/anim.h"
#include "../../bridge/wire.h"
#include <stdio.h>
#include <string.h>

void word_arcFill(const char *spec, const char *region, const char *fillPic, const char *closedPic, int deg, int closed) {
  char base[96]; snprintf(base, sizeof base, "%s.arc", region);
  int boxes[LAYOUT_ARC_SEGS][4], n = layout_arc_segments(spec, region, boxes); if (n < 0) { v_error("word arcFill: the ring region has no usable arc block"); return; }
  int cx = spec_int(spec, v_fmt("%s.center.0", base), 0), cy = spec_int(spec, v_fmt("%s.center.1", base), 0), start = spec_int(spec, v_fmt("%s.start", base), 0), sweep = spec_int(spec, v_fmt("%s.sweep", base), 0), per = sweep / n;
  int bx = spec_int(spec, v_fmt("%s.box.0", base), 0), by = spec_int(spec, v_fmt("%s.box.1", base), 0), fh = wire_asset_slot(fillPic);
  anim_state_t t; if (anim_get(ANIM_GROW_NOW, "room", &t)) deg = sweep;   /* growNow: a cut to full */
  if (closed || deg > sweep) deg = sweep; if (deg < 0) deg = 0;
  if (fh < 0) return;   /* the fill has not been sent: a slot not yet filled */
  for (int k = 0; k < n; k++) {
    int a0 = ((start + k * per) % 360 + 360) % 360, fill = deg - k * per; if (fill < 0) fill = 0; if (fill > per) fill = per;
    snprintf(prim_ops(), (size_t)prim_ops_size(), "[[\"anglePick\",-1,%d,%d,%d,%d,%d,0,0,%d,%d]]", fh, cx - boxes[k][0], cy - boxes[k][1], a0, a0 + fill, boxes[k][0] - bx, boxes[k][1] - by);
    v_layer(prim_asset_layer_of(fh)); prim_node(v_id(v_fmt("arc.seg.%d", k)), FN_COMPOSED, boxes[k][0], boxes[k][1], boxes[k][2], boxes[k][3], 0, 0, 0);
  }
  /* the closed art, as a window over where it differs from the full fill: ready only */
  { int ch = *closedPic ? wire_asset_slot(closedPic) : -1, d[4] = { 0, 0, 0, 0 };
    if (ch >= 0 && prim_asset_diff_box(fh, ch, d) == 0 && closed && d[2] > 0) { v_name("ring"); v_sprite_window("arc.closed", closedPic, d[0], d[1], bx + d[0], by + d[1], d[2], d[3]); }
    else if (ch >= 0) { v_name("ring"); v_sprite_hidden("arc.closed", closedPic, 0, 0); } }
}
