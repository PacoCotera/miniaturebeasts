"""The hand clean of the pixel pass: inside a few named regions, where the pass drifted from the approved painting (a stair turned
into a block, reeds into stumps, a stray post, a hard-edged shadow), the painting re-quantised to the same palette is put back,
cross-faded over 6 px at each region's edge, and the result snapped to the palette again. Elsewhere the pass stays.
usage: python3 -I px-keep.py PASS.png PAINTING_ON_PALETTE.png PALETTE_JSON OUT.png "x0,y0,x1,y1" ..."""
import json, sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float); b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(float)
cols = json.load(open(sys.argv[3]))["colours"]; PAL = np.array([[int(c["hex"][k:k + 2], 16) for k in (1, 3, 5)] for c in cols])
w = np.zeros(a.shape[:2]); yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; F = 6.0
for r in sys.argv[5:]:
    x0, y0, x1, y1 = map(int, r.split(","))
    d = np.minimum.reduce([xx - x0, x1 - xx, yy - y0, y1 - yy]).astype(float)       # distance inside the region
    w = np.maximum(w, np.clip((d + F / 2) / F, 0, 1))
rgb = a * (1 - w[..., None]) + b * w[..., None]
idx = (((rgb.reshape(-1, 1, 3) - PAL[None]) ** 2) * np.array([3, 4, 2])).sum(-1).argmin(1).reshape(a.shape[:2])
Image.fromarray(PAL[idx].astype(np.uint8)).save(sys.argv[4]); print(sys.argv[4])
