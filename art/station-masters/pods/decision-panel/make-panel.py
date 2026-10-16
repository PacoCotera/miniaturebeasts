"""T-20261016-47 (specs/station-decision-panel-spec.md §1.2-1.3, work-queue): the decision panel's look, as masters. By hand in code, no paid call.
The owner (13:26): "visually we must make them very interesting. not sold on that cream color and lots of text." So: no cream paper card. The panel
is the device's own construction, as the style guide asks of every module and card ("Device plates ... cut from the housing, placed 1:1 ...
never a fill"), and each option's outcome stands lit on a small stage, so the choice reads as an event and the picture leads.
- panel-housing-840x440 (92, 80): the house plate (device-plate/make-device-plate.py: the housing's sage bezel, rounded, lit from the top
  left, its inset well floored with the stage wall's own paint), radius 12.
- panel-card-{248,380,776}x288 and -focused: the option tile, the kit's recessed well at each card width (hairline, inner shade, lit lip); the
  focused tile is the kit's well one step up (--shown), so the focused option's ground lifts; the frame's ring is drawn over it by code.
- panel-stage-{216,348,744}x48: the outcome's stage, bottom-centred under the picture slot's floor (card y 136-184): a low moulded sage plinth
  (the housing's sage ramp, lit rim) topped with the vivarium's own moss, in a soft pool of warm light behind it, so the outcome stands lit.
  The pool is light, not a glow: matte, it only warms the well floor round the plinth.
- panel-chip-40x20: the cost chip, a dark rubber pill (nine-slice, insets 10 left and right, 0 top and bottom) the build stretches round an
  icon and its figure.
- panel-veil-1024x522: the veil's treatment, a flat layer (stageGround at 62 %, a little deeper at the edges) placed over the stage; not a
  dither (the guide: flat panels are never dithered).
usage: python3 -I decision-panel/make-panel.py VIVARIUM_DAY.png OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, importlib.util, numpy as np
from PIL import Image
from scipy import ndimage as nd
viv, out = sys.argv[1:3]
sp = importlib.util.spec_from_file_location("kit", "device-plate/make-device-plate.py"); kit = importlib.util.module_from_spec(sp); sp.loader.exec_module(kit)
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
made = {}
def save(name, im): im.save(os.path.join(out, name + ".png")); made[name] = im.size
save("panel-housing-840x440", kit.plate(840, 440, bezel=6, radius=12))
for w in (248, 380, 776):
    save(f"panel-card-{w}x288", kit.plate(w, 288, well=True, radius=10))
    save(f"panel-card-{w}x288-focused", kit.plate(w, 288, well=True, shown=True, radius=10))
# the outcome's stage
V = np.asarray(Image.open(viv).convert("RGB")).astype(float); moss = V[466:500, 760:984]
def stage(w):
    H, S = 48, 4; yy, xx = (np.mgrid[0:H * S, 0:w * S] + .5) / S
    pw = min(w - 24, 200 if w < 300 else 260); cx = w / 2
    ex = (xx - cx) / (pw / 2)
    top = (ex ** 2 + ((yy - 30) / 7) ** 2) <= 1                              # the plinth's top, an ellipse seen from the front
    side = (np.abs(ex) <= 1) & (yy >= 30) & (yy <= 40)
    bottom = (ex ** 2 + ((yy - 40) / 7) ** 2) <= 1
    body = side | bottom
    u = np.clip(ex, -1, 1); nrm = np.dstack([u, np.zeros_like(u), np.sqrt(np.clip(1 - u * u, 0, 1))])
    lam = np.clip(nrm @ L, 0, 1) / L[2]
    col = lin([98, 102, 79]) * (0.5 + 0.6 * lam)[..., None]
    rim = top & ~((ex ** 2 + ((yy - 30) / 5.5) ** 2) <= ((pw / 2 - 3) / (pw / 2)) ** 2)
    my = np.clip((yy - 23) / 14 * 33.99, 0, 33.99); mx = 223.99 - np.abs(((xx - cx + 2000 + 61) % 447.98) - 223.99)   # the mirror's turn kept off the centre
    ms = np.stack([nd.map_coordinates(moss[..., c], [my, mx], order=1, mode="nearest") for c in range(3)], -1)
    col[top] = (lin(ms) * 0.85)[top]
    col[rim] = (lin([136, 142, 112]) * 1.05)[None] if rim.any() else col[rim]
    A = (top | body).astype(float)
    pool = np.exp(-(((xx - cx) / (pw * 0.6)) ** 2 + ((yy - 33) / 9) ** 2)) * np.clip((yy - 4) / 18, 0, 1) ** 2 * (1 - A)   # the warm light round it, on the well's floor, faded out before the top rows
    dn = lambda img: img.reshape(H, S, w, S, *img.shape[2:]).mean((1, 3))
    a1, c1, p1 = dn(A), dn(col * A[..., None]), dn(pool)
    warm = lin([214, 168, 104])
    Ap = a1 + p1 * 0.32 * (1 - a1)
    C = (c1 + warm[None, None] * (p1 * 0.32 * (1 - a1))[..., None]) / np.maximum(Ap, 1e-6)[..., None]
    img = np.dstack([srgb(C), Ap * 255]); img[Ap <= 0] = 0
    return Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA")
for w in (216, 348, 744): save(f"panel-stage-{w}x48", stage(w))
# the cost chip: a dark rubber pill, 40 x 20, nine-slice
S = 8; yy, xx = (np.mgrid[0:20 * S, 0:40 * S] + .5) / S
cxx = np.clip(xx, 10, 30); d = 10 - np.hypot(xx - cxx, yy - 10)
h = np.sin(np.clip(d / 4, 0, 1) * np.pi / 2) * 2
gy, gx = np.gradient(nd.gaussian_filter(h, S * .4)); gx *= S; gy *= S
nrm = np.dstack([-gx, -gy, np.ones_like(gx)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
lam = 0.55 + 0.6 * np.clip(nrm @ L, 0, 1) / L[2]
col = lin([46, 45, 48]) * lam[..., None]; A = (d > 0).astype(float)
dn = lambda img: img.reshape(20, S, 40, S, *img.shape[2:]).mean((1, 3))
a1 = dn(A); c1 = dn(col * A[..., None]) / np.maximum(a1, 1e-6)[..., None]
img = np.dstack([srgb(c1), a1 * 255]); img[a1 <= 0] = 0
save("panel-chip-40x20", Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA"))
# the veil
yy, xx = np.mgrid[0:522, 0:1024] + .5
edge = np.clip(1 - np.minimum.reduce([xx, 1024 - xx, yy, 522 - yy]) / 120, 0, 1)
a = 0.62 + 0.12 * edge ** 2
veil = np.zeros((522, 1024, 4)); veil[..., :3] = [0x16, 0x2a, 0x37]; veil[..., 3] = a * 255
save("panel-veil-1024x522", Image.fromarray(np.clip(np.rint(veil), 0, 255).astype(np.uint8), "RGBA"))
for k, v in made.items(): print(k, v)
