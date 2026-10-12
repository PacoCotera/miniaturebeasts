# Fix 1b of the Station global fix plan: the calm "unknown" treatment, in place of the frost checkerboard on Create's founder and the
# Incubator's silhouette. A proof of the rule on the 1x golden, not the build: the builder implements the rule in the founder's picture.
#   A  an unread doing (Movement, Stamina, and any chapter that draws nothing on the body): no veil at all
#   B  an unread look: a soft single-tone veil on that look's region only, VEIL #6b7484 at 60 %, over the part's box grown 4 px as an
#      ellipse, feathered 6 px; the rest of the body as read
#   C  nothing read: one calm silhouette, GHOST #5f6878 alone, no hue kept, plus 0.22 of the body's luma contrast about its mean,
#      a 2 px rim on the top left at RIM #8f99a8 50 %; no detail, no dither
# All three sit below the creature's own light: never brighter than it, never a pattern.
# The base here is the golden's founder with its Bayer frostD (#cbd5e2) inpainted from its neighbours.
# usage: python3 -I unknown-proof.py GOLDEN_PNG OUT_DIR
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1:3]
VEIL, GHOST, RIM = np.array([107., 116., 132.]), np.array([95., 104., 120.]), np.array([143., 153., 168.])
full = np.asarray(Image.open(src).convert("RGB")).astype(float); X, Y, W, H = 360, 240, 304, 312   # create.json regions.founder.rect
r = full[Y:Y + H, X:X + W].copy(); fd = np.all(r == [0xcb, 0xd5, 0xe2], -1)
for _ in range(3):
    ok = ~fd; acc = np.zeros_like(r); n = np.zeros(fd.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx: so = np.roll(np.roll(ok, dy, 0), dx, 1); acc += np.roll(np.roll(r, dy, 0), dx, 1) * so[..., None]; n += so
    f = fd & (n > 0); r[f] = acc[f] / n[f][:, None]; fd &= ~f
stage = np.array([95., 80., 67.])
body = nd.binary_opening(np.abs(r - stage).sum(-1) > 30, iterations=1); body[296:] = False   # the feet stand on 536 (row 296): the tray's floor is not the body
legs = nd.binary_dilation(body[260:282].any(0), iterations=3); body[282:, ~legs] = False                 # and its lit edge, which touches the feet: only the legs' columns go lower
lab, n = nd.label(body)
body = nd.binary_fill_holes(lab == 1 + int(np.argmax(nd.sum(body, lab, range(1, n + 1)))))
g = (r[..., 1] > r[..., 0] + 25) & (r[..., 1] > r[..., 2] + 25) & body; g[140:] = False          # the crown's leaves, as the Crown chapter's part
y0, y1 = np.where(g.any(1))[0][[0, -1]]; x0, x1 = np.where(g.any(0))[0][[0, -1]]
yy, xx = np.mgrid[0:H, 0:W]; cy, cx, ry, rx = (y0 + y1) / 2, (x0 + x1) / 2, (y1 - y0) / 2 + 4, (x1 - x0) / 2 + 4
d = np.sqrt(((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2); fe = 6 / max(ry, rx); w = np.clip((1 + fe - d) / fe, 0, 1) * body
B = r * (1 - 0.6 * w[..., None]) + VEIL * 0.6 * w[..., None]
lum = r @ [.2126, .7152, .0722]; C = np.where(body[..., None], GHOST + ((lum - lum[body].mean()) * 0.22)[..., None], r)
rim = body & ~np.roll(np.roll(body, 2, 0), 2, 1); C[rim] = C[rim] * 0.5 + RIM * 0.5
for name, pic in (("A-doings-unread", r), ("B-crown-unread", B), ("C-nothing-read", C)):
    f = full.copy(); f[Y:Y + H, X:X + W] = pic; Image.fromarray(f.clip(0, 255).astype(np.uint8)).save(f"{out}/{name}-1x.png")
    Image.fromarray(pic.clip(0, 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(f"{out}/{name}-founder-3x.png")
print("crown box", x0, x1, y0, y1)
