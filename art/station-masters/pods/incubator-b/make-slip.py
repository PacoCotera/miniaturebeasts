"""T-20261016-27 (specs/station-incubator-tabs-ruling.md §5, §6, §8) and T-20261016-41 (specs/station-create-bench-spec.md §4, §7): the slip's paper.
slip-208x408 (Incubator, 88, 96) and slip-208x296 (Create, 728, 96): one paper, one clip, two heights. By hand in code, no paid call.
- The paper is Pods' own paper tag (room-bench-stage-overview, measured median (219, 196, 164)) shaded down in linear light (x0.55) to a median near
  (168, 150, 125), so it is toned paper, never white, and stays under the pod's light (the brightness rule, ruling §6). Matte: a fine fibre
  grain (two scales, +-4), a soft fall of light from the top left across the sheet, a 1 px darker deckle at its edges, a faint lift at the
  bottom corners.
- It lies on the bench: the sheet is inset 3 px right and 4 px bottom, and a soft cast shade (ground #1d232b, <= 45 %) falls into that inset.
- The clip: a matte steel spring clip at the top centre (56 x 22), its jaw over the sheet's top edge, lambert from the top left, a dark rubber
  pad under its jaw and a contact shade on the paper below it. Not chrome, not polished (the guide's "Never" list).
- Nothing is printed on it: every word on the slip is the build's live text.
usage: python3 -I make-slip.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
out = sys.argv[1]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
PAPER = lin([219, 196, 164]) * 0.55                                        # Pods' tag paper, shaded
GROUND = lin([0x1d, 0x23, 0x2b])
rng = np.random.default_rng(208)
fib_big = nd.gaussian_filter(rng.normal(0, 1, (900, 260)), (6, 1.2))         # long fibres run down the sheet
fib_fine = nd.gaussian_filter(rng.normal(0, 1, (900, 260)), 0.7)
fib = fib_big / fib_big.std() * 2.2 + fib_fine / fib_fine.std() * 1.8          # in sRGB levels, about +-4
def slip(Wd, Ht):
    S = 4; yy, xx = (np.mgrid[0:Ht * S, 0:Wd * S] + .5) / S
    PW, PH = Wd - 3, Ht - 4                                                 # the sheet; the inset holds its shade
    sheet = (xx < PW) & (yy < PH)
    dn = lambda img: img.reshape(Ht, S, Wd, S, *img.shape[2:]).mean((1, 3))
    a_sheet = dn(sheet.astype(np.float32))
    y1, x1 = np.mgrid[0:Ht, 0:Wd] + .5
    fall = 1.06 - 0.12 * (0.35 * x1 / PW + 0.65 * y1 / PH)                   # light from the top left across the sheet
    edge = np.minimum.reduce([x1, PW - x1, y1, PH - y1])
    deckle = 1 - 0.10 * np.exp(-np.clip(edge, 0, None) / 0.8)                 # a darker 1 px deckle
    lift = 1 - 0.06 * np.exp(-((PW - x1) ** 2 + (PH - y1) ** 2) / 300) - 0.05 * np.exp(-(x1 ** 2 + (PH - y1) ** 2) / 300)
    col = PAPER * (fall * deckle * lift)[..., None]
    col = lin(np.clip(srgb(col) + fib[:Ht, :Wd, None], 0, 255))
    # the clip, 56 x 22 at the top centre: a rounded steel bar (its jaw) over the sheet's top edge, the spring's two loops behind it
    cx = PW / 2; cw, ch, cy0 = 56, 22, 0
    inclip = (np.abs(xx - cx) <= cw / 2) & (yy >= cy0) & (yy < cy0 + ch)
    u = np.clip((yy - cy0) / ch, 0, 1); v = np.clip(1 - np.abs(xx - cx) / (cw / 2), 0, 1)
    h = np.sin(np.pi * u) * 3 * np.clip(v * 6, 0, 1)                          # a rounded bar, its ends rounded over 1/6 of its width
    loops = (((xx - (cx - 14)) ** 2 + (yy - 7) ** 2 <= 16) | ((xx - (cx + 14)) ** 2 + (yy - 7) ** 2 <= 16)) & inclip
    gy, gx = np.gradient(nd.gaussian_filter(h, S * .4)); gx *= S; gy *= S
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
    lam = 0.35 + 0.65 * np.clip(n @ L, 0, 1) / L[2]
    steel = lin([128, 132, 134]) * lam[..., None]
    steel[loops] = steel[loops] * 0.55                                         # the spring's loops, set back
    pad = inclip & (yy >= cy0 + ch - 3)
    steel[pad] = lin([46, 45, 48])                                             # the dark rubber pad at the jaw
    a_clip = dn(inclip.astype(np.float32)); c_clip = dn(steel * inclip[..., None]) / np.maximum(a_clip, 1e-6)[..., None]
    # the clip's contact shade on the paper, and the sheet's cast shade into the inset
    cshade = nd.gaussian_filter(nd.shift(a_clip, (2.5, 2), order=1), 1.6)
    col = col * (1 - 0.35 * cshade[..., None] * (1 - a_clip[..., None]))
    sh = nd.gaussian_filter(nd.shift(a_sheet, (3, 2.5), order=1), 1.8) * 0.45 * (1 - a_sheet)
    A = a_sheet + sh
    C = (col * a_sheet[..., None] + GROUND * sh[..., None]) / np.maximum(A, 1e-6)[..., None]
    C = C * (1 - a_clip[..., None]) + c_clip * a_clip[..., None]; A = np.maximum(A, a_clip)
    img = np.dstack([srgb(C), np.clip(A, 0, 1) * 255]); img[A <= 0] = 0
    return np.clip(np.rint(img), 0, 255).astype(np.uint8)
for name, (w, h) in (("slip-208x408", (208, 408)), ("slip-208x296", (208, 296))):
    im = slip(w, h); Image.fromarray(im, "RGBA").save(os.path.join(out, name + ".png"))
    Y = lin(im[..., :3]) @ [.2126, .7152, .0722]; op = im[..., 3] == 255
    print(name, "paper p50", np.median(im[op][:, :3], 0).round().tolist(), "rel. lum p95 %.3f mean %.3f" % (np.percentile(Y[op], 95), Y[op].mean()))
