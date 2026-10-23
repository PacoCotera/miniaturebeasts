/* kit_nameTag (common/): a name on a small panel, kept inside its window and set under an anchor box or over it.
   Props: spec (the screen's; it holds regions.nameTag); glass (the path of the window's region in it: its rect x, y, w, h keeps the tag 8 px inside); name; anchor (the box the tag centres on: x, y, w, h);
   yBelow, yOver (the tag's top when it stands under the anchor and when it stands over it, the caller's); rule (KIT_TAG_BELOW: yBelow; KIT_TAG_OVER: yOver; KIT_TAG_AUTO: yBelow, or yOver when the tag's bottom would pass 8 px above the window's bottom);
   slot (1: the fill and the name at the tag's place with no size, no edge, no words); fill, edge, ink (palette names; edge is not read when slot is 1). Reads regions.nameTag of the spec: h, px, lineTop (optional: the name's line top in the page's coordinates, taken from the tag's top by regions.nameTag.rect's y; 0 or absent: the cap top 5 px under the tag's top), and plate { min, max, pad, round } (the width by layout_plate_width: the name's width and twice the pad, rounded up to the round, between min and max).
   Region and layer: the component's own, "nameTag": the panel on chrome, the name on type.
   Node ids, in this order: nameTag (the fill), nameTag.et, nameTag.eb, nameTag.el, nameTag.er (kit_panel's edge), nameTag.text. A slot draws only nameTag and nameTag.text (kit_panel's filled slot form: the screen has always kept the tag's place so, and the meet ribbon stands in its place).
   Placement: the tag is centred on the anchor (x = anchor x + anchor w / 2 - w / 2, the anchor's centre truncating), slid to stay 8 px inside the window's left and right.
   Returns the tag's box in out (x, y, w, h); the box is set also for a slot. */
#include "../vocab.h"
#include "../words.h"
#include "../../prim/prim.h"
#include "../../spec/spec.h"
#include "../../layout/layout.h"
#include <stdio.h>

void kit_nameTag(const char *spec, const char *glass, const char *name, const int anchor[4], int yBelow, int yOver, int rule, int slot, const char *fill, const char *edge, const char *ink, int out[4]) {
  int h = v_si(spec, "regions.nameTag.h", 24), px = v_si(spec, "regions.nameTag.px", 16);
  int tw = v_measure(name, px), w = layout_plate_width(spec, "regions.nameTag", tw);
  int gx = v_sk(spec, v_fmt("%s.rect", glass), 0), gy = v_sk(spec, v_fmt("%s.rect", glass), 1), gw = v_sk(spec, v_fmt("%s.rect", glass), 2), gh = v_sk(spec, v_fmt("%s.rect", glass), 3);
  int x = anchor[0] + anchor[2] / 2 - w / 2, y = yBelow;
  if (rule == KIT_TAG_OVER || (rule == KIT_TAG_AUTO && y + h > gy + gh - 8)) y = yOver;
  if (x < gx + 8) x = gx + 8; if (x + w > gx + gw - 8) x = gx + gw - 8 - w;
  out[0] = x; out[1] = y; out[2] = w; out[3] = h;
  int lt = spec_int(spec, "regions.nameTag.lineTop", 0);
  v_region("nameTag", LAYER_CHROME); kit_panel("nameTag", x, y, w, h, fill, slot ? NULL : edge, slot);
  v_region("nameTag", LAYER_TYPE); v_line_at("nameTag.text", slot ? "" : name, x + v_half(w - tw), lt > 0 ? y + (lt - v_sk(spec, "regions.nameTag.rect", 1)) : y + 5, lt > 0 ? V_ANCHOR_LINE : V_ANCHOR_CAP, px, ink, V_ALIGN_LEFT);
}
