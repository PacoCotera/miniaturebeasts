/* The Station's face: the one C program that draws the screens (technical-architecture.md §8). Platform-neutral: it
   draws into a retained 1024x600 framebuffer and reports what it redrew; a platform file or the page copies those
   rectangles to a display. Keys come in as codes; intents go out (L1). Nothing here knows JavaScript, SDL or a device. */
#ifndef MB_FACE_H
#define MB_FACE_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
#define FACE_W 1024
#define FACE_H 600
#define FACE_MAX_DIRTY 64

void face_init(void);
/* One frame: advance the clock to `ms` (monotonic) and let LVGL run its timers and redraw. */
void face_frame(uint32_t ms);
/* The framebuffer, FACE_W x FACE_H, 4 bytes a pixel: B, G, R, A in memory (LVGL's ARGB8888, little endian). */
uint8_t *face_fb(void);
int face_width(void);
int face_height(void);
/* The rectangles the last frame redrew: x, y, w, h each, as int32. A full redraw reports one rectangle. */
int face_dirty_count(void);
int32_t *face_dirty_rects(void);
/* FNV-1a over the framebuffer's pixels (R, G, B only, alpha ignored): the same on every platform for the same drawing. */
uint32_t face_hash(void);
/* Keys: LVGL's key codes (LV_KEY_UP 17, DOWN 18, RIGHT 19, LEFT 20, ESC 27, ENTER 10, ...), a press then its release. */
void face_key(int code, int down);
int face_key_count(void);
int face_last_key(void);
const char *face_version(void);
#ifdef __cplusplus
}
#endif
#endif
