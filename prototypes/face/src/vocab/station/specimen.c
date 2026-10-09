/* The specimen word (the pod under the beam on its cradle; station-layouts.md, Pods §5), with the kin, the hatch and the stamp label beside it: ported from components/specimen.mjs, list.mjs
   (kinHatch) and stampLabel.mjs. Spec: `pods` regions.<state> (overview or chapter). Props: regions.specimen { beam, room { shelf, cradle, cradleFront, shadow, plate (the series) }, pod { sizeClass, size,
   sealed, identified }, cut, name, origin [lines], ribbon, figure, who [ids], originPicture }, regions.kin [ { id, ring, pod } ], regions.hatch, regions.stamp { size, asset, case { back, front } }.
   The bench candidates are regions.bench.room. A picture the host has not sent draws nothing and the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include "../../bridge/wire.h"
#include "../../anim/anim.h"
#include <stdio.h>
#include <string.h>

#define S "pods"
static int si(const char *base, const char *key, int dflt) { char p[200]; snprintf(p, sizeof p, "%s.%s", base, key); return spec_int(S, p, dflt); }
static int sa(const char *base, const char *key, int k, int dflt) { char p[200]; snprintf(p, sizeof p, "%s.%s.%d", base, key, k); return spec_int(S, p, dflt); }
static void srect(const char *base, const char *key, int r[4]) { for (int k = 0; k < 4; k++) r[k] = sa(base, key, k, 0); }
static void colour(const char *name, char *out, int cap) { char p[64]; snprintf(p, sizeof p, "colours.%s", name); spec_str(S, p, out, cap); }
static int has(const char *id) { return id && *id; }
/* a layer of the room: the picture at its rectangle when the face has it */
static void layer(const char *id, const int r[4], const char *asset) { if (has(asset)) v_sprite(id, asset, r[0], r[1], r[2], r[3]); }

/* one line of text centred on x, its box the run's own; y is the cap top */
static void centred(const char *id, const char *text, int cx, int y, int px, const char *col) { int w = v_measure(text, px); v_text(id, text, cx - v_half(w), y, w, px, col); }
static int cap_top(int px, int y, int pitch) { return y + v_fdiv(pitch - v_cap(px), 2); }

static int bench_present(void) { for (int i = 0; i < v_plen("regions.bench.room"); i++) if (wire_has_asset(v_pstr(v_fmt("regions.bench.room.%d", i)))) return 1; return 0; }

/* a caption: one line of the region's px centred in its rect, in its colour (the cap top as the name's) */
static void caption(const char *region, const char *base, const char *key, const char *text) {
  char path[120]; snprintf(path, sizeof path, "%s.%s", base, key); int r[4], px = si(path, "px", 16); char col[24]; srect(path, "rect", r);
  spec_str(S, v_fmt("%s.colour", path), col, sizeof col);   /* a palette name */
  v_region(region, LAYER_TYPE); centred(v_fmt("specimen.%s", region), text, r[0] + v_half(r[2]), cap_top(px, r[1], r[3]), px, col);
}
/* the pod's size: its class's box in the spec (classes.pod.<class>), the class named by the props */
int word_pod_size(int out[2]) {
  char cls[16]; snprintf(cls, sizeof cls, "%s", v_pstr("regions.specimen.pod.sizeClass")); if (!cls[0]) return 0;
  out[0] = spec_int(S, v_fmt("classes.pod.%s.0", cls), 0); out[1] = spec_int(S, v_fmt("classes.pod.%s.1", cls), 0); return out[0] > 0 && out[1] > 0;
}
void word_specimen(const char *base) {
  char name[24], origin[24], white[24]; colour("name", name, sizeof name); colour("origin", origin, sizeof origin); snprintf(white, sizeof white, "white");
  int beam[4], shelf[4], cradle[4], front[4], nrect[4];
  for (int k = 0; k < 4; k++) { beam[k] = sa(base, "beam.rect", k, 0); shelf[k] = sa(base, "shelf.rect", k, 0); cradle[k] = sa(base, "cradle.rect", k, 0); front[k] = sa(base, "cradleFront.rect", k, 0); nrect[k] = sa(base, "name.rect", k, 0); }
  v_region("beam", LAYER_ART);
  if (!bench_present()) { const char *b = v_pstr("regions.specimen.beam"); if (has(b)) v_sprite("specimen.beam", b, beam[0], beam[1], beam[2], beam[3]); }
  v_region("specimen", LAYER_ART);
  layer("specimen.shelf", shelf, v_pstr("regions.specimen.room.shelf")); layer("specimen.cradle", cradle, v_pstr("regions.specimen.room.cradle"));
  const char *sealed = v_pstr("regions.specimen.pod.sealed");
  int axis = si(base, "pod.axis", 0), feet = si(base, "pod.feet", 0), psz[2] = { 0, 0 }; word_pod_size(psz); int w = psz[0], h = psz[1];
  if (has(sealed)) {
    char focus[40]; snprintf(focus, sizeof focus, "%s", v_focus_cur());
    int lift = strcmp(focus, "pod") == 0 ? spec_int("frame", "focus.lift.creature", 4) : 0, rect[4] = { axis - v_half(w), feet - h - lift, w, h };
    int sw = w + spec_int(S, "shadow.widen", 0), sh = spec_int(S, "shadow.h", 0);
    int shadow[4] = { axis - v_half(sw), feet - v_half(sh), sw, sh }; layer("specimen.shadow", shadow, v_pstr("regions.specimen.room.shadow"));
    v_region("pod", LAYER_ART); v_sprite("specimen.pod", sealed, rect[0], rect[1], rect[2], rect[3]);
    const char *idpic = v_pstr("regions.specimen.pod.identified");
    anim_state_t sa_; char pid[48]; snprintf(pid, sizeof pid, "%s", v_pstr("regions.specimen.pod.id"));
    if (anim_get(ANIM_SEAL, pid, &sa_) && has(idpic)) {   /* Identify clears the seal from the top down over the event's length: the identified picture above the cut, the sealed one below */
      int cut = (2 * h * sa_.elapsed + sa_.ms) / (2 * sa_.ms);   /* round(h * elapsed / ms) */
      v_region("specimen", LAYER_ART);
      prim_node(v_id("specimen.id"), FN_CLIP, rect[0], rect[1], w, cut, 0, 1, 0);
      v_sprite("specimen.idpic", idpic, rect[0], rect[1], w, h);
      if (cut > 0 && cut < h) { v_region("specimen", LAYER_CHROME); v_rect("specimen.cut", rect[0] + 4, rect[1] + cut, w - 8, 1, white); }
    } else if (has(idpic)) { v_region("specimen", LAYER_ART); v_sprite("specimen.idpic", idpic, rect[0], rect[1], w, h); }
  }
  v_region("specimen", LAYER_ART); layer("specimen.cradleFront", front, v_pstr("regions.specimen.room.cradleFront"));
  const char *nm = v_pstr("regions.specimen.name");
  if (has(nm)) {
    char text[V_STR]; snprintf(text, sizeof text, "%s", nm); int npx = si(base, "name.px", 20), ncx = si(base, "name.centre", 256), plateH = si(base, "name.plate.h", 24);
    int tw = v_measure(text, npx), pw = layout_plate_width(S, v_fmt("%s.name", base), tw);
    const char *series = v_pstr("regions.specimen.room.plate");
    v_region("name", LAYER_ART); if (has(series)) v_sprite("specimen.plate", v_fmt("%s-%dx%d:%dx%d", series, pw, plateH, pw, plateH), ncx - v_half(pw), nrect[1], pw, plateH);
    v_region("name", LAYER_TYPE); centred("specimen.name", text, ncx, cap_top(npx, nrect[1], nrect[3]), npx, name);
  }
  const char *ribbon = v_pstr("regions.specimen.ribbon"); anim_state_t ra_; char rpid[48]; snprintf(rpid, sizeof rpid, "%s", v_pstr("regions.specimen.pod.id"));
  if (has(ribbon) && anim_get(ANIM_RIBBON, rpid, &ra_) && ra_.elapsed >= ra_.from) {   /* a ribbon in the origin's place, from `from` ms into its event */
    int rr[4]; srect(base, "ribbon.rect", rr); int rpx = si(base, "ribbon.px", 20); char fill[24], edge[24], rtext[24];
    colour("ribbonFill", fill, sizeof fill); colour("ribbonEdge", edge, sizeof edge); colour("ribbonText", rtext, sizeof rtext);
    v_region("ribbon", LAYER_CHROME); word_panel("specimen.ribbon", rr[0], rr[1], rr[2], rr[3], fill, edge);
    v_region("ribbon", LAYER_TYPE); centred("specimen.ribbon.text", ribbon, rr[0] + v_half(rr[2]), rr[1] + v_fdiv(rr[3] - v_cap(rpx), 2), rpx, rtext);
  } else if (spec_len(S, v_fmt("%s.origin", base)) >= 0) {
    int orr[4]; srect(base, "origin.rect", orr); int opx = si(base, "origin.px", 16), pitch = si(base, "origin.pitch", 20), maxLines = si(base, "origin.lines", 2), line = 0;
    char ostr[V_STR]; v_region("origin", LAYER_TYPE);
    for (int i = 0, n = v_plen("regions.specimen.origin"); i < n && line < maxLines; i++) {
      snprintf(ostr, sizeof ostr, "%s", v_pstr(v_fmt("regions.specimen.origin.%d", i)));
      char wrapped[V_STR * 3]; int nl = v_wrap(ostr, orr[2], opx, wrapped, sizeof wrapped, 8); const char *l = wrapped;
      for (int j = 0; j < nl && line < maxLines; j++, line++) {
        int tw = v_measure(l, opx); v_text(v_fmt("specimen.origin.%d", line), l, orr[0], cap_top(opx, orr[1] + pitch * line, pitch), tw, opx, origin); l += strlen(l) + 1;
      }
    }
  }
  /* the overview's own parts: the figure beside the pod, the marks that say who it is, the find's picture */
  if (spec_len(S, v_fmt("%s.figure", base)) >= 0) { int fr[4]; srect(base, "figure.rect", fr); v_region("figure", LAYER_ART); layer("specimen.figure", fr, v_pstr("regions.specimen.figure")); }
  if (spec_len(S, v_fmt("%s.who", base)) >= 0) for (int i = 0, n = v_plen("regions.specimen.who"); i < n; i++) { int mr[4]; for (int k = 0; k < 4; k++) mr[k] = spec_int(S, v_fmt("%s.who.marks.%d.%d", base, i, k), 0); v_region("who", LAYER_ART); layer(v_fmt("specimen.who.%d", i), mr, v_pstr(v_fmt("regions.specimen.who.%d", i))); }
  /* the two captions (lvgl-switch.md L2.0, decided 2026-10-09): "this pod" under the who-it-is marks, always in the overview; "the species" under the figure, only when the pod is identified (the view sends it then). They have no JavaScript twin. */
  const char *cap = v_pstr("regions.specimen.captions.pod");
  if (has(cap) && spec_len(S, v_fmt("%s.thisPod", base)) >= 0) caption("thisPod", base, "thisPod", cap);
  cap = v_pstr("regions.specimen.captions.figure");
  if (has(cap) && spec_len(S, v_fmt("%s.figure.caption", base)) >= 0) caption("figure.caption", base, "figure.caption", cap);
  const char *op = v_pstr("regions.specimen.originPicture");
  if (has(op) && spec_len(S, v_fmt("%s.originPicture", base)) >= 0) { int orr[4]; srect(base, "originPicture.rect", orr); v_region("find", LAYER_ART); v_sprite("specimen.find", op, orr[0], orr[1], orr[2], orr[3]); }
}

/* the overview's kin (same-species pods as rings, the small pod in each) and the hatch */
void word_kin(const char *base) {
  int n = v_plen("regions.kin"), pw = sa(base, "kin.pod", 0, 0), ph = sa(base, "kin.pod", 1, 0);
  for (int i = 0; i < n; i++) {
    int r[4]; layout_kin_rect(S, v_fmt("%s.kin", base), i, r); char kid[40]; snprintf(kid, sizeof kid, "kin.k%d", i);
    v_region("kin", LAYER_ART); v_sprite(v_fmt("%s.ring", kid), v_pstr(v_fmt("regions.kin.%d.ring", i)), r[0], r[1], r[2], r[3]);
    const char *pod = v_pstr(v_fmt("regions.kin.%d.pod", i)); if (has(pod)) v_sprite(v_fmt("%s.pod", kid), pod, r[0] + (r[2] - pw) / 2, r[1] + (r[3] - ph) / 2, pw, ph);
  }
  const char *hatch = v_pstr("regions.hatch");
  if (has(hatch)) { int hr[4]; srect(base, "hatch.rect", hr); v_region("hatch", LAYER_ART); v_sprite("kin.hatch", hatch, hr[0], hr[1], hr[2], hr[3]); }
}

/* the stamp label in its case (station-layouts.md, "The stamp label"): the dim glass case under it, a 120 x 120 bone plate with a slate edge, the stamp centred on it, the case's front glass over it */
void word_stamp(const char *base) {
  if (spec_len("props", "regions.stamp") < 0) return;
  int cr[4], sr[4], fr[4]; srect(base, "stampCase.rect", cr); srect(base, "stamp.rect", sr); srect(base, "stampCaseFront.rect", fr);
  char fill[24], edge[24]; spec_str(S, "colours.stampLabel.fill", fill, sizeof fill); spec_str(S, "colours.stampLabel.edge", edge, sizeof edge);
  int size = v_pint("regions.stamp.size", 0); char stamp[96]; snprintf(stamp, sizeof stamp, "%s", v_pstr("regions.stamp.asset"));
  v_region("stamp", LAYER_ART); layer("stamp.case", cr, v_pstr("regions.stamp.case.back"));
  v_region("stamp", LAYER_CHROME); word_panel("stamp", sr[0], sr[1], sr[2], sr[3], fill, edge);
  if (has(stamp) && size) { v_region("stamp.image", LAYER_ART); v_sprite("stamp.stamp", stamp, sr[0] + v_half(sr[2] - size), sr[1] + v_half(sr[3] - size), size, size); }
  v_region("stamp", LAYER_ART); layer("stamp.front", fr, v_pstr("regions.stamp.case.front"));
}
