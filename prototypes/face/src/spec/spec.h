/* The spec loader (lvgl-switch.md §2.3): the Station's spec files (the files of prototypes/ui/specs/station) parsed at run time, so a nudge needs no compile. The loader holds a spec
   whole, strict JSON, as the host sent it, read by dotted path ("regions.stage.rect.2": object keys and array indexes); numbers are integers exactly. The rule it will enforce with the
   words (B3) is §2.3's: a region names its word, build or rule, and one that is not in the face is refused at load, never improvised; states hide regions, they do not destroy them. */
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
