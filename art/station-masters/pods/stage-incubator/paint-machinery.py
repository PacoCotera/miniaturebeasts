#!/usr/bin/env python3
"""Fix 5 IA1: the Incubator stage recut under the same id. The chamber's service machinery is painted, by hand in code, only in
the four paint zones of boards/station-fix5-incubator-probe-spec.md I1 (screen rects; the slice sits at (0, 40)). Each piece is a
small height field (bevelled boxes, pipes, flanges, slats, bolts, a handwheel) shaded lambert from the top left (matte, no
specular), given the wall's own grain, and casting a soft shadow down-right onto the wall. Everything outside the zones is the
signed stage pixel for pixel.
usage: python3 -I paint-machinery.py SRC_STAGE OUT_STAGE"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
base = np.asarray(Image.open(src).convert('RGBA')).astype(float)
H, W = base.shape[:2]; OY = 40                                    # screen y = slice y + 40
ZONES = {'L': (80, 88, 160, 312), 'R': (784, 88, 160, 144), 'LM': (248, 320, 96, 80), 'RM': (680, 320, 80, 88)}
zone = np.zeros((H, W), bool)
for x, y, w, h in ZONES.values(): zone[y - OY:y - OY + h, x:x + w] = True

SAGE = np.array([88, 99, 83.]); SAND = np.array([112, 106, 88.]); RUBBER = np.array([58, 56, 56.]); SLOT = np.array([38, 34, 32.])
LIGHT = np.array([-0.55, -0.62, 0.78]); LIGHT /= np.linalg.norm(LIGHT)
S = 4
yy, xx = (np.mgrid[0:H * S, 0:W * S].astype(np.float32) + .5) / S - .5   # supersampled pixel centres, in slice pixels

def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255

pieces = []                                                       # (mask, height, albedo) back to front
def box(x, y, w, h, b, alb, depth=1.0):
    m = (xx >= x - .5) & (xx < x + w - .5) & (yy >= y - OY - .5) & (yy < y - OY + h - .5)
    d = np.minimum.reduce([xx - x + .5, x + w - xx - .5, yy - (y - OY) + .5, y - OY + h - yy - .5])
    t = np.clip(d / b, 0, 1); pieces.append((m, depth * b * np.sin(t * np.pi / 2), alb))
def cyl_v(x, y, w, h, alb):
    m = (xx >= x - .5) & (xx < x + w - .5) & (yy >= y - OY - .5) & (yy < y - OY + h - .5); r = w / 2; t = (xx + .5 - x - r) / r
    pieces.append((m, np.sqrt(np.clip(1 - t * t, 0, 1)) * r, alb))
def cyl_h(x, y, w, h, alb):
    m = (xx >= x - .5) & (xx < x + w - .5) & (yy >= y - OY - .5) & (yy < y - OY + h - .5); r = h / 2; t = (yy + .5 - (y - OY) - r) / r
    pieces.append((m, np.sqrt(np.clip(1 - t * t, 0, 1)) * r, alb))
def bolt(cx, cy, r=2.5, alb=SAND):
    d2 = (xx + .5 - cx) ** 2 + (yy + .5 - (cy - OY)) ** 2; m = d2 <= r * r
    pieces.append((m, np.sqrt(np.clip(1 - d2 / (r * r), 0, 1)) * r + 3, alb))
def ring(cx, cy, r0, r1, alb):
    d = np.sqrt((xx + .5 - cx) ** 2 + (yy + .5 - (cy - OY)) ** 2); m = (d >= r0) & (d <= r1); mid = (r0 + r1) / 2; hw = (r1 - r0) / 2
    pieces.append((m, np.sqrt(np.clip(1 - ((d - mid) / hw) ** 2, 0, 1)) * hw + 4, alb))
grooves = []                                                      # recessed lines cut into the piece under them
def groove(x, y, w, h): grooves.append((x, y - OY, w, h))

# L: two risers with flanges, clamps, a vent unit, the service unit on a branch, a junction box on a second branch
cyl_v(104, 96, 14, 296, SAGE); cyl_v(126, 96, 10, 296, SAGE)
for fy in (96, 386): box(100, fy - 3, 40, 6, 2, SAND)
for cy in (160, 270, 340):
    box(98, cy, 44, 6, 2, SAND); bolt(101, cy + 3, 1.6); bolt(139, cy + 3, 1.6)
cyl_h(118, 252, 36, 8, SAGE); cyl_h(118, 356, 42, 8, SAGE)
box(154, 112, 72, 64, 4, SAGE)
for i in range(6): groove(164, 124 + i * 8, 52, 3)
for bx, by in ((159, 117), (221, 117), (159, 171), (221, 171)): bolt(bx, by)
box(152, 216, 76, 88, 5, SAGE); box(164, 228, 52, 36, 3, SAGE, 1.3)
for i in range(5): groove(170 + i * 9, 234, 3, 24)
groove(172, 280, 36, 4)
for bx, by in ((157, 221), (223, 221), (157, 299), (223, 299)): bolt(bx, by)
box(160, 340, 48, 36, 4, SAGE); box(160, 352, 48, 8, 2, RUBBER); bolt(166, 346, 2); bolt(202, 346, 2)
# R: a duct from the right wall, a vent hood on a drop, a small enamel unit on a second drop
for fx in (930,): box(fx, 98, 6, 24, 2, SAND)
cyl_h(800, 102, 130, 16, SAGE); box(796, 99, 6, 22, 2, SAND)
cyl_v(832, 118, 14, 18, SAGE); box(798, 136, 88, 72, 5, SAGE)
for i in range(6): groove(810, 148 + i * 9, 64, 3)
for bx, by in ((803, 141), (881, 141), (803, 203), (881, 203)): bolt(bx, by)
cyl_v(912, 118, 10, 22, SAGE); box(898, 140, 36, 60, 4, SAND, .8); groove(906, 176, 20, 4); bolt(903, 145); bolt(929, 145)
# LM: a valve unit with a handwheel, a stub into the wall at the left, a drop into the wall below
cyl_h(252, 356, 14, 8, SAGE); box(250, 353, 4, 14, 1, SAND)
box(262, 336, 64, 48, 4, SAGE); ring(294, 360, 9, 14, SAND); bolt(294, 360, 3.5)
for a in (0, 1, 2): bolt(294 + 11.5 * np.cos(a * 2.094 + .5), 360 + 11.5 * np.sin(a * 2.094 + .5), 1.5)
cyl_v(288, 384, 12, 4, SAGE); box(284, 386, 20, 4, 1, SAND)
# RM: a small pump on the line down to the right hose
box(694, 332, 54, 48, 6, SAGE); box(694, 350, 54, 8, 2, RUBBER); bolt(700, 338, 2); bolt(742, 338, 2)
cyl_v(715, 380, 12, 14, SAGE); box(711, 392, 20, 4, 1, SAND)

# shading, at S x
SH, SW = H * S, W * S
up = lambda img: np.repeat(np.repeat(img, S, 0), S, 1)
alb = up(base[..., :3]).astype(np.float32); hgt = np.zeros((SH, SW), np.float32); obj = np.zeros((SH, SW), bool)
ox, oy = np.zeros((SH, SW), np.float32), np.zeros((SH, SW), np.float32); size = np.ones((SH, SW), np.float32)
for m, h, a_ in pieces:
    hgt[m] = h[m] + 1; alb[m] = a_; obj |= m
    ys_, xs_ = np.where(m); x0, x1, y0, y1 = xs_.min(), xs_.max(), ys_.min(), ys_.max()
    ox[m] = (xx[m] * S - x0) / max(x1 - x0, 1); oy[m] = (yy[m] * S - y0) / max(y1 - y0, 1)
for x, y, w, h in grooves:
    g = (xx >= x - .5) & (xx < x + w - .5) & (yy >= y - .5) & (yy < y + h - .5) & obj; hgt[g] -= 2.5; alb[g] = SLOT
gy, gx = np.gradient(nd.gaussian_filter(hgt, S * .5))
gx *= S; gy *= S                                                   # slope per slice pixel
n = np.dstack([-gx, -gy, np.ones((SH, SW), np.float32)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
shade = 0.30 + 0.70 * np.clip(n @ LIGHT, 0, 1) / LIGHT[2]
shade *= 1.07 - 0.14 * (0.5 * ox + 0.5 * oy)                       # light falls off across each face, top left to bottom right
col = lin(alb) * shade[..., None]
dn = lambda img: img.reshape(H, S, W, S, *img.shape[2:]).mean((1, 3))
col1 = dn(col); cov = dn(obj.astype(np.float32))
sh = nd.gaussian_filter(nd.shift(cov, (5, 4), order=1), 2.5); ao = nd.gaussian_filter(cov, 1.2)
wall_l = lin(base[..., :3]) * (1 - 0.45 * sh[..., None]) * (1 - 0.25 * ao[..., None])
outl = col1 * cov[..., None] + wall_l * (1 - cov[..., None])
wall = base[60:240, 300:700, :3]; res = wall - nd.gaussian_filter(wall, (4, 4, 0))
grain = np.tile(res, (H // res.shape[0] + 1, W // res.shape[1] + 1, 1))[:H, :W]
rgb = srgb(outl) + grain * .7 * cov[..., None]
res_img = base.copy()
res_img[..., :3] = np.where(zone[..., None], np.clip(np.round(rgb), 0, 255), base[..., :3])
Image.fromarray(res_img.astype(np.uint8), 'RGBA').save(out)

# gate measures
Y = lin(res_img[..., :3]) @ [.2126, .7152, .0722]
for k, (x, y, w, h) in ZONES.items():
    z = Y[y - OY:y - OY + h, x:x + w]; print(f'{k}: p95 {np.percentile(z, 95):.4f} mean {z.mean():.4f}')
print('changed outside zones:', int(((res_img != base).any(-1) & ~zone).sum()))
