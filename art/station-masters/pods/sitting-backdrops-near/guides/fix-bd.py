"""Sitting backdrops, near treatment: the 0 MXN fixes of the art director's ruling (2026-10-23 22:31, section 2), as its fix.py and burn.py.
pond: the pond-near-b cut (centre 1195x896, LANCZOS to 544x408), then a local burn over the haze: linear light x0.70 inside the rectangle
      x 150-394, y 110-285, feathered with Gaussian sigma 36.  The ruling's render: sha256 3b59658f...b775.
cave: the cave-near-a raw cropped to 1050x788 at (75, 108), LANCZOS once to 544x408, then PIL ImageEnhance.Color 1.15.  The ruling's render: df1ea304...65c3.
usage (from art/station-masters/pods): python3 -I sitting-backdrops-near/guides/fix-bd.py"""
import hashlib, numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
def make(job, cw=1195, x0=None, y0=None, color=1.0):
    im = Image.open(f'source/raw/sitting-backdrop-{job}.jpg').convert('RGB'); w, h = im.size; ch = round(cw * 3 / 4)
    x0 = (w - cw) // 2 if x0 is None else x0; y0 = (h - ch) // 2 if y0 is None else y0
    o = im.crop((x0, y0, x0 + cw, y0 + ch)).resize((544, 408), Image.LANCZOS)
    return ImageEnhance.Color(o).enhance(color) if color != 1.0 else o
def burn(o, box, feather, expo):
    m = Image.new('L', (544, 408), 0); ImageDraw.Draw(m).rectangle(box, fill=255)
    m = np.asarray(m.filter(ImageFilter.GaussianBlur(feather))).astype(float) / 255
    a = np.asarray(o).astype(float) / 255; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); lin = lin * (1 - m[..., None] * (1 - expo))
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055); return Image.fromarray(np.clip(np.rint(s * 255), 0, 255).astype(np.uint8))
WANT = {'pond': '3b59658feceb63f66cbbc7440e72ef7a9657db69d5e3928291fee815be47b775', 'cave': 'df1ea304309ee616bfddf0f0f7e158ee6f9d5b0b141cfa90f8a23f15c72c65c3'}
for pl, im in (('pond', burn(make('pond-near-b'), (150, 110, 394, 285), 36, 0.70)), ('cave', make('cave-near-a', cw=1050, x0=75, y0=108, color=1.15))):
    p = f'sitting-backdrops-near/slices/sitting-backdrop-{pl}-544x408.png'; im.save(p); h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    print(pl, h, 'matches the ruling' if h == WANT[pl] else 'DOES NOT MATCH ' + WANT[pl])
