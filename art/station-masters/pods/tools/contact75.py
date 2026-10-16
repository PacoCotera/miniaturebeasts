"""Pass 59: a 1x contact sheet of the 60 trait crops re-cut by the 75 percent rule, on the cell tone `ground`, a 1 px hairline round each cell so the 75 percent box can be seen against the cell. python3 -I tools/contact75.py -> traitpics/recut75-contact-1x.png"""
import os, glob, re
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
GROUND = (22, 42, 55); f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
fs = sorted(glob.glob("slices/trait-S*-*x*.png")); groups = {}
for f in fs:
    m = re.match(r"slices/(trait-S\d\d-.+)-(\d+x\d+)\.png", f); groups.setdefault(m.group(1), []).append((m.group(2), f))
order = ["128x160", "144x176", "104x160", "104x96", "104x64"]
W = 16 + 128 + 144 + 104 + 104 + 104 + 6 * 16; H = 16 + len(groups) * 0
rows = list(groups.items()); sheet = Image.new("RGB", (W, 16 + len(rows) * 204), (10, 20, 26)); d = ImageDraw.Draw(sheet)
for r, (nm, items) in enumerate(rows):
    y = 16 + r * 204; x = 16; d.text((x, y - 14), nm[6:], font=f12, fill=(141, 138, 166))
    for sz in order:
        f = dict(items).get(sz)
        if not f: continue
        im = Image.open(f).convert("RGB"); sheet.paste(im, (x, y)); d.rectangle([x - 1, y - 1, x + im.width, y + im.height], outline=(60, 75, 87)); x += im.width + 16
os.makedirs("traitpics", exist_ok=True); sheet.save("traitpics/recut75-contact-1x.png"); print(sheet.size)
