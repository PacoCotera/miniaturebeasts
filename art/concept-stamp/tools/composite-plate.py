"""Place a styled stamp render into the empty central square of a generated plate.

usage: python3 -I composite-plate.py PLATE.png STAMP.png OUT.png [--frac 0.5] [--dy 0] [--caption CODE]
The stamp (already rendered at the right pixel size, quiet margin included) is pasted centred,
optionally shifted by --dy pixels; a caption with the code only may be drawn under it in a plain face.
The plate is generated art; the stamp is the encoder's cells, styled. Nothing in the stamp is redrawn.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

a = sys.argv[1:]
plate_p, stamp_p, out_p = a[:3]
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
frac, dy, caption = float(opt("--frac", "0.5")), int(opt("--dy", "0")), opt("--caption", None)
match = opt("--match-paper", None)
caption_y = opt("--caption-y", None)  # absolute y for the caption; default: just under the stamp  # hex of the stamp's flat paper: those pixels take the plate's centre colour
plate = Image.open(plate_p).convert("RGB")
stamp = Image.open(stamp_p).convert("RGB")
if match:
    cx, cy = plate.width // 2, plate.height // 2
    target = plate.crop((cx - 40, cy - 40, cx + 40, cy + 40)).resize((1, 1), Image.BOX).getpixel((0, 0))
    src = tuple(int(match.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    px = stamp.load()
    for yy in range(stamp.height):
        for xx in range(stamp.width):
            v = px[xx, yy]
            if abs(v[0] - src[0]) + abs(v[1] - src[1]) + abs(v[2] - src[2]) <= 9:
                px[xx, yy] = target
side = round(plate.width * frac)
if stamp.width != side:
    stamp = stamp.resize((side, side), Image.LANCZOS)
x = (plate.width - side) // 2
y = (plate.height - side) // 2 + dy
plate.paste(stamp, (x, y))
if caption:
    d = ImageDraw.Draw(plate)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", max(14, plate.width // 60))
    except OSError:
        font = ImageFont.load_default()
    tw = d.textlength(caption, font=font)
    cy_ = int(caption_y) if caption_y else y + side + plate.width // 70
    d.text(((plate.width - tw) / 2, cy_), caption, font=font, fill=(60, 54, 44))
plate.save(out_p)
print("wrote", out_p, "stamp", side, "px at", (x, y))
