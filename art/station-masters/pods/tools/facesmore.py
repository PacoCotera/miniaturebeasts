"""The dock band's faces for the other 13 species (ad-curl, 2026-10-28), by dock/make-dock.py's rule: a hand-set square round the head and its
crown in the signed adult painting (adult/mibi-adult-SXX-304x312, the round-1 and round-3 stand-ins), reduced to 24 (never enlarged) with premultiplied alpha.
usage: python3 -I facesmore.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
out = sys.argv[1]; R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE = {"S04": (178, 80, 264, 166), "S05": (178, 90, 262, 174), "S06": (190, 100, 292, 202), "S07": (180, 55, 304, 179), "S08": (160, 58, 250, 148),
        "S09": (170, 18, 265, 113), "S10": (180, 140, 290, 250), "S11": (205, 150, 280, 225), "S12": (146, 142, 250, 246), "S13": (160, 180, 240, 260),
        "S14": (155, 165, 245, 255), "S15": (150, 30, 250, 130), "S16": (122, 55, 212, 145)}
for sp, box in FACE.items():
    a = np.asarray(Image.open(f"{R}/adult/mibi-adult-{sp}-304x312.png").convert("RGBA")).astype(float)
    a[..., 3] = np.where(a[..., 3] == 110, 0, a[..., 3])                     # never the house shadow
    pm = a.copy(); pm[..., :3] *= pm[..., 3:] / 255
    c = Image.fromarray(pm.round().astype(np.uint8), "RGBA").crop(box).resize((24, 24), Image.LANCZOS)
    r = np.asarray(c).astype(float); al = r[..., 3:]; rgb = np.where(al > 0, r[..., :3] * 255 / np.maximum(al, 1), 0)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al]).round().astype(np.uint8), "RGBA").save(os.path.join(out, f"face-{sp}-24.png"))
print("made faces:", " ".join(FACE))
