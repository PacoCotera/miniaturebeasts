"""T-20261015-05 step 1: the painted journal (one Pro edit, source/raw/rw-lib-spread.jpg) fitted to the spread's rects. The edit came
back with its pages inset (leather ~90 px wide); the spec's frames need the pages at slice x 24-504 and 520-1000, y 16-504, with
16 px of boards. A separable piecewise-linear warp maps the painted edges (measured: boards x 14 and 1004, the pages' outer edges
x 98 and 926, the fold x 512; the pages' top y 18 and bottom y 488, the boards' bottom 495) onto the spec's (8, 24, 512, 1000, 1016;
16, 504, 512); the leather band is squeezed, the paper keeps its grain nearly unscaled (x1.16). Writes the 1024x522 book stage base.
usage: python3 -I fit-book.py EDIT.jpg OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
ep, out = sys.argv[1:3]
r = np.asarray(Image.open(ep).convert('RGB').resize((1024, 576), Image.LANCZOS)).astype(float)[27:27 + 522]
H, W = r.shape[:2]
xs_dst = [0, 8, 24, 512, 1000, 1016, 1023]; xs_src = [0, 14, 98, 512, 926, 1004, 1023]
ys_dst = [0, 8, 16, 504, 512, 521]; ys_src = [0, 2, 18, 488, 495, 521]
sx = np.interp(np.arange(W), xs_dst, xs_src); sy = np.interp(np.arange(H), ys_dst, ys_src)
YY, XX = np.meshgrid(sy, sx, indexing='ij')
o = np.stack([nd.map_coordinates(r[..., c], [YY, XX], order=1, mode='nearest') for c in range(3)], -1)
Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8)).save(out)
