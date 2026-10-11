# Bake the proof's keys (motion-spec.md §2.1 and §168): clean magenta flecks, face every key the stand's way,
# breath steps b1/b2 on the stand and b1 on the curl (rows inserted at the chest, feet fixed, whole pixels),
# and the derived sizes: walk 104x112 (juvenile, feet row 105) / 144x152 (adult, feet row 145), the bed curl 96x88 (feet row 84).
# usage: bake.py keys_dir, once, straight after cut-motion.py (the mirror is not idempotent)
import sys, glob, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
K = sys.argv[1]
SETS = {'juv-S01': ('juvenile', ['anchor', 'crouch', 'air', 'curl'], False),
        'juv-S05': ('juvenile', ['pass', 'stepA', 'stepB', 'crouch', 'curl'], False),
        'pip': ('adult', ['anchor', 'crouch-b', 'air', 'curl', 'blink'], False),
        'grow-b2486': ('adult', ['anchor', 'crouch', 'air', 'curl'], True)}   # the individual's air and curl face right: mirrored to its stand
FLIP = {'grow-b2486': ['air', 'curl']}
WALK = {'juvenile': ((104, 112), 105, 0.36), 'adult': ((144, 152), 145, 0.47)}
def clean(a):
    a = a.copy(); r, g, b = [a[..., i].astype(float) for i in range(3)]
    body = a[..., 3] == 255
    cast = body & (g < 0.75 * np.minimum(r, b)) & (np.minimum(r, b) > 110) & (np.abs(r - b) < 70)
    edge = body & ~nd.binary_erosion(body, iterations=2)
    a[cast & edge] = 0
    inner = cast & ~edge
    if inner.any():
        ok = body & ~cast
        idx = nd.distance_transform_edt(~ok, return_distances=False, return_indices=True)
        a[inner, :3] = a[idx[0][inner], idx[1][inner], :3]
    return a, int(cast.sum())
def breathe(a, k):
    if k == 0: return a
    body = a[..., 3] == 255; ys = np.where(body.any(1))[0]; top, feet = ys.min(), ys.max()
    row = top + int(0.55 * (feet - top))
    out = np.zeros_like(a); out[row + 1:] = a[row + 1:]
    out[top - k:row + 1 - k] = a[top:row + 1]                         # everything above the chest rises k px
    out[row + 1 - k:row + 1] = a[row:row + 1]                         # the chest row repeated k times
    sh = (a[..., 3] > 0) & (a[..., 3] <= 110); out[sh & (out[..., 3] == 0)] = a[sh & (out[..., 3] == 0)]   # the shadow stays put
    return out
def place(im, size, feet, sc):
    W, H = size; a = np.asarray(im); body = a[..., 3] > 0; ys = np.where(body.any(1))[0]; xs = np.where(body.any(0))[0]
    crop = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    p = crop.resize((max(1, round(crop.width * sc)), max(1, round(crop.height * sc))), Image.LANCZOS)
    pa = np.asarray(p).copy(); al = pa[..., 3]; pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0)); p = Image.fromarray(pa)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ground = (305 - ys.min()) * sc                                   # feet row 305 of the master maps to this size's feet row
    c.alpha_composite(p, ((W - p.width) // 2, round(feet - ground)))
    return c
log = []
for n, (stage, keys, _) in SETS.items():
    (ws, wf, wsc) = WALK[stage]
    for k in keys:
        f = f'{K}/{n}-{k}-304x312.png'; a, nfl = clean(np.asarray(Image.open(f).convert('RGBA')))
        if k in FLIP.get(n, []): a = a[:, ::-1].copy()
        Image.fromarray(a).save(f); log.append(f'{n}-{k}: flecks {nfl}')
        steps = [0, 1, 2] if k in ('anchor', 'pass') else [0, 1] if k == 'curl' else [0]
        for b in steps:
            ab = Image.fromarray(breathe(a, b)); tag = '' if b == 0 else f'-b{b}'
            if b: ab.save(f'{K}/{n}-{k}{tag}-304x312.png')
            place(ab, ws, wf, wsc).save(f'{K}/{n}-{k}{tag}-{ws[0]}x{ws[1]}.png')
            if k == 'curl': place(ab, (96, 88), 84, min(wsc, 86 / (np.asarray(ab)[..., 3] > 0).any(0).sum())).save(f'{K}/{n}-{k}{tag}-96x88.png')
print('\n'.join(log))
