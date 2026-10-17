#!/usr/bin/env python3
"""T-20261016-169: cut the S03 painted set (masters-pods station-s03-set, sheets A-E) into slices in the house format:
the magenta keyed and despilled, the content reduced (never enlarged) into the centred 75 percent of the cell, on the
pods cell tone (#162a37). Close-ups as 144x176 and 64x64 (like trait-S03-* and look-S03-*); doing stills as 96x96
and 48x48 (like pose-S03-*, the 48 from the 96).

  python3 -I cut-set.py SHEETS_DIR OUT_DIR
"""
import os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1:3]
CELL = (22, 42, 55)
LOOK, DOING = 'look', 'doing'
CUTS = [  # (sheet, column, row, slice name, kind)
    ('A', 0, 0, 'look-S03-colour-lagoon', LOOK), ('A', 1, 0, 'look-S03-trim-milk-mint', LOOK),
    ('A', 2, 0, 'look-S03-eyes-big-wide', LOOK), ('A', 0, 1, 'look-S03-snout-between', LOOK),
    ('A', 2, 1, 'look-S03-haunch-between', LOOK),
    ('B', 0, 0, 'look-S03-topline-level', LOOK), ('B', 1, 0, 'look-S03-legs-between', LOOK),
    ('B', 0, 1, 'look-S03-eyes-small-close', LOOK),
    ('E', 0, 0, 'look-S03-build-between', LOOK), ('E', 1, 0, 'look-S03-eyes-between', LOOK),
    ('C', 0, 0, 'head-S03-movement', DOING), ('C', 1, 0, 'head-S03-stamina', DOING), ('C', 2, 0, 'head-S03-character', DOING),
    ('C', 0, 1, 'doing-S03-pace-between', DOING), ('C', 1, 1, 'doing-S03-stride-between', DOING),
    ('C', 2, 1, 'doing-S03-weave-between', DOING),
    ('E', 2, 0, 'doing-S03-turning-between', DOING), ('D', 1, 0, 'doing-S03-strength-between', DOING),
    ('D', 2, 0, 'doing-S03-reserve-between', DOING), ('D', 0, 1, 'doing-S03-thrift-between', DOING),
    ('D', 1, 1, 'doing-S03-curiosity-between', DOING), ('E', 0, 1, 'doing-S03-nerve-between', DOING),
]
FILES = {'A': 's03-sheetA-1264x848.jpg', 'B': 's03-sheetB-1264x848.jpg', 'C': 's03-sheetC-1264x848.jpg',
         'D': 's03-sheetD-1264x848.jpg', 'E': 's03-sheetE-retry-1264x848.jpg'}


def key(cell):
    """The sheet's own magenta to transparent: alpha from the distance to the cell's ground colour (its corners), and the
    ground un-mixed from every edge pixel (pixel = alpha * colour + (1 - alpha) * ground), so no pink fringe stays."""
    a = np.asarray(cell.convert('RGB'), dtype=float)
    corners = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)])
    mag = corners[(corners[:, 0] > 180) & (corners[:, 2] > 180) & (corners[:, 1] < 120)]
    bg = np.median(mag, axis=0) if len(mag) else np.array([255., 0., 255.])
    d = np.sqrt(((a - bg) ** 2).sum(2))
    alpha = np.clip((d - 40) / 110, 0, 1)
    pinkish = (np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 25     # still leaning magenta: pull it further out
    alpha = np.where(pinkish, alpha * np.clip(1 - ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) - 25) / 60, 0, 1), alpha)
    col = (a - (1 - alpha[..., None]) * bg) / np.maximum(alpha[..., None], 0.05)
    out = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype('uint8')
    return Image.fromarray(out, 'RGBA')


def strip_lines(fig):
    """Drop sheet dividers: full-height or full-width runs of light or dark neutral pixels at the cell's edges."""
    a = np.asarray(fig).copy(); h, w = a.shape[:2]
    rgb = a[..., :3].astype(int); neutral = (rgb.max(2) - rgb.min(2)) < 30
    for x in list(range(0, 24)) + list(range(w - 24, w)):
        if (neutral[:, x] & (a[:, x, 3] > 0)).mean() > 0.6:
            a[:, x, 3] = 0
    for y in list(range(0, 24)) + list(range(h - 24, h)):
        if (neutral[y, :] & (a[y, :, 3] > 0)).mean() > 0.6:
            a[y, :, 3] = 0
    return Image.fromarray(a, 'RGBA')


def place(fig, w, h):
    """Reduced (never enlarged) into the centred 75 percent of a w x h cell, on the cell tone."""
    bb = fig.getbbox(); fig = fig.crop(bb)
    k = min(w * .75 / fig.width, h * .75 / fig.height, 1.0)
    fig = fig.resize((max(1, round(fig.width * k)), max(1, round(fig.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), CELL + (255,))
    out.alpha_composite(fig, ((w - fig.width) // 2, (h - fig.height) // 2))
    return out.convert('RGB')


os.makedirs(OUT, exist_ok=True)
sheets = {s: Image.open(os.path.join(SRC, f)) for s, f in FILES.items()}
for s, c, r, name, kind in CUTS:
    im = sheets[s]; cw, ch = im.width // 3, im.height // 2
    cell = im.crop((c * cw + 10, r * ch + 10, (c + 1) * cw - 10, (r + 1) * ch - 10))
    fig = strip_lines(key(cell))
    if kind == LOOK:
        place(fig, 144, 176).save(os.path.join(OUT, f'{name}-144x176.png'))
        place(fig, 64, 64).save(os.path.join(OUT, f'{name}-64x64.png'))
    else:
        p96 = place(fig, 96, 96); p96.save(os.path.join(OUT, f'{name}-96x96.png'))
        p96.resize((48, 48), Image.LANCZOS).save(os.path.join(OUT, f'{name}-48x48.png'))
print(len(CUTS), 'cut')
