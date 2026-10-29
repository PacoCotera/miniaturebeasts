"""The remaining Pods screen paintings, cut full size first (owner: "full size, we can scale them down later and that is cheap, upscaling is not"):
the lantern (96x160) and fern (120x200) overlays of the cabinet (ad-signoff.md 3.2), the put-away jar (96 -> 24, ad-signoff.md 1.5) and the bred-true seal
(96 -> 48 / 24 / 12, ad-signoff.md 2.8). Raws: source/raw/masters-pods-cups/{lantern-a,fern-a,jar-a,seal-c}.jpg (seal-a and seal-b kept, not used).
Each is keyed off its flat ground (magenta; green for the wine-red seal), unmixed (the ground's colour taken out of the edge pixels), cut, laid in its
box at the painting's own resolution (the full-size master), then reduced in premultiplied alpha, never enlarged. usage: python3 -I tools/cupsmasters.py
Writes shelf/ (masters, slices, proofs) and shelf/cups-cuts.json."""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = f"{R}/source/raw/masters-pods-cups"; OUT = f"{R}/shelf"
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

# ---------- the lantern: hung from the top edge (a short stub of its rod on row 0), centred; it ends on row 123 at 1x, so placed at the cabinet's
# [0, 92] (screen [0, 92, 96, 160]) its foot (screen y 215) stays above the first card's label (y 220) and its body (x 24-71) left of the niche (x 80) ----------
o, box, shp = key("lantern-a", "magenta")
o = o.crop((0, round(o.height * 0.135), o.width, o.height))      # the long straight rod shortened to a stub above the hook's bend (the painting's rod is 900 px)
s1 = 124 / o.height; Wf, Hf = round(96 / s1), round(160 / s1)
lan = lay(o, Wf, Hf, 1, (Wf - o.width) / 2, 0)
save(lan, f"pods-lantern-{Wf}x{Hf}", "the lantern overlay, master at the painting's own size: a small homely brass oil lantern, lit, hanging from a stub of its rod on the top row, centred, rows 0-123 of 160 at 1x (the rest clear, so it never covers a label)", "source/raw/masters-pods-cups/lantern-a.jpg")
for k, sz in ((3, (288, 480)), (1, (96, 160))): save(premul_resize(lan, sz), f"pods-lantern-{sz[0]}x{sz[1]}", f"{k}x, reduced from the master" + (", the placed overlay" if k == 1 else ""))

# ---------- the fern: grows in from the lower-right corner, flush to the box's right and bottom ----------
o, box, shp = key("fern-a", "magenta")
fa = f32(o); r_, g_ = fa[..., 0], fa[..., 1]; warm = r_ > 0.86 * g_                   # the dry, straw-yellow light on the left fronds pulled back to a live olive
fa[..., 0] = np.where(warm, 0.86 * g_ + (r_ - 0.86 * g_) * 0.45, r_); o = img(fa, "RGBA")
s1 = min(120 / o.width, 200 / o.height); Wf, Hf = round(120 / s1), round(200 / s1)
fern = lay(o, Wf, Hf, 1, Wf - o.width, Hf - o.height)
save(fern, f"pods-fern-{Wf}x{Hf}", "the fern overlay, master at the painting's own size: a sprig of soft sage-olive fronds growing in from the lower-right corner, the upper left left clear", "source/raw/masters-pods-cups/fern-a.jpg")
for k, sz in ((3, (360, 600)), (1, (120, 200))): save(premul_resize(fern, sz), f"pods-fern-{sz[0]}x{sz[1]}", f"{k}x, reduced from the master" + (", the placed overlay" if k == 1 else ""))

# ---------- the put-away jar: square, centred, a 4/96 margin, its foot on the margin ----------
o, box, shp = key("jar-a", "magenta")
S = round(max(o.width, o.height) * 96 / 88)
jar = lay(o, S, S, 1, (S - o.width) / 2, S - round(S * 4 / 96) - o.height)
save(jar, f"jar-putaway-{S}x{S}", "the put-away jar, master at the painting's own size: a squat sage-grey stoneware pantry jar, a cream band, an umber wooden lid with a knob, a linen cover tied under it", "source/raw/masters-pods-cups/jar-a.jpg")
save(premul_resize(jar, (96, 96)), "jar-putaway-96x96", "the 96 px master size (ad-signoff 1.5), reduced from the full-size master")
save(premul_resize(jar, (24, 24), 70), "jar-putaway-24x24", "24 px, the Tucked away column's header glyph, reduced from the full-size master, a mild unsharp on the colour")

# ---------- the bred-true seal: square, centred, a 2/96 margin ----------
o, box, shp = key("seal-c", "green")
S = round(max(o.width, o.height) * 96 / 92)
seal = lay(o, S, S, 1, (S - o.width) / 2, (S - o.height) / 2)
save(seal, f"seal-bredtrue-{S}x{S}", "the bred-true seal, master at the painting's own size: a poured wine-red wax seal, its edge irregular, no ring and no rim (never a coin), our pod pressed into it", "source/raw/masters-pods-cups/seal-c.jpg")
for n, sh in ((96, 0), (48, 40), (24, 70), (12, 90)): save(premul_resize(seal, (n, n), sh), f"seal-bredtrue-{n}x{n}", f"{n} px, reduced from the full-size master" + (", a mild unsharp on the colour" if sh else ""))

# ---------- proofs at 1x ----------
P = lambda n: Image.open(f"{OUT}/{n}.png").convert("RGBA")
strip, niche, husk, shadow = P("cabinet-strip-672x228"), P("pod-niche-88x88"), P("pod-niche-husk-88x88"), P("pod-niche-shadow-88x88")
pods = [P(f"pods-1x/pod-shelf-{k}") for k in ("identified", "sealed", "unknown")]
cab = Image.new("RGBA", (672, 466))
for yy in range(0, 466, 228): cab.paste(strip, (0, yy))
for row in range(3):
    for col in range(3):
        ox, oy = col * 228, row * 228; st = (row * 3 + col) % 5
        if oy + 8 >= 466: continue
        cab.alpha_composite(husk if st == 4 else niche, (ox + 64, oy + 8))
        if st in (1, 2, 3): cab.alpha_composite(shadow, (ox + 64, oy + 8)); cab.alpha_composite(pods[st - 1], (ox + 76, oy + 14))
        lab = Image.new("RGBA", (200, 64), (232, 220, 196, 255)); cab.alpha_composite(lab, (ox + 8, oy + 128))
proof = Image.new("RGBA", (1024, 600), (29, 35, 43, 255)); proof.alpha_composite(cab, (16, 92))
proof.alpha_composite(P("pods-lantern-96x160"), (0, 92)); proof.alpha_composite(P("pods-fern-120x200"), (568, 358))
proof.save(f"{OUT}/proof-cabinet-overlays-1x.png")
sheet = Image.new("RGBA", (1024, 600), (29, 35, 43, 255))
paper = Image.new("RGBA", (512, 600), (232, 220, 196, 255)); sheet.alpha_composite(paper, (512, 0))
for gx in (0, 512):
    sheet.alpha_composite(P("jar-putaway-96x96"), (gx + 32, 40)); sheet.alpha_composite(P("jar-putaway-24x24"), (gx + 160, 76))
    x = gx + 32
    for n in (96, 48, 24, 12): sheet.alpha_composite(P(f"seal-bredtrue-{n}x{n}"), (x, 200 + (96 - n) // 2)); x += n + 32
    sheet.alpha_composite(P("pods-lantern-96x160"), (gx + 32, 340)); sheet.alpha_composite(P("pods-fern-120x200"), (gx + 160, 340))
    for i, k in enumerate(("identified", "sealed", "unknown", "crack")): sheet.alpha_composite(P(f"pods-1x/pod-shelf-{k}"), (gx + 300 + (i % 2) * 80, 340 + (i // 2) * 90))
sheet.save(f"{OUT}/proof-cups-sheet-1x.png")
json.dump(rec, open(f"{OUT}/cups-cuts.json", "w"), indent=1); print(json.dumps({k: v["size"] for k, v in rec.items()}))
