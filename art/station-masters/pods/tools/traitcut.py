"""Trait plates, wave 1: cut each look of a trait sheet to every Pods cell size and the Create roll, by hand-set windows.
Owner's 75 percent rule: the content fills the centred 75 percent of the cell, reduced and never enlarged, on the cell
tone ground #162a37; the sheet's magenta (and white outside panels) is keyed to that ground; a 12 px smoothstep fade on the
content box's edges. usage: python3 -I tools/traitcut.py ROOT"""
import sys, numpy as np
from PIL import Image
ROOT = sys.argv[1]; GROUND = np.array([0x16, 0x2a, 0x37], float)
SIZES = [(144, 176), (128, 160), (104, 160), (104, 96), (104, 64)]; ROLL = (128, 72)
# (sheet, trait slug, look slug, window centre in sheet px, base window height)
LOOKS = [   # (sheet, species, trait, look, portrait window (centre, height), landscape window (centre, width))
    ('trait-S01-crown-a', 'S01', 'crown', 'bare-head', (373, 215), 430, (373, 200), 520),
    ('trait-S01-crown-a', 'S01', 'crown', 'leaf-crest', (1030, 215), 430, (1030, 200), 520),
    ('trait-S01-eyes-a', 'S01', 'eyes', 'thin-rings', (340, 300), 440, (340, 300), 420),
    ('trait-S01-eyes-a', 'S01', 'eyes', 'between', (845, 300), 440, (845, 300), 420),
    ('trait-S01-eyes-a', 'S01', 'eyes', 'wide-pale-rings', (1355, 300), 440, (1355, 300), 420),
    ('trait-S01-markings-b', 'S01', 'markings', 'plain', (520, 440), 420, (520, 470), 400),
    ('trait-S01-markings-b', 'S01', 'markings', 'pale-patches', (1170, 440), 420, (1170, 470), 400),
    ('trait-S03-markings-a', 'S03', 'markings', 'plain', (330, 290), 400, (340, 310), 380),
    ('trait-S03-markings-a', 'S03', 'markings', 'stripes', (930, 290), 400, (940, 310), 380),
    ('trait-S03-markings-a', 'S03', 'markings', 'spots', (330, 740), 400, (340, 760), 380),
    ('trait-S03-markings-a', 'S03', 'markings', 'stripes-and-spots', (930, 740), 400, (940, 760), 380),
    ('trait-S03-crest-a', 'S03', 'crest', 'low-crest', (300, 165), 320, (300, 150), 420),
    ('trait-S03-crest-a', 'S03', 'crest', 'between', (830, 165), 320, (830, 150), 420),
    ('trait-S03-crest-a', 'S03', 'crest', 'tall-crest', (1360, 165), 320, (1360, 150), 420),
    ('trait-S02-spots-a', 'S02', 'spots', 'bare', (300, 230), 400, (300, 230), 460),
    ('trait-S02-spots-a', 'S02', 'spots', 'bands', (900, 230), 400, (900, 230), 460),
    ('trait-S02-spots-a', 'S02', 'spots', 'spots', (300, 670), 400, (300, 670), 460),
    ('trait-S02-spots-a', 'S02', 'spots', 'bands-and-spots', (900, 670), 400, (900, 670), 460),
    ('trait-S02-span-a', 'S02', 'span', 'small-cap', (272, 320), 500, (272, 320), 500),
    ('trait-S02-span-a', 'S02', 'span', 'between', (790, 320), 500, (790, 320), 500),
    ('trait-S02-span-a', 'S02', 'span', 'wide-cap', (1308, 320), 500, (1308, 320), 500),
    ('trait-S03-tail-carriage-a', 'S03', 'tail', 'short-thin', (230, 212), 400, (215, 230), 400),
    ('trait-S03-tail-carriage-a', 'S03', 'tail', 'between', (651, 212), 400, (636, 230), 400),
    ('trait-S03-tail-carriage-a', 'S03', 'tail', 'long-thick', (1072, 212), 400, (1057, 230), 400),
    ('trait-S03-tail-carriage-a', 'S03', 'carriage', 'hangs', (230, 636), 400, (215, 654), 400),
    ('trait-S03-tail-carriage-a', 'S03', 'carriage', 'straight', (651, 636), 400, (636, 654), 400),
    ('trait-S03-tail-carriage-a', 'S03', 'carriage', 'curls-up', (1072, 636), 400, (1057, 654), 400),
    ('trait-S03-claws-scales-a', 'S03', 'claws', 'round-feet', (210, 200), 300, (210, 230), 380),
    ('trait-S03-claws-scales-a', 'S03', 'claws', 'pads', (631, 200), 300, (631, 230), 380),
    ('trait-S03-claws-scales-a', 'S03', 'claws', 'digging-wedges', (1052, 200), 300, (1052, 230), 380),
    ('trait-S03-claws-scales-a', 'S03', 'scales', 'few-fine', (210, 604), 300, (210, 604), 380),
    ('trait-S03-claws-scales-a', 'S03', 'scales', 'between', (631, 604), 300, (631, 604), 380),
    ('trait-S03-claws-scales-a', 'S03', 'scales', 'many-coarse', (1052, 604), 300, (1052, 604), 380),
    ('trait-S02-flecks-fluff-a', 'S02', 'flecks', 'bare', (205, 210), 400, (205, 200), 400),
    ('trait-S02-flecks-fluff-a', 'S02', 'flecks', 'spots', (626, 210), 400, (626, 200), 400),
    ('trait-S02-flecks-fluff-a', 'S02', 'fluff', 'short-straight', (205, 634), 400, (205, 624), 400),
    ('trait-S02-flecks-fluff-a', 'S02', 'fluff', 'long-swept', (626, 634), 400, (626, 624), 400),
    ('floor/S04/stripes/stripes-sheet', 'S04', 'stripes', 'faint', (150, 205), 150, (150, 205), 180),
    ('floor/S04/stripes/stripes-sheet', 'S04', 'stripes', 'between', (454, 205), 150, (454, 205), 180),
    ('floor/S04/stripes/stripes-sheet', 'S04', 'stripes', 'bold', (758, 205), 150, (758, 205), 180),
]
def keyed(src):
    a = src.astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((np.minimum(r, b) - g - 60) / 40, 0, 1)
    spill = np.clip((np.minimum(r, b) - g - 25) / 35, 0, 1) * (np.abs(r - b) < 70)   # the painted shadow's magenta cast
    mag = np.maximum(mag, spill)            # magenta ground, soft at the fringe
    white = np.clip((a.min(-1) - 225) / 20, 0, 1)                     # the white outside the crown sheet's panels
    pink = np.clip((np.minimum(r, b) - 200) / 30, 0, 1) * np.clip((np.minimum(r, b) - g - 40) / 30, 0, 1)   # the fringe where they meet
    white = np.maximum(white, pink)
    k = np.maximum(mag, white)
    from scipy import ndimage as nd
    k = np.where(a.min(-1) > 140, np.maximum(k, nd.maximum_filter(k, 3)), k)[..., None]   # the light anti-aliased seam between them
    return a * (1 - k) + GROUND * k
def smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def cut(sheet, cx, cy, hs, W, H, out):
    bw, bh = round(W * .75), round(H * .75); asp = bw / bh
    if asp <= 1: wh = hs; ww = wh * asp
    else: ww = hs; wh = ww / asp
    cx = min(max(cx, ww / 2), sheet.width - ww / 2); cy = min(max(cy, wh / 2), sheet.height - wh / 2)   # a window at the sheet's edge slides inside it
    box = (round(cx - ww / 2), round(cy - wh / 2), round(cx + ww / 2), round(cy + wh / 2))
    assert box[0] >= 0 and box[1] >= 0 and box[2] <= sheet.width and box[3] <= sheet.height, ('inside the sheet', box, out)
    assert box[2] - box[0] >= bw and box[3] - box[1] >= bh, 'never enlarged'
    c = sheet.crop(box).resize((bw, bh), Image.LANCZOS)
    a = keyed(np.asarray(c))
    yy, xx = np.mgrid[:bh, :bw]; d = np.minimum(np.minimum(xx, bw - 1 - xx), np.minimum(yy, bh - 1 - yy))
    f = smooth(d / 12)[..., None]
    a = a * f + GROUND * (1 - f)
    cell = np.tile(GROUND, (H, W, 1)); x0, y0 = (W - bw) // 2, (H - bh) // 2
    cell[y0:y0 + bh, x0:x0 + bw] = a
    Image.fromarray(np.clip(cell, 0, 255).round().astype(np.uint8)).save(out)
    return box
rows = []
only = sys.argv[2:]                                              # species to cut (all when none named)
for sh, sp, trait, look, (cx, cy), hs, (lx, ly), lw in LOOKS:
    if only and sp not in only: continue
    sheet = Image.open(f'{ROOT}/{sh}.png' if '/' in sh else f'{ROOT}/source/raw/{sh}.jpg').convert('RGB')
    for W, H in SIZES:
        box = cut(sheet, cx, cy, hs, W, H, f'{ROOT}/slices/trait-{sp}-{trait}-{look}-{W}x{H}.png') if W / H < 1.2 else cut(sheet, lx, ly, lw, W, H, f'{ROOT}/slices/trait-{sp}-{trait}-{look}-{W}x{H}.png'); rows.append((sp, trait, look, W, H, box))
    box = cut(sheet, lx, ly, lw, *ROLL, f'{ROOT}/slices/roll-{sp}-{trait}-{look}-128x72.png'); rows.append((sp, trait, look, *ROLL, box))
for r in rows: print(*r)
