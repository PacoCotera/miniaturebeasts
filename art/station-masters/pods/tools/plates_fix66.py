"""Pass 66: three fixes to existing S09 plates, from the pass 65 paintings (no API call):
 1 trait-S09-colour-cobalt-128x160: the hard swatch masked to a patch of the Belatz's breast or flank: a rounded body contour 80x96 centred at (64, 80), a soft 3-4 px fluff edge against the ground, cobalt only (hue held to 0.58-0.63, no cream, no green),
   lit from the top left, the lower part darker: the lower 30 percent about 15 levels down, to show form.
 2 trait-S09-fluff-between-128x160: the straight 12 px fade at the painting's top edge replaced by an elliptical fade along the back contour (a 40 px radius dome), so no straight edge remains.
 3 trait-S09-eyes-small-128x160: the content scaled to 60 percent (about 58x55), centred at (64, 80), from the painting (not by scaling the slice): the iris about 22 px.
python3 -I tools/plates_fix66.py"""
import os, json, re, hashlib, colorsys
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
GROUND = np.array([22.0, 42.0, 55.0]); G8 = tuple(int(v) for v in GROUND); man = json.load(open("slices/manifest.json")); report = {}
smooth = lambda t: (lambda u: u * u * (3 - 2 * u))(np.clip(t, 0, 1))
def load(k):
    a = np.asarray(Image.open(f"source/raw/plate-S09-{k}.jpg").convert("RGB")).astype(float); b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    alpha = np.clip((np.abs(a - np.median(b, axis=0)).max(2) - 10) / 24.0, 0, 1); return a, alpha
def fit(a, alpha, box_w, box_h, scale_extra=1.0):
    ys, xs = np.where(alpha > 0.5); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; s = min(box_w / (x1 - x0), box_h / (y1 - y0)) * scale_extra; assert s <= 1
    obj = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)); al = Image.fromarray((alpha[y0:y1, x0:x1] * 255).astype(np.uint8)); nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s))
    pm = np.asarray(obj).astype(float) * (np.asarray(al).astype(float)[..., None] / 255); pm = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS); A = np.asarray(al.resize((nw, nh), Image.LANCZOS)).astype(float)[..., None] / 255
    P = np.asarray(pm).astype(float); return np.where(A > 1e-3, P / np.maximum(A, 1e-3), GROUND), A, s, (x0, y0, x1, y1)
def save(name, cell, made):
    Image.fromarray(np.clip(np.rint(cell), 0, 255).astype(np.uint8)).save(f"slices/{name}.png", optimize=True)
    man[name]["made"] = made; man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()
def offbox(name):
    f = np.asarray(Image.open(f"slices/{name}.png").convert("RGB")).astype(int); mk = np.abs(f - GROUND.astype(int)).max(2) > 6; yy, xx = np.where(mk); return [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)]
# ---- 1 Colour
a, alpha = load("colour"); ys, xs = np.where(alpha > 0.5); cx_, cy_ = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2; s = 0.151; cw, ch = round(80 / s), round(96 / s)
tex = Image.fromarray(np.clip(a[cy_ - ch // 2:cy_ - ch // 2 + ch, cx_ - cw // 2:cx_ - cw // 2 + cw], 0, 255).astype(np.uint8)).resize((80, 96), Image.LANCZOS); t = np.asarray(tex).astype(float)
hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in t.reshape(-1, 3)]).reshape(96, 80, 3); hsv[..., 0] = np.clip(hsv[..., 0], 0.58, 0.63)           # cobalt only: no cream, no green
t = np.array([colorsys.hsv_to_rgb(*p) for p in hsv.reshape(-1, 3)]).reshape(96, 80, 3) * 255
yy, xx = np.mgrid[0:96, 0:80].astype(float); xn, yn = (xx - 39.5) / 40.0, (yy - 47.5) / 48.0; n_ = 2.6; q = (np.abs(xn) ** n_ + np.abs(yn) ** n_) ** (1 / n_)       # a rounded body contour (a superellipse), 80 x 96
rng = np.random.RandomState(66); noise = np.asarray(Image.fromarray((rng.rand(96, 80) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(float) / 255; noise = (noise - noise.mean()) / (noise.std() + 1e-6)
dist = (1 - q) * 40.0 + noise * 1.1                                                                                                             # px inside the contour, a fluff of about 1 px on it
edge = smooth((dist + 1.75) / 3.5)                                                                                                             # a soft 3.5 px edge against the ground
prof = t.mean(axis=(1, 2)); t = t * (prof.mean() / prof)[:, None, None]                                                                         # the painting's own light-to-dark trend down the swatch is flattened first, so the form comes from the two lights below only
lit = 1.06 - 0.12 * ((xx / 80.0) + (yy / 96.0)) / 2 * 2 * 0.5 * 2                                                                               # lit from the top left
t = t * (lit[..., None] / lit.mean()); t = t - 15.0 * smooth(((yy / 96.0) - 0.65) / 0.2)[..., None]                                             # the lower 30 percent darker by about 15 levels
cell = np.tile(GROUND, (160, 128, 1)); cell[32:128, 24:104] = np.clip(t, 0, 255) * edge[..., None] + GROUND * (1 - edge[..., None])
save("trait-S09-colour-cobalt-128x160", cell, "the Colour plate of the Belatz (cobalt), pass 66: the pass 65 painting's texture masked to a rounded body patch 80x96 centred at (64, 80) with a soft 3.5 px fluff edge, hue held to cobalt (0.58-0.63), lit from the top left, the lower part about 15 levels darker, on the cell tone ground, no frame")
f = np.asarray(Image.open("slices/trait-S09-colour-cobalt-128x160.png").convert("RGB")).astype(float); body = f[32 + 10:128 - 10, 24 + 10:104 - 10].reshape(-1, 3); H_ = np.array([colorsys.rgb_to_hsv(*(p / 255))[0] for p in body[::7]])
top = f[32 + 8:32 + 66, 44:84].reshape(-1, 3).mean(); low = f[32 + 72:32 + 88, 44:84].reshape(-1, 3).mean()
report["colour"] = {"box": offbox("trait-S09-colour-cobalt-128x160"), "hue_range": [round(float(H_.min()), 3), round(float(H_.max()), 3)], "mean_level_upper_70pct": round(float(top), 1), "mean_level_lower_30pct": round(float(low), 1)}
# ---- 2 Fluff
a, alpha = load("fluff"); col, A, s, bb = fit(a, alpha, 96, 120); nh, nw = A.shape[:2]; hard = A[..., 0] > 0.5; run = np.where(hard[0])[0]; cx = float(run.mean()); r = 40.0; rx = max(r, (run.max() - run.min()) / 2 + 14)
yy, xx = np.mgrid[0:nh, 0:nw].astype(float); d = np.hypot((xx - cx) / rx, (yy - r) / r) * r; lat_ = np.clip(1 - np.maximum(np.maximum(run.min() - xx, xx - run.max()), 0) / 12.0, 0, 1); keep = np.where(yy < r, 1 - lat_ * smooth((d - (r - 12)) / 12.0), 1.0)       # an elliptical dome fade over the back's top end: 0 at the cut, 1 from 12 px inside
out = col * (A * keep[..., None]) + GROUND * (1 - A * keep[..., None]); cell = np.tile(GROUND, (160, 128, 1)); ox, oy = (96 - nw) // 2 + 16, (120 - nh) // 2 + 20; cell[oy:oy + nh, ox:ox + nw] = out
save("trait-S09-fluff-between-128x160", cell, f"the Fluff plate of the Belatz (between), pass 66: the pass 65 painting reduced (x{s:.3f}, never enlarged) into the centred 96x120; where the body ran off the painting's top edge, an elliptical fade along the back contour (a {int(r)} px radius dome, softened over 12 px) replaces the straight fade")
fl = np.asarray(Image.open("slices/trait-S09-fluff-between-128x160.png").convert("RGB")).astype(int); mk = np.abs(fl - GROUND.astype(int)).max(2) > 6; top_rows = [int(mk[y].sum()) for y in (oy, oy + 3, oy + 8, oy + 16, oy + 30, oy + 45)]
report["fluff"] = {"box": offbox("trait-S09-fluff-between-128x160"), "off_ground_px_in_rows_from_the_top_of_the_content": dict(zip((0, 3, 8, 16, 30, 45), top_rows))}
# ---- 3 Eyes
a, alpha = load("eyes"); col, A, s, bb = fit(a, alpha, 96, 120, 0.6); nh, nw = A.shape[:2]; out = col * A + GROUND * (1 - A); cell = np.tile(GROUND, (160, 128, 1)); ox, oy = 64 - nw // 2, 80 - nh // 2; cell[oy:oy + nh, ox:ox + nw] = out
save("trait-S09-eyes-small-128x160", cell, f"the Eyes plate of the Belatz (small), pass 66: the pass 65 painting reduced to 60 percent of the fit (x{s:.3f}, never enlarged), the content {nw}x{nh} centred at (64, 80) on the cell tone ground, so the iris is about 22 px; no frame")
e = np.asarray(Image.open("slices/trait-S09-eyes-small-128x160.png").convert("RGB")).astype(float); iris = (e[..., 0] > e[..., 2] + 25) & (e[..., 0] > 70) & (e[..., 0] < 200)                    # the brown iris pixels
ys_, xs_ = np.where(iris); report["eyes"] = {"content": [nw, nh], "box": offbox("trait-S09-eyes-small-128x160"), "content_centre": [ox + nw / 2, oy + nh / 2], "iris_px_bbox": [int(xs_.max() - xs_.min() + 1), int(ys_.max() - ys_.min() + 1)]}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(report, indent=1))
sh = Image.new("RGB", (3 * 136, 168), (10, 20, 26))
for i, n in enumerate(("colour-cobalt", "fluff-between", "eyes-small")): sh.paste(Image.open(f"slices/trait-S09-{n}-128x160.png"), (4 + i * 136, 4))
sh.save("proposals/plates-fix66-1x.png"); sh.resize((sh.width * 3, sh.height * 3), Image.NEAREST).save("proposals/plates-fix66-3x.png")
