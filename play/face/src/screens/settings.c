/* Settings (settings.json): a binding table. In draw order: the stage (kit_stage), the four rows (kit_bezel, each its title and its line by role; the sleep row's title in the loss colour, dimmed when its reason says it cannot act), the dashed rule above the
   fourth, the detail of the focused row (kit_bezel, its title, then its blocks flowing down: paragraphs, facts, a label, a notice; its foot line at the bottom) and the ring (word_focusRing on the focused row). Every rectangle, colour and offset is
   the spec's; the props name the words and states. Focus is `focus.graph` of settings.json on the boxes this file drew. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define S "settings"
static const char *ROWS[4] = { "realm", "companion", "sleeping", "sleep" };

static void row(const char *key) {
  int r[4]; v_srect(S, v_fmt("regions.%s.rect", key), r);
  int dim = v_pbool(v_fmt("regions.%s.dim", key), 0), loss = strcmp(key, "sleep") == 0;
  char id[32]; snprintf(id, sizeof id, "row.%s", key);   /* the frame has regions of its own named companion: a row's is prefixed */
  v_region(id, LAYER_CHROME);
  kit_bezel(id, r[0], r[1], r[2], r[3], v_si(S, "regions.row.radius", 8), v_scol(S, "regions.row.fill"), v_scol(S, "regions.row.edge"), v_scol(S, "regions.row.bevel"), NULL);
  char title[V_STR], role[40]; spec_str(S, v_fmt("strings.rows.%s.title", key), title, sizeof title);
  snprintf(role, sizeof role, "%s", v_sstr(S, dim ? "regions.row.title.variants.dim" : loss ? "regions.row.title.variants.sleep" : "regions.row.title.role"));
  v_region(id, LAYER_TYPE);
  v_say(v_fmt("%s.title", id), title, r[0] + v_sk(S, "regions.row.title.at", 0), r[1] + v_sk(S, "regions.row.title.at", 1), V_ANCHOR_LINE, role, v_sstr(S, "regions.row.ground"), V_ALIGN_LEFT);
  const char *sub = v_pstr(v_fmt("regions.%s.sub", key));
  if (*sub) v_say(v_fmt("%s.sub", id), sub, r[0] + v_sk(S, "regions.row.sub.at", 0), r[1] + v_sk(S, "regions.row.sub.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.row.sub.role"), v_sstr(S, "regions.row.ground"), V_ALIGN_LEFT);
}

/* the detail: the title, the blocks flowing from the top of the flow, the foot at the bottom */
static void detail(void) {
  int r[4]; v_srect(S, "regions.detail.rect", r);
  v_region("detail", LAYER_CHROME);
  kit_bezel("detail", r[0], r[1], r[2], r[3], v_si(S, "regions.detail.radius", 8), v_scol(S, "regions.detail.fill"), v_scol(S, "regions.detail.edge"), v_scol(S, "regions.detail.bevel"), NULL);
  const char *ground = v_sstr(S, "regions.detail.ground"); char g[24]; snprintf(g, sizeof g, "%s", ground);
  int pad = v_si(S, "regions.detail.pad", 24), x = r[0] + pad, w = v_si(S, "regions.detail.flow.width", 448), y = r[1] + v_si(S, "regions.detail.flow.top", 72), gap = v_si(S, "regions.detail.flow.gap", 16);
  char title[V_STR], role[40]; snprintf(title, sizeof title, "%s", v_pstr("regions.detail.title")); snprintf(role, sizeof role, "%s", v_sstr(S, strcmp(v_pstr("regions.detail.key"), "sleep") == 0 ? "regions.detail.title.variants.sleep" : "regions.detail.title.role"));
  v_region("detail", LAYER_TYPE);
  v_say("detail.title", title, x, r[1] + v_si(S, "regions.detail.title.y", 20), V_ANCHOR_LINE, role, g, V_ALIGN_LEFT);
  int n = v_plen("regions.detail.blocks"), lgap = v_si(S, "regions.detail.flow.labelGap", 4);
  for (int i = 0; i < n; i++) {
    char kind[16], next[16] = "", text[V_STR * 2], buf[V_STR * 3], rl[40]; snprintf(kind, sizeof kind, "%s", v_pstr(v_fmt("regions.detail.blocks.%d.kind", i))); snprintf(text, sizeof text, "%s", v_pstr(v_fmt("regions.detail.blocks.%d.text", i)));
    if (i + 1 < n) snprintf(next, sizeof next, "%s", v_pstr(v_fmt("regions.detail.blocks.%d.kind", i + 1)));
    snprintf(rl, sizeof rl, "%s", v_sstr(S, v_fmt("regions.detail.flow.%s", kind)));
    int lines = v_role_wrap(text, w, rl, buf, sizeof buf, 6), pitch = v_role_pitch(rl); const char *q = buf;
    for (int k = 0; k < lines; k++) { v_say(v_fmt("detail.b%d.l%d", i, k), q, x, y, V_ANCHOR_LINE, rl, g, V_ALIGN_LEFT); y += pitch; q += strlen(q) + 1; }
    y += strcmp(kind, "label") == 0 ? lgap : (strcmp(kind, "facts") == 0 && strcmp(next, "facts") == 0) ? 0 : gap;   /* a facts line follows a facts line at the facts pitch; the label sits close above its lines */
  }
  const char *foot = v_pstr("regions.detail.foot");
  if (*foot) { const char *fr = v_sstr(S, "regions.detail.foot.role"); v_say("detail.foot", foot, x, r[1] + r[3] - v_si(S, "regions.detail.foot.bottom", 20) - v_role_pitch(fr), V_ANCHOR_LINE, fr, g, V_ALIGN_LEFT); }
}

/* the targets as the words drew them, in the props' order */
int settings_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int r[4] = { 0, 0, 0, 0 }; v_srect(S, v_fmt("regions.%s.rect", t->id), r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}
static void ring(const char *cur) {
  if (!cur[0] || anim_holding()) return;
  for (int i = 0; i < 4; i++) if (strcmp(cur, ROWS[i]) == 0) { int box[4]; v_srect(S, v_fmt("regions.%s.rect", cur), box); v_region("focus", LAYER_CHROME); word_focusRing("focus", S, v_fmt("focus.targets.%s", cur), box); return; }
}

void settings_words(void) {
  char cur[48]; snprintf(cur, sizeof cur, "%s", v_focus_cur());
  kit_stage(S, "regions.stage.rect", v_scol("frame", "colours.stageGround"), "stage", "stage.ground", NULL, NULL);
  for (int i = 0; i < 4; i++) row(ROWS[i]);
  { int s[4]; v_srect(S, "regions.separator.rect", s); int dash[2] = { v_sk(S, "regions.separator.dash", 0), v_sk(S, "regions.separator.dash", 1) }; v_region("separator", LAYER_CHROME); kit_hairline("separator", s[0], s[1], s[2], v_scol(S, "regions.separator.colour"), 0, dash); }
  detail();
  ring(cur);
}

/* a key on Settings: ✓ ← and the room keys say an intent on the focused row; the pad moves the ring by settings.json focus.graph */
void settings_key(int code) { screens_key_graph(code, S, "focus.graph", settings_focus, "realm", &(screens_keys_t){ 0 }); }
