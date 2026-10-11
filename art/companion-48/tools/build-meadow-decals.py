"""Grass bodies and meadow decals: the fix for the grass repeat.

The review place's grass tiles keep their tuft patches 12 px clear of the edges, so the patches line up on the 48 px grid. Here the
ground is split in two:
  body1..4    48x48 grass bodies: the grass colour with single-pixel leaf and sprout specks and 1x2 blades, no clusters, so a tile
              has no shape for the eye to find again 48 px later; blades never cross a tile edge
  decals/     the tuft patches, tall grass and flowers cut from the review place's own tiles (each region where non-body pixels are
              dense, with 2 px round it, kept when it has 12 or more pixels and lies whole inside its tile), placed on the map by a seeded rule (terrain-map.py)
              independent of the tile grid, as the ripples are placed on water
The ground dir also gets the sand, water and shallows tiles copied as they are, so build-shore.py can cut the shore from body1.
usage: python3 -I build-meadow-decals.py REVIEW_GROUND_DIR OUT_GROUND_DIR OUT_DECAL_DIR"""
import os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index
src, gout, dout = sys.argv[1:4]; os.makedirs(gout, exist_ok=True); os.makedirs(dout, exist_ok=True)
for f in os.listdir(dout):
    if f.endswith(".png"): os.remove(os.path.join(dout, f))

def load(n): return quant.quantize(np.asarray(Image.open(os.path.join(src, n + ".png")).convert("RGBA")))
def save(a, p): P.to_image(np.where(a >= 0, a, -1)).save(p)

for i in range(1, 5):
    r = np.random.RandomState(480 + i); t = np.full((48, 48), C["grass"], dtype=np.int64)
    u = r.rand(48, 48)
    t[u < .07] = C["leaf"]; t[(u >= .07) & (u < .095)] = C["sprout"]
    for _ in range(26):                                   # short blades: a leaf pixel over a forest root, inside the tile
        x, y = r.randint(0, 48), r.randint(0, 46)
        t[y, x] = C["leaf"]; t[y + 1, x] = C["forest"]
    for _ in range(6):
        x, y = r.randint(0, 48), r.randint(0, 47)
        t[y, x] = C["sprout"]
    save(t, os.path.join(gout, f"body{i}.png"))
for n in ("sand", "water1", "water2", "water1b", "water2b", "shallows", "deep1", "deep2"):
    if os.path.exists(os.path.join(src, n + ".png")): shutil.copy(os.path.join(src, n + ".png"), os.path.join(gout, n + ".png"))
shutil.copy(os.path.join(gout, "body1.png"), os.path.join(gout, "grass1.png"))   # build-shore.py cuts the shore from grass1

# decals from the review place's own tiles
k = 0
for n in ("grass1", "grass2", "grass3", "grass4", "tall1", "tall2", "flowers1", "flowers2"):
    t = load(n); fg = t != C["grass"]
    # the patches are where non-body pixels are dense (a 7x7 box above 30 %), not the scattered specks between them
    pad = np.pad(fg.astype(float), 3); dens = np.zeros(fg.shape)
    for dy in range(7):
        for dx in range(7): dens += pad[dy:dy + 48, dx:dx + 48]
    grown = dens / 49 > .30
    lab = np.zeros(t.shape, int); cur = 0
    for y in range(48):
        for x in range(48):
            if grown[y, x] and not lab[y, x]:
                cur += 1; st = [(y, x)]; lab[y, x] = cur
                while st:
                    a, b = st.pop()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = a + dy, b + dx
                        if 0 <= yy < 48 and 0 <= xx < 48 and grown[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; st.append((yy, xx))
    for c in range(1, cur + 1):
        ys, xs = np.where(lab == c)
        y0, y1, x0, x1 = max(0, ys.min() - 2), min(47, ys.max() + 2), max(0, xs.min() - 2), min(47, xs.max() + 2)
        m = np.zeros(fg.shape, bool); m[y0:y1 + 1, x0:x1 + 1] = fg[y0:y1 + 1, x0:x1 + 1]
        if m.sum() < 12: continue
        ys, xs = np.where(m)
        if ys.min() == 0 or xs.min() == 0 or ys.max() == 47 or xs.max() == 47: continue   # a group the tile edge cut: not whole
        crop = np.where(m, t, -1)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        k += 1; save(crop, os.path.join(dout, f"{n}-{k:02d}.png"))
print("bodies 4, decals", k)
