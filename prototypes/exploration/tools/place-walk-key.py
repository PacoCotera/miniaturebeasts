# place-walk-1: adds the colour key and a title to an overview schematic (a diagram: labels only).
#   python3 place-walk-key.py <in.png> <out.png> "<title>"
import sys
from PIL import Image, ImageDraw, ImageFont

src, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
img = Image.open(src).convert("RGB")
KEY = [
    ((160, 196, 128), "Low ground the walk reaches"),
    ((112, 150, 88), "Raised top the walk reaches"),
    ((128, 82, 48), "Cliff lip and face (blocks)"),
    ((250, 232, 60), "Way up (stair)"),
    ((36, 84, 48), "Thicket (blocks)"),
    ((79, 134, 198), "Water (blocks)"),
    ((214, 40, 40), "Low ground NOT reached"),
    ((240, 150, 30), "Raised top NOT reached"),
    ((235, 0, 215), "Gap cut through thicket (new)"),
    ((0, 205, 225), "Neck lowered (new)"),
    ((255, 255, 255), "White lines: cell borders"),
]
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
except OSError:
    font = big = ImageFont.load_default()
panel = 460
canvas = Image.new("RGB", (img.width + panel, img.height), (24, 24, 28))
canvas.paste(img, (0, 0))
d = ImageDraw.Draw(canvas)
x0 = img.width + 24
d.text((x0, 24), title, fill=(255, 255, 255), font=big)
y = 100
for colour, label in KEY:
    d.rectangle([x0, y, x0 + 36, y + 36], fill=colour, outline=(255, 255, 255))
    d.text((x0 + 52, y + 4), label, fill=(235, 235, 235), font=font)
    y += 52
canvas.save(out)
print(out, canvas.size)
