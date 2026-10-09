#include "layout.h"

void layout_plate_position(int maxWidth, int pad, int lead, int line, int centre, int bottom, int topOverFocal, int lines, int widest, const int *focal, int out[4]) {
  int w = widest + pad * 2; if (w > maxWidth) w = maxWidth;
  int h = lead + line * (lines > 1 ? lines : 1), x = centre - (w + 1) / 2, y = bottom - h;
  if (focal && focal[1] < y + h && y < focal[1] + focal[3] && focal[0] < x + w && x < focal[0] + focal[2]) y = topOverFocal;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
}
