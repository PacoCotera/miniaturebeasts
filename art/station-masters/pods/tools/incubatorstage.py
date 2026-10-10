"""Pass 111 (part): room-bench-stage-incubator, 1024x522 (Station art director's brief: the Pods room's sage and sand frame and floor; lines from the edges into the base's sides; two or three small gauges, low and to the sides; hoses clear of every gauge; the left third quiet and dark; no chamber painted in the stage).
Cut from source/raw/incubator-stage.jpg (one Pro request, 16:9): centre-cut in height to 1024:522 and reduced with Lanczos. The model painted three faint vertical slabs of different brightness across the floor; by hand, the floor's brightness along x (a per-column median in log light over the plain rows) is replaced by a straight-line fit across the inside, so the slabs go and the rim's shadows are kept.
Also builds the proof: growing, ready and empty on the stage (the rail and the leaves as placeholders), with the bud, nest, dome and base at the layout's rectangles (stage y = screen y - 40): dome 360,160; nest 408,360; bud 448,224; base 344,416; the bud's shape as a 112x112 placeholder at 456,248 when ready.
python3 -I tools/incubatorstage.py -> slices/room-bench-stage-incubator.png, marks/incubator-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
SRC = "source/raw/incubator-stage.jpg"; im = Image.open(SRC).convert("RGB"); W, H = im.size; ch = round(W * 522 / 1024); y0 = (H - ch) // 2; st = np.asarray(im.crop((0, y0, W, y0 + ch)).resize((1024, 522), Image.LANCZOS)).astype(float)
lg = np.log(np.maximum(st, 1.0))
# the painting is three tiles side by side with different tone, row by row (seams near x 357 and 666), which no per-column fix removes: so the foam itself is rebuilt by a model in log light, a(x) + b(y) (medians over the whole inside, so the hoses and gauges are outliers; a(x) then smoothed by a cubic, which drops the tile steps; b(y) kept, it holds the rim's shadow), plus the floor's own grain noise, and laid over every pixel that is foam (within about 20 percent of the model); the hoses and the gauges are kept as painted.
def gblur_(a_, sg):
    fy = np.fft.fftfreq(a_.shape[0])[:, None]; fx = np.fft.rfftfreq(a_.shape[1])[None, :]; return np.fft.irfft2(np.fft.rfft2(a_) * np.exp(-2 * (np.pi * sg) ** 2 * (fx ** 2 + fy ** 2)), a_.shape)
ix0, ix1, iy0, iy1 = 70, 954, 36, 492
core = lg[iy0:iy1, ix0:ix1]; A_ = np.zeros((1, ix1 - ix0, 3)); B_ = np.zeros((iy1 - iy0, 1, 3))
for _ in range(6):
    B_ = np.median(core - A_, axis=1, keepdims=True); A_ = np.median(core - B_, axis=0, keepdims=True)
xs_ = np.arange(ix1 - ix0); A_ = np.stack([np.polyval(np.polyfit(xs_[40:-40], A_[0, 40:-40, c], 3), xs_) for c in range(3)], -1)[None]
model = A_ + B_; dev = np.abs(core - model).mean(2); foam = np.clip((0.22 - dev) / 0.06, 0, 1); foam = np.clip(gblur_(foam, 2.0), 0, 1)[..., None]
rng = np.random.default_rng(11); grain_sd = float((core - gblur_(core[..., 0], 3)[..., None]).std()) if False else 0.045
noise = np.stack([gblur_(rng.standard_normal(core.shape[:2]), 0.7) * grain_sd / 0.55 for c in range(3)], -1)
lg_new = lg.copy(); lg_new[iy0:iy1, ix0:ix1] = core * (1 - foam) + (model + noise) * foam; lg = lg_new
out = lg; floor = Image.fromarray(np.exp(out).clip(0, 255).astype(np.uint8))
# the model painted this floor darker than the Pods overview's (mean L* 30.4 against 36.8; the brief: within 4): by hand, the linear light is raised by the least gain that brings the mean L* to 36
lin = to_lin(np.asarray(floor).astype(float)); lo, hi = 0.5, 3.0
for _ in range(30):
    g = (lo * hi) ** 0.5
    if lstar(to_srgb(lin * g)).mean() < 36.0: lo = g
    else: hi = g
floor = Image.fromarray(to_srgb(lin * (lo * hi) ** 0.5).astype(np.uint8))
man = json.load(open("slices/manifest.json")); n = "room-bench-stage-incubator"; floor.save(f"slices/{n}.png", optimize=True)
man[n] = {"size": [1024, 522], "rect": [0, 40, 1024, 522], "src": SRC + " (gemini-3-pro-image)", "made": "the Incubator's stage: the Pods room's sage and sand frame and dark foam floor, a hose in from each side low on the floor, three small gauges low and to the sides, the hoses clear of every gauge, the left third and the whole middle plain, no chamber painted; a Pro painting, centre-cut to 1024x522, its three faint vertical brightness slabs removed by hand (pass 111)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
L = lambda n_: Image.open(f"slices/{n_}.png").convert("RGBA")
dome_back, dome_front, standby, ready_in, base, nest, nest_front = [L(x) for x in ("dome-back-304x272", "dome-front-304x272", "dome-inside-standby-304x272", "dome-inside-ready-304x272", "base-336x96", "nest-208x48", "nest-front-208x48")]
bud, bud_ready, bud_front, leaf_e, leaf_f = [L(x) for x in ("bud-early-128x160", "bud-ready-128x160", "bud-ready-front-128x160", "leaf-empty-16x20", "leaf-full-16x20")]
def state(kind):
    P = floor.convert("RGBA"); d = ImageDraw.Draw(P)
    if kind != "empty":
        d.rectangle([96, 0, 927, 39], fill=(52, 56, 63, 255), outline=(60, 75, 87, 255))                                                 # the rail, a placeholder
        full = 14 if kind == "growing" else 40
        for arc, (r_in, cnt) in enumerate(((216, 20), (244, 20))):
            for i in range(cnt):
                ang = np.radians(-76 + 152 * i / (cnt - 1)); lx = 512 + r_in * np.sin(ang) - 8; ly = 304 - r_in * np.cos(ang) - 10
                P.alpha_composite(leaf_f if (arc * 20 + i) < full else leaf_e, (int(round(lx)), int(round(ly))))
        d.rectangle([840, 256, 959, 375], outline=(113, 124, 134, 255)); d.rectangle([808, 384, 991, 407], outline=(113, 124, 134, 255))     # stamp and code, placeholders
    P.alpha_composite(ready_in if kind == "ready" else (standby if kind == "empty" else dome_back), (360, 160)); P.alpha_composite(nest, (408, 360))
    if kind == "growing": P.alpha_composite(bud, (448, 224))
    if kind == "ready":
        P.alpha_composite(bud_ready, (448, 224)); sh = Image.new("RGBA", (112, 112), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([8, 8, 103, 103], radius=40, fill=(228, 196, 150, 255)); shape = Image.new("RGBA", (128, 160), (0, 0, 0, 0)); shape.paste(sh, (8, 24), sh)       # the species' shape (a placeholder), CLIPPED to the bean: it shows only through the bean, never as a disc
        bm = np.asarray(bud_ready).astype(float)[..., 3:] / 255.0; sa = np.asarray(shape).astype(float); sa[..., 3] = sa[..., 3] * bm[..., 0]; P.alpha_composite(Image.fromarray(sa.astype(np.uint8), "RGBA"), (448, 224)); P.alpha_composite(bud_front, (448, 224))
    if kind != "empty": P.alpha_composite(nest_front, (408, 360))
    P.alpha_composite(dome_front, (360, 160)); P.alpha_composite(base, (344, 416)); return P.convert("RGB")
sheet = Image.new("RGB", (1024, 3 * 522 + 16), (10, 14, 18))
for i, k in enumerate(("growing", "ready", "empty")): sheet.paste(state(k), (0, i * 530))
sheet.save("marks/incubator-proof-1x.png"); print("ok")
