"""M4: library-seed-24x24, the closed almond seed, opaque on libWell. Drawn by rule from the approved render's seedMark
(iwq results/T-20261017-library/art/compose-all2.js, guides/seed_rule.py), then finished by hand.
Hand pass (HAND below, the top half; the bottom half is its 180-degree turn about (12, 12), so the seed stays one shape).
Redrawn at w 5.5, h 10.5 (AD sign-off 2026-10-23 23:46: the approved v5 is compose-all2.js's seed); the rule gives 160 px, x 5-18, y 4-19:
  * the two tips: row 4 ends at x 9 (the rule's 10), rows 9 and 10 end at x 15 and 16 (the rule's 16 and 17), and their turns
    (row 19 from x 14, rows 14 and 13 from x 8 and 7), so each tip ends in a corner on the long axis instead of a flat 5 px run,
    and the axis by moments stays the rule's (38.5 against 38.1 degrees): 6 seed pixels go back to libWell
    (variants A to F were tried and leaned the axis more or kept a flat tip);
  * the edge: the rule's 4-neighbour edge breaks at its diagonal steps, so it is not a closed line; the edge is every seed pixel with any of its
    8 neighbours outside, a closed 1 px line, 4-connected, with no doubled corner (each edge pixel has exactly two edge 4-neighbours; method accepted by the AD).
No colour added, no partial alpha, no shadow, no lip. The tilt is the render's: upper left to lower right (never mirrored)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
from kitlib import pal, save, file_sha, iou, values, measures_update, IWQ, sha
from seed_rule import rule, edge

HAND = {4: (6, 9), 5: (5, 12), 6: (5, 13), 7: (5, 14), 8: (5, 15), 9: (5, 15), 10: (5, 16), 11: (6, 17)}   # row: (first x, last x), top half

def hand_mask():
    m = np.zeros((24, 24), bool)
    for y, (a, b) in HAND.items():
        m[y, a:b + 1] = True
        m[23 - y, 23 - b:24 - a] = True
    return m

def edge8(m):
    p = np.pad(m, 1); o = np.zeros_like(m)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            o |= ~p[1 + dy:25 + dy, 1 + dx:25 + dx]
    return m & o

if __name__ == "__main__":
    P = pal(); WELL, FILL, EDGE = P["libWell"], P["libPanel"], P["seedEdge"]
    R = rule(); m = hand_mask(); e = edge8(m)
    a = np.zeros((24, 24, 3), np.uint8); a[:] = WELL; a[m] = FILL; a[e] = EDGE
    p = save(Image.fromarray(a, "RGB"), "library-seed-24x24")
    im = Image.open(p); arr = np.asarray(im.convert("RGB"))
    seed = (arr != WELL).any(-1); ed = (arr == EDGE).all(-1)
    lab, n_e = ndimage.label(ed)                           # 4-connected by default
    pe = np.pad(ed, 1)
    nb = (pe[:-2, 1:-1].astype(int) + pe[2:, 1:-1] + pe[1:-1, :-2] + pe[1:-1, 2:])[ed]
    inner = seed & ~ed
    _, n_in = ndimage.label(inner)
    # the long axis from the seed pixels' second moments (canvas terms, y down)
    def axis(msk):
        ys, xs = np.where(msk); cx, cy = xs.mean() + 0.5, ys.mean() + 0.5
        w, v = np.linalg.eigh(np.cov(np.stack([xs + 0.5 - cx, ys + 0.5 - cy]))); ax = v[:, -1]
        if ax[1] < 0: ax = -ax
        return float(cx), float(cy), float(np.degrees(np.arctan2(ax[0], ax[1])))   # angle from straight down, toward +x
    cx, cy, tilt = axis(seed); _, _, rtilt = axis(R)
    src = os.path.join(IWQ, "results/T-20261017-library/art/compose-all2.js")
    r = {"rule_seed": int(R.sum()), "rule_edge": int(edge(R).sum()), "rule_fill": int((R & ~edge(R)).sum()),
         "seed": int(seed.sum()), "edge": int(ed.sum()), "fill": int(inner.sum()),
         "mode": im.mode, "colours": sorted("#%02x%02x%02x" % c[:3] for c in values(im)),
         "edge_components_4conn": int(n_e), "edge_pixels_with_two_edge_4neighbours": int((nb == 2).sum()),
         "edge_closed": bool(n_e == 1 and (nb == 2).all() and n_in == 1),
         "centre": [round(cx, 2), round(cy, 2)], "long_axis_from_vertical_deg": round(tilt, 1), "rule_long_axis_from_vertical_deg": round(rtilt, 1), "render_axis_deg": 36.0, "rule_x": [int(np.where(R.any(0))[0].min()), int(np.where(R.any(0))[0].max())], "rule_y": [int(np.where(R.any(1))[0].min()), int(np.where(R.any(1))[0].max())],
         "long_axis_runs": "upper left to lower right" if tilt > 0 else "upper right to lower left",
         "hand_pixels_removed_from_rule": int((R & ~m).sum()), "hand_pixels_added": int((m & ~R).sum()),
         "iou_vs_rule": round(iou(seed, R), 3), "iou_note": "opaque master: the seed is every pixel that is not libWell, against the rule's raster",
         "source": "iwq results/T-20261017-library/art/compose-all2.js seedMark (w 5.5, h 10.5)", "source_sha256": sha(open(src, "rb").read()),
         "sha256": file_sha(p), "script": "guides/draw-seed.py (guides/seed_rule.py)"}
    r["pass"] = (im.mode == "RGB" and len(r["colours"]) == 3 and r["edge_closed"] and r["iou_vs_rule"] >= 0.90 and tilt > 0)
    measures_update("M4_library_seed_24x24", r)
    print(r)
