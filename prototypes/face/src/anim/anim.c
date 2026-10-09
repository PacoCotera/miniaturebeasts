#include "anim.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define MAXA 24
typedef struct { int kind, ms, hold, from, to; uint32_t start; char target[48]; } ev_t;
static ev_t g_e[MAXA]; static int g_n; static uint32_t g_now;
static const char *NAMES[ANIM_KINDS] = { "seal", "wipe", "ribbon", "plate", "tick", "flash", "dither", "arrival", "hatch", "wake", "rest" };
int anim_kind(const char *name) { for (int i = 0; i < ANIM_KINDS; i++) if (strcmp(NAMES[i], name) == 0) return i; return -1; }
const char *anim_name(int kind) { return kind >= 0 && kind < ANIM_KINDS ? NAMES[kind] : "?"; }
void anim_reset(void) { g_n = 0; g_now = 0; }
uint32_t anim_now(void) { return g_now; }
static void done(const ev_t *e) { char b[160]; snprintf(b, sizeof b, "{\"t\":\"done\",\"kind\":\"%s\",\"target\":\"%s\"}", NAMES[e->kind], e->target); wire_emit(b); }
int anim_add(int kind, const char *target, int ms, int hold, int from, int to, int motion) {
  ev_t e; memset(&e, 0, sizeof e); e.kind = kind; snprintf(e.target, sizeof e.target, "%s", target ? target : ""); e.ms = ms < 0 ? 0 : ms; e.hold = hold; e.from = from; e.to = to; e.start = g_now;
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
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == kind && strcmp(g_e[i].target, target) == 0) { if (out) { out->elapsed = (int)(g_now - g_e[i].start); out->ms = g_e[i].ms; out->from = g_e[i].from; out->to = g_e[i].to; } return 1; }
  return 0;
}
int anim_active(void) { return g_n; }
int anim_holding(void) { for (int i = 0; i < g_n; i++) if (g_e[i].hold) return 1; return 0; }
