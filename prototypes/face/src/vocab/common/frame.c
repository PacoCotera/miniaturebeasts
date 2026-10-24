/* The frame's three words: the top bar, the bottom line and the message plate (station-layouts.md "The frame"), ported from components/topBar.mjs, bottomLine.mjs and
   messagePlate.mjs. Spec: the `frame` spec; props: `props.frame.top`, `.line`, `.plate`. Marks are pictures the host has sent: one that is not on the face draws nothing and
   the layout does not move.
   word_topBar's readout: props frame.top.readout { text, mark } (mark: a picture id, or null for none); spec regions.top.readout { gap, markGap, px, colour, end, mark: [w, h] }. Drawn after the title, from the
   title's drawn end + gap: the mark (node top.readout.mark, a v_slot of mark w x h), then markGap, then the text (node top.readout.text, px in colour, on the title's baseline, the mark centred on its cap, cut by v_clip to end by `end`);
   without a mark the text starts at the title's end + gap and there is no mark node. Props without frame.top.readout: neither node. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define F "frame"
#define P "props"
/* a colour of the frame's table: its palette name */
static void lower(char *s) { for (; *s; s++) if (*s >= 'A' && *s <= 'Z') *s = (char)(*s + 32); }
/* a mark whose master may not be placed: the picture when the face has it, else `standin` (a flat shape the frame draws until then) when there is one */
static int mark(const char *id, const char *asset, const int r[4]) { return v_sprite(id, asset, r[0], r[1], r[2], r[3]); }

/* A face's holder ring until its picture is painted (the top bar's Companion face, Habitat's cross faces): the ellipse op on the art layer, in the placing spec's colours.faceRing (away: colours.faceRingAway),
   frame.json regions.marks.face.ringWidth wide. The caller names its own region. Not a focus mark (FR8). */
void v_faceHolder(const char *id, const char *spec, int x, int y, int w, int h, int away) {
  char c[24], b[96]; int width = spec_int(F, "regions.marks.face.ringWidth", 0);
  if (spec_str(spec, away ? "colours.faceRingAway" : "colours.faceRing", c, sizeof c) <= 0 || !c[0]) { snprintf(b, sizeof b, "v_faceHolder: %.24s has no colours.faceRing%s", spec, away ? "Away" : ""); v_error(b); return; }
  if (width < 1) { v_error("v_faceHolder: frame.json regions.marks.face.ringWidth is missing"); return; }
  v_layer(LAYER_ART); snprintf(b, sizeof b, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", w, h, width, c);
  v_composed(id, x, y, w, h, b);
}
/* The centre of a counter's icon in the top bar (i: 0 Energy, 1 Data, 2 Essence), as word_topBar lays them out (the figures as shown now, a tick counting up included): the place a Cargo material travels to. 1 when the bar has the props, else 0. */
int frame_material_centre(int i, int out[2]) {
  if (i < 0 || i > 2 || !spec_has(P) || !spec_has(F)) return 0;
  static const char K[3] = { 'e', 'd', 's' };
  int M_icon = v_si(F, "regions.materials.icon", 0), M_gap = v_si(F, "regions.materials.gap", 0), M_px = v_si(F, "regions.materials.px", 0), M_between = v_si(F, "regions.materials.between", 0), M_centre = v_si(F, "regions.materials.centre", 0), mrect[4]; v_srect(F, "regions.materials.rect", mrect);
  int widths[3], total = 0;
  for (int q = 0; q < 3; q++) {
    char a[48], txt[16]; snprintf(a, sizeof a, "frame.top.materials.%c", K[q]); int shown = spec_int(P, a, 0);
    anim_state_t t; char who[2] = { K[q], 0 };
    if (anim_get(ANIM_TICK, who, &t) && t.to > t.from) { int n = t.to - t.from, steps = t.elapsed / 70 + 1; if (steps > n) steps = n; shown = t.from + steps; }
    snprintf(txt, sizeof txt, "%d", shown); widths[q] = M_icon + M_gap + v_measure(txt, M_px); total += widths[q];
  }
  total += M_between * 2;
  int mx = M_centre - (total + 1) / 2;
  for (int q = 0; q < i; q++) mx += widths[q] + M_between;
  out[0] = mx + M_icon / 2; out[1] = mrect[1] + 4 + M_icon / 2; return 1;
}
void word_topBar(void) {
  char c[24], a[96], b[96], s[V_STR]; int r[4], rr[4];
  v_srect(F, "regions.top.rect", r);
  snprintf(a, sizeof a, "%s", v_sstr(F, "regions.top.slice")); int bar = a[0] && wire_asset_slot(a) >= 0;   /* the bar is on the face: its own picture carries the panel and its edge rows; the code panel and rule stay as the same nodes of no size */
  if (bar) { v_region("top", LAYER_PAINTED); v_sprite("top.bar", a, r[0], r[1], r[2], r[3]); }
  v_region("top", LAYER_CHROME);
  snprintf(c, 24, "%s", v_scol(F, "colours.chrome")); kit_panel("top", r[0], r[1], r[2], r[3], c, NULL, bar);
  snprintf(c, 24, "%s", v_scol(F, "colours.rule")); kit_hairline("top.rule", r[0], r[1] + r[3] - 1, bar ? 0 : r[2], c, 0, NULL);
  snprintf(c, 24, "%s", v_scol(F, "colours.topRule"));
  for (int i = 0; i < spec_len(F, "regions.topRules.x"); i++) { char p[64], id[32]; snprintf(p, sizeof p, "regions.topRules.x.%d", i); snprintf(id, sizeof id, "top.sep.%d", i); int y0 = v_si(F, "regions.topRules.y0", 0), y1 = v_si(F, "regions.topRules.y1", 0); kit_hairline(id, v_si(F, p, 0), y0, y1 - y0, c, 1, NULL); }
  /* where you are: the room's mark, then the one word */
  v_name("title");   /* the top bar's marks (room, companion, face, sun): each picture's layer is its asset's */
  char screen[32], room[24]; spec_str(P, "frame.top.screen", screen, sizeof screen);
  snprintf(a, sizeof a, "regions.title.marks.%s", screen); snprintf(room, sizeof room, "%s", v_sstr(F, a));
  v_srect(F, "regions.title.mark", rr);
  if (*room) { lower(room); snprintf(a, sizeof a, "regions.marks.room.%s", room); snprintf(b, sizeof b, "%s", v_sstr(F, a)); mark("top.room", b, rr); }
  v_region("title", LAYER_TYPE);
  spec_str(P, "frame.top.title", s, sizeof s); snprintf(c, 24, "%s", v_scol(F, "colours.title"));
  v_run_t title = v_run("top.title", s, v_si(F, "regions.title.text.0", 0), v_cap_top(v_si(F, "regions.title.text.1", 0) + 2, V_ANCHOR_CAP, v_si(F, "regions.title.px", 0)), v_si(F, "regions.title.px", 0), c, V_ALIGN_LEFT);
  /* the readout after the title (props frame.top.readout { text, mark }): its nodes only when the props carry it. The text sits on the title's baseline (24, where the bar's other 16 px words sit),
     the mark (when named) first, centred on the text's cap; the text is cut with an ellipsis to end by regions.top.readout.end. A mark not on the face draws nothing and the text does not move. */
  { const char *ro = spec_raw(P, "frame.top.readout", NULL);
    if (ro && *ro == '{') {
      int x = title.end + v_si(F, "regions.top.readout.gap", 0), px = v_si(F, "regions.top.readout.px", 0), mw = v_sk(F, "regions.top.readout.mark", 0), mh = v_sk(F, "regions.top.readout.mark", 1), base = v_si(F, "regions.title.text.1", 0) + 2 + v_cap(v_si(F, "regions.title.px", 0));
      char m[96], txt[V_STR], cut[V_STR + 4];
      if (spec_str(P, "frame.top.readout.mark", m, sizeof m) > 0) { v_name("title"); v_slot("top.readout.mark", m, NULL, x, base - v_cap(px) + v_fdiv(v_cap(px) - mh, 2), mw, mh, 1); x += mw + v_si(F, "regions.top.readout.markGap", 0); }
      spec_str(P, "frame.top.readout.text", txt, sizeof txt); v_clip(txt, v_si(F, "regions.top.readout.end", 0) - x, px, cut, sizeof cut);
      v_region("title", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, "regions.top.readout.colour"));
      v_line_at("top.readout.text", cut, x, base, V_ANCHOR_BASE, px, c, V_ALIGN_LEFT);
    } }
  /* what you hold, centred on 512 */
  static const char K[3] = { 'e', 'd', 's' }; static const char *ICON[3] = { "energy", "data", "essence" };
  int M_icon = v_si(F, "regions.materials.icon", 0), M_gap = v_si(F, "regions.materials.gap", 0), M_px = v_si(F, "regions.materials.px", 0), M_between = v_si(F, "regions.materials.between", 0), M_centre = v_si(F, "regions.materials.centre", 0);
  int mrect[4]; v_srect(F, "regions.materials.rect", mrect);
  int widths[3], total = 0; char txt[3][16], fl[3];
  for (int i = 0; i < 3; i++) {
    int shown; snprintf(a, sizeof a, "frame.top.materials.%c", K[i]); shown = spec_int(P, a, 0);
    snprintf(a, sizeof a, "frame.top.flash.%c", K[i]); fl[i] = (char)spec_bool(P, a, 0);
    { /* a counter counts up toward its value one unit every 70 ms, the first at once, with a 240 ms tick behind the figure that changed (a `tick` event: from, to) */
      anim_state_t t; char who[2] = { K[i], 0 };
      if (anim_get(ANIM_TICK, who, &t) && t.to > t.from) { int n = t.to - t.from, steps = t.elapsed / 70 + 1; if (steps > n) steps = n; shown = t.from + steps; if (t.elapsed - (steps - 1) * 70 < 240) fl[i] = 1; }
      if (anim_get(ANIM_FLASH, who, &t) && t.elapsed < spec_int(F, "regions.materials.flashMs", 240)) fl[i] = 1;   /* the materials answer (Cargo's opening, build spec 4): a `flash` event on a counter lights its figure for the event's 240 ms without changing it */
    }
    snprintf(txt[i], sizeof txt[i], "%d", shown);
    widths[i] = M_icon + M_gap + v_measure(txt[i], M_px); total += widths[i];
  }
  total += M_between * 2;
  int mx = M_centre - (total + 1) / 2;
  for (int i = 0; i < 3; i++) {
    char id[48]; v_region("materials", LAYER_ART);
    snprintf(id, sizeof id, "top.m.%c.icon", K[i]); snprintf(a, sizeof a, "icon:%s:%d", ICON[i], M_icon);
    if (!v_sprite(id, a, mx, mrect[1] + 4, M_icon, M_icon)) { snprintf(b, sizeof b, "word: the picture %.50s is not on the face", a); v_error(b); }
    int fx = mx + M_icon + M_gap, fw = widths[i] - M_icon - M_gap;
    v_region("materials", LAYER_CHROME);
    if (fl[i]) { snprintf(id, sizeof id, "top.m.%c.flash", K[i]); snprintf(c, 24, "%s", v_scol(F, "colours.flash")); v_rect(id, fx - 3, mrect[1], fw + 6, mrect[3], c); }
    v_region("materials", LAYER_TYPE);
    snprintf(id, sizeof id, "top.m.%c", K[i]); snprintf(c, 24, "%s", v_scol(F, v_fmt("colours.%s", fl[i] ? "flashInk" : "figure")));
    v_text(id, txt[i], fx, mrect[1] + 4, fw, M_px, c);
    mx += widths[i] + M_between;
  }
  /* who is out, and with whom: marks only */
  int docked = spec_bool(P, "frame.top.companion.docked", 0), glyph[4], lampAt[4], face[4]; v_srect(F, "regions.companion.glyph", glyph); v_srect(F, "regions.companion.lampAt", lampAt); v_srect(F, "regions.companion.face", face);
  v_name("companion");
  snprintf(a, sizeof a, "%s", v_sstr(F, docked ? "regions.marks.companion.docked" : "regions.marks.companion.away")); mark("top.comp", a, glyph);
  snprintf(a, sizeof a, "%s", v_sstr(F, docked ? "regions.marks.lamp8.docked" : "regions.marks.lamp8.away"));
  if (!mark("top.lamp", a, lampAt)) { v_region("companion", LAYER_CHROME); snprintf(c, 24, "%s", v_scol(F, v_fmt("colours.%s", docked ? "lampOn" : "lampOff"))); v_rect("top.lamp", lampAt[0], lampAt[1], lampAt[2], lampAt[3], c); }
  v_name("companion");
  char mibi[48]; spec_str(P, "frame.top.companion.withMibi", mibi, sizeof mibi);
  if (!*mibi) snprintf(a, sizeof a, "%s", v_sstr(F, "regions.marks.face.empty"));
  else { char t[96]; snprintf(t, sizeof t, "%s", v_sstr(F, docked ? "regions.marks.face.docked" : "regions.marks.face.away")); char *at = strstr(t, "{mibi}"); if (at) snprintf(a, sizeof a, "%.*s%s%s", (int)(at - t), t, mibi, at + 6); else snprintf(a, sizeof a, "%s", t); }
  if (!mark("top.face", a, face)) v_faceHolder("top.face.ring", F, face[0], face[1], face[2], face[3], !docked);   /* until the face is painted, the ring alone */
  /* when: the sun mark, then the turn's figure, right-aligned to 1008 */
  int W_px = v_si(F, "regions.time.px", 0), W_right = v_si(F, "regions.time.right", 0), W_gap = v_si(F, "regions.time.gap", 0), tr[4], mk[2]; v_srect(F, "regions.time.rect", tr);
  mk[0] = spec_int(F, "regions.time.mark.0", 16); mk[1] = spec_int(F, "regions.time.mark.1", 16);
  char tmpl[24], fig[48]; snprintf(tmpl, sizeof tmpl, "%s", v_sstr(F, "strings.turn"));
  char num[16]; snprintf(num, sizeof num, "%d", spec_int(P, "frame.top.turn", 0));
  { char *at = strstr(tmpl, "{n}"); if (at) snprintf(fig, sizeof fig, "%.*s%s%s", (int)(at - tmpl), tmpl, num, at + 3); else snprintf(fig, sizeof fig, "%s", tmpl); }
  int fw = v_measure(fig, W_px), fx = W_right - fw, tflash = spec_bool(P, "frame.top.turnFlash", 0);
  { anim_state_t t; if (anim_get(ANIM_FLASH, "turn", &t) && (t.elapsed / 160) % 2 == 0) tflash = 1; }   /* the turn's flash: a second, blinking on for 160 ms and off for 160 */
  v_name("time");
  { int sun[4] = { fx - W_gap - mk[0], tr[1] + 4, mk[0], mk[1] }; snprintf(a, sizeof a, "%s", v_sstr(F, "regions.marks.sun")); mark("top.sun", a, sun); }
  if (tflash) { v_region("time", LAYER_CHROME); snprintf(c, 24, "%s", v_scol(F, "colours.flash")); v_rect("top.turn.flash", fx - 3, tr[1], fw + 6, tr[3], c); }
  v_region("time", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, v_fmt("colours.%s", tflash ? "flashInk" : "turn"))); v_text("top.turn", fig, fx, tr[1] + 4, fw, W_px, c);
}

void word_bottomLine(void) {
  char c[24], a[96], b[96], s[V_STR], t[V_STR]; int r[4], r2[4];
  v_srect(F, "regions.line.rect", r);
  snprintf(a, sizeof a, "%s", v_sstr(F, "regions.line.slice")); int bar = a[0] && wire_asset_slot(a) >= 0;   /* as the top bar's */
  if (bar) { v_region("line", LAYER_PAINTED); v_sprite("line.bar", a, r[0], r[1], r[2], r[3]); }
  v_region("line", LAYER_CHROME);
  snprintf(c, 24, "%s", v_scol(F, "colours.chrome")); kit_panel("line", r[0], r[1], r[2], r[3], c, NULL, bar);
  snprintf(c, 24, "%s", v_scol(F, "colours.rule")); kit_hairline("line.rule", r[0], r[1], bar ? 0 : r[2], c, 0, NULL);
  snprintf(c, 24, "%s", v_scol(F, "colours.dot"));
  for (int i = 0; i < spec_len(F, "regions.separators.x"); i++) { char p[64], id[32]; snprintf(p, sizeof p, "regions.separators.x.%d", i); snprintf(id, sizeof id, "line.sep.%d", i); int y0 = v_si(F, "regions.separators.y0", 0); kit_hairline(id, v_si(F, p, 0), y0, v_si(F, "regions.separators.y1", 0) - y0, c, 1, NULL); }
  int ok = spec_str(P, "frame.line.ok", s, sizeof s) > 0, dim = spec_bool(P, "frame.line.dim", 0);
  /* the action: the cap, the verb, then the price */
  int A_px = v_si(F, "regions.action.px", 0), A_gap = v_si(F, "regions.action.gap", 0), A_capGap = v_si(F, "regions.action.capGap", 0), A_capW = v_si(F, "regions.action.capSize.0", 0), cap[4];
  v_srect(F, "regions.action.rect", r2); v_srect(F, "regions.action.cap", cap);
  int ax = r2[0], ty = v_cap_top(r2[1] + 2, V_ANCHOR_CAP, A_px), k = 0;
  /* `short`: null, or the icons of the materials the price is short of, space-separated ("◆", "⚡ ◆"): only the figure after each named icon is `need`; `blocked`: an action that cannot be taken, no cap (its room stays empty, so the verb stays where it was),
     the verb and the price in `dim`; blocked and dim together are refused */
  char shorts[32] = ""; { int sl; const char *sr = spec_raw(P, "frame.line.short", &sl);
    if (sr && sr[0] == '"') spec_str(P, "frame.line.short", shorts, sizeof shorts); else if (sr && strncmp(sr, "null", 4) != 0) v_error("word: frame.line.short is a string of icons or null"); }
  int blocked = spec_bool(P, "frame.line.blocked", 0);
  if (blocked && dim) { v_error("word: frame.line says dim and blocked together"); blocked = 0; }
  if (ok) {
    if (!blocked) {
      v_region("action", LAYER_ART);
      int cr[4] = { ax, cap[1], cap[2], cap[3] }; snprintf(a, sizeof a, "%s", v_sstr(F, dim ? "regions.marks.capConfirmDim" : "regions.marks.capConfirm")); mark("line.cap.ok", a, cr);
    }
    ax += A_capW + A_capGap;
    v_region("action", LAYER_TYPE);
    snprintf(a, sizeof a, "line.a.%d", k++); snprintf(c, 24, "%s", v_scol(F, v_fmt("colours.%s", dim || blocked ? "dim" : "verb"))); ax = v_run(a, s, ax, ty, A_px, c, V_ALIGN_LEFT).end;
    if (spec_str(P, "frame.line.price", t, sizeof t) > 0) {   /* the price: each material's icon and figure (the figure amber when short), the nodes the same whichever materials it names */
      ax += A_gap; char cb[V_PRICE_N][24], co[24]; const char *cols[V_PRICE_N]; static const char *GLYPH[V_PRICE_N] = { "\xe2\x9a\xa1", "\xe2\x9d\x80", "\xe2\x97\x86", "\xe2\xa7\x97" };
      for (int g = 0; g < V_PRICE_N; g++) { int wait = g == V_PRICE_N - 1; snprintf(cb[g], 24, "%s", v_scol(F, v_fmt("colours.%s", blocked ? "dim" : (!wait && shorts[0] && strstr(shorts, GLYPH[g])) ? "need" : "price"))); cols[g] = cb[g]; }   /* the wait is never short: its figure is price, dim only when the action is blocked */
      if (shorts[0] && strstr(shorts, GLYPH[V_PRICE_N - 1])) v_error("word: frame.line.short names the wait, which is never short");
      snprintf(co, 24, "%s", v_scol(F, v_fmt("colours.%s", blocked ? "dim" : "price"))); snprintf(a, sizeof a, "line.a.%d", k++); v_price(a, t, ax, ty, A_px, cols, co);
    }
  }
  /* the context, centred on 512, clipped with an ellipsis to its zone */
  if (spec_str(P, "frame.line.subject", s, sizeof s) > 0) {
    int sr[4]; v_srect(F, "regions.subject.rect", sr); v_region("subject", LAYER_TYPE);
    v_clip(s, sr[2], v_si(F, "regions.subject.px", 0), t, sizeof t); snprintf(c, 24, "%s", v_scol(F, "colours.subject"));
    v_run("line.subject", t, v_si(F, "regions.subject.centre", 0), v_cap_top(sr[1] + 2, V_ANCHOR_CAP, v_si(F, "regions.subject.px", 0)), v_si(F, "regions.subject.px", 0), c, V_ALIGN_CENTRE);
  }
  /* the notice: the sentence right-aligned to 904 with its lamp 4 px to its left */
  if (spec_str(P, "frame.line.need", s, sizeof s) > 0) {
    int nr[4]; v_srect(F, "regions.need.rect", nr); int right = v_si(F, "regions.need.right", 0), px = v_si(F, "regions.need.px", 0);
    v_region("need", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, "colours.need")); v_run_t run = v_run("line.need", s, right, v_cap_top(nr[1] + 2, V_ANCHOR_CAP, px), px, c, V_ALIGN_RIGHT);
    int lw = spec_int(F, "regions.need.lamp.0", 12), lh = spec_int(F, "regions.need.lamp.1", 12);
    int lamp[4] = { right - run.width - v_si(F, "regions.need.lampGap", 0) - lw, nr[1] + (nr[3] - lh + 1) / 2, lw, lh };
    v_name("need"); snprintf(a, sizeof a, "%s", v_sstr(F, "regions.marks.lamp12.needsYou"));
    mark("line.need.lamp", a, lamp);   /* the signed amber lamp (home-lamp-amber-12x12), 1:1; no code-drawn lamp */
  } else if (spec_str(P, "frame.line.goal.text", s, sizeof s) > 0) {
    /* the goal (frame.json strings.goal): in the notice zone, mist, no lamp, when no need holds. The words, then the materials a short step lacks (20 px each); a name too wide for the zone with its icons falls back to `plain`
       (the key's nameless sibling), the face's own sum. */
    char icons[24] = "", plain[V_STR] = ""; spec_str(P, "frame.line.goal.icons", icons, sizeof icons); spec_str(P, "frame.line.goal.plain", plain, sizeof plain);
    int nr[4]; v_srect(F, "regions.need.rect", nr); int right = v_si(F, "regions.need.right", 0), px = v_si(F, "regions.need.px", 0), ni = 0;
    for (const char *q = icons; *q; q++) if ((unsigned char)*q == 0xe2) ni++;   /* the three icons are each one three-byte sequence beginning 0xe2 */
    const char *words = (v_run_width(s, px) + 20 * ni > nr[2] && plain[0]) ? plain : s;
    char full[V_STR + 32]; snprintf(full, sizeof full, "%s%s%s", words, ni ? " " : "", ni ? icons : "");
    v_region("need", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, "colours.subject")); v_run("line.goal", full, right, v_cap_top(nr[1] + 2, V_ANCHOR_CAP, px), px, c, V_ALIGN_RIGHT);
  }
  /* the way back: its cap, then one word, right-aligned to 1008 */
  if (spec_str(P, "frame.line.back", s, sizeof s) > 0) {
    int br[4], bcap[2]; v_srect(F, "regions.back.rect", br); bcap[0] = spec_int(F, "regions.back.cap.0", 16); bcap[1] = spec_int(F, "regions.back.cap.1", 16);
    int right = v_si(F, "regions.back.right", 0), px = v_si(F, "regions.back.px", 0), room = br[2] - bcap[0] - v_si(F, "regions.back.capGap", 0);
    v_region("back", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, "colours.back"));
    v_run_t run = v_run("line.back", v_run_width(s, px) > room ? "Back" : s, right, v_cap_top(br[1] + 2, V_ANCHOR_CAP, px), px, c, V_ALIGN_RIGHT);
    v_region("back", LAYER_ART); int cr[4] = { right - run.width - v_si(F, "regions.back.capGap", 0) - bcap[0], cap[1], bcap[0], bcap[1] };
    snprintf(a, sizeof a, "%s", v_sstr(F, "regions.marks.capBack")); mark("line.cap.back", a, cr);
  }
  (void)b;
}

void word_messagePlate(void) {
  char s[V_STR], c[24], c2[24];
  if (spec_str(P, "frame.plate.text", s, sizeof s) <= 0) return;
  if (spec_bool(P, "frame.plate.timed", 0) && !anim_get(ANIM_PLATE, "msg", NULL)) return;   /* a timed plate is shown while its `plate` event plays (4 s) */
  int maxW = v_si(F, "regions.plate.maxWidth", 0), pad = v_si(F, "regions.plate.pad", 0), px = v_si(F, "regions.plate.px", 0), centre = v_si(F, "regions.plate.centre", 0), lead = v_si(F, "regions.plate.lead", 0), line = v_si(F, "regions.plate.line", 0);
  char buf[V_STR * 4]; int n = v_wrap(s, maxW - 2 * pad, px, buf, sizeof buf, 8), widest = 0; const char *l = buf;
  for (int i = 0; i < n; i++) { int w = v_run_width(l, px); if (w > widest) widest = w; l += strlen(l) + 1; }
  int focal[4], hasf = spec_len(P, "frame.plate.focal") == 4; for (int i = 0; i < 4 && hasf; i++) { char p[40]; snprintf(p, sizeof p, "frame.plate.focal.%d", i); focal[i] = spec_int(P, p, 0); }
  int rc[4]; layout_plate_position(maxW, pad, lead, line, centre, v_si(F, "regions.plate.bottom", 0), v_si(F, "regions.plate.topOverFocal", 0), n, widest, hasf ? focal : v_focal(), rc);   /* the props may name a box; else the screen's own focal region */
  v_region("plate", LAYER_CHROME);
  snprintf(c, 24, "%s", v_scol(F, "colours.plateShadow")); v_rect("plate.shadow", rc[0], rc[1] + 3, rc[2], rc[3], c);
  snprintf(c, 24, "%s", v_scol(F, "colours.plate")); snprintf(c2, 24, "%s", v_scol(F, "colours.plateEdge")); kit_panel("plate", rc[0], rc[1], rc[2], rc[3], c, c2, 0);
  v_region("plate", LAYER_TYPE); snprintf(c, 24, "%s", v_scol(F, "colours.plateText")); l = buf;
  for (int i = 0; i < n; i++) { char id[24]; snprintf(id, sizeof id, "plate.l%d", i); v_run(id, l, centre, rc[1] + lead / 2 + i * line, px, c, V_ALIGN_CENTRE); l += strlen(l) + 1; }
}
