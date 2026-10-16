"""H1: ring-hatch-80x56 recut under the same id: the wild's leaf sprig (a curved stem with three leaves: two alternate along
it, one at the tip) painted into the plate's centred 24x24 (plate 28, 16; content inside 20x20). A low relief in a muted leaf
green on the sage plate, lit from the top left with the plate's own house light, with a soft contact shade down-right: readable
at 1x, quieter than the pod and the stamp label. One master for shut and armed. Everything outside the 24x24 is the signed
plate pixel for pixel. usage: make-hatch-sprig.py SIGNED_PLATE OUT"""
import sys, os, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'habitat-marks'))
from paintkit import *
from PIL import Image
from scipy import ndimage as nd

STEM = (78, 98, 64); LEAFC = (96, 124, 78)
c = Canvas(24, 24)
def leaf(cx, cy, rx, ry, ang, col):
    a = np.radians(ang); X = c.xx - cx; Y = c.yy - cy
    u = X * np.cos(a) + Y * np.sin(a); v = -X * np.sin(a) + Y * np.cos(a)
    d2 = (u / rx) ** 2 + (v / ry) ** 2; m = d2 <= 1
    # a leaf's midrib: a shallow crease along u
    h = np.sqrt(np.clip(1 - d2, 0, 1)) * ry * 1.1 + 1.2 - 0.6 * np.exp(-(v / 0.6) ** 2) * (np.abs(u) < rx * .8)
    c._put(m, h, col)
# the stem: a quadratic curve from (7, 21) to (14, 5), 1.6 px thick
t = np.linspace(0, 1, 120); P0, P1, P2 = np.array([7, 21.5]), np.array([8, 11]), np.array([14.5, 4.5])
pts = ((1 - t) ** 2)[:, None] * P0 + (2 * (1 - t) * t)[:, None] * P1 + (t ** 2)[:, None] * P2
d = np.full(c.xx.shape, 1e9, np.float32)
for x, y in pts: d = np.minimum(d, np.hypot(c.xx - x, c.yy - y))
m = d <= 0.85; c._put(m, np.sqrt(np.clip(1 - (d / 0.85) ** 2, 0, 1)) * 0.9 + 0.6, STEM)
leaf(12.8, 15.5, 5.2, 2.3, -28, LEAFC)        # the right leaf, low on the stem
leaf(4.6, 11.2, 4.4, 2.0, 32, LEAFC)          # the left leaf
leaf(17.2, 5.2, 4.6, 2.1, -40, LEAFC)         # the tip leaf
spr = np.asarray(c.render(shadow_k=0.30, shadow=(1.0, 1.2))).astype(float)

plate = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float); out = plate.copy()
win = plate[16:40, 28:52].copy(); al = spr[..., 3:4] / 255
win[..., :3] = srgb(lin(spr[..., :3]) * al + lin(win[..., :3]) * (1 - al))
out[16:40, 28:52] = win
Image.fromarray(np.round(out).astype(np.uint8), 'RGBA').save(sys.argv[2])
print('changed px', int((np.abs(out - plate).sum(-1) > 0).sum()), 'outside window', int((np.abs(out - plate).sum(-1) > 0).sum() - (np.abs(out - plate)[16:40, 28:52].sum(-1) > 0).sum()))
