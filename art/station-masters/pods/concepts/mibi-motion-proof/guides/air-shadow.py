# Air keys for the flipbooks (programme lead 14:34): the body rises alone. Every low-alpha ink on the air key (the shadow
# split and the painted shadow) is stripped and the half-alpha rim choked off -> {n}-air-body; the ground shadow is a soft
# ellipse in the shadow colour (alpha <= 110) spanning the stand's feet (the lowest 60 rows of the stand) -> {n}-air-shadow.
# usage: air-shadow.py keys_dir
import sys, numpy as np
from PIL import Image
K = sys.argv[1]
for n in ['juv-S01', 'pip', 'grow-b2486']:
    a = np.asarray(Image.open(f'{K}/{n}-air-304x312.png').convert('RGBA')).copy()
    a[a[..., 3] < 255] = 0
    Image.fromarray(a).save(f'{K}/{n}-air-body-304x312.png')
    s = np.asarray(Image.open(f'{K}/{n}-anchor-304x312.png').convert('RGBA'))[..., 3] == 255
    low = np.where(s.any(1))[0].max(); xs = np.where(s[low - 60:low + 1].any(0))[0]
    cx = (xs.min() + xs.max()) / 2; rx = (xs.max() - xs.min()) / 2 + 6; cy = low - 2; ry = max(6, rx * 0.12)
    yy, xx = np.mgrid[:312, :304]; d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    sh = np.zeros((312, 304, 4), np.uint8); sh[..., :3] = [30, 26, 34]; sh[..., 3] = (np.clip((1 - d) * 1.6, 0, 1) * 110).astype(np.uint8)
    Image.fromarray(sh).save(f'{K}/{n}-air-shadow-304x312.png'); print(n, 'shadow centre', round(cx), 'half width', round(rx))
