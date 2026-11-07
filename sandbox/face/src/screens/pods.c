/* Pods' binding table (lvgl-switch.md §2.2): the words that draw each of its states, in draw order, from the `pods` spec and the props' regions; then the focus ring on the focused target. The frame's words
   follow (screens.c). The states (pods.json states): inventory (the cabinet, the tool row, the pod panel: word_inventory), filter and find (the same, with the tray or the Find panel over the cabinet),
   read (the reading screen v2: the specimen's chamber and its gene-tag rail, the chapter in hand as plates: word_reading) and compare (the bench and two cream papers: word_compare). The ring is the thin cream ring drawn outside the whole target
   (a card, never its niche), and a card's ring is drawn only while the card stands whole on screen. */
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
int inv_card_rect_k(int k, int out[4]);
int inv_card_box(int i, int out[4]);
int inv_act_rect(int i, int out[4]);
int inv_chip_rect(int i, int out[4]);
int inv_tchip_rect(int row, int col, int out[4]);
int inv_recent_rect(int i, int out[4]);
int inv_letter_rect(int i, int out[4]);
int inv_word_rect(int i, int out[4]);
int compare_take_rect(int k, int out[4]);
void inv_scroll(int on);
void word_inventory(void);
void word_inventoryTray(void);
void word_inventoryFind(void);
void word_reading(void);
int reading_target_box(const char *id, int out[4]);

static int is(const char *state, const char *name) { return strcmp(state, name) == 0; }
/* a target's box by its id, as the words drew it */
static void target_box(const char *id, int r[4]) {
  r[0] = r[1] = r[2] = r[3] = 0; const char *dot = strchr(id, '.'); int k = dot ? atoi(dot + 1) : 0;
  if (strncmp(id, "card.", 5) == 0) { if (inv_card_rect_k(k, r)) { int cab[4]; v_srect(S, "regions.inventory.cabinet.rect", cab); if (r[1] < cab[1] || r[1] + r[3] > cab[1] + cab[3]) { int keep = r[1]; r[2] = r[3] = 0; r[1] = keep; } } }   /* a card off the screen keeps its place and has no size: the ring is not drawn on it until it scrolls in */
  else if (strncmp(id, "act.", 4) == 0) inv_act_rect(k, r);
  else if (strcmp(id, "sort") == 0 || strcmp(id, "filter") == 0 || strcmp(id, "find") == 0) v_srect(S, v_fmt("regions.inventory.tools.%s", id), r);
  else if (strncmp(id, "chip.", 5) == 0) inv_chip_rect(k, r);
  else if (strncmp(id, "tchip.", 6) == 0) { int row = atoi(id + 6); const char *c = strchr(id + 6, '.'); inv_tchip_rect(row, c ? atoi(c + 1) : 0, r); }
  else if (strncmp(id, "recent.", 7) == 0) inv_recent_rect(k, r);
  else if (strncmp(id, "letter.", 7) == 0) inv_letter_rect(k, r);
  else if (strncmp(id, "word.", 5) == 0) inv_word_rect(k, r);
  else if (strcmp(id, "takeA") == 0 || strcmp(id, "takeB") == 0) compare_take_rect(id[4] == 'B', r);
  else if (strcmp(id, "key") == 0 || strncmp(id, "plate.", 6) == 0) reading_target_box(id, r);   /* the reading screen: a plate, the price key (the rail, the trait and the stamp are rung by the bracket: no box) */
}
/* the spec's target entry whose ring shape a target wears */
static const char *target_entry(const char *id) {
  if (strncmp(id, "card.", 5) == 0) return "targets.card";
  if (strncmp(id, "take", 4) == 0) return "targets.take";
  if (strncmp(id, "plate.", 6) == 0) return "targets.plate";
  if (strcmp(id, "key") == 0) return "targets.key";
  if (strncmp(id, "act.", 4) == 0) return "targets.act";
  if (strncmp(id, "tchip.", 6) == 0 || strncmp(id, "recent.", 7) == 0 || strncmp(id, "letter.", 7) == 0 || strncmp(id, "word.", 5) == 0) return "targets.chip";
  return "targets.tool";
}
static void focus_ring(const char *state) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0] || is(state, "trait") || (is(state, "read") && spec_len("props", "regions.read.stamp") >= 0)) return;
  int r[4]; target_box(cur, r); if (r[2] <= 0 || r[3] <= 0) return;
  v_region("focus", LAYER_CHROME); word_focusRing("focus", S, target_entry(cur), r);
}

/* the targets as the words drew them, in the props' order */
int pods_focus(focus_target_t *out, int cap) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state")); int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL);
    int r[4] = { 0, 0, 0, 0 };
    if (strncmp(t->id, "card.", 5) == 0) inv_card_rect_k(atoi(t->id + 5), r);   /* the grid's own place, on screen or not: the host's selectors name the neighbours, the ring lands and the host scrolls */
    else target_box(t->id, r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}

/* a change of the whole stage (the state, the cabinet's scroll, the pods shown, the pod on the bench or the chapter open): the stage is said as one area first (prim_invalidate) */
static void whole_stage(const char *state) {
  static char last[160];
  char key[160]; snprintf(key, sizeof key, "%s|%d|%d|%d|%s|%d", state, v_pint("regions.inv.cabinet.cards.0.k", -1), v_plen("regions.inv.cabinet.cards"), v_plen("regions.inv.tools.chips"), v_pstr("regions.read.name"), v_pint("regions.read.rail.hand", -1)); if (is(state, "compare")) { snprintf(key + strlen(key), sizeof key - strlen(key), "|%.40s", v_pstr("regions.compare.sides.0.chapter")); snprintf(key + strlen(key), sizeof key - strlen(key), "|%.40s", v_pstr("regions.compare.sides.1.pod")); }
  if (strcmp(key, last) == 0) return;
  snprintf(last, sizeof last, "%s", key); int r[4]; v_srect("frame", "regions.stage.rect", r); prim_invalidate(r[0], r[1], r[2], r[3]);
}

void pods_words(void) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  whole_stage(state);
  if (is(state, "compare")) word_compare();
  else if (is(state, "read")) word_reading();
  else {
    inv_scroll(1);   /* the 200 ms scroll: the rows and the ring ride the cabinet's wipe */
    word_inventory();
    if (is(state, "filter")) word_inventoryTray();
    if (is(state, "find")) word_inventoryFind();
  }
  focus_ring(state); inv_scroll(0);
}
