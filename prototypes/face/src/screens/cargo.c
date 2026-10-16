/* Cargo's binding table (lvgl-switch.md §2.2, §4 L2.2; cargo.json): the words that draw each of its states in draw order, from the `cargo` spec and the props' regions, the frame's words after (screens.c).
   bay    the painted bay and, when it holds nothing, its door; its crates (sliding in on the Dock) with their shadows, or the pods waiting for a well on the floor; the rack's painted insert.
   opening  the bay, the rack, the ribbon, one crate closer with its shadow and its pods, the containers with their shadows, the pod travelling to its well. The crate and the step in it come from the arrival event's own clock (a crate every `perCrate` ms); with reduced motion the
            event ends at once, so the host stages them in the props (regions.opening.crate and .at) and each step is a cut.
   report   the bay with its door shut, the rack, and the report plate set into the door.
   The compositions are the spec's: `crates` (the bay's crates, the waiting pods, the crate closer and the pod travelling) and `reportCard`. A picture the host has not sent is a slot not yet filled: nothing is drawn.
   Cargo has no focus target: the ring is on nothing, the pad does nothing, and a key says an intent on "room". */
#include "../layout/layout.h"
#include "screens.h"
#include "../vocab/vocab.h"
#include "../vocab/words.h"
#include "../prim/prim.h"
#include "../spec/spec.h"
#include "../bridge/wire.h"
#include "../anim/anim.h"
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#define C "cargo"
static int ci(const char *p, int d) { return spec_int(C, p, d); }
static int ck(const char *base, int k) { return spec_int(C, v_fmt("%s.%d", base, k), 0); }
static void crect(const char *p, int r[4]) { if (!v_spec_rect(C, p, r)) r[0] = r[1] = r[2] = r[3] = 0; }
static const char *colr(const char *p) { static char b[8][24]; static int k; char *o = b[k++ & 7]; spec_str(C, p, o, 24); return o; }
/* a picture shown, or its node kept with no size until its step */
static void slot(const char *id, const char *asset, int x, int y, int w, int h, int shown) { if (shown) v_sprite(id, asset, x, y, w, h); else v_sprite_hidden(id, asset, x, y); }
static int has(const char *id) { return id && *id && wire_has_asset(id); }

/* p, e in 0..1000 */
static int ease_out(int p) { return 1000 - (1000 - p) * (1000 - p) / 1000; }

/* ---- the time of the crate opening: which crate, and how far into it ---- */
static void opening_clock(int *k, int *lt) {
  int n = v_plen("regions.opening.crates"), per = ci("events.opening.perCrate", 3000); anim_state_t t;
  if (v_pbool("motion", 1) && anim_get(ANIM_ARRIVAL, "crate", &t)) {   /* the face's own clock, from the event's start */
    int q = per > 0 ? t.elapsed / per : 0; if (q >= n) q = n - 1; if (q < 0) q = 0; *k = q; *lt = t.elapsed - q * per; return;
  }
  *k = v_pint("regions.opening.crate", 0); *lt = v_pint("regions.opening.at", 0);   /* a cut: the host's stage (reduced motion), or a still frame */
}
/* a pod's start in its crate: the first at `travel.at`, each next `each` later (events.opening.crate: the travel step) */
static int pod_start(int j) { return ci("events.opening.crate.4.at", 1200) + j * ci("events.opening.crate.4.each", 150); }

/* ---- the stage, the rack ---- */
static void ground(void) {
  int st[4]; char g[24]; spec_str("frame", "colours.stageGround", g, sizeof g);
  if (v_spec_rect("frame", "regions.stage.rect", st)) { v_region("stage", LAYER_CHROME); v_rect("stage.ground", st[0], st[1], st[2], st[3], g); }
}
/* the rack's pod place: a well's rect + (4, 8) */
static void well_rect(int i, int r[4]) { crect(v_fmt("regions.rack.wells.rects.%d", i), r); }
static void pod_place(int i, int p[2]) { int r[4]; well_rect(i, r); p[0] = r[0] + ck("regions.rack.pod.at", 0); p[1] = r[1] + ck("regions.rack.pod.at", 1); }
/* The rack: the painted insert (its six fitted wells are the picture's) and the pods that have landed. In the opening a pod lands at its crate's step (travel ends), or with reduced motion stands in its well from the step it set out. */
static void build_rack(int opening, int k, int lt) {
  int r[4]; crect("regions.rack.rect", r);
  v_region("rack", LAYER_ART); v_name("rack"); v_sprite("rack", v_pstr("regions.rack.insert"), r[0], r[1], r[2], r[3]);
  int n = ci("regions.rack.wells.slots", 6), pw = ck("regions.rack.pod.size", 0), ph = ck("regions.rack.pod.size", 1), motion = v_pbool("motion", 1), tms = ci("events.opening.crate.4.ms", 600);
  for (int i = 0; i < n; i++) {
    const char *pod = v_pstr(v_fmt("regions.rack.wells.%d.pod", i)); if (!*pod) continue;
    int landed = 1, fc = v_pint(v_fmt("regions.rack.wells.%d.from.crate", i), -1);
    if (opening && fc >= 0) {
      int fo = v_pint(v_fmt("regions.rack.wells.%d.from.order", i), 0), at = pod_start(fo) + (motion ? tms : 0);
      landed = fc < k || (fc == k && lt >= at);
    }
    int p[2]; pod_place(i, p); v_name("rack"); slot(v_fmt("rack.pod.%d", i), pod, p[0], p[1], pw, ph, landed);   /* a pod not yet landed keeps its node with no size: the order of the screen's nodes never changes (§2.2) */
  }
}

/* ---- the bay, its crates, the waiting pods (build bay, crates and waiting) ---- */
/* The bay is the signed painting, 1:1, in every state; its door goes over it when the host names one (the bay holds nothing, or the report). */
static void build_bay(void) {
  int r[4], dr[4]; crect("regions.bay.rect", r); crect("regions.bay.door", dr);
  v_region("bay", LAYER_ART); v_name("bay"); v_sprite("bay", v_pstr("regions.bay.open"), r[0], r[1], r[2], r[3]);
  const char *door = v_pstr("regions.bay.door"); if (*door) { v_name("bay.door"); v_sprite("bay.door", door, dr[0], dr[1], dr[2], dr[3]); }
}
/* The crates stand centred as a group by count (regions.crates.byCount.<n>); each has its contact shadow under it from the frame it has landed (a crate still sliding casts none: the shadow-while-sliding fade was tried and its dirty area went over a quarter of the screen, so the fallback holds; UI/UX ruling 2026-10-15). */
static void build_crates(void) {
  int n = v_plen("regions.crates.places"), max = ci("regions.crates.max", 3), in[4]; if (n > max) n = max; crect("regions.bay.inside", in);
  const char *shadow = v_pstr("regions.crates.shadow"); int sx = ck("regions.crates.shadow.at", 0), sy = ck("regions.crates.shadow.at", 1), sw = ck("regions.crates.shadow.size", 0), sh = ck("regions.crates.shadow.size", 1);
  anim_state_t t; int arriving = anim_get(ANIM_ARRIVAL, "crates", &t), each = ci("events.crateIn.each.ms", 500), stagger = ci("events.crateIn.each.stagger", 250), from = spec_int(C, "events.crateIn.each.from.1", -64);
  int ys[8], shown[8], landed[8], sent = 0;   /* a crate not yet in waits with no size where its slide starts (y = place + from), so showing it redraws its first box only, not its landed box too */
  for (int i = 0; i < n; i++) {
    int r[4]; crect(v_fmt("regions.crates.byCount.%d.%d", n, i), r); int y = r[1]; shown[i] = 1; landed[i] = 1;
    if (arriving) { int e = t.elapsed - i * stagger; if (e < 0) { shown[i] = 0; landed[i] = 0; y = r[1] + from; } else { int p = e >= each ? 1000 : e * 1000 / each; landed[i] = p == 1000; y = p == 1000 ? r[1] : r[1] + (from * (1000 - ease_out(p)) - (from < 0 ? 500 : -500)) / 1000; } }
    ys[i] = y;
    /* the nodes this place sends inside the clip, as the loop below sends them: the shadow's slot, the crate (a node is sent only for a picture the host has) */
    if (has(shadow)) sent++; if (has(v_pstr(v_fmt("regions.crates.places.%d", i)))) sent++;
  }
  if (!sent) return;
  v_name("crates");
  prim_node(v_id("crates.clip"), FN_CLIP, in[0], in[1], in[2], in[3], 0, sent, 0);   /* the bay's inside: a crate sliding in is cut at its top; it holds every node sent after it (the shadows and the crates) */
  for (int i = 0; i < n; i++) {
    int r[4]; crect(v_fmt("regions.crates.byCount.%d.%d", n, i), r);
    v_name("crates"); slot(v_fmt("crates.%d.shadow", i), shadow, r[0] + sx, r[1] + sy, sw, sh, landed[i]);   /* the shadow under its crate, from the frame it has landed; kept with no size before */
    slot(v_fmt("crates.%d", i), v_pstr(v_fmt("regions.crates.places.%d", i)), r[0], ys[i], r[2], r[3], shown[i]);   /* a crate not yet in keeps its node with no size */
  }
}
/* Pods waiting for a free well stand on the floor, oldest first, at most three, each on the signed pod shadow (feet y 280, boxes 104 apart about 512). */
static void build_waitingPods(void) {
  int n = v_plen("regions.waitingPods.pods"), max = ci("regions.waitingPods.max", 3); if (n > max) n = max; if (n <= 0) return;
  const char *shadow = v_pstr("regions.waitingPods.shadow"); int pw = ck("regions.waitingPods.pod.size", 0), ph = ck("regions.waitingPods.pod.size", 1), sw = ck("regions.waitingPods.shadow.size", 0), sh = ck("regions.waitingPods.shadow.size", 1), feet = ci("regions.waitingPods.feetY", 280);
  for (int i = 0; i < n; i++) {
    int axis = spec_int(C, v_fmt("regions.waitingPods.axes.%d.%d", n, i), 512);
    v_name("waiting"); v_sprite(v_fmt("waiting.%d.shadow", i), shadow, axis - sw / 2, feet - 7 + 0, sw, sh);   /* Pods' rule: feet − half the shadow's height (273 for 14) */
    v_sprite(v_fmt("waiting.%d", i), v_pstr(v_fmt("regions.waitingPods.pods.%d", i)), axis - pw / 2, feet - ph, pw, ph);
  }
}

/* ---- one crate opening (parts open and travel) ---- */
/* The same nodes in the same order at every step (the ribbon, the crate, a slot for each pod in it and a slot for each pod that travels): a step shows a node (its size) and never adds or removes one, so a refresh redraws only what moved. */
static void build_opening(int k, int lt) {
  char P[64]; snprintf(P, sizeof P, "regions.opening.crates.%d", k);
  int motion = v_pbool("motion", 1), lid = ci("events.opening.crate.1.at", 200), tag = lid + ci("events.opening.crate.1.ms", 300), rib = ci("events.opening.crate.2.at", 500);
  /* the ribbon shows this crate's words from its step (a cut, no fade) */
  { int r[4]; crect("regions.ribbon.rect", r); const char *words = v_pstr(v_fmt("%s.ribbon", P)); int rpx = ci("regions.ribbon.px", 20), rpad = ci("regions.ribbon.pad", 16);
    int w = ((v_measure(words, rpx) + 2 * rpad) + 7) / 8 * 8; if (w < 160) w = 160; if (w > r[2]) w = r[2];   /* the ribbon fits its words (cargo.json regions.ribbon.fit): words + 2 × pad rounded up to 8, at least 160, centred on 512 */
    r[0] = 512 - w / 2; r[2] = w;
    v_region("ribbon", LAYER_CHROME); word_ribbon("ribbon", r, lt >= rib ? words : "", rpx, rpad, colr("colours.ribbon.fill"), colr("colours.ribbon.edge"), colr("colours.ribbon.text")); }
  /* the crate closer: sealed, the tag torn and the lid lifting, open */
  int cr[4]; crect("regions.crate.rect", cr);
  const char *slice = v_pstr(v_fmt("%s.%s", P, lt < lid ? "sealed" : (motion && lt < tag) ? "opening" : "open"));   /* with reduced motion the opening slice is skipped: open at 200 */
  { int sr[4]; crect("regions.crate.shadow.rect", sr); v_name("crate"); v_sprite("crate.shadow", v_pstr(v_fmt("%s.shadow", P)), sr[0], sr[1], sr[2], sr[3]); }   /* the contact shadow under the closer, in every step */
  v_name("crate"); v_sprite("crate", slice, cr[0], cr[1], cr[2], cr[3]);
  /* its pods: in their places while the crate holds them (a later pod rises in the middle place as the one before sets out) */
  int m = v_plen(v_fmt("%s.pods", P)), shown = m < 3 ? m : 3, tms = ci("events.opening.crate.4.ms", 600), pw = ck("regions.crate.pods.size", 0), ph = ck("regions.crate.pods.size", 1);
  int px[64], py[64], in[64]; if (m > 64) m = 64;
  for (int j = 0; j < m; j++) {
    int place = j < 3 ? j : 1, count = j < 3 ? shown : 3, well = v_pint(v_fmt("%s.pods.%d.well", P, j), -1), start = pod_start(j);
    px[j] = spec_int(C, v_fmt("regions.crate.pods.places.%d.%d.0", count, place), 0); py[j] = spec_int(C, v_fmt("regions.crate.pods.places.%d.%d.1", count, place), 0);
    int prev = j >= 3 ? v_pint(v_fmt("%s.pods.%d.well", P, j - 1), -1) : 0;   /* a pod with no free well stays and no later pod appears after it */
    in[j] = lt >= (motion ? tag : lid) && (j < 3 || (prev >= 0 && lt >= pod_start(j - 1))) && !(well >= 0 && lt >= start);   /* the pods are in their places once the crate is open; pod j >= 3 appears in the middle place as a cut when pod j − 1 sets out; each leaves when it sets out */
    v_name("crate"); const char *pic = v_pstr(v_fmt("%s.pods.%d.picture", P, j));
    if (*pic) slot(v_fmt("crate.pod.%d", j), pic, px[j], py[j], pw, ph, in[j]);
  }
  /* the haul's containers (regions.stores): one for each material this crate brought, from the counters' step (a cut, also with reduced motion) to the end of the opening; the nodes are stable, a step shows or hides one; the travelling pods below draw over them */
  { static const char *mat[3] = { "energy", "data", "essence" }; int sw = ck("regions.stores.size", 0), sh = ck("regions.stores.size", 1), at = ci("events.opening.crate.3.at", 800), n = v_plen(v_fmt("%s.stores", P));
    for (int i = 0; i < 3; i++) {
      char want[40]; snprintf(want, sizeof want, "cargo-%s-%dx%d", mat[i], sw, sh); int brought = 0;
      for (int q = 0; q < n; q++) { const char *id = v_pstr(v_fmt("%s.stores.%d", P, q)); if (id && !strcmp(id, want)) brought = 1; }
      int px = spec_int(C, v_fmt("regions.stores.places.%s.0", mat[i]), 0), py = spec_int(C, v_fmt("regions.stores.places.%s.1", mat[i]), 0), show = brought && lt >= at;
      v_name(v_fmt("stores.%s", mat[i]));
      slot(v_fmt("stores.%s.shadow", mat[i]), v_pstr(v_fmt("%s.storeShadow", P)), px + ck("regions.stores.shadow.at", 0), py + ck("regions.stores.shadow.at", 1), ck("regions.stores.shadow.size", 0), ck("regions.stores.shadow.size", 1), show);   /* its contact shadow, shown with it */
      slot(v_fmt("stores.%s", mat[i]), want, px, py, sw, sh, show);
    } }
  /* a pod travelling: from its place to its well's pod place, a straight line, whole pixels, eased in and out; with reduced motion it stands in its well from its step (the rack) */
  for (int j = 0; j < m; j++) {
    int well = v_pint(v_fmt("%s.pods.%d.well", P, j), -1), start = pod_start(j); if (well < 0) continue;
    const char *pic = v_pstr(v_fmt("%s.pods.%d.picture", P, j)); if (!*pic) continue;
    int e = lt - start, on = motion && e >= 0 && e < tms, x = px[j], y = py[j];
    if (on) { int to[2]; pod_place(well, to); int ee = layout_ease_io(e * 1000 / tms); x = layout_lerp(px[j], to[0], ee); y = layout_lerp(py[j], to[1], ee); }
    v_name("travel"); slot(v_fmt("travel.%d", j), pic, x, y, pw, ph, on);
  }
}

/* ---- the report card ---- */
static void text_row(const char *id, const char *s, int x, int rowY, const char *colour, int px, int maxw) {
  char fit[V_STR]; v_clip(s, maxw, px, fit, sizeof fit);
  v_text(id, fit, x, rowY + v_fdiv(ci("regions.report.rows.h", 24) - v_cap(px), 2), v_measure(fit, px), px, colour);
}
static void build_reportCard(void) {
  int r[4]; crect("regions.report.rect", r); int pad = ci("regions.report.pad", 16), rowH = ci("regions.report.rows.h", 24), px = ci("regions.report.rows.px", 16);
  int nc = v_plen("regions.report.crates"), hasProbe = *v_pstr("regions.report.probe.lead") != 0, nl = v_plen("regions.report.world.lines"), hasWorld = nl > 0;
  if (nl > ci("regions.report.world.max", 3)) nl = ci("regions.report.world.max", 3);
  int gapG = ci("regions.report.gathered.gapAbove", 8), gapW = ci("regions.report.world.gapAbove", 16);
  int base = ci("regions.report.rows.first", 56) + gapG + rowH + pad, worldExtra = gapW + rowH;   /* the card: its first row, the gap above Gathered, Gathered, the pad = 104; the world: its gap and its heading = 40 (cargo.json regions.report.height) */
  /* the goal rows (cargo.json regions.report.goal): the last rows of the card, 8 px below the row above, and the meanwhile row directly under; the card grows by 8 + 24 x (1 + meanwhile), never past maxHeight, and
     the world lines drop from the last until it fits (the view trims them too; the face never draws past the card) */
  int hasGoal = *v_pstr("regions.report.goal.text") != 0, hasMw = hasGoal && *v_pstr("regions.report.meanwhile.text") != 0, gapGoal = ci("regions.report.goal.gapAbove", 8), maxH = ci("regions.report.maxHeight", 288);
  int goalExtra = hasGoal ? gapGoal + rowH * (1 + (hasMw ? 1 : 0)) : 0;
  int h = base + rowH * (nc + (hasProbe ? 1 : 0)) + (hasWorld ? worldExtra + rowH * nl : 0) + goalExtra;
  while (h > maxH && nl > 0) { nl--; h -= rowH; if (nl == 0) { h -= worldExtra; hasWorld = 0; } }
  if (h > maxH) h = maxH;
  /* the plate: the signed picture of this exact height, set into the door, centred on the door's middle (y = 64 + 8 × floor((288 − h) / 16)); the rim and shade are painted, so the face draws no fill, edge, rule or shadow */
  int x0 = r[0], y0 = r[1] + 8 * ((maxH - h) / 16), cx = x0 + ci("regions.report.rows.content", 152), reach = x0 + ci("regions.report.crates.reachAt", 328);
  v_region("report", LAYER_ART); v_name("report"); v_sprite("report.plate", v_pstr("regions.report.plate"), x0, y0, r[2], h);
  v_sprite("report.label", v_pstr("regions.report.label"), x0 + ck("regions.report.label.at", 0), y0 + ck("regions.report.label.at", 1), ck("regions.report.label.size", 0), ck("regions.report.label.size", 1));   /* GB-R6: the heading's cream label plate, 1:1 inside the plate */
  int hy = y0 + ck("regions.report.heading.at", 1), hpx = ci("regions.report.heading.px", 20), hh = ci("regions.report.heading.h", 32), leadW = ck("regions.report.rows.lead", 1);
  const char *lead = colr("colours.report.lead"), *line = colr("colours.report.line"), *fig = colr("colours.report.figure"), *heading = colr("colours.report.heading");
  v_region("report.heading", LAYER_TYPE); { const char *hd = v_pstr("regions.report.heading"); v_text("report.heading", hd, x0 + ck("regions.report.heading.at", 0), hy + v_fdiv(hh - v_cap(hpx), 2), v_measure(hd, hpx), hpx, heading); }
  int y, podPitch = ci("regions.report.crates.podPitch", 20), podIcon = ci("regions.report.crates.podIcon", 16), iconAt = ci("regions.report.rows.iconAt", 4);
  y = y0 + ci("regions.report.rows.first", 56);   /* the first row: 56 under the card's top (the pad, the heading's 32 and 8 more) */
  for (int i = 0; i < nc; i++, y += rowH) {
    char P[56]; snprintf(P, sizeof P, "regions.report.crates.%d", i);
    v_region("report.crate", LAYER_TYPE); text_row(v_fmt("report.c%d.lead", i), v_pstr(v_fmt("%s.lead", P)), x0 + pad, y, lead, px, leadW);
    int pods = v_pint(v_fmt("%s.pods", P), 0); const char *txt = v_pstr(v_fmt("%s.text", P)), *rc = v_pstr(v_fmt("%s.reach", P));
    for (int q = 0; q < pods; q++) { v_name("report.pods"); v_sprite(v_fmt("report.c%d.pod.%d", i, q), v_pstr("regions.report.podIcon"), cx + q * podPitch, y + iconAt, podIcon, podIcon); }
    if (*txt) { v_region("report.crate", LAYER_TYPE); text_row(v_fmt("report.c%d.text", i), txt, cx, y, line, px, reach - cx - 8); }
    if (*rc) { v_region("report.crate", LAYER_TYPE); text_row(v_fmt("report.c%d.reach", i), rc, reach, y, line, px, x0 + r[2] - pad - reach); }
  }
  y += gapG;
  { v_region("report.gathered", LAYER_TYPE); text_row("report.g.lead", v_pstr("regions.report.gathered.lead"), x0 + pad, y, lead, px, leadW);
    static const char *K[3] = { "e", "d", "s" }, *N[3] = { "energy", "data", "essence" };
    int x = cx, ic = ci("regions.report.gathered.icon", 16), gap = ci("regions.report.gathered.gap", 4), between = ci("regions.report.gathered.between", 24);
    for (int m = 0; m < 3; m++) {
      const char *figure = v_pstr(v_fmt("regions.report.gathered.%s", K[m])); char a[32]; snprintf(a, sizeof a, "icon:%s:16", N[m]);
      v_name("report.gathered"); v_sprite(v_fmt("report.g.icon.%d", m), a, x, y + iconAt, ic, ic);
      v_region("report.gathered", LAYER_TYPE); int tw = v_measure(figure, px); text_row(v_fmt("report.g.%d", m), figure, x + ic + gap, y, fig, px, tw + 1);
      x += ic + gap + tw + between;
    }
  }
  y += rowH;
  if (hasProbe) {
    v_region("report.probe", LAYER_TYPE); text_row("report.p.lead", v_pstr("regions.report.probe.lead"), x0 + pad, y, lead, px, leadW);
    int plates = v_pint("regions.report.probe.plates", 0), pi = ci("regions.report.probe.plateIcon", 16), pp = ci("regions.report.probe.platePitch", 20);
    for (int q = 0; q < plates; q++) { v_name("report.probe"); v_sprite(v_fmt("report.p.plate.%d", q), v_pstr("regions.report.shieldIcon"), cx + q * pp, y + iconAt, pi, pi); }
    const char *pt = v_pstr("regions.report.probe.text"); int tx = cx + plates * pp + ci("regions.report.gathered.gap", 4);
    if (*pt) { v_region("report.probe", LAYER_TYPE); v_run("report.p.text", pt, tx, y + v_fdiv(rowH - v_cap(px), 2), px, line, V_ALIGN_LEFT); }
    y += rowH;
  }
  if (hasWorld) {
    y += gapW; v_region("report.world", LAYER_TYPE); text_row("report.w.lead", v_pstr("regions.report.world.lead"), x0 + pad, y, lead, px, r[2] - 2 * pad);
    y += rowH;
    for (int i = 0; i < nl; i++, y += rowH) {
      v_region("report.world", LAYER_CHROME); v_rect(v_fmt("report.w.bullet.%d", i), x0 + ck("regions.report.world.bullet", 0), y + ck("regions.report.world.bullet", 1), ck("regions.report.world.bullet", 2), ck("regions.report.world.bullet", 3), colr("colours.report.bullet"));
      v_region("report.world", LAYER_TYPE); text_row(v_fmt("report.w.%d", i), v_pstr(v_fmt("regions.report.world.lines.%d", i)), x0 + ci("regions.report.world.lineAt", 32), y, line, px, r[2] - ci("regions.report.world.lineAt", 32) - pad);
    }
  }
  if (hasGoal) {
    y += gapGoal; int room = ci("regions.report.goal.content.1", 392);
    const char *words = v_pstr("regions.report.goal.text"), *icons = v_pstr("regions.report.goal.icons"), *plain = v_pstr("regions.report.goal.plain"); int ni = 0;
    for (const char *q = icons; *q; q++) if ((unsigned char)*q == 0xe2) ni++;
    if (v_run_width(words, px) + 20 * ni > room && *plain) words = plain;   /* a name too wide: the nameless sibling (the face's own sum) */
    v_region("report.goal", LAYER_TYPE); text_row("report.goal.lead", v_pstr("regions.report.goal.lead"), x0 + pad, y, lead, px, leadW);
    text_row("report.goal.text", words, cx, y, line, px, room - 20 * ni);
    { char fit[V_STR]; v_clip(words, room - 20 * ni, px, fit, sizeof fit); int ix = cx + v_measure(fit, px) + 4;
      for (const char *q = icons; *q; ) { const char *nm = NULL; if (!strncmp(q, "\xe2\x9a\xa1", 3)) nm = "icon:energy:16"; else if (!strncmp(q, "\xe2\x97\x86", 3)) nm = "icon:data:16"; else if (!strncmp(q, "\xe2\x9d\x80", 3)) nm = "icon:essence:16";
        if (nm) { v_name("report.goal"); v_sprite(v_fmt("report.goal.icon.%d", (int)(ix)), nm, ix, y + iconAt, 16, 16); ix += 20; q += 3; } else q++; } }
    y += rowH;
    if (hasMw) {
      v_region("report.goal", LAYER_TYPE); text_row("report.mw.lead", v_pstr("regions.report.meanwhile.lead"), x0 + pad, y, lead, px, leadW);
      const char *mt = v_pstr("regions.report.meanwhile.text"), *mp = v_pstr("regions.report.meanwhile.price"); char fit[V_STR]; v_clip(mt, room - 60, px, fit, sizeof fit);
      text_row("report.mw.text", fit, cx, y, line, px, room - 60); int ix = cx + v_measure(fit, px) + 4;
      v_name("report.goal"); v_sprite("report.mw.icon", "icon:data:16", ix, y + iconAt, 16, 16);
      v_region("report.goal", LAYER_TYPE); text_row("report.mw.price", mp, ix + 20, y, fig, px, v_measure(mp, px) + 1);
    }
  }
}

void cargo_words(void) {
  char state[16]; snprintf(state, sizeof state, "%s", v_pstr("state"));
  ground();
  if (strcmp(state, "opening") == 0) {
    int k, lt; opening_clock(&k, &lt);
    build_bay();
    build_rack(1, k, lt);
    build_opening(k, lt);
  } else {
    build_bay();
    if (strcmp(state, "bay") == 0) { build_crates(); build_waitingPods(); }
    build_rack(0, 0, 0);
    if (strcmp(state, "report") == 0) build_reportCard();
  }
}

/* a key on Cargo: no target, so a key says an intent on "room". The bay: ✓ and ← and the room keys; the pad does nothing. The report: any key (the pad as `pad`) says it, and the host closes the card and does what the key does. */
void cargo_key(int code) {
  const char *verb = code == 10 ? "confirm" : code == 27 ? "back" : code == 2 ? "room:home" : code == 114 ? "room:research" : code == 108 ? "room:library" : code == 98 ? "room:habitat" : NULL;
  int pad = code == 17 || code == 18 || code == 19 || code == 20;
  if (!verb && pad && strcmp(v_pstr("state"), "report") == 0) verb = "pad";
  if (verb) screens_say("intent", "room", verb);
}
