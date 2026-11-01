"""Eye measures on a 304 sprite (cadvenv python): the two eyes' ring blobs (ivory, filled) and iris blobs (the AD's mask r-b>70, r>g+35, g<150); widths, centres, far/near, tilt of the eye line,
and the near eye's iris crescent / body L*.  python tools/eyes.py A.png [B.png ...]"""
import sys
from collections import deque
import numpy as np
from PIL import Image

def label(mask):
    lab = np.zeros(mask.shape, int); n = 0; blobs = []
    for y, x in zip(*np.where(mask)):
        if lab[y, x]:
            continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        blobs.append(np.array(pts))
    return blobs

def lstar(c):
    c = np.asarray(c, float) / 255; l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    Y = l @ [0.2126, 0.7152, 0.0722]; return 116 * np.cbrt(Y) - 16

def measure(path):
    im = np.array(Image.open(path).convert("RGBA")).astype(int); r, g, b, a = [im[..., i] for i in range(4)]
    iris = (r - b > 70) & (r > g + 35) & (g < 150) & (a > 200)
    ib = sorted(label(iris), key=len, reverse=True)[:2]
    out = []
    for bl in ib:
        cy, cx = bl.mean(0); y0, y1, x0, x1 = bl[:, 0].min(), bl[:, 0].max(), bl[:, 1].min(), bl[:, 1].max()
        # ring: ivory pixels (L*>70, low chroma) within 1.9 iris radii of the iris centre, connected to the iris's surroundings
        R = max(x1 - x0, y1 - y0) / 2 + 1
        yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
        near = (np.hypot(yy - cy, xx - cx) < R * 2.1)
        ivory = near & (a > 200) & (lstar(im[..., :3]) > 68) & (r - b < 70) & (r > 150)
        ys, xs = np.where(ivory | ((np.hypot(yy - cy, xx - cx) < R * 1.1) & (a > 200)))
        out.append(dict(c=(float(cx), float(cy)), iris_w=int(x1 - x0 + 1), iris_h=int(y1 - y0 + 1), ring_w=int(xs.max() - xs.min() + 1), ring_h=int(ys.max() - ys.min() + 1), area=len(bl)))
    out.sort(key=lambda d: d["c"][0])        # far eye (left in the stand view) first
    far, near = out
    tilt = np.degrees(np.arctan2(near["c"][1] - far["c"][1], near["c"][0] - far["c"][0]))
    return dict(far=far, near=near, ring_ratio=far["ring_w"] / near["ring_w"], iris_ratio=far["iris_w"] / near["iris_w"], eye_line_deg_far_up=tilt)

if __name__ == "__main__":
    for p in sys.argv[1:]:
        m = measure(p); print(p.split("/")[-2] + "/" + p.split("/")[-1], "far", m["far"], "near", m["near"], "ring ratio %.2f iris ratio %.2f tilt %.1f" % (m["ring_ratio"], m["iris_ratio"], m["eye_line_deg_far_up"]))
