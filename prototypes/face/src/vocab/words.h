/* The closed vocabulary, one C module each (lvgl-switch.md §2.2). A word reads the spec of its screen and the props by path and emits primitives; the screen's binding table
   (screens/) says which region uses which word. */
#ifndef WORDS_H
#define WORDS_H
/* common/ */
void word_panel(const char *id, int x, int y, int w, int h, const char *fill, const char *edge);   /* a filled pane with a 1 px edge (edge NULL: none) */
void word_hairline(const char *id, int x, int y, int len, const char *colour, int vertical);
void word_topBar(void);
void word_bottomLine(void);
void word_messagePlate(void);
#endif
