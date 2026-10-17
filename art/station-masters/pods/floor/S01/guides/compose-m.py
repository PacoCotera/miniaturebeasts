"""T-20261016-200 (the Loika version 4 masters): the composed inputs for M1 to M5, from the bare base keys in keys/, on flat magenta, 3x2 cells of
1264x848 (M5: 2x2). Each key's figure (its alpha box) is scaled by its sheet's proof scale (adult 1/0.733, juvenile 1/0.601, as compose.json) and placed
centred in its cell with its feet 20 px above the cell's bottom, as compose.py does for F1 and F2.
usage (from art/station-masters/pods): python3 -I floor/S01/guides/compose-m.py"""
import json, numpy as np
from PIL import Image
MAG = np.array([255, 0, 255], float); W, H = 1264, 848
ADULT = ['air', 'anchor', 'blink', 'crouch', 'curl', 'stand']; JUV = ['air', 'anchor', 'crouch', 'curl', 'stand']
def load(kind, k):
    im = Image.open(f'floor/S01/keys/mibi-{kind}-S01-base-{k}-304x312.png').convert('RGBA'); a = np.asarray(im); m = a[..., 3] > 0
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]; return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
def place(sheet, im, sc, cx0, cy0, cx1, cy1):
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS); a = np.asarray(im).astype(float); al = a[..., 3:] / 255.0
    ox = cx0 + ((cx1 - cx0) - im.width) // 2; oy = cy1 - 20 - im.height
    assert ox >= cx0 and oy >= cy0, ('does not fit', im.size)
    reg = sheet[oy:oy + im.height, ox:ox + im.width]; reg[:] = reg * (1 - al) + a[..., :3] * al
def sheet_of(kind, keys, sc, cols=3, rows=2):
    s = np.tile(MAG, (H, W, 1)); cw, ch = W // cols, H // rows
    for i, k in enumerate(keys): place(s, load(kind, k), sc, (i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch)
    return s
out = {'m-adult': sheet_of('adult', ADULT, 1 / 0.733), 'm-juvenile': sheet_of('juvenile', JUV, 1 / 0.601)}
s5 = np.tile(MAG, (H, W, 1)); cw, ch = W // 2, H // 2
for r in range(2):
    place(s5, load('adult', 'anchor'), 1 / 0.733, 0, r * ch, cw, (r + 1) * ch); place(s5, load('juvenile', 'anchor'), 1 / 0.601, cw, r * ch, W, (r + 1) * ch)
out['m-pigments'] = s5
for n, s in out.items(): Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).save(f'floor/S01/guides/compose-{n}.png')
print({n: 'ok' for n in out})
