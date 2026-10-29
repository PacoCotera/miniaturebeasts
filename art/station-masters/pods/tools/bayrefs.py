"""The reference pictures for the Bay's painted pieces (ux-bay.md; the art director's sign-off ad-bay-closeup.md section 1 and 3), project-owned:
a flat wireframe of the landing, and crops of the signed pass 142 masters (the bench's umber wood and brass lamp, the cabinet's wood and plaster),
so the Bay is painted in the same warm home language as the Pods screen.
The landing is placed at [0, 40, 1024, 522]; the wireframe is 16:9 (1024x576) with that frame at layout y 27 (screen y - 13), so a 16:9 painting
cropped to 1024:522 about its middle keeps every height. usage: python3 -I tools/bayrefs.py   (writes source/work/masters-bay/ref-*.png|jpg)"""
import os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W = f"{R}/source/work/masters-bay"; os.makedirs(W, exist_ok=True)
os.makedirs(f"{R}/source/raw/masters-bay", exist_ok=True)
PLASTER, SHADE, BENCH, FRONT, FLOOR, RAIL, WIN = (214, 200, 176), (128, 116, 104), (138, 96, 64), (104, 70, 48), (120, 86, 60), (112, 76, 52), (236, 228, 196)
Y = lambda y: y - 13                                                     # screen y -> wireframe y
im = Image.new("RGB", (1024, 576), PLASTER); d = ImageDraw.Draw(im)
d.rectangle([720, 0, 1023, Y(468)], fill=SHADE)                          # the right third of the wall in shade (behind the ledger [720, 56, 288, 490])
for x in range(640, 740): d.line([x, 0, x, Y(392) - 1 if x < 712 else Y(468)], fill=tuple(int(PLASTER[i] + (SHADE[i] - PLASTER[i]) * (x - 640) / 100) for i in range(3)))   # a soft fall-off, the same wall
d.rectangle([32, Y(60), 151, Y(227)], fill=(150, 120, 86))               # the window's deep reveal
d.rectangle([44, Y(72), 139, Y(215)], fill=WIN)                          # its panes, the one light
d.line([92, Y(72), 92, Y(215)], fill=(150, 120, 86), width=4); d.line([44, Y(144), 139, Y(144)], fill=(150, 120, 86), width=4)
d.polygon([(139, Y(80)), (560, Y(392)), (300, Y(404)), (139, Y(215))], outline=(255, 236, 170))   # the light falling onto the bench
d.rectangle([200, Y(120), 519, Y(143)], fill=RAIL)                       # the peg rail
for x in (240, 320, 400, 480): d.ellipse([x - 6, Y(126), x + 6, Y(138)], fill=(80, 54, 36))
d.rectangle([0, Y(392), 711, Y(404)], fill=BENCH)                        # the bench top (feet line y 400)
d.rectangle([0, Y(404), 711, Y(468)], fill=FRONT)                        # the bench front (labels pinned at y 420-464)
d.rectangle([0, Y(468), 1023, 575], fill=FLOOR)                          # the plank floor
for y in (Y(500), Y(536)): d.line([0, y, 1023, y], fill=(96, 66, 46), width=2)
im.save(f"{W}/ref-layout-landing-16x9.png")

k = 5243 / 1024
bench = Image.open(f"{R}/shelf/reading-bench-5243x3072.png").convert("RGB")
bench.crop((0, round(40 * k), round(560 * k), round(420 * k))).resize((1400, 950), Image.LANCZOS).save(f"{W}/ref-bench-wood.jpg", quality=92)   # the lamp, the pool, the umber bench top and front
strip = Image.open(f"{R}/shelf/cabinet-strip-4704x1596.png").convert("RGB")
strip.crop((0, 0, 2400, 1596)).resize((1200, 798), Image.LANCZOS).save(f"{W}/ref-cabinet-wood.jpg", quality=92)                               # the cabinet's board, ledge and plaster
print("refs written")
# the objects' reference (made after the landing was painted): a crop of the landing-b raw, its bench in the window light
if os.path.exists(f"{R}/source/raw/masters-bay/landing-b.jpg"):
    im = Image.open(f"{R}/source/raw/masters-bay/landing-b.jpg").convert("RGB"); kb = 5504 / 1024
    im.crop((0, round(250 * kb), round(700 * kb), round(500 * kb))).resize((1400, 500), Image.LANCZOS).save(f"{W}/ref-landing-bench.jpg", quality=92)
