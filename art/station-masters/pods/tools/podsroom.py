"""Pass 95: the Pods room set, redone by the Station art director's method (verdict on ac57c715; the first version, passes 93, composed a squeezed dish onto a grey stage and is replaced). The model never has to hit rectangles: three Pro paintings, then composed here to the layout's rectangles
(main, station-layouts.md "Pods: collection, pod overview, chapter page"; positions only; stage coordinates are screen y minus 40):
  source/raw/pods-floor.jpg   the case floor in frame 2's materials and light: the sage-and-sand housing rim at the edges, WARM dark foam, hoses, a vent and a small gauge at the margins, no cut-outs (16:9, centre-cropped in height to 1024:522)
  source/raw/pods-nest.jpg    ONE fitted egg-shaped nest, empty, lying on its side, worn, with moss and a paper tag (16:9)
  source/raw/pods-plate.jpg   the small stamp plate set into the housing (painted), and a large flat warm slate panel
Composed: the nest (the egg, its dust, the moss and the tag, softly masked) scaled UNIFORMLY (never squeezed) so that its egg is 96 px tall at the overview and chapter (about 150x96) and centred on the dish rectangle's centre (overview (256, 336), chapter (216, 336)); the collection's six nests at the six place centres (176 + 336c, 120 + 240r) at 0.34 (an egg of about 212x136);
the overview's plain slate panel (stage (584, 80, 424, 432)) and the chapter's page panel (stage (424, 72, 584, 440)) are the painting's warm panel, scaled to those rectangles with its own rubber edge; the stamp plate (painted, the old blue chrome gone) at stage (856, 344, 152, 152). Cradle (224x96 at (144, 288)), its front lip (the lower arc of the nest's rim, RGBA) and the shelf (288x72 at (112, 328)) are cut from the composed overview.
Outputs: room-bench-stage (the floor), room-bench-stage-{overview,chapter,collection}, room-cradle, room-cradle-front, room-shelf, room-stamp-case-152x152, room-stamp-case-152x152-front (RGBA: the rim only, the opening transparent, no glass).
python3 -I tools/podsroom.py -> slices/room-*.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def soft(size, shapes, blur):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    for kind, box in shapes: (d.ellipse if kind == "e" else d.rectangle)(box, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))
fl = Image.open("source/raw/pods-floor.jpg").convert("RGB"); W, H = fl.size; ch = round(W * 522 / 1024); y0 = (H - ch) // 2; floor = fl.crop((0, y0, W, y0 + ch)).resize((1024, 522), Image.LANCZOS)
nest = Image.open("source/raw/pods-nest.jpg").convert("RGB"); pl = Image.open("source/raw/pods-plate.jpg").convert("RGB")
# the nest object: the egg with its rim and dust, the moss and the tag, cut from x 300..1050, y 150..730 of the nest painting; its egg's centre (694, 385), the egg 625x400
NB = (300, 150, 1050, 730); EC = (694 - 300, 385 - 150); EGG_H = 400.0
nmask = soft((NB[2] - NB[0], NB[3] - NB[1]), [("e", (EC[0] - 335, EC[1] - 222, EC[0] + 335, EC[1] + 222)), ("e", (440 - 300 - 150, 500 - 150 - 112, 440 - 300 + 150, 500 - 150 + 112)), ("r", (600 - 300, 590 - 150, 800 - 300, 725 - 150))], 14)
nobj = nest.crop(NB)
# the nest is laid on as a RATIO to its own smooth ground (a quadratic fit to the painting's plain foam, the object zones left out), multiplied onto whatever floor lies there: where the nest painting is plain foam the ratio is 1, so no light box can remain around the moss, the tag or the dust (pass 98, the art director's halo fix)
nn = np.asarray(nest).astype(float); yy, xx = np.mgrid[0:nn.shape[0], 0:nn.shape[1]]; X, Y = xx / 1376.0, yy / 768.0
ex = (((xx - 694) / 395.0) ** 2 + ((yy - 385) / 282.0) ** 2 < 1) | (((xx - 440) / 215.0) ** 2 + ((yy - 500) / 170.0) ** 2 < 1) | ((xx > 520) & (xx < 830) & (yy > 520) & (yy < 760))
sel = ~ex; sel[::, :] &= (xx % 5 == 0) & (yy % 5 == 0); A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], -1)
coef = np.linalg.lstsq(A[sel], nn[sel], rcond=None)[0]; fit = np.einsum("hwk,kc->hwc", A, coef)
ratio = np.clip(nn / np.maximum(fit, 1.0), 0, 4.5)[NB[1]:NB[3], NB[0]:NB[2]]
def put_nest(canvas, cx, cy, egg_h):
    s = egg_h / EGG_H; w, h = round(ratio.shape[1] * s), round(ratio.shape[0] * s); x0, y0 = round(cx - EC[0] * s), round(cy - EC[1] * s)
    rs = np.stack([np.asarray(Image.fromarray(ratio[..., c].astype(np.float32), "F").resize((w, h), Image.BICUBIC)) for c in range(3)], -1); m = np.asarray(nmask.resize((w, h), Image.LANCZOS)).astype(float)[..., None] / 255.0
    cv = np.asarray(canvas).astype(float); reg = cv[y0:y0 + h, x0:x0 + w]; assert reg.shape[:2] == (h, w), (x0, y0, w, h)
    cv[y0:y0 + h, x0:x0 + w] = np.clip(reg * (1 + m * (rs - 1)), 0, 255); canvas.paste(Image.fromarray(cv.astype(np.uint8))); return s
# panels and plate from the plate painting
panel = pl.crop((710, 69, 1328, 711)); plate = pl.crop((240, 278, 450, 490)).resize((152, 152), Image.LANCZOS)
def put_panel(canvas, rect):
    x, y, w, h = rect; p = panel.resize((w, h), Image.LANCZOS); m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=10, fill=255); canvas.paste(p, (x, y), m.filter(ImageFilter.GaussianBlur(0.8)))
def put_plate(canvas): m = Image.new("L", (152, 152), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 151, 151], radius=14, fill=255); canvas.paste(plate, (856, 344), m.filter(ImageFilter.GaussianBlur(0.8)))
ov = floor.copy(); put_panel(ov, (584, 80, 424, 432)); put_plate(ov); s_ov = put_nest(ov, 256, 336, 96)
ch_ = floor.copy(); put_panel(ch_, (424, 72, 584, 440)); put_nest(ch_, 216, 336, 96)
# the collection's floor: the floor's hoses, gauge and vent come out of the six places (foam refilled), and go back in the margin strip between the rows (stage y 236..290) and at the right rim
def gblur(a, sg):
    """Gaussian blur of a float 2D array by FFT (PIL cannot blur float images), edges wrapped"""
    fy = np.fft.fftfreq(a.shape[0])[:, None]; fx = np.fft.rfftfreq(a.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a.shape)
def coons(img, box, sm=5, lift=None):
    """fill a rectangle of foam from its four bounding lines (each smoothed along its length): a Coons patch, so the rim's shadow gradient runs through unbroken"""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    def line(a, ax):
        a = a.mean(ax); return np.stack([gblur(np.stack([a[:, c]] * 8), sm)[0] for c in range(3)], -1) if False else np.stack([np.convolve(np.pad(a[:, c], 3 * sm, mode="edge"), np.exp(-0.5 * (np.arange(-3 * sm, 3 * sm + 1) / sm) ** 2) / (sm * 2.5066), "valid") for c in range(3)], -1)
    T = line(img[y0 - 3:y0, x0:x1], 0); B = line(img[y1:y1 + 3, x0:x1], 0); L = line(img[y0:y1, x0 - 3:x0], 1); R = line(img[y0:y1, x1:x1 + 3], 1)
    s_ = np.linspace(0, 1, w)[None, :, None]; t_ = np.linspace(0, 1, h)[:, None, None]
    c = (1 - t_) * T[None] + t_ * B[None] + (1 - s_) * L[:, None] + s_ * R[:, None] - ((1 - s_) * (1 - t_) * T[0] + s_ * (1 - t_) * T[-1] + (1 - s_) * t_ * B[0] + s_ * t_ * B[-1])
    if lift is not None: wgt = (np.sin(np.pi * s_) * np.sin(np.pi * t_)) ** 0.5; c = c + wgt * (lift - c[h // 2, w // 2])    # a large patch in the middle of the case: the middle is lifted to the foam beside it, the rim keeps its shadow
    img[y0:y1, x0:x1] = c; return img
def clean_floor():
    fa = np.asarray(floor).astype(float); out = fa.copy(); hole = np.zeros(fa.shape[:2], bool)
    for bx in ((84, 46, 700, 112), (712, 42, 936, 106), (84, 112, 130, 286), (668, 232, 950, 490)):
        out = coons(out, bx, lift=(0.5 * (fa[190:226, 700:880].reshape(-1, 3).mean(0) + fa[300:460, 590:650].reshape(-1, 3).mean(0)) if bx[0] == 668 else None)); hole[bx[1]:bx[3], bx[0]:bx[2]] = True
    grain = fa[400:480, 380:500] - np.stack([gblur(fa[400:480, 380:500, c], 3) for c in range(3)], -1)
    tile = np.tile(grain, (fa.shape[0] // 80 + 1, fa.shape[1] // 120 + 1, 1))[:fa.shape[0], :fa.shape[1]]
    out = np.where(hole[..., None], out + tile, out); return fa, Image.fromarray(out.clip(0, 255).astype(np.uint8))
fa, clean = clean_floor(); ca = np.asarray(clean).astype(float)
def hardware(box, dest, fade_bottom=0):
    """cut a fitting from the original floor (alpha from its difference to the refilled foam) and set it down at dest on the collection floor"""
    x0, y0, x1, y1 = box; d = np.sqrt(((fa[y0:y1, x0:x1] - ca[y0:y1, x0:x1]) ** 2).sum(2)); al = np.clip((d - 10) / 30.0, 0, 1)
    al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255.0
    if fade_bottom: al[-fade_bottom:] *= np.linspace(1, 0, fade_bottom)[:, None]
    return fa[y0:y1, x0:x1], al, dest
col = clean.copy()
for src, al, (dx, dy) in (hardware((296, 48, 692, 108), (66, 238)), hardware((714, 44, 804, 104), (470, 238)), hardware((842, 44, 934, 104), (640, 238)), hardware((890, 232, 960, 300), (890, 232), 16)):
    h_, w_ = al.shape; reg = np.asarray(col).astype(float); reg[dy:dy + h_, dx:dx + w_] = reg[dy:dy + h_, dx:dx + w_] * (1 - al[..., None]) + src * al[..., None]; col = Image.fromarray(reg.clip(0, 255).astype(np.uint8))
for c in range(3):
    for r in range(2): put_nest(col, 176 + 336 * c, 120 + 240 * r, 0.34 * EGG_H)
out = {"room-bench-stage": floor, "room-bench-stage-overview": ov, "room-bench-stage-chapter": ch_, "room-bench-stage-collection": col}
cradle = ov.crop((144, 288, 368, 384)); shelf = ov.crop((112, 328, 400, 400)); stamp = ov.crop((856, 344, 1008, 496))
# the front lip: the lower arc of the egg's rim in the cradle (the egg is centred at (112, 48) in the cradle, 96 tall and about 150 wide)
s = s_ov; ew, eh = 625 * s, 400 * s; ring = Image.new("L", (224, 96), 0); dr = ImageDraw.Draw(ring)
dr.ellipse([112 - ew / 2 - 6, 48 - eh / 2 - 4, 112 + ew / 2 + 6, 48 + eh / 2 + 6], fill=255); dr.ellipse([112 - ew / 2 + 10, 48 - eh / 2 + 8, 112 + ew / 2 - 10, 48 + eh / 2 - 6], fill=0)
low = np.clip((np.mgrid[0:96, 0:224][0] - 60) / 12.0, 0, 1); alpha = (np.asarray(ring.filter(ImageFilter.GaussianBlur(1.5))).astype(float) * low).astype(np.uint8)
front = cradle.convert("RGBA"); front.putalpha(Image.fromarray(alpha, "L"))
sm = Image.new("L", (152, 152), 0); dm = ImageDraw.Draw(sm); dm.rounded_rectangle([0, 0, 151, 151], radius=14, fill=255); dm.rounded_rectangle([24, 24, 127, 127], radius=6, fill=0)
sfront = stamp.convert("RGBA"); sfront.putalpha(sm.filter(ImageFilter.GaussianBlur(0.8)))
files = {"room-cradle": cradle, "room-cradle-front": front, "room-shelf": shelf, "room-stamp-case-152x152": stamp, "room-stamp-case-152x152-front": sfront}; files.update(out)
man = json.load(open("slices/manifest.json"))
WHAT = {"room-bench-stage": "the case's floor, the stage under everything: the housing rim at the edges, warm dark foam, hoses, a vent and a small gauge at the margins, no cut-outs; a Pro painting (pods-floor.jpg), 1024x522", "room-bench-stage-overview": "the overview stage: the floor with ONE fitted egg-shaped nest (about 150x96, uniformly scaled) on the pod axis x 256, the stamp plate at (856, 344) and a plain warm slate panel at the right; composed from three Pro paintings",
        "room-bench-stage-chapter": "the chapter stage: the floor with the nest on the axis x 216 and a warm matte slate page panel to the right (424, 72, 584, 440); composed", "room-bench-stage-collection": "the collection stage: the floor with six nests at the six places' centres; composed", "room-cradle": "the pod's fitted nest (224x96), cut from the composed overview at (144, 288)",
        "room-cradle-front": "the nest's near rim as a separate layer (RGBA 224x96): the lower arc of the egg's rim, cut from the cradle", "room-shelf": "the case floor under the cradle (288x72), cut from the composed overview at (112, 328)", "room-stamp-case-152x152": "the small dim unlit matte stamp plate set into the housing, painted (pods-plate.jpg), cut at (856, 344)", "room-stamp-case-152x152-front": "the plate's rim only (RGBA 152x152, the opening transparent, no glass)"}
SRC = "source/raw/pods-floor.jpg, pods-nest.jpg, pods-plate.jpg (gemini-3-pro-image), composed in tools/podsroom.py"
for n, im in files.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": man.get(n, {}).get("rect"), "src": SRC, "made": "the Pods room set, the redo (pass 95): " + WHAT[n] + "; the pods are placed by the renderer, never painted in", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
a = np.asarray(floor).astype(float); print("floor mean RGB", a.reshape(-1, 3).mean(0).round(0), "foam centre RGB", a[150:370, 300:700].reshape(-1, 3).mean(0).round(0))
