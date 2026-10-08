"""Hut B from seed 50's own 64 px Retro Diffusion result: the service's pixels (its tall thatch cone, its round log body, its porch, its stones and grass)
snapped to the palette, only the role colours fixed (the teal tarp over the porch became planks, the green and warm strays on the walls became wood),
and ONLY these edits on top, every other pixel as the service drew it:
 - the eave an ellipse (the service's run was a straight line), overhanging both sides, and visible on the right past the porch roof (the porch roof sits two rows lower);
 - the logs bowed 3 px: the wall's rows sag at the centre by a cylinder's curve, silhouette and top and bottom rows kept;
 - the porch a small side porch at the right: the stick bundle at its right is out and round wall shows on both sides of it;
 - one small window (the left one is covered with wall) and no lantern;
 - the grass patch in the lime ramp (it takes the ground's light state through the ground table when placed) completed under the whole base, and the
   shadow on the grass (leaf green) in place of the service's grey disc.
Dark = the window dark; dark2 = dark one DARK step down. usage: python3 -I hut-b-edit.py RD_DIR SEED OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import quant, pal
P = quant.P; C = P.index; rd, seed, out = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
N, HH = 64, 58
rgba = np.asarray(Image.open(os.path.join(rd, f"C48-H-r7-B-lit-s{seed}-rd.png")).convert("RGBA")).copy()
rgba[..., :3] = np.clip(rgba[..., :3].astype(float) * 1.0, 0, 255).astype(np.uint8)       # the same lift as the painted pieces
lum = 0.2126 * rgba[..., 0] + 0.7152 * rgba[..., 1] + 0.0722 * rgba[..., 2]
a = quant.quantize(rgba, pal.ramp_indices(P, "WYONKTBVG"), alpha_thresh=110)
yy, xx = np.mgrid[0:HH, 0:N]
TEAL = {C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "lavender")}
WOOD = [C["soil"], C["bark"], C["clay"], C["sand"]]

yy, xx = np.mgrid[0:HH, 0:N]
def mask(fn):
    im = Image.new("L", (N, HH), 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 0
WARM = {C[n] for n in ("yellow", "cream", "orange", "amber", "white", "gold", "peach")}
GREENS = {C[n] for n in ("leaf", "pine", "forest", "rust", "lime", "sprout")}
TARP = {C[n] for n in ("tealD", "teal", "forest")}
def comps(m):
    lab = np.zeros(m.shape, int); n = 0
    for y, x in zip(*np.where(m)):
        if lab[y, x]: continue
        n += 1; st = [(y, x)]; lab[y, x] = n
        while st:
            cy, cx = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < HH and 0 <= nx < N and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
    return lab, n
base = a.copy()
def build(lit):
    s = base.copy()
    ol = (s == C["void"]); bg = s < 0
    # outer outline off (quant.outline redraws it at the end)
    for _ in range(1):
        nb = np.zeros_like(bg); nb[1:] |= bg[:-1]; nb[:-1] |= bg[1:]; nb[:, 1:] |= bg[:, :-1]; nb[:, :-1] |= bg[:, 1:]
        s[ol & nb] = -1
    # ---- role colours: the thatch's yellow specks to the roof's own light, the porch's teal tarp to planks
    roof = (yy <= 31) & (xx >= 8) & (xx <= 55)
    s[roof & (s == C["yellow"])] = C["cream"]
    # ---- the porch's teal tarp as planks, in place
    plank = {C["teal"]: C["clay"], C["tealD"]: C["soil"], C["forest"]: C["bark"]}
    tarp = np.isin(s, list(TARP)) & (yy >= 26) & (yy <= 39) & (xx >= 33)
    for y, x in zip(*np.where(tarp)): s[y, x] = plank[s[y, x]]
    # ---- the eave an ellipse: the service's run of outline at row 32 was straight; its bottom edge now follows the ellipse (centre lowest), roof pixels carried down
    for x in range(14, 37):
        u = (x - 31.0) / 22.5; yb = 30 + int(round(3 * np.sqrt(max(0.0, 1 - u * u))))
        r0 = max([y for y in range(28, 36) if s[y, x] == C["void"]] or [yb])
        for y in range(r0, yb): s[y, x] = s[r0 - 1, x]
        if yb > r0: s[yb, x] = C["void"]; s[yb + 1, x] = C["soil"] if s[yb + 1, x] >= 0 else s[yb + 1, x]
    # ---- the wall: strays out, the left window covered, the stick bundle at the right replaced by round wall, the logs bowed
    wall = (yy >= 33) & (yy <= 49) & (xx >= 10) & (xx <= 56)
    lab, n = comps(np.isin(s, list(WARM)) & wall)
    WOODS = [C["soil"], C["bark"], C["clay"], C["sand"]]
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if abs(xs.mean() - 33) > 5 or not lit and False: 
            for y, x in zip(ys, xs): s[y, x] = C["clay"]
    for y, x in zip(*np.where(wall & np.isin(s, list(GREENS | {C["tealD"], C["teal"]})) & (xx >= 13) & (yy <= 46))):
        s[y, x] = C["bark"] if (x + y) % 2 else C["soil"]
    # right of the porch: round wall from the wall's own left columns
    for x in range(50, 56):
        xs = 14 + (x - 50)
        for y in range(33, 49):
            if s[y, x] >= 0 and s[y, x] != C["slate"]: s[y, x] = s[y, xs] if s[y, xs] != C["void"] else C["soil"]
    out = s.copy()
    for x in range(10, 56):
        u = (x - 31.0) / 23.0; bow = 3 * np.sqrt(max(0.0, 1 - u * u))
        for y in range(36, 47):
            d = int(round(bow * np.sin(np.pi * (y - 35) / 12.0)))
            out[y, x] = s[y - d, x]
    s = out
    # ---- the grass patch completed under the whole base, the shadow on the grass
    patch = mask(lambda d: d.ellipse([2, 41, 62, 57], fill=255))
    s[patch & (s < 0)] = C["grass"]
    s[patch & (s == C["grass"]) & ~np.roll(patch, -1, 0)] = C["leaf"]
    disc = (s == C["slate"]) & (xx >= 44)
    s[disc & ((xx >= 52) | (yy >= 48))] = C["leaf"]
    s[disc & (xx < 52) & (yy < 48)] = C["night"]
    for x, y in ((5, 49), (8, 53), (57, 45), (59, 52), (13, 55), (52, 55), (21, 56), (4, 46)):
        for dx, dy, c in ((0, 0, "forest"), (-1, -1, "leaf"), (1, -1, "leaf")):
            if s[y + dy, x + dx] == C["grass"]: s[y + dy, x + dx] = C[c]
    if not lit:
        s[np.isin(s, [C["yellow"], C["gold"]]) & (xx >= 28) & (xx <= 36) & (yy >= 36) & (yy <= 42)] = C["night"]
    return quant.outline(s)
lit = build(True); dark = build(False)
def save(arr, n): bb = quant.bbox((arr >= 0) * 255); x0, y0, x1, y1 = bb; quant.save_indexed(arr[y0:y1, x0:x1], os.path.join(out, n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark]), "hut-B-dark2.png")
print("hut B from seed", seed, "edited")
