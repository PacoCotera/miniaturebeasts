"""Art director's ruling Round 2 (R2.1), 0 MXN: shake t1's small droplet (K2b cell 2 at x 59, y 291; canvas about x 42, y 225) came back shrunk.
It is restored in the bare key from the crested twin's droplet, at the twin's place: the twin's island there, dilated 1 px, copied over.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/restore-drop.py"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
c = np.asarray(Image.open('floor/S01/crested/mibi-adult-S01-shake-t1-304x312.png')); p = 'floor/S01/keys/mibi-adult-S01-base-shake-t1-304x312.png'; b = np.asarray(Image.open(p)).copy()
lab, n = nd.label(c[..., 3] > 0); i = lab[225, 42] or next(j for j in range(1, n + 1) if np.hypot(*(np.array(np.where(lab == j)).mean(1) - [225, 42])) < 4)
m = nd.binary_dilation(lab == i, iterations=1) & (c[..., 3] > 0); assert m.sum() < 200, m.sum()
b[m] = c[m]; Image.fromarray(b).save(p); print('restored px', int(m.sum()))
