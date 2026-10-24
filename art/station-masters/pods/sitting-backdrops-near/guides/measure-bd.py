"""Sitting backdrops, near treatment (studio brief 2026-10-23 22:00, the art director's measure-bd.py method), measured at 1x on a 544x408 picture.
detail: mean |Laplacian| of the grey (PIL L) image, kernel (0,1,0 / 1,-4,1 / 0,1,0), scale 1, offset 128, minus 128 (absolute value taken around the offset).
saturation: mean HSV S (0-255). spread: std of the grey. key: mean sRGB relative luminance of the top-left quadrant (rows 0-203, cols 0-271) over the bottom-right's.
figure zone: mean relative luminance, rows 164-323, cols 192-351. Also the brief's checks 12 (feet band y 300-408 detail) and 13 (tag rows x 160-384, y 348-380: grey std, p99).
usage: python3 -I measure-bd.py PICTURE.png [...]   prints one JSON object per picture"""
import json, sys, numpy as np
from PIL import Image, ImageFilter
K = ImageFilter.Kernel((3, 3), (0, 1, 0, 1, -4, 1, 0, 1, 0), scale=1, offset=128)
def rel(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4); return c @ [0.2126, 0.7152, 0.0722]
def detail(g): return float(np.abs(np.asarray(g.filter(K)).astype(float) - 128).mean())
def measure(p):
    im = Image.open(p).convert('RGB'); assert im.size == (544, 408), im.size
    g = im.convert('L'); G = np.asarray(g).astype(float); L = rel(np.asarray(im).astype(float))
    tag = G[348:381, 160:385]
    return {'file': p, 'detail': round(detail(g), 1), 'saturation': round(float(np.asarray(im.convert('HSV'))[..., 1].mean()), 1), 'spread': round(float(G.std()), 1),
            'key': round(float(L[0:204, 0:272].mean() / L[204:, 272:].mean()), 2), 'figure_zone_lum': round(float(L[164:324, 192:352].mean()), 3),
            'feet_band_detail': round(detail(g.crop((0, 300, 544, 408))), 1), 'tag_std': round(float(tag.std()), 1), 'tag_p99': round(float(np.percentile(tag, 99)), 1)}
if __name__ == '__main__':
    for p in sys.argv[1:]: print(json.dumps(measure(p)))
