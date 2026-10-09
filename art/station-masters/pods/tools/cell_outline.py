"""Pass 59: cell-outline-unread-24x24, the open chapter page's unread picture (pods.json: a dotted 1 px outline round P, nothing inside): a nine-slice with 8 px insets on every side, so its edges tile to any
cell size of even width and height (128x160, 120x96, ...). A 1 px line, one dot lit and one gap (period 2, which divides the 8 px tile), the mist of the station palette (#8d8aa6); every other pixel, the middle included, is fully
transparent. Dots sit where the coordinate counted from the top-left is even: the top-left corner pixel is lit; at the other three corners the corner pixel is left off (it would touch both neighbours), so no two dots ever touch at a
corner or at a seam. Typed as rules on the three kinds of piece, not drawn by a generator of the whole cell. python3 -I tools/cell_outline.py -> slices/cell-outline-unread-24x24.png, marks/cell-outline-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
MIST = pal["mist"]; N = 24; K = 8
im = Image.new("RGBA", (N, N), (0, 0, 0, 0)); on = lambda x, y: im.putpixel((x, y), MIST + (255,))
for t in range(0, N, 2):
    on(t, 0); on(t, N - 1)                         # top and bottom: x even (the left corner piece 0..7, the edge tile 8..15, the right corner piece 16..23)
    on(0, t); on(N - 1, t)                         # left and right: y even
# the corner pixels: top left lit (the left and the top edge both give it); the others would touch a neighbour, so they are off
for (x, y) in ((N - 1, 0), (0, N - 1), (N - 1, N - 1)): im.putpixel((x, y), (0, 0, 0, 0))
# the right edge's top is y = 0 (off, the corner) then 2, 4 ...; the bottom edge's right end x = 22; the left edge's bottom end y = 22
im.save("slices/cell-outline-unread-24x24.png", optimize=True)
man = json.load(open("slices/manifest.json"))
man["cell-outline-unread-24x24"] = {"size": [N, N], "rect": None, "src": "typed by hand", "made": "the unread picture's dotted outline: a nine-slice (insets 8 px on every side; edges tile at 8 px, the middle fully transparent) of a 1 px line in mist #8d8aa6, one dot lit and one gap, dots where the coordinate from the top left is even; for even cell sizes; the corner pixel is off at three corners so no dots touch", "nine": {"insets": {"left": K, "top": K, "right": K, "bottom": K}, "edgeTile": 8, "middle": "transparent"}, "sha256": hashlib.sha256(open("slices/cell-outline-unread-24x24.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
def tile(w, h):
    """The nine-slice at w x h: corners 8x8 as they are, edges by repeating the 8 px tile, the middle transparent."""
    assert w % 2 == 0 and h % 2 == 0 and w >= 2 * K and h >= 2 * K
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); P = lambda a: im.crop(a)
    out.paste(P((0, 0, K, K)), (0, 0)); out.paste(P((N - K, 0, N, K)), (w - K, 0)); out.paste(P((0, N - K, K, N)), (0, h - K)); out.paste(P((N - K, N - K, N, N)), (w - K, h - K))
    for x in range(K, w - K, K): n = min(K, w - K - x); out.paste(P((K, 0, K + n, K)), (x, 0)); out.paste(P((K, N - K, K + n, N)), (x, h - K))
    for y in range(K, h - K, K): n = min(K, h - K - y); out.paste(P((0, K, K, K + n)), (0, y)); out.paste(P((N - K, K, N, K + n)), (w - K, y))
    return out
# checks: the tiled outline at several sizes: lit count, no two lit pixels touching (8-neighbourhood), every lit pixel on the border row/column, the middle empty
rep = {}
for (w, h) in ((128, 160), (120, 96), (24, 24), (104, 64)):
    a = np.asarray(tile(w, h))[..., 3] > 0; ys, xs = np.where(a); touch = 0
    for y, x in zip(ys, xs):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dy or dx) and 0 <= y + dy < h and 0 <= x + dx < w and a[y + dy, x + dx]: touch += 1
    on_border = bool(((ys == 0) | (ys == h - 1) | (xs == 0) | (xs == w - 1)).all()); rep[(w, h)] = (int(a.sum()), touch, on_border, int(a[1:-1, 1:-1].sum()))
print(rep)
# proof, 1x: the outline tiled to 128x160 and 120x96 beside a flat ground cell with a crop, on the room's dark bench tone
GROUND = pal["ground"]; f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12); f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16)
cv = Image.new("RGBA", (620, 260), (10, 20, 26, 255)); d = ImageDraw.Draw(cv)
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
def cell(x, y, w, h, crop=None, outline=False, name=""):
    cv.alpha_composite(Image.new("RGBA", (w, h), GROUND + (255,)) if not outline else Image.new("RGBA", (w, h), (10, 20, 26, 255)), (x, y))
    if crop is not None: cv.alpha_composite(crop, ((x + (w - crop.width) // 2), y + (h - crop.height) // 2))
    if outline: cv.alpha_composite(tile(w, h), (x, y))
    nw = d.textlength(name, font=f16); d.text((x + (w - nw) / 2, y + h + 4 + 16), name, font=f16, fill=pal["bone"] + (255,), anchor="ls")
cell(16, 16, 128, 160, S("trait-S09-head-between-small-and-large-128x160"), False, "Translucency")
cell(160, 16, 128, 160, None, True, "Translucency")
cell(320, 16, 120, 96, S("trait-S01-eyes-between-small-and-large-104x96"), False, "Colour")
cell(456, 16, 120, 96, None, True, "Colour")
d.text((16, 212), "flat ground cell with a crop, and the unread outline on the bench, at 128x160 and 120x96", font=f12, fill=(141, 138, 166, 255))
cv.convert("RGB").save("marks/cell-outline-proof-1x.png"); cv.convert("RGB").resize((1240, 520), Image.NEAREST).save("marks/cell-outline-proof-2x.png")
