"""Brief 2 round 1 proof: the large class, one species per pattern word, recoloured with the species' own colour pair, beside the Loika (smooth dots), at 1x and 3x; and the same four at the well
size (40x48) at 3x to check no pattern reads as another. python3 -I tools/patterns_proof.py"""
import os, json, numpy as np
from PIL import Image
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open("tools/compose.py").read(); ns = {}; exec(src[:src.index("def compose(")], ns); recol = ns["recol"]
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
rows = [("S01", "dots", "smooth dots"), ("S04", "ribs", "soft ribs"), ("S02", "segments", "segments"), ("S03", "plates", "plates")]
def pod(sp, pat, cls):
    d = json.load(open(f"../../../prototypes/workbench/frames/species-{sp}.json")); cp = d["pod"]["colourPair"]
    return recol(cls, hexrgb(cp[0]["hex"]), hexrgb(cp[1]["hex"]), pat, tint=(0, 0, 0))
G = (27, 44, 58, 255)
for cls, scale, name in (("large", 3, "patterns/patterns-large-3x.png"), ("large", 1, "patterns/patterns-large-1x.png"), ("well", 1, "patterns/patterns-well-1x.png"), ("well", 3, "patterns/patterns-well-3x.png"), ("collection", 1, "patterns/patterns-collection-1x.png")):
    w, h = {"large": (144, 176), "well": (40, 48), "collection": (88, 112)}[cls]; sheet = Image.new("RGBA", ((w + 16) * 4 + 16, h + 32), G)
    for i, (sp, pat, word) in enumerate(rows):
        sheet.alpha_composite(pod(sp, pat, cls), (16 + i * (w + 16), 16))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST if scale == 1 or cls == "well" else Image.LANCZOS).convert("RGB").save(name)
