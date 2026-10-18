#!/usr/bin/env python3
"""Cuts the Loika's layered stand (T-20261016-201) from the signed version 4 set (T-20261016-200).
  base   masters-pods floor/S01/keys: the bare-headed base key (mibi-<stage>-S01-base-anchor-304x312)
  crown  floor/S01/overlays: the crest overlay (over), for the look "leaf crest"; a bare head is the base
  marks  work-queue results/T-20261016-200/layers: the patches and the stripes layers (over), inside the key's fur mask;
         "stripes and patches" is both, patches first (make-window-masters.py)
  eyes   the ring overlays are not cut yet: thin and wide stand in with the base's "between" rings (the 16 stand-ins of layers/register.json are carried in the index)
Colour ramps are T-203's: every stand is the charcoal base for now. The anchor key is the standing pose every still picture takes; the other keys are the motion sets'.
Only the 304x312 canvas is cut. A stand at any smaller size is composed at that size in the logic process (layered-stand.mjs), so the size is a parameter of the picture, not of the art. Nothing is scaled up.

  python3 -I prototypes/station/tools/make-stand-layers.py FLOOR_S01_DIR LAYERS_DIR     (writes prototypes/ui/assets/stands/)
"""
import hashlib, json, os, sys
from PIL import Image

FLOOR, LAYERS = sys.argv[1:3]
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../..'))
OUT = os.path.join(ROOT, 'prototypes/ui/assets/stands')
CW, CH = 304, 312
POSE = 'anchor'

def rd(path): return Image.open(path).convert('RGBA')

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'): os.remove(os.path.join(OUT, f))
files = {}
def save(img, name):
    p = os.path.join(OUT, name); img.save(p, optimize=True)
    files[name] = {'file': name, 'w': img.width, 'h': img.height, 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest()}
    return name

stands = {}
for stage in ('adult', 'juvenile'):
    src = {
        'base': rd(f'{FLOOR}/keys/mibi-{stage}-S01-base-{POSE}-304x312.png'),
        'crest': rd(f'{FLOOR}/overlays/mibi-{stage}-S01-{POSE}-crest-304x312.png'),
        'patches': rd(f'{LAYERS}/mibi-{stage}-S01-{POSE}-patches-304x312.png'),
        'stripes': rd(f'{LAYERS}/mibi-{stage}-S01-{POSE}-stripes-304x312.png'),
    }
    sizes = {}
    for (w, h) in [(CW, CH)]:
        key = f'{w}x{h}'; n = lambda part: f'S01-{stage}-{key}-{part}.png'
        fit = lambda im, w, h: im
        sizes[key] = {'base': save(fit(src['base'], w, h), n('base')), 'layers': [
            {'trait': 'markings', 'looks': ['patches', 'stripes and patches'], 'order': 10, 'op': 'over', 'file': save(fit(src['patches'], w, h), n('patches'))},
            {'trait': 'markings', 'looks': ['stripes', 'stripes and patches'], 'order': 11, 'op': 'over', 'file': save(fit(src['stripes'], w, h), n('stripes'))},
            {'trait': 'crown', 'looks': ['leaf crest'], 'order': 30, 'op': 'over', 'file': save(fit(src['crest'], w, h), n('crest'))},
        ]}
    stands[stage] = {'traits': ['markings', 'crown', 'eye-rings'], 'pose': POSE, 'sizes': sizes}
reg = json.load(open(os.path.join(LAYERS, 'register.json')))['layers']
index = {
    'schema': 'mb-stands/2',
    'note': 'Layered stands: a base plus one cut-out layer per look a stand can show, chosen by drawnLooks (prototypes/station/src/looks.mjs). The signed version 4 set (T-20261016-200: floor/S01 bare keys and crest overlays, the patches and stripes layers), cut by prototypes/station/tools/make-stand-layers.py. Colour ramps are T-20261016-203.',
    'status': 'placeholder',
    'stands': {'S01': stands},
    'standIns': {k: v for k, v in reg.items() if v['status'] == 'stand-in'},
    'files': dict(sorted(files.items())),
}
with open(os.path.join(OUT, 'index.json'), 'w') as f: json.dump(index, f, indent=1); f.write('\n')
print(len(files), 'files,', len(index['standIns']), 'stand-ins')
