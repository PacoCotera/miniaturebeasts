"""Pass 59: the three name-line glyphs of the open chapter page (origin/design-pods-open d00f372a, pods.json page.lineMarks), typed pixel by pixel (no generator, no scaling of the large seed):
mark-line-seed-12x16 (the misty seed with the hidden look's ghost inside), mark-line-seed-pair-20x16 (two seeds overlapping, one glyph) and mark-line-only-16x8 (the base as a small glyph, its foot on the baseline).
Art layer: station.json colours only. The family of the signed seed, Only base, asleep and breed marks: the bone / white outline, the frost body in two halves split by a fog diagonal (the signed seed's), the ink keyline
where a form lies over another. The glyphs sit on the room's dark ground, so no ink ring is spent round the single seed (the signed seed's outer ink ring would take 2 of its 12 columns).
python3 -I tools/linemarks.py -> slices/mark-line-*.png, marks/line-marks-proof-1x.png"""
import os, json, hashlib
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
C = {"i": pal["ink"], "b": pal["fog"], "w": pal["bone"], "f": pal["frostS"], "s": pal["frostS"], "g": pal["fog"], "m": pal["mist"], "k": pal["stone"]}      # pass 60 (the art director): white -> bone, bone -> fog, the frost body -> frostS, so the seeds sit one step below the 16 px bone name; the mist ghost kept
SEED = ["....b.......",     # the stalk, 3 rows
        "....b.......",
        "....b.......",
        "....wwb.....",     # the body, a tilted egg: white lit rim top left, bone rim bottom right
        "..wwwwwbb...",
        ".wwsssssbb..",
        ".wffgssssb..",     # the fog diagonal runs from the top left to the bottom right: frost below it, frostS above (the signed seed's two halves)
        ".wfffgssssb.",
        "wwffffgsssb.",
        "wwfmmffgssb.",     # the hidden look's ghost: a small mist seed in the frost half
        ".wfmmmffgsb.",
        ".wffmmfffgb.",
        ".wwfffffgbb.",
        "..wwfffgbb..",
        "...bbbbbb...",
        "....bbbb...."]
ONLY = ["................",     # pass 60: a stepped plinth, no posts, no white, its foot on the baseline
        "................",
        "...gggggggggg...",   # a 2 px fog top face, 10 px wide
        "...gggggggggg...",
        ".mmmmmmmmmmmmmm.",   # a 3 px mist front, 14 px wide
        ".mmmmmmmmmmmmmm.",
        ".mmmmmmmmmmmmmm.",
        "kkkkkkkkkkkkkkkk"]   # a 1 px stone foot, 16 px wide
def img(rows, w, h):
    assert len(rows) == h and all(len(r) == w for r in rows), (len(rows), [len(r) for r in rows])
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in C: im.putpixel((x, y), C[ch] + (255,))
    return im
seed = img(SEED, 12, 16); only = img(ONLY, 16, 8)
# the pair: the back seed, then the front seed 8 px to the right, an ink keyline round the front where it lies over the back one
pair = Image.new("RGBA", (20, 16), (0, 0, 0, 0)); pair.alpha_composite(seed, (0, 0))
sh = seed.getchannel("A"); keyl = Image.new("RGBA", (20, 16), (0, 0, 0, 0))
for y in range(16):
    for x in range(12):
        if sh.getpixel((x, y)) == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 12 and 0 <= ny < 16 and sh.getpixel((nx, ny)) and 8 <= x + 8 < 12 + 1: keyl.putpixel((x + 8, y), C["i"] + (255,)); break
pair.alpha_composite(keyl); pair.alpha_composite(seed, (8, 0))
os.makedirs("marks", exist_ok=True); man = json.load(open("slices/manifest.json"))
for name, im, made in (("mark-line-seed-12x16", seed, "the name-line seed glyph: a misty seed (pass 60 values: bone rim lit, fog rim shaded, frostS body, a fog diagonal) with the hidden look's ghost in mist; typed pixel by pixel at this size (never scaled from the large seed); placed 1:1 after the name, top at line y + 2"),
                       ("mark-line-seed-pair-20x16", pair, "the name-line blend glyph: two seeds overlapping as one glyph (the front seed 8 px right of the back one, an ink keyline between); typed pixel by pixel; placed 1:1 after the name, top at line y + 2"),
                       ("mark-line-only-16x8", only, "the name-line Only glyph (pass 60, redrawn): a stepped plinth in the 16x8 box: a 2 px fog top face 10 px wide, a 3 px mist front 14 px wide, a 1 px stone foot 16 px wide on the baseline, no posts, no white; typed pixel by pixel; placed 1:1 after the name, top at line y + 8")):
    im.save(f"slices/{name}.png", optimize=True)
    man[name] = {"size": list(im.size), "rect": None, "src": "typed by hand", "made": made, **({"ruling": "pass 60, the art director: the ink ring round the single seed is not needed (ink on the ground is invisible at 1x); the pair keeps its ink overlap stroke. A ruling, not a drift from the signed seed."} if "seed" in name else {}), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof, 1x: the line "Translucency" plus the pair in a 128 px cell, and each glyph after a name, beside the signed marks, on the cell tone `ground`
GROUND = pal["ground"]; BONE = pal["bone"]; f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
cv = Image.new("RGBA", (704, 320), GROUND + (255,)); d = ImageDraw.Draw(cv)
def line(x0, w, y, name, glyphs, label=None):
    """The name and its glyphs centred together on a cell of width w at x0; line y given; glyph tops per the spec (seed and pair y + 2, only y + 8, asleep and breed y + 2); 4 px apart."""
    nw = d.textlength(name, font=f16); tot = nw + sum(4 + g.width for g, _ in glyphs); x = x0 + (w - tot) / 2
    d.text((x, y + 16), name, font=f16, fill=BONE + (255,), anchor="ls"); x += nw
    for g, top in glyphs: x += 4; cv.alpha_composite(g, (int(round(x)), y + top)); x += g.width
    if label: d.text((x0, y + 26), label, font=f12, fill=(141, 138, 166, 255))
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
for k, x0 in enumerate((16, 160, 304)):
    d.rectangle([x0, 16, x0 + 127, 16 + 159], fill=(30, 56, 72, 255) if k == 0 else GROUND + (255,))
d.rectangle([16, 16, 143, 175], fill=(30, 56, 72, 255)); d.text((80, 96), "picture", font=f12, fill=(141, 138, 166, 255), anchor="mm")
line(16, 128, 180, "Translucency", [(pair, 2)], "128 px cell, the paired seed")
ys = 230
for i, (nm, gl, lab) in enumerate((("Roundness", [(seed, 2)], "seed"), ("Colour", [(only, 8)], "Only"), ("Roundness", [(S("mark-asleep-24x16"), 2)], "asleep (signed)"), ("Drive", [(S("mark-breed-28x16"), 2)], "breed (signed)"), ("Efficiency", [(pair, 2), (S("mark-breed-28x16"), 2)], "pair + breed"))):
    line(16 + (i % 3) * 144 + (0 if i < 3 else 0), 128, ys + (i // 3) * 56, nm, gl, lab)
# family: the new glyphs beside the signed ones, 6x
fam = Image.new("RGBA", (44 + 20 + 16 + 24 + 28 + 20 + 40, 24), GROUND + (255,)); x = 4
for g in (seed, pair, only, S("mark-asleep-24x16"), S("mark-breed-28x16")): fam.alpha_composite(g, (x, 4)); x += g.width + 8
cv.alpha_composite(fam.resize((fam.width * 4, fam.height * 4), Image.NEAREST), (200, 16)) if False else None
fam6 = fam.resize((fam.width * 6, fam.height * 6), Image.NEAREST); cv2 = Image.new("RGBA", (704, 320 + fam6.height + 8), GROUND + (255,)); cv2.alpha_composite(cv); cv2.alpha_composite(fam6, (16, 328))
cv2.convert("RGB").save("marks/line-marks-proof-1x.png")
big = Image.new("RGB", (704 * 2, cv2.height * 2)); big.paste(cv2.convert("RGB").resize((704 * 2, cv2.height * 2), Image.NEAREST)); big.save("marks/line-marks-proof-2x.png")
