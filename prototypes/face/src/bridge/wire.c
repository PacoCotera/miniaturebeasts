#include "wire.h"
#include "../screens/screens.h"
#include "../anim/anim.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../face.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define JSMN_STATIC
#define JSMN_STRICT
#include "../vendor/jsmn.h"
#include "../spec/jnum.h"

#define QCAP 64
#define MAX_IDS 256
static char *g_in;
static char *g_q[QCAP]; static int g_qh, g_qn;
static char *g_out;   /* the message poll last returned */
static int g_dropped, g_unreported;   /* messages lost to a full queue, in all and not yet reported */
static int g_hello, g_test, g_last_asset = -1, g_dirty_log, g_nprops, g_nevents;
static uint32_t g_seq; static int g_seq_set;
static char g_props_screen[32]; static char *g_props;
static char g_ids[MAX_IDS][96]; static int g_nids;

void wire_init(void) { g_dropped = g_unreported = 0; if (!g_in) g_in = (char *)malloc(WIRE_IN_CAP + 1); g_hello = 0; g_test = 0; g_qh = g_qn = 0; g_last_asset = -1; g_nprops = g_nevents = 0; g_seq_set = 0; g_nids = 0; anim_reset(); }
char *wire_in_buf(void) { return g_in; }
int wire_test_mode(void) { return g_test; }
void wire_changed(void) { g_dirty_log = 1; }
int wire_last_asset(void) { return g_last_asset; }
uint32_t wire_props_seq(void) { return g_seq; }
int wire_props_count(void) { return g_nprops; }
const char *wire_props_screen(void) { return g_props_screen; }
const char *wire_props_json(void) { return g_props ? g_props : ""; }
int wire_event_count(void) { return g_nevents; }
int wire_pending(void) { return g_qn; }

static void enq(char *m) { g_q[(g_qh + g_qn) % QCAP] = m; g_qn++; }
/* A full queue drops the message and counts it; when room returns the host is told how many were lost (an `error`), and every `log` carries the running total. */
static void push(char *m) {
  if (g_qn >= QCAP) { g_dropped++; g_unreported++; free(m); return; }
  if (g_unreported && g_qn + 2 <= QCAP) { char *e = (char *)malloc(64); if (e) { snprintf(e, 64, "{\"t\":\"error\",\"what\":\"queue: %d messages dropped\"}", g_unreported); g_unreported = 0; enq(e); } }
  enq(m);
}
const char *wire_poll(void) {
  free(g_out); g_out = NULL;
  if (!g_qn) return NULL;
  g_out = g_q[g_qh]; g_qh = (g_qh + 1) % QCAP; g_qn--; return g_out;
}
static void jesc(char *dst, size_t cap, const char *s) {   /* a JSON string body, escaped, into dst */
  size_t o = 0; for (; *s && o + 7 < cap; s++) { unsigned char c = (unsigned char)*s; if (c == '"' || c == '\\') { dst[o++] = '\\'; dst[o++] = (char)c; } else if (c < 0x20) o += (size_t)snprintf(dst + o, cap - o, "\\u%04x", c); else dst[o++] = (char)c; }
  dst[o] = 0;
}
void wire_error(const char *what) {
  char esc[400]; jesc(esc, sizeof esc, what); char *m = (char *)malloc(strlen(esc) + 32); if (!m) return;
  sprintf(m, "{\"t\":\"error\",\"what\":\"%s\"}", esc); push(m);
}
void wire_emit(const char *json) { size_t n = strlen(json); char *m = (char *)malloc(n + 1); if (!m) return; memcpy(m, json, n + 1); push(m); }
static int fail(const char *what) { wire_error(what); return -1; }

/* ---- reading a message ---- */
typedef struct { const char *js; jsmntok_t *tok; int n; } msg_t;
static int skip(const msg_t *m, int i) { int k = m->tok[i].size; i++; for (; k > 0; k--) i = skip(m, i); return i; }
static int key(const msg_t *m, const char *name) {   /* the value token of a top-level key, or -1 */
  if (m->tok[0].type != JSMN_OBJECT) return -1;
  int k = 1; for (int c = m->tok[0].size; c > 0; c--) { if ((int)strlen(name) == m->tok[k].end - m->tok[k].start && strncmp(m->js + m->tok[k].start, name, strlen(name)) == 0) return k + 1; k = skip(m, k + 1); }
  return -1;
}
static int num(const msg_t *m, int i, int *out) { return i >= 0 && m->tok[i].type == JSMN_PRIMITIVE && json_int(m->js + m->tok[i].start, m->tok[i].end - m->tok[i].start, out); }
static int str(const msg_t *m, int i, char *buf, int cap) { if (i < 0 || m->tok[i].type != JSMN_STRING) return 0; int l = m->tok[i].end - m->tok[i].start; if (l >= cap) return 0; memcpy(buf, m->js + m->tok[i].start, (size_t)l); buf[l] = 0; return 1; }
/* the first top-level key that appears twice, or NULL (a message with two answers to one question is refused, not resolved) */
static const char *dup_key(const msg_t *m) {
  static char name[48]; if (m->tok[0].type != JSMN_OBJECT) return NULL;
  int k = 1;
  for (int a = m->tok[0].size; a > 0; a--) {
    int j = skip(m, k + 1);
    for (int b = a - 1; b > 0; b--) {
      if (m->tok[k].end - m->tok[k].start == m->tok[j].end - m->tok[j].start && strncmp(m->js + m->tok[k].start, m->js + m->tok[j].start, (size_t)(m->tok[k].end - m->tok[k].start)) == 0) { int l = m->tok[k].end - m->tok[k].start; if (l > 47) l = 47; memcpy(name, m->js + m->tok[k].start, (size_t)l); name[l] = 0; return name; }
      j = skip(m, j + 1);
    }
    k = skip(m, k + 1);
  }
  return NULL;
}
static int flag(const msg_t *m, int i) { return i >= 0 && m->tok[i].type == JSMN_PRIMITIVE && m->tok[i].end - m->tok[i].start == 4 && strncmp(m->js + m->tok[i].start, "true", 4) == 0; }
static int hex(const char *s, uint32_t *rgb) { if (s[0] != '#' || strlen(s) != 7) return 0; for (int i = 1; i < 7; i++) if (!((s[i] >= '0' && s[i] <= '9') || (s[i] >= 'a' && s[i] <= 'f') || (s[i] >= 'A' && s[i] <= 'F'))) return 0; *rgb = (uint32_t)strtoul(s + 1, NULL, 16); return 1; }

/* ---- the messages in ---- */
static int on_hello(const msg_t *m) {
  int c = -1, ck = key(m, "contract"); if (ck < 0) return fail("hello: contract is required");
  if (!num(m, ck, &c)) return fail("hello: contract must be an integer");
  if (c != WIRE_CONTRACT) { char b[80]; snprintf(b, sizeof b, "contract %d expected, got %d", WIRE_CONTRACT, c); return fail(b); }
  g_hello = 1; g_test = flag(m, key(m, "test"));
  char *r = (char *)malloc(320); if (!r) return -1;
  snprintf(r, 320, "{\"t\":\"ready\",\"contract\":%d,\"size\":[%d,%d],\"fonts\":[\"inter-16\",\"inter-20\",\"inter-28\"],\"limits\":{\"objects\":%d,\"pictures\":%d,\"text\":%d,\"props\":%d},\"test\":%s}", WIRE_CONTRACT, FACE_W, FACE_H, prim_object_limit(), prim_asset_limit(), prim_text_size() - 1, WIRE_PROPS_CAP, g_test ? "true" : "false");
  push(r); return 0;
}
static int on_palette(const msg_t *m) {
  int c = key(m, "colours"); if (c < 0 || m->tok[c].type != JSMN_ARRAY) return fail("palette: colours must be an array of [name, \"#rrggbb\"]");
  prim_palette_clear(); int k = c + 1;
  for (int i = 0; i < m->tok[c].size; i++) {
    if (m->tok[k].type != JSMN_ARRAY || m->tok[k].size != 2) { prim_palette_clear(); return fail("palette: each colour is [name, \"#rrggbb\"]"); }
    char name[32], h[16]; uint32_t rgb;
    if (!str(m, k + 1, name, sizeof name) || !str(m, k + 2, h, sizeof h) || !hex(h, &rgb) || prim_palette_add(name, rgb) < 0) { prim_palette_clear(); return fail("palette: a colour is malformed or the palette is too long"); }
    k += 3;
  }
  return 0;
}
static int on_spec(const msg_t *m) {
  char screen[40]; if (!str(m, key(m, "screen"), screen, sizeof screen)) return fail("spec: screen is required");
  int j = key(m, "json"); if (j < 0 || m->tok[j].type != JSMN_OBJECT) return fail("spec: json must be the spec file's object");
  if (spec_load(screen, m->js + m->tok[j].start, (size_t)(m->tok[j].end - m->tok[j].start)) < 0) return fail(spec_error());
  return 0;
}
int wire_asset_slot(const char *id) { for (int i = 0; i < g_nids; i++) if (strcmp(g_ids[i], id) == 0) return i; return -1; }
static int g_slice[256][4], g_tile[256], g_has_slice[256];
int wire_asset_nine(int slot, int insets[4], int *tile) { if (slot < 0 || slot >= 256 || !g_has_slice[slot]) return 0; memcpy(insets, g_slice[slot], sizeof g_slice[slot]); if (tile) *tile = g_tile[slot]; return 1; }
static int slot_of(const char *id) { for (int i = 0; i < g_nids; i++) if (strcmp(g_ids[i], id) == 0) return i; return -1; }
static int on_asset(const msg_t *m) {
  char id[96]; int w = 0, h = 0, drop = flag(m, key(m, "drop"));
  if (!str(m, key(m, "id"), id, sizeof id)) return fail("asset: id is required");
  if (drop) { int s = slot_of(id); if (s >= 0) { prim_asset_free(s); g_ids[s][0] = 0; } return 0; }   /* a slot is released by name: the host recycles its least recently used picture this way */
  if (!num(m, key(m, "w"), &w) || !num(m, key(m, "h"), &h)) return fail("asset: w and h are required");
  char src[8]; if (!str(m, key(m, "src"), src, sizeof src)) strcpy(src, "heap");
  if (strcmp(src, "heap") != 0) return fail("asset: this transport holds src \"heap\" only (the Pi's \"file\" arrives with the host)");
  int slot = slot_of(id);
  if (slot < 0) { for (int i = 0; i < g_nids; i++) if (!g_ids[i][0]) { slot = i; break; } }
  if (slot < 0) { if (g_nids >= prim_asset_limit()) { char b[160]; snprintf(b, sizeof b, "asset %s: the picture table holds %d", id, prim_asset_limit()); return fail(b); } slot = g_nids++; }
  strcpy(g_ids[slot], id);
  if (!prim_asset(slot, w, h)) { g_ids[slot][0] = 0; char b[160]; snprintf(b, sizeof b, "asset %s: %dx%d is refused", id, w, h); return fail(b); }
  g_has_slice[slot] = 0; g_tile[slot] = 0;
  int sl = key(m, "slice");
  if (sl >= 0) {   /* a nine-slice's insets l, t, r, b (a byte each) and the tile of its edges and middle */
    if (m->tok[sl].type != JSMN_ARRAY || m->tok[sl].size != 4) { prim_asset_free(slot); g_ids[slot][0] = 0; return fail("asset: slice is [left, top, right, bottom]"); }
    for (int k = 0; k < 4; k++) { int v; if (!num(m, sl + 1 + k, &v) || v < 0 || v > 255) { prim_asset_free(slot); g_ids[slot][0] = 0; return fail("asset: a slice inset is an integer from 0 to 255"); } g_slice[slot][k] = v; }
    g_has_slice[slot] = 1;
  }
  int tl = key(m, "tile"); if (tl >= 0) { int v; if (!num(m, tl, &v) || v < 0 || v > 1024) { prim_asset_free(slot); g_ids[slot][0] = 0; return fail("asset: tile is an integer from 0 to 1024"); } g_tile[slot] = v; }
  g_last_asset = slot; return 0;
}
static int on_event(const msg_t *m) {
  char k[24]; if (!str(m, key(m, "kind"), k, sizeof k)) return fail("event: kind is required");
  int kind = anim_kind(k);
  if (kind < 0) { char b[80]; snprintf(b, sizeof b, "event: unknown kind %s", k); return fail(b); }
  int ms = 0, from = 0, to = 0; char target[48] = "";
  if (key(m, "ms") >= 0 && !num(m, key(m, "ms"), &ms)) return fail("event: ms must be a number");
  if (key(m, "from") >= 0 && !num(m, key(m, "from"), &from)) return fail("event: from must be a number");
  if (key(m, "to") >= 0 && !num(m, key(m, "to"), &to)) return fail("event: to must be a number");
  if (key(m, "target") >= 0 && !str(m, key(m, "target"), target, sizeof target)) return fail("event: target must be a string of at most 47 bytes");
  int hold = flag(m, key(m, "hold"));
  if (anim_add(kind, target, ms, hold, from, to, spec_bool("props", "motion", 1)) < 0) return fail("event: the face holds 24 events at once");
  g_nevents++; g_dirty_log = 1; screens_redraw(); return 0;
}
static const struct { const char *name; int code; } KEYS[] = { { "up", 17 }, { "down", 18 }, { "right", 19 }, { "left", 20 }, { "confirm", 10 }, { "back", 27 }, { "home", 2 }, { "research", 114 }, { "library", 108 }, { "habitat", 98 }, { "dock", 100 } };
static int on_key(const msg_t *m) {
  char k[16]; if (!str(m, key(m, "k"), k, sizeof k)) return fail("key: k is required");
  for (size_t i = 0; i < sizeof KEYS / sizeof *KEYS; i++) if (strcmp(KEYS[i].name, k) == 0) { face_key(KEYS[i].code, 1); face_key(KEYS[i].code, 0); g_dirty_log = 1; return 0; }
  char b[60]; snprintf(b, sizeof b, "key: unknown key %s", k); return fail(b);
}
static int on_props(const msg_t *m, int len) {
  if (len > WIRE_PROPS_CAP) { char b[80]; snprintf(b, sizeof b, "props: %d bytes exceeds the %d byte budget", len, WIRE_PROPS_CAP); return fail(b); }
  int seq; char screen[32];
  if (!num(m, key(m, "seq"), &seq) || seq < 0) return fail("props: seq is required");
  if (!str(m, key(m, "screen"), screen, sizeof screen)) return fail("props: screen is required");
  if (!spec_has(screen)) { char b[96]; snprintf(b, sizeof b, "props for the screen %s, whose spec is not loaded", screen); return fail(b); }
  if (g_seq_set && (uint32_t)seq < g_seq) return fail("props: seq went back");
  int r = key(m, "regions"); if (r >= 0 && m->tok[r].type != JSMN_OBJECT) return fail("props: regions must be an object");
  free(g_props); g_props = (char *)malloc((size_t)len + 1); if (!g_props) return -1; memcpy(g_props, m->js, (size_t)len); g_props[len] = 0;
  strcpy(g_props_screen, screen); g_seq = (uint32_t)seq; g_seq_set = 1; g_nprops++; g_dirty_log = 1;
  if (key(m, "frame") >= 0) return screens_props(g_props, len);   /* props that carry the frame are drawn by the words */
  return 0;
}
int wire_send(const char *json, int len) {
  if (len <= 0 || len > WIRE_IN_CAP) return fail("message: empty or larger than the in-buffer");
  jsmn_parser p; jsmn_init(&p);
  int n = jsmn_parse(&p, json, (size_t)len, NULL, 0);
  if (n < 1) return fail("message: not valid JSON");
  jsmntok_t *tok = (jsmntok_t *)malloc(sizeof *tok * (size_t)n); if (!tok) return fail("message: out of memory");
  jsmn_init(&p);
  if (jsmn_parse(&p, json, (size_t)len, tok, (unsigned)n) != n) { free(tok); return fail("message: not valid JSON"); }
  if (!json_clean(json, len)) { free(tok); return fail("message: not valid JSON"); }
  { int e = len; while (e > 0 && (json[e - 1] == ' ' || json[e - 1] == '\n' || json[e - 1] == '\t' || json[e - 1] == '\r')) e--; if (tok[0].end != e) { free(tok); return fail("message: not valid JSON (bytes after the object)"); } }
  msg_t m = { json, tok, n };
  { const char *dup = dup_key(&m); if (dup) { char b[96]; snprintf(b, sizeof b, "message: the key %.40s appears twice", dup); free(tok); return fail(b); } }
  int t = key(&m, "t"), rc = 0; char type[16] = "";
  if (tok[0].type != JSMN_OBJECT || !str(&m, t, type, sizeof type)) rc = fail("message: an object with a string t is required");
  else if (strcmp(type, "hello") == 0) rc = on_hello(&m);
  else if (!g_hello) rc = fail("message before hello");
  else if (strcmp(type, "palette") == 0) rc = on_palette(&m);
  else if (strcmp(type, "spec") == 0) rc = on_spec(&m);
  else if (strcmp(type, "asset") == 0) rc = on_asset(&m);
  else if (strcmp(type, "props") == 0) rc = on_props(&m, len);
  else if (strcmp(type, "event") == 0) rc = on_event(&m);
  else if (strcmp(type, "key") == 0) rc = on_key(&m);
  else { char b[48]; snprintf(b, sizeof b, "unknown message %s", type); rc = fail(b); }
  free(tok); return rc;
}

void wire_after_frame(double frame_ms) {
  if (!g_test || !g_dirty_log) return; g_dirty_log = 0;
  char *b = (char *)malloc(65536); if (!b) return;
  int n = prim_log_json(b, 60000);
  if (n < 0) { free(b); wire_error("log: more than 60000 bytes of regions and type"); return; }
  char tail[128]; int k = snprintf(tail, sizeof tail, ",\"dropped\":%d,\"frameMs\":%.3f,\"t\":\"log\"}", g_dropped, frame_ms); memcpy(b + n - 1, tail, (size_t)k + 1);
  push(b);
}
