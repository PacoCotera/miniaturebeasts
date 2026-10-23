/* The closed vocabulary, one C module each (lvgl-switch.md §2.2). A word reads the spec of its screen and the props by path and emits primitives; the screen's binding table
   (screens/) says which region uses which word. */
#ifndef WORDS_H
#define WORDS_H
/* common/ */
/* The UI kit's panels and rules (contract headers in common/panel.c, bezel.c, windowFrame.c and hairline.c) */
void kit_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge, int slot);   /* a filled pane with a 1 px edge (fill NULL: the four edge rects only; edge NULL: none; slot: the same nodes with no size at (x, y)) */
typedef struct { int side; int h; const char *fill; const char *rule; } kit_band_t;   /* a band along a bezel's side: side 0 top, 1 bottom; h rows of fill, then a row of rule (NULL: none); h 0: no band */
void kit_bezel(const char *id, int x, int y, int w, int h, int r, const char *fill, const char *edge, const char *bevel, const kit_band_t *band);   /* a rounded panel (a nine-slice of the face's own source), a bevel line on top (bevel NULL: none), a band (NULL: none) */
void kit_windowFrame(const char *id, int x, int y, int w, int h, int radius, const char *ground, const char *edge);   /* the corners outside the radius in ground, then a 1 px edge on the radius: one composed picture */
void kit_hairline(const char *id, int x, int y, int len, const char *colour, int vertical, const int dash[2]);   /* a 1 px rule; dash { on, off }: one composed picture of dashes (NULL: a solid rect) */
/* The focus ring (fix 14): `target` is the path of the target's entry in `spec` (its `shape` and `ground` are read there, the bands, gap, reach and colours from frame.json focus.ring); `drawn` is the object's rect as the screen drew it this frame, lifted where it lifts; `id` is the ring's region id. */
void word_focusRing(const char *id, const char *spec, const char *target, const int drawn[4]);
/* A creature's ring: its footprint on the ground. `picture` is the creature's picture id as drawn (a still, a moving-set atlas or a nap), `cell` is "stand", "curl", "shadow" or "" (the whole picture), `drawn` is its box, not lifted. */
void word_focusRingFootprint(const char *id, const char *spec, const char *target, const char *picture, const char *cell, const int drawn[4]);
void word_focusRingFigure(const char *id, const char *spec, const char *target, const char *picture, int fx, int feetY, int W);   /* a figure's ring: (W + 10) x (fh + 10) on its feet point */
/* station/ */
void word_bench(void);   /* Pods' stage: the ground and the room master over it */
void word_specimen(const char *base);   /* the pod under the beam on its cradle; base: the state's regions in the pods spec ("regions.overview" or "regions.chapter") */
int word_pod_size(int out[2]);          /* the pod's box size from its class in the spec; 0 when the props name no class */
void word_kin(const char *base);        /* the overview's kin rings and the hatch */
void word_stamp(const char *base);      /* the overview's stamp label in its case */
void word_stampCase(const char *spec, const char *base, int front);   /* the stamp case's back (front 0) or front glass (front 1): Pods' word_stamp and Create's stamp both call it */
void word_page(const char *key);        /* the chapter page ("page") or one of Compare's two ("pageA", "pageB") */
void word_list(void);    /* Pods' collection: the rack's places */
/* the ring of the target whose `group` this is in the screen spec of the props (the rail's, Pods'), at the region id the caller names */
void word_focusRingFor(const char *id, const int drawn[4], const char *group);
void word_rail(const char *marksSpec);    /* the chapter rail (frame spec) with the ring on its focused tab; `marksSpec` names the spec whose colours.rail the marked pips take (NULL: the screen has no marked pips) */
/* station/ (Home) */
void word_livingWindow(const char *spec, const char *region, const char *bezel, const char *glass, const char *colours, const char *glassPicture, int sx, int sy);   /* the living window (the picture is shown from source (sx, sy): the whole shows rows 120 to 560 of Idle's painting): the bezel (NULL: none, the part inside) and the glass, flat plates until the glass master, the master over them */
void word_leaves(const char *spec, const char *base, const char *emptyPic, const char *fullPic, int total, int rows, int full, int dy, int slots, int filling);   /* the leaves word, grid form: the screen spec and the region's path in it; `filling`: rows 0 to 19 of the filling leaf, -1 for a screen whose leaves never fill */
/* station/ (the Incubator) */
void word_leavesArc(const char *spec, const char *region, const char *emptyPic, const char *fullPic, int total, int full, int rows);   /* the leaves word, arc form (leafArc): the filling leaf and growNow */
/* common/ */
void word_ribbon(const char *id, const int rect[4], const char *text, int px, int pad, const char *fill, const char *edge, const char *textColour);   /* the ribbon (pad: the room each side of the words): a panel with an edge and one line, centred (Cargo's: cargo.json regions.ribbon) */
void word_topBar(void);
int frame_material_centre(int i, int out[2]);   /* the centre of a counter's icon in the top bar (0 Energy, 1 Data, 2 Essence) as the bar lays it out now: where Cargo's materials travel */
void v_faceHolder(const char *id, const char *spec, int x, int y, int w, int h, int away);   /* a face picture's holder ring (art layer, regions.marks.face.ringWidth), until the picture is painted: not a focus mark */
void word_bottomLine(void);
void word_messagePlate(void);
#endif
