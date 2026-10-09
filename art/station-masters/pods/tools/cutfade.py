"""Pass 60: the keyed fade along a crop's straight cut edges (exec'd by traitpics2.py and recut75.py, so no import is needed under python3 -I).
fade_cut(img, ground): `img` is the crop's content (the part inside the centred 75 percent box) on the ground; a side of the box is a CUT edge where the painting continues past it: at least RUN_MIN creature pixels
(a pixel differing from the ground by more than 6) lie on the box's outermost row or column. Along a cut edge alpha goes from 1 to 0 into the ground on a smoothstep over WIDTH px, finishing at the box's edge (alpha 1 at WIDTH px
inside, 0 on the edge row); the fade is strongest across the run of creature pixels on the edge and tapers to nothing over WIDTH px either side of it along the edge, so a silhouette that merely comes near the box is left alone.
Returns (the faded image, the list of cut edges with their run lengths)."""
import numpy as np
from PIL import Image
RUN_MIN, WIDTH = 8, 12
def _smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def _box1d(v, r):
    k = np.ones(2 * r + 1); return np.clip(np.convolve(v, k, mode="same"), 0, 1)
def fade_cut(img, ground):
    a = np.asarray(img.convert("RGB")).astype(float); h, w = a.shape[:2]; g = np.array(ground, float); m = np.abs(a - g).max(2) > 6; keep = np.ones((h, w)); edges = []
    sides = {"top": (m[0, :], 0, 1), "bottom": (m[h - 1, :], 0, -1), "left": (m[:, 0], 1, 1), "right": (m[:, w - 1], 1, -1)}
    for name, (line, axis, sgn) in sides.items():
        run = int(line.sum())
        if run < RUN_MIN: continue
        edges.append({"edge": name, "run_px": run})
        lateral = _box1d(line.astype(float), WIDTH)                        # 1 along the run, tapering to 0 over WIDTH px either side
        n = h if axis == 0 else w
        d = np.arange(n if axis == 0 else n)                                # distance in px from the edge (0 on the edge row)
        if name in ("top", "left"): dist = np.arange(h if axis == 0 else w).astype(float)
        else: dist = (np.arange(h if axis == 0 else w)[::-1]).astype(float)
        ramp = _smooth(dist / WIDTH)                                        # 0 on the edge, 1 at WIDTH px in (finished inside the box)
        if axis == 0: f = 1 - lateral[None, :] * (1 - ramp[:, None])
        else: f = 1 - lateral[:, None] * (1 - ramp[None, :])
        keep = keep * f
    out = g + (a - g) * keep[..., None]
    return Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)), edges
