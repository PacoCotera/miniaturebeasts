"""Place live text (the species name and its lines) onto a generated screen as a text layer.

usage: python3 -I place-text.py IN_1024x600.png OUT_1024x600.png SPEC.json
SPEC is a list of {"text": "...", "x": .., "y": .., "size": .., "color": "#rrggbb", "weight": "Regular|Medium|SemiBold", "anchor": "la|ma|ra"}
in 1024x600 screen coordinates; the face is Inter (the Station's type), from the system's Inter install.
Names are never generated into a plate: the generator leaves the plate empty and this layer sets the words,
the way the build sets live text. Nothing else in the image is touched.
"""
import glob, json, sys
from PIL import Image, ImageDraw, ImageFont

src, dst, spec_p = sys.argv[1:4]
spec = json.load(open(spec_p))
im = Image.open(src).convert("RGB")
d = ImageDraw.Draw(im)

def font(weight, size):
    cands = glob.glob(f"/usr/share/fonts/opentype/inter/Inter-{weight}.otf") + glob.glob(f"/usr/share/fonts/**/Inter-{weight}.*", recursive=True)
    if not cands:
        sys.exit(f"Inter {weight} not found")
    return ImageFont.truetype(cands[0], size)

for s in spec:
    f = font(s.get("weight", "Regular"), s["size"])
    d.text((s["x"], s["y"]), s["text"], font=f, fill=s.get("color", "#2b2420"), anchor=s.get("anchor", "la"))
im.save(dst)
print("placed", [s["text"] for s in spec], "->", dst)
