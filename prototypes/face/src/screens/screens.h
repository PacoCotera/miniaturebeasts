/* The screens' binding tables (lvgl-switch.md §2.2): for the screen the props name, which words draw which regions, in draw order. */
#ifndef SCREENS_H
#define SCREENS_H
#include <stdint.h>
#include "../focus/focus.h"
/* The loader's refusals for a spec that names words (§2.3): a name plate without its series, or whose min or max is not a multiple of round. Returns 0, or -1 with the reason in err. */
int screens_vet_spec(const char *screen, char *err, int cap);
void pods_words(void);   /* Pods: the words of the state the props name (screens/pods.c) */
/* The focus context of Pods as its words drew it: the targets in the props' order with the boxes the words gave them. Returns the targets; 0 when the screen has none. */
int pods_focus(focus_target_t *out, int cap);
/* ---- the keys and the focus table (screens/screens.c) ----
   screens_key_graph: the whole of a key (`code`, the face's key codes) on a screen with a focus table. ✓, ← (unless opts.no_back) and the room keys say an intent on the focused target (`default_cur` when the props focus none; NULL: none). A direction moves the ring by
   the graph at `graph_path` in `spec`, over the targets `focus_fn` lists (`cap` as many as it is given), and says `focus` on the frame of the key. The ring stays and nothing is said when the move lands where it is,
   unless the key is a stepper key and opts.steps is set (then `intent` step:<up|down|left|right> on the focused target). `graph_path` or `focus_fn` NULL: the pad does nothing (the screen has no graph).
   Reads: the props' `focus.cur` (or the ring the last key moved), and with opts.resolve the props' `focus.resolve` (the host's answers to the graph's selectors); with opts.room_at the rect at that path in `spec`
   (where the ring is drawn from the graph's roomKey). Says: `intent` and `focus` through screens_say. */
typedef struct {
  int no_back;            /* 1: ← says nothing (Home is the top) */
  int resolve;            /* 1: the props' focus.resolve goes to the move */
  const char *room_at;    /* the spec path of the rect a move from the graph's roomKey starts at, or NULL */
  int steps;              /* 1: a stepper key says step:<key> on the focused target; 0: it says nothing */
} screens_keys_t;
typedef int (*screens_focus_fn)(focus_target_t *out, int cap);
void screens_key_graph(int code, const char *spec, const char *graph_path, screens_focus_fn focus_fn, const char *default_cur, const screens_keys_t *opts);
/* focus_fill: the target `t` of the props' list at `path` (a path to the list, "focus.targets"), entry `i`: its id, group, enabled (default 1) and index (default i) from the props, and `box` ({x, y, w, h}, NULL: zeros).
   A target whose box depends on its id is filled with NULL, its box found from t->id, and filled again with the box. Reads: the props at <path>.<i>.{id,group,enabled,index}. */
void focus_fill(focus_target_t *t, const char *path, int i, const int box[4]);
/* The props message `json` (len bytes) is the new truth for its screen: keep it as the spec "props" and draw the screen's words, the frame's after the screen's own. 0, or -1 with an error queued. */
int screens_props(const char *json, int len);
/* Draw the screen again from the props it holds (an event moved on, the focus moved). */
void screens_redraw(void);
/* A key pressed (the face's key codes): a direction moves the ring by the screen's graph and sends `focus`, or `intent` with step:<key> for a stepper key; ✓ ← and the room keys send `intent` on the
   focused target (lvgl-switch.md §2.6). Nothing when the screen has no words. */
void screens_key(int code);
/* Home (screens/home.c): its words, the targets as they drew them, its keys, and whether a step of the residents' walk is due at `now` */
void home_words(void);
void home_window(void);   /* Home's Vivarium window: the painting, the residents, the tag and the away frame (home.c) */
int home_window_painted(void);
void library_reset(void);   /* Home's Library module: its clock starts again when Home shows again (home_frame.c) */
int library_swap_pending(uint32_t now);   /* a breathing swap is due this frame: the residents do not step on it (home.c walk_clock) */
int library_tick(uint32_t now);   /* a breathing swap or a glint step is due: Home is drawn again (home.c home_tick) */
void vivarium_words(void);   /* the Vivarium's whole: the living window on vivarium.json, the bays along the foot (screens/home.c) */
int vivarium_focus(focus_target_t *out, int cap);
void vivarium_key(int code);
/* One mibi up close (screens/habitat.c): its words, the targets as they drew them, its keys */
void habitat_words(void);
int habitat_focus(focus_target_t *out, int cap);
void habitat_key(int code);
void habitat_hidden(void); int habitat_tick(uint32_t now); int habitat_test_cell(void); int habitat_test_lift(void);   /* up close with a moving set: its own 80 ms tick (Station M1 §2.4) */
/* The namer (screens/namer.c), an overlay: its words, its targets as they drew them (the props' list), its keys. `screens_overlay_known`: whether the face has a binding table for the overlay id */
void namer_words(void);
int namer_focus(focus_target_t *out, int cap);
void namer_key(int code);
/* The decision panel (screens/panel.c), an overlay the same way: its words, its targets as they drew them, its keys */
void panel_words(void);
int panel_focus(focus_target_t *out, int cap);
void panel_key(int code);
int screens_overlay_known(const char *id);
/* The Library spread (screens/library.c): its words, the frames as they drew them, its keys */
void library_words(void);
int library_focus(focus_target_t *out, int cap);
void library_key(int code);
/* The Probe bench (screens/bench.c): its words, the targets as they drew them, its keys */
void bench_words(void);
int bench_focus(focus_target_t *out, int cap);
void bench_key(int code);
void idle_words(void);   /* Idle: the living window's code on frame.json idle, and its line (screens/home.c) */
int home_focus(focus_target_t *out, int cap);
void home_key(int code);
int home_tick(uint32_t now);
int home_test_cell(int i); int home_test_state(int i); int home_test_mv(int i, int field); int home_test_nap(int i);   /* test hooks on the moving residents (M1 §2.3 item 11) */
/* Home's compositions (screens/home_builds.c): a module, the name tag, the rounded panel and a resident's waiting lamp */
void build_module(const char *spec, const char *key, int dy, const char *lamp);   /* the module of `spec`'s region `key` (a spec with "lamp": null has no lamp node) */
void build_nameTag(const char *spec, const char *glass, const char *name, const int box[4], int lift, int out[4]);   /* the name tag for the screen of `spec`, over its window region `glass` */
void build_nameTagAt(const char *spec, const char *glass, const char *name, int fx, int yBelow, int yOver, int forceOver, int out[4]);   /* the living window's name tag: centred on the feet point fx, top yBelow, or yOver when its bottom would pass 8 px inside the window or forceOver */
void build_roundPanel(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge);   /* a rounded panel: a nine-slice of a face-owned source, palette-exact (screens/home_builds.c) */
extern int g_tagSlot;   /* set while the name tag is a slot: its nodes wait with no size at the tag's own place */
extern int g_tagFlash;
extern int g_tagOver;   /* set while the name tag of a resident asleep in place is drawn: over its ink */   /* set while the name tag flashes (the namer saved a name) */
const char *home_lamp_pic(const char *state);   /* frame.json regions.marks.lamp12.<state>, the signed 12 × 12 lamp picture of a state */
void build_bayStrip(const char *spec, const char *cur, int box[4]);   /* the Vivarium's strip of bays (vivarium.json regions.strip, tiles); box: the focused tile's box, or zeros */
void build_waitingLamp(const char *id, int x, int y, int shown);
/* Cargo (screens/cargo.c): its words by the state the props name, and its keys */
void cargo_words(void);
void cargo_key(int code);
/* Create (screens/create.c): its words by the state the props name, its keys and its targets as the words drew them */
void create_words(void);
void create_key(int code);
int create_focus(focus_target_t *out, int cap);

/* The Incubator (screens/incubator.c): its words by the state the props name, and its keys (one subject: the room, no ring, no pad) */
void incubator_words(void);
void incubator_key(int code);
int incubator_tick(uint32_t now); int incubator_test_cell(void);   /* the hatch with a moving set (Station M1 §2.5) */
/* Home's walk starts again from the seeds the next time it shows (called when the screen drawn is another) */
void home_hidden(void);
/* An intent or a focus message for the screen of the props (kind "intent" with a verb, or "focus"). */
void screens_say(const char *kind, const char *target, const char *verb);
/* The clock moved to `now` (ms): 1 when the screen is to be drawn again for a step of its own (Home's residents walking). */
int screens_tick(uint32_t now);
#endif
