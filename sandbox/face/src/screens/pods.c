/* Pods' binding table (lvgl-switch.md §2.2): the words that draw each of its states, in draw order, from the `pods` spec and the props' regions; then the focus ring on the focused target. The frame's words
   follow (screens.c). The pod's box is the screen's focal box: the message plate keeps off it. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../layout/layout.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "pods"
static int sa(const char *base, const char *key, int k) { return spec_int(S, v_fmt("%s.%s.%d", base, key, k), 0); }
/* the pod's box: bottom-centred on its axis and feet line at its size class */
static int pod_box(const char *base, int box[4]) {
  int sz[2], w, h; if (!word_pod_size(sz) || !*v_pstr("regions.specimen.pod.sealed")) return 0; w = sz[0]; h = sz[1];
  box[0] = spec_int(S, v_fmt("%s.pod.axis", base), 0) - v_half(w); box[1] = spec_int(S, v_fmt("%s.pod.feet", base), 0) - h; box[2] = w; box[3] = h; return 1;
}
/* the ring on the focused target, in the form of its group: a place and a kin wear the circle, the pod and the hatch the rounded rectangle; the rail's tabs carry their own */
/* the focus is on a target the view lists (a ring on nothing is not drawn) */
static int is_target(const char *cur) { for (int i = 0, n = v_plen("focus.targets"); i < n; i++) if (strcmp(v_pstr(v_fmt("focus.targets.%d.id", i)), cur) == 0) return 1; return 0; }
static void focus_ring(const char *state, const char *base) {
  char cur[40]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0] || strcmp(state, "compare") == 0 || !is_target(cur)) return;
  char ring[24]; spec_str("frame", "colours.ring", ring, sizeof ring); int box[4]; char group[24] = "";
  for (int i = 0, n = v_plen("focus.targets"); i < n; i++) if (strcmp(v_pstr(v_fmt("focus.targets.%d.id", i)), cur) == 0) { snprintf(group, sizeof group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i))); break; }
  v_region("focus", LAYER_CHROME);
  /* the box is the target's (the layout rules); the form of its ring is the spec's (targets.<name>.ring by group) */
  if (strcmp(group, "place") == 0) layout_place_rect(S, "regions.collection", atoi(cur + 6), box);
  else if (strcmp(group, "kin") == 0) layout_kin_rect(S, v_fmt("%s.kin", base), atoi(cur + 4), box);
  else if (strcmp(group, "pod") == 0) { if (!pod_box(base, box)) return; }
  else if (strcmp(group, "hatch") == 0) { for (int k = 0; k < 4; k++) box[k] = sa(base, "hatch.rect", k); }
  else return;
  word_focusRingFor("focus", box, group, ring);
}

/* the targets as the words drew them, in the props' order */
int pods_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state")); int n = v_plen("focus.targets"); if (n > cap) n = cap;
  const char *base = strcmp(state, "overview") == 0 ? "regions.overview" : strcmp(state, "chapter") == 0 ? "regions.chapter" : "regions.collection";
  snprintf(graph_key, (size_t)gcap, "%s", state);
  layout_tab_t tabs[LAYOUT_TABS]; int nt = layout_slant_tabs("frame", "regions.rail", v_plen("regions.rail.tabs"), v_pint("regions.rail.open", 0), 0, tabs, NULL, NULL); if (nt < 0) nt = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->index = v_pint(v_fmt("focus.targets.%d.index", i), 0); t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1);
    int r[4] = { 0, 0, 0, 0 }, k = atoi(strchr(t->id, '.') ? strchr(t->id, '.') + 1 : "0");
    if (strncmp(t->id, "place.", 6) == 0) layout_place_rect(S, "regions.collection", k, r);
    else if (strncmp(t->id, "kin.", 4) == 0) layout_kin_rect(S, v_fmt("%s.kin", base), k, r);
    else if (strncmp(t->id, "rail.", 5) == 0) { if (k < nt) { r[0] = tabs[k].x; r[1] = tabs[k].y; r[2] = tabs[k].w; r[3] = tabs[k].h; } }
    else if (strcmp(t->id, "pod") == 0) pod_box(base, r);
    else if (strcmp(t->id, "hatch") == 0) for (int q = 0; q < 4; q++) r[q] = sa(base, "hatch.rect", q);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3];
  }
  return n;
}

void pods_words(void) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  const char *base = strcmp(state, "overview") == 0 ? "regions.overview" : strcmp(state, "chapter") == 0 ? "regions.chapter" : "regions.collection";
  word_bench();
  if (strcmp(state, "collection") == 0) word_list();
  else if (strcmp(state, "compare") == 0) { word_rail(); word_page("pageA"); word_page("pageB"); }
  else if (strcmp(state, "overview") == 0 || strcmp(state, "chapter") == 0) {
    int box[4]; if (pod_box(base, box)) v_set_focal(box);
    word_specimen(base);
    if (strcmp(state, "overview") == 0) { word_kin(base); word_stamp(base); }
    word_rail();
    if (strcmp(state, "chapter") == 0) word_page("page");
  }
  focus_ring(state, base);
}
