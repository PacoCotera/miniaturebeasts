"""IA2 proof: the recut stage mocked into the builder's 1x capture (public station-gate fix14/incubator-growing.png, drawn on the
IA1 stage ed5bd3ff). Capture pixels equal to the IA1 stage (within 2) take the IA2 stage; the base block (with its plaque and foot
light) is lifted 16 px to the spec's 440; the rail's well is shown at 48 (today) and at 40 (the leaf point, option b), with the
outer arc's top leaf placed at its slot (504, 90) to show the clearance. The stamp and code stay where the capture has them.
usage: python3 -I mock-ia2.py CAPTURE.png IA1_STAGE.png IA2_STAGE.png WELL48.png WELL40.png LEAF.png OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
cap, old, new, w48, w40, leaf, out = sys.argv[1:8]; os.makedirs(out, exist_ok=True)
C = np.asarray(Image.open(cap).convert('RGB')).astype(float)
O = np.asarray(Image.open(old).convert('RGB')).astype(float); N = np.asarray(Image.open(new).convert('RGB')).astype(float)
def screen(st):
    s = C.copy(); s[40:562] = st; return s
OS, NS = screen(O), screen(N)
eq = np.abs(C - OS).max(-1) <= 2; eq[:40] = False; eq[562:] = False
M = np.where(eq[..., None], NS, C)
# the base, lifted 16: its pixels are the capture's non-stage pixels in its rect (344, 456, 336, 96), the foot light included
bx0, by0, bw, bh = 344, 456, 336, 96
reg = ~eq[by0:by0 + bh, bx0:bx0 + bw]
src = C[by0:by0 + bh, bx0:bx0 + bw]
vac = M[by0:by0 + bh, bx0:bx0 + bw]; vac[reg] = NS[by0:by0 + bh, bx0:bx0 + bw][reg]   # what the base leaves shows the stage
dst = M[by0 - 16:by0 - 16 + bh, bx0:bx0 + bw]; dst[reg] = src[reg]
def over(base, im, x, y):
    a = np.asarray(Image.open(im).convert('RGBA')).astype(float); h, w = a.shape[:2]; al = a[..., 3:] / 255
    base[y:y + h, x:x + w] = base[y:y + h, x:x + w] * (1 - al) + a[..., :3] * al
# the well: 4 full tabs, run 560 centred on 512 -> x0 232, the well at (224, 40); not-tab = capture equal to the IA1 stage + 48 well
W48 = OS.copy(); over(W48, w48, 224, 40)
nottab = np.zeros(eq.shape, bool); nottab[40:88, 224:800] = (np.abs(C - W48).max(-1) <= 3)[40:88, 224:800]
res = {}
for n, wp in (('48', w48), ('40', w40)):
    S_ = NS.copy(); over(S_, wp, 224, 40)
    R = M.copy(); R[nottab] = S_[nottab]
    res[n] = R
    Image.fromarray(np.clip(np.round(R), 0, 255).astype(np.uint8)).save(os.path.join(out, f'mock-incubator-growing-well{n}-1x.png'))
    L = R.copy(); over(L, leaf, 504, 90); res[n + 'leaf'] = L
# the leaf point at 1x: the rail's band with the outer top leaf at its slot, well 48 over well 40
band = np.concatenate([res['48leaf'][24:136, 192:832], np.full((4, 640, 3), 255.0), res['40leaf'][24:136, 192:832]], 0)
Image.fromarray(np.clip(np.round(band), 0, 255).astype(np.uint8)).save(os.path.join(out, 'leaf-point-well48-over-well40-1x.png'))
# before/after at 1x: the capture over the mock (well 48)
ba = np.concatenate([C, np.full((4, 1024, 3), 255.0), res['48']], 0)
Image.fromarray(np.clip(np.round(ba), 0, 255).astype(np.uint8)).save(os.path.join(out, 'before-after-ia2-1x.png'))
print('stage px swapped', int(eq.sum()), 'base px lifted', int(reg.sum()), 'well px', int(nottab.sum()))
