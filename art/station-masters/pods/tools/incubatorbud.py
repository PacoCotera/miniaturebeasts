"""Pass 111 (part): the Incubator's bud and leaves. No paid call beyond the Pro request that painted the bean.
bud-early-128x160: cut from source/raw/incubator-bud-early2.jpg (one Pro request: a smooth warm bean standing upright on a little moss, on a flat slate key; the first attempt, incubator-bud-early.jpg, lay on its side and is not used). Keyed from the slate (soft alpha), the crop (150, 225)-(730, 940) of the picture scaled UNIFORMLY to 128x160 and set bottom-centre; the bean's hilum (a pale oval on its right edge that reads as a mark) is painted out. No dot, no eye, no sprout.
bud-late-128x160 (by hand): toward blush, no drift to a species' hue: the skin's red kept and its yellow lowered, a little pink added, the inner light a little up.
bud-ready-128x160 (by hand): the inner light up full: a soft cream light across the bean's middle, the window where the shape's 112x112 sits (the shape is drawn by the renderer at (456, 288) on the screen); bud-ready-front-128x160: the skin over the shape, the bean's silhouette at half opacity, lighter at the middle.
bud-crack-1-128x160 and bud-crack-2-128x160 (by hand): the two crack steps over the ready bud: a short rust crack with a thread of light, then a longer, wider one with the light coming through; each is a transparent layer over the bud.
leaf-empty-16x20, leaf-full-16x20, leaf-empty-8x12, leaf-full-8x12 (hand-pixelled, 0 MXN): one ovate pointed leaf leaning about 40 degrees clockwise (the tip at the upper right), a centre vein, a short curved stem at the lower left; full = sage #84ae78 with a sageD #5d7a5f vein and stem, empty = a one-pixel metal #717c86 outline, vein and stem in metal; palette-exact, no anti-aliasing.
python3 -I tools/incubatorbud.py -> slices/bud-*.png, slices/leaf-*.png, marks/incubator-bud-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
SRC = "source/raw/incubator-bud-early2.jpg"; a = np.asarray(Image.open(SRC).convert("RGB")).astype(float); H, W, _ = a.shape
bg = np.median(np.concatenate([a[:40].reshape(-1, 3), a[-40:].reshape(-1, 3), a[:, :40].reshape(-1, 3), a[:, -40:].reshape(-1, 3)]), axis=0)
# the hilum: a patch of the bean's own skin, from the left of it, over the pale oval (feathered)
a2 = a.copy(); dk0 = np.sqrt(((a - bg) ** 2).sum(2))
for y in range(470, 642):                  # the hilum: row by row, the skin between x 548 and the bean's right edge is a straight blend of the two (the pale oval goes)
    xr = 548 + int(np.argmax(dk0[y, 548:700] < 22)) if (dk0[y, 548:700] < 22).any() else 640
    if xr - 4 > 556:
        for x in range(550, xr - 2): t = (x - 548) / float(xr - 4 - 548); a2[y, x] = a[y, 548] * (1 - t) + a[y, xr - 4] * t
dist = np.sqrt(((a2 - bg) ** 2).sum(2)); keyed = np.clip((dist - 14) / 26.0, 0, 1)
box = (150, 225, 730, 940); crop = np.dstack([a2[box[1]:box[3], box[0]:box[2]], keyed[box[1]:box[3], box[0]:box[2]] * 255]); cy = crop.shape[0]; fade = np.clip((cy - np.arange(cy)) / 30.0, 0, 1)[:, None]; crop[..., 3] *= fade
src = Image.fromarray(crop.astype(np.uint8), "RGBA"); s = min(128 / src.width, 160 / src.height); nw, nh = round(src.width * s), round(src.height * s)
p = np.asarray(src).astype(float); pm = np.dstack([p[..., :3] * p[..., 3:] / 255.0, p[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)).astype(float)
al = r[..., 3:] / 255.0; col = np.where(al > 0.01, r[..., :3] / np.maximum(al, 0.01), 0)
early = Image.new("RGBA", (128, 160), (0, 0, 0, 0)); early.paste(Image.fromarray(np.dstack([col, r[..., 3:]]).clip(0, 255).astype(np.uint8), "RGBA"), ((128 - nw) // 2, 160 - nh))
early, erep = fit_light(early); print("bud-early", erep)
E = np.asarray(early).astype(float); bean = ((E[..., 0] > E[..., 1] + 6) & (E[..., 3] > 128)); bean = np.asarray(Image.fromarray((bean * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 0
ys, xs = np.where(bean); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max(); cx, cy_ = (bx0 + bx1) / 2.0, (by0 + by1) / 2.0
man = json.load(open("slices/manifest.json")); outs = {}
def save(n, t, made, src_=SRC):
    t.save(f"slices/{n}.png", optimize=True); outs[n] = t; man[n] = {"size": list(t.size), "rect": None, "src": src_, "made": made + " (pass 111)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
save("bud-early-128x160", early, "the bud, early: a smooth warm bean (peach, lit cream, rust edge) glowing softly from within on a little moss, no dot, no eye, no sprout; keyed from the slate, scaled uniformly, bottom-centred in 128x160", SRC + " (gemini-3-pro-image)")
def shade(img, f):
    r_ = np.asarray(img).astype(float); lin = to_lin(r_[..., :3]); out = f(lin); r_[..., :3] = to_srgb(np.clip(out, 0, 1)); return Image.fromarray(r_.astype(np.uint8), "RGBA")
Yg, Xg = np.mgrid[0:160, 0:128]
late = shade(early, lambda l: np.where(bean[..., None], l * np.array([1.00, 0.90, 1.08]) * 1.05 + 0.012 * np.array([1.0, 0.1, 0.45]), l)); late, lrep = fit_light(late); print("bud-late", lrep); save("bud-late-128x160", late, "the bud, late: by hand, the skin toward blush (its yellow lowered, a little pink added, the inner light a little up), no drift to a species' hue")
rad = np.exp(-(((Xg - cx) / (0.30 * (bx1 - bx0 + 1))) ** 2 + ((Yg - (cy_ - 0.05 * (by1 - by0))) / (0.30 * (by1 - by0 + 1))) ** 2)); win = rad[..., None] * bean[..., None]
ready = shade(early, lambda l: np.where(bean[..., None], 1 - (1 - l * 1.10) * (1 - np.clip(0.75 * win * np.array([1.0, 0.90, 0.68]), 0, 0.95)), l)); ready, rrep = fit_light(ready, cap=69.9); print("bud-ready", rrep); save("bud-ready-128x160", ready, "the bud, ready: by hand, the inner light up full, a soft cream light across the bean's middle where the shape's window sits")
fr = np.zeros((160, 128, 4)); sk = np.asarray(early).astype(float)[..., :3]; fr[..., :3] = sk; fr[..., 3] = bean * (150 - 70 * rad) ; save("bud-ready-front-128x160", Image.fromarray(fr.clip(0, 255).astype(np.uint8), "RGBA"), "the skin over the shape: the bean's silhouette at half opacity, lighter at the middle, drawn over the shape in the ready bud")
def crack(points, w, glow):
    im = Image.new("RGBA", (128, 160), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if glow: d.line(points, fill=(255, 236, 190, 235), width=w + 4, joint="curve")
    d.line(points, fill=(255, 246, 214, 255) if glow else (150, 78, 44, 255), width=max(1, w), joint="curve")
    if not glow: d.line([(x + 1, y) for x, y in points], fill=(238, 214, 170, 200), width=1)
    msk = Image.fromarray((bean * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)); out = Image.new("RGBA", (128, 160), (0, 0, 0, 0)); out.paste(im, (0, 0), msk); return out
zig = lambda n, L, amp: [(cx + (amp if i % 2 else -amp) * (0.4 + 0.6 * (i / n)) + 0.8 * np.sin(i), by0 + 4 + L * i / n) for i in range(n + 1)]
c1 = crack(zig(5, 0.28 * (by1 - by0), 3.0), 1, False); c2a = crack(zig(8, 0.58 * (by1 - by0), 4.5), 2, False); c2b = crack(zig(8, 0.58 * (by1 - by0), 4.5), 1, True); c2 = Image.alpha_composite(c2b, c2a)
save("bud-crack-1-128x160", c1, "the first crack step over the ready bud: a short rust crack with a thread of light, a transparent layer drawn by hand")
save("bud-crack-2-128x160", c2, "the second crack step over the ready bud: a longer, wider crack with the light coming through, a transparent layer drawn by hand")
# --- the leaves, hand-pixelled
SAGE = (0x84, 0xAE, 0x78, 255); SAGED = (0x5D, 0x7A, 0x5F, 255); METAL = (0x71, 0x7C, 0x86, 255)
def leaf(w, h, full):
    ang = np.radians(40); u = np.array([np.sin(ang), -np.cos(ang)]); nn = np.array([np.cos(ang), np.sin(ang)])
    B = np.array([1.3 * w / 16, h - 1.0]); L = (h - 2.5) / np.cos(ang) * 0.93; half = 0.205 * L
    yy, xx = np.mgrid[0:h, 0:w]; P = np.stack([xx + 0.5, yy + 0.5], -1) - B; t = (P @ u) / L; sd = P @ nn
    prof = half * (np.clip(t, 0, 1) ** 0.62) * (np.clip(1 - t, 0, 1) ** 0.95) / (0.42 ** 0.62 * 0.58 ** 0.95)
    body = (t > 0.06) & (t < 1.0) & (np.abs(sd) <= prof)
    vein = (t > 0.1) & (t < 0.86) & (np.abs(sd) <= 0.5)
    stem = ((t >= -0.12) & (t <= 0.08) & (np.abs(sd + np.sin(np.clip(t, -0.12, 0.08) * 9) * 0.5) <= 0.5))
    img = np.zeros((h, w, 4), np.uint8)
    if full:
        img[body] = SAGE; img[vein & body] = SAGED; img[stem] = SAGED
    else:
        er = np.asarray(Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0; edge = body & ~er; img[edge] = METAL; img[vein & body] = METAL; img[stem] = METAL
    return Image.fromarray(img, "RGBA")
for (w, h) in ((16, 20), (8, 12)):
    for full in (False, True):
        n = f"leaf-{'full' if full else 'empty'}-{w}x{h}"; save(n, leaf(w, h, full), f"the leaf, {'full' if full else 'empty'}, hand-pixelled {w}x{h}: one ovate pointed leaf leaning about 40 degrees clockwise (the tip at the upper right), a centre vein, a short curved stem at the lower left; " + ("sage #84ae78 with a sageD #5d7a5f vein" if full else "a one-pixel metal #717c86 outline"), "hand-pixelled in tools/incubatorbud.py")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
S = 5; names = ["bud-early-128x160", "bud-late-128x160", "bud-ready-128x160", "bud-ready-front-128x160", "bud-crack-1-128x160", "bud-crack-2-128x160"]
sheet = Image.new("RGB", (6 * 134 + 8 + 200, 168 + 130), (45, 53, 63)); x = 4
for n in names:
    t = outs[n]; base = Image.new("RGBA", (128, 160), (45, 53, 63, 255)); 
    if "crack" in n: base.alpha_composite(outs["bud-ready-128x160"])
    if n == "bud-ready-front-128x160": base.alpha_composite(Image.new("RGBA", (128, 160), (0, 0, 0, 0))); base.alpha_composite(outs["bud-ready-128x160"])
    base.alpha_composite(t); sheet.paste(base.convert("RGB"), (x, 4)); x += 134
y = 176; x = 4
for n in ("leaf-empty-16x20", "leaf-full-16x20", "leaf-empty-8x12", "leaf-full-8x12"):
    t = outs[n]; z = t.resize((t.width * 5, t.height * 5), Image.NEAREST); sheet.paste(z.convert("RGB"), (x, y), z); x += z.width + 12
x = 440
for n in ("leaf-empty-16x20", "leaf-full-16x20", "leaf-empty-8x12", "leaf-full-8x12"):
    t = outs[n]; sheet.paste(t.convert("RGB"), (x, y + 10), t); x += 24
sheet.save("marks/incubator-bud-proof-1x.png"); print("ok")
