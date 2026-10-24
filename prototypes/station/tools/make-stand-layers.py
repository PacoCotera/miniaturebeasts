#!/usr/bin/env python3
"""Cuts the Loika's layered stand (T-20261016-201) from the signed version 4 set (T-20261016-200).
  base   masters-pods floor/S01/keys: the bare-headed base key (mibi-<stage>-S01-base-anchor-304x312)
  crown  floor/S01/overlays: the crest overlay (over), for the look "leaf crest"; a bare head is the base
  marks  work-queue results/T-20261016-200/layers: the patches and the stripes layers (over), inside the key's fur mask;
         "stripes and patches" is both, patches first (make-window-masters.py)
  colour the coat looks other than charcoal are the base recoloured, one picture each, by the art director's code (make-window-masters.py, T-20261016-200) with the signed ramps (layers/ramps.json) through the key's fur mask, and the zone mask for a
         two-tone (the first pigment over the back and head, the second over the flanks and legs); the belly, eyes and crest keep their own colour
  eyes   the ring overlays are not cut yet: thin and wide stand in with the base's "between" rings (the 16 stand-ins of layers/register.json are carried in the index)
The anchor key is the standing pose every still picture takes; the other keys are the motion sets'. POSES lists the poses a still picture may take (the anchor, and the held keys a
habit maps to: HABITS, written as stands.S01.habits); each is cut exactly as the anchor, from the same set under its own pose name, into stands.S01.<stage>.poses.<pose> = { figure, sizes }.
The held keys the art director signed for the Sitting screen (SIGNED: shake and calm) are cut from their final ids only: the key, crest overlay and crested key under floor/S01, and their own fur mask, zone mask,
patches and stripes from floor/S01/layers (not LAYERS_DIR); every one of those files is checked against floor/S01/manifest.json's sha256 before anything is written.
The curl's key and crested key (RESIGNED: re-signed with the painted contact shadow taken out) are checked against the same manifest; its patches, stripes and masks stay LAYERS_DIR's.
The top-level entry of a stage stays the anchor's, and the contact shadows (the "under" layer and `curl.shadow`, written by place-stand-shadows.mjs) are carried over from the index as they are.
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
POSES = ['anchor', 'curl', 'shake', 'calm']   # the poses cut, the anchor first (a stage's top-level entry is the anchor's)
HABITS = {'sleep-curled': 'curl', 'shake-dry': 'shake', 'calm': 'calm'}   # a habit -> the pose its held key is
SIGNED = ('shake', 'calm')   # the poses whose layers are the floor set's own (floor/S01/layers), each file checked against its manifest

def layers_of(pose): return f'{FLOOR}/layers' if pose in SIGNED else LAYERS
def signed_files(stage, pose):   # the signed final ids of a pose, relative to floor/S01
    return [f'keys/mibi-{stage}-S01-base-{pose}-304x312.png', f'crested/mibi-{stage}-S01-{pose}-304x312.png', f'overlays/mibi-{stage}-S01-{pose}-crest-304x312.png',
            *[f'layers/mibi-{stage}-S01-{pose}-{part}-304x312.png' for part in ('fur-mask', 'zone-mask', 'patches', 'stripes')]]
MANIFEST = {e['file']: e['sha256'] for e in json.load(open(os.path.join(FLOOR, 'manifest.json'))).values() if isinstance(e, dict) and 'file' in e}
RESIGNED = ('curl',)   # the poses whose key and crested key the art director re-signed (the curl: its painted contact shadow taken out); their layers stay LAYERS_DIR's
def resigned_files(stage, pose): return [f'keys/mibi-{stage}-S01-base-{pose}-304x312.png', f'crested/mibi-{stage}-S01-{pose}-304x312.png']
BY_ID = {k: e['sha256'] for k, e in json.load(open(os.path.join(FLOOR, 'manifest.json'))).items() if isinstance(e, dict) and 'sha256' in e}   # a key recorded by its id alone (no file)
def recorded(f): return MANIFEST.get(f) or BY_ID.get(os.path.basename(f)[:-4])
bad = [f for st in ('adult', 'juvenile') for f in [*(g for pose in SIGNED for g in signed_files(st, pose)), *(g for pose in RESIGNED for g in resigned_files(st, pose))]
       if not recorded(f) or hashlib.sha256(open(os.path.join(FLOOR, f), 'rb').read()).hexdigest() != recorded(f)]
if bad: sys.exit('not the signed files (sha256 against floor/S01/manifest.json): ' + ', '.join(bad))

def rd(path): return Image.open(path).convert('RGBA')
RAMPS = json.load(open(os.path.join(LAYERS, 'ramps.json')))['ramps']
COATS = ['russet', 'ash', 'charcoal and russet', 'charcoal and ash', 'russet and ash']   # the version 4 frame's colour looks but the pure charcoal, which is the base

def ramp_paint(a, m, ramp):      # make-window-masters.py, unchanged
    lum = a[..., :3].mean(2); v = lum[m]; lo, hi = np.percentile(v, 5), np.percentile(v, 97)
    t = np.clip((lum - lo) / (hi - lo + 1e-6), 0, 1); s, md, h = [np.array(c, float) for c in ramp]
    col = np.where((t < .5)[..., None], s + (md - s) * (t / .5)[..., None], md + (h - md) * ((t - .5) / .5)[..., None])
    return col + (lum - np.asarray(Image.fromarray(lum.astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), float))[..., None] * .9

def recolour(base, stage, colour, pose):   # make-window-masters.py stand(), the coat part
    a = np.asarray(base, dtype=float).copy()
    m = np.asarray(Image.open(f'{layers_of(pose)}/mibi-{stage}-S01-{pose}-fur-mask-304x312.png')) > 127
    soft = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.7)), float)[..., None] / 255
    pig = colour.split(' and ')
    cols = [a[..., :3] if p == 'charcoal' else ramp_paint(a, m, RAMPS[p][stage]) for p in pig]
    if len(cols) == 2:
        z = np.asarray(Image.open(f'{layers_of(pose)}/mibi-{stage}-S01-{pose}-zone-mask-304x312.png'), float)[..., None] / 255
        col = cols[0] * (1 - z) + cols[1] * z
    else:
        col = cols[0]
    a[..., :3] = a[..., :3] * (1 - soft) + col * soft
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')

os.makedirs(OUT, exist_ok=True)
# the contact shadows are place-stand-shadows.mjs's: their files, the "under" layers and `curl` are kept from the index as they are
INDEX = os.path.join(OUT, 'index.json')
old = json.load(open(INDEX)) if os.path.exists(INDEX) else {'stands': {}, 'files': {}}
oldS01 = old['stands'].get('S01', {})
unders = {st: [l for l in oldS01.get(st, {}).get('sizes', {}).get(f'{CW}x{CH}', {}).get('layers', []) if l['op'] == 'under'] for st in ('adult', 'juvenile')}
curls = {st: oldS01[st]['curl'] for st in ('adult', 'juvenile') if 'curl' in oldS01.get(st, {})}
kept = {l['file'] for ls in unders.values() for l in ls} | {c['shadow'] for c in curls.values()}
for f in os.listdir(OUT):
    if f.endswith('.png') and f not in kept: os.remove(os.path.join(OUT, f))
files = {f: old['files'][f] for f in kept}
def save(img, name):
    p = os.path.join(OUT, name); img.save(p, optimize=True)
    files[name] = {'file': name, 'w': img.width, 'h': img.height, 'sha256': hashlib.sha256(open(p, 'rb').read()).hexdigest()}
    return name

def cut(stage, pose):   # one pose of a stage: { figure, sizes }, its files named S01-<stage>-<size>-<part> for the anchor and S01-<stage>-<pose>-<size>-<part> for another pose
    src = {
        'base': rd(f'{FLOOR}/keys/mibi-{stage}-S01-base-{pose}-304x312.png'),
        'crest': rd(f'{FLOOR}/overlays/mibi-{stage}-S01-{pose}-crest-304x312.png'),
        'patches': rd(f'{layers_of(pose)}/mibi-{stage}-S01-{pose}-patches-304x312.png'),
        'stripes': rd(f'{layers_of(pose)}/mibi-{stage}-S01-{pose}-stripes-304x312.png'),
    }
    sizes = {}
    for (w, h) in [(CW, CH)]:
        key = f'{w}x{h}'; n = lambda part: f'S01-{stage}-{key}-{part}.png' if pose == 'anchor' else f'S01-{stage}-{pose}-{key}-{part}.png'
        fit = lambda im, w, h: im
        bases = {c: save(recolour(src['base'], stage, c, pose), n('base-' + c.replace(' ', '-'))) for c in COATS}
        sizes[key] = {'base': save(fit(src['base'], w, h), n('base')), 'bases': bases, 'layers': ([*unders[stage]] if pose == 'anchor' else []) + [
            {'trait': 'markings', 'looks': ['patches', 'stripes and patches'], 'order': 10, 'op': 'over', 'file': save(fit(src['patches'], w, h), n('patches'))},
            {'trait': 'markings', 'looks': ['stripes', 'stripes and patches'], 'order': 11, 'op': 'over', 'file': save(fit(src['stripes'], w, h), n('stripes'))},
            {'trait': 'crown', 'looks': ['leaf crest'], 'order': 30, 'op': 'over', 'file': save(fit(src['crest'], w, h), n('crest'))},
        ]}
    # the figure's extent on the canvas (base and crest, solid pixels): a view's figure height is measured on the anchor's, so every look and pose of a stage is drawn at one scale; a pose's own box is its ink
    box = lambda im: im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    bb, cb = box(src['base']), box(src['crest'])
    fig = [min(bb[0], cb[0]), min(bb[1], cb[1]), max(bb[2], cb[2]), max(bb[3], cb[3])]
    return {'figure': fig, 'sizes': sizes}

stands = {}
for stage in ('adult', 'juvenile'):
    poses = {pose: cut(stage, pose) for pose in POSES}
    stands[stage] = {'traits': ['colour', 'markings', 'crown', 'eye-rings'], 'pose': 'anchor', 'figure': poses['anchor']['figure'], 'sizes': poses['anchor']['sizes']}
    if stage in curls: stands[stage]['curl'] = curls[stage]
    stands[stage]['poses'] = poses
stands['habits'] = {h: p for h, p in HABITS.items() if p in POSES}
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
