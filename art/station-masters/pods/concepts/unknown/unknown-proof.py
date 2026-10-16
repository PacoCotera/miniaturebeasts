# Fix 1b of the Station global fix plan: the calm "unknown" treatment, in place of the frost checkerboard on Create's founder and the
# Incubator's silhouette. A proof of the rule on the 1x golden, not the build: the builder implements the rule in the founder's picture.
#   A  an unread doing (Movement, Stamina, and any chapter that draws nothing on the body): no veil at all
#   B  an unread look: a soft single-tone veil on that look's region only, VEIL #6b7484 at 60 %, over the part's box grown 4 px as an
#      ellipse, feathered 6 px; the rest of the body as read
#   C  nothing read: one calm silhouette, GHOST #5f6878 alone, no hue kept, plus 0.12 of the body's luma contrast about its mean,
#      a 2 px rim on the top left at RIM #8f99a8 50 %; no detail, no dither
# All three sit below the creature's own light: never brighter than it, never a pattern (the art director's 10-15 rulings, README):
#   B  a whole-body look (Coat, Shape) veils the full body alpha (w = 0.6 x alpha, no ellipse); Coat draws its luma, not its colour,
#      under the veil (and wins a Coat-and-Shape tie); overlapping veils take the largest weight; after the veil, a pixel whose luma is
#      above the picture's own is scaled rgb x L_pic / L_out (L = Rec.709 luma on sRGB 0-255, not linearised; L_out = 0 left as is)
#   C  never brighter as a whole: if the silhouette's mean luma over the body is above the picture's, every ghost pixel (rim included)
#      is scaled by mean L_pic / mean L_ghost, once, not per pixel
# Writes A, B (crown), B (coat), B (coat and shape), C, each at 1x full screen and as a 3x founder crop; prints the test vectors.
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
LUM = lambda a: a @ [.2126, .7152, .0722]
def never_brighter(out, pic):
    lo, lp = LUM(out), LUM(pic); k = np.where((lo > lp) & (lo > 0), lp / np.maximum(lo, 1e-9), 1.0); return out * k[..., None]
def veil(pic, weights, coat):
    """weights: the unread looks' weights (each 0..1 per pixel); the largest wins; coat: draw luma, not colour, under the veil"""
    w_ = np.max(np.stack(weights), 0) if weights else np.zeros(pic.shape[:2])
    base = np.repeat(LUM(pic)[..., None], 3, -1) if coat else pic
    out = np.where(w_[..., None] > 0, base * (1 - 0.6 * w_[..., None]) + VEIL * 0.6 * w_[..., None], pic)
    return never_brighter(out, pic)
alpha = body.astype(float)                                                      # the body alpha (the build uses the picture's own alpha)
B = veil(r, [w], coat=False)                                                    # Crown (a part look): the ellipse
Bcoat = veil(r, [alpha], coat=True)                                             # Coat: full alpha, luma
Bcs = veil(r, [alpha, alpha], coat=True)                                        # Coat and Shape tie: Coat wins, luma
lum = LUM(r); C = np.where(body[..., None], GHOST + ((lum - lum[body].mean()) * 0.12)[..., None], r)
rim = body & ~np.roll(np.roll(body, 2, 0), 2, 1); C[rim] = C[rim] * 0.5 + RIM * 0.5
gm, pm = LUM(C)[body].mean(), lum[body].mean()
if gm > pm: C[body] = C[body] * (pm / gm)                                       # never brighter, once for the whole silhouette
for name, pic in (("A-doings-unread", r), ("B-crown-unread", B), ("B-coat-unread", Bcoat), ("B-coat-shape-unread", Bcs), ("C-nothing-read", C)):
    f = full.copy(); f[Y:Y + H, X:X + W] = pic; Image.fromarray(f.clip(0, 255).astype(np.uint8)).save(f"{out}/{name}-1x.png")
    Image.fromarray(pic.clip(0, 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(f"{out}/{name}-founder-3x.png")
print("crown box", x0, x1, y0, y1)
print("vectors (body mean luma): read %.2f  crown %.2f  coat %.2f  coat+shape %.2f  nothing %.2f (picture %.2f, ghost before scale %.2f)" % (
    lum[body].mean(), LUM(B)[body].mean(), LUM(Bcoat)[body].mean(), LUM(Bcs)[body].mean(), LUM(C)[body].mean(), pm, gm))
print("never brighter holds: crown", bool((LUM(B) <= lum + 1e-6).all()), " coat", bool((LUM(Bcoat) <= lum + 1e-6).all()), " nothing (mean)", LUM(C)[body].mean() <= pm + 1e-6)
