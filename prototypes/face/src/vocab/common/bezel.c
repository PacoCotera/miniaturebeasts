/* kit_bezel (common/): a rounded panel drawn by the face's own primitives, palette-exact: a nine-slice of a face-owned source (corners 1:1, the straight parts tiled, never scaled), the way the focus ring is; with a bevel line on top and a band along one side when the site asks.
   Props: id; the box x, y, w, h; r (the corner radius, at least 1); fill and edge (palette names; edge NULL leaves the outline out); bevel (a palette name, or NULL: no bevel line); band (a kit_band_t, or NULL: none).
   The source is a box of 2r + 4 on a side with corners of radius r, its whole in `fill` and a 1 px `edge` on its outline. The node is the w x h panel at (x, y); w is at least 2r and h at least the two insets (2r with no band).
   Bevel: a 1 px line of `bevel` on the first row inside the edge, between the corners: x + r, y + 1, w - 2r long (kit_hairline).
   Band: { side, h, fill, rule }: the h rows next to the edge on side 0 (top) or 1 (bottom), in `fill`, then one row of `rule` on their inner side (none when rule is NULL), drawn into the same source after the outline. Rows are counted from the edge row inward: the edge row stays the edge's, the band is rows 1 .. h and the rule row h + 1.
   Each row spans the inside of the outline (the pixels the rounded shape holds, less its edge), so the corners keep their arcs. That side's inset is max(r, h + 1 + (rule ? 1 : 0)), so the band lies in the 1:1 part and the source is that much taller. An h of 0 is no band: the source and the nodes are those of band NULL. h at most 200; fill must be set.
   Region and layer: the caller's (v_region before the call; a nine-slice takes its layer from its picture). Reads: nothing; takes colours by palette name only.
   Node ids: <id>.panel (the nine-slice), then <id>.bevel (only when bevel is not NULL). The band adds no node.
   Returns nothing; the drawn box is the caller's x, y, w, h. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stdio.h>
#include <string.h>

typedef long long i64;
/* the rounded box [x0, x1] x [y0, y1] of radius r holds the pixel (X, Y) (both doubled, the pixel's centre): the way the outline of an rrect op is drawn */
static int in_round(i64 X, i64 Y, i64 x0, i64 y0, i64 x1, i64 y1, i64 r) {
  i64 R = 2 * r;
  if (X < 2 * x0 || Y < 2 * y0 || X > 2 * x1 || Y > 2 * y1) return 0;
  i64 cx = X < 2 * x0 + R ? 2 * x0 + R : X > 2 * x1 - R ? 2 * x1 - R : X;
  i64 cy = Y < 2 * y0 + R ? 2 * y0 + R : Y > 2 * y1 - R ? 2 * y1 - R : Y;
  return (X - cx) * (X - cx) + (Y - cy) * (Y - cy) <= R * R;
}
/* the first column of row j that lies inside the outline's edge (the fill the edge does not cover) of a W x H shape of radius r; W when the row holds none */
static int inner_from(int W, int H, int r, int j) {
  int ri = r - 1 > 0 ? r - 1 : 0;
  for (int i = 0; i < W; i++) if (in_round(2 * i + 1, 2 * j + 1, 0, 0, W, H, r) && in_round(2 * i + 1, 2 * j + 1, 1, 1, W - 1, H - 1, ri)) return i;
  return W;
}
static int band_rows(char *ops, int o, int W, int H, int r, int row0, int step, int n, const char *colour) {   /* n rows from row0, stepping by `step`, each across the inside of the outline */
  for (int k = 0; k < n; k++) {
    int j = row0 + k * step, a = inner_from(W, H, r, j); if (a >= W - a) continue;
    o += snprintf(ops + o, (size_t)prim_ops_size() - (size_t)o, ",[\"h\",%d,%d,%d,\"%s\"]", a, j, W - 2 * a, colour);
  }
  return o;
}

void kit_bezel(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge, const char *bevel, const kit_band_t *band) {
  int bh = band ? band->h : 0, rule = bh > 0 && band->rule && *band->rule, ti = r, bi = r;
  if (r < 1 || w < 2 * r) { v_error("kit_bezel: a bezel under 2r wide, or a radius under 1, cannot be drawn"); return; }
  if (bh > 0) {
    int inset = bh + 1 + (rule ? 1 : 0); if (inset < r) inset = r;
    if (bh > 200 || !band->fill || !*band->fill || (band->side != 0 && band->side != 1)) { v_error("kit_bezel: a band needs a side of 0 or 1, a fill and a height of at most 200"); return; }
    if (band->side == 0) ti = inset; else bi = inset;
  }
  if (h < ti + bi) { v_error("kit_bezel: a bezel under its two insets tall cannot be drawn"); return; }
  int W = 2 * r + 4, H = ti + bi + 4; char *ops = prim_ops(), pid[96];
  int o = snprintf(ops, (size_t)prim_ops_size(), "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]", W, H, r, fill, edge ? edge : "");
  if (bh > 0) {
    int s = band->side == 0 ? 1 : -1, first = band->side == 0 ? 1 : H - 2;
    o = band_rows(ops, o, W, H, r, first, s, bh, band->fill);
    if (rule) o = band_rows(ops, o, W, H, r, first + s * bh, s, 1, band->rule);
  }
  snprintf(ops + o, (size_t)prim_ops_size() - (size_t)o, "]");
  int src = prim_source(ops, W, H);
  if (src < 0) { v_error("kit_bezel: the bezel's source picture is refused"); return; }
  snprintf(pid, sizeof pid, "%s.panel", id);
  prim_node(v_id(pid), FN_NINE, x, y, w, h, ((uint32_t)r << 24) | ((uint32_t)ti << 16) | ((uint32_t)r << 8) | (uint32_t)bi, src, 0);
  if (bevel) { snprintf(pid, sizeof pid, "%s.bevel", id); kit_hairline(pid, x + r, y + 1, w - 2 * r, bevel, 0, NULL); }
}
