"""Hut B (the owner's choice) through Retro Diffusion properly: the lit state at 64 px from the painted B hut, three seeds of one family, then the
dark and dark2 states from the chosen lit result as img2img at a low strength (so the hut is the same drawing), the light taken out of the input.
usage: python3 -I rd-hut-b.py HUT_SHEET OUT_DIR lit [--run]            (three lit candidates, tags C48-H-r7-B-lit-s48.. )
       python3 -I rd-hut-b.py HUT_SHEET OUT_DIR states SEED [--run]    (dark and dark2 from the lit result of that seed)"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quant
HERE = os.path.dirname(os.path.abspath(__file__)); src, out, mode = sys.argv[1], sys.argv[2], sys.argv[3]; run = "--run" in sys.argv
os.makedirs(os.path.join(out, "inputs"), exist_ok=True)
rgba = quant.key_background(Image.open(src), (255, 0, 255), tol=140)
def on_white(cell, pad=0.06):
    al = np.asarray(Image.fromarray(cell[..., 3]).filter(ImageFilter.MinFilter(3))).astype(int)
    rgb = cell[..., :3].astype(int); purple = (rgb[..., 0] - rgb[..., 1] > 40) & (rgb[..., 2] - rgb[..., 1] > 40); al = np.where(purple, 0, al)
    ys, xs = np.where(al > 128); crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; a = (al[ys.min():ys.max() + 1, xs.min():xs.max() + 1] / 255.0)[..., None]
    h, w = crop.shape[:2]; p = int(max(w, h) * pad); canvas = np.full((h + 2 * p, w + 2 * p, 3), 255, np.uint8)
    canvas[p:p + h, p:p + w] = (crop[..., :3] * a + 255 * (1 - a)).astype(np.uint8); return Image.fromarray(canvas, "RGB")
BASE = ("a small round log cabin shelter with horizontal log walls and a small porch roof over the door, a calm low thatched roof of two bands with no cupola, "
        "planted on the ground with a base row of stones meeting the grass, a soft shadow, a hanging lantern, a bundle of sticks against the wall, from above, pixel art sprite on a plain white background")
STATE = {"lit": " with a warm light in the window and the lantern", "dark": " at dusk, the window dark and the lantern unlit, no light anywhere", "dark2": " at night, very dark, the window black and the lantern unlit"}
W_, H_ = 64, 58
def call(tag, inp, prompt, strength, seed):
    cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), tag, out, str(W_), str(H_), prompt, "--input", inp, "--strength", str(strength), "--remove-bg", "--seed", str(seed)] + (["--run"] if run else [])
    r = subprocess.run(cmd, capture_output=True, text=True); print(tag, (r.stdout.strip().splitlines() or [r.stderr[-200:]])[-1][:110])
if mode == "lit":
    im = on_white(np.ascontiguousarray(rgba[0:512, 512:1024])); p = os.path.join(out, "inputs", "hut-B-painted-in.png"); im.resize((W_ * 4, round(im.height * W_ / im.width) * 4), Image.LANCZOS).save(p)
    for seed in (48, 49, 50): call(f"C48-H-r7-B-lit-s{seed}", p, BASE + STATE["lit"], 0.4, seed)
else:
    seed = int(sys.argv[4]); lit = Image.open(os.path.join(out, f"C48-H-r7-B-lit-s{seed}-rd.png")).convert("RGBA")
    def prep(im, state):   # onto white at 4x, the warm light below the roof taken out, dark2 darker
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); a = np.asarray(bg.convert("RGB")).astype(int).copy()
        r, g, b = a[..., 0], a[..., 1], a[..., 2]; warm = (r > 190) & (g > 120) & (b < 120) & (r - b > 90); warm[: int(a.shape[0] * 0.5)] = False; a[warm] = (70, 50, 35)
        if state == "dark2": a = np.where(a.sum(-1, keepdims=True) > 740, a, (a * 0.55).astype(int))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((W_ * 4, H_ * 4), Image.NEAREST)
    prev = lit
    for state in ("dark", "dark2"):
        inp = prep(prev, state); p = os.path.join(out, "inputs", f"hut-B-{state}-s{seed}-in.png"); inp.save(p)
        call(f"C48-H-r7-B-{state}-s{seed}", p, BASE + STATE[state], 0.3, seed)
        nxt = os.path.join(out, f"C48-H-r7-B-{state}-s{seed}-rd.png")
        prev = Image.open(nxt).convert("RGBA") if os.path.exists(nxt) else prev
