# The S01 juvenile regraded toward Pip (fix 1a, the creative director's gap ruling 00:00: S01's body is locked charcoal and Pip is
# canonical, so the grown mibi must read as the same animal). By hand rule, no generation.
# Each colour group of the signed juvenile is moved onto Pip's own colour for that part, keeping the juvenile's shading: a pixel's
# luminance is mapped from its group's percentiles in the juvenile onto the target group's in Pip, and it takes the target's hue.
#   teal body              -> Pip's charcoal body (#3a3436 family, L 0.15-0.29)
#   teal by the eye whites -> Pip's amber iris
#   orange beak and feet   -> Pip's cream-tan muzzle and toes
#   leaves                 -> Pip's olive, kept 0.06 brighter (a young crest)
#   cream belly, eye whites, the shadow: unchanged
# usage: python3 -I regrade-S01.py PODS_ROOT  (rewrites juvenile/mibi-juvenile-S01-{304x312,104x112,96x88,48x48}.png from the
#        signed teal originals, which it expects in juvenile/pre-regrade/: restore them from git, the commit before this script)
import sys, os, shutil, colorsys, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; J = f"{P}/juvenile"; os.makedirs(f"{J}/pre-regrade", exist_ok=True)
Lw = np.array([.2126, .7152, .0722])
def groups(rgb, op):
    f = rgb / 255.0; h = np.zeros(f.shape[:2]); s = np.zeros(f.shape[:2]); v = f.max(-1)
    mx, mn = f.max(-1), f.min(-1); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hh = np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b)[0])(f[..., 0], f[..., 1], f[..., 2]); L = f @ Lw
    leaf = op & (hh > 0.18) & (hh <= 0.40) & (s > 0.25)
    teal = op & (hh > 0.28) & (hh < 0.66) & (s > 0.05) & (L < 0.75) & ~leaf          # with the body's grey-teal and grey-green lights
    white = op & (s < 0.12) & (L > 0.86)
    iris = teal & nd.binary_dilation(white, iterations=3)
    return {"body": teal & ~iris, "iris": iris, "orange": op & (hh < 0.13) & (s > 0.35) & (v > 0.35), "leaf": leaf}, L
pip = np.asarray(Image.open(f"{P}/adult/mibi-adult-S01-304x312.png").convert("RGBA")).astype(float); pop = pip[..., 3] == 255
pf = pip[..., :3] / 255.0; pL = pf @ Lw; ph = np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b))(pf[..., 0], pf[..., 1], pf[..., 2])
H, S_, V = ph; dark = pop & (S_ < 0.25) & (pL < 0.35) & (pL > 0.04); amber = pop & (H < 0.13) & (S_ > 0.35) & (V > 0.35) & (pL < 0.6)
cream = pop & (S_ < 0.30) & (pL > 0.55) & (pL < 0.86); olive = pop & (H > 0.18) & (H <= 0.40) & (S_ > 0.25)
TARGET = {"body": (dark, 0.0), "iris": (amber, 0.0), "orange": (cream, 0.0), "leaf": (olive, 0.06)}
def tgt(mask): c = pf[mask]; l = pL[mask]; return c.mean(0), np.percentile(l, [5, 50, 95])
T = {k: (tgt(m)[0], tgt(m)[1], lift) for k, (m, lift) in TARGET.items()}
src = np.asarray(Image.open(f"{J}/mibi-juvenile-S01-304x312.png" if not os.path.exists(f"{J}/pre-regrade/mibi-juvenile-S01-304x312.png") else f"{J}/pre-regrade/mibi-juvenile-S01-304x312.png").convert("RGBA")).astype(float)
G0, L0 = groups(src[..., :3], src[..., 3] == 255)
SP = {k: np.percentile(L0[m], [5, 50, 95]) for k, m in G0.items() if m.any()}       # the juvenile's own range per group, from the 304 master
for size in ("304x312", "104x112", "96x88", "48x48"):
    f = f"{J}/mibi-juvenile-S01-{size}.png"; keep = f"{J}/pre-regrade/mibi-juvenile-S01-{size}.png"
    if not os.path.exists(keep): shutil.copyfile(f, keep)
    a = np.asarray(Image.open(keep).convert("RGBA")).astype(float); G, L = groups(a[..., :3], a[..., 3] > 0)
    out = a.copy()
    for k, m in G.items():
        if not m.any() or k not in SP: continue
        (col, tp, lift), sp = T[k], SP[k]
        Ln = np.interp(L[m], sp, tp) + lift                                       # the juvenile's light, on the target's range
        out[..., :3][m] = np.clip(col[None] * (Ln / max(col @ Lw, 1e-6))[:, None] * 255, 0, 255)
    Image.fromarray(np.rint(out).astype(np.uint8), "RGBA").save(f)
    print(size, {k: int(m.sum()) for k, m in G.items()})
