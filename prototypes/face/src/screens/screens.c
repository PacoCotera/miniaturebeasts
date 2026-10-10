#include "screens.h"
#include "../vocab/words.h"
#include "../vocab/vocab.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>

/* The composition of a screen the face has no binding table for (frame.json notBuilt): the stage in colours.stageGround (Idle: the whole 1024x600 in notBuilt.colours.ground) and one line, centred. No picture, no target, no ring. */
static void not_built(int idle) {
  char c[24], s[V_STR]; int r[4];
  if (idle) { spec_str("frame", "notBuilt.colours.ground", c, sizeof c); if (v_spec_rect("frame", "notBuilt.regions.ground.rect", r)) { v_region("notBuilt.ground", LAYER_CHROME); v_rect("notBuilt.ground", r[0], r[1], r[2], r[3], c); } }
  else { spec_str("frame", "colours.stageGround", c, sizeof c); if (v_spec_rect("frame", "regions.stage.rect", r)) { v_region("notBuilt.stage", LAYER_CHROME); v_rect("notBuilt.stage", r[0], r[1], r[2], r[3], c); } }
  spec_str("frame", idle ? "notBuilt.strings.idle" : "notBuilt.strings.line", s, sizeof s);
  int px = spec_int("frame", "notBuilt.regions.line.px", 20), w = v_measure(s, px), x = spec_int("frame", "notBuilt.regions.line.centre", 512) - v_half(w);
  spec_str("frame", "notBuilt.colours.line", c, sizeof c);
  v_region("notBuilt.line", LAYER_TYPE); v_text("notBuilt.line", s, x, spec_int("frame", "notBuilt.regions.line.capTop", 288), w, px, c);
}
static int is_not_built(void) { char st[24]; spec_str("props", "state", st, sizeof st); return strcmp(st, "notBuilt") == 0; }
/* Which screens the face draws with words. */
static void frame_words(void) {
  if (spec_bool("props", "idle", 0)) return;                 /* Idle is the whole 1024x600: no top bar, no bottom line, no plate */
  if (spec_len("props", "frame.top") >= 0) word_topBar();
  if (spec_len("props", "frame.line") >= 0) word_bottomLine();
  if (spec_len("props", "frame.plate") >= 0) word_messagePlate();
}
/* The screen change (180 ms): a Bayer dither of `void` laid over the stage and cleared in 16 levels, whole pixels, no opacity (§2.7). Level L = 16 - floor(16 t / ms); a pixel is covered where BAYER[(y & 3) * 4 + (x & 3)] < L. */
static void stage_dither(void) {
  static const int BAYER[16] = { 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 };
  anim_state_t t; if (!anim_get(ANIM_DITHER, "stage", &t)) return;
  int level = t.to > t.from ? t.from + ((t.to - t.from) * t.elapsed) / t.ms : 16 - (16 * t.elapsed) / t.ms, r[4];   /* from < to: the dither closes over the stage (Home's rest to Idle) */ if (level <= 0 || !v_spec_rect("frame", "regions.stage.rect", r)) return;
  if (level > 16) level = 16;
  char ops[400]; int n = snprintf(ops, sizeof ops, "[[\"lattice\",0,0,%d,%d,4,[", r[2], r[3]);
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, sizeof ops - (size_t)n, "],\"void\"]]");
  snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops);
  v_region("stage", LAYER_ART); prim_node(v_id("stage.dither"), FN_COMPOSED, r[0], r[1], r[2], r[3], 0, 0, 0);
}
/* a target's ring form (lvgl-switch.md §2.6): "round", "feet", "tab", { "circle": { "radius": r > 0, "centre": [x, y] } } or { "circle": { "outside": n >= 0 } }, and nothing else */
static int vet_ring(const char *screen, const char *name, char *err, int cap) {
  char R[96], C[112], Q[128], why[80] = "";
  snprintf(R, sizeof R, "targets.%s.ring", name); int rl; const char *raw = spec_raw(screen, R, &rl); if (!raw) return 0;
  if (raw[0] == '"') { char f[16]; spec_str(screen, R, f, sizeof f); if (strcmp(f, "round") && strcmp(f, "feet") && strcmp(f, "tab")) snprintf(why, sizeof why, "%.30s is not a ring form", f); }
  else if (raw[0] == '{') {
    snprintf(C, sizeof C, "%s.circle", R); char k[16], d[2];
    if (spec_len(screen, R) != 1 || !spec_member(screen, R, 0, k, sizeof k, d, sizeof d) || strcmp(k, "circle")) snprintf(why, sizeof why, "an object ring has the one key circle");
    else if (spec_raw(screen, C, NULL) && spec_raw(screen, C, NULL)[0] == '{') {
      int n = spec_len(screen, C); char k0[16], k1[16];
      if (n == 1 && spec_member(screen, C, 0, k0, sizeof k0, d, sizeof d) && !strcmp(k0, "outside")) { snprintf(Q, sizeof Q, "%s.outside", C); if (!spec_raw(screen, Q, NULL) || spec_int(screen, Q, -1) < 0) snprintf(why, sizeof why, "circle.outside must be 0 or more"); }
      else if (n == 2 && spec_member(screen, C, 0, k0, sizeof k0, d, sizeof d) && spec_member(screen, C, 1, k1, sizeof k1, d, sizeof d) && ((!strcmp(k0, "radius") && !strcmp(k1, "centre")) || (!strcmp(k0, "centre") && !strcmp(k1, "radius")))) {
        snprintf(Q, sizeof Q, "%s.radius", C); char c[120]; snprintf(c, sizeof c, "%s.centre", C);
        if (spec_int(screen, Q, 0) <= 0) snprintf(why, sizeof why, "circle.radius must be above 0"); else if (spec_len(screen, c) != 2) snprintf(why, sizeof why, "circle.centre is [x, y]");
      } else snprintf(why, sizeof why, "a circle is radius with centre, or outside");
    } else snprintf(why, sizeof why, "circle must be an object");
  } else snprintf(why, sizeof why, "a ring is a form name or a circle");
  if (*why) { snprintf(err, (size_t)cap, "spec %s: %s: %s", screen, R, why); return -1; }
  return 0;
}
int screens_vet_spec(const char *screen, char *err, int cap) {
  for (int i = 0, n = spec_len(screen, "targets"); i < n; i++) { char key[48], dummy[2]; if (spec_member(screen, "targets", i, key, sizeof key, dummy, sizeof dummy) && vet_ring(screen, key, err, cap) < 0) return -1; }
  /* a focus graph that cannot be walked is refused at load, with the parser's reason (§2.6.1): focus.graph when the spec has one, else (a spec with states) every focus.<state> */
  { char b[160]; int gl; const char *g = spec_raw(screen, "focus.graph", &gl), *fo = spec_raw(screen, "focus", NULL);
    if (g) { char why[160]; focus_graph_t *fg = focus_graph_parse(g, gl, why, sizeof why); if (!fg) { snprintf(err, (size_t)cap, "spec %s: focus.graph: %s", screen, why); return -1; } focus_graph_free(fg); }
    else if (fo && spec_len(screen, "states") > 0 && spec_len(screen, "focus") > 0)   /* a spec with states: each state's graph, Compare's too */
      for (int i = 0, n = spec_len(screen, "focus"); i < n; i++) {
        char key[48], dummy[2]; if (!spec_member(screen, "focus", i, key, sizeof key, dummy, sizeof dummy)) continue;
        snprintf(b, sizeof b, "focus.%s", key); int sl; const char *sg = spec_raw(screen, b, &sl); if (!sg || sg[0] != '{') continue;
        char why[160]; focus_graph_t *fg = focus_graph_parse(sg, sl, why, sizeof why); if (!fg) { snprintf(err, (size_t)cap, "spec %s: %s: %s", screen, b, why); return -1; } focus_graph_free(fg);
      } }
  for (int i = 0, n = spec_len(screen, "regions"); i < n; i++) {
    char key[48], base[96], p[160], dummy[2]; if (!spec_member(screen, "regions", i, key, sizeof key, dummy, sizeof dummy)) continue;
    snprintf(base, sizeof base, "regions.%s.name.plate", key); if (spec_len(screen, base) < 0) continue;
    char series[48]; snprintf(p, sizeof p, "%s.series", base);
    if (spec_str(screen, p, series, sizeof series) <= 0) { snprintf(err, (size_t)cap, "spec %s: the name plate of %s has no series", screen, key); return -1; }
    snprintf(p, sizeof p, "%s.round", base); int round = spec_int(screen, p, 0); snprintf(p, sizeof p, "%s.min", base); int mn = spec_int(screen, p, 0); snprintf(p, sizeof p, "%s.max", base); int mx = spec_int(screen, p, 0);
    if (round <= 0 || mn <= 0 || mx < mn || mn % round || mx % round) { snprintf(err, (size_t)cap, "spec %s: the name plate of %s has min %d and max %d, which are not multiples of round %d", screen, key, mn, mx, round); return -1; }
  }
  return 0;
}
static void draw(void) {
  prim_begin(); v_set_focal(NULL);
  { char screen[32]; spec_str("props", "screen", screen, sizeof screen); /* a screen draws its words when the props carry its regions */
    if (strcmp(screen, "pods") == 0 && spec_has("pods") && spec_len("props", "regions") >= 0) pods_words();
    else if (strcmp(screen, "home") == 0 && spec_has("home") && spec_len("props", "regions") >= 0) home_words();
    else home_hidden(); }   /* a screen other than Home: its walk starts again from the seeds when it shows */
  if (spec_bool("props", "idle", 0)) not_built(1);          /* Idle has no binding table yet */
  else if (is_not_built()) not_built(0);
  frame_words();
  stage_dither();
  prim_end();
  wire_changed();
}
void screens_redraw(void) { if (spec_has("props") && spec_has("frame")) draw(); }
int screens_props(const char *json, int len) {
  if (spec_load("props", json, (size_t)len) < 0) { wire_error(spec_error()); return -1; }
  if (!spec_has("frame")) { wire_error("props: the frame spec has not been sent"); return -1; }
  v_focus_set(NULL);   /* the props carry the truth of the focus */
  draw();
  return 0;
}

/* ---- keys ---- */
void screens_say(const char *kind, const char *target, const char *verb) {
  char screen[32], b[300]; spec_str("props", "screen", screen, sizeof screen);
  if (verb) snprintf(b, sizeof b, "{\"t\":\"intent\",\"seq\":%u,\"screen\":\"%s\",\"target\":\"%s\",\"verb\":\"%s\"}", wire_props_seq(), screen, target, verb);
  else snprintf(b, sizeof b, "{\"t\":\"%s\",\"seq\":%u,\"screen\":\"%s\",\"target\":\"%s\"}", kind, wire_props_seq(), screen, target);
  wire_emit(b);
}
void screens_key(int code) {
  if (anim_holding()) {   /* an event holds input: no key is acted on but a room key, which is said on the current focus target (or the screen); the host keeps the last one and dispatches it when the hold ends (§2.1) */
    char sc[32]; spec_str("props", "screen", sc, sizeof sc); const char *rv = code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
    if (rv) { char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); screens_say("intent", cur[0] ? cur : strcmp(sc, "home") == 0 ? "room" : "screen", rv); }
    return;
  }
  anim_cut();   /* a press ends the events that carry `cut` (they say done on this frame), and then acts itself */
  char screen[32]; spec_str("props", "screen", screen, sizeof screen);
  if (spec_bool("props", "idle", 0)) { screens_say("intent", "idle", "wake"); return; }   /* the first press on Idle wakes and does nothing else */
  if (is_not_built()) {   /* no targets, no ring: a room key opens its room; ← goes to the parent when the bottom line names one; the rest does nothing */
    const char *v = code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL; char b[64];
    if (!v && code == 27 && spec_str("props", "frame.line.back", b, sizeof b) > 0) v = "back";
    if (v) screens_say("intent", "screen", v);
    return;
  }
  if (strcmp(screen, "home") == 0 && spec_has("home") && spec_len("props", "regions") >= 0) { home_key(code); return; }
  if (strcmp(screen, "pods") != 0 || spec_len("props", "regions") < 0 || !spec_has("pods")) return;
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[64]; char gkey[24]; int n = pods_focus(t, 64, gkey, sizeof gkey); if (n <= 0) return;
  char path[48], err[200]; snprintf(path, sizeof path, "focus.%s", gkey); int glen; const char *graph = spec_raw("pods", path, &glen);
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  focus_resolve_t r[16]; int nr = 0;
  for (int i = 0, m = spec_len("props", "focus.resolve"); i < m && nr < 16; i++) { if (spec_member("props", "focus.resolve", i, r[nr].sel, sizeof r[nr].sel, r[nr].id, sizeof r[nr].id)) nr++; }
  char to[48]; int step = focus_move(g, t, n, cur, dir, r, nr, NULL, to, sizeof to); focus_graph_free(g);
  if (step) { char v[16]; snprintf(v, sizeof v, "step:%s", dir == FOCUS_UP ? "up" : dir == FOCUS_DOWN ? "down" : dir == FOCUS_LEFT ? "left" : "right"); screens_say("intent", cur, v); return; }
  if (strcmp(to, cur) == 0) return;
  v_focus_set(to); draw(); screens_say("focus", to, NULL);   /* the ring moves on the frame of the key: the words are drawn again at once */
}
int screens_tick(uint32_t now) { return spec_has("props") && spec_has("frame") && home_tick(now); }
