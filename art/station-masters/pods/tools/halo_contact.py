"""Pass 63: halo/halo-contact-1x.png with S04 and S07 painted. The sheet is the earlier one (3 panels a row, each: the species' mist figure, its clear figure, the large pod): the mist and clear slots of the S04 and S07 panels, which read "not yet painted",
are cleared to the panel tone (22, 34, 44) and the new mibi-halo slices are composited there at the offsets the other panels use (mist at (7 + 410 col, 19 + 190 row), clear 128 px to its right: measured by an exact match of S01 and S08 on the old sheet).
python3 -I tools/halo_contact.py"""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
sheet = Image.open("halo/halo-contact-1x.png").convert("RGB"); BG = (22, 34, 44)
def slot(sp):
    i = int(sp[1:]) - 1; col, row = i % 3, i // 3; return 7 + 410 * col, 19 + 190 * row
def comp(sp, kind):
    im = Image.open(f"slices/mibi-halo-{sp}-128x160-{kind}.png").convert("RGBA"); b = Image.new("RGBA", im.size, BG + (255,)); b.alpha_composite(im); return b.convert("RGB")
if __name__ == "__main__":
    # check the offsets on a species already on the sheet (S08 and S01), exact
    for sp in ("S01", "S08"):
        x, y = slot(sp); a = np.asarray(sheet.crop((x, y, x + 128, y + 160))).astype(int); b = np.asarray(comp(sp, "mist")).astype(int); print(sp, "mist slot max abs diff vs the sheet:", int(np.abs(a - b).max()))
    for sp in sys.argv[1:]:
        x, y = slot(sp)
        for kind, dx in (("mist", 0), ("clear", 128)): sheet.paste(Image.new("RGB", (128, 160), BG), (x + dx, y)); sheet.paste(comp(sp, kind), (x + dx, y))
        sheet.paste(Image.new("RGB", (404 - 20, 14), BG), (x - 4, y - 16)) if False else None
    if len(sys.argv) > 1: sheet.save("halo/halo-contact-1x.png")
