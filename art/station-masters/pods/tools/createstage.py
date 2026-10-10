"""Pass 118: room-bench-stage-create, 1024x522 (Station art director's Create brief, geometry from station-layouts.md "Create" on main): the same frame and slate floor as room-bench-stage-incubator, a new painting (one Pro request, owner-approved: source/raw/create-stage.jpg, 16:9, centre-cut to 1024:522 and reduced with Lanczos).
The keep-clear zones (stage coordinates; stage y = screen y - 40): the rail y 0-40; the roll and trait line 296-728 x 48-184; the work tray 312-712 x 192-512; the pod, dish and origin 40-280 x 192-496; the small chamber, leaves, stamp and code 768-960 x 64-510. The painting put a gauge low in the middle (inside the tray's zone) and two gauges and a hose on the lower right (inside the small chamber's zone); by hand they are painted out (the floor model of tools/incubatorstage.py is laid over them), leaving the upper-left gauge and its hose, which lie in no zone. The floor's three-tile tone steps (if any) are removed the same way: the foam is rebuilt by a model in log light a(x) + b(y) plus the floor's grain over every pixel that is foam; the level is set to a mean L* of 36.
python3 -I tools/createstage.py -> slices/room-bench-stage-create.png, marks/create-stage-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
SRC = "source/raw/create-stage.jpg"; im = Image.open(SRC).convert("RGB"); W, H = im.size; ch = round(W * 522 / 1024); y0 = (H - ch) // 2; st = np.asarray(im.crop((0, y0, W, y0 + ch)).resize((1024, 522), Image.LANCZOS)).astype(float)
lg = np.log(np.maximum(st, 1.0))
def gblur_(a_, sg):
    fy = np.fft.fftfreq(a_.shape[0])[:, None]; fx = np.fft.rfftfreq(a_.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a_) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a_.shape)
ix0, ix1, iy0, iy1 = 70, 954, 36, 518
core = lg[iy0:iy1, ix0:ix1]; hwmask = np.zeros(core.shape[:2], bool)
OUT = ((560, 430, 660, 522), (750, 370, 962, 522))                      # hardware inside the keep-clear zones, to be painted out (stage coordinates)
for (x0, y0_, x1, y1) in OUT: hwmask[max(0, y0_ - iy0):y1 - iy0, max(0, x0 - ix0):x1 - ix0] = True
cm = np.where(hwmask[..., None], np.nan, core); A_ = np.zeros((1, ix1 - ix0, 3)); B_ = np.zeros((iy1 - iy0, 1, 3))
for _ in range(6):
    B_ = np.nan_to_num(np.nanmedian(cm - A_, axis=1, keepdims=True), nan=0.0); A_ = np.nan_to_num(np.nanmedian(cm - B_, axis=0, keepdims=True), nan=0.0)
xs_ = np.arange(ix1 - ix0); A_ = np.stack([np.polyval(np.polyfit(xs_[40:-40], A_[0, 40:-40, c], 3), xs_) for c in range(3)], -1)[None]
model = A_ + B_; dev = np.abs(core - model).mean(2); foam = np.clip((0.22 - dev) / 0.06, 0, 1); foam = np.maximum(foam, np.clip(gblur_(hwmask.astype(float), 3.0) * 1.5, 0, 1)); foam = np.clip(gblur_(foam, 2.0), 0, 1)[..., None]
rng = np.random.default_rng(17); noise = np.stack([gblur_(rng.standard_normal(core.shape[:2]), 0.7) * 0.045 / 0.55 for c in range(3)], -1)
lg_new = lg.copy(); lg_new[iy0:iy1, ix0:ix1] = core * (1 - foam) + (model + noise) * foam
lin = to_lin(np.exp(lg_new)); lo, hi = 0.5, 3.0
for _ in range(30):
    g = (lo * hi) ** 0.5
    if lstar(to_srgb(lin * g)).mean() < 36.0: lo = g
    else: hi = g
floor = Image.fromarray(to_srgb(lin * (lo * hi) ** 0.5).astype(np.uint8))
man = json.load(open("slices/manifest.json")); n = "room-bench-stage-create"; floor.save(f"slices/{n}.png", optimize=True)
man[n] = {"size": [1024, 522], "rect": [0, 40, 1024, 522], "src": SRC + " (gemini-3-pro-image)", "made": "Create's own stage: the Pods room's sage and sand frame and dark foam floor, plain, with one small gauge and its hose in the upper left (outside every keep-clear zone: rail, roll and trait line, work tray, pod and dish, small chamber and leaves); the gauge low in the middle and the two gauges and the hose at the lower right, which lay in the zones, painted out by hand; a Pro painting, centre-cut to 1024x522, the foam rebuilt by a floor model, raised to a mean L* of 36 (pass 118)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
P = floor.convert("RGBA"); d = ImageDraw.Draw(P)
for (x0, y0_, x1, y1, c) in ((0, 0, 1023, 39, (255, 255, 255, 70)), (296, 48, 728, 184, (255, 220, 120, 70)), (312, 192, 712, 512, (120, 200, 255, 60)), (40, 192, 280, 496, (255, 120, 120, 60)), (768, 64, 960, 510, (160, 255, 160, 60))): d.rectangle([x0, y0_, x1, y1], outline=c[:3] + (255,))
P.convert("RGB").save("marks/create-stage-proof-1x.png"); print("ok")
