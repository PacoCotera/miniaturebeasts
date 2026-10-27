"""Vivarium rooms 2-4 (ad-rooms-briefs.md): the 0 MXN hand passes and the measurements.
  cut(raw, kind)           a raw Pro output cut like room 1's (centre crop to the target aspect, Lanczos): idle 1024x568, near 544x408
  device(im, light)        Idle only: room 1's same-light pixels pasted into the device pixels only, never whole columns (round 1 carried room 1's planting in with them):
                           the wall where room 1 shows it bare (left x 0-76 y 0-254, x 0-26 y 255-439; right x 932-1023 y 0-359, x 975-1023 y 360-429),
                           the connector (x 24-56 y 255-292) and the feed line down to y 372 (polyline (40,292)-(38,330)-(43,372), 18 px wide), the mister pipe and elbow
                           (x 884-914 y 0-131, x 882-950 y 125-182), the vent (inside the right wall), and the soil foot rows 552-567; 8 px feather outward
  measure(im, kind)        mean L* and mean R-B (sRGB 0-255): whole rows 120-560, ground band rows 376-551, the whole painting; near: all of it; Home cut x 64-667 y 194-555
python3 -I tools/rooms.py proof NAME... -> rooms/proof-<name>.png (1x, with the profile overlay) and a JSON line of measures
python3 -I tools/rooms.py proof-raw NAME... -> the same with no device paste (owner 18:03: room 1's device is no longer pasted into other rooms; round c on)"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
BX = [16, 100, 330, 560, 900, 1009]; TOP = [452, 432, 396, 404, 424]
def lstar(a):
    a = a / 255.0; lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4); Y = lin @ np.array([0.2126, 0.7152, 0.0722]); return np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y)
def cut(src, kind):
    W0, H0 = (1024, 568) if kind == "idle" else (544, 408)
    im = Image.open(src).convert("RGB"); W, H = im.size
    if W / H > W0 / H0: cw = round(H * W0 / H0); x0 = (W - cw) // 2; box = (x0, 0, x0 + cw, H)
    else: ch = round(W * H0 / W0); y0 = (H - ch) // 2; box = (0, y0, W, y0 + ch)
    return im.crop(box).resize((W0, H0), Image.LANCZOS)
def device_mask():
    mi = Image.new("L", (1024, 568), 0); d = ImageDraw.Draw(mi)
    for r in ((0, 0, 76, 254), (0, 255, 26, 439), (24, 255, 56, 292), (932, 0, 1023, 359), (975, 360, 1023, 429), (884, 0, 914, 131), (882, 125, 950, 182), (0, 552, 1023, 567)):
        d.rectangle(r, fill=255)
    d.line([(40, 292), (38, 330), (43, 372)], fill=255, width=18)
    m = np.asarray(mi) / 255.0
    # 8 px feather: the mask grows outward by a linear 8 px ramp (distance by repeated 1 px max-filters)
    out = m.copy(); cur = Image.fromarray((m * 255).astype(np.uint8))
    for k in range(1, 9):
        cur = cur.filter(ImageFilter.MaxFilter(3)); g = np.asarray(cur) / 255.0; out = np.maximum(out, g * (1 - k / 9.0))
    return out
def device(im, light):
    r1 = np.asarray(Image.open(f"slices/idle-vivarium-{light}-1024x568.png").convert("RGB")).astype(float); a = np.asarray(im).astype(float); m = device_mask()[..., None]
    return Image.fromarray((a * (1 - m) + r1 * m).round().clip(0, 255).astype(np.uint8))
def stats(a):
    L = lstar(a); return round(float(L.mean()), 1), round(float((a[..., 0] - a[..., 2]).mean()), 1)
def measure(im, kind):
    a = np.asarray(im.convert("RGB")).astype(float)
    if kind == "near": return {"near L*/R-B": stats(a)}
    return {"whole L*": stats(a[120:561])[0], "ground band L*/R-B": stats(a[376:552]), "painting R-B": stats(a)[1], "home cut L*": stats(a[194:556, 64:668])[0]}
def overlay(im):
    o = im.copy(); d = ImageDraw.Draw(o)
    for i, t in enumerate(TOP):
        d.line([BX[i], t, BX[i + 1] - 1, t], fill=(255, 40, 40), width=1); d.line([BX[i], t - 24, BX[i + 1] - 1, t - 24], fill=(255, 190, 40), width=1)
    d.rectangle([64, 194, 667, 555], outline=(255, 255, 255)); d.rectangle([588, 460, 668, 556], outline=(160, 160, 160))
    return o
if __name__ == "__main__":
    if sys.argv[1] in ("proof", "proof-raw"):
        for n in sys.argv[2:]:
            kind = "idle" if n.startswith("idle-") else "near"; light = n.split("-")[-2]
            im = cut(f"source/raw/{n}.jpg", kind)
            if kind == "idle" and sys.argv[1] == "proof": im = device(im, light)
            im.save(f"rooms/work-{n}.png")
            pr = Image.new("RGB", (im.width * 2 + 8, im.height), (0, 0, 0)); pr.paste(im, (0, 0)); pr.paste(overlay(im) if kind == "idle" else im, (im.width + 8, 0)); pr.save(f"rooms/proof-{n}.png")
            print(json.dumps({"name": n, **measure(im, kind)}))
