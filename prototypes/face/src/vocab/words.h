/* The closed vocabulary, one C module each (lvgl-switch.md §2.2). A word reads the spec of its screen and the props by path and emits primitives; the screen's binding table
   (screens/) says which region uses which word. */
#ifndef WORDS_H
#define WORDS_H
/* common/ */
void word_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge);   /* a filled pane with a 1 px edge (edge NULL: none) */
void word_hairline(const char *id, int x, int y, int len, const char *colour, int vertical);
/* The focus ring on a target's box, composed by the face: `form` is the path of the group's `ring` in `spec` (NULL: round), `colour` a palette name. */
void word_focusRing(const char *id, const int box[4], const char *spec, const char *form, const char *colour);
/* station/ */
void word_bench(void);   /* Pods' stage: the ground and the room master over it */
void word_specimen(const char *base);   /* the pod under the beam on its cradle; base: the state's regions in the pods spec ("regions.overview" or "regions.chapter") */
void word_kin(const char *base);        /* the overview's kin rings and the hatch */
void word_stamp(const char *base);      /* the overview's stamp label in its case */
void word_list(void);    /* Pods' collection: the rack's places */
void word_focusRingShape(const char *id, const int box[4], const char *shape, const char *colour);   /* "round", "feet" or "tab" */
void word_focusRingCircle(const char *id, const int box[4], int radius, int cx, int cy, int outside, const char *colour);   /* radius > 0: fixed, centre (x + cx, y + cy); else from the box, rho = w/2 + outside */
void word_rail(void);    /* the chapter rail (frame spec) with the ring on its focused tab */
void word_topBar(void);
void word_bottomLine(void);
void word_messagePlate(void);
#endif
