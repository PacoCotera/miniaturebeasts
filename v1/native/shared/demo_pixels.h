#ifndef DEMO_PIXELS_H
#define DEMO_PIXELS_H
#include "demo_domain.h"
typedef enum { DEMO_RGB888, DEMO_MONO1 } DemoPixelFormat;
typedef enum { DEMO_LAB, DEMO_PROBE, DEMO_COMPANION } DemoDisplay;
typedef struct {
  unsigned width, height;
  DemoPixelFormat format;
  size_t row_bytes;
} DemoDisplayProfile;
/* Native display geometry; panel transfer encodings belong to adapters. */
const DemoDisplayProfile *demo_display_profile(DemoDisplay display);
/* Mono: MSB first, 1 black, 0 white, trailing padding bits zero.
 * Invalid inputs reject without writing to the destination. */
int demo_render_row(const Demo *demo, DemoDisplay display, unsigned y,
                    uint8_t *pixels, size_t capacity);
#endif
