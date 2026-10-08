/* A fixed scene for the build's own checks: rules, the three Inter sizes, both rings and a picture, sent through the same calls the page uses.
   The native Linux face and the WebAssembly face must draw the same pixels for it. */
#include "face.h"
#include "scene.h"
#include <string.h>

static void text(uint32_t id, const char *s, int x, int y, uint32_t rgb, int px, int cap) { strncpy(face_text(), s, (size_t)face_text_size() - 1); face_node(id, FN_TEXT, x, y, 0, 0, rgb, px, cap); }
void face_selftest_scene(void) {
  face_scene_begin();
  face_node(1, FN_RECT, 0, 0, 1024, 40, 0x162a37, 0, 0);
  face_node(2, FN_RECT, 0, 39, 1024, 1, 0x0c0a12, 0, 0);
  face_node(3, FN_RECT, 0, 40, 1024, 522, 0x142650, 0, 0);
  text(4, "Pods", 16, 10, 0xf1ebdf, 20, 15);
  text(5, "Identify \xc2\xb7 1 \xc2\xb7 \xe2\x86\x90 Home \xe2\x9c\x93 \xc3\x91" "and\xc3\xba 0123456789", 16, 100, 0xf1ebdf, 16, 12);
  text(6, "T12 Crate", 16, 140, 0xc6c4d8, 28, 20);
  face_node(7, FN_RING, 100, 220, 200, 80, 0xffe6ad, 2, 6);
  face_node(8, FN_FEET, 400, 300, 160, 24, 0xffe6ad, 2, 0);
  uint8_t *p = face_asset(0, 8, 8);
  for (int i = 0; i < 64; i++) { p[i * 4] = (uint8_t)(i * 37); p[i * 4 + 1] = (uint8_t)(i * 11); p[i * 4 + 2] = (uint8_t)(255 - i * 3); p[i * 4 + 3] = i % 5 ? 255 : 128; }
  face_node(9, FN_SPRITE, 600, 220, 8, 8, 0, 0, 0);
  face_scene_end();
}
