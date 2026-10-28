"""0 MXN clean of a held habit key (ad-curl, 2026-10-28): the model's glow and dust blend with the magenta ground, so the key carries pink halo and pink clods.
Every pixel with a magenta cast (min(R, B) - G > 45) goes to alpha 0, then islands under 25 px are dropped. S02's browns and S03's teal and gold keep min(R, B) - G <= 0.
usage: python3 -I habitfix.py KEY.png ..."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert("RGBA")).copy(); r, g, b = [a[..., i].astype(int) for i in range(3)]
    shadow = (a[..., 3] == 110) & (r == 30) & (g == 26) & (b == 34)
    cast = (np.minimum(r, b) - g > 45) & ~shadow; n0 = int((cast & (a[..., 3] > 0)).sum()); a[cast, 3] = 0
    fig = (a[..., 3] > 0) & ~shadow; lab, n = nd.label(fig); sz = nd.sum(fig, lab, range(1, n + 1)); small = np.isin(lab, 1 + np.where(sz < 25)[0]); a[small, 3] = 0
    Image.fromarray(a).save(f); print(f, "cast px", n0, "specks", int(small.sum()))
