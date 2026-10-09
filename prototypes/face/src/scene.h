/* The scene interpreter: the page's scene nodes (rect, text, sprite, nine-slice) become LVGL objects, kept between frames by id.
   The page sends every node of a frame in draw order between face_scene_begin and face_scene_end; the face changes only what
   differs and removes what was not sent. It places and styles; it decides nothing (technical-architecture.md §5.2, §6, §8).
   The primitives are the architecture's closed set: a filled rectangle, a picture placed 1:1, a nine-slice picture (corners 1:1, edges
   and middle tiled, never scaled), a run of Inter text. Rings, ends and shades are pictures. */
#ifndef SCENE_H
#define SCENE_H
#include <stdint.h>
enum { FN_RECT = 1, FN_TEXT = 2, FN_SPRITE = 3, FN_NINE = 4 };
void scene_init(void);
void scene_begin(void);
/* id: the page's hash of the node id. rect: x, y, w, h. rgb: 0xRRGGBB. a, b by kind:
   text: a = px (16, 20, 28), b = the cap height in px (the rect's y is the cap top); sprite: a = the asset handle (rgb: 0, or source x << 16 | source y to show that window of a larger picture);
   nine-slice: a = the asset handle, rgb = its insets left, top, right, bottom packed one a byte (the corners are placed 1:1), b = the tile of its edges and middle in px (0: the whole strip). The text is read from scene_text(). */
void scene_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b);
void scene_end(void);
char *scene_text(void);          /* a 1 KiB buffer the page fills (UTF-8, NUL ended) before a text node or a measure */
int scene_text_size(void);
int scene_measure(int px);       /* the width in px of scene_text() set in Inter at px */
uint8_t *scene_asset(int handle, int w, int h);   /* a picture's pixels (B, G, R, A in memory), for the page to fill; NULL when refused */
int scene_asset_limit(void);
int scene_count(void);           /* objects alive */
int scene_unknown(void);         /* nodes refused this frame (an unknown kind, a missing asset, a size that is not the asset's, a full table) */
#endif
