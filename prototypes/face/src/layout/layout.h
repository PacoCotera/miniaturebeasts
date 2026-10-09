/* The spec's derived rules (lvgl-switch.md §2.3 item 4): pure integer functions of the spec's numbers and the counts from props, the closed list of station-layouts.md. Two independent
   implementations of each (this and prototypes/ui/specs/derive.mjs) are checked against each other on shared vectors (tests/vectors/layout.json) and on every capture. */
#ifndef LAYOUT_H
#define LAYOUT_H
/* The message plate: w = min(maxWidth, ceil(widest) + 2 pad), h = lead + line * max(1, lines), centred on `centre`, its bottom edge at `bottom`, or its top at `topOverFocal` when that
   would cover the focal box (focal: x, y, w, h, or NULL). out: x, y, w, h. */
void layout_plate_position(int maxWidth, int pad, int lead, int line, int centre, int bottom, int topOverFocal, int lines, int widest, const int *focal, int out[4]);
#endif
