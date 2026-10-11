# S01 floor, the composed inputs for the bare edits F1 and F2 (s01-floor-studio-brief.md, internal ec08bc1 as passed 14:33).
# usage: python3 -I compose.py PODS_ROOT REPO_ROOT
import sys, json, hashlib, numpy as np
from scipy import ndimage as nd
from PIL import Image
P, R = sys.argv[1:3]
src = open(f'{P}/concepts/mibi-motion-proof/guides/cut-motion.py').read()
exec(src[src.index('def cut(a):'):src.index('st = np.asarray')])            # the proof cut's keying, the same method
MAG = np.array([255, 0, 255], float)
def cell(i, W=1264, H=848): return (i % 3) * W // 3, (i // 3) * H // 2, ((i % 3) + 1) * W // 3, ((i // 3) + 1) * H // 2
def figure_of(rgba):                                                       # the body only, no painted shadow
    a = np.asarray(rgba).astype(float); m = a[..., 3] >= 200
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    al = np.where(a[..., 3] > 120, a[..., 3] / 255.0, 0)                     # soft edges kept, the shadow (alpha 110) left out
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], al[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
def body_rows(sheet, i):
    x0, y0, x1, y1 = cell(i); k = cut(sheet[y0 + 6:y1 - 6, x0 + 6:x1 - 6])
    a = np.asarray(k[0])[..., 3] == 255; ys = np.where(a.any(1))[0]
    lower = a[(ys.min() + ys.max()) // 2:]; belly = lower.sum(1).max()
    return y0 + 6 + ys.max(), belly
def paste(sheet, i, fig, mask, sc, foot_y):
    h, w = mask.shape; im = Image.fromarray(np.dstack([fig[..., :3], mask * 255]).astype(np.uint8), 'RGBA')
    im = im.resize((round(w * sc), round(h * sc)), Image.LANCZOS); a = np.asarray(im).astype(float)
    al = (a[..., 3:] / 255.0); x0, y0, x1, y1 = cell(i)
    sheet[y0:y1, x0:x1] = MAG                                              # the cell cleared to flat magenta first
    ox = x0 + ((x1 - x0) - im.width) // 2; oy = foot_y - im.height + 1
    reg = sheet[oy:oy + im.height, ox:ox + im.width]; reg[:] = reg * (1 - al) + a[..., :3] * al
    return {'cell': i + 1, 'scale': round(sc, 4), 'at': [ox, oy], 'size': [im.width, im.height]}
log = {}
# F1: P1 with the signed young stand in cell 5
s1 = np.asarray(Image.open(f'{P}/source/raw/motion-S01-juvenile-a.jpg').convert('RGB')).astype(float).copy()
foot1, _ = body_rows(s1, 0)
fig, m = figure_of(Image.open(f'{P}/juvenile/mibi-juvenile-S01-304x312.png').convert('RGBA'))
log['F1'] = [paste(s1, 4, fig, m, 1 / 0.601, foot1 - 0 + 424)]          # cell 5 is on the second row: the same foot row, 424 lower
# F2: P2 with crouch-b in cell 2 and Pip's stand in cell 6
s2 = np.asarray(Image.open(f'{P}/source/raw/motion-S01-adult-a.jpg').convert('RGB')).astype(float).copy()
foot2, belly2 = body_rows(s2, 0)
cb = cut(np.asarray(Image.open(f'{P}/source/raw/motion-S01-adult-crouch-b.jpg').convert('RGB')).astype(float))
fig, m = figure_of(cb[0]); log['F2'] = [paste(s2, 1, fig, m, 0.312 / 0.733, foot2)]
pip = Image.open(f'{R}/art/miniature-lives/assets/rich-plain-source.png').convert('RGBA')
fig, m = figure_of(pip); lower = m[m.shape[0] // 2:] >= 200 / 255; sc = belly2 / lower.sum(1).max()
log['F2'].append(paste(s2, 5, fig, m, sc, foot2 + 424))
for n, s in [('juvenile', s1), ('adult', s2)]:
    f = f'{P}/floor/S01/guides/compose-{n}.png'; Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).save(f)
    log[f'compose-{n}.png'] = hashlib.sha256(open(f, 'rb').read()).hexdigest()
log['foot rows'] = {'P1 cell 1': int(foot1), 'P2 cell 1': int(foot2)}; log['P2 anchor belly px'] = int(belly2)
json.dump(log, open(f'{P}/floor/S01/guides/compose.json', 'w'), indent=1, default=int); print(json.dumps(log, default=int))
