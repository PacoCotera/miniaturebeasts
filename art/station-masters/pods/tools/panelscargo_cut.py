"""panels-cargo (lead's helper): the four raws keyed off the magenta ground, despilled, set at exactly the 1x size asked, RGBA. The pods' middle given
the partly see-through interior (alpha 0.5 in the middle, 1.0 at the rim). usage (from art/station-masters/pods): python3 -I tools/panelscargo_cut.py"""
import numpy as np, glob
from PIL import Image
def key(rgb):
    r, g, b = [rgb[..., i].astype(float) for i in range(3)]
    m = np.minimum(r, b) - g                                  # high on magenta, near 0 or negative on the subject
    a = 1 - np.clip((m - 60) / 120.0, 0, 1)                   # solid below 60, clear above 180
    out = rgb.astype(float).copy(); sp = np.clip(m, 0, None) * (a > 0) * 0.5
    out[..., 0] -= sp * (r > g); out[..., 2] -= sp * (b > g)  # despill the magenta fringe
    edge = (m > 0) & (a > 0); out[..., 2] = np.where(edge, np.minimum(out[..., 2], g), out[..., 2])   # on the fringe the blue goes no higher than the green
    return np.clip(out, 0, 255), a
def load(n):
    rgb = np.array(Image.open(glob.glob(f"source/raw/{n}.*")[0]).convert("RGB")); c, a = key(rgb)
    return np.dstack([c, a * 255]).astype(np.float32)
def fit(arr, box, size, dx=0, bottom=True, scale=None):
    x0, y0, x1, y1 = box; cr = arr[y0:y1, x0:x1].copy(); cr[..., :3] *= cr[..., 3:] / 255        # premultiplied
    s = scale or min((size[0] - 2) / cr.shape[1], (size[1] - 2) / cr.shape[0]); w, h = round(cr.shape[1] * s), round(cr.shape[0] * s)
    ch = [np.asarray(Image.fromarray(cr[..., i], "F").resize((w, h), Image.LANCZOS)) for i in range(4)]; p = np.dstack(ch)
    al = np.clip(p[..., 3], 0, 255); rgb = np.where(al[..., None] > 0, p[..., :3] / np.maximum(al[..., None], 1) * 255, 0)
    o = np.zeros((size[1], size[0], 4), np.float32); ox = (size[0] - w) // 2 + dx; oy = size[1] - h - (1 if bottom is True else (bottom or 0))
    o[oy:oy + h, ox:ox + w, :3] = rgb; o[oy:oy + h, ox:ox + w, 3] = al
    return np.clip(np.rint(o), 0, 255).astype(np.uint8), s
def bbox(a, t=128):
    ys, xs = np.nonzero(a[..., 3] > t); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def interior(o):
    h, w = o.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; cx, cy = 0.50 * w, 0.62 * h
    r = np.hypot((xx - cx) / (0.27 * w), (yy - cy) / (0.31 * h)); t = np.clip((r - 0.55) / 0.45, 0, 1); t = t * t * (3 - 2 * t)
    k = 0.5 + 0.5 * t; o = o.copy(); o[..., 3] = np.rint(o[..., 3] * k).astype(np.uint8); return o
O = "concepts/panels-cargo/"
p1 = load("panels-cargo-1-candled-pod-sealed"); p2 = load("panels-cargo-2-candled-pod-opening"); bb = bbox(p1.astype(np.uint8))
for n, p, f in (("candled-pod-S01-sealed-340x400", p1, "sealed"), ("candled-pod-S01-opening-340x400", p2, "opening")):
    o, s = fit(p, bb, (340, 400)); Image.fromarray(interior(o), "RGBA").save(O + n + ".png")
# crate: body width matched to crate-sealed-256x176 (x 4-251 of its canvas), bottom on the canvas bottom
sc = np.array(Image.open("slices/crate-sealed-256x176.png").convert("RGBA")); sb = bbox(sc)
c3 = load("panels-cargo-3-crate-lifting"); b3 = bbox(c3.astype(np.uint8)); ys = np.nonzero(c3[..., 3] > 128)
bodyrows = c3[int(b3[3] - 0.30 * (b3[3] - b3[1])):b3[3]]; bx = bbox(bodyrows.astype(np.uint8))      # the lower 30 percent is body only
scale = (sb[2] - sb[0]) / (bx[2] - bx[0]); o, s = fit(c3, b3, (256, 200), scale=scale, bottom=200 - 176 + 0 + 0 if False else 13)
Image.fromarray(o, "RGBA").save(O + "crate-lifting-256x200.png"); print("crate scale", round(scale, 3), "sealed bbox", sb, "out bbox", bbox(o))
h4 = load("panels-cargo-4-pods-hatch-open"); o, s = fit(h4, bbox(h4.astype(np.uint8)), (160, 260)); Image.fromarray(o, "RGBA").save(O + "pods-hatch-open-160x260.png")
for n in ("candled-pod-S01-sealed-340x400", "candled-pod-S01-opening-340x400"): print(n, bbox(np.array(Image.open(O + n + ".png"))))
