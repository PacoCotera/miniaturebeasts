#include "anim.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define MAXA 24
typedef struct { int kind, ms, cut, from, to; uint32_t start; char target[48], from_id[96]; } ev_t;
static ev_t g_e[MAXA]; static int g_n; static uint32_t g_now, g_hold_until; static int g_hold;   /* input is held until g_hold_until: the latest start + hold of any event, on the face's own clock, whether or not the event is still playing */
static const char *NAMES[ANIM_KINDS] = { "seal", "wipe", "ribbon", "plate", "tick", "flash", "dither", "arrival", "hatch", "wake", "rest", "grow", "growNow" };
int anim_kind(const char *name) { for (int i = 0; i < ANIM_KINDS; i++) if (strcmp(NAMES[i], name) == 0) return i; return -1; }
const char *anim_name(int kind) { return kind >= 0 && kind < ANIM_KINDS ? NAMES[kind] : "?"; }
void anim_reset(void) { g_n = 0; g_now = 0; g_hold = 0; g_hold_until = 0; }
uint32_t anim_now(void) { return g_now; }
static void done(const ev_t *e) { char b[160]; snprintf(b, sizeof b, "{\"t\":\"done\",\"kind\":\"%s\",\"target\":\"%s\"}", NAMES[e->kind], e->target); wire_emit(b); }
int anim_add(int kind, const char *target, int ms, int hold, int cut, int from, int to, const char *from_id, int motion) {
  ev_t e; memset(&e, 0, sizeof e); e.kind = kind; snprintf(e.target, sizeof e.target, "%s", target ? target : ""); e.ms = ms < 0 ? 0 : ms; e.cut = cut; e.from = from; e.to = to; e.start = g_now; snprintf(e.from_id, sizeof e.from_id, "%s", from_id ? from_id : "");
  if (hold > 0 && (!g_hold || (int)((g_now + (uint32_t)hold) - g_hold_until) > 0)) { g_hold_until = g_now + (uint32_t)hold; g_hold = 1; }
  if (!motion || e.ms == 0) { done(&e); return 0; }   /* reduced motion: every event jumps to its end */
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == kind && strcmp(g_e[i].target, e.target) == 0) { g_e[i] = e; return 0; }   /* the same event again starts over */
  if (g_n >= MAXA) return -1;
  g_e[g_n++] = e; return 0;
}
void anim_tick(uint32_t now) {
  g_now = now;
  for (int i = 0; i < g_n;) { if ((int)(now - g_e[i].start) >= g_e[i].ms) { ev_t e = g_e[i]; g_e[i] = g_e[--g_n]; done(&e); } else i++; }
}
int anim_get(int kind, const char *target, anim_state_t *out) {
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == kind && strcmp(g_e[i].target, target) == 0) { if (out) { out->elapsed = (int)(g_now - g_e[i].start); out->ms = g_e[i].ms; out->from = g_e[i].from; out->to = g_e[i].to; snprintf(out->from_id, sizeof out->from_id, "%s", g_e[i].from_id); } return 1; }
  return 0;
}
int anim_cut(void) {
  int n = 0;
  for (int i = 0; i < g_n;) { if (g_e[i].cut) { ev_t e = g_e[i]; g_e[i] = g_e[--g_n]; done(&e); n++; } else i++; }
  return n;
}
int anim_active(void) { return g_n; }
int anim_holding(void) { return g_hold && (int)(g_now - g_hold_until) < 0; }
