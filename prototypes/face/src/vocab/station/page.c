/* The chapter page word (station-layouts.md, Pods §5), ported from components/chapterPage.mjs: the chapter's page is open (no pane): its heading (an emblem and the chapter's word), one hairline rule under it as wide
   as the grid, then the trait cells on the grid by the trait count (layout_page_grid): each a flat rectangle of the cell's tone with the studio's crop placed 1:1 on it, then the name line (the name, its glyphs
   and the field-guide dot, centred together). An unread cell draws its outline master and nothing inside. Compare keeps its pane (the nine-slice master) and its left-aligned names, with the amber lamp before a
   differing name. Spec: pods regions.chapter.page (key "page"), or regions.compareA with the page's own rectangle (keys "pageA", "pageB"). Props: regions.<key> { heading { emblem, word } | { pod, who },
   cells [ { name, lines, glyphs [ { key, asset } ], diff, isNew, frost, outline, crop, wipe } ], count, sealedFind, sealedPicture, newMark, differs, pane }. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define S "pods"
static int has(const char *s) { return s && *s; }
static int si(const char *base, const char *key, int dflt) { return spec_int(S, v_fmt("%s.%s", base, key), dflt); }
static int sa(const char *base, const char *key, int k, int dflt) { return spec_int(S, v_fmt("%s.%s.%d", base, key, k), dflt); }
static int sexists(const char *base, const char *key) { return spec_raw(S, v_fmt("%s.%s", base, key), NULL) != NULL; }
static int snull(const char *base, const char *key) { const char *r = spec_raw(S, v_fmt("%s.%s", base, key), NULL); return r && strncmp(r, "null", 4) == 0; }
static void colour(const char *name, char *out, int cap) { spec_str(S, v_fmt("colours.page.%s", name), out, cap); }
static void layer(const char *id, int x, int y, int w, int h, const char *asset) { if (has(asset)) v_sprite(id, asset, x, y, w, h); }

void word_page(const char *key) {
  int compare = key[0] == 'p' && key[4] == 'A' ? 1 : key[0] == 'p' && key[4] == 'B' ? 2 : 0;
  const char *base = compare ? "regions.compareA" : "regions.chapter.page", *rectBase = compare == 2 ? "regions.compareB" : base;
  char P[40]; snprintf(P, sizeof P, "regions.%s", key);   /* the props' region */
  if (spec_len("props", P) < 0) return;
  int rx = sa(rectBase, "rect", 0, 0), ry = sa(rectBase, "rect", 1, 0), cells_n = v_plen(v_fmt("%s.cells", P));
  int n = v_pint(v_fmt("%s.count", P), cells_n), size[2];
  if (spec_len(S, v_fmt("%s.sizeByCount", base)) >= 0) layout_page_size(S, base, n, size); else { size[0] = sa(rectBase, "rect", 2, 0); size[1] = sa(rectBase, "rect", 3, 0); }
  char heading[24], nameC[24], lineC[24], lineEmptyC[24], wipeC[24], cellC[24], ruleC[24], paneC[24], edgeC[24];
  colour("heading", heading, sizeof heading); colour("name", nameC, sizeof nameC); colour("line", lineC, sizeof lineC); colour("lineEmpty", lineEmptyC, sizeof lineEmptyC); colour("wipe", wipeC, sizeof wipeC); colour("cell", cellC, sizeof cellC); colour("rule", ruleC, sizeof ruleC); colour("pane", paneC, sizeof paneC); colour("edge", edgeC, sizeof edgeC);
  char reg[24], cellReg[24]; snprintf(reg, sizeof reg, "%s", compare ? key : "page"); snprintf(cellReg, sizeof cellReg, "page.cell");
  /* the pane: the open page has none; Compare's is the nine-slice master at the height the count gives, else a plain panel */
  if (!snull(base, "pane")) {
    char pane[96]; snprintf(pane, sizeof pane, "%s", v_pstr(v_fmt("%s.pane", P))); int slot = has(pane) ? wire_asset_slot(pane) : -1, ins[4], tile = 0;
    if (slot >= 0 && wire_asset_nine(slot, ins, &tile)) { v_region(reg, LAYER_PAINTED);   /* the pane is a painted master */ prim_node(v_id("page.pane"), FN_NINE, rx, ry, size[0], size[1], ((uint32_t)ins[0] << 24) | ((uint32_t)ins[1] << 16) | ((uint32_t)ins[2] << 8) | (uint32_t)ins[3], slot, tile); }
    else if (sexists(base, "pane")) { v_region(reg, LAYER_CHROME); word_panel(key, rx, ry, size[0], size[1], paneC, edgeC); }
  }
  int H0 = sa(base, "heading", 0, 0), H1 = sa(base, "heading", 1, 0), hasH = sexists(base, "heading");
  const char *pod = v_pstr(v_fmt("%s.heading.pod", P));
  if (has(pod) && hasH) {   /* Compare: the pod (the list class) and the marks that say who it is */
    v_region(reg, LAYER_PAINTED); v_sprite(v_fmt("%s.pod", key), pod, rx + sa(base, "podAt", 0, 0), ry + sa(base, "podAt", 1, 0), sa(base, "pod", 0, 0), sa(base, "pod", 1, 0));
    for (int k = 0, nw = v_plen(v_fmt("%s.heading.who", P)); k < nw; k++) { char kind[24]; spec_str(S, v_fmt("%s.who.kinds.%d", base, k), kind, sizeof kind); v_layer(strcmp(kind, "clan") == 0 ? LAYER_PAINTED : LAYER_ART); layer(v_fmt("%s.who.%d", key, k), rx + spec_int(S, v_fmt("%s.who.marks.%d.0", base, k), 0), ry + spec_int(S, v_fmt("%s.who.marks.%d.1", base, k), 0), spec_int(S, v_fmt("%s.who.marks.%d.2", base, k), 0), spec_int(S, v_fmt("%s.who.marks.%d.3", base, k), 0), v_pstr(v_fmt("%s.heading.who.%d", P, k))); }
  } else if (spec_len("props", v_fmt("%s.heading", P)) >= 0 && hasH) {
    char word[V_STR]; snprintf(word, sizeof word, "%s", v_pstr(v_fmt("%s.heading.word", P)));
    v_region(reg, LAYER_ART); layer(v_fmt("%s.emblem", key), rx + H0, ry + H1, 24, 24, v_pstr(v_fmt("%s.heading.emblem", P)));
    int ww = v_measure(word, 20); v_region(reg, LAYER_TYPE); v_text(v_fmt("%s.word", key), word, rx + H0 + 32, ry + H1 + (24 - v_cap(20) + 2) / 2, ww, 20, heading);
  }
  int cells[LAYOUT_CELLS][4], pic[2], ncell = layout_page_grid_at(S, base, rx, ry, cells_n, cells, pic);
  if (sexists(base, "rule") && spec_len("props", v_fmt("%s.heading", P)) >= 0 && !has(pod)) {
    int cc[LAYOUT_CELLS][4], pp[2], g = layout_page_grid_at(S, base, rx, ry, n > 1 ? n : 1, cc, pp), right = 0; for (int i = 0; i < g; i++) if (cc[i][0] > right) right = cc[i][0];
    right += pp[0]; int rule_x = rx + sa(base, "rule.at", 0, 0);
    v_region("page.rule", LAYER_CHROME); v_rect(v_fmt("%s.rule", key), rule_x, ry + sa(base, "rule.at", 1, 0), right - rule_x, si(base, "rule.h", 1), ruleC);
  }
  if (v_pbool(v_fmt("%s.sealedFind", P), 0) && sexists(base, "sealedFind")) {   /* a shut chapter: the one picture of the find that opens it (a flat tone until it is painted) */
    int fx = rx + sa(base, "sealedFind", 0, 0), fy = ry + sa(base, "sealedFind", 1, 0), fw = sa(base, "sealedFind", 2, 0), fh = sa(base, "sealedFind", 3, 0);
    v_region("page.seal", LAYER_CHROME); v_rect(v_fmt("%s.find", key), fx, fy, fw, fh, cellC);
    v_region("page.seal", LAYER_PAINTED); layer(v_fmt("%s.findpic", key), fx, fy, fw, fh, v_pstr(v_fmt("%s.sealedPicture", P)));
    return;
  }
  int gap = sexists(base, "cell") ? si(base, "cell.gap", 0) : si(base, "nameGap", 0), line = sexists(base, "cell") ? si(base, "cell.name.line", 20) : si(base, "nameLine", 20);
  int hasCell = sexists(base, "cell"), hasLM = sexists(base, "lineMarks"), nmW = sa(base, "newMark", 0, 0);
  int newSize0 = sa(base, "newMark.size", 0, 0), newSize1 = sa(base, "newMark.size", 1, 0), newGapAfter = si(base, "newMark.gapAfterName", 0), lmGap = si(base, "lineMarks.gap", 0); (void)nmW;
  char newMark[96]; snprintf(newMark, sizeof newMark, "%s", v_pstr(v_fmt("%s.newMark", P))); char differs[96]; snprintf(differs, sizeof differs, "%s", v_pstr(v_fmt("%s.differs", P)));
  int pw = pic[0], ph = pic[1];
  for (int i = 0; i < ncell; i++) {
    char C[64]; snprintf(C, sizeof C, "%s.cells.%d", P, i); char cid[40]; snprintf(cid, sizeof cid, "%s.c%d", key, i);
    int cx = cells[i][0], cy = cells[i][1], frost = v_pbool(v_fmt("%s.frost", C), 0), diff = v_pbool(v_fmt("%s.diff", C), 0), isNew = v_pbool(v_fmt("%s.isNew", C), 0);
    const char *crop = v_pstr(v_fmt("%s.crop", C)); char cropC[96]; snprintf(cropC, sizeof cropC, "%s", crop);
    if (!frost) {
      anim_state_t wa; char chap[48]; snprintf(chap, sizeof chap, "%s", v_pstr(v_fmt("%s.chapter", P)));
      if (anim_get(ANIM_WIPE, chap, &wa)) {   /* Read: the page wipes, each cell revealed from the top over the event */
        int cut = (2 * ph * wa.elapsed + wa.ms) / (2 * wa.ms);
        v_region(cellReg, LAYER_CHROME); prim_node(v_id(v_fmt("%s.wipe", cid)), FN_CLIP, cx, cy, pw, cut, 0, has(cropC) && wire_has_asset(cropC) ? 2 : 1, 0);
        v_rect(v_fmt("%s.pic", cid), cx, cy, pw, ph, cellC); v_layer(LAYER_PAINTED); layer(v_fmt("%s.crop", cid), cx, cy, pw, ph, cropC); v_layer(LAYER_CHROME);
        v_rect(v_fmt("%s.wipeline", cid), cx + 6, cy + cut, pw - 12, 2, wipeC);
      } else { v_region(cellReg, LAYER_CHROME); v_rect(v_fmt("%s.pic", cid), cx, cy, pw, ph, cellC); v_region(cellReg, LAYER_PAINTED); layer(v_fmt("%s.crop", cid), cx, cy, pw, ph, cropC); }
    } else { v_region(cellReg, LAYER_ART); layer(v_fmt("%s.outline", cid), cx, cy, pw, ph, v_pstr(v_fmt("%s.outline", C))); }
    int ny = cy + ph + gap; char nm[V_STR]; snprintf(nm, sizeof nm, "%s", v_pstr(v_fmt("%s.name", C))); int nw = v_measure(nm, 16);
    int hasNew = isNew && has(newMark) && sexists(base, "newMark");
    if (hasLM && !frost) {
      /* the name line: the name, then its glyphs, then the field-guide dot, 4 px apart, centred together on the cell */
      int ng = v_plen(v_fmt("%s.glyphs", C)), total = nw;
      for (int k = 0; k < ng; k++) { char gk[24]; snprintf(gk, sizeof gk, "%s", v_pstr(v_fmt("%s.glyphs.%d.key", C, k))); total += lmGap + spec_int(S, v_fmt("%s.lineMarks.glyphs.%s.size.0", base, gk), 0); }
      if (hasNew) total += lmGap + newSize0;
      int x = cx + v_half(pw - total);
      v_region(cellReg, LAYER_TYPE); v_text(v_fmt("%s.name", cid), nm, x, ny + v_fdiv(line - v_cap(16), 2), nw, 16, nameC); x += nw;
      v_region(cellReg, LAYER_ART);
      for (int k = 0; k < ng; k++) {
        char gk[24]; snprintf(gk, sizeof gk, "%s", v_pstr(v_fmt("%s.glyphs.%d.key", C, k))); const char *gb = v_fmt("%s.lineMarks.glyphs.%s", base, gk); char gbase[200]; snprintf(gbase, sizeof gbase, "%s", gb);
        int gw = spec_int(S, v_fmt("%s.size.0", gbase), 0), gh = spec_int(S, v_fmt("%s.size.1", gbase), 0), gt = spec_int(S, v_fmt("%s.top", gbase), 0);
        x += lmGap; layer(v_fmt("%s.g%d", cid, k), x, ny + gt, gw, gh, v_pstr(v_fmt("%s.glyphs.%d.asset", C, k))); x += gw;
      }
      if (hasNew) { x += lmGap; layer(v_fmt("%s.new", cid), x, ny + spec_int(S, v_fmt("%s.lineMarks.glyphs.new.top", base), 0), newSize0, newSize1, newMark); }
    } else {
      int lamp = diff && has(differs) && sexists(base, "differs") ? sa(base, "differs.size", 0, 0) + si(base, "differs.gapAfterLamp", 0) : 0, dot = hasNew ? newSize0 + newGapAfter : 0;
      int nx = (hasCell ? cx + v_half(pw - nw - dot) : cx) + lamp;
      v_region(cellReg, LAYER_TYPE); v_text(v_fmt("%s.name", cid), nm, nx, ny, nw, 16, nameC);
      v_region(cellReg, LAYER_ART);
      if (lamp) { v_layer(LAYER_PAINTED); layer(v_fmt("%s.differs", cid), nx - lamp, ny + 4, sa(base, "differs.size", 0, 0), sa(base, "differs.size", 1, 0), differs); v_layer(LAYER_ART); }
      if (dot) layer(v_fmt("%s.new", cid), nx + nw + newGapAfter, ny + line / 2 - newSize1 / 2, newSize0, newSize1, newMark);
    }
    if (!hasCell) {   /* a cut line drops its trailing separator */
      char joined[V_STR]; joined[0] = 0; for (int k = 0, nl = v_plen(v_fmt("%s.lines", C)); k < nl; k++) { if (k) strncat(joined, " ", sizeof joined - strlen(joined) - 1); strncat(joined, v_pstr(v_fmt("%s.lines.%d", C, k)), sizeof joined - strlen(joined) - 1); }
      char wrapped[V_STR * 3]; int nl = has(joined) ? v_wrap(joined, cells[i][2], 16, wrapped, sizeof wrapped, 8) : 0, total = nl; const char *l = wrapped;
      v_region(cellReg, LAYER_TYPE);
      for (int j = 0; j < nl && j < 2; j++) {
        char text[V_STR * 3]; snprintf(text, sizeof text, "%s", l); l += strlen(l) + 1;
        if (total > 2 && j == 1) { size_t len = strlen(text); while (len && text[len - 1] == ' ') text[--len] = 0; if (len >= 2 && (uint8_t)text[len - 2] == 0xc2 && (uint8_t)text[len - 1] == 0xb7) { text[len - 2] = 0; len -= 2; while (len && text[len - 1] == ' ') text[--len] = 0; } }
        v_text(v_fmt("%s.l%d", cid, j), text, cx, ny + 20 + j * 20, v_measure(text, 16), 16, frost ? lineEmptyC : lineC);
      }
    }
  }
}
