/* The spec loader (lvgl-switch.md §2.3): the Station's spec files (the files of prototypes/ui/specs/station) parsed at run time into tokens the words read by path, so a nudge needs no
   compile. A spec is kept whole, as the host sent it, and read by dotted path ("regions.stage.rect.2": object keys and array indexes). Nothing here knows what a region or a word is: the
   words read their own numbers, and a rule that is not in the face is refused by the word that wants it. */
#ifndef SPEC_H
#define SPEC_H
#include <stddef.h>
/* Parse and keep `json` (len bytes) as the spec of `screen`, replacing one of the same name. 0, or -1 with spec_error() set (invalid JSON, or the table is full). */
int spec_load(const char *screen, const char *json, size_t len);
const char *spec_error(void);
int spec_has(const char *screen);
int spec_count(void);
/* A number at a path, or dflt when it is absent or not a number. */
int spec_int(const char *screen, const char *path, int dflt);
/* A string at a path copied into buf (NUL ended); 0 and buf empty when it is absent or not a string. Returns the length. */
int spec_str(const char *screen, const char *path, char *buf, int cap);
/* The size of the array or object at a path, or -1 when it is absent or a scalar. */
int spec_len(const char *screen, const char *path);
#endif
