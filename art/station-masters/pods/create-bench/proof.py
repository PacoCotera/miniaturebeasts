"""T-20261016-41 proof: S01's create-shape at 1x with the new masters at the spec's rects (specs/station-create-bench-spec.md §2, §3), and a
comparison sheet beside the references (Pods focused, Pods collection, the vivarium, the kit).
The bank, S01 (5 drums, no slide): Coat (Markings: plain), Face (Crown: leaf crest, turned, so the notch; focused, so the turn marks; Eyes:
between), Movement (Drive: a doing, pinned), Stamina (Efficiency: pinned); x 104, pitch 88, +16 between chapters, y 440.
Stand-ins (the build's), said so in the README (T-20261016-69 adds the first three):
- the chapter words over the drum groups: 16 px Inter, `mist`, lineTop 400 (amended), at each group's first drum (spec §3);
- the slip's lines at the spec's longest case (§4: the heading, 4 changes and "and n more", the clash line, then "Still a surprise" and 2
  lines), typed in Inter at 16 px at x 744; S01 itself can change at most three traits, so the words are stand-ins for the fit;
- the clash line's cross: two red strokes in a 16 px box, standing in for icon:cross:16;
- the founder's contact shadow on the dish: a soft dark ellipse under its feet (the feet's span at the foot line 392), multiplied;
- the pod in the well, closed (S01's shell composed from the signed pod-large layers, reduced to 112 x 136): Pods' renderer has no open
  state, so the opened pod is not shown;
- no name plate, found sentence, focus ring or bottom line.
usage: python3 -I create-bench/proof.py SLICES_DIR NEW_DIR GOLDENS_DIR CONCEPTS_DIR OUT_DIR FONTS_DIR"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
sl, nd_, gold, conc, out, fonts = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
pal = dict(json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json")))["colours"])
C = lambda n: tuple(int(pal[n][i:i + 2], 16) for i in (1, 3, 5))
Lo = lambda p: Image.open(p).convert("RGBA")
N = lambda n: Lo(os.path.join(nd_, n + ".png"))
def shell():
    g = lambda n: np.asarray(Lo(f"{sl}/pod-large-{n}.png")).astype(float)
    A, B = np.array([0x46, 0x54, 0x59], float), np.array([0xdf, 0xd2, 0xae], float)
    shade = g("shade"); body, acc, pt = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255, g("pattern-dots")[..., 3] / 255
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255)
    alpha = np.maximum(body, acc) * (g("identified")[..., 3] / 255 > 0)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA").resize((112, 136), Image.LANCZOS)
f = Image.new("RGBA", (1024, 600), (22, 42, 55, 255)); f.alpha_composite(N("create-bench"), (0, 40))
f.alpha_composite(N("create-well"), (96, 96)); f.alpha_composite(shell(), (136, 128))
f.alpha_composite(N("create-gene-line"), (288, 192)); f.alpha_composite(N("create-dish"), (312, 364))
fa = np.asarray(N("founder-S01-base-304x312"))[..., 3] > 128; fb = np.nonzero(fa.any(1))[0].max()   # the painting's lowest row (its feet)
feet = np.nonzero(fa[fb - 24:fb + 1].any(0))[0]; x0, x1 = 360 + feet.min(), 360 + feet.max(); yy, xx = np.mgrid[0:600, 0:1024] + .5
e = ((xx - (x0 + x1) / 2) / ((x1 - x0) / 2 + 6)) ** 2 + ((yy - (76 + fb - 7)) / 9) ** 2       # under the front and rear feet
sh = ndi.gaussian_filter((e < 1).astype(float), 2.5) * 0.6                                       # the contact shadow, multiplied
fr = np.asarray(f).astype(float); fr[..., :3] *= (1 - sh)[..., None]; f = Image.fromarray(fr.astype(np.uint8), "RGBA")
f.alpha_composite(N("founder-S01-base-304x312"), (360, 76)); f.alpha_composite(N("founder-S01-crown-leaf-crest-304x312"), (360, 76))
f.alpha_composite(N("slip-208x288"), (728, 96))
# the bank at the amended rects (T-20261016-95/-96): drums 80 x 96 at y 424; the close-up in the window (8, 16); the neighbouring faces'
# edge rows in the bands (8, 8) and (8, 80) (previous face's last 8 rows, next face's first 8), then create-drum-shade-80x96; a one-face drum
# (the doings) shows its plain round there; the notch at (72, 40); the turn marks at (32, 0) and (32, 88)
bank = [("rest", "markings", ["plain", "pale-patches"], 0, False, False), ("rest", "crown", ["bare-head", "leaf-crest"], 1, True, True),
        ("rest", "eyes", ["thin-rings", "between", "wide-pale-rings"], 1, False, False), ("pinned", "drive", None, 0, False, False),
        ("pinned", "efficiency", None, 0, False, False)]
xs = [104, 208, 296, 400, 504]; Y = 424
for (state, trait, faces, i, turned, focused), x in zip(bank, xs):
    look = f"look-S01-{trait}-{faces[i]}-64x64" if faces else f"look-S01-{trait}-64x64"
    f.alpha_composite(N(look), (x + 8, Y + 16)); f.alpha_composite(N(f"create-drum-{state}"), (x, Y))
    if faces and len(faces) > 1:
        prev = N(f"look-S01-{trait}-{faces[(i - 1) % len(faces)]}-64x64"); nxt = N(f"look-S01-{trait}-{faces[(i + 1) % len(faces)]}-64x64")
        f.alpha_composite(prev.crop((0, 56, 64, 64)), (x + 8, Y + 8)); f.alpha_composite(nxt.crop((0, 0, 64, 8)), (x + 8, Y + 80))
    f.alpha_composite(N("create-drum-shade-80x96"), (x, Y))
    if turned: f.alpha_composite(N("create-drum-notch"), (x + 72, Y + 40))
    if focused: f.alpha_composite(N("create-drum-turn-up"), (x + 32, Y)); f.alpha_composite(N("create-drum-turn-down"), (x + 32, Y + 88))
dr = ImageDraw.Draw(f)
for word, x in (("Coat", 104), ("Face", 208), ("Movement", 400), ("Stamina", 504)): dr.text((x, 400), word, font=F("Regular", 16), fill=C("mist"))
y = 112; over = []
def put(t, font, fill, pitch=24):
    global y
    if dr.textlength(t, font=font) > 176: over.append(t)
    dr.text((744, y), t, font=font, fill=fill); y += pitch
put("Your changes", F("Medium", 16), C("ink"))
for t in ("Crown: leaf crest", "Eyes: wide pale rings", "Markings: pale patches", "Movement: a quick trot", "and two more"): put(t, F("Regular", 16), C("ink"))
dr.line([(746, y + 6), (756, y + 16)], fill=C("red"), width=2); dr.line([(756, y + 6), (746, y + 16)], fill=C("red"), width=2)   # icon:cross:16, stand-in
x_ = 764; t = "Crown and Eyes clash"; dr.text((x_, y), t, font=F("Regular", 16), fill=C("red"))
if 20 + dr.textlength(t, font=F("Regular", 16)) > 176: over.append("x " + t)
y += 32
put("Still a surprise", F("Medium", 16), C("ink"))
put("Movement, Stamina,", F("Regular", 16), C("mist")); put("Senses, Habits", F("Regular", 16), C("mist"))
print("slip: last line ends", y, "(<= 96 + 16 + 264 = 376); lines over 176 px:", over)
f.convert("RGB").save(os.path.join(out, "create-shape-S01-1x.png"))
refs = [Lo(os.path.join(gold, p)).convert("RGB") for p in ("pods/pods-overview-identified-pod-focused.png", "pods/pods-collection.png", "vivarium/vivarium-docked-day.png")]
k = Lo(os.path.join(conc, "hero-kit.png")).convert("RGB"); c = Image.new("RGB", (1024, 600), (24, 24, 24)); k.thumbnail((1024, 600)); c.paste(k, ((1024 - k.width) // 2, (600 - k.height) // 2)); refs.append(c)
sh = Image.new("RGB", (3 * 1024, 2 * 600))
sh.paste(f.convert("RGB").resize((2048, 1200), Image.NEAREST), (0, 0))
for i, r in enumerate(refs): sh.paste(r.resize((512, 300)), (2048 + (i % 2) * 512, (i // 2) * 300))
sh.paste(Image.new("RGB", (1024, 600), (10, 10, 10)), (2048, 600))
sh.resize((1536, 600)).save(os.path.join(out, "comparison-create-S01.png"))
print("proof written")
