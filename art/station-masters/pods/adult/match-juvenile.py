# An adult stand's colours matched to its signed juvenile by hand rule (the programme lead's 00:23: the adult is painted from the rig and
# silhouette only, then its colour and face matched to the juvenile), the S01 regrade's method: each colour group's luminance
# is mapped from the adult's percentiles onto the juvenile's, taking the juvenile's hue; the adult's own shading is kept.
# Groups by hue and saturation: teal (head, ears), mint (the pale coat), gold (the tail's bulb). Everything else is unchanged.
# usage: python3 -I adult/match-juvenile.py SPECIES [GROUPS, e.g. teal,gold]   (run from pods/; rewrites adult/mibi-adult-SXX-*.png in place)
import sys, colorsys, numpy as np
from PIL import Image
sp = sys.argv[1]; Lw = np.array([.2126, .7152, .0722])
def groups(a):
    f = a[..., :3] / 255.0; op = a[..., 3] == 255; mx, mn = f.max(-1), f.min(-1); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h = np.vectorize(lambda r, g, b: colorsys.rgb_to_hsv(r, g, b)[0])(f[..., 0], f[..., 1], f[..., 2]); L = f @ Lw
    return {"teal": op & (h > .40) & (h < .56) & (s > .25), "mint": op & (h > .30) & (h < .60) & (s <= .25) & (L > .6), "gold": op & (h < .16) & (s > .35) & (L > .5) & (L < .8),
            "brown": op & (h < .12) & (s > .35) & (L < .45), "cap": op & (h > .04) & (h < .14) & (s > .2) & (s <= .5) & (L >= .5)}, f, L   # S02: the bean's brown, its tan cap
J = np.asarray(Image.open(f"juvenile/mibi-juvenile-{sp}-304x312.png").convert("RGBA")).astype(float); GJ, fJ, LJ = groups(J)
A = np.asarray(Image.open(f"adult/mibi-adult-{sp}-304x312.png").convert("RGBA")).astype(float); GA, fA, LA = groups(A)
KEEP = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else {"teal", "mint", "gold"}     # the groups to match (S03: the coat was already the juvenile's, so teal and gold only)
T = {k: (fJ[m].mean(0), np.percentile(LJ[m], [5, 50, 95]), np.percentile(LA[GA[k]], [5, 50, 95])) for k, m in GJ.items() if k in KEEP and m.any() and GA[k].any()}
for size in ("304x312", "144x152", "96x88", "48x48"):
    p = f"adult/mibi-adult-{sp}-{size}.png"; a = np.asarray(Image.open(p).convert("RGBA")).astype(float); G, f, L = groups(a)
    for k, (col, tj, ta) in T.items():
        m = G[k]
        if not m.any(): continue
        Ln = np.interp(L[m], ta, tj); a[..., :3][m] = np.clip(col[None] * (Ln / max(col @ Lw, 1e-6))[:, None] * 255, 0, 255)
    Image.fromarray(np.rint(a).astype(np.uint8), "RGBA").save(p); print(size, {k: int(m.sum()) for k, m in G.items()})
