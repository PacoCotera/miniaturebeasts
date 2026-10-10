"""Pass 63: the three find pictures, find-crystal-112x112 (the vybronic crystal), find-pearl-112x112 (the tide pearl), find-shard-112x112 (the storm-glass shard), from the Pro image paintings (source/raw/find-*.jpg, 1024x1024).
The open page's rules: no frame, the cell tone `ground` (22, 42, 55); the object's content inside the centred 84x84 of the 112x112 (the middle 75 percent), reduced from the painting and never enlarged; muted: the saturation is eased
(factor SAT) and, where the object's mean grey is not under the pods' (measured on the large pod, MEAN_POD), the brightness is scaled to just under it. The painting's own ground (the border's median colour) is keyed to the exact ground colour with a soft edge.
python3 -I tools/finds.py"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageEnhance
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
GROUND = np.array([22.0, 42.0, 55.0]); NAMES = {"vybronic-crystal": "crystal", "tide-pearl": "pearl", "storm-glass-shard": "shard"}; SAT = 0.85
luma = lambda a: a @ np.array([0.299, 0.587, 0.114])
sheet = np.asarray(Image.open("halo/halo-contact-1x.png").convert("RGB")).astype(float)[19:19 + 160, 265:410]; m = np.abs(sheet - np.array([22, 34, 44])).max(2) > 12; MEAN_POD = float(luma(sheet)[m].mean())
man = json.load(open("slices/manifest.json")); report = {}
for raw, short in NAMES.items():
    a = np.asarray(Image.open(f"source/raw/find-{raw}.jpg").convert("RGB")).astype(float); b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); g0 = np.median(b, axis=0)
    d = np.abs(a - g0).max(2); alpha = np.clip((d - 8) / 24.0, 0, 1)                         # the painting's ground keyed out, a soft edge
    ys, xs = np.where(alpha > 0.5); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; pad = 12
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(a.shape[1], x1 + pad), min(a.shape[0], y1 + pad)
    obj = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)); al = Image.fromarray((alpha[y0:y1, x0:x1] * 255).astype(np.uint8))
    s = min(84 / obj.width, 84 / obj.height); assert s <= 1, "would be enlarged"; nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s))
    # premultiplied reduction, then the object over the exact ground
    ar = np.asarray(obj).astype(float) * (np.asarray(al).astype(float)[..., None] / 255); ar = Image.fromarray(np.clip(ar, 0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS); alr = al.resize((nw, nh), Image.LANCZOS)
    A = np.asarray(alr).astype(float)[..., None] / 255; P = np.asarray(ar).astype(float); col = np.where(A > 1e-3, P / np.maximum(A, 1e-3), GROUND)
    col = np.asarray(ImageEnhance.Color(Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))).enhance(SAT)).astype(float)       # muted
    ml = float((luma(col) * A[..., 0]).sum() / A.sum())
    def build(gain):
        c2 = np.clip(GROUND + (col - GROUND) * gain, 0, 255); out = c2 * A + GROUND * (1 - A); cell = np.tile(GROUND, (112, 112, 1)); ox, oy = (112 - nw) // 2, (112 - nh) // 2; cell[oy:oy + nh, ox:ox + nw] = out
        return np.clip(np.rint(cell), 0, 255).astype(np.uint8)
    def mean_grey(cell): mk_ = np.abs(cell.astype(float) - GROUND).max(2) > 6; return float(luma(cell.astype(float))[mk_].mean())
    gain = 1.0
    if mean_grey(build(1.0)) > 0.97 * MEAN_POD:                                       # not under the pods': scale the object's brightness (round the ground) until the final cell's mean grey is under it
        lo, hi = 0.2, 1.0
        for _ in range(30):
            mid = (lo + hi) / 2
            if mean_grey(build(mid)) > 0.97 * MEAN_POD: hi = mid
            else: lo = mid
        gain = lo
    cellu8 = build(gain)
    name = f"find-{short}-112x112"; Image.fromarray(cellu8).save(f"slices/{name}.png", optimize=True)
    fin = np.asarray(Image.open(f"slices/{name}.png").convert("RGB")).astype(float); mk = np.abs(fin - GROUND).max(2) > 6; yy, xx = np.where(mk)
    report[name] = {"object_px_in_painting": [int(x1 - x0), int(y1 - y0)], "scale": round(s, 3), "box": [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)], "mean_grey_before_gain": round(ml, 1), "gain": round(gain, 3), "mean_grey_after": round(float(luma(fin)[mk].mean()), 1)}
    man[name] = {"size": [112, 112], "rect": None, "src": f"source/raw/find-{raw}.jpg (gemini-3-pro-image)", "made": f"the find picture of the {raw.replace('-', ' ')}: the painting's ground keyed to the cell tone `ground` (22, 42, 55), the object reduced (never enlarged, x{s:.3f}) into the centred 84x84 of the 112x112, saturation x{SAT}, brightness gain {gain:.3f} (mean grey {ml:.1f} before, the large pod's {MEAN_POD:.1f}); no frame", "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print("pods mean grey", round(MEAN_POD, 1)); print(json.dumps(report, indent=1))
sh = Image.new("RGB", (3 * 128 + 16, 144), (10, 20, 26))
for k, n in enumerate(("crystal", "pearl", "shard")): sh.paste(Image.open(f"slices/find-{n}-112x112.png").convert("RGB"), (8 + k * 128, 16))
os.makedirs("proposals", exist_ok=True); sh.save("proposals/finds-1x.png"); sh.resize((sh.width * 3, sh.height * 3), Image.NEAREST).save("proposals/finds-3x.png")
