"""T-20261016-47 (specs/station-decision-panel-spec.md §1.2-1.3, work-queue): the decision panel's look, as masters. By hand in code, no paid call.
The owner (13:26): "visually we must make them very interesting. not sold on that cream color and lots of text." So: no cream paper card. The panel
is the device's own construction, as the style guide asks of every module and card ("Device plates ... cut from the housing, placed 1:1 ...
never a fill"), and each option's outcome stands lit on a small stage, so the choice reads as an event and the picture leads.
- panel-housing-840x440 (92, 80): the house plate (device-plate/make-device-plate.py: the housing's sage bezel, rounded, lit from the top
  left, its inset well floored with the stage wall's own paint), radius 12.
- panel-card-{248,380,776}x288 and -focused: the option tile, the kit's recessed well at each card width (hairline, inner shade, lit lip); the
  focused tile is the kit's well one step up (--shown), so the focused option's ground lifts; the frame's ring is drawn over it by code.
- panel-stage-{216,348,744}x48, panel-glow-/panel-light-{w}x160, panel-contact-shadow-128x16, panel-scene-wild-{w}x152: the outcome's stage
  and its light, and the Return outcome's ground (T-20261016-70; see their sections and the README).
- panel-chip-40x20: the cost chip, a dark rubber pill (nine-slice, insets 10 left and right, 0 top and bottom) the build stretches round an
  icon and its figure.
- panel-veil-1024x522: the veil's treatment, a flat layer (stageGround at 62 %, a little deeper at the edges) placed over the stage; not a
  dither (the guide: flat panels are never dithered).
usage: python3 -I decision-panel/make-panel.py VIVARIUM_DAY.png OUT_DIR IDLE_VIVARIUM_DAY.png   (run in art/station-masters/pods)"""
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
# the outcome's stage (T-20261016-70): a sage plinth with depth, its top a disc of the vivarium's moss in a warm pool of light, so the
# outcome stands ON it. Its top's centre line is stage row 32, which is the card's y + 168, the picture slot's floor: the build puts the
# picture's feet (its lowest row with alpha >= 128; the mibi families' ground row) on that line, centred, over panel-contact-shadow.
moss = np.asarray(Image.open(sys.argv[3]).convert("RGB")).astype(float)[452:486, 720:944]   # the idle vivarium painting's bright moss bed
def stage(w):
    H, S = 48, 4; yy, xx = (np.mgrid[0:H * S, 0:w * S] + .5) / S
    pw = min(w - 24, 196 if w < 300 else 244); cx = w / 2; T, RY, F = 32.0, 6.5, 8.5     # the top's centre row and half-height; the front face's depth
    ex = (xx - cx) / (pw / 2)
    top = (ex ** 2 + ((yy - T) / RY) ** 2) <= 1
    front = ((np.abs(ex) <= 1) & (yy >= T) & (yy <= T + F)) | ((ex ** 2 + ((yy - T - F) / RY) ** 2) <= 1)
    body = front & ~top
    u = np.clip(ex, -1, 1); nrm = np.dstack([u, np.zeros_like(u), np.sqrt(np.clip(1 - u * u, 0, 1))])
    lam = np.clip(nrm @ L, 0, 1) / L[2]
    fy = np.clip((yy - T) / (F + RY), 0, 1)                                   # the front face darkens toward the floor
    col = lin([110, 115, 88]) * ((0.45 + 0.65 * lam) * (1 - 0.35 * fy))[..., None]
    lip = body & (yy < T + 1.6 + RY * np.sqrt(np.clip(1 - ex ** 2, 0, 1)))  # the top's front edge, a lit moulded lip
    col[lip] = (lin([150, 156, 124]) * (0.8 + 0.4 * lam[lip])[..., None])
    my = np.clip((yy - (T - RY)) / (2 * RY) * 33.99, 0, 33.99); mx = 223.99 - np.abs(((xx - cx + 2000 + 61) % 447.98) - 223.99)
    ms = lin(np.stack([nd.map_coordinates(moss[..., c], [my, mx], order=1, mode="nearest") for c in range(3)], -1))
    pool = np.exp(-(((xx - cx) / (pw * 0.30)) ** 2 + ((yy - T) / (RY * 0.9)) ** 2))       # the warm pool, on the top, round the feet
    warm = lin([255, 196, 120])
    mcol = ms * (0.78 + 0.75 * pool)[..., None] + warm * (0.14 * pool)[..., None]
    col[top] = mcol[top]
    A = (top | front).astype(float)
    spill = np.exp(-(((xx - cx) / (pw * 0.62)) ** 2 + ((yy - T) / 11) ** 2)) * (1 - A) * np.clip((yy - 6) / 16, 0, 1)   # the pool's light on the well round it
    dn = lambda img: img.reshape(H, S, w, S, *img.shape[2:]).mean((1, 3))
    a1, c1, p1 = dn(A), dn(col * A[..., None]), dn(spill)
    Ap = a1 + p1 * 0.30 * (1 - a1)
    C = (c1 + warm[None, None] * 0.75 * (p1 * 0.30 * (1 - a1))[..., None]) / np.maximum(Ap, 1e-6)[..., None]
    img = np.dstack([srgb(C), Ap * 255]); img[Ap <= 0] = 0
    return Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA")
for w in (216, 348, 744): save(f"panel-stage-{w}x48", stage(w))
# the pool's light (T-20261016-70), two layers at the picture slot (x + 16, y + 16, w - 32 x 160):
# - panel-glow-{w}x160, under the picture: the pool's warm light rising on the well's back wall behind the subject, so the tile is lit, not empty;
# - panel-light-{w}x160, over the picture: the pool lighting the subject from below, warm at partial alpha, strongest at the feet line, so
#   the subject is rimmed by its own stage's light. Both are matte light, not glow: no bloom past the slot.
def light(w, over):
    H = 160; yy, xx = np.mgrid[0:H, 0:w] + .5; cx = w / 2; fy = 152.0                 # the feet line: slot row 152 = card y + 168
    pw = min(w - 24, 196 if w < 300 else 244)
    if over:
        a = np.exp(-(((xx - cx) / (pw * 0.42)) ** 2)) * np.clip(1 - (fy - yy) / 70, 0, 1) ** 2.2 * (yy < fy + 4) * 0.30
        c = lin([255, 190, 112])
    else:
        a = np.exp(-(((xx - cx) / (pw * 0.55)) ** 2 + ((yy - fy) / 105) ** 2)) * 0.26 * np.clip((fy + 6 - yy) / 12, 0, 1)
        c = lin([214, 160, 96])
    img = np.dstack([np.broadcast_to(srgb(c), (H, w, 3)), a * 255])
    return Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA")
for w in (216, 348, 744):
    save(f"panel-glow-{w}x160", light(w, False)); save(f"panel-light-{w}x160", light(w, True))
# the contact shadow (T-20261016-70): the house shadow (#1e1a22) as a soft ellipse, 128 x 16, centred on the feet line under the subject;
# the build stretches it across the subject's foot span plus 16 (a blur, so a horizontal stretch keeps it soft)
yy, xx = np.mgrid[0:16, 0:128] + .5
d = ((xx - 64) / 58) ** 2 + ((yy - 8) / 5) ** 2
a = nd.gaussian_filter((d <= 1).astype(float), 2.2) * 0.62
cs = np.dstack([np.broadcast_to([0x1e, 0x1a, 0x22], (16, 128, 3)), a * 255])
save("panel-contact-shadow-128x16", Image.fromarray(np.clip(np.rint(cs), 0, 255).astype(np.uint8), "RGBA"))
# the Return outcome's picture (T-20261016-70): the wild beyond, from the vivarium's own painting (idle-vivarium-day: sunlight through the
# forest, the moss ground in front), cut per card width at the slot's size, faded into the well at its top and sides and into the plinth's
# moss at its foot. One master per card width for the outcome "back to the wild"; the build composites the mibi on it (see the README).
IV = Image.open(sys.argv[3]).convert("RGB")
SCENE = {216: (300, 118, 700, 400), 348: (240, 140, 840, 402), 744: (60, 236, 880, 404)}
def scene(w):
    H = 152; x0, y0, x1, y1 = SCENE[w]; assert (x1 - x0) >= w and (y1 - y0) >= H
    im = np.asarray(IV.crop((x0, y0, x1, y1)).resize((w, H), Image.LANCZOS)).astype(float)
    yy, xx = np.mgrid[0:H, 0:w] + .5
    n = 3.0; s = (np.abs((xx - w / 2) / (w / 2)) ** n + np.abs((yy - H * 0.62) / (H * 0.62)) ** n) ** (1 / n)
    a = np.clip((1 - s) * min(w / 2, H * 0.62) / 18, 0, 1); a = a * a * (3 - 2 * a)
    a = np.where(yy > H * 0.62, np.clip((H - yy) / 10, 0, 1) * np.clip((1 - np.abs((xx - w / 2) / (w / 2)) ** 4) * 3, 0, 1), a)   # the foot: into the plinth
    c = srgb(lin(im) * 0.88)
    return Image.fromarray(np.clip(np.rint(np.dstack([c, a * 255])), 0, 255).astype(np.uint8), "RGBA")
for w in SCENE: save(f"panel-scene-wild-{w}x152", scene(w))
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
