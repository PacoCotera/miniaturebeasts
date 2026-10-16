"""Pass 76: the Library field guide's chapter panels, guide-panel-<chapter>-128x80 and -112x80 (nine chapters) and guide-panel-sealed-128x80 / -112x80
(origin/design-field-guide 2353443f; station-layouts.md "Book: the guide spread", library.json masters). Hand-drawn, no image generator, no API call, never scaled from another size.
Each chapter has one shared master per width, drawn untinted for the `paper` the build fills first: a 1 px `bark` edge, a faint paper grain (`clay`, alpha 34 on about one pixel in 14 inside x 1..w-2, y 3..78, chosen afresh at each width: the 112s are painted at 112, not cut from the 128s),
the chapter's ink emblem 40x40 at (w/2 - 20, 8) ((44, 8) at 128, (36, 8) at 112) in `ink`, and open ground (transparent) everywhere else so the build's tint shows. No tint, no word, no text.
The nine emblems are drawn on the 40 px grid in the grammar of the 24x24 rail emblems (the same nine pictures: claw strokes, an eye, a rock, a tail, two paws, a rising line, a peak, a ring, a bolt), 2 px strokes, never enlarged from the 24s.
Sealed: `paper` untinted, so the master carries the slats (a lit `clay` line over a `bark` shade line on a 4 px pitch from y 3, alpha 60 and 35, x 1..w-2, rows 48 to 63 left clear for the word; pass 82) and the 8x4 notch at the bottom centre ((w/2 - 4, 72), a `soil` slot with a `clay` lip under it), the edge and the grain; no emblem (the build places rail-emblem-<chapter>-sealed-24x24 at (w/2 - 12, 8)).
python3 -I tools/guidepanels.py -> slices/guide-panel-*.png, marks/guide-panels-proof-1x.png and -3x.png"""
import os, json, hashlib, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
INK = pal["ink"] + (255,)
def bez(p0, p1, p2, n=60): return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]
class E:
    def __init__(s): s.im = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    def dot(s, x, y, b=2):
        for dx in range(b):
            for dy in range(b):
                if 0 <= x + dx < 40 and 0 <= y + dy < 40: s.im.putpixel((x + dx, y + dy), INK)
    def line(s, a, b, w=2):
        n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2) + 1
        for i in range(n + 1): s.dot(round(a[0] + (b[0] - a[0]) * i / n), round(a[1] + (b[1] - a[1]) * i / n), w)
    def poly(s, pts, closed=False, w=2):
        for a, b in zip(pts, pts[1:] + ([pts[0]] if closed else [])): s.line(a, b, w)
    def curve(s, p0, p1, p2, w=2):
        pts = bez(p0, p1, p2)
        for a, b in zip(pts, pts[1:]): s.line(a, b, w)
    def fill(s, pts):
        d = ImageDraw.Draw(s.im); d.polygon([(round(x), round(y)) for x, y in pts], fill=INK)
    def ell(s, cx, cy, rx, ry, filled=False, w=2):
        pts = [(cx + rx * math.cos(a / 40 * 6.2832), cy + ry * math.sin(a / 40 * 6.2832)) for a in range(41)]
        if filled: s.fill(pts)
        else: s.poly([(round(x), round(y)) for x, y in pts], w=w)
def coat():                                                              # pass 82: three curved strands leaning right about 20 degrees, 2 px strokes (the 24x24 rail emblem's picture: three bowed strands, the middle one longest)
    e = E()
    for x0, y0, y1 in ((6, 7, 36), (16, 3, 37), (26, 9, 34)):
        ln = y1 - y0; e.curve((x0 + round(ln * 0.36), y0), (x0 - 2, y0 + ln * 0.42), (x0, y1))
    return e.im

def face():                                                              # the eye: a lid arc, the eye, a pupil
    e = E(); e.curve((4, 15), (20, 3), (36, 15)); e.ell(20, 26, 16, 8); e.ell(20, 26, 3, 2, filled=True); return e.im
def shape():                                                             # pass 82: a soft two-hump lump on a flat base, one 2 px outline, no sawtooth and no inner stroke
    e = E(); e.curve((5, 30), (2, 13), (14, 13)); e.curve((14, 13), (19, 13), (21, 18)); e.curve((21, 18), (24, 9), (31, 14)); e.curve((31, 14), (38, 18), (35, 30)); e.line((5, 30), (35, 30)); return e.im

def legs_tail():                                                          # pass 82: an S-curved tail, its outline in 2 px strokes, three drips at the upper right (the 24x24 rail emblem's picture)
    e = E(); f = Image.new("L", (40, 40), 0); d = ImageDraw.Draw(f)
    pts = bez((8, 35), (9, 24), (18, 22)) + bez((18, 22), (27, 20), (32, 10))
    for i, (x, y) in enumerate(pts):
        r = 2.6 + 2.6 * i / len(pts); d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    from PIL import ImageFilter
    inner = f.filter(ImageFilter.MinFilter(5)); a = np.asarray(f).astype(int) - np.asarray(inner).astype(int)
    for y, x in zip(*np.where(a > 0)): e.im.putpixel((int(x), int(y)), INK)
    for x in (26, 30, 34): e.line((x, 15), (x, 21), 2 if False else 1); e.line((x + 1, 15), (x + 1, 21), 1)
    return e.im

def movement():                                                          # two paws, one behind the other
    e = E()
    for cx, cy in ((12, 28), (28, 12)):
        e.ell(cx, cy + 4, 6, 4.5, filled=True)
        for dx, dy in ((-9, -3), (-2, -8), (5, -3)): e.dot(cx + dx, cy + dy, 4)
    return e.im
def stamina():                                                           # pass 82: the two-wave rising line (two ripples on a climb), 2 px strokes, no separate dot
    e = E(); pts = [(x, 33 - 0.72 * (x - 3) + 3.2 * math.sin((x - 3) / 33 * 4 * math.pi)) for x in range(3, 37)]
    e.poly([(round(x), round(y)) for x, y in pts]); return e.im

def character():                                                         # a peak with an inner crease and a long foot
    e = E(); e.curve((6, 36), (6, 5), (17, 5)); e.curve((17, 5), (21, 14), (35, 36)); e.curve((14, 14), (18, 22), (19, 34), 1); return e.im
def glow():                                                              # pass 82: a ring with its gaps at the upper left and the lower right, a centre dot
    e = E(); cx = cy = 19.5; R = 15.2
    for k in range(0, 720):
        a = k / 2.0                                                       # degrees, 0 = right, 90 = down (screen)
        if abs((a - 225 + 180) % 360 - 180) < 21 or abs((a - 45 + 180) % 360 - 180) < 21: continue
        e.dot(round(cx + R * math.cos(math.radians(a)) - 1), round(cy + R * math.sin(math.radians(a)) - 1), 2)
    e.dot(19, 19, 2); return e.im

def charge():                                                            # a bolt: three strokes zigzag
    e = E(); e.poly([(25, 2), (13, 19), (24, 23), (10, 38)]); e.line((24, 23), (30, 15)); e.line((30, 15), (24, 18)); return e.im
CH = {"coat": coat, "face": face, "shape": shape, "legs-tail": legs_tail, "movement": movement, "stamina": stamina, "character": character, "glow": glow, "charge": charge}
def base(w, seed):
    im = Image.new("RGBA", (w, 80), (0, 0, 0, 0)); bark = pal["bark"] + (255,)
    for x in range(w): im.putpixel((x, 0), bark); im.putpixel((x, 79), bark)
    for y in range(80): im.putpixel((0, y), bark); im.putpixel((w - 1, y), bark)
    rng = random.Random(seed); g = pal["clay"] + (34,)
    for y in range(3, 79):
        for x in range(1, w - 1):
            if rng.random() < 1 / 14: im.putpixel((x, y), g)
    return im
def sealed(w):
    im = base(w, f"sealed{w}")
    for k in range(19):
        y = 3 + 4 * k
        if y + 1 > 78: break
        if 48 <= y + 1 and y <= 63: continue                              # rows 48 to 63 stay clear for the word
        for x in range(1, w - 1): im.putpixel((x, y), pal["clay"] + (60,)); im.putpixel((x, y + 1), pal["bark"] + (35,))
    for dx in range(8):
        for dy in range(4): im.putpixel((w // 2 - 4 + dx, 72 + dy), pal["soil"] + (255,))
        im.putpixel((w // 2 - 4 + dx, 76), pal["clay"] + (255,))
    return im
man = json.load(open("slices/manifest.json")); OUT = {}
for w in (128, 112):
    for c, fn in CH.items():
        im = base(w, f"{c}{w}"); em = fn(); im.alpha_composite(em, (w // 2 - 20, 8)); OUT[f"guide-panel-{c}-{w}x80"] = im
    OUT[f"guide-panel-sealed-{w}x80"] = sealed(w)
for n, im in OUT.items():
    im.save(f"slices/{n}.png", optimize=True)
    what = "a shut panel: slats (a lit clay line over a bark shade line on a 4 px pitch), the 8x4 notch at the bottom centre, the edge and the grain; untinted, no emblem (the build places the sealed rail emblem)" if "sealed" in n else "the chapter's shared untinted master: a bark edge, a faint clay grain, the ink emblem 40x40 at (w/2 - 20, 8), open ground for the tint"
    man[n] = {"size": list(im.size), "rect": None, "src": "typed by hand", "made": f"{what}; hand-drawn at {im.width}, never scaled (pass 76)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof: each panel on `paper` with the build's tint (sea, as for S09) laid under it, at 1x
def tinted(im, tint):
    w = im.width; bg = Image.new("RGBA", (w, 80), pal["paper"] + (255,))
    for y in range(3, 79):
        for x in range(1, w - 1):
            if (x % 4, y % 4) in ((0, 0), (2, 2)): bg.putpixel((x, y), tint + (255,))
    for y in (1, 2):
        for x in range(1, w - 1): bg.putpixel((x, y), tint + (255,))
    bg.alpha_composite(im); return bg
cv = Image.new("RGB", (5 * 136 + 8, 2 * 88 + 2 * 88 + 8), (10, 20, 26)); names = list(CH) + ["sealed"]
for i, c in enumerate(names):
    for r, w in enumerate((128, 112)):
        im = OUT[f"guide-panel-{c}-{w}x80"]; t = tinted(im, pal["sea"]) if c != "sealed" else Image.new("RGBA", (w, 80), pal["paper"] + (255,))
        if c == "sealed":
            t.alpha_composite(im); t.alpha_composite(Image.open("slices/rail-emblem-coat-sealed-24x24.png").convert("RGBA"), (w // 2 - 12, 8))
            f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); ImageDraw.Draw(t).text((w // 2, 56), "Coat", font=f16, fill=pal["mist"] + (255,), anchor="mm")
        cv.paste(t.convert("RGB"), (8 + (i % 5) * 136, 8 + (i // 5) * 176 + r * 88))
cv.save("marks/guide-panels-proof-1x.png"); cv.resize((cv.width * 2, cv.height * 2), Image.NEAREST).save("marks/guide-panels-proof-2x.png")
print(len(OUT), "panels")
