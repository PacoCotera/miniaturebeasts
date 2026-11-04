"""Chunk 11: the layered stand and the scaling from the master, in numpy (no Blender). The art is made once at the close stand's 304x312; every smaller picture is derived DOWN from it by the game's own build scale
(scale = figure height / the figure's drawn height; the face never scales; nothing is scaled up past the art): the figure, with the contact shadow laid under it where the view has one, is reduced once (Lanczos 3,
premultiplied alpha) and set bottom-centred on the place's own canvas, transparent around it.
Arrays are straight-alpha uint8 RGBA (h, w, 4)."""
import math

import numpy as np

ART = (304, 312)
SHADOW_H = 48
FEET_ROW = 24                        # the shadow canvas's row that sits on the stand's feet line


def ink_box(px, alpha=128, solid=200):
    """The drawn box [x, y, w, h] of a picture: the pixels with alpha >= `alpha`; the feet line is the last row with a solid pixel (alpha >= `solid`), so a soft fringe is not ground. None when nothing is drawn."""
    a = px[..., 3]
    ys, xs = np.where(a >= alpha)
    if not len(xs):
        return None
    y1 = int(ys.max())
    sy = np.where((a >= solid).any(1))[0]
    if len(sy):
        y1 = int(sy.max())
    return [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(y1 - ys.min() + 1)]


SHADOW_TINT = (6, 12, 18)            # a cool dark, never black
SHADOW_CORE = 140                    # the core's alpha (130 to 150); nothing is ever opaque
SHADOW_WIDE = 1.3                    # the ellipse's width, in feet spans
SHADOW_HALF_H = 7                    # at the stand's scale: the ink lies from the feet line -8 to +6 rows
SHADOW_SHIFT = 3                     # a few px to the right of the feet, where the key (top left) throws it


def feet_span(art, feet_row, depth=6, alpha=128):
    """The x range [x0, x1] of the drawn pixels in the last `depth` rows down to the feet line: both feet, with the gap between them."""
    a = art[max(0, feet_row - depth):feet_row + 1, :, 3]
    xs = np.where((a >= alpha).any(0))[0]
    return (int(xs.min()), int(xs.max())) if len(xs) else None


def contact_shadow(size, cx, feet_row, span, scale=1.0, core=SHADOW_CORE):
    """One soft ellipse under both feet: SHADOW_WIDE feet spans wide, SHADOW_HALF_H rows either side of the feet line less one, SHADOW_SHIFT px right of the feet (all at `scale`), the core at `core` alpha fading by a smoothstep to nothing at the rim,
    in a cool dark tint. `size` (w, h) is the canvas, `cx` the feet's centre column, `feet_row` the canvas row of the feet line. Straight-alpha uint8 RGBA; alpha 0 on every edge."""
    w, h = size
    a = SHADOW_WIDE * span / 2.0
    b = max(1.5, SHADOW_HALF_H * scale)
    x = np.arange(w)[None, :] + 0.5
    y = np.arange(h)[:, None] + 0.5
    r = np.sqrt(((x - (cx + SHADOW_SHIFT * scale)) / a) ** 2 + ((y - (feet_row - scale + 0.5)) / b) ** 2)
    t = np.clip((r - 0.25) / 0.75, 0, 1)
    al = core * (1 - t * t * (3 - 2 * t))
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = SHADOW_TINT
    out[..., 3] = np.round(al).astype(np.uint8)
    out[(r >= 1.0) | (al < 0.5), 3] = 0
    return out


def over(dst, src):
    """src laid over dst (straight alpha, the usual over); both uint8 RGBA of one size."""
    sa = src[..., 3:4].astype(np.float64) / 255.0
    da = dst[..., 3:4].astype(np.float64) / 255.0
    oa = sa + da * (1 - sa)
    rgb = np.where(oa > 0, (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-9), 0)
    return np.concatenate([np.round(rgb), np.round(oa * 255)], 2).clip(0, 255).astype(np.uint8)


def erase(dst, mask):
    """The layer's alpha is how much alpha the picture loses there (a part taken off)."""
    out = dst.copy()
    out[..., 3] = np.maximum(0, dst[..., 3].astype(np.int32) - mask[..., 3].astype(np.int32)).astype(np.uint8)
    return out


def compose(base, layers):
    """The art of a stand's looks: the base with its layers laid on it in order. layers: [(op, pixels)], op 'over' or 'erase'."""
    out = base.copy()
    for op, px in layers:
        out = erase(out, px) if op == "erase" else over(out, px)
    return out


def with_shadow(art, shadow, stand_feet):
    """The shadow (304x48, its FEET_ROW on the stand's feet line) laid under the art on a canvas extended below to hold it. Returns the canvas."""
    ch, cw = art.shape[:2]
    top = stand_feet - FEET_ROW
    rows = max(ch, top + shadow.shape[0])
    canvas = np.zeros((rows, cw, 4), np.uint8)
    y0, y1 = max(top, 0), top + shadow.shape[0]
    canvas[y0:y1] = shadow[y0 - top:]
    canvas[:ch] = over(canvas[:ch], art)
    return canvas


def taps(n, m):
    """For each of m output samples its source indexes and weights over n source samples (Lanczos 3)."""
    sc = n / m
    f = max(1.0, sc)
    out = []
    for o in range(m):
        c = (o + 0.5) * sc
        lo, hi = max(0, int(math.floor(c - 3 * f))), min(n - 1, int(math.ceil(c + 3 * f)))
        idx = np.arange(lo, hi + 1)
        x = np.abs((idx + 0.5 - c) / f)
        w = np.where(x < 1e-9, 1.0, np.where(x >= 3, 0.0, 3 * np.sin(np.pi * x) * np.sin(np.pi * x / 3) / (np.pi * np.pi * x * x + 1e-30)))
        w = w / w.sum()
        out.append((idx, w))
    return out


def reduce_by(src, s):
    """The picture reduced by the factor s (<= 1), premultiplied, Lanczos 3. Returns straight-alpha uint8."""
    h, w = src.shape[:2]
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    a = src[..., 3:4].astype(np.float64) / 255.0
    pre = np.concatenate([src[..., :3].astype(np.float64) * a, a], 2)
    mid = np.zeros((h, nw, 4))
    for x, (idx, wt) in enumerate(taps(w, nw)):
        mid[:, x] = np.tensordot(pre[:, idx], wt, axes=([1], [0]))
    out = np.zeros((nh, nw, 4))
    for y, (idx, wt) in enumerate(taps(h, nh)):
        out[y] = np.tensordot(mid[idx], wt, axes=([0], [0]))
    raw = out[..., 3:4]
    al = np.clip(raw, 0, 1)
    rgb = np.where(raw > 1e-6, out[..., :3] / np.maximum(raw, 1e-6), 0)        # the colour is taken from the unclipped alpha: a ringing overshoot is not a brighter colour
    return np.concatenate([np.clip(rgb, 0, 255), al * 255], 2).round().clip(0, 255).astype(np.uint8)


def place(pic, w, h):
    """The picture bottom-centred on a transparent w x h canvas (the game's rule: the foot of the figure on the foot of the picture)."""
    out = np.zeros((h, w, 4), np.uint8)
    ph, pw = pic.shape[:2]
    ox, oy = (w - pw) >> 1, h - ph
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    cw, chh = min(pw - sx0, w - dx0), min(ph - sy0, h - dy0)
    if cw > 0 and chh > 0:
        out[dy0:dy0 + chh, dx0:dx0 + cw] = pic[sy0:sy0 + chh, sx0:sx0 + cw]
    return out


def scale_factor(figure_h, fig_box):
    """The one factor of the game's build: the figure's height / its drawn height. Never up past the art."""
    return min(1.0, figure_h / fig_box[3])


def from_master(art, fig_box, figure_h, size, shadow=None, stand_feet=None):
    """A sprite made from the master art: `art` (304x312, base with the looks laid on), the figure's drawn box (ink_box of the art), the height the view draws it, the place's size (w, h), and the
    contact shadow (304x48) when the view has one. Returns (picture, factor). The face is never scaled by anything but this one factor."""
    s = scale_factor(figure_h, fig_box)
    src = with_shadow(art, shadow, stand_feet) if shadow is not None else art
    return place(reduce_by(src, s), size[0], size[1]), s


def components(mask):
    """8-connected components of a boolean mask: a label image (0 = none) and the pixel count of each label."""
    lab = np.zeros(mask.shape, np.int32)
    counts = [0]
    h, w = mask.shape
    for y0, x0 in zip(*np.where(mask)):
        if lab[y0, x0]:
            continue
        n = len(counts)
        lab[y0, x0] = n
        stack, c = [(y0, x0)], 0
        while stack:
            y, x = stack.pop()
            c += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
        counts.append(c)
    return lab, counts


def layer_from_pair(base, on, thr=3, grow=2, min_px=40, min_erase=8):
    """The layers a look adds to a stand: from the base (look off) and the same render with the look on. Returns (over, erase): an over layer holds the look's own pixels wherever the two differ, widened by `grow` px so
    the soft edge comes with it; an erase layer holds the alpha the look takes off the base (None when it takes none). Either is None when empty."""
    d = np.abs(on.astype(np.int32) - base.astype(np.int32))
    diff = (d[..., :3].max(2) > thr) | (d[..., 3] > thr)
    lost = base[..., 3].astype(np.int32) - on[..., 3].astype(np.int32)
    er = lost > thr
    if min_px:                                         # the denoiser moves a few pixels far from the look: only a patch of at least min_px pixels (or a larger one it touches) is the look's own
        for mk, mn in ((diff, min_px), (er, min_erase)):
            lab, cnt = components(mk)
            small = np.isin(lab, [i for i, c in enumerate(cnt) if i and c < mn])
            mk &= ~small
    m = diff & ~er if er.any() else diff
    k = np.pad(m, grow)
    wide = np.zeros_like(m)
    for dy in range(-grow, grow + 1):
        for dx in range(-grow, grow + 1):
            wide |= k[grow + dy:grow + dy + m.shape[0], grow + dx:grow + dx + m.shape[1]]
    ov = None
    if m.any():
        ov = np.zeros_like(on)
        ov[wide] = on[wide]
    ea = None
    if er.any():
        ea = np.zeros_like(on)
        ea[..., 3] = np.where(er, lost, 0).astype(np.uint8)
    return ov, ea
