"""The reference pictures for the Pods shelf masters (ux-pods-inventory.md, ad-signoff.md section 3), project-owned, flat wireframes.
usage: python3 -I tools/shelfrefs.py   (writes source/work/masters-pods-shelf/ref-*.png|jpg)"""
import os
from PIL import Image, ImageDraw
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W = f"{R}/source/work/masters-pods-shelf"; os.makedirs(W, exist_ok=True)
os.makedirs(f"{R}/source/raw/masters-pods-shelf", exist_ok=True)
PLASTER, BOARD, LEDGE, SHADOW = (214, 200, 176), (112, 76, 52), (138, 96, 64), (150, 132, 110)

# 1. the cabinet strip, 21:9. One period is 228 layout px (672 wide); the frame shows 285 layout px from layout y -20:
#    plaster, board (y 2-98), ledge (98-122), plaster (122-230), the next board from 230.
k = 6336 / 672; Hh = 2688
def ly(y): return round((y + 20) * k)
im = Image.new("RGB", (6336, Hh), PLASTER); d = ImageDraw.Draw(im)
for top in (2, 230):
    d.rectangle([0, ly(top), 6335, ly(top + 96)], fill=BOARD)
    d.rectangle([0, ly(top + 96), 6335, ly(top + 120)], fill=LEDGE)
    d.rectangle([0, ly(top + 120), 6335, ly(top + 126)], fill=SHADOW)
im.resize((1584, 672)).save(f"{W}/ref-layout-strip-21x9.png")

# 2. the reading room backdrop, 1024x600 frame drawn on 16:9 (the extra width split at both sides is not used).
im = Image.new("RGB", (1024, 600), PLASTER); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 1023, 39], fill=(29, 35, 43)); d.rectangle([0, 562, 1023, 599], fill=(29, 35, 43))
d.rectangle([0, 262, 1023, 284], fill=LEDGE)          # the bench top, the feet line 276 on it
d.rectangle([0, 284, 1023, 561], fill=BOARD)          # the bench front
d.line([140, 40, 140, 70], fill=(90, 70, 40), width=3)
d.polygon([(100, 104), (180, 104), (160, 70), (120, 70)], fill=(176, 140, 70))   # the low brass lamp hood
d.ellipse([60, 236, 300, 300], outline=(255, 236, 170), width=3)                   # its pool of light on the bench
d.rectangle([72, 248, 208, 276], outline=(60, 60, 60), width=1)                  # where the dish will sit (placed later)
for r in ([376, 88, 592, 484], [600, 80, 960, 488], [376, 492, 952, 532]):
    d.rectangle(r, outline=(120, 110, 100), width=2)                              # panels placed later: keep quiet behind
im.save(f"{W}/ref-layout-bench-1024x600.png")

# 3. the wood, plaster and pod finish: a crop of the signed direction 2c concept (the groove and rings are NOT to be copied).
c = Image.open(f"{R}/source/raw/concepts-pods-shelf/d2-c.jpg").convert("RGB")
c.crop((1800, 300, 5000, 2100)).resize((1600, 900), Image.LANCZOS).save(f"{W}/ref-finish-2c.jpg", quality=92)
print("refs written")
