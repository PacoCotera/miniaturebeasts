"""Hut B from seed 50's own 64 px Retro Diffusion result. The thatch cone is the service's own pixels (snapped to the palette, its apex kept to the pixel, its outline
recoloured by the ramp rule); the stones at the base are the service's. Round 10, after the art director: the wall is redrawn as log COURSES, each course one continuous
line bowed 3 px (a cylinder), where the per-column shift of the service's texture had broken the courses into vertical streaks; the eave is ONE continuous ellipse arc
(centre lowest) overhanging the wall by 2 px on both sides; the porch is narrow (a small side porch at the right) so the round wall shows 4 px or more on both sides of it;
one small window and no lantern; no stick bundle; the grass patch in the lime ramp (it takes the ground's light state through the ground table when placed) and the shadow on
the grass in leaf green.
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
rgba = np.asarray(Image.open(os.path.join(rd, f"C48-H-r7-B-lit-s{seed}-rd.png")).convert("RGBA")).copy()
rgba[..., :3] = np.clip(rgba[..., :3].astype(float) * 1.0, 0, 255).astype(np.uint8)       # the same lift as the painted pieces
lum = 0.2126 * rgba[..., 0] + 0.7152 * rgba[..., 1] + 0.0722 * rgba[..., 2]
a = quant.quantize(rgba, pal.ramp_indices(P, "WYONKTBVG"), alpha_thresh=110)
yy, xx = np.mgrid[0:HH, 0:N]
def mask(fn):
    im = Image.new("L", (N, HH), 0); fn(ImageDraw.Draw(im)); return np.asarray(im) > 0
THATCH = {C[n] for n in ("sand", "clay", "bark", "soil", "gold", "cream", "paper", "yellow")}
TARP = {C[n] for n in ("tealD", "teal", "forest", "aqua", "mist")}
def ell(x, c=31.0, r=20.5): return float(np.sqrt(max(0.0, 1 - ((x - c) / r) ** 2)))
def build(lit):
    s = np.full((HH, N), -1, dtype=np.int64)
    # ---- the base stones: the service's (the K ramp and mist along the base at the front left); no patch of grass and no baked shadow (the still draws the contact shadow, Bayer-dithered,
    # through the ground's shade table, and the ground shows between the stones)
    stones = np.isin(a, [C["rock"], C["rockL"], C["stone"], C["mist"]]) & (yy >= 44) & (xx <= 36); s[stones] = a[stones]
    # ---- the wall: log courses, each ONE continuous line bowed 3 px (rows follow d(x)), 4 px pitch: a soil gap, a light edge, two rows of body; lit on the left, shaded on the right
    X0, X1 = 11, 51
    for x in range(X0, X1 + 1):
        e = ell(x); d = int(round(3 * e)); wb = 47 + d
        for y in range(28, wb + 1):
            r = y - 30 - d
            if r < 0: s[y, x] = C["soil"]; continue
            k, w = divmod(r, 4)
            zone = 0 if x < 25 else (1 if x < 40 else 2)
            body = (C["clay"], C["bark"], C["soil"])[zone]; edge = (C["sand"], C["clay"], C["bark"])[zone]
            c = C["soil"] if w == 0 else (edge if w == 1 else body)
            if w >= 2 and (x * 7 + k * 13) % 17 == 0: c = C["soil"] if zone < 2 else C["ink"]       # a knot
            if w == 1 and (x * 5 + k * 11) % 23 == 0: c = body
            s[y, x] = c
        for y in range(wb - 1, wb + 1): s[y, x] = C["rockL"] if (x % 4) else C["rock"]            # the base course, two rows of stone along the curve
        if x in (X0, X0 + 1): 
            for y in range(31, wb - 2):
                if (y - 30 - d) % 4 in (1, 2): s[y, x] = C["paper"] if x == X0 else C["sand"]             # a log's end on the lit edge
        if x in (X1, X1 - 1):
            for y in range(31, wb - 2):
                if (y - 30 - d) % 4 in (1, 2): s[y, x] = C["bark"]
    # ---- the porch: the service's own (raw seed 50: two posts, its own small roof, a step), the teal tarp taken to planks and the dark to the wood's night, moved 6 px left so round wall shows at its right
    PM = {C["tealD"]: C["soil"], C["teal"]: C["clay"], C["forest"]: C["bark"], C["aqua"]: C["sand"], C["mist"]: C["sand"], C["slate"]: C["night"], C["ink"]: C["night"], C["void"]: C["soil"], C["yellow"]: C["sand"], C["leaf"]: C["bark"]}
    SKIP = {C["grass"], C["sprout"], C["pine"], C["stone"], C["rock"], C["rockL"], C["lime"]}
    def porch_px(y, x):
        v = int(a[y, x])
        if v < 0 or v in SKIP: return
        s[y, x - 6] = PM.get(v, v)
    for y in range(28, 39):                                                                              # its own small roof (the service's tarp, as planks)
        for x in range(34, 52): porch_px(y, x)
    for y in range(39, 51):                                                                              # the two posts, the dark doorway between them
        for x in list(range(35, 38)) + list(range(48, 51)): porch_px(y, x)
        for x in range(38, 48): s[y, x - 6] = (C["bark"] if (x % 2) else C["soil"]) if y >= 41 else C["night"]       # a plank door in the doorway under a shadow row
    s[50, 28:41] = C["rockL"]; s[51, 28:41] = C["rock"]                                              # the step
    # ---- one small window, left of the porch
    s[38:45, 19:26] = C["soil"]; s[39:44, 20:25] = C["yellow"] if lit else C["night"]
    if lit: s[39:41, 20:22] = C["cream"]; s[43, 20:25] = C["amber"]
    s[39:44, 22] = C["soil"]; s[41, 20:25] = C["soil"]; s[44, 18:27] = C["clay"]
    # ---- the roof: the service's pixels, its apex to the pixel; the eave ONE ellipse arc, centre lowest, 2 px past the wall on both sides; the thatch's yellow specks to the light
    ol = (a == C["void"]); bgm = a < 0
    nb = np.zeros_like(bgm); nb[1:] |= bgm[:-1]; nb[:-1] |= bgm[1:]; nb[:, 1:] |= bgm[:, :-1]; nb[:, :-1] |= bgm[:, 1:]
    for x in range(8, 56):
        u = (x - 31.0) / 22.5
        if abs(u) > 1: continue
        yb = 29 + int(round(5 * np.sqrt(max(0.0, 1 - u * u))))
        lim = 31 if x < 33 else 27
        col = []
        for y in range(0, lim + 1):
            v = a[y, x]
            if v < 0: col.append(-1); continue
            if v == C["void"]:
                if nb[y, x]: 
                    nbr = [a[yy_, xx_] for yy_ in range(max(0, y - 1), y + 2) for xx_ in range(max(0, x - 1), x + 2) if a[yy_, xx_] >= 0 and a[yy_, xx_] != C["void"]]
                    v = P.dark[max(set(nbr), key=nbr.count)] if nbr else C["soil"]
                else: col.append(-1); continue
            if v == C["yellow"]: v = C["cream"]
            if int(v) not in THATCH:                                                                          # a stray on the thatch (a grey fleck of the service's rim light, a rock or teal colour): the thatch beside it
                nbr = [int(a[yy_, xx_]) for yy_ in range(max(0, y - 1), y + 2) for xx_ in range(max(0, x - 1), x + 2) if int(a[yy_, xx_]) in THATCH]
                if not nbr: col.append(-1); continue
                v = max(set(nbr), key=nbr.count)
                if nb[y, x]: v = P.dark[v]
            col.append(int(v))
        rows = [y for y, v in enumerate(col) if v >= 0]
        if not rows: continue
        r0 = rows[-1]
        for y in range(0, min(r0, yb) + 1):
            if col[y] >= 0: s[y, x] = col[y]
        for y in range(r0 + 1, yb + 1):                                                                       # the roof carried down to the arc
            s[y, x] = col[r0] if (x + y) % 3 else col[max(rows[0], r0 - 1)] if col[max(rows[0], r0 - 1)] >= 0 else col[r0]
        s[yb, x] = C["soil"] if x % 2 else C["bark"]
        if yb + 1 < HH and s[yb + 1, x] >= 0: s[yb + 1, x] = C["soil"]                                      # the shade the eave throws on the logs
    # three or four tufts overlapping the front edge of the base stones (a root in forest, blades in leaf and grass)
    for x, y in ((9, 55), (19, 57), (31, 55), (41, 52)):
        for dx, dy, c in ((0, 0, "forest"), (-1, -1, "leaf"), (0, -1, "grass"), (1, -1, "leaf"), (0, -2, "grass")):
            if 0 <= y + dy < HH and 0 <= x + dx < N: s[y + dy, x + dx] = C[c]
    return quant.outline(s)
lit = build(True); dark = build(False)
def save(arr, n): bb = quant.bbox((arr >= 0) * 255); x0, y0, x1, y1 = bb; quant.save_indexed(arr[y0:y1, x0:x1], os.path.join(out, n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark]), "hut-B-dark2.png")
print("hut B from seed", seed, "edited")
