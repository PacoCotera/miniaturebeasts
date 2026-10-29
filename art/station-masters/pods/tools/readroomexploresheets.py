"""Crops each exploration raw (1376x768) centred to 1024x600 at 1x and lays a contact sheet with only the concept names.
usage: python3 -I tools/readroomexploresheets.py OUT_DIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/concepts-readroom-explore")
ORDER = [("lens", "The Lens"), ("lantern", "The Lantern"), ("constellation", "The Night Sky"), ("sprout", "The Sprout"),
         ("shells", "The Shells"), ("pool", "The Pool"), ("dream", "The Dream"), ("cabinet", "The Cabinet")]
INTER = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
def font(px, w="Medium"):
    try: return ImageFont.truetype(INTER % w, px)
    except OSError: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", px)
def crop_1x(im):
    s = 600 / im.height; im = im.resize((round(im.width * s), 600), Image.LANCZOS)
    x = (im.width - 1024) // 2; return im.crop((x, 0, x + 1024, 600))
out = sys.argv[1]; os.makedirs(out, exist_ok=True); thumbs = []
for cid, name in ORDER:
    im = crop_1x(Image.open(os.path.join(RAW, cid + ".jpg")).convert("RGB")); im.save(os.path.join(out, f"{cid}-1x.png")); thumbs.append((name, im))
# contact sheet: 4 x 2 at half size, a name under each
W, H, G, L = 512, 300, 24, 34; cols = 4; rows = 2
sheet = Image.new("RGB", (G + cols * (W + G), G + rows * (H + L + G)), (29, 35, 43)); d = ImageDraw.Draw(sheet); f = font(18)
for i, (name, im) in enumerate(thumbs):
    c, r = i % cols, i // cols; x = G + c * (W + G); y = G + r * (H + L + G)
    sheet.paste(im.resize((W, H), Image.LANCZOS), (x, y)); d.text((x + 2, y + H + 8), name, font=f, fill=(226, 218, 204))
sheet.save(os.path.join(out, "readroom-explore-contact.png")); print("wrote", len(thumbs), "thumbnails and the contact sheet to", out)
