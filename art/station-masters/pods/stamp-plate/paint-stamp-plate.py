#!/usr/bin/env python3
"""T-20261016-16: the Incubator's stamp plate, painted as a box of the R machinery (CD ruling, specs/station-stamp-plate-ruling.md:
the plate is placed 1:1 with no K x WARM and no code hairline; only the stamp glyph takes the look). The same build as the R vent
hood above it (paint-machinery.py's height field, lambert from the top left, matte): an 8 px raised frame with a 2.5 px rounded outer
bevel, four sand bolts at its corners, and a recess at 8..112 for the glyph (code draws it centred, up to 104 x 104). Albedos are
the vent hood's measured tones on the signed stage (incubator-growing at bc866c71: face (117,130,113), bolts (98,91,73)). The
stage's own wall shading at the rect (the R group's shade at its top rows) is carried onto the plate, the wall's grain is added,
and the four corner pixels outside the bevel's 1.5 px radius are the stage's wall pixel for pixel: alpha 255 everywhere.
usage: python3 -I paint-stamp-plate.py STAGE.png OUT.png   (STAGE: slices/room-bench-stage-incubator.png, at (0, 40))"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd

stage_path, out = sys.argv[1], sys.argv[2]
X0, Y0, N, R0 = 804, 232, 120, 8                                   # the rect (screen), its size, the recess inset
stage = np.asarray(Image.open(stage_path).convert('RGB')).astype(float)
wall = stage[Y0 - 40:Y0 - 40 + N, X0:X0 + N]                        # the wall under the rect (slice y = screen y - 40)

def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255

SAGE = np.array([117, 130, 113.]); SAND = np.array([98, 91, 73.]); RIM = np.array([204, 211, 181.])
LIGHT = np.array([-0.55, -0.62, 0.78]); LIGHT /= np.linalg.norm(LIGHT)
S = 4; SHEEN = float(sys.argv[3]) if len(sys.argv) > 3 else 1.2
yy, xx = (np.mgrid[0:N * S, 0:N * S].astype(np.float32) + .5) / S   # supersampled pixel centres, plate pixels

# the height field: frame 0..120 with a rounded outer bevel (4 px), a flat top, a 2 px step down into the recess at 8..112
d_out = np.minimum.reduce([xx, N - xx, yy, N - yy])
d_in = np.minimum.reduce([xx - R0, N - R0 - xx, yy - R0, N - R0 - yy])
rad = 1.5; cx = np.clip(xx, rad, N - rad); cy = np.clip(yy, rad, N - rad)
corner = np.hypot(xx - cx, yy - cy) > rad                          # outside the rounded corner: the wall
h = 2 * np.sin(np.clip(d_out / 2.5, 0, 1) * np.pi / 2)             # the frame's rounded bevel, 2.5 px as the hood's rim, 2 high
h = np.where(d_in > 0, 2 - 1.5 * np.clip(d_in / 1.5, 0, 1), h)      # the step down into the recess, floor at 0.5
alb = np.broadcast_to(SAGE, (N * S, N * S, 3)).copy()
alb[d_in > 0] = SAGE * 0.86                                         # the recess (its walls and floor), the same sage a little duller
for bx, by in ((4, 4), (N - 4, 4), (4, N - 4), (N - 4, N - 4)):     # the bolts, as paint-machinery's bolt(): r 2.5, raised 3
    d2 = (xx - bx) ** 2 + (yy - by) ** 2; m = d2 <= 2.5 ** 2
    h = np.where(m, 2 + np.sqrt(np.clip(1 - d2 / 2.5 ** 2, 0, 1)) * 2.5, h); alb[m] = SAND
    ring = (d2 > 2.5 ** 2) & (d2 <= 3.3 ** 2); alb[ring] = SAND * 0.55
gy, gx = np.gradient(nd.gaussian_filter(h, S * .5, mode='constant', cval=0.0)); gx *= S; gy *= S   # the wall around it is height 0
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
shade = 0.30 + 0.70 * np.clip(n @ LIGHT, 0, 1) / LIGHT[2]
sheen = np.clip((n @ LIGHT - LIGHT[2]) / (1 - LIGHT[2]), 0, 1) * (d_out < 4)   # the outer rim's sheen where it turns to the key (the recess walls: lambert only, as the hood)
shade *= 1.07 - 0.14 * (0.5 * xx / N + 0.5 * yy / N)                # light falls off across the face, top left to bottom right
# the recess's own shade: the top and left walls cast onto its floor (the frame stands 1.5 above it)
occl = 1 - 0.45 * np.exp(-np.clip(np.minimum(yy - R0, xx - R0), 0, None) / 2.5) * (d_in > 0)
contact = 1 - 0.45 * np.exp(-np.minimum(N - xx, N - yy) / 1.0)      # the bottom and right edges meet the wall in a 1 px contact shade
occl = occl * contact
col = lin(alb) * (shade * occl)[..., None] + (SHEEN * sheen * occl)[..., None] * lin(RIM)   # the hood's lit rim tone
dn = lambda img: img.reshape(N, S, N, S, *img.shape[2:]).mean((1, 3))
col1 = dn(col); cov = 1 - dn(corner.astype(np.float32))
# the stage's own shading at the rect (the R group's shade at its top), relative to the wall's lower rows, carried onto the plate
wl = nd.gaussian_filter(lin(wall) @ [.2126, .7152, .0722], 6); ref = np.median(wl[80:, :])
col1 *= np.clip(wl / ref, 0.6, 1.0)[..., None]
res = wall - nd.gaussian_filter(wall, (4, 4, 0))                   # the wall's grain, as paint-machinery.py
rgb = srgb(col1) + res * .7
rgb = rgb * cov[..., None] + wall * (1 - cov[..., None])
img = np.dstack([np.clip(np.round(rgb), 0, 255), np.full((N, N), 255.)]).astype(np.uint8)
Image.fromarray(img, 'RGBA').save(out)
