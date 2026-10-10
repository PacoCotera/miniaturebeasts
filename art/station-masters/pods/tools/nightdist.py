"""The night regrade by distribution (pass 106; the Station art director's note on c8a6f122: 'reach the floor through distribution, not a global lift'). No paid call.
night_dist(im, ground_mid, ground_ramp, rim_rows) takes a night painting (RGB, seams already blended) and:
 1. recolours the moon rim's near-white strokes (rows above rim_rows) 70 percent toward (168, 182, 204), and cuts every pixel above L* 50 by 50 percent toward a 31 px median (the blooms), as in pass 102;
 2. desaturates the background (everything above the ground band, a smooth vertical ramp centred on ground_mid) 55 percent toward a deep warm umber-olive of its own luminance;
 3. scales the linear light of the background and of the ground band separately (bisection on the gain, a soft knee above 0.85) so the background's mean L* is 19 (range asked 14 to 20) and the ground band's is the least value at or under 45 that brings the whole picture's mean L* to 30.5 or more, the glow-moss staying as small local pools; R is kept at or above B.
Returns (image, report)."""
import numpy as np
from PIL import Image, ImageFilter
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
def to_lin(a): a = a / 255.0; return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
def to_srgb(l): l = np.clip(l, 0, 1); return np.clip(np.rint(np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255), 0, 255)
def knee(l): return np.where(l > 0.85, 0.85 + (1 - np.exp(-(l - 0.85) / 0.15)) * 0.15, l)
def night_dist(im, ground_mid, ground_ramp, rim_rows, bg_target=19.0, ground_cap=45.0, floor=30.5, pool_cap=False, rim_scale=1.0):
    a = np.asarray(im).astype(float); H, W, _ = a.shape; L = lstar(a); mx = a.max(2); mn = a.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    rim = ((L > 60) & (sat < 0.25)).astype(float); rim[rim_rows:] = 0; rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.0))).astype(float)[..., None] / 255.0
    a = a + 0.7 * rim * (np.array([168.0, 182.0, 204.0]) * rim_scale - a)
    med = np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((W // 2, H // 2), Image.LANCZOS).filter(ImageFilter.MedianFilter(15)).resize((W, H), Image.BICUBIC)).astype(float)
    L = lstar(a); w = np.asarray(Image.fromarray((np.clip((L - 50.0) / 12.0, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)[..., None] / 255.0
    a = a + 0.5 * w * (med - a)
    yy = np.arange(H, dtype=float)[:, None, None]; t = np.clip((yy - (ground_mid - ground_ramp / 2)) / ground_ramp, 0, 1); wg = t * t * (3 - 2 * t); wb = 1 - wg
    lin = to_lin(a); Yl = (lin @ np.array([0.2126, 0.7152, 0.0722]))[..., None]; tint = np.array([1.0, 0.80, 0.42]); tint = tint / (tint @ np.array([0.2126, 0.7152, 0.0722]))
    lin = lin * (1 - 0.55 * wb) + 0.55 * wb * Yl * tint
    def compress(l):
        """pass 110 (the art director's rule: at night at most 3 percent of pixels above L* 70): the highlights are pulled down by a soft curve on L*, 52 + 26 (1 - exp(-(L - 52) / 20)), so the glow pools shrink and stop shining for show"""
        Y = l @ np.array([0.2126, 0.7152, 0.0722]); Ls = np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y); L2 = np.where(Ls > 52, 52 + 26 * (1 - np.exp(-(Ls - 52) / 20.0)), Ls)
        Y2 = np.where(L2 > 8, ((L2 + 16) / 116) ** 3, L2 / 903.3); return l * (Y2 / np.maximum(Y, 1e-6))[..., None]
    def region(g_b, g_g):
        gain = wb * g_b + wg * g_g; l = knee(lin * gain)
        if pool_cap: l = compress(l)
        return to_srgb(l)
    def solve(target, mask_w, which, gfix):
        lo, hi = 0.02, 8.0
        for _ in range(40):
            g = (lo * hi) ** 0.5; c = region(g, gfix) if which == "b" else region(gfix, g)
            m = (lstar(c) * mask_w[..., 0]).sum() / mask_w.sum()
            if m < target: lo = g
            else: hi = g
        return (lo * hi) ** 0.5
    gb = solve(bg_target, np.broadcast_to(wb, (H, W, 1)), "b", 1.0); gg = 1.0
    for tg in np.arange(36.0, ground_cap + 0.01, 0.5):
        gg = solve(tg, np.broadcast_to(wg, (H, W, 1)), "g", gb); c = region(gb, gg)
        if lstar(c).mean() >= floor and c[..., 0].mean() >= c[..., 2].mean(): break
    L2 = lstar(c); wbm = np.broadcast_to(wb, (H, W, 1))[..., 0]; wgm = np.broadcast_to(wg, (H, W, 1))[..., 0]
    rep = {"mean L*": round(float(L2.mean()), 1), "background L*": round(float((L2 * wbm).sum() / wbm.sum()), 1), "ground L*": round(float((L2 * wgm).sum() / wgm.sum()), 1), "mean RGB": [round(float(v), 1) for v in c.reshape(-1, 3).mean(0)], "share above L* 70": round(float((L2 > 70).mean()), 3)}
    return Image.fromarray(c.astype(np.uint8)), rep
