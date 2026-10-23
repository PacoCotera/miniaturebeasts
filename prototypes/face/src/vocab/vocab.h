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
void v_name(const char *region);                       /* the same, for a region of pictures only: a sprite or nine-slice takes its layer from its asset, the word chooses none */
void v_layer(int layer);                               /* the same region, another layer */
uint32_t v_col(const char *name);                      /* a palette colour by name (0 and an error when the palette has none) */
int v_cap(int px);                                     /* Inter's cap height at 16, 20, 28 px: 12, 14, 21 */
int v_measure(const char *s, int px);                  /* the width of a string at px */
void v_rect(const char *id, int x, int y, int w, int h, const char *colour);
/* One string of Inter, the cap top on y. */
void v_text(const char *id, const char *s, int x, int y, int w, int px, const char *colour);
/* A name plate of the series the spec names (`<path>.plate.series`), the width the face chose, shown 1:1; the host sends the whole series at boot. A plate that is not on the face is an error and a refused node. */
void v_plate(const char *id, const char *namePath, int w, int x, int y);
void v_plate_in(const char *spec, const char *id, const char *namePath, int w, int x, int y);   /* v_plate with the spec that names the plate series (Pods: "pods"; Create's tag: "create") */
int v_silhouette_box(const char *from, const char *to, int out[4]);   /* the pictures' boxes by id: 0, or -1 when either is not on the face or they differ in size (prim.h) */
int v_change_box(const char *from, const char *to, int out[4]);
/* A picture placed 1:1 by its asset id; 1 when it was drawn, 0 when the host has not sent it (a mark whose master is not placed draws nothing and the layout does not move). */
int v_sprite(const char *id, const char *asset, int x, int y, int w, int h);
int v_asset_size(const char *asset, int out[2]);   /* a picture's own size: 0, or -1 when the host has not sent it (a word that places a picture at its own size, 1:1) */
int v_sprite_window(const char *id, const char *asset, int sx, int sy, int x, int y, int w, int h);   /* a w x h window of a larger picture, its source origin (sx, sy), drawn 1:1 at (x, y): 0 when the asset was not sent; at (0, 0) it is v_sprite */
/* The same picture's node with no size: a slot kept for a step that has not come, so showing it later never adds a node and never changes the order of the screen's nodes (§2.2). 1 when the node was sent, 0 when the host has not sent the picture. */
int v_sprite_hidden(const char *id, const char *asset, int x, int y);
/* ---- K1: the spec accessors, the composed node and the picture-or-slot (UI kit K1, section 3.1) ---- */
/* v_si / v_sk / v_srect / v_scol: a screen's or word's reads of a spec by dotted path; each replaces a file's private copy.
   v_si(spec, path, d): the integer at `path` of the spec `spec` ("home", "frame", ...), d when absent or not a number. Reads the spec only; draws nothing; no node.
   v_sk(spec, base, k): the integer at "<base>.<k>" (an array element or a numbered key), 0 when absent. Reads the spec only; no node.
   v_srect(spec, path, r): the [x, y, w, h] at `path` into r; all four 0 when it is not a 4-array. Reads the spec only; no node.
   v_scol(spec, path): the string at `path` (a palette name; "" when absent), copied to a ring of 16 buffers of 24 bytes, valid for the next 15 calls. Reads the spec only; no node.
   v_scol_or(spec, path, d): v_scol, but `d` when the string is absent or "" (copied to a ring of 16 buffers of 24 bytes, valid for the next 15 calls). Reads the spec only; no node.
   v_token(spec, name): a colour role: the string at "colours.<name>" of the spec, else `name` itself (a palette name as written); v_scol_or(spec, "colours.<name>", name). Reads the spec only; no node.
   v_sstr(spec, path): the string at `path` ("" when absent; a picture id, a template), copied to a ring of 16 buffers of 96 bytes (the size of an id on the wire), valid for the next 15 calls. Reads the spec only; no node. */
int v_si(const char *spec, const char *path, int d);
int v_sk(const char *spec, const char *base, int k);
void v_srect(const char *spec, const char *path, int r[4]);
const char *v_scol(const char *spec, const char *path);
const char *v_scol_or(const char *spec, const char *path, const char *d);
const char *v_token(const char *spec, const char *name);
const char *v_sstr(const char *spec, const char *path);
/* v_composed(id, x, y, w, h, ops): one composed picture of the ops string (the JSON ops list of prim.h) at (x, y), w x h, in the current region and layer. Reads nothing; node id v_id(id), one node, always sent; returns void. `ops` may be the prim_ops() buffer itself (a caller that wrote its ops there). */
/* `ops` must not be NULL. */
void v_composed(const char *id, int x, int y, int w, int h, const char *ops);
/* v_slot(id, asset, fallback, x, y, w, h, shown): a picture, else the same node with no size, so showing it later never adds a node or changes the order of the screen's nodes (section 2.2).
   Reads the host's pictures (the picture table): "has" means one thing, the picture's id is not empty and the host has sent it. When `shown` and the host has sent `asset`, a 1:1 sprite of w x h at (x, y), return 1.
   Otherwise the node of no size at (x, y) over `fallback` (over `asset` when fallback is NULL or empty), return 0; when the host has sent neither, no node is made (as v_sprite and v_sprite_hidden alone).
   Node id: v_id(id), at most one. The region and layer are the caller's (v_name / v_region). */
int v_slot(const char *id, const char *asset, const char *fallback, int x, int y, int w, int h, int shown);
/* v_slot_at(id, asset, fallback, x, y, w, h, shown, hx, hy): v_slot with the zero-size node at (hx, hy) instead of (x, y), for a slot whose hidden node has always sat elsewhere than its picture.
   Reads the host's pictures; "has" as v_slot. When `shown` and the host has sent `asset`: a 1:1 sprite of w x h at (x, y), return 1. Otherwise the node of no size at (hx, hy) over `fallback`
   (over `asset` when fallback is NULL or empty: with an empty fallback and a sent asset the hidden node is the asset itself), return 0; when the host has sent neither, no node.
   Node id: v_id(id), at most one. The region and layer are the caller's. */
int v_slot_at(const char *id, const char *asset, const char *fallback, int x, int y, int w, int h, int shown, int hx, int hy);
/* A picture nine-sliced over a w x h box: the asset's own insets and tile when the host sent them (a `slice`), else the insets l, t, r, b given; 0 when the host has not sent it. */
int v_nine(const char *id, const char *asset, int x, int y, int w, int h, const int insets[4]);
/* A cross-dither between two pictures of one size (a `dither` event's frame, lvgl-switch.md §2.7): the pixels of `toAsset` where the Bayer cell at the screen position is below `level` (0..16), else those of `fromAsset`, one composed picture at (x, y), on the layer of `toAsset`. 1 when drawn, 0 when the host has not sent one of them. */
int v_dither(const char *id, const char *fromAsset, const char *toAsset, int level, int x, int y, int w, int h);
/* The same between two w x h windows (atlas cells, M1 §2.1): `fromAsset`'s at (fsx, fsy) and `toAsset`'s at (tsx, tsy); `fromAsset` NULL or "" is clear (a dither-in), `toAsset` NULL or "" is clear (a dither-out, keeping the pixels a dither-in at the same level leaves); never both. */
int v_dither_window(const char *id, const char *fromAsset, int fsx, int fsy, const char *toAsset, int tsx, int tsy, int level, int x, int y, int w, int h);
/* Where a line of text is anchored: the y given to v_cap_top, v_line_at and v_line_in names one of the line's rows, and the word turns it into the cap top the node is drawn at. */
#define V_ANCHOR_LINE 0   /* y is the line box's top: cap top = y + v_fdiv(pitch - cap, 2), pitch = frame type.pitch.<px> */
#define V_ANCHOR_CAP  1   /* y is the cap top */
#define V_ANCHOR_BASE 2   /* y is the baseline: cap top = y - cap */
#define V_ANCHOR_MID  3   /* y is the cap's middle: cap top = y - v_fdiv(cap, 2) */
/* v_cap_top(y, anchor, px): the cap top of a line of Inter at px whose anchor row is at y, the one rule for it (cap = v_cap(px)). Only V_ANCHOR_LINE needs the frame's type.pitch.<px> (16: 20, 20: 28, 28: 36); a px with none is refused with an error and y is returned.
   The other anchors take any px. Reads: the frame spec only. Draws no node. */
int v_cap_top(int y, int anchor, int px);
/* v_cap_in(top, h, px): the cap top of a line of Inter at px centred in a box h tall whose top is `top`: top + v_fdiv(h - v_cap(px), 2) (the floor, so the same box and px always give the same row; a cap taller than the box gives a row above it). Any px. Reads nothing, draws nothing. The one rule for text centred in the box of the art it sits on (a plate, a ribbon, a tab, an icon), to be given to v_line_at or v_line_in with V_ANCHOR_CAP. */
int v_cap_in(int top, int h, int px);
/* v_line_at(id, s, x, y, anchor, px, colour, align): a string of Inter at px as one text node `id`, its cap top v_cap_top(y, anchor, px). align: V_ALIGN_LEFT puts the line's left edge at x, V_ALIGN_CENTRE centres it on x (the left edge is x - v_half(width)),
   V_ALIGN_RIGHT ends it at x. V_ANCHOR_LINE with a px that has no type.pitch is refused with an error and nothing is drawn (returns 0). Region and layer: the caller's. Node id: v_id(id), one node, with the width of the string (no size when s is ""). Returns the width. */
int v_line_at(const char *id, const char *s, int x, int y, int anchor, int px, const char *colour, int align);
/* v_line_in(id, s, bx, bw, y, anchor, px, colour): the same, centred in the box [bx, bx + bw): the left edge is bx + v_half(bw - width) (the box form V_ALIGN_CENTRE cannot fold). Returns the width. */
int v_line_in(const char *id, const char *s, int bx, int bw, int y, int anchor, int px, const char *colour);
/* A run: text pieces and the material icons inline (⚡ ◆ ❀ ✕ ⧗ as 16 px sprites, 2 px either side), laid left to right; align moves the whole run about x. */
typedef struct { int width, end; } v_run_t;
int v_run_width(const char *s, int px);
v_run_t v_run(const char *id, const char *s, int x, int y, int px, const char *colour, int align);
/* A price run with stable nodes: Energy, Essence, Data and the bud's wait (⧗, icon-wait-16) each have an icon and a figure node (no size when the price does not name it); `cols` is the figure's colour for each, `other` the colour of a price with no group ("free"). Returns the end x. */
#define V_PRICE_N 4   /* the groups of a price, a closed table (vocab.c PRICE): ⚡ ❀ ◆ ⧗ */
int v_price(const char *id, const char *s, int x, int y, int px, const char *cols[V_PRICE_N], const char *other);
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
const char *v_focus_cur_at(const char *path);          /* the same where the ring is not the screen's (an overlay's: "overlay.focus.cur") */
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
