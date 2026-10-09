"""Pass 60: cell-outline-unread-128x160, the open chapter page's unread picture (pods.json: a dotted 1 px `bevel` outline round P, 1 px on, 2 off, nothing inside), typed at its size (no nine-slice).
`bevel` #5a6672 = (90, 102, 114); alpha 0 or 255; the middle fully transparent. All four corners are lit; from each corner the dots run inward on a 3 px period (one on, two off); each side's remainder is taken up
as one gap at the side's middle; no two dots touch (not even diagonally). Top and bottom: dots at x = 0, 3 ... 60 and 127, 124 ... 67 (the gap between 60 and 67); left and right: y = 0, 3 ... 78 and 159, 156 ... 81 (period 3 all along, the
middle gap is the ordinary 2 off). The earlier cell-outline-unread-24x24 (a nine-slice of 1-on-1-off mist dots, off spec) is withdrawn. python3 -I tools/cell_outline.py -> slices/cell-outline-unread-128x160.png, marks/cell-outline-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
BEVEL = pal["bevel"]; W, H = 128, 160
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); on = lambda x, y: im.putpixel((x, y), BEVEL + (255,))
def run(length, a):
    """Dot positions along one side of the given length: from the first corner 0, 3 ... 3a; from the far corner length-1, length-4 ... length-1-3a."""
    return [3 * k for k in range(a + 1)] + [length - 1 - 3 * k for k in range(a + 1)]
for x in run(W, 20): on(x, 0); on(x, H - 1)           # top and bottom: 21 + 21 dots, the gap between x 60 and 67 at the middle
for y in run(H, 26): on(0, y); on(W - 1, y)           # left and right: 27 + 27 dots, the 3 px period unbroken (the middle gap is 2 off)
im.save("slices/cell-outline-unread-128x160.png", optimize=True)
a = np.asarray(im)[..., 3] > 0; ys, xs = np.where(a); touch = 0
for y, x in zip(ys, xs):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and a[y + dy, x + dx]: touch += 1
corners = [bool(a[0, 0]), bool(a[0, W - 1]), bool(a[H - 1, 0]), bool(a[H - 1, W - 1])]
print({"lit": int(a.sum()), "touching": touch, "corners lit": corners, "all on border": bool(((ys == 0) | (ys == H - 1) | (xs == 0) | (xs == W - 1)).all()), "inside lit": int(a[1:-1, 1:-1].sum()),
       "top gap": [int(x) for x in np.where(a[0])[0] if 55 <= x <= 72]})
man = json.load(open("slices/manifest.json"))
man["cell-outline-unread-128x160"] = {"size": [W, H], "rect": None, "src": "typed by hand", "made": "the unread picture's dotted outline typed at its size: 1 px `bevel` #5a6672 dots, 1 on 2 off; all four corners lit; from each corner the dots run inward on a 3 px period, each side's remainder one gap at its middle; no two dots touch; the middle fully transparent (pass 60; replaces the withdrawn cell-outline-unread-24x24)", "sha256": hashlib.sha256(open("slices/cell-outline-unread-128x160.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
GROUND = pal["ground"]; f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12); f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16)
cv = Image.new("RGBA", (340, 230), (10, 20, 26, 255)); d = ImageDraw.Draw(cv)
cv.alpha_composite(Image.new("RGBA", (W, H), GROUND + (255,)), (16, 16)); cv.alpha_composite(Image.open("slices/trait-S09-head-between-small-and-large-128x160.png").convert("RGBA"), (16, 16))
cv.alpha_composite(im, (172, 16))
for x0 in (16, 172):
    nw = d.textlength("Translucency", font=f16); d.text((x0 + (W - nw) / 2, 16 + H + 20), "Translucency", font=f16, fill=pal["bone"] + (255,), anchor="ls")
cv.convert("RGB").save("marks/cell-outline-proof-1x.png"); cv.convert("RGB").resize((680, 460), Image.NEAREST).save("marks/cell-outline-proof-2x.png")
