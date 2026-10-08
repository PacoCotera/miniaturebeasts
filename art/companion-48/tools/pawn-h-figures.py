"""The pawn from H: H's original beside the finished frames, at 1x and 3x (work/pawn-h-vs-original-1x.png, -3x.png), and the whole sheet of 28 frames at both
scales (work/pawn-h-frames-1x.png, -3x.png). usage: python3 -I pawn-h-figures.py WORK_DIR RD_DIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
work, rd = sys.argv[1:3]; G = (92, 187, 76)
try: f = ImageFont.load_default(size=11)
except TypeError: f = ImageFont.load_default()
def tile(path):
    im = Image.open(path).convert("RGBA"); t = Image.new("RGBA", im.size, G + (255,)); t.alpha_composite(im); return t.convert("RGB")
for sc in (1, 3):
    items = [("H original, front", os.path.join(rd, "H-down-original-rd.png")), ("finished down walk2", os.path.join(work, "pawn", "pawn-down-walk2.png")),
             ("H original, profile", os.path.join(rd, "H-right-original-rd.png")), ("finished right walk1", os.path.join(work, "pawn", "pawn-right-walk1.png")),
             ("finished left walk1", os.path.join(work, "pawn", "pawn-left-walk1.png")), ("finished up walk2", os.path.join(work, "pawn", "pawn-up-walk2.png"))]
    cw = 48 * sc + 8; W = Image.new("RGB", (cw * len(items) + 8, 48 * sc + 22), (40, 36, 50)); d = ImageDraw.Draw(W)
    for i, (lab, p) in enumerate(items):
        W.paste(tile(p).resize((48 * sc, 48 * sc), Image.NEAREST), (8 + i * cw, 4)); d.text((8 + i * cw, 48 * sc + 7), lab if sc == 3 else lab.replace("finished ", "").replace(" original", " orig."), fill=(220, 216, 234), font=f)
    W.save(os.path.join(work, f"pawn-h-vs-original-{sc}x.png"))
sts = ["walk1", "walk2", "walk3", "creep1", "creep2", "creep3", "react"]
for sc in (1, 3):
    cw = 48 * sc + 4; W = Image.new("RGB", (cw * 7 + 8, 4 * (48 * sc + 18) + 8), (40, 36, 50)); d = ImageDraw.Draw(W)
    for r, fc in enumerate(("down", "right", "left", "up")):
        for c, st in enumerate(sts):
            p = os.path.join(work, "pawn", f"pawn-{fc}-{st}.png"); W.paste(tile(p).resize((48 * sc, 48 * sc), Image.NEAREST), (6 + c * cw, 6 + r * (48 * sc + 18))); d.text((6 + c * cw, 6 + r * (48 * sc + 18) + 48 * sc + 1), f"{fc} {st}", fill=(220, 216, 234), font=f)
    W.save(os.path.join(work, f"pawn-h-frames-{sc}x.png"))
print("pawn H figures")
