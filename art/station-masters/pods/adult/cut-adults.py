# Adult stand-ins (ad-adult-plan.md): key the raw on magenta (the proof cut's method), then fit:
# 304x312 at height = the juvenile's solid height / 0.67 (<= 296), feet row 305, centred;
# 144x152 = 304x312 x 0.4737 (feet 145); 96x88 x 0.276 (feet 85); 48x48 refit to 44 (feet 44).
# usage: python3 -I cut-adults.py PODS_ROOT RAW SPECIES
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
P, raw, s = sys.argv[1:4]
src = open(f'{P}/concepts/mibi-motion-proof/guides/cut-motion.py').read()
exec(src[src.index('def cut(a):'):src.index('st = np.asarray')])
def cut_adult(a):                                                  # shadow by component, so a body in magenta-like tones (S16) stays whole
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bdr = np.vstack([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); bg = np.median(bdr, 0)
    mag = np.abs(a - bg).sum(-1) < 70
    sha = (~mag) & (np.abs(r - b) < 60) & (g < 0.75 * np.minimum(r, b)) & (a.max(-1) < bg.max() - 15)
    lab, n = nd.label(~mag); body = np.zeros(mag.shape, bool); shadow = np.zeros(mag.shape, bool)
    for i in range(1, n + 1):
        c = lab == i; k = c.sum()
        if k < 300: continue
        if (sha & c).sum() > 0.8 * k: shadow |= c
        elif k > 1500:
            ys = np.where(c.any(1))[0]; low = c & (np.arange(c.shape[0])[:, None] > ys.min() + 0.8 * (ys.max() - ys.min()))
            sl = sha & low & (g < 0.6 * np.minimum(r, b)); body |= c & ~sl; shadow |= sl          # a shadow joined to the feet: its shadow-coloured pixels in the lowest fifth
    body = nd.binary_fill_holes(body) & ~nd.binary_dilation(mag, iterations=1); body = nd.binary_erosion(body, iterations=1)
    shadow &= ~body
    # defringe (programme lead 15:02): the painted shadow's magenta cast left inside the body mask
    ys = np.where(body.any(1))[0]; mid = (ys.min() + ys.max()) / 2
    dbg = np.abs(a - bg).sum(-1)                                  # distance from this picture's own magenta: the residue sits near it, a lilac skin does not
    deep = (g < 0.6 * np.minimum(r, b)) & (np.abs(r - b) < 70) & (np.minimum(r, b) > 60)   # magenta and its shadow; a lilac or purple skin keeps more green
    cast = body & deep
    lowh = np.arange(a.shape[0])[:, None] > mid
    shadow |= cast & lowh; body &= ~cast
    edge = body & ~nd.binary_erosion(body, iterations=2)
    body &= ~(edge & (g < 0.75 * np.minimum(r, b)) & (np.abs(r - b) < 70))
    lab2, n2 = nd.label(body); sz2 = nd.sum(body, lab2, range(1, n2 + 1)); body = np.isin(lab2, 1 + np.where(sz2 > 200)[0])
    shadow = nd.binary_closing(shadow, iterations=2) & ~body
    ys = np.where(body.any(1))[0]; foot = ys.max()
    ground = max(foot, np.where(shadow.any(1))[0].max() - 3) if shadow.any() else foot
    alpha = np.where(body, 255, np.where(shadow, 110, 0)).astype(np.uint8)
    rgb = np.where(body[..., None], a, np.where(shadow[..., None], np.array([30, 26, 34]), 0)).astype(np.uint8)
    xs = np.where(body.any(0))[0]
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'), ground, (xs.min() + xs.max()) / 2, xs.max() - xs.min() + 1
im, ground, cx, w = cut_adult(np.asarray(Image.open(f'{P}/source/raw/{raw}.jpg').convert('RGB')).astype(float))
a = np.asarray(im); body = a[..., 3] == 255; ys = np.where(body.any(1))[0]; top = ys.min()
j = np.asarray(Image.open(f'{P}/juvenile/mibi-juvenile-{s}-304x312.png'))[..., 3] == 255; jy = np.where(j.any(1))[0]
H = min(296, round((jy.max() - jy.min() + 1) / 0.67)); sc304 = H / (ground - top + 1)
def fit(W, Hc, feet, sc):
    p = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    pa = np.asarray(p).copy(); al = pa[..., 3]
    pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0)) if W > 48 else np.where(al >= 128, np.where(al > 200, 255, 110), 0)
    c = Image.new('RGBA', (W, Hc), (0, 0, 0, 0))
    c.alpha_composite(Image.fromarray(pa), (round(W / 2 - cx * sc), round(feet - ground * sc)))
    c.save(f'{P}/adult/mibi-adult-{s}-{W}x{Hc}.png')
fit(304, 312, 305, sc304); fit(144, 152, 145, sc304 * 0.4737); fit(96, 88, 85, sc304 * 0.276)
fit(48, 48, 44, min(44 / (ground - top + 1), 44 / w))
print(s, 'height', H, 'scale', round(sc304, 3))
