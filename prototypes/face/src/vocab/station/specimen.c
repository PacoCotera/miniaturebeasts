/* The specimen word (the pod under the beam on its cradle; station-layouts.md, Pods §5), with the kin and the hatch beside it: ported from components/specimen.mjs and list.mjs
   (kinHatch); the stamp label and its case (stampLabel.mjs) are kit_stamp's. Spec: `pods` regions.<state> (overview or chapter). Props: regions.specimen { beam, room { cradleFront, shadow, plate (the series) }, pod { sizeClass, size,
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
static int has(const char *id) { return id && *id; }
/* a layer of the room: the picture at its rectangle when the face has it */
static void layer(const char *id, const int r[4], const char *asset) { if (has(asset)) v_sprite(id, asset, r[0], r[1], r[2], r[3]); }


static int bench_present(void) { for (int i = 0; i < v_plen("regions.bench.room"); i++) if (wire_has_asset(v_pstr(v_fmt("regions.bench.room.%d", i)))) return 1; return 0; }

/* a caption: one line of the region's px centred in its rect, in its colour (the cap top as the name's) */
static void caption(const char *region, const char *base, const char *key, const char *text) {
  char path[120]; snprintf(path, sizeof path, "%s.%s", base, key); int r[4], px = v_si(S, v_fmt("%s.px", path), 16); char col[24]; v_srect(S, v_fmt("%s.rect", path), r);
  spec_str(S, v_fmt("%s.colour", path), col, sizeof col);   /* a palette name */
  v_region(region, LAYER_TYPE); v_line_at(v_fmt("specimen.%s", region), text, r[0] + v_half(r[2]), v_cap_in(r[1], r[3], px), V_ANCHOR_CAP, px, col, V_ALIGN_CENTRE);
}
void word_specimen(const char *base) {
  char name[24], origin[24], white[24]; snprintf(name, sizeof name, "%s", v_scol(S, "colours.name")); snprintf(origin, sizeof origin, "%s", v_scol(S, "colours.origin")); snprintf(white, sizeof white, "white");
  int beam[4], front[4], nrect[4];
  for (int k = 0; k < 4; k++) { beam[k] = v_sk(S, v_fmt("%s.beam.rect", base), k); front[k] = v_sk(S, v_fmt("%s.cradleFront.rect", base), k); nrect[k] = v_sk(S, v_fmt("%s.name.rect", base), k); }
  v_region("beam", LAYER_ART);
  if (!bench_present()) { const char *b = v_pstr("regions.specimen.beam"); if (has(b)) v_sprite("specimen.beam", b, beam[0], beam[1], beam[2], beam[3]); }
  v_region("specimen", LAYER_PAINTED);   /* the room's stages are painted masters (the art director's layer table) */
  /* the stage carries the dish and the shelf (room-bench-stage-overview, -chapter): only the dish's front lip is drawn, below */
  const char *sealed = v_pstr("regions.specimen.pod.sealed");
  int axis = v_si(S, v_fmt("%s.pod.axis", base), 0), feet = v_si(S, v_fmt("%s.pod.feet", base), 0);
  if (has(sealed)) {
    char focus[40]; snprintf(focus, sizeof focus, "%s", v_focus_cur());
    int lift = strcmp(focus, "pod") == 0 ? spec_int("frame", "focus.lift.creature", 4) : 0, pb[4];
    kit_podShadow_t shadow = { "specimen.shadow", "specimen", v_pstr("regions.specimen.room.shadow"), 1 };
    kit_pod(S, v_pstr("regions.specimen.pod.sizeClass"), axis, feet, &shadow, pb);   /* the pod's box and its shadow: the shadow stays on the feet, the pod lifts with the focus */
    int w = pb[2], h = pb[3], rect[4] = { pb[0], pb[1] - lift, w, h };
    v_region("pod", LAYER_PAINTED); v_sprite("specimen.pod", sealed, rect[0], rect[1], rect[2], rect[3]);
    const char *idpic = v_pstr("regions.specimen.pod.identified");
    anim_state_t sa_; char pid[48]; snprintf(pid, sizeof pid, "%s", v_pstr("regions.specimen.pod.id"));
    if (anim_get(ANIM_SEAL, pid, &sa_) && has(idpic)) {   /* Identify clears the seal from the top down over the event's length: the identified picture above the cut, the sealed one below */
      int cut = (2 * h * sa_.elapsed + sa_.ms) / (2 * sa_.ms);   /* round(h * elapsed / ms) */
      v_region("specimen", LAYER_PAINTED);
      prim_node(v_id("specimen.id"), FN_CLIP, rect[0], rect[1], w, cut, 0, 1, 0);
      v_sprite("specimen.idpic", idpic, rect[0], rect[1], w, h);
      if (cut > 0 && cut < h) { v_region("specimen", LAYER_CHROME); kit_hairline("specimen.cut", rect[0] + 4, rect[1] + cut, w - 8, white, 0, NULL); }
    } else if (has(idpic)) { v_region("specimen", LAYER_PAINTED); v_sprite("specimen.idpic", idpic, rect[0], rect[1], w, h); }
  }
  v_region("specimen", LAYER_PAINTED); layer("specimen.cradleFront", front, v_pstr("regions.specimen.room.cradleFront"));
  const char *nm = v_pstr("regions.specimen.name");
  if (has(nm)) {
    char text[V_STR]; snprintf(text, sizeof text, "%s", nm); int npx = v_si(S, v_fmt("%s.name.px", base), 20), ncx = v_si(S, v_fmt("%s.name.centre", base), 256), plateH = v_si(S, v_fmt("%s.name.plate.h", base), 24);
    int tw = v_measure(text, npx), pw = layout_plate_width(S, v_fmt("%s.name", base), tw);
    v_region("name", LAYER_PAINTED); v_plate("specimen.plate", v_fmt("%s.name", base), pw, ncx - v_half(pw), nrect[1]); (void)plateH;
    v_region("name", LAYER_TYPE); v_line_at("specimen.name", text, ncx, v_cap_in(nrect[1], nrect[3], npx), V_ANCHOR_CAP, npx, name, V_ALIGN_CENTRE);
  }
  const char *ribbon = v_pstr("regions.specimen.ribbon"); anim_state_t ra_; char rpid[48]; snprintf(rpid, sizeof rpid, "%s", v_pstr("regions.specimen.pod.id"));
  if (has(ribbon) && anim_get(ANIM_RIBBON, rpid, &ra_) && ra_.elapsed >= ra_.from) {   /* a ribbon in the origin's place, from `from` ms into its event */
    int rr[4]; v_srect(S, v_fmt("%s.ribbon.rect", base), rr); int rpx = v_si(S, v_fmt("%s.ribbon.px", base), 20); char fill[24], edge[24], rtext[24];
    snprintf(fill, sizeof fill, "%s", v_scol(S, "colours.ribbonFill")); snprintf(edge, sizeof edge, "%s", v_scol(S, "colours.ribbonEdge")); snprintf(rtext, sizeof rtext, "%s", v_scol(S, "colours.ribbonText"));
    v_region("ribbon", LAYER_CHROME); kit_panel("specimen.ribbon", rr[0], rr[1], rr[2], rr[3], fill, edge, NULL, 0);
    v_region("ribbon", LAYER_TYPE); v_line_at("specimen.ribbon.text", ribbon, rr[0] + v_half(rr[2]), v_cap_in(rr[1], rr[3], rpx), V_ANCHOR_CAP, rpx, rtext, V_ALIGN_CENTRE);
  } else if (spec_len(S, v_fmt("%s.origin", base)) >= 0) {
    int orr[4]; v_srect(S, v_fmt("%s.origin.rect", base), orr); int opx = v_si(S, v_fmt("%s.origin.px", base), 16), pitch = v_si(S, v_fmt("%s.origin.pitch", base), 20), maxLines = v_si(S, v_fmt("%s.origin.lines", base), 2), line = 0;
    char ostr[V_STR]; v_region("origin", LAYER_TYPE);
    for (int i = 0, n = v_plen("regions.specimen.origin"); i < n && line < maxLines; i++) {
      snprintf(ostr, sizeof ostr, "%s", v_pstr(v_fmt("regions.specimen.origin.%d", i)));
      char wrapped[V_STR * 3]; int nl = v_wrap(ostr, orr[2], opx, wrapped, sizeof wrapped, 8); const char *l = wrapped;
      for (int j = 0; j < nl && line < maxLines; j++, line++) {
        v_line_at(v_fmt("specimen.origin.%d", line), l, orr[0], orr[1] + pitch * line, V_ANCHOR_LINE, opx, origin, V_ALIGN_LEFT); l += strlen(l) + 1;
      }
    }
  }
  /* the overview's own parts: the figure beside the pod, the marks that say who it is, the find's picture */
  if (spec_len(S, v_fmt("%s.figure", base)) >= 0) { int fr[4]; const char *fid = v_pstr("regions.specimen.figure"); char eid[96]; spec_str(S, v_fmt("%s.figure.beforeIdentify.slice", base), eid, sizeof eid); v_srect(S, v_fmt("%s.%s", base, *eid && strncmp(fid, eid, strlen(eid)) == 0 ? "figure.beforeIdentify.rect" : "figure.rect"), fr);
    if (strcmp(v_focus_cur(), "figure") == 0) fr[1] -= spec_int("frame", "focus.lift.creature", 4);   /* the focused figure lifts as a creature does; its footprint ring stays on the feet (screens/pods.c) */
    v_region("figure", LAYER_PAINTED); layer("specimen.figure", fr, fid); }   /* GB1 C1: the painted adult 1:1 at figure.rect, or the empty halo at its own rect; one picture, no cross-fade */
  /* the two captions (lvgl-switch.md L2.0, decided 2026-10-09): "this pod" under the who-it-is marks, always in the overview; "the species" under the figure, only when the pod is identified (the view sends it then). They have no JavaScript twin. */
  const char *cap = v_pstr("regions.specimen.captions.pod");
  if (has(cap) && spec_len(S, v_fmt("%s.thisPod", base)) >= 0) caption("thisPod", base, "thisPod", cap);
  cap = v_pstr("regions.specimen.captions.figure");
  if (has(cap) && spec_len(S, v_fmt("%s.figure.caption", base)) >= 0) caption("figure.caption", base, "figure.caption", cap);
  const char *op = v_pstr("regions.specimen.originPicture");
  if (has(op) && spec_len(S, v_fmt("%s.originPicture", base)) >= 0) { int orr[4]; v_srect(S, v_fmt("%s.originPicture.rect", base), orr); v_region("find", LAYER_PAINTED); v_sprite("specimen.find", op, orr[0], orr[1], orr[2], orr[3]); }
}

/* the overview's kin (same-species pods as rings, the small pod in each) and the hatch */
void word_kin(const char *base) {
  int n = v_plen("regions.kin"), pw = v_sk(S, v_fmt("%s.kin.pod", base), 0), ph = v_sk(S, v_fmt("%s.kin.pod", base), 1);
  for (int i = 0; i < n; i++) {
    int r[4]; layout_kin_rect(S, v_fmt("%s.kin", base), i, r); char kid[40]; snprintf(kid, sizeof kid, "kin.k%d", i);
    v_region("kin", LAYER_PAINTED); v_sprite(v_fmt("%s.ring", kid), v_pstr(v_fmt("regions.kin.%d.ring", i)), r[0], r[1], r[2], r[3]);
    const char *pod = v_pstr(v_fmt("regions.kin.%d.pod", i)); if (has(pod)) { v_sprite(v_fmt("%s.pod", kid), pod, r[0] + (r[2] - pw) / 2, r[1] + (r[3] - ph) / 2, pw, ph); }
  }
  const char *hatch = v_pstr("regions.hatch");
  if (has(hatch)) { int hr[4]; v_srect(S, v_fmt("%s.hatch.rect", base), hr); v_region("hatch", LAYER_PAINTED); v_sprite("kin.hatch", hatch, hr[0], hr[1], hr[2], hr[3]); }
}
