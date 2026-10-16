#!/usr/bin/env python3
"""Fix 7: the per-light grade for residents (mibi pictures) on Vivarium, Home, Idle, Habitat.

A graded resident is a derived picture of its signed master, never code-drawn:
  rgb_out = srgb( lin(rgb_master) * GAIN[light] ), alpha unchanged, per pixel.
Gains are linear-light, per channel, and never above 1.0 (a matte resident is never
brighter than its master). Day is identity, so the day picture IS the master.

Usage: light-grade.py MASTER.png LIGHT OUT.png      (one derived picture)
       light-grade.py --proof SLICES_DIR OUT_DIR      (the 1x proof)
"""
import sys, numpy as np
from PIL import Image

GAIN = {
    "dawn":  (0.86, 0.90, 1.00),
    "day":   (1.00, 1.00, 1.00),
    "dusk":  (1.00, 0.78, 0.72),
    "night": (0.58, 0.50, 0.43),
}

def lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)

def srgb(l):
    l = np.clip(l, 0, 1)
    return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255.0

def grade(im, light):
    a = np.asarray(im.convert("RGBA")).astype(float)
    out = a.copy()
    out[..., :3] = np.round(srgb(lin(a[..., :3]) * np.array(GAIN[light])))
    return Image.fromarray(out.astype(np.uint8), "RGBA")

def proof(slices, outdir):
    """Idle Vivarium per light, S01/S02/S03 adult 144x152: master left, graded right."""
    import os
    for light in GAIN:
        bg = Image.open(os.path.join(slices, f"idle-vivarium-{light}-1024x568.png")).convert("RGBA")
        c = Image.new("RGBA", (1024, 600), (0, 0, 0, 255))
        c.alpha_composite(bg, (0, 32))
        for i, sp in enumerate(("S01", "S02", "S03")):
            m = Image.open(os.path.join(slices, f"mibi-adult-{sp}-144x152.png")).convert("RGBA")
            x, y = 120 + i * 300, 32 + 568 - 152 - 60
            c.alpha_composite(m, (x, y))
            c.alpha_composite(grade(m, light), (x + 140, y))
        c.convert("RGB").save(os.path.join(outdir, f"proof-{light}-1024x600.png"))

if __name__ == "__main__":
    if sys.argv[1] == "--proof":
        proof(sys.argv[2], sys.argv[3])
    else:
        grade(Image.open(sys.argv[1]), sys.argv[2]).save(sys.argv[3])
