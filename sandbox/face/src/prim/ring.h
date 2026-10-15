/* The focus ring's pixels (lvgl-switch.md §2.2): the ring and tabRing helpers of the composed pictures, integers only, every product in int64, so WebAssembly, x86-64 and aarch64
   cannot differ. A pixel (i, j) of the box has the doubled centre (2i + 1, 2j + 1); it is on when it is inside the outer shape and not inside the inner one. ui/rings.mjs is the
   same definition in JavaScript, and tests/vectors/rings.json the hashes of both. */
#ifndef RING_H
#define RING_H
#include <stdint.h>
/* A w x h ring `width` thick: shape 0 a rounded rectangle of corner `radius`, shape 1 an ellipse (radius 0). mask: w*h bytes, 0 or 255. 0, or -1 when refused (width < 1, w or h < 1, radius < 0, an ellipse with a radius). */
int ring_mask(uint8_t *mask, int w, int h, int width, int radius, int ellipse);
typedef struct { int body, width, slant, outside, top, slantTo, bottom, radius, tabTop; } ring_tab_t;
int ring_tab_w(const ring_tab_t *t);   /* body + 2 outside + slant */
int ring_tab_h(const ring_tab_t *t);   /* bottom - top */
/* The rail tab's ring: a (ring_tab_w x ring_tab_h) mask. 0, or -1 when refused (body < 1, slant < 0, outside < 0, T = slantTo - tabTop <= 0, bottom < slantTo, top >= bottom, width < 1, radius < 0). */
int ring_tab_mask(uint8_t *mask, const ring_tab_t *t);
#endif
