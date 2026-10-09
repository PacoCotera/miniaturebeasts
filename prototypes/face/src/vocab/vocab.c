#include "vocab.h"
#include "../prim/prim.h"
#include "../bridge/wire.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <string.h>

static int g_layer = LAYER_CHROME;
uint32_t v_id(const char *s) { uint32_t h = 2166136261u; for (; *s; s++) { h ^= (uint8_t)*s; h *= 16777619u; } return h; }
void v_region(const char *region, int layer) { g_layer = layer; prim_tag(layer, region); }
void v_error(const char *what) { wire_error(what); }
uint32_t v_col(const char *name) {
  uint32_t rgb = 0;
  if (prim_palette_rgb(name, &rgb) < 0) { char b[96]; snprintf(b, sizeof b, "word: the palette has no colour %.40s", name); v_error(b); }
  return rgb;
}
int v_cap(int px) { return px == 16 ? 12 : px == 20 ? 14 : px == 28 ? 21 : px * 3 / 4; }
static void settext(const char *s) { snprintf(prim_text(), (size_t)prim_text_size(), "%s", s); }
int v_measure(const char *s, int px) { settext(s); return prim_measure(px); }
void v_rect(const char *id, int x, int y, int w, int h, const char *colour) { prim_node(v_id(id), FN_RECT, x, y, w, h, v_col(colour), 0, 0); }
void v_text(const char *id, const char *s, int x, int y, int w, int px, const char *colour) {
  settext(s); prim_node(v_id(id), FN_TEXT, x, y, w, px * 5 / 4, v_col(colour), px, v_cap(px));
}
int v_sprite(const char *id, const char *asset, int x, int y, int w, int h) {
  int hd = wire_asset_slot(asset); if (hd < 0) return 0;
  prim_node(v_id(id), FN_SPRITE, x, y, w, h, 0, hd, 0); return 1;
}

/* the icon a glyph stands for, and the length of its UTF-8 */
static const char *icon_of(const char *p, int *len) {
  static const struct { const char *g; const char *name; } T[] = { { "\xe2\x9a\xa1", "energy" }, { "\xe2\x97\x86", "data" }, { "\xe2\x9d\x80", "essence" }, { "\xe2\x9c\x95", "cross" } };
  for (unsigned i = 0; i < sizeof T / sizeof T[0]; i++) { size_t l = strlen(T[i].g); if (strncmp(p, T[i].g, l) == 0) { *len = (int)l; return T[i].name; } }
  return NULL;
}
int v_run_width(const char *s, int px) {
  int w = 0; char piece[V_STR]; int n = 0;
  for (const char *p = s; *p;) {
    int l; const char *ic = icon_of(p, &l);
    if (ic) { if (n) { piece[n] = 0; w += v_measure(piece, px); n = 0; } w += px + 4; p += l; }
    else if (n < V_STR - 1) piece[n++] = *p++; else p++;
  }
  if (n) { piece[n] = 0; w += v_measure(piece, px); }
  return w;
}
v_run_t v_run(const char *id, const char *s, int x, int y, int px, const char *colour, int align) {
  v_run_t r; r.width = v_run_width(s, px);
  int cx = align == V_ALIGN_CENTRE ? x - (r.width + 1) / 2 : align == V_ALIGN_RIGHT ? x - r.width : x, i = 0;
  char piece[V_STR]; int n = 0;
  for (const char *p = s;;) {
    int l = 0; const char *ic = *p ? icon_of(p, &l) : NULL;
    if (!*p || ic) {
      if (n) { piece[n] = 0; int w = v_measure(piece, px); char nid[96]; snprintf(nid, sizeof nid, "%s.%d", id, i++); v_text(nid, piece, cx, y, w, px, colour); cx += w; n = 0; }
      if (!*p) break;
      char nid[96], aid[64]; snprintf(nid, sizeof nid, "%s.%d", id, i++); snprintf(aid, sizeof aid, "icon:%s:%d", ic, px);
      int iy = y + v_cap(px) - px + (int)(px * 0.12 + 0.5);
      if (!v_sprite(nid, aid, cx + 2, iy, px, px)) { char b[96]; snprintf(b, sizeof b, "word: the picture %.50s is not on the face", aid); v_error(b); }
      cx += px + 4; p += l;
    } else if (n < V_STR - 1) piece[n++] = *p++; else p++;
  }
  r.end = cx; return r;
}
int v_wrap(const char *s, int maxw, int px, char *buf, int cap, int max) {
  int nl = 0, o = 0; char cur[V_STR * 2]; cur[0] = 0; int cl = 0;
  const char *p = s;
  while (1) {
    const char *e = p; while (*e && *e != ' ') e++;
    char word[V_STR]; int wl = (int)(e - p); if (wl >= V_STR) wl = V_STR - 1; memcpy(word, p, (size_t)wl); word[wl] = 0;
    char t[V_STR * 2]; if (cl) snprintf(t, sizeof t, "%s %s", cur, word); else snprintf(t, sizeof t, "%s", word);
    if (v_run_width(t, px) <= maxw || !cl) { snprintf(cur, sizeof cur, "%s", t); cl = 1; }
    else {
      if (nl < max && o + (int)strlen(cur) + 1 < cap) { strcpy(buf + o, cur); o += (int)strlen(cur) + 1; nl++; }
      snprintf(cur, sizeof cur, "%s", word); cl = 1;
    }
    if (!*e) break; p = e + 1;
  }
  if (cl && nl < max && o + (int)strlen(cur) + 1 < cap) { strcpy(buf + o, cur); nl++; }
  return nl;
}
void v_clip(const char *s, int maxw, int px, char *out, int cap) {
  snprintf(out, (size_t)cap, "%s", s);
  if (v_run_width(out, px) <= maxw) return;
  size_t n = strlen(s);
  for (;;) {
    char t[V_STR + 4]; snprintf(t, sizeof t, "%.*s\xe2\x80\xa6", (int)n, s);
    size_t m = n; if (m > 1) { m--; while (m > 1 && ((uint8_t)s[m] & 0xc0) == 0x80) m--; }   /* one character fewer, never inside a UTF-8 sequence */
    if (n <= 1 || v_run_width(t, px) <= maxw) { snprintf(out, (size_t)cap, "%s", t); return; }
    n = m;
  }
}
int v_spec_rect(const char *screen, const char *path, int r[4]) {
  if (spec_len(screen, path) != 4) return 0;
  char p[96]; for (int i = 0; i < 4; i++) { snprintf(p, sizeof p, "%s.%d", path, i); r[i] = spec_int(screen, p, 0); }
  return 1;
}
