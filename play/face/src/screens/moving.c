/* The moving sets' loader (Station M1 §2.2): the `moving` spec checked whole and turned into the tables of moving.h. It refuses, through the spec's error: a hold on the walk, nap or shadow part that is not a multiple of 80;
   a key not in the part's cells; an unknown clip; more cells than the caps (16 at the walk size, S09 20 and S10 18; 8 close; 2 nap); a walk speed stride · 80 / (2 · mean beat) over 5 px a tick; a lift table that changes by
   more than 12 px between ticks or whose apex passes UI/UX's j cap (24 juvenile, 32 adult and elder); an elder tempo that is not a fraction. An atlas picture whose width is not 1 + n·w is refused when it arrives. */
#include "moving.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static mv_set_t g_sets[MV_SETS]; static int g_nsets;
static const char *M = "moving";
static char g_err[200]; static int g_bad;
static const char *P(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
#include <stdarg.h>
static const char *P(const char *fmt, ...) { static char b[32][160]; static int k; k = (k + 1) & 31; va_list a; va_start(a, fmt); vsnprintf(b[k], sizeof b[k], fmt, a); va_end(a); return b[k]; }
static void bad(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
static void bad(const char *fmt, ...) { if (g_bad) return; g_bad = 1; va_list a; va_start(a, fmt); int n = snprintf(g_err, sizeof g_err, "moving: "); vsnprintf(g_err + n, sizeof g_err - (size_t)n, fmt, a); va_end(a); }
static int has(const char *path) { return spec_raw(M, path, NULL) != NULL; }
static int num(const char *path0) { char path[96]; snprintf(path, sizeof path, "%s", path0); int v = spec_int(M, path, -0x7fffffff); if (v == -0x7fffffff) bad("%s is not a whole number", path); return v; }
static int hold80(const char *path0) { char path[96]; snprintf(path, sizeof path, "%s", path0); int v = num(path); if (!g_bad && (v <= 0 || v % 80)) bad("%s: the hold %d ms is not a multiple of 80", path, v); return v; }

static int cell_of(char (*names)[12], int n, const char *name) { for (int i = 0; i < n; i++) if (strcmp(names[i], name) == 0) return i; return -1; }
int moving_walk_cell(const mv_stage_t *s, const char *name) { return cell_of((char (*)[12])s->wcell, s->nbase, name); }
int moving_close_cell(const mv_stage_t *s, const char *name) { return cell_of((char (*)[12])s->ccell, s->nclose, name); }
int moving_shown(const mv_stage_t *s, int base, int facing_right, int native_right) { return base >= 0 && base < s->nbase && facing_right != native_right && s->mirror[base] >= 0 ? s->mirror[base] : base; }

/* a part's cells (names) into names; returns their count; refuses more than cap */
static int cells(const char *path0, char (*names)[12], int cap, int capq) {
  char path[96]; snprintf(path, sizeof path, "%s", path0);
  int n = spec_len(M, path); if (n < 1) { bad("%s must list the part's cells", path); return 0; }
  if (n > cap) { bad("%s has %d cells, the cap is %d", path, n, capq); return 0; }
  for (int i = 0; i < n; i++) { if (spec_str(M, P("%s.%d", path, i), names[i], 12) <= 0) { bad("%s.%d is not a cell name", path, i); return 0; } for (int j = 0; j < i; j++) if (!strcmp(names[i], names[j])) { bad("%s names %s twice", path, names[i]); return 0; } }
  return n;
}
static void size2(const char *path0, int *w, int *h) { char path[96]; snprintf(path, sizeof path, "%s", path0); if (spec_len(M, path) != 2) { bad("%s is [w, h]", path); return; } *w = num(P("%s.0", path)); *h = num(P("%s.1", path)); if (!g_bad && (*w <= 0 || *h <= 0)) bad("%s is not a size", path); }
static void loop(const char *path0, const mv_stage_t *s, mv_loop_t *l) {
  char path[96]; snprintf(path, sizeof path, "%s", path0);
  int n = spec_len(M, path); if (n < 1 || n > MV_LOOP) { bad("%s must be 1 to %d [cell, ms] pairs", path, MV_LOOP); return; }
  l->n = n;
  for (int i = 0; i < n; i++) { char nm[16]; if (spec_len(M, P("%s.%d", path, i)) != 2 || spec_str(M, P("%s.%d.0", path, i), nm, sizeof nm) <= 0) { bad("%s.%d is [cell, ms]", path, i); return; }
    l->cell[i] = moving_walk_cell(s, nm); if (l->cell[i] < 0) { bad("%s: the key %s is not in the part's cells", path, nm); return; }
    l->ms[i] = hold80(P("%s.%d.1", path, i)); }
}
static void lift(const char *path0, int *out, int *n, int cap) {
  char path[96]; snprintf(path, sizeof path, "%s", path0);
  int k = spec_len(M, path); if (k < 0 || k > 8) { bad("%s must be a list of at most 8 lifts", path); return; }
  *n = k; int prev = 0;
  for (int i = 0; i < k; i++) { out[i] = num(P("%s.%d", path, i)); if (g_bad) return; int d = out[i] - prev; if (d > 12 || d < -12) { bad("%s changes by %d px between ticks (at most 12)", path, d); return; } if (out[i] > cap) { bad("%s: the apex %d px passes the cap of %d", path, out[i], cap); return; } prev = out[i]; }
  if (prev > 12) bad("%s changes by %d px to the ground (at most 12)", path, prev);
}
static const char *KNOWN[] = { "walk", "walkCycle", "close", "nap", "shadow", "breathe", "asleep", "curl", "wake", "stir", "ack", "hop", "closeHop", "closeStep", "closeDitherMs", "blink", NULL };
static void stage(const char *sid, const char *sn, int si, mv_stage_t *s) {
  const char *B = P("%s.%s", sid, sn); char base[32]; snprintf(base, sizeof base, "%s", B);
  for (int i = 0, n = spec_len(M, base); i < n; i++) { char k[24], d[2]; spec_member(M, base, i, k, sizeof k, d, sizeof d); int ok = 0; for (int j = 0; KNOWN[j]; j++) if (!strcmp(KNOWN[j], k)) ok = 1; if (!ok) { bad("%s: unknown clip %s", base, k); return; } }
  int walkcap = !strcmp(sid, "S09") ? 20 : !strcmp(sid, "S10") ? 18 : 16;
  size2(P("%s.walk.size", base), &s->ww, &s->wh); if (g_bad) return;
  char mir[MV_CELLS][12]; s->nbase = cells(P("%s.walk.cells", base), s->wcell, MV_CELLS, walkcap); if (g_bad) return;
  int nm = has(P("%s.walk.mirror", base)) ? cells(P("%s.walk.mirror", base), mir, MV_CELLS, walkcap) : 0; if (g_bad) return;
  if (s->nbase + nm > walkcap) { bad("%s.walk: %d cells, the cap is %d", base, s->nbase + nm, walkcap); return; }
  s->nwalk = s->nbase + nm;
  for (int i = 0; i < s->nbase; i++) s->mirror[i] = -1;
  for (int i = 0; i < nm; i++) { int k = moving_walk_cell(s, mir[i]); if (k < 0) { bad("%s.walk.mirror: the key %s is not in the part's cells", base, mir[i]); return; } s->mirror[k] = s->nbase + i; memcpy(s->wcell[s->nbase + i], mir[i], 12); }
  size2(P("%s.close.size", base), &s->cw, &s->ch); if (g_bad) return;
  s->nclose = cells(P("%s.close.cells", base), s->ccell, 8, 8); if (g_bad) return;
  size2(P("%s.nap.size", base), &s->nw, &s->nh); if (g_bad) return;
  s->nnap = cells(P("%s.nap.cells", base), s->ncell, 2, 2); if (g_bad) return;
  for (int i = 0; i < s->nnap; i++) if (moving_walk_cell(s, s->ncell[i]) < 0) { bad("%s.nap: the key %s is not in the walk part's cells", base, s->ncell[i]); return; }
  size2(P("%s.shadow.walk", base), &s->sww, &s->swh); size2(P("%s.shadow.close", base), &s->scw, &s->sch); if (g_bad) return;
  loop(P("%s.breathe", base), s, &s->breathe); loop(P("%s.asleep", base), s, &s->asleep); if (g_bad) return;
  s->curl_crouch = hold80(P("%s.curl.crouch", base)); s->curl_nlower = spec_len(M, P("%s.curl.lower", base)); if (s->curl_nlower < 0 || s->curl_nlower > 4) { bad("%s.curl.lower is a list of at most 4", base); return; }
  for (int i = 0; i < s->curl_nlower; i++) s->curl_lower[i] = num(P("%s.curl.lower.%d", base, i));
  s->curl_dither = num(P("%s.curl.dither", base)); s->curl_after = hold80(P("%s.curl.breathAfter", base));
  s->wake_dither = num(P("%s.wake.dither", base)); s->wake_crouch = hold80(P("%s.wake.crouch", base)); s->wake_rise = num(P("%s.wake.rise", base));
  s->stir_dither = num(P("%s.stir.dither", base)); s->stir_lo = hold80(P("%s.stir.crouch.0", base)); s->stir_hi = hold80(P("%s.stir.crouch.1", base));
  s->ack_crouch = hold80(P("%s.ack.crouch", base)); if (g_bad) return;
  if (s->curl_dither != 4 || s->wake_dither != 4 || s->stir_dither != 4) { bad("%s: a walk-part dither is 4 levels", base); return; }
  if (moving_walk_cell(s, "stand") < 0 || moving_walk_cell(s, "crouch") < 0 || moving_walk_cell(s, "curl") < 0) { bad("%s.walk: stand, crouch and curl are cells of every set", base); return; }
  int jcap = si == MV_JUV ? 24 : 32;
  if (has(P("%s.hop", base))) {
    s->hopper = 1; s->hop_crouch = hold80(P("%s.hop.crouch", base)); s->hop_air = hold80(P("%s.hop.air", base)); s->hop_land = hold80(P("%s.hop.land", base)); s->hop_stand = hold80(P("%s.hop.stand", base));
    lift(P("%s.hop.lift", base), s->hop_lift, &s->hop_nlift, jcap); s->hop_travel = num(P("%s.hop.travel", base)); s->hop_min = num(P("%s.hop.hops.0", base)); s->hop_max = num(P("%s.hop.hops.1", base)); if (g_bad) return;
    if (s->hop_nlift != s->hop_air / 80) { bad("%s.hop.lift has %d ticks, the air %d", base, s->hop_nlift, s->hop_air / 80); return; }
    if (s->hop_travel <= 0) { bad("%s.hop.travel must be above 0", base); return; }
    if (moving_walk_cell(s, "air") < 0) { bad("%s.hop: the set has no air cell", base); return; }
    for (int i = 0, n = spec_len(M, P("%s.hop.shadow75", base)); i < n && i < 8; i++) { int t = num(P("%s.hop.shadow75.%d", base, i)); if (t >= 1 && t <= 8) s->sh75[t - 1] = 1; }
  }
  if (has(P("%s.walkCycle", base))) {   /* the legged walk's cycle, its own clip beside hop (the architect's Q4): the walk part stays the atlas's cells */
    s->walker = 1; s->cycle_n = spec_len(M, P("%s.walkCycle.cycle", base)); if (s->cycle_n < 1 || s->cycle_n > MV_LOOP) { bad("%s.walkCycle.cycle must be 1 to 8 [cell, ms] pairs", base); return; }
    int sum = 0; for (int i = 0; i < s->cycle_n; i++) { char nm[16]; spec_str(M, P("%s.walkCycle.cycle.%d.0", base, i), nm, sizeof nm); s->cycle_cell[i] = moving_walk_cell(s, nm); if (s->cycle_cell[i] < 0) { bad("%s.walkCycle.cycle: the key %s is not in the part's cells", base, nm); return; } s->cycle_ms[i] = hold80(P("%s.walkCycle.cycle.%d.1", base, i)); sum += s->cycle_ms[i]; }
    if (g_bad) return;
    s->beat_mean = sum / s->cycle_n; s->stride = num(P("%s.walkCycle.stride", base)); s->pass_rise = spec_int(M, P("%s.walkCycle.passRise", base), 0); if (g_bad) return;
    if (s->stride <= 0 || s->stride * 80 > 5 * 2 * s->beat_mean) { bad("%s.walkCycle: a walk speed of %d·80/(2·%d) px a tick passes 5", base, s->stride, s->beat_mean); return; }
    if (moving_walk_cell(s, "pass") < 0) { bad("%s.walkCycle: a legged walk has a pass cell", base); return; }
  }
  if (has(P("%s.closeStep", base))) {   /* the animator's S05 ruling: up close and in the hatch a step on the hop's schedule, no lift */
    char nm[16]; spec_str(M, P("%s.closeStep.cell", base), nm, sizeof nm); s->cstep_cell = moving_close_cell(s, nm); if (s->cstep_cell < 0) { bad("%s.closeStep: the key %s is not in the close part's cells", base, nm); return; }
    s->cstep_crouch = num(P("%s.closeStep.crouch", base)); s->cstep_ms = num(P("%s.closeStep.step", base)); if (g_bad) return;
  }
  if (has(P("%s.closeHop", base))) {
    s->chop_crouch = spec_int(M, P("%s.closeHop.crouch", base), 160); s->chop_air = spec_int(M, P("%s.closeHop.air", base), 400); s->chop_land = spec_int(M, P("%s.closeHop.land", base), 160); s->chop_travel = spec_int(M, P("%s.closeHop.travel", base), 0);
    lift(P("%s.closeHop.lift", base), s->chop_lift, &s->chop_nlift, jcap); if (g_bad) return;
    if (s->chop_nlift && s->chop_nlift != s->chop_air / 80) { bad("%s.closeHop.lift has %d ticks, the air %d", base, s->chop_nlift, s->chop_air / 80); return; }
    for (int i = 0; i < s->chop_nlift; i++) if (moving_close_cell(s, "air") < 0) { bad("%s.closeHop: the close part has no air cell", base); return; }
  }
  s->close_dither_ms = spec_int(M, P("%s.closeDitherMs", base), 180);
  if (has(P("%s.blink", base))) { s->blink_ms = num(P("%s.blink.0", base)); s->blink_lo = num(P("%s.blink.1", base)); s->blink_hi = num(P("%s.blink.2", base)); if (!g_bad && moving_close_cell(s, "blink") < 0) bad("%s.blink: the close part has no blink cell", base); }
  s->present = !g_bad;
}
/* the elder: the adult's holds at the tempo (a fraction: each hold × p / q, rounded to 80), its own lift and travel */
static int tempo80(int ms, int p, int q) { int v = (ms * p + q / 2) / q; return (v + 40) / 80 * 80; }
static void elder(const char *sid, mv_set_t *set) {
  const char *B = P("%s.elder", sid); char base[32]; snprintf(base, sizeof base, "%s", B);
  char from[16]; if (spec_str(M, P("%s.from", base), from, sizeof from) <= 0 || strcmp(from, "adult") || !set->st[MV_ADULT].present) { bad("%s.from must be \"adult\" with an adult stage", base); return; }
  if (spec_len(M, P("%s.tempo", base)) != 2) { bad("%s.tempo is a fraction [p, q]", base); return; }
  int p = num(P("%s.tempo.0", base)), q = num(P("%s.tempo.1", base)); if (g_bad) return; if (p <= 0 || q <= 0) { bad("%s.tempo is a fraction [p, q]", base); return; }
  mv_stage_t *e = &set->st[MV_ELDER]; *e = set->st[MV_ADULT];
  for (int i = 0; i < e->breathe.n; i++) e->breathe.ms[i] = tempo80(e->breathe.ms[i], p, q);
  for (int i = 0; i < e->asleep.n; i++) e->asleep.ms[i] = tempo80(e->asleep.ms[i], p, q);
  int *h80[] = { &e->curl_crouch, &e->curl_after, &e->wake_crouch, &e->stir_lo, &e->stir_hi, &e->ack_crouch, &e->hop_crouch, &e->hop_land, &e->hop_stand, &e->chop_crouch, &e->chop_land };
  for (unsigned i = 0; i < sizeof h80 / sizeof *h80; i++) if (*h80[i]) *h80[i] = tempo80(*h80[i], p, q);
  for (int i = 0; i < e->cycle_n; i++) e->cycle_ms[i] = tempo80(e->cycle_ms[i], p, q);
  if (has(P("%s.lift", base))) { lift(P("%s.lift", base), e->hop_lift, &e->hop_nlift, 32); e->hop_air = e->hop_nlift * 80; }
  if (has(P("%s.travel", base))) e->hop_travel = num(P("%s.travel", base));
  if (has(P("%s.closeHop.lift", base))) { lift(P("%s.closeHop.lift", base), e->chop_lift, &e->chop_nlift, 32); e->chop_air = e->chop_nlift * 80; }
  for (int i = 0, n = spec_len(M, base); i < n; i++) { char k[24], d[2]; spec_member(M, base, i, k, sizeof k, d, sizeof d); if (strcmp(k, "from") && strcmp(k, "tempo") && strcmp(k, "lift") && strcmp(k, "travel") && strcmp(k, "closeHop")) { bad("%s: unknown clip %s", base, k); return; } }
}
int moving_load(char *err, int cap) {
  static mv_set_t sets[MV_SETS]; int n = 0; g_bad = 0; g_err[0] = 0;
  int ns = spec_len(M, ""); (void)ns;
  for (int i = 0;; i++) {
    char sid[16], d[2]; if (!spec_member(M, "", i, sid, sizeof sid, d, sizeof d)) break;
    if (n >= MV_SETS) { bad("more than %d sets", MV_SETS); break; }
    if (strlen(sid) != 3 || sid[0] != 'S' || sid[1] < '0' || sid[1] > '9' || sid[2] < '0' || sid[2] > '9') { bad("%s is not a species id", sid); break; }
    mv_set_t *set = &sets[n]; memset(set, 0, sizeof *set); snprintf(set->id, sizeof set->id, "%s", sid);
    for (int k = 0, m = spec_len(M, sid); k < m; k++) { char key[24], v[2]; spec_member(M, sid, k, key, sizeof key, v, sizeof v); if (strcmp(key, "species") && strcmp(key, "native") && strcmp(key, "gait") && strcmp(key, "juvenile") && strcmp(key, "adult") && strcmp(key, "elder")) { bad("%s: unknown clip %s", sid, key); break; } }
    char nat[8]; spec_str(M, P("%s.native", sid), nat, sizeof nat); if (strcmp(nat, "right") && strcmp(nat, "left")) bad("%s.native is \"right\" or \"left\"", sid); set->native_right = !strcmp(nat, "right");
    char gait[12]; spec_str(M, P("%s.gait", sid), gait, sizeof gait); if (strcmp(gait, "hop") && strcmp(gait, "walk")) bad("%s.gait is \"hop\" or \"walk\"", sid);
    const char *clip = !strcmp(gait, "walk") ? "walkCycle" : "hop";   /* the gait's clip: hop is hop, walk is walkCycle (the architect's Q4) */
    if (has(P("%s.juvenile", sid))) stage(sid, "juvenile", MV_JUV, &set->st[MV_JUV]);
    if (has(P("%s.adult", sid))) stage(sid, "adult", MV_ADULT, &set->st[MV_ADULT]);
    if (has(P("%s.elder", sid))) elder(sid, set);
    static const char *SN[3] = { "juvenile", "adult", "elder" };   /* the loader reads the clip of the `gait` (hop: hop, walk: walkCycle): a stage with both hop and walkCycle, or without the one named, is refused (the architect's Q4) */
    if (!g_bad) for (int k = 0; k < 3; k++) if (set->st[k].present) { const mv_stage_t *t = &set->st[k];
      if (t->hopper && t->walker) bad("%s.%s has both hop and walkCycle", sid, SN[k]);
      else if (!strcmp(clip, "hop") ? !t->hopper : !t->walker) bad("%s.%s: the gait %s needs the clip %s, which the stage lacks", sid, SN[k], gait, clip); }
    if (g_bad) break;
    n++;
  }
  if (g_bad) { snprintf(err, (size_t)cap, "%s", g_err); return -1; }
  memcpy(g_sets, sets, sizeof sets); g_nsets = n; return 0;
}
const mv_set_t *moving_set(const char *sid) { for (int i = 0; i < g_nsets; i++) if (!strcmp(g_sets[i].id, sid)) return &g_sets[i]; return NULL; }
const mv_stage_t *moving_stage(const char *sid, int stage) { const mv_set_t *s = moving_set(sid); return s && stage >= 0 && stage < 3 && s->st[stage].present ? &s->st[stage] : NULL; }
/* moving:<stage>:<SXX>:<part>:<w>x<h>[:<look>] */
int moving_vet_atlas(const char *id, int w, int h, char *err, int cap) {
  char stg[12], sid[8], part[12]; int cw = 0, chh = 0;
  if (sscanf(id, "moving:%11[a-z]:%7[A-Z0-9]:%11[a-z]:%dx%d", stg, sid, part, &cw, &chh) != 5) { snprintf(err, (size_t)cap, "moving: atlas %.80s is not moving:<stage>:<SXX>:<part>:<w>x<h>", id); return -1; }
  int si = !strcmp(stg, "juvenile") ? MV_JUV : !strcmp(stg, "adult") ? MV_ADULT : !strcmp(stg, "elder") ? MV_ELDER : -1;
  const mv_stage_t *s = moving_stage(sid, si); if (!s) return 0;
  int n = !strcmp(part, "walk") ? s->nwalk : !strcmp(part, "close") ? s->nclose : !strcmp(part, "nap") ? s->nnap : !strcmp(part, "shadow") ? 2 : -1;
  if (n < 0) { snprintf(err, (size_t)cap, "moving: atlas %.80s names no part", id); return -1; }
  if (w != 1 + n * cw || h != chh) { snprintf(err, (size_t)cap, "moving: atlas %.80s is %d px, the set says %d cells", id, w, n); return -1; }
  return 0;
}
int moving_close_hop(const mv_stage_t *s, int dt, const int *lift, int nlift, int sn, int sd, const char **cell, int *up, int *sh75) {
  int cr = s->chop_crouch ? s->chop_crouch : 160, air = nlift * 80, land = s->chop_land ? s->chop_land : 160; *up = 0; *sh75 = 0;
  if (dt < 0 || dt >= cr + air + land) return 0;
  if (dt < cr || dt >= cr + air) { *cell = "crouch"; return 1; }
  int k = (dt - cr) / 80; *cell = "air"; *up = sd > 0 ? lift[k] * sn / sd : lift[k]; *sh75 = s->sh75[k] || (k >= 1 && k <= 3 && !s->hop_nlift);   /* shadow-75 on air ticks 2 to 4 */
  return 1;
}
