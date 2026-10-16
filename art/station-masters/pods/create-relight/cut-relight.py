"""Fix 5 Create CA1 + CA3, the cut of the studio edit (source/raw/ca1-create-relight.jpg, 1 Pro request) back to the
signed ids, by hand: the edit is reduced by area to the 1024x576 input frame; everything outside the bench's dark interior (the
housing, frame, screws, handles) is the signed stage pixel for pixel; the painted dish is moved 62 px up and 32 px left so its centre sits under
the pod's feet (axis 160, feet 408 on screen), its old place refilled from the edit's own wall light (a normalised blur with the
dish masked out, plus the wall grain); the tray is cut out as chamber-back-400x320 with the signed alpha.
By default the dish is taken out (its hand move left seams at 1x); --keep-dish pastes it moved.
usage: cut-relight.py SLICES_DIR EDIT.jpg OUT_DIR [--keep-dish]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, ed, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
E = np.asarray(Image.open(ed).convert('RGB').resize((1024, 576), Image.LANCZOS)).astype(float)
st = np.asarray(Image.open(os.path.join(sl, 'room-bench-stage-create.png')).convert('RGBA')).astype(float)
cb = np.asarray(Image.open(os.path.join(sl, 'chamber-back-400x320.png')).convert('RGBA')).astype(float)
H, W = 522, 1024; yy, xx = np.mgrid[0:H, 0:W].astype(float)
lum = st[..., :3] @ [.2126, .7152, .0722]
lab, n = nd.label(lum < 80); sz = nd.sum(np.ones_like(lum), lab, range(1, n + 1)); inner = nd.binary_fill_holes(lab == (np.argmax(sz) + 1))
tray = np.zeros((H, W), bool); tray[192:512, 312:712] = True
paint = inner | tray
new = st.copy(); new[..., :3] = np.where(paint[..., None], E[:H], st[..., :3])
# the dish: an ellipse in the edit, centre (192, 408), half-axes 92 x 66 incl. its soft shadow
CX, CY, RX, RY, DY, DX = 192, 408, 92, 66, -62, -32
d = np.sqrt(((xx - CX) / RX) ** 2 + ((yy - CY) / RY) ** 2); dm = d <= 1.0
soft = np.clip((1.0 - d) / 0.12, 0, 1)
dish = E[:H].copy()
known = ~nd.binary_dilation(dm, iterations=10) & inner
# refill: the signed stage's own paint there (its horizon line and grain), relit by the edit's light (the ratio of the two,
# smoothed, with the dish masked out)
def nb(img): return nd.gaussian_filter(np.where(known[..., None], img, 0), (18, 18, 0)) / np.maximum(nd.gaussian_filter(known.astype(float), 18)[..., None], 1e-6)
gain = nb(E[:H]) / np.maximum(nb(st[..., :3]), 1)
hole = nd.binary_dilation(dm, iterations=10) & inner
hs = nd.gaussian_filter(hole.astype(float), 3)[..., None] * inner[..., None]
new[..., :3] = new[..., :3] * (1 - hs) + st[..., :3] * gain * hs
# paste the dish shifted up
src = np.roll(np.roll(dish, DY, axis=0), DX, axis=1); sm = np.roll(np.roll(soft, DY, axis=0), DX, axis=1)[..., None]
if '--keep-dish' in sys.argv: new[..., :3] = new[..., :3] * (1 - sm) + src * sm
new[..., :3] = np.clip(np.round(new[..., :3]), 0, 255)
Image.fromarray(new.astype(np.uint8), 'RGBA').save(os.path.join(out, 'room-bench-stage-create.png'))
c = cb.copy(); c[..., :3] = new[192:512, 312:712, :3]
Image.fromarray(c.astype(np.uint8), 'RGBA').save(os.path.join(out, 'chamber-back-400x320.png'))
print('outside interior changed', int(((np.abs(new - st).sum(-1) > 0) & ~paint).sum()))
