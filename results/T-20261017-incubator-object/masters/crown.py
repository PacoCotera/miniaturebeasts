# The capsule's crown: every painting crops the capsule's top at the frame edge (the shell is 200 px wide at row 0).
# The outer outline at rows 20-80 fits a circle (centre x 509, y 164, radius 190), so the dome's top is at y -26.
# The missing 26 rows are drawn by code from the shell's own top rows: each new row is the row-2 slate profile resampled
# to the circle's width there, darkening slightly toward the top, with a soft edge. Output: the shell layers extended to
# 1024 x 626 (26 rows added on top); every other layer is padded the same way so they stay registered.
import sys, numpy as np
from PIL import Image, ImageFilter
CUT = sys.argv[1]
XC, YC, R, ADD = 509, 164, 190, 26
def extend(name, crown):
    im = np.asarray(Image.open(f'{CUT}/{name}-1024x600.png').convert('RGBA')).astype(float)
    out = np.zeros((600 + ADD, 1024, 4)); out[ADD:] = im
    if crown:
        src = im[2]; xs = np.nonzero(src[:, 3] > 128)[0]; x0, x1 = xs.min(), xs.max()
        prof = src[x0:x1 + 1, :3]
        for y in range(-ADD, 0):
            hw = np.sqrt(max(R * R - (y - YC) ** 2, 0))
            if hw < 2: continue
            a, b = XC - hw, XC + hw
            xx = np.arange(int(np.floor(a)), int(np.ceil(b)) + 1)
            t = (xx - a) / (b - a)
            row = np.array([np.interp(t, np.linspace(0, 1, len(prof)), prof[:, c]) for c in range(3)]).T
            row *= 1 - 0.18 * (-y / ADD)                                  # the crown turns from the light, a touch darker
            edge = np.clip(np.minimum(xx - a, b - xx), 0, 1.5) / 1.5      # a soft outline
            out[y + ADD, xx, :3] = row; out[y + ADD, xx, 3] = 255 * edge
        top = out[:ADD + 2].copy()                                        # soften the crown's top curve a little
        al = Image.fromarray(top[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
        out[:ADD, :, 3] = np.asarray(al).astype(float)[:ADD]
    Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(f'{CUT}/{name}-1024x626.png')
for n in ('capsule-shell', 'capsule-shell-dusk'):
    extend(n, True)
for n in ('capsule-interior-day', 'capsule-interior-dusk', 'capsule-bar-lit', 'capsule-door-open', 'capsule-seal-ring', 'capsule-glass-closed'):
    extend(n, False)
print('crown added: rows -26..-1')
