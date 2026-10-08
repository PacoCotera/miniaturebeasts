"""Hut B at the explorer's scale (round 11, the owner's decision): a place the explorer could walk into (the door about the explorer's height), its footprint 144 px = three whole 48 px tiles,
made through the pipeline at its FINAL size, no scaling: a Gemini painting of hut B enlarged (sources/r11/C48-H-r11-a1, from the round 6 painting as the reference), Retro Diffusion img2img at 144 x 152
(three seeds; seed 42 kept: continuous bowed log courses, one elliptical eave, one window, a side porch at the front left, base stones), then this clean-up: the service's teal thatch to
straw (sand, clay, bark and cream by luminance), its orange logs to wood (soil, bark, clay, sand), the grey of the porch to wood, interior dark navy to soil, the outline by the ramp rule (never
black), the largest component, despeckled, the window's glow kept (the dark states turn it to night), four tufts over the front edge of the base stones. No grass patch and no shadow disc: the still
draws the contact shadow. usage: python3 -I hut-r11.py RD.png OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index
rgba = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).copy()
extra = [C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "lavender")]
idx = quant.quantize(rgba, pal.ramp_indices(P, "WYONKTBVG") + extra, alpha_thresh=110)
H, W = idx.shape
lum = lambda v: 0.2126 * P.rgb[v][0] + 0.7152 * P.rgb[v][1] + 0.0722 * P.rgb[v][2]
yy, xx = np.mgrid[0:H, 0:W]
bg = idx < 0
TEAL = {C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "pine", "forest", "leaf", "grass", "sprout", "lime")}
ORNG = {C[n] for n in ("orange", "rust", "amber", "wine", "red", "coral", "peach", "blush")}
GREY = {C[n] for n in ("stone", "slate", "mist", "fog", "bone", "white", "rock", "rockL")}
DARKN = {C[n] for n in ("ink", "night", "void")}
THATCH = [C["bark"], C["clay"], C["sand"], C["cream"]]; WOOD = [C["soil"], C["bark"], C["clay"], C["sand"]]
roof = np.isin(idx, list(TEAL)); lr = np.array([lum(v) for v in idx[roof]]) if roof.any() else np.array([0.0]); q = np.quantile(lr, [.3, .6, .85])
out = idx.copy()
for y, x in zip(*np.where(roof)): out[y, x] = THATCH[int(np.searchsorted(q, lum(idx[y, x])))]
stone_zone = (yy >= int(H * 0.93)) | ((xx < int(W * 0.3)) & (yy >= int(H * 0.91)))      # the base stones along the foot and the step in front of the porch; the door, posts and wall above are wood
for y, x in zip(*np.where(np.isin(idx, list(ORNG)))): out[y, x] = WOOD[int(np.clip(lum(idx[y, x]) / 62, 0, 3))]
for y, x in zip(*np.where(np.isin(idx, list(GREY)) & ~stone_zone)): out[y, x] = {C["stone"]: C["clay"], C["slate"]: C["bark"], C["mist"]: C["sand"], C["fog"]: C["sand"], C["bone"]: C["sand"], C["white"]: C["sand"], C["rock"]: C["bark"], C["rockL"]: C["clay"]}[idx[y, x]]
# the dark: the outline pixels (next to the background) by the ramp rule from their lit neighbour, the interior dark navy to soil
nb = np.zeros_like(bg); nb[1:] |= bg[:-1]; nb[:-1] |= bg[1:]; nb[:, 1:] |= bg[:, :-1]; nb[:, :-1] |= bg[:, 1:]
for y, x in zip(*np.where(np.isin(idx, list(DARKN)))):
    if nb[y, x]:
        nbr = [out[yy_, xx_] for yy_ in range(max(0, y - 1), min(H, y + 2)) for xx_ in range(max(0, x - 1), min(W, x + 2)) if out[yy_, xx_] >= 0 and idx[yy_, xx_] not in DARKN]
        out[y, x] = P.dark[max(set(nbr), key=nbr.count)] if nbr else C["soil"]
    else: out[y, x] = C["soil"] if not stone_zone[y, x] else C["rock"]       # no night spur at the end of the base stones
# the largest component, despeckled
lab = np.zeros(out.shape, int); n = 0
for y, x in zip(*np.where(out >= 0)):
    if lab[y, x]: continue
    n += 1; st = [(y, x)]; lab[y, x] = n
    while st:
        cy, cx = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and out[ny, nx] >= 0 and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
out[lab != np.bincount(lab[lab > 0]).argmax()] = -1
out = quant.despeckle(out, 1)
ys, xs = np.where(out >= 0); y1 = ys.max()
for x, dy in ((int(W * .18), 0), (int(W * .40), 1), (int(W * .62), 0), (int(W * .82), 1)):                  # four tufts over the front edge of the base stones
    y = y1 - 1 - dy
    for dx, ddy, c in ((0, 0, "forest"), (-1, -1, "leaf"), (0, -1, "grass"), (1, -1, "leaf"), (0, -2, "grass"), (-1, 0, "leaf"), (1, 0, "leaf")):
        if 0 <= y + ddy < H and 0 <= x + dx < W: out[y + ddy, x + dx] = C[c]
lit = quant.outline(out)
# the porch (round 11b), read from the 8x crop: its roof breaks the wall's outline with a lit top in clay and sand and a shadow row under it, each post has a 1 px foot shadow, the step is in front
def col_run(x, y0, y1):
    ys_ = [y for y in range(y0, y1) if lit[y, x] >= 0]; return (ys_[0], ys_[-1]) if ys_ else None
for x in range(6, 54):
    r = col_run(x, 90, 122)
    if not r: continue
    top, bot = r
    if lit[top - 1, x] < 0 or lit[top - 1, x] in (C["soil"], C["bark"]):
        lit[top, x] = C["sand"] if x % 2 else C["clay"]
        if lit[top + 1, x] >= 0: lit[top + 1, x] = C["clay"]
for x in range(10, 48):                                                                        # the roof's shadow on the door and wall under its lower edge, a measured line from (10, 106) to (47, 116)
    y = int(round(106 + (x - 10) * 10.0 / 37.0))
    for dy in (1, 2):
        if lit[y + dy, x] in (C["bark"], C["clay"], C["sand"]): lit[y + dy, x] = C["soil"]
for x0, x1 in ((10, 17), (46, 53)):                                                          # the posts' foot shadows
    for x in range(x0, x1):
        r = col_run(x, 120, H)
        if r and r[1] + 1 < H and lit[r[1] + 1, x] < 0 and lit[r[1], x] in (C["soil"], C["bark"], C["clay"]): lit[r[1] + 1, x] = C["night"]
WIN = {C["yellow"], C["cream"], C["gold"], C["amber"]}
box = (xx[:lit.shape[0], :lit.shape[1]] >= int(W * 0.68)) & (xx[:lit.shape[0], :lit.shape[1]] <= int(W * 0.88)) & (yy[:lit.shape[0], :lit.shape[1]] >= int(H * 0.6)) & (yy[:lit.shape[0], :lit.shape[1]] <= int(H * 0.8))
dark = np.where(np.isin(lit, list(WIN)) & box, C["night"], lit)                      # only the window's box: the thatch's light is not the window
os.makedirs(sys.argv[2], exist_ok=True)
def save(a, n): x0, y0, x1, y1 = quant.bbox((a >= 0) * 255); quant.save_indexed(a[y0:y1, x0:x1], os.path.join(sys.argv[2], n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in r] for r in dark]), "hut-B-dark2.png")
print("hut", lit.shape)
