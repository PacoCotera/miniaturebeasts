/* Cargo's binding table (lvgl-switch.md §2.2, §4 L2.2; cargo.json; build spec 1 to 6): the words that draw each of its states in draw order, from the `cargo` spec and the props' regions, the frame's words after (screens.c).
   bay      the bay window (one picture, radius 6 with the frame's inner shade), the berths (three of 256, or four of 188 with a portrait crate in: the recess or the slatted shut door, the crate and its shadow, the berth's edge, the fourth berth's
            gold edge), the Pods hatch (shut, with its ring) and the waiting mat with the pods stored on it.
   opening  the same, one crate at a time: its crate lifts, its contents rise into the display by the 180 ms dither (over the display rect only), the materials answer and go to the top bar, the hatch opens, the pods and finds go one at a time
            and swap size where they land (v_dither_window: the travel picture out, the stored picture in, two nodes on one level clock), the crate is done. The crate and the step in it come from the arrival event's own clock (the last start <=
            elapsed in regions.opening.starts); with reduced motion the event ends at once, so the host stages regions.opening.crate and .at and each step is a cut.
   end      every crate done, the hatch open with the arrived pods' wells lit when a pod came.
   arrival  the dock show (T-20261016-120), drawn on its own regions (cargo.json regions.dock*), as station-gate had it.
   Cargo has no focus target: the ring is on nothing, the pad does nothing, and a key says an intent on "room". A picture the host has not sent is a slot not yet filled: nothing is drawn. */
#include "../layout/layout.h"
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#define C "cargo"
/* a picture shown, or its node kept with no size until its step */
static int has(const char *id) { return id && *id && wire_has_asset(id); }
/* a picture at its own size, 1:1; 0 when the host has not sent it */
static int nat(const char *id, const char *asset, int x, int y) { int sz[2]; if (v_asset_size(asset, sz) < 0) return 0; return v_sprite(id, asset, x, y, sz[0], sz[1]); }
static void natslot(const char *id, const char *asset, int x, int y, int shown) { int sz[2]; v_asset_size(asset, sz); v_slot(id, asset, NULL, x, y, sz[0], sz[1], shown); }
/* p, e in 0..1000 */
static int ease_out(int p) { return 1000 - (1000 - p) * (1000 - p) / 1000; }
static void str_of(const char *path, char *out, int cap) { snprintf(out, (size_t)cap, "%s", v_pstr(path)); }

/* ---- the stage ---- */
static void ground(void) {
  int st[4]; char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  if (v_spec_rect("frame", "regions.stage.rect", st)) { v_region("stage", LAYER_CHROME); v_rect("stage.ground", st[0], st[1], st[2], st[3], g); }
}

/* ---- the time of the opening ---- */
typedef struct { int display, dither, flash, mats, matEach, hatch, pods, podEach, travel, swap, tail, portrait; } steps_t;
static steps_t S;
static int g_state, g_motion, g_cur, g_lt, g_len, g_n, g_base;   /* 0 bay, 1 opening, 2 end; the crate shown (absolute), the time in it, its length, the crates, the first of this event */
static void load_steps(void) {
  S.display = v_si(C, "events.opening.steps.display", 200); S.dither = v_si(C, "events.opening.steps.dither", 180); S.flash = v_si(C, "events.opening.steps.flash", 500); S.mats = v_si(C, "events.opening.steps.materials", 700); S.matEach = v_si(C, "events.opening.steps.materialEach", 150);
  S.hatch = v_si(C, "events.opening.steps.hatch", 1500); S.pods = v_si(C, "events.opening.steps.pods", 1700); S.podEach = v_si(C, "events.opening.steps.podEach", 300); S.travel = v_si(C, "events.opening.steps.travel", 600); S.swap = v_si(C, "events.opening.steps.swap", 180); S.tail = v_si(C, "events.opening.steps.tail", 300); S.portrait = v_si(C, "events.opening.steps.portrait", 700);
}
/* which crate, and how far into it: the face's own clock from the event's start (the last start <= elapsed), else the host's stage (reduced motion, or a frame after the event) */
static void opening_clock(void) {
  int n = v_plen("regions.opening.starts"); anim_state_t t;
  g_base = v_pint("regions.opening.base", 0); g_n = v_plen("regions.opening.crates");
  if (g_motion && n > 0 && anim_get(ANIM_ARRIVAL, "crate", &t)) {
    int q = 0; for (int i = 0; i < n; i++) if (v_pint(v_fmt("regions.opening.starts.%d", i), 0) <= t.elapsed) q = i;
    g_cur = g_base + q; g_lt = t.elapsed - v_pint(v_fmt("regions.opening.starts.%d", q), 0); g_len = v_pint(v_fmt("regions.opening.lens.%d", q), 0); return;
  }
  g_cur = v_pint("regions.opening.crate", 0); g_lt = v_pint("regions.opening.at", 0); g_len = v_pint(v_fmt("regions.opening.lens.%d", g_cur - g_base), 0);
}
/* an item that travels, at local time lt, its start s: 0 not yet, 1 travelling, 2 swapping size, 3 where it stays (with reduced motion: a cut to the end from its start) */
static int phase(int lt, int s) { if (lt < s) return 0; if (!g_motion) return 3; if (lt < s + S.travel) return 1; if (lt < s + S.travel + S.swap) return 2; return 3; }
static int swap_level(int lt, int s) { int l = (lt - s - S.travel) * 16 / S.swap; return l < 0 ? 0 : l > 15 ? 15 : l; }
static int travel_e(int lt, int s) { return layout_ease_io((lt - s) * 1000 / S.travel); }
static int pod_start(int j) { return S.pods + S.podEach * j; }
static int mat_start(int q) { return S.mats + S.matEach * q; }
static int crate_np(int k) { return v_plen(v_fmt("regions.opening.crates.%d.pods", k)); }
static int crate_nf(int k) { return v_plen(v_fmt("regions.opening.crates.%d.finds", k)); }
/* an item of crate k that went (a pod or a find, j counted pods then finds): its phase now */
static int item_phase(int k, int j) { if (g_state != 1 || k < g_cur) return 3; if (k > g_cur) return 0; return phase(g_lt, pod_start(j)); }
static int any_pod_came(void) { for (int i = 0, n = v_plen("regions.hatch.wells"); i < n; i++) if (v_pint(v_fmt("regions.hatch.wells.%d.from.crate", i), -1) >= 0) return 1; return 0; }

/* ---- the bay window: one picture, radius 6, the frame's inner shade (the corners outside the radius in the stage ground, a 1 px void edge on the radius) ---- */
static void build_bay(void) {
  int r[4]; v_srect(C, "regions.bay.rect", r); int rad = v_si(C, "regions.bay.radius", 6); char g[24], e[24]; spec_str(C, "regions.bay.corners", g, sizeof g); spec_str(C, "regions.bay.edge", e, sizeof e);
  v_region("bay", LAYER_ART); v_name("bay"); v_sprite("bay", v_pstr("regions.bay.picture"), r[0], r[1], r[2], r[3]);
  v_region("bayEdge", LAYER_CHROME); kit_windowFrame("bay.edge", r[0], r[1], r[2], r[3], rad, g, e);
}

/* ---- the berths (build spec 3): three of 256, or four of 188 with the portrait crate in the fourth ---- */
static void build_berths(void) {
  int four = v_pint("berths", 3) == 4, n = four ? 4 : 3, y = v_si(C, "regions.berths.y", 252); const char *G = four ? "regions.berths.four" : "regions.berths.three";
  char rb[96], sb[96], eb[96], gb[96]; str_of("regions.berths.recess", rb, sizeof rb); str_of("regions.berths.shut", sb, sizeof sb); str_of("regions.berths.edge", eb, sizeof eb); str_of("regions.berths.gilt", gb, sizeof gb);
  for (int i = 0; i < n; i++) {
    int x = v_sk(C, v_fmt("%s.%s", G, "x"), i); char P[48]; snprintf(P, sizeof P, "regions.berths.list.%d", i);
    char crate[96], lifting[96], done[96], shadow[96]; str_of(v_fmt("%s.crate", P), crate, sizeof crate); str_of(v_fmt("%s.lifting", P), lifting, sizeof lifting); str_of(v_fmt("%s.done", P), done, sizeof done); str_of(v_fmt("%s.shadow", P), shadow, sizeof shadow);
    int k = v_pint(v_fmt("%s.k", P), -1), full = *crate != 0;
    int st = !full ? -1 : g_state == 0 ? 0 : g_state == 2 ? 2 : (k < 0 || k < g_cur) ? 2 : k > g_cur ? 0 : (g_lt >= g_len ? 2 : 1);   /* -1 empty, 0 sealed, 1 lifting, 2 done */
    v_region("berth", LAYER_ART); v_name("berth");
    nat(v_fmt("berth.%d.base", i), full ? rb : sb, x, y);   /* the recess is always under a crate; an empty berth is its slatted shut door */
    if (full) {
      nat(v_fmt("berth.%d.shadow", i), shadow, x + v_sk(C, v_fmt("%s.%s", G, "shadow.at"), 0), y + v_sk(C, v_fmt("%s.%s", G, "shadow.at"), 1));
      const char *which = st == 1 ? "lifting" : st == 2 ? "done" : "sealed"; const char *img = st == 1 ? lifting : st == 2 ? done : crate;
      nat(v_fmt("berth.%d.crate", i), img, x + v_sk(C, v_fmt("%s.%s", G, v_fmt("%s.at", which)), 0), y + v_sk(C, v_fmt("%s.%s", G, v_fmt("%s.at", which)), 1));
    }
    nat(v_fmt("berth.%d.edge", i), eb, x + v_sk(C, v_fmt("%s.%s", G, "edge.at"), 0), y + v_sk(C, v_fmt("%s.%s", G, "edge.at"), 1));   /* the berth's outline and lip: a 1 px rounded outline at the rect - 1 and a lip along the bottom, built at build time (cargo-cuts.py) */
    if (four && i == 3 && *gb) nat("berth.3.gilt", gb, x + spec_int(C, "regions.berths.four.portrait.gilt.at.0", -5), y + spec_int(C, "regions.berths.four.portrait.gilt.at.1", -5));   /* the fourth berth carries the difference: a 2 px gold edge and its keyline */
  }
}

/* ---- the hatch: shut with its ring, or open with its six wells and the find strip ---- */
static int hx, hy;
static void well_centre(int i, int c[2]) { c[0] = hx + spec_int(C, v_fmt("regions.hatch.wells.centres.%d.0", i), 0); c[1] = hy + spec_int(C, v_fmt("regions.hatch.wells.centres.%d.1", i), 0); }
static int hatch_open(void) {
  if (g_state == 0) return 0;
  if (g_state == 2) return any_pod_came();
  int items = crate_np(g_cur) + crate_nf(g_cur);
  if (items > 0 && g_lt >= S.hatch && g_lt < g_len) return 1;   /* it cuts open at 1500 for a crate with a pod or a find, and shut at the crate's end */
  if (g_cur == g_n - 1 && g_lt >= g_len && any_pod_came()) return 1;   /* it stays open after the last crate if any pod came (build spec 6) */
  return 0;
}
static void build_hatch(void) {
  int r[4]; v_srect(C, "regions.hatch.rect", r); hx = r[0]; hy = r[1]; int open = hatch_open();
  v_region("hatch", LAYER_ART); v_name("hatch");
  nat("hatch.frame", v_pstr("regions.hatch.frame"), v_sk(C, "regions.hatch.frame.at", 0), v_sk(C, "regions.hatch.frame.at", 1));
  nat("hatch", v_pstr(open ? "regions.hatch.open" : "regions.hatch.shut"), r[0], r[1]);
  if (!open) { nat("hatch.ring", v_pstr("regions.hatch.ring"), v_sk(C, "regions.hatch.ring.at", 0), v_sk(C, "regions.hatch.ring.at", 1)); return; }
  int pw = v_sk(C, "regions.hatch.wells.pod.size", 0), ph = v_sk(C, "regions.hatch.wells.pod.size", 1), ax = v_sk(C, "regions.hatch.wells.pod.at", 0), ay = v_sk(C, "regions.hatch.wells.pod.at", 1), lx = v_sk(C, "regions.hatch.wells.lit.at", 0), ly = v_sk(C, "regions.hatch.wells.lit.at", 1);
  for (int i = 0, n = v_plen("regions.hatch.wells"); i < n; i++) {
    char pod[96]; str_of(v_fmt("regions.hatch.wells.%d.pod", i), pod, sizeof pod); if (!*pod) continue;
    int fc = v_pint(v_fmt("regions.hatch.wells.%d.from.crate", i), -1), fo = v_pint(v_fmt("regions.hatch.wells.%d.from.order", i), 0), c[2]; well_centre(i, c);
    int ph3 = fc < 0 ? 3 : item_phase(fc, fo);   /* a pod that was already stored stands; one the run brings lands at its crate's step */
    v_name("hatch.well");
    if (fc >= 0) natslot(v_fmt("hatch.lit.%d", i), v_pstr("regions.hatch.lit"), c[0] + lx, c[1] + ly, ph3 >= 2);   /* the well lights mint as the pod lands */
    v_slot(v_fmt("hatch.pod.%d", i), pod, NULL, c[0] + ax, c[1] + ay, pw, ph, ph3 == 3);
  }
  /* the find strip: a find is its 16 × 16 picture, 20 apart, once it has landed */
  int sx = v_sk(C, "regions.hatch.strip.find.at", 0), sy = v_sk(C, "regions.hatch.strip.find.at", 1), pitch = v_si(C, "regions.hatch.strip.find.pitch", 20), fw = v_sk(C, "regions.hatch.strip.find.size", 0), fh = v_sk(C, "regions.hatch.strip.find.size", 1);
  for (int k = 0; k < g_n; k++) for (int f = 0, nf = crate_nf(k); f < nf; f++) {
    int slotn = v_pint(v_fmt("regions.opening.crates.%d.finds.%d.slot", k, f), 0), np = crate_np(k);
    v_name("hatch.strip"); v_slot(v_fmt("hatch.find.%d", slotn), v_pstr(v_fmt("regions.opening.crates.%d.finds.%d.small", k, f)), NULL, sx + pitch * slotn, sy, fw, fh, item_phase(k, np + f) == 3);
  }
}

/* ---- the waiting mat: the pods stored on it, oldest at the left; a fourth or more start at x 32 with "+n" at the right ---- */
static int wait_x(int i, int count) { return count <= 3 ? v_sk(C, v_fmt("regions.waiting.pods.byCount.%d", count), i) : v_sk(C, "regions.waiting.pods.moreX", i); }
static void build_waiting(void) {
  int r[4]; v_srect(C, "regions.waiting.rect", r); v_region("waiting", LAYER_ART); v_name("waiting"); nat("waiting.mat", v_pstr("regions.waiting.mat"), r[0], r[1]);
  int n = v_plen("regions.waiting.pods"), present = 0, top = v_si(C, "regions.waiting.pods.top", 434), pw = v_sk(C, "regions.waiting.pods.size", 0), ph = v_sk(C, "regions.waiting.pods.size", 1), sdx = v_sk(C, "regions.waiting.pods.shadow.at", 0), sdy = v_sk(C, "regions.waiting.pods.shadow.at", 1);
  char shadow[96]; str_of("regions.waiting.shadow", shadow, sizeof shadow);
  int p3[16]; if (n > 16) n = 16;
  for (int i = 0; i < n; i++) { int fc = v_pint(v_fmt("regions.waiting.pods.%d.from.crate", i), -1), fo = v_pint(v_fmt("regions.waiting.pods.%d.from.order", i), 0); p3[i] = fc < 0 ? 3 : item_phase(fc, fo); if (p3[i] >= 2) present++; }
  for (int i = 0, seen = 0; i < n && seen < 3; i++) {
    if (p3[i] < 2) continue; seen++;
    int x = wait_x(seen - 1, present), shown = p3[i] == 3;
    v_name("waiting.pod"); natslot(v_fmt("waiting.shadow.%d", i), shadow, x + sdx, top + sdy, p3[i] >= 2);
    v_slot(v_fmt("waiting.pod.%d", i), v_pstr(v_fmt("regions.waiting.pods.%d.pod", i)), NULL, x, top, pw, ph, shown);
  }
  { char more[16] = ""; int px = v_si(C, "regions.waiting.pods.more.px", 16);
    if (present > 3) snprintf(more, sizeof more, "+%d", present - 3);
    v_region("waitingMore", LAYER_TYPE);
    v_line_at("waiting.more", more, v_si(C, "regions.waiting.pods.more.right", 180), v_si(C, "regions.waiting.pods.more.centreY", 458), V_ANCHOR_MID, px, v_scol(C, "colours.display.more"), V_ALIGN_RIGHT); }
}

/* ---- the display row: the open crate's contents, in one row centred on x 600 (build spec 2) ---- */
typedef struct { int kind, idx, x, y, w, h, ax, ay, apx; char amt[16]; } el_t;   /* kind: 0 a pod, 1 a find, 2 a material */
#define MAXEL 32
static el_t E[MAXEL]; static int nE, g_small;
static int fpx(int px) { return px >= 28 ? 28 : px >= 20 ? 20 : 16; }   /* the face sets Inter at 16, 20 and 28: 22 is read as 20, 13 as 16 */
static int mat_ph(int lt, int q) { int s = mat_start(q); if (lt < s) return 0; if (!g_motion) return 3; if (lt < s + S.travel) return 1; return 3; }   /* 0 in the display, 1 travelling to the bar, 3 gone */
static int mats_gone(int nm) { return nm == 0 || mat_ph(g_lt, nm - 1) == 3; }
static void layout_display(int k) {
  char K[48]; snprintf(K, sizeof K, "regions.opening.crates.%d", k);
  int np = crate_np(k), nf = crate_nf(k), nm = v_plen(v_fmt("%s.mats", K)), within = v_si(C, "regions.display.gap.within", 16), between = v_si(C, "regions.display.gap.between", 24);
  int pw = v_sk(C, "regions.display.pod.size", 0), ph = v_sk(C, "regions.display.pod.size", 1), fw = v_sk(C, "regions.display.find.size", 0), fh = v_sk(C, "regions.display.find.size", 1);
  int bw = v_sk(C, "regions.display.material.big.size", 0), bh = v_sk(C, "regions.display.material.big.size", 1), sw = v_sk(C, "regions.display.material.small.size", 0), sh = v_sk(C, "regions.display.material.small.size", 1), agap = v_si(C, "regions.display.material.amount.gap", 8);
  int bpx = fpx(v_si(C, "regions.display.material.big.px", 22)), spx = fpx(v_si(C, "regions.display.material.small.px", 16)), mode, total[4];
  int gone = mats_gone(nm);
  for (mode = 0; mode < 4; mode++) {   /* 0 big materials; 1 small ones; 2 small ones and only the first find; 3 no materials, every find */
    int nfv = mode == 2 && nf > 1 ? 1 : nf, nmv = mode == 3 ? 0 : nm, small = mode >= 1, kinds = 0, w = 0;
    if (np) { w += np * pw + (np - 1) * within; kinds++; }
    if (nfv) { w += nfv * fw + (nfv - 1) * within; kinds++; }
    if (nmv) { for (int q = 0; q < nmv; q++) w += (small ? sw : bw) + agap + v_measure(v_pstr(v_fmt("%s.mats.%d.amount", K, q)), small ? spx : bpx); w += (nmv - 1) * within; kinds++; }
    if (kinds > 1) w += (kinds - 1) * between;
    total[mode] = w;
  }
  int dw = v_sk(C, "regions.display.rect", 2); mode = total[0] <= dw ? 0 : total[1] <= dw ? 1 : 2; if (mode == 2 && gone) mode = 3;
  int nfv = mode == 2 && nf > 1 ? 1 : nf, nmv = mode == 3 ? 0 : nm, small = mode >= 1, x = v_si(C, "regions.display.centre", 600) - total[mode] / 2; nE = 0;
  for (int j = 0; j < np && nE < MAXEL; j++) { el_t *e = &E[nE++]; memset(e, 0, sizeof *e); e->kind = 0; e->idx = j; e->x = x; e->y = v_si(C, "regions.display.pod.top", 108); e->w = pw; e->h = ph; x += pw + (j + 1 < np ? within : 0); }
  if (np && (nfv || nmv)) x += between - 0;
  for (int f = 0; f < nfv && nE < MAXEL; f++) { el_t *e = &E[nE++]; memset(e, 0, sizeof *e); e->kind = 1; e->idx = f; e->x = x; e->y = v_si(C, "regions.display.find.top", 108); e->w = fw; e->h = fh; x += fw + (f + 1 < nfv ? within : 0); }
  if (nfv && nmv) x += between;
  for (int q = 0; q < nmv && nE < MAXEL; q++) {
    el_t *e = &E[nE++]; memset(e, 0, sizeof *e); int px = small ? spx : bpx; e->kind = 2; e->idx = q; e->x = x; e->w = small ? sw : bw; e->h = small ? sh : bh;
    e->y = v_si(C, small ? "regions.display.material.small.top" : "regions.display.material.big.top", 124); snprintf(e->amt, sizeof e->amt, "%s", v_pstr(v_fmt("%s.mats.%d.amount", K, q))); e->apx = px;
    e->ax = x + e->w + agap; e->ay = v_cap_top(v_si(C, "regions.display.material.amount.centreY", 180), V_ANCHOR_MID, px);
    x += e->w + agap + v_measure(e->amt, px) + (q + 1 < nmv ? within : 0);
  }
  g_small = small;
}
/* A picture of the contents: it rises into the display by the 180 ms dither, in its own box (v_dither_window from clear), the plain picture after; reduced motion is a cut at 200. */
static void dpic(const char *id, const char *asset, int x, int y, int w, int h, int show) {
  if (!show) return;
  if (g_motion && g_lt < S.display + S.dither) { int level = (g_lt - S.display) * 16 / S.dither; v_sprite_hidden(id, asset, x, y); char d[112]; snprintf(d, sizeof d, "%s.d", id); if (level > 0) v_dither_window(d, NULL, 0, 0, asset, 0, 0, level, x, y, w, h); }
  else v_sprite(id, asset, x, y, w, h);
}
static void dpic_nat(const char *id, const char *asset, int x, int y, int show) { int sz[2]; if (v_asset_size(asset, sz) < 0) return; dpic(id, asset, x, y, sz[0], sz[1], show); }
static int mat_index(const char *name) { return !strcmp(name, "energy") ? 0 : !strcmp(name, "data") ? 1 : 2; }

/* a pod or a find in flight, from its display box to where it stays; once there it swaps size: the travel picture dithers out and the stored picture dithers in, two nodes on one level clock (the architect's ruling) */
static void fly(const char *id, const char *big, int bw, int bh, int fx, int fy, const char *small, int sx, int sy, int sw, int sh, int ph3, int s) {
  int tx = sx + sw / 2 - bw / 2, ty = sy + sh - bh;   /* the feet meet: the travel's last box */
  if (ph3 == 1) { int e = travel_e(g_lt, s); char n[112]; snprintf(n, sizeof n, "%s.t", id); v_sprite(n, big, layout_lerp(fx, tx, e), layout_lerp(fy, ty, e), bw, bh); }
  else if (ph3 == 2) { int level = swap_level(g_lt, s); char o[112], i[112]; snprintf(o, sizeof o, "%s.o", id); snprintf(i, sizeof i, "%s.i", id);
    v_dither_window(o, big, 0, 0, NULL, 0, 0, level, tx, ty, bw, bh); v_dither_window(i, NULL, 0, 0, small, 0, 0, level, sx, sy, sw, sh); }
}
static void build_display(void) {
  if (g_state != 1 || g_cur < g_base || g_cur >= g_n) return;
  char K[48]; snprintf(K, sizeof K, "regions.opening.crates.%d", g_cur);
  if (g_lt < S.display || g_lt >= g_len) return;   /* the contents are in the display from 200 to the crate's end; the display is empty after */
  char kind[16]; str_of(v_fmt("%s.kind", K), kind, sizeof kind); int np = crate_np(g_cur);
  v_region("display", LAYER_ART); v_name("display");
  if (!strcmp(kind, "sitting")) {   /* the portrait crate: its painting in the frame, in the display's centre; at 700 the pair travels off to the top left, the one travel that leaves the bay */
    char fr[96], pc[96]; str_of(v_fmt("%s.portrait.frame", K), fr, sizeof fr); str_of(v_fmt("%s.portrait.picture", K), pc, sizeof pc);
    int x = v_sk(C, "regions.display.portrait.at", 0), y = v_sk(C, "regions.display.portrait.at", 1), px = v_sk(C, "regions.display.portrait.pictureAt", 0), py = v_sk(C, "regions.display.portrait.pictureAt", 1), tx = v_sk(C, "regions.display.portrait.leaves", 0), ty = v_sk(C, "regions.display.portrait.leaves", 1);
    int ph3 = g_lt < S.portrait ? 0 : !g_motion ? 3 : g_lt < S.portrait + S.travel ? 1 : 3;
    if (ph3 == 1) { int e = travel_e(g_lt, S.portrait); x = layout_lerp(x, tx, e); y = layout_lerp(y, ty, e); }
    v_name("portrait");   /* its own region: it is the one picture that leaves the bay */
    if (ph3 <= 1) { dpic_nat("d.portrait.frame", fr, x, y, 1); if (*pc) dpic_nat("d.portrait.picture", pc, x + px, y + py, 1); }
    return;
  }
  layout_display(g_cur);
  char shB[96], shS[96], gl[96]; str_of("regions.opening.shadowBig", shB, sizeof shB); str_of("regions.opening.shadowSmall", shS, sizeof shS); str_of("regions.opening.glint", gl, sizeof gl);
  int plain = !g_motion || g_lt >= S.display + S.dither;
  for (int i = 0; i < nE; i++) {
    el_t *e = &E[i]; char id[64];
    if (e->kind == 0) {
      int ph3 = phase(g_lt, pod_start(e->idx)); snprintf(id, sizeof id, "d.pod.%d", e->idx);
      dpic(id, v_pstr(v_fmt("%s.pods.%d.big", K, e->idx)), e->x, e->y, e->w, e->h, ph3 == 0);
      if (v_pbool(v_fmt("%s.pods.%d.isNew", K, e->idx), 0) && *gl) { snprintf(id, sizeof id, "d.pod.%d.g", e->idx); dpic_nat(id, gl, e->x + v_sk(C, "regions.display.pod.glint.at", 0), e->y + v_sk(C, "regions.display.pod.glint.at", 1), ph3 == 0); }
    } else if (e->kind == 1) {
      int ph3 = phase(g_lt, pod_start(np + e->idx)); snprintf(id, sizeof id, "d.find.%d", e->idx);
      dpic(id, v_pstr(v_fmt("%s.finds.%d.big", K, e->idx)), e->x, e->y, e->w, e->h, ph3 == 0);
    } else {
      int ph3 = mat_ph(g_lt, e->idx), show = ph3 == 0; snprintf(id, sizeof id, "d.mat.%d.s", e->idx);
      dpic_nat(id, g_small ? shS : shB, e->x + v_sk(C, g_small ? "regions.display.material.small.shadow.at" : "regions.display.material.big.shadow.at", 0), e->y + v_sk(C, g_small ? "regions.display.material.small.shadow.at" : "regions.display.material.big.shadow.at", 1), show);
      snprintf(id, sizeof id, "d.mat.%d", e->idx); dpic(id, v_pstr(v_fmt("%s.mats.%d.%s", K, e->idx, g_small ? "small" : "big")), e->x, e->y, e->w, e->h, show);
      v_region("displayAmount", LAYER_TYPE); snprintf(id, sizeof id, "d.mat.%d.a", e->idx);
      v_text(id, show && plain ? e->amt : "", e->ax, e->ay, show && plain ? v_measure(e->amt, e->apx) : 0, e->apx, v_scol(C, "colours.display.amount"));
      v_region("display", LAYER_ART);
    }
  }
}
/* ---- what travels: the materials to the top bar's icons, the pods to their wells or the mat, the finds to the strip ---- */
static void build_travel(void) {
  if (g_state != 1 || g_cur < g_base || g_cur >= g_n) return;
  char K[48]; snprintf(K, sizeof K, "regions.opening.crates.%d", g_cur); char kind[16]; str_of(v_fmt("%s.kind", K), kind, sizeof kind);
  if (!strcmp(kind, "sitting") || g_lt < S.display || g_lt >= g_len) return;
  int np = crate_np(g_cur);
  v_region("travel", LAYER_ART); v_name("travel");
  for (int i = 0; i < nE; i++) {
    el_t *e = &E[i]; char id[64];
    if (e->kind == 2) {
      int s = mat_start(e->idx); if (mat_ph(g_lt, e->idx) != 1) continue;
      char nm[16]; str_of(v_fmt("%s.mats.%d.name", K, e->idx), nm, sizeof nm); int c[2]; if (!frame_material_centre(mat_index(nm), c)) continue;
      int ee = travel_e(g_lt, s); snprintf(id, sizeof id, "t.mat.%d", e->idx);
      v_sprite(id, v_pstr(v_fmt("%s.mats.%d.%s", K, e->idx, g_small ? "small" : "big")), layout_lerp(e->x, c[0] - e->w / 2, ee), layout_lerp(e->y, c[1] - e->h / 2, ee), e->w, e->h);
    } else if (e->kind == 0) {
      int j = e->idx, ph3 = phase(g_lt, pod_start(j)); if (ph3 != 1 && ph3 != 2) continue;
      int well = v_pint(v_fmt("%s.pods.%d.well", K, j), -1), mat = v_pint(v_fmt("%s.pods.%d.mat", K, j), -1), sx, sy;
      int pw = v_sk(C, "regions.hatch.wells.pod.size", 0), ph = v_sk(C, "regions.hatch.wells.pod.size", 1);
      if (well >= 0) { int c[2]; well_centre(well, c); sx = c[0] + v_sk(C, "regions.hatch.wells.pod.at", 0); sy = c[1] + v_sk(C, "regions.hatch.wells.pod.at", 1); }
      else { int idx = mat < 3 ? mat : 2; int cnt = mat + 1; sx = wait_x(idx, cnt); sy = v_si(C, "regions.waiting.pods.top", 434); }
      snprintf(id, sizeof id, "t.pod.%d", j);
      fly(id, v_pstr(v_fmt("%s.pods.%d.big", K, j)), e->w, e->h, e->x, e->y, v_pstr(v_fmt("%s.pods.%d.small", K, j)), sx, sy, pw, ph, ph3, pod_start(j));
    } else if (e->kind == 1) {
      int f = e->idx, j = np + f, ph3 = phase(g_lt, pod_start(j)); if (ph3 != 1 && ph3 != 2) continue;
      int slotn = v_pint(v_fmt("%s.finds.%d.slot", K, f), 0), fw = v_sk(C, "regions.hatch.strip.find.size", 0), fh = v_sk(C, "regions.hatch.strip.find.size", 1);
      int sx = v_sk(C, "regions.hatch.strip.find.at", 0) + v_si(C, "regions.hatch.strip.find.pitch", 20) * slotn, sy = v_sk(C, "regions.hatch.strip.find.at", 1); snprintf(id, sizeof id, "t.find.%d", f);
      fly(id, v_pstr(v_fmt("%s.finds.%d.big", K, f)), e->w, e->h, e->x, e->y, v_pstr(v_fmt("%s.finds.%d.small", K, f)), sx, sy, fw, fh, ph3, pod_start(j));
    }
  }
}

/* ---- the dock arrival's own bay and rack (cargo.json regions.dockBay, dockRack): as station-gate drew them, until the arrival is rebuilt on the new bay ---- */
static void build_dockBay(void) {
  int r[4]; v_srect(C, "regions.dockBay.rect", r);
  v_region("bay", LAYER_ART); v_name("bay"); v_sprite("bay", v_pstr("regions.dockBay.open"), r[0], r[1], r[2], r[3]);
}
static void build_dockRack(void) {
  int r[4]; v_srect(C, "regions.dockRack.rect", r);
  v_region("rack", LAYER_ART); v_name("rack"); v_sprite("rack", v_pstr("regions.dockRack.insert"), r[0], r[1], r[2], r[3]);
  int n = v_si(C, "regions.dockRack.wells.slots", 6), pw = v_sk(C, "regions.dockRack.pod.size", 0), ph = v_sk(C, "regions.dockRack.pod.size", 1);
  for (int i = 0; i < n; i++) {
    const char *pod = v_pstr(v_fmt("regions.dockRack.wells.%d.pod", i)); if (!*pod) continue;
    int w[4]; v_srect(C, v_fmt("regions.dockRack.wells.rects.%d", i), w);
    v_name("rack"); v_sprite(v_fmt("rack.pod.%d", i), pod, w[0] + v_sk(C, "regions.dockRack.pod.at", 0), w[1] + v_sk(C, "regions.dockRack.pod.at", 1), pw, ph);
  }
}

/* ---- the dock arrival (cargo.json regions.arrival, events.show; specs/station-dock-arrival-spec.md, amended T-67 and T-112) ----
   The show is the face's own clock (the event arrival/show) or, with reduced motion, the host's stage (regions.arrival.at); a show that has ended (no event, motion on) is its final frame: every beat done.
   bay, apron (the rack's place during the show), ribbon from 500, the link light in four cuts, the crates sliding in from the left with their shadows and glints, the mibis who came home (dither in, one hop), the band in the bay's
   top corners (the Probe's plates, who leaves). At the choice (phase choice) the rack stands and the strip (panel.json, form strip) is the overlay. */
#define ARR "regions.arrival"
static int arrival_time(void) {
  anim_state_t t;
  if (v_pbool("motion", 1)) { if (anim_get(ANIM_ARRIVAL, "show", &t)) return t.elapsed; return 1 << 20; }   /* an ended show is its last frame */
  return v_pint(ARR ".at", 0);
}
static const char *fcol(const char *name) { static char b[8][24]; static int k; char *o = b[k++ & 7]; if (spec_str("frame", v_fmt("colours.%s", name), o, 24) <= 0) snprintf(o, 24, "%s", name); return o; }
/* the crates slide in from x −256: crate i from 500 + 333 i over 400 ms, whole pixels, clipped to the bay's inside; its shadow from the frame it has landed; its glint (a crate holding a new species) from its landing */
static void build_crates_arrival(int t) {
  int n = v_plen("regions.dockCrates.places"), max = v_si(C, "regions.dockCrates.max", 3), in[4]; if (n > max) n = max; v_srect(C, "regions.dockBay.inside", in);
  const char *shadow = v_pstr("regions.dockCrates.shadow"), *glint = v_pstr(ARR ".glint"); int sx = v_sk(C, "regions.dockCrates.shadow.at", 0), sy = v_sk(C, "regions.dockCrates.shadow.at", 1), sw = v_sk(C, "regions.dockCrates.shadow.size", 0), sh = v_sk(C, "regions.dockCrates.shadow.size", 1);
  int at = v_si(C, ARR ".crates.at", 500), stagger = v_si(C, ARR ".crates.stagger", 333), ms = v_si(C, ARR ".crates.ms", 400), from = v_si(C, ARR ".crates.fromX", -256), gx = v_sk(C, ARR ".crates.glint.at", 0), gy = v_sk(C, ARR ".crates.glint.at", 1), gw = v_sk(C, ARR ".crates.glint.size", 0), gh = v_sk(C, ARR ".crates.glint.size", 1);
  int xs[8], shown[8], landed[8], sent = 0;
  for (int i = 0; i < n; i++) {
    int r[4]; v_srect(C, v_fmt("regions.dockCrates.byCount.%d.%d", n, i), r); int e = t - (at + i * stagger); shown[i] = e >= 0; landed[i] = e >= ms; xs[i] = r[0];
    if (!shown[i]) xs[i] = r[0] + from; else if (!landed[i]) { int p = e * 1000 / ms; xs[i] = r[0] + from * (1000 - ease_out(p)) / 1000; }
    if (has(shadow)) sent++; if (has(v_pstr(v_fmt("regions.dockCrates.places.%d", i)))) sent++;
  }
  if (!sent) return;
  v_name("crates");
  prim_node(v_id("crates.clip"), FN_CLIP, in[0], in[1], in[2], in[3], 0, sent, 0);
  for (int i = 0; i < n; i++) {
    int r[4]; v_srect(C, v_fmt("regions.dockCrates.byCount.%d.%d", n, i), r);
    v_name("crates"); v_slot(v_fmt("crates.%d.shadow", i), shadow, NULL, r[0] + sx, r[1] + sy, sw, sh, landed[i]);
    v_slot(v_fmt("crates.%d", i), v_pstr(v_fmt("regions.dockCrates.places.%d", i)), NULL, xs[i], r[1], r[2], r[3], shown[i]);
  }
  for (int i = 0; i < n; i++) if (v_pbool(v_fmt(ARR ".glints.%d", i), 0) && *glint) { int r[4]; v_srect(C, v_fmt("regions.dockCrates.byCount.%d.%d", n, i), r); v_region("arrivalGlint", LAYER_ART); v_name("glint"); v_slot(v_fmt("glint.%d", i), glint, NULL, r[0] + gx, r[1] + gy, gw, gh, t >= at + i * stagger + ms); }
}
/* the link light: step k (0 to 3) shows the first (k + 1) × 244 px of the picture from 500 + 100 k, each a cut */
static void build_light(int t) {
  int r[4]; v_srect(C, ARR ".light.rect", r); int at = v_si(C, ARR ".light.at", 500), each = v_si(C, ARR ".light.each", 100), steps = v_si(C, ARR ".light.steps", 4), px = v_si(C, ARR ".light.stepPx", 244);
  int k = t < at ? -1 : (t - at) / each; if (k >= steps) k = steps - 1; int w = k < 0 ? 1 : (k + 1) * px; if (w > r[2]) w = r[2];
  const char *pic = v_pstr(ARR ".light"); if (!has(pic)) return;
  v_region("arrivalLight", LAYER_ART); v_name("light"); prim_node(v_id("light.clip"), FN_CLIP, r[0], r[1], w, r[3], 0, 1, 0);
  v_slot("light", pic, NULL, r[0], r[1], r[2], r[3], k >= 0);
}
/* the mibis who came home: carried order, left to right, in front of the crates; mibi i dithers in at 1600 + 500 i over 300 ms, then one hop by the hatch's table (a cut each, whole pixels) */
static void build_mibis(int t) {
  int n = v_plen(ARR ".mibis"); if (n > 3) n = 3; if (n <= 0) return;
  int at = v_si(C, ARR ".mibis.at", 1600), each = v_si(C, ARR ".mibis.each", 500), dms = v_si(C, ARR ".mibis.dither.ms", 300), levels = v_si(C, ARR ".mibis.dither.levels", 16), hop = v_si(C, ARR ".mibis.hop.ms", 175), nl = spec_len(C, ARR ".mibis.hop.lift");
  v_region("arrivalMibis", LAYER_ART);
  for (int i = 0; i < n; i++) {
    int r[4]; v_srect(C, v_fmt(ARR ".mibis.byCount.%d.%d", n, i), r); const char *pic = v_pstr(v_fmt(ARR ".mibis.%d", i)); int e = t - (at + each * i);
    int motion = v_pbool("motion", 1), lift = 0; if (motion && e >= dms && e < dms + hop) for (int q = 0; q < nl; q++) if (e - dms >= spec_int(C, v_fmt(ARR ".mibis.hop.lift.%d.0", q), 1 << 30)) lift = spec_int(C, v_fmt(ARR ".mibis.hop.lift.%d.1", q), 0);
    int level = e < 0 ? 0 : e * levels / dms, done = motion ? e >= dms : e >= 0, dithering = motion && e >= 0 && e < dms && level > 0;   /* with reduced motion a mibi appears as a cut at its time, no dither and no hop; a dither at level 0 draws nothing, so it is not drawn */
    v_name("mibis"); v_sprite_hidden(v_fmt("mibi.%d.d", i), pic, r[0], r[1]);
    if (dithering) { v_dither_window(v_fmt("mibi.%d.d", i), "", 0, 0, pic, 0, 0, level, r[0], r[1], r[2], r[3]); }
    v_slot(v_fmt("mibi.%d", i), pic, NULL, r[0], r[1] - lift, r[2], r[3], done);
  }
}
/* the band in the bay's top corners: the Probe's plates (whole ones from 1500, the mended turn whole one by one from 2500 with the words after) and who leaves (the mark and the faces, right-aligned) */
static void build_band(int t) {
  int px0 = v_sk(C, ARR ".band.probe.at", 0), py0 = v_sk(C, ARR ".band.probe.at", 1), pitch = v_si(C, ARR ".band.probe.pitch", 20), isz = v_sk(C, ARR ".band.probe.size", 0), from = v_si(C, ARR ".band.probe.from", 1500), mend = v_si(C, ARR ".band.probe.mend.at", 2500), meach = v_si(C, ARR ".band.probe.mend.each", 120), wpx = v_si(C, ARR ".band.probe.words.px", 16), gap = v_si(C, ARR ".band.probe.words.gap", 8);
  int whole = v_pint(ARR ".plates.whole", 0), mended = v_pint(ARR ".plates.mended", 0); const char *icon = v_pstr(ARR ".plates.icon");
  if (t >= from) {
    int shownN = whole; for (int j = 0; j < mended; j++) if (t >= mend + meach * j) shownN = whole + j + 1;
    v_region("arrivalBand", LAYER_ART);
    for (int q = 0; q < whole + mended; q++) { v_name("band.probe"); v_slot(v_fmt("band.plate.%d", q), icon, NULL, px0 + q * pitch, py0, isz, isz, q < shownN); }
    const char *words = v_pstr(ARR ".plates.words");
    if (*words) { int tx = px0 + (whole + mended) * pitch + gap - (pitch - isz); v_region("arrivalBand", LAYER_TYPE); if (t >= mend) v_run("band.words", words, tx, v_cap_in(py0, isz, wpx), wpx, fcol("subject"), V_ALIGN_LEFT); }
  }
  int nf = v_plen(ARR ".leaving.faces"); if (nf > 3) nf = 3;
  if (nf > 0 && t >= v_si(C, ARR ".band.leaving.from", 1500)) {
    int fw = v_sk(C, ARR ".band.leaving.faceSize", 0), mw = v_sk(C, ARR ".band.leaving.markSize", 0), lp = v_si(C, ARR ".band.leaving.pitch", 32), rx = v_si(C, ARR ".band.leaving.rightX", 984), ly = v_si(C, ARR ".band.leaving.y", 64), lg = v_si(C, ARR ".band.leaving.gap", 8);
    int x0 = rx - (mw + lg + lp * nf - (lp - fw));
    v_region("arrivalBand", LAYER_ART); v_name("band.leaving"); v_slot("band.mark", v_pstr(ARR ".leaving.mark"), NULL, x0, ly + v_half(fw - mw), mw, mw, 1);
    for (int i = 0; i < nf; i++) { v_name("band.leaving"); v_slot(v_fmt("band.face.%d", i), v_pstr(v_fmt(ARR ".leaving.faces.%d", i)), NULL, x0 + mw + lg + lp * i, ly, fw, fw, 1); }
  }
}
static void build_arrival(int choice) {
  int t = choice ? 1 << 20 : arrival_time();
  build_dockBay();
  if (!choice) { int r[4]; v_srect(C, ARR ".apron.rect", r); v_region("apron", LAYER_ART); v_name("apron"); v_sprite("apron", v_pstr(ARR ".apron"), r[0], r[1], r[2], r[3]); }
  { int r[4]; v_srect(C, "regions.dockRibbon.rect", r); const char *words = v_pstr(ARR ".ribbon"); int rpx = v_si(C, "regions.dockRibbon.px", 20), rpad = v_si(C, "regions.dockRibbon.pad", 16), rib = v_si(C, ARR ".crates.at", 500);
    int w = ((v_measure(words, rpx) + 2 * rpad) + 7) / 8 * 8; if (w < 160) w = 160; if (w > r[2]) w = r[2]; r[0] = 512 - w / 2; r[2] = w;
    v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, t >= rib ? words : "", rpx, rpad, v_scol(C, "colours.ribbon.fill"), v_scol(C, "colours.ribbon.edge"), v_scol(C, "colours.ribbon.text")); }
  build_light(t);
  build_crates_arrival(t);
  if (!choice) build_mibis(t);
  build_band(t);
  if (choice) build_dockRack();
}

void cargo_words(void) {
  char state[16]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  ground();
  if (strcmp(state, "arrival") == 0) { build_arrival(strcmp(v_pstr(ARR ".phase"), "choice") == 0); return; }
  g_motion = v_pbool("motion", 1); load_steps();
  g_state = strcmp(state, "opening") == 0 ? 1 : strcmp(state, "end") == 0 ? 2 : 0; g_cur = -1; g_lt = 0; g_len = 0; g_base = 0; g_n = v_plen("regions.opening.crates");
  if (g_state == 1) { opening_clock(); if (g_cur >= g_n) { g_cur = g_n - 1; g_lt = g_len; } }
  else if (g_state == 2) g_cur = g_n;
  build_bay();
  build_berths();
  build_hatch();
  build_waiting();
  if (g_state == 1) { build_display(); build_travel(); }
}

/* a key on Cargo: no target, so a key says an intent on "room". The bay: ✓ and ← and the room keys; the pad does nothing. The end: any key (the pad as `pad`) says it, and the host does what the key does and shows the bay again. */
void cargo_key(int code) {
  if ((code == 17 || code == 18 || code == 19 || code == 20) && (strcmp(v_pstr("state"), "end") == 0 || strcmp(v_pstr("state"), "arrival") == 0)) { screens_say("intent", "room", "pad"); return; }
  screens_key_graph(code, "cargo", NULL, NULL, "room", &(screens_keys_t){ 0 });
}
