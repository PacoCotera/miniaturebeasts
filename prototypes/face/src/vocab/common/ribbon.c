/* The ribbon word (lvgl-switch.md §2.2, common/): one panel with an edge and one line of text centred in it, the one ribbon look (tealD fill, aqua edge, bone words). The caller names the region (v_region) before it; the word puts the panel on the chrome layer and the line on the type layer. The rectangle, the size and the three colours are the screen's;
   the string is the props'. A string wider than the panel less its pads is cut to fit with an ellipsis. An empty string draws the same nodes with no size (a ribbon not yet shown). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stdio.h>

void word_ribbon(const char *id, const int rect[4], const char *text, int px, int pad, const char *fill, const char *edge, const char *textColour) {
  char pid[64], tid[64], fit[V_STR]; snprintf(pid, sizeof pid, "%s", id); snprintf(tid, sizeof tid, "%s.text", id);
  if (!*text) {   /* no words: the same two nodes stay, with no size, so showing the ribbon later never changes the order of the screen's nodes */
    v_layer(LAYER_CHROME); word_panel(pid, rect[0], rect[1], 0, 0, fill, edge); v_layer(LAYER_TYPE); v_text(tid, "", rect[0], rect[1], 0, px, textColour); return;
  }
  v_layer(LAYER_CHROME); word_panel(pid, rect[0], rect[1], rect[2], rect[3], fill, edge);
  v_clip(text, rect[2] - 2 * pad, px, fit, sizeof fit);
  int tw = v_measure(fit, px);
  v_layer(LAYER_TYPE); v_text(tid, fit, rect[0] + v_half(rect[2] - tw), rect[1] + v_fdiv(rect[3] - v_cap(px), 2), tw, px, textColour);
}
