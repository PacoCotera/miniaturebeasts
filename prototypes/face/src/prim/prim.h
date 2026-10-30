/* The primitives: the closed set of things the face puts on the screen, the only code that creates LVGL objects (lvgl-switch.md §2.2).
   A rectangle, a run of Inter text, a picture placed 1:1 (or a window of a larger one), a nine-slice (corners 1:1, edges and middle tiled, never
   scaled), a clip (children shown only inside it) and a composed picture (fine line work drawn once into a picture of the face's own). Words build
   their trees from these; nothing else makes an object. Every node carries a layer (chrome, art, painted, type) and the region that drew it, for
   the checks (§2.8). The page's scene nodes arrive here too, by id, until the words replace them (the adapter in face-lvgl.mjs).
   The nodes of a frame arrive in draw order between prim_begin and prim_end; the face changes only what differs and removes what was not sent. */
#ifndef PRIM_H
#define PRIM_H
#include <stdint.h>
/* The fonts the face holds, by code: a font is named by its px and weight. The px's default weight keeps the px as its code (so a text node at 16 Regular, 20 Medium or 28 SemiBold
   is what it always was); another weight at a px is 1000 + px. Any other code is refused (a text node, a measure). */
enum { PRIM_FONT_R14 = 14, PRIM_FONT_R15 = 15, PRIM_FONT_R16 = 16, PRIM_FONT_M16 = 1016, PRIM_FONT_M20 = 20, PRIM_FONT_SB28 = 28 };   /* 14 and 15: the mibi collection's card, chips and plates */
int prim_font_px(int code);     /* the px of a font code (16 for 1016), or 0 when the face has no such font */
enum { FN_RECT = 1, FN_TEXT = 2, FN_SPRITE = 3, FN_NINE = 4, FN_CLIP = 5, FN_COMPOSED = 6 };
enum { LAYER_CHROME = 0, LAYER_ART = 1, LAYER_PAINTED = 2, LAYER_TYPE = 3 };
void prim_init(void);
void prim_begin(void);
/* The layer and region every node sent from now on carries, until changed. A region is the spec's region id (at most 47 bytes). */
void prim_tag(int layer, const char *region);
/* id: the page's hash of the node id. rect: x, y, w, h. rgb: 0xRRGGBB. a, b by kind:
   text: a = the font code (PRIM_FONT_*: 16, 1016, 20, 28), b = the cap height in px (the rect's y is the cap top); sprite: a = the asset handle (rgb: 0, or source x << 16 | source y to show that window of a larger picture);
   nine-slice: a = the asset handle, rgb = its insets left, top, right, bottom packed one a byte (the corners are placed 1:1), b = the tile of its edges and middle in px (0: the whole strip);
   clip: a = how many of the nodes that follow it are inside it (their rects are absolute; they are cut at the clip's rect);
   composed: the ops as JSON in the text buffer (see prim_compose), drawn into a w x h picture of the face's own once per change.
   The text is read from prim_text() for a text node. */
void prim_node(uint32_t id, int kind, int x, int y, int w, int h, uint32_t rgb, int a, int b);
#ifdef FACE_NODE_API
int prim_node_opa(uint32_t id);   /* test build: the opacity (0..255) of a node by id (-1 when absent) */
int prim_node_box(uint32_t id, int out[4]);   /* test build: the box and kind of a node by id (-1 when absent) */
#endif
void prim_end(void);
char *prim_ops(void);           /* a 128 KiB buffer for the ops of a composed node (JSON), filled before the node */
int prim_ops_size(void);
char *prim_text(void);          /* a 1 KiB buffer the page fills (UTF-8, NUL ended) before a text node or a measure */
void prim_sprite_opa(int opa);   /* the opacity (0..255) of the next sprite node only, 255 again once it is sent (as prim_text_role holds for the next text node only) */
void prim_text_role(const char *role, const char *ground);   /* the role and ground the next text node is set by (the log carries them); the words set it before the node, "" or NULL for none */
uint32_t prim_run_get(void);   /* the run now open (prim_run), 0 for none */
void prim_hold(int on);       /* the nodes sent from now on are a hold mark (kit_focusRingHold), on until it is turned off: the log counts them as "hold", never as a ring (flag 4 on each node) */
void prim_run(uint32_t run);   /* the run the nodes sent from now on belong to: one v_run or v_price call, the v_id of its id; 0 for none (the log carries it on each text entry and as the 14th value of each node) */
int prim_text_size(void);
int prim_measure(int code);     /* the width in px of prim_text() set in the font of that code (PRIM_FONT_*), or -1 for a code the face has no font for */
uint8_t *prim_asset(int handle, int w, int h);   /* a picture's pixels (B, G, R, A in memory), for the page to fill; NULL when refused */
int prim_snapshot(int x, int y, int w, int h);   /* the screen's objects as drawn now, the rect (x, y, w, h) copied into the face's one snapshot picture (lv_snapshot): its handle, or -1 */
void prim_snapshot_free(void);                   /* release the snapshot */
int prim_snapshot_handle(void);                  /* the snapshot's handle, or -1 when there is none */
uint8_t *prim_asset_ptr(int handle);   /* the pixels of a picture already allocated, or NULL */
void prim_asset_free(int handle);       /* release a picture (its pixels); a node still showing it is refused until it is sent again */
int prim_asset_limit(void);
int prim_source(const char *ops, int w, int h);   /* a face-owned source picture composed from ops, cached by their hash and counted once in prim_pictures(); a handle for a nine-slice or sprite, or -1 */
int prim_count(void);           /* objects alive */
int prim_pictures(void);        /* pictures resident (assets with pixels, composed pictures) */
int prim_painted_at(int x, int y);   /* a painted picture of the scene covers the pixel (the off-palette check skips it) */
void prim_refuse(void);         /* count a node a word could not draw (a picture the host has not sent) as refused */
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
   ["lattice", x, y, w, h, mod, [[ax, ay], ...], "colour"], ["bayerPick", from, to, level, ox, oy], or with the windows ["bayerPick", from, to, level, ox, oy, fsx, fsy, tsx, tsy] (from -1: clear)] (bayerPick: the picture of asset `to` where the Bayer cell at the screen position (ox + x, oy + y) is below `level`, else that of asset `from`; both are the picture's size) with x, y relative to the picture. One pixel wide, palette colours only, no anti-aliasing, no opacity.
   Two ops for a rounded box, integer corners, no anti-aliasing, not a focus ring (they set no ring flag; the Incubate panel's bezels and windows):
   ["rrect", x, y, w, h, radius, "fill", "edge"]: a w x h box with rounded corners of `radius` px, its whole in `fill` and a 1 px edge on its outline in `edge`; "" for either leaves it out; radius 0 is a square box; the box lies inside the picture and is at most 1024 x 600 px.
   ["rcorners", x, y, w, h, radius, "colour"]: the pixels of the w x h box that lie outside that rounded shape (its four corners), in colour; radius 0 draws nothing.
   Returns the ops drawn, or -1 when the JSON or a colour name is refused. */
int prim_compose(uint8_t *px, int w, int h, const char *ops);

/* Test mode: which layers show (1: chrome; 2: chrome and art; 3: all), and the logs the checks read. */
void prim_set_pass(int pass);
void prim_set_hide(const char *region);   /* the nodes of a region hidden (NULL or "": none) */
void prim_asset_layer(int handle, int layer);
int prim_asset_size(int handle, int out[2]);   /* the size of a held picture: 0, or -1 for an empty slot */
int prim_asset_box(int handle, int out[4]);   /* the box (x, y, w, h) of a held picture's pixels with alpha above 0 (all 0 when it is clear); 0, or -1 for an empty slot: the dither of a layer need only cover this box */
int prim_asset_solid_box(int handle, int out[4]);   /* the solid-ink box (C9) of a held picture: the span of its columns and the span of its rows that hold at least 3 pixels of alpha >= 128 (all 0 when none); 0, or -1 for an empty slot */
int prim_asset_alpha_box(int fh, int th, int out[4]);   /* the silhouette box of two held pictures: pixels clear in one and not the other (0, or -1 when refused) */
int prim_asset_diff_box(int fh, int th, int out[4]);    /* the change box: pixels whose alpha differs or, neither clear, whose colour differs */
/* The feet of a held picture (the decision panel's composite rule, T-20261016-70): out = the lowest row holding a pixel of alpha >= `alpha`, and the first and last column of such pixels in that row and the `rows` - 1 above it (inclusive). 0, or -1 for an empty slot or a picture with no such pixel. */
int prim_asset_feet(int handle, int alpha, int rows, int out[3]);
int prim_asset_layer_of(int handle);   /* the layer the host gave a picture (art or painted; art when it gave none) */
/* {"regions":[{"id","layer","rect":[x,y,w,h]}...],"type":[{"text","px","region","role","ground","x","w","cap","base"}...],"nodes":[[id,kind,layer,region,x,y,w,h,flags,inkx,inky,inkw,inkh,run,solidx,solidy,solidw,solidh]...],
   "snapshot":{"region","from":[x,y,w,h],"at":[x,y],"nodes":[...]},"refused":n,"objects":n,"table":n,"pictures":n}
   into buf (a clip's children count only where the clip shows them; objects are LVGL's, table is the face's node table; a text's px is its font code, cap and base its cap top and baseline rows, role and
   ground what the words set it by, "" when set by size; nodes: every node shown with a size in draw order, flags 1 ring, 2 in a clip, 4 hold, 8 a window of a larger picture, 16 the window cuts solid ink,
   32 composed content (the snapshot), see node_json in prim.c; snapshot, only while a node shows the face's snapshot: the region and place of that node, the source rect and the source screen's nodes cut
   to it as they were when prim_snapshot ran); returns its length, or -1 if it does not fit. */
int prim_log_json(char *buf, int cap);
#endif
