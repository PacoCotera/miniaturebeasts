#include "layout.h"
#include "../spec/spec.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void layout_plate_position(int maxWidth, int pad, int lead, int line, int centre, int bottom, int topOverFocal, int lines, int widest, const int *focal, int out[4]) {
  int w = widest + pad * 2; if (w > maxWidth) w = maxWidth;
  int h = lead + line * (lines > 1 ? lines : 1), x = centre - (w + 1) / 2, y = bottom - h;
  if (focal && focal[1] < y + h && y < focal[1] + focal[3] && focal[0] < x + w && x < focal[0] + focal[2]) y = topOverFocal;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
}

/* base + "." + key (+ "." + i): a path built by hand, so a path longer than the buffer is simply not found */
static void join(char *out, size_t cap, const char *base, const char *key, int i) {
  size_t n = strlen(base), k = strlen(key); out[0] = 0;
  if (n + k + 14 >= cap) return;
  memcpy(out, base, n); size_t o = n;
  if (k) { out[o++] = '.'; memcpy(out + o, key, k); o += k; }
  if (i >= 0) o += (size_t)sprintf(out + o, ".%d", i);
  out[o] = 0;
}
static int ip(const char *spec, const char *base, const char *key, int dflt) { char p[400]; join(p, sizeof p, base, key, -1); return p[0] ? spec_int(spec, p, dflt) : dflt; }
static int ia(const char *spec, const char *base, const char *key, int i, int dflt) { char p[400]; join(p, sizeof p, base, key, i); return p[0] ? spec_int(spec, p, dflt) : dflt; }

int layout_slant_at(int slant, int h, int r) { return (slant * (2 * r + 1)) / (2 * h); }

int layout_slant_tabs(const char *spec, const char *rail, int n, int open, int centred, layout_tab_t out[LAYOUT_TABS], int *run, int *x0) {
  int podsX = 0; char pods[24]; char p[400]; snprintf(p, sizeof p, "%s.pods.x", rail); int podsCentred = spec_str(spec, p, pods, sizeof pods) > 0 && strcmp(pods, "centred") == 0;
  if (!podsCentred) podsX = spec_int(spec, p, 0);
  int y = ip(spec, rail, "y", 0), h = ip(spec, rail, "h", 0), full = ip(spec, rail, "full", 0), compactW = ip(spec, rail, "compact", 0), slant = ip(spec, rail, "slant", 0), fullUpTo = ip(spec, rail, "fullUpTo", 0), max = ip(spec, rail, "max", 0);
  if (run) *run = 0; if (x0) *x0 = podsX;
  if (n <= 0) return 0;
  if (n > max || n > LAYOUT_TABS) return -1;
  int compact = n > fullUpTo, total = slant;
  for (int i = 0; i < n; i++) total += (!compact || i == open) ? full : compactW;
  int start = podsX;
  if (centred || podsCentred) {   /* floor((on - total / 2) / snap) * snap, on integers */
    int on = ip(spec, rail, "centred.on", 512), snap = ip(spec, rail, "centred.snap", 8), q = 2 * on - total, d = 2 * snap;
    start = (q >= 0 ? q / d : -((-q + d - 1) / d)) * snap;
  }
  int x = start;
  for (int i = 0; i < n; i++) { int w = (!compact || i == open) ? full : compactW; out[i].x = x; out[i].y = y; out[i].w = w; out[i].h = h; out[i].full = w == full; x += w; }
  if (run) *run = total; if (x0) *x0 = start;
  return n;
}

void layout_page_size(const char *spec, const char *page, int n, int out[2]) {
  char p[400]; snprintf(p, sizeof p, "%s.sizeByCount", page); int rows = spec_len(spec, p);
  if (rows < 0) { out[0] = ia(spec, page, "rect", 2, 0); out[1] = ia(spec, page, "rect", 3, 0); return; }
  int k = n < 1 ? 1 : n > rows ? rows : n; char key[420]; snprintf(key, sizeof key, "%s.%d", p, k);
  char q[460]; snprintf(q, sizeof q, "%s.0", key); out[0] = spec_int(spec, q, 0); snprintf(q, sizeof q, "%s.1", key); out[1] = spec_int(spec, q, 0);
}

int layout_page_grid(const char *spec, const char *page, int n, int cells[LAYOUT_CELLS][4], int pic[2]) { return layout_page_grid_at(spec, page, ia(spec, page, "rect", 0, 0), ia(spec, page, "rect", 1, 0), n, cells, pic); }
int layout_page_grid_at(const char *spec, const char *page, int px, int py, int n, int cells[LAYOUT_CELLS][4], int pic[2]) {
  char g[400]; snprintf(g, sizeof g, "%s.grid", page); int rows = spec_len(spec, g);
  pic[0] = pic[1] = 0;
  int found = -1; char key[48], val[8];
  for (int r = 0; r < rows && found < 0; r++) {
    spec_member(spec, g, r, key, sizeof key, val, sizeof val);
    char *dash = strchr(key, '-'); int a = atoi(key), b = dash ? atoi(dash + 1) : a;
    if (n >= a && n <= b) found = r;
  }
  if (found < 0 || n <= 0) return n > 0 ? -1 : 0;
  spec_member(spec, g, found, key, sizeof key, val, sizeof val);
  char row[460]; snprintf(row, sizeof row, "%s.%s", g, key);
  int have = 0; { char c[480]; snprintf(c, sizeof c, "%s.cells", row); have = spec_len(spec, c); }
  int count = n < have ? n : have; if (count > LAYOUT_CELLS) count = LAYOUT_CELLS;
  for (int i = 0; i < count; i++) {
    char c[480]; snprintf(c, sizeof c, "%s.cells.%d", row, i);
    char q[520]; snprintf(q, sizeof q, "%s.0", c); cells[i][0] = px + spec_int(spec, q, 0);
    snprintf(q, sizeof q, "%s.1", c); cells[i][1] = py + spec_int(spec, q, 0);
    snprintf(q, sizeof q, "%s.2", c); cells[i][2] = spec_int(spec, q, 0);
    snprintf(q, sizeof q, "%s.3", c); cells[i][3] = spec_int(spec, q, 0);
  }
  pic[0] = ia(spec, row, "picture", 0, 0); pic[1] = ia(spec, row, "picture", 1, 0);
  return count;
}

void layout_place_rect(const char *spec, const char *collection, int i, int out[4]) {
  char L[400]; snprintf(L, sizeof L, "%s.places", collection); int cols = ia(spec, L, "grid", 0, 1);
  out[0] = ia(spec, L, "first", 0, 0) + ia(spec, L, "pitch", 0, 0) * (i % cols); out[1] = ia(spec, L, "first", 1, 0) + ia(spec, L, "pitch", 1, 0) * (i / cols);
  out[2] = ia(spec, L, "first", 2, 0); out[3] = ia(spec, L, "first", 3, 0);
}
void layout_kin_rect(const char *spec, const char *kin, int i, int out[4]) {
  out[0] = ia(spec, kin, "first", 0, 0) + ia(spec, kin, "pitch", 0, 0) * i; out[1] = ia(spec, kin, "first", 1, 0) + ia(spec, kin, "pitch", 1, 0) * i;
  out[2] = ia(spec, kin, "first", 2, 0); out[3] = ia(spec, kin, "first", 3, 0);
}
int layout_plate_width(const char *spec, const char *name, int textWidth) {
  int mn = ip(spec, name, "plate.min", 0), mx = ip(spec, name, "plate.max", 0), pad = ip(spec, name, "plate.pad", 0), step = ip(spec, name, "plate.round", 1);
  int w = (textWidth + 2 * pad + step - 1) / step * step; if (w < mn) w = mn; if (w > mx) w = mx; return w;
}
int layout_stamp_cell(int n, int inner, int least) { int c = inner / (n + 2); return c < least ? least : c; }

int layout_eval(const char *rule, const char *spec, const char *path, const int *a, int na, int *out, int cap) {
  int k = 0;
#define PUSH(v) do { if (k < cap) out[k] = (v); k++; } while (0)
  if (strcmp(rule, "slantTabs") == 0 && na >= 3) {
    layout_tab_t t[LAYOUT_TABS]; int run, x0, n = layout_slant_tabs(spec, path, a[0], a[1], a[2], t, &run, &x0);
    PUSH(n < 0); PUSH(run); PUSH(x0); PUSH(n < 0 ? 0 : n);
    for (int i = 0; i < n; i++) { PUSH(t[i].x); PUSH(t[i].y); PUSH(t[i].w); PUSH(t[i].h); PUSH(t[i].full); }
  } else if (strcmp(rule, "slantAt") == 0 && na >= 1) {
    PUSH(layout_slant_at(ip(spec, path, "slant", 0), ip(spec, path, "h", 1), a[0]));
  } else if (strcmp(rule, "pageSize") == 0 && na >= 1) {
    int s[2]; layout_page_size(spec, path, a[0], s); PUSH(s[0]); PUSH(s[1]);
  } else if (strcmp(rule, "pageGrid") == 0 && na >= 1) {
    int c[LAYOUT_CELLS][4], pic[2], n = layout_page_grid(spec, path, a[0], c, pic);
    PUSH(n < 0); PUSH(n < 0 ? 0 : n); for (int i = 0; i < n; i++) for (int j = 0; j < 4; j++) PUSH(c[i][j]); PUSH(pic[0]); PUSH(pic[1]);
  } else if ((strcmp(rule, "placeRect") == 0 || strcmp(rule, "kinRect") == 0) && na >= 1) {
    int r[4]; if (rule[0] == 'p') layout_place_rect(spec, path, a[0], r); else layout_kin_rect(spec, path, a[0], r); for (int j = 0; j < 4; j++) PUSH(r[j]);
  } else if (strcmp(rule, "plateWidth") == 0 && na >= 1) {
    PUSH(layout_plate_width(spec, path, a[0]));
  } else if (strcmp(rule, "platePosition") == 0 && na >= 7) {
    int r[4], focal[4] = { a[3], a[4], a[5], a[6] };
    layout_plate_position(ip(spec, path, "maxWidth", 0), ip(spec, path, "pad", 0), ip(spec, path, "lead", 0), ip(spec, path, "line", 0), ip(spec, path, "centre", 0), ip(spec, path, "bottom", 0), ip(spec, path, "topOverFocal", 0), a[0], a[1], a[2] ? focal : NULL, r);
    for (int j = 0; j < 4; j++) PUSH(r[j]);
  } else if (strcmp(rule, "plateIndex") == 0 && na >= 1) {   /* the place of the width's id in the series, and the series' length */
    int w = layout_plate_width(spec, path, a[0]), mn = ip(spec, path, "plate.min", 0), mx = ip(spec, path, "plate.max", 0), st = ip(spec, path, "plate.round", 1);
    PUSH((w - mn) / st); PUSH((mx - mn) / st + 1);
  } else if (strcmp(rule, "stampCell") == 0 && na >= 3) {
    PUSH(layout_stamp_cell(a[0], a[1], a[2]));
  } else return -1;
#undef PUSH
  return k;
}

int layout_ease_io(int p) { return (int)((int64_t)p * p * (3000 - 2 * p) / 1000000); }
int layout_lerp(int a, int b, int e) { return a + (int)((int64_t)(b - a) * e / 1000); }
