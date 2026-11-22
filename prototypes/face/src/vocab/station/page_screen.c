/* Her page's word (station-match-3 slice 1a; design/style-guide/station-layouts.md, Pods: her page; the accepted walk-3-page): a hatched mibi's own screen. The stage is ONE picture the logic process composes
   (the room, the shade, her, the chips and their leaders, the ring on the chapter in hand, the tag's pill and the two hint keys); the face draws it 1:1 and lays the text over it with v_say: her name and
   where she is from (top left), the tag's word on its pill (top right) and the two hints beside their keys. No layout rule of its own. The rail band under the stage is slice 1b (an empty region now).
   Spec: `pods` regions.page { rect, stage { rect }, name { x, baseline, role }, origin { x, baseline, role }, tag { rect, baseline, role }, hints { chapters { key, x, baseline, role }, look { key, right, baseline, role } } }.
   Props: regions.page { name, origin, tag, stage, hints { chapters, look }, rail { cells } }. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define S "pods"
#define R "regions.page"

static void say(const char *id, const char *text, int x, int base, const char *role, int align) { if (!text || !*text) return; v_say(id, text, x, base, V_ANCHOR_BASE, role, "glass", align); }

void word_mibiPage(void) {
  char t[V_STR], a[160]; int r[4];
  /* the ground under the picture: the frame's stage in its own colour over the whole stage (the picture is the phone window's width; the rest of the stage is never seen on a phone) */
  { int g[4]; v_srect("frame", "regions.stage.rect", g); v_region("page.ground", LAYER_CHROME); v_rect("page.ground", g[0], g[1], g[2], g[3], v_scol("frame", "colours.stageGround")); }
  /* the stage: one picture, the window's size */
  v_srect(S, R ".stage.rect", r); snprintf(a, sizeof a, "%s", v_pstr(R ".stage")); v_name("page.stage"); v_slot("page.stage", a, NULL, r[0], r[1], r[2], r[3], 1);
  /* her name and where she is from */
  v_region("page.name", LAYER_TYPE);
  snprintf(t, sizeof t, "%s", v_pstr(R ".name")); say("page.name", t, v_si(S, R ".name.x", 52), v_si(S, R ".name.baseline", 44), "glass.chapter", V_ALIGN_LEFT);
  snprintf(t, sizeof t, "%s", v_pstr(R ".origin")); say("page.origin", t, v_si(S, R ".origin.x", 52), v_si(S, R ".origin.baseline", 71), "glass.caption", V_ALIGN_LEFT);
  /* the tag's word, centred on its pill */
  { int tg[4]; v_srect(S, R ".tag.rect", tg); snprintf(t, sizeof t, "%s", v_pstr(R ".tag")); if (*t) v_say_in("page.tag", t, tg[0], tg[2], v_si(S, R ".tag.baseline", 39), V_ANCHOR_BASE, "glass.name", "glass"); }
  /* the two hints, each beside its key */
  snprintf(t, sizeof t, "%s", v_pstr(R ".hints.chapters")); say("page.hint.chapters", t, v_si(S, R ".hints.chapters.x", 96), v_si(S, R ".hints.chapters.baseline", 467), "glass.name", V_ALIGN_LEFT);
  snprintf(t, sizeof t, "%s", v_pstr(R ".hints.look")); say("page.hint.look", t, v_si(S, R ".hints.look.right", 494), v_si(S, R ".hints.look.baseline", 467), "glass.name", V_ALIGN_RIGHT);
}
