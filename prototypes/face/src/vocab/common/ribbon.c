/* The ribbon word (lvgl-switch.md §2.2, common/): one panel with an edge and one line of text centred in it, the one ribbon look (bark fill, gold edge, bone words). The caller names the region (v_region) before it; the word puts the panel on the chrome layer and the line on the type layer. The rectangle, the size and the three colours are the screen's;
   the string is the props'. A string wider than the panel less its pads is cut to fit with an ellipsis. An empty string draws the same nodes with no size (a ribbon not yet shown). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stdio.h>

void word_ribbon(const char *id, const int rect[4], const char *text, int px, int pad, const char *fill, const char *edge, const char *textColour) {
  char pid[64], tid[64], fit[V_STR]; snprintf(pid, sizeof pid, "%s", id); snprintf(tid, sizeof tid, "%s.text", id);
  if (!*text) {   /* no words: the same two nodes stay, with no size (the text where the shown line stands, so the refresh that shows the ribbon is the panel's box), so showing the ribbon later never changes the order of the screen's nodes */
    v_layer(LAYER_CHROME); v_rect(pid, rect[0], rect[1], 0, 0, fill);
    { static const char *E[] = { "et", "eb", "el", "er" }; for (int i = 0; i < 4; i++) { char n[96]; snprintf(n, sizeof n, "%s.%s", pid, E[i]); v_rect(n, rect[0], rect[1], 0, 0, edge); } }   /* word_panel's five nodes, every one at the corner (word_panel's far edges would stand a pixel outside it) */
    v_layer(LAYER_TYPE); v_line_in(tid, "", rect[0], rect[2], v_cap_in(rect[1], rect[3], px), V_ANCHOR_CAP, px, textColour); return;
  }
  v_layer(LAYER_CHROME); word_panel(pid, rect[0], rect[1], rect[2], rect[3], fill, edge);
  v_clip(text, rect[2] - 2 * pad, px, fit, sizeof fit);
  v_layer(LAYER_TYPE); v_line_in(tid, fit, rect[0], rect[2], v_cap_in(rect[1], rect[3], px), V_ANCHOR_CAP, px, textColour);
}
