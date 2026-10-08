"""Hut B, the outpost: the three Retro Diffusion results (lit, dark, dark2; rd-hut-b.py) taken to the pieces. The down-render is 64 -> 56 px wide
(area average, quantised onto the warm and grey ramps, the greens only at the ground), and the hand pass fixes only what the palette snap spoiled:
the roof's colours by role (the thatch took green and teal: it takes the result's own luminance structure cut in four thatch steps; dark2 one step
down), the porch roof (teal) and any stray hue outside the roof (teal, blue, violet, red go to the nearest wood tone by luminance), and the base
meeting the grass (the grass patch kept from the greens ramp at the ground, any stray warm pixel in it made grass). The porch and the log walls are
the result's own. usage: python3 -I hut-b.py RD_DIR SEED OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index; rd, seed, out = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "WYONKTBV"); allowed_g = pal.ramp_indices(P, "WYONKG")
LIFT = 1.35
WOOD = [C["soil"], C["bark"], C["clay"], C["sand"]]
THATCH = {"lit": ["bark", "clay", "sand", "paper"], "dark": ["bark", "clay", "sand", "paper"]}
STRAY = {C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "lavender", "wine", "red", "coral", "magenta", "pink")}
WARM = {C["cream"]: C["slate"], C["yellow"]: C["night"], C["amber"]: C["bark"], C["gold"]: C["soil"], C["orange"]: C["soil"], C["peach"]: C["clay"]}
def line(a, b):
    (x0, y0), (x1, y1) = a, b; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
def walls(base, lit):
    """The hand pass over B's body: the roof, the porch roof, the base course and the grass patch are the service's; the log walls, the door under the
    porch with its step, the window with a warm light, the lantern and the bundle of sticks are drawn over it, pixel by pixel. lit False = the dark
    state (the window glass dark, the lantern out, no glow); dark2 is the dark one DARK step down."""
    s = base.copy(); H, W = s.shape; opaque = s >= 0
    for y in (22, 23):                                                                                          # a strip of the light left under the eaves by the service
        for x in range(W):
            if s[y, x] in (C["cream"], C["yellow"], C["amber"]): s[y, x] = C["bark"]
    inner = opaque.copy()
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)): inner &= np.roll(opaque, (dy, dx), (0, 1))     # keep the silhouette's own outline
    yy, xx = np.mgrid[0:H, 0:W]
    wall = inner & (yy >= 23) & (yy <= 37) & (xx >= 3) & (xx <= 43) & ~((yy <= 28) & (xx >= 30))
    for y, x in zip(*np.where(wall)):   # horizontal logs, a clay top and a soil gap every three rows, lit on the left and in shade on the right
        k = (y - 23) % 3; side = 0 if x < 14 else (1 if x < 29 else 2)
        s[y, x] = [[C["sand"], C["clay"], C["bark"]], [C["clay"], C["bark"], C["soil"]], [C["bark"], C["soil"], C["soil"]]][side][k]
    for y in range(24, 38, 3):          # the round ends of the logs on the lit left edge
        for x in (4, 5): s[y, x] = C["paper"] if opaque[y, x] else s[y, x]
    s[23, 5:44] = np.where(wall[23, 5:44], C["soil"], s[23, 5:44])                                         # the shade under the eaves
    # the window, left of the lantern
    for x in range(11, 17):
        for y in range(27, 33): s[y, x] = C["soil"]
    for x in range(12, 16):
        for y in range(28, 32): s[y, x] = C["yellow"] if lit else C["night"]
    if lit: s[28, 12] = C["cream"]; s[28, 13] = C["cream"]; s[31, 12:16] = C["amber"]
    s[28:32, 14] = C["soil"]; s[29, 12:16] = np.where(np.ones(4, bool), C["soil"], 0) if False else s[29, 12:16]
    s[29, 12:16] = C["soil"]
    s[33, 10:18] = C["clay"]; s[34, 10:18] = C["soil"]                                                      # the sill
    # the lantern on its hook
    s[26:28, 24] = C["soil"]; s[28, 23:26] = C["ink"]; s[29:32, 23] = C["ink"]; s[29:32, 25] = C["ink"]; s[32, 23:26] = C["ink"]
    s[29:32, 24] = C["yellow"] if lit else C["bark"]
    if lit: s[29, 24] = C["cream"]; s[30, 22] = C["amber"]; s[30, 26] = C["amber"]
    # the door under the porch, with a step
    s[28, 33:43] = C["soil"]                                                                                  # the dark under the porch roof
    for y in range(29, 38):
        for x in range(34, 41): s[y, x] = C["bark"] if x != 37 else C["soil"]
        s[y, 34] = C["clay"]
    s[29:38, 40] = C["soil"]; s[36, 35:40] = C["soil"]; s[33, 38] = C["gold"]
    if lit: s[29:38, 34] = C["clay"]; s[32, 36] = C["yellow"]; s[32, 35] = C["amber"] if False else s[32, 35]
    for y in range(29, 38): s[y, 33] = C["bark"]; s[y, 41] = C["bark"]                                         # the posts
    s[38, 32:43] = C["rockL"]; s[39, 32:43] = C["rock"]; s[40, 33:42] = C["stone"]                            # the step
    # the bundle of sticks leaning on the wall, tied with a cord
    for k in range(5):
        for (x, y) in line((44 + k, 40), (45 + k // 2, 27)):
            if 0 <= x < W: s[y, x] = C["clay"] if k == 0 else (C["bark"] if k % 2 else C["soil"])
    s[34, 44:49] = C["paper"]; s[35, 44:49] = C["sand"]
    return s
rgba = np.asarray(Image.open(os.path.join(rd, f"C48-H-r7-B-lit-s{seed}-rd.png")).convert("RGBA")); h, w = rgba.shape[:2]
small = quant.resize_rgba(np.ascontiguousarray(rgba), (56, max(1, round(h * 56 / w))))
small = small.copy(); small[..., :3] = np.clip(small[..., :3].astype(float) * LIFT, 0, 255).astype(np.uint8)   # the same lift as the painted pieces: the walls came back dark
lum = 0.2126 * small[..., 0] + 0.7152 * small[..., 1] + 0.0722 * small[..., 2]
idx = quant.quantize(small, allowed, alpha_thresh=110); gi = quant.quantize(small, allowed_g, alpha_thresh=110)
H = idx.shape[0]; cut = int(H * 0.82); idx[cut:] = gi[cut:]                                                  # the grass patch at the ground
rows = np.arange(H)[:, None]; roofm = (idx >= 0) & (rows < int(H * 0.50))
q = np.quantile(lum[roofm], [0.2, 0.5, 0.8]); ramp = [C[n] for n in THATCH["lit"]]
for y, x in zip(*np.where(roofm)): idx[y, x] = ramp[int(np.searchsorted(q, lum[y, x]))]
for y, x in zip(*np.where(np.isin(idx, list(STRAY)) & (rows < cut))): idx[y, x] = WOOD[int(np.clip(lum[y, x] / 64, 0, 3))]
for y, x in zip(*np.where(np.isin(idx, [C["rock"], C["rockL"]]) & (rows < int(H * 0.72)))): idx[y, x] = WOOD[int(np.clip(lum[y, x] / 64, 0, 3))]   # the porch roof came back stone grey
idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; base = idx[y0:y1, x0:x1]
lit_piece = walls(base, True); dark_piece = walls(base, False)
quant.save_indexed(lit_piece, os.path.join(out, "hut-B-lit.png")); quant.save_indexed(dark_piece, os.path.join(out, "hut-B-dark.png"))
quant.save_indexed(np.array([[P.dark[v] if v >= 0 else -1 for v in row] for row in dark_piece]), os.path.join(out, "hut-B-dark2.png"))   # the night state: the dark piece one DARK step down
print("hut B, 3 states, 56 px wide")
