/* The native face behind a pipe, for the headless playtest harness (prototypes/playtest/face-native.mjs): the same face.c as the page's WebAssembly build, driven by
   one-byte commands on a request pipe and answering on a reply pipe, so a Node process speaks the bridge's wire format to it synchronously. No display: the framebuffer
   is read back on request. Numbers are 32-bit little endian.
     S len bytes  -> rc            a message in (face_send)
     P            -> len bytes     the next message out (len 0xffffffff: none)
     X w h bytes  -> handle        the last accepted asset's pixels (B, G, R, A), copied into its slot
     F ms         -> 0             one frame at ms
     K code       -> 0             a key pressed and released
     H            -> hash          the framebuffer hash
     B            -> w*h*4 bytes   the framebuffer (B, G, R, A)
     I which      -> value         0 width, 1 height, 2 in-buffer capacity, 3 objects, 4 refused nodes, 5 keys, 6 props, 7 events, 8 dirty areas, 9 off-palette pixels
     T pass       -> 0             test mode's layer pass
     V            -> len bytes     the version
     Q                             quit
   Usage: face_pipe <request fifo> <reply fifo> */
#include "face.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static FILE *in, *out;
static void rd(void *p, size_t n) { if (n && fread(p, 1, n, in) != n) exit(0); }
static uint32_t rd32(void) { uint32_t v; rd(&v, 4); return v; }
static void wr(const void *p, size_t n) { if (n && fwrite(p, 1, n, out) != n) exit(1); }
static void wr32(uint32_t v) { wr(&v, 4); }

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: face_pipe <request fifo> <reply fifo>\n"); return 2; }
  in = fopen(argv[1], "rb"); out = fopen(argv[2], "wb");
  if (!in || !out) { perror("face_pipe"); return 1; }
  face_init();
  for (;;) {
    int c = fgetc(in); if (c == EOF || c == 'Q') return 0;
    switch (c) {
      case 'S': { uint32_t n = rd32(); if (n > (uint32_t)face_in_cap()) return 3; rd(face_in_buf(), n); wr32((uint32_t)face_send((int)n)); break; }
      case 'P': { const char *m = face_poll(); if (!m) wr32(0xffffffffu); else { uint32_t n = (uint32_t)strlen(m); wr32(n); wr(m, n); } break; }
      case 'X': { uint32_t w = rd32(), h = rd32(); int hd = face_last_asset(); uint8_t *p = hd >= 0 ? face_asset_pixels(hd) : NULL; size_t n = (size_t)w * h * 4;
        if (p) rd(p, n); else { uint8_t buf[4096]; while (n) { size_t k = n < sizeof buf ? n : sizeof buf; rd(buf, k); n -= k; } }
        wr32((uint32_t)hd); break; }
      case 'F': face_frame(rd32()); wr32(0); break;
      case 'K': { int code = (int)rd32(); face_key(code, 1); face_key(code, 0); wr32(0); break; }
      case 'H': wr32(face_hash()); break;
      case 'B': wr(face_fb(), (size_t)face_width() * face_height() * 4); break;
      case 'I': { uint32_t w = rd32(); int v = w == 0 ? face_width() : w == 1 ? face_height() : w == 2 ? face_in_cap() : w == 3 ? face_object_count() : w == 4 ? face_node_refused() : w == 5 ? face_key_count() : w == 6 ? face_props_count() : w == 7 ? face_event_count() : w == 8 ? face_dirty_count() : w == 9 ? face_test_offpalette() : -1; wr32((uint32_t)v); break; }
      case 'T': face_test_pass((int)rd32()); wr32(0); break;
      case 'V': { const char *v = face_version(); uint32_t n = (uint32_t)strlen(v); wr32(n); wr(v, n); break; }
      default: fprintf(stderr, "face_pipe: unknown command %d\n", c); return 4;
    }
    fflush(out);
  }
}
