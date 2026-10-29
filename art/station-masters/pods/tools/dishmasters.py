"""The reading-room dish (ad-review.md of the built Pods screens, B1: a 136x28 dish at [72, 248], in the bench master's wood and brass in the lamp's light),
cut full size first (owner: "full size, we can scale them down later and that is cheap, upscaling is not"). Raw: source/raw/masters-pods-dish/dish-a.jpg.
Keyed off its magenta ground and unmixed as tools/cupsmasters.py keys, cut to its ink, then laid in the box's 136:28 aspect at the painting's own width
(the full-size master): the painting's dish is 3.1:1, so its height is brought to the box's 4.86:1 (a lower eye, the same dish), never enlarged;
then reduced in premultiplied alpha. usage: python3 -I tools/dishmasters.py   Writes shelf/ (master, slices, proof) and shelf/dish-cuts.json."""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = f"{R}/source/raw/masters-pods-dish"; OUT = f"{R}/shelf"
def f32(im): return np.asarray(im, dtype=np.float32)
def img(a, mode="RGB"): return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), mode)
def premul_resize(im, size, sharpen=0):
    a = f32(im); al = a[..., 3:4] / 255.0; pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1)
    ch = [f32(Image.fromarray(np.ascontiguousarray(pm[..., i]), "F").resize(size, Image.LANCZOS)) for i in range(4)]
    A = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(A[..., None] / 255.0, 1e-6); rgb[A < 0.5] = 0
    out = img(np.concatenate([np.clip(rgb, 0, 255), A[..., None]], -1), "RGBA")
    if sharpen:                                                    # the small marks: a mild unsharp on the colour only, the edge left soft
        r, g, b, al_ = out.split(); rgb_ = Image.merge("RGB", (r, g, b)).filter(ImageFilter.UnsharpMask(0.6, sharpen, 0)); out = Image.merge("RGBA", (*rgb_.split(), al_))
    return out
rec = {}
def save(im, name, made, raw=None):
    p = f"{OUT}/{name}.png"; im.save(p, optimize=True)
    rec[name] = {"size": list(im.size), "made": made, "raw": raw, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}

def key(raw, ground):
    """Straight alpha from a flat ground. magenta: m = min(r, b) - g; green: m = g - max(r, b). The ground's m is measured on the border; pixels
    at or past 25 below it are clear, at m <= 20 opaque; the ground's colour is then taken out of the edge pixels (unmixed)."""
    a = f32(Image.open(f"{RAW}/{raw}.jpg").convert("RGB")); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g if ground == "magenta" else g - np.maximum(r, b)
    edge = np.concatenate([a[:24, :].reshape(-1, 3), a[:, :24].reshape(-1, 3)]); em = np.concatenate([m[:24, :].ravel(), m[:, :24].ravel()])
    bg = np.median(edge[em > np.percentile(em, 50)], 0); mbg = float(np.median(em[em > np.percentile(em, 50)]))
    al = 1 - np.clip((m - 20) / (mbg - 45), 0, 1)
    lab, n = nd.label(al > 0.5); sizes = nd.sum(np.ones_like(al), lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(sizes >= 0.002 * sizes.max())[0])             # specks of the ground's noise dropped
    al = al * nd.binary_dilation(keep, iterations=6)
    al[al < 0.03] = 0
    fg = (a - (1 - al[..., None]) * bg) / np.maximum(al[..., None], 1e-3)
    fg = np.where(al[..., None] > 0.97, a, fg)                                      # inside, the painting as painted
    # a last trace of the ground on the edge: no pixel keeps more of the ground's hue than its neighbours
    if ground == "magenta": fg[..., 0] = np.minimum(fg[..., 0], np.maximum(fg[..., 1] + 70, a[..., 0] * (al > 0.97))); fg[..., 2] = np.minimum(fg[..., 2], np.maximum(fg[..., 1] + 40, a[..., 2] * (al > 0.97)))
    else: fg[..., 1] = np.minimum(fg[..., 1], np.maximum(np.maximum(fg[..., 0], fg[..., 2]) + 10, a[..., 1] * (al > 0.97)))
    rgba = np.concatenate([np.clip(fg, 0, 255), al[..., None] * 255], -1)
    ys, xs = np.where(al > 0.03); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return img(rgba, "RGBA").crop(box), box, a.shape[:2]

def lay(obj, W, H, scale, x, y):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.alpha_composite(obj, (int(round(x)), int(round(y)))); return c

# ---------- the dish: its ink fills the box, rim on row 0, foot on the last row ----------
o, box, shp = key("dish-a", "magenta")
Wf = o.width; Hf = round(Wf * 28 / 136)
dish = premul_resize(o, (Wf, Hf))
save(dish, f"reading-dish-{Wf}x{Hf}", f"the reading-room dish, master at the painting's own width: a low turned saucer of the bench's umber wood with a thin aged-brass lip, lit from the upper left by the bench's lamp, empty; its ink {o.width}x{o.height} brought to the box's 136:28 (height x {Hf / o.height:.3f}, width as painted)", "source/raw/masters-pods-dish/dish-a.jpg")
for k, sz in ((3, (408, 84)), (1, (136, 28))): save(premul_resize(dish, sz), f"reading-dish-{sz[0]}x{sz[1]}", f"{k}x, reduced from the master" + (", the placed dish at [72, 248]" if k == 1 else ""))

# ---------- proof at 1x: on the signed bench at its place ----------
P = lambda n: Image.open(f"{OUT}/{n}.png").convert("RGBA")
proof = P("reading-bench-1024x600"); proof.alpha_composite(P("reading-dish-136x28"), (72, 248))
proof.save(f"{OUT}/proof-reading-dish-1x.png")
json.dump(rec, open(f"{OUT}/dish-cuts.json", "w"), indent=1); print(json.dumps({k: v["size"] for k, v in rec.items()}))
