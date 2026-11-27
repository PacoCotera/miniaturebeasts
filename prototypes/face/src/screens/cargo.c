/* Cargo's binding table (lvgl-switch.md §2.2, §4 L2.2; cargo.json; the Bay design, section 2, the Bay UI spec): the Bay, one sorting table in three parts, in two forms of one screen (the narrow form 530 x 600 lp for the phone's window, the wide form 1024 x 600).
   ledge    the dock ledge: the Companion's cradle (a dashed slot with today's signed Companion mark: art piece 2 is not placed), its state in two lines, and the crates that wait sealed (two at most), each with its tag.
   table    the crate in hand: sealed and big with its tag and, when it holds a pod, the beat ring (two soft concentric ellipses, never a frame); or open: a dashed slot (art piece 1 is not placed) holding what it brings, the pods and each supply with its amount.
            With nothing on the table and a visit's sum, the sum.
   stores   the Nursery's shelf (the newest pods, the count) and the three counters.
   Cargo has no focus target: the ring is on nothing; ✓ does the bottom line's action, the pad down is ▼ All at once (the intent "all" on "room"), the rest of the pad does nothing. A picture the host has not sent is a slot not yet filled: nothing is drawn. */
#include "../layout/layout.h"
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#define C "cargo"
static const char *F;   /* the form's path in the spec: forms.narrow or forms.wide */
static const char *fp(const char *rest) { return v_fmt("%s.%s", F, rest); }
static int fi(const char *rest, int d) { return v_si(C, fp(rest), d); }
static int fk(const char *rest, int k) { return v_sk(C, fp(rest), k); }
static void frect(const char *rest, int r[4]) { v_srect(C, fp(rest), r); }

/* ---- the stage ---- */
static void ground(void) { kit_stage("frame", "regions.stage.rect", v_scol("frame", "colours.stageGround"), "stage", "stage.ground", NULL, NULL); }

/* a panel: a rounded box in the panel fill with its edge (a code-drawn component) */
static void panel(const char *id, const int r[4]) {   /* the region is the panel's own id: ledge, table, shelf, counters */
  char ops[160]; snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,6,\"%s\",\"%s\"]]", r[2], r[3], v_scol(C, "colours.panel.fill"), v_scol(C, "colours.panel.edge"));
  v_region(id, LAYER_CHROME); v_composed(id, r[0], r[1], r[2], r[3], ops);
}
/* a named slot for art not yet placed (rule 3): the four corners of its box as brackets, never a closed dashed box (the layer check refuses one: it reads as a focus ring) */
static void slot_box(const char *id, const int r[4]) {   /* the region is the slot's own id: cradleSlot, openSlot */
  const char *c = v_scol(C, "colours.slot"); int w = r[2], h = r[3], n = 14; char ops[640];
  snprintf(ops, sizeof ops, "[[\"h\",0,0,%d,\"%s\"],[\"v\",0,0,%d,\"%s\"],[\"h\",%d,0,%d,\"%s\"],[\"v\",%d,0,%d,\"%s\"],[\"h\",0,%d,%d,\"%s\"],[\"v\",0,%d,%d,\"%s\"],[\"h\",%d,%d,%d,\"%s\"],[\"v\",%d,%d,%d,\"%s\"]]",
    n, c, n, c, w - n, n, c, w - 1, n, c, h - 1, n, c, h - n, n, c, w - n, h - 1, n, c, w - 1, h - n, n, c);
  v_region(id, LAYER_CHROME); v_composed(id, r[0], r[1], r[2], r[3], ops);
}
/* the beat ring (the Bay UI spec spec round 2): on a crate that holds a pod, two concentric ellipses in wood, 2 px, the inner the brighter (the spec's 70% and 30% as two palette colours: a blend would leave the palette), inside the crate's own outline;
   round, never a rectangle with corners, never orange. One beat is drawn. */
static void beat_ring(const char *region, const char *id, int cx, int cy, const int s0[2], const int s1[2]) {
  const int *s[2] = { s0, s1 }; const char *col[2] = { v_scol(C, "colours.beat"), v_scol(C, "colours.beat2") };
  for (int i = 1; i >= 0; i--) {   /* the larger, dimmer first */
    int w = s[i][0], h = s[i][1]; char ops[200], nid[64]; snprintf(nid, sizeof nid, "%s.%d", id, i);
    snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"],[\"rrect\",1,1,%d,%d,%d,\"\",\"%s\"]]", w, h, h / 2, col[i], w - 2, h - 2, h / 2 - 1, col[i]);
    v_region(region, LAYER_CHROME); v_composed(nid, cx - w / 2, cy - h / 2, w, h, ops);
  }
}
/* the selection mark (the Bay UI spec, round 2): the orange frame, 2 px with 8 lp corners, on the crate in hand and on nothing else; round the crate's own box, padded */
static void selection(const int s[4]) {
  int pad = fi("hand.pad", 4), rad = fi("hand.radius", 8), w = s[2] + 2 * pad, h = s[3] + 2 * pad; const char *c = v_scol(C, "colours.mark"); char ops[240];
  snprintf(ops, sizeof ops, "[[\"rrect\",0,0,%d,%d,%d,\"\",\"%s\"],[\"rrect\",1,1,%d,%d,%d,\"\",\"%s\"]]", w, h, rad, c, w - 2, h - 2, rad - 1, c);
  v_region("handFrame", LAYER_CHROME); v_composed("table.hand", s[0] - pad, s[1] - pad, w, h, ops);
}
static void say(const char *id, const char *s, int x, int y, const char *role, int align) { v_region("type", LAYER_TYPE); v_say(id, s, x, y, V_ANCHOR_MID, role, "pane", align); }

/* ---- the dock ledge ---- */
static void build_ledge(int narrow) {
  int r[4], cr[4]; frect("ledge", r); frect("cradle", cr); panel("ledge", r);
  { int w[4]; frect("wood", w); v_region("wood", LAYER_CHROME); v_rect("ledge.wood", w[0], w[1], w[2], w[3], v_scol(C, "colours.wood")); }
  slot_box("cradleSlot", cr);
  v_region("cradle", LAYER_ART); v_name("cradle");
  if (v_pbool("bay.companion.docked", 0)) { const char *m = v_pstr("bay.companion.mark"); int sz[2]; if (*m && v_asset_size(m, sz) >= 0) v_sprite("cradle.mark", m, cr[0] + (cr[2] - sz[0]) / 2, cr[1] + (cr[3] - sz[1]) / 2, sz[0], sz[1]); }
  { const char *l1 = v_pstr("bay.companion.l1"), *l2 = v_pstr("bay.companion.l2"); int x = fi("state.x", 0), centred = fi("state.centred", 0);
    say("ledge.l1", l1, x, fi("state.y1", 0), "heading", centred ? V_ALIGN_CENTRE : V_ALIGN_LEFT);
    say("ledge.l2", l2, x, fi("state.y2", 0), "quiet", centred ? V_ALIGN_CENTRE : V_ALIGN_LEFT); }
  for (int i = 0, n = v_plen("bay.ledge"); i < n && i < 2; i++) {
    const char *pic = v_pstr(v_fmt("bay.ledge.%d.picture", i)); int vertical = fi("crates.vertical", 0), x = fk("crates.x", i), y = fi("crates.y", 0) + (vertical ? i * fi("crates.pitchY", 0) : 0), sz[2] = { 64, 64 };
    if (*pic && v_asset_size(pic, sz) < 0) { sz[0] = 64; sz[1] = 64; }
    v_region("ledgeCrate", LAYER_ART); v_name("ledgeCrate"); if (*pic) v_sprite(v_fmt("ledge.crate.%d", i), pic, x, y, sz[0], sz[1]);
    if (v_pbool(v_fmt("bay.ledge.%d.ring", i), 0)) beat_ring("ledgeRing", v_fmt("ledge.ring.%d", i), x + sz[0] / 2, y + sz[1] / 2, (const int[2]){ fk("ledgeRing.size.0", 0), fk("ledgeRing.size.0", 1) }, (const int[2]){ fk("ledgeRing.size.1", 0), fk("ledgeRing.size.1", 1) });
    say(v_fmt("ledge.tag.%d", i), v_pstr(v_fmt(narrow ? "bay.ledge.%d.tagShort" : "bay.ledge.%d.tag", i)), x + fi("crates.tagDx", 70), fi("crates.tagY", 0) + (vertical ? i * fi("crates.pitchY", 0) : 0), narrow ? "heading" : "label", V_ALIGN_LEFT);
  }
}

/* ---- the table: the crate in hand ---- */
static void build_table(void) {
  int r[4]; frect("table", r); panel("table", r);
  if (!*v_pstr("bay.table.picture")) {   /* nothing on the table: the visit's sum, if there is one */
    const char *e = v_pstr("bay.end"); if (*e) say("table.end", e, fk("endAt", 0), fk("endAt", 1), "heading", V_ALIGN_CENTRE);
    return;
  }
  if (!v_pbool("bay.table.open", 0)) {   /* sealed and big, tagged, with the beat ring when it holds a pod */
    int s[4]; frect("sealed", s); const char *pic = v_pstr("bay.table.picture");
    if (v_pbool("bay.table.ring", 0)) beat_ring("tableRing", "table.ring", s[0] + s[2] / 2, s[1] + s[3] / 2, (const int[2]){ fk("ring.size.0", 0), fk("ring.size.0", 1) }, (const int[2]){ fk("ring.size.1", 0), fk("ring.size.1", 1) });
    v_region("tableCrate", LAYER_ART); v_name("tableCrate"); v_sprite("table.crate", pic, s[0], s[1], s[2], s[3]);
    say("table.tag", v_pstr("bay.table.tag"), fk("tagAt", 0), fk("tagAt", 1), "heading", V_ALIGN_LEFT);
    selection(s);
    if (*v_pstr("bay.came.tag")) {   /* who came home: her picture's slot (a named empty slot: not built) and her name under it, from the arrival until his first press */
      int h[4]; frect("her.slot", h); slot_box("herSlot", h);
      say("table.came", v_pstr("bay.came.tag"), fk("her.tagAt", 0), fk("her.tagAt", 1), "heading", V_ALIGN_CENTRE);
    }
    return;
  }
  /* open: a dashed slot (the AD's open crate is signed and not placed) holding what the crate brings */
  int o[4]; frect("open", o); slot_box("openSlot", o);
  say("table.tag", v_pstr("bay.table.tag"), fk("openTag", 0), fk("openTag", 1), "heading", V_ALIGN_LEFT);
  int np = v_plen("bay.table.pods"), nm = v_plen("bay.table.mats"), w[16], h[16], kind[16], n = 0;   /* kind: 0 a pod, 1 a supply */
  const char *pic[16];
  for (int j = 0; j < np && n < 16; j++, n++) { int sz[2] = { 88, 112 }; pic[n] = v_pstr(v_fmt("bay.table.pods.%d.pic", j)); v_asset_size(pic[n], sz); w[n] = sz[0]; h[n] = sz[1]; kind[n] = 0; }
  for (int q = 0; q < nm && n < 16; q++, n++) { int sz[2] = { 72, 96 }; pic[n] = v_pstr(v_fmt("bay.table.mats.%d.pic", q)); v_asset_size(pic[n], sz); w[n] = sz[0]; h[n] = sz[1]; kind[n] = 1; }
  int gap = fi("contents.gap", 20), total = 0; for (int i = 0; i < n; i++) total += w[i] + (i ? gap : 0);
  if (total > o[2] - 16) { gap = 4; total = 0; for (int i = 0; i < n; i++) total += w[i] + (i ? gap : 0); }
  int x = o[0] + (o[2] - total) / 2, bottom = fi("contents.bottom", o[1] + o[3] - 24);
  for (int i = 0, pi = 0, mi = 0; i < n; i++) {
    v_region("contents", LAYER_ART); v_name("contents");
    if (*pic[i]) v_sprite(v_fmt("table.item.%d", i), pic[i], x, bottom - h[i], w[i], h[i]);
    if (kind[i] == 1) say(v_fmt("table.amount.%d", mi), v_pstr(v_fmt("bay.table.mats.%d.amount", mi)), x + w[i] / 2, bottom + fi("contents.amountDy", 14), "heading", V_ALIGN_CENTRE), mi++; else pi++;
    x += w[i] + gap;
  }
}

/* ▼ All at once: the pad's down key says it (cargo_key); the word stands at the table's foot while a crate waits (the frame's bottom line keeps its middle slot at 512 lp, outside the phone's 530 lp window) */
static void build_all(void) { const char *w = v_pstr("bay.all"); if (*w) say("table.all", w, fk("allAt", 0), fk("allAt", 1), "quiet", V_ALIGN_RIGHT); }

/* ---- the stores: the Nursery's shelf and the counters ---- */
static void build_stores(void) {
  int s[4], c[4]; frect("shelf", s); frect("counters", c); panel("shelf", s); panel("counters", c);
  say("shelf.title", v_pstr("bay.shelf.title"), fk("shelfTitle", 0), fk("shelfTitle", 1), "heading", V_ALIGN_LEFT);
  say("shelf.count", v_pstr("bay.shelf.count"), fk("shelfCount", 0), fk("shelfCount", 1), "quiet", V_ALIGN_LEFT);
  { int cols = fi("shelfPods.cols", 6), rows = fi("shelfPods.rows", 1), x0 = fi("shelfPods.x", 0), y0 = fi("shelfPods.y", 0), pitch = fi("shelfPods.pitch", 44), rp = fi("shelfPods.rowPitch", 60);
    v_region("shelfPods", LAYER_ART); v_name("shelfPods");
    for (int i = 0, n = v_plen("bay.shelf.pods"); i < n && i < cols * rows; i++) { const char *p = v_pstr(v_fmt("bay.shelf.pods.%d", i)); int sz[2] = { 40, 48 }; if (!*p || v_asset_size(p, sz) < 0) continue; v_sprite(v_fmt("shelf.pod.%d", i), p, x0 + (i % cols) * pitch, y0 + (i / cols) * rp, sz[0], sz[1]); } }
  for (int i = 0, n = v_plen("bay.counters"); i < n && i < 3; i++) {
    int y = fi("counterRows.y", 0) + i * fi("counterRows.pitch", 34);
    say(v_fmt("counter.label.%d", i), v_pstr(v_fmt("bay.counters.%d.label", i)), fi("counterRows.labelX", 0), y, "label", V_ALIGN_LEFT);
    say(v_fmt("counter.value.%d", i), v_pstr(v_fmt("bay.counters.%d.value", i)), fi("counterRows.figureRight", 0), y, "figure", V_ALIGN_RIGHT);
  }
}

void cargo_words(void) {
  int narrow = v_pbool("narrow", 0); F = narrow ? "forms.narrow" : "forms.wide";
  ground();
  build_ledge(narrow);
  build_table();
  build_all();
  build_stores();
}

/* a key on Cargo: no target, so a key says an intent on "room". ✓ and ← and the room keys as everywhere; the pad down, while a crate waits, is ▼ All at once; the rest of the pad does nothing. */
void cargo_key(int code) {
  if (code == 18 && *v_pstr("bay.table.picture")) { screens_say("intent", "room", "all"); return; }
  screens_key_graph(code, "cargo", NULL, NULL, "room", &(screens_keys_t){ 0 });
}
