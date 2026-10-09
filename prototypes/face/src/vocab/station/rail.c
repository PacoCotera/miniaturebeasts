/* The chapter rail word (station-layouts.md, "The chapter rail"), ported from components/slantRail.mjs: tabs hang from the top bar's rule, each a parallelogram leaning `slant` px over its height,
   touching along their slants. Built from the closed set: the body a rectangle, the two slanted ends pictures from the host (tab:<side>:<part>:<colour>, 16 x 40, fill and rim), the hairlines rectangles.
   Spec: the `frame` spec's regions.rail (the numbers and the colour role of each state). Props: regions.rail { tabs: [ { id, word, emblem, pips, filled, state ("unread" | "read" | "sealed"), glint } ], open,
   star }; the focus ring on the focused tab is the word's: focus.cur "rail.<i>". A picture the host has not sent draws nothing and the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define F "frame"
#define R "regions.rail"
static int fi(const char *key, int dflt) { char p[160]; snprintf(p, sizeof p, R ".%s", key); return spec_int(F, p, dflt); }
static void fcol(const char *key, char *out, int cap) { char p[160]; snprintf(p, sizeof p, R ".%s", key); spec_str(F, p, out, cap); out[cap - 1] = 0; }
static int has(const char *s) { return s && *s; }
/* a pip's hollow outline with its corners cut: four rectangles */
static void cut_outline(const char *id, int x, int y, int w, int h, const char *col) {
  v_rect(v_fmt("%s.t", id), x + 1, y, w - 2, 1, col); v_rect(v_fmt("%s.b", id), x + 1, y + h - 1, w - 2, 1, col);
  v_rect(v_fmt("%s.l", id), x, y + 1, 1, h - 2, col); v_rect(v_fmt("%s.r", id), x + w - 1, y + 1, 1, h - 2, col);
}

void word_rail(void) {
  int n = v_plen("regions.rail.tabs"); if (n <= 0) return;
  int open = v_pint("regions.rail.open", 0); layout_tab_t tabs[LAYOUT_TABS];
  int placed = layout_slant_tabs(F, R, n, open, 0, tabs, NULL, NULL); if (placed <= 0) return;
  int S = fi("slant", 16), pitch = fi("pip.pitch", 8), psz = fi("pip.size", 6), gsz = fi("glint.size", 12), gbelow = fi("glint.below", 2);
  int em0 = fi("full_layout.emblem.0", 24), em1 = fi("full_layout.emblem.1", 24), gap = fi("full_layout.gap", 8), labelY = fi("full_layout.labelY", 0), labelC = fi("full_layout.labelCentre", 0), pipsY = fi("full_layout.pipsY", 0), pipsC = fi("full_layout.pipsCentre", 0);
  int cEmY = fi("compact_layout.emblemY", 0), cEmC = fi("compact_layout.emblemCentre", 0), cPipsY = fi("compact_layout.pipsY", 0), cPipsC = fi("compact_layout.pipsCentre", 0);
  char rim[24]; fcol("states.edge", rim, sizeof rim);
  char focus[40]; snprintf(focus, sizeof focus, "%s", v_focus_cur()); int focused = strncmp(focus, "rail.", 5) == 0 ? atoi(focus + 5) : v_pint("regions.rail.current", -1);   /* Compare has no focus: its ring is on the chapter both pages show */
  char star[96]; snprintf(star, sizeof star, "%s", v_pstr("regions.rail.star"));
  for (int i = 0; i < placed; i++) {
    int x = tabs[i].x, y = tabs[i].y, w = tabs[i].w, h = tabs[i].h, full = tabs[i].full;
    char state[16]; snprintf(state, sizeof state, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.state", i)));
    int sealed = strcmp(state, "sealed") == 0; const char *key = sealed ? "sealed" : open == i ? "open" : strcmp(state, "read") == 0 ? "read" : "unread";
    char fill[24], word[24], pipc[24], slats[24]; fcol(v_fmt("states.%s.fill", key), fill, sizeof fill); fcol(v_fmt("states.%s.word", key), word, sizeof word); fcol(v_fmt("states.%s.pip", key), pipc, sizeof pipc); fcol(v_fmt("states.%s.slats", key), slats, sizeof slats);
    char tid[24]; snprintf(tid, sizeof tid, "rail.%d", i);
    v_region("rail.tab", LAYER_CHROME); v_rect(tid, x + S, y + 1, w - S, h - 2, fill);
    v_region("rail.tab", LAYER_ART);
    v_sprite(v_fmt("%s.lf", tid), v_fmt("tab:left:fill:%s", fill), x, y, S, h); v_sprite(v_fmt("%s.rf", tid), v_fmt("tab:right:fill:%s", fill), x + w, y, S, h);
    v_region("rail.tab", LAYER_CHROME);
    if (sealed) for (int r = 4; r < h - 2; r += 4) { int s = layout_slant_at(S, h, r); v_rect(v_fmt("%s.slat.%d", tid, r), x + s + 1, y + r, w - 1, 1, slats); }
    v_rect(v_fmt("%s.et", tid), x + S, y, w - S, 1, rim); v_rect(v_fmt("%s.eb", tid), x + S, y + h - 1, w - S, 1, rim);
    v_region("rail.tab", LAYER_ART);
    v_sprite(v_fmt("%s.lr", tid), v_fmt("tab:left:rim:%s", rim), x, y, S, h); v_sprite(v_fmt("%s.rr", tid), v_fmt("tab:right:rim:%s", rim), x + w, y, S, h);
    int pipCx, pipY, tpips = v_pint(v_fmt("regions.rail.tabs.%d.pips", i), 0), filled = v_pint(v_fmt("regions.rail.tabs.%d.filled", i), 0);
    const char *emblem = v_pstr(v_fmt("regions.rail.tabs.%d.emblem", i));
    if (full) {
      char text[V_STR]; snprintf(text, sizeof text, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.word", i)));
      int ww = v_measure(text, 16), bw = em0 + gap + ww, bx = x + labelC - v_half(bw), wx = bx + em0 + gap;
      if (has(emblem)) v_sprite(v_fmt("%s.emblem", tid), emblem, bx, labelY, em0, em1);
      v_region("rail.tab", LAYER_TYPE); v_text(v_fmt("%s.word", tid), text, wx, labelY + v_half(em1 - v_cap(16)), ww, 16, word);
      pipCx = x + pipsC; pipY = pipsY;
    } else {
      if (has(emblem)) v_sprite(v_fmt("%s.emblem", tid), emblem, x + cEmC - em0 / 2, cEmY, em0, em1);
      pipCx = x + cPipsC; pipY = cPipsY;
    }
    if (!sealed && tpips > 0) {
      v_region("rail.tab", LAYER_CHROME);
      int px0 = pipCx - v_half((tpips - 1) * pitch + psz);
      for (int k = 0; k < tpips; k++) {
        int px = px0 + k * pitch;
        if (k < filled) v_rect(v_fmt("%s.pip.%d", tid, k), px, pipY, psz, psz, pipc); else cut_outline(v_fmt("%s.pip.%d", tid, k), px, pipY, psz, psz, pipc);
      }
    }
    if (v_pbool(v_fmt("regions.rail.tabs.%d.glint", i), 0) && has(star)) { v_region("rail.tab", LAYER_ART); v_sprite(v_fmt("%s.glint", tid), star, x + S + v_half(w) - gsz / 2, y + h + gbelow, gsz, gsz); }
  }
  /* the ring crosses 4 px onto the neighbours, so it goes after every tab */
  if (focused >= 0 && focused < placed) {
    char ring[24]; spec_str(F, "colours.ring", ring, sizeof ring);
    int box[4] = { tabs[focused].x, tabs[focused].y, tabs[focused].w, tabs[focused].h };
    v_region("focus", LAYER_ART); word_focusRingShape(v_fmt("rail.%d.focus", focused), box, "tab", ring);
  }
}
