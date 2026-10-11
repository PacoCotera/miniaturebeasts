"""The meadow biome palette for 8-bit colour (owner: up to 256 entries; plan: about 128 on screen, the signed 48 as the core plus
a biome set of about 80-88), built from the approved repaint.

The painting's pixels are sorted by material (from hue, chroma and lightness), and a k-means in CIE Lab inside each material finds
its colours, to a budget per material (grass 24, earth 10, wood 8, rock 16, water 16, accents 6), so the greens that cover most of
the scene do not take the shades the rock, wood and flowers need. Each centre's chroma is put back to its members' mean chroma
(an average of colours is greyer than the colours), so the set keeps the painting's strength. A centre within dE 4 of a core colour
is dropped (the core already has it). Each colour is tagged by material from its hue and lightness (grass, rock, water, earth,
wood, accent). Colours in the teal band (hue 160-215, chroma over 20) are tagged "teal" and carry an alternative, the same
lightness and chroma turned to blue-violet (hue 255), so the band can be swapped if the owner says no to teal.
Writes biome-meadow.json and biome-meadow.png (the set by material, dark to light), then the scene at 1x snapped to core + biome,
its two screens (1x, 3x), and the swap version of each screen.
usage: python3 -I biome-palette.py PAINTING OUT_DIR"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); WP = np.array([.95047, 1, 1.08883])
def lab(c):
    c = np.asarray(c, float) / 255; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    f = c @ M.T / WP; f = np.where(f > .008856, np.cbrt(f), 7.787 * f + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def rgb(L):
    fy = (L[..., 0] + 16) / 116; f = np.stack([fy + L[..., 1] / 500, fy, fy - L[..., 2] / 200], -1)
    xyz = np.where(f ** 3 > .008856, f ** 3, (f - 16 / 116) / 7.787) * WP; c = np.clip(xyz @ np.linalg.inv(M).T, 0, 1)
    return np.clip(np.round(np.where(c <= .0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - .055) * 255), 0, 255).astype(int)
im = Image.open(src).convert("RGB"); im = im.resize((int(im.width * .96), int(im.height * .96)), Image.BOX)
A = np.asarray(im).astype(float); X = lab(A.reshape(-1, 3))
r = np.random.RandomState(8); S = X[r.choice(len(X), 80000, replace=False)]
def material(c):
    L_, ch = c[..., 0], np.hypot(c[..., 1], c[..., 2]); h = (np.degrees(np.arctan2(c[..., 2], c[..., 1])) + 360) % 360
    m = np.full(L_.shape, "rock", dtype=object)
    m[(ch >= 14) & (h >= 100) & (h < 160)] = "grass"
    m[(ch >= 14) & (h >= 160) & (h < 300)] = "water"
    m[(ch >= 14) & ((h >= 40) & (h < 100)) & (L_ > 45)] = "earth"
    m[(ch >= 14) & ((h >= 40) & (h < 100)) & (L_ <= 45)] = "wood"
    m[(ch > 40) & ((h >= 300) | (h < 40))] = "accent"
    m[(ch >= 14) & (ch <= 40) & ((h >= 300) | (h < 40))] = "wood"
    return m
BUDGET = {"grass": 24, "earth": 10, "wood": 8, "rock": 16, "water": 16, "accent": 6}   # 80 biome colours by material
mS = material(S); C = []
for mat, k in BUDGET.items():
    Sm = S[mS == mat]
    if len(Sm) < k * 20: k = max(1, len(Sm) // 20)
    if len(Sm) == 0: continue
    Cm = Sm[r.choice(len(Sm), k, replace=False)]
    for _ in range(30):
        i = ((Sm[:, None] - Cm[None]) ** 2).sum(-1).argmin(1)
        Cm = np.array([Sm[i == j].mean(0) if (i == j).any() else Cm[j] for j in range(k)])
    for j in range(k):                                   # chroma back to the members' mean
        mm = Sm[i == j]
        if len(mm):
            ch = np.hypot(mm[:, 1], mm[:, 2]).mean(); c0 = np.hypot(Cm[j, 1], Cm[j, 2])
            if c0 > 1: Cm[j, 1:] *= ch / c0
    C += list(Cm)
C = np.array(C)
CORE = lab(P.rgb)
keep = [c for c in C if np.sqrt(((CORE - c) ** 2).sum(1)).min() >= 4]
cols = [{"index": k, "name": P.names[k], "hex": P.hexes[k], "set": "core"} for k in range(len(P.names))]
for c in sorted(keep, key=lambda c: (str(material(c[None])[0]), c[0])):
    h = (np.degrees(np.arctan2(c[2], c[1])) + 360) % 360; ch = np.hypot(c[1], c[2])
    e = {"index": len(cols), "hex": "#%02x%02x%02x" % tuple(rgb(c[None])[0]), "set": "meadow", "material": str(material(c[None])[0])}
    if 160 <= h <= 215 and ch > 20:
        alt = np.array([c[0], ch * np.cos(np.radians(255)), ch * np.sin(np.radians(255))])
        e["teal"] = True; e["alt"] = "#%02x%02x%02x" % tuple(rgb(alt[None])[0])
    cols.append(e)
json.dump({"proposal": True, "depth": "8-bit indexed, up to 256", "core": len(P.names), "biome": len(cols) - len(P.names), "colours": cols},
          open(os.path.join(out, "biome-meadow.json"), "w"), indent=1)
# the set for the eye: one row per material, dark to light; a teal colour shows its swap under it
mats = ["grass", "earth", "wood", "rock", "water", "accent"]
rows = [[c for c in cols if c.get("material") == m] for m in mats]
W = max(len(r_) for r_ in rows) * 16; sw = Image.new("RGB", (W, len(rows) * 26), (26, 23, 37))
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
for y, rr in enumerate(rows):
    for x, c in enumerate(rr):
        for yy in range(16):
            for xx in range(14): sw.putpixel((x * 16 + xx, y * 26 + yy), hx(c["hex"]))
        if c.get("teal"):
            for yy in range(17, 23):
                for xx in range(14): sw.putpixel((x * 16 + xx, y * 26 + yy), hx(c["alt"]))
sw.resize((sw.width * 2, sw.height * 2), Image.NEAREST).save(os.path.join(out, "biome-meadow.png"))
# the scene snapped to core + biome (nearest in Lab), and the teal swap
PAL = np.array([hx(c["hex"]) for c in cols]); PL = lab(PAL)
idx = np.concatenate([((X[s:s + 20000, None] - PL[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(X), 20000)]).reshape(A.shape[:2])
ALT = PAL.copy()
for k, c in enumerate(cols):
    if c.get("teal"): ALT[k] = hx(c["alt"])
for tag, PALX in (("", PAL), ("-noteal", ALT)):
    full = Image.fromarray(PALX[idx].astype(np.uint8)); full.save(os.path.join(out, f"scene{tag}-1x.png"))
    for nm, (x0, y0) in {"screen-pond": ((full.width - 450) // 2, full.height - 532 - 40), "screen-cliffs": (20, 60)}.items():
        cr = full.crop((x0, y0, x0 + 450, y0 + 532)); cr.save(os.path.join(out, f"{nm}{tag}-1x.png")); cr.resize((1350, 1596), Image.NEAREST).save(os.path.join(out, f"{nm}{tag}-3x.png"))
de = float(np.sqrt(((X - PL[idx.reshape(-1)]) ** 2).sum(-1)).mean())
np.save(os.path.join(out, "scene-idx.npy"), idx)
print(len(cols), "colours: core", len(P.names), "+ meadow", len(cols) - len(P.names), "| teal-tagged", sum(1 for c in cols if c.get("teal")), "| used", len(np.unique(idx)), "| mean dE %.2f" % de)
