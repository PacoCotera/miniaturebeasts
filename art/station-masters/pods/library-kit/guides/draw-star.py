"""M5: wish-mark-12, the five-point wish star, drawn by rule from the approved render's star5 (iwq art/compose-species.js), then read by hand at 1x.
Hand pass: HAND below lists the pixels changed from the rule (none: the rule raster reads as five points at 1x, the top arm, two arms and two legs,
with yellow showing in the body; a 2 px top arm cannot hold yellow without widening the point)."""
import os
import numpy as np
from PIL import Image
from kitlib import pal, save, file_sha, iou, ink_mask, values, clear_ok, measures_update, IWQ, sha
from star_rule import rule, edge
import importlib.util
spec = importlib.util.spec_from_file_location("ring", os.path.join(os.path.dirname(__file__), "draw-ring.py"))
ring = importlib.util.module_from_spec(spec); spec.loader.exec_module(ring)

HAND = {}   # (x, y) -> 'gold' | 'yellow' | None (clear)

P = pal(); Y, G = P["yellow"], P["gold"]
m = rule(); e = edge(m)
lab = np.where(e, 2, np.where(m, 1, 0))
for (x, y), v in HAND.items():
    lab[y, x] = {"gold": 2, "yellow": 1, None: 0}[v]
a = np.zeros((12, 12, 4), np.uint8); a[lab == 1] = Y + (255,); a[lab == 2] = G + (255,)
p = save(Image.fromarray(a, "RGBA"), "wish-mark-12")
im = Image.open(p); mk = ink_mask(im)
ys, xs = np.where(mk)
# the shelf placement: star box at (810, 88 + 24k), disc box at (800, 94 + 24k): star (sx, sy) -> ring (sx + 10, sy - 6)
rm = ring.rule(); over = 0
for sy, sx in zip(ys, xs):
    rx, ry = sx + 10, sy - 6
    if 0 <= rx < 16 and 0 <= ry < 16 and rm[ry, rx]: over += 1
src = os.path.join(IWQ, "results/T-20261017-library/art/compose-species.js")
r = {"ink": int(mk.sum()), "gold": int((lab == 2).sum()), "yellow": int((lab == 1).sum()),
     "rule_ink": int(m.sum()), "rule_gold": int(e.sum()), "rule_yellow": int((m & ~e).sum()),
     "x": [int(xs.min()), int(xs.max())], "y": [int(ys.min()), int(ys.max())],
     "values": len(values(im)), "only_yellow_gold_clear": values(im) <= {Y + (255,), G + (255,), (0, 0, 0, 0)}, "clear_ok": clear_ok(im),
     "ink_over_open_ring_at_shelf_offset": over, "hand_pixels_changed": len(HAND),
     "iou_vs_rule": round(iou(mk, m), 3), "source": "iwq results/T-20261017-library/art/compose-species.js star5",
     "source_sha256": sha(open(src, "rb").read()), "sha256": file_sha(p), "script": "guides/draw-star.py (guides/star_rule.py)"}
r["pass"] = (r["only_yellow_gold_clear"] and r["clear_ok"] and r["x"][0] >= 1 and r["x"][1] <= 10 and r["y"][0] >= 1 and r["y"][1] <= 9
             and over == 0 and r["iou_vs_rule"] >= 0.85)
measures_update("M5_wish_mark_12", r)
print(r)
