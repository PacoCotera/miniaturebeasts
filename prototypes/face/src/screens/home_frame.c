/* Home's binding table (lvgl-switch.md §2.2): the words that draw Home from the `home` spec and the props' regions, in draw order, then the focus ring; the frame's plate follows (screens.c). Home has no bottom line and the top bar's counters
   and Companion mark are not on it: the bar is the shared picture with Home's own words (the title, the place name, the date and the clock) and the line, centred in the bar, takes over the bottom line's job. Under the bar stand two windows (the
   Vivarium and the Library, each in a bezel with its header and the expand mark) and the console of four stations (Pods, Incubator, Companion and Bay). The panels, edges, bevels and ticks are the face's own rect primitives, palette-exact;
   the windows and the stations' pictures are placeholders until their pictures land. Home's focus is `focus.graph` of home.json on the six boxes this file drew. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define H "home"
static const char *STATIONS[4] = { "pods", "incubator", "companion", "bay" };
static const char *TARGETS[6] = { "vivarium", "library", "pods", "incubator", "companion", "bay" };

/* ---- the top bar and the line ---- */
static void bar_words(void) {
  int r[4]; v_srect(H, "regions.bar.rect", r);
  char slice[96]; spec_str(H, "regions.bar.slice", slice, sizeof slice); int bar = slice[0] && wire_asset_slot(slice) >= 0;   /* the bar is on the face: its picture carries the panel and its rule; the code panel and rule stay as the same nodes of no size */
  if (bar) { v_region("bar", LAYER_PAINTED); v_sprite("bar.picture", slice, r[0], r[1], r[2], r[3]); }
  v_region("bar", LAYER_CHROME);
  kit_panel("bar", r[0], r[1], r[2], r[3], v_scol("frame", "colours.chrome"), NULL, bar);
  kit_hairline("bar.rule", r[0], r[1] + r[3] - 1, bar ? 0 : r[2], v_scol("frame", "colours.rule"), 0, NULL);
  v_region("bar", LAYER_TYPE);
  char title[40], place[V_STR], date[40], clock[16];
  spec_str(H, "strings.titles.bar", title, sizeof title);
  snprintf(place, sizeof place, "%s", v_pstr("regions.bar.place")); snprintf(date, sizeof date, "%s", v_pstr("regions.bar.date")); snprintf(clock, sizeof clock, "%s", v_pstr("regions.bar.clock"));
  int tx = v_si(H, "regions.bar.title.x", 16), tpx = v_si(H, "regions.bar.title.px", 20), ty = 10;   /* the title's cap top, the top bar's own: zone 8 + 2 (frame.json regions.title.text) */
  int tw = v_line_at("bar.title", title, tx, ty, V_ANCHOR_CAP, tpx, v_scol(H, "regions.bar.title.colour"), V_ALIGN_LEFT);
  int ppx = v_si(H, "regions.bar.place.px", 16), by = 12;   /* a 16 px figure's cap top in the bar: zone 8 + 4 (the counters', the turn's) */
  if (place[0]) v_line_at("bar.place", place, tx + tw + v_si(H, "regions.bar.place.gap", 12), by, V_ANCHOR_CAP, ppx, v_scol(H, "regions.bar.place.colour"), V_ALIGN_LEFT);
  int cpx = v_si(H, "regions.bar.clock.px", 20), right = v_si(H, "regions.bar.clock.right", 1008), cw = v_measure(clock, cpx), cx = right - cw;
  if (clock[0]) v_line_at("bar.clock", clock, cx, ty, V_ANCHOR_CAP, cpx, v_scol(H, "regions.bar.clock.colour"), V_ALIGN_LEFT);
  int dpx = v_si(H, "regions.bar.date.px", 16);
  if (date[0]) v_line_at("bar.date", date, cx - v_si(H, "regions.bar.dateGap", 12) - v_measure(date, dpx), by, V_ANCHOR_CAP, dpx, v_scol(H, "regions.bar.date.colour"), V_ALIGN_LEFT);
}

/* the line, in its zone of the bar (home.json regions.line), centred and never wrapping:
   needs   at most two, joined by " · " in the need colour, with the amber lamp before them; the first carries the ✓ cap
   verb    what ✓ does on the focused target, with its cap, and its subject, if it has one, in mist after " · "; only the subject may end in an ellipsis, at the zone's edge
   note    one sentence in mist with no cap (✓ does nothing there)
   goal    the goal in mist (its icons, or its nameless sibling when the words and icons pass the zone), no lamp, no cap */
static void line_words(void) {
  int z[4]; v_srect(H, "regions.line.rect", z); int px = v_si(H, "regions.line.px", 16), lamp = v_sk(H, "regions.line.lamp", 0), lampGap = v_si(H, "regions.line.lampGap", 4), cap = v_sk(H, "regions.line.cap", 0), capGap = v_si(H, "regions.line.capGap", 4), centre = v_si(H, "regions.line.centre", z[0] + z[2] / 2);
  char sep[16]; spec_str(H, "regions.line.sep", sep, sizeof sep);
  int ty = z[1] + 4;   /* a 16 px run's cap top in the bar: zone 8 + 4 */
  char s0[V_STR] = "", s1[V_STR] = "", full[V_STR * 2 + 16] = "", capPic[96];
  spec_str("frame", "regions.marks.capConfirm", capPic, sizeof capPic);
  int nn = v_plen("regions.line.needs");
  char verb[V_STR], subject[V_STR], note[V_STR], goal[V_STR];
  snprintf(verb, sizeof verb, "%s", v_pstr("regions.line.verb")); snprintf(subject, sizeof subject, "%s", v_pstr("regions.line.subject")); snprintf(note, sizeof note, "%s", v_pstr("regions.line.note")); snprintf(goal, sizeof goal, "%s", v_pstr("regions.line.goal.text"));
  if (nn > 0) {
    snprintf(s0, sizeof s0, "%s", v_pstr("regions.line.needs.0")); if (nn > 1) snprintf(s1, sizeof s1, "%s", v_pstr("regions.line.needs.1"));
    snprintf(full, sizeof full, "%s%s%s", s0, nn > 1 ? sep : "", nn > 1 ? s1 : "");
    int W = lamp + lampGap + cap + capGap + v_run_width(full, px), x0 = centre - (W + 1) / 2;
    v_region("line", LAYER_ART);
    if (!v_sprite("line.lamp", home_lamp_pic("needsYou"), x0, z[1] + (z[3] - 12 + 1) / 2, lamp, lamp)) v_error("word: the amber lamp is not on the face");
    v_sprite("line.cap", capPic, x0 + lamp + lampGap, z[1] + 4, cap, cap);
    v_region("line", LAYER_TYPE);
    { int tx = x0 + lamp + lampGap + cap + capGap; char who[V_STR]; snprintf(who, sizeof who, "%s", v_pstr("regions.line.name")); const char *at = who[0] ? strstr(full, who) : NULL;
      if (at) {   /* a name in the notice (a portrait's) is in the verb colour, the rest in the need colour */
        char pre[V_STR * 2], suf[V_STR * 2]; snprintf(pre, sizeof pre, "%.*s", (int)(at - full), full); snprintf(suf, sizeof suf, "%s", at + strlen(who));
        v_run_t a = v_run("line.needs.a", pre, tx, ty, px, v_scol("frame", "colours.need"), V_ALIGN_LEFT); v_run_t b = v_run("line.needs.b", who, a.end, ty, px, v_scol("frame", "colours.verb"), V_ALIGN_LEFT); v_run("line.needs.c", suf, b.end, ty, px, v_scol("frame", "colours.need"), V_ALIGN_LEFT);
      } else v_run("line.needs", full, tx, ty, px, v_scol("frame", "colours.need"), V_ALIGN_LEFT); }
    return;
  }
  if (verb[0]) {
    int room = z[2] - cap - capGap - v_run_width(verb, px), sepW = v_run_width(sep, px); char clipped[V_STR] = "";
    int hasSub = subject[0] && room > sepW; if (hasSub) v_clip(subject, room - sepW, px, clipped, sizeof clipped);
    int W = cap + capGap + v_run_width(verb, px) + (hasSub ? sepW + v_run_width(clipped, px) : 0), x0 = centre - (W + 1) / 2;
    v_region("line", LAYER_ART); v_sprite("line.cap", capPic, x0, z[1] + 4, cap, cap);
    v_region("line", LAYER_TYPE);
    v_run_t run = v_run("line.verb", verb, x0 + cap + capGap, ty, px, v_scol("frame", "colours.verb"), V_ALIGN_LEFT);
    if (hasSub) { run = v_run("line.sep", sep, run.end, ty, px, v_scol("frame", "colours.subject"), V_ALIGN_LEFT); v_run("line.subject", clipped, run.end, ty, px, v_scol("frame", "colours.subject"), V_ALIGN_LEFT); }
    return;
  }
  v_region("line", LAYER_TYPE);
  if (note[0]) { v_run("line.note", note, centre, ty, px, v_scol("frame", "colours.subject"), V_ALIGN_CENTRE); return; }
  if (goal[0]) {
    char icons[24] = "", plain[V_STR] = ""; snprintf(icons, sizeof icons, "%s", v_pstr("regions.line.goal.icons")); snprintf(plain, sizeof plain, "%s", v_pstr("regions.line.goal.plain"));
    int ni = 0; for (const char *q = icons; *q; q++) if ((unsigned char)*q == 0xe2) ni++;   /* each icon is one three-byte sequence beginning 0xe2 */
    const char *use = (v_run_width(goal, px) + 20 * ni > z[2] && plain[0]) ? plain : goal;
    snprintf(full, sizeof full, "%s%s%s", use, ni ? " " : "", ni ? icons : "");
    v_run("line.goal", full, centre, ty, px, v_scol("frame", "colours.subject"), V_ALIGN_CENTRE);
  }
}

/* ---- the windows ---- */
/* the expand mark: four corner ticks of `tick` px in a `size` px square, one composed picture */
static void expand_mark(const char *id, int x, int y, int size, int tick, const char *colour) {
  char ops[640]; int n = snprintf(ops, sizeof ops, "["), e = size - 1;
  for (int k = 0; k < 4; k++) {
    int right = k & 1, low = k >> 1, cx = right ? e : 0, cy = low ? e : 0, hx = right ? size - tick : 0, vy = low ? size - tick : 0;
    n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"],[\"v\",%d,%d,%d,\"%s\"]", k ? "," : "", hx, cy, tick, colour, cx, vy, tick, colour);
  }
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_composed(id, x, y, size, size, ops);
}

/* ---- the Library's window: the specimen (build spec 4.2) ----
   The picture is the generator's painted RGB, one of four brightness levels the logic process made; the window's 2 px inner shade lies along its top and left; a glint on each bead of a look found since the Library was last opened full screen
   (at most 8) fades in and out on the 16-level stage dither over `glint.ms`; the picture breathes by a whole-picture swap every `breath.ms` through `breath.cycle`. Under reduced motion there is neither: level 1 and the glints solid.
   The swap is 124,528 px, so the residents do not step on the frame it lands on (walk_clock asks library_swap_pending). The clock is the face's own, from the frame Home's Library module was first drawn in. */
static uint32_t g_lib_t0; static int g_lib_have, g_lib_level = -1, g_lib_glint = -1;
void library_reset(void) { g_lib_have = 0; g_lib_level = -1; g_lib_glint = -1; }
static int lib_motion(void) { return v_pbool("motion", 1); }
static int lib_breath_level(uint32_t now) {   /* the level (0 to 3) the cycle has reached */
  int n = spec_len(H, "regions.library.specimen.breath.cycle"), ms = v_si(H, "regions.library.specimen.breath.ms", 2000);
  if (!lib_motion() || n <= 0 || ms <= 0) return 0;
  return v_sk(H, "regions.library.specimen.breath.cycle", (int)(((now - g_lib_t0) / (uint32_t)ms) % (uint32_t)n));
}
static int lib_glint_level(uint32_t now) {   /* the dither level (0 to 16): in over the first half of the period, out over the second */
  int ms = v_si(H, "regions.library.specimen.glint.ms", 2000), top = v_si(H, "regions.library.specimen.glint.levels", 16);
  if (!lib_motion() || ms <= 1) return top;
  int ph = (int)((now - g_lib_t0) % (uint32_t)ms), half = ms / 2, up = ph < half ? ph : ms - ph; return top * up / half;
}
static int lib_on_home(void) { return strcmp(v_pstr("screen"), "home") == 0 && !v_pbool("idle", 0) && spec_has(H); }   /* Idle is a screen of "home" props too: the Library has no part in it */
int library_swap_pending(uint32_t now) { return lib_on_home() && lib_motion() && g_lib_have && g_lib_level >= 0 && lib_breath_level(now) != g_lib_level; }
int library_tick(uint32_t now) {   /* a swap or a glint step is due that the last draw did not show */
  if (!lib_on_home() || !lib_motion() || !g_lib_have) return 0;
  if (lib_breath_level(now) != g_lib_level) return 1;
  return v_plen("regions.library.glints") > 0 && lib_glint_level(now) != g_lib_glint;
}
static int lib_painted(void) { const char *pic = v_pstr("regions.library.picture"); return pic && *pic && wire_asset_slot(pic) >= 0; }
static void library_window(void) {
  int g[4]; v_srect(H, "regions.library.window", g);
  int painted = lib_painted(); uint32_t now = anim_now();
  if (!g_lib_have) { g_lib_have = 1; g_lib_t0 = now; }
  int lvl = lib_breath_level(now); g_lib_level = lvl;
  char pic[96]; snprintf(pic, sizeof pic, "%s", v_pstr(v_fmt("regions.library.levels.%d", lvl))); if (!pic[0] || wire_asset_slot(pic) < 0) snprintf(pic, sizeof pic, "%s", v_pstr("regions.library.picture"));
  v_region("library.window", LAYER_PAINTED);
  if (painted) { v_name("library.window"); v_sprite("library.picture", pic, g[0], g[1], g[2], g[3]); }
  { char shade[24]; spec_str(H, "regions.library.specimen.shade.colour", shade, sizeof shade); int sp2 = v_si(H, "regions.library.specimen.shade.px", 2);
    v_region("library.window", LAYER_CHROME);
    v_rect("library.shade.t", g[0], g[1], painted ? g[2] : 0, painted ? sp2 : 0, shade); v_rect("library.shade.l", g[0], g[1], painted ? sp2 : 0, painted ? g[3] : 0, shade); }   /* omitted on the placeholder: nodes of no size */
  v_region("library.window", LAYER_ART);
  const char *star = v_pstr("regions.library.star"); int ng = v_plen("regions.library.glints"), mx = v_si(H, "regions.library.specimen.glint.max", 8), gw = v_sk(H, "regions.library.specimen.glint.size", 0), gh = v_sk(H, "regions.library.specimen.glint.size", 1);
  int gl = lib_glint_level(now); g_lib_glint = gl; if (ng > mx) ng = mx;
  if (painted && star && *star) for (int i = 0; i < ng; i++) {
    int x = v_pint(v_fmt("regions.library.glints.%d.0", i), 0), y = v_pint(v_fmt("regions.library.glints.%d.1", i), 0);
    v_dither_window(v_fmt("library.glint.%d", i), NULL, 0, 0, star, 0, 0, gl, g[0] + x - gw / 2, g[1] + y - gh / 2, gw, gh);   /* centred on the bead; level 0 draws nothing, level 16 the whole star */
  }
}
static void library_captions(void) {
  if (!lib_painted()) return;
  v_region("library.window", LAYER_TYPE);
  const char *nw = v_pstr("regions.library.new"), *gn = v_pstr("regions.library.genome");
  if (nw && *nw) v_line_at("library.new", nw, v_sk(H, "regions.library.specimen.captions.new.at", 0), v_sk(H, "regions.library.specimen.captions.new.at", 1), V_ANCHOR_LINE, v_si(H, "regions.library.specimen.captions.new.px", 16), v_scol(H, "regions.library.specimen.captions.new.colour"), V_ALIGN_LEFT);   /* hidden at 0 */
  if (gn && *gn) v_line_at("library.genome", gn, v_si(H, "regions.library.specimen.captions.genome.right", 988), v_si(H, "regions.library.specimen.captions.genome.y", 412), V_ANCHOR_LINE, v_si(H, "regions.library.specimen.captions.genome.px", 16), v_scol(H, "regions.library.specimen.captions.genome.colour"), V_ALIGN_RIGHT);
}
static void bezel_words(const char *key) {
  int r[4], win[4]; v_srect(H, v_fmt("regions.%s.rect", key), r); v_srect(H, v_fmt("regions.%s.window", key), win);
  int rad = v_si(H, "regions.bezel.radius", 10);
  v_region(key, LAYER_CHROME);
  kit_bezel(key, r[0], r[1], r[2], r[3], rad, v_scol(H, "regions.bezel.fill"), v_scol(H, "regions.bezel.edge"), v_scol(H, "regions.bezel.bevel"), NULL);   /* with the bevel line on top: the first row inside the edge, between the corners */
  { char f[24], e[24]; spec_str(H, v_fmt("regions.%s.placeholder.fill", key), f, sizeof f); spec_str(H, v_fmt("regions.%s.placeholder.edge", key), e, sizeof e);
    int gone = (strcmp(key, "vivarium") == 0 && home_window_painted()) || (strcmp(key, "library") == 0 && lib_painted());   /* a window is its picture once that is on the face: the placeholder stays as a node of no size */
    kit_panel(v_fmt("%s.window", key), win[0], win[1], win[2], win[3], f, e, gone); }   /* the window: a placeholder until its picture lands */
  if (strcmp(key, "vivarium") == 0) home_window();
  if (strcmp(key, "library") == 0) library_window();
  v_region(key, LAYER_CHROME);
  expand_mark(v_fmt("%s.expand", key), r[0] + r[2] - v_sk(H, "regions.bezel.expand.at", 0), r[1] + v_sk(H, "regions.bezel.expand.at", 1), v_si(H, "regions.bezel.expand.size", 14), v_si(H, "regions.bezel.expand.tick", 4), v_scol(H, "regions.bezel.expandColour"));
  v_region(key, LAYER_TYPE);
  char title[40], readout[V_STR]; spec_str(H, v_fmt("strings.titles.%s", key), title, sizeof title); snprintf(readout, sizeof readout, "%s", v_pstr(v_fmt("regions.%s.readout", key)));
  int x = r[0] + v_sk(H, "regions.bezel.title", 0), y = r[1] + v_sk(H, "regions.bezel.title", 1);
  int tw = v_line_at(v_fmt("%s.title", key), title, x, y, V_ANCHOR_LINE, v_si(H, "regions.bezel.titlePx", 16), v_scol(H, "regions.bezel.titleColour"), V_ALIGN_LEFT);
  if (readout[0]) v_line_at(v_fmt("%s.readout", key), readout, x + tw + v_si(H, "regions.bezel.readoutGap", 8), y, V_ANCHOR_LINE, v_si(H, "regions.bezel.readoutPx", 16), v_scol(H, "regions.bezel.readoutColour"), V_ALIGN_LEFT);
  if (strcmp(key, "library") == 0) library_captions();
}

/* ---- the console and its stations ---- */
static void station_words(const char *key) {
  int r[4]; v_srect(H, v_fmt("regions.%s.rect", key), r);
  int rad = v_si(H, "regions.station.radius", 8), inset = v_si(H, "regions.station.pictureInset", 8), gap = v_si(H, "regions.station.columnGap", 8), x1 = v_sk(H, "regions.station.line1", 0), left = 0, lineRight = r[2] - x1;
  v_region(key, LAYER_CHROME);
  kit_bezel(key, r[0], r[1], r[2], r[3], rad, v_scol(H, "regions.station.fill"), v_scol(H, "regions.station.edge"), v_scol(H, "regions.station.bevel"), NULL);   /* with the bevel line on top */
  /* the picture: right-aligned `inset` in, vertically centred (the Bay's berths stand in line 1's row); the text column runs from x 12 to `gap` short of its left edge. The pictures are the host's: a picture the face has not been sent is nothing drawn. */
  int px0 = 0, py0 = 0;   /* the picture's top left, on the screen */
  if (strcmp(key, "bay") == 0) {
    int bw = v_sk(H, "regions.bay.picture.berth", 0), bh = v_sk(H, "regions.bay.picture.berth", 1), pw = v_sk(H, "regions.bay.picture.portrait", 0), bg = v_si(H, "regions.bay.picture.gap", 2), n = v_pint("regions.bay.berths", v_si(H, "regions.bay.picture.berths", 3)), nmax = v_si(H, "regions.bay.picture.withPortrait", 4), crates = v_pint("regions.bay.crates", 0);
    int total = (n > 3 ? 3 * bw + pw : n * bw) + (n - 1) * bg, x0 = r[0] + r[2] - inset - total, y0 = r[1] + v_si(H, "regions.bay.picture.top", 32); left = x0 - r[0]; px0 = x0; py0 = y0;
    v_region(v_fmt("%s.picture", key), LAYER_ART);
    const char *shut = v_pstr("regions.bay.pictures.shut"), *crate = v_pstr("regions.bay.pictures.crate"), *portrait = v_pstr("regions.bay.pictures.portrait"); int x = x0;
    for (int i = 0; i < nmax; i++) {   /* the crates first, then the shut berths, the portrait berth last; the portrait berth is the same node of no size while no portrait crate is in */
      int w = i < 3 ? bw : pw; const char *a = i < crates ? crate : i < 3 ? shut : portrait;
      v_slot_at(v_fmt("%s.berth.%d", key, i), a, portrait, x, y0, w, bh, i < n, 0, 0); if (i < n) x += w + bg;
    }
  } else if (strcmp(key, "pods") == 0) {
    int sw = v_sk(H, "regions.pods.slots.size", 0), sh = v_sk(H, "regions.pods.slots.size", 1), sg = v_si(H, "regions.pods.slots.gap", 2), cols = v_si(H, "regions.pods.slots.cols", 3), rows = v_si(H, "regions.pods.slots.rows", 2), pw = v_sk(H, "regions.pods.picture", 0), ph = v_sk(H, "regions.pods.picture", 1);
    int x0 = r[0] + r[2] - inset - pw, y0 = r[1] + (r[3] - ph) / 2; left = x0 - r[0]; px0 = x0; py0 = y0;
    int gw = v_sk(H, "regions.pods.glint.size", 0), gh = v_sk(H, "regions.pods.glint.size", 1);
    for (int i = 0; i < cols * rows; i++) { int sx = x0 + (i % cols) * (sw + sg), sy = y0 + (i / cols) * (sh + sg); const char *pod = v_pstr(v_fmt("regions.pods.wells.%d.pod", i));   /* the slot holds its rack pod or, empty, a hairline outline */
      if (*pod) { v_region(v_fmt("%s.picture", key), LAYER_ART); v_sprite(v_fmt("%s.slot.%d", key, i), pod, sx, sy, sw, sh); }
      else { v_region(key, LAYER_CHROME); kit_windowFrame(v_fmt("%s.slot.%d", key, i), sx, sy, sw, sh, v_si(H, "regions.station.slot.radius", 6), NULL, v_scol(H, "regions.station.slot.edge"));   /* the empty slot of the case: a 24 x 32 outline of radius 6 in `hairline`, no fill */ } }
    v_region(v_fmt("%s.picture", key), LAYER_ART);
    for (int i = 0; i < cols * rows; i++) { const char *g = v_pstr(v_fmt("regions.pods.wells.%d.glint", i)); if (*g) v_sprite(v_fmt("%s.glint.%d", key, i), g, x0 + (i % cols) * (sw + sg) + v_sk(H, "regions.pods.glint.at", 0), y0 + (i / cols) * (sh + sg) + v_sk(H, "regions.pods.glint.at", 1), gw, gh); }
  } else if (strcmp(key, "incubator") == 0) {
    int cw = v_sk(H, "regions.incubator.capsule.size", 0), ch = v_sk(H, "regions.incubator.capsule.size", 1), x0 = r[0] + r[2] - inset - cw, y0 = r[1] + (r[3] - ch) / 2; left = x0 - r[0]; px0 = x0; py0 = y0;
    const char *st = v_pstr("regions.incubator.state"); int growing = strcmp(st, "growing") == 0, ready = strcmp(st, "ready") == 0;
    v_region(v_fmt("%s.picture", key), LAYER_PAINTED);   /* the studio's capsule masters and the relit pod are painted art */
    { const char *a = v_pstr("regions.incubator.capsule.interior"); if (*a) v_sprite("incubator.interior", a, x0, y0, cw, ch); }
    { const char *pod = v_pstr("regions.incubator.capsule.pod"); int w = v_pint("regions.incubator.capsule.podSize.0", 0), h = v_pint("regions.incubator.capsule.podSize.1", 0), ax = v_pint("regions.incubator.capsule.podAnchor.0", 0), ay = v_pint("regions.incubator.capsule.podAnchor.1", 0);
      if (*pod && w > 0 && (growing || ready)) v_sprite("incubator.pod", pod, x0 + v_sk(H, "regions.incubator.capsule.foot", 0) - ax, y0 + v_sk(H, "regions.incubator.capsule.foot", 1) - ay, w, h); }
    { const char *a = v_pstr("regions.incubator.capsule.glass"); if (*a && growing) v_sprite("incubator.glass", a, x0, y0, cw, ch); }
    { const char *a = v_pstr("regions.incubator.capsule.shell"); if (*a) v_sprite("incubator.shell", a, x0, y0, cw, ch); }
    { const char *a = v_pstr("regions.incubator.capsule.door"); if (*a && !growing) v_sprite("incubator.door", a, x0, y0, cw, ch); }
    { const char *a = v_pstr("regions.incubator.capsule.bar"); int px = v_pint("regions.incubator.capsule.barPx", 0), bx = v_sk(H, "regions.incubator.capsule.bar.rect", 0), by = v_sk(H, "regions.incubator.capsule.bar.rect", 1), bh = v_sk(H, "regions.incubator.capsule.bar.rect", 3);
      if (*a && (growing || ready) && px > 0) v_sprite_window("incubator.bar", a, bx, by, x0 + bx, y0 + by, px, bh); }   /* the lit bar's window, from its left, `barPx` wide */
  } else {   /* the Companion */
    int pw = v_sk(H, v_fmt("regions.%s.picture", key), 0), ph = v_sk(H, v_fmt("regions.%s.picture", key), 1), x0 = r[0] + r[2] - inset - pw, y0 = r[1] + (r[3] - ph) / 2; left = x0 - r[0]; px0 = x0; py0 = y0;
    v_region(v_fmt("%s.picture", key), LAYER_ART); const char *a = v_pstr(v_fmt("regions.%s.picture", key)); if (*a) v_sprite(v_fmt("%s.picture", key), a, x0, y0, pw, ph);
    int n = v_pint("regions.companion.plates.count", 0), whole = v_pint("regions.companion.plates.whole", 0), tw = v_sk(H, "regions.companion.plates.size", 0), th = v_sk(H, "regions.companion.plates.size", 1);   /* docked: the Probe's plates as line 2 */
    v_region("companion.plates", LAYER_ART);
    for (int i = 0; i < n && i < v_si(H, "regions.companion.plates.max", 4); i++) v_sprite(v_fmt("%s.plate.%d", key, i), v_pstr(i < whole ? "regions.companion.plates.wholePicture" : "regions.companion.plates.lostPicture"), r[0] + v_sk(H, "regions.companion.plates.at", 0) + i * (tw + v_si(H, "regions.companion.plates.gap", 4)), r[1] + v_sk(H, "regions.companion.plates.at", 1), tw, th);
  }
  (void)px0; (void)py0;
  int col = left - gap - x1;
  v_region(key, LAYER_ART);
  if (!v_sprite(v_fmt("%s.lamp", key), home_lamp_pic(strcmp(v_pstr(v_fmt("regions.%s.lamp", key)), "needsYou") == 0 ? "needsYou" : "off"), r[0] + v_sk(H, "regions.station.lamp", 0), r[1] + v_sk(H, "regions.station.lamp", 1), 12, 12)) v_error("word: a station's lamp is not on the face");
  v_region(key, LAYER_TYPE);
  char name[40], l1[V_STR], l2[V_STR], who[V_STR]; spec_str(H, v_fmt("strings.titles.%s", key), name, sizeof name);
  snprintf(l1, sizeof l1, "%s", v_pstr(v_fmt("regions.%s.line1", key))); snprintf(l2, sizeof l2, "%s", v_pstr(v_fmt("regions.%s.line2", key))); snprintf(who, sizeof who, "%s", v_pstr(v_fmt("regions.%s.name", key)));
  v_line_at(v_fmt("%s.name", key), name, r[0] + v_sk(H, "regions.station.name", 0), r[1] + v_sk(H, "regions.station.name", 1), V_ANCHOR_LINE, v_si(H, "regions.station.namePx", 16), v_scol(H, "regions.station.nameColour"), V_ALIGN_LEFT);
  if (l1[0]) {   /* line 1 is 20 px if it fits the column, else 16; if it still does not fit, only a name in it is cut with an ellipsis */
    int px = v_measure(l1, v_si(H, "regions.station.line1Px", 20)) <= col ? v_si(H, "regions.station.line1Px", 20) : v_si(H, "regions.station.line1Px2", 16); char cut[V_STR * 3];
    const char *at = who[0] ? strstr(l1, who) : NULL;
    if (v_measure(l1, px) > col && at) { char pre[V_STR], suf[V_STR], nm[V_STR]; snprintf(pre, sizeof pre, "%.*s", (int)(at - l1), l1); snprintf(suf, sizeof suf, "%s", at + strlen(who));
      v_clip(who, col - v_measure(pre, px) - v_measure(suf, px), px, nm, sizeof nm); snprintf(cut, sizeof cut, "%s%s%s", pre, nm, suf); }
    else snprintf(cut, sizeof cut, "%s", l1);
    v_line_at(v_fmt("%s.line1", key), cut, r[0] + x1, r[1] + v_sk(H, "regions.station.line1", 1), V_ANCHOR_LINE, px, v_scol(H, "regions.station.line1Colour"), V_ALIGN_LEFT); }
  if (l2[0]) v_line_at(v_fmt("%s.line2", key), l2, r[0] + v_sk(H, "regions.station.line2", 0), r[1] + v_sk(H, "regions.station.line2", 1), V_ANCHOR_LINE, v_si(H, "regions.station.line2Px", 16), v_scol(H, "regions.station.line2Colour"), V_ALIGN_LEFT);
  (void)lineRight;
}

/* ---- the ring on the focused target: the house ring follows the outline (the spec's shape: radius 10 on a bezel, 8 on a station) ---- */
static void ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "room") == 0 || anim_holding()) return;   /* at rest there is no ring; it goes when the rest begins and stays away while it holds */
  for (int i = 0; i < 6; i++) if (strcmp(cur, TARGETS[i]) == 0) { int box[4]; v_srect(H, v_fmt("regions.%s.rect", cur), box); v_region("focus", LAYER_CHROME); word_focusRing("focus", H, v_fmt("focus.targets.%s", cur), box); return; }
}

void home_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  { int st[4]; v_srect(H, "regions.stage.rect", st); char ground[24]; spec_str("frame", "colours.stageGround", ground, sizeof ground);   /* the ground under the bezels and the console, down to the foot: there is no bottom line */
    v_region("stage", LAYER_CHROME); v_rect("stage.ground", st[0], st[1], st[2], st[3], ground); }
  bar_words();
  line_words();
  bezel_words("vivarium");
  bezel_words("library");
  { int c[4]; v_srect(H, "regions.console.rect", c); v_region("console", LAYER_CHROME);
    kit_bezel("console", c[0], c[1], c[2], c[3], v_si(H, "regions.console.radius", 10), v_scol(H, "regions.console.fill"), v_scol(H, "regions.console.edge"), NULL, NULL); }
  for (int i = 0; i < 4; i++) station_words(STATIONS[i]);
  ring(cur);
}

/* the targets as the words drew them, in the props' order, with the graph's key */
int home_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL);
    int r[4] = { 0, 0, 0, 0 }; v_srect(H, v_fmt("regions.%s.rect", t->id), r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}

/* a key on Home: ✓ and the room keys say an intent on the focused target (the room when the ring is on nothing); ← does nothing (Home is the top); the pad moves the ring by home.json focus.graph */
void home_key(int code) { screens_key_graph(code, H, "focus.graph", home_focus, "room", &(screens_keys_t){ .no_back = 1, .room_at = "focus.roomAt" }); }
