"""Cargo rework: the three haul containers cut from one Pro sheet (source/raw/rw-haul-trio.jpg, from the owner's ref-6/7/9/10): the
energy cell (white shell, orange bands, a glass window of glowing amber energy), the data cartridge (a green glyph screen, a clear
panel over stacked chips, gold pins) and the essence vial (clear glass, brass caps, glowing green-teal liquid with a leaf). Keyed from
the magenta (a pixel is ground when it is near magenta in hue: R and B both well above G), glass that shows the magenta through it turned to a cool glass grey and partly clear, the painted contact shadow dropped (the
shelf keeps cargo-store-shadow-48x14), each object fitted into its box (48x64, or 72x96) (premultiplied Lanczos, never enlarged), centred, its base on
the last row, the same ids and sizes as the signed pieces.
usage: python3 -I cut-haul.py RAW.jpg OUT_DIR [WxH, default 48x64; 72x96 is the larger set proposed for the bay]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
raw, out = sys.argv[1:3]; OW, OH = (int(v) for v in (sys.argv[3] if len(sys.argv) > 3 else '48x64').split('x'))
r = np.asarray(Image.open(raw).convert('RGB')).astype(float); H, W = r.shape[:2]
R, G, B = r[..., 0], r[..., 1], r[..., 2]
mag = (np.minimum(R, B) - G)                              # how magenta: high on the ground and its shadow
bgm = mag > 60
fg = nd.binary_opening(~bgm, iterations=2)
lab, k = nd.label(fg); sz = nd.sum(fg, lab, range(1, k + 1))
objs = sorted([i + 1 for i in np.argsort(sz)[-3:]], key=lambda i: np.where(lab == i)[1].mean())
names = [f'cargo-{k}-{OW}x{OH}' for k in ('energy', 'data', 'essence')]
for n, i in zip(names, objs):
    m = nd.binary_fill_holes(lab == i)
    # alpha: soft over the magenta distance at the edge
    a = np.clip((60 - mag) / 50, 0, 1) * nd.binary_dilation(m, iterations=2)
    a = np.where(nd.binary_erosion(m, iterations=2), 1.0, a)
    mg = np.array([255, 0, 255.])
    un = (r - (1 - a[..., None]) * mg) / np.maximum(a[..., None], 0.05)   # unmix the magenta from the edge
    un = np.clip(un, 0, 255)
    # glass: inside the object, magenta seen through glass is neutralised to a cool glass grey and the pixel is made partly clear
    inside = nd.binary_erosion(m, iterations=2)
    t = np.clip(np.minimum(un[..., 0], un[..., 2]) - un[..., 1], 0, None)
    glass = inside & (t > 18)
    grey = un[..., 1:2] * 0.35 + np.array([150, 160, 172.]) * 0.65
    un = np.where(glass[..., None], grey, un)
    a = np.where(glass, 1 - 0.45 * np.clip((t - 18) / 80, 0, 1), a)
    ys, xs = np.where(a > 0.02); sub = np.dstack([un, a * 255])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sc = min((OW - 2) / sub.shape[1], (OH - 1) / sub.shape[0]); w, h = round(sub.shape[1] * sc), round(sub.shape[0] * sc)
    pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255, sub[..., 3:]])
    rr = np.asarray(Image.fromarray(np.round(pm).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    al = rr[..., 3:] / 255; rgb = np.where(al > 0, rr[..., :3] / np.maximum(al, 1e-6), 0)
    o = np.zeros((OH, OW, 4)); x0 = (OW - w) // 2; o[OH - h:OH, x0:x0 + w] = np.dstack([rgb, rr[..., 3:]])
    o[o[..., 3] < 8] = 0
    Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, n + '.png')); print(n, w, h)
