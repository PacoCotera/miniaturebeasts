/* Home's compositions (lvgl-switch.md §2.2: a composition is a build of words in the screen's binding table, never a word): the module (a panel, its engraved word, its lamp), the name tag (a panel and text) and the rest knob, and the
   lamps they use. Spec: the `home` spec. A picture the host has not sent is a slot not yet filled: nothing is drawn. A flat plate is drawn only where the spec itself names the colours (the lamps, the knob, the name tag). */
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
static int hi(const char *p, int d) { return spec_int(H, p, d); }
static int hk(const char *base, int k) { return spec_int(H, v_fmt("%s.%d", base, k), 0); }
static void hrect(const char *p, int r[4]) { if (!v_spec_rect(H, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(H, p, o, 24); return o; }

/* a lamp: 12 x 12, a `void` rim and the state's fill (off, well, waiting, needsYou) */
static void lamp(const char *id, int x, int y, const char *state) {
  if (strcmp(state, "needsYou") == 0) {   /* the signed amber lamp (frame.json regions.marks.lamp12); until the host has it, nothing */
    char a[96]; spec_str("frame", "regions.marks.lamp12", a, sizeof a); if (a[0] && wire_has_asset(a)) v_sprite(id, a, x, y, 12, 12); return;
  }
  char p[48]; snprintf(p, sizeof p, "colours.lamp.%s", *state ? state : "off");
  char n[64]; snprintf(n, sizeof n, "%s.rim", id); v_rect(n, x, y, 12, 12, colr("colours.lamp.rim"));
  snprintf(n, sizeof n, "%s.fill", id); v_rect(n, x + 1, y + 1, 10, 10, colr(p));
}

/* a waiting lamp on a resident or a sleeper: the flat plate in the spec's colours */
void build_waitingLamp(const char *id, int x, int y) { lamp(id, x, y, "waiting"); }

/* the module: a panel (fill, bevel top, hairline edge), its engraved word at the spec's offset and its lamp; the objects are the screen's. `dy` is the focused module's lift (negative). Draws region `key`. */
void build_module(const char *key, int dy, const char *lampState) {
  int r[4], word[2], lampAt[2]; char p[64]; snprintf(p, sizeof p, "regions.%s.rect", key); hrect(p, r);
  word[0] = hk(v_fmt("regions.%s.word", key), 0); word[1] = hk(v_fmt("regions.%s.word", key), 1); lampAt[0] = hk(v_fmt("regions.%s.lamp", key), 0); lampAt[1] = hk(v_fmt("regions.%s.lamp", key), 1);
  int x = r[0], y = r[1] + dy;
  v_region(key, LAYER_CHROME);
  word_panel(v_fmt("%s", key), x, y, r[2], r[3], colr("colours.module.fill"), colr("colours.module.edge"));
  v_rect(v_fmt("%s.top", key), x + 1, y + 1, r[2] - 2, 1, colr("colours.module.top"));
  lamp(v_fmt("%s.lamp", key), x + lampAt[0], y + lampAt[1], lampState);
  char w[40]; spec_str(H, v_fmt("strings.modules.%s", key), w, sizeof w);
  v_region(key, LAYER_TYPE); v_text(v_fmt("%s.word", key), w, x + word[0], y + word[1] + 5, v_measure(w, 16), 16, colr("colours.module.word"));   /* a 24 px zone: the cap top 5 below its top */
}

/* the name tag: a panel and the name, 24 tall; its width the name's plus 16 rounded up to the 8 px grid, 48 at least; centred on the box, 12 px under the ring (top at feet + 24), over the box when it would pass 536,
   slid to stay 8 px inside the glass. `lifted`: the box is the resident's as drawn (a sleeper does not lift). Returns the tag's rect in out. */
void build_nameTag(const char *name, const int box[4], int lift, int out[4]) {
  int h = hi("regions.nameTag.h", 24), pad = hi("regions.nameTag.pad", 8), px = hi("regions.nameTag.px", 16), tw = v_measure(name, px), w = tw + 2 * pad;
  w = (w + 7) / 8 * 8; if (w < 48) w = 48;
  int x = box[0] + v_half(box[2] - w), feet = box[1] + box[3], y = feet + 24;
  int flip = hk("regions.glass.rect", 1) + hk("regions.glass.rect", 3) - 8;   /* the glass's bottom less 8: below it the tag goes over the box */
  if (y + h > flip) y = box[1] - lift - 8 - h;
  int gl = hi("regions.glass.rect.0", 24) + 8, gr = hi("regions.glass.rect.0", 24) + hi("regions.glass.rect.2", 640) - 8;
  if (x < gl) x = gl; if (x + w > gr) x = gr - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  v_region("nameTag", LAYER_CHROME); word_panel("nameTag", x, y, w, h, colr("colours.nameTag.fill"), colr("colours.nameTag.edge"));
  v_region("nameTag", LAYER_TYPE); v_text("nameTag.text", name, x + v_half(w - tw), y + 5, tw, px, colr("colours.nameTag.text"));
}

/* the rest knob on the bezel's bottom rail: 32 x 6, at rest at y 546, lifted to 544 while focused; settling from the lift while the `rest` event plays. A flat plate in the knob's three roles. */
void build_restKnob(int focused) {
  int r[4]; hrect("regions.knob.rect", r); int drawn_w = hk("regions.knob.drawn", 0), drawn_h = hk("regions.knob.drawn", 1);
  int y = hk("regions.knob.states.focused.rect", 1) ? hk("regions.knob.states.focused.rect", 1) : r[1];
  int rest_y = hk("regions.knob.states.rest.rect", 1);
  anim_state_t t; int lifted = focused && !anim_holding();   /* a rest holding: the knob stays settled */
  if (anim_get(ANIM_REST, "knob", &t)) { lifted = 0; y = t.elapsed < 100 ? y : t.elapsed < 200 ? y + 1 : rest_y; }   /* the knob settles from its lift in the first 200 ms */
  else y = lifted ? y : rest_y;
  v_region("knob", LAYER_CHROME);
  v_rect("knob.light", r[0], y, drawn_w, 1, colr("colours.knob.light")); v_rect("knob.body", r[0], y + 1, drawn_w, drawn_h - 2, colr("colours.knob.fill")); v_rect("knob.shade", r[0], y + drawn_h - 1, drawn_w, 1, colr("colours.knob.shade"));
}

