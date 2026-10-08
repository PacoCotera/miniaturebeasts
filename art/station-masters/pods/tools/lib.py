import numpy as np
from PIL import Image, ImageFilter
RAW = "source/raw/"
def load(n):
    return Image.open(RAW + n).convert("RGB")
def lanczos(im, size): return im.resize(size, Image.LANCZOS)
def key_magenta(im, lo=55, hi=150):
    """Straight alpha from a flat magenta key: alpha from the distance to the key in the green-down direction; despill."""
    a = np.asarray(im.convert("RGB")).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # magenta-ness: how far both r and b exceed g
    m = np.minimum(r, b) - g
    alpha = 1 - np.clip((m - lo) / (hi - lo), 0, 1)
    # despill: pull r and b toward g where they exceed it, in proportion to the key's share
    spill = np.clip(np.minimum(r, b) - np.maximum(g, 0), 0, None) * (1 - alpha) * 0 
    rr = np.where(alpha < 1, np.minimum(r, g + (1 - alpha) * 0 + np.maximum(0, (r - g)) * alpha), r)
    bb = np.where(alpha < 1, np.minimum(b, g + np.maximum(0, (b - g)) * alpha), b)
    out = np.dstack([rr, g, bb, alpha * 255])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
def color_to_alpha(im, bg, floor=0.03):
    """Straight alpha from a flat background colour: the least alpha that reproduces the pixel over that colour."""
    a = np.asarray(im.convert("RGB")).astype(float); bg = np.array(bg, float)
    d = a - bg
    up = np.where(d > 0, d / np.maximum(255 - bg, 1), -d / np.maximum(bg, 1))
    al = up.max(2)
    al = np.where(al < floor, 0, al)
    al = np.clip(al * 1.0, 0, 1)
    safe = np.maximum(al, 1e-3)[..., None]
    col = bg + d / safe
    out = np.dstack([np.clip(col, 0, 255), al * 255])
    return Image.fromarray(out.astype(np.uint8), "RGBA")
def bbox_alpha(im, thr=40):
    al = np.asarray(im)[..., 3]; ys, xs = np.where(al > thr)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
def border_median(im, n=20):
    a = np.asarray(im.convert("RGB")).astype(float)
    e = np.concatenate([a[:n].reshape(-1, 3), a[-n:].reshape(-1, 3), a[:, :n].reshape(-1, 3), a[:, -n:].reshape(-1, 3)])
    return np.median(e, 0)
def nine(src, w, h, l, t, r, b, ls=None):
    """9-slice src to (w,h). l,t,r,b are the source insets; they are drawn at the same pixel size after the source is scaled by ls (scale of the source to 1x)."""
    s = ls or 1.0
    sw, sh = src.size
    L, T, R, B = [max(1, round(v * s)) for v in (l, t, r, b)]
    srcs = src.resize((max(1, round(sw * s)), max(1, round(sh * s))), Image.LANCZOS)
    sw2, sh2 = srcs.size
    out = Image.new("RGBA", (w, h))
    xs = [(0, L, 0, L), (L, sw2 - R, L, w - R), (sw2 - R, sw2, w - R, w)]
    ys = [(0, T, 0, T), (T, sh2 - B, T, h - B), (sh2 - B, sh2, h - B, h)]
    for (sx0, sx1, dx0, dx1) in xs:
        for (sy0, sy1, dy0, dy1) in ys:
            if dx1 <= dx0 or dy1 <= dy0: continue
            p = srcs.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.LANCZOS)
            out.paste(p, (dx0, dy0))
    return out
def smooth1d(a, sigma, axis=0):
    k = int(sigma * 3) * 2 + 1; x = np.arange(k) - k // 2; g = np.exp(-x**2 / (2 * sigma**2)); g /= g.sum()
    a = np.moveaxis(a, axis, 0); pad = [(k // 2, k // 2)] + [(0, 0)] * (a.ndim - 1)
    p = np.pad(a, pad, mode="edge"); out = sum(g[i] * p[i:i + a.shape[0]] for i in range(k))
    return np.moveaxis(out, 0, axis)
