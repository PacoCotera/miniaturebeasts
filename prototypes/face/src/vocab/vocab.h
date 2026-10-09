/* The words' toolbox (lvgl-switch.md §2.2): what every word of the vocabulary uses to put its primitives on the page, and nothing else. A word reads its region from the spec
   and its props from the props message by path, measures with the face's own Inter, and emits prim nodes in draw order, each tagged with the region it belongs to.
   It never reads the save, never measures from outside and never decides content. A colour is a palette name; a name the palette lacks is an error the host sees (a word that
   draws with an unknown colour has no right to draw). */
#ifndef VOCAB_H
#define VOCAB_H
#include <stdint.h>
#define V_STR 256            /* the longest string a word handles */
#define V_ALIGN_LEFT 0
#define V_ALIGN_CENTRE 1
#define V_ALIGN_RIGHT 2
uint32_t v_id(const char *s);                          /* the node id: FNV-1a of the id string (the page's hash) */
void v_region(const char *region, int layer);          /* every node from now on carries this region and layer */
void v_layer(int layer);                               /* the same region, another layer */
uint32_t v_col(const char *name);                      /* a palette colour by name (0 and an error when the palette has none) */
int v_cap(int px);                                     /* Inter's cap height at 16, 20, 28 px: 12, 14, 21 */
int v_measure(const char *s, int px);                  /* the width of a string at px */
void v_rect(const char *id, int x, int y, int w, int h, const char *colour);
/* One string of Inter, the cap top on y. */
void v_text(const char *id, const char *s, int x, int y, int w, int px, const char *colour);
/* A picture placed 1:1 by its asset id; 1 when it was drawn, 0 when the host has not sent it (a mark whose master is not placed draws nothing and the layout does not move). */
int v_sprite(const char *id, const char *asset, int x, int y, int w, int h);
/* A run: text pieces and the material icons inline (⚡ ◆ ❀ ✕ as 16 px sprites, 2 px either side), laid left to right; align moves the whole run about x. */
typedef struct { int width, end; } v_run_t;
int v_run_width(const char *s, int px);
v_run_t v_run(const char *id, const char *s, int x, int y, int px, const char *colour, int align);
/* Words wrapped to a width; the lines are written NUL-separated into buf and their count returned (at most max). */
int v_wrap(const char *s, int maxw, int px, char *buf, int cap, int max);
/* A string cut to a width with an ellipsis. */
void v_clip(const char *s, int maxw, int px, char *out, int cap);
/* A fixed rectangle of the spec, [x, y, w, h], at a path of the frame spec; 0 when it is not a 4-array. */
int v_spec_rect(const char *screen, const char *path, int r[4]);
void v_error(const char *what);
/* The screen's focal box (the message plate keeps off it): set by the screen's words, cleared at the start of each draw. NULL when the screen has none. */
void v_set_focal(const int box[4]);
/* The focused target: the props' focus.cur, or the id the face moved the ring to on a key since (cleared when new props arrive). */
void v_focus_set(const char *id);
const char *v_focus_cur(void);
const int *v_focal(void);
int v_fdiv(int a, int b);                              /* floor(a / b) for b > 0, as Math.floor does */
int v_half(int a);                                     /* Math.round(a / 2) on an integer: floor((a + 1) / 2) */
/* An id built from a printf format (ids of nodes and pictures). */
const char *v_fmt(const char *fmt, ...);
/* props reads: the string at a path of the props (copied to a ring of 32 static buffers: valid for the next 31 calls, copy what must live longer; "" when absent) */
const char *v_pstr(const char *path);
int v_pint(const char *path, int dflt);
int v_pbool(const char *path, int dflt);
int v_plen(const char *path);
#endif
