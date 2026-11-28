/* The up-close still resident: one mibi's picture at its box, the cross-dither from the picture it had before, and the out mark while it is out with the Companion. The swap's clock, the lift and the
   lamp stay with the caller (a moving resident, an atlas on its own ticks, is the caller's too). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../bridge/wire.h"
#include <stdio.h>

static int has(const char *id) { return id && *id && wire_has_asset(id); }

/* kit_resident (station/): the up-close still resident: its picture or the same node with no size, an optional cross-dither from a previous picture, and the out mark.
   Props: spec (the screen's) and rect (the path of the resident's box x, y, w, h in it; the picture is drawn 1:1 there) and outRect (the path of the out mark's box, read only when the mark is sent);
   id (the stem of the node ids and the log region: "resident"); picture (the resident's picture id); out (the out mark's picture id; "" or NULL: not out); lift (the px the picture rides up, the focus lift and the hop, the caller's);
   from (the previous picture's id; "" or NULL: no dither) and level (0 to 16, the caller's clock). A picture is "sent" when its id is not empty and the host has sent it, the one meaning of "has"; it dithers when from and picture are both sent.
   figure (NULL: the picture is drawn at rect, as before; else the figure's box in the picture, dx, dy, W, H) with axis and feet (the paths in spec of the x the figure centres on and the row its last solid row stands on; read only with a figure):
   with a figure and the picture sent, the box is the picture's own size (v_asset_size) at (axis - dx - floor(W / 2), feet - dy - H + 1), and the dither and the unlifted slot of <id>.out use that box too.
   Region and layer: <id>, art (a picture's node takes its asset's layer; the dither the layer of picture).
   Node ids, in this order: <id>.pic (the picture at (x, y - lift); the same node with no size there while it dithers; with no size over the out mark when only that is sent; none when neither is sent);
   <id>.dither (only while it dithers: the v_dither_window pick from `from` to picture at level over the picture's box, both windows at (0, 0)); <id>.out (the out mark 1:1 at outRect when it is sent; else the picture's node with no size at (x, y), not lifted; none when neither is sent).
   Returns 1 when the picture is shown (whole or dithering), 0 otherwise. */
int kit_resident(const char *spec, const char *rect, const char *outRect, const char *id, const char *picture, const char *out, int lift, const char *from, int level, const int figure[4], const char *axis, const char *feet) {
  int r[4]; v_srect(spec, rect, r);
  char pid[64], did[64], oid[64]; snprintf(pid, sizeof pid, "%s.pic", id); snprintf(did, sizeof did, "%s.dither", id); snprintf(oid, sizeof oid, "%s.out", id);
  int pic = has(picture), mark = has(out), dithering = pic && has(from), sz[2];
  if (figure && pic && v_asset_size(picture, sz) == 0) { r[0] = v_si(spec, axis, 0) - figure[0] - v_fdiv(figure[2], 2); r[1] = v_si(spec, feet, 0) - figure[1] - figure[3] + 1; r[2] = sz[0]; r[3] = sz[1]; }   /* the figure on the axis, its last solid row on the feet */
  int y = r[1] - lift;
  v_region(id, LAYER_ART);
  if (pic && !dithering) { v_name(id); v_sprite(pid, picture, r[0], y, r[2], r[3]); } else if (pic) v_sprite_hidden(pid, picture, r[0], y); else if (mark) v_sprite_hidden(pid, out, r[0], y);
  v_region(id, LAYER_ART);
  if (dithering) v_dither_window(did, from, 0, 0, picture, 0, 0, level, r[0], y, r[2], r[3]);
  if (mark) { int o[4]; v_srect(spec, outRect, o); v_name(id); v_sprite(oid, out, o[0], o[1], o[2], o[3]); }
  else if (pic) v_sprite_hidden(oid, picture, r[0], r[1]);
  return pic;
}
