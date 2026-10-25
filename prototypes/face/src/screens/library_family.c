/* The Library's Level 3 (library.json `l3`, the screen `library.family`) in its `far` state: a binding table. The stage (kit_stage on l1.stage, as on Levels 1 and 2); the whole lineage as one picture at
   l3.far.rect (the generator's lineage-far picture, as the props name it); the ring (word_focusRing on l3.focus.targets.node) on the focused node's dot box. Every rect, colour and picture id is the spec's; the props name
   the picture and give the generator's facts in the picture's own coordinates (each target's dot box), to which the face adds the picture's origin. No panel. The pad walks l3.focus.graph with the host's answers to its
   selectors (focus.resolve). `close` and `compare` are drawn by the frame's notBuilt composition until their screens are built (the host sends them as notBuilt). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <string.h>

#define S "library"

/* ---- the focus: the mibis and the bud, each at its dot box in the picture plus the picture's origin ---- */
int family_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap; if (n < 0) n = 0;
  int ox = v_sk(S, "l3.far.rect", 0), oy = v_sk(S, "l3.far.rect", 1), nb = v_plen("regions.far.boxes");
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int box[4] = { 0, 0, 0, 0 };
    for (int k = 0; k < nb; k++) if (strcmp(v_pstr(v_fmt("regions.far.boxes.%d.id", k)), t->id) == 0) for (int q = 0; q < 4; q++) box[q] = v_pint(v_fmt("regions.far.boxes.%d.rect.%d", k, q), 0) + (q == 0 ? ox : q == 1 ? oy : 0);
    focus_fill(t, "focus.targets", i, box);
  }
  return n;
}
static void ring(void) {
  char c[48]; snprintf(c, sizeof c, "%s", v_focus_cur()); if (!*c) return;
  focus_target_t t[64]; int n = family_focus(t, 64);
  for (int i = 0; i < n; i++) if (strcmp(t[i].id, c) == 0 && t[i].w > 0) { int box[4] = { t[i].x, t[i].y, t[i].w, t[i].h }; v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "l3.focus.targets.node", box); return; }
}

void library_family_words(void) {
  int r[4];
  kit_stage(S, "l1.stage.rect", v_scol(S, "l1.stage.ground"), "stage", "family.stage.ground", "family.stage.picture", "regions.stage.picture");
  v_srect(S, "l3.far.rect", r);
  { char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr("regions.far.picture")); v_name("far"); v_slot("far.picture", pic, NULL, r[0], r[1], r[2], r[3], *pic != 0); }
  ring();
}

/* a key on Level 3: ✓ ← and the room keys are intents on the focused node; the pad moves the ring by l3.focus.graph with the host's selectors */
void library_family_key(int code) { screens_key_graph(code, S, "l3.focus.graph", family_focus, NULL, &(screens_keys_t){ .resolve = 1 }); }
