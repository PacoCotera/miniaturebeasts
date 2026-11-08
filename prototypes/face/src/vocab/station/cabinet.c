/* The pod inventory's words (the pods picker's design B, owner ruling 2026-11-07): the pod picker (the dark ground, the verb line, Sort, Filter and Find, a grid of big pods each with its name and one small mark, the focused
   pod's history on one line) and its filter tray and Find panel over it; the shared plates and lines (inv_say, inv_plate, inv_wrap) that Compare and the reading room use, and the pod's rail at the small size (mini_rail).
   Spec: `pods` regions.inventory (picker, tray, find, panel.rail). Props: regions.inv { verbs [{ id, word, on }], heading, tools { sort, filter, filterAmber, find, dim }, grid { cards [{ k, row, col, pod, name, sealed, mark, fade, held }],
   first }, rail { share, from } | null, detail { left, right, amber }, empty [title, line] }, regions.tray { rows [{ head, chips [{ id, word, lit, dim }] }] }, regions.find { recent [], letters [{ ch, lit }], words [{ word, kind, row }], first, head }.
   Rows are counted from the first row on screen (row 0 at the grid's top); a row that is not whole on screen is drawn only while the scroll plays. A picture the host has not sent is a slot not yet filled: nothing is drawn and the
   layout does not move. Words are set by role (frame.json type.roles). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "pods"
#define I "regions.inventory"
#define P "regions.inv"

static int has(const char *id) { return id && *id && wire_has_asset(id); }
static int icons_in(const char *s) { return strstr(s, "\xe2\x97\x86") || strstr(s, "\xe2\x9d\x80") || strstr(s, "\xe2\x9a\xa1") || strstr(s, "\xe2\x9c\x95"); }   /* ◆ ❀ ⚡ ✕: a run with icons inline */
static char *last_clause(char *t);
/* the words fitted to w with no ellipsis (a word never ends in "…"): the last " · " clause dropped while it does not fit, then the last whole word */
static void fit_words(char *t, int w, const char *role) {
  for (char *cut; v_role_width(t, role) > w && (cut = last_clause(t));) *cut = 0;
  for (char *sp; v_role_width(t, role) > w && (sp = strrchr(t, ' '));) *sp = 0;
  for (size_t n = strlen(t); n > 0 && (t[n - 1] == ',' || t[n - 1] == ' '); n--) t[n - 1] = 0;   /* a dropped word never leaves its comma behind */
}
/* one line of words by role in the box [x, x + w), fitted (fit_words) past w; its cap centred in h from top; a line with icons is a run (no cut) */
void inv_say(const char *id_in, const char *text, int x, int top, int w, int h, const char *role, const char *ground, int align) {
  char id[96], cut[V_STR + 8]; snprintf(id, sizeof id, "%s", id_in); int y = v_role_cap_in(top, h, role);   /* the id held: the measures below reuse v_fmt's buffers */
  if (icons_in(text)) { int tw = v_role_width(text, role); v_say_run(id, text, align == V_ALIGN_RIGHT ? x + w : align == V_ALIGN_CENTRE ? x + w / 2 : x, y, role, ground, align); (void)tw; return; }
  size_t tl = strlen(text); if (tl >= sizeof cut) tl = sizeof cut - 1; memcpy(cut, text, tl); cut[tl] = 0; fit_words(cut, w, role);
  if (align == V_ALIGN_CENTRE) v_say_in(id, cut, x, w, y, V_ANCHOR_CAP, role, ground);
  else v_say(id, cut, align == V_ALIGN_RIGHT ? x + w : x, y, V_ANCHOR_CAP, role, ground, align);
}
/* up to `max` lines of words wrapped to w, one under the other at `pitch` */
void inv_wrap(const char *id, const char *text, int x, int top, int w, int pitch, int max, const char *role, const char *ground) {
  char buf[V_STR * 3]; int n = v_role_wrap(text, w, role, buf, sizeof buf, max); const char *l = buf;
  for (int i = 0; i < n; i++) { inv_say(v_fmt("%s.%d", id, i), l, x, top + i * pitch, w, pitch, role, ground, V_ALIGN_LEFT); l += strlen(l) + 1; }
}
/* the width a plate takes for its words: the words and the plate's pad either side */
int inv_plate_w(const char *text, const char *role, int pad) { return v_role_width(text, role) + 2 * pad; }
#define PLATE_PAD 8
/* the start of the words' last " · " clause, or NULL when there is none */
static char *last_clause(char *t) { char *at = NULL; for (char *q = strstr(t, " \xc2\xb7 "); q; q = strstr(q + 1, " \xc2\xb7 ")) at = q; return at; }
/* the wood plate (review round 2, P2): the fill, its 1 px hairline and the 1 px bevel inside it, light on the top and left (kit_panel) and dark on the bottom and right (<id>.sb, <id>.sr) */
static void wood_plate(const char *id_in, const int r[4], const char *base) {
  char id[96]; snprintf(id, sizeof id, "%s", id_in);
  char fill[24], edge[24], bev[24], shade[24]; snprintf(fill, sizeof fill, "%s", v_scol_or(S, v_fmt("%s.fill", base), "woodPlate")); snprintf(edge, sizeof edge, "%s", v_scol_or(S, v_fmt("%s.edge", base), "brass")); snprintf(bev, sizeof bev, "%s", v_scol_or(S, v_fmt("%s.bevel", base), "")); snprintf(shade, sizeof shade, "%s", v_scol_or(S, v_fmt("%s.shade", base), ""));
  kit_panel(id, r[0], r[1], r[2], r[3], fill, edge, bev[0] ? bev : NULL, 0);
  if (shade[0] && r[2] > 3 && r[3] > 3) { v_rect(v_fmt("%s.sb", id), r[0] + 1, r[1] + r[3] - 2, r[2] - 2, 1, shade); v_rect(v_fmt("%s.sr", id), r[0] + r[2] - 2, r[1] + 1, 1, r[3] - 3, shade); }
}
/* a wood plate with bone words (a button never reads as text): the plate, the words centred in it, in fog when held (the plate keeps its fill) */
void inv_plate(const char *id_in, const int r[4], const char *text, int dim, int lit, const char *base) {
  char id[96]; snprintf(id, sizeof id, "%s", id_in); char role[40];
  v_region(id, LAYER_CHROME); wood_plate(v_fmt("%s.plate", id), r, base);
  if (lit) { char m[24]; snprintf(m, sizeof m, "%s", v_scol_or(S, v_fmt("%s.lit", base), "mint")); v_rect(v_fmt("%s.lit", id), r[0] + 2, r[1] + r[3] - 3, r[2] - 4, 2, m); }   /* a lit chip: a 2 px mint base line, never a fill */
  snprintf(role, sizeof role, "%s", dim ? "label.fog" : "label");
  char t[V_STR]; snprintf(t, sizeof t, "%s", text); int room = r[2] - 2 * PLATE_PAD;
  size_t tl = strlen(t); int cross = tl > 4 && strcmp(t + tl - 4, " \xe2\x9c\x95") == 0;
  if (cross) {   /* a chip's ✕ in bone, code-drawn after its words (the seal is the only red) */
    t[tl - 4] = 0; int tw = v_role_width(t, role), x0 = r[0] + (r[2] - tw - 14) / 2;
    v_region(id, LAYER_TYPE); v_say(v_fmt("%s.word", id), t, x0, v_role_cap_in(r[1], r[3], role), V_ANCHOR_CAP, role, "slate", V_ALIGN_LEFT);
    v_region(id, LAYER_CHROME); v_composed(v_fmt("%s.x", id), x0 + tw + 6, r[1] + (r[3] - 8) / 2, 8, 8, "[[\"dot\",0,0,\"bone\"],[\"dot\",1,1,\"bone\"],[\"dot\",2,2,\"bone\"],[\"dot\",3,3,\"bone\"],[\"dot\",4,4,\"bone\"],[\"dot\",5,5,\"bone\"],[\"dot\",6,6,\"bone\"],[\"dot\",7,7,\"bone\"],[\"dot\",7,0,\"bone\"],[\"dot\",6,1,\"bone\"],[\"dot\",5,2,\"bone\"],[\"dot\",4,3,\"bone\"],[\"dot\",3,4,\"bone\"],[\"dot\",2,5,\"bone\"],[\"dot\",1,6,\"bone\"],[\"dot\",0,7,\"bone\"]]");
    return;
  }
  for (char *cut; v_role_width(t, role) > room && (cut = last_clause(t));) *cut = 0;   /* words wider than the plate drop their last " · " clause (its reason, its why) until they fit: the bottom line says them whole */
  v_region(id, LAYER_TYPE); inv_say(v_fmt("%s.word", id), t, r[0], r[1], r[2], r[3], role, "slate", V_ALIGN_CENTRE);
}


/* ---- the pod's rail at the small size, shared by the panel and Compare (the reading screen spec section 4; UI/UX 2026-10-30) ----
   The dark inset (a nine-slice at 288 x 48), the 272 x 40 rail picture 8 px in and 4 down, the 12 px marks over their lanes (rows 0 to 11 of the picture), and, on Compare, the bracket on the lane in hand.
   pp is the props object { pic, inset, lanes [{ id, n, state, marks [glint, goal, differs] }], marks { glint, star, differs }, hand, nudge }; the layout rule is the reading rail's at 272 wide, floored. */
static void mring(const char *id_in, int x, int y, int w, int h, int wpx, int r, const char *colour) {
  char id[96], ops[1024]; snprintf(id, sizeof id, "%s", id_in); int n = snprintf(ops, sizeof ops, "[");
  for (int k = 0; k < wpx; k++) n += snprintf(ops + n, sizeof ops - n, "%s[\"rrect\",%d,%d,%d,%d,%d,\"\",\"%s\"]", k ? "," : "", k, k, w - 2 * k, h - 2 * k, r - k > 0 ? r - k : 0, colour);
  snprintf(ops + n, sizeof ops - n, "]"); v_composed(id, x, y, w, h, ops);
}
void mini_rail(const char *ns_in, const char *pp_in, const int inset[4]) {
  char ns[48], pp[96]; snprintf(ns, sizeof ns, "%s", ns_in); snprintf(pp, sizeof pp, "%s", pp_in);
  int L = v_plen(v_fmt("%s.lanes", pp)), q[4]; if (L <= 0) return; if (L > 16) L = 16;
  char rp[96]; snprintf(rp, sizeof rp, "%s", v_pstr(v_fmt("%s.pic", pp))); if (!*rp) return;
  int px = v_sk(S, I ".panel.rail.inset.pic", 0), py = v_sk(S, I ".panel.rail.inset.pic", 1), W = v_sk(S, I ".panel.rail.rect", 2), H = v_sk(S, I ".panel.rail.rect", 3);
  q[0] = inset[0] + px; q[1] = inset[1] + py; q[2] = W; q[3] = H;
  char ip[96]; snprintf(ip, sizeof ip, "%s", v_pstr(v_fmt("%s.inset", pp))); if (has(ip)) { int sl[4] = { 6, 6, 6, 6 }; v_region(ns, LAYER_PAINTED); v_name(ns); v_nine(v_fmt("%s.inset", ns), ip, inset[0], inset[1], inset[2], inset[3], sl); }
  int cnt[16], n = 0; for (int i = 0; i < L; i++) { cnt[i] = v_pint(v_fmt("%s.lanes.%d.n", pp, i), 1); n += cnt[i]; }
  int G = n < 16 ? v_si(S, I ".panel.rail.gap.short", 12) : v_si(S, I ".panel.rail.gap.long", 4), tg = v_si(S, I ".panel.rail.tagGap", 2), mn = v_si(S, I ".panel.rail.pill.min", 4), mx = v_si(S, I ".panel.rail.pill.max", 16);
  int B = (W - G * (L - 1) - tg * (n - L)) / n; if (B < mn) B = mn; if (B > mx) B = mx;   /* floor, not round: every species fits the 272 px */
  int total = G * (L - 1); for (int i = 0; i < L; i++) total += cnt[i] * B + tg * (cnt[i] - 1);
  int x0 = (W - total) / 2;   /* floor */
  int lx[16], lw[16], x = x0; for (int i = 0; i < L; i++) { lw[i] = cnt[i] * B + tg * (cnt[i] - 1); lx[i] = x; x += lw[i] + G; }
  v_region(ns, LAYER_PAINTED); v_name(ns); v_slot(ns, rp, NULL, q[0], q[1], q[2], q[3], 1);
  char mg[3][96]; const char *mkn[3] = { "glint", "star", "differs" }; for (int k = 0; k < 3; k++) snprintf(mg[k], sizeof mg[k], "%s", v_pstr(v_fmt("%s.marks.%s", pp, mkn[k])));
  int my = q[1] + v_si(S, I ".panel.rail.markY", 0), mp = v_si(S, I ".panel.rail.markPitch", 14), msz = v_si(S, I ".panel.rail.mark", 12);
  for (int i = 0; i < L; i++) {
    int nm = 0, nl = v_plen(v_fmt("%s.lanes.%d.marks", pp, i)); char kind[3][12];
    for (int j = 0; j < nl && j < 3; j++) { snprintf(kind[nm], sizeof kind[nm], "%s", v_pstr(v_fmt("%s.lanes.%d.marks.%d", pp, i, j))); nm++; }
    /* a lane 26 px or wider shows both marks, 14 apart; a narrower lane shows one, the star before the glint */
    int room = lw[i] >= msz + mp ? 2 : 1;
    if (nm > room) { int pick = -1; for (int j = 0; j < nm; j++) if (!strcmp(kind[j], "goal")) pick = j; if (pick > 0) memcpy(kind[0], kind[pick], sizeof kind[0]); nm = 1; }
    int tot = msz + mp * (nm - 1), mxx = q[0] + lx[i] + (lw[i] - tot) / 2;
    for (int j = 0; j < nm; j++) { const char *a = !strcmp(kind[j], "goal") ? mg[1] : !strcmp(kind[j], "differs") ? mg[2] : mg[0];
      v_region(ns, LAYER_PAINTED); v_name(ns); v_slot(v_fmt("%s.mark.%d.%d", ns, i, j), a, NULL, mxx + j * mp, my, msz, msz, *a != 0); }
  }
  int k = v_pint(v_fmt("%s.hand", pp), -1);   /* Compare: the bracket on the lane in hand, a 2 px readAmber ring 3 px outside it, whatever its state; a stop nudges it 2 px */
  if (k >= 0 && k < L) {
    int nudge = v_pint(v_fmt("%s.nudge", pp), 0), off = 0; anim_state_t na;
    if (anim_get(ANIM_WIPE, "nudge", &na) && na.ms > 0 && na.elapsed < na.ms) { int half = na.ms / 2; off = (na.elapsed < half ? na.elapsed : na.ms - na.elapsed) * v_si(S, I ".panel.rail.nudge", 2) / (half > 0 ? half : 1); off *= nudge < 0 ? -1 : 1; }
    int dx = v_si(S, I ".panel.rail.bracket.dx", 3); char col[24]; snprintf(col, sizeof col, "%s", v_scol_or(S, I ".panel.rail.bracket.colour", "readAmber"));
    v_region(ns, LAYER_CHROME); mring(v_fmt("%s.bracket", ns), q[0] + lx[k] - dx + off, q[1] + v_si(S, I ".panel.rail.bracket.y", 12), lw[k] + 2 * dx, v_si(S, I ".panel.rail.bracket.h", 30), v_si(S, I ".panel.rail.bracket.w", 2), v_si(S, I ".panel.rail.bracket.r", 4), col);
  }
}


/* ---- the filter tray over the cabinet ---- */
int inv_tchip_rect(int row, int col, int out[4]) {
  int x0 = v_si(S, I ".tray.rowX", 32), hw = v_si(S, I ".tray.heads.w", 72), gap = v_sk(S, I ".tray.chip", 0), pad = v_si(S, I ".tray.chip.pad", 10), h = v_si(S, I ".tray.chip.h", 32), y = v_sk(S, I ".tray.rows", row), x = x0 + hw + 8, right = x0 + v_si(S, I ".tray.rowW", 640);
  gap = v_si(S, I ".tray.chip.gap", 8);
  for (int c = 0, n = v_plen(v_fmt("regions.tray.rows.%d.chips", row)); c < n && c <= col; c++) {
    char w[V_STR]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt("regions.tray.rows.%d.chips.%d.word", row, c))); int cw = inv_plate_w(w, "label", pad);
    if (x + cw > right) break;
    if (c == col) { out[0] = x; out[1] = y; out[2] = cw; out[3] = h; return 1; }
    x += cw + gap;
  }
  out[0] = out[1] = out[2] = out[3] = 0; return 0;
}
void word_inventoryTray(void) {
  int r[4]; v_srect(S, I ".tray.rect", r); v_region("tray", LAYER_CHROME); kit_panel("tray.paper", r[0], r[1], r[2], r[3], v_scol(S, I ".tray.fill"), v_scol(S, I ".tray.edge"), NULL, 0);
  int x0 = v_si(S, I ".tray.rowX", 32), hw = v_si(S, I ".tray.heads.w", 72), h = v_si(S, I ".tray.chip.h", 32);
  for (int row = 0, nr = v_plen("regions.tray.rows"); row < nr && row < 4; row++) {
    char t[V_STR]; snprintf(t, sizeof t, "%s", v_pstr(v_fmt("regions.tray.rows.%d.head", row))); int y = v_sk(S, I ".tray.rows", row);
    v_region("tray.head", LAYER_TYPE); inv_say(v_fmt("tray.head.%d", row), t, x0, y, hw, h, "quiet.umber", "paper", V_ALIGN_LEFT);
    for (int c = 0, n = v_plen(v_fmt("regions.tray.rows.%d.chips", row)); c < n; c++) {
      int b[4]; if (!inv_tchip_rect(row, c, b)) break; const char *B = v_fmt("regions.tray.rows.%d.chips.%d", row, c); char Bb[64]; snprintf(Bb, sizeof Bb, "%s", B);
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.word", Bb))); inv_plate(v_fmt("tchip.%d.%d", row, c), b, t, v_pbool(v_fmt("%s.dim", Bb), 0), v_pbool(v_fmt("%s.lit", Bb), 0), I ".tray.chip");
    }
  }
}

/* ---- Find: the recent words, the letter strip and the word list ---- */
int inv_recent_rect(int i, int out[4]) {
  int r[4]; v_srect(S, I ".find.recent", r); int x = r[0] + v_role_width(v_pstr("regions.find.head"), "quiet.umber") + 16, pad = 10;
  for (int k = 0, n = v_plen("regions.find.recent"); k < n && k <= i; k++) { char w[V_STR]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt("regions.find.recent.%d", k))); int cw = inv_plate_w(w, "label", pad); if (x + cw > r[0] + r[2]) break; if (k == i) { out[0] = x; out[1] = r[1]; out[2] = cw; out[3] = r[3]; return 1; } x += cw + 8; }
  out[0] = out[1] = out[2] = out[3] = 0; return 0;
}
int inv_letter_rect(int i, int out[4]) { int r[4]; v_srect(S, I ".find.letters", r); int pitch = v_si(S, I ".find.letterPitch", 32); out[0] = r[0] + i * pitch; out[1] = r[1]; out[2] = v_sk(S, I ".find.letter", 0); out[3] = r[3]; return out[0] + out[2] <= r[0] + r[2]; }
int inv_word_rect(int i, int out[4]) { int r[4]; v_srect(S, I ".find.words.rect", r); int rows = v_si(S, I ".find.words.rows", 8), rh = v_si(S, I ".find.words.row", 40), cw = v_si(S, I ".find.words.colW", 392); if (i >= 2 * rows) { out[0] = out[1] = out[2] = out[3] = 0; return 0; } out[0] = r[0] + (i / rows) * (cw + 16); out[1] = r[1] + (i % rows) * rh; out[2] = cw; out[3] = rh - 4; return 1; }
/* a word's kind as its 16 px mark, in bone on the word's plate: a look a ring, a place a roof, a mibi a face, a species a pod */
static void kind_mark(const char *id, const char *kind, int x, int y) {
  if (strcmp(kind, "look") == 0) v_composed(id, x, y, 16, 16, "[[\"rrect\",2,2,12,12,6,\"\",\"bone\"],[\"rrect\",3,3,10,10,5,\"\",\"bone\"]]");
  else if (strcmp(kind, "place") == 0) v_composed(id, x, y, 16, 16, "[[\"dot\",7,2,\"bone\"],[\"dot\",8,2,\"bone\"],[\"h\",6,3,4,\"bone\"],[\"h\",5,4,6,\"bone\"],[\"h\",4,5,8,\"bone\"],[\"h\",3,6,10,\"bone\"],[\"h\",2,7,12,\"bone\"],[\"v\",4,8,6,\"bone\"],[\"v\",11,8,6,\"bone\"],[\"h\",4,13,8,\"bone\"],[\"v\",7,10,3,\"bone\"],[\"v\",8,10,3,\"bone\"]]");
  else if (strcmp(kind, "mibi") == 0) v_composed(id, x, y, 16, 16, "[[\"rrect\",2,3,12,11,4,\"\",\"bone\"],[\"dot\",5,7,\"bone\"],[\"dot\",10,7,\"bone\"],[\"h\",6,10,4,\"bone\"],[\"dot\",4,2,\"bone\"],[\"dot\",11,2,\"bone\"]]");
  else v_composed(id, x, y, 16, 16, "[[\"rrect\",3,1,10,14,5,\"\",\"bone\"],[\"dot\",6,5,\"bone\"],[\"dot\",9,8,\"bone\"],[\"dot\",6,11,\"bone\"]]");
}
void word_inventoryFind(void) {
  int r[4]; v_srect(S, I ".find.rect", r);
  { int w[4]; v_srect(S, I ".find.words.rect", w); int rows = v_si(S, I ".find.words.rows", 8), rh = v_si(S, I ".find.words.row", 40), n = v_plen("regions.find.words"), k = n > rows ? rows : n; if (k < 4) k = 4;   /* the panel sized to its rows: the strip, then 40 px a word, at least four */
    int h = w[1] - r[1] + k * rh + v_si(S, I ".find.foot", 8); if (h < r[3]) r[3] = h; }
  v_region("find", LAYER_CHROME); kit_panel("find.paper", r[0], r[1], r[2], r[3], v_scol(S, I ".find.fill"), v_scol(S, I ".find.edge"), NULL, 0);
  char t[V_STR]; int q[4];
  v_srect(S, I ".find.recent", q); snprintf(t, sizeof t, "%s", v_pstr("regions.find.head")); if (v_plen("regions.find.recent") > 0) { v_region("find.head", LAYER_TYPE); inv_say("find.head", t, q[0], q[1], q[2], q[3], "quiet.umber", "paper", V_ALIGN_LEFT); }   /* "recent" only over recent words */
  for (int i = 0, n = v_plen("regions.find.recent"); i < n; i++) { int b[4]; if (!inv_recent_rect(i, b)) break; snprintf(t, sizeof t, "%s", v_pstr(v_fmt("regions.find.recent.%d", i))); inv_plate(v_fmt("recent.%d", i), b, t, 0, 0, I ".find.plate"); }
  for (int i = 0, n = v_plen("regions.find.letters"); i < n; i++) { int b[4]; if (!inv_letter_rect(i, b)) break; snprintf(t, sizeof t, "%s", v_pstr(v_fmt("regions.find.letters.%d.ch", i))); inv_plate(v_fmt("letter.%d", i), b, t, 0, v_pbool(v_fmt("regions.find.letters.%d.lit", i), 0), I ".find.plate"); }
  for (int i = 0, n = v_plen("regions.find.words"); i < n; i++) { int b[4]; if (!inv_word_rect(i, b)) break; snprintf(t, sizeof t, "%s", v_pstr(v_fmt("regions.find.words.%d.row", i))); inv_plate(v_fmt("word.%d", i), b, t, 0, 0, I ".find.plate");
    char kind[16]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("regions.find.words.%d.kind", i))); v_region(v_fmt("word.%d", i), LAYER_CHROME); kind_mark(v_fmt("word.%d.kind", i), kind, b[0] + v_sk(S, I ".find.kindMark", 0), b[1] + v_sk(S, I ".find.kindMark", 1)); }
  snprintf(t, sizeof t, "%s", v_pstr("regions.find.first"));
  if (*t) { v_srect(S, I ".find.first", q); v_region("find.first", LAYER_TYPE); inv_say("find.first", t, q[0], q[1], q[2], q[3], "quiet.umber", "paper", V_ALIGN_LEFT); }   /* the first-time line over the letter strip */
}

/* ---- the pod picker (the pods picker's design B; pods.json regions.inventory.picker) ----
   Props regions.inv { verbs [{ id, word, on }], heading, tools { sort, filter, filterAmber, find, dim }, grid { cards [{ k, row, col, pod, name, sealed, mark, fade, held }], first }, rail { share, from } | null,
   detail { left, right, amber }, empty [title, line] }. Rows are counted from the first row on screen (row 0 at the grid's top); the row above and the row under the two on screen are drawn only while the scroll plays. */
#define K ".picker"
static int g_dy;   /* the 200 ms scroll: the host plays a `wipe` on "cabinet" from the old first row to the new; while it plays the rows are drawn g_dy px from their place, easing to 0 in whole pixels */
int inv_scroll_dy(void) {
  anim_state_t a; if (!anim_get(ANIM_WIPE, "cabinet", &a) || a.ms <= 0 || a.to == a.from) return 0;
  int d = a.to > a.from ? 1 : -1, left = a.ms - a.elapsed; if (left <= 0) return 0;
  long p = v_sk(S, I K ".grid.pitch", 1); return (int)(d * p * left / a.ms);
}
void inv_scroll(int on) { g_dy = on ? inv_scroll_dy() : 0; }
/* the box of the props' card i: the cell [x, y, 168, 206]; 1 when it stands whole in the two rows on screen (a target, its ring drawn), 0 when it peeks or is off the screen */
int inv_card_box(int i, int out[4]) {
  int top = v_sk(S, I K ".grid.origin", 1), px = v_sk(S, I K ".grid.pitch", 0), py = v_sk(S, I K ".grid.pitch", 1), rows = v_si(S, I K ".grid.rows", 2); char B[64]; snprintf(B, sizeof B, "%s", v_fmt(P ".grid.cards.%d", i));
  int row = v_pint(v_fmt("%s.row", B), 0), col = v_pint(v_fmt("%s.col", B), 0);
  out[0] = v_sk(S, I K ".grid.origin", 0) + col * px; out[1] = top + row * py + g_dy; out[2] = v_sk(S, I K ".grid.cell", 0); out[3] = v_sk(S, I K ".grid.cell", 1);
  return out[1] >= top && out[1] + out[3] <= top + (rows - 1) * py + out[3];
}
static int card_index_of_k(int k) { for (int i = 0, n = v_plen(P ".grid.cards"); i < n; i++) if (v_pint(v_fmt(P ".grid.cards.%d.k", i), -9999) == k) return i; return -1; }
int inv_card_rect_k(int k, int out[4]) { int i = card_index_of_k(k); if (i < 0) { out[0] = out[1] = out[2] = out[3] = 0; return 0; } inv_card_box(i, out); return 1; }
/* the verb line: each verb's pill [x, 50, word + 2 pad, 28], one after the other from x */
static int verb_x(int i) { int x = v_si(S, I K ".verbs.x", 56), pad = v_si(S, I K ".verbs.pad", 13), gap = v_si(S, I K ".verbs.gap", 5); for (int k = 0; k < i; k++) x += v_role_width(v_pstr(v_fmt(P ".verbs.%d.word", k)), "label") + 2 * pad + gap; return x; }
int inv_verb_rect(int i, int out[4]) {
  int n = v_plen(P ".verbs"); if (i < 0 || i >= n) { out[0] = out[1] = out[2] = out[3] = 0; return 0; }
  char w[V_STR]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt(P ".verbs.%d.word", i)));
  out[0] = verb_x(i); out[1] = v_si(S, I K ".verbs.y", 50); out[2] = v_role_width(w, "label") + 2 * v_si(S, I K ".verbs.pad", 13); out[3] = v_si(S, I K ".verbs.h", 28); return 1;
}
int inv_verb_rect_id(const char *id, int out[4]) { for (int i = 0, n = v_plen(P ".verbs"); i < n; i++) if (strcmp(v_pstr(v_fmt(P ".verbs.%d.id", i)), id) == 0) return inv_verb_rect(i, out); out[0] = out[1] = out[2] = out[3] = 0; return 0; }
/* the tool row: Sort, Filter and Find from the right edge leftwards, each its word and its padding */
int inv_tool_rect(int which, int out[4]) {
  static const char *names[3] = { "sort", "filter", "find" }; int pad = v_si(S, I K ".tools.pad", 8), gap = v_si(S, I K ".tools.gap", 12), x = v_si(S, I K ".tools.right", 984) + pad;
  for (int i = 2; i >= 0; i--) {
    char w[V_STR]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt(P ".tools.%s", names[i]))); int bw = v_role_width(w, v_sstr(S, I K ".tools.role")) + 2 * pad; x -= bw;
    if (i == which) { out[0] = x; out[1] = v_si(S, I K ".tools.y", 50); out[2] = bw; out[3] = v_si(S, I K ".tools.h", 28); return 1; }
    x -= gap;
  }
  out[0] = out[1] = out[2] = out[3] = 0; return 0;
}
/* the centre the hold ring takes: the pod of the card the ring is on */
int inv_hold_centre(int out[2]) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (strncmp(cur, "card.", 5) != 0) return 0;
  int r[4]; if (!inv_card_rect_k(atoi(cur + 5), r) || r[2] <= 0) return 0;
  out[0] = r[0] + v_sk(S, I K ".grid.pod", 0) + v_sk(S, I K ".grid.pod", 2) / 2; out[1] = r[1] + v_sk(S, I K ".grid.pod", 1) + v_sk(S, I K ".grid.pod", 3) / 2; return 1;
}
/* a Bayer lattice of `level` of 16 in `colour` over w x h (the veil of a pod that cannot take the verb: whole pixels, no opacity) */
static void veil_ops(char *ops, size_t cap, int w, int h, int level, const char *colour) {
  static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
  int n = snprintf(ops, cap, "[[\"lattice\",0,0,%d,%d,4,[", w, h);
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, cap - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, cap - (size_t)n, "],\"%s\"]]", colour);
}
/* the marks, code-drawn: the goal star in a gold disc, the drying drop in amber, the new dot in sprout; each in the mark's 22 px box at (x, y) */
static void picker_mark(const char *id, const char *kind, int x, int y) {
  char ops[400];
  if (strcmp(kind, "star") == 0) {
    snprintf(ops, sizeof ops, "[[\"rrect\",0,0,22,22,11,\"%s\",\"\"]]", v_scol(S, I K ".marks.star.fill")); v_region("card.mark", LAYER_CHROME); v_composed(id, x, y, 22, 22, ops);
    v_region("card.mark", LAYER_TYPE); v_say_in(v_fmt("%s.s", id), "\xe2\x98\x85", x, 22, v_role_cap_in(y, 22, "label"), V_ANCHOR_CAP, "label", "slate");
  } else if (strcmp(kind, "drying") == 0) {
    const char *c = v_scol(S, I K ".marks.drying.fill"); char col[24]; snprintf(col, sizeof col, "%s", c);
    static const int W[14] = { 2, 2, 4, 4, 6, 6, 8, 10, 10, 12, 12, 12, 10, 8 }; int n = snprintf(ops, sizeof ops, "[");
    for (int r = 0; r < 14; r++) n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", r ? "," : "", (12 - W[r]) / 2, r, W[r], col);
    snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_region("card.mark", LAYER_CHROME); v_composed(id, x + 5, y + 4, 12, 14, ops);
  } else if (strcmp(kind, "new") == 0) {
    snprintf(ops, sizeof ops, "[[\"rrect\",0,0,12,12,6,\"%s\",\"\"]]", v_scol(S, I K ".marks.new.fill")); v_region("card.mark", LAYER_CHROME); v_composed(id, x + 5, y + 5, 12, 12, ops);
  }
}
/* a pod's soft contact shadow, whole pixels: an ellipse of w x h in `outer` whose edge is dithered (every other pixel of a row's end), a darker one of 70 % of it in `inner` at its centre; rows by integer arithmetic so every build draws the same */
static int isqrt(int v) { int r = 0; while ((r + 1) * (r + 1) <= v) r++; return r; }
static void seat_ops(char *ops, size_t cap, int w, int h, const char *outer, const char *inner) {
  int n = snprintf(ops, cap, "[");
  for (int pass = 0; pass < 2; pass++) {
    int sw = pass ? w * 7 / 10 : w, sh = pass ? h * 7 / 10 : h, ox = (w - sw) / 2, oy = (h - sh) / 2; const char *c = pass ? inner : outer;
    for (int y = 0; y < sh; y++) {
      int dy = 2 * y + 1 - sh, hw = isqrt(sw * sw * (sh * sh - dy * dy) / (4 * sh * sh)), x0 = ox + sw / 2 - hw, len = 2 * hw; if (len < 1) continue;
      int edge = !pass && len > 4 && (y & 1);   /* the dithered edge: a row's end pixels only on every other row */
      if (edge) n += snprintf(ops + n, cap - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", n > 1 ? "," : "", x0 + 1, oy + y, len - 2, c);
      else n += snprintf(ops + n, cap - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", n > 1 ? "," : "", x0, oy + y, len, c);
    }
  }
  snprintf(ops + n, cap - (size_t)n, "]");
}
static void picker_cells(void) {
  int cell[2] = { v_sk(S, I K ".grid.cell", 0), v_sk(S, I K ".grid.cell", 1) }, nm[4], mk[4], pd[4], st[4], rad = v_si(S, I K ".grid.radius", 8);
  v_srect(S, I K ".grid.name", nm); v_srect(S, I K ".grid.mark", mk); v_srect(S, I K ".grid.pod", pd); v_srect(S, I K ".ground.seat.rect", st);
  char fillc[24], seatc[24], seatin[24], heldc[24], veilc[24], ops[600]; snprintf(fillc, sizeof fillc, "%s", v_scol(S, I K ".grid.cellFill")); snprintf(seatc, sizeof seatc, "%s", v_scol(S, I K ".ground.seat.fill")); snprintf(seatin, sizeof seatin, "%s", v_scol(S, I K ".ground.seat.inner")); snprintf(heldc, sizeof heldc, "%s", v_scol(S, I K ".grid.held")); snprintf(veilc, sizeof veilc, "%s", v_scol(S, I K ".grid.veil.colour"));
  int level = v_si(S, I K ".grid.veil.levels", 10); char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  for (int i = 0, n = v_plen(P ".grid.cards"); i < n; i++) {
    int b[4], whole = inv_card_box(i, b); char Cb[64]; snprintf(Cb, sizeof Cb, "%s", v_fmt(P ".grid.cards.%d", i)); int k = v_pint(v_fmt("%s.k", Cb), 0);
    if (!g_dy && !whole) continue;   /* at rest only the two rows on screen; while the scroll plays every row in the clip */
    if (g_dy && (b[1] + b[3] <= v_sk(S, I K ".grid.origin", 1) || b[1] >= v_sk(S, I K ".grid.origin", 1) + 2 * v_sk(S, I K ".grid.pitch", 1))) continue;
    char name[V_STR], pod[96]; snprintf(name, sizeof name, "%s", v_pstr(v_fmt("%s.name", Cb))); snprintf(pod, sizeof pod, "%s", v_pstr(v_fmt("%s.pod", Cb)));
    int sealed = v_pbool(v_fmt("%s.sealed", Cb), 0), fade = v_pbool(v_fmt("%s.fade", Cb), 0), held = v_pbool(v_fmt("%s.held", Cb), 0); char id[32]; snprintf(id, sizeof id, "card.%d", k);
    v_region("card.cell", LAYER_CHROME);
    if (strcmp(cur, id) == 0) { snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"\"]]", cell[0], cell[1], rad, fillc); v_composed(v_fmt("%s.fill", id), b[0], b[1], cell[0], cell[1], ops); }
    { static char sb[4096]; seat_ops(sb, sizeof sb, st[2], st[3], seatc, seatin); v_composed(v_fmt("%s.seat", id), b[0] + st[0], b[1] + st[1], st[2], st[3], sb); }
    v_name("card.pod"); v_slot(v_fmt("%s.pod", id), pod, NULL, b[0] + pd[0], b[1] + pd[1], pd[2], pd[3], *pod != 0);
    { char mark[16]; snprintf(mark, sizeof mark, "%s", v_pstr(v_fmt("%s.mark", Cb))); if (*mark && !*v_pstr(v_fmt("%s.bubble", Cb))) picker_mark(v_fmt("%s.mark", id), mark, b[0] + mk[0], b[1] + mk[1]); }
    { const char *role = sealed ? v_sstr(S, I K ".grid.sealedRole") : v_sstr(S, I K ".grid.nameRole"); char dpic[96]; snprintf(dpic, sizeof dpic, "%s", v_pstr(v_fmt("%s.dialPic", Cb)));
      if (*dpic) {   /* the reading dial: after the name, 6 px on, the pair centred in the name box (the lock, while a chapter is shut, is part of the picture) */
        int gap = v_si(S, I K ".grid.dial.gap", 6), dw = v_sk(S, I K ".grid.dial.size", 0), dh = v_sk(S, I K ".grid.dial.size", 1), nw = v_role_width(name, role);
        if (v_pint(v_fmt("%s.dial.sealed", Cb), 0) > 0) dw += v_si(S, I K ".grid.dial.lockGap", 3) + v_sk(S, I K ".grid.dial.lock", 0);
        if (nw > nm[2] - gap - dw) nw = nm[2] - gap - dw;
        int x0 = b[0] + nm[0] + (nm[2] - (nw + gap + dw)) / 2;
        v_region("card.words", LAYER_TYPE); inv_say(v_fmt("%s.name", id), name, x0, b[1] + nm[1], nw, nm[3], role, "panel", V_ALIGN_LEFT);
        v_name("card.dial"); v_slot(v_fmt("%s.dial", id), dpic, NULL, x0 + nw + gap, b[1] + nm[1] + (nm[3] - dh) / 2, dw, dh, 1);
      } else { v_region("card.words", LAYER_TYPE); inv_say(v_fmt("%s.name", id), name, b[0] + nm[0], b[1] + nm[1], nm[2], nm[3], role, "panel", V_ALIGN_CENTRE); } }
    int lv = level; { int dim = v_pbool(v_fmt("%s.dim", Cb), 0); if (dim) { fade = 1; lv = v_si(S, I K ".grid.veil.answerLevels", 6); } }   /* Call: the pods that do not need you dim, lighter than a fade */
    if (fade) { veil_ops(ops, sizeof ops, cell[0], cell[1], lv, veilc); v_region("card.veil", LAYER_CHROME); v_composed(v_fmt("%s.veil", id), b[0], b[1], cell[0], cell[1], ops); }
    if (held) { snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]]", cell[0], cell[1], rad, heldc); v_region("card.held", LAYER_CHROME); v_composed(v_fmt("%s.held", id), b[0], b[1], cell[0], cell[1], ops); }
    { char bub[V_STR]; snprintf(bub, sizeof bub, "%s", v_pstr(v_fmt("%s.bubble", Cb)));   /* Call: a pod that needs you says so in a bubble over it, its colour the mark's (the words say it too) */
      if (*bub) { const char *kind = v_pstr(v_fmt("%s.bubbleKind", Cb)); const char *fillc2 = strcmp(kind, "goal") == 0 ? "gold" : strcmp(kind, "drying") == 0 ? "amber" : "sprout";
        int bw = v_role_width(bub, "label.open") + 16, bx = b[0] + (cell[0] - bw) / 2; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,22,11,\"%s\",\"\"]]", bw, fillc2);
        v_region("card.bubble", LAYER_CHROME); v_composed(v_fmt("%s.bubble", id), bx, b[1] + 2, bw, 22, ops); v_region("card.bubble", LAYER_TYPE); inv_say(v_fmt("%s.bubble.w", id), bub, bx, b[1] + 2, bw, 22, "label.open", "panel", V_ALIGN_CENTRE); } }
  }
}
static void picker_verbs(void) {
  int n = v_plen(P ".verbs"), pad = v_si(S, I K ".verbs.pad", 13), rad = v_si(S, I K ".verbs.radius", 14); char pill[24]; snprintf(pill, sizeof pill, "%s", v_scol(S, I K ".verbs.pill")); int endx = 0;
  for (int i = 0; i < n; i++) {
    int r[4]; inv_verb_rect(i, r); char w[V_STR], vid[24]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt(P ".verbs.%d.word", i))); snprintf(vid, sizeof vid, "verb.%d", i); int on = v_pbool(v_fmt(P ".verbs.%d.on", i), 0);
    if (on) { char ops[120]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"\"]]", r[2], r[3], rad, pill); v_region("verb.pill", LAYER_CHROME); v_composed(v_fmt("%s.pill", vid), r[0], r[1], r[2], r[3], ops); }
    v_region("verb.word", LAYER_TYPE); inv_say(v_fmt("%s.word", vid), w, r[0] + pad, r[1], r[2] - 2 * pad, r[3], on ? v_sstr(S, I K ".verbs.onRole") : v_sstr(S, I K ".verbs.offRole"), "panel", V_ALIGN_CENTRE);
    endx = r[0] + r[2];
  }
  const char *head = v_pstr(P ".heading");
  if (*head) { int y = v_si(S, I K ".verbs.y", 50), h = v_si(S, I K ".verbs.h", 28), x = endx ? endx + v_si(S, I K ".verbs.headingGap", 20) : v_si(S, I K ".verbs.x", 56);   /* with no pill (a fixed verb) the heading stands at the verb line's start */ v_region("verb.heading", LAYER_TYPE); inv_say("verb.heading", head, x, y, 560, h, v_sstr(S, I K ".verbs.headingRole"), "panel", V_ALIGN_LEFT); }
}
static void picker_tools(void) {
  static const char *names[3] = { "sort", "filter", "find" }; int dim = v_pbool(P ".tools.dim", 0); (void)dim;
  for (int i = 0; i < 3; i++) {
    int r[4]; inv_tool_rect(i, r); char w[V_STR]; snprintf(w, sizeof w, "%s", v_pstr(v_fmt(P ".tools.%s", names[i])));
    v_region(v_fmt("tool.%s", names[i]), LAYER_TYPE); inv_say(v_fmt("tool.%s", names[i]), w, r[0], r[1], r[2], r[3], v_sstr(S, I K ".tools.role"), "panel", V_ALIGN_CENTRE);
    if (i == 1 && v_pbool(P ".tools.filterAmber", 0)) { int tw = v_role_width(w, v_sstr(S, I K ".tools.role")); v_region("tool.filter", LAYER_CHROME); v_rect("tool.filter.u", r[0] + (r[2] - tw) / 2, r[1] + r[3] - 7, tw, 1, "amber"); }   /* the drying count underlined: the warning never lives in colour alone */
  }
}
static void picker_detail(void) {
  int l[4], rr[4]; v_srect(S, I K ".detail.left", l); v_srect(S, I K ".detail.right", rr); char t[V_STR];
  snprintf(t, sizeof t, "%s", v_pstr(P ".detail.left")); if (*t) { v_region("detail.left", LAYER_TYPE); inv_say("detail.left", t, l[0], l[1], l[2], l[3], v_sstr(S, I K ".detail.role"), "panel", V_ALIGN_LEFT); }
  snprintf(t, sizeof t, "%s", v_pstr(P ".detail.right"));
  if (*t) { int amber = v_pbool(P ".detail.amber", 0); const char *role = amber ? v_sstr(S, I K ".detail.amberRole") : v_sstr(S, I K ".detail.role");
    char dpic[96]; snprintf(dpic, sizeof dpic, "%s", v_pstr(P ".detail.rightDial"));
    if (*dpic) {   /* the dial (and the lock) in front of the words, 8 px between: the line teaches the mark */
      int dw = v_sk(S, I K ".grid.dial.size", 0), dh = v_sk(S, I K ".grid.dial.size", 1), dg = v_si(S, I K ".detail.dialGap", 8); if (v_pbool(P ".detail.rightSealed", 0)) dw += v_si(S, I K ".grid.dial.lockGap", 3) + v_sk(S, I K ".grid.dial.lock", 0);
      char u[V_STR]; snprintf(u, sizeof u, "%s", t); fit_words(u, rr[2] - dw - dg, role); int tw = v_role_width(u, role); if (tw > rr[2] - dw - dg) tw = rr[2] - dw - dg;
      v_name("detail.dial"); v_slot("detail.dial", dpic, NULL, rr[0] + rr[2] - tw - dg - dw, rr[1] + (rr[3] - dh) / 2, dw, dh, 1);
      v_region("detail.right", LAYER_TYPE); inv_say("detail.right", u, rr[0], rr[1], rr[2], rr[3], role, "panel", V_ALIGN_RIGHT);
    } else { v_region("detail.right", LAYER_TYPE); inv_say("detail.right", t, rr[0], rr[1], rr[2], rr[3], role, "panel", V_ALIGN_RIGHT); }
    if (amber) { char u[V_STR]; snprintf(u, sizeof u, "%s", t); fit_words(u, rr[2], role); int tw = v_role_width(u, role); if (tw > rr[2]) tw = rr[2]; v_region("detail.right", LAYER_CHROME); v_rect("detail.right.u", rr[0] + rr[2] - tw, rr[1] + (rr[3] + v_role_pitch(role)) / 2 - 3, tw, 1, v_scol(S, I K ".detail.underline")); } }
}
static void picker_grid(void) {
  int top = v_sk(S, I K ".grid.origin", 1), left = 56, w = 944, h = 2 * v_sk(S, I K ".grid.pitch", 1);
  if (g_dy) { prim_dry(1); picker_cells(); int k = prim_dry_count(); prim_dry(0); v_region("grid", LAYER_CHROME); v_clip_box("grid.clip", left, top - 4, w, h, k); }
  picker_cells();
  if (spec_len("props", P ".rail") >= 0 && v_pint(P ".rail.share", 0) > 0) {   /* the scroll rail: the thumb sized to the share shown, only when the grid scrolls */
    int r[4]; v_srect(S, I K ".rail.rect", r); int share = v_pint(P ".rail.share", 1000), at = v_pint(P ".rail.from", 0), th = r[3] * share / 1000, ty = r[1] + r[3] * at / 1000; if (th < 8) th = 8; if (ty + th > r[1] + r[3]) ty = r[1] + r[3] - th;
    v_region("rail", LAYER_CHROME); v_rect("rail.track", r[0] + r[2] / 2, r[1], 1, r[3], v_scol(S, I K ".rail.track")); v_rect("rail.thumb", r[0], ty, r[2], th, v_scol(S, I K ".rail.thumb"));
  }
}
static void picker_empty(void) {
  int n = v_plen(P ".empty"); if (n < 1) return; int st[4], t[4], l[4]; v_srect(S, I K ".empty.seat", st); v_srect(S, I K ".empty.title", t); v_srect(S, I K ".empty.line", l);
  { static char sb[4096]; char o[24], in[24]; snprintf(o, sizeof o, "%s", v_scol(S, I K ".ground.seat.fill")); snprintf(in, sizeof in, "%s", v_scol(S, I K ".ground.seat.inner")); seat_ops(sb, sizeof sb, st[2], st[3], o, in); v_region("empty.seat", LAYER_CHROME); v_composed("empty.seat", st[0], st[1], st[2], st[3], sb); }
  v_region("empty.words", LAYER_TYPE); { char s[V_STR]; snprintf(s, sizeof s, "%s", v_pstr(P ".empty.0")); inv_say("empty.title", s, t[0], t[1], t[2], t[3], v_sstr(S, I K ".empty.titleRole"), "panel", V_ALIGN_CENTRE);
    if (n > 1) { snprintf(s, sizeof s, "%s", v_pstr(P ".empty.1")); inv_say("empty.line", s, l[0], l[1], l[2], l[3], v_sstr(S, I K ".empty.lineRole"), "panel", V_ALIGN_CENTRE); } }
}
/* The whole inventory: the dark ground, the verb line and the tools, the grid, the detail line (the tray and Find are drawn over it by the screen). */
void word_inventory(void) {
  int g[4]; v_srect(S, I K ".ground.rect", g); v_region("ground", LAYER_CHROME); v_rect("inv.ground", g[0], g[1], g[2], g[3], v_scol(S, I K ".ground.colour"));
  picker_empty(); picker_verbs(); if (!v_pbool(P ".tools.dim", 0)) picker_tools(); picker_grid(); picker_detail();   /* no pods: the verb line and the tools are hidden */
}

