# S01 floor: crest overlays (bare-keys-plan §7.1): the crest's own pixels in the crested key (the parts the bare key
# lacks, plus the green leaf pixels), plus a root band of up to 4 px into the head, all cut from the crested key.
# Test: bare + overlay, outside mask + band, equals the bare key (0 differing pixels). Proof rows at 1x over #D6CEBE.
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
F = sys.argv[1]; out = {}
rows = [('juvenile', ['anchor', 'crouch', 'air', 'curl', 'stand']), ('adult', ['anchor', 'crouch', 'air', 'curl', 'stand'])]
proof = Image.new('RGB', (304 * 3, 312 * 10), (214, 206, 190)); r = 0
for st, keys in rows:
    for k in keys:
        ac = np.asarray(Image.open(f'{F}/crested/mibi-{st}-S01-{k}-304x312.png')); ab = np.asarray(Image.open(f'{F}/keys/mibi-{st}-S01-base-{k}-304x312.png'))
        bc, bb = ac[..., 3] >= 200, ab[..., 3] >= 200; a = ac.astype(int)
        only = nd.binary_opening(bc & ~bb, iterations=1); lab, n = nd.label(only); sz = nd.sum(only, lab, range(1, n + 1))
        leaves = np.isin(lab, 1 + np.where(sz > 80)[0])
        g = (a[..., 1] > a[..., 0] + 4) & (a[..., 1] > a[..., 2] + 4) & (ac[..., 3] > 0) & nd.binary_dilation(leaves, iterations=6)
        crest = nd.binary_closing(leaves | g, iterations=2) & (ac[..., 3] > 0)
        crest |= nd.binary_dilation(crest, iterations=1) & (ac[..., 3] > 0) & ~bb      # the leaves' soft outer edge
        band = nd.binary_dilation(crest, iterations=4) & bb & ~crest
        mask = crest | band
        ov = np.zeros_like(ac); ov[mask] = ac[mask]
        Image.fromarray(ov).save(f'{F}/overlays/mibi-{st}-S01-{k}-crest-304x312.png')
        comp = Image.fromarray(ab); comp.alpha_composite(Image.fromarray(ov)); cp = np.asarray(comp)
        out[f'{st}-{k}'] = {'crest_px': int(crest.sum()), 'band_px': int(band.sum()), 'diff_outside_mask': int((cp != ab).any(-1)[~mask].sum())}
        for i, im in enumerate([Image.fromarray(ac), Image.fromarray(ab), comp]): proof.paste(im, (i * 304, r * 312), im)
        r += 1
proof.save(f'{F}/proof/bare-1x.png'); json.dump(out, open(f'{F}/guides/overlays.json', 'w'), indent=1)
for k, v in out.items(): print(k, v)
