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

/* The scene (prim/prim.h): the page sends a frame's nodes in draw order; text, measure and pictures go through the shared buffers. */
void face_scene_begin(void);
void face_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b);
void face_scene_end(void);
char *face_text(void);
int face_text_size(void);
int face_measure(int px);
uint8_t *face_asset(int handle, int w, int h);
int face_object_count(void);
int face_node_refused(void);
int face_asset_limit(void);
void face_background(uint32_t rgb);   /* the screen's ground under the scene */
/* The bridge (bridge/wire.h): messages in as JSON through the in-buffer, messages out by polling. */
char *face_in_buf(void);
int face_in_cap(void);
int face_send(int len);              /* the message in the in-buffer is `len` bytes: 0 accepted, -1 refused (an error is queued) */
const char *face_poll(void);         /* the next message out, NUL ended, or NULL; valid until the next call */
int face_pending(void);
int face_last_asset(void);           /* the handle the last accepted asset message got, or -1 */
uint8_t *face_asset_pixels(int handle);
int face_props_count(void);
unsigned face_props_seq(void);
int face_event_count(void);
int face_spec_int(const char *screen, const char *path, int dflt);
/* Tags for the scene nodes sent after this call (a region id in face_region(), 47 bytes, and a layer: 0 chrome, 1 art, 2 painted, 3 type). */
char *face_region(void);
void face_node_tag(int layer);
/* Test mode (hello with test: true): which layers show (1 chrome, 2 chrome and art, 3 all), and the pixels of the last frame outside the palette. */
void face_test_pass(int pass);
int face_test_offpalette(void);
int face_test_ring(const char *form_json, int x, int y, int w, int h, const char *colour);   /* one focus ring word on a box (the checks of the word alone); the nodes refused */
char *face_ops(void);   /* the buffer for a composed node's ops (128 KiB) */
int face_ops_size(void);
void face_selftest_scene(void);   /* a fixed scene for the parity check (selftest.c) */
#ifdef __cplusplus
}
#endif
#endif
