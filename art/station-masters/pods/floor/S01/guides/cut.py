# S01 floor: cut the bare sheets and their crested twins as pairs. Each pair is placed by the crested cell's
# own body (centre and ground), so the bare key lands on its crested key's rows and columns. Then the register check
# (brief check 5), the crest overlays (mask + 4 px root band, cut from the crested key), the overlay test and the proof.
# usage: python3 -I cut.py PODS_ROOT
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; F = f'{P}/floor/S01'
src = open(f'{P}/concepts/mibi-motion-proof/guides/cut-motion.py').read()
exec(src[src.index('def cut(a):'):src.index('st = np.asarray')])
W, H, FEET = 304, 312, 305
SETS = [('juvenile', 'guides/compose-juvenile.png', '../../source/raw/floor-S01-juvenile-bare-b.jpg', ['anchor', 'crouch', 'air', 'curl', 'stand'], 0.601, 304 / 2),
        ('adult', 'guides/compose-adult.png', '../../source/raw/floor-S01-adult-bare-b.jpg', ['anchor', 'crouch', 'air', 'curl', 'blink', 'stand'], 0.733, 304 / 2)]
def cells(path):
    A = np.asarray(Image.open(f'{F}/{path}').convert('RGB')).astype(float); h, w = A.shape[:2]; I = 6
    return [A[(i // 3) * h // 2 + I:(i // 3 + 1) * h // 2 - I, (i % 3) * w // 3 + I:(i % 3 + 1) * w // 3 - I] for i in range(6)]
def place(im, sc, cx, ground):
    p = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    pa = np.asarray(p).copy(); al = pa[..., 3]; pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0))
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(W / 2 - cx * sc), round(FEET - ground * sc)))
    return np.asarray(c)
def green(a):
    r, g, b = [a[..., i].astype(float) for i in range(3)]
    return (a[..., 3] == 255) & (g > r + 8) & (g > b + 8)
report = {}
for stage, crested, bare, keys, sc, _ in SETS:
    C, B = cells(crested), cells(bare)
    for i, k in enumerate(keys):
        kc, kb = cut(C[i]), cut(B[i])
        _, ground, cx, _ = kc
        ac, ab = place(kc[0], sc, cx, ground), place(kb[0], sc, cx, ground)
        Image.fromarray(ac).save(f'{F}/crested/mibi-{stage}-S01-{k}-304x312.png')
        Image.fromarray(ab).save(f'{F}/keys/mibi-{stage}-S01-base-{k}-304x312.png')
        bc, bb = ac[..., 3] >= 200, ab[..., 3] >= 200
        crest = green(ac); crest = nd.binary_dilation(crest, iterations=3) & bc & ~(bb & ~nd.binary_dilation(green(ac), iterations=3) & False)
        crest |= bc & ~bb                                           # what the crested key has outside the bare body: the leaves' own pixels
        crest = nd.binary_opening(crest, iterations=1)
        band = nd.binary_dilation(crest, iterations=4) & bb & ~crest     # the root band, 4 px into the head
        mask = crest | band
        far = ~nd.binary_dilation(mask, iterations=8)
        ec, eb = bc & ~nd.binary_erosion(bc), bb & ~nd.binary_erosion(bb)
        dc = nd.distance_transform_edt(~ec); db = nd.distance_transform_edt(~eb)
        shift = max(float(dc[eb & far].max()) if (eb & far).any() else 0, float(db[ec & far].max()) if (ec & far).any() else 0)
        both = bc & bb & far & ~nd.binary_dilation(ec | eb, iterations=2)
        dmean = float(np.abs(ac[..., :3].astype(float) - ab[..., :3].astype(float))[both].mean()) if both.any() else 0
        ov = np.zeros_like(ac); ov[mask] = ac[mask]
        if crest.sum() > 30 and k != 'blink':
            Image.fromarray(ov).save(f'{F}/overlays/mibi-{stage}-S01-{k}-crest-304x312.png')
        comp = Image.fromarray(ab); comp.alpha_composite(Image.fromarray(ov))
        diff = int((np.asarray(comp) != ab).any(-1)[~mask].sum())
        report[f'{stage}-{k}'] = {'outline_shift_px_outside_mask+8': round(shift, 1), 'mean_rgb_diff_inside_body': round(dmean, 1), 'crest_px': int(crest.sum()), 'band_px': int(band.sum()), 'overlay_test_diff_px_outside_mask': diff}
json.dump(report, open(f'{F}/guides/register.json', 'w'), indent=1)
for k, v in report.items(): print(k, v)
