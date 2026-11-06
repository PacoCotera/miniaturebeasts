/* The reading screen v2's words (the reading screen spec, signed 2026-10-29): the two moulded frames on their ground, the chamber with the specimen (one opaque picture the logic process composes for each
   place), the gene-tag rail on the shelf with its marks and the amber bracket, the pod's glyph, name and reason, the right frame's chapter as field-guide plates (a nine-slice plate and its chapter glow, the
   look discs with their rims in the chapter colour, the captions, the trait and its kind line, the badges), the price key and the line beside it, the read (the warm sweep riding a clip over the chamber,
   the lane's tags filling in a clip, the shine, the lamp lit), the 200 ms dither between places, and the stamp in progress (the rail lifting, the lanes gathering, the fold, the block's ring, the line).
   The face draws only rectangles, text, 1:1 pictures, nine-slices, clips, composed one-pixel line work and the 16-level dither (§2.1): every soft edge is a picture.
   Spec: `pods` regions.read. Props: regions.read { ground, lamp, glyph, name, why, chamber, from, marks { glint, star }, rail { pic, hand, trait, notch, nudge, lanes [{ id, n, state, colour, marks }] },
   reading { lane, chamber, rail, chip, sweep, shine } | null, right { form, chapter { id, name, colour, marks, tick, lock }, plate, glow, tick, glint, star, lock, badgeGlint, badgeStar, moon,
   plates [{ trait, kind, shown { pic, caption }, carried { pic, caption }, chips [], glint, goal }], key { price, state, pic, diamond } | null, beside { sprout, text }, chip { n, pic, diamond } | null,
   mate { name, glyph, rows [{ pic, seeds, odds, goal }] } | null }, stamp { plate, stamp, gather, size, plateSize, blocks [[x, y, w, h]], block, mode, line, veil } | null }.
   Events: read on "read" (the read's 800 ms), dither on "chamber" (200 ms between places), wipe on "nudge" (the bracket's stop) and "keyShake" (the held key), moment on "stamp" (the first read's
   moment, 1150 ms), "fold" (folding back, 300 ms), "view" and "unview" (the stamp view, at double speed). */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define S "pods"
#define R "regions.read"
#define P "regions.read"

static int has(const char *id) { return id && *id && wire_has_asset(id); }
static int sk(const char *path, int k) { return v_sk(S, path, k); }
static int si(const char *path, int d) { return v_si(S, path, d); }
static int playing(int kind, const char *target, anim_state_t *a) { return anim_get(kind, target, a) && a->ms > 0 && a->elapsed < a->ms; }
/* a picture 1:1 at its own size (a sent picture's size), or nothing */
static void pic(const char *id_in, const char *asset_in, int x, int y) { char id[96], asset[160]; snprintf(id, sizeof id, "%s", id_in); snprintf(asset, sizeof asset, "%s", asset_in ? asset_in : ""); int sz[2]; if (!has(asset) || v_asset_size(asset, sz) != 0) return; v_sprite(id, asset, x, y, sz[0], sz[1]); }
static void pic_c(const char *id, const char *asset, int cx, int cy) { int sz[2]; if (!has(asset) || v_asset_size(asset, sz) != 0) return; pic(id, asset, cx - sz[0] / 2, cy - sz[1] / 2); }
/* a ring of w px on a rounded box (nested 1 px edges: line work, never a focus ring) */
static void ring_box(const char *id_in, int x, int y, int w, int h, int wpx, int r, const char *colour) {
  char id[96], ops[1024]; snprintf(id, sizeof id, "%s", id_in); int n = 0; n += snprintf(ops + n, sizeof ops - n, "[");
  for (int k = 0; k < wpx; k++) n += snprintf(ops + n, sizeof ops - n, "%s[\"rrect\",%d,%d,%d,%d,%d,\"\",\"%s\"]", k ? "," : "", k, k, w - 2 * k, h - 2 * k, r - k > 0 ? r - k : 0, colour);
  snprintf(ops + n, sizeof ops - n, "]"); v_composed(id, x, y, w, h, ops);
}
/* a filled triangle pointing left (dir -1), right (1) or up (2), w x h, as line work */
static void notch(const char *id_in, int x, int y, int w, int h, int dir, const char *colour) {
  char id[96], ops[2048]; snprintf(id, sizeof id, "%s", id_in); int n = snprintf(ops, sizeof ops, "[");
  if (dir == 2) for (int r = 0; r < h; r++) { int half = (w * (r + 1)) / (2 * h); n += snprintf(ops + n, sizeof ops - n, "%s[\"h\",%d,%d,%d,\"%s\"]", r ? "," : "", w / 2 - half, r, 2 * half > 0 ? 2 * half : 1, colour); }
  else for (int c = 0; c < w; c++) { int span = dir < 0 ? (h * (c + 1)) / w : (h * (w - c)) / w; if (span < 1) span = 1; n += snprintf(ops + n, sizeof ops - n, "%s[\"v\",%d,%d,%d,\"%s\"]", c ? "," : "", c, (h - span) / 2, span, colour); }
  snprintf(ops + n, sizeof ops - n, "]"); v_composed(id, x, y, w, h, ops);
}
/* a chapter's colour token by its id (regions.read.colours; Character's for an id with none) */
static void chapter_colour(const char *id_in, char *out, int cap) { char id[32]; snprintf(id, sizeof id, "%s", id_in); snprintf(out, (size_t)cap, "%s", v_scol_or(S, v_fmt(R ".colours.%s", id), "chCharacter")); }
static void say(const char *id, const char *text, int x, int base, const char *role, int align) { if (!text || !*text) return; v_say(id, text, x, base, V_ANCHOR_BASE, role, "glass", align); }

/* ---- the rail's geometry (§2.4): the same rule as the logic process's railLayout ---- */
typedef struct { int B, G, n, L, x[16], w[16]; } rail_t;
static void rail_layout(rail_t *g) {
  memset(g, 0, sizeof *g);
  int L = v_plen(P ".rail.lanes"); if (L > 16) L = 16; int n = 0, cnt[16];
  for (int i = 0; i < L; i++) { cnt[i] = v_pint(v_fmt(P ".rail.lanes.%d.n", i), 1); n += cnt[i]; }
  g->L = L; g->n = n; if (!n) return; g->G = n < 16 ? si(R ".rail.gap.short", 36) : si(R ".rail.gap.long", 10);
  int room = si(R ".rail.room", 316), tg = si(R ".rail.tagGap", 3), B = (room - g->G * (L - 1) - tg * (n - L) + n / 2) / n; if (B < si(R ".rail.pill.min", 15)) B = si(R ".rail.pill.min", 15); if (B > si(R ".rail.pill.max", 34)) B = si(R ".rail.pill.max", 34); g->B = B;
  int total = 0; for (int i = 0; i < L; i++) total += cnt[i] * B + tg * (cnt[i] - 1); total += g->G * (L - 1);
  int x = si(R ".rail.centre", 304) - (total + 1) / 2;   /* Math.floor(304 - total / 2): every species fits the 526 px picture (UI/UX 2026-10-30) */
  for (int i = 0; i < L; i++) { g->x[i] = x; g->w[i] = cnt[i] * B + tg * (cnt[i] - 1); x += g->w[i] + g->G; }
}

/* ---- the stamp moment and view (§2.7): the phase it is in and how far, 0..1000 ---- */
typedef struct { int on, lift, veil, gather, fold, blink, line; } moment_t;
static void moment_now(moment_t *m) {
  memset(m, 0, sizeof *m); if (spec_len("props", P ".stamp") < 0) return; m->on = 1;
  char mode[16]; snprintf(mode, sizeof mode, "%s", v_pstr(P ".stamp.mode")); anim_state_t a;
  int full = 1000;
  if (playing(ANIM_MOMENT, "fold", &a) || playing(ANIM_MOMENT, "unview", &a)) {   /* folding back: the dither back over the first half, the lanes return over the second, the veil out */
    int t = a.elapsed * 1000 / a.ms; m->fold = t < 500 ? full - t * 2 : 0; m->gather = t < 500 ? full : full - (t - 500) * 2; m->lift = m->gather; m->veil = full - t; return; }
  int view = strcmp(mode, "view") == 0, ms = 0, el = 0;
  if (playing(ANIM_MOMENT, view ? "view" : "stamp", &a)) { ms = a.ms; el = a.elapsed; } else { ms = 1; el = 1 << 20; }   /* at rest: the moment's end state, held until a key */
  int t = view ? el * 2 : el;   /* the view plays the same fold at double speed */
  m->lift = t >= 200 ? full : t * 1000 / 200; m->veil = m->lift;
  m->gather = t < 200 ? 0 : t >= 500 ? full : (t - 200) * 1000 / 300;
  m->fold = t < 500 ? 0 : t >= 700 ? full : (t - 500) * 1000 / 200;
  if (!view) { m->blink = t >= 700 && t < 1150 && ((t - 700) / 113) % 2 == 0; m->line = t >= 900; }   /* the block blinks twice inside its ring, then the line prints */
  (void)ms;
}

/* a caption's centre kept inside its plate (8 px in from each side): a long look name slides in rather than overrun the plate */
static int cap_centre(const char *t, const char *role, int c, int px, int pw) {
  int w = v_role_width(t, role), lo = px + 8 + w / 2, hi = px + pw - 8 - (w - w / 2);
  if (c < lo) c = lo; if (c > hi) c = hi; return c;
}
void word_reading(void) {
  char t[V_STR], a[160]; int r[4];
  /* the ground: the chassis, both frames, both glasses, the shelf, both lamps unlit */
  v_srect(S, R ".ground.rect", r); snprintf(a, sizeof a, "%s", v_pstr(P ".base")); v_name("read.ground"); v_slot("read.ground", a, NULL, r[0], r[1], r[2], r[3], 1);
  /* the chamber: the read's sweep over it, else the 200 ms dither between places, else the picture */
  int ch[4]; v_srect(S, R ".chamber.rect", ch); char cham[160]; snprintf(cham, sizeof cham, "%s", v_pstr(P ".chamber"));
  anim_state_t ra, da; int reading = spec_len("props", P ".reading") >= 0 && playing(ANIM_READ, "read", &ra), e = reading ? ra.elapsed : 0;
  v_name("read.chamber");
  if (reading) {
    char before[160]; snprintf(before, sizeof before, "%s", v_pstr(P ".reading.chamber")); int sweep = si(R ".read.sweepMs", 600), bx = ch[0] + (e >= sweep ? ch[2] : ch[2] * e / sweep);
    v_slot("read.chamber", before, NULL, ch[0], ch[1], ch[2], ch[3], 1);
    if (bx > ch[0]) { v_clip_box("read.chamber.clip", ch[0], ch[1], bx - ch[0], ch[3], 1); v_name("read.chamber"); v_slot("read.chamber.after", cham, NULL, ch[0], ch[1], ch[2], ch[3], 1); }   /* behind the bar the part paints from scan */
    if (e < sweep) { snprintf(a, sizeof a, "%s", v_pstr(P ".reading.sweep")); int sz[2]; if (has(a) && v_asset_size(a, sz) == 0) { int sx = bx - sz[0] / 2, left = sx < ch[0] ? ch[0] - sx : 0, w = sz[0] - left; if (sx + left + w > ch[0] + ch[2]) w = ch[0] + ch[2] - sx - left; if (w > 0) { v_name("read.sweep"); v_sprite_window("read.sweep", a, left, 0, sx + left, ch[1], w, sz[1]); } } }
  } else if (playing(ANIM_DITHER, "chamber", &da) && da.from_id[0] && has(da.from_id) && has(cham)) {
    int level = da.elapsed * 16 / da.ms; if (level > 16) level = 16; v_dither("read.chamber", da.from_id, cham, level, ch[0], ch[1], ch[2], ch[3]);
  } else v_slot("read.chamber", cham, NULL, ch[0], ch[1], ch[2], ch[3], 1);
  /* the read lamp lit while a read runs */
  if (reading) { v_srect(S, R ".lamp.rect", r); snprintf(a, sizeof a, "%s", v_pstr(P ".lamp")); v_name("read.lamp"); v_slot("read.lamp", a, NULL, r[0], r[1], r[2], r[3], 1); }
  /* the pod's glyph, outlined only; its name; the reason it carries, when it carries one */
  v_srect(S, R ".glyph.rect", r); snprintf(a, sizeof a, "%s", v_pstr(P ".glyph")); v_name("read.glyph"); v_slot("read.glyph", a, NULL, r[0], r[1], r[2], r[3], 1);
  { int nx = si(R ".name.x", 72), nb = si(R ".name.baseline", 98); snprintf(t, sizeof t, "%s", v_pstr(P ".name")); v_region("read.name", LAYER_TYPE); say("read.name", t, nx, nb, "glass.name", V_ALIGN_LEFT);
    snprintf(a, sizeof a, "%s", v_pstr(P ".why")); if (*a) { int w = v_role_width(t, "glass.name"); say("read.why", a, nx + w + si(R ".why.gap", 12), nb, "glass.quiet", V_ALIGN_LEFT); } }
  moment_t mo; moment_now(&mo);
  /* ---- the rail ---- */
  if (spec_len("props", P ".rail") >= 0) {
    rail_t g; rail_layout(&g); int rr[4]; v_srect(S, R ".rail.rect", rr); int lift = mo.on ? -si(R ".stamp.lift", 8) * mo.lift / 1000 : 0;
    char rail[160]; snprintf(rail, sizeof rail, "%s", v_pstr(P ".rail.pic"));
    int tagY = si(R ".rail.tagY", 450), bh = si(R ".rail.copy", 31), capY = si(R ".rail.capY", 443);
    v_name("read.rail");
    if (reading) {   /* the tag fills: the shown copies growing down 0 to 300 ms, the carried 300 to 600, the cap at 600; then the shine crosses the lane */
      char before[160]; snprintf(before, sizeof before, "%s", v_pstr(P ".reading.rail")); v_slot("read.rail", before, NULL, rr[0], rr[1], rr[2], rr[3], 1);
      int k = v_pint(P ".reading.lane", -1); if (k >= 0 && k < g.L) { int x = g.x[k], w = g.w[k], h1 = e >= 300 ? bh : bh * e / 300, h2 = e < 300 ? 0 : e >= 600 ? bh : bh * (e - 300) / 300;
        if (h1 > 0) { v_clip_box("read.fill.0", x, tagY, w, h1, 1); v_name("read.rail"); v_slot("read.fill.0.pic", rail, NULL, rr[0], rr[1], rr[2], rr[3], 1); }
        if (h2 > 0) { v_clip_box("read.fill.1", x, tagY + bh, w, h2 + 1, 1); v_name("read.rail"); v_slot("read.fill.1.pic", rail, NULL, rr[0], rr[1], rr[2], rr[3], 1); }
        if (e >= 600) { v_clip_box("read.fill.cap", x, capY, w, tagY - capY, 1); v_name("read.rail"); v_slot("read.fill.cap.pic", rail, NULL, rr[0], rr[1], rr[2], rr[3], 1); }
        if (e >= 600 && e < 800) { snprintf(a, sizeof a, "%s", v_pstr(P ".reading.shine")); int sz[2]; if (has(a) && v_asset_size(a, sz) == 0) { int sx = x - sz[0] + (w + sz[0]) * (e - 600) / 200; v_clip_box("read.shine.clip", x, tagY, w, 2 * bh + 1, 1); v_name("read.rail"); v_sprite("read.shine", a, sx, tagY, sz[0], sz[1]); } } }
    } else if (!mo.on || mo.gather == 0) v_slot("read.rail", rail, NULL, rr[0], rr[1] + lift, rr[2], rr[3], 1);
    /* the marks over unread lanes (glint, star), from lane x + 6, 14 px apart, centred on y 433 */
    char gl[160], stp[160]; snprintf(gl, sizeof gl, "%s", v_pstr(P ".marks.glint")); snprintf(stp, sizeof stp, "%s", v_pstr(P ".marks.star"));
    if (!mo.on) for (int i = 0; i < g.L; i++) { for (int j = 0, nm = v_plen(v_fmt(P ".rail.lanes.%d.marks", i)); j < nm && j < 2; j++) { char mk[16]; snprintf(mk, sizeof mk, "%s", v_pstr(v_fmt(P ".rail.lanes.%d.marks.%d", i, j)));
      v_name("read.marks"); pic_c(v_fmt("read.mark.%d.%d", i, j), strcmp(mk, "goal") == 0 ? stp : gl, g.x[i] + si(R ".rail.markX", 6) + j * si(R ".rail.markPitch", 14), si(R ".rail.markY", 433)); } }
    /* the bracket: the chapter in hand (a 2 px readAmber ring 5 px outside its lane, the notches beside it), or the one trait in the detail; the stamp notch on its top once taught */
    int k = v_pint(P ".rail.hand", 0), tr = v_pint(P ".rail.trait", -1), nudge = v_pint(P ".rail.nudge", 0); anim_state_t na; int off = 0;
    if (playing(ANIM_WIPE, "nudge", &na)) { int half = na.ms / 2; off = (na.elapsed < half ? na.elapsed : na.ms - na.elapsed) * si(R ".rail.nudge", 2) / (half > 0 ? half : 1); off *= nudge < 0 ? -1 : 1; }
    if (!mo.on && k >= 0 && k < g.L) {
      v_region("read.bracket", LAYER_CHROME); char col[24]; snprintf(col, sizeof col, "%s", v_scol_or(S, R ".rail.bracket.colour", "readAmber"));
      if (tr >= 0) { int x = g.x[k] + tr * (g.B + si(R ".rail.tagGap", 3)) - si(R ".rail.traitBracket.dx", 3); ring_box("read.bracket", x, si(R ".rail.traitBracket.y", 446), g.B + 2 * si(R ".rail.traitBracket.dx", 3), si(R ".rail.traitBracket.h", 71), 2, si(R ".rail.traitBracket.r", 7), col); }
      else { int dx = si(R ".rail.bracket.dx", 5), x = g.x[k] - dx + off, y = si(R ".rail.bracket.y", 439), w = g.w[k] + 2 * dx, h = si(R ".rail.bracket.h", 78), nw = sk(R ".rail.bracket.notch", 0), nh = sk(R ".rail.bracket.notch", 1), ny = si(R ".rail.bracket.notchY", 474) - nh / 2;
        ring_box("read.bracket", x, y, w, h, 2, si(R ".rail.bracket.r", 6), col);
        notch("read.bracket.l", g.x[k] - si(R ".rail.bracket.notchDx", 10) + off, ny, nw, nh, -1, col); notch("read.bracket.r", g.x[k] + g.w[k] + dx + off, ny, nw, nh, 1, col);
        if (v_pbool(P ".rail.notch", 0)) notch("read.bracket.stamp", x + w / 2 - sk(R ".rail.stampNotch", 0) / 2, y - sk(R ".rail.stampNotch", 1), sk(R ".rail.stampNotch", 0), sk(R ".rail.stampNotch", 1), 2, col); }
    }
    /* ---- the stamp in progress over the left glass ---- */
    if (mo.on) {
      int gl4[4]; v_srect(S, R ".stamp.veilRect", gl4); snprintf(a, sizeof a, "%s", v_pstr(P ".stamp.veil")); int opa = si(R ".stamp.veilPct", 60) * mo.veil * 255 / 100000;
      if (has(a) && opa > 0) { v_name("read.stamp"); prim_sprite_opa(opa); v_sprite("read.stamp.veil", a, gl4[0], gl4[1], gl4[2], gl4[3]); }
      int size = v_pint(P ".stamp.size", 0), ps = v_pint(P ".stamp.plateSize", 0), cx = si(R ".stamp.centre.0", 304), cy = si(R ".stamp.centre.1", 246), px = cx - ps / 2, py = cy - ps / 2, sx = cx - size / 2, sy = cy - size / 2;
      if (mo.gather == 0) { v_name("read.rail"); v_slot("read.stamp.rail", rail, NULL, rr[0], rr[1] + lift, rr[2], rr[3], 1); }
      else if (mo.fold == 0 || mo.gather < 1000) {   /* the lanes gather: each lane a window of the rail picture, sliding in whole pixels to its block's place on the stamp box, in order */
        for (int i = 0; i < g.L; i++) { int f = mo.gather * g.L - i * 1000; f = f < 0 ? 0 : f > 1000 ? 1000 : f; int cell = v_pint(P ".stamp.cell", 1), bx = v_pint(v_fmt(P ".stamp.blocks.%d.col", i), 0) * cell, by = v_pint(v_fmt(P ".stamp.blocks.%d.row", i), 0) * cell;
          int x0 = g.x[i], y0 = rr[1] + lift, x1 = sx + bx, y1 = sy + by, x = x0 + (x1 - x0) * f / 1000, y = y0 + (y1 - y0) * f / 1000; v_name("read.rail"); v_sprite_window(v_fmt("read.stamp.lane.%d", i), rail, g.x[i] - rr[0], 0, x, y, g.w[i], rr[3]); } }
      if (mo.gather >= 1000) {   /* they fold: the gathered picture dithers to the stamp on its plate */
        snprintf(a, sizeof a, "%s", v_pstr(P ".stamp.plate")); v_name("read.stamp"); if (has(a)) v_sprite("read.stamp.plate", a, px, py, ps, ps);
        char gat[160], stm[160]; snprintf(gat, sizeof gat, "%s", v_pstr(P ".stamp.gather")); snprintf(stm, sizeof stm, "%s", v_pstr(P ".stamp.stamp"));
        int level = mo.fold * 16 / 1000; v_name("read.stamp"); if (level <= 0) { if (has(gat)) v_sprite("read.stamp.img", gat, sx, sy, size, size); } else if (level >= 16) { if (has(stm)) v_sprite("read.stamp.img", stm, sx, sy, size, size); } else if (has(gat) && has(stm)) v_dither("read.stamp.img", gat, stm, level, sx, sy, size, size);
        int b = v_pint(P ".stamp.block", -1);
        if (mo.blink == 1 && b >= 0) { int cell = v_pint(P ".stamp.cell", 1), bx = v_pint(v_fmt(P ".stamp.blocks.%d.col", b), 0) * cell, by = v_pint(v_fmt(P ".stamp.blocks.%d.row", b), 0) * cell, bw = v_pint(v_fmt(P ".stamp.blocks.%d.cols", b), 0) * cell, bhh = v_pint(v_fmt(P ".stamp.blocks.%d.rows", b), 0) * cell;
          v_region("read.stamp", LAYER_CHROME); ring_box("read.stamp.ring", sx + bx - 2, sy + by - 2, bw + 4, bhh + 4, 2, 2, v_scol_or(S, R ".rail.bracket.colour", "readAmber")); }
        if (mo.line) { snprintf(t, sizeof t, "%s", v_pstr(P ".stamp.line")); v_region("read.stamp", LAYER_TYPE); if (*t) v_say_in("read.stamp.line", t, cx - 260, 520, si(R ".stamp.lineBaseline", 410), V_ANCHOR_BASE, "glass.name", "glass"); }
      }
    }
  }
  /* ---- the right frame ---- */
  if (spec_len("props", P ".right") < 0) return;
  char form[16], colour[24]; snprintf(form, sizeof form, "%s", v_pstr(P ".right.form")); chapter_colour(v_pstr(P ".right.chapter.id"), colour, sizeof colour);
  int x0 = si(R ".right.x", 660);
  /* the chapter head: its bar, its name, its marks or the read tick, the lock of a sealed chapter, the reward chip */
  { v_srect(S, R ".right.bar", r); v_region("read.head", LAYER_CHROME); v_rect("read.head.bar", r[0], r[1], r[2], r[3], *colour ? colour : "readAmber");
    snprintf(t, sizeof t, "%s", v_pstr(P ".right.chapter.name")); v_region("read.head", LAYER_TYPE); say("read.head.name", t, x0, si(R ".right.head.baseline", 124), "glass.chapter", V_ALIGN_LEFT);
    int mx = x0 + v_role_width(t, "glass.chapter") + si(R ".right.head.gap", 18), my = si(R ".right.head.cy", 115); v_name("read.head");
    if (v_pbool(P ".right.chapter.lock", 0)) { snprintf(a, sizeof a, "%s", v_pstr(P ".right.lock")); pic_c("read.head.lock", a, mx + 7, my); }
    else if (v_pbool(P ".right.chapter.tick", 0)) { if (!(reading && ra.elapsed < 600)) { snprintf(a, sizeof a, "%s", v_pstr(P ".right.tick")); pic_c("read.head.tick", a, mx + 10, my); } }   /* at 600 the marks become the tick */
    else for (int j = 0, nm = v_plen(P ".right.chapter.marks"); j < nm && j < 2; j++) { char mk[16]; snprintf(mk, sizeof mk, "%s", v_pstr(v_fmt(P ".right.chapter.marks.%d", j))); snprintf(a, sizeof a, "%s", v_pstr(strcmp(mk, "goal") == 0 ? P ".right.star" : P ".right.glint")); pic_c(v_fmt("read.head.mark.%d", j), a, mx + 8 + j * si(R ".right.head.pitch", 22), my); }
    if (spec_len("props", P ".right.chip") >= 0 && (!reading || ra.elapsed >= 600)) { int cr[4]; v_srect(S, R ".right.chip.rect", cr); snprintf(a, sizeof a, "%s", v_pstr(P ".right.chip.pic")); v_name("read.chip"); v_slot("read.chip", a, NULL, cr[0], cr[1], cr[2], cr[3], 1);
      v_region("read.chip", LAYER_TYPE); say("read.chip.plus", "+", cr[0] + si(R ".right.chip.plusX", 30), cr[1] + si(R ".right.chip.baseline", 23), "glass.chip", V_ALIGN_LEFT); snprintf(a, sizeof a, "%s", v_pstr(P ".right.chip.diamond")); v_name("read.chip"); pic_c("read.chip.diamond", a, cr[0] + si(R ".right.chip.diamondX", 52), cr[1] + cr[3] / 2);
      snprintf(t, sizeof t, "%d", v_pint(P ".right.chip.n", 1)); v_region("read.chip", LAYER_TYPE); say("read.chip.n", t, cr[0] + si(R ".right.chip.nX", 66), cr[1] + si(R ".right.chip.baseline", 23), "glass.chip", V_ALIGN_LEFT); }
  }
  /* the plates of the form's layout: (y, h) each, the shown disc's radius and centre, the carried's radius */
  int n = v_plen(P ".right.plates"); if (n <= 0) goto key;
  char lay[24]; if (strcmp(form, "unread") == 0 || strcmp(form, "read") == 0) snprintf(lay, sizeof lay, "%s%d", form, n > 4 ? 4 : n); else snprintf(lay, sizeof lay, "%s", form);
  char L[64]; snprintf(L, sizeof L, R ".right.layouts.%s", lay);
  int pxl = si(R ".right.plate.x", 648), pw = si(R ".right.plate.w", 334), cs = si(R ".right.plate.corners", 12), ins[4] = { cs, cs, cs, cs };
  char platePic[160], glow[160]; snprintf(platePic, sizeof platePic, "%s", v_pstr(P ".right.plate")); snprintf(glow, sizeof glow, "%s", v_pstr(P ".right.glow"));
  int dimOf = strcmp(form, "unread") == 0;
  for (int i = 0; i < n && i < 4; i++) {
    char B[48]; snprintf(B, sizeof B, P ".right.plates.%d", i);
    int py = v_si(S, v_fmt("%s.plates.%d.0", L, i), 0), ph = v_si(S, v_fmt("%s.plates.%d.1", L, i), 0); if (!ph) { py = v_si(S, v_fmt("%s.plates.0.0", L), 140) + i * (v_si(S, v_fmt("%s.step", L), 80)); ph = v_si(S, v_fmt("%s.plates.0.1", L), 72); }
    /* the plate: its chapter glow behind, the lit nine-slice */
    { int gsz[2]; if (has(glow) && v_asset_size(glow, gsz) == 0) { int gh = gsz[1] < ph ? gsz[1] : ph; v_name("read.plate"); v_sprite_window(v_fmt("read.plate.%d.glow", i), glow, 0, (gsz[1] - gh) / 2, pxl, py, gsz[0] < pw ? gsz[0] : pw, gh); } }
    if (has(platePic)) { v_name("read.plate"); v_nine(v_fmt("read.plate.%d", i), platePic, pxl, py, pw, ph, ins); }
    int r0 = v_si(S, v_fmt("%s.r", L), 44), rc = v_si(S, v_fmt("%s.rc", L), 29), cx = v_si(S, v_fmt("%s.cx", L), 706), cy = py + v_si(S, v_fmt("%s.cyOff", L), ph / 2);
    if (strcmp(form, "detail") == 0) { cx = sk(R ".right.layouts.detail.shown", 0); cy = sk(R ".right.layouts.detail.shown", 1); }
    char sp[160], cp[160]; snprintf(sp, sizeof sp, "%s", v_pstr(v_fmt("%s.shown.pic", B))); snprintf(cp, sizeof cp, "%s", v_pstr(v_fmt("%s.carried.pic", B)));
    int ccx = cx + (r0 * 98 + 50) / 100, ccy = cy + (r0 * 46 + 50) / 100;
    if (strcmp(form, "sealed") == 0 || strcmp(form, "identify") == 0) { v_name("read.disc"); pic_c(v_fmt("read.disc.%d", i), sp, cx, cy); snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.kind", B))); v_region("read.words", LAYER_TYPE); say(v_fmt("read.kind.%d", i), t, sk(R ".right.layouts.sealed.words", 0), sk(R ".right.layouts.sealed.words", 1), "glass.quiet", V_ALIGN_LEFT); continue; }
    /* the discs: the carried behind, lower right, then the shown; their rims in the chapter colour (2 px at r >= 30) and the carried's in its dim; the dither while the read prints them */
    int dlev = 16; if (reading) { int t0 = 0; dlev = e <= t0 ? 0 : e >= 300 ? 16 : e * 16 / 300; }
    int clev = 16; if (reading) clev = e <= 300 ? 0 : e >= 600 ? 16 : (e - 300) * 16 / 300;
    char dimc[32]; snprintf(dimc, sizeof dimc, "%sDim", colour);
    if (has(cp) && (!reading || clev > 0)) { v_name("read.disc"); pic_c(v_fmt("read.disc.%d.c", i), cp, ccx, ccy); v_region("read.rim", LAYER_CHROME); ring_box(v_fmt("read.rim.%d.c", i), ccx - rc, ccy - rc, 2 * rc, 2 * rc, rc >= 30 ? 2 : 1, rc, dimc); }
    if (has(sp) && (!reading || dlev > 0)) { v_name("read.disc"); pic_c(v_fmt("read.disc.%d", i), sp, cx, cy); v_region("read.rim", LAYER_CHROME); ring_box(v_fmt("read.rim.%d", i), cx - r0, cy - r0, 2 * r0, 2 * r0, r0 >= 30 ? 2 : 1, r0, colour); }
    /* the badges: a look new to the collection at the shown disc's upper left, the goal at the carried disc's upper right */
    if (v_pbool(v_fmt("%s.glint", B), 0) && (!reading || e >= 600)) { snprintf(a, sizeof a, "%s", v_pstr(P ".right.badgeGlint")); v_name("read.badge"); pic_c(v_fmt("read.badge.%d.g", i), a, cx - r0 * 78 / 100, cy - r0 * 78 / 100); }
    if (v_pbool(v_fmt("%s.goal", B), 0) && (!reading || e >= 600)) { snprintf(a, sizeof a, "%s", v_pstr(P ".right.badgeStar")); v_name("read.badge"); pic_c(v_fmt("read.badge.%d.s", i), a, ccx + rc * 72 / 100, ccy - rc * 72 / 100); }
    v_region("read.words", LAYER_TYPE);
    /* the words: the trait (M20) and its kind line (read), or the trait over its template chips (unread) */
    int tx = v_si(S, v_fmt("%s.tx", L), 810);
    snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.trait", B)));
    if (strcmp(form, "detail") != 0) say(v_fmt("read.trait.%d", i), t, tx, cy + v_si(S, v_fmt("%s.traitDy", L), -14), "glass.trait", V_ALIGN_LEFT);
    if (dimOf) {
      int chr = v_si(S, v_fmt("%s.chipR", L), 21), chx = v_si(S, v_fmt("%s.chipX", L), 842), chp = v_si(S, v_fmt("%s.chipPitch", L), 50), chdy = v_si(S, v_fmt("%s.chipDy", L), 19);
      for (int j = 0, nc = v_plen(v_fmt("%s.chips", B)); j < nc && j < 3; j++) { char cpic[160]; snprintf(cpic, sizeof cpic, "%s", v_pstr(v_fmt("%s.chips.%d", B, j))); v_name("read.chip"); pic_c(v_fmt("read.tchip.%d.%d", i, j), cpic, chx + j * chp, cy + chdy); v_region("read.rim", LAYER_CHROME); ring_box(v_fmt("read.tchip.%d.%d.rim", i, j), chx + j * chp - chr, cy + chdy - chr, 2 * chr, 2 * chr, 1, chr, dimc); }
    } else if (!reading || e >= 600) {
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.kind", B)));
      if (strcmp(form, "detail") == 0) say("read.kind.d", t, sk(R ".right.layouts.detail.kind", 0), sk(R ".right.layouts.detail.kind", 1), "glass.quiet", V_ALIGN_LEFT);
      else say(v_fmt("read.kind.%d", i), t, tx, cy + v_si(S, v_fmt("%s.kindDy", L), 20), "glass.quiet", V_ALIGN_LEFT);
    }
    /* the captions under the pictures: the shown look; the carried look, with the moon, only when it differs */
    if (!dimOf) {
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.shown.caption", B)));
      if (!reading || dlev >= 16) { if (strcmp(form, "detail") == 0) v_say_in("read.cap.d", t, sk(R ".right.layouts.detail.caption", 0) - 80, 160, sk(R ".right.layouts.detail.caption", 1), V_ANCHOR_BASE, "glass.caption", "glass"); else { int c = cap_centre(t, "glass.caption", cx, pxl, pw); v_say_in(v_fmt("read.cap.%d", i), t, c - 100, 200, cy + v_si(S, v_fmt("%s.capDy", L), 70), V_ANCHOR_BASE, "glass.caption", "glass"); } }
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt("%s.carried.caption", B)));
      if (*t && (!reading || clev >= 16)) { int bx = strcmp(form, "detail") == 0 ? sk(R ".right.layouts.detail.carriedCaption", 0) : ccx + 6, by = strcmp(form, "detail") == 0 ? sk(R ".right.layouts.detail.carriedCaption", 1) : cy + v_si(S, v_fmt("%s.cap2Dy", L), 87);
        int w = v_role_width(t, "glass.faint"); if (strcmp(form, "detail") != 0) bx = cap_centre(t, "glass.faint", bx, pxl + 16, pw - 16); v_say_in(v_fmt("read.cap2.%d", i), t, bx - 100, 200, by, V_ANCHOR_BASE, "glass.faint", "glass");
        snprintf(a, sizeof a, "%s", v_pstr(P ".right.moon")); v_name("read.moon"); pic_c(v_fmt("read.moon.%d", i), a, bx - w / 2 - 7, by - 4); }
    }
  }
  /* the detail's second plate: the mate, and the odds of each look its child can show, eight seeds a row */
  if (strcmp(form, "detail") == 0 && spec_len("props", P ".right.mate") >= 0) {
    int py = sk(R ".right.layouts.detail.mate", 0), ph = sk(R ".right.layouts.detail.mate", 1);
    { int gsz[2]; if (has(glow) && v_asset_size(glow, gsz) == 0) { int gh = gsz[1] < ph ? gsz[1] : ph; v_name("read.plate"); v_sprite_window("read.plate.m.glow", glow, 0, (gsz[1] - gh) / 2, pxl, py, gsz[0] < pw ? gsz[0] : pw, gh); } }
    if (has(platePic)) { v_name("read.plate"); v_nine("read.plate.m", platePic, pxl, py, pw, ph, ins); }
    snprintf(a, sizeof a, "%s", v_pstr(P ".right.mate.glyph")); { int gr[4]; v_srect(S, R ".right.layouts.detail.glyph", gr); v_name("read.mate"); v_slot("read.mate.glyph", a, NULL, gr[0], gr[1], gr[2], gr[3], 1); }
    snprintf(t, sizeof t, "%s", v_pstr(P ".right.mate.name")); v_region("read.words", LAYER_TYPE); say("read.mate.name", t, sk(R ".right.layouts.detail.mateName", 0), sk(R ".right.layouts.detail.mateName", 1), "glass.name", V_ALIGN_LEFT);
    char dimc[32]; snprintf(dimc, sizeof dimc, "%sDim", colour);
    for (int j = 0, nr = v_plen(P ".right.mate.rows"); j < nr && j < 2; j++) {
      int ry = sk(R ".right.layouts.detail.rows", j), dx = si(R ".right.layouts.detail.rowDisc", 684), sx0 = si(R ".right.layouts.detail.seedX", 724), sp = si(R ".right.layouts.detail.seedPitch", 18), sd = si(R ".right.layouts.detail.seed", 13);
      snprintf(a, sizeof a, "%s", v_pstr(v_fmt(P ".right.mate.rows.%d.pic", j))); v_name("read.odds"); pic_c(v_fmt("read.odds.%d.disc", j), a, dx, ry); v_region("read.rim", LAYER_CHROME); ring_box(v_fmt("read.odds.%d.rim", j), dx - 22, ry - 22, 44, 44, 1, 22, colour);
      int goal = v_pbool(v_fmt(P ".right.mate.rows.%d.goal", j), 0), filled = v_pint(v_fmt(P ".right.mate.rows.%d.seeds", j), 0); const char *on = goal ? "readAmber" : colour; char off[32]; snprintf(off, sizeof off, "%s", goal ? "amberDim" : dimc);
      if (goal) { snprintf(a, sizeof a, "%s", v_pstr(P ".marks.star")); v_name("read.odds"); pic_c(v_fmt("read.odds.%d.star", j), a, dx + 17, ry - 17); }
      v_region("read.seeds", LAYER_CHROME);
      for (int q = 0; q < 8; q++) { char ops[200];   /* a seed: filled in its colour, or hollow (a 1.5 px ring) in its dim */
        if (q < filled) snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]]", sd, sd, sd / 2, on, on);
        else snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"],[\"rrect\",1,1,%d,%d,%d,\"\",\"%s\"]]", sd, sd, sd / 2, off, sd - 2, sd - 2, sd / 2 - 1, off);
        v_composed(v_fmt("read.seed.%d.%d", j, q), sx0 + q * sp - sd / 2, ry - sd / 2, sd, sd, ops); }
      snprintf(t, sizeof t, "%s", v_pstr(v_fmt(P ".right.mate.rows.%d.odds", j))); v_region("read.words", LAYER_TYPE); say(v_fmt("read.odds.%d.words", j), t, si(R ".right.layouts.detail.oddsX", 872), ry + 5, goal ? "glass.goal" : "glass.caption", V_ALIGN_LEFT);
    }
  }
key:
  /* the price key: lit, dim (held) or pressed (the first 80 ms of a read), shaking ±3 px when held and pressed; the diamond and the price on it; the one line beside it */
  if (spec_len("props", P ".right.key") >= 0 && !(v_pbool(P ".right.key.pressOnly", 0) && !(reading && e < si(R ".key.pressMs", 80)))) {
    int kr[4]; v_srect(S, R ".key.rect", kr); char st[12]; snprintf(st, sizeof st, "%s", v_pstr(P ".right.key.state")); anim_state_t sa; int dx = 0;
    if (playing(ANIM_WIPE, "keyShake", &sa)) dx = (sa.elapsed * 4 / sa.ms) % 2 ? -3 : 3;   /* ±3 px over 120 ms */
    snprintf(a, sizeof a, "%s", v_pstr(P ".right.key.pic")); v_name("read.key"); v_slot("read.key", a, NULL, kr[0] + dx, kr[1], kr[2], kr[3], 1);
    int dim = strcmp(st, "dim") == 0, down = strcmp(st, "pressed") == 0 ? 2 : 0;
    snprintf(a, sizeof a, "%s", v_pstr(P ".right.key.diamond")); v_name("read.key"); pic_c("read.key.diamond", a, sk(R ".key.diamond", 0) + dx, sk(R ".key.diamond", 1) + down);
    snprintf(t, sizeof t, "%s", v_pstr(P ".right.key.price")); v_region("read.key", LAYER_TYPE); v_say("read.key.price", t, sk(R ".key.price", 0) + dx, sk(R ".key.price", 1) + down, V_ANCHOR_BASE, dim ? "glass.priceDim" : "glass.price", "glass", V_ALIGN_CENTRE);
    snprintf(a, sizeof a, "%s", v_pstr(P ".right.beside.sprout")); snprintf(t, sizeof t, "%s", v_pstr(P ".right.beside.text"));
    if (v_pbool(P ".right.key.pressOnly", 0)) { a[0] = 0; t[0] = 0; }
    if (*a) { v_name("read.beside"); pic_c("read.beside.sprout", a, sk(R ".key.sprout", 0), sk(R ".key.sprout", 1)); v_region("read.words", LAYER_TYPE); say("read.beside", t, sk(R ".key.sproutText", 0), sk(R ".key.sproutText", 1), "glass.quiet", V_ALIGN_LEFT); }
    else if (*t) { v_region("read.words", LAYER_TYPE); say("read.beside", t, sk(R ".key.line", 0), sk(R ".key.line", 1), "glass.quiet", V_ALIGN_LEFT); }
  }
}

/* the target boxes for the ring: a plate, the price key; the rail, the detail's trait and the stamp view are rung by the bracket (no box) */
int reading_target_box(const char *id, int out[4]) {
  out[0] = out[1] = out[2] = out[3] = 0;
  if (strcmp(id, "key") == 0) { v_srect(S, R ".key.rect", out); out[3] = si(R ".key.h", 46); return 1; }
  if (strncmp(id, "plate.", 6) == 0) { int i = atoi(id + 6); char form[16]; snprintf(form, sizeof form, "%s", v_pstr(P ".right.form")); int n = v_plen(P ".right.plates"); char L[64]; snprintf(L, sizeof L, R ".right.layouts.%s%d", form, n > 4 ? 4 : n);
    out[0] = si(R ".right.plate.x", 648); out[2] = si(R ".right.plate.w", 334); out[1] = v_si(S, v_fmt("%s.plates.%d.0", L, i), 0); out[3] = v_si(S, v_fmt("%s.plates.%d.1", L, i), 0); return out[3] > 0; }
  return 0;
}
