"""The shore test: every neighbourhood a land tile can have (8 neighbours, water or land: 256) laid as a 3x3 patch, drawn with
the shore set (the 16 cardinal masks and, over land tiles, the diagonal corners), and each tile join read for a break: the
land / bank / water class of the pixels either side of a join must agree. The 47 distinct classes (named mNN-dNN: the cardinal mask and the diagonal-corner bits that occur with it) are written as 144 px patches for the contact sheet; a seeded random pond outline
is drawn at 1x. Prints the number of broken join pixels over the 256 patches and over 40 random ponds.
usage: python3 -I shoregrid.py SHORE_DIR GROUND_DIR OUT_DIR [--no-diag]"""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index
shore, ground, out = sys.argv[1], sys.argv[2], sys.argv[3]; diag_on = "--no-diag" not in sys.argv
pond_dir = out.rstrip("/") + "-pond"; os.makedirs(out, exist_ok=True); os.makedirs(pond_dir, exist_ok=True)
def load(p): return quant.quantize(np.asarray(Image.open(p).convert("RGBA")))
grass, water = load(os.path.join(ground, "grass1.png")), load(os.path.join(ground, "water1.png"))
S = {(m, f): load(os.path.join(shore, f"shore-{m:02d}-{f}.png")) for m in range(16) for f in (1, 2)}
D = {(n, f): load(os.path.join(shore, f"shore-diag-{n}-{f}.png")) for n in ("ne", "se", "sw", "nw") for f in (1, 2)} if diag_on else {}
WATER = {C[n] for n in ("deep", "sea", "river", "sky", "ice")}; BANK = {C[n] for n in ("soil", "bark", "clay", "sand", "paper", "bone", "white")}
def cls(v): return 2 if v in WATER else (1 if v in BANK else 0)
CLS = np.vectorize(cls)
def render(wg, f=1):
    """wg: 2D bool array of water cells. returns an index image."""
    H, W = wg.shape; img = np.zeros((H * 48, W * 48), dtype=np.int64)
    def w(r, c): return bool(wg[r, c]) if 0 <= r < H and 0 <= c < W else False
    for r in range(H):
        for c in range(W):
            if w(r, c): t = water
            else:
                m = w(r - 1, c) * 1 + w(r, c + 1) * 2 + w(r + 1, c) * 4 + w(r, c - 1) * 8
                t = S[(m, f)] if m else grass
                t = t.copy()
                for n, (dr, dc, a, b) in {"ne": (-1, 1, 1, 2), "se": (1, 1, 2, 4), "sw": (1, -1, 4, 8), "nw": (-1, -1, 8, 1)}.items():
                    if D and w(r + dr, c + dc) and not (m & a) and not (m & b):
                        o = D[(n, f)]; t = np.where(o >= 0, o, t)
            img[r * 48:(r + 1) * 48, c * 48:(c + 1) * 48] = t
    return img
def breaks(img, H, W):
    k = CLS(img); bad = 0
    for c in range(1, W): bad += int((k[:, c * 48 - 1] != k[:, c * 48]).sum())
    for r in range(1, H): bad += int((k[r * 48 - 1, :] != k[r * 48, :]).sum())
    return bad
def png(img, path):
    im = P.to_image(np.where(img >= 0, img, -1)); im.save(path)
# the 256 neighbourhoods: bits N NE E SE S SW W NW
names = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]; off = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
tot, seen = 0, {}
for k in range(256):
    wg = np.zeros((3, 3), bool)
    for i, (dr, dc) in enumerate(off): wg[1 + dr, 1 + dc] = bool(k >> i & 1)
    img = render(wg); tot += breaks(img, 3, 3)
    m = (k & 1) | ((k >> 2 & 1) << 1) | ((k >> 4 & 1) << 2) | ((k >> 6 & 1) << 3)
    dg = 0
    for i, (n, a, b) in enumerate((("ne", 1, 2), ("se", 2, 4), ("sw", 4, 8), ("nw", 8, 1))):
        if (k >> (2 * i + 1) & 1) and not (m & a) and not (m & b): dg |= 1 << i
    key = (m, dg)
    if key not in seen: seen[key] = img
print("256 neighbourhoods: broken join pixels", tot, "; distinct classes", len(seen))
rd = out
for f in os.listdir(rd):
    if f.endswith(".png"): os.remove(os.path.join(rd, f))
for (m, dg), img in sorted(seen.items()): png(img, os.path.join(rd, f"m{m:02d}-d{dg:02d}.png"))
# random ponds: smoothed noise thresholded, 40 grids of 8x8
rnd = random.Random(48); tot2 = 0; worst = None
for i in range(40):
    g = np.array([[rnd.random() for _ in range(10)] for _ in range(10)])
    for _ in range(2): g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    wg = g > np.quantile(g, 0.42)
    img = render(wg); b = breaks(img, 10, 10); tot2 += b
    if i == 0: png(img, os.path.join(pond_dir, "pond-outline-random.png"))
print("40 random ponds: broken join pixels", tot2)
