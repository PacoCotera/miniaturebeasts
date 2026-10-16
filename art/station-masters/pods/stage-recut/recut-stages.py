# Fix 5 Pods P-A1 and P-A2: the chapter and overview stages without their painted grey plates (and, on the overview, the old stamp
# case at 856-1004 x 386-534), cut by hand from the signed base stage (room-bench-stage, the same painting without plates):
# the right part of each stage is taken from the base, with a 24 px feathered seam; the base's lower-right hose, which would run under
# the page, is painted out with the case's own floor from 320 px to its left, feathered over 6 px.
# usage: python3 -I recut-stages.py SLICES_DIR OUT_DIR
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
L = lambda n: np.asarray(Image.open(os.path.join(sl, n + '.png')).convert('RGB')).astype(float)
base = L('room-bench-stage')
# 1. the base without its lower-right hose: grey pixels (|R-B| small) and the brass tips in the hose's box, grown 3 px
y0, y1, x0, x1 = 222, 492, 655, 952                                       # inside the floor only (the wall starts at x 954)
box = base[y0:y1, x0:x1]
floorc = np.median(base[300:480, 380:640].reshape(-1, 3), 0)              # the case floor's own colour
dev = np.abs(box - floorc).max(-1)
chroma = box[..., 0] - box[..., 2]
m = ((dev > 20) & ((chroma < 14) | (box.mean(-1) < floorc.mean() - 18))) | ((box[..., 0] > box[..., 2] + 45) & (box[..., 0] > 120))   # grey or dark (the hose and its shadow) or the brass tips
m = nd.binary_closing(m, iterations=3)
lab, n = nd.label(m); sizes = nd.sum(m, lab, range(1, n + 1)); m = np.isin(lab, 1 + np.where(sizes > 400)[0])
m = nd.binary_dilation(m, iterations=4)                                   # its soft shadow
m[:3] = m[-3:] = False; m[:, :3] = m[:, -3:] = False
w = np.clip(nd.gaussian_filter(m.astype(float), 3.0) * 1.8, 0, 1)[..., None]
src = base[y0:y1, x0 - 320:x1 - 320]
G = lambda a, s_=14: nd.gaussian_filter(a, (s_, s_, 0) if a.ndim == 3 else s_)
keep = (1 - w)
local = G(box * keep) / np.maximum(G(keep), 1e-3)                         # the floor's own tone round the hose
fill = np.clip(src - G(src) + local, 0, 255)                              # the source's grain at the surrounding floor's tone
clean = base.copy(); clean[y0:y1, x0:x1] = box * (1 - w) + fill * w
Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8)).save(os.path.join(out, 'base-no-hose.png'))
def recut(name, xcut):
    st = L(name); o = st.copy(); W = 24
    t = np.clip((np.arange(1024) - (xcut - W)) / W, 0, 1)[None, :, None]  # 0 left of the seam, 1 from xcut on
    o = st * (1 - t) + clean * t
    Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).save(os.path.join(out, name + '.png'))
recut('room-bench-stage-chapter', 418)                                   # the plate starts at stage x 427
recut('room-bench-stage-overview', 578)                                  # the plate starts at stage x 586
print('hose px', int(m.sum()))
