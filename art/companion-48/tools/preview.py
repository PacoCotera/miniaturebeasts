"""Working preview: tile PNGs in a grid at a scale with their file names.  usage: python3 -I preview.py OUT.png SCALE IMG..."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
out, scale, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [(os.path.basename(f).replace(".png", ""), Image.open(f).convert("RGBA")) for f in files]
cw = max(im.width for _, im in ims) * scale + 8; chh = max(im.height for _, im in ims) * scale + 20
per = max(1, min(len(ims), 1600 // cw))
rows = (len(ims) + per - 1) // per
sheet = Image.new("RGBA", (per * cw, rows * chh), (40, 36, 50, 255)); d = ImageDraw.Draw(sheet)
try: font = ImageFont.load_default(size=11)
except TypeError: font = ImageFont.load_default()
for i, (name, im) in enumerate(ims):
    r, c = divmod(i, per); x, y = c * cw + 4, r * chh + 4
    big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    sheet.alpha_composite(big, (x, y)); d.text((x, y + big.height + 2), name, fill=(220, 216, 234, 255), font=font)
sheet.save(out); print("wrote", out, sheet.size)
