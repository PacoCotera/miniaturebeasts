# bud-shape-SXX-112x112 (station-x4-x7-art-plan.md §1; incubator.json regions.bud.shape): a flat soft-edged silhouette in
# palette bark #7d5435, the species' juvenile from its signed stand-in, fitted into the 96x96 ink box centred in 112x112,
# reduced only, the edge softened 2 px. S01 is cut from the BARE base (floor/S01), so a bare-headed founder's bud never shows a crest.
# usage: python3 -I cut-bud-shapes.py PODS_ROOT S01 S03 ...
import sys, numpy as np
from PIL import Image, ImageFilter
P = sys.argv[1]
SRC = {'S01': 'floor/S01/keys/mibi-juvenile-S01-base-stand-304x312.png'}
BARK = (0x7d, 0x54, 0x35)
for s in sys.argv[2:]:
    a = np.asarray(Image.open(f'{P}/{SRC.get(s, f"juvenile/mibi-juvenile-{s}-304x312.png")}').convert('RGBA'))
    m = a[..., 3] == 255                                                    # the body only: never the painted shadow
    from scipy import ndimage as nd
    lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(sz)))   # the figure alone, no specks
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    crop = Image.fromarray((m[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8))
    sc = min(96 / crop.width, 96 / crop.height, 1.0)
    crop = crop.resize((round(crop.width * sc), round(crop.height * sc)), Image.LANCZOS)
    al = Image.new('L', (112, 112), 0); al.paste(crop, ((112 - crop.width) // 2, 8 + 96 - crop.height))   # feet on the ink box's floor
    al = al.filter(ImageFilter.GaussianBlur(1.0))                            # the 2 px soft edge
    out = Image.new('RGBA', (112, 112), BARK + (0,)); out.putalpha(al)
    out.save(f'{P}/bud/bud-shape-{s}-112x112.png'); print(s, 'ink', crop.size)
