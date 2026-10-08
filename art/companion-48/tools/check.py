"""Palette and value checks for a sheet or still.

usage: python3 -I check.py IMAGE.png [IMAGE2.png ...] [--fourgray OUT_DIR]
Prints, per image: off-palette pixel count (must be 0), semi-transparent pixel count (must be 0), and with
--fourgray writes a four-grey rendering (luminance quantised to 4 levels) beside it, the value check the style
guide asks for: forms and outlines must still read in four greys.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal

args = sys.argv[1:]
fg = None
if "--fourgray" in args:
    i = args.index("--fourgray"); fg = args[i + 1]; del args[i:i + 2]; os.makedirs(fg, exist_ok=True)
P = pal.load()
bad = 0
for p in args:
    im = Image.open(p)
    off, semi = P.off_palette(im)
    print(f"{os.path.relpath(p)}: off-palette {off}, semi-transparent {semi}, size {im.size[0]}x{im.size[1]}")
    bad += off + semi
    if fg:
        a = np.asarray(im.convert("RGBA")).astype(np.float64)
        lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
        q = np.clip((lum / 256 * 4).astype(int), 0, 3)
        grey = np.array([24, 96, 168, 240], dtype=np.uint8)[q]
        out = np.stack([grey, grey, grey, a[..., 3].astype(np.uint8)], axis=-1)
        Image.fromarray(out, "RGBA").save(os.path.join(fg, os.path.basename(p).replace(".png", "-4gray.png")))
sys.exit(1 if bad else 0)
