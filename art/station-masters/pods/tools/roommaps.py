"""Vivarium rooms 2-4 (art director's briefs, ad-rooms-briefs.md, 2026-10-26): the two layout maps, drawn by hand at 0 MXN.
They govern structure and placement only, never the look. No text in them (nothing to leak into a painting).
Idle map 1024x568 (painting coordinates):
  back zone (behind the back edge)                     muted green-grey (96,112,96)
  allowed back-edge strip (room 1's tops .. 24 px up)  amber (200,150,60)
  back-edge line at room 1's painting tops             red (220,40,40), 3 px
  walk band (open floor, edge .. y 551)                pale sand (222,206,170)
  foot band rows 552-567                               dark soil (40,28,20)
  device wall columns x 0-76 and 932-1023              dark grey (54,58,60); mister and vent x 880-995 y 120-230 dark grey
  Home cut x 64-667, y 194-555                         white outline 2 px
  away corner x 588-668, y 460-556                     grey cross-hatch
Near map 544x408 (glass coordinates):
  back zone y 0-247 green-grey; ground band y 248-407 pale sand; side frames x 0-120 and 424-544 (y 0-407) darker green-grey;
  ring zone [115,235]-[429,349] white outline 2 px; specimen's open floor [136,296,272,56] white fill;.
python3 -I tools/roommaps.py -> rooms/map-idle-1024x568.png, rooms/map-near-544x408.png"""
import os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
BX = [16, 100, 330, 560, 900, 1009]; TOP = [452, 432, 396, 404, 424]
im = Image.new("RGB", (1024, 568), (96, 112, 96)); d = ImageDraw.Draw(im)
for i, t in enumerate(TOP):
    d.rectangle([BX[i], t - 24, BX[i + 1] - 1, t - 1], fill=(200, 150, 60))
    d.rectangle([BX[i], t, BX[i + 1] - 1, 551], fill=(222, 206, 170))
d.rectangle([0, 452, 15, 551], fill=(222, 206, 170)); d.rectangle([1009, 424, 1023, 551], fill=(222, 206, 170))
for i, t in enumerate(TOP):
    d.line([BX[i], t, BX[i + 1] - 1, t], fill=(220, 40, 40), width=3)
    if i: d.line([BX[i], min(t, TOP[i - 1]), BX[i], max(t, TOP[i - 1])], fill=(220, 40, 40), width=3)
d.rectangle([0, 552, 1023, 567], fill=(40, 28, 20))
d.rectangle([0, 0, 76, 551], fill=(54, 58, 60)); d.rectangle([932, 0, 1023, 551], fill=(54, 58, 60)); d.rectangle([880, 120, 995, 230], fill=(54, 58, 60))
corner = im.crop((588, 460, 669, 557)); dc = ImageDraw.Draw(corner)
for k in range(-100, 100, 10): dc.line([k, 0, k + 96, 96], fill=(150, 150, 150), width=1)
dc.rectangle([0, 0, 80, 96], outline=(150, 150, 150), width=1); im.paste(corner, (588, 460))
d.rectangle([64, 194, 667, 555], outline=(255, 255, 255), width=2)
im.save("rooms/map-idle-1024x568.png", optimize=True)
n = Image.new("RGB", (544, 408), (96, 112, 96)); d = ImageDraw.Draw(n)
d.rectangle([0, 248, 543, 407], fill=(222, 206, 170))
d.rectangle([0, 0, 119, 247], fill=(70, 86, 70)); d.rectangle([424, 0, 543, 247], fill=(70, 86, 70))
d.rectangle([0, 248, 119, 407], fill=(196, 180, 144)); d.rectangle([424, 248, 543, 407], fill=(196, 180, 144))
d.rectangle([136, 296, 407, 351], fill=(255, 255, 255))
d.rectangle([115, 235, 429, 349], outline=(255, 255, 255), width=2)
n.save("rooms/map-near-544x408.png", optimize=True)
