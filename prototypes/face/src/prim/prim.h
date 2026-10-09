/* The primitives: the closed set of things the face puts on the screen, the only code that creates LVGL objects (lvgl-switch.md §2.2).
   A rectangle, a run of Inter text, a picture placed 1:1 (or a window of a larger one), a nine-slice (corners 1:1, edges and middle tiled, never
   scaled), a clip (children shown only inside it) and a composed picture (fine line work drawn once into a picture of the face's own). Words build
   their trees from these; nothing else makes an object. Every node carries a layer (chrome, art, painted, type) and the region that drew it, for
   the checks (§2.8). The page's scene nodes arrive here too, by id, until the words replace them (the adapter in face-lvgl.mjs).
   The nodes of a frame arrive in draw order between prim_begin and prim_end; the face changes only what differs and removes what was not sent. */
#ifndef PRIM_H
#define PRIM_H
#include <stdint.h>
enum { FN_RECT = 1, FN_TEXT = 2, FN_SPRITE = 3, FN_NINE = 4, FN_CLIP = 5, FN_COMPOSED = 6 };
enum { LAYER_CHROME = 0, LAYER_ART = 1, LAYER_PAINTED = 2, LAYER_TYPE = 3 };
void prim_init(void);
void prim_begin(void);
/* The layer and region every node sent from now on carries, until changed. A region is the spec's region id (at most 47 bytes). */
void prim_tag(int layer, const char *region);
/* id: the page's hash of the node id. rect: x, y, w, h. rgb: 0xRRGGBB. a, b by kind:
   text: a = px (16, 20, 28), b = the cap height in px (the rect's y is the cap top); sprite: a = the asset handle (rgb: 0, or source x << 16 | source y to show that window of a larger picture);
   nine-slice: a = the asset handle, rgb = its insets left, top, right, bottom packed one a byte (the corners are placed 1:1), b = the tile of its edges and middle in px (0: the whole strip);
   clip: a = how many of the nodes that follow it are inside it (their rects are absolute; they are cut at the clip's rect);
   composed: the ops as JSON in the text buffer (see prim_compose), drawn into a w x h picture of the face's own once per change.
   The text is read from prim_text() for a text node. */
void prim_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b);
void prim_end(void);
char *prim_text(void);          /* a 1 KiB buffer the page fills (UTF-8, NUL ended) before a text node or a measure */
int prim_text_size(void);
int prim_measure(int px);       /* the width in px of prim_text() set in Inter at px */
uint8_t *prim_asset(int handle, int w, int h);   /* a picture's pixels (B, G, R, A in memory), for the page to fill; NULL when refused */
uint8_t *prim_asset_ptr(int handle);   /* the pixels of a picture already allocated, or NULL */
void prim_asset_free(int handle);       /* release a picture (its pixels); a node still showing it is refused until it is sent again */
int prim_asset_limit(void);
int prim_count(void);           /* objects alive */
int prim_pictures(void);        /* pictures resident (assets with pixels, composed pictures) */
int prim_unknown(void);         /* nodes refused this frame (an unknown kind, a missing asset, a size that is not the asset's, a full table) */
int prim_object_limit(void);
int prim_lvgl_objects(void);    /* the LVGL objects alive: the table plus nine parts for each nine-slice */

/* The palette, by name, from the host's `palette` message: composed pictures name their colours, the palette pass checks the framebuffer against it. */
void prim_palette_clear(void);
int prim_palette_add(const char *name, uint32_t rgb);
int prim_palette_count(void);
int prim_palette_has(uint32_t rgb);
int prim_palette_rgb(const char *name, uint32_t *rgb);   /* a palette colour by name: 0, or -1 when the palette has no such name */
/* The composed picture's ops, JSON: [["h", x, y, len, "colour"], ["v", x, y, len, "colour"], ["dash", x, y, len, "h"|"v", on, off, "colour"], ["dot", x, y, "colour"],
   ["lattice", x, y, w, h, mod, [[ax, ay], ...], "colour"]] with x, y relative to the picture. One pixel wide, palette colours only, no anti-aliasing, no opacity.
   Returns the ops drawn, or -1 when the JSON or a colour name is refused. */
int prim_compose(uint8_t *px, int w, int h, const char *ops);

/* Test mode: which layers show (1: chrome; 2: chrome and art; 3: all), and the logs the checks read. */
void prim_set_pass(int pass);
/* {"regions":[{"id","layer","rect":[x,y,w,h]}...],"type":[{"text","px","region"}...],"refused":n,"objects":n,"table":n,"pictures":n} into buf (a clip's children count only where the clip shows them; objects are LVGL's, table is the face's node table); returns its length, or -1 if it does not fit. */
int prim_log_json(char *buf, int cap);
#endif
