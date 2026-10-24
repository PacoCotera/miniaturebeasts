"""Art director's ruling (via the lead, after the Sitting P1 gate), 0 MXN: the curl's painted contact shadow is taken out of the signed curl keys;
a shadow belongs on the stand's separate shadow layer, never inside a key. Alpha is set to 0 outside the figure: the figure is the largest island at
alpha > 128 plus its fur edge, the alpha > 0 pixels within 2 px of that island that are not the cut's flat shadow colour (30, 26, 34; sum of |RGB|
differences < 24). RGB is left as it is. Then checks 5 and 8 on the alpha > 128 figure (before against after, and base against crested twin).
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/curl-shadow-off.py"""
import hashlib, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
_cs = open('floor/S01/sitting/guides/cut-sit.py').read(); exec(_cs[_cs.index('def outline_p95'):_cs.index('def shift')])
FILES = [f'floor/S01/{d}/mibi-{s}-S01-{n}-304x312.png' for s in ('adult', 'juvenile') for d, n in (('keys', 'base-curl'), ('crested', 'curl'))]
SH = np.array([30, 26, 34]); rep = {}; before = {}
def body(a): lab, n = nd.label(a[..., 3] > 128); return lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
for f in FILES:
    a = np.asarray(Image.open(f).convert('RGBA')).copy(); before[f] = a.copy(); m = body(a)
    shadow = np.abs(a[..., :3].astype(int) - SH).sum(-1) < 24
    keep = m | ((a[..., 3] > 0) & nd.binary_dilation(m, iterations=2) & ~shadow)
    off = (a[..., 3] > 0) & ~keep; a[off, 3] = 0; a[a[..., 3] == 0] = 0; Image.fromarray(a).save(f)
    b = before[f]; sa, sb = a[..., 3] > 128, b[..., 3] > 128
    p95, mx = outline_p95(sa, sb, np.ones(sa.shape, bool)); inside = sa & sb
    rep[f] = {'alpha_px_set_to_0': int(off.sum()), 'semi_px_kept_on_fur_edge': int(((a[..., 3] > 0) & (a[..., 3] <= 128)).sum()), 'alpha>128_px_changed': int((sa != sb).sum()),
              'check5_vs_before_p95_px': round(p95, 2), 'check5_vs_before_max_px': round(mx, 2), 'mean_rgb_diff_inside': round(float(np.abs(a[..., :3].astype(float) - b[..., :3].astype(float))[inside].mean()), 2),
              'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest()}
for s in ('adult', 'juvenile'):
    kb, kc = f'floor/S01/keys/mibi-{s}-S01-base-curl-304x312.png', f'floor/S01/crested/mibi-{s}-S01-curl-304x312.png'
    for tag, A, B in (('before', before[kb], before[kc]), ('after', np.asarray(Image.open(kb)), np.asarray(Image.open(kc)))):
        bm, tm = body(A), body(B); cz = green(B); cz |= nd.binary_dilation(cz, iterations=30) & tm & ~bm; far = ~nd.binary_dilation(cz, iterations=10)
        p95, mx = outline_p95(bm, tm, far); inside = bm & tm & far
        rep[f'{s}-check8-bare-vs-crested-{tag}'] = {'p95_px': round(p95, 2), 'max_px': round(mx, 2), 'mean_rgb': round(float(np.abs(A[..., :3].astype(float) - B[..., :3].astype(float))[inside].mean()), 2)}
json.dump(rep, open('floor/S01/sitting/guides/curl-shadow-off.json', 'w'), indent=1); print(json.dumps(rep, indent=1))
