"""The pawn beside the concept's pawn at 1x and 3x: the concept's orange figure cut from companion-storm and scaled to the
pawn's height with the same resampling the concept still uses (Lanczos), against the four facings' walk frames and a creep and
react frame. usage: python3 -I pawn-compare.py PAWN_DIR OUT_PREFIX"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
pdir, outp = sys.argv[1], sys.argv[2]
c = Image.open("../concept-homepage/companion-storm.png").convert("RGB").crop((596, 548, 664, 688))
c = c.resize((round(c.width * 40 / c.height), 40), Image.LANCZOS)
frames = [("down-walk2", "down walk"), ("up-walk2", "up walk"), ("left-walk1", "left walk"), ("right-walk3", "right walk"), ("down-creep2", "down creep"), ("right-react", "right react")]
try: f = ImageFont.load_default(size=11)
except TypeError: f = ImageFont.load_default()
for sc in (1, 3):
    bg = (45, 120, 62)   # a meadow green behind both, so the silhouette reads as it will on the ground
    W = (c.width + 48 * len(frames) + 8) * sc + 40; H = 48 * sc + 30
    o = Image.new("RGB", (W, H), (40, 36, 50)); d = ImageDraw.Draw(o); x = 10
    o.paste(c.resize((c.width * sc, c.height * sc), Image.NEAREST), (x, 6 + (46 - 40) * sc)); d.text((x, 48 * sc + 12), "concept", fill=(220, 216, 234), font=f); x += (c.width + 8) * sc
    for fn, lab in frames:
        t = Image.open(os.path.join(pdir, f"pawn-{fn}.png")).convert("RGBA"); tile = Image.new("RGBA", (48, 48), bg + (255,)); tile.alpha_composite(t)
        o.paste(tile.resize((48 * sc, 48 * sc), Image.NEAREST).convert("RGB"), (x, 6)); d.text((x, 48 * sc + 12), lab, fill=(220, 216, 234), font=f); x += 48 * sc
    o.save(f"{outp}-{sc}x.png"); print("wrote", f"{outp}-{sc}x.png", o.size)
