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

/* a rail cell's left edge: n cells of w, space-between, `inset` from both edges (regions.page.rail.cell.rule; the logic process's cellX in views/page-props.mjs is the same rule for the picture) */
static int cell_x(int i, int n) {
  int W = v_sk(S, R ".rect", 2), w = v_si(S, R ".rail.cell.w", 82), in = v_si(S, R ".rail.cell.inset", 10);
  return in + (n > 1 ? (i * (W - 2 * in - n * w)) / (n - 1) : 0) + i * w;
}

void word_mibiPage(void) {
  char t[V_STR], a[160]; int r[4];
  /* the ground under the picture: the frame's stage in its own colour over the whole stage (the picture is the phone window's width; the rest of the stage is never seen on a phone) */
  { v_region("page.ground", LAYER_CHROME); v_rect("page.ground", 0, 0, 1024, 600, v_scol("frame", "colours.stageGround")); }   /* her page is the whole screen: no bar above, no line below */
  /* the stage: one picture, the window's size */
  v_srect(S, R ".stage.rect", r); snprintf(a, sizeof a, "%s", v_pstr(R ".stage")); v_name("page.stage"); v_slot("page.stage", a, NULL, r[0], r[1], r[2], r[3], 1);
  /* her chapter (the scale): the stage is its picture, the words are the props' list, each placed on its baseline; no name, hints or rail */
  { int ns = v_plen(R ".scale.texts"); if (ns > 0) { v_region("page.scale", LAYER_TYPE);
      for (int i = 0; i < ns; i++) { char id[40], role[32], al[8]; int x = v_pint(v_fmt(R ".scale.texts.%d.x", i), 0), w = v_pint(v_fmt(R ".scale.texts.%d.w", i), 0), b = v_pint(v_fmt(R ".scale.texts.%d.base", i), 0);
        snprintf(t, sizeof t, "%s", v_pstr(v_fmt(R ".scale.texts.%d.text", i))); snprintf(role, sizeof role, "%s", v_pstr(v_fmt(R ".scale.texts.%d.role", i))); snprintf(al, sizeof al, "%s", v_pstr(v_fmt(R ".scale.texts.%d.align", i))); snprintf(id, sizeof id, "page.scale.%d", i);
        if (!*t) continue; if (al[0] == 'c') v_say_in(id, t, x, w, b, V_ANCHOR_BASE, role, "glass"); else say(id, t, x, b, role, al[0] == 'r' ? V_ALIGN_RIGHT : V_ALIGN_LEFT); }
      return; } }
  /* her name and where she is from */
  v_region("page.name", LAYER_TYPE);
  snprintf(t, sizeof t, "%s", v_pstr(R ".name")); say("page.name", t, v_si(S, R ".name.x", 52), v_si(S, R ".name.baseline", 44), "glass.chapter", V_ALIGN_LEFT);
  snprintf(t, sizeof t, "%s", v_pstr(R ".origin")); say("page.origin", t, v_si(S, R ".origin.x", 52), v_si(S, R ".origin.baseline", 71), "glass.caption", V_ALIGN_LEFT);
  /* the tag's word, centred on its pill */
  { int tg[4]; v_srect(S, R ".tag.rect", tg); snprintf(t, sizeof t, "%s", v_pstr(R ".tag")); if (*t) v_say_in("page.tag", t, tg[0], tg[2], v_si(S, R ".tag.baseline", 39), V_ANCHOR_BASE, "glass.name", "glass"); }
  /* the two hints, each beside its key */
  snprintf(t, sizeof t, "%s", v_pstr(R ".hints.chapters")); say("page.hint.chapters", t, v_si(S, R ".hints.chapters.x", 96), v_si(S, R ".hints.chapters.baseline", 467), "glass.name", V_ALIGN_LEFT);
  snprintf(t, sizeof t, "%s", v_pstr(R ".hints.look")); say("page.hint.look", t, v_si(S, R ".hints.look.right", 494), v_si(S, R ".hints.look.baseline", 467), "glass.name", V_ALIGN_RIGHT);
  /* the rail: each chapter's name and its line, centred under its ring (the rings, the band and the frame on the chapter in hand are in the stage picture) */
  { int y = v_sk(S, R ".rail.rect", 1), w = v_si(S, R ".rail.cell.w", 82), nb = v_si(S, R ".rail.cell.nameBase", 86), sb = v_si(S, R ".rail.cell.subBase", 103), n = v_plen(R ".rail.cells"); char id[40], nr[32], sr[32];
    snprintf(nr, sizeof nr, "%s", v_sstr(S, R ".rail.cell.nameRole")); snprintf(sr, sizeof sr, "%s", v_sstr(S, R ".rail.cell.subRole"));
    v_region("page.rail", LAYER_TYPE);
    for (int i = 0; i < n; i++) { int x = cell_x(i, n);
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt(R ".rail.cells.%d.name", i))); snprintf(id, sizeof id, "page.rail.%d.name", i); if (*t) v_say_in(id, t, x, w, y + nb, V_ANCHOR_BASE, nr, "glass");
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt(R ".rail.cells.%d.sub", i))); snprintf(id, sizeof id, "page.rail.%d.sub", i); if (*t) v_say_in(id, t, x, w, y + sb, V_ANCHOR_BASE, sr, "glass"); } }
}

/* a rail cell's box (the target "rail.k"): the frame the chapter in hand wears, whole */
int page_rail_box(int k, int out[4]) {
  int n = v_plen(R ".rail.cells"); if (k < 0 || k >= n) return 0;
  int y = v_sk(S, R ".rail.rect", 1), dx = v_si(S, R ".rail.cell.frame.dx", 3), top = v_si(S, R ".rail.cell.frame.top", 13), bot = v_si(S, R ".rail.cell.frame.bottom", 108), w = v_si(S, R ".rail.cell.w", 82);
  out[0] = cell_x(k, n) + dx; out[1] = y + top; out[2] = w - 2 * dx; out[3] = bot - top; return 1;
}
