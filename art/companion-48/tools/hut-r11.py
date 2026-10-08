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
rgba = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).copy(); raw0 = rgba.copy()
rgba[..., :3] = np.clip(rgba[..., :3].astype(float) * 1.45, 0, 255).astype(np.uint8)       # the same lift as the painted pieces: the service draws the wood very dark
extra = [C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "lavender")]
idx = quant.quantize(rgba, pal.ramp_indices(P, "WYONKTBVG") + extra, alpha_thresh=110)
H, W = idx.shape
lum = lambda v: 0.2126 * P.rgb[v][0] + 0.7152 * P.rgb[v][1] + 0.0722 * P.rgb[v][2]
yy, xx = np.mgrid[0:H, 0:W]
bg = idx < 0
TEAL = {C[n] for n in ("tealD", "teal", "aqua", "mint", "deep", "sea", "river", "sky", "ice", "plumD", "plum", "lilac", "pine", "forest", "leaf", "grass", "sprout", "lime")}
ORNG = {C[n] for n in ("orange", "rust", "wine", "red", "coral", "peach", "blush")}
GREY = {C[n] for n in ("stone", "slate", "mist", "fog", "bone", "white", "rock", "rockL")}
DARKN = {C[n] for n in ("ink", "night", "void")}
THATCH = [C["bark"], C["clay"], C["sand"], C["cream"]]; WOOD = [C["soil"], C["bark"], C["clay"], C["sand"]]
# roof and wall are told apart by place: the roof is above the eave (y < 0.47 H, the porch's plank roof at the left excepted); the wall below it. The service coloured the logs green and the thatch brown
# or gold: the roof's colours go to TWO straw values (bark and clay), with the light straw (sand) only in a few short streaks in the top-left quarter; the wall's colours go to wood by luminance.
roofzone = (yy < int(H * 0.52)) & ~((xx < int(W * 0.30)) & (yy > int(H * 0.40)))
warm = {C[n] for n in ("soil", "bark", "clay", "sand", "cream", "paper", "gold", "yellow", "amber")}
roofpix = roofzone & np.isin(idx, list(TEAL | ORNG | warm))
lr = np.array([lum(v) for v in idx[roofpix]]); q50, q96 = np.quantile(lr, [.5, .96])
out = idx.copy()
for y, x in zip(*np.where(roofpix)):
    l = lum(idx[y, x]); v = C["clay"] if l > q50 else C["bark"]
    if l > q96 and x < W * 0.5 and y < H * 0.22: v = C["sand"]                                           # a few short straw-light streaks, top-left quarter only
    out[y, x] = v
stone_zone = (yy >= int(H * 0.9)) | ((xx < int(W * 0.3)) & (yy >= int(H * 0.88)))      # the base stones along the foot and the step in front of the porch; the door, posts and wall above are wood
for y, x in zip(*np.where(~roofzone & np.isin(idx, list(TEAL | ORNG)))): out[y, x] = WOOD[int(np.clip(lum(idx[y, x]) / 62, 0, 3))]
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
# the window keeps its glow (the lift turned it pale): the bright pixels in its box are yellow above its sill and amber below, a cream catch-light at the top left
wbox = (xx >= int(W * 0.68)) & (xx <= int(W * 0.82)) & (yy >= int(H * 0.42)) & (yy <= int(H * 0.60))
bright = (raw0[..., 0] > 170) & (raw0[..., 1] > 110) & (raw0[..., 2] < 120) & (raw0[..., 3] > 0) & wbox      # the glow, read from the service's own pixels
by_ = np.where(bright)[0]
if len(by_):
    mid = (by_.min() + by_.max()) // 2
    for y, x in zip(*np.where(bright)): lit[y, x] = C["yellow"] if y <= mid else C["amber"]
    for y, x in sorted(zip(*np.where(bright)))[:3]: lit[y, x] = C["cream"]
    print("window pixels", int(bright.sum()))
# each porch post has a 1 px foot shadow
for x0, x1 in ((14, 24), (42, 52)):
    for x in range(x0, x1):
        ys_ = [y for y in range(int(H * 0.78), H) if lit[y, x] >= 0]
        if ys_ and ys_[-1] + 1 < H and lit[ys_[-1] + 1, x] < 0 and lit[ys_[-1], x] in (C["soil"], C["bark"], C["clay"]): lit[ys_[-1] + 1, x] = C["night"]
WIN = {C["yellow"], C["cream"], C["gold"], C["amber"]}
box = wbox
dark = np.where(np.isin(lit, list(WIN)) & box, C["night"], lit)                      # only the window's box: the thatch's light is not the window
os.makedirs(sys.argv[2], exist_ok=True)
def save(a, n): x0, y0, x1, y1 = quant.bbox((a >= 0) * 255); quant.save_indexed(a[y0:y1, x0:x1], os.path.join(sys.argv[2], n))
save(lit, "hut-B-lit.png"); save(dark, "hut-B-dark.png"); save(np.array([[P.dark[v] if v >= 0 else -1 for v in r] for r in dark]), "hut-B-dark2.png")
print("hut", lit.shape)
