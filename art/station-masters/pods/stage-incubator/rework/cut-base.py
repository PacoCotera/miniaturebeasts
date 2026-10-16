"""T-20261015-01: base-336x96 re-rendered (one Pro edit of the signed base, source/raw/rw-inc-base.jpg: a moulded sand housing block, a
lit rounded top edge, two recessed screws, the name plate as a real recessed slot at the same rect, local 104, 40, 128 x 32). Mapped
back as the input was made (the base at y 64 in a 336x224 grey canvas, x3), with the SIGNED base's alpha and its own sage foot light
line (the pixels where the signed base is sage), so the outline, the plate and the foot light are where they were. Same id and size.
usage: python3 -I cut-base.py BASE.png EDIT.jpg OUT.png"""
import sys, numpy as np
from PIL import Image
bp, ep, out = sys.argv[1:4]
b = np.asarray(Image.open(bp).convert('RGBA')).astype(float)
e = np.asarray(Image.open(ep).convert('RGB').resize((336, 224), Image.LANCZOS)).astype(float)[64:160]
sage = (b[..., 1] > b[..., 0] + 4) & (b[..., 3] > 0)
rgb = np.where(sage[..., None], b[..., :3], e)
o = np.dstack([rgb, b[..., 3]]); o[b[..., 3] == 0, :3] = 0
Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8), 'RGBA').save(out)
print('sage foot px kept', int(sage.sum()))
