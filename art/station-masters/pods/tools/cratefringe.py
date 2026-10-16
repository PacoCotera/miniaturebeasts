"""Pass 139 (the art director's Cargo fix 5, AR2 and AR3; no paid call): the crates' fringe cleaned, the crate and container shadows drawn.
AR2a: on the five Cargo crates, every opaque pixel (alpha > 0) that touches transparency (alpha 0, 4-neighbour) whose relative luminance is
more than 25 percent below the mean luminance of its opaque 8-neighbours is given the mean RGB of those neighbours; alpha unchanged; two
passes (each reads the state the pass before left). AR2b, AR3: the shadows, #1e1a22, a horizontal ellipse, core alpha 110 on the centre row
falling to 0 at the ellipse edge as (1 - d) ** 1.5, the outer 4 px of the falloff dithered on the 4x4 Bayer; the +3 (store +1) px is the key
light from the top left. usage (from art/station-masters/pods): python3 -I tools/cratefringe.py"""
import json, hashlib, subprocess, io, os
import numpy as np
from PIL import Image
CRATES = ["crate-sealed-256x176", "crate-sitting-256x176", "crate-sealed-432x272", "crate-opening-432x272", "crate-open-432x272"]
def lin(c): c = c / 255.0; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def Y(rgb): l = lin(np.asarray(rgb, float)); return .2126 * l[..., 0] + .7152 * l[..., 1] + .0722 * l[..., 2]
def fringe(a, passes=2):
    a = a.copy(); H, W = a.shape[:2]; op = a[..., 3] > 0; pa = np.pad(op, 1); tr = ~op
    touch = op & (np.pad(tr, 1, constant_values=False)[:-2, 1:-1] | np.pad(tr, 1, constant_values=False)[2:, 1:-1] | np.pad(tr, 1, constant_values=False)[1:-1, :-2] | np.pad(tr, 1, constant_values=False)[1:-1, 2:])
    ys, xs = np.nonzero(touch); changed = np.zeros((H, W), bool)
    for _ in range(passes):
        src = a.copy(); ly = Y(src[..., :3])
        for y, x in zip(ys, xs):
            nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and op[y + dy, x + dx]]
            if not nb: continue
            my = np.mean([ly[p] for p in nb]); mrgb = np.mean([src[p][:3].astype(float) for p in nb], 0)
            if ly[y, x] < 0.75 * my:
                new = np.round(mrgb).astype(np.uint8)
                if (new != a[y, x, :3]).any(): a[y, x, :3] = new; changed[y, x] = True
    return a, int(changed.sum()), int(touch.sum())
BAY = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
def shadow(w, h, ew, cx, cy):
    """a horizontal ellipse ew wide centred at (cx, cy), vertical semi-axis cy (rows 0..h-1, the centre row cy at core alpha 110)"""
    yy, xx = np.mgrid[0:h, 0:w]; ax, ay = ew / 2.0, float(cy)
    d = np.hypot((xx - cx) / ax, (yy - cy) / ay); r = np.hypot(xx - cx, yy - cy) / np.maximum(d, 1e-9)
    alpha = np.where(d < 1, 110 * np.clip(1 - d, 0, None) ** 1.5, 0.0); edge = r - np.hypot(xx - cx, yy - cy)     # the px distance to the ellipse's edge along the ray
    bay = np.tile(BAY, (h // 4 + 1, w // 4 + 1))[:h, :w]
    band = (d < 1) & (edge < 4); keep = bay < edge / 4 * 16
    alpha = np.where(band & ~keep, 0, alpha)
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = (0x1e, 0x1a, 0x22); out[..., 3] = np.round(alpha).astype(np.uint8)
    return out
man = json.load(open("slices/manifest.json")); report = {}
before = {}
for n in CRATES:
    old = open(f"source/work/cargo-before-139/{n}.png", "rb").read() if os.path.exists(f"source/work/cargo-before-139/{n}.png") else subprocess.run(["git", "show", f"HEAD:art/station-masters/pods/slices/{n}.png"], capture_output=True, check=True).stdout
    os.makedirs("source/work/cargo-before-139", exist_ok=True); open(f"source/work/cargo-before-139/{n}.png", "wb").write(old)     # the signed pictures as they were, for the before/after
    a0 = np.array(Image.open(io.BytesIO(old)).convert("RGBA")); before[n] = a0
    a1, nchg, ntouch = fringe(a0); report[n] = (nchg, ntouch)
    Image.fromarray(a1, "RGBA").save(f"slices/{n}.png", optimize=True)
    man[n]["sha256"] = hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()
    man[n]["made"] = man[n]["made"].split(" (fringe")[0] + f" (fringe cleaned in pass 139: {nchg} of {ntouch} edge pixels, two passes)"
SH = {"crate-shadow-256x24": (256, 24, 240, 128 + 3, 12, "the crate's cast shadow, 256x24: #1e1a22, a horizontal ellipse 240 wide (the crate's base ink, x 8-248) centred at x 131 (the key light from the top left), core alpha 110 on row 12 falling to 0 at the ellipse edge as (1 - d)^1.5, the outer 4 px dithered on the 4x4 Bayer; no pads"),
      "crate-shadow-432x24": (432, 24, 412, 213 + 3, 12, "the large crate's cast shadow, 432x24: #1e1a22, a horizontal ellipse 412 wide (the crate's base ink, x 7-419) centred at x 216, core alpha 110 on row 12, (1 - d)^1.5, the outer 4 px dithered on the 4x4 Bayer; no pads"),
      "cargo-store-shadow-48x14": (48, 14, 44, 24 + 1, 7, "the stored container's cast shadow, 48x14: #1e1a22, a horizontal ellipse 44 wide centred at x 25, core alpha 110 on row 7, (1 - d)^1.5, the outer 4 px dithered on the 4x4 Bayer; no pads")}
for n, (w, h, ew, cx, cy, made) in SH.items():
    s = shadow(w, h, ew, cx, cy); Image.fromarray(s, "RGBA").save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": [w, h], "rect": None, "src": "hand-coded (tools/cratefringe.py)", "made": made + " (pass 139)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
json.dump({n: list(v) for n, v in report.items()}, open("log/fringe-139.json", "w"), indent=1)
print(report)
