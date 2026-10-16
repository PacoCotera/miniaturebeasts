"""Pass 75 (redrawn in pass 81 after the art director's verdict): the Library field guide's small marks (origin/design-field-guide 2353443f, library.json masters), typed pixel by pixel, no image generator, no API call, never scaled from another size.
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
WISH = {"y": "yellow", "c": "cream", "g": "gold"}
PIP = ["c.cc.c", "......", "c....c", "c....c", "......", "c.cc.c"]
# pass 81: the glint's silhouette is typed as the width of the shape on each row (centred), the cream core and the gold shade (lower right, was amber) set by rule, and a 1 px `bark` keyline round the silhouette on the outside:
# 10x10 inside the 12 box, 22x22 inside the 24 box; the horizontal arm 2 px thick to its tips (the two middle rows span the full width)
PROFILE10 = [2, 2, 4, 6, 10, 10, 6, 4, 2, 2]
PROFILE22 = [2, 2, 2, 2, 4, 4, 4, 6, 8, 12, 22, 22, 12, 8, 6, 4, 4, 4, 2, 2, 2, 2]
def glint(profile, core):
    n = len(profile); sh = [[False] * n for _ in range(n)]
    for y, wd in enumerate(profile):
        for x in range(n // 2 - wd // 2, n // 2 + wd // 2): sh[y][x] = True
    out = Image.new("RGBA", (n + 2, n + 2), (0, 0, 0, 0)); half = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            if not sh[y][x]: continue
            if abs(x - half) + abs(y - half) <= core: c = "cream"
            elif x >= n // 2 and ((x + 1 >= n or not sh[y][x + 1]) or (y >= n // 2 and (y + 1 >= n or not sh[y + 1][x]))): c = "gold"
            else: c = "yellow"
            out.putpixel((x + 1, y + 1), pal[c] + (255,))
    for y in range(n):
        for x in range(n):
            if sh[y][x]: continue
            if any(0 <= y + dy < n and 0 <= x + dx < n and sh[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)): out.putpixel((x + 1, y + 1), pal["bark"] + (255,))
    for y in range(n + 2):                                     # the keyline also runs round the outer rows and columns where the silhouette touches the 10 / 22 box
        for x in range(n + 2):
            if out.getpixel((x, y))[3] == 0 and any(0 <= y + dy < n + 2 and 0 <= x + dx < n + 2 and out.getpixel((x + dx, y + dy))[3] and out.getpixel((x + dx, y + dy)) != pal["bark"] + (255,) for dx in (-1, 0, 1) for dy in (-1, 0, 1)): out.putpixel((x, y), pal["bark"] + (255,))
    return out
# the open book (16x16, `bone`; fog shade on the right page): each page's top falls 1 px per 3 px towards a 1 px spine at x 7, its bottom edge curved to match, two text lines per page, no feet, rows 2 to 13 (centred)
def book():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); B, F = pal["bone"] + (255,), pal["fog"] + (255,)
    def off(x): return (x if x <= 7 else 14 - x) // 3          # 0 at the outer edge, 2 at the spine
    for x in range(15):
        t, b = 2 + off(x), 11 + off(x); im.putpixel((x, t), B); im.putpixel((x, b), F if x >= 8 else B)
    for y in range(2, 12): im.putpixel((0, y), B); im.putpixel((14, y + 0), F)
    for y in range(4, 14): im.putpixel((7, y), B)
    for y in (6, 8):
        for x in (2, 3, 4): im.putpixel((x, y), B); im.putpixel((14 - x, y), B)
    return im
# the pressed paper seal (32x32): 12 even scallops typed as one quadrant (16x16, # inside) and mirrored; `sand` face, a 1 px `clay` groove ring, a `bark` keyline, a `bark` shade at the bottom right
QUAD = ["################", "###############.", "##############..", "#############...", "#############...", "##############..", "##############..", "##############..",
        "#############...", "#########.......", "#########.......", "#########.......", "#########.......", "###..###........", "##..............", "#..............."]
assert all(QUAD[y][x] == QUAD[x][y] for y in range(16) for x in range(16)), "the quadrant is symmetric about its diagonal (even scallops)"
def seal32():
    assert len(QUAD) == 16 and all(len(r) == 16 for r in QUAD)
    sh = [[False] * 32 for _ in range(32)]
    for y in range(16):
        for x in range(16):
            if QUAD[y][x] == "#": sh[15 - y][15 - x] = sh[15 - y][16 + x] = sh[16 + y][15 - x] = sh[16 + y][16 + x] = True
    ins = lambda x, y: 0 <= x < 32 and 0 <= y < 32 and sh[y][x]
    edge = {(x, y) for y in range(32) for x in range(32) if sh[y][x] and not all(ins(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0)); import math
    for y in range(32):
        for x in range(32):
            if not sh[y][x]: continue
            r = math.hypot(x - 15.5, y - 15.5)
            if (x, y) in edge: c = "bark"
            elif abs(r - 11.0) < 0.55: c = "clay"
            elif (x + y) > 36 and any((x + dx, y + dy) in edge for dx in (-1, 0, 1) for dy in (-1, 0, 1)): c = "bark"
            else: c = "sand"
            im.putpixel((x, y), pal[c] + (255,))
    return im
NAMES = {"guide-pip-unseen-6x6": spr(PIP, 6, 6, {"c": "clay"}, "pip"), "wish-mark-12": glint(PROFILE10, 2.5), "wish-mark-24": glint(PROFILE22, 5.5),
         "mark-guide-16": book(), "guide-seal-32": seal32()}
MADE = {"guide-pip-unseen-6x6": "a dotted hollow pip in `clay` (corners and the pairs at the middle of each side lit, nothing inside); the unseen look's pip",
        "wish-mark-12": "the pinned look's glint: a 10x10 silhouette (yellow, cream core, `gold` shade lower right) inside a 1 px `bark` keyline, so 12x12; on a trait cell and its plate",
        "wish-mark-24": "the pinned wish panel's corner on the face spread: the same glint drawn again at 22x22 inside a 1 px `bark` keyline, so 24x24, the horizontal arm 2 px thick to its tips; never scaled",
        "mark-guide-16": "an open book in `bone` for chrome: no feet, each page's top falling 1 px per 3 px towards a 1 px spine, the bottom edge curved to match, two text lines per page, `fog` shade on the right page, centred (rows 2 to 13)",
        "guide-seal-32": "the guide complete: a pressed paper seal, 12 even scallops typed as one quadrant and mirrored, a `sand` face, a 1 px `clay` groove ring, a `bark` keyline and a `bark` shade at the bottom right; no glint, no gold, no yellow"}
man = json.load(open("slices/manifest.json"))
for n, im in NAMES.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": None, "src": "typed by hand", "made": MADE[n] + " (pass 81, after the art director's verdict on pass 75)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof at 1x on the surfaces they sit on: the wish marks on a 56x56 look plate (top right, inset 2) and a `paper` ground, the seal on `paper`, the book on the chrome `panel` colour
cv = Image.new("RGB", (330, 76), pal["paper"]); cv.paste(Image.open("slices/trait-S12-colour-marigold-56x56.png"), (8, 10)); cv.paste(Image.new("RGB", (80, 76), pal["panel"]), (250, 0))
c4 = cv.convert("RGBA"); c4.alpha_composite(NAMES["wish-mark-12"], (8 + 56 - 12 - 2, 10 + 2)); c4.alpha_composite(NAMES["wish-mark-12"], (80, 20)); c4.alpha_composite(NAMES["wish-mark-24"], (110, 20))
c4.alpha_composite(NAMES["guide-seal-32"], (160, 20)); c4.alpha_composite(NAMES["guide-pip-unseen-6x6"], (210, 33)); c4.alpha_composite(NAMES["mark-guide-16"], (275, 30))
c4.convert("RGB").save("marks/guide-marks-proof-1x.png"); c4.convert("RGB").resize((330 * 4, 76 * 4), Image.NEAREST).save("marks/guide-marks-proof-4x.png")
