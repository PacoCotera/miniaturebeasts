#include "screens.h"
#include "../vocab/words.h"
#include "../vocab/vocab.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>

/* Which screens the face draws with words. A screen not in the list is still drawn by the page's scene nodes (face-lvgl.mjs). */
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
  int level = 16 - (16 * t.elapsed) / t.ms, r[4]; if (level <= 0 || !v_spec_rect("frame", "regions.stage.rect", r)) return;
  char ops[400]; int n = snprintf(ops, sizeof ops, "[[\"lattice\",0,0,%d,%d,4,[", r[2], r[3]);
  for (int k = 0, first = 1; k < 16; k++) if (BAYER[k] < level) { n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[%d,%d]", first ? "" : ",", k % 4, k / 4); first = 0; }
  snprintf(ops + n, sizeof ops - (size_t)n, "],\"void\"]]");
  snprintf(prim_text(), (size_t)prim_text_size(), "%s", ops);
  v_region("stage", LAYER_ART); prim_node(v_id("stage.dither"), FN_COMPOSED, r[0], r[1], r[2], r[3], 0, 0, 0);
}
static void draw(void) {
  prim_begin(); v_set_focal(NULL);
  { char screen[32]; spec_str("props", "screen", screen, sizeof screen); if (strcmp(screen, "pods") == 0 && spec_has("pods") && spec_len("props", "regions") >= 0) pods_words();   /* a screen draws its words when the props carry its regions */ }
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
static void say(const char *kind, const char *target, const char *verb) {
  char screen[32], b[300]; spec_str("props", "screen", screen, sizeof screen);
  if (verb) snprintf(b, sizeof b, "{\"t\":\"intent\",\"seq\":%u,\"screen\":\"%s\",\"target\":\"%s\",\"verb\":\"%s\"}", wire_props_seq(), screen, target, verb);
  else snprintf(b, sizeof b, "{\"t\":\"%s\",\"seq\":%u,\"screen\":\"%s\",\"target\":\"%s\"}", kind, wire_props_seq(), screen, target);
  wire_emit(b);
}
void screens_key(int code) {
  if (anim_holding()) return;   /* an event holds input: no key is acted on (§2.1) */
  char screen[32]; spec_str("props", "screen", screen, sizeof screen);
  if (strcmp(screen, "pods") != 0 || spec_len("props", "regions") < 0 || !spec_has("pods")) return;
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { say("intent", cur, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[64]; char gkey[24]; int n = pods_focus(t, 64, gkey, sizeof gkey); if (n <= 0) return;
  char path[48], err[200]; snprintf(path, sizeof path, "focus.%s", gkey); int glen; const char *graph = spec_raw("pods", path, &glen);
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  focus_resolve_t r[16]; int nr = 0;
  for (int i = 0, m = spec_len("props", "focus.resolve"); i < m && nr < 16; i++) { if (spec_member("props", "focus.resolve", i, r[nr].sel, sizeof r[nr].sel, r[nr].id, sizeof r[nr].id)) nr++; }
  char to[48]; int step = focus_move(g, t, n, cur, dir, r, nr, NULL, to, sizeof to); focus_graph_free(g);
  if (step) { char v[16]; snprintf(v, sizeof v, "step:%s", dir == FOCUS_UP ? "up" : dir == FOCUS_DOWN ? "down" : dir == FOCUS_LEFT ? "left" : "right"); say("intent", cur, v); return; }
  if (strcmp(to, cur) == 0) return;
  v_focus_set(to); draw(); say("focus", to, NULL);   /* the ring moves on the frame of the key: the words are drawn again at once */
}
