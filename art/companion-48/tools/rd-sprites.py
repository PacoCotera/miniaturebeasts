"""Retro Diffusion candidates for the props and the pawn: each painted crop (on white) sent as input_image to
rd_pro__topdown with the 48-colour input_palette and remove_bg, at the piece's own size; one call per piece.
usage: python3 -I rd-sprites.py PROPS_SRC PAWN_SRC OUT_DIR [--only a,b] [--run]"""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
HERE = os.path.dirname(os.path.abspath(__file__))
props_src, pawn_src, out = sys.argv[1], sys.argv[2], sys.argv[3]; run = "--run" in sys.argv
os.makedirs(os.path.join(out, "inputs"), exist_ok=True)
def on_white(rgba, pad=0.08):
    bb = quant.bbox(rgba[..., 3]); x0, y0, x1, y1 = bb; crop = rgba[y0:y1, x0:x1]
    h, w = crop.shape[:2]; p = int(max(w, h) * pad)
    canvas = np.full((h + 2 * p, w + 2 * p, 4), 255, np.uint8)
    # the key leaves a magenta halo and a purple ground shadow: erode the alpha one pixel, then send every
    # purple-cast pixel (red and blue both above green) to white so the input carries no key colour
    from PIL import ImageFilter
    al = np.asarray(Image.fromarray(crop[..., 3]).filter(ImageFilter.MinFilter(3))).astype(int)
    rgb = crop[..., :3].astype(int)
    purple = (rgb[..., 0] - rgb[..., 1] > 22) & (rgb[..., 2] - rgb[..., 1] > 22)
    al = np.where(purple, 0, al)
    a = (al / 255.0)[..., None]
    canvas[p:p + h, p:p + w, :3] = (crop[..., :3] * a + 255 * (1 - a)).astype(np.uint8)
    return Image.fromarray(canvas[..., :3], "RGB")
jobs = []
# props: the same cells and fit sizes as build-props.py
rgba = quant.key_background(Image.open(props_src), (255, 0, 255), tol=110); pitch = 256
spec = [("tree", (0, 0), (96, 112), "a round-canopied meadow tree from above, trunk visible below the canopy"), ("bush", (0, 1), (48, 44), "a small round leafy bush from above"),
        ("bush-fruit", (0, 2), (48, 44), "a small round leafy bush with red berries from above"), ("stone", (1, 0), (32, 40), "a grey rounded field stone from above"),
        ("stone-warm1", (1, 1), (44, 48), "a grey field stone glowing warm amber from inside, from above"), ("stone-charged1", (1, 2), (44, 48), "a grey field stone crackling with blue-white electric charge, from above"),
        ("outpost-lit", (1, 3), (48, 72), "a small thatched hut with a lit lamp post beside it, from above"), ("pod", (3, 1), (32, 36), "a small pale egg-shaped pod lying on the ground, from above"),
        ("stone-plain2", (2, 0), (32, 40), "a grey rounded field stone from above"),
        ("stone-warm2", (2, 1), (44, 48), "a grey field stone glowing warm amber from inside, from above"),
        ("stone-charged2", (2, 2), (44, 48), "a grey field stone crackling with blue-white electric charge, from above"),
        ("stone-step", (2, 0), (36, 26), "a low flat grey stepping stone, from above")]
only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
for name, (r, c), (fw, fh), prompt in spec:
    if only and name not in only: continue
    cell = rgba[r * pitch:(r + 1) * pitch, c * pitch:(c + 1) * pitch]
    im = on_white(np.ascontiguousarray(cell)); s = min(fw / im.width, fh / im.height)
    w, h = max(12, round(im.width * s)), max(12, round(im.height * s))
    if name == "stone-step": w, h = 40, 28; im = im.resize((int(im.height * 1.6), im.height), Image.LANCZOS)   # a stepping stone is wide and low: the stone crop stretched
    p = os.path.join(out, "inputs", name + "-in.png"); im.resize((w * 4, h * 4), Image.LANCZOS).save(p)
    jobs.append((name, p, w, h, prompt + ", pixel art sprite on a plain white background"))
# the pawn: walk2 of each painted row (down, up, left, right) in a 48 px square
a = np.asarray(Image.open(pawn_src).convert("RGB")).astype(int)
isbg = ((a[..., 2] > 120) & (a[..., 0] > 150)) | ((a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 140))
prgba = np.dstack([a.astype(np.uint8), np.where(isbg, 0, 255).astype(np.uint8)])
alpha = prgba[..., 3] > 0; colsum = alpha.sum(axis=0); rowsum = alpha.sum(axis=1)
def runs2(v, minlen, mingap):
    o, start, gap = [], None, 0
    for i, x in enumerate(v):
        if x > 0:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= mingap:
                if i - gap - start >= minlen: o.append((start, i - gap))
                start, gap = None, 0
    if start is not None: o.append((start, len(v)))
    return o
crun, rrun = runs2(colsum, 40, 6), runs2(rowsum, 80, 10)
for facing, r in ([] if only else [("down", 0), ("up", 1), ("left", 2), ("right", 3)]):
    y0, y1 = rrun[r]; x0, x1 = crun[0]; cell = np.ascontiguousarray(prgba[y0:y1, x0:x1])
    im = on_white(cell, pad=0.15); side = max(im.width, im.height); sq = Image.new("RGB", (side, side), (255, 255, 255)); sq.paste(im, ((side - im.width) // 2, side - im.height))
    p = os.path.join(out, "inputs", f"pawn-{facing}-in.png"); sq.resize((192, 192), Image.LANCZOS).save(p)
    jobs.append((f"pawn-{facing}", p, 48, 48, f"a small explorer in an orange hooded suit with a lantern, facing {facing}, pixel art sprite on a plain white background"))
for name, p, w, h, prompt in jobs:
    cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), "C48-S-r2-" + name, out, str(w), str(h), prompt, "--input", p, "--strength", "0.5", "--remove-bg"] + (["--run"] if run else [])
    r = subprocess.run(cmd, capture_output=True, text=True); print(name, w, h, r.stdout.strip().splitlines()[-1][:120] if r.stdout.strip() else r.stderr[-200:])
