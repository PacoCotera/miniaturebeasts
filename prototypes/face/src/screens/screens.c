#include "screens.h"
#include "../vocab/words.h"
#include "../vocab/vocab.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <string.h>

/* Which screens the face draws with words. A screen not in the list is still drawn by the page's scene nodes (face-lvgl.mjs). */
static void frame_words(void) {
  if (spec_bool("props", "idle", 0)) return;                 /* Idle is the whole 1024x600: no top bar, no bottom line, no plate */
  if (spec_len("props", "frame.top") >= 0) word_topBar();
  if (spec_len("props", "frame.line") >= 0) word_bottomLine();
  if (spec_len("props", "frame.plate") >= 0) word_messagePlate();
}
int screens_props(const char *json, int len) {
  if (spec_load("props", json, (size_t)len) < 0) { wire_error(spec_error()); return -1; }
  if (!spec_has("frame")) { wire_error("props: the frame spec has not been sent"); return -1; }
  prim_begin();
  frame_words();
  prim_end();
  wire_changed();
  return 0;
}
