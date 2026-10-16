"""T-20261016-27 (Incubator option B; specs/station-incubator-tabs-ruling.md §2 cradle and cradleFront, §8): incubator-cradle (with the pod's
contact shadow), incubator-cradle-empty, incubator-cradle-front; 240 x 96 at (392, 392). By hand in code, no paid call.
The one device on the screen, and its job is visible: it holds the pod in a moss nest and lights the shell from below.
- The pedestal: moulded sage polymer, the housing's own sage ramp (measured on the signed stage, as the plate kit: mid (136, 142, 112),
  shade (98, 102, 79)); a rounded body (x 22-218 at its foot, 8-232 at its rim, radius 10), a rounded rim lit from the top left with the housing's
  lit edge (204, 211, 181) where the moulding turns to the key, a dark rubber foot strip; lambert from the top left, matte, the housing's grain.
- The nest: living moss from the vivarium's own painting (idle-vivarium-day-1024x568, the moss bed at (760, 466), 224 x 34), laid as an oval bed
  (centre (120, 26), 104 x 18) with a soft, uneven edge; its back half lies under the pod, its near lip is incubator-cradle-front.
- The candling light: a warm amber lens (a 64 x 10 stadium) set in the pedestal's face under the nest, and its light rising into the moss (warmer and
  lighter toward the nest's centre). It is the light that lights the shell from below (the shell light overlays carry it onto the pod).
- incubator-cradle: the pod's contact shadow on the moss (an oval under the shell's foot). -empty: the moss without it.
  -front: the nest's near lip only (the moss in front of the pod's foot and the rim below it), everything else clear.
- A soft contact shade of the pedestal on the slate in its last rows. Nothing else.
usage: python3 -I make-cradle.py VIVARIUM_DAY.png OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
viv, out = sys.argv[1:3]
W, H, S = 240, 96, 4
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
yy, xx = (np.mgrid[0:H * S, 0:W * S] + .5) / S
dn = lambda img: img.reshape(H, S, W, S, *img.shape[2:]).mean((1, 3))
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
# the pedestal: rows 30-88, its width easing from 224 at the rim to 196 at the foot, corners rounded 10
top, bot = 30, 88
t = np.clip((yy - top) / (bot - top), 0, 1); half = 112 - 14 * t
dx = np.abs(xx - 120) - (half - 10); dy_top = (top + 10) - yy; dy_bot = yy - (bot - 10)
inside_core = (np.abs(xx - 120) <= half) & (yy >= top) & (yy <= bot)
corner = np.hypot(np.clip(dx, 0, None), np.clip(np.maximum(dy_top, dy_bot), 0, None)) > 10
ped = inside_core & ~((dx > 0) & ((dy_top > 0) | (dy_bot > 0)) & corner)
d_edge = nd.distance_transform_edt(ped) / S
h = 4 * np.sin(np.clip(d_edge / 4, 0, 1) * np.pi / 2)                      # the rounded moulding, 4 px
rim = ped & (yy < top + 7)                                                  # the rim band, a little raised
h = h + np.where(rim, 1.2 * np.sin(np.clip((yy - top) / 7, 0, 1) * np.pi), 0)
foot = ped & (yy >= bot - 6)
gy, gx = np.gradient(nd.gaussian_filter(h, S * .5)); gx *= S; gy *= S
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
lam = np.clip(n @ L, 0, 1) / L[2]
sage_mid, sage_shade = lin([136, 142, 112]), lin([98, 102, 79])
pc = sage_shade * (0.55 + 0.62 * lam)[..., None] * (1.06 - 0.12 * ((xx - 8) / 224 * .5 + (yy - top) / (bot - top) * .5))[..., None]
sheen = np.clip((n @ L - L[2]) / (1 - L[2]), 0, 1) * (d_edge < 3)        # the moulding's lit edge where it turns to the key (the housing's rim)
pc = pc + (1.1 * sheen)[..., None] * lin([204, 211, 181])
pc[foot] = lin([46, 45, 48]) * (0.6 + 0.5 * lam[foot])[..., None]          # the dark rubber foot
# the candling lens: 64 x 10 at (88, 52), a warm amber window lit from inside, its sage bezel shaded on top
lens = np.hypot(np.clip(np.abs(xx - 120) - 27, 0, None), yy - 57) <= 5       # a stadium, 64 x 10
lr = np.clip(1 - (np.abs(xx - 120) / 32) ** 2 - ((yy - 57) / 5) ** 2, 0, 1)
pc[lens] = (lin([214, 150, 62]) * (0.65 + 0.45 * lr[lens])[..., None])
bez = nd.binary_dilation(lens, iterations=S) & ~lens & ped
pc[bez] = pc[bez] * 0.6
glow_face = np.exp(-(((xx - 120) / 44) ** 2 + ((yy - 57) / 10) ** 2))      # a little of its light on the face round it
pc = pc + lin([214, 150, 62])[None, None] * 0.10 * glow_face[..., None] * ped[..., None] * (~lens)[..., None]
# the moss nest: an oval bed, centre (120, 26), 104 x 18, with a fibrous edge; its own painted moss, shaded to an oval mound
V = np.asarray(Image.open(viv).convert("RGB")).astype(float)
moss_src = V[466:500, 760:984]                                              # 224 x 34, the vivarium's moss bed
mx, my = (xx - 8).clip(0, 223.99), ((yy - 8) / 36 * 33.99).clip(0, 33.99)
ms = np.stack([nd.map_coordinates(moss_src[..., c], [my, mx], order=1) for c in range(3)], -1)
ex, ey = (xx - 120) / 104, (yy - 26) / 18
er = np.hypot(ex, ey)
rng = np.random.default_rng(392)
fray = nd.gaussian_filter(rng.normal(0, 1, (H * S, W * S)), (4.0, 7.0)); fray = fray / fray.std() * 0.022   # a soft, uneven edge
nest = er + fray < 1.0
mound = np.sqrt(np.clip(1 - er ** 2, 0, 1))                                 # lighter on the mound's top, darker at its foot
mc = lin(ms) * (0.62 + 0.42 * mound * (1 - 0.35 * np.clip(ey, 0, 1)))[..., None]
lamp = np.exp(-(((xx - 120) / 70) ** 2 + ((yy - 30) / 14) ** 2))           # the candling light rising through the nest
mc = mc * (1 + 0.55 * lamp[..., None]) + lin([214, 150, 62])[None, None] * 0.06 * lamp[..., None]
def compose(contact, front_only):
    col = np.zeros((H * S, W * S, 3)); A = np.zeros((H * S, W * S))
    col[ped] = pc[ped]; A[ped] = 1
    m = nest.copy()
    cc = mc.copy()
    if contact:                                                             # the pod's contact shadow: the shell's foot on the moss
        cs = np.exp(-(((xx - 120) / 58) ** 2 + ((yy - 23) / 7) ** 2))
        cc = cc * (1 - 0.55 * cs[..., None])
    col[m] = cc[m]; A[m] = 1
    if front_only:                                                          # the near lip: the moss in front of the shell's foot and the rim
        keep = (m & (yy >= 26 + 7 * np.sqrt(np.clip(1 - ((xx - 120) / 70) ** 2, 0, 1)))) | (ped & (yy < top + 12) & ~(m & (yy < 26)))
        A = A * keep
    c1, a1 = dn(col * A[..., None]), dn(A)
    c1 = c1 / np.maximum(a1, 1e-6)[..., None]
    if not front_only:                                                      # the pedestal's contact shade on the slate, in the last rows
        sh = nd.gaussian_filter(nd.shift(dn(ped.astype(np.float32)), (3, 2), order=1), 1.6) * 0.45 * (1 - a1)
        G = lin([0x1d, 0x23, 0x2b]); Aall = a1 + sh
        c1 = (c1 * a1[..., None] + G * sh[..., None]) / np.maximum(Aall, 1e-6)[..., None]; a1 = Aall
    img = np.dstack([srgb(c1), np.clip(a1, 0, 1) * 255]); img[a1 <= 0] = 0
    return np.clip(np.rint(img), 0, 255).astype(np.uint8)
for name, contact, front in (("incubator-cradle", True, False), ("incubator-cradle-empty", False, False), ("incubator-cradle-front", True, True)):
    im = compose(contact, front); Image.fromarray(im, "RGBA").save(os.path.join(out, name + ".png"))
    Y = lin(im[..., :3]) @ [.2126, .7152, .0722]; op = im[..., 3] > 128
    print(name, "opaque px", int(op.sum()), "rel. lum p95 %.3f" % np.percentile(Y[op], 95))
