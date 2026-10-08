"""The hut options' figures: the contact sheet of the 12 pieces at 3x (Hut A to D, three states each, labelled) and the four stills side by side at 1x.
usage: python3 -I hut-figures.py WORK_DIR REVIEW_DIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
work, rv = sys.argv[1], sys.argv[2]
try: f = ImageFont.load_default(size=14); fs = ImageFont.load_default(size=11)
except TypeError: f = fs = ImageFont.load_default()
desc = {"A": "Hut A: cob, plank door, rope (Retro Diffusion + hand pass)", "B": "Hut B: log, porch, sticks (Retro Diffusion + hand pass)", "C": "Hut C: stone base, shutters, sheaf (Retro Diffusion + hand pass)", "D": "Hut D: timber, braced door, sticks (Retro Diffusion + hand pass)",
        "Ch": "Hut C, hand-pixelled earlier (reference)", "Dh": "Hut D, hand-pixelled earlier (reference)"}
HUTS = ["A", "B", "C", "D", "Ch", "Dh"]
sc = 3; cw = 64 * sc + 12; ch = 60 * sc + 46
sheet = Image.new("RGBA", (3 * cw + 16, len(HUTS) * ch + 16), (40, 36, 50, 255)); d = ImageDraw.Draw(sheet)
for r, h in enumerate(HUTS):
    d.text((8, 6 + r * ch), desc[h], fill=(255, 240, 200, 255), font=f)
    for c, st in enumerate(("lit", "dark", "dark2")):
        im = Image.open(os.path.join(work, "huts", f"hut-{h}-{st}.png")).convert("RGBA"); b = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
        x = 8 + c * cw; y = 8 + r * ch + 22 + (60 * sc - b.height); sheet.alpha_composite(b, (x, y)); d.text((x, 8 + r * ch + 22 + 60 * sc + 2), f"{st}", fill=(200, 196, 214, 255), font=fs)
sheet.save(os.path.join(rv, "huts-contact-3x.png"))
def stills(names, fn):
    row = Image.new("RGB", (len(names) * 460 + 10, 640), (40, 36, 50)); d = ImageDraw.Draw(row)
    for i, h in enumerate(names):
        row.paste(Image.open(os.path.join(rv, "still", f"hut-{h}-still.png")).convert("RGB"), (10 + i * 460, 6)); d.text((10 + i * 460, 612), f"Hut {h} in the still (450x600, 1x)", fill=(220, 216, 234), font=f)
    row.save(os.path.join(rv, "still", fn))
stills(["A", "B", "C", "D"], "hut-options-1x.png"); stills(["Ch", "Dh"], "hut-options-hand-1x.png"); print("hut figures")
