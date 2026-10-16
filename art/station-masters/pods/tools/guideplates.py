"""Pass 74: the Library field guide's look plates, trait-<SNN>-<trait>-<look>-56x56 and -40x40, reduced from the signed 128x160 trait pictures (never enlarged).
Each takes the signed picture's content box (the centred 96x120 of the 128x160, x 16-111, y 20-139), reduced by LANCZOS to fit the centred 75 percent of its cell (42 px tall at 56x56 -> 34x42; 30 px tall at 40x40 -> 24x30), on the cell tone `ground`.
Only pictures signed in the ledger are cut. python3 -I tools/guideplates.py -> slices/trait-*-56x56.png, -40x40.png, marks/guide-plates-proof-1x.png"""
import os, json, re, hashlib, glob
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
GROUND = pal["ground"]; st = json.load(open("slices/status.json")); man = json.load(open("slices/manifest.json"))
REDONE = {"trait-S01-eyes-between-small-and-large-128x160", "trait-S01-markings-plain-128x160", "trait-S09-beak-between-128x160"}      # pass 79: redone at target size by guideplates2.py
SIZES = {56: (34, 42), 40: (24, 30)}; made = []
for f in sorted(glob.glob("slices/trait-S??-*-128x160.png")):
    n = os.path.basename(f)[:-4]
    if st.get(n, {}).get("status") != "signed" or n in REDONE: continue
    src = Image.open(f).convert("RGB").crop((16, 20, 112, 140))
    for s, (w, h) in SIZES.items():
        out = Image.new("RGB", (s, s), GROUND); out.paste(src.resize((w, h), Image.LANCZOS), ((s - w) // 2, (s - h) // 2))
        name = n.replace("-128x160", f"-{s}x{s}"); out.save(f"slices/{name}.png", optimize=True); made.append(name)
        man[name] = {"size": [s, s], "rect": None, "src": f"slices/{n}.png", "made": f"the signed {n}'s content box (the centred 96x120) reduced to {w}x{h} (LANCZOS, never enlarged) and centred on the cell tone `ground` in a {s}x{s} cell: the content sits inside the centred 75 percent ({s * 3 // 4} px) (pass 74)",
                     "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
print(len(made), "plates")
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
names = sorted({re.sub(r"-(56x56|40x40)$", "", m) for m in made}); cv = Image.new("RGB", (len(names) * 64 + 8, 56 + 40 + 40), (10, 20, 26)); d = ImageDraw.Draw(cv)
for i, b in enumerate(names):
    cv.paste(Image.open(f"slices/{b}-56x56.png"), (8 + i * 64, 8)); cv.paste(Image.open(f"slices/{b}-40x40.png"), (8 + i * 64, 72))
cv.save("marks/guide-plates-proof-1x.png"); cv.resize((cv.width * 3, cv.height * 3), Image.NEAREST).save("marks/guide-plates-proof-3x.png")
