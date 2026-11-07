/* Animation on the face (lvgl-switch.md §2.7): the timeline in JavaScript decides that something plays and whether input is held; the face plays it. An `event` message names a kind, a target, its
   length and whether it holds input; the face keeps it from the frame it arrived in, on the host's clock (face_frame(ms)), and the words read how far it has got. Positions move in whole pixels; nothing
   fades on the chrome or art layers. `props.motion = false` makes every event jump to its end (it is done at once). When an event ends the face says `done`, informative only. */
#ifndef ANIM_H
#define ANIM_H
#include <stdint.h>
enum { ANIM_SEAL, ANIM_WIPE, ANIM_RIBBON, ANIM_PLATE, ANIM_TICK, ANIM_FLASH, ANIM_DITHER, ANIM_ARRIVAL, ANIM_HATCH, ANIM_WAKE, ANIM_REST, ANIM_GROW, ANIM_GROW_NOW, ANIM_MOMENT, ANIM_READ, ANIM_MEND, ANIM_SWITCH, ANIM_INSTALL, ANIM_SENDOFF, ANIM_INCUBATE, ANIM_PAN, ANIM_KINDS };
int anim_kind(const char *name);                 /* the kind's number, or -1 */
const char *anim_name(int kind);
void anim_reset(void);
/* An event begins now (the face's clock). Returns 0, or -1 when the table is full. With motion off it is over at once. */
int anim_add(int kind, const char *target, int ms, int hold, int cut, int skip, int from, int to, const char *from_id, int motion);   /* from_id: a dither's previous picture id (a string), or NULL; skip: ✓ may end it and its hold (anim_skip) */
/* The clock moved to `now` (ms): finished events are removed and each says `done`. */
void anim_tick(uint32_t now);
uint32_t anim_now(void);
/* Whether the (kind, target) event is playing, and how far: elapsed and length in ms, its from and to. 0 when it is not playing. */
typedef struct { int elapsed, ms, from, to; char from_id[96]; } anim_state_t;   /* from_id: the picture a dither starts from, "" when it carries none */
int anim_get(int kind, const char *target, anim_state_t *out);
int anim_active(void);                           /* events playing: the screen is drawn again every frame */
int anim_cut(void);                              /* ends every playing event that carries `cut`: it jumps to its end and says `done`; the key that cut it then acts. Returns how many ended. */
int anim_holding(void);                          /* an event that holds input is playing: no key is acted on */
/* A skippable hold (lvgl-switch.md §2.1): an event carrying `skip` holds input. Its hold is kept apart from every other event's, so ending it leaves theirs. */
int anim_skippable(char *target, int cap);       /* 1 when a skippable hold runs (its event's target into target), else 0 */
int anim_skip(void);                             /* ✓ in a skippable hold: every playing event that carries `skip` jumps to its end and says `done`, and the skippable hold ends; the other holds stand. Returns how many ended */
/* A pan (Library Level 3's camera, library.json l3.close.pan): a camera that moves from `from` to `to` in whole-pixel steps, each a cut. Step i is the camera from + (to - from) * frac[i] / 100 on each
   axis (C's integer division, toward zero; frac rising, the last 100). Step 0 is shown from the first frame the pan is drawn in (the frame after it arrives); step i from the first frame at least
   steps[i] - steps[i - 1] ms after the frame that showed step i - 1 (steps: 0 first, rising), so two steps are never shown closer than their gap, whatever the frame times. The pan is over at its last
   step: the screen then draws its own camera (the props', which is `to`). n steps, 1 to ANIM_STEPS; with motion off it is over at once. A pan on the same target again starts over.
   Returns 0, or -1 when refused (n out of range, steps or frac out of order, the table full). */
#define ANIM_STEPS 4
int anim_add_pan(const char *target, const int from[2], const int to[2], const int *steps, const int *frac, int n, int motion);
/* The playing pan on `target`: the camera of its step now into out, 1; 0 when no pan plays there (out untouched). */
int anim_pan_at(const char *target, int out[2]);
#endif
