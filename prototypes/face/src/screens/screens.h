/* The screens' binding tables (lvgl-switch.md §2.2): for the screen the props name, which words draw which regions, in draw order. */
#ifndef SCREENS_H
#define SCREENS_H
#include "../focus/focus.h"
void pods_words(void);   /* Pods: the words of the state the props name (screens/pods.c) */
/* The focus context of Pods as its words drew it: the targets in the props' order with the boxes the words gave them, and the key of the state's graph in the spec's `focus` ("collection", "overview",
   "chapter", "compare"). Returns the targets; 0 when the screen has none. */
int pods_focus(focus_target_t *out, int cap, char *graph_key, int gcap);
/* The props message `json` (len bytes) is the new truth for its screen: keep it as the spec "props" and draw the screen's words, the frame's after the screen's own. 0, or -1 with an error queued. */
int screens_props(const char *json, int len);
/* A key pressed (the face's key codes): a direction moves the ring by the screen's graph and sends `focus`, or `intent` with step:<key> for a stepper key; ✓ ← and the room keys send `intent` on the
   focused target (lvgl-switch.md §2.6). Nothing when the screen has no words. */
void screens_key(int code);
#endif
