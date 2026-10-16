# S04 topline keys for the tier 2 test (tier2-method.md §4): level (the signed stand's own raw), dipping and arched
# (Pro edits of that raw, masters-pods a6e9872b). Each is keyed with the adult cut's method (magenta by its own ground,
# shadow by component, defringe), split into a body layer (alpha 0 or 255) and a shadow layer, and placed with ONE
# transform per size: the transform that fits the level raw's body box onto the signed stand-in at that size. So the
# three register with each other and with the signed stand. usage: python3 -I cut-topline.py PODS_ROOT
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; O = f'{P}/floor/S04/topline'
src = open(f'{P}/adult/cut-adults.py').read()
exec(src[src.index('def cut_adult(a):'):src.index('im, ground, cx, w = cut_adult(')])
RAW = {'level': 'mibi-juvenile-S04-a', 'dipping': 'trait-S04-topline-dipping-a', 'arched': 'trait-S04-topline-arched-a'}
cuts = {k: cut_adult(np.asarray(Image.open(f'{P}/source/raw/{v}.jpg').convert('RGB')).astype(float)) for k, v in RAW.items()}
def box(al):
    ys, xs = np.where(al.any(1))[0], np.where(al.any(0))[0]; return xs.min(), ys.min(), xs.max(), ys.max()
log = {}
lv = np.asarray(cuts['level'][0])[..., 3] == 255; lx0, ly0, lx1, ly1 = box(lv)
for (W, H) in [(304, 312), (104, 112), (96, 88)]:
    st = np.asarray(Image.open(f'{P}/juvenile/mibi-juvenile-S04-{W}x{H}.png'))[..., 3] >= 200
    sx0, sy0, sx1, sy1 = box(st)
    sc = ((sy1 - sy0 + 1) / (ly1 - ly0 + 1) + (sx1 - sx0 + 1) / (lx1 - lx0 + 1)) / 2      # the level body onto the signed stand
    ox, oy = sx0 - lx0 * sc, sy1 - ly1 * sc                                               # left edge and feet row matched
    log[f'{W}x{H}'] = {'scale': round(float(sc), 5), 'offset': [round(float(ox), 2), round(float(oy), 2)]}
    for k, (im, ground, cx, w) in cuts.items():
        a = np.asarray(im); size = (round(a.shape[1] * sc), round(a.shape[0] * sc))
        body = a.copy(); body[a[..., 3] != 255] = 0
        shad = a.copy(); shad[~((a[..., 3] > 0) & (a[..., 3] < 255))] = 0
        for layer, arr in (('body', body), ('shadow', shad)):
            p = Image.fromarray(arr).resize(size, Image.LANCZOS); pa = np.asarray(p).copy()
            if layer == 'body': pa[..., 3] = np.where(pa[..., 3] >= 128, 255, 0); pa[pa[..., 3] == 0] = 0
            else: pa[..., :3] = [30, 26, 34]; pa[..., 3] = np.where(pa[..., 3] >= 40, 110, 0)
            c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(ox), round(oy)))
            c.save(f'{O}/mibi-juvenile-S04-topline-{k}-{W}x{H}-{layer}.png')
        b = np.asarray(Image.open(f'{O}/mibi-juvenile-S04-topline-{k}-{W}x{H}-body.png'))[..., 3] == 255
        lab, n = nd.label(b); holes = int((nd.binary_fill_holes(b) & ~b).sum())
        r, g, bb = [np.asarray(Image.open(f'{O}/mibi-juvenile-S04-topline-{k}-{W}x{H}-body.png'))[..., i].astype(int) for i in range(3)]
        mag = int((b & (g < 0.6 * np.minimum(r, bb)) & (np.abs(r - bb) < 70) & (np.minimum(r, bb) > 60)).sum())
        log[f'{W}x{H}'][k] = {'components': int(n), 'holes_px': holes, 'magenta_px': mag}
json.dump(log, open(f'{O}/cut-topline.json', 'w'), indent=1); print(json.dumps(log, indent=1))
