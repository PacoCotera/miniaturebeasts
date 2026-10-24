"""Sitting S01 keys, K1 measures (0 MXN): the light test of the standing mirror rule (art director's ruling 22:31, after light.py and drops.py) on the
raw sheet's cells as mirrored, and check 7's reads-apart IoU on the cut takes (droplets excluded: the largest solid island; alpha > 128; fitted whole
into 48x48, bottom-centred, as the thumbs). Writes floor/S01/sitting/guides/k1-measures-<stage>.json.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/measure-k1.py <stage> <raw sheet> <mirrored cells>"""
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
stage, sheet, mir = sys.argv[1:4]; mir = {int(x) for x in mir.split(',')} if mir != '-' else set()
CW, CH = 421, 424; A = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
CELLS = {2: 'shake-t1', 3: 'calm-t1', 5: 'shake-t2', 6: 'calm-t2'}
def cell(c):
    q = A[((c - 1) // 3) * CH:((c - 1) // 3 + 1) * CH, ((c - 1) % 3) * CW:((c - 1) % 3 + 1) * CW]; return q[:, ::-1] if c in mir else q
def coat_light(c):
    d = np.abs(c - [255, 0, 255]).sum(2); fig = d > 150; L = 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]
    mx, mn = c.max(2), c.min(2); sat = (mx - mn) / np.maximum(mx, 1); coat = fig & (L < 110) & (sat < 0.35) & nd.binary_erosion(fig, iterations=4)
    ys, xs = np.where(coat); cx, cy = xs.mean(), ys.mean(); l = L[coat]; hi = l >= np.percentile(l, 85)
    tl = l[(xs < cx) & (ys < cy)].mean(); tr = l[(xs >= cx) & (ys < cy)].mean(); br = l[(xs >= cx) & (ys >= cy)].mean()
    return {'hi_dx': round(float((xs[hi].mean() - cx) / (xs.max() - xs.min())), 3), 'TL/TR': round(float(tl / tr), 2), 'TL/BR': round(float(tl / br), 2)}
def drop_light(q):
    R, G, B = q[..., 0], q[..., 1], q[..., 2]; drop = (G > 150) & (B > 180) & (B >= R - 10) & (np.abs(q - [255, 0, 255]).sum(2) > 150)
    lab, n = nd.label(drop); dx = []; dy = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(xs) < 40: continue
        L = q[ys, xs].sum(1); t = L >= np.percentile(L, 90); dx.append((xs[t].mean() - xs.mean()) / max(np.ptp(xs), 1)); dy.append((ys[t].mean() - ys.mean()) / max(np.ptp(ys), 1))
    dx, dy = np.array(dx), np.array(dy); return {'n': len(dx), 'dx': round(float(dx.mean()), 3), 'dy': round(float(dy.mean()), 3), 'left': int((dx < 0).sum()), 'right': int((dx > 0).sum())}
def fit48(m):
    ys, xs = np.where(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; h, w = m.shape; s = 48 / max(h, w)
    a = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)) > 128
    o = np.zeros((48, 48), bool); oh, ow = a.shape; x0 = (48 - ow) // 2; o[48 - oh:, x0:x0 + ow] = a; return o
def body(p):
    a = np.asarray(Image.open(p).convert('RGBA'))[..., 3] > 128; lab, n = nd.label(a); return lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
iou = lambda a, b: round(float((a & b).sum() / (a | b).sum()), 2)
anc = coat_light(cell(1)); out = {'sheet': sheet, 'mirrored': sorted(mir), 'anchor_light': anc, 'takes': {}}
F = {'anchor': fit48(body(f'floor/S01/crested/mibi-{stage}-S01-anchor-304x312.png')), 'curl': fit48(body(f'floor/S01/crested/mibi-{stage}-S01-curl-304x312.png'))}
ah = np.ptp(np.where(body(f'floor/S01/crested/mibi-{stage}-S01-anchor-304x312.png'))[0])
for c, k in CELLS.items():
    lt = coat_light(cell(c)); r = {'light': lt, 'light_test': bool(np.sign(lt['hi_dx']) == np.sign(anc['hi_dx']) and abs(lt['hi_dx'] - anc['hi_dx']) <= 0.06)}
    if k.startswith('shake'):
        dl = drop_light(cell(c)); r['droplet_light'] = dl; r['light_test'] = bool(r['light_test'] and dl['dy'] < 0 and np.sign(dl['dx']) == np.sign(anc['hi_dx']))
    b = body(f'floor/S01/crested/mibi-{stage}-S01-{k}-304x312.png'); F[k] = fit48(b)
    r['iou_anchor'] = iou(F[k], F['anchor']); r['iou_curl'] = iou(F[k], F['curl']); r['height_of_anchor'] = round(float(np.ptp(np.where(b)[0]) / ah), 2)
    r['reads_apart'] = bool(r['iou_anchor'] <= 0.80 and r['iou_curl'] <= 0.80); out['takes'][k] = r
out['pairs_shake_calm'] = {f'{s}x{c}': iou(F[s], F[c]) for s in ('shake-t1', 'shake-t2') for c in ('calm-t1', 'calm-t2')}
json.dump(out, open(f'floor/S01/sitting/guides/k1-measures-{stage}.json', 'w'), indent=1); print(json.dumps(out, indent=1))
