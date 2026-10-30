"""Cut a fluffy stand from its raw (magenta key) with the adult cut's own keyer, then fit like the adult stands:
304x312 feet row 305 (height <= 296, width <= 290), 96x88 (x0.276, feet 85), 48x48 refit to 44 (feet 44).
usage: python3 -I cutfluffy.py RAW OUTPREFIX"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
def cut_adult(a, k=0.5):
    """Own keyer: magenta and its painted shadow are the pixels whose green is far under red and blue while both are bright (a dark plum leg is not); the shadow is the darker part."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bdr = np.vstack([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); bg = np.median(bdr, 0)
    key = (g < k * np.minimum(r, b)) & (np.minimum(r, b) > 110) & (np.abs(r - b) < 80)
    if 'amber' in sys.argv: key |= (g < 0.85 * np.minimum(r, b)) & (np.abs(r - b) < 45) & (np.arange(a.shape[0])[:, None] > 0.86 * a.shape[0])   # A's shadow is a lilac grey, not magenta
    dark = key & (np.maximum(r, b) < bg.max() - 25)
    lab, n = nd.label(dark); shadow = np.zeros(key.shape, bool)
    for i in range(1, n + 1):
        c = lab == i
        if c.sum() > 800: shadow |= c
    shadow = nd.binary_dilation(shadow, iterations=2) & key
    body = ~key
    if 'holes' not in sys.argv: body = nd.binary_fill_holes(body)
    body = nd.binary_opening(body, iterations=1)
    lab2, n2 = nd.label(body); sz = nd.sum(body, lab2, range(1, n2 + 1)); body = np.isin(lab2, 1 + np.where(sz > 200)[0])
    shadow &= ~body; shadow = nd.binary_closing(shadow, iterations=2) & ~body
    ys = np.where(body.any(1))[0]; foot = ys.max()
    ground = max(foot, np.where(shadow.any(1))[0].max() - 3) if shadow.any() else foot
    alpha = np.where(body, 255, np.where(shadow, 110, 0)).astype(np.uint8)
    rgb = np.where(body[..., None], a, np.where(shadow[..., None], np.array([30, 26, 34]), 0)).astype(np.uint8)
    xs = np.where(body.any(0))[0]
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'), ground, (xs.min() + xs.max()) / 2, xs.max() - xs.min() + 1
raw, out = sys.argv[1:3]
im, ground, cx, w = cut_adult(np.asarray(Image.open(raw).convert('RGB')).astype(float), 0.6 if 'amber' in sys.argv else 0.5)
# defringe (the key's pink blends into glows and thin edges): inside the body, the outer 4 px take the colour of the nearest core pixel
_a = np.asarray(im).copy(); _b = _a[..., 3] == 255; _core = nd.binary_erosion(_b, iterations=2); _ring = _b & ~_core
_idx = nd.distance_transform_edt(~_core, return_distances=False, return_indices=True)
_a[..., :3] = np.where(_ring[..., None], _a[_idx[0], _idx[1], :3], _a[..., :3]); im = Image.fromarray(_a, 'RGBA')
if len(sys.argv) > 3 and sys.argv[3] == 'amber':    # the plume's glow is amber: the key's pink that bled into it goes back to amber
    _a = np.asarray(im).copy(); _m = (_a[..., 3] == 255) & (_a[..., 0] > 190) & (_a[..., 2] > _a[..., 1] * 1.05)
    _a[..., 2] = np.where(_m, (_a[..., 1] * 0.55).astype(np.uint8), _a[..., 2]); _a[..., 1] = np.where(_m, np.minimum(255, _a[..., 1] * 1.08), _a[..., 1]).astype(np.uint8); im = Image.fromarray(_a, 'RGBA')
if 'mint' in sys.argv:    # the tendril glow's pink halo (the key bled into it) is dropped
    _a = np.asarray(im).copy(); _m = (_a[..., 3] == 255) & (_a[..., 1] < 0.85 * np.minimum(_a[..., 0], _a[..., 2])) & (np.minimum(_a[..., 0], _a[..., 2]) > 150)
    _a[..., 3] = np.where(_m, 0, _a[..., 3]); im = Image.fromarray(_a, 'RGBA')
a = np.asarray(im); body = a[..., 3] == 255; ys = np.where(body.any(1))[0]; top = ys.min()
sc = min(296 / (ground - top + 1), 290 / w)
def fit(W, Hc, feet, s):
    p = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    pa = np.asarray(p).copy(); al = pa[..., 3]
    pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0)) if W > 48 else np.where(al >= 128, np.where(al > 200, 255, 110), 0)
    c = Image.new('RGBA', (W, Hc), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(W / 2 - cx * s), round(feet - ground * s))); c.save(f'{out}-{W}x{Hc}.png')
fit(304, 312, 305, sc); fit(96, 88, 85, sc * 0.276); fit(48, 48, 44, min(44 / (ground - top + 1), 44 / w))
print(out, 'scale', round(sc, 3), 'body h', ground - top + 1, 'w', w)
