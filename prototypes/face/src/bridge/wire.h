/* The bridge (lvgl-switch.md §2.1): one wire format, two transports. Messages are UTF-8 JSON objects, in and out of the face; in the sandbox they cross the WebAssembly boundary through
   a shared buffer (face_in_buf / face_send in, face_poll out), on the Pi as newline-delimited JSON over a Unix socket. Nothing on the frame path waits for an answer.
   In:  hello, palette, spec, asset, props, event, key.   Out: ready, focus, intent, done, log, error.
   The face keeps no game state: props are stored for the words (L2.0 B3), events and keys are validated and counted until then. */
#ifndef WIRE_H
#define WIRE_H
#include <stdint.h>
#define WIRE_CONTRACT 1
#define WIRE_IN_CAP (512 * 1024)   /* the largest message: a spec file */
#define WIRE_PROPS_CAP 32768       /* the props budget (§2.8) */
void wire_init(void);
char *wire_in_buf(void);
/* One message of `len` bytes already in the in-buffer (or any buffer). 0 when accepted; -1 when refused (an `error` is queued). */
int wire_send(const char *json, int len);
/* The next outgoing message, NUL ended, or NULL; valid until the next call. */
const char *wire_poll(void);
int wire_pending(void);
/* After a frame: in test mode a `log` message when anything changed since the last one. */
void wire_after_frame(double frame_ms);
int wire_test_mode(void);
void wire_changed(void);          /* the scene changed: the next frame in test mode logs it */
int wire_last_asset(void);        /* the handle the last accepted `asset` message got, or -1 */
uint32_t wire_props_seq(void);
int wire_props_count(void);
const char *wire_props_screen(void);
const char *wire_props_json(void);
int wire_asset_slot(const char *id);   /* the handle a picture of this id holds, or -1 when the host has not sent it */
int wire_event_count(void);
void wire_error(const char *what);   /* queue an `error` message */
#endif
