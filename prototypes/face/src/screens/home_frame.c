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

static int hi(const char *p, int d) { return spec_int(H, p, d); }
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *hcol(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(H, p, o, 24); return o; }
static const char *fcol(const char *key) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str("frame", v_fmt("colours.%s", key), o, 24); return o; }
static int pitch_of(int px) { return px == 16 ? 20 : px == 20 ? 28 : 36; }   /* frame.json type.pitch */
/* a string of Inter at px in a line box whose top-left is (x, y): the cap top is (pitch - cap) / 2 under the box's top. Returns the width. */
static int text_at(const char *id, const char *s, int x, int y, int px, const char *colour) {
  int w = v_measure(s, px); v_text(id, s, x, y + v_fdiv(pitch_of(px) - v_cap(px), 2), w, px, colour); return w;
}

/* ---- the top bar and the line ---- */
static void bar_words(void) {
  int r[4]; hrect("regions.bar.rect", r);
  char slice[96], c[24]; spec_str(H, "regions.bar.slice", slice, sizeof slice); int bar = slice[0] && wire_asset_slot(slice) >= 0;   /* the bar is on the face: its picture carries the panel and its rule; the code panel and rule stay as the same nodes of no size */
  if (bar) { v_region("bar", LAYER_PAINTED); v_sprite("bar.picture", slice, r[0], r[1], r[2], r[3]); }
  v_region("bar", LAYER_CHROME);
  spec_str("frame", "colours.chrome", c, sizeof c); word_panel("bar", r[0], r[1], bar ? 0 : r[2], bar ? 0 : r[3], c, NULL);
  spec_str("frame", "colours.rule", c, sizeof c); v_rect("bar.rule", r[0], r[1] + r[3] - 1, bar ? 0 : r[2], bar ? 0 : 1, c);
  v_region("bar", LAYER_TYPE);
  char title[40], place[V_STR], date[40], clock[16];
  spec_str(H, "strings.titles.bar", title, sizeof title);
  snprintf(place, sizeof place, "%s", v_pstr("regions.bar.place")); snprintf(date, sizeof date, "%s", v_pstr("regions.bar.date")); snprintf(clock, sizeof clock, "%s", v_pstr("regions.bar.clock"));
  int tx = hi("regions.bar.title.x", 16), tpx = hi("regions.bar.title.px", 20), ty = 10;   /* the title's cap top, the top bar's own: zone 8 + 2 (frame.json regions.title.text) */
  int tw = v_measure(title, tpx); v_text("bar.title", title, tx, ty, tw, tpx, hcol("regions.bar.title.colour"));
  int ppx = hi("regions.bar.place.px", 16), by = 12;   /* a 16 px figure's cap top in the bar: zone 8 + 4 (the counters', the turn's) */
  if (place[0]) { int pw = v_measure(place, ppx); v_text("bar.place", place, tx + tw + hi("regions.bar.place.gap", 12), by, pw, ppx, hcol("regions.bar.place.colour")); }
  int cpx = hi("regions.bar.clock.px", 20), right = hi("regions.bar.clock.right", 1008), cw = v_measure(clock, cpx), cx = right - cw;
  if (clock[0]) v_text("bar.clock", clock, cx, ty, cw, cpx, hcol("regions.bar.clock.colour"));
  int dpx = hi("regions.bar.date.px", 16);
  if (date[0]) { int dw = v_measure(date, dpx); v_text("bar.date", date, cx - hi("regions.bar.dateGap", 12) - dw, by, dw, dpx, hcol("regions.bar.date.colour")); }
}

/* the line, in its zone of the bar (home.json regions.line), centred and never wrapping:
   needs   at most two, joined by " · " in the need colour, with the amber lamp before them; the first carries the ✓ cap
   verb    what ✓ does on the focused target, with its cap, and its subject, if it has one, in mist after " · "; only the subject may end in an ellipsis, at the zone's edge
   note    one sentence in mist with no cap (✓ does nothing there)
   goal    the goal in mist (its icons, or its nameless sibling when the words and icons pass the zone), no lamp, no cap */
static void line_words(void) {
  int z[4]; hrect("regions.line.rect", z); int px = hi("regions.line.px", 16), lamp = hk("regions.line.lamp", 0), lampGap = hi("regions.line.lampGap", 4), cap = hk("regions.line.cap", 0), capGap = hi("regions.line.capGap", 4), centre = hi("regions.line.centre", z[0] + z[2] / 2);
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
        v_run_t a = v_run("line.needs.a", pre, tx, ty, px, fcol("need"), V_ALIGN_LEFT); v_run_t b = v_run("line.needs.b", who, a.end, ty, px, fcol("verb"), V_ALIGN_LEFT); v_run("line.needs.c", suf, b.end, ty, px, fcol("need"), V_ALIGN_LEFT);
      } else v_run("line.needs", full, tx, ty, px, fcol("need"), V_ALIGN_LEFT); }
    return;
  }
  if (verb[0]) {
    int room = z[2] - cap - capGap - v_run_width(verb, px), sepW = v_run_width(sep, px); char clipped[V_STR] = "";
    int hasSub = subject[0] && room > sepW; if (hasSub) v_clip(subject, room - sepW, px, clipped, sizeof clipped);
    int W = cap + capGap + v_run_width(verb, px) + (hasSub ? sepW + v_run_width(clipped, px) : 0), x0 = centre - (W + 1) / 2;
    v_region("line", LAYER_ART); v_sprite("line.cap", capPic, x0, z[1] + 4, cap, cap);
    v_region("line", LAYER_TYPE);
    v_run_t run = v_run("line.verb", verb, x0 + cap + capGap, ty, px, fcol("verb"), V_ALIGN_LEFT);
    if (hasSub) { run = v_run("line.sep", sep, run.end, ty, px, fcol("subject"), V_ALIGN_LEFT); v_run("line.subject", clipped, run.end, ty, px, fcol("subject"), V_ALIGN_LEFT); }
    return;
  }
  v_region("line", LAYER_TYPE);
  if (note[0]) { v_run("line.note", note, centre, ty, px, fcol("subject"), V_ALIGN_CENTRE); return; }
  if (goal[0]) {
    char icons[24] = "", plain[V_STR] = ""; snprintf(icons, sizeof icons, "%s", v_pstr("regions.line.goal.icons")); snprintf(plain, sizeof plain, "%s", v_pstr("regions.line.goal.plain"));
    int ni = 0; for (const char *q = icons; *q; q++) if ((unsigned char)*q == 0xe2) ni++;   /* each icon is one three-byte sequence beginning 0xe2 */
    const char *use = (v_run_width(goal, px) + 20 * ni > z[2] && plain[0]) ? plain : goal;
    snprintf(full, sizeof full, "%s%s%s", use, ni ? " " : "", ni ? icons : "");
    v_run("line.goal", full, centre, ty, px, fcol("subject"), V_ALIGN_CENTRE);
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
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  prim_node(v_id(id), FN_COMPOSED, x, y, size, size, 0, 0, 0);
}
static void bezel_words(const char *key) {
  int r[4], win[4]; hrect(v_fmt("regions.%s.rect", key), r); hrect(v_fmt("regions.%s.window", key), win);
  int rad = hi("regions.bezel.radius", 10);
  v_region(key, LAYER_CHROME);
  build_roundPanel(v_fmt("%s.panel", key), r[0], r[1], r[2], r[3], rad, hcol("regions.bezel.fill"), hcol("regions.bezel.edge"));
  v_rect(v_fmt("%s.bevel", key), r[0] + rad, r[1] + 1, r[2] - 2 * rad, 1, hcol("regions.bezel.bevel"));   /* the bevel line on top: the first row inside the edge, between the corners */
  { char f[24], e[24]; spec_str(H, v_fmt("regions.%s.placeholder.fill", key), f, sizeof f); spec_str(H, v_fmt("regions.%s.placeholder.edge", key), e, sizeof e);
    int gone = strcmp(key, "vivarium") == 0 && home_window_painted();   /* the Vivarium's window is its painting once that is on the face: the placeholder stays as a node of no size */
    word_panel(v_fmt("%s.window", key), win[0], win[1], gone ? 0 : win[2], gone ? 0 : win[3], f, e); }   /* the window: a placeholder until its picture lands */
  if (strcmp(key, "vivarium") == 0) home_window();
  expand_mark(v_fmt("%s.expand", key), r[0] + r[2] - hk("regions.bezel.expand.at", 0), r[1] + hk("regions.bezel.expand.at", 1), hi("regions.bezel.expand.size", 14), hi("regions.bezel.expand.tick", 4), hcol("regions.bezel.expandColour"));
  v_region(key, LAYER_TYPE);
  char title[40], readout[V_STR]; spec_str(H, v_fmt("strings.titles.%s", key), title, sizeof title); snprintf(readout, sizeof readout, "%s", v_pstr(v_fmt("regions.%s.readout", key)));
  int x = r[0] + hk("regions.bezel.title", 0), y = r[1] + hk("regions.bezel.title", 1);
  int tw = text_at(v_fmt("%s.title", key), title, x, y, hi("regions.bezel.titlePx", 16), hcol("regions.bezel.titleColour"));
  if (readout[0]) text_at(v_fmt("%s.readout", key), readout, x + tw + hi("regions.bezel.readoutGap", 8), y, hi("regions.bezel.readoutPx", 16), hcol("regions.bezel.readoutColour"));
}

/* ---- the console and its stations ---- */
/* the empty slot of the case: a 24 x 32 outline of radius 6 in `hairline`, no fill, one composed picture */
static void slot_outline(const char *id, int x, int y, int w, int h, int rad, const char *edge) {
  char ops[120]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]]", w, h, rad, edge);
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0);
}
static void station_words(const char *key) {
  int r[4]; hrect(v_fmt("regions.%s.rect", key), r);
  int rad = hi("regions.station.radius", 8), inset = hi("regions.station.pictureInset", 8), gap = hi("regions.station.columnGap", 8), x1 = hk("regions.station.line1", 0), left = 0, lineRight = r[2] - x1;
  char f[24], e[24]; spec_str(H, "regions.station.placeholder.fill", f, sizeof f); spec_str(H, "regions.station.placeholder.edge", e, sizeof e);
  v_region(key, LAYER_CHROME);
  build_roundPanel(v_fmt("%s.panel", key), r[0], r[1], r[2], r[3], rad, hcol("regions.station.fill"), hcol("regions.station.edge"));
  v_rect(v_fmt("%s.bevel", key), r[0] + rad, r[1] + 1, r[2] - 2 * rad, 1, hcol("regions.station.bevel"));   /* the bevel line on top */
  /* the picture: right-aligned `inset` in, vertically centred (the Bay's berths stand in line 1's row); the text column runs from x 12 to `gap` short of its left edge */
  if (strcmp(key, "bay") == 0) {
    int bw = hk("regions.bay.picture.berth", 0), bh = hk("regions.bay.picture.berth", 1), bg = hi("regions.bay.picture.gap", 2), n = v_pint("regions.bay.berths", hi("regions.bay.picture.berths", 3)), nmax = hi("regions.bay.picture.withPortrait", 4);
    int total = n * bw + (n - 1) * bg, x0 = r[0] + r[2] - inset - total, y0 = r[1] + hi("regions.bay.picture.top", 32); left = x0 - r[0];
    for (int i = 0; i < nmax; i++) word_panel(v_fmt("%s.berth.%d", key, i), x0 + i * (bw + bg), y0, i < n ? bw : 0, i < n ? bh : 0, f, e);   /* the portrait berth is the same nodes with no size while no portrait crate is in */
  } else if (strcmp(key, "pods") == 0) {
    int sw = hk("regions.pods.slots.size", 0), sh = hk("regions.pods.slots.size", 1), sg = hi("regions.pods.slots.gap", 2), cols = hi("regions.pods.slots.cols", 3), rows = hi("regions.pods.slots.rows", 2), pw = hk("regions.pods.picture", 0), ph = hk("regions.pods.picture", 1);
    int x0 = r[0] + r[2] - inset - pw, y0 = r[1] + (r[3] - ph) / 2, filled = v_pint("regions.pods.slots", 0); left = x0 - r[0];
    for (int i = 0; i < cols * rows; i++) { int sx = x0 + (i % cols) * (sw + sg), sy = y0 + (i / cols) * (sh + sg);
      if (i < filled) word_panel(v_fmt("%s.slot.%d", key, i), sx, sy, sw, sh, f, e); else slot_outline(v_fmt("%s.slot.%d", key, i), sx, sy, sw, sh, hi("regions.station.slot.radius", 6), hcol("regions.station.slot.edge")); }
  } else {
    int pw = hk(v_fmt("regions.%s.picture", key), 0), ph = hk(v_fmt("regions.%s.picture", key), 1);
    word_panel(v_fmt("%s.picture", key), r[0] + r[2] - inset - pw, r[1] + (r[3] - ph) / 2, pw, ph, f, e); left = r[2] - inset - pw;
  }
  int col = left - gap - x1;
  v_region(key, LAYER_ART);
  if (!v_sprite(v_fmt("%s.lamp", key), home_lamp_pic(strcmp(v_pstr(v_fmt("regions.%s.lamp", key)), "needsYou") == 0 ? "needsYou" : "off"), r[0] + hk("regions.station.lamp", 0), r[1] + hk("regions.station.lamp", 1), 12, 12)) v_error("word: a station's lamp is not on the face");
  v_region(key, LAYER_TYPE);
  char name[40], l1[V_STR], l2[V_STR], who[V_STR]; spec_str(H, v_fmt("strings.titles.%s", key), name, sizeof name);
  snprintf(l1, sizeof l1, "%s", v_pstr(v_fmt("regions.%s.line1", key))); snprintf(l2, sizeof l2, "%s", v_pstr(v_fmt("regions.%s.line2", key))); snprintf(who, sizeof who, "%s", v_pstr(v_fmt("regions.%s.name", key)));
  text_at(v_fmt("%s.name", key), name, r[0] + hk("regions.station.name", 0), r[1] + hk("regions.station.name", 1), hi("regions.station.namePx", 16), hcol("regions.station.nameColour"));
  if (l1[0]) {   /* line 1 is 20 px if it fits the column, else 16; if it still does not fit, only a name in it is cut with an ellipsis */
    int px = v_measure(l1, hi("regions.station.line1Px", 20)) <= col ? hi("regions.station.line1Px", 20) : hi("regions.station.line1Px2", 16); char cut[V_STR * 3];
    const char *at = who[0] ? strstr(l1, who) : NULL;
    if (v_measure(l1, px) > col && at) { char pre[V_STR], suf[V_STR], nm[V_STR]; snprintf(pre, sizeof pre, "%.*s", (int)(at - l1), l1); snprintf(suf, sizeof suf, "%s", at + strlen(who));
      v_clip(who, col - v_measure(pre, px) - v_measure(suf, px), px, nm, sizeof nm); snprintf(cut, sizeof cut, "%s%s%s", pre, nm, suf); }
    else snprintf(cut, sizeof cut, "%s", l1);
    text_at(v_fmt("%s.line1", key), cut, r[0] + x1, r[1] + hk("regions.station.line1", 1), px, hcol("regions.station.line1Colour")); }
  if (l2[0]) text_at(v_fmt("%s.line2", key), l2, r[0] + hk("regions.station.line2", 0), r[1] + hk("regions.station.line2", 1), hi("regions.station.line2Px", 16), hcol("regions.station.line2Colour"));
  (void)lineRight;
}

/* ---- the ring on the focused target: the house ring follows the outline (the spec's shape: radius 10 on a bezel, 8 on a station) ---- */
static void ring(const char *cur) {
  if (!cur[0] || strcmp(cur, "room") == 0 || anim_holding()) return;   /* at rest there is no ring; it goes when the rest begins and stays away while it holds */
  for (int i = 0; i < 6; i++) if (strcmp(cur, TARGETS[i]) == 0) { int box[4]; hrect(v_fmt("regions.%s.rect", cur), box); v_region("focus", LAYER_CHROME); word_focusRing("focus", H, v_fmt("focus.targets.%s", cur), box); return; }
}

void home_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  { int st[4]; hrect("regions.stage.rect", st); char ground[24]; spec_str("frame", "colours.stageGround", ground, sizeof ground);   /* the ground under the bezels and the console, down to the foot: there is no bottom line */
    v_region("stage", LAYER_CHROME); v_rect("stage.ground", st[0], st[1], st[2], st[3], ground); }
  bar_words();
  line_words();
  bezel_words("vivarium");
  bezel_words("library");
  { int c[4]; hrect("regions.console.rect", c); v_region("console", LAYER_CHROME);
    build_roundPanel("console.panel", c[0], c[1], c[2], c[3], hi("regions.console.radius", 10), hcol("regions.console.fill"), hcol("regions.console.edge")); }
  for (int i = 0; i < 4; i++) station_words(STATIONS[i]);
  ring(cur);
}

/* the targets as the words drew them, in the props' order, with the graph's key */
int home_focus(focus_target_t *out, int cap, char *graph_key, int gcap) {
  snprintf(graph_key, (size_t)gcap, "graph");
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("focus.targets.%d.id", i))); snprintf(t->group, sizeof t->group, "%s", v_pstr(v_fmt("focus.targets.%d.group", i)));
    t->enabled = v_pbool(v_fmt("focus.targets.%d.enabled", i), 1);
    int r[4] = { 0, 0, 0, 0 }; hrect(v_fmt("regions.%s.rect", t->id), r);
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
  focus_target_t t[12]; char gkey[24]; int n = home_focus(t, 12, gkey, sizeof gkey);
  int glen; const char *graph = spec_raw(H, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  int roomAt[4]; hrect("focus.roomAt", roomAt);
  char to[48]; int step = focus_move(g, t, n, cur, dir, NULL, 0, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, cur) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
