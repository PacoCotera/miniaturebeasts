"""The cream and the body of a three.js screenshot, in the same masks as measure.py (cream: L* > 60 and |a*| < 20; body: L* < 45 and |a*| < 12, off the viewer's ground): python tjsmeasure.py PNG ... (cadvenv)"""
import sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from measure import lab
def tjs_measure(p):
    im = np.array(Image.open(p).convert("RGB")).astype(int)
    L, A, B = lab(im)
    ground = (np.abs(im - np.array([0xe9, 0xe7, 0xe2])).sum(-1) < 12)
    cream = ~ground & (L > 60) & (np.abs(A) < 20) & (B > 8)
    body = ~ground & (L < 45) & (np.abs(A) < 12)
    return dict(cream_L=round(float(np.median(L[cream])), 1), cream_b=round(float(np.median(B[cream])), 1), body_L_p10_50_90=[round(float(x), 1) for x in np.percentile(L[body], [10, 50, 90])], body_b=round(float(np.median(B[body])), 1))


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(p.split("/")[-1], json.dumps(tjs_measure(p)))
