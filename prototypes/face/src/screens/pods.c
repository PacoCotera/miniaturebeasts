/* Pods' binding table (lvgl-switch.md §2.2): the words that draw each of its states, in draw order, from the `pods` spec and the props' regions. The frame's words follow (screens.c). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <string.h>

void pods_words(void) {
  const char *state = v_pstr("state");
  word_bench();
  if (strcmp(state, "collection") == 0) word_list();
}
