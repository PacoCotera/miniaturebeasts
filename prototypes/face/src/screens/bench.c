/* The Probe bench (bench.json; station-layouts.md "Probe bench"): the words that draw it from the spec and the props' regions, in draw order, then the focus ring. The stage (the room master, over the frame's
   ground), the cradle (one sprite at the spec's rectangle: the Probe of the tier, or the empty cradle while it is away), the shield plates (`shieldPlates`: plain places by tier, four stable nodes, a place the tier lacks drawn with no size, never
   dropped; whole plates from the left, gone ones to the right; none away), then the two modules of Home's `module` build with their objects (the Mend switch: track, knob, the dock mark and the plates it leaves whole; the Upgrade slot: the socket,
   the part, what it adds), then the ring, which stays drawn where it is, with its lift, through every hold. Nothing is drawn here but pictures the host sends: a picture not sent is a slot not yet filled, and nothing is drawn in its place.
   The events: `mend` (the plate that seats goes gone to whole by a 16-level Bayer dither over 300 ms), `switch` (the knob slides over 200 ms in whole pixels over the track it started on; at its end the track, the meaning picture and the lamp change
   together), `install` (0 to 300 the armed part drops 8 px, the cradle and the plates are still tier 1; at 300 the part, the cradle and the plates cut to tier 2 and the fourth plate stands gone; 300 to 600 it seats; 600 to 900 the adds dither from
   their `-new` slices to plain). The props carry the end state of each; the words read how far the event has got. With motion off the end state is what is drawn. Focus is `focus.graph` of bench.json on the boxes this file drew. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define S "bench"
static int bi(const char *p, int d) { return spec_int(S, p, d); }
static int bk(const char *base, int k) { return spec_int(S, v_fmt("%s.%d", base, k), 0); }
static void brect(const char *p, int r[4]) { if (!v_spec_rect(S, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *fcol(const char *p) { static char b[4][24]; static int k; char *o = b[k++ & 3]; spec_str("frame", p, o, 24); return o; }
static int has(const char *id) { return id && *id && wire_has_asset(id); }
/* a spec string kept in the caller's own buffer: the toolbox's rings are reused by the next call */
static void bs(const char *path, char out[96]) { out[0] = 0; spec_str(S, path, out, 96); }
static void ps(const char *path, char out[96]) { snprintf(out, 96, "%s", v_pstr(path)); }
/* how far an event on `target` has got (-1: not playing, or motion off: the end state shows) */
static int played(int kind, const char *target, anim_state_t *t) { return v_pbool("motion", 1) && anim_get(kind, target, t) && t->ms > 0 ? t->elapsed : -1; }
/* the longest table of places (the highest tier's): the number of stable plate nodes, and the places a tier that lacks one keeps its hidden node at */
static int longest(int *tier) {
  int best = 0, bt = 1; for (int t = 1; t <= 8; t++) { int n = spec_len(S, v_fmt("regions.plates.places.%d", t)); if (n > best) { best = n; bt = t; } }
  if (tier) *tier = bt; return best;
}
static void hidden_plate(int i, int dy, const char *asset) {   /* a place with no plate: the node of no size, at the place the longest table gives it, so showing it later invalidates nothing of its own at the corner */
  int bt; longest(&bt); char id[24]; snprintf(id, sizeof id, "plates.%d", i);
  int hx = spec_int(S, v_fmt("regions.plates.places.%d.%d.0", bt, i), 0), hy = spec_int(S, v_fmt("regions.plates.places.%d.%d.1", bt, i), 0) + dy; v_name("plates"); v_sprite_hidden(id, asset, hx, hy);
}
static int lift_of(const char *id, const char *cur) { return strcmp(id, cur) == 0 ? bi(v_fmt("focus.targets.%s.lift", id), 2) : 0; }

/* the node of a picture the host may not have sent, or a place with nothing: the same node with no size, so the order of the screen's nodes never changes */
static void pic(const char *region, const char *id, const char *asset, int x, int y, int w, int h, const char *fallback) {
  v_name(region); if (has(asset)) v_sprite(id, asset, x, y, w, h); else if (has(fallback)) v_sprite_hidden(id, fallback, x, y);
}

/* ---- the stage: the frame's ground, and the room master over it (the first of the props' candidates the host has sent) ---- */
static void build_stage(void) {
  int r[4]; brect("regions.bench.rect", r);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], fcol("colours.stageGround"));
  v_region("bench", LAYER_PAINTED);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}

/* ---- the cradle: one sprite at the spec's rectangle (the Probe of the tier; the empty cradle away; the tier-1 Probe until the install cuts at 300) ---- */
static void build_cradle(void) {
  int r[4]; brect("regions.cradle.rect", r); v_set_focal(r);
  char p[96]; ps("regions.cradle.picture", p);
  anim_state_t t; int inst = played(ANIM_INSTALL, "slot", &t); if (inst >= 0 && inst < 300) bs("regions.cradle.pictures.tier1", p);
  pic("cradle", "cradle.picture", p, r[0], r[1], r[2], r[3], p);
}

/* ---- the plate strip (fix 5 P3): the tier's painted foam strip under the plates in both states, at the spec's rectangle for the tier; away its slots show empty; the install cuts t1 to t2 at 300 ---- */
static void build_strip(void) {
  int tier = v_pint("regions.strip.tier", 1); char p[96]; ps("regions.strip.picture", p);
  anim_state_t t; int inst = played(ANIM_INSTALL, "slot", &t);
  if (inst >= 0 && inst < 300) { tier = 1; bs("regions.strip.slices.1", p); }   /* the tier-1 strip stays on the face until the install cuts at 300, as the cradle's picture */
  int r[4]; brect(v_fmt("regions.strip.byTier.%d", tier), r);
  v_region("strip", LAYER_PAINTED); pic("strip", "plates.strip", p, r[0], r[1], r[2], r[3], p);
}

/* ---- shieldPlates: one sprite a place, the places a table by the tier, read as written ---- */
static void build_plates(int docked, const char *cur) {
  int most = longest(NULL); char sw[96], sg[96]; bs("regions.plates.slices.whole", sw); bs("regions.plates.slices.gone", sg);
  if (!docked) { for (int i = 0; i < most; i++) hidden_plate(i, 0, sw); return; }   /* away: no plates drawn, every node kept (hidden, not destroyed) */
  int tier = v_pint("regions.plates.tier", 1), whole = v_pint("regions.plates.whole", 0), seat = -1, level = 16;
  anim_state_t t; int inst = played(ANIM_INSTALL, "slot", &t), mend = played(ANIM_MEND, "plates", &t);
  if (inst >= 0) { anim_get(ANIM_INSTALL, "slot", &t);
    if (inst < 300) { tier = 1; whole = t.from; } else if (inst < 600) { whole = 3; seat = 3; level = 16 * (inst - 300) / 300; } else whole = most; }
  else if (mend >= 0) { anim_get(ANIM_MEND, "plates", &t); seat = t.to - 1; level = 16 * mend / t.ms; if (seat >= whole) seat = -1; }
  char tp[48]; snprintf(tp, sizeof tp, "regions.plates.places.%d", tier); int n = spec_len(S, tp);
  if (n <= 0 || whole < 0 || whole > n) { v_error("word shieldPlates: the tier has no table of places, or whole is above its length"); return; }
  int pw = bk("regions.plates.plate", 0), ph = bk("regions.plates.plate", 1), dy = -lift_of("plates", cur);
  for (int i = 0; i < most; i++) {
    char id[24]; snprintf(id, sizeof id, "plates.%d", i);
    if (i >= n) { hidden_plate(i, dy, sw); continue; }   /* the tier lacks this place */
    int x = spec_int(S, v_fmt("%s.%d.0", tp, i), 0), y = spec_int(S, v_fmt("%s.%d.1", tp, i), 0) + dy;
    int goneNow = i >= whole || i == seat;
    pic("plates", id, goneNow ? sg : sw, x, y, pw, ph, sw);
    if (i == seat) { v_name("plates"); v_dither("plates.seat", sg, sw, level, x, y, pw, ph); }
  }
}

/* ---- the Shield block's words (specs/station-probe-purpose.md): "Shield" over the plates and the reason under them, centred on the axis, in both states; the same text word the modules' words use ---- */
static void shield_text(const char *region, const char *id, const char *text, int cx, int y, int px, const char *col) {
  if (!*text) return; int w = v_measure(text, px); v_region(region, LAYER_TYPE); v_text(id, text, cx - v_half(w), y, w, px, col);
}
static void build_shield(void) {
  char t[96], col[24]; int axis = bi("regions.strip.axis", 472), r[4];
  brect("regions.shieldWord.rect", r); int px = bi("regions.shieldWord.px", 16); spec_str(S, "strings.shield", t, sizeof t); spec_str(S, "regions.shieldWord.colour", col, sizeof col);
  shield_text("shieldWord", "shield.word", t, axis, r[1] + 5, px, col);   /* the module word's zone: a 24 px zone, the cap top 5 below its top */
  brect("regions.shieldLine.rect", r); px = bi("regions.shieldLine.px", 16); int pitch = bi("regions.shieldLine.pitch", 20); spec_str(S, "regions.shieldLine.colour", col, sizeof col);
  for (int i = 0; i < 2; i++) { char id[24]; snprintf(id, sizeof id, "shield.line.%d", i); spec_str(S, v_fmt("strings.shieldLine.%d", i), t, sizeof t); shield_text("shieldLine", id, t, axis, bi(v_fmt("regions.shieldLine.lineTops.%d", i), r[1] + pitch * i) + v_fdiv(pitch - v_cap(px), 2), px, col); }
}

/* ---- the Mend module: the switch (track, knob), the dock mark and the plates it leaves whole ---- */
static void build_switch(const char *cur, int cnt_cap) {
  int r[4]; brect("regions.switch.rect", r); int dy = -lift_of("switch", cur), mx = r[0], my = r[1] + dy;
  char state[96], lamp[96]; ps("regions.switch.state", state); ps("regions.switch.lamp", lamp);
  int on = strcmp(state, "on") == 0, count = v_pint("regions.switch.count", 3), whole = v_pint("regions.switch.whole", 0), floor_ = bi("regions.switch.meaning.plates.offWhole", 0);
  if (count > cnt_cap) count = cnt_cap; if (whole > count) whole = count;
  anim_state_t t; int sw = played(ANIM_SWITCH, "switch", &t), kx = 0; int xoff = bi("regions.switch.toggle.knob.x.off", 16), xon = bi("regions.switch.toggle.knob.x.on", 56);
  kx = on ? xon : xoff;
  if (sw >= 0) {   /* the knob over the track it started on: the track, the meaning picture and the lamp are the start state's until the end */
    int was = t.from != 0, x0 = was ? xon : xoff, x1 = was ? xoff : xon; kx = x0 + (x1 - x0) * sw / t.ms; on = was; whole = was ? count : (floor_ < count ? floor_ : count); snprintf(lamp, sizeof lamp, "%s", was ? "well" : "off");
  }
  build_module(S, "switch", dy, lamp);
  char tk[96], kn[96], dk[96], ws[96], gs[96];
  bs(on ? "regions.switch.toggle.track.on" : "regions.switch.toggle.track.off", tk); bs("regions.switch.toggle.knob.slice", kn); bs("regions.switch.meaning.dock.slice", dk); bs("regions.switch.meaning.plates.whole", ws); bs("regions.switch.meaning.plates.gone", gs);
  int tx = mx + bk("regions.switch.toggle.at", 0), ty = my + bk("regions.switch.toggle.at", 1);
  pic("switch", "switch.track", tk, tx, ty, bk("regions.switch.toggle.size", 0), bk("regions.switch.toggle.size", 1), tk);
  pic("switch", "switch.knob", kn, mx + kx, my + bi("regions.switch.toggle.knob.y", 56), bk("regions.switch.toggle.knob.size", 0), bk("regions.switch.toggle.knob.size", 1), kn);
  pic("switch", "switch.dock", dk, mx + bk("regions.switch.meaning.dock.at", 0), my + bk("regions.switch.meaning.dock.at", 1), bk("regions.switch.meaning.dock.size", 0), bk("regions.switch.meaning.dock.size", 1), dk);
  int ax = mx + bk("regions.switch.meaning.plates.at", 0), ay = my + bk("regions.switch.meaning.plates.at", 1), pitch = bi("regions.switch.meaning.plates.pitch", 24), iw = bk("regions.switch.meaning.plates.icon", 0), ih = bk("regions.switch.meaning.plates.icon", 1);
  for (int i = 0, most = longest(NULL); i < most; i++) {
    char id[24]; snprintf(id, sizeof id, "switch.plate.%d", i);
    if (i >= count) { v_name("switch"); v_sprite_hidden(id, ws, ax + i * pitch, ay); continue; }
    pic("switch", id, i < whole ? ws : gs, ax + i * pitch, ay, iw, ih, ws);
  }
}

/* ---- the Upgrade module: the socket, the part, and what the upgrade adds ---- */
static void add_piece(const char *id, const char *key, int x, int y, int w, int h, int isNew, int level) {   /* level: -2 plain (fitted); -1 the `-new` slice settled; 0..16 the dither from the `-new` slice to the plain one */
  char plain[96], nw[96]; bs(v_fmt("regions.slot.adds.%s.slice", key), plain); bs(v_fmt("regions.slot.adds.%s.newSlice", key), nw);
  if (!isNew || level == -2) { pic("slot", id, plain, x, y, w, h, plain); return; }
  if (level == -1) { pic("slot", id, nw, x, y, w, h, plain); return; }
  v_name("slot"); if (has(plain)) v_sprite_hidden(id, plain, x, y);   /* the settled piece's node stays, no size, while the dither draws */
  v_name("slot"); v_dither(v_fmt("%s.dither", id), nw, plain, level, x, y, w, h);
}
static void build_slot(const char *cur) {
  int r[4]; brect("regions.slot.rect", r); int dy = -lift_of("slot", cur), mx = r[0], my = r[1] + dy;
  char state[96], lamp[96]; ps("regions.slot.state", state); ps("regions.slot.lamp", lamp);
  anim_state_t t; int inst = played(ANIM_INSTALL, "slot", &t), drop = 0;
  int fitted = strcmp(state, "fitted") == 0, armed = strcmp(state, "armed") == 0, dim = strcmp(state, "dim") == 0, level = fitted ? -2 : -1;   /* the adds: plain once fitted, else the `-new` slice on the one each adds */
  if (inst >= 0) {   /* the install: the armed part drops, then cuts to the fitted one; the adds settle last */
    if (inst < 300) { fitted = 0; armed = 1; drop = 8 * inst / 300; level = -1; } else if (inst < 600) { fitted = 1; level = -1; } else { fitted = 1; level = 16 * (inst - 600) / 300; }
  }
  build_module(S, "slot", dy, lamp);
  char sk[96], pt[96]; bs("regions.slot.socket.slice", sk);
  bs(fitted ? "regions.slot.part.slices.fitted" : dim ? "regions.slot.part.slices.dim" : "regions.slot.part.slices.ready", pt);
  pic("slot", "slot.socket", sk, mx + bk("regions.slot.socket.at", 0), my + bk("regions.slot.socket.at", 1), bk("regions.slot.socket.size", 0), bk("regions.slot.socket.size", 1), sk);
  int py = armed ? bk("regions.slot.part.armedAt", 1) + drop : bk("regions.slot.part.at", 1);   /* armed: 8 px out of the socket; fitted and the rest: seated */
  pic("slot", "slot.part", pt, mx + bk("regions.slot.part.at", 0), my + py, bk("regions.slot.part.size", 0), bk("regions.slot.part.size", 1), pt);
  /* what it adds: the plain slices, the one each adds over tier 1 in its `-new` slice until it is fitted (the adds are never dimmed) */
  int ax, ay, pitch, n, nw;
  ax = mx + bk("regions.slot.adds.pods.at", 0); ay = my + bk("regions.slot.adds.pods.at", 1); pitch = bi("regions.slot.adds.pods.pitch", 24); n = bi("regions.slot.adds.pods.count", 3); nw = bi("regions.slot.adds.pods.new", 1);
  for (int i = 0; i < n; i++) add_piece(v_fmt("slot.pod.%d", i), "pods", ax + i * pitch, ay, bk("regions.slot.adds.pods.icon", 0), bk("regions.slot.adds.pods.icon", 1), i >= n - nw, level);
  ax = mx + bk("regions.slot.adds.plates.at", 0); ay = my + bk("regions.slot.adds.plates.at", 1); pitch = bi("regions.slot.adds.plates.pitch", 24); n = bi("regions.slot.adds.plates.count", 4); nw = bi("regions.slot.adds.plates.new", 1);
  for (int i = 0; i < n; i++) add_piece(v_fmt("slot.plate.%d", i), "plates", ax + i * pitch, ay, bk("regions.slot.adds.plates.icon", 0), bk("regions.slot.adds.plates.icon", 1), i >= n - nw, level);
  add_piece("slot.reach", "reach", mx + bk("regions.slot.adds.reach.at", 0), my + bk("regions.slot.adds.reach.at", 1), bk("regions.slot.adds.reach.size", 0), bk("regions.slot.adds.reach.size", 1), 1, level);
  add_piece("slot.deep", "deep", mx + bk("regions.slot.adds.deep.at", 0), my + bk("regions.slot.adds.deep.at", 1), bk("regions.slot.adds.deep.size", 0), bk("regions.slot.adds.deep.size", 1), 1, level);
  /* the dials' captions: one word each under its dial, centred on it (specs/station-probe-purpose.md); they ride the module's lift */
  { static const char *K[2] = { "reachWord", "deepWord" }, *W[2] = { "reach", "deep" };
    for (int i = 0; i < 2; i++) { char t[40], col[24], id[24]; spec_str(S, v_fmt("strings.addCaptions.%s", W[i]), t, sizeof t); spec_str(S, v_fmt("regions.slot.adds.%s.colour", K[i]), col, sizeof col);
      int px = bi(v_fmt("regions.slot.adds.%s.px", K[i]), 16), cx = mx + bk(v_fmt("regions.slot.adds.%s.at", K[i]), 0) + bk(v_fmt("regions.slot.adds.%s.size", K[i]), 0) / 2, ty = my + bk(v_fmt("regions.slot.adds.%s.at", K[i]), 1) + v_fdiv(bk(v_fmt("regions.slot.adds.%s.size", K[i]), 1) - v_cap(px), 2);
      snprintf(id, sizeof id, "slot.%s", K[i]); shield_text("slot", id, t, cx, ty, px, col); } }
}

/* ---- the targets as the words drew them, in the props' order ---- */
int bench_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph");
  int n = v_plen("focus.targets"); if (n > cap) n = cap; int k = 0;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[k]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1); t->index = i; int r[4]; brect(v_fmt("regions.%s.rect", t->id), r);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3]; k++;
  }
  return k;
}

/* the ring on the focused target, round the object as drawn: its region's rect lifted by the target's lift (the plates: the union of the drawn plates, lifted); it is drawn through the bench's holds, where it is */
static void build_ring(const char *cur) {
  if (!cur[0]) return;
  int box[4]; brect(v_fmt("regions.%s.rect", cur), box); if (box[2] <= 0) return;
  if (strcmp(cur, "plates") == 0) {   /* the drawn plates' union: the places of the tier, each plate-sized */
    char tp[48]; snprintf(tp, sizeof tp, "regions.plates.places.%d", v_pint("regions.plates.tier", 1)); int n = spec_len(S, tp); if (n <= 0) return;
    int pw = bk("regions.plates.plate", 0), ph = bk("regions.plates.plate", 1), x0 = 1 << 30, y0 = 1 << 30, x1 = -(1 << 30), y1 = -(1 << 30);
    for (int i = 0; i < n; i++) { int px = spec_int(S, v_fmt("%s.%d.0", tp, i), 0), py = spec_int(S, v_fmt("%s.%d.1", tp, i), 0); if (px < x0) x0 = px; if (py < y0) y0 = py; if (px + pw > x1) x1 = px + pw; if (py + ph > y1) y1 = py + ph; }
    box[0] = x0; box[1] = y0; box[2] = x1 - x0; box[3] = y1 - y0;
  }
  box[1] -= lift_of(cur, cur);
  v_region("focus", LAYER_CHROME); word_focusRing("focus", S, v_fmt("focus.targets.%s", cur), box);
}

void bench_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  int docked = strcmp(v_pstr("state"), "docked") == 0;
  int cap = longest(NULL); { anim_state_t t; int inst = played(ANIM_INSTALL, "slot", &t); if (inst >= 0 && inst < 300) cap = spec_len(S, "regions.plates.places.1"); }   /* the meaning picture's count cuts 3 → 4 at 300 */
  build_stage(); build_cradle(); build_strip(); build_plates(docked, cur); build_shield(); build_switch(cur, cap); build_slot(cur); build_ring(cur);
}

/* a key on the bench: ✓ ← and the room keys say an intent on the focused target; the pad moves the ring by bench.json focus.graph (the hold, in screens_key, lets only a room key through) */
void bench_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "switch");
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[8]; char gkey[24]; int n = bench_focus(t, 8, gkey, sizeof gkey);
  int glen; const char *graph = spec_raw(S, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  int roomAt[4] = { 0, 0, 0, 0 }; char to[48];
  int step = focus_move(g, t, n, cur, dir, NULL, 0, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
