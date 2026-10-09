/* The frame's three words: the top bar, the bottom line and the message plate (station-layouts.md "The frame"), ported from components/topBar.mjs, bottomLine.mjs and
   messagePlate.mjs. Spec: the `frame` spec; props: `props.frame.top`, `.line`, `.plate`. Marks are pictures the host has sent: one that is not on the face draws nothing and
   the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define F "frame"
#define P "props"
static int fi(const char *path) { return spec_int(F, path, 0); }
static void fs(const char *path, char *buf, int cap) { spec_str(F, path, buf, cap); }
/* a colour of the frame's table: its palette name */
static void colour(const char *key, char *buf) { char p[64]; snprintf(p, sizeof p, "colours.%s", key); spec_str(F, p, buf, 24); }
static void rect_of(const char *path, int r[4]) { if (!v_spec_rect(F, path, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static void lower(char *s) { for (; *s; s++) if (*s >= 'A' && *s <= 'Z') *s = (char)(*s + 32); }
/* a mark whose master may not be placed: the picture when the face has it, else `standin` (a flat shape the frame draws until then) when there is one */
static int mark(const char *id, const char *asset, const int r[4]) { return v_sprite(id, asset, r[0], r[1], r[2], r[3]); }

void word_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge) {
  char n[96]; v_rect(id, x, y, w, h, fill);
  if (!edge) return;
  snprintf(n, sizeof n, "%s.et", id); v_rect(n, x, y, w, 1, edge);
  snprintf(n, sizeof n, "%s.eb", id); v_rect(n, x, y + h - 1, w, 1, edge);
  snprintf(n, sizeof n, "%s.el", id); v_rect(n, x, y, 1, h, edge);
  snprintf(n, sizeof n, "%s.er", id); v_rect(n, x + w - 1, y, 1, h, edge);
}
void word_hairline(const char *id, int x, int y, int len, const char *c, int vertical) { if (vertical) v_rect(id, x, y, 1, len, c); else v_rect(id, x, y, len, 1, c); }

void word_topBar(void) {
  char c[24], a[96], b[96], s[V_STR]; int r[4], rr[4];
  rect_of("regions.top.rect", r);
  v_region("top", LAYER_CHROME);
  colour("chrome", c); word_panel("top", r[0], r[1], r[2], r[3], c, NULL);
  colour("rule", c); v_rect("top.rule", r[0], r[1] + r[3] - 1, r[2], 1, c);
  colour("topRule", c);
  for (int i = 0; i < spec_len(F, "regions.topRules.x"); i++) { char p[64], id[32]; snprintf(p, sizeof p, "regions.topRules.x.%d", i); snprintf(id, sizeof id, "top.sep.%d", i); int y0 = fi("regions.topRules.y0"), y1 = fi("regions.topRules.y1"); v_rect(id, fi(p), y0, 1, y1 - y0, c); }
  /* where you are: the room's mark, then the one word */
  v_region("title", LAYER_PAINTED);   /* the top bar's marks (room, companion, face, sun) are painted masters: placed, they leave the palette */
  char screen[32], room[24]; spec_str(P, "frame.top.screen", screen, sizeof screen);
  snprintf(a, sizeof a, "regions.title.marks.%s", screen); fs(a, room, sizeof room);
  rect_of("regions.title.mark", rr);
  if (*room) { lower(room); snprintf(a, sizeof a, "regions.marks.room.%s", room); fs(a, b, sizeof b); mark("top.room", b, rr); }
  v_region("title", LAYER_TYPE);
  spec_str(P, "frame.top.title", s, sizeof s); colour("title", c);
  v_run("top.title", s, fi("regions.title.text.0"), fi("regions.title.text.1") + 2, fi("regions.title.px"), c, V_ALIGN_LEFT);
  /* what you hold, centred on 512 */
  static const char K[3] = { 'e', 'd', 's' }; static const char *ICON[3] = { "energy", "data", "essence" };
  int M_icon = fi("regions.materials.icon"), M_gap = fi("regions.materials.gap"), M_px = fi("regions.materials.px"), M_between = fi("regions.materials.between"), M_centre = fi("regions.materials.centre");
  int mrect[4]; rect_of("regions.materials.rect", mrect);
  int widths[3], total = 0; char txt[3][16], fl[3];
  for (int i = 0; i < 3; i++) {
    int shown; snprintf(a, sizeof a, "frame.top.materials.%c", K[i]); shown = spec_int(P, a, 0);
    snprintf(a, sizeof a, "frame.top.flash.%c", K[i]); fl[i] = (char)spec_bool(P, a, 0);
    { /* a counter counts up toward its value one unit every 70 ms, the first at once, with a 240 ms tick behind the figure that changed (a `tick` event: from, to) */
      anim_state_t t; char who[2] = { K[i], 0 };
      if (anim_get(ANIM_TICK, who, &t) && t.to > t.from) { int n = t.to - t.from, steps = t.elapsed / 70 + 1; if (steps > n) steps = n; shown = t.from + steps; if (t.elapsed - (steps - 1) * 70 < 240) fl[i] = 1; }
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
    if (fl[i]) { snprintf(id, sizeof id, "top.m.%c.flash", K[i]); colour("flash", c); v_rect(id, fx - 3, mrect[1], fw + 6, mrect[3], c); }
    v_region("materials", LAYER_TYPE);
    snprintf(id, sizeof id, "top.m.%c", K[i]); colour(fl[i] ? "flashInk" : "figure", c);
    v_text(id, txt[i], fx, mrect[1] + 4, fw, M_px, c);
    mx += widths[i] + M_between;
  }
  /* who is out, and with whom: marks only */
  int docked = spec_bool(P, "frame.top.companion.docked", 0), glyph[4], lampAt[4], face[4]; rect_of("regions.companion.glyph", glyph); rect_of("regions.companion.lampAt", lampAt); rect_of("regions.companion.face", face);
  v_region("companion", LAYER_PAINTED);
  fs(docked ? "regions.marks.companion.docked" : "regions.marks.companion.away", a, sizeof a); mark("top.comp", a, glyph);
  fs(docked ? "regions.marks.lamp8.docked" : "regions.marks.lamp8.away", a, sizeof a);
  v_layer(LAYER_PAINTED);   /* the frame's lamps are painted masters (the art director's layer table) */
  if (!mark("top.lamp", a, lampAt)) { v_region("companion", LAYER_CHROME); colour(docked ? "lampOn" : "lampOff", c); v_rect("top.lamp", lampAt[0], lampAt[1], lampAt[2], lampAt[3], c); }
  v_region("companion", LAYER_PAINTED);
  char mibi[48]; spec_str(P, "frame.top.companion.withMibi", mibi, sizeof mibi);
  if (!*mibi) fs("regions.marks.face.empty", a, sizeof a);
  else { char t[96]; fs(docked ? "regions.marks.face.docked" : "regions.marks.face.away", t, sizeof t); char *at = strstr(t, "{mibi}"); if (at) snprintf(a, sizeof a, "%.*s%s%s", (int)(at - t), t, mibi, at + 6); else snprintf(a, sizeof a, "%s", t); }
  if (!mark("top.face", a, face)) {   /* until the face is painted, the ring alone: the ellipse op in the face-ring role */
    v_layer(LAYER_ART); colour(docked ? "faceRing" : "faceRingAway", c); snprintf(b, sizeof b, "[[\"ring\",\"ellipse\",0,0,%d,%d,%d,0,\"%s\"]]", face[2], face[3], fi("focus.ring.width"), c);
    snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", b); prim_node(v_id("top.face.ring"), FN_COMPOSED, face[0], face[1], face[2], face[3], 0, 0, 0);
  }
  /* when: the sun mark, then the turn's figure, right-aligned to 1008 */
  int W_px = fi("regions.time.px"), W_right = fi("regions.time.right"), W_gap = fi("regions.time.gap"), tr[4], mk[2]; rect_of("regions.time.rect", tr);
  mk[0] = spec_int(F, "regions.time.mark.0", 16); mk[1] = spec_int(F, "regions.time.mark.1", 16);
  char tmpl[24], fig[48]; fs("strings.turn", tmpl, sizeof tmpl);
  char num[16]; snprintf(num, sizeof num, "%d", spec_int(P, "frame.top.turn", 0));
  { char *at = strstr(tmpl, "{n}"); if (at) snprintf(fig, sizeof fig, "%.*s%s%s", (int)(at - tmpl), tmpl, num, at + 3); else snprintf(fig, sizeof fig, "%s", tmpl); }
  int fw = v_measure(fig, W_px), fx = W_right - fw, tflash = spec_bool(P, "frame.top.turnFlash", 0);
  { anim_state_t t; if (anim_get(ANIM_FLASH, "turn", &t) && (t.elapsed / 160) % 2 == 0) tflash = 1; }   /* the turn's flash: a second, blinking on for 160 ms and off for 160 */
  v_region("time", LAYER_PAINTED);
  { int sun[4] = { fx - W_gap - mk[0], tr[1] + 4, mk[0], mk[1] }; fs("regions.marks.sun", a, sizeof a); mark("top.sun", a, sun); }
  if (tflash) { v_region("time", LAYER_CHROME); colour("flash", c); v_rect("top.turn.flash", fx - 3, tr[1], fw + 6, tr[3], c); }
  v_region("time", LAYER_TYPE); colour(tflash ? "flashInk" : "turn", c); v_text("top.turn", fig, fx, tr[1] + 4, fw, W_px, c);
}

void word_bottomLine(void) {
  char c[24], a[96], b[96], s[V_STR], t[V_STR]; int r[4], r2[4];
  rect_of("regions.line.rect", r);
  v_region("line", LAYER_CHROME);
  colour("chrome", c); word_panel("line", r[0], r[1], r[2], r[3], c, NULL);
  colour("rule", c); v_rect("line.rule", r[0], r[1], r[2], 1, c);
  colour("dot", c);
  for (int i = 0; i < spec_len(F, "regions.separators.x"); i++) { char p[64], id[32]; snprintf(p, sizeof p, "regions.separators.x.%d", i); snprintf(id, sizeof id, "line.sep.%d", i); int y0 = fi("regions.separators.y0"); v_rect(id, fi(p), y0, 1, fi("regions.separators.y1") - y0, c); }
  int ok = spec_str(P, "frame.line.ok", s, sizeof s) > 0, dim = spec_bool(P, "frame.line.dim", 0), shortp = spec_bool(P, "frame.line.short", 0);
  /* the action: the cap, the verb, then the price */
  int A_px = fi("regions.action.px"), A_gap = fi("regions.action.gap"), A_capGap = fi("regions.action.capGap"), A_capW = fi("regions.action.capSize.0"), cap[4];
  rect_of("regions.action.rect", r2); rect_of("regions.action.cap", cap);
  int ax = r2[0], ty = r2[1] + 2, k = 0;
  if (ok) {
    v_region("action", LAYER_ART);
    int cr[4] = { ax, cap[1], cap[2], cap[3] }; fs(dim ? "regions.marks.capConfirmDim" : "regions.marks.capConfirm", a, sizeof a); mark("line.cap.ok", a, cr);
    ax += A_capW + A_capGap;
    v_region("action", LAYER_TYPE);
    snprintf(a, sizeof a, "line.a.%d", k++); colour(dim ? "dim" : "verb", c); ax = v_run(a, s, ax, ty, A_px, c, V_ALIGN_LEFT).end;
    if (spec_str(P, "frame.line.price", t, sizeof t) > 0) { ax += A_gap; snprintf(a, sizeof a, "line.a.%d", k++); colour(shortp ? "need" : "price", c); v_run(a, t, ax, ty, A_px, c, V_ALIGN_LEFT); }
  }
  /* the context, centred on 512, clipped with an ellipsis to its zone */
  if (spec_str(P, "frame.line.subject", s, sizeof s) > 0) {
    int sr[4]; rect_of("regions.subject.rect", sr); v_region("subject", LAYER_TYPE);
    v_clip(s, sr[2], fi("regions.subject.px"), t, sizeof t); colour("subject", c);
    v_run("line.subject", t, fi("regions.subject.centre"), sr[1] + 2, fi("regions.subject.px"), c, V_ALIGN_CENTRE);
  }
  /* the notice: the sentence right-aligned to 904 with its lamp 4 px to its left */
  if (spec_str(P, "frame.line.need", s, sizeof s) > 0) {
    int nr[4]; rect_of("regions.need.rect", nr); int right = fi("regions.need.right"), px = fi("regions.need.px");
    v_region("need", LAYER_TYPE); colour("need", c); v_run_t run = v_run("line.need", s, right, nr[1] + 2, px, c, V_ALIGN_RIGHT);
    int lw = spec_int(F, "regions.need.lamp.0", 12), lh = spec_int(F, "regions.need.lamp.1", 12);
    int lamp[4] = { right - run.width - fi("regions.need.lampGap") - lw, nr[1] + (nr[3] - lh + 1) / 2, lw, lh };
    v_region("need", LAYER_PAINTED); fs("regions.marks.lamp12", a, sizeof a);
    if (!mark("line.need.lamp", a, lamp)) { v_region("need", LAYER_CHROME); colour("needLamp", c); v_rect("line.need.lamp", lamp[0], lamp[1], lamp[2], lamp[3], c); }
  }
  /* the way back: its cap, then one word, right-aligned to 1008 */
  if (spec_str(P, "frame.line.back", s, sizeof s) > 0) {
    int br[4], bcap[2]; rect_of("regions.back.rect", br); bcap[0] = spec_int(F, "regions.back.cap.0", 16); bcap[1] = spec_int(F, "regions.back.cap.1", 16);
    int right = fi("regions.back.right"), px = fi("regions.back.px"), room = br[2] - bcap[0] - fi("regions.back.capGap");
    v_region("back", LAYER_TYPE); colour("back", c);
    v_run_t run = v_run("line.back", v_run_width(s, px) > room ? "Back" : s, right, br[1] + 2, px, c, V_ALIGN_RIGHT);
    v_region("back", LAYER_ART); int cr[4] = { right - run.width - fi("regions.back.capGap") - bcap[0], cap[1], bcap[0], bcap[1] };
    fs("regions.marks.capBack", a, sizeof a); mark("line.cap.back", a, cr);
  }
  (void)b;
}

void word_messagePlate(void) {
  char s[V_STR], c[24], c2[24];
  if (spec_str(P, "frame.plate.text", s, sizeof s) <= 0) return;
  if (spec_bool(P, "frame.plate.timed", 0) && !anim_get(ANIM_PLATE, "msg", NULL)) return;   /* a timed plate is shown while its `plate` event plays (4 s) */
  int maxW = fi("regions.plate.maxWidth"), pad = fi("regions.plate.pad"), px = fi("regions.plate.px"), centre = fi("regions.plate.centre"), lead = fi("regions.plate.lead"), line = fi("regions.plate.line");
  char buf[V_STR * 4]; int n = v_wrap(s, maxW - 2 * pad, px, buf, sizeof buf, 8), widest = 0; const char *l = buf;
  for (int i = 0; i < n; i++) { int w = v_run_width(l, px); if (w > widest) widest = w; l += strlen(l) + 1; }
  int focal[4], hasf = spec_len(P, "frame.plate.focal") == 4; for (int i = 0; i < 4 && hasf; i++) { char p[40]; snprintf(p, sizeof p, "frame.plate.focal.%d", i); focal[i] = spec_int(P, p, 0); }
  int rc[4]; layout_plate_position(maxW, pad, lead, line, centre, fi("regions.plate.bottom"), fi("regions.plate.topOverFocal"), n, widest, hasf ? focal : v_focal(), rc);   /* the props may name a box; else the screen's own focal region */
  v_region("plate", LAYER_CHROME);
  colour("plateShadow", c); v_rect("plate.shadow", rc[0], rc[1] + 3, rc[2], rc[3], c);
  colour("plate", c); colour("plateEdge", c2); word_panel("plate", rc[0], rc[1], rc[2], rc[3], c, c2);
  v_region("plate", LAYER_TYPE); colour("plateText", c); l = buf;
  for (int i = 0; i < n; i++) { char id[24]; snprintf(id, sizeof id, "plate.l%d", i); v_run(id, l, centre, rc[1] + lead / 2 + i * line, px, c, V_ALIGN_CENTRE); l += strlen(l) + 1; }
}
