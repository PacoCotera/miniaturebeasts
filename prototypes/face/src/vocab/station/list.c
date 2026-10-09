/* The list word (Pods' collection, station-layouts.md Pods §5 A), ported from components/list.mjs: every rack place on the 3 x 2 grid, each a recessed place (a panel picture), the progress ring
   (the studio's masters in layers), the pod in the ring, the name on its plate, the find, the can-grow mark and the glint star; an empty place is the empty ring. Then the waiting mark.
   Spec: `pods` regions.collection. Props: regions.list { places: [ { empty, panel, ringLayers: [ids] } | { panel, ringLayers, pod, name, plate (the series), find, grow, glint } ], waiting }.
   A picture the host has not sent is a slot not yet filled: nothing is drawn and the layout does not move. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include <stdio.h>
#include <string.h>

#define S "pods"
#define C "regions.collection"
static int si(const char *path, int dflt) { return spec_int(S, path, dflt); }
static int sa(const char *base, int k, int dflt) { char p[128]; snprintf(p, sizeof p, "%s.%d", base, k); return spec_int(S, p, dflt); }

/* the bench: the stage's ground and the room master over it (the first of the candidates the face holds) */
void word_bench(void) {
  int r[4]; if (!v_spec_rect(S, "regions.bench.rect", r)) return;
  char ground[24]; spec_str(S, "colours.ground", ground, sizeof ground);
  v_region("bench", LAYER_CHROME); v_rect("bench", r[0], r[1], r[2], r[3], ground);
  v_region("bench", LAYER_ART);
  for (int i = 0; i < v_plen("regions.bench.room"); i++) if (v_sprite("bench.room", v_pstr(v_fmt("regions.bench.room.%d", i)), r[0], r[1], r[2], r[3])) break;
}

void word_list(void) {
  char name[24]; spec_str(S, "colours.name", name, sizeof name);
  int n = v_plen("regions.list.places");
  int slice[4]; for (int k = 0; k < 4; k++) slice[k] = sa(C ".ring.slice", k, 0);
  int podW = sa(C ".pod.size", 0, 0), podH = sa(C ".pod.size", 1, 0), npx = si(C ".name.px", 20), nh = si(C ".name.h", 24), plateH = si(C ".name.plate.h", 24);
  for (int i = 0; i < n; i++) {
    int r[4]; layout_place_rect(S, C, i, r);
    const char *pre = v_fmt("regions.list.places.%d", i); char P[96]; snprintf(P, sizeof P, "%s", pre);
    const char *id = v_fmt("list.p%d", i); char pid[40]; snprintf(pid, sizeof pid, "%s", id);
    v_region("place", LAYER_ART); v_sprite(pid, v_pstr(v_fmt("%s.panel", P)), r[0], r[1], r[2], r[3]);
    for (int k = 0, nl = v_plen(v_fmt("%s.ringLayers", P)), j = 0; k < nl; k++) {
      char a[96]; snprintf(a, sizeof a, "%s", v_pstr(v_fmt("%s.ringLayers.%d", P, k)));
      char rid[64]; snprintf(rid, sizeof rid, "%s.ring.%d", pid, j);
      if (v_sprite(rid, a, r[0] + slice[0], r[1] + slice[1], slice[2], slice[3])) j++;
    }
    if (v_pbool(v_fmt("%s.empty", P), 0)) continue;
    const char *pod = v_pstr(v_fmt("%s.pod", P));
    if (*pod) { v_region("place.pod", LAYER_ART); v_sprite(v_fmt("%s.pod", pid), pod, r[0] + sa(C ".pod.centre", 0, 0) - podW / 2, r[1] + sa(C ".pod.centre", 1, 0) - podH / 2, podW, podH); }
    char text[V_STR]; snprintf(text, sizeof text, "%s", v_pstr(v_fmt("%s.name", P)));
    int nx = r[0] + sa(C ".name.at", 0, 0), ny = r[1] + sa(C ".name.at", 1, 0), tw = v_measure(text, npx);
    int pw = layout_plate_width(S, C ".name", tw);
    char series[64]; snprintf(series, sizeof series, "%s", v_pstr(v_fmt("%s.plate", P)));
    v_region("place.name", LAYER_ART); if (*series) v_sprite(v_fmt("%s.plate", pid), v_fmt("%s-%dx%d:%dx%d", series, pw, plateH, pw, plateH), nx, ny, pw, plateH);
    v_region("place.name", LAYER_TYPE); v_text(v_fmt("%s.name", pid), text, nx + v_half(pw - tw), ny + v_fdiv(nh - v_cap(npx), 2), tw, npx, name);
    const char *find = v_pstr(v_fmt("%s.find", P));
    if (*find) { v_region("place.find", LAYER_ART); v_sprite(v_fmt("%s.find", pid), find, r[0] + sa(C ".place.at", 0, 0), r[1] + sa(C ".place.at", 1, 0), sa(C ".place.at", 2, 0), sa(C ".place.at", 3, 0)); }
    const char *grow = v_pstr(v_fmt("%s.grow", P));
    if (*grow) { v_region("place", LAYER_ART); v_sprite(v_fmt("%s.grow", pid), grow, r[0] + sa(C ".grow.at", 0, 0), r[1] + sa(C ".grow.at", 1, 0), sa(C ".grow.at", 2, 0), sa(C ".grow.at", 3, 0)); }
    const char *glint = v_pstr(v_fmt("%s.glint", P));
    if (*glint) { v_region("place", LAYER_ART); v_sprite(v_fmt("%s.glint", pid), glint, r[0] + sa(C ".glint.at", 0, 0), r[1] + sa(C ".glint.at", 1, 0), sa(C ".glint.at", 2, 0), sa(C ".glint.at", 3, 0)); }
  }
  const char *wait = v_pstr("regions.list.waiting");
  if (*wait) { v_region("waiting", LAYER_ART); v_sprite("list.waiting", wait, sa(C ".waiting.rect", 0, 0), sa(C ".waiting.rect", 1, 0), sa(C ".waiting.rect", 2, 0), sa(C ".waiting.rect", 3, 0)); }
}
