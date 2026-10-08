"""Down-render helpers: crop, key, resize and quantise painted sources onto the 48 ramps; clean; outline.

All functions work on numpy arrays; indices are palette indices with -1 for transparent.
"""
import numpy as np
from PIL import Image
import pal

P = pal.load()


def key_background(img, bg_rgb=None, tol=60):
    """Alpha-key a flat background (magenta by default, or a sampled colour) -> RGBA array."""
    a = np.asarray(img.convert("RGB")).astype(np.int64)
    if bg_rgb is None:
        bg_rgb = (255, 0, 255)
    d = np.abs(a - np.array(bg_rgb)).sum(axis=2)
    alpha = np.where(d < tol, 0, 255).astype(np.uint8)
    return np.dstack([a.astype(np.uint8), alpha])


def bbox(alpha, thresh=128):
    ys, xs = np.where(alpha >= thresh)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def resize_rgba(rgba, size):
    """Area-average resize (BOX) of an RGBA array; premultiplied so edges keep their colour."""
    im = Image.fromarray(rgba, "RGBA")
    pre = np.asarray(im).astype(np.float64)
    a = pre[..., 3:4] / 255.0
    prem = np.dstack([pre[..., :3] * a, pre[..., 3:4]])
    small = np.asarray(Image.fromarray(prem.astype(np.uint8), "RGBA").resize(size, Image.BOX)).astype(np.float64)
    al = small[..., 3:4]
    rgb = np.where(al > 0, small[..., :3] * 255.0 / np.maximum(al, 1), 0)
    return np.dstack([rgb, small[..., 3:4]]).astype(np.uint8)


def quantize(rgba, allowed=None, alpha_thresh=128):
    """RGBA array -> index array (-1 transparent), nearest colour among `allowed` palette indices."""
    rgb = rgba[..., :3].astype(np.int64)
    idx_all = np.arange(len(P.names)) if allowed is None else np.array(sorted(set(allowed)))
    sub = P.rgb[idx_all]
    a = rgb.reshape(-1, 3)
    d = ((a[:, None, 0] - sub[None, :, 0]) ** 2 * 3 + (a[:, None, 1] - sub[None, :, 1]) ** 2 * 4 + (a[:, None, 2] - sub[None, :, 2]) ** 2 * 2)
    idx = idx_all[np.argmin(d, axis=1)].reshape(rgb.shape[:2])
    idx = np.where(rgba[..., 3] >= alpha_thresh, idx, -1)
    return idx


def despeckle(idx, passes=1):
    """Replace isolated single pixels (no 4-neighbour of the same colour) by their majority neighbour."""
    h, w = idx.shape
    out = idx.copy()
    for _ in range(passes):
        src = out.copy()
        for y in range(h):
            for x in range(w):
                c = src[y, x]
                if c < 0:
                    continue
                nb = [src[y2, x2] for y2, x2 in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= y2 < h and 0 <= x2 < w]
                if c in nb:
                    continue
                nb = [n for n in nb if n >= 0]
                if nb:
                    out[y, x] = max(set(nb), key=nb.count)
    return out


def seamless(rgba, feather=12):
    """Make a ground tile repeat: blend each edge band with the opposite edge (wrap), before quantising."""
    f = rgba.astype(np.float64)
    h, w = f.shape[:2]
    out = f.copy()
    for i in range(feather):
        t = (i + 1) / (feather + 1) * 0.5  # up to 50% at the very edge
        out[:, i] = f[:, i] * (1 - t) + f[:, w - 1 - i] * t
        out[:, w - 1 - i] = f[:, w - 1 - i] * (1 - t) + f[:, i] * t
    f2 = out.copy()
    for i in range(feather):
        t = (i + 1) / (feather + 1) * 0.5
        out[i] = f2[i] * (1 - t) + f2[h - 1 - i] * t
        out[h - 1 - i] = f2[h - 1 - i] * (1 - t) + f2[i] * t
    return out.astype(np.uint8)


def darkest_of_ramp(c):
    r = pal.RAMP_OF.get(P.names[c], "N")
    names = pal.RAMPS[r]
    return P.index[names[0]], P.index[names[min(1, len(names) - 1)]]


def outline(idx):
    """The outline rule on a sprite with transparency: edge pixels take the darkest step of their own ramp,
    one step lighter on the lit (top/left) side. Never void: the N ramp's darkest edge is ink."""
    h, w = idx.shape
    out = idx.copy()
    for y in range(h):
        for x in range(w):
            c = idx[y, x]
            if c < 0:
                continue
            up = y == 0 or idx[y - 1, x] < 0
            left = x == 0 or idx[y, x - 1] < 0
            down = y == h - 1 or idx[y + 1, x] < 0
            right = x == w - 1 or idx[y, x + 1] < 0
            if not (up or left or down or right):
                continue
            dark, lighter = darkest_of_ramp(c)
            if P.names[dark] == "void":
                dark, lighter = P.index["ink"], P.index["night"]
            out[y, x] = lighter if (up or left) and not (down or right) else dark
    return out


def save_indexed(idx, path):
    """Save an index array as an RGBA PNG with exact palette colours (alpha 0 or 255)."""
    P.to_image(idx).save(path)


def to_rgba(idx):
    return np.asarray(P.to_image(idx))
