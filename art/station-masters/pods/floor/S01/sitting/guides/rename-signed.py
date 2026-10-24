"""Sitting S01 keys: the rename commit after the art director's signing (ruling Round 3, R3.1 / R3.6 item 1), 0 MXN.
1. Shake t1's tiny pale glints on the coat are painted out from the neighbouring fur, the same edit on the base and the crested file. Glints are
   pixels on the coat more than 20 levels over the 9x9 median, blue at least as strong as red (the union of both files' finds), dilated 1 px,
   filled by cut-sit.py's inpaint (3x3 averaging of known neighbours, outside-in).
2. The signed takes get the final ids; the unsigned take's files are removed (the raws keep it).
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/rename-signed.py <stage> <shake take> <calm take>"""
import json, os, subprocess, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
_cs = open('floor/S01/sitting/guides/cut-sit.py').read(); exec(_cs[_cs.index('def inpaint'):_cs.index('def to_canvas')])
stage, sh, ca = sys.argv[1:4]; F = 'floor/S01'; rep = {}
if stage == 'adult':
    m = np.asarray(Image.open(f'{F}/layers/mibi-{stage}-S01-{sh}-fur-mask-304x312.png')) > 127; cz = nd.binary_erosion(nd.binary_closing(m, iterations=3), iterations=2); g = np.zeros(m.shape, bool)
    for p in (f'{F}/keys/mibi-{stage}-S01-base-{sh}-304x312.png', f'{F}/crested/mibi-{stage}-S01-{sh}-304x312.png'):
        b = np.asarray(Image.open(p)).astype(float); L = b[..., :3].mean(-1); g |= (L > nd.median_filter(L, size=9) + 20) & cz & (b[..., 2] >= b[..., 0] - 5)
    hole = nd.binary_dilation(g, iterations=1) & cz
    for p in (f'{F}/keys/mibi-{stage}-S01-base-{sh}-304x312.png', f'{F}/crested/mibi-{stage}-S01-{sh}-304x312.png'):
        a = np.asarray(Image.open(p)).copy(); f = inpaint(a[..., :3].astype(float), hole); a[..., :3] = np.clip(np.rint(f), 0, 255).astype(np.uint8); Image.fromarray(a).save(p)
    rep['glint_px_painted_out'] = int(hole.sum()); lab, n = nd.label(hole); rep['glints'] = [[int(v) for v in np.array(np.where(lab == i)).mean(1)[::-1].round()] for i in range(1, n + 1)]
MOVES = []
for take, pose in ((sh, 'shake'), (ca, 'calm')):
    MOVES += [(f'{F}/keys/mibi-{stage}-S01-base-{take}-304x312.png', f'{F}/keys/mibi-{stage}-S01-base-{pose}-304x312.png'),
              (f'{F}/crested/mibi-{stage}-S01-{take}-304x312.png', f'{F}/crested/mibi-{stage}-S01-{pose}-304x312.png'),
              (f'{F}/overlays/mibi-{stage}-S01-{take}-crest-304x312.png', f'{F}/overlays/mibi-{stage}-S01-{pose}-crest-304x312.png')]
    MOVES += [(f'{F}/layers/mibi-{stage}-S01-{take}-{l}-304x312.png', f'{F}/layers/mibi-{stage}-S01-{pose}-{l}-304x312.png') for l in ('fur-mask', 'zone-mask', 'patches', 'stripes')]
for a, b in MOVES:
    if os.path.exists(a): subprocess.run(['git', 'mv', a, b], check=True)
rep['renamed'] = [[a, b] for a, b in MOVES if os.path.exists(b)]
gone = []
for t in ('shake-t1', 'shake-t2', 'calm-t1', 'calm-t2'):
    if t in (sh, ca): continue
    for d, pat in (('keys', f'mibi-{stage}-S01-base-{t}'), ('crested', f'mibi-{stage}-S01-{t}'), ('overlays', f'mibi-{stage}-S01-{t}-crest')):
        p = f'{F}/{d}/{pat}-304x312.png'
        if os.path.exists(p): subprocess.run(['git', 'rm', '-q', p], check=True); gone.append(p)
    for l in ('fur-mask', 'zone-mask', 'patches', 'stripes'):
        p = f'{F}/layers/mibi-{stage}-S01-{t}-{l}-304x312.png'
        if os.path.exists(p): subprocess.run(['git', 'rm', '-q', p], check=True); gone.append(p)
    for p in (f'{F}/sitting/guides/discard-shadow-{stage}-{t}.png',):
        if os.path.exists(p): subprocess.run(['git', 'rm', '-q', p], check=True); gone.append(p)
rep['removed'] = gone; print(json.dumps(rep, indent=1))
jp = f'{F}/sitting/guides/rename.json'; J = json.load(open(jp)) if os.path.exists(jp) else {}; J[stage] = rep; json.dump(J, open(jp, 'w'), indent=1)
