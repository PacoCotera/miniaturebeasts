/* Pods' binding table (lvgl-switch.md §2.2): the words that draw each of its states, in draw order, from the `pods` spec and the props' regions. The frame's words follow (screens.c). */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include <string.h>
#include <stdio.h>

void pods_words(void) {
  char state[24]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  word_bench();
  if (strcmp(state, "collection") == 0) word_list();
  else if (strcmp(state, "overview") == 0 || strcmp(state, "chapter") == 0) {
    const char *base = strcmp(state, "overview") == 0 ? "regions.overview" : "regions.chapter";
    word_specimen(base);
    if (strcmp(state, "overview") == 0) { word_kin(base); word_stamp(base); }
    word_rail();
  }
}
