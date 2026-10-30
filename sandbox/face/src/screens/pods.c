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
/* the pod's box: bottom-centred on its axis and feet line at its size class */
static int pod_box(const char *base, int box[4]) {
  if (!*v_pstr("regions.specimen.pod.sealed")) return 0;
  return kit_pod(S, v_pstr("regions.specimen.pod.sizeClass"), spec_int(S, v_fmt("%s.pod.axis", base), 0), spec_int(S, v_fmt("%s.pod.feet", base), 0), NULL, box);
}
/* the ring on the focused target, in the form of its group: a place and a kin wear the circle, the pod and the hatch the rounded rectangle, the figure its footprint; the rail's tabs carry their own. The box is the focus table's. */
static void focus_ring(const char *state) {
  char cur[40]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0] || spec_len("props", "overlay") >= 0 || strcmp(state, "compare") == 0) return;
  focus_target_t t[FOCUS_TARGETS]; int n = pods_focus(t, FOCUS_TARGETS);
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, cur) == 0) {
    v_region("focus", LAYER_CHROME);
    if (strcmp(t[i].group, "figure") == 0 && t[i].w > 0) { int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h }; word_focusRingFootprint("focus", S, "targets.figure", v_pstr("regions.specimen.figure"), "", box); return; }   /* the figure wears the footprint, from the adult picture's lowest rows, on its unlifted box */
    if (strcmp(t[i].group, "place") && strcmp(t[i].group, "kin") && strcmp(t[i].group, "pod") && strcmp(t[i].group, "hatch")) return;
    if (t[i].w <= 0) return;
    int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h };
    word_focusRingFor("focus", box, t[i].group); return;
  }
}

/* the overview's stamp label in its case (the props' regions.stamp): the case's back, the plate (which stands without a stamp), the stamp, the case's front */
static void stamp_label(const char *base) {
  if (spec_len("props", "regions.stamp") < 0) return;
  kit_stamp_t o = { "stamp", "stamp", "stamp.image", 1, S, base, NULL, { 0, 0 } };
  kit_stamp(S, v_fmt("%s.stamp.rect", base), v_pstr("regions.stamp.plate"), v_pstr("regions.stamp.asset"), v_pint("regions.stamp.size", 0), -1, &o);
}

/* the targets as the words drew them, in the props' order */
int pods_focus(focus_target_t *out, int cap) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state")); int n = v_plen("focus.targets"); if (n > cap) n = cap;
  const char *base = strcmp(state, "overview") == 0 ? "regions.overview" : strcmp(state, "chapter") == 0 ? "regions.chapter" : "regions.collection";
  layout_tab_t tabs[LAYOUT_TABS]; int nt = layout_slant_tabs("frame", "regions.rail", v_plen("regions.rail.tabs"), v_pint("regions.rail.open", 0), 0, tabs, NULL, NULL); if (nt < 0) nt = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL);
    int r[4] = { 0, 0, 0, 0 }, k = atoi(strchr(t->id, '.') ? strchr(t->id, '.') + 1 : "0");
    if (strncmp(t->id, "place.", 6) == 0) layout_place_rect(S, "regions.collection", k, r);
    else if (strncmp(t->id, "kin.", 4) == 0) layout_kin_rect(S, v_fmt("%s.kin", base), k, r);
    else if (strncmp(t->id, "rail.", 5) == 0) { if (k < nt) { r[0] = tabs[k].x; r[1] = tabs[k].y; r[2] = tabs[k].w; r[3] = tabs[k].h; } }
    else if (strcmp(t->id, "pod") == 0) pod_box(base, r);
    else if (strcmp(t->id, "hatch") == 0) for (int q = 0; q < 4; q++) r[q] = v_sk(S, v_fmt("%s.%s", base, "hatch.rect"), q);
    else if (strcmp(t->id, "figure") == 0) v_srect(S, v_fmt("%s.figure.rect", base), r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}

void pods_words(void) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  const char *base = strcmp(state, "overview") == 0 ? "regions.overview" : strcmp(state, "chapter") == 0 ? "regions.chapter" : "regions.collection";
  kit_stage(S, "regions.bench.rect", v_scol(S, "colours.ground"), "bench", "bench", "bench.room", "regions.bench.room");   /* the ground and the room master */
  if (strcmp(state, "collection") == 0) word_list();
  else if (strcmp(state, "compare") == 0) { word_rail(NULL); word_page("pageA"); word_page("pageB"); }
  else if (strcmp(state, "overview") == 0 || strcmp(state, "chapter") == 0) {
    int box[4]; if (pod_box(base, box)) v_set_focal(box);
    word_specimen(base);
    if (strcmp(state, "overview") == 0) { word_kin(base); stamp_label(base); }
    word_rail(NULL);
    if (strcmp(state, "chapter") == 0) word_page("page");
  }
  focus_ring(state);
}
