"""Sitting S01 keys: the 24-look dry run (studio brief, 0 MXN work step 7), no station edit. recolour() and ramp_paint() are copied unchanged
from station-gate prototypes/station/tools/make-stand-layers.py (at /home/user/sg a9e24215). Their globals LAYERS (the folder holding the pose's fur and
zone masks), POSE and RAMPS are set by the caller per take. Each take is composed in the six coats (charcoal and the five recolours), crest and bare,
and none / patches / stripes / stripes and patches, in make-stand-layers.py's order (patches 10, stripes 11, crest 30).
Exit (amended, ruling Round 3): a pixel diff of each recoloured base against the base, outside the fur mask dilated 3 px, is 0.
usage: exec'd by floor/S01/sitting/guides/proof-sit.py"""
import json, numpy as np
from PIL import Image, ImageFilter
COATS = ['russet', 'ash', 'charcoal and russet', 'charcoal and ash', 'russet and ash']   # the version 4 frame's colour looks but the pure charcoal, which is the base
MARKS = ['none', 'patches', 'stripes', 'stripes and patches']
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


def look(base, layers_dir, pose, stage, coat, marks, crest, L):
    """One look of a take: L holds the take's RGBA layers {'patches','stripes','crest'}."""
    global LAYERS, POSE; LAYERS, POSE = layers_dir, pose
    im = base.copy() if coat == 'charcoal' else recolour(base, stage, coat)
    if marks in ('patches', 'stripes and patches'): im.alpha_composite(L['patches'])
    if marks in ('stripes', 'stripes and patches'): im.alpha_composite(L['stripes'])
    if crest: im.alpha_composite(L['crest'])
    return im
def recolour_exit(base, layers_dir, pose, stage):
    global LAYERS, POSE; LAYERS, POSE = layers_dir, pose
    m = np.asarray(Image.open(f'{layers_dir}/mibi-{stage}-S01-{pose}-fur-mask-304x312.png')) > 127; b = np.asarray(base)
    from scipy import ndimage as nd
    m3 = nd.binary_dilation(m, iterations=3)          # the amended exit (ruling Round 3, R3.1): 0 outside the fur mask dilated 3 px
    return {c: {'outside_mask': int((np.asarray(recolour(base, stage, c)) != b).any(-1)[~m].sum()), 'outside_mask+3': int((np.asarray(recolour(base, stage, c)) != b).any(-1)[~m3].sum())} for c in COATS}
