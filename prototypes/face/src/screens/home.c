/* Home's binding table (lvgl-switch.md §2.2, L2.2): the words that draw Home from the `home` spec and the props' regions, in draw order, then the focus ring; the frame's words follow (screens.c).
   The living window: the glass, the residents walking (a pure function of their seed and the face's clock, stepped so that no more than half of them change in one step), the with-you bed and its sleepers,
   the name tag of the focused one; the rest knob; the column of five modules with their objects and lamps. Home's focus is `focus.graph` of home.json on the boxes this file drew. */
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

#define H "home"
#define MAXR 12
#define MAXS 3
static int hi(const char *p, int d) { return spec_int(H, p, d); }
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static int has(const char *asset) { return asset && *asset && wire_has_asset(asset); }

#define STEP_MS 40
/* ---- the residents' walk (home.json regions.resident.walk, the UI/UX designer's ruling): integers only ----
   Resident k (props order, sleepers left out) is in group g = k mod 2 and steps at t = 80 m + 40 g ms of the face's time since the screen's first frame, 2 px along the major axis of its path (the minor axis by
   Bresenham), so at most half of the boxes change in a frame of 40 ms or less. Its own 32-bit LCG runs from its seed. A focused resident stands on its pixel and its idle and walk freeze; with motion off it stands
   at its start. The walk state lives while the screen shows and starts again from the seeds when Home is shown again; a new id starts from its own seed, a props change with the same seed keeps the state. */
#define KX 448
#define KY 424
typedef struct { char id[24]; unsigned seed, s; int w, h, x, feet, facing, walking, idle, wx, wy, x0, y0, nstep, step; long done; int live; } wk_t;
static wk_t g_w[MAXR]; static int g_nw; static uint32_t g_t0, g_seen; static int g_have_t0;
static unsigned wr(wk_t *k) { k->s = k->s * 1664525u + 1013904223u; return k->s >> 16; }
static int meets_k(int x, int feet, int w) { return x + w > KX && feet > KY; }
static void draw_point(wk_t *k, int *x, int *feet) { *x = 32 + (int)(wr(k) % (unsigned)(625 - k->w)); *feet = 300 + (int)(wr(k) % 228u); }
static int path_clear(const wk_t *k, int x1, int f1) {   /* every box along the straight path stays out of the keep-out zone */
  int dx = x1 - k->x, dy = f1 - k->feet, M = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy), n = (M + 1) / 2;
  for (int i = 1; i <= n; i++) { int d = 2 * i > M ? M : 2 * i, ax = dx, ay = dy, ma = ax < 0 ? -ax : ax, mb = ay < 0 ? -ay : ay, px, py;
    if (ma >= mb) { px = k->x + (ax < 0 ? -d : d); py = k->feet + (ay < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { py = k->feet + (ay < 0 ? -d : d); px = k->x + (ax < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (meets_k(px, py, k->w)) return 0; }
  return 1;
}
static void wk_init(wk_t *k, const char *id, unsigned seed, int w, int h) {
  memset(k, 0, sizeof *k); snprintf(k->id, sizeof k->id, "%s", id); k->seed = seed; k->s = seed; k->w = w; k->h = h; k->live = 1; k->done = 0;
  int x = 32, feet = 300, ok = 0;
  for (int i = 0; i < 8 && !ok; i++) { draw_point(k, &x, &feet); ok = !meets_k(x, feet, w); }
  if (!ok) x = 32;   /* all eight failed: box.x 32 with the last feet */
  k->x = x; k->feet = feet; k->facing = (int)(wr(k) & 1u); k->idle = 25 + (int)(wr(k) % 38u); k->walking = 0;
}
static void wk_step(wk_t *k) {   /* one step of this resident's own time */
  if (!k->walking) {
    if (k->idle > 0) { k->idle--; }
    if (k->idle > 0) return;
    int wx = k->x, wf = k->feet, ok = 0;   /* idle is over: a waypoint, up to eight tries */
    for (int i = 0; i < 8 && !ok; i++) {
      draw_point(k, &wx, &wf); int dx = wx - k->x, dy = wf - k->feet, M = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy);
      ok = M >= 32 && !meets_k(wx, wf, k->w) && path_clear(k, wx, wf);
    }
    if (!ok) { k->idle = 25 + (int)(wr(k) % 38u); return; }
    int dx = wx - k->x, M = (dx < 0 ? -dx : dx), dy = wf - k->feet, Mb = dy < 0 ? -dy : dy; if (Mb > M) M = Mb;
    if (dx) k->facing = dx > 0;
    k->walking = 1; k->wx = wx; k->wy = wf; k->x0 = k->x; k->y0 = k->feet; k->nstep = (M + 1) / 2; k->step = 0; return;
  }
  k->step++;
  { int dx = k->wx - k->x0, dy = k->wy - k->y0, ma = dx < 0 ? -dx : dx, mb = dy < 0 ? -dy : dy, M = ma > mb ? ma : mb, d = 2 * k->step > M ? M : 2 * k->step;
    if (ma >= mb) { k->x = k->x0 + (dx < 0 ? -d : d); k->feet = k->y0 + (dy < 0 ? -1 : 1) * ((d * mb * 2 + M) / (2 * M)); } else { k->feet = k->y0 + (dy < 0 ? -d : d); k->x = k->x0 + (dx < 0 ? -1 : 1) * ((d * ma * 2 + M) / (2 * M)); }
    if (k->step >= k->nstep) { k->x = k->wx; k->feet = k->wy; k->walking = 0; k->idle = 25 + (int)(wr(k) % 38u); } }
}

/* ---- what the last draw put where (the focus reads these boxes) ---- */
typedef struct { char id[24]; char name[40]; char pic[96]; int juvenile, waiting, sleeper, box[4], draw[4]; unsigned seed; } ent_t;   /* box: the focus target's; draw: where the picture goes */
static ent_t g_e[MAXR + MAXS]; static int g_ne;
static int g_last_tick = -1;

static int ent_focused(const ent_t *e, const char *cur);
static int ent_load(const char *cur) {
  g_ne = 0;
  int motion = v_pbool("motion", 1); uint32_t now = anim_now(), frozen_to = 0; (void)frozen_to;
  if (!g_have_t0 || now - g_seen > 400u) { g_nw = 0; g_t0 = now; g_have_t0 = 1; }   /* Home shown again: the walks start from their seeds */
  g_seen = now;
  int nres = v_plen("regions.residents"); if (nres > MAXR) nres = MAXR;
  uint32_t rel = now - g_t0;
  for (int i = 0; i < nres; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.residents.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 0; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0);
    const char *sz = e->juvenile ? "regions.resident.juvenile" : "regions.resident.adult"; int w = hk(sz, 0), h = hk(sz, 1);
    if (i >= g_nw || strcmp(g_w[i].id, e->id) != 0 || g_w[i].seed != e->seed) { wk_init(&g_w[i], e->id, e->seed, w, h); g_w[i].done = 0; if (i >= g_nw) g_nw = i + 1; }
    wk_t *k = &g_w[i];
    if (motion && rel >= 40u * (unsigned)(i & 1)) {
      long due = (long)((rel - 40u * (unsigned)(i & 1)) / 80u) + 1;
      if (due - k->done > 4000) k->done = due - 4000;   /* a long gap: catch up no further than the route repeats */
      int frozen = ent_focused(e, cur);
      for (; k->done < due; k->done++) if (!frozen) wk_step(k);
    }
    e->box[0] = k->x; e->box[1] = k->feet - h; e->box[2] = w; e->box[3] = h; memcpy(e->draw, e->box, sizeof e->draw); g_ne++;
  }
  int ns = strcmp(v_pstr("regions.bed.state"), "docked") == 0 ? v_plen("regions.bed.sleepers") : 0; if (ns > MAXS) ns = MAXS;
  for (int i = 0; i < ns; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.bed.sleepers.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 1; e->seed = 0;
    int foot = hk(v_fmt("regions.bed.sleepers.places.%d", ns), i), bw = hk("regions.bed.sleepers.ink.max", 0), bh = hk("regions.bed.sleepers.ink.max", 1), footY = hi("regions.bed.sleepers.footY", 512);
    if (e->juvenile) { e->box[0] = foot - hi("regions.bed.sleepers.juvenile.size.0", 104) / 2; e->box[1] = 400; e->box[2] = hk("regions.bed.sleepers.juvenile.size", 0); e->box[3] = hk("regions.bed.sleepers.juvenile.size", 1); }
    else { e->box[0] = foot - hk("regions.bed.sleepers.adult.size", 0) / 2; e->box[1] = 360; e->box[2] = hk("regions.bed.sleepers.adult.size", 0); e->box[3] = hk("regions.bed.sleepers.adult.size", 1); }
    e->draw[0] = foot - bw / 2; e->draw[1] = footY - bh; e->draw[2] = bw; e->draw[3] = bh;   /* the stand-in fitted in the nap pose's ink, centred on the foot, its bottom on the foot's y */
    g_ne++;
  }
  return g_ne;
}
static int ent_focused(const ent_t *e, const char *cur) { return strncmp(cur, "resident.", 9) == 0 && strcmp(cur + 9, e->id) == 0; }

/* ---- the glass: residents and the bed in the order of their feet, clipped to the glass; the focused one last: its feet ring, then it ---- */
static const char *frame_ring(void);
typedef struct { int kind; int ent; } item_t;   /* kind 0: a resident; 1: the bed group (the bed, then its sleepers right to left); 2: the focused resident or sleeper, drawn last under its ring */
static void glass_group(const char *cur) {
  int glass[4], bed[4]; hrect("regions.glass.rect", glass); hrect("regions.bed.rect", bed);
  item_t it[MAXR + 2]; int ni = 0, focused = -1;
  for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) focused = i;
  for (int i = 0; i < g_ne; i++) if (!g_e[i].sleeper && i != focused) it[ni++] = (item_t){ 0, i };
  it[ni++] = (item_t){ 1, -1 };
  /* by the feet's y, lower in front (later), left first on a tie; the bed group sorts at the bed's foot */
  int bedFoot = hk("regions.glass.foot", 1);
  for (int a = 1; a < ni; a++) { item_t t = it[a]; int b = a - 1;
    int fa = t.kind ? bedFoot : g_e[t.ent].box[1] + g_e[t.ent].box[3], xa = t.kind ? bed[0] : g_e[t.ent].box[0];
    while (b >= 0) { int fb = it[b].kind ? bedFoot : g_e[it[b].ent].box[1] + g_e[it[b].ent].box[3], xb = it[b].kind ? bed[0] : g_e[it[b].ent].box[0]; if (fb < fa || (fb == fa && xb <= xa)) break; it[b + 1] = it[b]; b--; }
    it[b + 1] = t; }
  if (focused >= 0) it[ni++] = (item_t){ 2, focused };
  /* the nodes inside the clip, counted before they are sent */
  int count = 0, lift = hi("regions.resident.lift", 4);
  int bedPic = has(v_pstr("regions.bed.picture"));
  for (int k = 0; k < ni; k++) {
    if (it[k].kind != 1) { const ent_t *e = &g_e[it[k].ent]; count += has(e->pic) + (e->waiting ? 2 : 0) + (it[k].kind == 2 ? 1 : 0); }
    else { count += bedPic; for (int i = 0; i < g_ne; i++) if (g_e[i].sleeper && i != focused) count += has(g_e[i].pic) + (g_e[i].waiting ? 2 : 0); }
  }
  if (count == 0) return;
  prim_node(v_id("glass.clip"), FN_CLIP, glass[0], glass[1], glass[2], glass[3], 0, count, 0);
  /* the nodes are named by their place in the order, not by the mibi: when two residents change places in depth the objects stay where they are and take each other's picture and position, so a change of order
     redraws the two boxes and never the whole glass (moving an object in its parent's order invalidates the parent) */
  int n = 0;
  for (int k = 0; k < ni; k++) {
    if (it[k].kind != 1) {
      const ent_t *e = &g_e[it[k].ent]; int y = e->draw[1] - (it[k].kind == 2 && !e->sleeper ? lift : 0);
      if (it[k].kind == 2) { int rb[4]; memcpy(rb, e->box, sizeof rb); v_region("focus", LAYER_CHROME); word_focusRing("focus", rb, "home", "focus.targets.resident.ring", frame_ring()); }
      v_name(e->sleeper ? "bed" : "resident"); v_sprite(v_fmt("g.%d", n++), e->pic, e->draw[0], y, e->draw[2], e->draw[3]);
      if (e->waiting) { v_region(e->sleeper ? "bed" : "resident", LAYER_CHROME); word_lamp(v_fmt("g.%d", n++), e->box[0] + e->box[2] - 12, e->box[1] - (it[k].kind == 2 && !e->sleeper ? lift : 0), "waiting"); }
    } else {
      v_name("bed"); v_sprite(v_fmt("g.%d", n++), v_pstr("regions.bed.picture"), bed[0], bed[1], bed[2], bed[3]);
      for (int i = g_ne - 1; i >= 0; i--) if (g_e[i].sleeper && i != focused) {   /* right to left: the first carried is drawn last, in front */
        const ent_t *e = &g_e[i]; v_name("bed"); v_sprite(v_fmt("g.%d", n++), e->pic, e->draw[0], e->draw[1], e->draw[2], e->draw[3]);
        if (e->waiting) { v_region("bed", LAYER_CHROME); word_lamp(v_fmt("g.%d", n++), e->box[0] + e->box[2] - 12, e->box[1], "waiting"); }
      }
    }
  }
}

/* ---- the modules' objects (each at the spec's rectangle, lifted with the module) ---- */
static void put(const char *id, const char *asset, const char *r, int dy) { int b[4]; hrect(r, b); v_sprite(id, asset, b[0], b[1] + dy, b[2], b[3]); }
static int ease_out(int p) { return 1000 - (1000 - p) * (1000 - p) / 1000; }   /* p, e in 0..1000 */
static void cargo_objects(int dy) {
  const char *state = v_pstr("regions.cargo.state"); int n = v_pint("regions.cargo.crates", 0), max = hi("regions.cargo.max", 3); if (n > max) n = max;
  v_name("cargo");
  int cr[4], bay[4]; hrect("regions.cargo.rect", cr); bay[0] = cr[0] + hk("regions.cargo.bay", 0); bay[1] = cr[1] + hk("regions.cargo.bay", 1) + dy; bay[2] = hk("regions.cargo.bay", 2); bay[3] = hk("regions.cargo.bay", 3);   /* the bay: 800, 56, 176, 72 */
  v_sprite("cargo.bay", v_pstr("regions.cargo.bay"), bay[0], bay[1], bay[2], bay[3]);
  anim_state_t t; int arriving = anim_get(ANIM_ARRIVAL, "cargo", &t), each = hi("events.crateIn.each.ms", 500), stagger = hi("events.crateIn.each.stagger", 250), from = spec_int(H, "events.crateIn.each.from.1", -40);
  int drawn = 0, ys[8], shown[8];
  for (int i = 0; i < n; i++) {
    int r[4]; hrect(v_fmt("regions.cargo.crateRects.%d", i), r); int y = r[1] + dy; shown[i] = 1;
    if (arriving) { int e = t.elapsed - i * stagger; if (e < 0) shown[i] = 0; else { int p = e >= each ? 1000 : e * 1000 / each; y = r[1] + dy + (from * (1000 - ease_out(p)) - (from < 0 ? 500 : -500)) / 1000; if (p == 1000) y = r[1] + dy; } }
    ys[i] = y; if (shown[i] && has(v_pstr("regions.cargo.crate"))) drawn++;
  }
  if (drawn) {
    prim_node(v_id("cargo.clip"), FN_CLIP, bay[0], bay[1], bay[2], bay[3], 0, drawn, 0);
    for (int i = 0; i < n; i++) if (shown[i]) { int r[4]; hrect(v_fmt("regions.cargo.crateRects.%d", i), r); v_sprite(v_fmt("cargo.crate.%d", i), v_pstr("regions.cargo.crate"), r[0], ys[i], r[2], r[3]); }
  }
  if (strcmp(state, "waiting") == 0) put("cargo.waiting", v_pstr("regions.cargo.waiting"), "regions.cargo.waiting.rect", dy);
}
static void pods_objects(int dy) {
  v_name("pods");
  int ws = hk("regions.pods.wells.size", 0), wh = hk("regions.pods.wells.size", 1), pw = hk("regions.pods.pod.size", 0), ph = hk("regions.pods.pod.size", 1), sw = hk("regions.pods.star", 0), sh = hk("regions.pods.star", 1);
  for (int i = 0; i < 6; i++) {
    int r[4]; hrect(v_fmt("regions.pods.wells.rects.%d", i), r); (void)ws; (void)wh;
    v_sprite(v_fmt("pods.well.%d", i), v_pstr("regions.pods.well"), r[0], r[1] + dy, r[2], r[3]);
    const char *pod = v_pstr(v_fmt("regions.pods.wells.%d.pod", i)); if (*pod) v_sprite(v_fmt("pods.pod.%d", i), pod, r[0] + hk("regions.pods.pod.at", 0), r[1] + hk("regions.pods.pod.at", 1) + dy, pw, ph);
    const char *glint = v_pstr(v_fmt("regions.pods.wells.%d.glint", i)); if (*glint) v_sprite(v_fmt("pods.glint.%d", i), glint, r[0] + hk("regions.pods.starAt", 0), r[1] + hk("regions.pods.starAt", 1) + dy, sw, sh);
  }
}
static void incubator_objects(int dy) {
  v_name("incubator");
  put("incubator.chamber", v_pstr("regions.incubator.chamber"), "regions.incubator.chamberRect", dy);
  word_leaves("regions.incubator.leaves", v_pstr("regions.incubator.leaves.emptyPicture"), v_pstr("regions.incubator.leaves.fullPicture"), v_pint("regions.incubator.leaves.total", 0), v_pint("regions.incubator.leaves.full", 0), dy);
}
static void probe_objects(int dy) {
  v_name("probe");
  put("probe.cradle", v_pstr("regions.probe.cradle"), "regions.probe.cradleRect", dy);
  int n = v_pint("regions.probe.shields.count", 0), whole = v_pint("regions.probe.shields.whole", 0);
  for (int i = 0; i < n && i < 4; i++) { int r[4]; hrect(v_fmt("regions.probe.shields.rects.%d", i), r); v_sprite(v_fmt("probe.shield.%d", i), v_pstr(i < whole ? "regions.probe.shields.wholePicture" : "regions.probe.shields.gonePicture"), r[0], r[1] + dy, r[2], r[3]); }
  const char *frame = v_pstr("regions.probe.frame"); if (*frame) put("probe.frame", frame, "regions.probe.slotRect", dy);
}
static void library_objects(int dy) { v_name("library"); put("library.journal", v_pstr("regions.library.journal"), "regions.library.journalRect", dy); }

static const char *MODULES[5] = { "cargo", "pods", "incubator", "probe", "library" };
static void module_objects(const char *key, int dy) {
  if (strcmp(key, "cargo") == 0) cargo_objects(dy); else if (strcmp(key, "pods") == 0) pods_objects(dy); else if (strcmp(key, "incubator") == 0) incubator_objects(dy);
  else if (strcmp(key, "probe") == 0) probe_objects(dy); else library_objects(dy);
}

/* ---- the ring on the focused target ---- */
static const char *frame_ring(void) { static char rc[24]; spec_str("frame", "colours.ring", rc, sizeof rc); return rc; }
static void ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "room") == 0 || anim_holding()) return;   /* the ring goes when the rest begins and stays away while it holds */
  char rc[24]; spec_str("frame", "colours.ring", rc, sizeof rc); int box[4];
  v_region("focus", LAYER_CHROME);
  if (strcmp(cur, "vivarium") == 0) { hrect("regions.bezel.rect", box); word_focusRing("focus", box, "home", "focus.targets.vivarium.ring", rc); return; }
  if (strncmp(cur, "resident.", 9) == 0) return;   /* a resident's ring is in the glass, under it */
  if (strcmp(cur, "knob") == 0) { for (int k = 0; k < 4; k++) box[k] = hk("focus.targets.knob.box", k); box[1] -= hi("focus.targets.knob.lift", 2); word_focusRing("focus", box, "home", v_fmt("focus.targets.%s.ring", cur), rc); return; }
  for (int m = 0; m < 5; m++) if (strcmp(cur, MODULES[m]) == 0) { hrect(v_fmt("regions.%s.rect", cur), box); box[1] -= hi("focus.targets.cargo.lift", 2); word_focusRing("focus", box, "home", v_fmt("focus.targets.%s.ring", cur), rc); return; }
}

void home_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  ent_load(cur);
  { int st[4]; char ground[24]; spec_str("frame", "colours.stageGround", ground, sizeof ground);   /* the stage's ground under the bezel and the column, the frame's (as every screen's stage) */
    if (v_spec_rect("frame", "regions.stage.rect", st)) { v_region("stage", LAYER_CHROME); v_rect("stage.ground", st[0], st[1], st[2], st[3], ground); } }
  word_livingWindow("home", "bezel", "glass", v_pstr("regions.glass.picture"));
  glass_group(cur);
  for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) { int tag[4]; word_nameTag(g_e[i].name, g_e[i].box, g_e[i].sleeper ? 0 : hi("regions.resident.lift", 4), tag); }
  word_restKnob(strcmp(cur, "knob") == 0);
  for (int m = 0; m < 5; m++) {
    int dy = strcmp(cur, MODULES[m]) == 0 ? -hi("focus.targets.cargo.lift", 2) : 0;
    word_module(MODULES[m], dy, v_pstr(v_fmt("regions.%s.lamp", MODULES[m])));
    module_objects(MODULES[m], dy);
  }
  ring(cur);
}

/* the targets as the words drew them, in the props' order, with the graph's key */
int home_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph");
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1);
    int r[4] = { 0, 0, 0, 0 };
    if (strcmp(t->id, "vivarium") == 0) hrect("regions.bezel.rect", r);
    else if (strcmp(t->id, "knob") == 0) for (int k = 0; k < 4; k++) r[k] = hk("focus.targets.knob.box", k);
    else if (strncmp(t->id, "resident.", 9) == 0) { for (int e = 0; e < g_ne; e++) if (strcmp(g_e[e].id, t->id + 9) == 0) memcpy(r, g_e[e].box, sizeof r); }
    else hrect(v_fmt("regions.%s.rect", t->id), r);
    t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3];
  }
  return n;
}

/* a key on Home: ✓ and the room keys say an intent on the focused target (the room when the ring is on nothing); ← does nothing (Home is the top); the pad moves the ring by home.json focus.graph */
void home_key(int code) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); if (!cur[0]) snprintf(cur, sizeof cur, "room");
  const char *verb = code == 10 ? "confirm" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[40]; char gkey[24]; int n = home_focus(t, 40, gkey, sizeof gkey);
  int glen; const char *graph = spec_raw(H, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  int roomAt[4]; hrect("focus.roomAt", roomAt);
  char to[48]; int step = focus_move(g, t, n, cur, dir, NULL, 0, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}

/* a step of the residents' walk is due (the redraw every STEP_MS while any resident walks) */
int home_tick(uint32_t now) {
  if (strcmp(v_pstr("screen"), "home") != 0 || !spec_has(H) || !v_pbool("motion", 1) || v_plen("regions.residents") <= 0) return 0;
  int t = (int)(now / STEP_MS); if (t == g_last_tick) return 0; g_last_tick = t; return 1;
}
