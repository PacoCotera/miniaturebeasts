#include "demo_pixels.h"
#include <assert.h>
#include <string.h>

int main(void) {
  Demo demo;
  uint8_t guarded[18];
  demo_init(&demo);
  const DemoDisplayProfile *lab = demo_display_profile(DEMO_LAB);
  assert(lab->width == 1024 && lab->height == 600 && lab->row_bytes == 3072);
  const DemoDisplayProfile *probe = demo_display_profile(DEMO_PROBE);
  const DemoDisplayProfile *companion = demo_display_profile(DEMO_COMPANION);
  assert(probe->width == 122 && probe->height == 250);
  assert(probe->format == DEMO_MONO1 && probe->row_bytes == 16);
  assert(companion->width == 368 && companion->height == 448);
  assert(companion->format == DEMO_RGB888 && companion->row_bytes == 1104);
  memset(guarded, 0xa5, sizeof(guarded));
  assert(!demo_render_row(&demo, DEMO_PROBE, 30, guarded + 1, 15));
  assert(!demo_render_row(&demo, DEMO_PROBE, 250, guarded + 1, 16));
  assert(!demo_render_row(&demo, (DemoDisplay)99, 30, guarded + 1, 16));
  for (unsigned i = 0; i < sizeof(guarded); ++i)
    assert(guarded[i] == 0xa5);
  demo.phase = 1;
  assert(demo_render_row(&demo, DEMO_PROBE, 66, guarded + 1, 16));
  assert(guarded[0] == 0xa5 && guarded[17] == 0xa5);
  /* Collection borders x=8..57 and x=64..113 use MSB-first pixels. */
  assert(guarded[1] == 0 && guarded[2] == 0xff);
  assert(guarded[15] == 0xc0 && guarded[16] == 0);
  for (unsigned y = 0; y < probe->height; ++y) {
    assert(demo_render_row(&demo, DEMO_PROBE, y, guarded + 1, 16));
    assert((guarded[16] & 0x3f) == 0);
    assert(guarded[0] == 0xa5 && guarded[17] == 0xa5);
  }
  return 0;
}
