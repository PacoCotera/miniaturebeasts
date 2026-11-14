"""Round 2 sprite measures on the 304 sprites of master / SDF / round 1 / round 2 (cadvenv python), the AD gate's crude masks (see ad-gate-mesh-loika.md, Samples):
cream = opaque pixels below row 110 with L* > 60 and |a*| < 20 (median L*, b*); body = L* < 45 and |a*| < 12 (L* p10/p50/p90, median b*); the head's forward-most point (the
non-leaf opaque pixel with the lowest x, rows < 200); the head's top at x = 180 (first non-leaf opaque row); the eye line; the partially transparent pixels farther than 4 px from
the creature (the shadow catcher's haze) and their count.   python tools/measure.py name=path ...  -> JSON"""
import sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import eyes as EY

def lab(rgb):
    c = np.asarray(rgb, float) / 255; l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    X = l @ [0.4124, 0.3576, 0.1805] / 0.9505; Y = l @ [0.2126, 0.7152, 0.0722]; Z = l @ [0.0193, 0.1192, 0.9505] / 1.089
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)

def measure(path):
    im = np.array(Image.open(path).convert("RGBA")).astype(int); r, g, b, a = [im[..., i] for i in range(4)]
    L, A, Bb = lab(im[..., :3]); op = a > 250
    out = {}
    rows = np.arange(im.shape[0])[:, None] * np.ones((1, im.shape[1]), int)
    m = op & (rows > 110) & (L > 60) & (np.abs(A) < 20)
    out["cream_L"], out["cream_b"] = float(np.median(L[m])), float(np.median(Bb[m]))
    m = op & (L < 45) & (np.abs(A) < 12)
    out["body_L_p10_50_90"] = [round(float(x), 1) for x in np.percentile(L[m], [10, 50, 90])]; out["body_b"] = float(np.median(Bb[m]))
    leaf = (g >= r - 14) & (g > b + 14)
    solid = op & ~leaf
    ys, xs = np.where(solid & (rows < 200))
    x0 = xs.min(); out["head_front_x"] = int(x0); out["head_front_y"] = float(np.median(ys[xs <= x0 + 1]))
    col = np.where(solid[:, 180])[0]; out["head_top_y_at_x180"] = int(col.min())
    e = EY.measure(path); out["eye_ring_ratio"] = round(e["ring_ratio"], 2); out["eye_line_deg_far_up"] = round(e["eye_line_deg_far_up"], 1)
    # haze: partially transparent pixels away from the creature
    near = np.zeros_like(op)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            near |= np.roll(np.roll(op, dy, 0), dx, 1)
    part = (a > 0) & (a < 250)
    out["partial_alpha_px"] = int(part.sum()); out["partial_far_from_creature_px"] = int((part & ~near).sum())
    out["alpha_cols"] = [int(np.where((a > 0).any(0))[0].min()), int(np.where((a > 0).any(0))[0].max())]
    return out

if __name__ == "__main__":
    res = {}
    for kv in sys.argv[1:]:
        k, p = kv.split("="); res[k] = measure(p)
    print(json.dumps(res, indent=1))
