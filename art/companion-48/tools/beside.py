"""The composed still beside the accepted concept and an earlier still. usage: python3 -I beside.py OUT.png STILL.png LABEL [PREV.png PREV_LABEL]"""
import sys
from PIL import Image, ImageDraw, ImageFont
out, still, label = sys.argv[1], sys.argv[2], sys.argv[3]
prev = (sys.argv[4], sys.argv[5]) if len(sys.argv) > 5 else None
concept = Image.open("../concept-homepage/companion-storm.png").convert("RGBA"); concept = concept.resize((round(concept.width * 600 / concept.height), 600), Image.LANCZOS)
panels = [(concept, "companion-storm (accepted concept, scaled to 600 tall)")]
if prev: panels.append((Image.open(prev[0]).convert("RGBA"), prev[1]))
panels.append((Image.open(still).convert("RGBA"), label))
G = 16; W = sum(p.width for p, _ in panels) + (len(panels) + 1) * G; H = 600 + 2 * G + 20
o = Image.new("RGBA", (W, H), (40, 36, 50, 255)); d = ImageDraw.Draw(o)
try: f = ImageFont.load_default(size=13)
except TypeError: f = ImageFont.load_default()
x = G
for im, lab in panels: o.alpha_composite(im, (x, G)); d.text((x, G + 604), lab, fill=(220, 216, 234, 255), font=f); x += im.width + G
o.save(out); print("wrote", out, o.size)
