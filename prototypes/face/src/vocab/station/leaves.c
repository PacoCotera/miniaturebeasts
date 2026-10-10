/* The leaves word, grid form (vocabulary (closed), lvgl-switch.md §2.2): `total` leaves (at most the spec's max) on the pitch of the spec from the region's origin, the first `full` of them full. Spec: the screen spec the caller names (Home's module, Create's small chamber). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

static const char *H;
static int hi(const char *p, int d) { return spec_int(H, p, d); }
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }

/* the leaves word, its grid form (the caller names the region with v_name): `total` leaves (at most the spec's max), the first `full` of them full, on the pitch of the spec from the region's origin. `filling` (0 to 19, or -1 for a screen
   whose leaves never fill): the rows of 20 the leaf after the full ones has grown; that leaf, empty and whole, has the full picture over it clipped from the bottom to its lowest p = floor(rows × leaf height / 20) rows (home.json leaves.filling),
   whole pixels. The clip and its picture are two nodes after the leaves, there in every state (with no size when no leaf fills), so a row passing changes the leaf's own box and nothing else (§2.2). */
void word_leaves(const char *spec, const char *base, const char *emptyPic, const char *fullPic, int total, int rows, int full, int dy, int slots, int filling) {
  H = spec; int rect[4], leaf[2], pitch = hi(v_fmt("%s.pitch", base), 11), per = hi(v_fmt("%s.perRow", base), 8), rowp = hi(v_fmt("%s.rowPitch", base), 14), max = hi(v_fmt("%s.max", base), 40);
  hrect(v_fmt("%s.rect", base), rect); leaf[0] = hk(v_fmt("%s.leaf", base), 0); leaf[1] = hk(v_fmt("%s.leaf", base), 1);
  if (total > max) total = max;
  if (rows > 0 && total > rows * per) total = rows * per;   /* the props say how many rows the grid holds */
  for (int i = 0; i < slots || i < total; i++) { int x = rect[0] + pitch * (i % per), y = rect[1] + rowp * (i / per) + dy; if (i < total) v_sprite(v_fmt("leaf.%d", i), i < full ? fullPic : emptyPic, x, y, leaf[0], leaf[1]); else v_sprite_hidden(v_fmt("leaf.%d", i), emptyPic, x, y); }   /* slots: the nodes the caller keeps (a leaf not yet there has no size) */
  if (filling >= 0) {
    int i = full, p = filling * leaf[1] / 20, on = i < total && p > 0, x = rect[0] + pitch * (i % per), y = rect[1] + rowp * (i / per) + dy;
    prim_node(v_id("leaf.fill.clip"), FN_CLIP, x, y + leaf[1] - p, on ? leaf[0] : 0, on ? p : 0, 0, 1, 0);
    if (on) v_sprite("leaf.fill", fullPic, x, y, leaf[0], leaf[1]); else v_sprite_hidden("leaf.fill", fullPic, x, y);
  }
}
