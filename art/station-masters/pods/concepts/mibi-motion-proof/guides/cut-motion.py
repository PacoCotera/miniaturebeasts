# Cut a 3x2 motion key sheet on magenta into 304x312 keys, feet on row 305,
# scale set once per sheet so the anchor's body width equals the stand's.
# usage: cut-motion.py sheet.jpg stand.png out_dir name cell1,cell2,... [COLSxROWS] [scale]
# (use - for an empty cell; a single-key fix edit is 1x1 with the sheet's scale given, matched on the iris)
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, stand, out, name, cells = sys.argv[1:6]; cells = cells.split(',')
CO, RO = map(int, (sys.argv[6] if len(sys.argv) > 6 else '3x2').split('x'))
FIX = float(sys.argv[7]) if len(sys.argv) > 7 else None
FEET, W, H = 305, 304, 312
A = np.asarray(Image.open(src).convert('RGB')).astype(float)
sh_, sw_ = A.shape[:2]
def cut(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bdr = np.vstack([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    bg = np.median(bdr, 0)
    mag = np.abs(a - bg).sum(-1) < 70
    mx = a.max(-1)
    sha = (~mag) & (np.abs(r - b) < 60) & (g < 0.75 * np.minimum(r, b)) & (mx < bg.max() - 15)
    lab, n = nd.label(sha); sz = nd.sum(sha, lab, range(1, n + 1)); sha = np.isin(lab, 1 + np.where(sz > 200)[0])
    edge = np.zeros(mx.shape, bool); edge[:12] = edge[-12:] = True; edge[:, :12] = edge[:, -12:] = True
    dark = (mx < 40) & (np.abs(r - b) < 30) & edge                # cell borders: only in the crop's edge band (Pip's charcoal is as dark)
    body0 = ~(mag | sha | dark)
    lab, n = nd.label(body0); sz = nd.sum(body0, lab, range(1, n + 1))
    if n == 0 or sz.max() < 2000: return None
    body = np.isin(lab, 1 + np.where(sz > 1500)[0])
    body = nd.binary_fill_holes(body) & ~nd.binary_dilation(mag, iterations=1) & ~sha
    body = nd.binary_erosion(body, iterations=1)                     # the 1 px choke
    ys = np.where(body.any(1))[0]; top, foot = ys.min(), ys.max()
    sha &= np.arange(a.shape[0])[:, None] > top + 0.5 * (foot - top)
    cast = body & (g < 0.75 * np.minimum(r, b)) & (np.abs(r - b) < 70) & (np.minimum(r, b) > 110)
    body &= ~(cast & ~nd.binary_erosion(body, iterations=2))
    ground = max(foot, np.where(sha.any(1))[0].max() - 3) if sha.any() else foot
    alpha = np.where(body, 255, np.where(sha, 110, 0)).astype(np.uint8)
    rgb = np.where(body[..., None], a, np.where(sha[..., None], np.array([30, 26, 34]), 0)).astype(np.uint8)
    xs = np.where(body.any(0))[0]
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'), ground, (xs.min() + xs.max()) / 2, xs.max() - xs.min() + 1
st = np.asarray(Image.open(stand).convert('RGBA'))[..., 3] > 200
sxs = np.where(st.any(0))[0]; stand_w = sxs.max() - sxs.min() + 1; stand_cx = (sxs.min() + sxs.max()) / 2 + (W - st.shape[1]) / 2
res = []
for i, c in enumerate(cells):
    if c == '-': continue
    y0, x0 = (i // CO) * sh_ // RO, (i % CO) * sw_ // CO
    I = 6                                                           # inset: drop the cell borders
    k = cut(A[y0 + I:y0 + sh_ // RO - I, x0 + I:x0 + sw_ // CO - I])
    if k: res.append((c, *k))
sc = stand_w / res[0][4]
hs = [np.where(np.asarray(r[1])[..., 3].any(1))[0] for r in res]
sc = FIX if FIX else min(sc, min((FEET - 8) / (r[2] - h.min()) for r, h in zip(res, hs)))   # every key fits above the feet row
for c, im, ground, cx, w in res:
    p = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    pa = np.asarray(p).copy(); al = pa[..., 3]
    pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0))
    p = Image.fromarray(pa)
    can = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    can.alpha_composite(p, (round(stand_cx - cx * sc), round(FEET - ground * sc)))
    can.save(f'{out}/{name}-{c}-304x312.png')
print(name, 'scale %.3f' % sc, [r[0] for r in res])
