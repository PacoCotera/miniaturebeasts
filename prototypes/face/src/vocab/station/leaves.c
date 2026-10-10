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

/* the leaves word, its grid form (the caller names the region with v_name): `total` leaves (at most the spec's max), the first `full` of them full, on the pitch of the spec from the region's origin */
void word_leaves(const char *spec, const char *base, const char *emptyPic, const char *fullPic, int total, int rows, int full, int dy, int slots) {
  H = spec; int rect[4], leaf[2], pitch = hi(v_fmt("%s.pitch", base), 11), per = hi(v_fmt("%s.perRow", base), 8), rowp = hi(v_fmt("%s.rowPitch", base), 14), max = hi(v_fmt("%s.max", base), 40);
  hrect(v_fmt("%s.rect", base), rect); leaf[0] = hk(v_fmt("%s.leaf", base), 0); leaf[1] = hk(v_fmt("%s.leaf", base), 1);
  if (total > max) total = max;
  if (rows > 0 && total > rows * per) total = rows * per;   /* the props say how many rows the grid holds */
  for (int i = 0; i < slots || i < total; i++) { int x = rect[0] + pitch * (i % per), y = rect[1] + rowp * (i / per) + dy; if (i < total) v_sprite(v_fmt("leaf.%d", i), i < full ? fullPic : emptyPic, x, y, leaf[0], leaf[1]); else v_sprite_hidden(v_fmt("leaf.%d", i), emptyPic, x, y); }   /* slots: the nodes the caller keeps (a leaf not yet there has no size) */
}
