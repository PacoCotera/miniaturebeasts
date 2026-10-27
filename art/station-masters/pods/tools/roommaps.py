"""Vivarium rooms 2-4 (art director's briefs, ad-rooms-briefs.md, 2026-10-26): the two layout maps, drawn by hand at 0 MXN.
They govern structure and placement only, never the look. No text in them (nothing to leak into a painting).
Re-brief after round 1 (the red back-edge line and the amber strip were painted in): greys only, two of them, a diagram.
No line, no amber strip, no white frames, no hatching, no device columns.
Idle map 1024x568 (painting coordinates):
  back zone (above room 1's painting tops 452/432/396/404/424 in x bands 0-99/100-329/330-559/560-899/900-1023)  dark grey (88,88,88)
  open floor (room 1's tops down to y 567)                                                                     light grey (196,196,196)
Near map 544x408 (glass coordinates):
  back zone y 0-247 dark grey (88,88,88); ground band y 248-407 light grey (196,196,196).
Round c: rooms/ref-top-day-1024x190.png, rows 0-189 of room 1's signed day (the device and the soft back, nothing of the floor), Image 1 of the c jobs.
python3 -I tools/roommaps.py -> rooms/map-idle-1024x568.png, rooms/map-near-544x408.png, rooms/ref-top-day-1024x190.png"""
import os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
DARK, LIGHT = (88, 88, 88), (196, 196, 196)
BX = [0, 100, 330, 560, 900, 1024]; TOP = [452, 432, 396, 404, 424]
im = Image.new("RGB", (1024, 568), DARK); d = ImageDraw.Draw(im)
for i, t in enumerate(TOP): d.rectangle([BX[i], t, BX[i + 1] - 1, 567], fill=LIGHT)
im.save("rooms/map-idle-1024x568.png", optimize=True)
n = Image.new("RGB", (544, 408), DARK); ImageDraw.Draw(n).rectangle([0, 248, 543, 407], fill=LIGHT)
n.save("rooms/map-near-544x408.png", optimize=True)
Image.open("slices/idle-vivarium-day-1024x568.png").convert("RGB").crop((0, 0, 1024, 190)).save("rooms/ref-top-day-1024x190.png", optimize=True)
