/* The closed vocabulary, one C module each (lvgl-switch.md §2.2). A word reads the spec of its screen and the props by path and emits primitives; the screen's binding table
   (screens/) says which region uses which word. */
#ifndef WORDS_H
#define WORDS_H
/* common/ */
int kit_stage(const char *spec, const char *rect, const char *ground, const char *region, const char *groundId, const char *roomId, const char *roomPath);   /* a screen's stage: the ground over the spec's rect, then the room master over it (the first of the props' candidates at roomPath the host has sent; roomId NULL: none); 0 when the spec holds no rect */
/* The UI kit's panels and rules (contract headers in common/panel.c, bezel.c, windowFrame.c and hairline.c) */
void kit_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge, int slot);   /* a filled pane with a 1 px edge (fill NULL: the four edge rects only; edge NULL: none; slot: the same nodes with no size at (x, y)) */
typedef struct { int side; int h; const char *fill; const char *rule; } kit_band_t;   /* a band along a bezel's side: side 0 top, 1 bottom; h rows of fill, then a row of rule (NULL: none); h 0: no band */
void kit_bezel(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge, const char *bevel, const kit_band_t *band);   /* a rounded panel (a nine-slice of the face's own source), a bevel line on top (bevel NULL: none), a band (NULL: none) */
void kit_bezelComposed(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge, const char *bevel);   /* a rounded panel as one composed picture (rrect, then the bevel's h line when bevel is not NULL); no band */
void kit_windowFrame(const char *id, int x, int y, int w, int h, int radius, const char *ground, const char *edge);   /* the corners outside the radius in ground (none when ground is NULL), then a 1 px edge on the radius: one composed picture */
void kit_hairline(const char *id, int x, int y, int len, const char *colour, int vertical, const int dash[2]);   /* a 1 px rule; dash { on, off }: one composed picture of dashes (NULL: a solid rect) */
typedef void (*kit_tile_fn)(int i, const int box[4], void *ctx);
int kit_tiles(const char *spec, const char *list, int n, kit_tile_fn draw, void *ctx, int boxes[][4]);   /* n tiles on the list's forms (layout_list_pitch), draw(i, box, ctx) for each; boxes (or NULL) receives the boxes; the form's upTo, or -1 when refused (an error to the host, no tile drawn) */
#define KIT_TAG_BELOW 0   /* the tag's top is yBelow */
#define KIT_TAG_OVER 1    /* the tag's top is yOver */
#define KIT_TAG_AUTO 2    /* yBelow, or yOver when the tag's bottom would pass 8 px above the window's bottom */
void kit_nameTag(const char *spec, const char *glass, const char *name, const int anchor[4], int yBelow, int yOver, int rule, int slot, const char *fill, const char *edge, const char *ink, int out[4]);   /* a name on a panel centred on the anchor box, 8 px inside the window `glass`; slot: the same nodes with no size; out: the tag's box */
/* The focus ring (fix 14): `target` is the path of the target's entry in `spec` (its `shape` and `ground` are read there, the bands, gap, reach and colours from frame.json focus.ring); `drawn` is the object's rect as the screen drew it this frame, lifted where it lifts; `id` is the ring's region id. */
void word_focusRing(const char *id, const char *spec, const char *target, const int drawn[4]);
/* A creature's ring: its footprint on the ground. `picture` is the creature's picture id as drawn (a still, a moving-set atlas or a nap), `cell` is "stand", "curl", "shadow" or "" (the whole picture), `drawn` is its box, not lifted. */
void word_focusRingFootprint(const char *id, const char *spec, const char *target, const char *picture, const char *cell, const int drawn[4]);
void word_focusRingFigure(const char *id, const char *spec, const char *target, const char *picture, int fx, int feetY, int W);   /* a figure's ring: (W + 10) x (fh + 10) on its feet point */
/* station/ */
typedef struct { const char *plateId, *plateRegion, *imageRegion; int plateAlone; const char *caseSpec, *caseBase; } kit_stamp_t;   /* the stamp label's own ids and regions (the screens' names), whether the plate stands without a stamp, and the case (caseSpec NULL: none) */
void kit_stamp(const char *spec, const char *rect, const char *plate, const char *asset, int size, int clipH, const kit_stamp_t *o);   /* the stamp label: the case's back, the plate (a slot), the stamp centred on it (cut to clipH rows when clipH >= 0), the case's front */
typedef struct { const char *id, *region, *picture; int on; } kit_podShadow_t;   /* the pod's contact shadow: its node id, region and picture; on 0 keeps the node with no size */
int kit_pod(const char *spec, const char *cls, int axis, int feet, const kit_podShadow_t *shadow, int box[4]);   /* the pod's box from its size class (bottom-centred on axis and feet), and its shadow when given; 1 when the class gives a box */
void word_specimen(const char *base);   /* the pod under the beam on its cradle; base: the state's regions in the pods spec ("regions.overview" or "regions.chapter") */
void word_kin(const char *base);        /* the overview's kin rings and the hatch */
void word_stampCase(const char *spec, const char *base, int front);   /* the stamp case's back (front 0) or front glass (front 1): kit_stamp calls it */
void word_page(const char *key);        /* the chapter page ("page") or one of Compare's two ("pageA", "pageB") */
void word_list(void);    /* Pods' collection: the rack's places */
/* the ring of the target whose `group` this is in the screen spec of the props (the rail's, Pods'), at the region id the caller names */
void word_focusRingFor(const char *id, const int drawn[4], const char *group);
void word_rail(const char *marksSpec);    /* the chapter rail (frame spec) with the ring on its focused tab; `marksSpec` names the spec whose colours.rail the marked pips take (NULL: the screen has no marked pips) */
/* station/ (Home) */
void word_livingWindow(const char *spec, const char *region, const char *bezel, const char *glass, const char *colours, const char *glassPicture, int sx, int sy);   /* the living window (the picture is shown from source (sx, sy): the whole shows rows 120 to 560 of Idle's painting): the bezel (NULL: none, the part inside) and the glass, flat plates until the glass master, the master over them */
/* common/ */
void word_ribbon(const char *id, const int rect[4], const char *text, int px, int pad, const char *fill, const char *edge, const char *textColour);   /* the ribbon (pad: the room each side of the words): a panel with an edge and one line, centred (Cargo's: cargo.json regions.ribbon) */
void word_topBar(void);
int frame_material_centre(int i, int out[2]);   /* the centre of a counter's icon in the top bar (0 Energy, 1 Data, 2 Essence) as the bar lays it out now: where Cargo's materials travel */
void v_faceHolder(const char *id, const char *spec, int x, int y, int w, int h, int away);   /* a face picture's holder ring (art layer, regions.marks.face.ringWidth), until the picture is painted: not a focus mark */
void word_bottomLine(void);
void word_messagePlate(void);
#endif
