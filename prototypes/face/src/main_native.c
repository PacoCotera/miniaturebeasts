/* The native Linux build of the face (the Pi's face, and the debugger's build): the same face.c, driven headless for a
   few frames, then its framebuffer written as a PPM and its hash printed. The sandbox's WebAssembly build must print the
   same hash for the same drawing. */
#include "face.h"
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
  face_init();
  face_selftest_scene();
  for (uint32_t t = 0; t < 4; t++) face_frame(t * 16);
  face_key(17, 1); face_key(17, 0); face_frame(80);
  printf("%s %dx%d hash=%08x dirty=%d keys=%d last=%d\n", face_version(), face_width(), face_height(), face_hash(), face_dirty_count(), face_key_count(), face_last_key());
  if (argc > 1) {
    FILE *f = fopen(argv[1], "wb");
    if (!f) return 1;
    fprintf(f, "P6\n%d %d\n255\n", face_width(), face_height());
    const uint8_t *fb = face_fb();
    for (int i = 0; i < face_width() * face_height(); i++) { fputc(fb[i * 4 + 2], f); fputc(fb[i * 4 + 1], f); fputc(fb[i * 4], f); }
    fclose(f);
  }
  return 0;
}
