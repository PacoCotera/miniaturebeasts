"""Hut B at 64 px, drawn at that size (no down-render), in B's round form: a round log hut whose conical roof overhangs the walls on both sides, a small
porch with two posts and its own roof over a plank door on a stone step, standing on a patch of grass with a base course of stones, never on a disc.
Seed 50's Retro Diffusion result (64 x 58) is the reference for the proportions, the porch, the logs, the base and the grass (and the pieces keep its
64 px footprint); the pixels are drawn here as masks and pixel sets with the rim-rule shading: a cylinder of logs whose courses bow with the curve, round
log ends at the corners, a calm roof of three steps and two bands (no cream dome, no strands), the porch's own roof of planks, a window with a warm light, a
lantern, a bundle of sticks, and the cast shadow on the grass to the right. Dark = the light out; dark2 = dark one DARK step down.
usage: python3 -I hut-b64.py OUT_DIR   (no RD input is read: the form is drawn; seed 50 is the reference)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import quant
P = quant.P; C = P.index; out = sys.argv[-1]; os.makedirs(out, exist_ok=True)
N, HH = 64, 58
def mask(fn):
    im = Image.new("L", (N, HH), 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 0
def line(a, b):
    (x0, y0), (x1, y1) = a, b; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
yy, xx = np.mgrid[0:HH, 0:N]
CXH, RX, RXR = 27, 17, 23          # the walls' centre and radius; the roof's radius (it overhangs the walls by six pixels each side)
EAVE, APEX, BASE = 31, 14, 47      # the eave line, the roof's apex, the walls' base line
def build(lit):
    s = np.full((HH, N), -1, dtype=np.int64)
    # ---- the grass patch, a tuft here and there, the shadow on it to the right
    patch = mask(lambda d: d.ellipse([2, 40, 62, 57], fill=255)); s[patch] = C["grass"]
    s[patch & ~np.roll(patch, -1, 0)] = C["leaf"]; s[patch & ~np.roll(patch, -1, 1)] = C["leaf"]; s[patch & ~np.roll(patch, 1, 1)] = C["grass"]
    shadow = mask(lambda d: d.ellipse([40, 47, 62, 56], fill=255)) & patch; s[shadow] = C["leaf"]
    for x, y in ((5, 49), (8, 53), (57, 44), (59, 52), (13, 55), (52, 55), (21, 56), (4, 45)):
        for dx, dy, c in ((0, 0, "sprout"), (1, -1, "sprout"), (-1, -1, "grass"), (1, 0, "leaf")):
            if patch[y + dy, x + dx]: s[y + dy, x + dx] = C[c]
    # ---- the walls: a cylinder of logs, the courses bowing down toward the middle with the curve
    bot = lambda x: BASE + int(round(5 * np.sqrt(max(0.0, 1 - ((x - CXH) / RX) ** 2))))
    wall = np.zeros((HH, N), bool)
    for x in range(CXH - RX, CXH + RX + 1): wall[EAVE:bot(x) + 1, x] = True
    for y, x in zip(*np.where(wall)):
        u = (x - CXH) / RX; bow = int(round(4 * np.sqrt(max(0.0, 1 - u * u)))); k = (y - bow - EAVE) % 3
        side = 0 if u < -0.25 else (1 if u < 0.35 else 2)
        s[y, x] = [[C["sand"], C["clay"], C["bark"]], [C["clay"], C["bark"], C["soil"]], [C["bark"], C["soil"], C["soil"]]][side][k]
    for y in range(EAVE + 2, BASE, 3):                        # the log ends at the corners: a round paper end on the lit left, a bark one on the right
        for x0, c0 in ((CXH - RX - 1, "paper"), (CXH + RX, "bark")):
            if 0 <= x0 < N and wall[y, x0 + (1 if x0 < CXH else -1)]: s[y, x0] = C[c0]; s[y + 1, x0] = C["sand"] if c0 == "paper" else C["soil"]
    for x in range(CXH - RX, CXH + RX + 1):                   # the base course of stones along the bottom curve
        for y in range(bot(x) - 2, bot(x) + 1):
            if 0 <= y < HH and wall[y, x]: s[y, x] = C["rockL"] if y == bot(x) - 2 else (C["slate"] if (x + (3 if y % 2 else 0)) % 6 == 0 else C["rock"])
    # ---- the porch: two posts, its own small roof of planks, a plank door on a stone step
    for y in range(40, 52):
        for x in (29, 30, 44, 45): s[y, x] = C["clay"] if x in (29, 44) else C["bark"]
    for y in range(40, 52):
        for x in range(31, 44): s[y, x] = C["bark"] if (x - 31) % 4 else C["soil"]
        s[y, 31] = C["clay"]
    s[40, 31:44] = C["soil"]
    for i in range(8): s[41 + i, 32 + i] = C["soil"]
    s[47, 41] = C["gold"]
    s[52, 28:47] = C["rockL"]; s[53, 28:47] = C["rock"]; s[54, 30:45] = C["stone"]
    porch = mask(lambda d: d.polygon([(26, 34), (48, 34), (51, 41), (23, 41)], fill=255))
    for y, x in zip(*np.where(porch)): s[y, x] = [C["clay"], C["bark"], C["soil"]][(y + x // 5) % 3] if (y - 34) % 3 else C["soil"]
    s[34, 26:49] = C["sand"]; s[41, 23:52] = C["soil"]
    # ---- the window with a warm light, the lantern on its hook
    s[38:46, 13:21] = C["soil"]; s[39:45, 14:20] = C["yellow"] if lit else C["night"]
    if lit: s[39:41, 14:17] = C["cream"]; s[44, 14:20] = C["amber"]
    s[39:45, 17] = C["soil"]; s[42, 14:20] = C["soil"]; s[46, 12:22] = C["clay"]; s[47, 12:22] = C["soil"]
    s[35:38, 23] = C["soil"]; s[38, 21:26] = C["ink"]; s[39:44, 21] = C["ink"]; s[39:44, 25] = C["ink"]; s[44, 21:26] = C["ink"]
    s[39:44, 22:25] = C["yellow"] if lit else C["bark"]
    if lit: s[40, 23] = C["cream"]; s[41, 20] = C["amber"]; s[41, 26] = C["amber"]
    # ---- the roof: a cone that overhangs the walls on both sides, three steps of thatch lit from the top left, two bands, a ragged fringe
    roof = mask(lambda d: d.polygon([(CXH - RXR, EAVE), (CXH, APEX), (CXH + RXR, EAVE)], fill=255)) | (mask(lambda d: d.ellipse([CXH - RXR, EAVE - 5, CXH + RXR, EAVE + 5], fill=255)) & (yy >= EAVE - 2))
    for y, x in zip(*np.where(roof)):
        v = 0.55 * (1 - (x - (CXH - RXR)) / (2 * RXR)) + 0.45 * (1 - (y - APEX) / (EAVE + 5 - APEX))
        s[y, x] = C["sand"] if v > 0.60 else (C["clay"] if v > 0.38 else C["bark"])
    for yb in (APEX + 6, APEX + 12):
        for x in range(CXH - RXR, CXH + RXR + 1):
            y = int(round(yb + 3 * (1 - ((x - CXH) / RXR) ** 2)))
            if roof[y, x]: s[y, x] = C["bark"]
    for x in range(CXH - RXR + 1, CXH + RXR):
        ys = np.where(roof[:, x])[0]; yb = ys.max(); s[yb, x] = C["soil"] if x % 2 else C["bark"]
        if yb + 1 < HH and wall[yb + 1, x]: s[yb + 1, x] = C["soil"]                    # the shade the eaves throw on the logs
    # ---- the bundle of sticks leaning on the wall's right side, tied with a cord
    for k in range(5):
        for (x, y) in line((48 + k * 2, 53), (47 + k, 40)): s[y, x] = C["clay"] if k == 0 else (C["bark"] if k % 2 else C["soil"])
    s[47, 48:57] = C["paper"]; s[48, 48:57] = C["sand"]
    return quant.outline(s)
lit = build(True); dark = build(False)
def save(a, n): bb = quant.bbox((a >= 0) * 255); x0, y0, x1, y1 = bb; quant.save_indexed(a[y0:y1, x0:x1], os.path.join(out, n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark]), "hut-B-dark2.png")
print("hut B, round form, 3 states, 64 px")
