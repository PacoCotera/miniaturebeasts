#include "ring.h"

typedef int64_t i64;
/* inR(x0, y0, x1, y1, r) on the doubled centre (X, Y) */
static int in_round(i64 X, i64 Y, i64 x0, i64 y0, i64 x1, i64 y1, i64 r) {
  i64 R = 2 * r;
  if (X < 2 * x0 || Y < 2 * y0 || X > 2 * x1 || Y > 2 * y1) return 0;
  i64 cx = X < 2 * x0 + R ? 2 * x0 + R : X > 2 * x1 - R ? 2 * x1 - R : X;
  i64 cy = Y < 2 * y0 + R ? 2 * y0 + R : Y > 2 * y1 - R ? 2 * y1 - R : Y;
  return (X - cx) * (X - cx) + (Y - cy) * (Y - cy) <= R * R;
}
static int in_ell(i64 X, i64 Y, i64 x0, i64 y0, i64 x1, i64 y1) {
  i64 A = x1 - x0, B = y1 - y0; if (A <= 0 || B <= 0) return 0;
  i64 dx = X - (x0 + x1), dy = Y - (y0 + y1);
  return dx * dx * B * B + dy * dy * A * A <= A * A * B * B;
}
int ring_mask(uint8_t *m, int w, int h, int width, int radius, int ellipse) {
  if (w < 1 || h < 1 || width < 1 || radius < 0 || (ellipse && radius != 0)) return -1;
  for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
    i64 X = 2 * i + 1, Y = 2 * j + 1; int on;
    if (ellipse) on = in_ell(X, Y, 0, 0, w, h) && !in_ell(X, Y, width, width, w - width, h - width);
    else { i64 ri = radius - width > 0 ? radius - width : 0; on = in_round(X, Y, 0, 0, w, h, radius) && !in_round(X, Y, width, width, w - width, h - width, ri); }
    m[j * w + i] = on ? 255 : 0;
  }
  return 0;
}
int ring_tab_w(const ring_tab_t *t) { return t->body + 2 * t->outside + t->slant; }
int ring_tab_h(const ring_tab_t *t) { return t->bottom - t->top; }
static i64 clamp(i64 v, i64 lo, i64 hi) { return v < lo ? lo : v > hi ? hi : v; }
static int tab_inside(const ring_tab_t *t, i64 W, i64 T, i64 X, i64 Y, i64 inset, i64 rr) {
  if (Y < 2 * (t->top + inset) || Y > 2 * (t->bottom - inset)) return 0;
  i64 XS = X * T, C = clamp(Y - 2 * (i64)t->tabTop, 0, 2 * T);
  i64 L = t->slant * C + 2 * T * inset, Rt = 2 * T * (W - t->slant) + t->slant * C - 2 * T * inset, yc = t->bottom - inset - rr;
  if (rr > 0 && Y > 2 * yc) {
    i64 c2 = 2 * t->slant * clamp(yc - t->tabTop, 0, T), CL = c2 + 2 * T * (inset + rr), CR = 2 * T * (W - t->slant) + c2 - 2 * T * (inset + rr), D = T * (Y - 2 * yc), lim = (2 * T * rr) * (2 * T * rr);
    if (XS < CL) return (XS - CL) * (XS - CL) + D * D <= lim;
    if (XS > CR) return (XS - CR) * (XS - CR) + D * D <= lim;
  }
  return L <= XS && XS <= Rt;
}
int ring_tab_mask(uint8_t *m, const ring_tab_t *t) {
  i64 T = (i64)t->slantTo - t->tabTop;
  if (t->body < 1 || t->slant < 0 || t->outside < 0 || T <= 0 || t->bottom < t->slantTo || t->top >= t->bottom || t->width < 1 || t->radius < 0) return -1;
  int W = ring_tab_w(t), H = ring_tab_h(t); i64 ri = t->radius - t->width > 0 ? t->radius - t->width : 0;
  for (int r = 0; r < H; r++) for (int c = 0; c < W; c++) {
    i64 X = 2 * c + 1, Y = 2 * ((i64)t->top + r) + 1;
    m[r * W + c] = tab_inside(t, W, T, X, Y, 0, t->radius) && !tab_inside(t, W, T, X, Y, t->width, ri) ? 255 : 0;
  }
  return 0;
}
