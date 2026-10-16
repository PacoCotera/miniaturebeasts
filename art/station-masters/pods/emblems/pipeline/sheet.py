"""One 1x sheet: each of the eight pictograms (clean/*.txt) on a compact tab beside Coat, Movement and Glow, unread (left block) and read (right block), nearest neighbour, nothing scaled.
Writes legs-tail-pipeline-1x.png and a 3x proof. The tab is the signed compact plate; the emblem sits at (tab x + 22, y + 4)."""
import json, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); SL = os.path.join(HERE, "..", "..", "slices")
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(HERE, "..", "..", "..", "..", "..", "prototypes", "ui", "palettes", "station.json")))["colours"]}
STATE = {"unread": ("mist", "fog"), "read": ("bone", "white")}
def emblem(n, st):
    rows = [l.rstrip("\n") for l in open(os.path.join(HERE, "clean", n + ".txt")) if not l.startswith(";") and l.strip()]
    assert len(rows) == 24 and all(len(r) == 24 for r in rows), n
    base, lit = STATE[st]; im = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != ".": im.putpixel((x, y), PAL[lit if c == "+" else base] + (255,))
    return im
names = [f"{k}-{c}" for k in ("tail", "leg") for c in "abcd"]; TW = 80; W = 40 + 2 * (4 * TW) + 16; H = 8 + len(names) * 48
sheet = Image.new("RGBA", (W, H), PAL["ground"] + (255,)); d = ImageDraw.Draw(sheet)
for r, n in enumerate(names):
    d.text((4, 8 + r * 48 + 14), n, fill=PAL["mist"] + (255,))
    for b, st in enumerate(("unread", "read")):
        for c, k in enumerate(("coat", n, "movement", "glow")):
            x, y = 40 + b * (4 * TW + 16) + c * TW, 8 + r * 48
            sheet.alpha_composite(Image.open(os.path.join(SL, f"rail-tab-fill-{st}-compact-72x40.png")).convert("RGBA"), (x, y))
            em = emblem(k, st) if k == n else Image.open(os.path.join(SL, f"rail-emblem-{k}-{st}-24x24.png")).convert("RGBA")
            sheet.alpha_composite(em, (x + 34 - 12, y + 4))
sheet.save(os.path.join(HERE, "legs-tail-pipeline-1x.png")); sheet.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(HERE, "legs-tail-pipeline-3x-proof.png"))
