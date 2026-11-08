/* Cross' binding table (lvgl-switch.md §2.2; cross.json): the splice. In draw order: the bench, the heads (the two parents' portraits, names and lines, the child to be with its ghost and kinship pill), then the state the props name:
   the overview (every chapter at once, one module a side and one row a locus) or the chapter view (the shared rail, then each trait's copies as buses, a gate, the child's outcomes); the ring on the partner's head. Every number is the spec's
   (regions, colours, strings); the props name the chapters, the loci and the pictures, never a place. The wires, edges, seeds, tracks and bands of a state are a few composed pictures (a line is an op, a dash one op), the panels kit panels,
   the gates, ticks, glints and finds masters placed 1:1, the words by role. Nothing of a copy, look, seed or range the props do not name is drawn: an unread chapter is frost and the words that say what to read. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "cross"
#define MAXCH 16   /* chapters of a frame: the largest has eight */
#define MAXROWS 96

/* ---- the ops of a composed picture, in the face's one 128 KiB buffer; coordinates are the screen's, the picture's origin is taken off ---- */
typedef struct { int ox, oy, n, over; } ops_t;
static void ob_begin(ops_t *o, int ox, int oy) { o->ox = ox; o->oy = oy; o->n = 0; o->over = 0; prim_ops()[o->n++] = '['; }
static void ob_line(ops_t *o, char dir, int x, int y, int len, const char *col) {
  if (len <= 0) return;
  char *buf = prim_ops(); int cap = prim_ops_size() - 8; if (o->over || o->n > cap - 96) { if (!o->over) v_error("word: the Cross picture's ops outgrew the buffer"); o->over = 1; return; }
  o->n += snprintf(buf + o->n, (size_t)(cap - o->n), "%s[\"%c\",%d,%d,%d,\"%s\"]", o->n > 1 ? "," : "", dir, x - o->ox, y - o->oy, len, col);
}
static void ob_h(ops_t *o, int x, int y, int len, const char *col) { ob_line(o, 'h', x, y, len, col); }
static void ob_v(ops_t *o, int x, int y, int len, const char *col) { ob_line(o, 'v', x, y, len, col); }
static void ob_dash(ops_t *o, int x, int y, int len, int vertical, int on, int off, const char *col) {
  if (len <= 0) return;
  char *buf = prim_ops(); int cap = prim_ops_size() - 8; if (o->over || o->n > cap - 96) { if (!o->over) v_error("word: the Cross picture's ops outgrew the buffer"); o->over = 1; return; }
  o->n += snprintf(buf + o->n, (size_t)(cap - o->n), "%s[\"dash\",%d,%d,%d,\"%c\",%d,%d,\"%s\"]", o->n > 1 ? "," : "", x - o->ox, y - o->oy, len, vertical ? 'v' : 'h', on, off, col);
}
static void ob_fill(ops_t *o, int x, int y, int w, int h, const char *col) { if (w >= h) for (int r = 0; r < h; r++) ob_h(o, x, y + r, w, col); else for (int c = 0; c < w; c++) ob_v(o, x + c, y, h, col); }
static void ob_wire(ops_t *o, int x, int y, int len, int thick, const char *col, int on, int off) { for (int t = 0; t < thick; t++) { if (on) ob_dash(o, x, y + t, len, 0, on, off, col); else ob_h(o, x, y + t, len, col); } }
static void ob_box(ops_t *o, int x, int y, int w, int h, const char *col, int on, int off) {
  if (on) { ob_dash(o, x, y, w, 0, on, off, col); ob_dash(o, x, y + h - 1, w, 0, on, off, col); ob_dash(o, x, y, h, 1, on, off, col); ob_dash(o, x + w - 1, y, h, 1, on, off, col); }
  else { ob_h(o, x, y, w, col); ob_h(o, x, y + h - 1, w, col); ob_v(o, x, y, h, col); ob_v(o, x + w - 1, y, h, col); }
}
static void ob_end(ops_t *o, const char *id, int w, int h) { char *buf = prim_ops(); buf[o->n] = ']'; buf[o->n + 1] = 0; v_composed(id, o->ox, o->oy, w, h, buf); }

/* ---- the small reads ---- */
#define SI(p, d) v_si(S, p, d)
#define SK(p, k) v_sk(S, p, k)
#define COL(dst, p) snprintf(dst, sizeof dst, "%s", v_scol(S, p))
static int is(const char *a, const char *b) { return strcmp(a, b) == 0; }
static int say16(const char *id, const char *s, int x, int y, const char *role, int align) { return v_say(id, s, x, y, V_ANCHOR_LINE, role, "field", align); }   /* a 16 px line, y the line's top */
static int round_div(int a, int b) { return b ? (2 * a + b) / (2 * b) : 0; }   /* the integers' Math.round for a >= 0 */
static int fx(int frac, int len) { return round_div(frac * len, 10000); }

/* ---- the heads: the pick and the partner at the sides, the child to be between them ---- */
static void heads(int overview) {
  const char *H = overview ? "regions.heads.overview" : "regions.heads.chapter"; char p[96];
  ops_t o; ob_begin(&o, 0, 40);
  for (int side = 0; side < 2; side++) {
    const char *k = side ? "b" : "a"; int pr[4], nm[4], ln[4];
    snprintf(p, sizeof p, "%s.%s.portrait", H, k); v_srect(S, p, pr); snprintf(p, sizeof p, "%s.%s.name", H, k); v_srect(S, p, nm); snprintf(p, sizeof p, "%s.%s.line", H, k); v_srect(S, p, ln);
    int none = v_pbool(v_fmt("regions.heads.%s.none", k), 0);
    char pic[96], name[V_STR], line[V_STR]; snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("regions.heads.%s.picture", k))); snprintf(name, sizeof name, "%s", v_pstr(v_fmt("regions.heads.%s.name", k))); snprintf(line, sizeof line, "%s", v_pstr(v_fmt("regions.heads.%s.line", k)));
    v_name(v_fmt("head.%s", k)); if (!none) { int sz[2] = { pr[2], pr[3] }; v_asset_size(pic, sz); v_slot(v_fmt("head.%s.portrait", k), pic, NULL, pr[0], pr[1], sz[0], sz[1], 1); }   /* the kind's own stand, placed 1:1 at its own size */
    if (none) ob_box(&o, pr[0], pr[1], pr[2], pr[3], v_scol(S, "colours.headNone"), 0, 0);   /* away: the host sends the portrait dimmed (the dark variant), the stone veil's stand-in */
    v_region(v_fmt("head.%s", k), LAYER_TYPE);
    if (!none) v_say(v_fmt("head.%s.name", k), name, side ? 952 : nm[0], v_role_cap_in(nm[1], nm[3], "heading"), V_ANCHOR_CAP, "heading", "field", side ? V_ALIGN_RIGHT : V_ALIGN_LEFT);
    if (line[0]) say16(v_fmt("head.%s.line", k), line, side ? 952 : ln[0], ln[1], "quiet", side ? V_ALIGN_RIGHT : V_ALIGN_LEFT);
  }
  { int g[4], w[4], kn[2]; snprintf(p, sizeof p, "%s.child.ghost", H); v_srect(S, p, g); snprintf(p, sizeof p, "%s.child.words", H); v_srect(S, p, w); kn[0] = SK(v_fmt("%s.child.kin", H), 0); kn[1] = SK(v_fmt("%s.child.kin", H), 1);
    char ghost[96], words[V_STR], kin[V_STR]; snprintf(ghost, sizeof ghost, "%s", v_pstr("regions.heads.child.ghost")); snprintf(words, sizeof words, "%s", v_pstr("regions.heads.child.words")); snprintf(kin, sizeof kin, "%s", v_pstr("regions.heads.child.kin"));
    { int sz[2] = { g[2], g[3] }; if (ghost[0]) v_asset_size(ghost, sz); v_name("head.child"); v_slot("head.child.ghost", ghost, NULL, g[0], g[1], sz[0], sz[1], ghost[0] != 0); }
    v_region("head.child", LAYER_TYPE); say16("head.child.words", words, w[0], w[1], "body", V_ALIGN_LEFT);
    if (kin[0]) { int pw = v_role_width(kin, "label.open") + 2 * SI("regions.heads.type.kinPad", 8); v_region("head.kin", LAYER_CHROME); kit_panel("head.kin", kn[0], kn[1], pw, 24, v_scol(S, "colours.kinship"), NULL, NULL, 0);
      v_region("head.kin", LAYER_TYPE); v_say("head.kin.word", kin, kn[0] + SI("regions.heads.type.kinPad", 8), kn[1] + 2, V_ANCHOR_LINE, "label.open", "field", V_ALIGN_LEFT); } }
  v_region("head.edge", LAYER_CHROME); ob_end(&o, "head.edge", 1024, 120);
}

/* ---- the overview ---- */
typedef struct { int y, h, rows, play; } chp_t;
static unsigned char PLAYS[MAXCH][MAXROWS];   /* whether each row is a locus at play (open chapters only), read once from the props */
static int row_play(int i, int r) { return i < MAXCH && r < MAXROWS && PLAYS[i][r]; }
static int plan_overview(int n, chp_t *c, int *pitch, int *gap) {
  int minH = SI("regions.overview.chapterMin", 24), quiet = SI("regions.overview.pitch.quiet", 4), pmax = SI("regions.overview.pitch.playMax", 16), pmin = SI("regions.overview.pitch.playMin", 10), g0 = SK("regions.overview.gap", 0), g1 = SK("regions.overview.gap", 1), room = SK("regions.overview.rows", 3), top = SK("regions.overview.rows", 1);
  int fits = 0, P = pmin, G = g1;
  for (int gi = 0; gi < 2 && !fits; gi++) for (int p = pmax; p >= pmin && !fits; p--) {
    int g = gi ? g1 : g0, total = g * (n > 1 ? n - 1 : 0);
    for (int i = 0; i < n; i++) { int h = 0; for (int r = 0; r < c[i].rows; r++) h += row_play(i, r) ? p : quiet; total += h < minH ? minH : h; }
    if (total <= room) { fits = 1; P = p; G = g; }
  }
  int y = top;
  for (int i = 0; i < n; i++) { int h = 0; for (int r = 0; r < c[i].rows; r++) h += row_play(i, r) ? P : quiet; c[i].y = y; c[i].h = h < minH ? minH : h; y += c[i].h + G; }
  *pitch = P; *gap = G; return fits;
}
static void overview(void) {
  int n = v_plen("regions.overview.chapters"); if (n <= 0) return; if (n > MAXCH) n = MAXCH;
  chp_t c[MAXCH]; memset(PLAYS, 0, sizeof PLAYS);
  for (int i = 0; i < n; i++) {
    char st[16]; snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.state", i))); c[i].rows = v_plen(v_fmt("regions.overview.chapters.%d.rows", i)); if (c[i].rows > MAXROWS) c[i].rows = MAXROWS;
    if (is(st, "open")) for (int r = 0; r < c[i].rows; r++) PLAYS[i][r] = (unsigned char)v_pbool(v_fmt("regions.overview.chapters.%d.rows.%d.play", i, r), 0);
  }
  int pitch, gap; plan_overview(n, c, &pitch, &gap); int quiet = SI("regions.overview.pitch.quiet", 4);
  int mA = SK("regions.overview.moduleA", 0), mW = SK("regions.overview.moduleA", 1), mB = SK("regions.overview.moduleB", 0), gA = SK("regions.overview.gateA", 0), gB = SK("regions.overview.gateB", 0), gW = SK("regions.overview.gateA", 1);
  int col0 = SK("regions.overview.child", 0), colW = SK("regions.overview.child", 1), tr0 = SK("regions.overview.track", 0), trW = SK("regions.overview.track", 1), sx = SI("regions.overview.seeds.x", 490), ssz = SI("regions.overview.seeds.size", 8), spt = SI("regions.overview.seeds.pitch", 12), wx = SK("regions.overview.wish", 0);
  char cSw[24], cBl[24], cSet[24], cUn[24], cSeal[24], cBand[24], cBandE[24], cKin[24], cWish[24], cEdge[24], cFrost[24], cBar[24];
  COL(cSw, "colours.wire.switch"); COL(cBl, "colours.wire.blend"); COL(cSet, "colours.wire.settled"); COL(cUn, "colours.wire.unread"); COL(cSeal, "colours.wire.sealed"); COL(cBand, "colours.band.fill"); COL(cBandE, "colours.band.edge"); COL(cKin, "colours.kinship"); COL(cWish, "colours.wishEdge");
  snprintf(cEdge, sizeof cEdge, "%s", v_sstr(S, "regions.overview.module.edge")); COL(cFrost, "colours.missing.fill"); snprintf(cBar, sizeof cBar, "%s", v_sstr(S, "regions.overview.module.sealed.slats"));
  int rowsTop = SK("regions.overview.rows", 1), rowsH = SK("regions.overview.rows", 3), rx = SK("regions.overview.rows", 0), rw = SK("regions.overview.rows", 2);
  /* the panels, first: the modules and the child's column of every chapter */
  v_region("ov.panel", LAYER_CHROME);
  for (int i = 0; i < n; i++) {
    char st[16]; snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.state", i)));
    kit_panel(v_fmt("ov.%d.a", i), mA, c[i].y, mW, c[i].h, v_scol(S, "regions.overview.module.fill"), NULL, NULL, 0); kit_panel(v_fmt("ov.%d.b", i), mB, c[i].y, mW, c[i].h, v_scol(S, "regions.overview.module.fill"), NULL, NULL, 0);
    if (is(st, "sealed")) kit_panel(v_fmt("ov.%d.col", i), col0, c[i].y, colW, c[i].h, v_scol(S, "regions.overview.module.fill"), NULL, NULL, 0);
    else if (is(st, "unread")) kit_panel(v_fmt("ov.%d.col", i), col0, c[i].y, colW, c[i].h, cFrost, NULL, NULL, 0);
  }
  /* the lines: module edges and slats, every wire, gate wire, seed, track and band, in one picture */
  ops_t o; ob_begin(&o, rx, rowsTop);
  for (int i = 0; i < n; i++) {
    char st[16]; snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.state", i))); int open = is(st, "open"), sealed = is(st, "sealed"), unread = is(st, "unread");
    for (int side = 0; side < 2; side++) {
      int x = side ? mB : mA, lacks = v_pbool(v_fmt("regions.overview.chapters.%d.%s", i, side ? "lacksB" : "lacksA"), 0);
      if (sealed) for (int y = 4; y < c[i].h - 1; y += 4) ob_h(&o, x + 1, c[i].y + y, mW - 2, cBar);
      if (lacks) ob_box(&o, x, c[i].y, mW, c[i].h, v_scol(S, "regions.overview.module.unread.edge"), 3, 2); else ob_box(&o, x, c[i].y, mW, c[i].h, cEdge, 0, 0);
    }
    if (sealed) for (int y = 4; y < c[i].h - 1; y += 4) ob_h(&o, col0 + 1, c[i].y + y, colW - 2, cBar);
    int ry = c[i].y;
    for (int r = 0; r < c[i].rows; r++) {
      const char *RP = v_fmt("regions.overview.chapters.%d.rows.%d", i, r); char rp[96]; snprintf(rp, sizeof rp, "%s", RP);
      int play = open && row_play(i, r), rh = play ? pitch : quiet;
      if (sealed) { ob_dash(&o, mA + mW, ry + 1, col0 - (mA + mW), 0, 1, 2, cSeal); ob_dash(&o, col0 + colW, ry + 1, mB - (col0 + colW), 0, 1, 2, cSeal); }
      else if (unread) { int la = v_pbool(v_fmt("regions.overview.chapters.%d.lacksA", i), 0), lb = v_pbool(v_fmt("regions.overview.chapters.%d.lacksB", i), 0);
        if (la) ob_dash(&o, mA + mW, ry + 1, col0 - (mA + mW), 0, 3, 2, cUn); else ob_h(&o, mA + mW, ry + 1, col0 - (mA + mW), cSet);
        if (lb) ob_dash(&o, col0 + colW, ry + 1, mB - (col0 + colW), 0, 3, 2, cUn); else ob_h(&o, col0 + colW, ry + 1, mB - (col0 + colW), cSet); }
      else if (!play) ob_h(&o, mA + mW, ry + 1, mB - (mA + mW), cSet);
      else {
        char kind[10]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("%s.kind", rp))); int sw = is(kind, "switch"), cy = ry + rh / 2; const char *kc = sw ? cSw : cBl;
        for (int side = 0; side < 2; side++) for (int k = 0; k < 2; k++) {
          int hid = v_pbool(v_fmt("%s.hides.%d", rp, side * 2 + k), 0), wy = cy + (k == 0 ? -3 : 1);
          if (side == 0) ob_wire(&o, mA + mW, wy, gA - (mA + mW), 2, kc, hid ? 4 : 0, 2); else ob_wire(&o, gB + gW, wy, mB - (gB + gW), 2, kc, hid ? 4 : 0, 2);
        }
        if (sw) {
          ob_wire(&o, gA + gW, cy - 1, sx - (gA + gW), 2, kc, 0, 0); ob_wire(&o, sx + 44, cy - 1, gB - (sx + 44), 2, kc, 0, 0);
          for (int k = 0; k < 4; k++) {
            int x = sx + k * spt; const char *RPs = v_fmt("%s.seeds.%d", rp, k); char sp[96]; snprintf(sp, sizeof sp, "%s", RPs); int nf = v_plen(v_fmt("%s.fill", sp));
            char f0[24], f1[24]; snprintf(f0, sizeof f0, "%s", v_pstr(v_fmt("%s.fill.0", sp))); snprintf(f1, sizeof f1, "%s", v_pstr(v_fmt("%s.fill.1", sp)));
            if (nf >= 2) { ob_fill(&o, x, cy - 4, ssz / 2, ssz, f0); ob_fill(&o, x + ssz / 2, cy - 4, ssz / 2, ssz, f1); } else ob_fill(&o, x, cy - 4, ssz, ssz, f0);
            if (v_pbool(v_fmt("%s.pin", sp), 0)) ob_box(&o, x - 2, cy - 6, ssz + 4, ssz + 4, cWish, 0, 0);
            if (v_pbool(v_fmt("%s.kin", sp), 0)) ob_fill(&o, x + 6, cy - 4, 2, 2, cKin);
          }
        } else {
          ob_wire(&o, gA + gW, cy - 1, tr0 - (gA + gW), 2, kc, 0, 0); ob_wire(&o, tr0 + trW, cy - 1, gB - (tr0 + trW), 2, kc, 0, 0); ob_h(&o, tr0, cy, trW, cSet);
          int lo = fx(v_pint(v_fmt("%s.range.0", rp), 0), trW), hi = fx(v_pint(v_fmt("%s.range.1", rp), 0), trW), l0 = fx(v_pint(v_fmt("%s.range0.0", rp), 0), trW), h0 = fx(v_pint(v_fmt("%s.range0.1", rp), 0), trW);
          if (v_pint(v_fmt("%s.narrowed", rp), 0) * trW > 2 * 10000) ob_box(&o, tr0 + l0, cy - 3, h0 - l0 > 2 ? h0 - l0 : 2, 7, cKin, 2, 2);
          int bw = hi - lo < 3 ? 3 : hi - lo; ob_fill(&o, tr0 + lo, cy - 2, bw, 5, cBandE); ob_fill(&o, tr0 + lo + 1, cy - 1, bw - 2 < 1 ? 1 : bw - 2, 3, cBand);
        }
      }
      ry += rh;
    }
  }
  v_region("ov.lines", LAYER_CHROME); ob_end(&o, "ov.lines", rw, rowsH);
  /* the masters: gates, ticks, the wish glints, the sealed finds */
  for (int i = 0; i < n; i++) {
    char st[16]; snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.state", i))); int open = is(st, "open"), ry = c[i].y;
    if (is(st, "sealed")) { char fk[16]; snprintf(fk, sizeof fk, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.find", i))); if (fk[0]) { v_name(v_fmt("ov.%d", i)); v_slot(v_fmt("ov.%d.find", i), v_fmt("find-%s-16x16", fk), NULL, col0 + 8, c[i].y + (c[i].h - 16 + 1) / 2, 16, 16, 1); } }
    int wishRow = v_pint(v_fmt("regions.overview.chapters.%d.wishRow", i), 0); char wish[8]; snprintf(wish, sizeof wish, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.wish", i)));
    for (int r = 0; r < c[i].rows; r++) {
      int play = open && row_play(i, r), rh = play ? pitch : quiet, cy = ry + rh / 2;
      if (play) {
        char rp[96]; snprintf(rp, sizeof rp, "regions.overview.chapters.%d.rows.%d", i, r); char kind[10]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("%s.kind", rp)));
        v_name(v_fmt("ov.%d.%d", i, r)); char g[48]; snprintf(g, sizeof g, "cross-gate-%s-8x8", kind); v_slot(v_fmt("ov.%d.%d.ga", i, r), g, NULL, gA, cy - 4, 8, 8, 1); v_slot(v_fmt("ov.%d.%d.gb", i, r), g, NULL, gB, cy - 4, 8, 8, 1);
        if (is(kind, "blend")) { int pa = fx(v_pint(v_fmt("%s.parents.0", rp), 0), trW), pb = fx(v_pint(v_fmt("%s.parents.1", rp), 0), trW);
          v_slot(v_fmt("ov.%d.%d.ta", i, r), "cross-tick-a-6x4", NULL, tr0 + pa - 3, cy - 6, 6, 4, 1); v_slot(v_fmt("ov.%d.%d.tb", i, r), "cross-tick-b-6x4", NULL, tr0 + pb - 3, cy + 3, 6, 4, 1); }
      }
      if (wish[0] && r == wishRow) { char w8[40]; snprintf(w8, sizeof w8, "cross-wish-%s-8x8", wish); v_name(v_fmt("ov.%d", i)); v_slot(v_fmt("ov.%d.wish", i), w8, NULL, wx, cy - 4, 8, 8, 1); }
      ry += rh;
    }
  }
  /* the words: each module's chapter, the unread chapter's need, the sealed one's find */
  v_region("ov.words", LAYER_TYPE);
  for (int i = 0; i < n; i++) {
    char st[16], name[V_STR]; snprintf(st, sizeof st, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.state", i))); snprintf(name, sizeof name, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.name", i))); const char *role = is(st, "open") ? "body" : "quiet";
    say16(v_fmt("ov.%d.a.word", i), name, mA + SK("regions.overview.module.word.at", 0), c[i].y + SK("regions.overview.module.word.at", 1), role, V_ALIGN_LEFT);
    say16(v_fmt("ov.%d.b.word", i), name, mB + mW - SK("regions.overview.module.word.at", 0), c[i].y + SK("regions.overview.module.word.at", 1), role, V_ALIGN_RIGHT);
    int cyTxt = c[i].y + (c[i].h - 20 + 1) / 2;
    if (is(st, "unread")) { char need[V_STR]; snprintf(need, sizeof need, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.need", i))); v_say(v_fmt("ov.%d.need", i), need, col0 + 8, cyTxt, V_ANCHOR_LINE, "label.open", "field", V_ALIGN_LEFT); }
    if (is(st, "sealed")) { char sl[V_STR]; snprintf(sl, sizeof sl, "%s", v_pstr(v_fmt("regions.overview.chapters.%d.sealed", i))); say16(v_fmt("ov.%d.sealed", i), sl, col0 + 8 + 16 + 8, cyTxt, "quiet", V_ALIGN_LEFT); }
  }
}

/* ---- a chapter view ---- */
static void plate(ops_t *o, int ti, int side, int k, int yc, const char *kc) {
  char pp[96]; snprintf(pp, sizeof pp, "regions.chapter.traits.%d.%s.%d", ti, side ? "b" : "a", k);
  char word[V_STR], chip[24]; snprintf(word, sizeof word, "%s", v_pstr(v_fmt("%s.word", pp))); snprintf(chip, sizeof chip, "%s", v_pstr(v_fmt("%s.chip", pp))); int hides = v_pbool(v_fmt("%s.hides", pp), 0);
  if (!word[0]) return;
  const char *role = hides ? "label.fog" : "body"; int ww = v_role_width(word, role), inner = (chip[0] ? 16 : 0) + ww, w = inner + 16, y = yc - 12, x = side ? 992 - w : 32;
  v_region("ch.plate", LAYER_CHROME); kit_panel(v_fmt("ch.%d.%s%d.plate", ti, side ? "b" : "a", k), x, y, w, 24, v_scol(S, "colours.plate.fill"), NULL, NULL, 0);
  ob_box(o, x, y, w, 24, kc, hides ? 3 : 0, 2);
  int tx = x + 8; if (chip[0]) { ob_fill(o, tx, yc - 6, 12, 12, v_scol(S, "colours.plate.chipEdge")); ob_fill(o, tx + 1, yc - 5, 10, 10, chip); tx += 16; }
  v_region("ch.plate", LAYER_TYPE); v_say(v_fmt("ch.%d.%s%d.word", ti, side ? "b" : "a", k), word, tx, y + 2, V_ANCHOR_LINE, role, "pane", V_ALIGN_LEFT);
  if (hides) v_say(v_fmt("ch.%d.%s%d.hides", ti, side ? "b" : "a", k), v_sstr(S, "strings.hides"), side ? x - 8 : x + w + 8, y + 2, V_ANCHOR_LINE, "quiet", "field", side ? V_ALIGN_RIGHT : V_ALIGN_LEFT);
}
static void chapter(void) {
  int rx = SK("regions.chapter.rows", 0), ry0 = SK("regions.chapter.rows", 1), rw = SK("regions.chapter.rows", 2), rh = SK("regions.chapter.rows", 3);
  if (v_pbool("regions.chapter.sealed", 0)) {   /* the chapter shut: no rows, the find centred, both sides' wires dotted at the rows' 4 px pitch into it */
    int loci = v_pint("regions.chapter.loci", 0), mid = 248 + 56, y0 = mid - (loci * 4 + 1) / 2; char hl[24]; COL(hl, "colours.wire.sealed"); ops_t o; ob_begin(&o, rx, ry0);
    for (int i = 0; i < loci; i++) { ob_dash(&o, 16, y0 + i * 4, 440, 0, 1, 2, hl); ob_dash(&o, 568, y0 + i * 4, 440, 0, 1, 2, hl); }
    v_region("ch.lines", LAYER_CHROME); ob_end(&o, "ch.lines", rw, rh);
    char fk[16]; snprintf(fk, sizeof fk, "%s", v_pstr("regions.chapter.find")); if (fk[0]) { v_name("ch.find"); v_slot("ch.find", v_fmt("find-%s-112x112", fk), NULL, 456, 248, 112, 112, 1); }
    v_region("ch.words", LAYER_TYPE); v_say("ch.sealed", v_pstr("regions.chapter.opens"), 512, 248 + 112 + 16, V_ANCHOR_LINE, "quiet", "field", V_ALIGN_CENTRE);
    return;
  }
  int n = v_plen("regions.chapter.traits"); if (n > 12) n = 12;
  int th = SI("regions.chapter.trait.h", 64), per = SI("regions.chapter.trait.perLocus", 8), jogA = SI("regions.chapter.trait.jogA", 304), jogB = SI("regions.chapter.trait.jogB", 718), gA = SK("regions.chapter.trait.gateA", 0), gB = SK("regions.chapter.trait.gateB", 0), outA = SI("regions.chapter.trait.outA", 360), outB = SI("regions.chapter.trait.outB", 664);
  int cx = SK("regions.chapter.trait.child", 0), picY = SI("regions.chapter.trait.picY", 28), trx = SK("regions.chapter.trait.track", 0), trW = SK("regions.chapter.trait.track", 1);
  char cSw[24], cBl[24], cSet[24], cUn[24], cBand[24], cBandE[24], cKin[24], cWish[24], cFrost[24], cRule[24]; COL(cSw, "colours.wire.switch"); COL(cBl, "colours.wire.blend"); COL(cSet, "colours.wire.settled"); COL(cUn, "colours.wire.unread"); COL(cBand, "colours.band.fill"); COL(cBandE, "colours.band.edge"); COL(cKin, "colours.kinship"); COL(cWish, "colours.wishEdge"); COL(cFrost, "colours.wire.unread"); snprintf(cRule, sizeof cRule, "%s", v_sstr(S, "colours.rule"));
  int ys[12], hs[12], y = ry0; for (int i = 0; i < n; i++) { int L = v_pint(v_fmt("regions.chapter.traits.%d.loci", i), 1); hs[i] = th + per * (L > 1 ? L - 1 : 0); ys[i] = y; y += hs[i]; }
  ops_t o; ob_begin(&o, rx, ry0);
  for (int i = 0; i < n; i++) {
    const char *TP = v_fmt("regions.chapter.traits.%d", i); char tp[64]; snprintf(tp, sizeof tp, "%s", TP);
    int L = v_pint(v_fmt("%s.loci", tp), 1), missing = v_pbool(v_fmt("%s.missing", tp), 0), yy = ys[i], h = hs[i], mid = yy + h / 2; char kind[10]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("%s.kind", tp)));
    const char *wire = missing ? cSet : is(kind, "blend") ? cBl : cSw;
    if (i > 0) ob_h(&o, rx, yy, rw, cRule);
    for (int side = 0; side < 2; side++) {
      int lacking = missing && v_pbool(v_fmt("%s.%s", tp, side ? "lacksB" : "lacksA"), 0), x0 = side ? 1008 : 16, jog = side ? jogB : jogA, gx = side ? gB : gA;
      for (int k = 0; k < 2; k++) {
        int yc = (4 * yy + (k == 0 ? h : 3 * h) + 2) / 4, pin = mid + (k == 0 ? -4 : 4), hid = !lacking && v_pbool(v_fmt("%s.%s.%d.hides", tp, side ? "b" : "a", k), 0);
        const char *col = lacking ? cUn : wire;
        for (int j = 0; j < L; j++) { int wy = yc + (j * 4 - (L - 1) * 2) - 1, xs = side ? jog : x0, len = side ? x0 - jog : jog - x0; ob_wire(&o, xs, wy, len, lacking ? 1 : 2, col, lacking ? 3 : hid ? 5 : 0, lacking ? 2 : 3); }
        int top = yc - (L - 1) * 2 - 1, bot = yc + (L - 1) * 2 + 1; if (pin - 1 < top) top = pin - 1; if (pin + 1 > bot) bot = pin + 1;
        ob_fill(&o, jog, top, 2, bot - top, col);
        if (side == 0) ob_fill(&o, jog + 2, pin - 1, gx - jog - 2, 2, col); else ob_fill(&o, gx + 16, pin - 1, jog - gx - 16, 2, col);
      }
    }
    ob_fill(&o, gA + 16, mid - 1, outA - (gA + 16), 2, wire); ob_fill(&o, outB, mid - 1, gB - outB, 2, wire);
  }
  v_region("ch.lines", LAYER_CHROME); ob_end(&o, "ch.lines", rw, rh);
  /* the plates sit on their buses: panels, their edges and chips in a second picture, their words after */
  for (int i = 0; i < n; i++) {
    int missing = v_pbool(v_fmt("regions.chapter.traits.%d.missing", i), 0); char kind[10]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("regions.chapter.traits.%d.kind", i)));
    const char *wire = missing ? cSet : is(kind, "blend") ? cBl : cSw; int yy = ys[i], h = hs[i];
    ops_t p; ob_begin(&p, rx, ry0);
    char tmp[2][24]; snprintf(tmp[0], sizeof tmp[0], "%s", wire);
    for (int side = 0; side < 2; side++) for (int k = 0; k < 2; k++) { int yc = (4 * yy + (k == 0 ? h : 3 * h) + 2) / 4; plate(&p, i, side, k, yc, tmp[0]); }
    v_region("ch.plate", LAYER_CHROME); ob_end(&p, v_fmt("ch.%d.plates", i), rw, rh);
  }
  /* each trait's gates, wishes, outcomes and words */
  for (int i = 0; i < n; i++) {
    const char *TP = v_fmt("regions.chapter.traits.%d", i); char tp[64]; snprintf(tp, sizeof tp, "%s", TP);
    int missing = v_pbool(v_fmt("%s.missing", tp), 0), settled = v_pbool(v_fmt("%s.settled", tp), 0), yy = ys[i], h = hs[i], mid = yy + h / 2; char kind[10], name[V_STR], wish[8]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("%s.kind", tp))); snprintf(name, sizeof name, "%s", v_pstr(v_fmt("%s.name", tp))); snprintf(wish, sizeof wish, "%s", v_pstr(v_fmt("%s.wish", tp)));
    char gate[64]; snprintf(gate, sizeof gate, "cross-gate-%s-16x16%s", missing || is(kind, "switch") || !kind[0] ? "switch" : "blend", missing || settled ? "-settled" : "");
    v_name(v_fmt("ch.%d", i)); v_slot(v_fmt("ch.%d.ga", i), gate, NULL, gA, mid - 8, 16, 16, 1); v_slot(v_fmt("ch.%d.gb", i), gate, NULL, gB, mid - 8, 16, 16, 1);
    if (wish[0]) { char w12[40]; snprintf(w12, sizeof w12, "cross-wish-%s-12x12", wish); v_slot(v_fmt("ch.%d.wish", i), w12, NULL, cx, yy + 4, 12, 12, 1); }
    int nameX = cx + (wish[0] ? 16 : 0), nameW = v_role_width(name, "body"), py = yy + picY;
    v_region(v_fmt("ch.%d.name", i), LAYER_TYPE); say16(v_fmt("ch.%d.name", i), name, nameX, yy + 4, "body", V_ALIGN_LEFT);
    if (missing) {
      v_region("ch.slot", LAYER_CHROME); for (int k = 0; k < 4; k++) kit_panel(v_fmt("ch.%d.slot.%d", i, k), cx + k * 72, py, 64, 32, cFrost, NULL, NULL, 0);
      v_region("ch.need", LAYER_TYPE); say16(v_fmt("ch.%d.need", i), v_pstr(v_fmt("%s.need", tp)), nameX + nameW + 8, yy + 4, "quiet", V_ALIGN_LEFT);
      continue;
    }
    char surf[V_STR], words[V_STR]; snprintf(surf, sizeof surf, "%s", v_pstr(v_fmt("%s.surface", tp))); snprintf(words, sizeof words, "%s", v_pstr(v_fmt("%s.words", tp)));
    if (surf[0]) { int sw = v_role_width(surf, "label.open") + 8; v_region("ch.surf", LAYER_CHROME); kit_panel(v_fmt("ch.%d.surf", i), nameX + nameW + 8, yy + 2, sw, 20, cKin, NULL, NULL, 0); v_region("ch.surf", LAYER_TYPE); v_say(v_fmt("ch.%d.surf.word", i), surf, nameX + nameW + 12, yy + 4, V_ANCHOR_LINE, "label.open", "field", V_ALIGN_LEFT); }
    else say16(v_fmt("ch.%d.words", i), words, nameX + nameW + 8, yy + 4, "quiet", V_ALIGN_LEFT);
    if (is(kind, "switch")) {
      ops_t q; ob_begin(&q, rx, ry0);
      for (int k = 0; k < 4; k++) {
        const char *SP = v_fmt("%s.seeds.%d", tp, k); char sp[96]; snprintf(sp, sizeof sp, "%s", SP); char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("%s.picture", sp))); int px = cx + k * 72;
        v_name(v_fmt("ch.%d.pic", i)); v_slot(v_fmt("ch.%d.pic.%d", i, k), pic, NULL, px, py, 64, 32, pic[0] != 0);
        if (v_pbool(v_fmt("%s.pin", sp), 0)) { ob_box(&q, px - 2, py - 2, 68, 36, cWish, 0, 0); ob_box(&q, px - 3, py - 3, 70, 38, cWish, 0, 0); }
      }
      v_region("ch.pins", LAYER_CHROME); ob_end(&q, v_fmt("ch.%d.pins", i), rw, rh);
      for (int k = 0; k < 4; k++) if (v_pbool(v_fmt("%s.seeds.%d.kin", tp, k), 0)) { v_name(v_fmt("ch.%d.kin", i)); v_slot(v_fmt("ch.%d.kin.%d", i, k), "cross-kin-surface-10x10", NULL, cx + k * 72 + 54, py + 22, 10, 10, 1); }
    } else {
      char lo[96], hi[96]; snprintf(lo, sizeof lo, "%s", v_pstr(v_fmt("%s.blend.low", tp))); snprintf(hi, sizeof hi, "%s", v_pstr(v_fmt("%s.blend.high", tp))); int one = v_pbool(v_fmt("%s.blend.one", tp), 0), ty = py + 16;
      v_name(v_fmt("ch.%d.pic", i)); v_slot(v_fmt("ch.%d.pic.lo", i), lo, NULL, cx, py, 64, 32, lo[0] != 0);
      ops_t q; ob_begin(&q, rx, ry0);
      int a = fx(v_pint(v_fmt("%s.blend.range.0", tp), 0), trW), b = fx(v_pint(v_fmt("%s.blend.range.1", tp), 0), trW);
      if (one) { ob_fill(&q, trx, ty - 4, trW, 9, cSet); }
      else {
        v_name(v_fmt("ch.%d.pic", i)); v_slot(v_fmt("ch.%d.pic.hi", i), hi, NULL, 584, py, 64, 32, hi[0] != 0);
        ob_h(&q, trx, ty, trW, cSet);
        int l0 = fx(v_pint(v_fmt("%s.blend.range0.0", tp), 0), trW), h0 = fx(v_pint(v_fmt("%s.blend.range0.1", tp), 0), trW);
        if (v_pint(v_fmt("%s.blend.narrowed", tp), 0) * trW > 2 * 10000) ob_box(&q, trx + l0, ty - 7, h0 - l0 > 2 ? h0 - l0 : 2, 15, cKin, 2, 2);
        int bw = b - a < 3 ? 3 : b - a; ob_fill(&q, trx + a, ty - 4, bw, 9, cBandE); ob_fill(&q, trx + a + 1, ty - 3, bw - 2 < 1 ? 1 : bw - 2, 7, cBand);
      }
      v_region("ch.track", LAYER_CHROME); ob_end(&q, v_fmt("ch.%d.track", i), rw, rh);
      if (!one) { int pa = fx(v_pint(v_fmt("%s.blend.parents.0", tp), 0), trW), pb = fx(v_pint(v_fmt("%s.blend.parents.1", tp), 0), trW);
        v_name(v_fmt("ch.%d.tick", i)); v_slot(v_fmt("ch.%d.tick.a", i), "cross-tick-a-12x8", NULL, trx + pa - 6, ty - 14, 12, 8, 1); v_slot(v_fmt("ch.%d.tick.b", i), "cross-tick-b-12x8", NULL, trx + pb - 6, ty + 7, 12, 8, 1); }
    }
  }
}

/* ---- the targets as the words drew them, and the ring ---- */
static void ring_box(int box[4]) { v_srect(S, is(v_pstr("state"), "chapter") ? "regions.heads.chapter.b.ring" : "regions.heads.overview.b.ring", box); }
int cross_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) { focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int r[4]; ring_box(r); focus_fill(t, "focus.targets", i, r); }
  return n;
}

void cross_words(void) {
  int ov = !is(v_pstr("state"), "chapter");
  kit_stage(S, "regions.bench.rect", v_scol("frame", "colours.stageGround"), "bench", "bench", NULL, NULL);
  heads(ov);
  if (v_plen("regions.overview.chapters") > 0 && ov) overview();
  else if (!ov) { word_rail(NULL); chapter(); }
  { int r[4]; ring_box(r); v_region("focus", LAYER_CHROME); word_focusRing("focus", S, "focus.targets.partner", r); }
}

/* a key on Cross: ✓, ← and the room keys say an intent on the partner; the pad is a stepper: ◀ ▶ pick the partner, ▲ ▼ walk the states (step:<key>) and the ring stays */
void cross_key(int code) { screens_key_graph(code, S, "focus.graph", cross_focus, "partner", &(screens_keys_t){ .steps = 1 }); }
