/* The scene interpreter: the page's scene nodes (rect, text, sprite, ring) become LVGL objects, kept between frames by id.
   The page sends every node of a frame in draw order between face_scene_begin and face_scene_end; the face changes only what
   differs and removes what was not sent. It places and styles; it decides nothing (technical-architecture.md §8). */
#ifndef SCENE_H
#define SCENE_H
#include <stdint.h>
enum { FN_RECT = 1, FN_TEXT = 2, FN_SPRITE = 3, FN_RING = 4, FN_FEET = 5 };
void scene_init(void);
void scene_begin(void);
/* id: the page's hash of the node id. rect: x, y, w, h. rgb: 0xRRGGBB. a, b by kind:
   text: a = px (16, 20, 28), b = the cap height in px (the rect's y is the cap top); sprite: a = the asset handle;
   ring/feet: a = line width, b = corner radius. The text is read from scene_text(). */
void scene_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b);
void scene_end(void);
char *scene_text(void);          /* a 1 KiB buffer the page fills (UTF-8, NUL ended) before a text node or a measure */
int scene_text_size(void);
int scene_measure(int px);       /* the width in px of scene_text() set in Inter at px */
uint8_t *scene_asset(int handle, int w, int h);   /* a picture's pixels (B, G, R, A in memory), for the page to fill */
int scene_count(void);           /* objects alive */
int scene_unknown(void);         /* nodes refused (an unknown kind, a missing asset, a size that is not one of the three) */
#endif
