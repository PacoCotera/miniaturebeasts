/* The spec's derived rules (lvgl-switch.md §2.3 item 4): pure integer functions of the spec's numbers and the counts from props, the closed list of station-layouts.md. Two independent
   implementations of each (this, and prototypes/ui/specs/derive.mjs) are checked against each other on shared vectors (tests/vectors/layout.json, run by face_test and layout.test.mjs)
   and on every capture. A rule reads the spec it is given by path, exactly as the JavaScript reads the same object. */
#ifndef LAYOUT_H
#define LAYOUT_H
/* The message plate: w = min(maxWidth, ceil(widest) + 2 pad), h = lead + line * max(1, lines), centred on `centre`, its bottom edge at `bottom`, or its top at `topOverFocal` when that
   would cover the focal box (focal: x, y, w, h, or NULL). out: x, y, w, h. */
void layout_plate_position(int maxWidth, int pad, int lead, int line, int centre, int bottom, int topOverFocal, int lines, int widest, const int *focal, int out[4]);

#define LAYOUT_TABS 12
typedef struct { int x, y, w, h, full; } layout_tab_t;
/* The slanted chapter rail (the spec's rail at `rail`): n tabs, the open one full when the rail is compact; the run starts at rail.pods.x, or centred on rail.centred.on and snapped down to the
   grid when `centred` or rail.pods.x is "centred". Returns the tabs placed (0 for n <= 0), or -1 when n is over rail.max (the UI designer's). run and x0 are set when not NULL. */
int layout_slant_tabs(const char *spec, const char *rail, int n, int open, int centred, layout_tab_t out[LAYOUT_TABS], int *run, int *x0);
/* The pixel columns a slanted side has shifted right by at row r: floor(slant * (r + 0.5) / h). */
int layout_slant_at(int slant, int h, int r);
/* The chapter page's size by its trait count: page.sizeByCount (n clamped to the table), else the page rect's own size. */
void layout_page_size(const char *spec, const char *page, int n, int out[2]);
#define LAYOUT_CELLS 8
/* The page's grid by trait count (page.grid, keys "1", "2", "3-4"): the cells at the page's origin and the picture size. Returns the cells (0 for n <= 0), or -1 when no row holds n. */
int layout_page_grid(const char *spec, const char *page, int n, int cells[LAYOUT_CELLS][4], int pic[2]);
/* The same with the page's origin given (Compare's second page uses the first page's grid at its own rectangle). */
int layout_page_grid_at(const char *spec, const char *page, int px, int py, int n, int cells[LAYOUT_CELLS][4], int pic[2]);
/* A rack place (collection.places) and a kin ring (a kin region): the template offset by the pitch. */
void layout_place_rect(const char *spec, const char *collection, int i, int out[4]);
void layout_kin_rect(const char *spec, const char *kin, int i, int out[4]);
/* The name plate's width: the text's width and its padding, rounded up to the step, between the least and the most (name.plate.min, max, pad, round). */
int layout_plate_width(const char *spec, const char *name, int textWidth);
/* The stamp's cell: floor(inner / (N + 2)), never less than `least`. */
int layout_stamp_cell(int n, int inner, int least);
#define LAYOUT_LEAVES 40
/* The Incubator's leaves on their arcs (the leaves region at `region`, rule leafArc): n leaves fill the inner arc first, left to right, then the outer; the k leaves of a run take the slots perArc - k + 2j (j = 0 .. k - 1) of the arc's table of
   2 perArc - 1 places, so every run is centred on the top. out: the boxes x, y, w, h in fill order. Returns n, or -1 when n is below 0 or over 2 perArc. */
int layout_leaf_arc(const char *spec, const char *region, int n, int out[LAYOUT_LEAVES][4]);
/* The vectors' interface: a rule by name with integer arguments, its answer flattened to integers (see tests/vectors/layout.json). Returns the count, or -1 for an unknown rule. */
int layout_eval(const char *rule, const char *spec, const char *path, const int *args, int nargs, int *out, int cap);
#endif
