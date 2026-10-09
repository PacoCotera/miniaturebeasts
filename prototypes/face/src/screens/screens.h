/* The screens' binding tables (lvgl-switch.md §2.2): for the screen the props name, which words draw which regions, in draw order. */
#ifndef SCREENS_H
#define SCREENS_H
void pods_words(void);   /* Pods: the words of the state the props name (screens/pods.c) */
/* The props message `json` (len bytes) is the new truth for its screen: keep it as the spec "props" and draw the screen's words, the frame's after the screen's own. 0, or -1 with an error queued. */
int screens_props(const char *json, int len);
/* The nodes of the last draw, as JSON, for the checks (test mode): [{"id","kind","rect","colour","text","px","asset","region","layer"}…]. NULL when none. */
#endif
