#include "focus.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define JSMN_STATIC
#define JSMN_STRICT
#include "../vendor/jsmn.h"
#include "../spec/jnum.h"

#define MAXG 32
#define MAXE 8
#define MAXO 16
typedef struct { int kind; char text[FOCUS_ID]; int ahead; } entry_t;   /* kind: 1 name, 2 selector, 3 none, 4 nearestIn */
typedef struct { int n; entry_t e[MAXE]; } edge_t;
typedef struct { char name[32]; edge_t edge[4]; char axis; int norder; char order[MAXO][FOCUS_ID]; int stepper; /* bit d: the key d steps */ } group_t;
struct focus_graph { int ng; group_t g[MAXG]; int spatial; char roomKey[32]; };

static int tskip(const jsmntok_t *t, int i) { int k = t[i].size; i++; for (; k > 0; k--) i = tskip(t, i); return i; }
static int is(const char *js, const jsmntok_t *t, const char *s) { return t->type == JSMN_STRING && (int)strlen(s) == t->end - t->start && strncmp(js + t->start, s, strlen(s)) == 0; }
static void cp(char *dst, int cap, const char *js, const jsmntok_t *t) { int l = t->end - t->start; if (l >= cap) l = cap - 1; memcpy(dst, js + t->start, (size_t)l); dst[l] = 0; }
static int bad(char *err, int cap, const char *what, const char *g, const char *k) { if (cap > 0) snprintf(err, (size_t)cap, "group %s%s%s: %s", g, k[0] ? "." : "", k, what); return -1; }

/* one edge entry at token i: a string, or a nearestIn object; fills e and returns the next token, or -1 */
static int entry_at(const char *js, const jsmntok_t *t, int i, entry_t *e, char *err, int ecap, const char *g, const char *k) {
  if (t[i].type == JSMN_STRING) {
    cp(e->text, FOCUS_ID, js, &t[i]); e->ahead = 0;
    e->kind = strcmp(e->text, "none") == 0 ? 3 : strchr(e->text, '.') ? 2 : 1;
    return i + 1;
  }
  if (t[i].type == JSMN_ARRAY) return bad(err, ecap, "a list inside a list", g, k);
  if (t[i].type != JSMN_OBJECT) return bad(err, ecap, "an edge is a name, a selector, none, a nearestIn object or a list", g, k);
  int j = i + 1, have = 0; e->kind = 4; e->ahead = 0; e->text[0] = 0;
  for (int m = t[i].size; m > 0; m--) {
    if (is(js, &t[j], "nearestIn")) { if (t[j + 1].type != JSMN_STRING) return bad(err, ecap, "nearestIn names a group", g, k); cp(e->text, FOCUS_ID, js, &t[j + 1]); have = 1; }
    else if (is(js, &t[j], "ahead")) { e->ahead = t[j + 1].type == JSMN_PRIMITIVE && js[t[j + 1].start] == 't'; }
    else return bad(err, ecap, "an unknown key in a nearestIn object", g, k);
    j = tskip(t, j + 1);
  }
  if (!have) return bad(err, ecap, "nearestIn names a group", g, k);
  return j;
}
focus_graph_t *focus_graph_parse(const char *json, int len, char *err, int errcap) {
  if (errcap > 0) err[0] = 0;
  jsmn_parser p; jsmn_init(&p); int n = jsmn_parse(&p, json, (size_t)len, NULL, 0);
  if (n < 1 || !json_clean(json, len)) { if (errcap > 0) snprintf(err, (size_t)errcap, "the graph is not valid JSON"); return NULL; }
  jsmntok_t *t = (jsmntok_t *)malloc(sizeof *t * (size_t)n); if (!t) return NULL;
  jsmn_init(&p); if (jsmn_parse(&p, json, (size_t)len, t, (unsigned)n) != n || t[0].type != JSMN_OBJECT) { free(t); if (errcap > 0) snprintf(err, (size_t)errcap, "the graph is not one JSON object"); return NULL; }
  focus_graph_t *g = (focus_graph_t *)calloc(1, sizeof *g); if (!g) { free(t); return NULL; }
  g->spatial = 1; int i = 1;
  for (int m = t[0].size; m > 0; m--) {
    char key[32]; cp(key, sizeof key, json, &t[i]); int v = i + 1;
    if (strcmp(key, "fallback") == 0) { g->spatial = !is(json, &t[v], "none"); i = tskip(t, v); continue; }
    if (strcmp(key, "roomKey") == 0) { if (t[v].type == JSMN_STRING) cp(g->roomKey, sizeof g->roomKey, json, &t[v]); i = tskip(t, v); continue; }
    if (t[v].type != JSMN_OBJECT || g->ng >= MAXG) { i = tskip(t, v); continue; }   /* a key that is not a group (a note) */
    group_t *gr = &g->g[g->ng++]; snprintf(gr->name, sizeof gr->name, "%s", key);
    int has_axis = 0, has_order = 0, j = v + 1;
    for (int q = t[v].size; q > 0; q--) {
      char k[16]; cp(k, sizeof k, json, &t[j]); int w = j + 1;
      int d = strcmp(k, "up") == 0 ? FOCUS_UP : strcmp(k, "down") == 0 ? FOCUS_DOWN : strcmp(k, "left") == 0 ? FOCUS_LEFT : strcmp(k, "right") == 0 ? FOCUS_RIGHT : -1;
      if (d >= 0) {
        edge_t *e = &gr->edge[d]; e->n = 0;
        if (t[w].type == JSMN_ARRAY) {
          if (t[w].size == 0) { bad(err, errcap, "an empty list", key, k); goto refuse; }
          if (t[w].size > MAXE) { bad(err, errcap, "a list longer than the face holds", key, k); goto refuse; }
          int x = w + 1;
          for (int r = 0; r < t[w].size; r++) {
            x = entry_at(json, t, x, &e->e[e->n], err, errcap, key, k); if (x < 0) goto refuse;
            if (e->e[e->n].kind == 3 && r < t[w].size - 1) { bad(err, errcap, "\"none\" before the last entry", key, k); goto refuse; }
            e->n++;
          }
        } else { if (entry_at(json, t, w, &e->e[0], err, errcap, key, k) < 0) goto refuse; e->n = 1; }
      } else if (strcmp(k, "axis") == 0) { gr->axis = is(json, &t[w], "vertical") ? 'v' : is(json, &t[w], "horizontal") ? 'h' : 0; has_axis = 1; }
      else if (strcmp(k, "stepper") == 0) {
        if (t[w].type != JSMN_ARRAY || t[w].size == 0) { bad(err, errcap, "stepper is a non-empty list of keys", key, k); goto refuse; }
        int x = w + 1;
        for (int r = 0; r < t[w].size; r++, x = tskip(t, x)) {
          int sd = is(json, &t[x], "up") ? FOCUS_UP : is(json, &t[x], "down") ? FOCUS_DOWN : is(json, &t[x], "left") ? FOCUS_LEFT : is(json, &t[x], "right") ? FOCUS_RIGHT : -1;
          if (t[x].type != JSMN_STRING || sd < 0) { bad(err, errcap, "stepper names an unknown key", key, k); goto refuse; }
          if (gr->stepper & (1 << sd)) { bad(err, errcap, "stepper lists a key twice", key, k); goto refuse; }
          gr->stepper |= 1 << sd;
        }
      }
      else if (strcmp(k, "order") == 0 && t[w].type == JSMN_ARRAY) { has_order = 1; int x = w + 1; for (int r = 0; r < t[w].size; r++) { if (gr->norder < MAXO) cp(gr->order[gr->norder++], FOCUS_ID, json, &t[x]); x = tskip(t, x); } }
      j = tskip(t, w);
    }
    if (has_axis && has_order) { bad(err, errcap, "both order and axis", key, ""); goto refuse; }
    for (int d = 0; d < 4; d++) if (gr->stepper & (1 << d)) {
      if (gr->edge[d].n) { bad(err, errcap, "a stepper key has an edge", key, ""); goto refuse; }
      if (gr->axis == 'h' && (d == FOCUS_LEFT || d == FOCUS_RIGHT)) { bad(err, errcap, "a stepper key on the axis", key, ""); goto refuse; }
      if (gr->axis == 'v' && (d == FOCUS_UP || d == FOCUS_DOWN)) { bad(err, errcap, "a stepper key on the axis", key, ""); goto refuse; }
      if (has_order && (d == FOCUS_UP || d == FOCUS_DOWN)) { bad(err, errcap, "a stepper key on the order", key, ""); goto refuse; }
    }
    i = tskip(t, v);
  }
  free(t); return g;
refuse:
  free(t); free(g); return NULL;
}
void focus_graph_free(focus_graph_t *g) { free(g); }

/* ---- a move ---- */
static void groupof(const focus_target_t *t, char *out) { if (t->group[0]) { strcpy(out, t->group); return; } const char *d = strchr(t->id, '.'); size_t l = d ? (size_t)(d - t->id) : strlen(t->id); if (l > 31) l = 31; memcpy(out, t->id, l); out[l] = 0; }
static int ingroup(const focus_target_t *t, const char *g) { char b[32]; groupof(t, b); return strcmp(b, g) == 0; }
static const focus_target_t *by_id(const focus_target_t *t, int n, const char *id) { for (int i = 0; i < n; i++) if (strcmp(t[i].id, id) == 0) return &t[i]; return NULL; }
static const focus_target_t *first_in(const focus_target_t *t, int n, const char *g) { for (int i = 0; i < n; i++) if (ingroup(&t[i], g)) return &t[i]; return NULL; }
static const int DX[4] = { 0, 0, -1, 1 }, DY[4] = { -1, 1, 0, 0 };
typedef struct { long ox, oy; int dir; } origin_t;
static long cx2(const focus_target_t *t) { return 2L * t->x + t->w; }
static long cy2(const focus_target_t *t) { return 2L * t->y + t->h; }
/* the best candidate by score (least wins, the earlier on a tie); mode 0: 400·across + |along|; 1: along > 12, 5·along + 11·across; 2: along > 8, 5·along + 11·across */
static const focus_target_t *best(const focus_target_t *t, int n, origin_t o, const char *group, const char *skip_id, int mode) {
  const focus_target_t *pick = NULL; long ps = 0;
  for (int i = 0; i < n; i++) {
    if (group && !ingroup(&t[i], group)) continue; if (skip_id && strcmp(t[i].id, skip_id) == 0) continue;
    long vx = cx2(&t[i]) - o.ox, vy = cy2(&t[i]) - o.oy, along = vx * DX[o.dir] + vy * DY[o.dir], across = labs(vx * DY[o.dir] + vy * DX[o.dir]), s;
    if (mode == 0) s = 400 * across + labs(along); else { if (along <= (mode == 1 ? 12 : 8)) continue; s = 5 * along + 11 * across; }
    if (!pick || s < ps) { pick = &t[i]; ps = s; }
  }
  return pick;
}
static const char *res_of(const focus_resolve_t *r, int nr, const char *sel) { for (int i = 0; i < nr; i++) if (strcmp(r[i].sel, sel) == 0) return r[i].id; return ""; }
static const group_t *group_named(const focus_graph_t *g, const char *name) { for (int i = 0; i < g->ng; i++) if (strcmp(g->g[i].name, name) == 0) return &g->g[i]; return NULL; }
static void put(char *out, int cap, const char *id) { snprintf(out, (size_t)cap, "%s", id); }
int focus_move(const focus_graph_t *g, const focus_target_t *t, int n, const char *cur, int dir, const focus_resolve_t *res, int nres, const int *roomAt, char *out, int cap) {
  const int is_room = g->roomKey[0] && strcmp(cur, g->roomKey) == 0;
  const focus_target_t *c = by_id(t, n, cur);
  if (!c && !is_room) { put(out, cap, n ? t[0].id : cur); return 0; }
  origin_t o = { 0, 0, dir }; char gname[32] = "";
  if (is_room) { if (!roomAt) { put(out, cap, cur); return 0; } o.ox = 2L * roomAt[0] + roomAt[2]; o.oy = 2L * roomAt[1] + roomAt[3]; snprintf(gname, sizeof gname, "%s", g->roomKey); }
  else { o.ox = cx2(c); o.oy = cy2(c); groupof(c, gname); }
  const group_t *gr = group_named(g, gname);
  /* (0) a stepper key steps: the ring stays */
  if (gr && (gr->stepper & (1 << dir))) { put(out, cap, cur); return 1; }
  /* (1) the group's edge */
  if (gr && gr->edge[dir].n) {
    const edge_t *e = &gr->edge[dir];
    for (int k = 0; k < e->n; k++) {
      const entry_t *en = &e->e[k]; const focus_target_t *to = NULL;
      if (en->kind == 3) { put(out, cap, cur); return 0; }   /* none: the ring stays (only ever last in a list) */
      if (en->kind == 4) to = best(t, n, o, en->text, cur, en->ahead ? 1 : 0);
      else if (en->kind == 2) { const char *id = res_of(res, nres, en->text); to = id[0] ? by_id(t, n, id) : NULL; if (!to) { char grp[32]; const char *d = strchr(en->text, '.'); size_t l = (size_t)(d - en->text); if (l > 31) l = 31; memcpy(grp, en->text, l); grp[l] = 0; to = first_in(t, n, grp); } }
      else { to = by_id(t, n, en->text); if (!to) to = first_in(t, n, en->text); }
      if (to) { put(out, cap, to->id); return 0; }
    }
  }
  /* (2) the group's order for up and down, or its axis */
  if (c && gr && gr->norder && (dir == FOCUS_UP || dir == FOCUS_DOWN)) {
    int pos = -1, present[MAXO], np = 0;
    for (int i = 0; i < gr->norder; i++) if (by_id(t, n, gr->order[i])) { if (strcmp(gr->order[i], cur) == 0) pos = np; present[np++] = i; }
    if (pos >= 0) { int to = pos + (dir == FOCUS_DOWN ? 1 : -1); if (to < 0 || to >= np) put(out, cap, cur); else put(out, cap, gr->order[present[to]]); return 0; }
  } else if (c && gr && gr->axis) {
    int step = gr->axis == 'v' ? (dir == FOCUS_DOWN ? 1 : dir == FOCUS_UP ? -1 : 0) : (dir == FOCUS_RIGHT ? 1 : dir == FOCUS_LEFT ? -1 : 0);
    if (step) {
      /* the group's targets by index (a stable insertion sort over a small list), the ring's place, one step */
      const focus_target_t *items[64]; int ni = 0;
      for (int i = 0; i < n && ni < 64; i++) if (ingroup(&t[i], gname)) { int j = ni++; while (j > 0 && items[j - 1]->index > t[i].index) { items[j] = items[j - 1]; j--; } items[j] = &t[i]; }
      int at = -1; for (int i = 0; i < ni; i++) if (items[i] == c) at = i;
      if (at >= 0 && at + step >= 0 && at + step < ni) put(out, cap, items[at + step]->id); else put(out, cap, cur);
      return 0;
    }
  }
  /* (3) the state's fallback */
  if (g->spatial) { const focus_target_t *to = best(t, n, o, NULL, cur, 2); if (to) { put(out, cap, to->id); return 0; } }
  put(out, cap, cur);
  return 0;
}

void focus_next(const focus_graph_t *g, const focus_target_t *t, int n, const char *cur, int dir, const focus_resolve_t *res, int nres, const int *roomAt, char *out, int cap) { focus_move(g, t, n, cur, dir, res, nres, roomAt, out, cap); }
