"""Pass 94: Idle's Vivarium, 1024x568 in day, dusk and night (Station art director's brief, Oct 10; direction: board frame 1's vivarium, the same light and Miniature Lives rendering): idle-vivarium-{day,dusk,night}-1024x568. The id is my proposal: no slice name is written in the layout (it says "Idle's Vivarium 1024x568, a painting per light").
One painting serves three uses: Idle shows it full; the whole Vivarium shows rows 120 to 560; Home's glass is its crop (0, 40, 640, 488). Composed in the prompt: rows 0 to 120 canopy and light only; the ground band (rows 376 to 552) holds the burrow, the water, the stones and the moss at the mibis' scale; the left 640 px work on their own as Home's view; the life-support (a feed line, a mister, a vent) meets the edges; no creature painted in.
Day: source/raw/vivarium-day.jpg (Pro). Dusk and night are Pro edits of the day picture (vivarium-dusk.jpg, vivarium-night-r2.jpg; the first night, vivarium-night.jpg, was too dark and its canopy blue-teal and is not used). Each 1376x768 painting is cropped to 1024:568 (a few rows off the top and bottom) and reduced with Lanczos.
Night is graded: its mean L* was 24.9 against the required 30 or more, so its linear light is raised by the least gain that brings the mean L* to 30.5 or more (a soft knee holds the highlights under 250); nothing else changes.
Pass 96: the hard canopy seam (row ~114) and the faint vertical seam (x ~695) are blended by hand in fix_seams() before grading, no paid call.
python3 -I tools/vivarium.py -> slices/idle-vivarium-*.png, marks/vivarium-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
def cut(src):
    im = Image.open(f"source/raw/{src}.jpg").convert("RGB"); W, H = im.size; ch = round(W * 568 / 1024); y0 = (H - ch) // 2; return im.crop((0, y0, W, y0 + ch)).resize((1024, 568), Image.LANCZOS)
def fix_seams(im):
    from PIL import ImageFilter
    a = np.asarray(im).astype(float); H, W, _ = a.shape
    d = np.abs(np.diff(a[100:146, 100:900].mean(2), axis=0)).mean(1); r = 100 + int(np.argmax(d)) + 1
    band = a[r - 24:r].mean(0, keepdims=True)
    ext = np.repeat(band, 70, axis=0); ext = np.asarray(Image.fromarray(ext.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(float)
    k = np.ones(41) / 41; ext = np.stack([np.stack([np.convolve(np.pad(ext[y, :, c], 20, mode="edge"), k, "valid") for c in range(3)], 1) for y in range(70)])
    off = a[r + 4:r + 16, 100:900].mean((0, 1)) - a[r - 16:r - 4, 100:900].mean((0, 1))
    if np.abs(off).max() > 6:
        yy = np.arange(H, dtype=float); up = np.clip(1 - (r - yy) / 100.0, 0, 1) * (yy < r); dn = np.clip(1 - (yy - r) / 110.0, 0, 1) ** 1.5 * (yy >= r)
        cb = a[r + 4:r + 16].mean(0) - a[r - 16:r - 4].mean(0); kk = np.ones(81) / 81; cb = np.stack([np.convolve(np.pad(cb[:, c], 40, mode="edge"), kk, "valid") for c in range(3)], 1)
        fld = (0.5 * cb[None, :, :] * (up + (-dn))[:, None, None]); xs = np.zeros(W); xs[60:960] = 1; xs = np.convolve(xs, np.ones(41) / 41, "same")
        a = np.clip(a + fld * xs[None, :, None], 0, 255)
    ys = np.arange(70)[:, None]; al = (0.2 if np.abs(off).max() > 6 else 0.55) * (1 - ys / 70.0) ** 2
    xm = np.zeros(W); xm[80:940] = 1; xm = np.convolve(xm, np.ones(29) / 29, "same")[None, :]
    al = (al * xm)[..., None]; b = a.copy(); b[r:r + 70] = a[r:r + 70] * (1 - al) + ext * al
    blur = np.asarray(Image.fromarray(b.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float)
    w = np.clip(1 - np.abs(np.arange(H) - r) / 12.0, 0, 1)[:, None, None]; b = b * (1 - w) + blur * w
    hb = np.asarray(Image.fromarray(b.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))).astype(float)
    wx = np.clip(1 - np.abs(np.arange(W) - 695) / 14.0, 0, 1)[None, :, None]; wy = np.zeros((H, 1, 1)); wy[120:420] = 1
    b = b * (1 - wx * wy) + hb * (wx * wy)
    return Image.fromarray(b.clip(0, 255).round().astype(np.uint8))
def night_fix(im):
    """Pass 102, the Station lead's measurement (art director's hand fix): (1) the moon rim's near-white strokes in the canopy (rows 0 to 190) recoloured 70 percent toward (168, 182, 204); (2) the glow blooms (everything above L* 50) cut 50 percent toward a 31 px median; (3) the shadows lifted by the least gain (weighted to L* under 50) that brings the mean L* back to 30.5 or more, keeping mean R at or above mean B."""
    from PIL import ImageFilter
    a = np.asarray(im).astype(float); L = lstar(a); mx = a.max(2); mn = a.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    rim = ((L > 60) & (sat < 0.25)).astype(float); rim[190:] = 0; rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.0))).astype(float)[..., None] / 255.0
    a = a + 0.7 * rim * (np.array([168.0, 182.0, 204.0]) - a)
    sm = im.resize((512, 284), Image.LANCZOS).filter(ImageFilter.MedianFilter(15)).resize((1024, 568), Image.BICUBIC); med = np.asarray(sm).astype(float)
    L = lstar(a); w = np.clip((L - 50.0) / 12.0, 0, 1)[..., None]; w = np.asarray(Image.fromarray((w[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)[..., None] / 255.0
    a = a + 0.5 * w * (med - a)
    lin = np.where(a / 255 <= 0.04045, a / 255 / 12.92, ((a / 255 + 0.055) / 1.055) ** 2.4)
    for g in np.arange(1.0, 2.0, 0.01):
        Lw = lstar(a); wt = 1.0 - np.clip((Lw - 40.0) / 15.0, 0, 1); l2 = np.clip(lin * (1 + (g - 1) * wt[..., None]), 0, 1)
        cand = np.clip(np.rint(np.where(l2 <= 0.0031308, l2 * 12.92, 1.055 * l2 ** (1 / 2.4) - 0.055) * 255), 0, 255)
        if lstar(cand).mean() >= 30.5 and cand[..., 0].mean() >= cand[..., 2].mean(): break
    return Image.fromarray(cand.astype(np.uint8))
SRC = {"day": "vivarium-day", "dusk": "vivarium-dusk", "night": "vivarium-night-r2"}; man = json.load(open("slices/manifest.json")); out = {}; rep = {}
for k, s in SRC.items():
    im = fix_seams(cut(s))
    if k == "night":
        a = np.asarray(im).astype(float) / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
        for g in np.arange(1.0, 3.0, 0.02):
            l2 = lin * g; l2 = np.where(l2 > 0.8, 0.8 + (1 - np.exp(-(l2 - 0.8) / 0.2)) * 0.2, l2); l2 = np.clip(l2, 0, 1)
            sr = np.where(l2 <= 0.0031308, l2 * 12.92, 1.055 * l2 ** (1 / 2.4) - 0.055); cand = np.clip(np.rint(sr * 255), 0, 255)
            if lstar(cand).mean() >= 30.5: break
        im = night_fix(Image.fromarray(cand.astype(np.uint8))); rep["night gain"] = round(float(g), 2)
    n = f"idle-vivarium-{k}-1024x568"; im.save(f"slices/{n}.png", optimize=True); out[k] = im; rep[k] = {"mean L*": round(float(lstar(np.asarray(im).astype(float)).mean()), 1)}
    man[n] = {"size": [1024, 568], "rect": None, "src": f"source/raw/{s}.jpg (gemini-3-pro-image)", "made": f"Idle's Vivarium by {k}: a Pro painting of the vivarium alone (canopy band on top, ground band with burrow, water, stones and moss, feed line, mister and vent at the edges, no creatures), cropped to 1024:568 and reduced with Lanczos" + (f" (the day picture's edit: dusk is warmer and lower)" if k == "dusk" else f" (an edit of the day picture: warm, low, glow-moss, the moon a cool rim only; graded x{rep.get('night gain')} in linear light to a mean L* of {rep[k]['mean L*']})" if k == "night" else "") + " (pass 94)",
                      "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(rep))
sheet = Image.new("RGB", (1024 + 640 + 24, 3 * 576 + 8), (10, 14, 18))
for i, k in enumerate(("day", "dusk", "night")): sheet.paste(out[k], (4, 4 + i * 576)); sheet.paste(out[k].crop((0, 40, 640, 488)), (1024 + 16, 4 + i * 576 + 60))
sheet.save("marks/vivarium-proof-1x.png")
