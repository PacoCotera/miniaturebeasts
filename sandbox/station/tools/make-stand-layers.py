#!/usr/bin/env python3
"""Cuts the Loika's layered stand (T-20261016-201) from the signed version 4 set (T-20261016-200).
  base   masters-pods floor/S01/keys: the bare-headed base key (mibi-<stage>-S01-base-anchor-304x312)
  crown  floor/S01/overlays: the crest overlay (over), for the look "leaf crest"; a bare head is the base
  marks  work-queue results/T-20261016-200/layers: the patches and the stripes layers (over), inside the key's fur mask;
         "stripes and patches" is both, patches first (make-window-masters.py)
  colour the coat looks other than charcoal are the base recoloured, one picture each, by the art director's code (make-window-masters.py, T-20261016-200) with the signed ramps (layers/ramps.json) through the key's fur mask, and the zone mask for a
         two-tone (the first pigment over the back and head, the second over the flanks and legs); the belly, eyes and crest keep their own colour
  eyes   the ring overlays are not cut yet: thin and wide stand in with the base's "between" rings (the 16 stand-ins of layers/register.json are carried in the index)
The anchor key is the standing pose every still picture takes; the other keys are the motion sets'.
Only the 304x312 canvas is cut. A stand at any smaller size is composed at that size in the logic process (layered-stand.mjs), so the size is a parameter of the picture, not of the art. Nothing is scaled up.

  python3 -I prototypes/station/tools/make-stand-layers.py FLOOR_S01_DIR LAYERS_DIR     (writes prototypes/ui/assets/stands/)
"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

FLOOR, LAYERS = sys.argv[1:3]
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../..'))
OUT = os.path.join(ROOT, 'prototypes/ui/assets/stands')
CW, CH = 304, 312
POSE = 'anchor'

def rd(path): return Image.open(path).convert('RGBA')
RAMPS = json.load(open(os.path.join(LAYERS, 'ramps.json')))['ramps']
COATS = ['russet', 'ash', 'charcoal and russet', 'charcoal and ash', 'russet and ash']   # the version 4 frame's colour looks but the pure charcoal, which is the base

def ramp_paint(a, m, ramp):      # make-window-masters.py, unchanged
    lum = a[..., :3].mean(2); v = lum[m]; lo, hi = np.percentile(v, 5), np.percentile(v, 97)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1); s, md, h = [np.array(c, float) for c in ramp]
    col = np.where((t < .5)[..., None], s + (md - s) * (t / .5)[..., None], md + (h - md) * ((t - .5) / .5)[..., None])
    return col + (lum - np.asarray(Image.fromarray(lum.astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), float))[..., None] * .9

def recolour(base, stage, colour):   # make-window-masters.py stand(), the coat part
    a = np.asarray(base, dtype=float).copy()
    m = np.asarray(Image.open(f'{LAYERS}/mibi-{stage}-S01-{POSE}-fur-mask-304x312.png')) > 127
    soft = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.7)), float)[..., None] / 255
    pig = colour.split(' and ')
    cols = [a[..., :3] if p == 'charcoal' else ramp_paint(a, m, RAMPS[p][stage]) for p in pig]
    if len(cols) == 2:
        z = np.asarray(Image.open(f'{LAYERS}/mibi-{stage}-S01-{POSE}-zone-mask-304x312.png'), float)[..., None] / 255
        col = cols[0] * (1 - z) + cols[1] * z
    else:
        col = cols[0]
    a[..., :3] = a[..., :3] * (1 - soft) + col * soft
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')

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
        bases = {c: save(recolour(src['base'], stage, c), n('base-' + c.replace(' ', '-'))) for c in COATS}
        sizes[key] = {'base': save(fit(src['base'], w, h), n('base')), 'bases': bases, 'layers': [
            {'trait': 'markings', 'looks': ['patches', 'stripes and patches'], 'order': 10, 'op': 'over', 'file': save(fit(src['patches'], w, h), n('patches'))},
            {'trait': 'markings', 'looks': ['stripes', 'stripes and patches'], 'order': 11, 'op': 'over', 'file': save(fit(src['stripes'], w, h), n('stripes'))},
            {'trait': 'crown', 'looks': ['leaf crest'], 'order': 30, 'op': 'over', 'file': save(fit(src['crest'], w, h), n('crest'))},
        ]}
    # the figure's extent on the canvas (base and crest, solid pixels): a view's figure height is measured on it, so every look of a stage is drawn at one scale
    box = lambda im: im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    bb, cb = box(src['base']), box(src['crest'])
    fig = [min(bb[0], cb[0]), min(bb[1], cb[1]), max(bb[2], cb[2]), max(bb[3], cb[3])]
    stands[stage] = {'traits': ['colour', 'markings', 'crown', 'eye-rings'], 'pose': POSE, 'figure': fig, 'sizes': sizes}
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
