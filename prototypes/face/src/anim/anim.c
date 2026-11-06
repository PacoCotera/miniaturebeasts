#include "anim.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <string.h>

#define MAXA 24
typedef struct { int kind, ms, cut, skip, from, to; uint32_t start; char target[48], from_id[96]; int pending, ns, pf[2], pt[2], sms[ANIM_STEPS], sfr[ANIM_STEPS], step; uint32_t shown; } ev_t;   /* pending: a pan not yet drawn, its clock starts at the next frame; ns, pf, pt, sms, sfr: a pan's steps; step: the one shown, since the frame at `shown` */
static ev_t g_e[MAXA]; static int g_n; static uint32_t g_now, g_hold_until, g_skip_until; static int g_hold, g_skip; static char g_skip_target[48];   /* input is held until g_hold_until: the latest start + hold of any event, on the face's own clock, whether or not the event is still playing; a skippable event's hold is kept apart, until g_skip_until, so ✓ can end it alone */
static const char *NAMES[ANIM_KINDS] = { "seal", "wipe", "ribbon", "plate", "tick", "flash", "dither", "arrival", "hatch", "wake", "rest", "grow", "growNow", "moment", "read", "mend", "switch", "install", "sendoff", "incubate", "pan" };
int anim_kind(const char *name) { for (int i = 0; i < ANIM_KINDS; i++) if (strcmp(NAMES[i], name) == 0) return i; return -1; }
const char *anim_name(int kind) { return kind >= 0 && kind < ANIM_KINDS ? NAMES[kind] : "?"; }
void anim_reset(void) { g_n = 0; g_now = 0; g_hold = 0; g_hold_until = 0; g_skip = 0; g_skip_until = 0; g_skip_target[0] = 0; }
uint32_t anim_now(void) { return g_now; }
static void done(const ev_t *e) { char b[160]; snprintf(b, sizeof b, "{\"t\":\"done\",\"kind\":\"%s\",\"target\":\"%s\"}", NAMES[e->kind], e->target); wire_emit(b); }
int anim_add(int kind, const char *target, int ms, int hold, int cut, int skip, int from, int to, const char *from_id, int motion) {
  ev_t e; memset(&e, 0, sizeof e); e.kind = kind; snprintf(e.target, sizeof e.target, "%s", target ? target : ""); e.ms = ms < 0 ? 0 : ms; e.cut = cut; e.skip = skip; e.from = from; e.to = to; e.start = g_now; snprintf(e.from_id, sizeof e.from_id, "%s", from_id ? from_id : "");
  if (hold > 0 && skip) { if (!g_skip || (int)((g_now + (uint32_t)hold) - g_skip_until) > 0) g_skip_until = g_now + (uint32_t)hold; g_skip = 1; snprintf(g_skip_target, sizeof g_skip_target, "%s", e.target); }
  else if (hold > 0 && (!g_hold || (int)((g_now + (uint32_t)hold) - g_hold_until) > 0)) { g_hold_until = g_now + (uint32_t)hold; g_hold = 1; }
  if ((!motion && kind != ANIM_PLATE) || e.ms == 0) { done(&e); return 0; }   /* reduced motion: every event jumps to its end, but the message plate, which is words and not motion: it shows for its time, put up and taken down as cuts */
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == kind && strcmp(g_e[i].target, e.target) == 0) { g_e[i] = e; return 0; }   /* the same event again starts over */
  if (g_n >= MAXA) return -1;
  g_e[g_n++] = e; return 0;
}
void anim_tick(uint32_t now) {
  g_now = now;
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == ANIM_PAN) {   /* a pan: its first step from the first frame it is drawn in, each next one no sooner than its gap after the frame that showed the one before; over at its last */
    ev_t *e = &g_e[i];
    if (e->pending) { e->pending = 0; e->start = now; e->shown = now; e->step = 0; }
    else if (e->step + 1 < e->ns && (int)(now - e->shown) >= e->sms[e->step + 1] - e->sms[e->step]) { e->step++; e->shown = now; }
    if (e->step == e->ns - 1) e->ms = 0;   /* the last step is the screen's own camera: the pan ends at this frame */
  }
  for (int i = 0; i < g_n;) { if ((int)(now - g_e[i].start) >= g_e[i].ms) { ev_t e = g_e[i]; g_e[i] = g_e[--g_n]; done(&e); } else i++; }
}
int anim_add_pan(const char *target, const int from[2], const int to[2], const int *steps, const int *frac, int n, int motion) {
  if (n < 1 || n > ANIM_STEPS || steps[0] != 0 || frac[n - 1] != 100) return -1;
  for (int i = 0; i < n; i++) if (frac[i] < 0 || frac[i] > 100 || (i && (steps[i] <= steps[i - 1] || frac[i] < frac[i - 1]))) return -1;
  ev_t e; memset(&e, 0, sizeof e); e.kind = ANIM_PAN; snprintf(e.target, sizeof e.target, "%s", target ? target : ""); e.ms = 1 << 30; e.start = g_now; e.pending = 1; e.ns = n;   /* over at its last step (anim_tick), not by a length */
  for (int k = 0; k < 2; k++) { e.pf[k] = from[k]; e.pt[k] = to[k]; }
  for (int i = 0; i < n; i++) { e.sms[i] = steps[i]; e.sfr[i] = frac[i]; }
  if (!motion || n == 1) { done(&e); return 0; }   /* reduced motion, or one step: at its end at once */
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == ANIM_PAN && strcmp(g_e[i].target, e.target) == 0) { g_e[i] = e; return 0; }
  if (g_n >= MAXA) return -1;
  g_e[g_n++] = e; return 0;
}
int anim_pan_at(const char *target, int out[2]) {
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == ANIM_PAN && strcmp(g_e[i].target, target) == 0) {
    const ev_t *e = &g_e[i]; int s = e->pending ? 0 : e->step;
    for (int k = 0; k < 2; k++) out[k] = e->pf[k] + (e->pt[k] - e->pf[k]) * e->sfr[s] / 100;
    return 1;
  }
  return 0;
}
int anim_get(int kind, const char *target, anim_state_t *out) {
  for (int i = 0; i < g_n; i++) if (g_e[i].kind == kind && strcmp(g_e[i].target, target) == 0) { if (out) { out->elapsed = g_e[i].pending ? 0 : (int)(g_now - g_e[i].start); out->ms = g_e[i].ms; out->from = g_e[i].from; out->to = g_e[i].to; snprintf(out->from_id, sizeof out->from_id, "%s", g_e[i].from_id); } return 1; }
  return 0;
}
int anim_cut(void) {
  int n = 0;
  for (int i = 0; i < g_n;) { if (g_e[i].cut) { ev_t e = g_e[i]; g_e[i] = g_e[--g_n]; done(&e); n++; } else i++; }
  return n;
}
int anim_active(void) { return g_n; }
static int skip_holding(void) { return g_skip && (int)(g_now - g_skip_until) < 0; }
int anim_holding(void) { return (g_hold && (int)(g_now - g_hold_until) < 0) || skip_holding(); }
int anim_skippable(char *target, int cap) { if (!skip_holding()) return 0; if (target && cap > 0) snprintf(target, (size_t)cap, "%s", g_skip_target); return 1; }
int anim_skip(void) {
  int n = 0;
  for (int i = 0; i < g_n;) { if (g_e[i].skip) { ev_t e = g_e[i]; g_e[i] = g_e[--g_n]; done(&e); n++; } else i++; }
  g_skip = 0; g_skip_until = 0; g_skip_target[0] = 0;
  return n;
}
