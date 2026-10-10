/* Animation on the face (lvgl-switch.md §2.7): the timeline in JavaScript decides that something plays and whether input is held; the face plays it. An `event` message names a kind, a target, its
   length and whether it holds input; the face keeps it from the frame it arrived in, on the host's clock (face_frame(ms)), and the words read how far it has got. Positions move in whole pixels; nothing
   fades on the chrome or art layers. `props.motion = false` makes every event jump to its end (it is done at once). When an event ends the face says `done`, informative only. */
#ifndef ANIM_H
#define ANIM_H
#include <stdint.h>
enum { ANIM_SEAL, ANIM_WIPE, ANIM_RIBBON, ANIM_PLATE, ANIM_TICK, ANIM_FLASH, ANIM_DITHER, ANIM_ARRIVAL, ANIM_HATCH, ANIM_WAKE, ANIM_REST, ANIM_KINDS };
int anim_kind(const char *name);                 /* the kind's number, or -1 */
const char *anim_name(int kind);
void anim_reset(void);
/* An event begins now (the face's clock). Returns 0, or -1 when the table is full. With motion off it is over at once. */
int anim_add(int kind, const char *target, int ms, int hold, int cut, int from, int to, int motion);
/* The clock moved to `now` (ms): finished events are removed and each says `done`. */
void anim_tick(uint32_t now);
uint32_t anim_now(void);
/* Whether the (kind, target) event is playing, and how far: elapsed and length in ms, its from and to. 0 when it is not playing. */
typedef struct { int elapsed, ms, from, to; } anim_state_t;
int anim_get(int kind, const char *target, anim_state_t *out);
int anim_active(void);                           /* events playing: the screen is drawn again every frame */
int anim_cut(void);                              /* ends every playing event that carries `cut`: it jumps to its end and says `done`; the key that cut it then acts. Returns how many ended. */
int anim_holding(void);                          /* an event that holds input is playing: no key is acted on */
#endif
