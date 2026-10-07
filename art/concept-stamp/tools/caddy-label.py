"""Caddy thermal label mock: a 58 mm strip at 203 dpi, monochrome, with the prototype's own
20 mm print of the stamp (plain black dots, unstyled) at the left, a thin rule and the code at the right.

usage: python3 -I caddy-label.py STAMP_20MM.png CODE OUT.png [--photo]
The stamp PNG is the encoder's `--mm 20 --dpi 203` output (bilevel, 160 px for 20 mm).
"""
import sys
from PIL import Image, ImageDraw, ImageFont

stamp_p, code, out_p = sys.argv[1:4]
DPI = 203
mm = lambda v: round(v / 25.4 * DPI)
W, H = mm(58), mm(30)
label = Image.new("L", (W, H), 255)
d = ImageDraw.Draw(label)
stamp = Image.open(stamp_p).convert("L")
sx, sy = mm(4), (H - stamp.height) // 2
label.paste(stamp, (sx, sy))
# a thin rule and the code, plain face; nothing else, no name
x0 = sx + stamp.width + mm(4)
d.line([(x0, mm(5)), (x0, H - mm(5))], fill=0, width=2)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", mm(2.6))
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", mm(1.8))
except OSError:
    font = small = ImageFont.load_default()
tx = x0 + mm(3)
parts = code.split("-")
d.text((tx, mm(7)), parts[0], font=font, fill=0)
d.text((tx, mm(12)), "-".join(parts[1:]), font=font, fill=0)
# bilevel, as the printer leaves it
label = label.point(lambda v: 0 if v < 128 else 255, "1").convert("L")
label.save(out_p, dpi=(DPI, DPI))
print("wrote", out_p, label.size)
