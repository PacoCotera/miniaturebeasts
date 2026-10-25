/* The fading glint: a star over a bead that fades in and out on the 16-level stage dither. The clock and the tick stay with the caller: it passes the time since its own start and draws again
   when the level changes. */
#include "../vocab.h"
#include "../words.h"
#include <stddef.h>

/* kit_glint_level (station/): the dither level a glint has reached.
   Props: spec (the screen's spec); path (the glint's entry in it, holding <path>.ms, the period, 2000 when absent, and <path>.levels, the top level, 16 when absent); elapsed_ms (the time since the caller's clock started); motion (0: reduced motion).
   Region and layer: none; it draws nothing. Reads: <path>.ms and <path>.levels.
   Node id: none.
   Returns the level, 0 to <path>.levels: in over the first half of the period, out over the second (levels x up / half, up the time into the period or the time left of it, whichever is less); motion 0, or a period of 1 ms or less, gives the top level. */
int kit_glint_level(const char *spec, const char *path, uint32_t elapsed_ms, int motion) {
  int ms = v_si(spec, v_fmt("%s.ms", path), 2000), top = v_si(spec, v_fmt("%s.levels", path), 16);
  if (!motion || ms <= 1) return top;
  int ph = (int)(elapsed_ms % (uint32_t)ms), half = ms / 2, up = ph < half ? ph : ms - ph; return top * up / half;
}

/* kit_glint (station/): one glint, the asset dithered in from clear at a level.
   Props: id; asset (the star's picture id); cx, cy (the centre it is drawn on); w, h (its size); level (0 to 16, from kit_glint_level).
   Region: the caller's (v_region before the call); the layer comes from the asset. Reads: the host's pictures.
   Node id: <id>, one composed node at (cx - w / 2, cy - h / 2), w x h, the v_dither_window pick of clear and the asset at the level (level 0 draws no pixel, 16 the whole star); no node when the host has not sent the asset.
   Returns nothing. */
void kit_glint(const char *id, const char *asset, int cx, int cy, int w, int h, int level) {
  v_dither_window(id, NULL, 0, 0, asset, 0, 0, level, cx - w / 2, cy - h / 2, w, h);
}
