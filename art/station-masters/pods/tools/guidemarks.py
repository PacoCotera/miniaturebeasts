"""Pass 75: the Library field guide's small marks (origin/design-field-guide 2353443f, library.json masters), typed pixel by pixel, no image generator, no API call, never scaled from another size.
Art layer: station.json colours only; the family of the signed line glyphs and the Cross glint.
  guide-pip-unseen-6x6   a dotted hollow pip in `clay` (a look not yet seen; the found pip is a plain 6x6 `bark` rect drawn by the build)
  wish-mark-12           the pinned look's glint at 12 (the signed 12 px glint of the Cross wish: yellow, cream core, amber shade)
  wish-mark-24           the same glint drawn again at 24 (the face spread's pinned wish corner): a width profile typed per row, then the core and the shade by rule
  mark-guide-16          an open book in `bone`, for chrome after the species word on Habitat's card
  guide-seal-32          the guide complete: a scalloped gold seal, a lit sand rim top left and a bark shade bottom right, a clay groove, the glint at its centre
python3 -I tools/guidemarks.py -> slices/guide-*.png, wish-mark-*.png, mark-guide-16.png, marks/guide-marks-proof-1x.png and -4x.png"""
import os, json, hashlib
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
def spr(rows, w, h, leg, name):
    assert len(rows) == h, (name, len(rows)); im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == w, (name, y, len(r), r)
        for x, ch in enumerate(r):
            if ch != ".": im.putpixel((x, y), pal[leg[ch]] + (255,))
    return im
WISH = {"y": "yellow", "c": "cream", "a": "amber"}
WISH12 = [".....cy.....", ".....cy.....", ".....cy.....", "....ycca....", "....yccca...", "yyyyccccyyya", "yyyyccccyyya", "....ycccaa..", "....yccaa...", ".....caa....", ".....caa....", ".....aa....."]
PIP = ["c.cc.c", "......", "c....c", "c....c", "......", "c.cc.c"]
BOOK = ["................", "................", ".bbbbbb..bbbbbb.", ".b....bbbb....b.", ".b.bb.b..b.bb.b.", ".b....b..b....b.", ".b.bb.b..b.bb.b.", ".b....b..b....b.", ".b.bb.b..b.bb.b.", ".b....bbbb....b.", ".bbbbbb..bbbbbb.", "..b........b....", "................", "................", "................", "................"]
BOOK[11] = "..bb........bb.."
# the 24 px glint: the width of the shape on each row (centred on columns 11 and 12), typed top to bottom; rows 11 and 12 are the full horizontal arm
PROFILE24 = [2, 2, 2, 2, 4, 4, 4, 6, 6, 8, 14, 24, 24, 14, 8, 6, 6, 4, 4, 4, 2, 2, 2, 2]
def glint24():
    sh = [[False] * 24 for _ in range(24)]
    for y, wd in enumerate(PROFILE24):
        for x in range(12 - wd // 2, 12 + wd // 2): sh[y][x] = True
    rows = []
    for y in range(24):
        r = ""
        for x in range(24):
            if not sh[y][x]: r += "."
            elif abs(x - 11.5) + abs(y - 11.5) <= 5: r += "c"
            elif x >= 12 and ((x + 1 < 24 and not sh[y][x + 1]) or (y + 1 < 24 and not sh[y + 1][x] and y >= 12)): r += "a"
            else: r += "y"
        rows.append(r)
    return rows
def seal32():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0)); cx = cy = 15.5
    import math
    for y in range(32):
        for x in range(32):
            dx, dy = x - cx, y - cy; r = math.hypot(dx, dy); ang = math.atan2(dy, dx)
            edge = 15.2 - 0.9 * (0.5 + 0.5 * math.cos(ang * 12))          # twelve soft scallops round the rim
            if r > edge: continue
            lit = (dx + dy) < -9; shade = (dx + dy) > 9
            if r > edge - 1.6: c = "sand" if lit else ("bark" if shade else "clay")
            elif 11.0 < r <= 12.2: c = "bark" if not lit else "clay"        # the groove
            else: c = "gold"
            im.putpixel((x, y), pal[c] + (255,))
    g = spr(WISH12, 12, 12, WISH, "seal glint"); im.alpha_composite(g, (10, 10)); return im
NAMES = {"guide-pip-unseen-6x6": spr(PIP, 6, 6, {"c": "clay"}, "pip"), "wish-mark-12": spr(WISH12, 12, 12, WISH, "w12"), "wish-mark-24": spr(glint24(), 24, 24, WISH, "w24"),
         "mark-guide-16": spr(BOOK, 16, 16, {"b": "bone"}, "book"), "guide-seal-32": seal32()}
MADE = {"guide-pip-unseen-6x6": "a dotted hollow pip in `clay` (corners and the pairs at the middle of each side lit, nothing inside); the unseen look's pip",
        "wish-mark-12": "the pinned look's glint at 12: yellow with a cream core and an amber shade (the signed Cross wish glint typed again), on a trait cell and its plate",
        "wish-mark-24": "the pinned wish panel's corner on the face spread: the same glint drawn again at 24 (a typed width profile; cream core, amber shade bottom right), never scaled",
        "mark-guide-16": "an open book in `bone` (two pages with two lines each, a spine, a foot), for chrome after the species word on Habitat's card",
        "guide-seal-32": "the guide complete: a scalloped gold seal (twelve scallops), a lit sand rim top left, a bark shade bottom right, a clay groove, the cream glint at its centre"}
man = json.load(open("slices/manifest.json"))
for n, im in NAMES.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": None, "src": "typed by hand", "made": MADE[n] + " (pass 75)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16)
cv = Image.new("RGBA", (330, 80), pal["ground"] + (255,)); d = ImageDraw.Draw(cv); x = 12
for n, im in NAMES.items():
    cv.alpha_composite(im, (x, 12)); d.text((x, 62), n.split("-")[0] if False else "", font=f16); x += im.width + 24
cv.convert("RGB").save("marks/guide-marks-proof-1x.png"); cv.convert("RGB").resize((cv.width * 4, cv.height * 4), Image.NEAREST).save("marks/guide-marks-proof-4x.png")

