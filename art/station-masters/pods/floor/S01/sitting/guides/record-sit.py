"""Sitting S01 keys: records every new take file in floor/S01/manifest.json (size, sha256, from, signed_in null, status new) and
floor/S01/sitting/status.json (id -> status new, a note naming its source). Removes entries whose file is gone (a dropped take).
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/record-sit.py <stage> <K1 sheet> <K2 sheet> <K3 sheet> <K4 sheet>"""
import glob, hashlib, json, os, sys
from PIL import Image
stage, k1, k2, k3, k4 = sys.argv[1:6]; CELL = {'shake-t1': 2, 'calm-t1': 3, 'shake-t2': 5, 'calm-t2': 6}
mp = 'floor/S01/manifest.json'; M = json.load(open(mp)); sp = 'floor/S01/sitting/status.json'; S = json.load(open(sp)) if os.path.exists(sp) else {}
for k in list(M):
    if any(f'-S01-{p}-' in k or f'-S01-base-{p}-' in k for p in CELL) and k.startswith(f'mibi-{stage}-') and not any(os.path.exists(f) for f in glob.glob(f'floor/S01/*/{k}.png')): M.pop(k); S.pop(k, None)
files = []
for t, c in CELL.items():
    for f, src, how in ((f'floor/S01/crested/mibi-{stage}-S01-{t}-304x312.png', k1, 'cut-sit.py k1 (mirrored, droplets on the fur painted out)'),
                        (f'floor/S01/keys/mibi-{stage}-S01-base-{t}-304x312.png', k2, 'cut-sit.py k2' + (' + restore-drop.py' if (stage, t) == ('adult', 'shake-t1') else '')),
                        (f'floor/S01/overlays/mibi-{stage}-S01-{t}-crest-304x312.png', k1, 'layers-sit.py overlays (from the crested and bare keys)'),
                        (f'floor/S01/layers/mibi-{stage}-S01-{t}-fur-mask-304x312.png', k2, 'layers-sit.py overlays (cut-layers.py fur_mask on the bare key)'),
                        (f'floor/S01/layers/mibi-{stage}-S01-{t}-zone-mask-304x312.png', k2, 'layers-sit.py overlays (cut-layers.py zone_mask)'),
                        (f'floor/S01/layers/mibi-{stage}-S01-{t}-patches-304x312.png', k3, 'layers-sit.py patches (mark_layer + heads-off)'),
                        (f'floor/S01/layers/mibi-{stage}-S01-{t}-stripes-304x312.png', k4, 'layers-sit.py stripes (mark_layer)')):
        if not os.path.exists(f): continue
        k = os.path.basename(f)[:-4]; b = open(f, 'rb').read(); w, h = Image.open(f).size
        M[k] = {'file': f.replace('floor/S01/', ''), 'w': w, 'h': h, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'from': f'{src} cell {c}, {how}', 'signed_in': None, 'status': 'new'}
        S[k] = {'status': 'new', 'note': f'sitting habit key take, from {os.path.basename(src)} cell {c} ({how}); not signed'}; files.append(k)
json.dump(M, open(mp, 'w'), indent=1); json.dump(S, open(sp, 'w'), indent=1); print(len(files), 'recorded')
