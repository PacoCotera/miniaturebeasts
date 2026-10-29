"""Crops each round-two exploration raw (1376x768) centred to 1024x600 at 1x and lays a contact sheet with only the concept names.
A concept whose raw is missing (not painted, the day's cap reached) gets an empty dark slot with its name.
usage: python3 -I tools/readroomexplore2sheets.py OUT_DIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/concepts-readroom-explore-2")
ORDER = [("strand", "The Strand"), ("spectrum", "The Spectrum"), ("sweep", "The Sweep"), ("column", "The Column"),
         ("candle", "The Candle"), ("tank", "The Tank"), ("plates", "The Plates"), ("field", "The Field")]
INTER = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
def font(px, w="Medium"):
    try: return ImageFont.truetype(INTER % w, px)
    except OSError: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", px)
def crop_1x(im):
    s = 600 / im.height; im = im.resize((round(im.width * s), 600), Image.LANCZOS)
    x = (im.width - 1024) // 2; return im.crop((x, 0, x + 1024, 600))
out = sys.argv[1]; os.makedirs(out, exist_ok=True); thumbs = []
for cid, name in ORDER:
    p = os.path.join(RAW, cid + ".jpg")
    if os.path.exists(p):
        im = crop_1x(Image.open(p).convert("RGB")); im.save(os.path.join(out, f"{cid}-1x.png")); thumbs.append((name, im))
    else:
        thumbs.append((name + " (not painted)", None))
W, H, G, L = 512, 300, 24, 34; cols = 4; rows = 2
sheet = Image.new("RGB", (G + cols * (W + G), G + rows * (H + L + G)), (29, 35, 43)); d = ImageDraw.Draw(sheet); f = font(18)
for i, (name, im) in enumerate(thumbs):
    c, r = i % cols, i // cols; x = G + c * (W + G); y = G + r * (H + L + G)
    if im is not None: sheet.paste(im.resize((W, H), Image.LANCZOS), (x, y))
    else: d.rectangle((x, y, x + W, y + H), fill=(38, 45, 54), outline=(60, 68, 78))
    d.text((x + 2, y + H + 8), name, font=f, fill=(226, 218, 204))
sheet.save(os.path.join(out, "readroom-explore-2-contact.png")); print("wrote", sum(1 for _, im in thumbs if im is not None), "thumbnails and the contact sheet to", out)
