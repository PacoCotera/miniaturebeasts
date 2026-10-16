"""T-20261015-01: dome-front-304x272 re-rendered (one Pro edit of the signed dome, source/raw/rw-inc-dome.jpg: a thick moulded sage
frame with a lit outer bevel, an inner lip, four recessed screws, a solid sill). The edit is mapped back exactly as the input was made
(the dome at x 52 in a 408x272 grey canvas, scaled x3) and given the SIGNED dome's own alpha, so the silhouette and the opening are
the same pixels as before and the bud, the nest and the light inside sit exactly as they did. Same id, same size.
usage: python3 -I cut-dome.py DOME.png EDIT.jpg OUT.png"""
import sys, numpy as np
from PIL import Image
dp, ep, out = sys.argv[1:4]
d = np.asarray(Image.open(dp).convert('RGBA')).astype(float)
e = np.asarray(Image.open(ep).convert('RGB').resize((408, 272), Image.LANCZOS)).astype(float)[:, 52:52 + 304]
o = np.dstack([e, d[..., 3]]); o[d[..., 3] == 0, :3] = 0
Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8), 'RGBA').save(out)
