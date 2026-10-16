"""Gate batch 1 (AD, 10-15, 0 MXN): the trait crops whose subject was cut from a larger picture along straight lines (S01 crown,
S01 eyes, S03 scales) read as a box inside their well. Each file, at every size:
1. the straight cut lines are found: a column (row) where a long run of the subject's boundary meets the crop's ground on one side
   (>= 15 % of the side's length);
2. the subject fades into the ground across F px from each cut line (F = 11 % of the short side, smoothstep), the corners as the
   product of the two ramps, so the cut-out dissolves into the floor; a natural silhouette (no cut line) is left crisp;
3. the crop's ground #162a37 is re-keyed to the Pods page ground (29, 35, 43): a pixel's share of the old ground (by its distance
   in colour, 0 at 24) moves to the new one, so anti-aliased edges keep their blend.
   --oval (the eyes and the scales, whose cut is a rectangle on every side): in place of 1-2, the subject fades out across the
   outer 24 % of the ellipse inscribed in its bounding box, so it reads as a close-up, not a cut-out.
   --no-top: a top-facing boundary is never a cut (the crown's head dome and leaves are the look itself).
usage: python3 -I rekey-cut-edges.py [--oval] [--no-top] FILE.png [...]   (in place)"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
OLD, NEW = np.array((22, 42, 55.)), np.array((29, 35, 43.))
OVAL = '--oval' in sys.argv; NOTOP = '--no-top' in sys.argv
for f in [x for x in sys.argv[1:] if not x.startswith('--')]:
    a = np.asarray(Image.open(f).convert('RGBA')).astype(float); H, W = a.shape[:2]; rgb = a[..., :3]
    dist = np.linalg.norm(rgb - OLD, axis=-1)
    bg = dist <= 6
    subj = ~bg
    subj = nd.binary_opening(subj, iterations=1)
    F = max(4.0, 0.11 * min(W, H))
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    ramp = np.ones((H, W))
    sm = lambda t: np.clip(t, 0, 1) ** 2 * (3 - 2 * np.clip(t, 0, 1))
    # vertical cut lines: columns x where subj[:, x] & bg[:, x-1] (left cut) for a long run
    for x in range(1, W):
        if (subj[:, x] & bg[:, x - 1]).sum() >= 0.15 * H: ramp *= np.where(xx >= x, sm((xx - x + 1) / F), 1)
    for x in range(0, W - 1):
        if (subj[:, x] & bg[:, x + 1]).sum() >= 0.15 * H: ramp *= np.where(xx <= x, sm((x - xx + 1) / F), 1)
    for y in range(1, H):
        if not NOTOP and (subj[y] & bg[y - 1]).sum() >= 0.15 * W: ramp *= np.where(yy >= y, sm((yy - y + 1) / F), 1)
    for y in range(0, H - 1):
        if (subj[y] & bg[y + 1]).sum() >= 0.15 * W: ramp *= np.where(yy <= y, sm((y - yy + 1) / F), 1)
    if OVAL:
        ys, xs = np.where(subj); cy, cx = (ys.min() + ys.max() + 1) / 2, (xs.min() + xs.max() + 1) / 2
        ry, rx = (ys.max() - ys.min() + 1) / 2, (xs.max() - xs.min() + 1) / 2
        r = np.hypot((xx + .5 - cx) / rx, (yy + .5 - cy) / ry)
        ramp = sm((1 - r) / 0.24)
    share = np.clip(1 - dist / 24, 0, 1)[..., None]                      # how much of the pixel is the old ground
    rk = rgb + (NEW - OLD) * share
    out = NEW * (1 - ramp[..., None]) + rk * ramp[..., None]
    a[..., :3] = np.clip(np.round(out), 0, 255)
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(f)
    print(f.split('/')[-1], 'cut-faded' if (ramp < 0.999).any() else 'no cut', int((ramp < 0.999).sum()))
