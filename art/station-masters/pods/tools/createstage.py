"""Pass 120: room-bench-stage-create, 1024x522, by hand (the art director's return on pass 118: the Pro painting (source/raw/create-stage.jpg, set aside) lacked the top and bottom rim and left a hose stub ending in mid-air; the brief's keep-clear zones leave no room for floor hardware, which the art director owns as their error). It is the signed room-bench-stage-incubator, in the same frame, with its hoses and gauges painted out by the floor model: the foam in the cleared places is rebuilt in log light as a(x) + b(y) (medians over the clean inside, the cleared places excluded) plus the floor's own grain, feathered 6 px into the original; the rim, the screws and the side plates are the signed pixels. No paid call.
python3 -I tools/createstage.py -> slices/room-bench-stage-create.png, marks/create-stage-proof-1x.png (the keep-clear zones outlined)"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
SRC = "slices/room-bench-stage-incubator.png"; st = np.asarray(Image.open(SRC).convert("RGB")).astype(float); lg = np.log(np.maximum(st, 1.0))
def gblur_(a_, sg):
    fy = np.fft.fftfreq(a_.shape[0])[:, None]; fx = np.fft.rfftfreq(a_.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a_) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a_.shape)
ix0, ix1, iy0, iy1 = 68, 956, 38, 504                                              # the foam, inside the rim
core = lg[iy0:iy1, ix0:ix1]; hw = np.zeros(core.shape[:2], bool)
for (x0, y0_, x1, y1) in ((86, 418, 166, 504), (68, 370, 372, 504), (664, 370, 956, 504), (770, 424, 940, 504)): hw[max(0, y0_ - iy0):y1 - iy0, max(0, x0 - ix0):x1 - ix0] = True     # the left gauge and hose, the right hose, the two right gauges
cm = np.where(hw[..., None], np.nan, core); A_ = np.zeros((1, ix1 - ix0, 3)); B_ = np.zeros((iy1 - iy0, 1, 3))
for _ in range(6):
    B_ = np.nan_to_num(np.nanmedian(cm - A_, axis=1, keepdims=True), nan=0.0); A_ = np.nan_to_num(np.nanmedian(cm - B_, axis=0, keepdims=True), nan=0.0)
xs_ = np.arange(ix1 - ix0); A_ = np.stack([np.polyval(np.polyfit(xs_[30:-30], A_[0, 30:-30, c], 3), xs_) for c in range(3)], -1)[None]
model = A_ + B_; rng = np.random.default_rng(23); noise = np.stack([gblur_(rng.standard_normal(core.shape[:2]), 0.7) * 0.045 / 0.55 for c in range(3)], -1)
fm = np.clip(gblur_(hw.astype(float), 6.0) * 1.6, 0, 1)[..., None]; out = lg.copy(); out[iy0:iy1, ix0:ix1] = core * (1 - fm) + (model + noise) * fm
floor = Image.fromarray(np.exp(out).clip(0, 255).astype(np.uint8))
man = json.load(open("slices/manifest.json")); n = "room-bench-stage-create"; floor.save(f"slices/{n}.png", optimize=True)
man[n] = {"size": [1024, 522], "rect": [0, 40, 1024, 522], "src": SRC + " (signed; its Pro painting is gemini-3-pro-image)", "made": "Create's own stage, drawn by hand from the signed Incubator stage in the same frame (the rim, screws and side plates are its pixels): its hoses and gauges painted out by the floor model, a plain slate floor with nothing in the keep-clear zones; the set-aside Pro painting is source/raw/create-stage.jpg (pass 120)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
P = floor.convert("RGBA"); d = ImageDraw.Draw(P)
for (x0, y0_, x1, y1, c) in ((0, 0, 1023, 39, (255, 255, 255)), (296, 48, 728, 184, (255, 220, 120)), (312, 192, 712, 512, (120, 200, 255)), (40, 192, 280, 496, (255, 120, 120)), (768, 64, 960, 510, (160, 255, 160))): d.rectangle([x0, y0_, x1, y1], outline=c + (255,))
P.convert("RGB").save("marks/create-stage-proof-1x.png"); print("ok")
