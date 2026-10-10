/* The screens' binding tables (lvgl-switch.md §2.2): for the screen the props name, which words draw which regions, in draw order. */
#ifndef SCREENS_H
#define SCREENS_H
#include <stdint.h>
#include "../focus/focus.h"
/* The loader's refusals for a spec that names words (§2.3): a name plate without its series, or whose min or max is not a multiple of round. Returns 0, or -1 with the reason in err. */
int screens_vet_spec(const char *screen, char *err, int cap);
void pods_words(void);   /* Pods: the words of the state the props name (screens/pods.c) */
/* The focus context of Pods as its words drew it: the targets in the props' order with the boxes the words gave them, and the key of the state's graph in the spec's `focus` ("collection", "overview",
   "chapter", "compare"). Returns the targets; 0 when the screen has none. */
int pods_focus(focus_target_t *out, int cap, char *graph_key, int gcap);
/* The props message `json` (len bytes) is the new truth for its screen: keep it as the spec "props" and draw the screen's words, the frame's after the screen's own. 0, or -1 with an error queued. */
int screens_props(const char *json, int len);
/* Draw the screen again from the props it holds (an event moved on, the focus moved). */
void screens_redraw(void);
/* A key pressed (the face's key codes): a direction moves the ring by the screen's graph and sends `focus`, or `intent` with step:<key> for a stepper key; ✓ ← and the room keys send `intent` on the
   focused target (lvgl-switch.md §2.6). Nothing when the screen has no words. */
void screens_key(int code);
/* Home (screens/home.c): its words, the targets as they drew them, its keys, and whether a step of the residents' walk is due at `now` */
void home_words(void);
int home_focus(focus_target_t *out, int cap, char *graph_key, int gcap);
void home_key(int code);
int home_tick(uint32_t now);
/* Home's compositions (screens/home_builds.c): a module of the column, the name tag, the rest knob and a resident's waiting lamp */
void build_module(const char *key, int dy, const char *lamp);
void build_nameTag(const char *name, const int box[4], int lift, int out[4]);
void build_restKnob(int focused);
void build_waitingLamp(const char *id, int x, int y, int shown);
/* Home's walk starts again from the seeds the next time it shows (called when the screen drawn is another) */
void home_hidden(void);
/* An intent or a focus message for the screen of the props (kind "intent" with a verb, or "focus"). */
void screens_say(const char *kind, const char *target, const char *verb);
/* The clock moved to `now` (ms): 1 when the screen is to be drawn again for a step of its own (Home's residents walking). */
int screens_tick(uint32_t now);
#endif
