# The magenta key's residue on the trait and roll plates (found 2026-10-12 00:23 at 1x: a 1 px bright magenta fringe round the
# creature on S01, S02 and S03 plates). No calls. Every opaque pixel that is magenta or its cast (green under 0.6x the lesser
# of red and blue, that lesser above 60), or an edge pixel touching the ground with the key's faint cast (green under 0.75x, red and
# blue within 60), takes the mean of its non-magenta, non-ground neighbours within 2 px (the creature's own
# edge colour); if it has none, the plate's ground. Nothing else changes. Writes the plates in place and updates their manifest hashes.
# usage: python3 -I tools/defringe-plates.py   (run from pods/)
import glob, json, hashlib, numpy as np
from PIL import Image
man = json.load(open("slices/manifest.json")); GROUND = np.array([0x16, 0x2a, 0x37])
def magenta(a): r, g, b = a[..., 0], a[..., 1], a[..., 2]; return (g < 0.6 * np.minimum(r, b)) & (np.minimum(r, b) > 60)
tot = {}
for f in sorted(glob.glob("slices/trait-S*.png") + glob.glob("slices/roll-S*.png")):
    im = Image.open(f).convert("RGBA"); a = np.asarray(im).astype(int).copy(); op = a[..., 3] >= 128
    ground = np.abs(a[..., :3] - GROUND).sum(-1) < 24
    from scipy import ndimage as nd_
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    cast = op & ~ground & nd_.binary_dilation(ground, iterations=1) & (g_ < 0.75 * np.minimum(r_, b_)) & (np.abs(r_ - b_) < 60)   # the key's faint cast on the edge pixels that touch the ground
    m = op & (magenta(a) | cast)
    if not m.any(): continue
    ok = op & ~m & ~ground; H, W = m.shape
    for y, x in zip(*np.where(m)):
        y0, y1, x0, x1 = max(0, y - 2), min(H, y + 3), max(0, x - 2), min(W, x + 3)
        nb = ok[y0:y1, x0:x1]
        a[y, x, :3] = a[y0:y1, x0:x1, :3][nb].mean(0) if nb.any() else GROUND
    Image.fromarray(a.astype(np.uint8), "RGBA").save(f)
    n = f.split("/")[-1][:-4]; tot[n] = int(m.sum())
    if n in man: man[n]["sha256"] = hashlib.sha256(open(f, "rb").read()).hexdigest(); man[n]["defringed"] = f"magenta key residue removed, {int(m.sum())} px (tools/defringe-plates.py, 2026-10-12)"
json.dump(man, open("slices/manifest.json", "w"), indent=1)
left = sum(int(((np.asarray(Image.open(f).convert("RGBA")).astype(int)[..., 3] >= 128) & magenta(np.asarray(Image.open(f).convert("RGBA")).astype(int))).sum()) for f in glob.glob("slices/trait-S*.png") + glob.glob("slices/roll-S*.png"))
print(len(tot), "plates,", sum(tot.values()), "px replaced; magenta left at alpha >= 128:", left)
