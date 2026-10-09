/* The focus graph (lvgl-switch.md §2.6, §2.6.1): the pad moves one ring between targets by the spec's graph. This is the C port of prototypes/ui/focus.mjs; both give the same id for every
   vector in tests/vectors/focus.json. The graph of one state is parsed once (refusals at load); a move takes the targets as the view listed them (present, in order), the view's answers to
   the selectors, and the boxes the words drew. Integers only: centres are taken doubled, (2x + w, 2y + h). */
#ifndef FOCUS_H
#define FOCUS_H
#include <stddef.h>
#define FOCUS_ID 48
#define FOCUS_UP 0
#define FOCUS_DOWN 1
#define FOCUS_LEFT 2
#define FOCUS_RIGHT 3
typedef struct focus_graph focus_graph_t;
typedef struct { char id[FOCUS_ID]; char group[32]; int index; int enabled; int x, y, w, h; } focus_target_t;   /* group "" : the id up to its first "." */
typedef struct { char sel[32]; char id[FOCUS_ID]; } focus_resolve_t;   /* id "": the view found nothing (null) */
/* Parse one state's graph (a JSON object). NULL, with the reason in err, when the graph is refused: an empty list, "none" before the last entry, a list inside a list, an unknown key in a
   nearestIn object, a nearestIn without its group, a group with both order and axis, an edge that is not a name, a selector, none, a nearestIn object or a list. */
focus_graph_t *focus_graph_parse(const char *json, int len, char *err, int errcap);
void focus_graph_free(focus_graph_t *g);
/* The id the ring lands on for `dir` from `cur` (copied into out), the current id when it stays. roomAt: {x, y, w, h} or NULL (the origin when the focus is the graph's roomKey). */
/* The same move; 1 when the key is a stepper key of the focused group (the ring stays, out is cur, and the face sends intent step:<key>), else 0. */
int focus_move(const focus_graph_t *g, const focus_target_t *targets, int n, const char *cur, int dir, const focus_resolve_t *resolve, int nresolve, const int *roomAt, char *out, int cap);
void focus_next(const focus_graph_t *g, const focus_target_t *targets, int n, const char *cur, int dir, const focus_resolve_t *resolve, int nresolve, const int *roomAt, char *out, int cap);
#endif
