"""Probe rework (AD, 10-15): the tier-2 docked picture composed by hand from two aligned Pro edits of the same tier-1 picture
(rw-probe-t1-cradle and rw-probe-t2-cradle-b; background differs by a median 5 levels). Tier 1 is the base, so the cradle (both side
arms) is identical across t1, t2 and the empty cradle. From the tier-2 edit, only where it differs from tier 1 by more than 60 (grown
3 px, feathered 2 px) and only inside two boxes: the add-on module and the side lens (x 540-736, y 313-694) and the fourth plate
in front of the right arm (x 569-647, y 721-834). The tier-2 edit's left side, where it painted a plate over the cradle's left arm,
is not taken: the arm stays.
usage: python3 -I compose-t2.py T1.jpg T2.jpg OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float); b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
d = np.abs(a - b).sum(-1); m = nd.binary_dilation(d > 60, iterations=3)
box = np.zeros(m.shape, bool); box[313:694, 540:736] = True; box[721:834, 569:647] = True
w = nd.gaussian_filter((m & box).astype(float), 2.0)
o = a * (1 - w[..., None]) + b * w[..., None]
Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8)).save(sys.argv[3])
