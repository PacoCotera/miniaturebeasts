"""Leaf colour on a 304 sprite (cadvenv python): the green pixels above row 110, L* p10/p50/p90, a*, b*.  python tools/leaf.py name=path ..."""
import sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from measure import lab
def leaf(path):
    im = np.array(Image.open(path).convert("RGBA")).astype(int); r, g, b, a = [im[..., i] for i in range(4)]
    m = (g >= r - 14) & (g > b + 14) & (a > 250); m[110:] = False
    L, A, B = lab(im[..., :3])
    return dict(px=int(m.sum()), L_p10_50_90=[round(float(x), 1) for x in np.percentile(L[m], [10, 50, 90])], a=round(float(np.median(A[m])), 1), b=round(float(np.median(B[m])), 1))
if __name__ == "__main__":
    print(json.dumps({kv.split("=")[0]: leaf(kv.split("=")[1]) for kv in sys.argv[1:]}))
