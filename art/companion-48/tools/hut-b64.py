"""Hut B at 64 px, drawn at that size (no down-render): seed 50's Retro Diffusion result is the base (its roof silhouette, its patch and stones at the
base), and the hand pass redone on it at 64 px: the roof recoloured as a calmer thatch (three steps, two bands, no cream dome) and compressed by four rows
so it weighs less against the walls; the walls redrawn as logs with lit ends; the porch roof (teal in the result) as planks; porch posts in wood; a plank
door on a stone step; a window with a warm light; a lantern; a bundle of sticks; the grass patch back under the hut and a cast shadow on the grass (the
service's slate disc is gone). Dark = the light out; dark2 = dark one DARK step down. usage: python3 -I hut-b64.py RD_DIR SEED OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import quant, pal
P = quant.P; C = P.index; rd, seed, out = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
N = 64; HH = 58
rgba = np.asarray(Image.open(os.path.join(rd, f"C48-H-r7-B-lit-s{seed}-rd.png")).convert("RGBA")).copy()
al = rgba[..., 3] > 110
def mask(fn, size=(N, HH)):
    im = Image.new("L", size, 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 0
def line(a, b):
    (x0, y0), (x1, y1) = a, b; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
yy, xx = np.mgrid[0:HH, 0:N]
# the roof silhouette: the result's own opaque pixels above the eave (row 30), outside the porch's roof, the four rows dropped to lighten it
roof_src = al & (yy <= 30) & ~((yy >= 27) & (xx >= 36))
drop = {8, 14, 20, 26}; keep = [y for y in range(31) if y not in drop]
roof = np.zeros((HH, N), bool)
for ny, oy in zip(range(30 - len(keep) + 1, 31), keep): roof[ny] = roof_src[oy]
def build(lit):
    s = np.full((HH, N), -1, dtype=np.int64)
    # ---- the grass patch and the shadow on it
    patch = mask(lambda d: d.ellipse([3, 42, 62, 57], fill=255)); s[patch] = C["grass"]
    edge = patch & ~np.roll(patch, -1, 0); s[edge | (patch & ~np.roll(patch, -1, 1))] = C["leaf"]
    shadow = mask(lambda d: d.ellipse([45, 47, 62, 56], fill=255)) & patch; s[shadow] = C["leaf"]
    for x, y in ((6, 49), (9, 53), (55, 44), (58, 52), (14, 55), (51, 55)):   # tufts
        for dx, dy, c in ((0, 0, "sprout"), (1, -1, "sprout"), (-1, -1, "grass"), (1, 0, "leaf")):
            if patch[y + dy, x + dx]: s[y + dy, x + dx] = C[c]
    # ---- the walls: a cylinder, logs with lit ends
    wall = mask(lambda d: d.rectangle([11, 30, 48, 49], fill=255)) | (mask(lambda d: d.ellipse([11, 44, 48, 55], fill=255)) & (yy >= 46))
    for y, x in zip(*np.where(wall)):
        k = (y - 31) % 3; side = 0 if x < 22 else (1 if x < 36 else 2)
        s[y, x] = [[C["sand"], C["clay"], C["bark"]], [C["clay"], C["bark"], C["soil"]], [C["bark"], C["soil"], C["soil"]]][side][k]
    for y in range(31, 50, 3):                       # the round ends of the logs on the lit edge
        for x in (11, 12): s[y, x] = C["paper"]; s[y + 1, x] = C["sand"]
    # the base course of stones
    for y in range(48, 52):
        for x in range(11, 48):
            if wall[y, x]: s[y, x] = C["rockL"] if (y == 48) else (C["slate"] if ((x + (3 if y % 2 else 0)) % 6 == 0) else C["rock"])
    # ---- the porch: posts, the door on its step, the porch roof of planks
    for x, y in [(x, y) for y in range(38, 52) for x in (37, 38, 49, 50)]: s[y, x] = C["clay"] if x in (37, 49) else C["bark"]
    for y in range(38, 52):
        for x in range(39, 49): s[y, x] = C["bark"] if x not in (42, 45) else C["soil"]
        s[y, 39] = C["clay"]
    s[38, 39:49] = C["soil"]
    for i in range(9): s[39 + i, 40 + i] = C["soil"]                      # the brace
    s[46, 47] = C["gold"]
    s[52, 36:51] = C["rockL"]; s[53, 36:51] = C["rock"]; s[54, 38:49] = C["stone"]                 # the step
    porch = mask(lambda d: d.polygon([(35, 30), (52, 30), (55, 38), (36, 38)], fill=255))
    for y, x in zip(*np.where(porch)): s[y, x] = [C["clay"], C["bark"], C["soil"]][(y + x // 6) % 3] if (y - 30) % 3 else C["soil"]
    s[30, 35:53] = C["sand"]
    # ---- the window with a warm light, the lantern
    s[37:47, 16:26] = C["soil"]
    s[38:46, 17:25] = C["yellow"] if lit else C["night"]
    if lit: s[38:40, 17:20] = C["cream"]; s[45, 17:25] = C["amber"]
    s[38:46, 21] = C["soil"]; s[41, 17:25] = C["soil"]; s[47, 15:27] = C["clay"]; s[48, 15:27] = C["soil"]
    s[32:36, 31] = C["soil"]; s[36, 29:34] = C["ink"]; s[37:43, 29] = C["ink"]; s[37:43, 33] = C["ink"]; s[43, 29:34] = C["ink"]
    s[37:43, 30:33] = C["yellow"] if lit else C["bark"]
    if lit: s[38, 31] = C["cream"]; s[39, 28] = C["amber"]; s[39, 34] = C["amber"]
    # ---- the roof: three steps of thatch, two bands, lit from the top left
    top = np.where(roof.any(1))[0].min()
    for y, x in zip(*np.where(roof)):
        v = 0.5 * (1 - (x - 12) / 40) + 0.5 * (1 - (y - top) / 26)
        s[y, x] = C["sand"] if v > 0.58 else (C["clay"] if v > 0.34 else C["bark"])
    for yb in (top + 9, top + 17):
        for x in range(8, 56):
            y = int(round(yb + 3 * (1 - ((x - 30) / 22) ** 2)))
            if 0 <= y < HH and roof[y, x]: s[y, x] = C["bark"]
    for x in range(9, 54):                                                       # the ragged fringe under the eaves, and the shade it throws on the logs
        ys = np.where(roof[:, x])[0]
        if len(ys):
            yb = ys.max(); s[yb, x] = C["soil"] if x % 2 else C["bark"]
            if wall[yb + 1, x] and s[yb + 1, x] >= 0 and yb + 1 <= 33: s[yb + 1, x] = C["soil"]
    # ---- the bundle of sticks leaning on the porch's right post, tied with a cord
    for k in range(5):
        for (x, y) in line((52 + k * 2, 54), (53 + k, 40)): s[y, x] = C["clay"] if k == 0 else (C["bark"] if k % 2 else C["soil"])
    s[47, 52:60] = C["paper"]; s[48, 52:60] = C["sand"]
    return quant.outline(s)
lit = build(True); dark = build(False)
def save(a, n): bb = quant.bbox((a >= 0) * 255); x0, y0, x1, y1 = bb; quant.save_indexed(a[y0:y1, x0:x1], os.path.join(out, n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark]), "hut-B-dark2.png")
print("hut B, 3 states, 64 px native")
