/* The namer, an overlay over one mibi up close (namer.json; lvgl-switch.md §2.2): drawn after the screen beneath, before the frame's words, so the ring and the message plate stand over it. Its words are `panel` and `text` in two
   compositions, `keyGrid` (the keys: each a panel with one label, a focus target at its rectangle) and `nameField` (the well, the name, the selection behind it and the caret after it). The characters of the keys, the field's name and state,
   the say line and the dimmed keys are props (`overlay.regions`), never the spec. While it is open its graph (namer.json focus.graph over the targets the props list) is the only one: the screen beneath draws no ring and takes no key.
   A key a page does not draw has no node and no target (the props label is null). Rectangles: the key i of the grid is [x + pitch (i mod columns), y + pitch (i div columns), 40, 40]; the others are the spec's. */
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

#define N "namer"
#define KEYS 28
static int ni(const char *p, int d) { return spec_int(N, p, d); }
static int nk(const char *base, int k) { return spec_int(N, v_fmt("%s.%d", base, k), 0); }
static void nrect(const char *p, int r[4]) { if (!v_spec_rect(N, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *ncol(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(N, p, o, 24); return o; }
static void key_rect(int i, int r[4]) { int cols = ni("regions.keys.columns", 7), pitch = ni("regions.keys.pitch", 48); r[0] = nk("regions.keys.at", 0) + pitch * (i % cols); r[1] = nk("regions.keys.at", 1) + pitch * (i / cols); r[2] = nk("regions.keys.key", 0); r[3] = nk("regions.keys.key", 1); }
static void target_rect(const char *id, int r[4]) {
  r[0] = r[1] = r[2] = r[3] = 0;
  if (strncmp(id, "key.", 4) == 0) key_rect(atoi(id + 4), r);
  else if (strcmp(id, "mod.shift") == 0) nrect("regions.shift.rect", r); else if (strcmp(id, "mod.space") == 0) nrect("regions.space.rect", r); else if (strcmp(id, "mod.page") == 0) nrect("regions.page.rect", r);
  else if (strcmp(id, "act.done") == 0) nrect("regions.done.rect", r); else if (strcmp(id, "act.suggest") == 0) nrect("regions.suggest.rect", r);
}
static const char *cur(void) { return v_focus_cur_at("overlay.focus.cur"); }

/* one key: a panel (fill, bevel top, hairline edge), its label centred, lifted 2 px while the ring is on it */
static void key_face(const char *id, const char *region, const int r[4], int focused, const char *fill, const char *label, const char *ink) {
  int lift = focused ? ni("focus.targets.key.lift", 2) : 0, y = r[1] - lift, px = ni("regions.keys.label.px", 16), w = v_measure(label, px);
  v_region(region, LAYER_CHROME); word_panel(id, r[0], y, r[2], r[3], fill, ncol("colours.key.edge")); v_rect(v_fmt("%s.top", id), r[0] + 1, y + 1, r[2] - 2, 1, ncol("colours.key.top"));
  v_region(region, LAYER_TYPE); v_text(v_fmt("%s.label", id), label, r[0] + v_half(r[2] - w), y + ni("regions.keys.label.lineTop", 10) + v_fdiv(20 - v_cap(px), 2), w, px, ink);
}
static void build_panel(void) {
  int r[4], sh[2] = { nk("regions.panel.shadow", 0), nk("regions.panel.shadow", 1) }; nrect("regions.panel.rect", r);
  v_region("panel", LAYER_CHROME); v_rect("panel.shadow", r[0] + sh[0], r[1] + sh[1], r[2], r[3], ncol("colours.panel.shadow"));   /* the report card's look: a void drop shadow, the fill, the hairline edge, a bevel top row */
  word_panel("panel", r[0], r[1], r[2], r[3], ncol("colours.panel.fill"), ncol("colours.panel.edge")); v_rect("panel.top", r[0] + 1, r[1] + 1, r[2] - 2, 1, ncol("colours.panel.top"));
}
/* the name well: a panel (`ground`, `hairline`), the name 28 px, a selection rect behind it while selected and a caret after it while typing or empty */
static void build_field(void) {
  int r[4]; nrect("regions.field.rect", r); const char *name = v_pstr("overlay.regions.field.name"), *state = v_pstr("overlay.regions.field.state"); int px = ni("regions.field.px", 28), tw = v_measure(name, px), x = nk("regions.field.nameAt", 0);
  int selected = strcmp(state, "selected") == 0 && *name, caret = strcmp(state, "selected") != 0, cx = *name ? x + tw + 2 : x;
  v_region("field", LAYER_CHROME); word_panel("field", r[0], r[1], r[2], r[3], ncol("colours.field.fill"), ncol("colours.field.edge"));
  v_rect("field.selection", x - 4, nk("regions.field.nameAt", 1), selected ? tw + 8 : 0, selected ? ni("regions.field.line", 36) : 0, ncol("colours.field.selection"));
  v_rect("field.caret", cx, nk("regions.field.nameAt", 1) + 4, caret ? 2 : 0, caret ? 28 : 0, ncol("colours.field.caret"));
  v_region("field", LAYER_TYPE); v_text("field.name", name, x, ni("regions.field.lineTop", 70) + v_fdiv(ni("regions.field.line", 36) - v_cap(px), 2), tw, px, ncol("colours.field.name"));
}
static void build_say(void) {
  int r[4]; nrect("regions.say.rect", r); const char *t = v_pstr("overlay.regions.say.text"); int px = ni("regions.say.px", 16), w = v_measure(t, px);
  v_region("say", LAYER_TYPE); v_text("say.text", t, nk("regions.say.at", 0), ni("regions.say.lineTop", 122) + v_fdiv(20 - v_cap(px), 2), *t ? w : 0, px, ncol(strcmp(v_pstr("overlay.regions.say.tone"), "refused") == 0 ? "colours.say.refused" : "colours.say.reason"));
}
static void build_keys(void) {
  const char *c = cur(); int dim = v_pbool("overlay.regions.keys.dim", 0);
  for (int i = 0; i < KEYS; i++) {
    const char *label = v_pstr(v_fmt("overlay.regions.keys.labels.%d", i)); if (!*label) continue;   /* not drawn on this page: no node, no target */
    int r[4]; key_rect(i, r); char id[24]; snprintf(id, sizeof id, "key.%d", i);
    key_face(id, "keys", r, strcmp(c, id) == 0, ncol("colours.key.fill"), label, ncol(dim ? "colours.key.labelDim" : "colours.key.label"));
  }
}
static void build_mods(void) {
  const char *c = cur(); int r[4], on = v_pbool("overlay.regions.shift.on", 0), full = v_pbool("overlay.regions.space.dim", 0), doneDim = v_pbool("overlay.regions.done.dim", 0); char s[40];
  nrect("regions.shift.rect", r); spec_str(N, "strings.keys.shift", s, sizeof s); key_face("shift", "shift", r, strcmp(c, "mod.shift") == 0, ncol(on ? "colours.key.on" : "colours.key.fill"), s, ncol("colours.key.label"));
  nrect("regions.space.rect", r); spec_str(N, "strings.keys.space", s, sizeof s); key_face("space", "space", r, strcmp(c, "mod.space") == 0, ncol("colours.key.fill"), s, ncol(full ? "colours.space.labelDim" : "colours.space.label"));
  nrect("regions.page.rect", r); key_face("page", "page", r, strcmp(c, "mod.page") == 0, ncol("colours.key.fill"), v_pstr("overlay.regions.page.label"), ncol("colours.key.label"));
  nrect("regions.suggest.rect", r); spec_str(N, "strings.keys.suggest", s, sizeof s); key_face("suggest", "suggest", r, strcmp(c, "act.suggest") == 0, ncol("colours.key.fill"), s, ncol("colours.key.label"));
  nrect("regions.done.rect", r); spec_str(N, "strings.keys.done", s, sizeof s); key_face("done", "done", r, strcmp(c, "act.done") == 0, ncol("colours.key.fill"), s, ncol(doneDim ? "colours.done.labelDim" : "colours.done.label"));
}
/* the ring over the focused target, lifted 2 px: 4 px outside its key (48 x 48 on a 48 pitch) */
static void build_ring(void) {
  const char *c = cur(); int box[4]; if (!*c || anim_holding()) return; target_rect(c, box); if (box[2] <= 0) return; box[1] -= ni("focus.targets.key.lift", 2);
  v_region("focus", LAYER_CHROME); word_focusRing("focus", box, N, "focus.targets.key.ring", ncol("colours.ring"));
}
void namer_words(void) { build_panel(); build_field(); build_say(); build_keys(); build_mods(); build_ring(); }

/* the targets the props list, in their order, with the boxes the words gave them */
int namer_focus(focus_target_t *out, int cap) {
  int n = v_plen("overlay.focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; memset(t, 0, sizeof *t); snprintf(t->id, sizeof t->id, "%s", v_pstr(v_fmt("overlay.focus.targets.%d.id", i))); t->enabled = v_pbool(v_fmt("overlay.focus.targets.%d.enabled", i), 1); t->index = i;
    int r[4]; target_rect(t->id, r); t->x = r[0]; t->y = r[1]; t->w = r[2]; t->h = r[3];
  }
  return n;
}
/* a key while the namer is open: ✓ and ← and the room keys say an intent for the namer's target (screen "namer"); the pad moves the ring by namer.json focus.graph and says `focus` */
void namer_key(int code) {
  char c[48]; snprintf(c, sizeof c, "%s", cur());
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  if (verb) { screens_say("intent", c, verb); return; }
  int dir = code == 17 ? FOCUS_UP : code == 18 ? FOCUS_DOWN : code == 20 ? FOCUS_LEFT : code == 19 ? FOCUS_RIGHT : -1; if (dir < 0) return;
  focus_target_t t[40]; int n = namer_focus(t, 40); int glen; const char *graph = spec_raw(N, "focus.graph", &glen); char err[200];
  focus_graph_t *g = graph ? focus_graph_parse(graph, glen, err, sizeof err) : NULL; if (!g) return;
  int roomAt[4] = { 0, 0, 0, 0 }; char to[48]; int step = focus_move(g, t, n, c, dir, NULL, 0, roomAt, to, sizeof to); focus_graph_free(g);
  if (step || strcmp(to, c) == 0) return;
  v_focus_set(to); screens_redraw(); screens_say("focus", to, NULL);
}
