"""The two ground candidates side by side at 1x: the current meadow (left) and the deeper forest-green meadow with tufts (right), the same still.
usage: python3 -I ground-figure.py CURRENT.png FOREST.png OUT.png"""
import sys
from PIL import Image, ImageDraw, ImageFont
a, b, out = sys.argv[1:4]
try: f = ImageFont.load_default(size=13)
except TypeError: f = ImageFont.load_default()
A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
W = Image.new("RGB", (A.width * 2 + 30, A.height + 40), (40, 36, 50)); d = ImageDraw.Draw(W)
W.paste(A, (10, 8)); W.paste(B, (A.width + 20, 8))
d.text((10, A.height + 14), "current ground (450x600, 1x)", fill=(220, 216, 234), font=f); d.text((A.width + 20, A.height + 14), "candidate: forest-green ground with tufts (450x600, 1x)", fill=(220, 216, 234), font=f)
W.save(out); print("wrote", out, W.size)
