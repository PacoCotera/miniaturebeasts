/* The chapter rail word (station-layouts.md, "The chapter rail"), ported from components/slantRail.mjs: tabs hang from the top bar's rule, each a parallelogram leaning `slant` px over its height,
   touching along their slants. Built from the closed set: the body a rectangle, the two slanted ends pictures from the host (tab:<side>:<part>:<colour>, 16 x 40, fill and rim), the hairlines rectangles.
   Spec: the `frame` spec's regions.rail (the numbers and the colour role of each state). Props: regions.rail { tabs: [ { id, word, emblem, mark (Create only: "clash", "changed" or ""), state ("unread" | "read" | "sealed"), glint } ], open,
   star }; the focus ring on the focused tab is the word's: focus.cur "rail.<i>". A picture the host has not sent draws nothing and the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define F "frame"
#define R "regions.rail"
static int fi(const char *key, int dflt) { char p[160]; snprintf(p, sizeof p, R ".%s", key); return spec_int(F, p, dflt); }
static void fcol(const char *key, char *out, int cap) { char p[160]; snprintf(p, sizeof p, R ".%s", key); spec_str(F, p, out, cap); out[cap - 1] = 0; }
static int has(const char *s) { return s && *s; }
/* Create's rail mark (fix 11, gate batch 1): one composed 12 x 12 picture a tab in chrome rects of palette colours, no master: a `red` cross (2 px strokes, the pixels |x - y| <= 1 and |x + y - 11| <= 1) when a trait of the chapter clashes,
   else a `bone` diamond (rows 2, 4, 6, 8, 10, 12, 12, 10, 8, 6, 4, 2 wide, centred) when one is changed, else a clear picture (no ops). Every tab is one node whichever it is (2.2). */
static void rail_mark(const char *spec, const char *id, int x, int y, const char *mark) {
  char ops[1024]; int n = 0; char bone[24] = "bone", red[24] = "red"; static const int DW[12] = { 2, 4, 6, 8, 10, 12, 12, 10, 8, 6, 4, 2 };
  if (spec) { spec_str(spec, "colours.rail.changed", bone, sizeof bone); spec_str(spec, "colours.rail.clash", red, sizeof red); }
  n += snprintf(ops + n, sizeof ops - (size_t)n, "[");
  for (int r = 0, first = 1; r < 12; r++) {
    if (strcmp(mark, "changed") == 0) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", first ? "" : ",", (12 - DW[r]) / 2, r, DW[r], bone); first = 0; }
    else if (strcmp(mark, "clash") == 0) {
      for (int c = 0; c < 12; ) { int on = abs(c - r) <= 1 || abs(c + r - 11) <= 1; if (!on) { c++; continue; } int e = c; while (e + 1 < 12 && (abs(e + 1 - r) <= 1 || abs(e + 1 + r - 11) <= 1)) e++;
        n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", first ? "" : ",", c, r, e - c + 1, red); first = 0; c = e + 1; }
    }
  }
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_composed(id, x, y, 12, 12, ops);
}

void word_rail(const char *marksSpec) {
  int n = v_plen("regions.rail.tabs"); if (n <= 0) return;
  int open = v_pint("regions.rail.open", 0); layout_tab_t tabs[LAYOUT_TABS];
  int run = 0, x0 = 0, placed = layout_slant_tabs(F, R, n, open, 0, tabs, &run, &x0); if (placed <= 0) return;
  int S = fi("slant", 16), gsz = fi("glint.size", 12), gbelow = fi("glint.below", 2);
  int em0 = fi("full_layout.emblem.0", 24), em1 = fi("full_layout.emblem.1", 24), gap = fi("full_layout.gap", 8), labelY = fi("full_layout.labelY", 0), labelC = fi("full_layout.labelCentre", 0), pipsC = fi("full_layout.pipsCentre", 0);
  int cEmY = fi("compact_layout.emblemY", 0), cEmC = fi("compact_layout.emblemCentre", 0), cPipsC = fi("compact_layout.pipsCentre", 0);
  char focus[40]; snprintf(focus, sizeof focus, "%s", v_focus_cur()); int focused = strncmp(focus, "rail.", 5) == 0 ? atoi(focus + 5) : v_pint("regions.rail.current", -1);   /* Compare has no focus: its ring is on the chapter both pages show */
  char star[96]; snprintf(star, sizeof star, "%s", v_pstr("regions.rail.star"));
  /* the rail sits in its well (fix 2 F11): the signed plate-rail-well-<run + 16>x48, 1:1 at (x0 - 8, 40) on the painted layer, before the tabs; a picture not on the face draws nothing (no error, no refusal, no fill: F6) */
  v_region("rail.well", LAYER_PAINTED); { char wid[48]; snprintf(wid, sizeof wid, "plate-rail-well-%dx48", run + 16); v_sprite("rail.well", wid, x0 - 8, fi("y", 40), run + 16, 48); }
  for (int i = 0; i < placed; i++) {
    int x = tabs[i].x, y = tabs[i].y, w = tabs[i].w, h = tabs[i].h, full = tabs[i].full;
    char state[16]; snprintf(state, sizeof state, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.state", i)));
    int sealed = strcmp(state, "sealed") == 0; const char *key = sealed ? "sealed" : open == i ? "open" : strcmp(state, "read") == 0 ? "read" : "unread";
    char word[24]; fcol(v_fmt("states.%s.word", key), word, sizeof word);
    char tid[24]; snprintf(tid, sizeof tid, "rail.%d", i);
    /* the tab's ground is the signed rail-tab-fill-<state>-<full|compact>-<w+S>x<h> picture, 1:1 at the tab's x on the rail's y: fill, rims and slats are in it (the host sends the seven at boot and keeps them) */
    v_region("rail.tab", LAYER_PAINTED);   /* the tab ground is a painted master (the art director's layer table); its emblem is art */
    { char gid[96]; snprintf(gid, sizeof gid, "rail-tab-fill-%s-%s-%dx%d", key, full ? "full" : "compact", w + S, h);
      if (!v_sprite(tid, gid, x, y, w + S, h)) { char b[160]; snprintf(b, sizeof b, "word: the tab ground %.60s is not on the face", gid); v_error(b); prim_refuse(); } }
    int pipCx;
    v_layer(LAYER_ART);
    const char *emblem = v_pstr(v_fmt("regions.rail.tabs.%d.emblem", i));
    if (full) {
      char text[V_STR]; snprintf(text, sizeof text, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.word", i)));
      int ww = v_measure(text, 16), bw = em0 + gap + ww, bx = x + labelC - v_half(bw), wx = bx + em0 + gap;
      if (has(emblem)) v_sprite(v_fmt("%s.emblem", tid), emblem, bx, labelY, em0, em1);
      v_region("rail.tab", LAYER_TYPE); v_text(v_fmt("%s.word", tid), text, wx, labelY + v_half(em1 - v_cap(16)), ww, 16, word);
      pipCx = x + pipsC;
    } else {
      if (has(emblem)) v_sprite(v_fmt("%s.emblem", tid), emblem, x + cEmC - em0 / 2, cEmY, em0, em1);
      pipCx = x + cPipsC;
    }
    if (marksSpec) { v_region("rail.tab", LAYER_CHROME); rail_mark(marksSpec, v_fmt("%s.mark", tid), pipCx - 6, 68, v_pstr(v_fmt("regions.rail.tabs.%d.mark", i))); }   /* Create only (fix 11): one 12 x 12 mark a tab, under the label, ending at the tab's foot */
    if (v_pbool(v_fmt("regions.rail.tabs.%d.glint", i), 0) && has(star)) { v_region("rail.tab", LAYER_ART); v_sprite(v_fmt("%s.glint", tid), star, x + S + v_half(w) - gsz / 2, y + h + gbelow, gsz, gsz); }
  }
  /* the ring crosses 5 px onto the neighbours, so it goes after every tab */
  if (focused >= 0 && focused < placed) {
    int box[4] = { tabs[focused].x, tabs[focused].y, tabs[focused].w, tabs[focused].h };
    v_region("focus", LAYER_CHROME); word_focusRingFor(v_fmt("rail.%d.focus", focused), box, "rail");
  }
}
