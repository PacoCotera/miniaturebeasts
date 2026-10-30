/* The ribbon word (lvgl-switch.md §2.2, common/): one panel with an edge and one line of text centred in it, the one ribbon look (bark fill, gold edge, bone words). The caller names the region (v_region) before it; the word puts the panel on the chrome layer and the line on the type layer. The rectangle, the size and the three colours are the screen's;
   the string is the props'. The words are in the role the caller names (NULL: "heading", or a variant of it as "heading.flash") on the ribbon (a band). A string wider than the panel less its pads is cut to fit with an ellipsis. An empty string draws the same nodes with no size (a ribbon not yet shown). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include <stdio.h>

#define GROUND "band"
void word_ribbon(const char *id, const int rect[4], const char *text, int pad, const char *fill, const char *edge, const char *role) {
  if (!role) role = "heading";
  char pid[64], tid[64], fit[V_STR]; snprintf(pid, sizeof pid, "%s", id); snprintf(tid, sizeof tid, "%s.text", id);
  if (!*text) {   /* no words: the same two nodes stay, with no size (the text where the shown line stands, so the refresh that shows the ribbon is the panel's box), so showing the ribbon later never changes the order of the screen's nodes */
    v_layer(LAYER_CHROME); kit_panel(pid, rect[0], rect[1], rect[2], rect[3], fill, edge, NULL, 1);   /* the panel's five nodes, every one at the corner */
    v_layer(LAYER_TYPE); v_say_in(tid, "", rect[0], rect[2], v_role_cap_in(rect[1], rect[3], role), V_ANCHOR_CAP, role, GROUND); return;
  }
  v_layer(LAYER_CHROME); kit_panel(pid, rect[0], rect[1], rect[2], rect[3], fill, edge, NULL, 0);
  v_layer(LAYER_TYPE);
  v_role_clip(text, rect[2] - 2 * pad, role, fit, sizeof fit); v_say_in(tid, fit, rect[0], rect[2], v_role_cap_in(rect[1], rect[3], role), V_ANCHOR_CAP, role, GROUND);
}
