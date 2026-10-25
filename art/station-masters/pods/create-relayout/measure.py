"""The measuring helpers of SJ-CR1's checks (UX's luminance-edge methods, as described in ux-layout.md section 1)."""
import numpy as np
from PIL import Image
lum = lambda a: np.asarray(a, float) @ [.2126, .7152, .0722]
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(float)
def opening(a):
    """[x, y, w, h] in screen px: the first panel pixel inside the bezel, by the luminance profile through the middle (stage y + 40)."""
    L = lum(a); H, W = L.shape
    row = L[H // 2 + 60: H // 2 + 100].mean(0)                   # rows 321-361 of the stage (clear of the tray's sides and the dish: x < 250 or x > 760)
    col = L[:, 400:430].mean(1)
    def edge(p, rng, step):                                        # first index, walking inwards, where the profile is below 70 % of the bezel's
        for i in rng:
            if p[i] < 0.62 * p[i - step] and p[i] < 100: return i
    x0 = edge(row, range(30, 200), 1)
    x1 = edge(row, range(W - 30, 800, -1), -1)
    y0 = edge(col, range(8, 100), 1)
    y1 = edge(col, range(H - 5, 400, -1), -1)
    return x0, y0 + 40, x1 + 1 - x0, y1 + 1 - y0
