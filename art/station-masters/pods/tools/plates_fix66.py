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
# ---- 1 Colour (pass 66, second try, no painting): an asymmetric breast contour with no straight side, the feathers smaller towards the edges (the texture scaled down radially from the centre)
a, alpha = load("colour"); ys, xs = np.where(alpha > 0.5); sw = Image.fromarray(np.clip(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 0, 255).astype(np.uint8)); S0 = 0.2
sw = sw.resize((round(sw.width * S0), round(sw.height * S0)), Image.LANCZOS); SRC = np.pad(np.asarray(sw).astype(float), ((24, 24), (24, 24), (0, 0)), mode="reflect"); sh_, sw_ = SRC.shape[:2]; scy, scx = sh_ / 2, sw_ / 2
yy, xx = np.mgrid[0:96, 0:80].astype(float); xn, yn = (xx - 39.5) / 40.0, (yy - 47.5) / 48.0
K = 0.45; rho = np.hypot(xn, yn); f = 1 + K * np.minimum(rho, 1.1) ** 2                                                                         # the sampling grows with the radius: the feathers shrink to 1/1.45 at the edge
sx, sy = scx + (xx - 39.5) * f, scy + (yy - 47.5) * f; x0 = np.clip(np.floor(sx).astype(int), 0, sw_ - 2); y0 = np.clip(np.floor(sy).astype(int), 0, sh_ - 2); fx, fy = (sx - x0)[..., None], (sy - y0)[..., None]
t = SRC[y0, x0] * (1 - fx) * (1 - fy) + SRC[y0, x0 + 1] * fx * (1 - fy) + SRC[y0 + 1, x0] * (1 - fx) * fy + SRC[y0 + 1, x0 + 1] * fx * fy
hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in t.reshape(-1, 3)]).reshape(96, 80, 3); hsv[..., 0] = np.clip(hsv[..., 0], 0.58, 0.63)           # cobalt only: no cream, no green
t = np.array([colorsys.hsv_to_rgb(*p) for p in hsv.reshape(-1, 3)]).reshape(96, 80, 3) * 255
xs_ = xn - 0.16 * yn                                                                                                                              # a lean: the breast's upper part tips to the right
th = np.arctan2(yn, xs_); bnd = 1 + 0.10 * np.cos(th - 0.5) + 0.07 * np.cos(2 * th + 0.8) + 0.04 * np.cos(3 * th + 2.0) - 0.05 * np.cos(th + 2.3); bnd = bnd / (bnd.max() * 1.0)   # an asymmetric contour: no two sides alike
q = np.hypot(xs_, yn) / bnd; rng = np.random.RandomState(66); noise = np.asarray(Image.fromarray((rng.rand(96, 80) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(float) / 255; noise = (noise - noise.mean()) / (noise.std() + 1e-6)
dist = (1 - q) * 40.0 + noise * 1.1; edge = smooth((dist + 1.75) / 3.5)                                                                           # a soft 3.5 px edge with about 1 px of fluff
prof = t.mean(axis=(1, 2)); t = t * (prof.mean() / prof)[:, None, None]                                                                            # the painting's own light-to-dark trend flattened first
lit = 1.06 - 0.12 * ((xx / 80.0) + (yy / 96.0)) / 2 * 2 * 0.5 * 2; t = t * (lit[..., None] / lit.mean()); t = t - 15.0 * smooth(((yy / 96.0) - 0.65) / 0.2)[..., None]
cell = np.tile(GROUND, (160, 128, 1)); cell[32:128, 24:104] = np.clip(t, 0, 255) * edge[..., None] + GROUND * (1 - edge[..., None])
save("trait-S09-colour-cobalt-128x160", cell, "the Colour plate of the Belatz (cobalt), pass 66 second try, from the pass 65 painting's texture without a painting: a patch of the breast: an asymmetric contour (no straight side, leaning right) within 80x96 centred at (64, 80), a soft 3.5 px fluff edge, the feathers scaled down radially (x1/1.45 at the edge), hue held to cobalt (0.58-0.63), lit from the top left, the lower part about 15 levels darker, on the cell tone ground, no frame")
f_ = np.asarray(Image.open("slices/trait-S09-colour-cobalt-128x160.png").convert("RGB")).astype(float); fm = np.abs(f_ - GROUND).max(2) > 12
left = np.array([int(np.where(fm[y, 24:104])[0].min()) if fm[y, 24:104].any() else -1 for y in range(32, 128)]); right = np.array([int(np.where(fm[y, 24:104])[0].max()) if fm[y, 24:104].any() else -1 for y in range(32, 128)])
def longest_run(v):
    best = cur = 1
    for i_ in range(1, len(v)):
        cur = cur + 1 if (v[i_] == v[i_ - 1] and v[i_] >= 0) else 1; best = max(best, cur)
    return best
body = f_[32 + 10:128 - 10, 24 + 10:104 - 10].reshape(-1, 3); H_ = np.array([colorsys.rgb_to_hsv(*(p / 255))[0] for p in body[::7]]); top = f_[32 + 8:32 + 66, 44:84].reshape(-1, 3).mean(); low = f_[32 + 72:32 + 88, 44:84].reshape(-1, 3).mean()
report["colour"] = {"box": offbox("trait-S09-colour-cobalt-128x160"), "longest_vertical_run_of_equal_left_edge_rows": longest_run(left), "longest_vertical_run_of_equal_right_edge_rows": longest_run(right), "left_edge_x_range": [int(left[left >= 0].min() + 24), int(left[left >= 0].max() + 24)], "right_edge_x_range": [int(right[right >= 0].min() + 24), int(right[right >= 0].max() + 24)], "hue_range": [round(float(H_.min()), 3), round(float(H_.max()), 3)], "mean_level_upper_70pct": round(float(top), 1), "mean_level_lower_30pct": round(float(low), 1), "feather_scale_edge_over_centre": round(1 / (1 + K), 3)}
# ---- 2 Fluff
a, alpha = load("fluff"); col, A, s, bb = fit(a, alpha, 96, 120); nh, nw = A.shape[:2]; hard = A[..., 0] > 0.5; run = np.where(hard[0])[0]; cx = float(run.mean()); r = 40.0; rx = max(r, (run.max() - run.min()) / 2 + 14)
yy, xx = np.mgrid[0:nh, 0:nw].astype(float); d = np.hypot((xx - cx) / rx, (yy - r) / r) * r; lat_ = np.clip(1 - np.maximum(np.maximum(run.min() - xx, xx - run.max()), 0) / 12.0, 0, 1); keep = np.where(yy < r, 1 - lat_ * smooth((d - (r - 12)) / 12.0), 1.0)       # an elliptical dome fade over the back's top end: 0 at the cut, 1 from 12 px inside
out = col * (A * keep[..., None]) + GROUND * (1 - A * keep[..., None]); cell = np.tile(GROUND, (160, 128, 1)); ox, oy = (96 - nw) // 2 + 16, (120 - nh) // 2 + 20; cell[oy:oy + nh, ox:ox + nw] = out
cell[18:28, 50:62] = np.where(np.abs(cell[18:28, 50:62] - GROUND).max(2, keepdims=True) <= 45, GROUND, cell[18:28, 50:62])      # the stray wisp above the back, about (49-58, 20-27), taken out
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
