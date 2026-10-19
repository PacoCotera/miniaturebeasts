/* The platform layer (lvgl-switch.md §2.2): the only per-target code the face core asks for. Today one call, the monotonic clock in milliseconds; the display, keys and the socket arrive with face_sdl and face_drm. */
#ifndef PLATFORM_H
#define PLATFORM_H
#include <stdint.h>
/* Milliseconds from a monotonic clock, as a double (sub-millisecond resolution for timing a frame). */
double platform_now_ms(void);
#endif
