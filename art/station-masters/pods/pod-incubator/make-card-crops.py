"""T-20261016-63: the just-cleared card's pictures, trait-{species}-{trait}-{look}-160x128 (specs/station-incubator-tabs-ruling.md §5: (24, 44),
160 x 128, 1:1), for every look that has a trait painting. Cut by Pods' own trait cutter (tools/traitcut.py: its hand-set windows and its
cut(), the owner's 75 percent rule, reduced and never enlarged, on the cell ground #162a37, a 12 px fade); 160 x 128 is a wide cell (w/h >= 1.2),
so each look's landscape window is used, as traitcut does for its wide cells. traitcut's table and cut() are loaded without running its loop.
Then the house's key-residue rule (tools/defringe-plates.py, copied exactly) is applied to these new files only: that script rewrites every
plate in slices/ and is not idempotent on three S02 plates, so it is not run as a whole.
A check, reported: today's traitcut + defringe re-cuts roll-S01-crown-leaf-crest-128x72 within 78 px of the signed one (its windows were
retuned after wave 1 was cut), so these crops follow today's table, not wave 1's exact windows.
usage: python3 -I pod-incubator/make-card-crops.py   (run in art/station-masters/pods)"""
import sys, os, json
src = open("tools/traitcut.py").read(); src = src[:src.index("rows = []")]
g = {"__name__": "traitcut"}; sys.argv = ["traitcut.py", "."]; exec(compile(src, "tools/traitcut.py", "exec"), g)
from PIL import Image
def sheet_of(sh): return Image.open(f"./{sh}.png" if "/" in sh else f"./source/raw/{sh}.jpg").convert("RGB")
sh, sp, trait, look, _, _, (lx, ly), lw = next(r for r in g["LOOKS"] if r[1] == "S01" and r[2] == "crown" and r[3] == "leaf-crest")
g["cut"](sheet_of(sh), lx, ly, lw, 128, 72, "/tmp/_check-roll.png")
import numpy as np
a = np.asarray(Image.open("/tmp/_check-roll.png").convert("RGB")).astype(int); b = np.asarray(Image.open("slices/roll-S01-crown-leaf-crest-128x72.png").convert("RGB")).astype(int)
print("check: traitcut (before defringe) re-cuts roll-S01-crown-leaf-crest-128x72 with", int((a != b).any(-1).sum()), "px differing")
from scipy import ndimage as nd_
GROUND = np.array([0x16, 0x2a, 0x37])
def magenta(a): r, g, b = a[..., 0], a[..., 1], a[..., 2]; return (g < 0.6 * np.minimum(r, b)) & (np.minimum(r, b) > 60)
def defringe(f):                                                          # tools/defringe-plates.py's rule, one file
    im = Image.open(f).convert("RGBA"); a = np.asarray(im).astype(int).copy(); op = a[..., 3] >= 128
    ground = np.abs(a[..., :3] - GROUND).sum(-1) < 24
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    cast = op & ~ground & nd_.binary_dilation(ground, iterations=1) & (g_ < 0.75 * np.minimum(r_, b_)) & (np.abs(r_ - b_) < 60)
    m = op & (magenta(a) | cast)
    if not m.any(): return 0
    ok = op & ~m & ~ground; H, W = m.shape
    for y, x in zip(*np.where(m)):
        y0, y1, x0, x1 = max(0, y - 2), min(H, y + 3), max(0, x - 2), min(W, x + 3)
        nb = ok[y0:y1, x0:x1]
        a[y, x, :3] = a[y0:y1, x0:x1, :3][nb].mean(0) if nb.any() else GROUND
    Image.fromarray(a.astype(np.uint8), "RGBA").save(f); return int(m.sum())
made = []
for sh, sp, trait, look, _, _, (lx, ly), lw in g["LOOKS"]:
    out = f"slices/trait-{sp}-{trait}-{look}-160x128.png"; box = g["cut"](sheet_of(sh), lx, ly, lw, 160, 128, out); n = defringe(out)
    made.append((f"trait-{sp}-{trait}-{look}-160x128", sh, box, n))
json.dump(made, open("pod-incubator/card-crops.json", "w"), indent=1)
print(len(made), "cut;", sum(m[3] for m in made), "residue px replaced:", ", ".join(m[0] for m in made))
