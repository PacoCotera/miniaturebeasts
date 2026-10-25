#include "vocab.h"
#include "../prim/prim.h"
#include "../bridge/wire.h"
#include "../spec/spec.h"
#include <stdio.h>
#include <stdarg.h>
#include <string.h>

static int g_layer = LAYER_CHROME; static char g_reg[48];
uint32_t v_id(const char *s) { uint32_t h = 2166136261u; for (; *s; s++) { h ^= (uint8_t)*s; h *= 16777619u; } return h; }
void v_region(const char *region, int layer) { g_layer = layer; snprintf(g_reg, sizeof g_reg, "%s", region); prim_tag(layer, g_reg); }
/* A region for pictures only: a sprite takes its layer from its asset, so the word names the region and chooses no layer (the current one stays for whatever else follows). */
void v_name(const char *region) { snprintf(g_reg, sizeof g_reg, "%s", region); prim_tag(g_layer, g_reg); }
void v_layer(int layer) { g_layer = layer; prim_tag(layer, g_reg); }
void v_error(const char *what) { wire_error(what); }
uint32_t v_col(const char *name) {
  uint32_t rgb = 0;
  if (prim_palette_rgb(name, &rgb) < 0) { char b[96]; snprintf(b, sizeof b, "word: the palette has no colour %.40s", name); v_error(b); }
  return rgb;
}
/* the px of a size or font code: a code the face holds gives its px (1016: 16), any other number is a px as it was */
static int px_of(int code) { int p = prim_font_px(code); return p ? p : code; }
int v_cap(int px) { px = px_of(px); return px == 16 ? 12 : px == 20 ? 14 : px == 28 ? 21 : px * 3 / 4; }
static void settext(const char *s) { snprintf(prim_text(), (size_t)prim_text_size(), "%s", s); }
int v_measure(const char *s, int px) { settext(s); return prim_measure(px); }
void v_rect(const char *id, int x, int y, int w, int h, const char *colour) { prim_node(v_id(id), FN_RECT, x, y, w, h, v_col(colour), 0, 0); }
static const char *g_say_role = "", *g_say_ground = "", *g_say_shadow = "";   /* the role and ground the text nodes being sent are set by (the v_say forms set them around their calls), "" for a text set by size; the colour of the shadow the role casts there, "" for none */
void v_text(const char *id, const char *s, int x, int y, int w, int px, const char *colour) {
  if (g_say_shadow[0] && s[0]) {   /* the painted ground's shadow: the same string one pixel right and down, under it, drawn where its text node is */
    char sid[112]; snprintf(sid, sizeof sid, "%s.shadow", id);
    settext(s); prim_text_role("shadow", g_say_ground); prim_node(v_id(sid), FN_TEXT, x + 1, y + 1, w, px_of(px) * 5 / 4, v_col(g_say_shadow), px, v_cap(px));
  }
  settext(s); prim_text_role(g_say_role, g_say_ground); prim_node(v_id(id), FN_TEXT, x, y, w, px_of(px) * 5 / 4, v_col(colour), px, v_cap(px));
}
int v_cap_in(int top, int h, int px) { return top + v_fdiv(h - v_cap(px), 2); }
int v_cap_top(int y, int anchor, int px) {
  int cap = v_cap(px);
  switch (anchor) {
    case V_ANCHOR_LINE: {
      int pitch = v_si("frame", v_fmt("type.pitch.%d", px_of(px)), 0);
      if (pitch <= 0) { char b[96]; snprintf(b, sizeof b, "word: the frame has no type.pitch.%d", px_of(px)); v_error(b); return y; }
      return v_cap_in(y, pitch, px);
    }
    case V_ANCHOR_CAP: return y;
    case V_ANCHOR_BASE: return y - cap;
    case V_ANCHOR_MID: return y - v_fdiv(cap, 2);
  }
  { char b[96]; snprintf(b, sizeof b, "word: no text anchor %d", anchor); v_error(b); }
  return y;
}
static int line_refused(int anchor, int px) { return anchor == V_ANCHOR_LINE && v_si("frame", v_fmt("type.pitch.%d", px_of(px)), 0) <= 0; }
int v_line_at(const char *id, const char *s, int x, int y, int anchor, int px, const char *colour, int align) {
  if (line_refused(anchor, px)) { v_cap_top(y, anchor, px); return 0; }
  int w = v_measure(s, px);
  v_text(id, s, align == V_ALIGN_CENTRE ? x - v_half(w) : align == V_ALIGN_RIGHT ? x - w : x, v_cap_top(y, anchor, px), w, px, colour);
  return w;
}
int v_line_in(const char *id, const char *s, int bx, int bw, int y, int anchor, int px, const char *colour) {
  if (line_refused(anchor, px)) { v_cap_top(y, anchor, px); return 0; }
  int w = v_measure(s, px);
  v_text(id, s, bx + v_half(bw - w), v_cap_top(y, anchor, px), w, px, colour);
  return w;
}
int v_asset_size(const char *asset, int out[2]) { out[0] = out[1] = 0; int hd = asset && *asset ? wire_asset_slot(asset) : -1; return hd < 0 ? -1 : prim_asset_size(hd, out); }
int v_sprite(const char *id, const char *asset, int x, int y, int w, int h) {
  int hd = wire_asset_slot(asset); if (hd < 0) return 0;
  prim_node(v_id(id), FN_SPRITE, x, y, w, h, 0, hd, 0); return 1;
}

int v_sprite_window(const char *id, const char *asset, int sx, int sy, int x, int y, int w, int h) {
  if (!sx && !sy) return v_sprite(id, asset, x, y, w, h);
  int hd = wire_asset_slot(asset); if (hd < 0) return 0;
  prim_node(v_id(id), FN_SPRITE, x, y, w, h, ((uint32_t)sx << 16) | (uint32_t)sy, hd, 0); return 1;   /* the window of the picture at source (sx, sy): its w x h, 1:1 */
}

int v_nine(const char *id, const char *asset, int x, int y, int w, int h, const int insets[4]) {
  int hd = wire_asset_slot(asset); if (hd < 0) return 0;
  int ins[4] = { 0, 0, 0, 0 }, tile = 0; if (!wire_asset_nine(hd, ins, &tile) && insets) { for (int k = 0; k < 4; k++) ins[k] = insets[k]; }
  prim_node(v_id(id), FN_NINE, x, y, w, h, ((uint32_t)ins[0] << 24) | ((uint32_t)ins[1] << 16) | ((uint32_t)ins[2] << 8) | (uint32_t)ins[3], hd, tile); return 1;
}
int v_sprite_hidden(const char *id, const char *asset, int x, int y) {
  int hd = wire_asset_slot(asset); if (hd < 0) return 0;
  prim_node(v_id(id), FN_SPRITE, x, y, 0, 0, 1u << 16, hd, 0); return 1;   /* a window of no size at source x 1: it draws nothing and counts for nothing, and is the same node as the shown one */
}

int v_si(const char *spec, const char *path, int d) { return spec_int(spec, path, d); }
int v_sk(const char *spec, const char *base, int k) { return spec_int(spec, v_fmt("%s.%d", base, k), 0); }
void v_srect(const char *spec, const char *path, int r[4]) { if (!v_spec_rect(spec, path, r)) r[0] = r[1] = r[2] = r[3] = 0; }
const char *v_scol(const char *spec, const char *path) { static char b[16][24]; static unsigned k; char *o = b[k++ & 15]; spec_str(spec, path, o, 24); return o; }
const char *v_scol_or(const char *spec, const char *path, const char *d) { static char b[16][24]; static unsigned k; char *o = b[k++ & 15]; if (spec_str(spec, path, o, 24) <= 0) snprintf(o, 24, "%s", d); return o; }
const char *v_token(const char *spec, const char *name) { return v_scol_or(spec, v_fmt("colours.%s", name), name); }
const char *v_sstr(const char *spec, const char *path) { static char b[16][96]; static unsigned k; char *o = b[k++ & 15]; spec_str(spec, path, o, 96); return o; }
void v_clip_box(const char *id, int x, int y, int w, int h, int count) { prim_node(v_id(id), FN_CLIP, x, y, w, h, 0, count, 0); }
int v_snapshot(const char *id, int x, int y, int w, int h) { int s = prim_snapshot_handle(); if (s < 0) return 0; prim_node(v_id(id), FN_SPRITE, x, y, w, h, 0, s, 0); return 1; }
void v_composed(const char *id, int x, int y, int w, int h, const char *ops) { if (ops != prim_ops()) snprintf(prim_ops(), (size_t)prim_ops_size(), "%s", ops); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0); }
int v_slot_at(const char *id, const char *asset, const char *fallback, int x, int y, int w, int h, int shown, int hx, int hy) {
  if (!asset) asset = "";
  if (shown && *asset && v_sprite(id, asset, x, y, w, h)) return 1;   /* an empty id is no picture, whatever the table holds under it */
  { const char *under = fallback && *fallback ? fallback : asset; if (*under) v_sprite_hidden(id, under, hx, hy); } return 0;
}
int v_slot(const char *id, const char *asset, const char *fallback, int x, int y, int w, int h, int shown) { return v_slot_at(id, asset, fallback, x, y, w, h, shown, x, y); }

int v_dither(const char *id, const char *fromAsset, const char *toAsset, int level, int x, int y, int w, int h) {
  int fh = wire_asset_slot(fromAsset), th = wire_asset_slot(toAsset); if (fh < 0 || th < 0) return 0;
  snprintf(prim_ops(), (size_t)prim_ops_size(), "[[\"bayerPick\",%d,%d,%d,%d,%d]]", fh, th, level, x, y);
  int lf = prim_asset_layer_of(fh), lt = prim_asset_layer_of(th); v_layer(lf > lt ? lf : lt);   /* the higher layer of the two pictures (painted over art): a pick that draws pixels of the painted one is painted for the whole of the dither */
  prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0); return 1;
}

/* The same pick between two windows of the picture's size (two cells of an atlas; M1 §2.1): `fromAsset` NULL or "" is clear (a dither-in from nothing). */
int v_dither_window(const char *id, const char *fromAsset, int fsx, int fsy, const char *toAsset, int tsx, int tsy, int level, int x, int y, int w, int h) {
  int fh = fromAsset && *fromAsset ? wire_asset_slot(fromAsset) : -1, th = toAsset && *toAsset ? wire_asset_slot(toAsset) : -1;   /* NULL from: a dither-in from clear; NULL to: a dither-out to clear */
  if ((fromAsset && *fromAsset && fh < 0) || (toAsset && *toAsset && th < 0) || (fh < 0 && th < 0)) return 0;
  snprintf(prim_ops(), (size_t)prim_ops_size(), "[[\"bayerPick\",%d,%d,%d,%d,%d,%d,%d,%d,%d]]", fh, th, level, x, y, fsx, fsy, tsx, tsy);
  v_layer(prim_asset_layer_of(th >= 0 ? th : fh)); prim_node(v_id(id), FN_COMPOSED, x, y, w, h, 0, 0, 0); return 1;
}

/* the picture a glyph stands for (its id, "%d" the size), and the length of its UTF-8; the wait ⧗ (U+29D7) is a signed master, icon-wait-16 */
static const char *icon_of(const char *p, int *len) {
  static const struct { const char *g; const char *name; } T[] = { { "\xe2\x9a\xa1", "icon:energy:%d" }, { "\xe2\x97\x86", "icon:data:%d" }, { "\xe2\x9d\x80", "icon:essence:%d" }, { "\xe2\x9c\x95", "icon:cross:%d" }, { "\xe2\xa7\x97", "icon-wait-%d" } };
  for (unsigned i = 0; i < sizeof T / sizeof T[0]; i++) { size_t l = strlen(T[i].g); if (strncmp(p, T[i].g, l) == 0) { *len = (int)l; return T[i].name; } }
  return NULL;
}
int v_run_width(const char *s, int px) {
  int w = 0; char piece[V_STR]; int n = 0;
  for (const char *p = s; *p;) {
    int l; const char *ic = icon_of(p, &l);
    if (ic) { if (n) { piece[n] = 0; w += v_measure(piece, px); n = 0; } w += px_of(px) + 4; p += l; }
    else if (n < V_STR - 1) piece[n++] = *p++; else p++;
  }
  if (n) { piece[n] = 0; w += v_measure(piece, px); }
  return w;
}
/* An inline group: every node sent between v_inline(id) and v_inline_end() is one run in the log (a mark and its word, an icon and its figure), whatever calls drew them; a v_run or v_price inside it joins the group's run. */
void v_inline(const char *id) { prim_run(v_id(id)); }
void v_inline_end(void) { prim_run(0); }
v_run_t v_run(const char *id, const char *s, int x, int y, int px, const char *colour, int align) {
  uint32_t outer = prim_run_get(); if (!outer) prim_run(v_id(id));   /* the pieces and icons of this call are one run in the log (inside a v_inline group, the group's run) */
  v_run_t r; r.width = v_run_width(s, px);
  int cx = align == V_ALIGN_CENTRE ? x - (r.width + 1) / 2 : align == V_ALIGN_RIGHT ? x - r.width : x, i = 0;
  char piece[V_STR]; int n = 0;
  for (const char *p = s;;) {
    int l = 0; const char *ic = *p ? icon_of(p, &l) : NULL;
    if (!*p || ic) {
      if (n) { piece[n] = 0; int w = v_measure(piece, px); char nid[96]; snprintf(nid, sizeof nid, "%s.%d", id, i++); { /* the node carries only the piece's non-space glyphs: the spaces are advance, not ink */
        const char *lp = piece; while (*lp == ' ') lp++; int lead = w - v_measure(lp, px); char core[V_STR]; snprintf(core, sizeof core, "%s", lp); size_t cl = strlen(core); while (cl && core[cl - 1] == ' ') core[--cl] = 0;
        v_text(nid, core, cx + lead, y, *core ? v_measure(core, px) : 0, px, colour); }
      cx += w; n = 0; }
      if (!*p) break;
      int ip = px_of(px); char nid[96], aid[64]; snprintf(nid, sizeof nid, "%s.%d", id, i++); snprintf(aid, sizeof aid, ic, ip);
      int iy = y + v_cap(px) - ip + (int)(ip * 0.12 + 0.5);
      if (!v_sprite(nid, aid, cx + 2, iy, ip, ip)) { char b[96]; snprintf(b, sizeof b, "word: the picture %.50s is not on the face", aid); v_error(b); }
      cx += ip + 4; p += l;
    } else if (n < V_STR - 1) piece[n++] = *p++; else p++;
  }
  r.end = cx; if (!outer) prim_run(0); return r;
}
/* A price ("⚡ 2 ❀ 4 ◆ 1 ⧗ 20": Energy, Essence, Data and the bud's wait in that order, each icon and its figure): the four groups always have their two nodes (icon, figure), the ones the price does not name with no size, so a price that gains or loses a group
   changes nodes and never adds or removes one (§2.2). The wait's picture must be on the face (icon-wait-16): else v_error and its two nodes take no size, never a glyph or a bare figure. A price with no material in it ("free") is one text node. The icon's and the figure's layout is v_run's. */
static const struct { const char *glyph, *icon; } PRICE[V_PRICE_N] = { { "\xe2\x9a\xa1", "icon:energy:%d" }, { "\xe2\x9d\x80", "icon:essence:%d" }, { "\xe2\x97\x86", "icon:data:%d" }, { "\xe2\xa7\x97", "icon-wait-%d" } };
/* 1 when the price is exactly "icon figure" pairs in the order of PRICE ("⚡ 2 ❀ 4 ◆ 1 ⧗ 20"), the shape the views send; any other text ("+1 ❀", "free") is one ordinary run */
static int price_pairs(const char *s) {
  int last = -1; const char *p = s; if (!*p) return 0;
  while (*p) {
    int g = -1; for (int k = 0; k < V_PRICE_N; k++) if (strncmp(p, PRICE[k].glyph, strlen(PRICE[k].glyph)) == 0) g = k;
    if (g <= last) return 0; last = g; p += strlen(PRICE[g].glyph); if (*p != ' ') return 0; p++;
    if (!*p || *p == ' ') return 0; while (*p && *p != ' ') p++; if (*p == ' ') p++; else if (*p) return 0;
  }
  return 1;
}
int v_price(const char *id, const char *s, int x, int y, int px, const char *cols[V_PRICE_N], const char *other) {
  uint32_t outer = prim_run_get(); if (!outer) prim_run(v_id(id));   /* the icons and figures of this call are one run in the log (inside a v_inline group, the group's run) */
  if (!price_pairs(s)) { char nid[96]; snprintf(nid, sizeof nid, "%s.o", id); int e = v_run(nid, s, x, y, px, other, V_ALIGN_LEFT).end; if (!outer) prim_run(0); return e; }
  int cx = x, groups = 0; char fig[V_PRICE_N][24]; int has[V_PRICE_N];
  for (int g = 0; g < V_PRICE_N; g++) {
    const char *p = strstr(s, PRICE[g].glyph); has[g] = p != NULL; fig[g][0] = 0; if (!p) continue;
    p += strlen(PRICE[g].glyph); while (*p == ' ') p++; size_t n = 0; while (p[n] && p[n] != ' ' && n < sizeof fig[g] - 2) n++;   /* the figure: the word after the icon */
    snprintf(fig[g], sizeof fig[g], " %.*s", (int)n, p); groups++;
  }
  int ip = px_of(px), iy = y + v_cap(px) - ip + (int)(ip * 0.12 + 0.5);
  for (int g = 0; g < V_PRICE_N; g++) {
    char ic[48], nid[96]; snprintf(ic, sizeof ic, PRICE[g].icon, ip);
    if (has[g] && g == V_PRICE_N - 1 && !wire_has_asset(ic)) { char b[96]; snprintf(b, sizeof b, "word: the picture %.50s is not on the face", ic); v_error(b); has[g] = 0; }   /* the wait without its picture: no glyph, no bare figure */
    if (has[g]) {
      char prefix[V_STR]; const char *at = strstr(s, PRICE[g].glyph); snprintf(prefix, sizeof prefix, "%.*s", (int)(at - s), s);   /* each icon stands where the single run would put it: after the width of the price up to it */
      cx = x + (at == s ? 0 : v_run_width(prefix, px));
      snprintf(nid, sizeof nid, "%s.%d.i", id, g); if (!v_sprite(nid, ic, cx + 2, iy, ip, ip)) { char b[96]; snprintf(b, sizeof b, "word: the picture %.50s is not on the face", ic); v_error(b); }
      cx += ip + 4; int w = v_measure(fig[g], px), fw = v_measure(fig[g] + 1, px); snprintf(nid, sizeof nid, "%s.%d.t", id, g); v_text(nid, fig[g] + 1, cx + (w - fw), y, fw, px, cols[g]); cx += w;   /* the figure's leading space is advance, not ink */
    } else {
      snprintf(nid, sizeof nid, "%s.%d.i", id, g); v_sprite_hidden(nid, ic, cx, iy); snprintf(nid, sizeof nid, "%s.%d.t", id, g); v_text(nid, "", cx, y, 0, px, cols[g]);
    }
  }
  { char nid[96]; snprintf(nid, sizeof nid, "%s.o", id); int w = groups || !*s ? 0 : v_measure(s, px); v_text(nid, groups ? "" : s, cx, y, w, px, other); if (w) cx += w; }
  if (!outer) prim_run(0); return cx;
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

int v_fdiv(int a, int b) { int q = a / b; return (a % b != 0 && ((a < 0) != (b < 0))) ? q - 1 : q; }
int v_half(int a) { return v_fdiv(a + 1, 2); }
const char *v_fmt(const char *fmt, ...) {
  static char ring[32][160]; static unsigned k; char *b = ring[k++ & 31]; va_list ap; va_start(ap, fmt); vsnprintf(b, 160, fmt, ap); va_end(ap); return b;
}
const char *v_pstr(const char *path) { static char ring[32][V_STR]; static unsigned k; char *b = ring[k++ & 31]; spec_str("props", path, b, V_STR); return b; }
int v_pint(const char *path, int dflt) { return spec_int("props", path, dflt); }
int v_pbool(const char *path, int dflt) { return spec_bool("props", path, dflt); }
int v_plen(const char *path) { return spec_len("props", path); }

static int g_focal[4], g_has_focal;
void v_set_focal(const int box[4]) { if (box) { memcpy(g_focal, box, sizeof g_focal); g_has_focal = 1; } else g_has_focal = 0; }
const int *v_focal(void) { return g_has_focal ? g_focal : NULL; }

static char g_focus_override[48]; static int g_has_override;
void v_focus_set(const char *id) { if (id) { snprintf(g_focus_override, sizeof g_focus_override, "%s", id); g_has_override = 1; } else g_has_override = 0; }
const char *v_focus_cur(void) { return g_has_override ? g_focus_override : v_pstr("focus.cur"); }
const char *v_focus_cur_at(const char *path) { return g_has_override ? g_focus_override : v_pstr(path); }

void v_plate(const char *id, const char *namePath, int w, int x, int y) { v_plate_in("pods", id, namePath, w, x, y); }
int v_silhouette_box(const char *from, const char *to, int out[4]) { int fh = wire_asset_slot(from), th = wire_asset_slot(to); out[0] = out[1] = out[2] = out[3] = 0; return fh < 0 || th < 0 ? -1 : prim_asset_alpha_box(fh, th, out); }
int v_change_box(const char *from, const char *to, int out[4]) { int fh = wire_asset_slot(from), th = wire_asset_slot(to); out[0] = out[1] = out[2] = out[3] = 0; return fh < 0 || th < 0 ? -1 : prim_asset_diff_box(fh, th, out); }
void v_plate_in(const char *spec, const char *id, const char *namePath, int w, int x, int y) {
  char series[48], p[200]; snprintf(p, sizeof p, "%s.plate.series", namePath); spec_str(spec, p, series, sizeof series); snprintf(p, sizeof p, "%s.plate.h", namePath); int h = spec_int(spec, p, 24);
  char asset[96]; snprintf(asset, sizeof asset, "%s-%dx%d", series, w, h);
  if (!v_sprite(id, asset, x, y, w, h)) { char b[140]; snprintf(b, sizeof b, "word: the name plate %.60s is not on the face", asset); v_error(b); prim_refuse(); }
}

/* ---- text by role (frame.json type: fonts, grounds, roles) ----
   A role is resolved from the frame spec once per load of it and cached by its name and ground: its font (type.roles.<role>.font, a name of type.fonts that is one of the face's fonts), its
   colour on the ground (type.roles.<role>.colour.<kind>, or the variant's of "<role>.<variant>"), the shadow it casts there (type.roles.<role>.shadow.<kind>, "" for none) and its pitch
   (type.roles.<role>.pitch, else the frame's type.pitch of its px). A ground is a kind (field, pane, band, painted) or a palette name type.grounds maps to one. */
static const struct { const char *name; int code; } FONTS[] = { { "R16", PRIM_FONT_R16 }, { "M16", PRIM_FONT_M16 }, { "M20", PRIM_FONT_M20 }, { "SB28", PRIM_FONT_SB28 } };   /* prim.h's codes by the names type.fonts gives them */
typedef struct { char key[64]; int ok, code, pitch; char colour[24], shadow[24]; } role_t;
#define ROLE_CACHE 64
static role_t g_roles[ROLE_CACHE]; static int g_nroles; static unsigned g_roles_serial;
static int is_kind(const char *g) { return strcmp(g, "field") == 0 || strcmp(g, "pane") == 0 || strcmp(g, "band") == 0 || strcmp(g, "painted") == 0; }
static int role_refuse(const char *what, const char *role, const char *ground) { char b[160]; snprintf(b, sizeof b, "word: %s (role %.40s, ground %.24s)", what, role ? role : "", ground ? ground : ""); v_error(b); return 0; }
/* a font name of type.fonts that is one of the face's fonts: its code, else 0 */
static int font_named(const char *font) {
  int code = 0; for (unsigned i = 0; i < sizeof FONTS / sizeof FONTS[0]; i++) if (strcmp(font, FONTS[i].name) == 0) code = FONTS[i].code;
  return code && v_si("frame", v_fmt("type.fonts.%s.0", font), 0) == prim_font_px(code) ? code : 0;
}
/* the role's variant ("<role>.<variant>"): 0 for none named, 1 a palette name (that colour on every ground the role has), 2 an object (a subset of font, pitch, colour, shadow), -1 neither (or not there) */
static int variant_kind(const char *base, const char *dot, char *path, int cap) {
  if (!dot) return 0; snprintf(path, (size_t)cap, "type.roles.%s.variants.%s", base, dot + 1);
  int len = 0; const char *raw = spec_raw("frame", path, &len); char c[4];
  if (!raw || len <= 0) return -1;
  return raw[0] == '{' ? 2 : spec_str("frame", path, c, sizeof c) > 0 ? 1 : -1;
}
/* the role's font code and pitch (no ground: a measure), or 0 with an error. A variant's font and pitch come before the role's; a key it leaves out is the role's */
static int role_font(const char *role, int *code, int *pitch) {
  char base[40]; const char *dot = strchr(role ? role : "", '.'); snprintf(base, sizeof base, "%.*s", dot ? (int)(dot - role) : (int)strlen(role ? role : ""), role ? role : "");
  if (!base[0] || spec_len("frame", v_fmt("type.roles.%s", base)) <= 0) return role_refuse("the frame has no such role", role, "");
  char font[16]; spec_str("frame", v_fmt("type.roles.%s.font", base), font, sizeof font); *code = font_named(font);
  if (!*code) return role_refuse("the role's font is not one the face holds", role, "");
  char vp[120]; int vk = variant_kind(base, dot, vp, sizeof vp), vpitch = 0;
  if (vk < 0) return role_refuse("the role has no such variant", role, "");
  if (vk == 2) {
    int flen = 0; const char *fraw = spec_raw("frame", v_fmt("%s.font", vp), &flen);
    if (fraw) { char vf[16]; if (spec_str("frame", v_fmt("%s.font", vp), vf, sizeof vf) <= 0 || !(*code = font_named(vf))) return role_refuse("the variant's font is not one the face holds", role, ""); }
    vpitch = v_si("frame", v_fmt("%s.pitch", vp), 0);
  }
  *pitch = vpitch > 0 ? vpitch : v_si("frame", v_fmt("type.roles.%s.pitch", base), 0); if (*pitch <= 0) *pitch = v_si("frame", v_fmt("type.pitch.%d", prim_font_px(*code)), 0);
  return 1;
}
static const role_t *role_of(const char *role, const char *ground) {
  unsigned serial = spec_serial("frame"); if (serial != g_roles_serial) { g_nroles = 0; g_roles_serial = serial; }
  char key[64]; snprintf(key, sizeof key, "%s@%s", role ? role : "", ground ? ground : "");
  for (int i = 0; i < g_nroles; i++) if (strcmp(g_roles[i].key, key) == 0) { if (!g_roles[i].ok) role_refuse("the role is refused on this ground", role, ground); return g_roles[i].ok ? &g_roles[i] : NULL; }
  role_t r; memset(&r, 0, sizeof r); snprintf(r.key, sizeof r.key, "%s", key);
  if (role_font(role, &r.code, &r.pitch)) {
    char base[40], kind[16], vp[120]; const char *dot = strchr(role, '.'); snprintf(base, sizeof base, "%.*s", dot ? (int)(dot - role) : (int)strlen(role), role);
    int vk = variant_kind(base, dot, vp, sizeof vp);
    if (ground && is_kind(ground)) snprintf(kind, sizeof kind, "%s", ground); else spec_str("frame", v_fmt("type.grounds.%s", ground ? ground : ""), kind, sizeof kind);
    if (!is_kind(kind)) role_refuse("the frame has no such ground", role, ground);
    else if (spec_str("frame", v_fmt("type.roles.%s.colour.%s", base, kind), r.colour, sizeof r.colour) <= 0) role_refuse("the role has no colour on this ground", role, ground);
    else if (vk == 1 && spec_str("frame", vp, r.colour, sizeof r.colour) <= 0) role_refuse("the role has no such variant", role, ground);
    else if (vk == 2 && spec_raw("frame", v_fmt("%s.colour", vp), NULL) && spec_str("frame", v_fmt("%s.colour", vp), r.colour, sizeof r.colour) <= 0) role_refuse("the variant's colour is not a palette name", role, ground);
    else {
      if (vk == 2 && spec_len("frame", v_fmt("%s.shadow", vp)) >= 0 && *spec_raw("frame", v_fmt("%s.shadow", vp), NULL) == '{') spec_str("frame", v_fmt("%s.shadow.%s", vp, kind), r.shadow, sizeof r.shadow);   /* a variant's shadow map replaces the role's ({} = none) */
      else spec_str("frame", v_fmt("type.roles.%s.shadow.%s", base, kind), r.shadow, sizeof r.shadow);
      r.ok = 1;
    }
  }
  static role_t spare; role_t *slot = g_nroles < ROLE_CACHE ? &g_roles[g_nroles++] : &spare;   /* a full cache still answers, uncached */
  *slot = r; return r.ok ? slot : NULL;
}
/* the node of no size a refused role draws, so no node goes missing */
static void say_refused(const char *id, int x, int y) { settext(""); prim_text_role("", ""); prim_node(v_id(id), FN_TEXT, x, y, 0, 0, 0, PRIM_FONT_R16, v_cap(PRIM_FONT_R16)); }
static int say_top(int y, int anchor, const role_t *r) { if (anchor == V_ANCHOR_LINE) return r->pitch > 0 ? v_cap_in(y, r->pitch, r->code) : v_cap_top(y, anchor, r->code); return v_cap_top(y, anchor, r->code); }
static int say_at(const char *id, const char *s, int lx, int top, int w, const role_t *r, const char *role, const char *ground) {
  g_say_role = role; g_say_ground = ground; g_say_shadow = r->shadow; v_text(id, s, lx, top, w, r->code, r->colour); g_say_role = g_say_ground = g_say_shadow = "";   /* v_text draws the role's shadow first, where the text node is drawn */
  return w;
}
int v_say(const char *id, const char *s, int x, int y, int anchor, const char *role, const char *ground, int align) {
  const role_t *r = role_of(role, ground); if (!r) { say_refused(id, x, y); return 0; }
  if (anchor == V_ANCHOR_LINE && r->pitch <= 0) { role_refuse("the role has no pitch for a line anchor", role, ground); say_refused(id, x, y); return 0; }
  int w = v_measure(s, r->code), top = say_top(y, anchor, r);
  return say_at(id, s, align == V_ALIGN_CENTRE ? x - v_half(w) : align == V_ALIGN_RIGHT ? x - w : x, top, w, r, role, ground);
}
int v_say_in(const char *id, const char *s, int bx, int bw, int y, int anchor, const char *role, const char *ground) {
  const role_t *r = role_of(role, ground); if (!r) { say_refused(id, bx, y); return 0; }
  if (anchor == V_ANCHOR_LINE && r->pitch <= 0) { role_refuse("the role has no pitch for a line anchor", role, ground); say_refused(id, bx, y); return 0; }
  int w = v_measure(s, r->code); return say_at(id, s, bx + v_half(bw - w), say_top(y, anchor, r), w, r, role, ground);
}
v_run_t v_say_run(const char *id, const char *s, int x, int y, const char *role, const char *ground, int align) {
  const role_t *r = role_of(role, ground); if (!r) { v_run_t z = { 0, x }; say_refused(v_fmt("%s.0", id), x, y); return z; }
  g_say_role = role; g_say_ground = ground; g_say_shadow = r->shadow; v_run_t o = v_run(id, s, x, y, r->code, r->colour, align); g_say_role = g_say_ground = g_say_shadow = ""; return o;
}
int v_say_price(const char *id, const char *s, int x, int y, const char *role, const char *ground, const char *cols[V_PRICE_N], const char *other) {
  const role_t *r = role_of(role, ground), *o = r ? role_of(other, ground) : NULL; char c[V_PRICE_N][24]; const char *cp[V_PRICE_N];
  int ok = r && o; for (int g = 0; ok && g < V_PRICE_N; g++) { const role_t *q = role_of(cols[g], ground); if (!q) ok = 0; else { snprintf(c[g], sizeof c[g], "%s", q->colour); cp[g] = c[g]; } }
  if (!ok) { say_refused(v_fmt("%s.o", id), x, y); return x; }
  char oc[24]; snprintf(oc, sizeof oc, "%s", o->colour); int code = r->code;
  g_say_role = role; g_say_ground = ground; g_say_shadow = r->shadow; int end = v_price(id, s, x, y, code, cp, oc); g_say_role = g_say_ground = g_say_shadow = ""; return end;
}
int v_role_pitch(const char *role) { int code, pitch; return role_font(role, &code, &pitch) ? pitch : 0; }
int v_role_width(const char *s, const char *role) { int code, pitch; return role_font(role, &code, &pitch) ? v_run_width(s, code) : 0; }   /* a run's width: its icons inline, as v_say_run lays them */
void v_role_clip(const char *s, int maxw, const char *role, char *out, int cap) { int code, pitch; if (role_font(role, &code, &pitch)) v_clip(s, maxw, code, out, cap); else if (cap > 0) out[0] = 0; }
int v_role_wrap(const char *s, int maxw, const char *role, char *buf, int cap, int max) { int code, pitch; return role_font(role, &code, &pitch) ? v_wrap(s, maxw, code, buf, cap, max) : 0; }
int v_role_cap_top(int y, int anchor, const char *role) {
  int code, pitch; if (!role_font(role, &code, &pitch)) return y;
  if (anchor == V_ANCHOR_LINE) { if (pitch <= 0) { role_refuse("the role has no pitch for a line anchor", role, ""); return y; } return v_cap_in(y, pitch, code); }
  return v_cap_top(y, anchor, code);
}
int v_role_cap_in(int top, int h, const char *role) { int code, pitch; return role_font(role, &code, &pitch) ? v_cap_in(top, h, code) : top; }
int v_role_font(const char *role) { int code, pitch; return role_font(role, &code, &pitch) ? code : 0; }
