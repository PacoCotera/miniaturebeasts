#!/usr/bin/env python3
"""T-20261016-200: cut the Loika version 4 master layers from the studio's raw sheets (masters-pods 3a3a4918).

Each sheet was composed by floor/S01/guides/compose-m.py (a key's alpha box scaled by its proof scale, centred in its
cell, feet 20 px above the cell's bottom), so the placement is inverted exactly. Per key (304 x 312, the base key's
frame), the outputs are:
  fur mask    the coat (adult: the charcoal fur; juvenile: the dark cap), from the base key
  zone mask   the two-tone split: 0 = first pigment (back and head), 255 = second (flanks and legs)
  patches     the mark layer from M1/M3, only inside the fur mask (alpha from the mark's lightness)
  stripes     the same from M2/M4
and ramps.json, the three pigments' shadow, mid and highlight, calibrated from M5's painted anchors.
Outside the coat every layer is transparent, so base + layer differs from the base only inside the coat.

  python3 -I cut-layers.py KEYS_DIR SHEETS_DIR OUT_DIR
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

KEYS, SHEETS, OUT = sys.argv[1:4]
W, H = 1264, 848
ADULT = ['air', 'anchor', 'blink', 'crouch', 'curl', 'stand']
JUV = ['air', 'anchor', 'crouch', 'curl', 'stand']
SC = {'adult': 1 / 0.733, 'juvenile': 1 / 0.601}


def base(kind, k):
    return Image.open(os.path.join(KEYS, f'mibi-{kind}-S01-base-{k}-304x312.png')).convert('RGBA')


def placement(im, sc, cell, cols=3, rows=2):
    """compose-m.py's place(), returning the alpha box in the key and its rectangle on the sheet."""
    a = np.asarray(im)[..., 3] > 0
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    bw, bh = box[2] - box[0], box[3] - box[1]
    sw, sh = round(bw * sc), round(bh * sc)
    cw, ch = W // cols, H // rows
    cx0, cy0 = (cell % cols) * cw, (cell // cols) * ch
    cx1, cy1 = cx0 + cw, cy0 + ch
    ox, oy = cx0 + (cw - sw) // 2, cy1 - 20 - sh
    return box, (ox, oy, ox + sw, oy + sh)


def back_to_key(sheet, box, rect):
    """The sheet's painting of one key, scaled back into the key's 304 x 312 frame."""
    crop = sheet.crop(rect).resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
    out = Image.new('RGB', (304, 312), (255, 0, 255))
    out.paste(crop, box[:2])
    return np.asarray(out, dtype=float)


def largest_components(m, keep=0.05):
    """Keep the connected parts of a mask larger than keep x the largest (drops pupils, nostrils, mouth lines)."""
    from collections import deque
    lab = np.zeros(m.shape, int); sizes = [0]; n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n; s = 0
        while q:
            cy, cx = q.popleft(); s += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        sizes.append(s)
    big = max(sizes)
    keepers = [i for i, s in enumerate(sizes) if i and s >= big * keep]
    return np.isin(lab, keepers)


def fur_mask(b):
    a = np.asarray(b, dtype=float)
    mx, mn = a[..., :3].max(2), a[..., :3].min(2)
    m = (a[..., 3] > 128) & (((mx < 120) & ((mx - mn) < 60)) | ((mx < 160) & ((mx - mn) < 45)))   # the lit crown too
    m = largest_components(m)
    img = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    return np.asarray(img) > 127


def zone_mask(m):
    """The two-tone split along the body: in each column of coat, the top 48% is the first pigment."""
    z = np.zeros(m.shape)
    for x in range(m.shape[1]):
        col = np.nonzero(m[:, x])[0]
        if len(col):
            edge = col.min() + (col.max() - col.min()) * 0.48
            z[:, x] = np.clip((np.arange(m.shape[0]) - edge) / 3.0 + 0.5, 0, 1)
    z = np.asarray(Image.fromarray((z * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.5)))
    return np.where(m, z, 0).astype('uint8')


def mark_layer(painted, b, m):
    """The pale mark where the painted key is light inside the coat; alpha ramps with the lightness over the coat's own."""
    bl = np.asarray(b, dtype=float)[..., :3].mean(2)
    pl = painted.mean(2)
    lift = np.clip((pl - bl - 25) / 60, 0, 1)                    # how much lighter than the bare coat
    inner = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MinFilter(3))) > 127
    alpha = (lift * inner * 255).astype('uint8')
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6)))
    alpha = np.where(m, alpha, 0).astype('uint8')               # never outside the coat
    rgba = np.dstack([np.clip(painted, 0, 255).astype('uint8'), alpha])
    return Image.fromarray(rgba, 'RGBA')


def ramp_from(painted, b, m):
    """A pigment's ramp read off its painted key: the coat's colour at the base's dark, mid and light values."""
    bl = np.asarray(b, dtype=float)[..., :3].mean(2)
    v = bl[m]; c = painted[m]
    lo, hi = np.percentile(v, 5), np.percentile(v, 97)
    t = (v - lo) / (hi - lo + 1e-6)
    stops = []
    for c0, c1 in ((0.0, 0.15), (0.42, 0.58), (0.85, 1.0)):
        sel = (t >= c0) & (t <= c1)
        stops.append([int(round(x)) for x in np.median(c[sel], axis=0)])
    return stops


os.makedirs(OUT, exist_ok=True)
sheets = {n: Image.open(os.path.join(SHEETS, f)).convert('RGB') for n, f in (
    ('M1', 'M1-loika-v4-adult-patches-1264x848.jpg'), ('M2', 'M2-loika-v4-adult-stripes-1264x848.jpg'),
    ('M3', 'M3-loika-v4-juvenile-patches-1264x848.jpg'), ('M4', 'M4-loika-v4-juvenile-stripes-1264x848.jpg'),
    ('M5', 'M5-loika-v4-pigments-1264x848.jpg'))}
report = {}
for kind, keys, pat, stri in (('adult', ADULT, 'M1', 'M2'), ('juvenile', JUV, 'M3', 'M4')):
    for i, k in enumerate(keys):
        b = base(kind, k)
        m = fur_mask(b)
        box, rect = placement(b, SC[kind], i)
        stem = f'mibi-{kind}-S01-{k}'
        Image.fromarray((m * 255).astype('uint8')).save(os.path.join(OUT, f'{stem}-fur-mask-304x312.png'))
        Image.fromarray(zone_mask(m)).save(os.path.join(OUT, f'{stem}-zone-mask-304x312.png'))
        for look, sh in (('patches', pat), ('stripes', stri)):
            lay = mark_layer(back_to_key(sheets[sh], box, rect), b, m)
            lay.save(os.path.join(OUT, f'{stem}-{look}-304x312.png'))
            al = np.asarray(lay)[..., 3]
            report[f'{stem}-{look}'] = {'mark_px': int((al > 128).sum()), 'outside_coat_px': int(((al > 0) & ~m).sum())}
        report[f'{stem}-fur'] = int(m.sum())

ramps = {'charcoal': None}
for kind, cell_x in (('adult', 0), ('juvenile', 1)):
    b = base(kind, 'anchor'); m = fur_mask(b)
    for row, pig in ((0, 'russet'), (1, 'ash')):
        box, rect = placement(b, SC[kind], row * 2 + cell_x, cols=2, rows=2)
        ramps.setdefault(pig, {})[kind] = ramp_from(back_to_key(sheets['M5'], box, rect), b, m)
    a = np.asarray(b, dtype=float)[..., :3]
    bl = a.mean(2); v = bl[m]; lo, hi = np.percentile(v, 5), np.percentile(v, 97); t = (v - lo) / (hi - lo + 1e-6)
    ramps['charcoal'] = ramps['charcoal'] or {}
    ramps['charcoal'][kind] = [[int(round(x)) for x in np.median(a[m][(t >= c0) & (t <= c1)], axis=0)]
                               for c0, c1 in ((0.0, 0.15), (0.42, 0.58), (0.85, 1.0))]
json.dump({'note': 'shadow, mid, highlight per pigment and stage; charcoal is the base keys as painted; russet and ash read off M5',
           'ramps': ramps}, open(os.path.join(OUT, 'ramps.json'), 'w'), indent=1)
json.dump(report, open(os.path.join(OUT, 'cut-report.json'), 'w'), indent=1)
print(json.dumps(ramps)); print('outside-coat px, max over layers:', max(v['outside_coat_px'] for k, v in report.items() if isinstance(v, dict)))
