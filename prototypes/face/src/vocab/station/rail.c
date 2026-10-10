/* The chapter rail word (station-layouts.md, "The chapter rail"), ported from components/slantRail.mjs: tabs hang from the top bar's rule, each a parallelogram leaning `slant` px over its height,
   touching along their slants. Built from the closed set: the body a rectangle, the two slanted ends pictures from the host (tab:<side>:<part>:<colour>, 16 x 40, fill and rim), the hairlines rectangles.
   Spec: the `frame` spec's regions.rail (the numbers and the colour role of each state). Props: regions.rail { tabs: [ { id, word, emblem, pips, filled, state ("unread" | "read" | "sealed"), glint } ], open,
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
/* a pip's hollow outline with its corners cut: four rectangles */
static void cut_outline(const char *id, int x, int y, int w, int h, const char *col) {
  v_rect(v_fmt("%s.t", id), x + 1, y, w - 2, 1, col); v_rect(v_fmt("%s.b", id), x + 1, y + h - 1, w - 2, 1, col);
  v_rect(v_fmt("%s.l", id), x, y + 1, 1, h - 2, col); v_rect(v_fmt("%s.r", id), x + w - 1, y + 1, 1, h - 2, col);
}

/* A marked pip (Create): one composed picture, 6 × 6, in chrome rects of palette colours (create.json: the kit's chrome): filled, hollow (its corners cut), a changed diamond (`bone`, rows x 2/1/0/0/1/2 wide 2/4/6/6/4/2) or a clash cross (`red`, the pixels
   (k, k) and (5 − k, k)). Every pip is one node whichever it is, so a trait's look changing changes a node and never adds or removes one (§2.2). */
static void marked_pip(const char *spec, const char *id, int x, int y, const char *mark, const char *pipc) {
  char ops[640]; int n = 0; static const int CX[6] = { 2, 1, 0, 0, 1, 2 }, CW[6] = { 2, 4, 6, 6, 4, 2 }; char bone[24] = "bone", red[24] = "red";
  spec_str(spec, "colours.rail.changed", bone, sizeof bone); spec_str(spec, "colours.rail.clash", red, sizeof red);
  n += snprintf(ops + n, sizeof ops - (size_t)n, "[");
  if (strcmp(mark, "filled") == 0) for (int r = 0; r < 6; r++) n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",0,%d,6,\"%s\"]", r ? "," : "", r, pipc);
  else if (strcmp(mark, "hollow") == 0) n += snprintf(ops + n, sizeof ops - (size_t)n, "[\"h\",1,0,4,\"%s\"],[\"h\",1,5,4,\"%s\"],[\"v\",0,1,4,\"%s\"],[\"v\",5,1,4,\"%s\"]", pipc, pipc, pipc, pipc);
  else if (strcmp(mark, "changed") == 0) for (int r = 0; r < 6; r++) n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", r ? "," : "", CX[r], r, CW[r], bone);
  else if (strcmp(mark, "clash") == 0) for (int k = 0; k < 6; k++) n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"dot\",%d,%d,\"%s\"],[\"dot\",%d,%d,\"%s\"]", k ? "," : "", k, k, red, 5 - k, k, red);
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, 6, 6, 0, 0, 0);
}

void word_rail(const char *marksSpec) {
  int n = v_plen("regions.rail.tabs"); if (n <= 0) return;
  int open = v_pint("regions.rail.open", 0); layout_tab_t tabs[LAYOUT_TABS];
  int placed = layout_slant_tabs(F, R, n, open, 0, tabs, NULL, NULL); if (placed <= 0) return;
  int S = fi("slant", 16), pitch = fi("pip.pitch", 8), psz = fi("pip.size", 6), gsz = fi("glint.size", 12), gbelow = fi("glint.below", 2);
  int em0 = fi("full_layout.emblem.0", 24), em1 = fi("full_layout.emblem.1", 24), gap = fi("full_layout.gap", 8), labelY = fi("full_layout.labelY", 0), labelC = fi("full_layout.labelCentre", 0), pipsY = fi("full_layout.pipsY", 0), pipsC = fi("full_layout.pipsCentre", 0);
  int cEmY = fi("compact_layout.emblemY", 0), cEmC = fi("compact_layout.emblemCentre", 0), cPipsY = fi("compact_layout.pipsY", 0), cPipsC = fi("compact_layout.pipsCentre", 0);
  char focus[40]; snprintf(focus, sizeof focus, "%s", v_focus_cur()); int focused = strncmp(focus, "rail.", 5) == 0 ? atoi(focus + 5) : v_pint("regions.rail.current", -1);   /* Compare has no focus: its ring is on the chapter both pages show */
  char star[96]; snprintf(star, sizeof star, "%s", v_pstr("regions.rail.star"));
  for (int i = 0; i < placed; i++) {
    int x = tabs[i].x, y = tabs[i].y, w = tabs[i].w, h = tabs[i].h, full = tabs[i].full;
    char state[16]; snprintf(state, sizeof state, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.state", i)));
    int sealed = strcmp(state, "sealed") == 0; const char *key = sealed ? "sealed" : open == i ? "open" : strcmp(state, "read") == 0 ? "read" : "unread";
    char word[24], pipc[24]; fcol(v_fmt("states.%s.word", key), word, sizeof word); fcol(v_fmt("states.%s.pip", key), pipc, sizeof pipc);
    char tid[24]; snprintf(tid, sizeof tid, "rail.%d", i);
    /* the tab's ground is the signed rail-tab-fill-<state>-<full|compact>-<w+S>x<h> picture, 1:1 at the tab's x on the rail's y: fill, rims and slats are in it (the host sends the seven at boot and keeps them) */
    v_region("rail.tab", LAYER_PAINTED);   /* the tab ground is a painted master (the art director's layer table); its emblem is art */
    { char gid[96]; snprintf(gid, sizeof gid, "rail-tab-fill-%s-%s-%dx%d", key, full ? "full" : "compact", w + S, h);
      if (!v_sprite(tid, gid, x, y, w + S, h)) { char b[160]; snprintf(b, sizeof b, "word: the tab ground %.60s is not on the face", gid); v_error(b); prim_refuse(); } }
    int pipCx, pipY, tpips = v_pint(v_fmt("regions.rail.tabs.%d.pips", i), 0), filled = v_pint(v_fmt("regions.rail.tabs.%d.filled", i), 0);
    { anim_state_t wa; char tid2[48]; snprintf(tid2, sizeof tid2, "%s", v_pstr(v_fmt("regions.rail.tabs.%d.id", i))); if (anim_get(ANIM_WIPE, tid2, &wa) && filled == tpips) filled = (wa.elapsed * tpips + wa.ms - 1) / wa.ms; }   /* Read: the pips fill ceil(p * n) over the event */
    v_layer(LAYER_ART);
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
      /* a tab with `marks` (Create): each pip a marked pip; the focused trait's pip (`lift`) stands focus.lift.chrome px higher (no ring) */
      int marks = marksSpec && v_plen(v_fmt("regions.rail.tabs.%d.marks", i)) == tpips, lift = v_pint(v_fmt("regions.rail.tabs.%d.lift", i), -1), liftPx = spec_int(F, "focus.lift.chrome", 2);
      for (int k = 0; k < tpips; k++) {
        int px = px0 + k * pitch, py = pipY - (marks && k == lift ? liftPx : 0); const char *id = v_fmt("%s.pip.%d", tid, k);
        if (marks) marked_pip(marksSpec, id, px, py, v_pstr(v_fmt("regions.rail.tabs.%d.marks.%d", i, k)), pipc);
        else if (k < filled) v_rect(id, px, py, psz, psz, pipc); else cut_outline(id, px, py, psz, psz, pipc);
      }
    }
    if (v_pbool(v_fmt("regions.rail.tabs.%d.glint", i), 0) && has(star)) { v_region("rail.tab", LAYER_ART); v_sprite(v_fmt("%s.glint", tid), star, x + S + v_half(w) - gsz / 2, y + h + gbelow, gsz, gsz); }
  }
  /* the ring crosses 4 px onto the neighbours, so it goes after every tab */
  if (focused >= 0 && focused < placed) {
    char ring[24]; spec_str(F, "colours.ring", ring, sizeof ring);
    int box[4] = { tabs[focused].x, tabs[focused].y, tabs[focused].w, tabs[focused].h };
    v_region("focus", LAYER_CHROME); word_focusRingFor(v_fmt("rail.%d.focus", focused), box, "rail", ring);
  }
}
