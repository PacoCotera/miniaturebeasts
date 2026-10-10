"""Legs & tail as the tail alone, two variants (tail-a.txt, tail-b.txt: typed pixel rows) drawn in the emblem manner and set on the compact tabs between Coat and
Glow (the two emblems a confusion is most likely with), unread and read, at 1x: tail-candidates-1x.png, with a 4x proof beside it."""
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SL = os.path.join(HERE, "..", "..", "slices")
PAL = {n: tuple(int(h[i:i + 2], 16) for i, h in [(1, h), (3, h), (5, h)][:0] or [(1, h)]) for n, h in []}
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(HERE, "..", "..", "..", "..", "..", "prototypes", "ui", "palettes", "station.json")))["colours"]}
STATE = {"unread": ("mist", "fog"), "read": ("bone", "white")}
def emblem(k, st):
    rows = [l.rstrip("\n") for l in open(os.path.join(HERE, f"tail-{k}.txt")) if not l.startswith(";") and l.strip()]
    assert len(rows) == 24 and all(len(r) == 24 for r in rows)
    base, lit = STATE[st]; im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != ".": im.putpixel((x, y), PAL[lit if c == "+" else base] + (255,))
    return im
cols = ["coat", "tail-a", "tail-b", "glow"]
sheet = Image.new("RGBA", (4 * 80 + 8, 2 * 48 + 8), PAL["ground"] + (255,))
for r, st in enumerate(("unread", "read")):
    for c, k in enumerate(cols):
        x, y = 8 + c * 80, 8 + r * 48
        sheet.alpha_composite(Image.open(os.path.join(SL, f"rail-tab-fill-{st}-compact-72x40.png")).convert("RGBA"), (x, y))
        em = Image.open(os.path.join(SL, f"rail-emblem-{k}-{st}-24x24.png")).convert("RGBA") if not k.startswith("tail") else emblem(k[-1], st)
        sheet.alpha_composite(em, (x + 34 - 12, y + 4))
sheet.save(os.path.join(HERE, "tail-candidates-1x.png"))
sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(HERE, "tail-candidates-4x-proof.png"))
