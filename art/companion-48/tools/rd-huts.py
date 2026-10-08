"""Retro Diffusion huts A and B: the painted hut cell (grass patch and shadow kept) cropped, its key halo removed, on white, sent as
input_image (strength 0.5) to rd_pro__topdown with the 48-colour input_palette and remove_bg at 64 px wide, for each hut A to D (cells of the painted sheet) in the three states; the dark states' inputs are the painting with its warm light taken out. usage: python3 -I rd-huts.py HUT_SHEET OUT_DIR [--run]"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quant
HERE = os.path.dirname(os.path.abspath(__file__)); src, out = sys.argv[1], sys.argv[2]; run = "--run" in sys.argv
os.makedirs(os.path.join(out, "inputs"), exist_ok=True)
rgba = quant.key_background(Image.open(src), (255, 0, 255), tol=140)
def on_white(cell, pad=0.06):
    al = np.asarray(Image.fromarray(cell[..., 3]).filter(ImageFilter.MinFilter(3))).astype(int)
    rgb = cell[..., :3].astype(int); purple = (rgb[..., 0] - rgb[..., 1] > 40) & (rgb[..., 2] - rgb[..., 1] > 40); al = np.where(purple, 0, al)
    ys, xs = np.where(al > 128); crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; a = (al[ys.min():ys.max() + 1, xs.min():xs.max() + 1] / 255.0)[..., None]
    h, w = crop.shape[:2]; p = int(max(w, h) * pad); canvas = np.full((h + 2 * p, w + 2 * p, 3), 255, np.uint8)
    canvas[p:p + h, p:p + w] = (crop[..., :3] * a + 255 * (1 - a)).astype(np.uint8); return Image.fromarray(canvas, "RGB")
BASE = ("a small round shelter planted on the ground, a base row of stones meeting the grass, a soft shadow, a calm low thatched roof of two bands "
        "with no cupola, a door with a step, a window, a hanging lantern, a rope or a bundle against the wall, from above, pixel art sprite on a plain white background")
STATE = {"lit": "with a warm light in the window and the lantern", "dark": "at dusk, the window dark and the lantern unlit, no light anywhere", "dark2": "at night, very dark, the window black and the lantern unlit"}
def darken(im, state):
    # the dark states' input: the warm light taken out of the painting (bright yellow pixels go to dark wood), dark2 darker still
    a = np.asarray(im).astype(int).copy(); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    warm = (r > 200) & (g > 150) & (b < 120) & (r - b > 110) & (g - b > 70)
    warm[: int(a.shape[0] * 0.50)] = False                                                    # only below the roof: the thatch is yellow too
    a[warm] = (70, 50, 35)
    if state == "dark2": a = np.where((a.sum(-1, keepdims=True) > 740), a, (a * 0.55).astype(int))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
cells = {"A": (0, 0), "B": (0, 1), "C": (1, 0), "D": (1, 1)}
for name, (r, c) in cells.items():
    lit = on_white(np.ascontiguousarray(rgba[r * 512:(r + 1) * 512, c * 512:(c + 1) * 512])); w = 64; h = round(lit.height * w / lit.width)
    for state in ("lit", "dark", "dark2"):
        tag = f"C48-H-r6-{name}" if state == "lit" else f"C48-H-r6-{name}-{state}"
        if os.path.exists(os.path.join(out, tag + "-rd.png")) and "--force" not in sys.argv: continue
        im = lit if state == "lit" else darken(lit, state); p = os.path.join(out, "inputs", f"hut-{name}-{state}-in.png"); im.resize((w * 4, h * 4), Image.LANCZOS).save(p)
        prompt = BASE.replace("a window,", "a window,") + " " + STATE[state]
        cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), tag, out, str(w), str(h), prompt, "--input", p, "--strength", "0.5", "--remove-bg"] + (["--run"] if run else [])
        r_ = subprocess.run(cmd, capture_output=True, text=True); print(tag, w, h, (r_.stdout.strip().splitlines() or [r_.stderr[-200:]])[-1][:110])
