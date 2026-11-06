"""measure.py's crude masks on our RGBA render (numpy only): cream = opaque px below row 110 with L* > 60 and |a*| < 20 (mean RGB, R-B); body = L* < 45 and |a*| < 12 (L* p10/p50/p90); the iris: the orange in the far/near eye;
the outline (alpha > 0.5) for the blink diff; partial-alpha haze count."""
import numpy as np


def lab(rgb):
    c = np.asarray(rgb, float)
    l = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    X = l @ [0.4124, 0.3576, 0.1805] / 0.9505; Y = l @ [0.2126, 0.7152, 0.0722]; Z = l @ [0.0193, 0.1192, 0.9505] / 1.089
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def measure(img):
    """img: (h, w, 4) float 0..1 sRGB (non-premultiplied as Blender writes it)."""
    rgb, a = img[..., :3], img[..., 3]
    L, A, Bb = lab(rgb)
    op = a > 0.98
    rows = np.arange(img.shape[0])[:, None] * np.ones((1, img.shape[1]), int)
    out = {}
    m = op & (rows > 110) & (L > 60) & (np.abs(A) < 20)
    if m.sum() > 20:
        mean = (rgb[m] * 255).mean(0)
        out["cream_rgb"] = [round(float(x), 1) for x in mean]
        out["cream_R_minus_B"] = round(float(mean[0] - mean[2]), 1)
        out["cream_px"] = int(m.sum())
    m = op & (L < 45) & (np.abs(A) < 12)
    if m.sum() > 20:
        out["body_L_p10_50_90"] = [round(float(x), 1) for x in np.percentile(L[m], [10, 50, 90])]
    r, g, b = rgb[..., 0] * 255, rgb[..., 1] * 255, rgb[..., 2] * 255
    orange = op & (r > 150) & (g > 70) & (g < 190) & (b < 90) & (r - b > 110)
    out["orange_px"] = int(orange.sum())
    part = (a > 0.02) & (a < 0.98)
    out["partial_alpha_px"] = int(part.sum())
    return out


def iris_height(img, y0=60, y1=200, x0=0, x1=400):
    """Rows of the strongest orange blob (the eye), as the orange's vertical extent and its share of the iris+ring height."""
    rgb = img[..., :3] * 255
    o = (rgb[..., 0] > 150) & (rgb[..., 1] > 70) & (rgb[..., 1] < 190) & (rgb[..., 2] < 90) & (img[..., 3] > 0.98)
    o[:y0] = False; o[y1:] = False
    ys, xs = np.where(o)
    if not len(ys):
        return None
    return dict(rows=int(ys.max() - ys.min() + 1), cols=int(xs.max() - xs.min() + 1))
