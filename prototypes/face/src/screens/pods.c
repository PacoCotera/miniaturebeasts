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
  int w = v_pint("regions.specimen.pod.size.0", 0), h = v_pint("regions.specimen.pod.size.1", 0);
  if (!w || !h || !*v_pstr("regions.specimen.pod.sealed")) return 0;
  box[0] = spec_int(S, v_fmt("%s.pod.axis", base), 0) - v_half(w); box[1] = spec_int(S, v_fmt("%s.pod.feet", base), 0) - h; box[2] = w; box[3] = h; return 1;
}
/* the ring on the focused target, in the form of its group: a place and a kin wear the circle, the pod and the hatch the rounded rectangle; the rail's tabs carry their own */
/* the focus is on a target the view lists (a ring on nothing is not drawn) */
static int is_target(const char *cur) { for (int i = 0, n = v_plen("focus.targets"); i < n; i++) if (strcmp(v_pstr(v_fmt("focus.targets.%d.id", i)), cur) == 0) return 1; return 0; }
static void focus_ring(const char *state, const char *base) {
  char cur[40]; snprintf(cur, sizeof cur, "%s", v_pstr("focus.cur")); if (!cur[0] || strcmp(state, "compare") == 0 || !is_target(cur)) return;
  char ring[24]; spec_str("frame", "colours.ring", ring, sizeof ring); int box[4];
  v_region("focus", LAYER_CHROME);
  if (strncmp(cur, "place.", 6) == 0) {
    layout_place_rect(S, "regions.collection", atoi(cur + 6), box);
    int radius = spec_int(S, "regions.collection.ring.focus.radius", 84), cx = sa("regions.collection", "ring.centre", 0), cy = sa("regions.collection", "ring.centre", 1);
    word_focusRingCircle("focus", box, radius, cx, cy, 0, ring);
  } else if (strncmp(cur, "kin.", 4) == 0) { layout_kin_rect(S, v_fmt("%s.kin", base), atoi(cur + 4), box); word_focusRingCircle("focus", box, 0, 0, 0, spec_int("frame", "focus.ring.outside", 4), ring); }
  else if (strcmp(cur, "pod") == 0) { if (pod_box(base, box)) word_focusRingShape("focus", box, "round", ring); }
  else if (strcmp(cur, "hatch") == 0) { for (int k = 0; k < 4; k++) box[k] = sa(base, "hatch.rect", k); word_focusRingShape("focus", box, "round", ring); }
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
