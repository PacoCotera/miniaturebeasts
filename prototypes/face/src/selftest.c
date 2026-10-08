/* A fixed scene for the build's own checks, sent through the same calls the page uses: rules, the three Inter sizes, a picture,
   a nine-slice ring and the creature's ellipse as a picture. The native Linux face and the WebAssembly face must draw the same
   pixels for it. The pictures are made here the way the page makes its own: whole-pixel masks decided by pixel-centre tests. */
#include "face.h"
#include "scene.h"
#include <string.h>

static void text(uint32_t id, const char *s, int x, int y, uint32_t rgb, int px, int cap) { strncpy(face_text(), s, (size_t)face_text_size() - 1); face_node(id, FN_TEXT, x, y, 0, 0, rgb, px, cap); }
/* a ring `width` thick: a rounded rectangle (radius r) or an ellipse, in one colour (B, G, R, A in memory) */
static int in_round(double px, double py, double x0, double y0, double x1, double y1, double r) {
  if (px < x0 || py < y0 || px > x1 || py > y1) return 0;
  double cx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px, cy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r;
}
static int in_ell(double px, double py, double x0, double y0, double x1, double y1) {
  double rx = (x1 - x0) / 2, ry = (y1 - y0) / 2; if (rx <= 0 || ry <= 0) return 0;
  return ((px - (x0 + rx)) / rx) * ((px - (x0 + rx)) / rx) + ((py - (y0 + ry)) / ry) * ((py - (y0 + ry)) / ry) <= 1;
}
static void ring(int handle, int w, int h, int width, int radius, int ellipse, uint32_t rgb) {
  uint8_t *p = face_asset(handle, w, h);
  for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
    double cx = x + 0.5, cy = y + 0.5;
    int outer = ellipse ? in_ell(cx, cy, 0, 0, w, h) : in_round(cx, cy, 0, 0, w, h, radius);
    int inner = ellipse ? in_ell(cx, cy, width, width, w - width, h - width) : in_round(cx, cy, width, width, w - width, h - width, radius > width ? radius - width : 0);
    uint8_t *q = p + (y * w + x) * 4;
    if (outer && !inner) { q[0] = (uint8_t)rgb; q[1] = (uint8_t)(rgb >> 8); q[2] = (uint8_t)(rgb >> 16); q[3] = 255; }
  }
}
void face_selftest_scene(void) {
  face_background(0x162a37);
  face_scene_begin();
  face_node(1, FN_RECT, 0, 0, 1024, 40, 0x162a37, 0, 0);
  face_node(2, FN_RECT, 0, 39, 1024, 1, 0x0c0a12, 0, 0);
  face_node(3, FN_RECT, 0, 40, 1024, 522, 0x142650, 0, 0);
  text(4, "Pods", 16, 10, 0xf1ebdf, 20, 15);
  text(5, "Identify \xc2\xb7 1 \xc2\xb7 \xe2\x86\x90 Home \xe2\x9c\x93 \xc3\x91" "and\xc3\xba 0123456789", 16, 100, 0xf1ebdf, 16, 12);
  text(6, "T12 Crate", 16, 140, 0xc6c4d8, 28, 20);
  ring(1, 20, 20, 2, 6, 0, 0xffe6ad);    /* 2 * 8 corners + 4 tiled pixels */
  face_node(7, FN_NINE, 100, 220, 200, 80, 0, 1, 8);
  ring(2, 176, 24, 2, 0, 1, 0xffe6ad);
  face_node(8, FN_SPRITE, 400, 300, 176, 24, 0, 2, 0);
  uint8_t *p = face_asset(0, 8, 8);
  for (int i = 0; i < 64; i++) { p[i * 4] = (uint8_t)(i * 37); p[i * 4 + 1] = (uint8_t)(i * 11); p[i * 4 + 2] = (uint8_t)(255 - i * 3); p[i * 4 + 3] = i % 5 ? 255 : 128; }
  face_node(9, FN_SPRITE, 600, 220, 8, 8, 0, 0, 0);
  face_scene_end();
}
