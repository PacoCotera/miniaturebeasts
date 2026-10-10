/* The leaves word, arc form (vocabulary (closed), lvgl-switch.md §2.2; incubator.json regions.leaves): `total` leaves on the two arcs of the leafArc rule (layout.c), inner then outer, the first `full` of them full, the next one filling from its
   foot (`rows` of its 20 whole rows, the full leaf clipped from the bottom over the empty one), the rest empty. Every leaf up to the spec's `max` has its three nodes (the empty leaf, a clip, the full leaf in it) in every state, the ones the bud
   does not take with no size, so a minute passing, a leaf filling or growNow never adds or removes a node (§2.2). growNow (an event with from and to, the leaves full before and after): the leaves still to fill fill one whole leaf a step over its length, leaf k at
   floor(k · ms / n) ms from its start. Spec: `spec`, the leaves region at `region`; the pictures are the host's (leaf-empty-16x20 a PH hollow, leaf-full-16x20 a PH plate until their masters). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

void word_leavesArc(const char *spec, const char *region, const char *emptyPic, const char *fullPic, int total, int full, int rows) {
  int boxes[LAYOUT_LEAVES][4], max = spec_int(spec, v_fmt("%s.max", region), 40), lh = spec_int(spec, v_fmt("%s.leaf.1", region), 20);
  if (max > LAYOUT_LEAVES) max = LAYOUT_LEAVES; if (total > max) total = max;
  int n = layout_leaf_arc(spec, region, total, boxes); if (n < 0) { v_error("word leaves: more leaves than the arcs hold"); return; }
  anim_state_t t;
  if (anim_get(ANIM_GROW_NOW, "room", &t) && t.to > t.from && t.ms > 0) {   /* the leaves still to fill, one whole leaf a step */
    int m = t.to - t.from, filled = 0; for (int k = 0; k < m; k++) if (k * t.ms / m <= t.elapsed) filled++;
    full = t.from + filled; rows = 0;
  }
  for (int i = 0; i < max; i++) {
    int on = i < n, p = !on ? 0 : i < full ? lh : (i == full && rows > 0 && rows < lh) ? rows : 0, x = on ? boxes[i][0] : 0, y = on ? boxes[i][1] : 0, w = on ? boxes[i][2] : 0;
    v_name("leaves");
    if (on) v_sprite(v_fmt("leaf.%d", i), emptyPic, x, y, w, lh); else v_sprite_hidden(v_fmt("leaf.%d", i), emptyPic, 0, 0);
    prim_node(v_id(v_fmt("leaf.%d.clip", i)), FN_CLIP, x, y + lh - p, on ? w : 0, p, 0, 1, 0);
    if (on) v_sprite(v_fmt("leaf.%d.full", i), fullPic, x, y, w, lh); else v_sprite_hidden(v_fmt("leaf.%d.full", i), fullPic, 0, 0);
  }
}
