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

/* ---- the residents' walk: integers only ---- */
#define STEP_MS 40
static unsigned lcg(unsigned *s) { *s = *s * 1664525u + 1013904223u; return *s >> 8; }
/* The box's top left for resident k of size w x h at the face's time `now`: four waypoints from the seed inside the glass, feet in the ground band; it walks the route one pixel an axis a step, pausing at each, and the route
   repeats. A step is every second tick of STEP_MS, the odd residents one tick after the even, so that at most half of the residents change their box in a tick. Motion off: the first waypoint, for ever. */
static void walk(unsigned seed, int k, int w, int h, uint32_t now, int motion, int out[2]) {
  int glass[4], ground[4]; hrect("regions.glass.rect", glass); hrect("regions.resident.walk.ground", ground);
  int minx = glass[0], maxx = glass[0] + glass[2] - w, miny = ground[1] + h + 24, maxy = ground[1] + ground[3] - 4;   /* the feet (the box's bottom) in the ground band */
  unsigned s = seed * 2654435761u + (unsigned)k * 40503u + 1;
  int wx[4], wy[4], pause[4];
  for (int i = 0; i < 4; i++) { wx[i] = minx + (int)(lcg(&s) % (unsigned)(maxx - minx + 1)); wy[i] = miny + (int)(lcg(&s) % (unsigned)(maxy - miny + 1)) - h; pause[i] = 30 + (int)(lcg(&s) % 60); }   /* y: the box's top */
  int len[4], period = 0;
  for (int i = 0; i < 4; i++) { int dx = wx[(i + 1) & 3] - wx[i], dy = wy[(i + 1) & 3] - wy[i]; len[i] = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy); period += len[i] + pause[i]; }
  long steps = motion ? (long)((now / STEP_MS + (uint32_t)(k & 1)) / 2) : 0; int t = (int)(steps % period);
  for (int i = 0; i < 4; i++) {
    int j = (i + 1) & 3;
    if (t < len[i]) { int dx = wx[j] - wx[i], dy = wy[j] - wy[i]; out[0] = wx[i] + (len[i] ? dx * t / len[i] : 0); out[1] = wy[i] + (len[i] ? dy * t / len[i] : 0); return; }
    t -= len[i];
    if (t < pause[i]) { out[0] = wx[j]; out[1] = wy[j]; return; }
    t -= pause[i];
  }
  out[0] = wx[0]; out[1] = wy[0];
}

/* ---- what the last draw put where (the focus reads these boxes) ---- */
typedef struct { char id[24]; char name[40]; char pic[96]; int juvenile, waiting, sleeper, box[4]; unsigned seed; } ent_t;
static ent_t g_e[MAXR + MAXS]; static int g_ne;
static int g_last_tick = -1;

static int ent_load(void) {
  g_ne = 0;
  int motion = v_pbool("motion", 1); uint32_t now = anim_now();
  for (int i = 0, n = v_plen("regions.residents"); i < n && g_ne < MAXR; i++) {
    ent_t *e = &g_e[g_ne]; const char *b = v_fmt("regions.residents.%d", i); char P[64]; snprintf(P, sizeof P, "%s", b);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 0; e->seed = (unsigned)v_pint(v_fmt("%s.seed", P), 0);
    const char *sz = e->juvenile ? "regions.resident.juvenile" : "regions.resident.adult"; e->box[2] = hk(sz, 0); e->box[3] = hk(sz, 1);
    int xy[2]; walk(e->seed, i, e->box[2], e->box[3], now, motion, xy); e->box[0] = xy[0]; e->box[1] = xy[1]; g_ne++;
  }
  int ns = strcmp(v_pstr("regions.bed.state"), "docked") == 0 ? v_plen("regions.bed.sleepers") : 0; if (ns > MAXS) ns = MAXS;
  for (int i = 0; i < ns; i++) {
    ent_t *e = &g_e[g_ne]; char P[64]; snprintf(P, sizeof P, "regions.bed.sleepers.%d", i);
    snprintf(e->id, sizeof e->id, "%s", v_pstr(v_fmt("%s.id", P))); snprintf(e->name, sizeof e->name, "%s", v_pstr(v_fmt("%s.name", P))); snprintf(e->pic, sizeof e->pic, "%s", v_pstr(v_fmt("%s.picture", P)));
    e->juvenile = strcmp(v_pstr(v_fmt("%s.stage", P)), "juvenile") == 0; e->waiting = v_pbool(v_fmt("%s.waiting", P), 0); e->sleeper = 1; e->seed = 0;
    int foot = hk(v_fmt("regions.bed.sleepers.places.%d", ns), i);
    if (e->juvenile) { e->box[0] = foot - hi("regions.bed.sleepers.juvenile.size.0", 104) / 2; e->box[1] = 400; e->box[2] = hk("regions.bed.sleepers.juvenile.size", 0); e->box[3] = hk("regions.bed.sleepers.juvenile.size", 1); }
    else { e->box[0] = foot - hk("regions.bed.sleepers.adult.size", 0) / 2; e->box[1] = 360; e->box[2] = hk("regions.bed.sleepers.adult.size", 0); e->box[3] = hk("regions.bed.sleepers.adult.size", 1); }
    g_ne++;
  }
  return g_ne;
}
static int ent_focused(const ent_t *e, const char *cur) { return strncmp(cur, "resident.", 9) == 0 && strcmp(cur + 9, e->id) == 0; }

/* ---- the glass: residents and the bed in the order of their feet, clipped to the glass ---- */
typedef struct { int kind; int ent; } item_t;   /* kind 0: a resident; 1: the bed group (the bed, then its sleepers right to left, or the Companion mark) */
static void glass_group(const char *cur) {
  int glass[4], bed[4], markRect[4]; hrect("regions.glass.rect", glass); hrect("regions.bed.rect", bed); hrect("regions.bed.markRect", markRect);
  item_t it[MAXR + 1]; int ni = 0;
  for (int i = 0; i < g_ne; i++) if (!g_e[i].sleeper) it[ni++] = (item_t){ 0, i };
  it[ni++] = (item_t){ 1, -1 };
  /* by the feet's y, lower in front (later), left first on a tie; the bed group sorts at the bed's foot */
  int bedFoot = hk("regions.glass.foot", 1);
  for (int a = 1; a < ni; a++) { item_t t = it[a]; int b = a - 1;
    int fa = t.kind ? bedFoot : g_e[t.ent].box[1] + g_e[t.ent].box[3], xa = t.kind ? bed[0] : g_e[t.ent].box[0];
    while (b >= 0) { int fb = it[b].kind ? bedFoot : g_e[it[b].ent].box[1] + g_e[it[b].ent].box[3], xb = it[b].kind ? bed[0] : g_e[it[b].ent].box[0]; if (fb < fa || (fb == fa && xb <= xa)) break; it[b + 1] = it[b]; b--; }
    it[b + 1] = t; }
  /* the nodes inside the clip, counted before they are sent */
  int count = 0, lift = hi("regions.resident.lift", 4);
  int away = strcmp(v_pstr("regions.bed.state"), "away") == 0, bedPic = has(v_pstr("regions.bed.picture")), markPic = away && has(v_pstr("regions.bed.mark"));
  for (int k = 0; k < ni; k++) {
    if (it[k].kind == 0) { const ent_t *e = &g_e[it[k].ent]; count += has(e->pic) + (e->waiting ? 2 : 0); }
    else { count += bedPic + markPic; for (int i = 0; i < g_ne; i++) if (g_e[i].sleeper) count += has(g_e[i].pic) + (g_e[i].waiting ? 2 : 0); }
  }
  if (count == 0) return;
  prim_node(v_id("glass.clip"), FN_CLIP, glass[0], glass[1], glass[2], glass[3], 0, count, 0);
  /* the nodes are named by their place in the order, not by the mibi: when two residents change places in depth the objects stay where they are and take each other's picture and position, so a change of order
     redraws the two boxes and never the whole glass (moving an object in its parent's order invalidates the parent) */
  int n = 0;
  for (int k = 0; k < ni; k++) {
    if (it[k].kind == 0) {
      const ent_t *e = &g_e[it[k].ent]; int y = e->box[1] - (ent_focused(e, cur) ? lift : 0);
      v_name("resident"); v_sprite(v_fmt("g.%d", n++), e->pic, e->box[0], y, e->box[2], e->box[3]);
      if (e->waiting) { v_region("resident", LAYER_CHROME); word_lamp(v_fmt("g.%d", n++), e->box[0] + e->box[2] - 12, y, "waiting"); }
    } else {
      v_name("bed"); v_sprite(v_fmt("g.%d", n++), v_pstr("regions.bed.picture"), bed[0], bed[1], bed[2], bed[3]);
      if (markPic) v_sprite(v_fmt("g.%d", n++), v_pstr("regions.bed.mark"), markRect[0], markRect[1], markRect[2], markRect[3]);
      for (int i = g_ne - 1; i >= 0; i--) if (g_e[i].sleeper) {   /* right to left: the first carried is drawn last, in front */
        const ent_t *e = &g_e[i]; v_name("bed"); v_sprite(v_fmt("g.%d", n++), e->pic, e->box[0], e->box[1], e->box[2], e->box[3]);
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
static void ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "room") == 0 || anim_get(ANIM_REST, "knob", NULL)) return;   /* the ring goes when the rest begins */
  char rc[24]; spec_str("frame", "colours.ring", rc, sizeof rc); int box[4];
  v_region("focus", LAYER_CHROME);
  if (strcmp(cur, "vivarium") == 0) { hrect("regions.bezel.rect", box); word_focusRing("focus", box, "home", "focus.targets.vivarium.ring", rc); return; }
  if (strncmp(cur, "resident.", 9) == 0) { for (int i = 0; i < g_ne; i++) if (ent_focused(&g_e[i], cur)) { memcpy(box, g_e[i].box, sizeof box); word_focusRing("focus", box, "home", "focus.targets.resident.ring", rc); } return; }
  if (strcmp(cur, "knob") == 0) { for (int k = 0; k < 4; k++) box[k] = hk("focus.targets.knob.box", k); box[1] -= hi("focus.targets.knob.lift", 2); word_focusRing("focus", box, "home", v_fmt("focus.targets.%s.ring", cur), rc); return; }
  for (int m = 0; m < 5; m++) if (strcmp(cur, MODULES[m]) == 0) { hrect(v_fmt("regions.%s.rect", cur), box); box[1] -= hi("focus.targets.cargo.lift", 2); word_focusRing("focus", box, "home", v_fmt("focus.targets.%s.ring", cur), rc); return; }
}

/* the rest event: the screen dithers over 180 ms to Idle after the knob has settled (the first 200 ms) */
static void rest_dither(void) {
  static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
  anim_state_t t; if (!anim_get(ANIM_REST, "knob", &t) || t.elapsed < 200) return;
  int level = (16 * (t.elapsed - 200)) / 180, r[4]; if (level > 16) level = 16; if (level <= 0 || !v_spec_rect("frame", "regions.stage.rect", r)) return;
  char ops[400]; int n = snprintf(ops, sizeof ops, "[[\"lattice\",0,0,%d,%d,4,[", r[2], r[3]);
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, sizeof ops - (size_t)n, "],\"void\"]]");
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  v_region("stage", LAYER_ART); prim_node(v_id("stage.rest"), FN_COMPOSED, r[0], r[1], r[2], r[3], 0, 0, 0);
}

void home_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  ent_load();
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
  rest_dither();
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
