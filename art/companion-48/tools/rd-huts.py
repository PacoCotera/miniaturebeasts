"""Retro Diffusion huts A and B: the painted hut cell (grass patch and shadow kept) cropped, its key halo removed, on white, sent as
input_image (strength 0.5) to rd_pro__topdown with the 48-colour input_palette and remove_bg at 64 px wide, the lit state only
(the dark states are derived by hut-states.py). usage: python3 -I rd-huts.py HUT_SHEET OUT_DIR [--run]"""
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
PROMPT = ("a small round shelter planted on the ground, a base row of stones meeting the grass, a soft shadow, a calm low thatched roof of two bands "
          "with no cupola, a door with a step, a window with a warm light, a hanging lantern, a rope or a bundle against the wall, from above, pixel art sprite on a plain white background")
for name, (r, c) in (("A", (0, 0)), ("B", (0, 1))):
    im = on_white(np.ascontiguousarray(rgba[r * 512:(r + 1) * 512, c * 512:(c + 1) * 512])); w = 64; h = round(im.height * w / im.width)
    p = os.path.join(out, "inputs", f"hut-{name}-in.png"); im.resize((w * 4, h * 4), Image.LANCZOS).save(p)
    cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), f"C48-H-r6-{name}", out, str(w), str(h), PROMPT, "--input", p, "--strength", "0.5", "--remove-bg"] + (["--run"] if run else [])
    r_ = subprocess.run(cmd, capture_output=True, text=True); print(name, w, h, (r_.stdout.strip().splitlines() or [r_.stderr[-200:]])[-1][:110])
