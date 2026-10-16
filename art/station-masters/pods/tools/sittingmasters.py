"""Pass 84: the hand-made and cut masters of the Sitting (origin/design-sitting, prototypes/ui/specs/station/sitting.json masters, station-layouts.md Sitting "Art direction"): no paid call.
  sitting-gilt-560x424 and sitting-gilt-lit-560x424   a modelled moulding 16 px deep on every side, the opening (transparent) at local (16, 16), 528x392. From the outside in: a 3 px bead, an 8 px leaf face lit from the top left, a 3 px inner shade lip, a 2 px sight edge.
        Each side has its own profile and the corners are mitred on the diagonal (top and left lit, bottom and right in shade). `station.json` colours only: bead soil / bark / clay / sand, leaf gold with a sand highlight line on the lit sides and clay and bark on the shaded ones, lip bark and soil, sight edge bark and soil.
        Lit: every leaf and bead colour one step brighter on the ramp soil, bark, clay, gold, yellow, cream, and a 2 px warm sight edge (sand, cream; sand, clay in shade). Never the focus gold `focus`.
  crate-sitting-80x56   Home's Bay crate for the sitting: the walk crate's roles (`deepTeal` body, `teal` lit top, `hairline` outline, `tealD` slat lines) with a small gilt frame on its front where the walk crate has the orange seal tag. Hand-placed rectangles at 1x.
  place-{meadow,pond,rock,wood,cave}-96x96   cut from the same painting and view as the signed 48 and 64 stamps (tools/build.py places(): the centred square of place-*.jpg / place2-*.jpg, wood cropped to its painted area), reduced from the painting (never from the 48 or 64), muted x0.85 and graded to the same means (86; wood 60, cave 80), highlights above grey 140 compressed.
python3 -I tools/sittingmasters.py -> slices/sitting-gilt-*.png, crate-sitting-80x56.png, place-*-96x96.png, marks/sitting-masters-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
man = json.load(open("slices/manifest.json")); made = {}
def rec(name, im, src, what):
    im.save(f"slices/{name}.png", optimize=True); made[name] = im
    man[name] = {"size": list(im.size), "rect": None, "src": src, "made": what + " (pass 84)", "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
# ---- the gilt frame
RAMP = ["soil", "bark", "clay", "gold", "yellow", "cream"]
def up(c): return RAMP[min(RAMP.index(c) + 1, 5)] if c in RAMP else c
LIT = ["bark", "sand", "clay",  "clay", "sand", "gold", "gold", "gold", "gold", "clay", "clay",  "bark", "bark", "soil",  "bark", "soil"]       # top and left, d = 0 outside .. 15 sight edge
SHD = ["soil", "bark", "soil",  "clay", "clay", "clay", "clay", "bark", "bark", "bark", "soil",  "soil", "soil", "bark",  "soil", "soil"]       # bottom and right
def gilt(lit):
    W, H, D = 560, 424, 16; im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); px = im.load()
    for y in range(H):
        for x in range(W):
            dl, dr, dt, db = x, W - 1 - x, y, H - 1 - y; d = min(dl, dr, dt, db)
            if d >= D: continue
            side = "t" if dt == d and dt <= dl and dt <= dr else "l" if dl == d and dl <= dt and dl <= db else "b" if db == d else "r"
            # the mitre: on the diagonal of a corner the side follows the lit pair (top, left) or the shaded pair (bottom, right) by the nearer edge
            prof = LIT if side in ("t", "l") else SHD; name = prof[d]
            if lit:
                if d >= 14: name = ("cream" if d == 14 else "sand") if side in ("t", "l") else ("sand" if d == 14 else "clay")
                elif d >= 3 and d <= 10 or d < 3: name = up(name) if name in RAMP else "cream" if name == "sand" else name
            px[x, y] = pal[name] + (255,)
    return im
rec("sitting-gilt-560x424", gilt(False), "typed by hand (profiles)", "the sitting's gilt frame at rest: a modelled moulding 16 px deep, a 3 px bead, an 8 px leaf face lit from the top left, a 3 px inner shade lip, a 2 px sight edge; the opening (local 16,16, 528x392) transparent; mitred corners; palette colours")
rec("sitting-gilt-lit-560x424", gilt(True), "typed by hand (profiles)", "the lit gilt frame: the leaf and bead one value brighter on the ramp, a 2 px warm sight edge (sand, cream); never the focus gold")
# ---- the sitting crate (hand-placed rectangles, 1x)
def crate():
    """pass 89 (art director, a079009f): painted like Home A-r3-a1's crates: a steel case (lit top edge, a lid with a seam and two latches, steel posts at the sides) round a teal front panel; the gilt glyph (24x16 at (28, 12), inside local y 8..31) where the walk crate has its seal tag, which is not drawn; 33..46 x 35..48 left plain teal for the build's lamp."""
    im = Image.new("RGBA", (80, 56), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = lambda n: pal[n] + (255,)
    d.rounded_rectangle([0, 0, 79, 55], radius=3, fill=c("hairline"))                                  # the outline
    d.rounded_rectangle([1, 1, 78, 54], radius=2, fill=c("metal"))                                       # the steel case
    d.line([3, 1, 76, 1], fill=c("enamel")); d.line([2, 2, 77, 2], fill=c("enamel"))                    # the lit top edge
    d.rectangle([5, 3, 74, 8], fill=c("bevel")); d.line([5, 3, 74, 3], fill=c("metal")); d.line([5, 8, 74, 8], fill=c("hairline"))   # the lid's recessed top
    d.line([1, 9, 78, 9], fill=c("hairline"))                                                            # under the lid's rim
    d.rectangle([1, 10, 8, 54], fill=c("metal")); d.line([1, 10, 1, 53], fill=c("enamel")); d.line([8, 10, 8, 54], fill=c("bevel"))       # the left post
    d.rectangle([71, 10, 78, 54], fill=c("metal")); d.line([71, 10, 71, 54], fill=c("enamel")); d.line([78, 10, 78, 53], fill=c("hairline"))   # the right post
    d.rectangle([9, 10, 70, 54], fill=c("teal")); d.line([9, 10, 70, 10], fill=c("aqua")); d.line([9, 51, 70, 51], fill=c("deepTeal")); d.rectangle([9, 52, 70, 54], fill=c("tealD"))   # the teal front, lit at its top, shaded at its foot
    d.line([9, 31, 70, 31], fill=c("tealD")); d.line([9, 32, 70, 32], fill=c("aqua"))                    # the lid seam
    for x0 in (13, 61):                                                                                  # two latches across the seam
        d.rectangle([x0, 27, x0 + 5, 36], fill=c("metal")); d.line([x0, 27, x0 + 5, 27], fill=c("enamel")); d.line([x0, 36, x0 + 5, 36], fill=c("bevel")); d.rectangle([x0 + 2, 31, x0 + 3, 32], fill=c("hairline"))
    x0, y0, w, h = 28, 12, 24, 16                                                                        # the gilt frame glyph
    d.rectangle([x0, y0, x0 + w - 1, y0 + h - 1], fill=c("bark")); d.rectangle([x0 + 1, y0 + 1, x0 + w - 2, y0 + h - 2], fill=c("gold"))
    d.line([x0 + 1, y0 + 1, x0 + w - 2, y0 + 1], fill=c("sand")); d.line([x0 + 1, y0 + 1, x0 + 1, y0 + h - 2], fill=c("sand"))
    d.line([x0 + 1, y0 + h - 2, x0 + w - 2, y0 + h - 2], fill=c("clay")); d.line([x0 + w - 2, y0 + 1, x0 + w - 2, y0 + h - 2], fill=c("clay"))
    d.rectangle([x0 + 4, y0 + 4, x0 + w - 5, y0 + h - 5], fill=c("bark")); d.rectangle([x0 + 5, y0 + 5, x0 + w - 6, y0 + h - 6], fill=c("tealD"))
    return im
rec("crate-sitting-80x56", crate(), "typed by hand", "Home's Bay crate for the sitting, 80x56, painted like Home A-r3-a1's crates: a steel case with a lit top edge, a lid seam, two latches and steel posts round a teal front; a 24x16 gilt frame glyph at (28, 12) where the walk crate has its seal tag (not drawn); 33..46 x 35..48 plain teal for the lamp; hand-placed at 1x (pass 89)")
# ---- the place cards at 96, cut as tools/build.py places() cuts the 48 and 64
for k in ("meadow", "pond", "rock", "wood", "cave"):
    src = f"place-{k}.jpg" if k in ("meadow", "pond") else f"place2-{k}.jpg"; im0 = Image.open(f"source/raw/{src}").convert("RGB")
    if k == "wood":
        a0 = np.asarray(im0).astype(float); dark = ((a0 @ np.array([0.299, 0.587, 0.114])) < 120); ys, xs = np.where(dark); im0 = im0.crop((xs.min() + 3, ys.min() + 3, xs.max() - 3, ys.max() - 3))
    side = min(im0.size); sq = im0.crop(((im0.width - side) // 2, (im0.height - side) // 2, (im0.width - side) // 2 + side, (im0.height - side) // 2 + side))
    im = sq.resize((96, 96), Image.LANCZOS); a = np.asarray(im).astype(float); lum = a @ np.array([0.299, 0.587, 0.114]); g = lum[..., None]; a = g + (a - g) * 0.85
    lum = a @ np.array([0.299, 0.587, 0.114]); a = a * (({"wood": 60.0, "cave": 80.0}.get(k, 86.0)) / lum.mean()); lum = a @ np.array([0.299, 0.587, 0.114])
    l2 = np.where(lum > 140, 140 + (lum - 140) * 0.30, lum); a = a * (l2 / np.maximum(lum, 1e-6))[..., None]
    rec(f"place-{k}-96x96", Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB"), f"source/raw/{src}", f"the {k} place card: a painted miniature vignette reduced to 96x96 from the same painting and view as the signed 48 and 64 stamps (never upscaled), muted x0.85 and graded to the same mean, highlights compressed")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# ---- proof at 1x on the surfaces: the gilt over a stand-in of the plain stage (forest back, a clay ground band from local y 248 with a sand top row) in the Habitat bezel's ground; the crate on the Bay's panel; the place cards on a deck card (ground fill, hairline edge)
cv = Image.new("RGB", (560 + 16 + 96 * 5 + 40, 424 + 16), pal["ground"]); stage = Image.new("RGB", (544, 408), pal["forest"]); ds = ImageDraw.Draw(stage)
ds.rectangle([0, 248, 543, 407], fill=pal["clay"]); ds.line([0, 248, 543, 248], fill=pal["sand"])
cv.paste(stage, (8 + 16, 8 + 16)); fr = Image.new("RGBA", (560, 424)); cv.paste(Image.alpha_composite(Image.new("RGBA", (560, 424), (0, 0, 0, 0)), made["sitting-gilt-560x424"]).convert("RGB"), (0, 0), made["sitting-gilt-560x424"].split()[3]) if False else None
base = cv.convert("RGBA"); base.alpha_composite(made["sitting-gilt-560x424"], (8, 8)); cv = base.convert("RGB")
d = ImageDraw.Draw(cv); x = 8 + 560 + 8
for k in ("meadow", "pond", "rock", "wood", "cave"):
    pass
big = Image.new("RGB", (560 + 16 + 100, 424 + 16 + 112), pal["ground"])
big.paste(cv.crop((0, 0, 576, 440)), (0, 0))
lit = big.convert("RGBA"); lit.alpha_composite(made["sitting-gilt-lit-560x424"], (8 + 560 + 8, 8)) if False else None
row = Image.new("RGB", (1200, 120), pal["ground"]); r = row.convert("RGBA")
for i, k in enumerate(("meadow", "pond", "rock", "wood", "cave")):
    card = Image.new("RGB", (100, 100), pal["ground"]); ImageDraw.Draw(card).rectangle([0, 0, 99, 99], outline=pal["hairline"]); card.paste(made[f"place-{k}-96x96"], (2, 2)); r.paste(card, (8 + i * 108, 8))
r.alpha_composite(made["crate-sitting-80x56"], (8 + 5 * 108 + 8, 8 + 20))
for k in (0,):
    pass
sheet = Image.new("RGB", (1200, 424 + 16 + 120), pal["ground"])
base2 = Image.new("RGBA", (576, 440), pal["ground"] + (255,)); base2.alpha_composite(stage.convert("RGBA"), (24, 24)); base2.alpha_composite(made["sitting-gilt-560x424"], (8, 8))
lit2 = Image.new("RGBA", (576, 440), pal["ground"] + (255,)); lit2.alpha_composite(stage.convert("RGBA"), (24, 24)); lit2.alpha_composite(made["sitting-gilt-lit-560x424"], (8, 8))
sheet.paste(base2.convert("RGB"), (0, 0)); sheet.paste(lit2.convert("RGB").crop((0, 0, 576, 440)), (600, 0)); sheet.paste(r.convert("RGB"), (0, 440))
sheet.save("marks/sitting-masters-proof-1x.png"); sheet.resize((sheet.width * 2 // 1, sheet.height * 2 // 1), Image.NEAREST).crop((0, 0, 2400, 1120)).save("marks/sitting-masters-proof-2x.png")
allowed = set(pal.values())
for n in ("sitting-gilt-560x424", "sitting-gilt-lit-560x424", "crate-sitting-80x56"):
    a = np.asarray(made[n]); cols = {tuple(c[:3]) for c in a.reshape(-1, 4) if c[3] == 255}; assert cols <= allowed, (n, cols - allowed)
print("palette-only checked for the gilt frames and the crate")
