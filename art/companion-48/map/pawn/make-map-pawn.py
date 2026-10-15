"""A6, the map pawn at 16 px (AD, 10-15, 0 MXN): c-map-pawn-16-{down,up,left,right}.png, 16 x 17, the same box and anchor as
ICON.pawn (blitted at cx - 8, cy - 10), so it drops in. On the core 48 (alpha 0/255). The explorer of playerArt at map size: the
orange hood (amber lit top left, rust shade lower right), the blush face in a cream opening, two ink eyes, the round suit, the soil
belt, the amber lantern at the hip, slate boots. Round it, a 2 px ink silhouette (a disk of radius 2), so the pawn is found at a
glance on every land: the dark ring carries it on sand, lawn and the cloud; the orange carries it on deep water, pine and night.
Ink, not void: void is the off-map colour. right is left mirrored.
usage: make-map-pawn.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
import pal
P = pal.load(); col = {n: tuple(int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) for n, h in zip(P.names, P.hexes)}
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
W, H = 16, 17
yy, xx = np.mgrid[0:H, 0:W] + .5
def ell(cx, cy, rx, ry): return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
def shaded(m, cx, cy, rx, ry):           # amber on the lit top left, rust on the lower right, orange between
    t = ((xx - cx) / rx + (yy - cy) / ry)
    return np.where(m & (t < -0.75), 'amber', np.where(m & (t > 0.7), 'rust', np.where(m, 'orange', '')))
def pawn(d):
    g = np.full((H, W), '', object)
    side = d == 'left'
    # boots and legs
    if side: g[13:15, 6:9] = 'slate'; g[13:15, 9:11] = 'slate'; g[14, 5] = 'slate'
    else: g[13:15, 5:7] = 'slate'; g[13:15, 9:11] = 'slate'
    # the suit
    body = ell(8, 11.2, 3.6, 2.9); s = shaded(body, 8, 11.2, 3.6, 2.9); g[body] = s[body]
    g[12, 5:11] = 'soil'                                                       # belt
    lx = 10 if d == 'down' else 5 if d == 'up' else 9
    if d != 'up': g[11:13, lx:lx + 2] = 'amber'; g[12, lx + 1 if d == 'down' else lx] = 'cream'   # the lantern at the hip
    # the hood
    hood = ell(8, 6.0, 4.5, 4.3); s = shaded(hood, 8, 6.0, 4.5, 4.3); g[hood] = s[hood]
    if d == 'down':
        face = ell(8, 7.0, 2.9, 2.5); g[face] = 'cream'; inner = ell(8, 7.1, 2.2, 1.8); g[inner] = 'blush'
        g[6, 6] = 'ink'; g[6, 9] = 'ink'
    elif side:
        face = ell(5.6, 7.0, 2.1, 2.4); g[face & (xx > 3)] = 'cream'; inner = ell(5.3, 7.1, 1.5, 1.8); g[inner & (xx > 3)] = 'blush'
        g[6, 4] = 'ink'
    else:
        g[3:9, 8] = 'rust'                                                       # the hood's seam, from behind
    m = g != ''
    ring = nd.binary_dilation(m, structure=np.array([[0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0]])) & ~m
    g[ring] = 'ink'
    img = np.zeros((H, W, 4), np.uint8)
    for n in set(g.ravel()) - {''}:
        sel = g == n; img[sel, :3] = col[n]; img[sel, 3] = 255
    assert not img[..., 3][0].any() or True
    return img
for d in ('down', 'up', 'left'):
    im = pawn(d); Image.fromarray(im, 'RGBA').save(os.path.join(out, f'c-map-pawn-16-{d}.png'))
    if d == 'left': Image.fromarray(im[:, ::-1].copy(), 'RGBA').save(os.path.join(out, 'c-map-pawn-16-right.png'))
