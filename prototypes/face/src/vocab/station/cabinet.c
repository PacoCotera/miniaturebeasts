/* The pod inventory's words (the pod inventory's design, the art sign-off): the plaster ground, the cabinet (the painted strip tiled down the rows, one painted niche a card with the pod in it, the
   lantern and the fern fixed over the strip and the niches and under the words), each card's paper label with its name, worth tag and origin or drying words, the read bar's four blocks, the lock, the
   freshness strip with its leaf (the lamp on the bench pod), the goal star and the new tag; the scroll rail; the tool row (Sort, Filter, Find, the active chips, the count); the pod panel (the focused
   pod in full and its five buttons, wood plates on the paper); the filter tray and the Find panel over the cabinet.
   Spec: `pods` regions.inventory. Props: regions.inv { tools, cabinet { strip, lantern, fern, rows [{ row, label }], cards [{ k, row, col, niche, shadow, pod, star, isNew, blocks, lock, fresh, name,
   worth, line, amber, husk }], empty, bare }, rail { share, at } | null, panel { name, worth [], next, originPicture, origin [], fresh { words, amber, bench }, acts [{ word, dim, ask }] } },
   regions.tray { rows [{ head, chips [{ id, word, lit, dim }] }] }, regions.find { recent [], letters [{ ch, lit }], words [{ word, kind, row }], first, head }.
   Rows are counted from the first row on screen (row 0 at the cabinet's top); a row that does not fit whole shows only its top (the niche rims peek), and the row above the screen is not drawn.
   A picture the host has not sent is a slot not yet filled: nothing is drawn and the layout does not move. Words are set by role (frame.json type.roles). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
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

/* ---- the marks, code-drawn (the mark sheet: star, lock, leaf, lamp, the new tag), each a composed picture ---- */
static void mark_lock(const char *id, int x, int y) { v_composed(id, x, y, 16, 16, "[[\"rrect\",3,7,10,8,1,\"paper\",\"paper\"],[\"h\",5,3,6,\"paper\"],[\"v\",4,4,3,\"paper\"],[\"v\",11,4,3,\"paper\"],[\"dot\",8,10,\"soil\"],[\"dot\",8,11,\"soil\"]]"); }
static void mark_leaf(const char *id, int x, int y) { v_composed(id, x, y, 10, 10, "[[\"h\",4,0,2,\"sage\"],[\"h\",3,1,4,\"sage\"],[\"h\",2,2,6,\"sage\"],[\"h\",1,3,8,\"sage\"],[\"h\",0,4,10,\"sage\"],[\"h\",0,5,10,\"sage\"],[\"h\",1,6,8,\"sage\"],[\"h\",2,7,6,\"sage\"],[\"h\",3,8,4,\"sage\"],[\"v\",5,1,9,\"sageD\"]]"); }   /* the sheet's 10 px leaf: the blade the whole 10 px wide, its vein and stalk in sageD */
static void mark_lamp(const char *id, int x, int y) { v_composed(id, x, y, 10, 10, "[[\"h\",3,0,4,\"gold\"],[\"rrect\",2,1,6,6,1,\"cream\",\"gold\"],[\"h\",4,8,2,\"gold\"],[\"dot\",5,4,\"white\"]]"); }
static void mark_new(const char *id, int x, int y) { v_composed(id, x, y, 20, 20, "[[\"rrect\",3,5,14,10,1,\"paper\",\"soil\"],[\"dot\",6,10,\"soil\"],[\"h\",9,9,5,\"soil\"],[\"h\",9,11,4,\"soil\"]]"); }

/* ---- the read bar and the freshness strip (shared with the reading room) ---- */
/* The mini rail under a card (the reading screen spec section 4): n lanes across `total` px, `gap` apart, each as wide as its traits are many (`min` px at least, the rest by the largest remainder; the same rule as miniWidths in pods-props.mjs). */
static void mini_widths(const int *ns, int n, int total, int gap, int min, int *w) {
  int avail = total - gap * (n - 1), tot = 0; for (int i = 0; i < n; i++) tot += ns[i]; if (tot < 1) tot = 1;
  int rem[16], used = 0; if (n > 16) n = 16;
  for (int i = 0; i < n; i++) { w[i] = avail * ns[i] / tot; rem[i] = avail * ns[i] % tot; if (w[i] < min) w[i] = min; used += w[i]; }
  int left = avail - used; int order[16]; for (int i = 0; i < n; i++) order[i] = i;
  for (int i = 1; i < n; i++) { int o = order[i], j = i - 1; while (j >= 0 && (rem[order[j]] < rem[o])) { order[j + 1] = order[j]; j--; } order[j + 1] = o; }
  for (int k = 0; left > 0 && n; k = (k + 1) % n, left--) w[order[k]]++;
  for (int k = 0, guard = 0; left < 0 && n && guard < 64; k = (k + 1) % n, guard++) if (w[order[k]] > min) { w[order[k]]--; left++; }
}
/* A card's mini rail at (x, y) of `total` x 8: a read lane lit in its chapter's colour; an unread one the inlay (`off`, 1 px `edge` below) with a 1 px line in the chapter's colour on its top; a sealed one the inlay alone. Nodes <id>.<i>, .<i>.l, .<i>.e. */
static void inv_mini(const char *id, const char *C, int x, int y, int total, int bh, int gap, int min, const char *off, const char *edge) {
  int n = v_plen(v_fmt("%s.rail", C)); if (n > 16) n = 16; if (n < 1) return; int ns[16], w[16];
  for (int i = 0; i < n; i++) { ns[i] = v_pint(v_fmt("%s.rail.%d.n", C, i), 1); if (ns[i] < 1) ns[i] = 1; }
  mini_widths(ns, n, total, gap, min, w);
  int bx = x;
  for (int i = 0; i < n; i++) {
    const char *st = v_pstr(v_fmt("%s.rail.%d.state", C, i)); char ch[32]; snprintf(ch, sizeof ch, "%s", v_pstr(v_fmt("%s.rail.%d.ch", C, i)));
    char col[24]; snprintf(col, sizeof col, "%s", v_scol_or(S, v_fmt("regions.read.colours.%s", ch), "chCharacter"));
    if (!strcmp(st, "read")) v_rect(v_fmt("%s.%d", id, i), bx, y, w[i], bh, col);
    else { v_rect(v_fmt("%s.%d", id, i), bx, y, w[i], bh, off); v_rect(v_fmt("%s.%d.e", id, i), bx, y + bh, w[i], 1, edge);
      if (!strcmp(st, "unread") && *ch) v_rect(v_fmt("%s.%d.l", id, i), bx, y, w[i], 1, col); }
    bx += w[i] + gap;
  }
}
/* The freshness strip: its track and its fill (one notch a turn left, of `life`), amber from DRYING_SOON; the leaf at its left, or the lamp on the bench pod. */
void inv_fresh(const char *id, const int r[4], const int leaf[4], int left, int life, int amber, int bench, const char *on, const char *warn, const char *track) {
  int w = life > 0 ? (r[2] * (left < 0 ? 0 : left > life ? life : left)) / life : 0;
  v_rect(v_fmt("%s.track", id), r[0], r[1], r[2], r[3], track);
  v_rect(v_fmt("%s.fill", id), r[0], r[1], w, w ? r[3] : 0, amber ? warn : on);
  if (bench) mark_lamp(v_fmt("%s.mark", id), leaf[0], leaf[1]); else mark_leaf(v_fmt("%s.mark", id), leaf[0], leaf[1]);
}

/* ---- the cabinet's geometry ---- */
static int rows_n(void) { return v_plen(P ".cabinet.rows"); }
static int row_label(int row) { for (int i = 0, n = rows_n(); i < n; i++) if (v_pint(v_fmt(P ".cabinet.rows.%d.row", i), 99) == row) return *v_pstr(v_fmt(P ".cabinet.rows.%d.label", i)) != 0; return 0; }
static int row_h(int row) { return v_sk(S, I ".cabinet.card.pitch", 1) + (row_label(row) ? v_si(S, I ".cabinet.speciesLabel.h", 24) : 0); }
/* The 200 ms scroll (the pod inventory's design, Scrolling; the reviews' fix next): the host plays a `wipe` on "cabinet" from the old first row to the new; while it plays, the rows are drawn
   g_dy px from their place (at most one row's pitch, easing to 0 in whole pixels) and the ring rides with its card. A cut with reduced motion (the event is over at once). */
static int g_dy;
int inv_scroll_dy(void) {
  anim_state_t a; if (!anim_get(ANIM_WIPE, "cabinet", &a) || a.ms <= 0 || a.to == a.from) return 0;
  int d = a.to > a.from ? 1 : -1, left = a.ms - a.elapsed; if (left <= 0) return 0;
  long p = v_sk(S, I ".cabinet.card.pitch", 1); return (int)(d * p * left / a.ms);
}
void inv_scroll(int on) { g_dy = on ? inv_scroll_dy() : 0; }
/* the top of a row (row 0 at the cabinet's top; row -1 above it); a labelled row's cards stand under its label */
int inv_row_y(int row) {
  int cab[4]; v_srect(S, I ".cabinet.rect", cab); int y = cab[1] + g_dy;
  if (row >= 0) for (int r = 0; r < row; r++) y += row_h(r); else for (int r = -1; r >= row; r--) y -= row_h(r);
  return y;
}
static int card_top(int row) { return inv_row_y(row) + (row_label(row) ? v_si(S, I ".cabinet.speciesLabel.h", 24) : 0); }
/* the box of the props' card i: [x, y, 216, 196]; 1 when it stands whole in the cabinet (a target, its words drawn), 0 when it peeks or is off the screen */
int inv_card_box(int i, int out[4]) {
  int cab[4]; v_srect(S, I ".cabinet.rect", cab); const char *b = v_fmt(P ".cabinet.cards.%d", i); char B[64]; snprintf(B, sizeof B, "%s", b);
  int row = v_pint(v_fmt("%s.row", B), 0), col = v_pint(v_fmt("%s.col", B), 0);
  out[0] = cab[0] + col * v_sk(S, I ".cabinet.card.pitch", 0); out[1] = card_top(row); out[2] = v_sk(S, I ".cabinet.card.size", 0); out[3] = v_sk(S, I ".cabinet.card.size", 1);
  return out[1] >= cab[1] && out[1] + out[3] <= cab[1] + cab[3];
}
static int card_index_of_k(int k) { for (int i = 0, n = v_plen(P ".cabinet.cards"); i < n; i++) if (v_pint(v_fmt(P ".cabinet.cards.%d.k", i), -9999) == k) return i; return -1; }
int inv_card_rect_k(int k, int out[4]) { int i = card_index_of_k(k); if (i < 0) { out[0] = out[1] = out[2] = out[3] = 0; return 0; } inv_card_box(i, out); return 1; }

/* ---- the tool row: Sort, Filter, Find, the active chips, the count ---- */
static void tool_rect(const char *which, int r[4]) { v_srect(S, v_fmt(I ".tools.%s", which), r); }
/* the chip i's plate in the tool row: its words and ✕, left to right from the chips' rect; 0 when it does not fit */
int inv_chip_rect(int i, int out[4]) {
  int c[4]; tool_rect("chips", c); int x = c[0], gap = v_si(S, I ".tools.chip.gap", 8), pad = v_si(S, I ".tools.chip.pad", 10);
  for (int k = 0, n = v_plen(P ".tools.chips"); k < n && k <= i; k++) {
    char w[V_STR]; snprintf(w, sizeof w, "%s \xe2\x9c\x95", v_pstr(v_fmt(P ".tools.chips.%d", k))); int cw = inv_plate_w(w, "label", pad);
    if (x + cw > c[0] + c[2]) { out[0] = out[1] = out[2] = out[3] = 0; return 0; }
    if (k == i) { out[0] = x; out[1] = c[1]; out[2] = cw; out[3] = c[3]; return 1; }
    x += cw + gap;
  }
  out[0] = out[1] = out[2] = out[3] = 0; return 0;
}
static void tools(void) {
  int dim = v_pbool(P ".tools.dim", 0), r[4];
  const char *names[3] = { "sort", "filter", "find" };
  for (int i = 0; i < 3; i++) { char t[V_STR]; snprintf(t, sizeof t, "%s", v_pstr(v_fmt(P ".tools.%s", names[i]))); tool_rect(names[i], r); inv_plate(v_fmt("tool.%s", names[i]), r, t, dim, 0, I ".tools.plate");
    if (i == 1 && v_pbool(P ".tools.filterAmber", 0)) { v_region("tool.filter", LAYER_CHROME); int tw = v_role_width(t, "label"); v_rect("tool.filter.u", r[0] + (r[2] - tw) / 2, r[1] + r[3] - 7, tw, 1, "amber"); } }   /* the drying word underlined: the warning never lives in colour alone */
  for (int i = 0, n = v_plen(P ".tools.chips"); i < n; i++) { int c[4]; if (!inv_chip_rect(i, c)) break; char w[V_STR]; snprintf(w, sizeof w, "%s \xe2\x9c\x95", v_pstr(v_fmt(P ".tools.chips.%d", i))); inv_plate(v_fmt("tool.chip.%d", i), c, w, 0, 1, I ".tools.plate"); }
  char count[V_STR]; snprintf(count, sizeof count, "%s", v_pstr(P ".tools.count")); tool_rect("count", r);
  v_region("tools.count", LAYER_TYPE); inv_say("tools.count", count, r[0], r[1], r[2], r[3], "quiet.umber", "paper", V_ALIGN_RIGHT);
}

/* ---- the cabinet ---- */
static void strip_band(const char *id, const char *strip, int sy, int x, int y, int w, int h) { if (h > 0) v_sprite_window(id, strip, 0, sy, x, y, w, h); }
/* A card meets the cabinet: some row of it on screen (the 200 ms scroll draws these whole, inside the cabinet's clip) */
static int card_meets(const int b[4], const int cab[4]) { return b[1] < cab[1] + cab[3] && b[1] + b[3] > cab[1]; }
/* The cabinet's back: the strip row by row, the bare niches, the niches, shadows and pods. While the scroll plays every row that meets the cabinet is drawn (the clip cuts it); at rest a row cut by the foot shows its niches' rims. */
static void cabinet_back(void) {
  int cab[4]; v_srect(S, I ".cabinet.rect", cab); int bottom = cab[1] + cab[3];
  char strip[96]; snprintf(strip, sizeof strip, "%s", v_pstr(P ".cabinet.strip"));
  int tileH = v_sk(S, I ".cabinet.strip.size", 1), labH = v_si(S, I ".cabinet.speciesLabel.h", 24), plankY = v_si(S, I ".cabinet.speciesLabel.plankY", 30);   /* a label's band is the strip's own plank: the label carved into the wood (review round 2) */
  /* the strip, row by row from the cabinet's top to its foot: a labelled row first shows a band of the strip's plank for its label; the last rows run on as bare plank */
  v_region("cabinet", LAYER_PAINTED);
  if (has(strip) && g_dy) {   /* the scroll playing: the strip from the row above the cabinet, each band clipped to the cabinet's top and foot */
    int y = inv_row_y(-1), row = -1;
    for (int guard = 0; y < bottom && guard < 9; guard++, row++) {
      int lab = row_label(row) ? labH : 0, bands[2][2] = { { plankY, lab }, { 0, tileH } };
      for (int b = 0; b < 2; b++) { int sy = bands[b][0], h = bands[b][1], top = y; if (h <= 0) continue; y += h;
        if (top < cab[1]) { sy += cab[1] - top; h -= cab[1] - top; top = cab[1]; } if (top + h > bottom) h = bottom - top;
        if (h > 0) strip_band(v_fmt("cab.strip.%d.%s", row + 1, b ? "s" : "l"), strip, sy, cab[0], top, cab[2], h); }
    }
  }
  else if (has(strip)) {
    int y = cab[1], row = 0;
    for (int guard = 0; y < bottom && guard < 8; guard++, row++) {
      int lab = row_label(row) ? labH : 0;
      if (lab) { strip_band(v_fmt("cab.strip.%d.l", row), strip, plankY, cab[0], y, cab[2], y + lab > bottom ? bottom - y : lab); y += lab; }
      int h = y + tileH > bottom ? bottom - y : tileH;
      if (h < tileH) { char peek[96]; snprintf(peek, sizeof peek, "%s", v_pstr(P ".cabinet.stripPeek")); if (h > 0 && has(peek)) v_sprite(v_fmt("cab.strip.%d", row), peek, cab[0], y, cab[2], h); }   /* the band the cabinet's foot cuts: the strip's top rows, its own picture */
      else strip_band(v_fmt("cab.strip.%d", row), strip, 0, cab[0], y, cab[2], h);
      y += tileH;
    }
  }
  /* the fern (review round 2, G8): over the strip, under the niches and the pods */
  { int r[4]; char id[96]; v_srect(S, I ".cabinet.fern.rect", r); snprintf(id, sizeof id, "%s", v_pstr(P ".cabinet.fern")); v_name("cabinet.fern"); v_slot("cab.fern", id, NULL, r[0], r[1], r[2], r[3], 1); }
  int n = v_plen(P ".cabinet.cards"), nx = v_sk(S, I ".cabinet.card.niche", 0), ny = v_sk(S, I ".cabinet.card.niche", 1), nw = v_sk(S, I ".cabinet.card.niche", 2), nh = v_sk(S, I ".cabinet.card.niche", 3);
  int px = v_sk(S, I ".cabinet.card.pod", 0), py = v_sk(S, I ".cabinet.card.pod", 1), pw = v_sk(S, I ".cabinet.card.pod", 2), ph = v_sk(S, I ".cabinet.card.pod", 3);
  /* no pods: three bare niches on the first plank (the one place empty niches appear) */
  char bare[96]; snprintf(bare, sizeof bare, "%s", v_pstr(P ".cabinet.bare"));
  if (*bare) for (int c = 0; c < 3; c++) { v_name("cabinet.niche"); v_slot(v_fmt("cab.bare.%d", c), bare, NULL, cab[0] + c * v_sk(S, I ".cabinet.card.pitch", 0) + nx, cab[1] + ny, nw, nh, 1); }
  /* the niches and the pods: a whole card's niche, its shadow and its pod; a peeking card shows the niche's top rows only */
  for (int i = 0; i < n; i++) {
    int b[4], whole = inv_card_box(i, b); const char *C = v_fmt(P ".cabinet.cards.%d", i); char Cb[64]; snprintf(Cb, sizeof Cb, "%s", C);
    int k = v_pint(v_fmt("%s.k", Cb), 0); char niche[96], shadow[96], pod[96]; snprintf(niche, sizeof niche, "%s", v_pstr(v_fmt("%s.niche", Cb))); snprintf(shadow, sizeof shadow, "%s", v_pstr(v_fmt("%s.shadow", Cb))); snprintf(pod, sizeof pod, "%s", v_pstr(v_fmt("%s.pod", Cb)));
    if (g_dy) { if (!card_meets(b, cab)) continue; }   /* the scroll: every row in the clip slides by the same offset */
    else { if (b[1] + ny >= bottom || b[1] + b[3] <= cab[1]) continue;
      if (!whole) { int vis = bottom - (b[1] + ny); char peek[96]; snprintf(peek, sizeof peek, "%s", v_pstr(P ".cabinet.nichePeek")); if (vis > 0 && vis < nh && has(peek)) { v_name("cabinet.niche"); v_sprite(v_fmt("card.%d.niche", k), peek, b[0] + nx, b[1] + ny, nw, vis); } continue; } }   /* a row that peeks: its niches' rims */
    v_name("cabinet.niche"); v_slot(v_fmt("card.%d.niche", k), niche, NULL, b[0] + nx, b[1] + ny, nw, nh, 1);
    v_name("cabinet.niche"); v_slot(v_fmt("card.%d.shadow", k), shadow, NULL, b[0] + nx, b[1] + ny, nw, nh, *shadow != 0);
    v_name("cabinet.pod"); v_slot(v_fmt("card.%d.pod", k), pod, NULL, b[0] + px, b[1] + py, pw, ph, *pod != 0);
  }
}
/* The cabinet's front: the species labels carved into the plank, then each whole card's paper label, words, read bar, lock, freshness strip and marks (every card that meets the cabinet while the scroll plays); the empty line. */
static void cabinet_front(void) {
  int cab[4]; v_srect(S, I ".cabinet.rect", cab); int bottom = cab[1] + cab[3], labH = v_si(S, I ".cabinet.speciesLabel.h", 24);
  int lan[4]; v_srect(S, I ".cabinet.lantern.rect", lan); int lx = cab[0] + v_si(S, I ".cabinet.speciesLabel.x", 8), lxClear = v_si(S, I ".cabinet.speciesLabel.xClear", 80);
  /* the species labels carved into the plank (sorted by species, on every row): umber with a 1 px light edge below; a label beside the lantern starts clear of its hook */
  for (int i = 0, nr = rows_n(); i < nr; i++) {
    int row = v_pint(v_fmt(P ".cabinet.rows.%d.row", i), 99); char lab[V_STR]; snprintf(lab, sizeof lab, "%s", v_pstr(v_fmt(P ".cabinet.rows.%d.label", i)));
    if (!*lab) continue; int y = inv_row_y(row);
    if (g_dy ? (y + labH <= cab[1] || y >= bottom) : (row < 0 || y + labH > bottom || y < cab[1])) continue;
    int x = y < lan[1] + lan[3] && y + labH > lan[1] ? lxClear : lx;
    v_region("cabinet.label", LAYER_TYPE); inv_say(v_fmt("cab.label.%d.e", row), lab, x, y + 1, cab[0] + cab[2] - 8 - x, labH, "label.edge", "paper", V_ALIGN_LEFT); inv_say(v_fmt("cab.label.%d", row), lab, x, y, cab[0] + cab[2] - 8 - x, labH, "label.umber", "paper", V_ALIGN_LEFT);
  }
  int n = v_plen(P ".cabinet.cards");
  /* each whole card's paper label, words, read bar, lock, freshness strip and marks */
  int L[4], NM[4], WT[4], LN[4], BR[4], LK[4], FR[4], LF[4], ST[4], NW[4];
  v_srect(S, I ".cabinet.card.label.rect", L); v_srect(S, I ".cabinet.card.name.rect", NM); v_srect(S, I ".cabinet.card.worth.rect", WT); v_srect(S, I ".cabinet.card.line.rect", LN);
  v_srect(S, I ".cabinet.card.bar.rect", BR); v_srect(S, I ".cabinet.card.lock", LK); v_srect(S, I ".cabinet.card.fresh.rect", FR); v_srect(S, I ".cabinet.card.fresh.leaf", LF); v_srect(S, I ".cabinet.card.star", ST); v_srect(S, I ".cabinet.card.newMark", NW);
  int bh = v_sk(S, I ".cabinet.card.bar.rect", 3), gap = v_si(S, I ".cabinet.card.bar.gap", 2), bmin = v_si(S, I ".cabinet.card.bar.min", 4);
  char off[24], edge[24], fon[24], fwarn[24], ftrack[24], lfill[24], ledge[24];
  snprintf(off, sizeof off, "%s", v_scol(S, I ".cabinet.card.bar.unlit")); snprintf(edge, sizeof edge, "%s", v_scol(S, I ".cabinet.card.bar.edge"));
  snprintf(fon, sizeof fon, "%s", v_scol(S, I ".cabinet.card.fresh.colour")); snprintf(fwarn, sizeof fwarn, "%s", v_scol(S, I ".cabinet.card.fresh.amber")); snprintf(ftrack, sizeof ftrack, "%s", v_scol(S, I ".cabinet.card.fresh.track"));
  snprintf(lfill, sizeof lfill, "%s", v_scol(S, I ".cabinet.card.label.fill")); snprintf(ledge, sizeof ledge, "%s", v_scol(S, I ".cabinet.card.label.edge"));
  for (int i = 0; i < n; i++) {
    int b[4]; if (!inv_card_box(i, b) && !(g_dy && card_meets(b, cab))) continue; const char *C = v_fmt(P ".cabinet.cards.%d", i); char Cb[64]; snprintf(Cb, sizeof Cb, "%s", C);
    int k = v_pint(v_fmt("%s.k", Cb), 0), husk = v_pbool(v_fmt("%s.husk", Cb), 0); char cid[24]; snprintf(cid, sizeof cid, "card.%d", k);
    if (!husk) {
      v_region("card.bar", LAYER_CHROME); inv_mini(v_fmt("%s.bar", cid), Cb, b[0] + BR[0], b[1] + BR[1], BR[2], bh, gap, bmin, off, edge);
      if (v_pbool(v_fmt("%s.lock", Cb), 0)) { v_region("card.lock", LAYER_CHROME); mark_lock(v_fmt("%s.lock", cid), b[0] + LK[0], b[1] + LK[1]); }
      int fr[4] = { b[0] + FR[0], b[1] + FR[1], FR[2], FR[3] }, lf[4] = { b[0] + LF[0], b[1] + LF[1], LF[2], LF[3] };
      v_region("card.fresh", LAYER_CHROME); inv_fresh(v_fmt("%s.fresh", cid), fr, lf, v_pint(v_fmt("%s.fresh.left", Cb), 0), v_pint(v_fmt("%s.fresh.life", Cb), 12), v_pbool(v_fmt("%s.fresh.amber", Cb), 0), v_pbool(v_fmt("%s.fresh.bench", Cb), 0), fon, fwarn, ftrack);
      if (v_pbool(v_fmt("%s.star", Cb), 0)) { v_region("card.star", LAYER_CHROME); { int sr[4] = { b[0] + ST[0], b[1] + ST[1], ST[2], ST[3] }; wood_plate(v_fmt("%s.star.plate", cid), sr, I ".tools.plate"); } v_region("card.star", LAYER_TYPE); v_say_in(v_fmt("%s.star", cid), "\xe2\x98\x85", b[0] + ST[0], ST[2], v_role_cap_in(b[1] + ST[1], ST[3], "label"), V_ANCHOR_CAP, "label", "slate"); }   /* the goal star in cream on its small wood plate, never amber */
      if (v_pbool(v_fmt("%s.isNew", Cb), 0)) { v_region("card.new", LAYER_CHROME); mark_new(v_fmt("%s.new", cid), b[0] + NW[0], b[1] + NW[1]); }
    }
    v_region("card.label", LAYER_CHROME); kit_panel(v_fmt("%s.label", cid), b[0] + L[0], b[1] + L[1], L[2], L[3], lfill, ledge, NULL, 0);
    char t[V_STR]; v_region("card.words", LAYER_TYPE);
    snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.name", Cb))); inv_say(v_fmt("%s.name", cid), t, b[0] + NM[0], b[1] + NM[1], NM[2], NM[3], "heading.card", "paper", V_ALIGN_LEFT);
    snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.worth", Cb))); inv_say(v_fmt("%s.worth", cid), t, b[0] + WT[0], b[1] + WT[1], WT[2], WT[3], "quiet.card", "paper", V_ALIGN_LEFT);
    snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.line", Cb)));
    if (v_pbool(v_fmt("%s.amber", Cb), 0)) { inv_say(v_fmt("%s.line", cid), t, b[0] + LN[0], b[1] + LN[1], LN[2], LN[3], "notice.card", "paper", V_ALIGN_LEFT); fit_words(t, LN[2], "notice.card"); int tw = v_role_width(t, "notice.card"); if (tw > LN[2]) tw = LN[2]; v_region("card.words", LAYER_CHROME); v_rect(v_fmt("%s.line.u", cid), b[0] + LN[0], b[1] + LN[1] + LN[3] - 3, tw, 1, "soil"); }   /* amber words get a 1 px umber underline */
    else inv_say(v_fmt("%s.line", cid), t, b[0] + LN[0], b[1] + LN[1], LN[2], LN[3], "quiet.card", "paper", V_ALIGN_LEFT);
  }
  char empty[V_STR]; snprintf(empty, sizeof empty, "%s", v_pstr(P ".cabinet.empty"));
  if (*empty) { int r[4], pl[4]; v_srect(S, I ".cabinet.empty.line", r); v_srect(S, I ".cabinet.empty.plate", pl); v_region("cabinet.empty", LAYER_CHROME); kit_panel("cab.empty.plate", pl[0], pl[1], pl[2], pl[3], lfill, ledge, NULL, 0); v_region("cabinet.empty", LAYER_TYPE); inv_say("cab.empty", empty, pl[0], pl[1], pl[2], pl[3], "label.umber", "paper", V_ALIGN_CENTRE); (void)r; }
}
static void cabinet(void) {
  int cab[4]; v_srect(S, I ".cabinet.rect", cab);
  /* while the scroll plays the back and the front are each held in the cabinet's clip (a dry run counts their nodes first); the lantern stays whole between them */
  if (g_dy) { prim_dry(1); cabinet_back(); int k = prim_dry_count(); prim_dry(0); v_region("cabinet", LAYER_PAINTED); v_clip_box("cab.clip", cab[0], cab[1], cab[2], cab[3], k); }
  cabinet_back();
  /* the lantern: fixed, over the strip and the niches, under the labels and the marks */
  { int r[4]; v_srect(S, I ".cabinet.lantern.rect", r); char id[96]; snprintf(id, sizeof id, "%s", v_pstr(P ".cabinet.lantern")); v_name("cabinet.lantern"); v_slot("cab.lantern", id, NULL, r[0], r[1], r[2], r[3], 1);
 }
  if (g_dy) { prim_dry(1); cabinet_front(); int k = prim_dry_count(); prim_dry(0); v_region("cabinet.label", LAYER_TYPE); v_clip_box("cab.clipF", cab[0], cab[1], cab[2], cab[3], k); }
  cabinet_front();
  /* the scroll rail: the thumb sized to the share shown, drawn only when the cabinet scrolls */
  if (spec_len("props", P ".rail") >= 0 && v_pint(P ".rail.share", 0) > 0) {
    int r[4]; v_srect(S, I ".rail.rect", r); int share = v_pint(P ".rail.share", 1000), at = v_pint(P ".rail.from", 0), th = r[3] * share / 1000, ty = r[1] + r[3] * at / 1000; if (th < 8) th = 8; if (ty + th > r[1] + r[3]) ty = r[1] + r[3] - th;
    v_region("rail", LAYER_CHROME); v_rect("rail.track", r[0] + r[2] / 2, r[1], 1, r[3], v_scol(S, I ".rail.track")); v_rect("rail.thumb", r[0], ty, r[2], th, v_scol(S, I ".rail.thumb"));
  }
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

/* ---- the pod panel: the focused card in full, and its five buttons ---- */
int inv_act_rect(int i, int out[4]) { int f[4]; v_srect(S, I ".panel.actions.first", f); int pitch = v_si(S, I ".panel.actions.pitch", 46); out[0] = f[0]; out[1] = f[1] + i * pitch; out[2] = f[2]; out[3] = f[3]; return i < v_plen(P ".panel.acts"); }
static void panel(void) {
  int r[4]; v_srect(S, I ".panel.rect", r); v_region("panel", LAYER_CHROME); kit_panel("panel.paper", r[0], r[1], r[2], r[3], v_scol(S, I ".panel.fill"), v_scol(S, I ".panel.edge"), NULL, 0);
  char t[V_STR]; int q[4];
  v_region("panel.words", LAYER_TYPE);
  snprintf(t, sizeof t, "%s", v_pstr(P ".panel.name")); v_srect(S, I ".panel.name.rect", q); inv_say("panel.name", t, q[0], q[1], q[2], q[3], "heading.umber", "paper", V_ALIGN_LEFT);
  v_srect(S, I ".panel.worth.rect", q); { char buf[V_STR * 3]; int ln = 0; for (int i = 0, n = v_plen(P ".panel.worth"); i < n && ln < 2; i++) {   /* both tags in full: a tag wider than the rect wraps onto the next 22 px line */
    snprintf(t, sizeof t, "%s", v_pstr(v_fmt(P ".panel.worth.%d", i))); int nl = v_role_wrap(t, q[2], "body.umber", buf, sizeof buf, 2 - ln); const char *l = buf;
    for (int j = 0; j < nl; j++, ln++) { inv_say(v_fmt("panel.worth.%d", ln), l, q[0], q[1] + ln * 22, q[2], 22, "body.umber", "paper", V_ALIGN_LEFT); l += strlen(l) + 1; } } }
  { int ins[4]; v_srect(S, I ".panel.rail.inset.rect", ins); mini_rail("panel.rail", P ".panel.rail", ins); }   /* the pod's rail at the small size on the dark inset (the reading screen spec section 4, UI/UX 2026-10-30) */
  { int pic[4], sen[4]; v_srect(S, I ".panel.origin.picture", pic); v_srect(S, I ".panel.origin.sentence", sen); char op[96]; snprintf(op, sizeof op, "%s", v_pstr(P ".panel.originPicture"));
    v_name("panel.origin"); v_slot("panel.origin.picture", op, NULL, pic[0], pic[1], pic[2], pic[3], *op != 0);
    snprintf(t, sizeof t, "%s", v_pstr(P ".panel.origin.0")); v_region("panel.words", LAYER_TYPE); inv_wrap("panel.origin", t, sen[0], sen[1], sen[2], 20, 2, "body.umber", "paper"); }
  { v_srect(S, I ".panel.fresh.rect", q); snprintf(t, sizeof t, "%s", v_pstr(P ".panel.fresh.words")); int amber = v_pbool(P ".panel.fresh.amber", 0), bench = v_pbool(P ".panel.fresh.bench", 0), x = q[0];
    if (*t && bench) { v_region("panel.fresh", LAYER_CHROME); mark_lamp("panel.fresh.lamp", q[0], q[1] + 7); x += 16; }
    v_region("panel.words", LAYER_TYPE); inv_say("panel.fresh", t, x, q[1], q[2] - (x - q[0]), q[3], amber ? "notice.paper" : "body.umber", "paper", V_ALIGN_LEFT);
    if (amber && *t) { int tw = v_role_width(t, "notice.paper"); v_region("panel.fresh", LAYER_CHROME); v_rect("panel.fresh.u", x, q[1] + q[3] - 3, tw, 1, "soil"); } }
  /* a bare panel says why, centred: its first line in the body, the second quiet under it (review round 2) */
  for (int i = 0, n = v_plen(P ".panel.message"); i < n && i < 2; i++) { v_srect(S, I ".panel.message.rect", q); snprintf(t, sizeof t, "%s", v_pstr(v_fmt(P ".panel.message.%d", i))); v_region("panel.words", LAYER_TYPE); inv_say(v_fmt("panel.message.%d", i), t, q[0], q[1] + i * q[3], q[2], q[3], i ? "quiet.umber" : "body.umber", "paper", V_ALIGN_CENTRE); }
  for (int i = 0, n = v_plen(P ".panel.acts"); i < n && i < 5; i++) {
    int b[4]; inv_act_rect(i, b); snprintf(t, sizeof t, "%s", v_pstr(v_fmt(P ".panel.acts.%d.word", i)));
    inv_plate(v_fmt("act.%d", i), b, t, v_pbool(v_fmt(P ".panel.acts.%d.dim", i), 0), 0, I ".panel.actions.plate");
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

/* The whole inventory: the ground, the cabinet, the tool row and the panel (the tray and Find are drawn over it by the screen). */
void word_inventory(void) {
  int g[4]; v_srect(S, I ".ground.rect", g); v_region("ground", LAYER_CHROME); v_rect("inv.ground", g[0], g[1], g[2], g[3], v_scol(S, I ".ground.colour"));
  /* the gutter: the strip's plaster (its rows plaster.y to plaster.y + h) tiled round the tool row, the cabinet and the panel, never a flat code fill */
  { char strip[96]; snprintf(strip, sizeof strip, "%s", v_pstr(P ".cabinet.strip")); int sw = v_sk(S, I ".cabinet.strip.size", 0), py = v_sk(S, I ".ground.plaster", 0), ph = v_sk(S, I ".ground.plaster", 1);
    if (has(strip) && sw > 0 && ph > 0) { v_region("ground", LAYER_PAINTED); int n = 0; for (int y = g[1]; y < g[1] + g[3]; y += ph) for (int x = g[0]; x < g[0] + g[2]; x += sw, n++) { int w = x + sw > g[0] + g[2] ? g[0] + g[2] - x : sw, h = y + ph > g[1] + g[3] ? g[1] + g[3] - y : ph; v_name("ground.plaster"); v_sprite_window(v_fmt("inv.plaster.%d", n), strip, 0, py, x, y, w, h); } } }
  cabinet(); tools(); panel();
}
