/* The store screen (store.json; the pods-reading scheme §2 and §3): a binding table. Three states on one screen, each in draw order. bench: the stage, the pod's column (its painting's slot, its name, why it came, "kept fresh"), the Data store
   (a label, a heading, the bar of one part a chapter and the name and price under each), the reading line and, while Data can still be put in, the Put-in panel (its head, the two arrows round the amount, what the level reaches), then the ring.
   teaser: the same column and store over the card that counts what was read. chapter: the close-up's slot, the page's words and the key to the marks on the left, a row for each trait (its look's picture slot, its trait, its plain name, the
   FIRST TIME SEEN pill and the mark with its words) in the middle, the promise cards on the right. Every rectangle, colour and offset is the spec's; the props name the words and states. A picture the host has not sent is an empty slot: nothing
   is drawn in its place. Focus is `focus.graph` of store.json on the boxes this file drew. */
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define S "store"
#define MAXP 12

static int isq(int n) { int r = 0; while ((r + 1) * (r + 1) <= n) r++; return r; }
#define ps(path, out) snprintf(out, sizeof out, "%s", v_pstr(path))   /* a props string into the caller's own array: the toolbox's ring is reused by the next call */
static void upper(char *s) { for (; *s; s++) if (*s >= 'a' && *s <= 'z') *s = (char)(*s - 32); }

/* a triangle of `size` px pointing left (dir -1) or right (1): one composed picture */
static void arrow(const char *id, int x, int y, int size, int dir, const char *col) {
  char ops[1024]; int n = snprintf(ops, sizeof ops, "["), w = size;
  for (int r = 0; r < size; r++) {
    int d2 = 2 * r - (size - 1); if (d2 < 0) d2 = -d2;
    int len = w - (d2 * w) / size; if (len < 1) len = 1;
    n += snprintf(ops + n, sizeof ops - (size_t)n, "%s[\"h\",%d,%d,%d,\"%s\"]", r ? "," : "", dir > 0 ? 0 : w - len, r, len, col);
  }
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_composed(id, x, y, w, size, ops);
}
/* one of the three marks of how a look passes on: ● (one), ●● (both), ◐ (mix), d px each; returns its width */
static int mark_width(const char *kind, int d, int gap) { return strcmp(kind, "both") == 0 ? 2 * d + gap : d; }
static void mark(const char *id, const char *kind, int x, int y, int d, int gap, const char *col) {
  char ops[1400]; int n, w = mark_width(kind, d, gap);
  if (strcmp(kind, "together") == 0) { v_slot(id, "mark-together", "mark-together", x, y, d, d, 1); return; }   /* [art] mark-together: the fourth mark, d x d, the art director's; empty until then */
  if (strcmp(kind, "mix") == 0) {
    n = snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"]", d, d, d / 2, col);
    for (int r = 0; r < d; r++) { int dy2 = 2 * r + 1 - d, dx = isq(d * d - dy2 * dy2) / 2; if (dx < 1) continue; n += snprintf(ops + n, sizeof ops - (size_t)n, ",[\"h\",%d,%d,%d,\"%s\"]", d / 2 - dx, r, dx, col); }
  } else {
    n = snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]", d, d, d / 2, col, col);
    if (strcmp(kind, "both") == 0) n += snprintf(ops + n, sizeof ops - (size_t)n, ",[\"rrect\",%d,0,%d,%d,%d,\"%s\",\"%s\"]", d + gap, d, d, d / 2, col, col);
  }
  snprintf(ops + n, sizeof ops - (size_t)n, "]"); v_composed(id, x, y, w, d, ops);
}

/* ---- the pod's column (bench and teaser) ---- */
static void pod_column(void) {
  char asset[V_STR]; ps("regions.pod.art", asset); int r[4]; v_srect(S, "regions.pod.art.rect", r);
  v_name("pod"); v_slot("pod.art", asset, asset, r[0], r[1], r[2], r[3], 1);
  v_region("pod", LAYER_TYPE);
  char name[V_STR], why[V_STR], buf[V_STR * 3], fresh[V_STR]; ps("regions.pod.name", name); ps("regions.pod.why", why); ps("regions.pod.fresh", fresh);
  v_say("pod.name", name, v_sk(S, "regions.pod.name.at", 0), v_sk(S, "regions.pod.name.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.pod.name.role"), "ground", V_ALIGN_LEFT);
  char role[40]; snprintf(role, sizeof role, "%s", v_sstr(S, "regions.pod.why.role"));
  int x = v_sk(S, "regions.pod.why.at", 0), y = v_sk(S, "regions.pod.why.at", 1), lines = *why ? v_role_wrap(why, v_si(S, "regions.pod.why.width", 232), role, buf, sizeof buf, v_si(S, "regions.pod.why.max", 3)) : 0;
  const char *q = buf; for (int k = 0; k < lines; k++) { v_say(v_fmt("pod.why.%d", k), q, x, y, V_ANCHOR_LINE, role, "ground", V_ALIGN_LEFT); y += v_role_pitch(role); q += strlen(q) + 1; }
  if (*fresh) v_say("pod.fresh", fresh, v_sk(S, "regions.pod.fresh.at", 0), v_sk(S, "regions.pod.fresh.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.pod.fresh.role"), "ground", V_ALIGN_LEFT);
}

/* ---- the Data store: label, heading, the bar of parts, the names and prices under it (bench and teaser) ---- */
static void data_store(const char *cur) {
  char label[V_STR], head[V_STR]; ps("regions.store.label", label); ps("regions.store.head", head);
  v_region("store", LAYER_TYPE);
  { char up[V_STR]; snprintf(up, sizeof up, "%s", label); upper(up); v_say("store.label", up, v_sk(S, "regions.store.label.at", 0), v_sk(S, "regions.store.label.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.store.label.role"), "ground", V_ALIGN_LEFT); }
  v_say_run("store.head", head, v_sk(S, "regions.store.head.at", 0), v_sk(S, "regions.store.head.at", 1), v_sstr(S, "regions.store.head.role"), "ground", V_ALIGN_LEFT);
  int r[4]; v_srect(S, "regions.store.bar.rect", r); int n = v_plen("regions.store.parts"); if (n > MAXP) n = MAXP; if (n < 1) return;
  int pad = v_si(S, "regions.store.bar.pad", 2), gap = v_si(S, "regions.store.bar.gap", 2), mn = v_si(S, "regions.store.bar.min", 56);
  v_region("store.bar", LAYER_CHROME);
  kit_panel("store.bar", r[0], r[1], r[2], r[3], v_scol(S, "regions.store.bar.ground"), v_scol(S, "regions.store.bar.edge"), NULL, 0);
  int price[MAXP], w[MAXP], total = 0, free_n = 0, avail = r[2] - 2 * pad - gap * (n - 1), small = 0, rest_total = 0;
  for (int i = 0; i < n; i++) { price[i] = v_pint(v_fmt("regions.store.parts.%d.price", i), 1); if (price[i] < 1) price[i] = 1; total += price[i]; }
  for (int i = 0; i < n; i++) { if (avail * price[i] / total < mn) { w[i] = mn; small += mn; } else { w[i] = 0; free_n++; rest_total += price[i]; } }
  for (int i = 0; i < n; i++) if (!w[i]) w[i] = free_n && rest_total ? (avail - small) * price[i] / rest_total : mn;
  { int sum = 0; for (int i = 0; i < n; i++) sum += w[i]; w[n - 1] += avail - sum; }   /* the rounding goes to the last part */
  int x = r[0] + pad, y = r[1] + pad, h = r[3] - 2 * pad; char c[24];
  for (int i = 0; i < n; i++) {
    char state[16], id[40], name[V_STR], pr[24]; ps(v_fmt("regions.store.parts.%d.state", i), state); ps(v_fmt("regions.store.parts.%d.name", i), name);
    snprintf(id, sizeof id, "part.%d", i);
    snprintf(c, sizeof c, "%s", v_sstr(S, v_fmt("regions.store.colours.%s", state)));
    v_region("store.bar", LAYER_CHROME); kit_panel(v_fmt("%s.fill", id), x, y, w[i], h, c, NULL, NULL, 0);
    if (strcmp(state, "adding") == 0) {   /* the stripes: one composed picture over the fill */
      char ops[1400]; int k = snprintf(ops, sizeof ops, "["), on = v_sk(S, "regions.store.stripe", 0), off = v_sk(S, "regions.store.stripe", 1), first = 1;
      for (int sx = 0; sx < w[i] && k < (int)sizeof ops - 60; sx += on + off) for (int t = 0; t < on && sx + t < w[i]; t++) { k += snprintf(ops + k, sizeof ops - (size_t)k, "%s[\"v\",%d,0,%d,\"%s\"]", first ? "" : ",", sx + t, h, v_sstr(S, "regions.store.colours.addingStripe")); first = 0; }
      snprintf(ops + k, sizeof ops - (size_t)k, "]"); v_composed(v_fmt("%s.stripes", id), x, y, w[i], h, ops);
    } else v_composed(v_fmt("%s.stripes", id), x, y, 0, 0, "[]");
    v_region("store.bar", LAYER_TYPE);
    if (strcmp(state, "read") == 0) v_say_in(v_fmt("%s.tick", id), "\xe2\x9c\x93", x, w[i], y + 8, V_ANCHOR_LINE, "label.open", "ground"); else v_say_in(v_fmt("%s.tick", id), "", x, w[i], y + 8, V_ANCHOR_LINE, "label.open", "ground");
    v_say_in(v_fmt("%s.name", id), name, x, w[i], v_si(S, "regions.store.name.y", 208), V_ANCHOR_LINE, strcmp(state, "read") == 0 ? "label.fog" : "label", "ground");
    snprintf(pr, sizeof pr, "\xe2\x97\x86 %d", v_pint(v_fmt("regions.store.parts.%d.price", i), 0));
    v_say_run(v_fmt("%s.price", id), pr, x + w[i] / 2, v_si(S, "regions.store.price.y", 228), v_sstr(S, "regions.store.price.role"), "ground", V_ALIGN_CENTRE);
    v_region("store.bar", LAYER_CHROME);
    kit_panel(v_fmt("%s.cur", id), x, r[1] + r[3] + 3, w[i], 3, v_scol(S, "regions.store.bar.edge"), NULL, NULL, !(v_pbool(v_fmt("regions.store.parts.%d.cur", i), 0) && strcmp(cur, "bar") == 0));   /* the chapter under the ring: a 3 px bar below its part; the other parts keep the node with no size */
    x += w[i] + gap;
  }
}

/* ---- the reading line (bench) ---- */
static void reading_line(void) {
  int r[4]; v_srect(S, "regions.reading.rule.rect", r); v_region("reading", LAYER_CHROME); kit_hairline("reading.rule", r[0], r[1], r[2], v_scol(S, "regions.reading.rule.colour"), 0, NULL);
  char line[V_STR], sub[V_STR]; ps("regions.reading.line", line); ps("regions.reading.sub", sub); v_region("reading", LAYER_TYPE);
  v_say_run("reading.line", line, v_sk(S, "regions.reading.line.at", 0), v_sk(S, "regions.reading.line.at", 1), v_sstr(S, "regions.reading.line.role"), "ground", V_ALIGN_LEFT);
  v_say("reading.sub", sub, v_sk(S, "regions.reading.sub.at", 0), v_sk(S, "regions.reading.sub.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.reading.sub.role"), "ground", V_ALIGN_LEFT);
}

/* ---- the Put-in panel (bench) ---- */
static void put_panel(void) {
  int r[4]; v_srect(S, "regions.put.rect", r); v_region("put", LAYER_CHROME);
  kit_bezel("put", r[0], r[1], r[2], r[3], v_si(S, "regions.put.radius", 8), v_scol(S, "regions.put.fill"), v_scol(S, "regions.put.edge"), v_scol(S, "regions.put.bevel"), NULL);
  char head[V_STR], fills[V_STR], more[V_STR], cap[V_STR], amt[24]; ps("regions.put.head", head); ps("regions.put.fills", fills); ps("regions.put.more", more); ps("regions.put.cap", cap);
  int amount = v_pint("regions.put.amount", 0), size = v_si(S, "regions.put.arrow.size", 22);
  snprintf(amt, sizeof amt, "%d", amount);
  v_region("put", LAYER_CHROME);
  arrow("put.left", r[0] + v_sk(S, "regions.put.arrow.left", 0), r[1] + v_sk(S, "regions.put.arrow.left", 1), size, -1, v_scol(S, v_pbool("regions.put.less", 0) ? "regions.put.arrow.colour" : "regions.put.arrow.dim"));
  arrow("put.right", r[0] + v_sk(S, "regions.put.arrow.right", 0), r[1] + v_sk(S, "regions.put.arrow.right", 1), size, 1, v_scol(S, v_pbool("regions.put.greater", 0) ? "regions.put.arrow.colour" : "regions.put.arrow.dim"));
  v_region("put", LAYER_TYPE);
  v_say_run("put.head", head, r[0] + v_sk(S, "regions.put.head.at", 0), r[1] + v_sk(S, "regions.put.head.at", 1), v_sstr(S, "regions.put.head.role"), "panel", V_ALIGN_LEFT);
  v_name("put"); v_slot("put.amount.icon", "icon:data:16", "icon:data:16", r[0] + v_sk(S, "regions.put.amount.icon", 0), r[1] + v_sk(S, "regions.put.amount.icon", 1), 16, 16, 1);   /* the Data icon is 16 px: the figure beside it is the name role */
  v_region("put", LAYER_TYPE);
  v_say("put.amount", amt, r[0] + v_sk(S, "regions.put.amount.at", 0), r[1] + v_sk(S, "regions.put.amount.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.put.amount.role"), "panel", V_ALIGN_LEFT);
  v_say_run("put.fills", fills, r[0] + v_sk(S, "regions.put.fills.at", 0), r[1] + v_sk(S, "regions.put.fills.at", 1), v_sstr(S, "regions.put.fills.role"), "panel", V_ALIGN_LEFT);
  v_say_run("put.more", more, r[0] + v_sk(S, "regions.put.more.at", 0), r[1] + v_sk(S, "regions.put.more.at", 1), v_sstr(S, "regions.put.more.role"), "panel", V_ALIGN_LEFT);
  v_say_run("put.cap", cap, r[0] + v_sk(S, "regions.put.cap.at", 0), r[1] + v_sk(S, "regions.put.cap.at", 1), v_sstr(S, "regions.put.cap.role"), "panel", V_ALIGN_LEFT);
}

/* ---- the teaser card (teaser) ---- */
static void teaser_card(void) {
  int r[4]; v_srect(S, "regions.teaser.rect", r); v_region("teaser", LAYER_CHROME);
  kit_bezel("teaser", r[0], r[1], r[2], r[3], v_si(S, "regions.teaser.radius", 8), v_scol(S, "regions.teaser.fill"), v_scol(S, "regions.teaser.edge"), v_scol(S, "regions.teaser.bevel"), NULL);
  char eb[V_STR], names[V_STR], firsts[V_STR]; ps("regions.teaser.eyebrow", eb); ps("regions.teaser.names", names); ps("regions.teaser.firsts", firsts); upper(eb);
  v_region("teaser", LAYER_TYPE);
  v_say_in("teaser.eyebrow", eb, r[0], r[2], r[1] + v_si(S, "regions.teaser.eyebrow.y", 44), V_ANCHOR_LINE, v_sstr(S, "regions.teaser.eyebrow.role"), "panel");
  v_say_in("teaser.names", names, r[0], r[2], r[1] + v_si(S, "regions.teaser.names.y", 72), V_ANCHOR_LINE, v_sstr(S, "regions.teaser.names.role"), "panel");
  v_say_in("teaser.firsts", firsts, r[0], r[2], r[1] + v_si(S, "regions.teaser.firsts.y", 126), V_ANCHOR_LINE, v_sstr(S, "regions.teaser.firsts.role"), "panel");
}

/* ---- the chapter page ---- */
static void chapter_page(void) {
  int c[4]; v_srect(S, "regions.chapter.closeup.rect", c); char asset[V_STR]; ps("regions.chapter.closeup", asset);
  v_name("closeup"); v_slot("closeup", asset, asset, c[0], c[1], c[2], c[3], 1);
  v_region("chapter", LAYER_TYPE);
  char eb[V_STR], nm[V_STR], sub[V_STR], buf[V_STR * 3]; ps("regions.chapter.eyebrow", eb); ps("regions.chapter.name", nm); ps("regions.chapter.sub", sub); upper(eb);
  v_say("chapter.eyebrow", eb, v_sk(S, "regions.chapter.eyebrow.at", 0), v_sk(S, "regions.chapter.eyebrow.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.chapter.eyebrow.role"), "ground", V_ALIGN_LEFT);
  v_say("chapter.name", nm, v_sk(S, "regions.chapter.name.at", 0), v_sk(S, "regions.chapter.name.at", 1), V_ANCHOR_LINE, v_sstr(S, "regions.chapter.name.role"), "ground", V_ALIGN_LEFT);
  { char role[40]; snprintf(role, sizeof role, "%s", v_sstr(S, "regions.chapter.sub.role")); int x = v_sk(S, "regions.chapter.sub.at", 0), y = v_sk(S, "regions.chapter.sub.at", 1), n = v_role_wrap(sub, v_si(S, "regions.chapter.sub.width", 244), role, buf, sizeof buf, v_si(S, "regions.chapter.sub.max", 3)); const char *q = buf;
    for (int k = 0; k < n; k++) { v_say(v_fmt("chapter.sub.%d", k), q, x, y, V_ANCHOR_LINE, role, "ground", V_ALIGN_LEFT); y += v_role_pitch(role); q += strlen(q) + 1; } }
  int md = v_si(S, "regions.chapter.mark.d", 12), mg = v_si(S, "regions.chapter.mark.gap", 4); char mcol[24]; snprintf(mcol, sizeof mcol, "%s", v_sstr(S, "regions.chapter.mark.colour"));
  for (int i = 0; i < 4; i++) {   /* the key to the marks, always on the page */
    char kind[12], text[V_STR]; ps(v_fmt("regions.chapter.key.%d.mark", i), kind); ps(v_fmt("regions.chapter.key.%d.text", i), text);
    int y = v_si(S, "regions.chapter.key.y", 450) + i * v_si(S, "regions.chapter.key.pitch", 24);
    v_region("chapter.key", LAYER_CHROME); mark(v_fmt("key.%d.mark", i), kind, v_si(S, "regions.chapter.key.mark", 33), y + 4, md, mg, mcol);
    v_region("chapter.key", LAYER_TYPE); v_say(v_fmt("key.%d.text", i), text, v_si(S, "regions.chapter.key.text", 62), y, V_ANCHOR_LINE, v_sstr(S, "regions.chapter.key.role"), "ground", V_ALIGN_LEFT);
  }
  int rx = v_si(S, "regions.chapter.rows.x", 301), ry = v_si(S, "regions.chapter.rows.y", 62), pitch = v_si(S, "regions.chapter.rows.pitch", 82), tx = v_si(S, "regions.chapter.rows.text", 445), pw = v_sk(S, "regions.chapter.rows.pic", 0), ph = v_sk(S, "regions.chapter.rows.pic", 1);
  int n = v_plen("regions.chapter.rows"), most = v_si(S, "regions.chapter.rows.max", 6); if (n > most) n = most;
  for (int i = 0; i < n; i++) {
    char tr[V_STR], look[V_STR], pic[V_STR], mk[12], line[V_STR]; ps(v_fmt("regions.chapter.rows.%d.trait", i), tr); ps(v_fmt("regions.chapter.rows.%d.look", i), look); ps(v_fmt("regions.chapter.rows.%d.pic", i), pic);
    ps(v_fmt("regions.chapter.rows.%d.mark", i), mk); ps(v_fmt("regions.chapter.rows.%d.line", i), line); upper(tr);
    int y = ry + i * pitch, first = v_pbool(v_fmt("regions.chapter.rows.%d.first", i), 0);
    v_name("rows"); v_slot(v_fmt("row.%d.pic", i), pic, pic, rx, y, pw, ph, 1);
    v_region("rows", LAYER_TYPE);
    int w = v_say(v_fmt("row.%d.trait", i), tr, tx, y, V_ANCHOR_LINE, v_sstr(S, "regions.chapter.rows.eyebrowRole"), "ground", V_ALIGN_LEFT);
    int ph2 = v_si(S, "regions.chapter.rows.pill.h", 20), pg = v_si(S, "regions.chapter.rows.pill.gap", 8);
    { char ft[V_STR]; snprintf(ft, sizeof ft, "%s", v_pstr("regions.chapter.first"));   /* the pill's words are the props' (one string for the page) */
      int pwid = first ? v_role_width(ft, v_sstr(S, "regions.chapter.rows.pill.role")) + 16 : 0;
      v_region("rows", LAYER_CHROME); v_composed(v_fmt("row.%d.pill", i), tx + w + pg, y, first ? pwid : 0, first ? ph2 : 0, first ? v_fmt("[[\"rrect\",0,0,%d,%d,%d,\"%s\",\"%s\"]]", pwid, ph2, v_si(S, "regions.chapter.rows.pill.radius", 10), v_sstr(S, "regions.chapter.rows.pill.first"), v_sstr(S, "regions.chapter.rows.pill.first")) : "[]");
      v_region("rows", LAYER_TYPE); v_say_in(v_fmt("row.%d.pill.text", i), first ? ft : "", tx + w + pg, pwid, y + 1, V_ANCHOR_LINE, v_sstr(S, "regions.chapter.rows.pill.role"), "ground"); }
    v_say(v_fmt("row.%d.look", i), look, tx, y + 18, V_ANCHOR_LINE, v_sstr(S, "regions.chapter.rows.nameRole"), "ground", V_ALIGN_LEFT);
    int mw = *mk ? mark_width(mk, md, mg) : 0;
    v_region("rows", LAYER_CHROME); if (*mk) mark(v_fmt("row.%d.mark", i), mk, tx, y + 58, md, mg, mcol); else v_composed(v_fmt("row.%d.mark", i), tx, y + 58, 0, 0, "[]");
    v_region("rows", LAYER_TYPE); v_say(v_fmt("row.%d.line", i), line, tx + (mw ? mw + 8 : 0), y + 54, V_ANCHOR_LINE, v_sstr(S, "regions.chapter.rows.lineRole"), "ground", V_ALIGN_LEFT);
  }
  int px = v_si(S, "regions.chapter.promise.x", 678), py = v_si(S, "regions.chapter.promise.y", 62), cw = v_si(S, "regions.chapter.promise.w", 328), chh = v_si(S, "regions.chapter.promise.h", 96), cp = v_si(S, "regions.chapter.promise.pitch", 104), pad = v_si(S, "regions.chapter.promise.pad", 8);
  int np = v_plen("regions.chapter.promises"), pmax = v_si(S, "regions.chapter.promise.max", 4); if (np > pmax) np = pmax;
  int dash[2] = { v_sk(S, "regions.chapter.promise.dash", 0), v_sk(S, "regions.chapter.promise.dash", 1) }; char edge[24]; snprintf(edge, sizeof edge, "%s", v_sstr(S, "regions.chapter.promise.edge"));
  for (int k = 0; k < np; k++) {
    int y = py + k * cp; char id[24]; snprintf(id, sizeof id, "promise.%d", k);
    v_region("promise", LAYER_CHROME);
    kit_hairline(v_fmt("%s.top", id), px, y, cw, edge, 0, dash); kit_hairline(v_fmt("%s.bottom", id), px, y + chh - 1, cw, edge, 0, dash);
    kit_hairline(v_fmt("%s.left", id), px, y, chh, edge, 1, dash); kit_hairline(v_fmt("%s.right", id), px + cw - 1, y, chh, edge, 1, dash);
    char l1[V_STR], l2[V_STR], b1[V_STR * 3], b2[V_STR * 3]; ps(v_fmt("regions.chapter.promises.%d.line", k), l1); ps(v_fmt("regions.chapter.promises.%d.strong", k), l2);
    v_region("promise", LAYER_TYPE);   /* text only: a promise's look picture waits for a chip-sized master (the roll's are 128 x 72) */
    int tx2 = px + pad, tw = cw - 2 * pad, ty = y + pad;
    const char *r1 = v_sstr(S, "regions.chapter.promise.role"), *r2 = v_sstr(S, "regions.chapter.promise.strong"); char ra[40], rb[40]; snprintf(ra, sizeof ra, "%s", r1); snprintf(rb, sizeof rb, "%s", r2);
    int n1 = v_role_wrap(l1, tw, ra, b1, sizeof b1, 2); const char *q = b1;
    for (int j = 0; j < n1; j++) { v_say(v_fmt("%s.l1.%d", id, j), q, tx2, ty, V_ANCHOR_LINE, ra, "ground", V_ALIGN_LEFT); ty += v_role_pitch(ra); q += strlen(q) + 1; }
    int n2 = v_role_wrap(l2, tw, rb, b2, sizeof b2, 2); q = b2;
    for (int j = 0; j < n2; j++) { v_say(v_fmt("%s.l2.%d", id, j), q, tx2, ty, V_ANCHOR_LINE, rb, "ground", V_ALIGN_LEFT); ty += v_role_pitch(rb); q += strlen(q) + 1; }
  }
}

/* the targets as the words drew them, in the props' order */
static const char *BOX[3][2] = { { "put", "regions.put.rect" }, { "bar", "regions.store.bar.rect" }, { "go", "regions.teaser.rect" } };
static const char *box_of(const char *id) { for (int i = 0; i < 3; i++) if (strcmp(id, BOX[i][0]) == 0) return BOX[i][1]; return NULL; }
int store_focus(focus_target_t *out, int cap) {
  int n = v_plen("focus.targets"); if (n > cap) n = cap;
  for (int i = 0; i < n; i++) {
    focus_target_t *t = &out[i]; focus_fill(t, "focus.targets", i, NULL); int r[4] = { 0, 0, 0, 0 }; const char *b = box_of(t->id); if (b) v_srect(S, b, r);
    focus_fill(t, "focus.targets", i, r);
  }
  return n;
}
static void ring(const char *cur) {
  const char *b = cur[0] ? box_of(cur) : NULL; if (!b || anim_holding()) return;
  int box[4]; v_srect(S, b, box); v_region("focus", LAYER_CHROME); word_focusRing("focus", S, v_fmt("focus.targets.%s", cur), box);
}

void store_words(void) {
  char cur[48], state[16]; snprintf(cur, sizeof cur, "%s", v_focus_cur()); snprintf(state, sizeof state, "%s", v_pstr("state"));
  kit_stage(S, "regions.stage.rect", v_scol("frame", "colours.stageGround"), "stage", "stage.ground", NULL, NULL);
  if (strcmp(state, "chapter") == 0) chapter_page();
  else {
    pod_column(); data_store(cur);
    if (strcmp(state, "teaser") == 0) teaser_card(); else { reading_line(); if (v_pstr("regions.put.head")[0]) put_panel(); }
  }
  ring(cur);
}

/* a key on the store: ✓ ← and the room keys say an intent on the focused target; the pad moves the ring by store.json focus.graph; ◀ ▶ on the panel and the bar are steppers (step:left, step:right) */
void store_key(int code) { screens_key_graph(code, S, "focus.graph", store_focus, "put", &(screens_keys_t){ .steps = 1 }); }
